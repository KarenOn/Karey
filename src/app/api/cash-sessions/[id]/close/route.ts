import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { assertCashEnabled, canCloseCashSession, lockCashSession, summarizeCashSession } from "@/lib/server/cash";
import { Prisma } from "@/generated/prisma/client";
import { hasPermission, isElevatedClinicRole } from "@/lib/permissions";

const CloseSchema = z.object({ countedCash: z.coerce.number().finite().min(0), closingNotes: z.string().trim().max(2000).nullable().optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId, member } = await requireClinicPermission("cash.close");
  const sessionId = Number((await params).id);
  const parsed = CloseSchema.safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(sessionId) || sessionId <= 0) return NextResponse.json({ error: "Caja inválida." }, { status: 400 });
  if (!parsed.success) return NextResponse.json({ error: "El efectivo contado no es válido." }, { status: 422 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await lockCashSession(tx, clinicId, sessionId);
      await assertCashEnabled(tx, clinicId);
      if (!locked) throw new Error("CASH_NOT_FOUND");
      if (locked.status !== "OPEN") throw new Error("CASH_CLOSED");
      const canCloseAny =
        isElevatedClinicRole(member.role.key) ||
        hasPermission(member.role.permissions, "cash.closeAny");
      const isForeignSession = locked.openedById !== session.user.id;
      if (!canCloseCashSession(locked.openedById, session.user.id, canCloseAny)) throw new Error("CASH_CLOSE_FORBIDDEN");
      if (isForeignSession && !parsed.data.closingNotes?.trim()) {
        throw new Error("CASH_CLOSE_REASON_REQUIRED");
      }
      const summary = await summarizeCashSession(tx, sessionId);
      const difference = parsed.data.countedCash - summary.expectedCash;
      await tx.cashSession.update({ where: { id: sessionId }, data: { status: "CLOSED", closedById: session.user.id, closedAt: new Date(), expectedCash: new Prisma.Decimal(summary.expectedCash.toFixed(2)), countedCash: new Prisma.Decimal(parsed.data.countedCash.toFixed(2)), difference: new Prisma.Decimal(difference.toFixed(2)), closingNotes: parsed.data.closingNotes ?? null } });
      return { expectedCash: summary.expectedCash, countedCash: parsed.data.countedCash, difference };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "CASH_NOT_FOUND") return NextResponse.json({ error: "Caja no encontrada." }, { status: 404 });
    if (error instanceof Error && error.message === "CASH_CLOSED") return NextResponse.json({ error: "La caja ya está cerrada." }, { status: 409 });
    if (error instanceof Error && error.message === "CASH_CLOSE_FORBIDDEN") return NextResponse.json({ error: "Solo puedes cerrar tu propia sesión de caja." }, { status: 403 });
    if (error instanceof Error && error.message === "CASH_CLOSE_REASON_REQUIRED") return NextResponse.json({ error: "Indica el motivo para cerrar una sesión ajena." }, { status: 422 });
    if (error instanceof Error && error.message === "CASH_NOT_ENTITLED") return NextResponse.json({ error: "Esta clínica no tiene Caja Premium habilitada." }, { status: 403 });
    if (error instanceof Error && error.message === "CASH_DISABLED") return NextResponse.json({ error: "El control de caja está desactivado para esta clínica." }, { status: 409 });
    throw error;
  }
}
