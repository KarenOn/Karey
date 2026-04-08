export const dynamic = 'force-dynamic';
import TodayTurns from "./TodayTurn";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth"; // ajusta a tu helper real
import { startOfDay, endOfDay } from "date-fns";
import type { TodayTurnDTO } from "./TodayTurn";

function toTodayTurnDTO<T extends Record<string, any>>(row: T): TodayTurnDTO {
  return {
    id: row.id,
    petId: row.petId ?? null,
    clientId: row.clientId ?? null,
    petName: row.petName,
    species: row.species,
    ownerName: row.ownerName,
    ownerPhone: row.ownerPhone ?? null,
    service: row.type,
    serviceName: row.serviceName,
    notes: row.notes ?? null,
    estimatedDuration: row.estimatedDurationMins,
    arrivalAt: row.arrivalAt?.toISOString?.() ?? row.arrivalAt,
    status: row.status,
    notified: Boolean(row.notifiedAt),
    notifiedAt: row.notifiedAt?.toISOString?.() ?? row.notifiedAt ?? null,
  };
}

export default async function TodayTurnsPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }> ;
}) {
  const clinicId = await getClinicIdOrFail();

  const { date } = searchParams ? await searchParams : {};

  const day = date ? new Date(date) : new Date();
  const from = startOfDay(day);
  const to = endOfDay(day);

  const turns = await prisma.todayTurn.findMany({
    where: {
      clinicId,
      arrivalAt: { gte: from, lte: to },
    },
    orderBy: { arrivalAt: "asc" },
  });

  // Si quieres llenar selects (pets/clients) desde server:
  const pets = await prisma.pet.findMany({
    where: { clinicId },
    select: {
      id: true,
      name: true,
      species: true,
      client: { select: { id: true, fullName: true, phone: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <TodayTurns
      initialTurns={turns.map(toTodayTurnDTO)}
      pets={pets}
      date={day.toISOString().slice(0, 10)}
    />
  );
}
