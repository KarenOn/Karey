import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  clearInvoicePaymentReminderNotifications,
  syncInvoicePaymentReminderNotifications,
} from "@/lib/reminders";
import { requireClinicPermission } from "@/lib/server-auth";
import { InvoiceStatus } from "@/generated/prisma/client";
import { z } from "zod";

const BodySchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicPermission("invoices.update");
  const id = Number((await params).id);

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "status inválido" }, { status: 422 });

  const invoice = await prisma.invoice.findFirst({ where: { id, clinicId }, select: { id: true } });
  if (!invoice) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });

  // Nota: aquí tú decides reglas: si está pagada, ¿permitir anular? etc.
  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status !== InvoiceStatus.PAID ? { paidAt: null } : {}),
    },
    select: { id: true, status: true },
  });

  if (
    updated.status === InvoiceStatus.PAID ||
    updated.status === InvoiceStatus.VOID ||
    updated.status === InvoiceStatus.DRAFT
  ) {
    await clearInvoicePaymentReminderNotifications(updated.id);
  } else {
    await syncInvoicePaymentReminderNotifications(updated.id);
  }

  return NextResponse.json(updated);
}
