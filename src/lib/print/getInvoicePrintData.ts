import { prisma } from "@/lib/prisma";
import { resolveStoredFileUrl } from "@/lib/storage";

export type InvoicePrintData = {
  clinic: { name: string; phone?: string | null; email?: string | null; address?: string | null; rnc?: string | null; logoUrl?: string | null; timezone?: string | null };
  invoice: { number: string; status: "ISSUED" | "PAID" | "VOID" | "CANCELLED"; issueDate: string; dueDate?: string | null; paidAt?: string | null; notes?: string | null; subtotal: string; tax: string; discount: string; total: string };
  client: { fullName: string; phone?: string | null; email?: string | null; address?: string | null };
  pet?: { name: string; species?: string | null; breed?: string | null } | null;
  items: Array<{ description: string; quantity: string; unitPrice: string; lineTotal: string; type?: string | null }>;
  payments?: Array<{ method: string; amount: string; reference?: string | null; paidAt: string }>;
};

export async function getInvoicePrintData(opts: { clinicId: number; invoiceId: number }): Promise<InvoicePrintData> {
  const inv = await prisma.invoice.findFirst({
    where: { id: opts.invoiceId, clinicId: opts.clinicId },
    include: {
      clinic: {
        select: {
          name: true,
          phone: true,
          email: true,
          address: true,
          timezone: true,
          logoUrl: true,
        },
      },
      client: { select: { fullName: true, phone: true, email: true, address: true } },
      pet: { select: { name: true, species: true, breed: true } },
      items: { orderBy: { id: "asc" } },
      payments: { orderBy: { paidAt: "asc" } },
    },
  });

  if (!inv) throw new Error("Invoice not found");

  return {
    clinic: {
      name: inv.clinic.name,
      phone: inv.clinic.phone,
      email: inv.clinic.email,
      address: inv.clinic.address,
      timezone: inv.clinic.timezone ?? "America/Santo_Domingo",
      logoUrl: await resolveStoredFileUrl(inv.clinic.logoUrl, {
        fileName: `logo-clinica-${opts.clinicId}.png`,
      }),
    },
    invoice: {
      number: inv.number,
      status: inv.status as any,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate?.toISOString() ?? null,
      paidAt: inv.paidAt?.toISOString() ?? null,
      notes: inv.notes ?? null,
      subtotal: inv.subtotal.toString(),
      tax: inv.tax.toString(),
      discount: inv.discount.toString(),
      total: inv.total.toString(),
    },
    client: {
      fullName: inv.client.fullName,
      phone: inv.client.phone ?? null,
      email: inv.client.email ?? null,
      address: inv.client.address ?? null,
    },
    pet: inv.pet
      ? { name: inv.pet.name, species: inv.pet.species ?? null, breed: inv.pet.breed ?? null }
      : null,
    items: inv.items.map((it) => ({
      description: it.description,
      quantity: it.quantity.toString(),
      unitPrice: it.unitPrice.toString(),
      lineTotal: it.lineTotal.toString(),
      type: it.type,
    })),
    payments: inv.payments.map((p) => ({
      method: p.method,
      amount: p.amount.toString(),
      reference: p.reference ?? null,
      paidAt: p.paidAt.toISOString(),
    })),
  };
}
