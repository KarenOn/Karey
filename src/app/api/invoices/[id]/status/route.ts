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

class InvoiceTransitionError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}

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
  const { clinicId, session } = await requireClinicPermission(requiredPermission);

  let updated: { id: number; status: InvoiceStatus };
  try {
    updated = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id, clinicId },
        select: { id: true, number: true, status: true, _count: { select: { payments: true } } },
      });
      if (!invoice) throw new InvoiceTransitionError(404, "Factura no encontrada");

      if (parsed.data.status === InvoiceStatus.VOID && invoice._count.payments > 0) {
        throw new InvoiceTransitionError(409, "Esta factura tiene pagos registrados. Debes revertir o devolver los pagos antes de poder anularla.");
      }

      if (invoice.status === InvoiceStatus.VOID) {
        if (parsed.data.status !== InvoiceStatus.VOID) throw new InvoiceTransitionError(409, "Una factura anulada no puede reactivarse.");
        return { id: invoice.id, status: invoice.status };
      }

      if (parsed.data.status === InvoiceStatus.VOID) {
        const changed = await tx.invoice.updateMany({
          where: { id: invoice.id, clinicId, status: { not: InvoiceStatus.VOID } },
          data: { status: InvoiceStatus.VOID, paidAt: null },
        });
        if (!changed.count) {
          const current = await tx.invoice.findUnique({ where: { id: invoice.id }, select: { status: true } });
          return { id: invoice.id, status: current?.status ?? InvoiceStatus.VOID };
        }

        const restored = await tx.stockMovement.count({ where: { invoiceId: invoice.id, referenceType: "INVOICE_VOID" } });
        if (!restored) {
          const outbound = await tx.stockMovement.findMany({
            where: { invoiceId: invoice.id, type: { in: ["OUT", "SALE"] } },
            select: { productId: true, batchId: true, quantity: true },
          });
          for (const movement of outbound) {
            const productUpdate = await tx.product.updateMany({
              where: { id: movement.productId, clinicId },
              data: { stockOnHand: { increment: movement.quantity } },
            });
            if (!productUpdate.count) throw new InvoiceTransitionError(409, "No se pudo restaurar el stock de la factura.");
            if (movement.batchId) {
              const batchUpdate = await tx.productBatch.updateMany({ where: { id: movement.batchId, product: { clinicId } }, data: { quantity: { increment: movement.quantity } } });
              if (!batchUpdate.count) throw new InvoiceTransitionError(409, "No se pudo restaurar el lote de la factura.");
            }
            await tx.stockMovement.create({
              data: {
                clinicId,
                productId: movement.productId,
                batchId: movement.batchId,
                type: "IN",
                quantity: movement.quantity,
                reason: "Restauración por anulación",
                referenceType: "INVOICE_VOID",
                referenceId: invoice.number,
                invoiceId: invoice.id,
                createdById: session.user.id,
              },
            });
          }
        }
        return { id: invoice.id, status: InvoiceStatus.VOID };
      }

      return tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: parsed.data.status,
          ...(parsed.data.status !== InvoiceStatus.PAID ? { paidAt: null } : {}),
        },
        select: { id: true, status: true },
      });
    });
  } catch (error) {
    if (error instanceof InvoiceTransitionError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    throw error;
  }

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
