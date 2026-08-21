"use client";

import { useEffect } from "react";
import type { InvoicePrintData } from "@/lib/print/getInvoicePrintData";

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
    dateStyle: "medium",
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
      return "Parcialmente pagada";
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

export default function InvoicePrintA4Document({
  data,
  autoPrint = false,
}: {
  data: InvoicePrintData;
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

  return (
    <main className="invoice-print-screen">
      <style>{`
        @page {
          size: A4;
          margin: 14mm;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #111827;
        }

        body {
          font-family: Arial, Helvetica, sans-serif;
        }

        .invoice-print-screen {
          min-height: 100vh;
          background: #eef2f7;
          padding: 24px;
        }

        .invoice-print-toolbar {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          max-width: 960px;
          margin: 0 auto 12px;
        }

        .invoice-print-toolbar button {
          border: 1px solid #d7dde7;
          background: #ffffff;
          border-radius: 999px;
          padding: 10px 16px;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        #invoice-print-root {
          max-width: 960px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #dde4ee;
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 28px;
          border-bottom: 1px solid #dde4ee;
        }

        .invoice-brand {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .invoice-logo {
          width: 64px;
          height: 64px;
          border: 1px solid #dde4ee;
          object-fit: contain;
        }

        .invoice-logo-fallback {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #dde4ee;
          font-weight: 700;
        }

        .invoice-title {
          font-size: 24px;
          font-weight: 800;
          line-height: 1.1;
        }

        .invoice-muted {
          color: #4b5563;
          font-size: 13px;
          margin-top: 4px;
        }

        .invoice-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #dde4ee;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          background: #f9fafb;
        }

        .invoice-body {
          padding: 24px 28px 28px;
        }

        .invoice-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .invoice-card {
          border: 1px solid #dde4ee;
          padding: 16px;
        }

        .invoice-card h2 {
          margin: 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #4b5563;
        }

        .invoice-kv {
          margin-top: 12px;
          display: grid;
          gap: 8px;
          font-size: 13px;
        }

        .invoice-kv-row {
          display: flex;
          justify-content: space-between;
          gap: 14px;
        }

        .invoice-kv-row span:first-child {
          color: #4b5563;
        }

        .invoice-kv-row span:last-child {
          font-weight: 600;
          text-align: right;
        }

        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          border: 1px solid #dde4ee;
        }

        .invoice-table th,
        .invoice-table td {
          border-bottom: 1px solid #dde4ee;
          padding: 10px 12px;
          vertical-align: top;
          font-size: 13px;
        }

        .invoice-table tr:last-child td {
          border-bottom: 0;
        }

        .invoice-table th {
          text-align: left;
          background: #f9fafb;
          font-size: 12px;
          color: #4b5563;
        }

        .invoice-right {
          text-align: right;
        }

        .invoice-item-title {
          font-weight: 700;
        }

        .invoice-item-meta {
          margin-top: 4px;
          color: #4b5563;
          font-size: 12px;
        }

        .invoice-bottom {
          display: grid;
          grid-template-columns: 1fr 0.8fr;
          gap: 18px;
          margin-top: 18px;
        }

        .invoice-note {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          color: #374151;
          font-size: 13px;
          line-height: 1.5;
        }

        .invoice-total-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 0;
          font-size: 13px;
        }

        .invoice-grand-total {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0 0;
          margin-top: 8px;
          border-top: 2px solid #111827;
          font-size: 18px;
          font-weight: 800;
        }

        .invoice-footer {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px dashed #9ca3af;
          color: #4b5563;
          font-size: 12px;
        }

        @media print {
          body * {
            visibility: hidden;
          }

          #invoice-print-root,
          #invoice-print-root * {
            visibility: visible;
          }

          .invoice-print-screen {
            background: #ffffff;
            padding: 0;
          }

          .invoice-print-toolbar {
            display: none !important;
          }

          #invoice-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: none;
            border: 0;
          }
        }
      `}</style>

      <div className="invoice-print-toolbar">
        <button type="button" onClick={() => window.print()}>
          Imprimir factura
        </button>
      </div>

      <article id="invoice-print-root">
        <header className="invoice-header">
          <div className="invoice-brand">
            {data.clinic.logoUrl ? (
              <img
                alt={`Logo de ${data.clinic.name}`}
                className="invoice-logo"
                src={data.clinic.logoUrl}
              />
            ) : (
              <div className="invoice-logo-fallback">
                {data.clinic.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="invoice-title">{data.clinic.name}</div>
              {hasValue(data.clinic.address) ? (
                <div className="invoice-muted">{data.clinic.address}</div>
              ) : null}
              <div className="invoice-muted">
                {data.clinic.phone ?? ""}
                {data.clinic.phone && data.clinic.email ? " | " : ""}
                {data.clinic.email ?? ""}
              </div>
              {hasValue(data.clinic.rnc) ? (
                <div className="invoice-muted">RNC: {data.clinic.rnc}</div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="invoice-pill">Factura {data.invoice.number}</div>
            <div className="invoice-muted" style={{ marginTop: 10 }}>
              Estado: {statusLabel(data.invoice.status)}
            </div>
            <div className="invoice-muted">
              Emisión: {formatDateTime(data.invoice.issueDate, data.clinic.timezone)}
            </div>
            {data.invoice.paidAt ? (
              <div className="invoice-muted">
                Pagada: {formatDateTime(data.invoice.paidAt, data.clinic.timezone)}
              </div>
            ) : null}
          </div>
        </header>

        <div className="invoice-body">
          <section className="invoice-grid">
            <div className="invoice-card">
              <h2>Cliente</h2>
              <div className="invoice-kv">
                <div className="invoice-kv-row">
                  <span>Nombre</span>
                  <span>{data.client.fullName}</span>
                </div>
                {hasValue(data.client.phone) ? (
                  <div className="invoice-kv-row">
                    <span>Teléfono</span>
                    <span>{data.client.phone}</span>
                  </div>
                ) : null}
                {hasValue(data.client.email) ? (
                  <div className="invoice-kv-row">
                    <span>Correo</span>
                    <span>{data.client.email}</span>
                  </div>
                ) : null}
                {hasValue(data.client.address) ? (
                  <div className="invoice-kv-row">
                    <span>Dirección</span>
                    <span>{data.client.address}</span>
                  </div>
                ) : null}
                {data.pet?.name ? (
                  <div className="invoice-kv-row">
                    <span>Paciente</span>
                    <span>
                      {data.pet.name}
                      {data.pet.species ? ` | ${data.pet.species}` : ""}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="invoice-card">
              <h2>Resumen</h2>
              <div className="invoice-kv">
                <div className="invoice-kv-row">
                  <span>Subtotal</span>
                  <span>{money(data.invoice.subtotal)}</span>
                </div>
                <div className="invoice-kv-row">
                  <span>ITBIS</span>
                  <span>{money(data.invoice.tax)}</span>
                </div>
                <div className="invoice-kv-row">
                  <span>Descuento</span>
                  <span>-{money(data.invoice.discount)}</span>
                </div>
                <div className="invoice-kv-row">
                  <span>Pagado</span>
                  <span>{money(paidTotal)}</span>
                </div>
                <div className="invoice-kv-row">
                  <span>Balance</span>
                  <span>{money(balance)}</span>
                </div>
              </div>
            </div>
          </section>

          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: "48%" }}>Descripción</th>
                <th className="invoice-right" style={{ width: "12%" }}>
                  Cant.
                </th>
                <th className="invoice-right" style={{ width: "18%" }}>
                  Precio
                </th>
                <th className="invoice-right" style={{ width: "22%" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={`${item.description}-${index}`}>
                  <td>
                    <div className="invoice-item-title">{item.description}</div>
                    {item.type ? (
                      <div className="invoice-item-meta">{item.type}</div>
                    ) : null}
                  </td>
                  <td className="invoice-right">{money(item.quantity)}</td>
                  <td className="invoice-right">{money(item.unitPrice)}</td>
                  <td className="invoice-right">
                    <strong>{money(item.lineTotal)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="invoice-bottom">
            <div className="invoice-card">
              <h2>Notas y condiciones</h2>
              <div className="invoice-note" style={{ marginTop: 12 }}>
                {hasValue(data.invoice.notes) ? (
                  <>
                    <strong>Nota:</strong> {data.invoice.notes}
                  </>
                ) : null}
                {hasValue(data.clinic.invoiceNotes) ? (
                  <>
                    {hasValue(data.invoice.notes) ? "\n\n" : ""}
                    <strong>Indicaciones:</strong> {data.clinic.invoiceNotes}
                  </>
                ) : null}
                {hasValue(data.clinic.invoiceTerms) ? (
                  <>
                    {hasValue(data.invoice.notes) ||
                    hasValue(data.clinic.invoiceNotes)
                      ? "\n\n"
                      : ""}
                    <strong>Términos:</strong> {data.clinic.invoiceTerms}
                  </>
                ) : (
                  !hasValue(data.invoice.notes) &&
                  !hasValue(data.clinic.invoiceNotes) && "—"
                )}
              </div>

              <div style={{ marginTop: 18 }}>
                <h2>Pagos</h2>
                <div className="invoice-kv">
                  {(data.payments ?? []).length === 0 ? (
                    <div className="invoice-kv-row">
                      <span>Sin pagos</span>
                      <span>—</span>
                    </div>
                  ) : (
                    (data.payments ?? []).map((payment, index) => (
                      <div className="invoice-kv-row" key={`${payment.method}-${index}`}>
                        <span>
                          {paymentMethodLabel(payment.method)}
                          {payment.reference ? ` (${payment.reference})` : ""}
                        </span>
                        <span>
                          {money(payment.amount)} |{" "}
                          {formatDateTime(payment.paidAt, data.clinic.timezone)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="invoice-card">
              <h2>Totales</h2>
              <div style={{ marginTop: 12 }}>
                <div className="invoice-total-row">
                  <span>Subtotal</span>
                  <span>{money(data.invoice.subtotal)}</span>
                </div>
                {Number(data.invoice.discount) > 0 ? (
                  <div className="invoice-total-row">
                    <span>Descuento</span>
                    <span>-{money(data.invoice.discount)}</span>
                  </div>
                ) : null}
                {Number(data.invoice.tax) > 0 ? (
                  <div className="invoice-total-row">
                    <span>ITBIS</span>
                    <span>{money(data.invoice.tax)}</span>
                  </div>
                ) : null}
                <div className="invoice-total-row">
                  <span>Pagado</span>
                  <strong>{money(paidTotal)}</strong>
                </div>
                <div className="invoice-total-row">
                  <span>Balance</span>
                  <strong>{money(balance)}</strong>
                </div>
                <div className="invoice-grand-total">
                  <span>Total</span>
                  <span>{money(data.invoice.total)}</span>
                </div>
              </div>
            </div>
          </section>

          <footer className="invoice-footer">
            <div>Gracias por confiar en {data.clinic.name}.</div>
            <div>Documento generado para impresión desde Karey Vet.</div>
          </footer>
        </div>
      </article>
    </main>
  );
}
