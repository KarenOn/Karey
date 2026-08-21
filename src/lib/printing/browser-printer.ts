"use client";

import {
  buildInvoicePrintUrl,
  getPreferredInvoicePrintTarget,
  type LocalPrintSettings,
  type ReceiptPaperSize,
} from "@/lib/printing/settings";

export type PreparedPrintWindow = Window | null;

export function preparePrintWindow(): PreparedPrintWindow {
  if (typeof window === "undefined") {
    return null;
  }

  return window.open("", "_blank");
}

export function closePreparedPrintWindow(printWindow?: PreparedPrintWindow) {
  if (printWindow && !printWindow.closed) {
    printWindow.close();
  }
}

function navigateToPrintUrl(
  url: string,
  preparedWindow?: PreparedPrintWindow
) {
  if (typeof window === "undefined") {
    return false;
  }

  if (preparedWindow && !preparedWindow.closed) {
    preparedWindow.location.href = url;
    return true;
  }

  return !!window.open(url, "_blank", "noopener,noreferrer");
}

export function openInvoiceReceiptPrint(options: {
  invoiceId: number;
  paper: ReceiptPaperSize;
  autoPrint?: boolean;
  preparedWindow?: PreparedPrintWindow;
}) {
  return navigateToPrintUrl(
    buildInvoicePrintUrl({
      invoiceId: options.invoiceId,
      document: "receipt",
      paper: options.paper,
      autoPrint: options.autoPrint,
    }),
    options.preparedWindow
  );
}

export function openInvoiceA4Print(options: {
  invoiceId: number;
  autoPrint?: boolean;
  preparedWindow?: PreparedPrintWindow;
}) {
  return navigateToPrintUrl(
    buildInvoicePrintUrl({
      invoiceId: options.invoiceId,
      document: "invoice",
      autoPrint: options.autoPrint,
    }),
    options.preparedWindow
  );
}

export function openPreferredInvoicePrint(options: {
  invoiceId: number;
  settings: LocalPrintSettings;
  autoPrint?: boolean;
  preparedWindow?: PreparedPrintWindow;
}) {
  const target = getPreferredInvoicePrintTarget(options.settings);

  if (target.document === "invoice") {
    return openInvoiceA4Print({
      invoiceId: options.invoiceId,
      autoPrint: options.autoPrint,
      preparedWindow: options.preparedWindow,
    });
  }

  return openInvoiceReceiptPrint({
    invoiceId: options.invoiceId,
    paper: target.paper,
    autoPrint: options.autoPrint,
    preparedWindow: options.preparedWindow,
  });
}
