import { NextResponse } from "next/server";
import { Weekday } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from "@/lib/validators/appointments";

export async function GET() {
  const clinicId = await getClinicIdOrFail();
  if (!clinicId) {
    return NextResponse.json({ error: "Clínica no encontrada" }, { status: 404 });
  }

  const [clients, pets, vets, schedules] = await Promise.all([
    prisma.client.findMany({
      where: { clinicId },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, phone: true },
    }),
    prisma.pet.findMany({
      where: { clinicId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, species: true, clientId: true },
    }),
    prisma.clinicMember.findMany({
      where: {
        clinicId,
        isActive: true,
        role: { is: { key: "vet" } },
      },
      select: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.clinicSchedule.findMany({
      where: { clinicId },
      orderBy: { day: "asc" },
      select: { day: true, open: true, close: true, closed: true },
    }),
  ]);

  const existingDays = new Set(schedules.map((schedule) => schedule.day));
  const normalizedSchedules = [
    ...schedules,
    ...Object.values(Weekday)
      .filter((day) => !existingDays.has(day))
      .map((day) => ({ day, open: null, close: null, closed: false })),
  ].sort((left, right) => Object.values(Weekday).indexOf(left.day) - Object.values(Weekday).indexOf(right.day));

  return NextResponse.json({
    clients,
    pets,
    vets: vets.map((member) => member.user).sort((left, right) => left.name.localeCompare(right.name)),
    schedules: normalizedSchedules,
    appointmentTypes: APPOINTMENT_TYPES,
    appointmentStatuses: APPOINTMENT_STATUSES,
  });
}
