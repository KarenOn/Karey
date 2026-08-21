import { notFound } from "next/navigation";
import InvoiceReceiptDocument from "@/components/printing/InvoiceReceiptDocument";
import { getClinicIdOrFail } from "@/lib/auth";
import { getInvoicePrintData } from "@/lib/print/getInvoicePrintData";
import { normalizeReceiptFormat } from "@/lib/printing/settings";

export default async function InvoiceReceiptPage({
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

  const resolvedSearchParams = (await searchParams) ?? {};
  const paper = normalizeReceiptFormat(resolvedSearchParams.paper);
  const data = await getInvoicePrintData({ clinicId, invoiceId });

  return (
    <InvoiceReceiptDocument
      autoPrint={resolvedSearchParams.autoprint === "1"}
      data={data}
      paper={paper === "58" ? "58" : "80"}
    />
  );
}
