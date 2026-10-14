import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";

export async function GET() {
  const { clinicId } = await requireClinicPermission("payments.register");
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { cashEntitled: true, cashEnabled: true } });
  if (!clinic?.cashEntitled || !clinic.cashEnabled) return NextResponse.json([]);
  return NextResponse.json(await prisma.cashSession.findMany({ where: { clinicId, status: "OPEN" }, select: { id: true, register: { select: { id: true, name: true } } }, orderBy: { registerId: "asc" } }));
}
