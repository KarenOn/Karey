"use client";

import InvoiceReceiptDocument from "@/components/printing/InvoiceReceiptDocument";
import type { InvoicePrintData } from "@/lib/print/getInvoicePrintData";

export default function LegacyInvoiceTicket({
  data,
  autoPrint = false,
}: {
  data: InvoicePrintData & { paper?: "58" | "80" };
  autoPrint?: boolean;
}) {
  return (
    <InvoiceReceiptDocument
      autoPrint={autoPrint}
      data={data}
      paper={data.paper === "58" ? "58" : "80"}
    />
  );
}
