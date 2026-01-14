"use client";

import React, { useEffect } from "react";

type Money = number | string;

type TicketData = {
  paper?: "58" | "80"; // 58mm o 80mm
  clinic: { name: string; phone?: string | null; address?: string | null; rnc?: string | null };
  invoice: { number: string; issueDate: string; status: string; subtotal: Money; tax: Money; discount: Money; total: Money };
  client: { fullName: string; phone?: string | null };
  pet?: { name: string } | null;
  items: Array<{ description: string; quantity: Money; unitPrice: Money; lineTotal: Money }>;
  payments?: Array<{ method: string; amount: Money }>;
};

function money(n: Money) {
  const num = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function dt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-DO", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function cut(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export default function InvoiceTicketThermal({ data, autoPrint = false }: { data: TicketData; autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, [autoPrint]);

  const width = data.paper === "58" ? "48mm" : "72mm"; // recomendados
  const paid = (data.payments ?? []).reduce((a, p) => a + Number(p.amount), 0);
  const balance = Math.max(0, Number(data.invoice.total) - paid);

  return (
    <div className="ticket-wrap">
      <style>{`
        :root { --paper: ${width}; }
        @page { size: var(--paper) auto; margin: 6mm 4mm; }
        html, body { margin: 0; padding: 0; background: #fff; color: #000; }
        .ticket {
          width: var(--paper);
          margin: 0 auto;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          line-height: 1.25;
        }
        .c { text-align: center; }
        .b { font-weight: 800; }
        .m { color: #222; }
        .hr { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; gap: 8px; }
        .right { text-align: right; }
        .items { margin-top: 6px; }
        .item { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 3px 0; }
        .total { font-size: 16px; font-weight: 900; }
        .tiny { font-size: 10px; }
        @media screen {
          body { background: #f3f4f6; padding: 16px; }
          .ticket { background: #fff; padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
        }
      `}</style>

      <div className="ticket">
        <div className="c">
          <div className="b">{data.clinic.name}</div>
          {data.clinic.address ? <div className="tiny">{data.clinic.address}</div> : null}
          {data.clinic.phone ? <div className="tiny">Tel: {data.clinic.phone}</div> : null}
          {data.clinic.rnc ? <div className="tiny">RNC: {data.clinic.rnc}</div> : null}
        </div>

        <div className="hr" />

        <div className="row">
          <div className="tiny">Factura</div>
          <div className="tiny b">{data.invoice.number}</div>
        </div>
        <div className="row">
          <div className="tiny">Fecha</div>
          <div className="tiny">{dt(data.invoice.issueDate)}</div>
        </div>
        <div className="row">
          <div className="tiny">Estado</div>
          <div className="tiny">{data.invoice.status}</div>
        </div>

        <div className="hr" />

        <div className="tiny">
          <div><span className="m">Cliente:</span> {cut(data.client.fullName, 28)}</div>
          {data.client.phone ? <div><span className="m">Tel:</span> {data.client.phone}</div> : null}
          {data.pet?.name ? <div><span className="m">Mascota:</span> {cut(data.pet.name, 28)}</div> : null}
        </div>

        <div className="hr" />

        <div className="row tiny b">
          <div>Detalle</div>
          <div>Importe</div>
        </div>

        <div className="items">
          {data.items.map((it, idx) => (
            <div key={idx} className="item">
              <div>
                {cut(`${money(it.quantity)} x ${it.description}`, data.paper === "58" ? 28 : 40)}
                <div className="tiny m">{money(it.unitPrice)} c/u</div>
              </div>
              <div className="b">{money(it.lineTotal)}</div>
            </div>
          ))}
        </div>

        <div className="hr" />

        <div className="row tiny"><div>Subtotal</div><div>{money(data.invoice.subtotal)}</div></div>
        <div className="row tiny"><div>Impuestos</div><div>{money(data.invoice.tax)}</div></div>
        <div className="row tiny"><div>Descuento</div><div>-{money(data.invoice.discount)}</div></div>

        <div className="row total">
          <div>TOTAL</div>
          <div>{money(data.invoice.total)}</div>
        </div>

        <div className="hr" />

        <div className="tiny">
          {(data.payments ?? []).length ? (
            <>
              {(data.payments ?? []).map((p, i) => (
                <div className="row" key={i}>
                  <div>Pago: {p.method}</div>
                  <div className="b">{money(p.amount)}</div>
                </div>
              ))}
            </>
          ) : (
            <div className="row"><div>Pago</div><div>—</div></div>
          )}
          <div className="row">
            <div>Balance</div>
            <div className="b">{money(balance)}</div>
          </div>
        </div>

        <div className="hr" />

        <div className="c tiny m">
          <div>Gracias por su visita 🐾</div>
          <div>Conserve este ticket</div>
        </div>
      </div>
    </div>
  );
}
