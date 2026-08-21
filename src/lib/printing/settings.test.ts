import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRINT_SETTINGS,
  buildInvoicePrintUrl,
  getManualReceiptPaper,
  getPreferredInvoicePrintTarget,
  normalizePrintSettings,
} from "@/lib/printing/settings";

test("normalizePrintSettings returns defaults for invalid input", () => {
  assert.deepEqual(normalizePrintSettings(null), DEFAULT_PRINT_SETTINGS);
  assert.deepEqual(normalizePrintSettings("invalid"), DEFAULT_PRINT_SETTINGS);
});

test("normalizePrintSettings sanitizes unsupported values", () => {
  assert.deepEqual(
    normalizePrintSettings({
      receiptFormat: "OTHER",
      autoOpenReceiptAfterPayment: "yes",
    }),
    DEFAULT_PRINT_SETTINGS
  );
});

test("getPreferredInvoicePrintTarget maps A4 to invoice print", () => {
  assert.deepEqual(getPreferredInvoicePrintTarget({ receiptFormat: "A4" }), {
    document: "invoice",
  });
});

test("getManualReceiptPaper keeps receipt actions in thermal paper sizes", () => {
  assert.equal(getManualReceiptPaper({ receiptFormat: "A4" }), "80");
  assert.equal(getManualReceiptPaper({ receiptFormat: "58" }), "58");
});

test("buildInvoicePrintUrl builds receipt and invoice routes correctly", () => {
  assert.equal(
    buildInvoicePrintUrl({
      invoiceId: 15,
      document: "receipt",
      paper: "58",
      autoPrint: true,
    }),
    "/invoices/15/receipt?autoprint=1&paper=58"
  );

  assert.equal(
    buildInvoicePrintUrl({
      invoiceId: 15,
      document: "invoice",
    }),
    "/invoices/15/print"
  );
});
