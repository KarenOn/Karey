import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceCreateSchema } from "@/lib/validators/invoice";
import { calcInvoiceTotals } from "@/lib/invoices/calc";
import { getClinicIdOrFail } from "@/lib/auth"; // usa tu helper real
import { zodDetails } from "@/lib/zodDetails"; // usa tu helper real
import { InvoiceItemType, PaymentMethod, InvoiceStatus, Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { getWalkInClientId } from "@/lib/pos/getWalkInClient";

function yyyymmdd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function nextInvoiceNumber(clinicId: number, issueDate: Date) {
  const start = new Date(issueDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const last = await prisma.invoice.findFirst({
    where: { clinicId, issueDate: { gte: start, lt: end } },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  let seq = 1;
  if (last?.number) {
    const parts = last.number.split("-");
    const lastSeq = Number(parts[parts.length - 1]);
    if (!Number.isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `FAC-${yyyymmdd(issueDate)}-${String(seq).padStart(4, "0")}`;
}

const ItemSchema = z.object({
  type: z.nativeEnum(InvoiceItemType),
  serviceId: z.number().int().positive().nullable().optional(),
  productId: z.number().int().positive().nullable().optional(),
  description: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).optional().default(0),
});

const CreateInvoiceSchema = z.object({
  clientId: z.number().int().positive().optional(),
  petId: z.number().int().positive().nullable().optional(),
  appointmentId: z.number().int().positive().nullable().optional(),

  dueDate: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),

  discount: z.coerce.number().min(0).optional().default(0),
  invoiceTaxRate: z.coerce.number().min(0).max(100).optional().default(0), // ITBIS general (opcional)

  items: z.array(ItemSchema).min(1),

  payNow: z.boolean().optional().default(false),
  payment: z
    .object({
      amount: z.coerce.number().positive(),
      method: z.nativeEnum(PaymentMethod).optional().default(PaymentMethod.CASH),
      reference: z.string().trim().max(120).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export async function GET(req: Request) {
  const clinicId = await getClinicIdOrFail();
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const take = Math.min(Number(searchParams.get("take") || 200), 500);

  const where: Prisma.InvoiceWhereInput = {
    clinicId,
    ...(status ? { status: status as any } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { client: { fullName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const rows = await prisma.invoice.findMany({
    where,
    take,
    orderBy: { issueDate: "desc" },
    select: {
      id: true,
      number: true,
      status: true,
      issueDate: true,
      dueDate: true,
      paidAt: true,
      total: true,
      subtotal: true,
      tax: true,
      discount: true,
      client: { select: { id: true, fullName: true } },
      pet: { select: { id: true, name: true } },
      _count: { select: { items: true, payments: true } },
      payments: { select: { method: true }, orderBy: { paidAt: "desc" }, take: 1 },
    },
  });

  const data = rows.map((r) => ({
    ...r,
    total: r.total.toString(),
    subtotal: r.subtotal.toString(),
    tax: r.tax.toString(),
    discount: r.discount.toString(),
    issueDate: r.issueDate.toISOString(),
    dueDate: r.dueDate?.toISOString() ?? null,
    paidAt: r.paidAt?.toISOString() ?? null,
    itemsCount: r._count.items,
    paymentsCount: r._count.payments,
    lastPaymentMethod: r.payments?.[0]?.method ?? null,
  }));

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const clinicId = await getClinicIdOrFail();

  const body = await req.json().catch(() => null);
  const parsed = CreateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  // Validación básica item → serviceId/productId según type
  for (const it of data.items) {
    if (it.type === "SERVICE" && !it.serviceId) {
      return NextResponse.json({ error: "serviceId requerido en items SERVICE" }, { status: 422 });
    }
    if (it.type === "PRODUCT" && !it.productId) {
      return NextResponse.json({ error: "productId requerido en items PRODUCT" }, { status: 422 });
    }
  }

  // Generar número simple único por clínica
//   const number = `FAC-${yyyymmdd()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Recalcular totales server-side (fuente de verdad)
  const subtotal = data.items.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.unitPrice)), 0);
  const discount = Number(data.discount ?? 0);
  const taxableBase = Math.max(0, subtotal - discount);
  const taxRate = Number(data.invoiceTaxRate ?? 0);
  const tax = taxableBase * (taxRate / 100);
  const total = taxableBase + tax;

  const dueDate = data.dueDate ? new Date(data.dueDate) : null;

  const resolvedClientId = data.clientId ?? (await getWalkInClientId(clinicId));

  const result = await prisma.$transaction(async (tx) => {
    // Crea invoice + items
    const invoice = await tx.invoice.create({
      data: {
        clinicId,
        clientId: resolvedClientId,
        petId: data.petId ?? null,
        appointmentId: data.appointmentId ?? null,

        number: (await nextInvoiceNumber(clinicId!, new Date())).toString(),
        status: data.payNow ? new Prisma.Decimal(data.payment?.amount) < new Prisma.Decimal(total) ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.PAID : InvoiceStatus.ISSUED,
        issueDate: new Date(),
        dueDate,
        paidAt: data.payNow ? new Date() : null,

        subtotal: new Prisma.Decimal(subtotal),
        discount: new Prisma.Decimal(discount),
        tax: new Prisma.Decimal(tax),
        total: new Prisma.Decimal(total),

        notes: data.notes ?? null,
        createdById: null,

        items: {
          create: data.items.map((it) => ({
            type: it.type,
            serviceId: it.type === "SERVICE" ? it.serviceId ?? null : null,
            productId: it.type === "PRODUCT" ? it.productId ?? null : null,
            description: it.description,
            quantity: new Prisma.Decimal(it.quantity),
            unitPrice: new Prisma.Decimal(it.unitPrice),
            taxRate: new Prisma.Decimal(it.taxRate ?? 0),
            lineTotal: new Prisma.Decimal(Number(it.quantity) * Number(it.unitPrice)),
          })),
        },
      },
      select: { id: true, number: true, status: true, total: true },
    });

    // Si payNow -> crea payment
    if (data.payNow) {
      const payAmount = data.payment?.amount ?? total;
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: new Prisma.Decimal(payAmount),
          method: data.payment?.method ?? PaymentMethod.CASH,
          reference: data.payment?.reference ?? null,
          paidAt: new Date(),
          createdById: null,
        },
      });
    }

    // Stock OUT (opcional) - si quieres descontar stock en el momento de facturar
    // Si aún no quieres tocar stock aquí, quita este bloque.
    for (const it of data.items) {
      if (it.type !== "PRODUCT" || !it.productId) continue;

      const product = await tx.product.findFirst({
        where: { id: it.productId, clinicId },
        select: { id: true, trackStock: true, stockOnHand: true },
      });

      if (product?.trackStock) {
        const qty = Number(it.quantity);

        await tx.product.update({
          where: { id: product.id },
          data: { stockOnHand: Math.max(0, product.stockOnHand - qty) },
        });

        await tx.stockMovement.create({
          data: {
            clinicId,
            productId: product.id,
            type: "OUT",
            quantity: qty,
            reason: "Venta / Factura",
            referenceType: "INVOICE",
            referenceId: invoice.number,
            createdById: null,
          },
        });
      }
    }

    return invoice;
  });

  return NextResponse.json(result, { status: 201 });
}
