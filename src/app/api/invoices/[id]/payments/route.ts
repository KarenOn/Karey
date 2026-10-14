import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { PaymentCreateSchema } from "@/lib/validators/payment";
import { InvoiceStatus, Prisma } from "@/generated/prisma/client";
import { zodDetails } from "@/lib/zodDetails";
import { notifyInvoiceEvent } from "@/lib/in-app-notifications";
import { CASH_REGISTER_REQUIRED, CASH_SESSION_REQUIRED, resolvePaymentCashSessionForRegister } from "@/lib/server/cash";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("payments.read");
  const invoiceId = Number((await params).id);

  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, clinicId },
    select: { id: true },
  });
  if (!inv) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });

  const payments = await prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { paidAt: "desc" },
    select: { id: true, amount: true, method: true, reference: true, paidAt: true },
  });

  return NextResponse.json(
    payments.map((p) => ({
      ...p,
      amount: p.amount.toString(),
      paidAt: p.paidAt.toISOString(),
    }))
  );
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId, session } = await requireClinicPermission("payments.register");
  const invoiceId = Number((await params).id);

  const body = await req.json().catch(() => null);
  const parsed = PaymentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pago inválido", details: zodDetails(parsed.error) }, { status: 422 });
  }

  const input = parsed.data;
  try {
  const result = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findFirst({
      where: { id: invoiceId, clinicId },
      select: { id: true, total: true, status: true },
    });
    if (!inv) throw new Error("NOT_FOUND");

    const cashSessionId = await resolvePaymentCashSessionForRegister(tx, clinicId, input.method, input.registerId);

    const created = await tx.payment.create({
      data: {
        invoiceId,
        amount: new Prisma.Decimal(input.amount.toFixed(2)),
        method: input.method,
        reference: input.reference ?? null,
        cashSessionId,
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
        createdById: session.user.id,
      },
      select: { id: true },
    });

    const sum = await tx.payment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });

    const paidTotal = sum._sum.amount ?? new Prisma.Decimal(0);
    const isFullyPaid = paidTotal.greaterThanOrEqualTo(inv.total);
    const hasAnyPayment = paidTotal.greaterThan(new Prisma.Decimal(0));

    if (isFullyPaid) {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PAID, paidAt: new Date() },
      });
    } else if (hasAnyPayment) {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PARTIALLY_PAID, paidAt: null },
      });
    }

    return { paymentId: created.id, isFullyPaid, previousStatus: inv.status, nextStatus: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID };
  });

  if (result.nextStatus !== result.previousStatus) {
    await notifyInvoiceEvent(invoiceId, result.isFullyPaid ? "PAID" : "PARTIAL_PAYMENT");
  }

  return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === CASH_SESSION_REQUIRED) {
      return NextResponse.json({ error: "Debes abrir una caja antes de registrar un pago en efectivo." }, { status: 409 });
    }
    if (error instanceof Error && error.message === CASH_REGISTER_REQUIRED) return NextResponse.json({ error: "Selecciona la caja donde registrar este pago." }, { status: 409 });
    if (error instanceof Error && error.message === "CASH_REGISTER_INVALID") return NextResponse.json({ error: "La caja seleccionada no está disponible." }, { status: 409 });
    if (error instanceof Error && error.message === "NOT_FOUND") return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    throw error;
  }
}
