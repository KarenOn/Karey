import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function getClinicIdOrFail() {
  const clinic = await prisma.clinic.findFirst({ select: { id: true } });
  return clinic?.id ?? null;
}

export async function GET() {
  const clinicId = await getClinicIdOrFail();
  if (!clinicId) return NextResponse.json([], { status: 200 });

  const rows = await prisma.vaccinationRecord.findMany({
    where: { clinicId },
    orderBy: { appliedAt: "desc" },
    select: {
      id: true,
      appliedAt: true,
      nextDueAt: true,
      batchNumber: true,
      pet: { select: { id: true, name: true, species: true } },
      vaccine: { select: { id: true, name: true } },
    },
    take: 200,
  });

  return NextResponse.json(rows, { status: 200 });
}
