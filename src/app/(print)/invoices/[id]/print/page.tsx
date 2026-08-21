import { notFound } from "next/navigation";
import InvoicePrintA4Document from "@/components/printing/InvoicePrintA4Document";
import { getInvoicePrintData } from "@/lib/print/getInvoicePrintData";
import { getClinicIdOrFail } from "@/lib/auth";

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const clinicId = await getClinicIdOrFail();
  const invoiceId = Number((await params).id);

  if (!Number.isFinite(invoiceId)) {
    notFound();
  }

  const data = await getInvoicePrintData({ clinicId, invoiceId });
  const autoPrint = ((await searchParams) ?? {}).autoprint === "1";

  return <InvoicePrintA4Document data={data} autoPrint={autoPrint} />;
}
