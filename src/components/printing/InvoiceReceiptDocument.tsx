"use client";

import { useEffect } from "react";
import type { InvoicePrintData } from "@/lib/print/getInvoicePrintData";
import type { ReceiptPaperSize } from "@/lib/printing/settings";

function money(value: number | string) {
  const numeric = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(numeric)) {
    return "0.00";
  }

  return numeric.toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value?: string | null, timezone?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: timezone ?? "America/Santo_Domingo",
  }).format(date);
}

function paymentMethodLabel(method: string) {
  switch (method) {
    case "CASH":
      return "Efectivo";
    case "CARD":
      return "Tarjeta";
    case "TRANSFER":
      return "Transferencia";
    case "OTHER":
      return "Otro";
    default:
      return method;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "PAID":
      return "Pagada";
    case "PARTIALLY_PAID":
      return "Parcial";
    case "ISSUED":
      return "Pendiente";
    case "VOID":
    case "CANCELLED":
      return "Anulada";
    case "DRAFT":
      return "Borrador";
    default:
      return status;
  }
}

function hasValue(value?: string | null) {
  return !!value?.trim();
}

export default function InvoiceReceiptDocument({
  data,
  paper,
  autoPrint = false,
}: {
  data: InvoicePrintData;
  paper: ReceiptPaperSize;
  autoPrint?: boolean;
}) {
  useEffect(() => {
    if (!autoPrint) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  const paidTotal = (data.payments ?? []).reduce(
    (total, payment) => total + Number(payment.amount),
    0
  );
  const balance = Math.max(0, Number(data.invoice.total) - paidTotal);
  const paperWidth = paper === "58" ? "58mm" : "80mm";
  const contentWidth = paper === "58" ? "50mm" : "72mm";
  const baseFontSize = paper === "58" ? "11px" : "12px";
  const titleFontSize = paper === "58" ? "16px" : "18px";

  return (
    <main className="receipt-screen">
      <style>{`
        @page {
          size: ${paperWidth} auto;
          margin: 0;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #000000;
        }

        body {
          font-family: "Courier New", Courier, monospace;
        }

        .receipt-screen {
          min-height: 100vh;
          background: #eef2f7;
          padding: 24px 12px;
        }

        .receipt-toolbar {
          display: flex;
          justify-content: flex-end;
          margin: 0 auto 12px;
          max-width: 380px;
        }

        .receipt-toolbar button {
          border: 1px solid #d7dde7;
          background: #ffffff;
          border-radius: 999px;
          padding: 10px 16px;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        #receipt-root {
          width: ${contentWidth};
          margin: 0 auto;
          background: #ffffff;
          color: #000000;
          font-size: ${baseFontSize};
          line-height: 1.35;
          padding: 10px 0 16px;
        }

        .receipt-center {
          text-align: center;
        }

        .receipt-logo {
          display: block;
          max-width: ${paper === "58" ? "26mm" : "30mm"};
          max-height: 18mm;
          margin: 0 auto 8px;
          object-fit: contain;
        }

        .receipt-title {
          font-size: ${titleFontSize};
          font-weight: 700;
          line-height: 1.15;
        }

        .receipt-muted {
          color: #444444;
        }

        .receipt-section {
          margin-top: 10px;
        }

        .receipt-rule {
          border-top: 1px dashed #000000;
          margin: 10px 0;
        }

        .receipt-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }

        .receipt-row > :last-child {
          text-align: right;
          white-space: nowrap;
        }

        .receipt-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          padding: 6px 0;
          border-bottom: 1px dotted #dddddd;
        }

        .receipt-item:last-child {
          border-bottom: 0;
        }

        .receipt-item-name {
          font-weight: 700;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .receipt-item-meta {
          margin-top: 2px;
          font-size: ${paper === "58" ? "10px" : "11px"};
          color: #444444;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .receipt-total {
          font-size: ${paper === "58" ? "15px" : "17px"};
          font-weight: 800;
        }

        .receipt-footer-text {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        @media print {
          body * {
            visibility: hidden;
          }

          #receipt-root,
          #receipt-root * {
            visibility: visible;
          }

          .receipt-screen {
            background: #ffffff;
            padding: 0;
          }

          .receipt-toolbar {
            display: none !important;
          }

          #receipt-root {
            position: absolute;
            left: 0;
            top: 0;
            width: ${contentWidth};
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      <div className="receipt-toolbar">
        <button type="button" onClick={() => window.print()}>
          Imprimir recibo
        </button>
      </div>

      <article id="receipt-root">
        <header className="receipt-center">
          {data.clinic.logoUrl ? (
            <img
              alt={`Logo de ${data.clinic.name}`}
              className="receipt-logo"
              src={data.clinic.logoUrl}
            />
          ) : null}

          <div className="receipt-title">{data.clinic.name}</div>
          {hasValue(data.clinic.address) ? (
            <div className="receipt-muted">{data.clinic.address}</div>
          ) : null}
          {hasValue(data.clinic.phone) ? (
            <div className="receipt-muted">Tel: {data.clinic.phone}</div>
          ) : null}
          {hasValue(data.clinic.email) ? (
            <div className="receipt-muted">{data.clinic.email}</div>
          ) : null}
          {hasValue(data.clinic.rnc) ? (
            <div className="receipt-muted">RNC: {data.clinic.rnc}</div>
          ) : null}
        </header>

        <div className="receipt-rule" />

        <section className="receipt-section">
          <div className="receipt-row">
            <span>Factura</span>
            <strong>{data.invoice.number}</strong>
          </div>
          <div className="receipt-row">
            <span>Fecha</span>
            <span>
              {formatDateTime(data.invoice.issueDate, data.clinic.timezone)}
            </span>
          </div>
          <div className="receipt-row">
            <span>Estado</span>
            <span>{statusLabel(data.invoice.status)}</span>
          </div>
        </section>

        <div className="receipt-rule" />

        <section className="receipt-section">
          <div>
            <strong>Cliente:</strong> {data.client.fullName}
          </div>
          {data.pet?.name ? (
            <div>
              <strong>Paciente:</strong> {data.pet.name}
            </div>
          ) : null}
        </section>

        <div className="receipt-rule" />

        <section className="receipt-section">
          <div className="receipt-row">
            <strong>Detalle</strong>
            <strong>Total</strong>
          </div>
          <div>
            {data.items.map((item, index) => (
              <div className="receipt-item" key={`${item.description}-${index}`}>
                <div>
                  <div className="receipt-item-name">{item.description}</div>
                  <div className="receipt-item-meta">
                    {money(item.quantity)} x {money(item.unitPrice)}
                  </div>
                </div>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
        </section>

        <div className="receipt-rule" />

        <section className="receipt-section">
          <div className="receipt-row">
            <span>Subtotal</span>
            <span>{money(data.invoice.subtotal)}</span>
          </div>
          {Number(data.invoice.discount) > 0 ? (
            <div className="receipt-row">
              <span>Descuento</span>
              <span>-{money(data.invoice.discount)}</span>
            </div>
          ) : null}
          {Number(data.invoice.tax) > 0 ? (
            <div className="receipt-row">
              <span>ITBIS</span>
              <span>{money(data.invoice.tax)}</span>
            </div>
          ) : null}
          <div className="receipt-row receipt-total">
            <span>Total</span>
            <span>{money(data.invoice.total)}</span>
          </div>
          <div className="receipt-row">
            <span>Pagado</span>
            <strong>{money(paidTotal)}</strong>
          </div>
          <div className="receipt-row">
            <span>Balance</span>
            <strong>{money(balance)}</strong>
          </div>
        </section>

        <div className="receipt-rule" />

        <section className="receipt-section">
          <strong>Pago</strong>
          {(data.payments ?? []).length > 0 ? (
            <div className="receipt-section">
              {(data.payments ?? []).map((payment, index) => (
                <div className="receipt-section" key={`${payment.method}-${index}`}>
                  <div className="receipt-row">
                    <span>{paymentMethodLabel(payment.method)}</span>
                    <strong>{money(payment.amount)}</strong>
                  </div>
                  <div className="receipt-muted">
                    {formatDateTime(payment.paidAt, data.clinic.timezone)}
                    {payment.reference ? ` | Ref: ${payment.reference}` : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="receipt-muted receipt-section">
              No hay pagos registrados todavía.
            </div>
          )}
        </section>

        {hasValue(data.invoice.notes) ||
        hasValue(data.clinic.invoiceNotes) ||
        hasValue(data.clinic.invoiceTerms) ? (
          <>
            <div className="receipt-rule" />
            <section className="receipt-section receipt-footer-text">
              {hasValue(data.invoice.notes) ? (
                <div>
                  <strong>Nota:</strong> {data.invoice.notes}
                </div>
              ) : null}
              {hasValue(data.clinic.invoiceNotes) ? (
                <div className="receipt-section">
                  <strong>Indicaciones:</strong> {data.clinic.invoiceNotes}
                </div>
              ) : null}
              {hasValue(data.clinic.invoiceTerms) ? (
                <div className="receipt-section">
                  <strong>Términos:</strong> {data.clinic.invoiceTerms}
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        <div className="receipt-rule" />

        <footer className="receipt-center receipt-muted">
          <div>Gracias por confiar en {data.clinic.name}.</div>
          <div>Conserva este recibo para cualquier aclaración.</div>
        </footer>
      </article>
    </main>
  );
}
