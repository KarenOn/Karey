import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { assertCashEnabled } from "@/lib/server/cash";

const UpdateSchema = z.object({ name: z.string().trim().min(1).max(80).optional(), isActive: z.boolean().optional() }).refine((data) => data.name !== undefined || data.isActive !== undefined);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("cash.operate");
  const id = Number((await params).id);
  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(id) || !parsed.success) return NextResponse.json({ error: "Datos de caja inválidos." }, { status: 422 });
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await assertCashEnabled(tx, clinicId);
      const current = await tx.cashRegister.findFirst({ where: { id, clinicId }, select: { id: true } });
      if (!current) throw new Error("NOT_FOUND");
      if (parsed.data.isActive === false) {
        const open = await tx.cashSession.count({ where: { registerId: id, status: "OPEN" } });
        if (open) throw new Error("CASH_OPEN_SESSIONS");
      }
      return tx.cashRegister.update({ where: { id }, data: parsed.data });
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return NextResponse.json({ error: "Caja no encontrada." }, { status: 404 });
    if (error instanceof Error && error.message === "CASH_OPEN_SESSIONS") return NextResponse.json({ error: "Debes cerrar la sesión abierta antes de desactivar esta caja." }, { status: 409 });
    if (error instanceof Error && error.message === "CASH_NOT_ENTITLED") return NextResponse.json({ error: "Esta clínica no tiene Caja Premium habilitada." }, { status: 403 });
    if ((error as { code?: string })?.code === "P2002") return NextResponse.json({ error: "Ya existe una caja con ese nombre." }, { status: 409 });
    throw error;
  }
}
