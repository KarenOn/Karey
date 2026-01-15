// import InvoicePrintA4 from "@/components/invoices/print/InvoicePrintA4";
import { prisma } from "@/lib/prisma";
import { getClinicIdOrFail } from "@/lib/auth";
import { notFound } from "next/navigation";
import InvoiceTicket from "./InvoiceClientTicket";

type Money = number | string;
const dec = (v: any): Money => (v?.toString ? v.toString() : v ?? "0.00");

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const clinicId = await getClinicIdOrFail();
  const invoiceId = Number((await params).id);
  if (!Number.isFinite(invoiceId)) notFound();

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, clinicId },
    include: {
      clinic: true,
      client: true,
      pet: true,
      items: true,
      payments: true,
    },
  });

  if (!invoice) notFound();

  const autoPrint = (await searchParams)?.autoprint === "1";

  const data = {
    clinic: {
      name: invoice.clinic.name,
      phone: invoice.clinic.phone ?? null,
      email: invoice.clinic.email ?? null,
      address: invoice.clinic.address ?? null,
      rnc: (invoice.clinic as any).rnc ?? null,
      logoUrl: (invoice.clinic as any).logoUrl ?? null,
    },
    invoice: {
      number: invoice.number,
      status: invoice.status as any,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
      notes: invoice.notes ?? null,
      subtotal: dec(invoice.subtotal),
      tax: dec(invoice.tax),
      discount: dec(invoice.discount),
      total: dec(invoice.total),
    },
    client: {
      fullName: invoice.client.fullName,
      phone: invoice.client.phone ?? null,
      email: invoice.client.email ?? null,
      address: invoice.client.address ?? null,
    },
    pet: invoice.pet
      ? {
          name: invoice.pet.name,
          species: (invoice.pet as any).species ?? null,
          breed: invoice.pet.breed ?? null,
        }
      : null,
    items: invoice.items.map((it) => ({
      description: it.description,
      quantity: dec(it.quantity),
      unitPrice: dec(it.unitPrice),
      lineTotal: dec(it.lineTotal),
      type: (it.type as any) ?? null,
    })),
    payments: invoice.payments.map((p) => ({
      method: p.method as any,
      amount: dec(p.amount),
      reference: p.reference ?? null,
      paidAt: p.paidAt.toISOString(),
    })),
  };

  return <InvoiceTicket data={data} autoPrint={autoPrint} />;
}
