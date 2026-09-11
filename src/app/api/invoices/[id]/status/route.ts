import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  clearInvoicePaymentReminderNotifications,
  syncInvoicePaymentReminderNotifications,
} from "@/lib/reminders";
import { requireClinicPermission } from "@/lib/server-auth";
import { InvoiceStatus } from "@/generated/prisma/client";
import { z } from "zod";
import { notifyInvoiceEvent } from "@/lib/in-app-notifications";

const BodySchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "status inválido" }, { status: 422 });

  const requiredPermission = parsed.data.status === InvoiceStatus.VOID
    ? "invoices.annul"
    : parsed.data.status === InvoiceStatus.ISSUED
      ? "invoices.issue"
      : "invoices.edit";
  const { clinicId } = await requireClinicPermission(requiredPermission);

  const invoice = await prisma.invoice.findFirst({
    where: { id, clinicId },
    select: { id: true, status: true, _count: { select: { payments: true } } },
  });
  if (!invoice) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });

  if (parsed.data.status === InvoiceStatus.VOID && invoice._count.payments > 0) {
    return NextResponse.json(
      { error: "Esta factura tiene pagos registrados. Debes revertir o devolver los pagos antes de poder anularla." },
      { status: 409 }
    );
  }

  if (invoice.status === InvoiceStatus.VOID && parsed.data.status !== InvoiceStatus.VOID) {
    return NextResponse.json({ error: "Una factura anulada no puede reactivarse." }, { status: 409 });
  }

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

  if (updated.status === InvoiceStatus.DRAFT || updated.status === InvoiceStatus.ISSUED || updated.status === InvoiceStatus.PAID) {
    await notifyInvoiceEvent(updated.id, updated.status === InvoiceStatus.DRAFT ? "DRAFT" : updated.status === InvoiceStatus.PAID ? "PAID" : "ISSUED");
  }

  return NextResponse.json(updated);
}
