import { Prisma } from "@/generated/prisma/client";

export const CASH_SESSION_REQUIRED = "CASH_SESSION_REQUIRED";
export const CASH_REGISTER_REQUIRED = "CASH_REGISTER_REQUIRED";
export const CASH_DISABLED = "CASH_DISABLED";
export const CASH_NOT_ENTITLED = "CASH_NOT_ENTITLED";

export function canUseCashOperationally(feature: { cashEntitled: boolean; cashEnabled: boolean }) {
  return feature.cashEntitled && feature.cashEnabled;
}

export async function assertCashEntitled(tx: Prisma.TransactionClient, clinicId: number) {
  const clinic = await tx.clinic.findUnique({ where: { id: clinicId }, select: { cashEntitled: true } });
  if (!clinic?.cashEntitled) throw new Error(CASH_NOT_ENTITLED);
}

export async function assertCashEnabled(tx: Prisma.TransactionClient, clinicId: number) {
  const clinic = await tx.clinic.findUnique({ where: { id: clinicId }, select: { cashEntitled: true, cashEnabled: true } });
  if (!clinic?.cashEntitled) throw new Error(CASH_NOT_ENTITLED);
  if (!clinic?.cashEnabled) throw new Error(CASH_DISABLED);
}

export function calculateExpectedCash(openingFloat: number, cashPayments: number, cashIn: number, cashOut: number) {
  return openingFloat + cashPayments + cashIn - cashOut;
}

export function canCloseCashSession(openedById: string, currentUserId: string, canCloseAny: boolean) {
  return openedById === currentUserId || canCloseAny;
}

export async function lockOpenCashSession(tx: Prisma.TransactionClient, clinicId: number) {
  const rows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT "id" FROM "cashsession"
    WHERE "clinicId" = ${clinicId} AND "status" = 'OPEN'
    FOR UPDATE
  `);
  return rows[0]?.id ?? null;
}

export async function resolvePaymentCashSession(tx: Prisma.TransactionClient, clinicId: number, method: string) {
  return resolvePaymentCashSessionForRegister(tx, clinicId, method);
}

export async function resolvePaymentCashSessionForRegister(tx: Prisma.TransactionClient, clinicId: number, method: string, registerId?: number | null) {
  const clinic = await tx.clinic.findUnique({ where: { id: clinicId }, select: { cashEntitled: true, cashEnabled: true, requireCashSessionForCash: true } });
  if (!clinic || !canUseCashOperationally(clinic)) return null;

  if (registerId) {
    const register = await tx.cashRegister.findFirst({ where: { id: registerId, clinicId, isActive: true }, select: { id: true } });
    if (!register) throw new Error("CASH_REGISTER_INVALID");
  }

  const openSessions = await tx.cashSession.findMany({ where: { clinicId, status: "OPEN", ...(registerId ? { registerId } : {}) }, select: { id: true }, orderBy: { id: "asc" } });
  if (openSessions.length > 1 && !registerId) throw new Error(CASH_REGISTER_REQUIRED);
  const sessionId = openSessions[0]?.id ?? null;
  if (sessionId) return sessionId;
  if (method === "CASH" && clinic.requireCashSessionForCash) throw new Error(CASH_SESSION_REQUIRED);
  return sessionId;
}

export async function lockCashSession(tx: Prisma.TransactionClient, clinicId: number, sessionId: number) {
  const rows = await tx.$queryRaw<Array<{ id: number; status: string; openedById: string }>>(Prisma.sql`
    SELECT "id", "status", "openedById" FROM "cashsession"
    WHERE "id" = ${sessionId} AND "clinicId" = ${clinicId}
    FOR UPDATE
  `);
  return rows[0] ?? null;
}

export async function summarizeCashSession(tx: Prisma.TransactionClient, sessionId: number) {
  const session = await tx.cashSession.findUniqueOrThrow({ where: { id: sessionId }, select: { openingFloat: true } });
  const payments = await tx.payment.findMany({
    where: { cashSessionId: sessionId, invoice: { status: { not: "VOID" } } },
    select: { amount: true, method: true },
  });
  const movements = await tx.cashMovement.findMany({ select: { type: true, amount: true }, where: { cashSessionId: sessionId } });
  const totalCollected = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const cashPayments = payments.filter((payment) => payment.method === "CASH").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const cardPayments = payments.filter((payment) => payment.method === "CARD").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const transferPayments = payments.filter((payment) => payment.method === "TRANSFER").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const otherPayments = payments.filter((payment) => !["CASH", "CARD", "TRANSFER"].includes(payment.method)).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const cashIn = movements.filter((movement) => movement.type === "CASH_IN").reduce((sum, movement) => sum + Number(movement.amount), 0);
  const cashOut = movements.filter((movement) => movement.type === "CASH_OUT").reduce((sum, movement) => sum + Number(movement.amount), 0);
  const openingFloat = Number(session.openingFloat);
  return {
    openingFloat,
    totalCollected,
    cashPayments,
    cardPayments,
    transferPayments,
    otherPayments,
    cashIn,
    cashOut,
    expectedCash: calculateExpectedCash(openingFloat, cashPayments, cashIn, cashOut),
  };
}
