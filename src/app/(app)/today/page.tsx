export const dynamic = "force-dynamic";

import { endOfDay, startOfDay } from "date-fns";
import { AppointmentStatus, TodayTurnStatus } from "@/generated/prisma/client";
import { getClinicIdOrFail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TodayWorkspace, {
  type TodayAppointmentItem,
  type TodayTurnItem,
} from "./TodayWorkspace";

export default async function TodayPage() {
  const clinicId = await getClinicIdOrFail();
  const today = new Date();
  const from = startOfDay(today);
  const to = endOfDay(today);

  const [appointments, turns] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        clinicId,
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
