"use client";

import React, { useEffect } from "react";

type Money = number | string;

type InvoicePrintData = {
  clinic: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    rnc?: string | null;
    logoUrl?: string | null; // opcional
  };
  invoice: {
    number: string;
    status: "ISSUED" | "PAID" | "VOID" | "CANCELLED";
    issueDate: string; // ISO
    dueDate?: string | null; // ISO
    paidAt?: string | null; // ISO
    notes?: string | null;
    subtotal: Money;
    tax: Money;
    discount: Money;
    total: Money;
  };
  client: {
    fullName: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  pet?: {
    name: string;
    species?: string | null;
    breed?: string | null;
  } | null;
  items: Array<{
    description: string;
    quantity: Money;
    unitPrice: Money;
    lineTotal: Money;
    type?: string | null; // SERVICE / PRODUCT
  }>;
  payments?: Array<{
    method: "CASH" | "CARD" | "TRANSFER" | string;
    amount: Money;
    reference?: string | null;
    paidAt: string; // ISO
  }>;
};

function money(n: Money) {
  const num = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dt(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("es-DO", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function statusLabel(s: InvoicePrintData["invoice"]["status"]) {
  switch (s) {
    case "PAID": return "PAGADA";
    case "ISSUED": return "PENDIENTE";
    case "VOID":
    case "CANCELLED": return "CANCELADA";
    default: return s;
  }
}

export default function InvoicePrintA4({
  data,
  autoPrint = false,
}: {
  data: InvoicePrintData;
  autoPrint?: boolean;
}) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoPrint]);

  const paidTotal = (data.payments ?? []).reduce((acc, p) => acc + Number(p.amount), 0);
  const balance = Math.max(0, Number(data.invoice.total) - paidTotal);

  return (
    <div className="print-a4">
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          .sheet { box-shadow: none !important; border: none !important; }
          body { background: white !important; }
        }
        .print-a4 {
          background: #f6f7fb;
          padding: 24px;
          min-height: 100vh;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif;
          color: #0f172a;
        }
        .sheet {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          box-shadow: 0 18px 40px rgba(2,6,23,0.08);
          overflow: hidden;
        }
        .topbar {
          background: linear-gradient(135deg, rgba(20,184,166,0.10), rgba(56,189,248,0.10));
          padding: 22px 26px;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
        }
        .brand {
          display: flex; gap: 14px; align-items: center;
        }
        .logo {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: rgba(20,184,166,0.12);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; color: rgb(13,148,136);
          overflow: hidden;
        }
        .logo img { width: 100%; height: 100%; object-fit: cover; }
        .clinic-name { font-size: 18px; font-weight: 800; line-height: 1.1; }
        .muted { color: rgba(15,23,42,.65); font-size: 12px; margin-top: 3px; }
        .pill {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          border: 1px solid rgba(15,23,42,.08);
          background: rgba(255,255,255,.7);
          white-space: nowrap;
        }
        .status {
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
        }
        .status.paid { background: rgba(16,185,129,.14); color: rgb(5,150,105); }
        .status.pending { background: rgba(245,158,11,.14); color: rgb(180,83,9); }
        .status.cancelled { background: rgba(244,63,94,.14); color: rgb(225,29,72); }
        .content { padding: 22px 26px 26px; }
        .grid {
          display: grid;
          grid-template-columns: 1.2fr .8fr;
          gap: 18px;
          margin-bottom: 18px;
        }
        .card {
          border: 1px solid rgba(15,23,42,.08);
          border-radius: 16px;
          padding: 14px;
        }
        .card h3 {
          margin: 0;
          font-size: 12px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: rgba(15,23,42,.55);
        }
        .kv { margin-top: 10px; display: grid; gap: 6px; font-size: 13px; }
        .kv div { display: flex; justify-content: space-between; gap: 12px; }
        .kv span:first-child { color: rgba(15,23,42,.6); }
        .kv span:last-child { font-weight: 600; text-align: right; }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid rgba(15,23,42,.08);
        }
        .table th {
          text-align: left;
          font-size: 12px;
          color: rgba(15,23,42,.65);
          background: rgba(2,6,23,.03);
          padding: 10px 10px;
          border-bottom: 1px solid rgba(15,23,42,.08);
        }
        .table td {
          padding: 10px 10px;
          border-bottom: 1px solid rgba(15,23,42,.06);
          font-size: 13px;
          vertical-align: top;
        }
        .table tr:last-child td { border-bottom: none; }
        .right { text-align: right; }
        .desc { font-weight: 650; }
        .tiny { font-size: 12px; color: rgba(15,23,42,.55); margin-top: 4px; }
        .bottom {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1.2fr .8fr;
          gap: 18px;
          align-items: start;
        }
        .totals .row {
          display: flex; justify-content: space-between; gap: 12px;
          padding: 7px 0;
          font-size: 13px;
        }
        .totals .row strong { font-weight: 800; }
        .grand {
          margin-top: 8px;
          padding: 12px 12px;
          border-radius: 14px;
          background: rgba(20,184,166,.10);
          border: 1px solid rgba(20,184,166,.22);
          display: flex; justify-content: space-between; align-items: center;
          font-size: 16px; font-weight: 900;
        }
        .note {
          white-space: pre-wrap;
          font-size: 13px;
          color: rgba(15,23,42,.7);
        }
        .footer {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px dashed rgba(15,23,42,.18);
          display: flex;
          justify-content: space-between;
          gap: 16px;
          color: rgba(15,23,42,.55);
          font-size: 12px;
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 900, margin: "0 auto 12px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(15,23,42,.12)",
            background: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="sheet">
        <div className="topbar">
          <div className="brand">
            <div className="logo">
              {data.clinic.logoUrl ? <img src={data.clinic.logoUrl} alt="logo" /> : data.clinic.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="clinic-name">{data.clinic.name}</div>
              <div className="muted">
                {data.clinic.address ? <div>{data.clinic.address}</div> : null}
                <div>
                  {data.clinic.phone ? `${data.clinic.phone}` : ""}
                  {data.clinic.phone && data.clinic.email ? " • " : ""}
                  {data.clinic.email ? data.clinic.email : ""}
                </div>
                {data.clinic.rnc ? <div>RNC: {data.clinic.rnc}</div> : null}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
            <div className="pill">
              <span style={{ color: "rgba(15,23,42,.65)" }}>Factura</span>
              <span style={{ fontWeight: 900 }}>{data.invoice.number}</span>
            </div>

            <div
              className={[
                "status",
                data.invoice.status === "PAID"
                  ? "paid"
                  : data.invoice.status === "ISSUED"
                  ? "pending"
                  : "cancelled",
              ].join(" ")}
            >
              {statusLabel(data.invoice.status)}
            </div>
          </div>
        </div>

        <div className="content">
          <div className="grid">
            <div className="card">
              <h3>Cliente</h3>
              <div className="kv">
                <div><span>Nombre</span><span>{data.client.fullName}</span></div>
                {data.client.phone ? <div><span>Tel</span><span>{data.client.phone}</span></div> : null}
                {data.client.email ? <div><span>Email</span><span>{data.client.email}</span></div> : null}
                {data.client.address ? <div><span>Dirección</span><span>{data.client.address}</span></div> : null}
                {data.pet?.name ? <div><span>Mascota</span><span>{data.pet.name}{data.pet.species ? ` • ${data.pet.species}` : ""}</span></div> : null}
              </div>
            </div>

            <div className="card">
              <h3>Detalle</h3>
              <div className="kv">
                <div><span>Emisión</span><span>{dt(data.invoice.issueDate)}</span></div>
                <div><span>Vence</span><span>{dt(data.invoice.dueDate)}</span></div>
                <div><span>Pagada</span><span>{dt(data.invoice.paidAt)}</span></div>
              </div>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "52%" }}>Descripción</th>
                <th className="right" style={{ width: "12%" }}>Cant.</th>
                <th className="right" style={{ width: "18%" }}>Precio</th>
                <th className="right" style={{ width: "18%" }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="desc">{it.description}</div>
                    {it.type ? <div className="tiny">{it.type}</div> : null}
                  </td>
                  <td className="right">{money(it.quantity)}</td>
                  <td className="right">{money(it.unitPrice)}</td>
                  <td className="right" style={{ fontWeight: 800 }}>{money(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bottom">
            <div className="card">
              <h3>Notas</h3>
              <div className="note" style={{ marginTop: 10 }}>
                {data.invoice.notes?.trim() ? data.invoice.notes : "—"}
              </div>

              <div style={{ marginTop: 14 }}>
                <h3>Pagos</h3>
                <div className="kv" style={{ marginTop: 10 }}>
                  {(data.payments ?? []).length === 0 ? (
                    <div><span>Sin pagos</span><span>—</span></div>
                  ) : (
                    data.payments!.map((p, i) => (
                      <div key={i}>
                        <span>{p.method}{p.reference ? ` (${p.reference})` : ""}</span>
                        <span>{money(p.amount)} • {dt(p.paidAt)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="card totals">
              <h3>Totales</h3>
              <div style={{ marginTop: 10 }}>
                <div className="row"><span>Subtotal</span><span>{money(data.invoice.subtotal)}</span></div>
                <div className="row"><span>Impuestos</span><span>{money(data.invoice.tax)}</span></div>
                <div className="row"><span>Descuento</span><span>- {money(data.invoice.discount)}</span></div>

                <div className="grand">
                  <span>TOTAL</span>
                  <span>{money(data.invoice.total)}</span>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div className="row"><span>Pagado</span><span><strong>{money(paidTotal)}</strong></span></div>
                  <div className="row"><span>Balance</span><span><strong>{money(balance)}</strong></span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="footer">
            <div>Gracias por su visita 🐾</div>
            <div>Documento generado por el sistema</div>
          </div>
        </div>
      </div>
    </div>
  );
}
