import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const clinicId = await getClinicIdOrFail();
  const { id } = await ctx.params;
  const clientId = Number(id);

  if (!Number.isFinite(clientId)) {
    return NextResponse.json({ error: "clientId inválido" }, { status: 400 });
  }

  const pets = await prisma.pet.findMany({
    where: { clinicId, clientId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      species: true,
      breed: true,
    },
  });

  return NextResponse.json(pets);
}
