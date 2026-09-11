import { NextResponse } from "next/server";
import { AppointmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission, requireClinicPermissions } from "@/lib/server-auth";
import { rangesOverlap } from "@/lib/appointment-helpers";
import { notifyAppointmentAssigned } from "@/lib/in-app-notifications";

const ELIGIBLE_STATUSES: AppointmentStatus[] = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED];
const NON_BLOCKING_STATUSES: AppointmentStatus[] = [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW];
const DEFAULT_DURATION_MS = 30 * 60_000;

class AssignmentConflict extends Error {
  constructor(public readonly message: string, public readonly code: "TAKEN" | "BUSY" | "INVALID") {
    super(message);
  }
}

function getRange(startAt: Date, endAt: Date | null) {
  return { start: startAt, end: endAt ?? new Date(startAt.getTime() + DEFAULT_DURATION_MS) };
}

async function getAppointment(id: number, clinicId: number) {
  return prisma.appointment.findFirst({
    where: { id, clinicId },
    select: { id: true, clinicId: true, startAt: true, endAt: true, status: true, vetId: true, pet: { select: { name: true } }, vet: { select: { id: true, name: true } } },
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermissions(["appointments.receiveUnassignedNowAlerts", "appointments.assign"]);
  const id = Number((await ctx.params).id);
  const appointment = await getAppointment(id, clinicId);
  if (!appointment) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const range = getRange(appointment.startAt, appointment.endAt);
  const vets = await prisma.clinicMember.findMany({
    where: { clinicId, isActive: true, role: { is: { key: "vet", isActive: true } } },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  const candidates = await prisma.appointment.findMany({
    where: {
      clinicId,
      status: { notIn: NON_BLOCKING_STATUSES },
      startAt: { gte: new Date(range.start.getTime() - 24 * 60 * 60_000), lte: new Date(range.end.getTime() + 24 * 60 * 60_000) },
      NOT: { id },
    },
    select: { vetId: true, startAt: true, endAt: true },
  });
  const available = vets
    .filter(({ user }) => !candidates.some((candidate) => {
      if (candidate.vetId !== user.id) return false;
      const candidateRange = getRange(candidate.startAt, candidate.endAt);
      return rangesOverlap(range.start, range.end, candidateRange.start, candidateRange.end);
    }))
    .map(({ user }) => user);

  return NextResponse.json({ vets: available });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => null) as { vetId?: unknown } | null;
  const requestedVetId = typeof body?.vetId === "string" ? body.vetId.trim() : "";
  if (!requestedVetId) return NextResponse.json({ error: "Veterinario requerido" }, { status: 422 });

  const { session, clinicId } = await requireClinicPermissions(["appointments.receiveUnassignedNowAlerts", "appointments.assign"]);
  if (requestedVetId !== session.user.id) {
    await requireClinicPermission("appointments.assign");
  }

  const id = Number((await ctx.params).id);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: { id, clinicId },
        select: { id: true, startAt: true, endAt: true, status: true, vetId: true, vet: { select: { name: true } } },
      });
      if (!appointment) throw new AssignmentConflict("No encontrado", "INVALID");
      if (appointment.vetId) throw new AssignmentConflict(`Esta cita ya fue tomada por ${appointment.vet?.name ?? "otro veterinario"}.`, "TAKEN");
      if (!ELIGIBLE_STATUSES.includes(appointment.status)) throw new AssignmentConflict("La cita ya no está disponible para asignación.", "INVALID");

      const vet = await tx.clinicMember.findFirst({
        where: { clinicId, userId: requestedVetId, isActive: true, role: { is: { key: "vet", isActive: true } } },
        select: { user: { select: { id: true, name: true } } },
      });
      if (!vet) throw new AssignmentConflict("El veterinario seleccionado no es válido.", "INVALID");

      const range = getRange(appointment.startAt, appointment.endAt);
      const candidates = await tx.appointment.findMany({
        where: { clinicId, vetId: requestedVetId, status: { notIn: NON_BLOCKING_STATUSES }, NOT: { id }, startAt: { gte: new Date(range.start.getTime() - 24 * 60 * 60_000), lte: new Date(range.end.getTime() + 24 * 60 * 60_000) } },
        select: { startAt: true, endAt: true },
      });
      if (candidates.some((candidate) => {
        const candidateRange = getRange(candidate.startAt, candidate.endAt);
        return rangesOverlap(range.start, range.end, candidateRange.start, candidateRange.end);
      })) throw new AssignmentConflict("Ese veterinario ya está ocupado en ese horario.", "BUSY");

      const claimed = await tx.appointment.updateMany({
        where: { id, clinicId, vetId: null, status: { in: ELIGIBLE_STATUSES } },
        data: { vetId: requestedVetId },
      });
      if (!claimed.count) {
        const winner = await tx.appointment.findFirst({ where: { id, clinicId }, select: { vet: { select: { name: true } }, vetId: true } });
        throw new AssignmentConflict(`Esta cita ya fue tomada por ${winner?.vet?.name ?? "otro veterinario"}.`, "TAKEN");
      }

      return tx.appointment.findUniqueOrThrow({ where: { id }, include: { pet: true, client: true, vet: { select: { id: true, name: true, email: true } } } });
    });
    await notifyAppointmentAssigned({ appointmentId: result.id, assignedVetId: requestedVetId, assignedByUserId: session.user.id, selfAssigned: requestedVetId === session.user.id });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AssignmentConflict) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    throw error;
  }
}
