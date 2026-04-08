import InvoicePrintA4 from "@/app/(app)/invoices/[id]/printer/InvoicePrintA4"; // ajusta el import a donde lo tengas
import { getInvoicePrintData } from "@/lib/print/getInvoicePrintData";
import { getClinicIdOrFail } from "@/lib/auth"; // tu helper

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { autoprint?: string };
}) {
  const clinicId = await getClinicIdOrFail();
  const invoiceId = Number(params.id);

  const data = await getInvoicePrintData({ clinicId, invoiceId });
  const autoPrint = searchParams?.autoprint === "1";

  return <InvoicePrintA4 data={data} autoPrint={autoPrint} />;
}
