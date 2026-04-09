import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";

export async function GET() {
  const { clinicId } = await requireClinicPermission("pets.read");

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
