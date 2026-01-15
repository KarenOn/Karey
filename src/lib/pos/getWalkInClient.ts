import { prisma } from "@/lib/prisma";

export async function getWalkInClientId(clinicId: number) {
  const existing = await prisma.client.findFirst({
    where: { clinicId, fullName: "VENTA GENERAL" },
    select: { id: true },
  });

  if (existing) return existing.id;

  const created = await prisma.client.create({
    data: { clinicId, fullName: "VENTA GENERAL", phone: null, email: null },
    select: { id: true },
  });

  return created.id;
}
