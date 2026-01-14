import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceUpdateSchema } from "@/lib/validators/invoice";
import { calcInvoiceTotals } from "@/lib/invoices/calc";
import { getClinicIdOrFail } from "@/lib/auth";
import { zodDetails } from "@/lib/zodDetails";
import { Prisma, InvoiceStatus } from "@/generated/prisma/client";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const clinicId = await getClinicIdOrFail();
  const id = Number((await params).id);

  const inv = await prisma.invoice.findFirst({
    where: { id, clinicId },
    select: {
      id: true,
      number: true,
      status: true,
      issueDate: true,
      dueDate: true,
      paidAt: true,
      subtotal: true,
      tax: true,
      discount: true,
      total: true,
      notes: true,
      client: { select: { id: true, fullName: true, phone: true, email: true } },
      pet: { select: { id: true, name: true } },
      items: {
        orderBy: { id: "asc" },
        select: { id: true, type: true, description: true, quantity: true, unitPrice: true, taxRate: true, lineTotal: true, serviceId: true, productId: true },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        select: { id: true, amount: true, method: true, reference: true, paidAt: true },
      },
    },
  });

  if (!inv) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });

  return NextResponse.json({
    ...inv,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate?.toISOString() ?? null,
    paidAt: inv.paidAt?.toISOString() ?? null,
    subtotal: inv.subtotal.toString(),
    tax: inv.tax.toString(),
    discount: inv.discount.toString(),
    total: inv.total.toString(),
    items: inv.items.map((it) => ({
      ...it,
      quantity: it.quantity.toString(),
      unitPrice: it.unitPrice.toString(),
      taxRate: it.taxRate.toString(),
      lineTotal: it.lineTotal.toString(),
    })),
    payments: inv.payments.map((p) => ({
      ...p,
      amount: p.amount.toString(),
      paidAt: p.paidAt.toISOString(),
    })),
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const clinicId = await getClinicIdOrFail();
  const id = Number((await params).id);

  const body = await req.json().catch(() => null);
  const parsed = InvoiceUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: zodDetails(parsed.error) }, { status: 422 });
  }

  const data = parsed.data;

  const current = await prisma.invoice.findFirst({
    where: { id, clinicId },
    select: { id: true, status: true },
  });
  if (!current) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });

  // regla simple: si ya está pagada, no toques items (solo notas, etc.)
  const isPaid = current.status === InvoiceStatus.PAID;

  // Si mandas items => recalculo
  const hasItems = Array.isArray((data).items);

  let totals:
    | { subtotal: Prisma.Decimal; tax: Prisma.Decimal; discount: Prisma.Decimal; total: Prisma.Decimal }
    | null = null;

  if (hasItems && !isPaid) {
    const items = (data).items as any[];
    const discount = Number((data).discount ?? 0);

    totals = calcInvoiceTotals(
      items.map((it) => ({ quantity: Number(it.quantity ?? 1), unitPrice: Number(it.unitPrice ?? 0), taxRate: Number(it.taxRate ?? 0) })),
      discount
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (hasItems && !isPaid) {
      // reemplazo total de items (simple y seguro)
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

      await tx.invoiceItem.createMany({
        data: (data).items.map((it: any) => {
          const qty = Number(it.quantity ?? 1);
          const price = Number(it.unitPrice ?? 0);
          const lineTotal = qty * price;

          return {
            invoiceId: id,
            type: it.type,
            serviceId: it.serviceId ?? null,
            productId: it.productId ?? null,
            description: it.description,
            quantity: new Prisma.Decimal(qty.toFixed(2)),
            unitPrice: new Prisma.Decimal(price.toFixed(2)),
            taxRate: new Prisma.Decimal(Number(it.taxRate ?? 0).toFixed(2)),
            lineTotal: new Prisma.Decimal(lineTotal.toFixed(2)),
          };
        }),
      });
    }

    return tx.invoice.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
        ...(data.petId !== undefined ? { petId: data.petId ?? null } : {}),
        ...(data.appointmentId !== undefined ? { appointmentId: data.appointmentId ?? null } : {}),
        ...(data.issueDate !== undefined ? { issueDate: data.issueDate ? new Date(data.issueDate) : new Date() } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
        ...(data.status !== undefined && !isPaid ? { status: data.status } : {}),
        ...(totals
          ? {
              subtotal: totals.subtotal,
              tax: totals.tax,
              discount: totals.discount,
              total: totals.total,
            }
          : {}),
      },
      select: { id: true },
    });
  });

  return NextResponse.json(updated);
}
