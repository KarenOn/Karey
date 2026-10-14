import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { assertCashEnabled, lockCashSession } from "@/lib/server/cash";

const MovementSchema = z.object({
  type: z.enum(["CASH_IN", "CASH_OUT"]),
  amount: z.coerce.number().finite().positive(),
  concept: z.string().trim().min(1).max(160),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("cash.operate");
  const sessionId = Number((await params).id);
  const parsed = MovementSchema.safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(sessionId) || sessionId <= 0) return NextResponse.json({ error: "Caja inválida." }, { status: 400 });
  if (!parsed.success) return NextResponse.json({ error: "Movimiento de caja inválido." }, { status: 422 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  try {
    const created = await prisma.$transaction(async (tx) => {
      const locked = await lockCashSession(tx, clinicId, sessionId);
      await assertCashEnabled(tx, clinicId);
      if (!locked) throw new Error("CASH_NOT_FOUND");
      if (locked.status !== "OPEN") throw new Error("CASH_CLOSED");
      return tx.cashMovement.create({ data: { cashSessionId: sessionId, type: parsed.data.type, amount: parsed.data.amount, concept: parsed.data.concept, note: parsed.data.note ?? null, createdById: session.user.id } });
    });
    return NextResponse.json({ ...created, amount: created.amount.toString(), createdAt: created.createdAt.toISOString() }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CASH_NOT_FOUND") return NextResponse.json({ error: "Caja no encontrada." }, { status: 404 });
    if (error instanceof Error && error.message === "CASH_CLOSED") return NextResponse.json({ error: "La caja ya está cerrada." }, { status: 409 });
    if (error instanceof Error && error.message === "CASH_NOT_ENTITLED") return NextResponse.json({ error: "Esta clínica no tiene Caja Premium habilitada." }, { status: 403 });
    if (error instanceof Error && error.message === "CASH_DISABLED") return NextResponse.json({ error: "El control de caja está desactivado para esta clínica." }, { status: 409 });
    throw error;
  }
}
