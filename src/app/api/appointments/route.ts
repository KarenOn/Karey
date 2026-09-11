import { NextResponse } from "next/server";
import { z } from "zod";
import { AppointmentStatus, AppointmentType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { syncAppointmentReminderNotifications } from "@/lib/reminders";
import { requireClinicPermission } from "@/lib/server-auth";
import { AppointmentCreateSchema } from "@/lib/validators/appointments";
import { reconcileOverdueAppointments } from "@/lib/reconcile-appointments";
import { hasPermission, isElevatedClinicRole } from "@/lib/permissions";
import { notifyAppointmentAssigned } from "@/lib/in-app-notifications";
import { getAppointmentEnd, isAppointmentActive, rangesOverlap } from "@/lib/appointment-helpers";

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
  visit: { select: { id: true, _count: { select: { vaccinations: true } } } },
  encounterItems: { select: { id: true } },
} as const;
const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;

const ListQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  type: z.nativeEnum(AppointmentType).optional(),
  petId: z.coerce.number().int().positive().optional(),
  clientId: z.coerce.number().int().positive().optional(),
  vetId: z.string().trim().min(1).optional(),
});

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

async function findOverlappingAppointment(params: {
  clinicId: number;
  startAt: Date;
  endAt: Date;
  vetId?: string | null;
  ignoreId?: number;
}) {
  const { clinicId, startAt, endAt, vetId, ignoreId } = params;
  const searchFrom = addMinutes(startAt, -1440);
  const searchTo = addMinutes(endAt, 1440);

  const candidates = await prisma.appointment.findMany({
    where: {
      clinicId,
      ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      startAt: {
        gte: searchFrom,
        lte: searchTo,
      },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      type: true,
      vetId: true,
      pet: { select: { name: true } },
      client: { select: { fullName: true } },
      vet: { select: { name: true } },
    },
    orderBy: { startAt: "asc" },
  });

  return (
    candidates.find((appointment) => {
      if (!isAppointmentActive(appointment.status)) return false;
      // Check based on vet assignment
      if (vetId) {
        // For assigned vet: only conflict with same vet
        if (appointment.vetId !== vetId) return false;
      } else {
        // For unassigned: only conflict with other unassigned appointments
        if (appointment.vetId !== null) return false;
      }

      const appointmentEnd = getAppointmentEnd(appointment, DEFAULT_APPOINTMENT_DURATION_MINUTES);
      return Boolean(appointmentEnd && rangesOverlap(startAt, endAt, appointment.startAt, appointmentEnd));
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

async function validateAppointmentRelations(params: {
  clinicId: number;
  petId: number;
  clientId?: number;
  vetId?: string | null;
}) {
  const { clinicId, petId, clientId, vetId } = params;

  const pet = await prisma.pet.findFirst({
    where: { id: petId, clinicId },
    select: { id: true, clientId: true },
  });

  if (!pet) {
    return { error: NextResponse.json({ error: "Mascota inválida" }, { status: 404 }) };
  }

  const resolvedClientId = clientId ?? pet.clientId;

  const client = await prisma.client.findFirst({
    where: { id: resolvedClientId, clinicId },
    select: { id: true },
  });

  if (!client) {
    return { error: NextResponse.json({ error: "Cliente inválido" }, { status: 404 }) };
  }

  if (pet.clientId !== resolvedClientId) {
    return {
      error: NextResponse.json(
        { error: "La mascota no pertenece a ese cliente" },
        { status: 409 }
      ),
    };
  }

  if (vetId) {
    const vetMember = await prisma.clinicMember.findFirst({
      where: {
        clinicId,
        userId: vetId,
        isActive: true,
        role: { is: { key: "vet" } },
      },
      select: { userId: true },
    });

    if (!vetMember) {
      return {
        error: NextResponse.json(
          { error: "Veterinario inválido o no pertenece a la clínica" },
          { status: 404 }
        ),
      };
    }
  }

  return {
    data: {
      petId: pet.id,
      clientId: resolvedClientId,
      vetId: vetId ?? null,
    },
  };
}

export async function GET(req: Request) {
  const { clinicId, member, session } = await requireClinicPermission("appointments.read");
  if (!clinicId) {
    return NextResponse.json({ error: "Clínica no encontrada" }, { status: 404 });
  }

  await reconcileOverdueAppointments();

  const url = new URL(req.url);
  const parsedQuery = ListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Query inválida", details: zodDetails(parsedQuery.error) },
      { status: 422 }
    );
  }

  const query = parsedQuery.data;
  const where: Record<string, unknown> = { clinicId };

  if (member?.role.key === "vet") {
    where.OR = [{ vetId: session.user.id }, { vetId: null }];
  }

  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  if (query.petId) where.petId = query.petId;
  if (query.clientId) where.clientId = query.clientId;
  if (query.vetId) where.vetId = query.vetId;

  if (query.from || query.to) {
    where.startAt = {};
    if (query.from) {
      (where.startAt as { gte?: Date }).gte = new Date(query.from);
    }
    if (query.to) {
      (where.startAt as { lte?: Date }).lte = new Date(query.to);
    }
  }

  if (url.searchParams.get("surface") === "now-alert" && !isElevatedClinicRole(member?.role.key) && !hasPermission(member?.role.permissions, "appointments.receiveUnassignedNowAlerts")) {
    where.vetId = member?.role.key === "vet" ? session.user.id : { not: null };
    delete where.OR;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: appointmentInclude,
  });

  return url.searchParams.get("surface") === "now-alert"
    ? NextResponse.json({ appointments, currentUserIsVet: member?.role.key === "vet" })
    : NextResponse.json(appointments);
}

export async function POST(req: Request) {
  const { clinicId, session } = await requireClinicPermission("appointments.create");
  if (!clinicId) {
    return NextResponse.json({ error: "Clínica no encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = AppointmentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: zodDetails(parsed.error) },
      { status: 422 }
    );
  }

  const input = parsed.data;
  if (input.startAt <= new Date()) {
    return NextResponse.json({ error: "No puedes agendar una cita en un horario que ya pasó." }, { status: 422 });
  }
  const effectiveEndAt = input.endAt ?? addMinutes(input.startAt, DEFAULT_APPOINTMENT_DURATION_MINUTES);
  if (effectiveEndAt <= input.startAt) {
    return NextResponse.json({ error: "La hora final debe ser posterior a la inicial" }, { status: 422 });
  }

  const scheduleError = await validateAppointmentSchedule({
    clinicId,
    startAt: input.startAt,
    endAt: effectiveEndAt,
  });
  if (scheduleError) {
    return scheduleError;
  }

  const validated = await validateAppointmentRelations({
    clinicId,
    petId: input.petId,
    clientId: input.clientId,
    vetId: input.vetId,
  });

  if ("error" in validated) {
    return validated.error;
  }

  const overlap = await findOverlappingAppointment({
    clinicId,
    startAt: input.startAt,
    endAt: effectiveEndAt,
    vetId: input.vetId,
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

  const created = await prisma.appointment.create({
    data: {
      clinicId,
      clientId: validated.data.clientId,
      petId: validated.data.petId,
      type: input.type,
      startAt: input.startAt,
      endAt: effectiveEndAt,
      status: input.status ?? AppointmentStatus.SCHEDULED,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      vetId: validated.data.vetId,
    },
    include: appointmentInclude,
  });

  await syncAppointmentReminderNotifications(created.id);
  if (created.vetId) {
    await notifyAppointmentAssigned({ appointmentId: created.id, assignedVetId: created.vetId, assignedByUserId: session.user.id });
  }

  return NextResponse.json(created, { status: 201 });
}
