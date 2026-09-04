export const dynamic = "force-dynamic";

import { getClinicDayRange } from "@/lib/appointment-time";
import { AppointmentStatus, TodayTurnStatus } from "@/generated/prisma/client";
import { requireClinicPermission } from "@/lib/server-auth";
import { reconcileOverdueAppointments } from "@/lib/reconcile-appointments";
import { prisma } from "@/lib/prisma";
import TodayWorkspace, {
  type TodayAppointmentItem,
  type TodayTurnItem,
} from "./TodayWorkspace";

export default async function TodayPage() {
  const { clinicId, member, session } = await requireClinicPermission("appointments.read");
  await reconcileOverdueAppointments();
  const today = new Date();
  const { start: from, end: to } = getClinicDayRange(today, member.clinic.timezone);

  const [appointments, turns] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        clinicId,
        ...(member?.role.key === "vet" ? { OR: [{ vetId: session.user.id }, { vetId: null }] } : {}),
        startAt: { gte: from, lte: to },
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        clientId: true,
        petId: true,
        type: true,
        startAt: true,
        status: true,
        vetId: true,
        client: {
          select: {
            id: true,
            fullName: true,
          },
        },
        pet: {
          select: {
            id: true,
            name: true,
          },
        },
        invoice: {
          select: {
            id: true,
          },
        },
      },
    }),
    prisma.todayTurn.findMany({
      where: {
        clinicId,
        arrivalAt: { gte: from, lte: to },
        status: { not: TodayTurnStatus.CANCELLED },
      },
      orderBy: { arrivalAt: "asc" },
      select: {
        id: true,
        petId: true,
        clientId: true,
        petName: true,
        ownerName: true,
        ownerPhone: true,
        type: true,
        serviceName: true,
        arrivalAt: true,
        status: true,
      },
    }),
  ]);

  const initialAppointments: TodayAppointmentItem[] = appointments.map(
    (appointment) => ({
      id: appointment.id,
      clientId: appointment.clientId,
      clientName: appointment.client.fullName,
      invoiceId: appointment.invoice?.id ?? null,
      petId: appointment.petId,
      petName: appointment.pet.name,
      startAt: appointment.startAt.toISOString(),
      status: appointment.status as TodayAppointmentItem["status"],
      vetId: appointment.vetId,
      type: appointment.type,
    })
  );

  const initialTurns: TodayTurnItem[] = turns.map((turn) => ({
    arrivalAt: turn.arrivalAt.toISOString(),
    clientId: turn.clientId ?? null,
    id: turn.id,
    ownerName: turn.ownerName,
    ownerPhone: turn.ownerPhone,
    petId: turn.petId ?? null,
    petName: turn.petName,
    service: turn.type as TodayTurnItem["service"],
    serviceName: turn.serviceName,
    status: turn.status as TodayTurnItem["status"],
  }));

  return (
    <TodayWorkspace
      initialAppointments={initialAppointments}
      initialDateIso={today.toISOString()}
      initialTurns={initialTurns}
    />
  );
}
