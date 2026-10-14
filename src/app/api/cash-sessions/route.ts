import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { assertCashEnabled, summarizeCashSession } from "@/lib/server/cash";

const OpenSchema = z.object({ openingFloat: z.coerce.number().finite().min(0), registerId: z.coerce.number().int().positive().optional() });

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

function serialize(value: number | null | undefined) {
  return value == null ? null : value.toFixed(2);
}

async function serializeSession(tx: Prisma.TransactionClient, session: { id: number; clinicId: number; register: { id: number; name: string }; openedAt: Date; openingFloat: Prisma.Decimal; status: string; closedAt: Date | null; expectedCash: Prisma.Decimal | null; countedCash: Prisma.Decimal | null; difference: Prisma.Decimal | null; closingNotes: string | null; openedBy: { id: string; name: string }; closedBy: { id: string; name: string } | null; movements: Array<{ id: number; type: string; amount: Prisma.Decimal; concept: string; note: string | null; createdAt: Date; createdBy: { name: string } }>; payments: Array<{ id: number; amount: Prisma.Decimal; method: string; paidAt: Date; invoice: { id: number; number: string; total: Prisma.Decimal; client: { fullName: string }; pet: { name: string } | null }; createdBy: { name: string } | null }> }) {
  const summary = await summarizeCashSession(tx, session.id);
  const operations = [
    ...session.payments.map((payment) => ({
      id: `payment-${payment.id}`,
      kind: "PAYMENT" as const,
      paidAt: payment.paidAt.toISOString(),
      amount: serialize(Number(payment.amount)),
      method: payment.method,
      invoiceId: payment.invoice.id,
      invoiceNumber: payment.invoice.number,
      clientName: payment.invoice.client.fullName === "VENTA GENERAL" ? null : payment.invoice.client.fullName,
      petName: payment.invoice.pet?.name ?? null,
      context: Number(payment.amount) >= Number(payment.invoice.total) ? "Pago completo" : "Pago parcial",
      responsible: payment.createdBy?.name ?? null,
    })),
    ...session.movements.map((movement) => ({
      id: `movement-${movement.id}`,
      kind: "MOVEMENT" as const,
      paidAt: movement.createdAt.toISOString(),
      amount: serialize(Number(movement.amount)),
      method: "CASH",
      invoiceId: null,
      invoiceNumber: null,
      clientName: null,
      petName: null,
      context: movement.type === "CASH_IN" ? "Entrada manual" : "Salida manual",
      responsible: movement.createdBy.name,
      movementType: movement.type,
      concept: movement.concept,
      note: movement.note,
    })),
  ].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  return {
    ...session,
    register: session.register,
    openingFloat: serialize(Number(session.openingFloat)),
    openingAmount: serialize(Number(session.openingFloat)),
    expectedCash: serialize(session.expectedCash != null ? Number(session.expectedCash) : summary.expectedCash),
    countedCash: serialize(session.countedCash != null ? Number(session.countedCash) : null),
    difference: serialize(session.difference != null ? Number(session.difference) : null),
    totalCollected: serialize(summary.totalCollected),
    cashPayments: serialize(summary.cashPayments),
    cardPayments: serialize(summary.cardPayments),
    transferPayments: serialize(summary.transferPayments),
    otherPayments: serialize(summary.otherPayments),
    cashIn: serialize(summary.cashIn),
    cashOut: serialize(summary.cashOut),
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    openedBy: session.openedBy,
    closedBy: session.closedBy,
    movements: session.movements.map((movement) => ({ ...movement, amount: serialize(Number(movement.amount)), createdAt: movement.createdAt.toISOString(), createdBy: movement.createdBy })),
    payments: session.payments.map((payment) => ({ id: payment.id, amount: serialize(Number(payment.amount)), method: payment.method, paidAt: payment.paidAt.toISOString(), invoiceId: payment.invoice.id, invoiceNumber: payment.invoice.number, clientName: payment.invoice.client.fullName === "VENTA GENERAL" ? null : payment.invoice.client.fullName, petName: payment.invoice.pet?.name ?? null, context: Number(payment.amount) >= Number(payment.invoice.total) ? "Pago completo" : "Pago parcial", createdBy: payment.createdBy })),
    operations,
  };
}

export async function GET() {
  const { clinicId } = await requireClinicPermission("cash.read");
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { cashEntitled: true, cashEnabled: true } });
  if (clinic?.cashEntitled && !clinic.cashEnabled) return NextResponse.json({ error: "El control de caja está desactivado para esta clínica." }, { status: 404 });
  const sessions = await prisma.cashSession.findMany({
    where: { clinicId, ...(!clinic?.cashEntitled ? { status: "CLOSED" as const } : {}) },
    orderBy: { openedAt: "desc" },
    take: 50,
    include: {
      register: { select: { id: true, name: true } },
      openedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
      movements: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
      payments: { orderBy: { paidAt: "desc" }, include: { createdBy: { select: { name: true } }, invoice: { select: { id: true, number: true, total: true, client: { select: { fullName: true } }, pet: { select: { name: true } } } } } },
    },
  });
  const serialized = await prisma.$transaction(async (tx) => Promise.all(sessions.map((session) => serializeSession(tx, session))));
  const openSessions = serialized.filter((session) => session.status === "OPEN");
  return NextResponse.json({ openSession: openSessions[0] ?? null, openSessions, history: serialized.filter((session) => session.status !== "OPEN") });
}

export async function POST(req: Request) {
  const { clinicId } = await requireClinicPermission("cash.open");
  const parsed = OpenSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "El fondo inicial no es válido." }, { status: 422 });
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  try {
    const created = await prisma.$transaction(async (tx) => {
      await assertCashEnabled(tx, clinicId);
      const register = parsed.data.registerId
        ? await tx.cashRegister.findFirst({ where: { id: parsed.data.registerId, clinicId, isActive: true }, select: { id: true } })
        : await tx.cashRegister.findFirst({ where: { clinicId, isActive: true }, orderBy: { id: "asc" }, select: { id: true } });
      if (!register) throw new Error("CASH_REGISTER_INVALID");
      const open = await tx.cashSession.findFirst({ where: { registerId: register.id, status: "OPEN" }, select: { id: true } });
      if (open) throw new Error("CASH_ALREADY_OPEN");
      return tx.cashSession.create({ data: { clinicId, registerId: register.id, openedById: userId, openingFloat: new Prisma.Decimal(parsed.data.openingFloat) }, select: { id: true } });
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CASH_NOT_ENTITLED") return NextResponse.json({ error: "Esta clínica no tiene Caja Premium habilitada." }, { status: 403 });
    if (error instanceof Error && error.message === "CASH_DISABLED") return NextResponse.json({ error: "El control de caja está desactivado para esta clínica." }, { status: 409 });
    if (error instanceof Error && (error.message === "CASH_ALREADY_OPEN" || (error as Prisma.PrismaClientKnownRequestError).code === "P2002")) return NextResponse.json({ error: "Ya existe una sesión abierta para esa caja." }, { status: 409 });
    if (error instanceof Error && error.message === "CASH_REGISTER_INVALID") return NextResponse.json({ error: "Selecciona una caja activa." }, { status: 409 });
    throw error;
  }
}
