// src/app/(app)/today-turns/page.tsx
import TodayTurns from "./TodayTurn";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth"; // ajusta a tu helper real
import { startOfDay, endOfDay } from "date-fns";

function toISO<T extends Record<string, any>>(row: T) {
  // Convierte Date -> string para poder pasar a Client Component sin líos
  return {
    ...row,
    arrivalAt: row.arrivalAt?.toISOString?.() ?? row.arrivalAt,
    notifiedAt: row.notifiedAt?.toISOString?.() ?? row.notifiedAt,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
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
      initialTurns={turns.map(toISO)}
      pets={pets}
      date={day.toISOString().slice(0, 10)}
    />
  );
}
