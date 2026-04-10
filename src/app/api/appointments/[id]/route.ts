import { NextResponse } from "next/server";
import { z } from "zod";
import { AppointmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  clearAppointmentReminderNotifications,
  syncAppointmentReminderNotifications,
} from "@/lib/reminders";
import { requireClinicPermission } from "@/lib/server-auth";
import { AppointmentUpdateSchema } from "@/lib/validators/appointments";

function zodDetails(err: unknown) {
  if (!(err instanceof z.ZodError)) return [];
  return err.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

const appointmentInclude = {
  pet: { select: { id: true, name: true, species: true, clientId: true } },
  client: { select: { id: true, fullName: true, phone: true } },
  vet: { select: { id: true, name: true, email: true } },
} as const;
const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function getWeekdayKey(date: Date) {
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
    date.getDay()
  ] as
    | "sunday"
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday";
}

function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return next;
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA;
}

async function findOverlappingAppointment(params: {
  clinicId: number;
  startAt: Date;
  endAt: Date;
  ignoreId: number;
}) {
  const { clinicId, startAt, endAt, ignoreId } = params;
  const searchFrom = addMinutes(startAt, -1440);
  const searchTo = addMinutes(endAt, 1440);

  const candidates = await prisma.appointment.findMany({
    where: {
      clinicId,
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      NOT: { id: ignoreId },
      startAt: {
        gte: searchFrom,
        lte: searchTo,
      },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      pet: { select: { name: true } },
      client: { select: { fullName: true } },
    },
    orderBy: { startAt: "asc" },
  });

  return (
    candidates.find((appointment) => {
      const appointmentEnd = appointment.endAt ?? addMinutes(appointment.startAt, DEFAULT_APPOINTMENT_DURATION_MINUTES);
      return rangesOverlap(startAt, endAt, appointment.startAt, appointmentEnd);
    }) ?? null
  );
}

async function validateAppointmentSchedule(params: {
  clinicId: number;
  startAt: Date;
  endAt: Date;
}) {
  const { clinicId, startAt, endAt } = params;
  const day = getWeekdayKey(startAt);

  const schedule = await prisma.clinicSchedule.findUnique({
    where: { clinicId_day: { clinicId, day } },
    select: { open: true, close: true, closed: true },
  });

  if (!schedule || schedule.closed || !schedule.open || !schedule.close) {
    return NextResponse.json(
      { error: "La clínica está cerrada en ese horario" },
      { status: 409 }
    );
  }

  const openAt = combineDateAndTime(startAt, schedule.open);
  const closeAt = combineDateAndTime(startAt, schedule.close);

  if (startAt < openAt || endAt > closeAt) {
    return NextResponse.json(
      {
        error: "La cita está fuera del horario de atención",
        details: {
          open: schedule.open,
          close: schedule.close,
          day,
        },
      },
      { status: 409 }
    );
  }

  return null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("appointments.read");
  if (!clinicId) {
    return NextResponse.json({ error: "Clínica no encontrada" }, { status: 404 });
  }

  const id = Number((await ctx.params).id);

  const appointment = await prisma.appointment.findFirst({
    where: { id, clinicId },
    include: appointmentInclude,
  });

  if (!appointment) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(appointment);
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("appointments.update");
  if (!clinicId) {
    return NextResponse.json({ error: "Clínica no encontrada" }, { status: 404 });
  }

  const id = Number((await ctx.params).id);
  const body = await req.json().catch(() => null);
  const parsed = AppointmentUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const current = await prisma.appointment.findFirst({
    where: { id, clinicId },
    select: {
      id: true,
      petId: true,
      clientId: true,
      startAt: true,
      endAt: true,
      vetId: true,
    },
  });

  if (!current) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const input = parsed.data;
  const nextPetId = input.petId ?? current.petId;

  const pet = await prisma.pet.findFirst({
    where: { id: nextPetId, clinicId },
    select: { id: true, clientId: true },
  });

  if (!pet) {
    return NextResponse.json({ error: "Mascota inválida" }, { status: 404 });
  }

  const nextClientId = input.clientId ?? (input.petId ? pet.clientId : current.clientId);
  const client = await prisma.client.findFirst({
    where: { id: nextClientId, clinicId },
    select: { id: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Cliente inválido" }, { status: 404 });
  }

  if (pet.clientId !== nextClientId) {
    return NextResponse.json(
      { error: "La mascota no pertenece a ese cliente" },
      { status: 409 }
    );
  }

  const nextVetId = input.vetId === undefined ? current.vetId : input.vetId;
  if (nextVetId) {
    const vetMember = await prisma.clinicMember.findFirst({
      where: {
        clinicId,
        userId: nextVetId,
        isActive: true,
        role: { is: { key: "vet" } },
      },
      select: { userId: true },
    });

    if (!vetMember) {
      return NextResponse.json(
        { error: "Veterinario inválido o no pertenece a la clínica" },
        { status: 404 }
      );
    }
  }

  const nextStartAt = input.startAt ?? current.startAt;
  const nextEndAt = input.endAt === undefined
    ? current.endAt ?? addMinutes(nextStartAt, DEFAULT_APPOINTMENT_DURATION_MINUTES)
    : input.endAt ?? addMinutes(nextStartAt, DEFAULT_APPOINTMENT_DURATION_MINUTES);

  if (nextEndAt && nextEndAt < nextStartAt) {
    return NextResponse.json(
      { error: "La hora final no puede ser menor que la inicial" },
      { status: 422 }
    );
  }

  const scheduleError = await validateAppointmentSchedule({
    clinicId,
    startAt: nextStartAt,
    endAt: nextEndAt,
  });
  if (scheduleError) {
    return scheduleError;
  }

  const overlap = await findOverlappingAppointment({
    clinicId,
    startAt: nextStartAt,
    endAt: nextEndAt,
    ignoreId: id,
  });

  if (overlap) {
    return NextResponse.json(
      {
        error: "Ya existe una cita en ese horario",
        details: {
          appointmentId: overlap.id,
          petName: overlap.pet.name,
          clientName: overlap.client.fullName,
        },
      },
      { status: 409 }
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
      ...(input.endAt !== undefined || input.startAt !== undefined ? { endAt: nextEndAt } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.startAt !== undefined ||
      input.endAt !== undefined ||
      input.type !== undefined ||
      input.petId !== undefined ||
      input.clientId !== undefined
        ? {
            reminderSent: false,
            reminderSentAt: null,
          }
        : {}),
      ...(input.vetId !== undefined ? { vetId: input.vetId } : {}),
      ...(input.petId !== undefined || input.clientId !== undefined
        ? { petId: pet.id, clientId: nextClientId }
        : {}),
    },
    include: appointmentInclude,
  });

  await syncAppointmentReminderNotifications(updated.id);

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("appointments.delete");
  if (!clinicId) {
    return NextResponse.json({ error: "Clínica no encontrada" }, { status: 404 });
  }

  const id = Number((await ctx.params).id);

  const appointment = await prisma.appointment.findFirst({
    where: { id, clinicId },
    select: { id: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.appointment.delete({ where: { id } });
  await clearAppointmentReminderNotifications(id);
  return NextResponse.json({ ok: true });
}
