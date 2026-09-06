import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";

export async function GET() {
  const { clinicId } = await requireClinicPermission("vaccines.read");

  const vaccines = await prisma.vaccineCatalog.findMany({
    where: { clinicId, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(vaccines);
}
