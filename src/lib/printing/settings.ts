export type ReceiptPaperSize = "80" | "58";
export type PrintFormat = ReceiptPaperSize | "A4";

export type LocalPrintSettings = {
  receiptFormat: PrintFormat;
  autoOpenReceiptAfterPayment: boolean;
};

export type InvoicePrintTarget =
  | { document: "receipt"; paper: ReceiptPaperSize }
  | { document: "invoice" };

export const PRINT_SETTINGS_STORAGE_KEY = "kareyvet.print-settings.v1";

export const DEFAULT_PRINT_SETTINGS: LocalPrintSettings = {
  receiptFormat: "80",
  autoOpenReceiptAfterPayment: false,
};

export function normalizeReceiptFormat(value: unknown): PrintFormat {
  if (value === "58" || value === "A4") {
    return value;
  }

  return "80";
}

export function normalizePrintSettings(value: unknown): LocalPrintSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_PRINT_SETTINGS;
  }

  const candidate = value as Partial<LocalPrintSettings>;

  return {
    receiptFormat: normalizeReceiptFormat(candidate.receiptFormat),
    autoOpenReceiptAfterPayment:
      typeof candidate.autoOpenReceiptAfterPayment === "boolean"
        ? candidate.autoOpenReceiptAfterPayment
        : DEFAULT_PRINT_SETTINGS.autoOpenReceiptAfterPayment,
  };
}

export function getPreferredInvoicePrintTarget(
  settings: Pick<LocalPrintSettings, "receiptFormat">
): InvoicePrintTarget {
  if (settings.receiptFormat === "A4") {
    return { document: "invoice" };
  }

  return {
    document: "receipt",
    paper: settings.receiptFormat,
  };
}

export function getManualReceiptPaper(
  settings: Pick<LocalPrintSettings, "receiptFormat">
): ReceiptPaperSize {
  return settings.receiptFormat === "58" ? "58" : "80";
}

export function buildInvoicePrintUrl(options: {
  invoiceId: number;
  document: "receipt" | "invoice";
  autoPrint?: boolean;
  paper?: ReceiptPaperSize;
}) {
  const pathname =
    options.document === "invoice"
      ? `/invoices/${options.invoiceId}/print`
      : `/invoices/${options.invoiceId}/receipt`;

  const params = new URLSearchParams();

  if (options.autoPrint) {
    params.set("autoprint", "1");
  }

  if (options.document === "receipt") {
    params.set("paper", options.paper === "58" ? "58" : "80");
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function readPrintSettingsFromStorage() {
  if (typeof window === "undefined") {
    return DEFAULT_PRINT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(PRINT_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PRINT_SETTINGS;
    }

    return normalizePrintSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_PRINT_SETTINGS;
  }
}

export function writePrintSettingsToStorage(settings: LocalPrintSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PRINT_SETTINGS_STORAGE_KEY,
    JSON.stringify(normalizePrintSettings(settings))
  );
}
