import { prisma } from "@/lib/prisma";
import { resolveStoredFileUrl } from "@/lib/storage";

export type InvoicePrintData = {
  clinic: {
    name: string;
    fiscalName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    rnc?: string | null;
    logoUrl?: string | null;
    currency?: string | null;
    timezone?: string | null;
    invoiceNotes?: string | null;
    invoiceTerms?: string | null;
  };
  invoice: {
    number: string;
    status: string;
    issueDate: string;
    dueDate?: string | null;
    paidAt?: string | null;
    notes?: string | null;
    subtotal: string;
    tax: string;
    discount: string;
    total: string;
    fiscalDocumentType?: string | null;
    ncf?: string | null;
    eNcf?: string | null;
  };
  client: { fullName: string; phone?: string | null; email?: string | null; address?: string | null; identificationType?: string | null; identificationNumber?: string | null };
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
          currency: true,
          taxId: true,
          taxName: true,
          invoiceNotes: true,
          invoiceTerms: true,
        },
      },
      client: { select: { fullName: true, phone: true, email: true, address: true, identificationType: true, identificationNumber: true } },
      pet: { select: { name: true, species: true, breed: true } },
      items: { orderBy: { id: "asc" } },
      payments: { orderBy: { paidAt: "asc" } },
    },
  });

  if (!inv) throw new Error("Invoice not found");

  return {
    clinic: {
      name: inv.clinic.name,
      fiscalName: inv.clinic.taxName ?? null,
      phone: inv.clinic.phone,
      email: inv.clinic.email,
      address: inv.clinic.address,
      rnc: inv.clinic.taxId ?? null,
      timezone: inv.clinic.timezone ?? "America/Santo_Domingo",
      logoUrl: await resolveStoredFileUrl(inv.clinic.logoUrl, {
        fileName: `logo-clinica-${opts.clinicId}.png`,
      }),
      currency: inv.clinic.currency,
      invoiceNotes: inv.clinic.invoiceNotes ?? null,
      invoiceTerms: inv.clinic.invoiceTerms ?? null,
    },
    invoice: {
      number: inv.number,
      status: inv.status,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate?.toISOString() ?? null,
      paidAt: inv.paidAt?.toISOString() ?? null,
      notes: inv.notes ?? null,
      subtotal: inv.subtotal.toString(),
      tax: inv.tax.toString(),
      discount: inv.discount.toString(),
      total: inv.total.toString(),
      fiscalDocumentType: inv.fiscalDocumentType ?? null,
      ncf: inv.ncf ?? null,
      eNcf: inv.eNcf ?? null,
    },
    client: {
      fullName: inv.client.fullName,
      phone: inv.client.phone ?? null,
      email: inv.client.email ?? null,
      address: inv.client.address ?? null,
      identificationType: inv.client.identificationType ?? null,
      identificationNumber: inv.client.identificationNumber ?? null,
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
