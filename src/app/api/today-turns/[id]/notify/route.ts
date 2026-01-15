import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const clinicId = await getClinicIdOrFail();
  const { id } = await ctx.params;
  const turnId = Number(id);
  if (!Number.isFinite(turnId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const updated = await prisma.todayTurn.updateMany({
    where: { id: turnId, clinicId },
    data: { notifiedAt: new Date() },
  });

  if (updated.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const row = await prisma.todayTurn.findFirst({ where: { id: turnId, clinicId } });
  return NextResponse.json(row);
}
