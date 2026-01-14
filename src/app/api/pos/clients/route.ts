import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";

export async function GET() {
  const clinicId = await getClinicIdOrFail();

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

  return NextResponse.json(clients);
}
