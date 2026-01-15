import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
import { getWalkInClientId } from "@/lib/pos/getWalkInClient";

export async function GET() {
  const clinicId = await getClinicIdOrFail();
  const walkInClientId = await getWalkInClientId(clinicId!);

  const clients = await prisma.client.findMany({
    where: { clinicId },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
    },
  });

  return NextResponse.json({ walkInClientId, clients });
}
