import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
import { PaymentCreateSchema } from "@/lib/validators/payment";
import { InvoiceStatus, Prisma } from "@/generated/prisma/client";
import { zodDetails } from "@/lib/zodDetails";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const clinicId = await getClinicIdOrFail();
  const invoiceId = Number(params.id);

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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const clinicId = await getClinicIdOrFail();
  const invoiceId = Number(params.id);

  const body = await req.json().catch(() => null);
  const parsed = PaymentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pago inválido", details: zodDetails(parsed.error) }, { status: 422 });
  }

  const input = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findFirst({
      where: { id: invoiceId, clinicId },
      select: { id: true, total: true, status: true },
    });
    if (!inv) throw new Error("NOT_FOUND");

    const created = await tx.payment.create({
      data: {
        invoiceId,
        amount: new Prisma.Decimal(input.amount.toFixed(2)),
        method: input.method,
        reference: input.reference ?? null,
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
      },
      select: { id: true },
    });

    const sum = await tx.payment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });

    const paidTotal = sum._sum.amount ?? new Prisma.Decimal(0);
    const isFullyPaid = paidTotal.greaterThanOrEqualTo(inv.total);

    if (isFullyPaid) {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PAID, paidAt: new Date() },
      });
    }

    return { paymentId: created.id, isFullyPaid };
  });

  return NextResponse.json(result, { status: 201 });
}
