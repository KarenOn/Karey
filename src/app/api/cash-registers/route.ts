import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { assertCashEnabled } from "@/lib/server/cash";

const RegisterSchema = z.object({ name: z.string().trim().min(1).max(80), isActive: z.boolean().optional().default(true) });

export async function GET() {
  const { clinicId } = await requireClinicPermission("cash.read");
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { cashEntitled: true, cashEnabled: true } });
  if (!clinic?.cashEntitled || !clinic.cashEnabled) return NextResponse.json({ error: "El control de caja está desactivado para esta clínica." }, { status: 404 });
  return NextResponse.json(await prisma.cashRegister.findMany({ where: { clinicId }, orderBy: { id: "asc" }, include: { sessions: { where: { status: "OPEN" }, select: { id: true } } } }));
}

export async function POST(req: Request) {
  const { clinicId } = await requireClinicPermission("cash.open");
  const parsed = RegisterSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nombre de caja inválido." }, { status: 422 });
  try {
    const created = await prisma.$transaction(async (tx) => {
      await assertCashEnabled(tx, clinicId);
      return tx.cashRegister.create({ data: { clinicId, name: parsed.data.name, isActive: parsed.data.isActive } });
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CASH_NOT_ENTITLED") return NextResponse.json({ error: "Esta clínica no tiene Caja Premium habilitada." }, { status: 403 });
    if (error instanceof Error && error.message === "CASH_DISABLED") return NextResponse.json({ error: "El control de caja está desactivado para esta clínica." }, { status: 409 });
    if ((error as { code?: string })?.code === "P2002") return NextResponse.json({ error: "Ya existe una caja con ese nombre." }, { status: 409 });
    throw error;
  }
}
