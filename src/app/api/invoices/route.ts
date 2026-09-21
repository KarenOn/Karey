import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinicPermission } from "@/lib/server-auth";
import { syncInvoicePaymentReminderNotifications } from "@/lib/reminders";
import {
  AppointmentStatus,
  InvoiceItemType,
  InvoiceStatus,
  PaymentMethod,
  Prisma,
  TodayTurnStatus,
} from "@/generated/prisma/client";
import { z } from "zod";
import { getWalkInClientId } from "@/lib/pos/getWalkInClient";
import { notifyInvoiceEvent } from "@/lib/in-app-notifications";
import { consumeProductStockFEFO } from "@/lib/server/inventory-batches";
import { CASH_REGISTER_REQUIRED, CASH_SESSION_REQUIRED, resolvePaymentCashSessionForRegister } from "@/lib/server/cash";

function yyyymmdd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient, clinicId: number, issueDate: Date) {
  const start = new Date(issueDate);
  start.setHours(0, 0, 0, 0);
  const counterDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  const rows = await tx.$queryRaw<Array<{ value: number }>>(Prisma.sql`
    INSERT INTO "invoicecounter" ("clinicId", "counterDate", "value")
    VALUES (${clinicId}, ${counterDate}::date, 1)
    ON CONFLICT ("clinicId", "counterDate")
    DO UPDATE SET "value" = "invoicecounter"."value" + 1
    RETURNING "value"
  `);
  const sequence = rows[0]?.value;
  if (!sequence) throw new Error("No se pudo reservar el número de factura.");
  return `FAC-${yyyymmdd(issueDate)}-${String(sequence).padStart(4, "0")}`;
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
  todayTurnId: z.number().int().positive().nullable().optional(),

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
      registerId: z.number().int().positive().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export async function GET(req: Request) {
  const { clinicId } = await requireClinicPermission("invoices.read");
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const appointmentId = Number(searchParams.get("appointmentId")) || null;
  const todayTurnId = Number(searchParams.get("todayTurnId")) || null;
  const take = Math.min(Number(searchParams.get("take") || 200), 500);
  const statusFilter = Object.values(InvoiceStatus).find((value) => value === status);

  const where: Prisma.InvoiceWhereInput = {
    clinicId,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(appointmentId ? { appointmentId } : {}),
    ...(todayTurnId ? { todayTurnId } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q } },
            { client: { fullName: { contains: q } } },
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
      payments: { select: { method: true, amount: true }, orderBy: { paidAt: "desc" } },
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
    paidTotal: r.payments.reduce((sum, payment) => sum + Number(payment.amount), 0).toFixed(2),
  }));

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { clinicId, session } = await requireClinicPermission("invoices.create");

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

  if (data.appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: data.appointmentId, clinicId },
      select: { id: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "La cita no existe en esta clínica." }, { status: 404 });
    }
  }

  if (data.todayTurnId) {
    const todayTurn = await prisma.todayTurn.findFirst({
      where: { id: data.todayTurnId, clinicId },
      select: { id: true, clientId: true, petId: true },
    });

    if (!todayTurn) {
      return NextResponse.json({ error: "El turno no existe en esta clínica." }, { status: 404 });
    }
    if (data.clientId === undefined && todayTurn.clientId) data.clientId = todayTurn.clientId;
    if (data.petId === undefined) data.petId = todayTurn.petId;
  }

  const existingEncounterInvoice = data.appointmentId || data.todayTurnId
    ? await prisma.invoice.findFirst({
        where: {
          clinicId,
          status: { not: InvoiceStatus.VOID },
          ...(data.appointmentId ? { appointmentId: data.appointmentId } : {}),
          ...(data.todayTurnId ? { todayTurnId: data.todayTurnId } : {}),
        },
        select: { id: true, number: true, status: true },
      })
    : null;
  if (existingEncounterInvoice && existingEncounterInvoice.status !== InvoiceStatus.DRAFT) {
    return NextResponse.json({ error: "Esta atención ya tiene una factura emitida." }, { status: 409 });
  }

  const resolvedClientId = data.clientId ?? (await getWalkInClientId(clinicId));

  let result;
  try {
  result = await prisma.$transaction(async (tx) => {
    // Crea invoice + items
    const payAmountValue = data.payment?.amount ?? total;

    const invoiceData = {
        clinicId,
        clientId: resolvedClientId,
        petId: data.petId ?? null,
        appointmentId: data.appointmentId ?? null,
        todayTurnId: data.todayTurnId ?? null,

        number: existingEncounterInvoice?.number ?? await nextInvoiceNumber(tx, clinicId, new Date()),
        status: data.payNow
          ? new Prisma.Decimal(payAmountValue).lessThan(new Prisma.Decimal(total))
            ? InvoiceStatus.PARTIALLY_PAID
            : InvoiceStatus.PAID
          : InvoiceStatus.ISSUED,
        issueDate: new Date(),
        dueDate,
        paidAt: data.payNow ? new Date() : null,

        subtotal: new Prisma.Decimal(subtotal),
        discount: new Prisma.Decimal(discount),
        tax: new Prisma.Decimal(tax),
        total: new Prisma.Decimal(total),

        notes: data.notes ?? null,
        createdById: session.user.id,

        items: { create: data.items.map((it) => ({
          type: it.type,
          serviceId: it.type === "SERVICE" ? it.serviceId ?? null : null,
          productId: it.type === "PRODUCT" ? it.productId ?? null : null,
          description: it.description,
          quantity: new Prisma.Decimal(it.quantity),
          unitPrice: new Prisma.Decimal(it.unitPrice),
          taxRate: new Prisma.Decimal(it.taxRate ?? 0),
          lineTotal: new Prisma.Decimal(Number(it.quantity) * Number(it.unitPrice)),
        })) },
      };

    const invoice = existingEncounterInvoice
      ? await tx.invoice.update({
          where: { id: existingEncounterInvoice.id },
          data: {
            ...invoiceData,
            items: undefined,
          },
          select: { id: true, number: true, status: true, total: true },
        })
      : await tx.invoice.create({
          data: invoiceData,
          select: { id: true, number: true, status: true, total: true },
        });

    if (existingEncounterInvoice) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
      await tx.invoiceItem.createMany({ data: data.items.map((it) => ({
        invoiceId: invoice.id,
        type: it.type,
        serviceId: it.type === "SERVICE" ? it.serviceId ?? null : null,
        productId: it.type === "PRODUCT" ? it.productId ?? null : null,
        description: it.description,
        quantity: new Prisma.Decimal(it.quantity),
        unitPrice: new Prisma.Decimal(it.unitPrice),
        taxRate: new Prisma.Decimal(it.taxRate ?? 0),
        lineTotal: new Prisma.Decimal(Number(it.quantity) * Number(it.unitPrice)),
      })) });
    }

    // Si payNow -> crea payment
    if (data.payNow) {
      const cashSessionId = await resolvePaymentCashSessionForRegister(tx, clinicId, data.payment?.method ?? PaymentMethod.CASH, data.payment?.registerId);
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: new Prisma.Decimal(payAmountValue),
          method: data.payment?.method ?? PaymentMethod.CASH,
          reference: data.payment?.reference ?? null,
          cashSessionId,
          paidAt: new Date(),
          createdById: session.user.id,
        },
      });
    }

    // Stock OUT (opcional) - si quieres descontar stock en el momento de facturar
    // Si aún no quieres tocar stock aquí, quita este bloque.
    const hasStockMovement = existingEncounterInvoice
      ? await tx.stockMovement.count({ where: { invoiceId: invoice.id } }) > 0
      : false;
    if (!hasStockMovement) for (const it of data.items) {
      if (it.type !== "PRODUCT" || !it.productId) continue;

      const product = await tx.product.findFirst({
        where: { id: it.productId, clinicId },
        select: { id: true, trackStock: true },
      });

      if (product?.trackStock) {
        const qty = Number(it.quantity);
        const allocations = await consumeProductStockFEFO(tx, { clinicId, productId: product.id, quantity: qty });
        await Promise.all(allocations.map((allocation) => tx.stockMovement.create({
          data: { clinicId, productId: product.id, batchId: allocation.batchId, type: "OUT", quantity: allocation.quantity, reason: "Venta / Factura", referenceType: "INVOICE", referenceId: invoice.number, invoiceId: invoice.id, createdById: session.user.id },
        })));
      }
    }

    if (data.appointmentId) {
      await tx.appointment.update({
        where: { id: data.appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });
    }

    if (data.todayTurnId) {
      await tx.todayTurn.update({
        where: { id: data.todayTurnId },
        data: { status: TodayTurnStatus.DELIVERED },
      });
    }

    await tx.encounterItem.deleteMany({
      where: {
        clinicId,
        ...(data.appointmentId ? { appointmentId: data.appointmentId } : {}),
        ...(data.todayTurnId ? { todayTurnId: data.todayTurnId } : {}),
      },
    });

    return invoice;
  });
  } catch (error) {
    if (error instanceof Error && error.message === CASH_SESSION_REQUIRED) {
      return NextResponse.json({ error: "Debes abrir una caja antes de registrar un pago en efectivo." }, { status: 409 });
    }
    if (error instanceof Error && error.message === CASH_REGISTER_REQUIRED) return NextResponse.json({ error: "Selecciona la caja donde registrar este pago." }, { status: 409 });
    if (error instanceof Error && error.message === "CASH_REGISTER_INVALID") return NextResponse.json({ error: "La caja seleccionada no está disponible." }, { status: 409 });
    throw error;
  }

  await syncInvoicePaymentReminderNotifications(result.id);
  await notifyInvoiceEvent(result.id, result.status === InvoiceStatus.PARTIALLY_PAID ? "PARTIAL_PAYMENT" : result.status === InvoiceStatus.PAID ? "PAID" : result.status === InvoiceStatus.DRAFT ? "DRAFT" : "ISSUED");

  return NextResponse.json(result, { status: 201 });
}
