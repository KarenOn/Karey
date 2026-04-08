import type { InvoicePrintData } from "@/lib/print/getInvoicePrintData";

function esc(s: unknown) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function money(n: any) {
  const num = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dt(iso?: string | null, tz?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("es-DO", {
    timeZone: tz ?? "America/Santo_Domingo",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

export function renderInvoiceA4Html(data: InvoicePrintData) {
  const tz = data.clinic.timezone ?? "America/Santo_Domingo";
  const paidTotal = (data.payments ?? []).reduce((acc, p) => acc + Number(p.amount), 0);
  const balance = Math.max(0, Number(data.invoice.total) - paidTotal);

  const statusClass =
    data.invoice.status === "PAID"
      ? "paid"
      : data.invoice.status === "ISSUED"
      ? "pending"
      : "cancelled";

  const itemsRows = data.items
    .map((it) => {
      return `
        <tr>
          <td>
            <div class="desc">${esc(it.description)}</div>
            ${it.type ? `<div class="tiny">${esc(it.type)}</div>` : ""}
          </td>
          <td class="right">${money(it.quantity)}</td>
          <td class="right">${money(it.unitPrice)}</td>
          <td class="right" style="font-weight:800">${money(it.lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  const paymentsRows =
    (data.payments ?? []).length === 0
      ? `<div><span>Sin pagos</span><span>—</span></div>`
      : (data.payments ?? [])
          .map((p) => {
            const label = `${p.method}${p.reference ? ` (${p.reference})` : ""}`;
            return `<div><span>${esc(label)}</span><span>${money(p.amount)} • ${esc(dt(p.paidAt, tz))}</span></div>`;
          })
          .join("");

  const logo = data.clinic.logoUrl
    ? `<img src="${esc(data.clinic.logoUrl)}" alt="logo" />`
    : esc(data.clinic.name.slice(0, 2).toUpperCase());

  // 👇 HTML completo (solo factura, sin layout del sistema)
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${esc(data.invoice.number)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { margin:0; background:#f6f7fb; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; }
    .print-a4 { padding:24px; min-height:100vh; }
    .sheet { max-width:900px; margin:0 auto; background:#fff; border:1px solid rgba(15,23,42,.08); border-radius:18px; box-shadow:0 18px 40px rgba(2,6,23,.08); overflow:hidden; }
    .topbar { background:linear-gradient(135deg, rgba(20,184,166,0.10), rgba(56,189,248,0.10)); padding:22px 26px; display:flex; justify-content:space-between; gap:16px; align-items:flex-start; border-bottom:1px solid rgba(15,23,42,0.06); }
    .brand { display:flex; gap:14px; align-items:center; }
    .logo { width:52px; height:52px; border-radius:14px; background:rgba(20,184,166,0.12); display:flex; align-items:center; justify-content:center; font-weight:800; color:rgb(13,148,136); overflow:hidden; }
    .logo img { width:100%; height:100%; object-fit:cover; }
    .clinic-name { font-size:18px; font-weight:800; line-height:1.1; }
    .muted { color:rgba(15,23,42,.65); font-size:12px; margin-top:3px; }
    .pill { display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px; font-size:12px; border:1px solid rgba(15,23,42,.08); background:rgba(255,255,255,.7); white-space:nowrap; }
    .status { font-weight:800; padding:6px 10px; border-radius:999px; font-size:12px; }
    .status.paid { background:rgba(16,185,129,.14); color:rgb(5,150,105); }
    .status.pending { background:rgba(245,158,11,.14); color:rgb(180,83,9); }
    .status.cancelled { background:rgba(244,63,94,.14); color:rgb(225,29,72); }
    .content { padding:22px 26px 26px; }
    .grid { display:grid; grid-template-columns:1.2fr .8fr; gap:18px; margin-bottom:18px; }
    .card { border:1px solid rgba(15,23,42,.08); border-radius:16px; padding:14px; }
    .card h3 { margin:0; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:rgba(15,23,42,.55); }
    .kv { margin-top:10px; display:grid; gap:6px; font-size:13px; }
    .kv div { display:flex; justify-content:space-between; gap:12px; }
    .kv span:first-child { color:rgba(15,23,42,.6); }
    .kv span:last-child { font-weight:600; text-align:right; }
    .table { width:100%; border-collapse:collapse; margin-top:12px; overflow:hidden; border-radius:14px; border:1px solid rgba(15,23,42,.08); }
    .table th { text-align:left; font-size:12px; color:rgba(15,23,42,.65); background:rgba(2,6,23,.03); padding:10px; border-bottom:1px solid rgba(15,23,42,.08); }
    .table td { padding:10px; border-bottom:1px solid rgba(15,23,42,.06); font-size:13px; vertical-align:top; }
    .table tr:last-child td { border-bottom:none; }
    .right { text-align:right; }
    .desc { font-weight:650; }
    .tiny { font-size:12px; color:rgba(15,23,42,.55); margin-top:4px; }
    .bottom { margin-top:16px; display:grid; grid-template-columns:1.2fr .8fr; gap:18px; align-items:start; }
    .totals .row { display:flex; justify-content:space-between; gap:12px; padding:7px 0; font-size:13px; }
    .totals .row strong { font-weight:800; }
    .grand { margin-top:8px; padding:12px; border-radius:14px; background:rgba(20,184,166,.10); border:1px solid rgba(20,184,166,.22); display:flex; justify-content:space-between; align-items:center; font-size:16px; font-weight:900; }
    .note { white-space:pre-wrap; font-size:13px; color:rgba(15,23,42,.7); }
    .footer { margin-top:18px; padding-top:14px; border-top:1px dashed rgba(15,23,42,.18); display:flex; justify-content:space-between; gap:16px; color:rgba(15,23,42,.55); font-size:12px; }
  </style>
</head>
<body>
  <div class="print-a4">
    <div class="sheet">
      <div class="topbar">
        <div class="brand">
          <div class="logo">${logo}</div>
          <div>
            <div class="clinic-name">${esc(data.clinic.name)}</div>
            <div class="muted">
              ${data.clinic.address ? `<div>${esc(data.clinic.address)}</div>` : ""}
              <div>
                ${data.clinic.phone ? esc(data.clinic.phone) : ""}
                ${data.clinic.phone && data.clinic.email ? " • " : ""}
                ${data.clinic.email ? esc(data.clinic.email) : ""}
              </div>
              ${data.clinic.rnc ? `<div>RNC: ${esc(data.clinic.rnc)}</div>` : ""}
            </div>
          </div>
        </div>

        <div style="display:grid; gap:8px; justify-items:end">
          <div class="pill">
            <span style="color:rgba(15,23,42,.65)">Factura</span>
            <span style="font-weight:900">${esc(data.invoice.number)}</span>
          </div>
          <div class="status ${statusClass}">${esc(statusLabel(data.invoice.status))}</div>
        </div>
      </div>

      <div class="content">
        <div class="grid">
          <div class="card">
            <h3>Cliente</h3>
            <div class="kv">
              <div><span>Nombre</span><span>${esc(data.client.fullName)}</span></div>
              ${data.client.phone ? `<div><span>Tel</span><span>${esc(data.client.phone)}</span></div>` : ""}
              ${data.client.email ? `<div><span>Email</span><span>${esc(data.client.email)}</span></div>` : ""}
              ${data.client.address ? `<div><span>Dirección</span><span>${esc(data.client.address)}</span></div>` : ""}
              ${data.pet?.name ? `<div><span>Mascota</span><span>${esc(data.pet.name)}${data.pet.species ? ` • ${esc(data.pet.species)}` : ""}</span></div>` : ""}
            </div>
          </div>

          <div class="card">
            <h3>Detalle</h3>
            <div class="kv">
              <div><span>Emisión</span><span>${esc(dt(data.invoice.issueDate, tz))}</span></div>
              <div><span>Vence</span><span>${esc(dt(data.invoice.dueDate ?? null, tz))}</span></div>
              <div><span>Pagada</span><span>${esc(dt(data.invoice.paidAt ?? null, tz))}</span></div>
            </div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th style="width:52%">Descripción</th>
              <th class="right" style="width:12%">Cant.</th>
              <th class="right" style="width:18%">Precio</th>
              <th class="right" style="width:18%">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="bottom">
          <div class="card">
            <h3>Notas</h3>
            <div class="note" style="margin-top:10px">
              ${esc(data.invoice.notes?.trim() ? data.invoice.notes : "—")}
            </div>

            <div style="margin-top:14px">
              <h3>Pagos</h3>
              <div class="kv" style="margin-top:10px">
                ${paymentsRows}
              </div>
            </div>
          </div>

          <div class="card totals">
            <h3>Totales</h3>
            <div style="margin-top:10px">
              <div class="row"><span>Subtotal</span><span>${money(data.invoice.subtotal)}</span></div>
              <div class="row"><span>Impuestos</span><span>${money(data.invoice.tax)}</span></div>
              <div class="row"><span>Descuento</span><span>- ${money(data.invoice.discount)}</span></div>

              <div class="grand">
                <span>TOTAL</span>
                <span>${money(data.invoice.total)}</span>
              </div>

              <div style="margin-top:10px">
                <div class="row"><span>Pagado</span><span><strong>${money(paidTotal)}</strong></span></div>
                <div class="row"><span>Balance</span><span><strong>${money(balance)}</strong></span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>Gracias por su visita 🐾</div>
          <div>Documento generado por el sistema</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
