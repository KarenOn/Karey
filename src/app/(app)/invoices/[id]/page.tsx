"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  ArrowLeft,
  Printer,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Package,
  Stethoscope,
  PawPrint,
  Banknote,
  Building2,
  Check,
} from "lucide-react";

import { apiCreatePayment, apiGetInvoice, apiUpdateInvoice, InvoiceDetail } from "@/lib/api/invoices";

const speciesEmoji: Record<string, string> = {
  DOG: "🐕",
  CAT: "🐱",
  BIRD: "🦜",
  REPTILE: "🦎",
  RODENT: "🐹",
  RABBIT: "🐰",
  OTHER: "🐾",
};

const statusUI: Record<
  string,
  { label: string; icon: any; badge: string; hint: string }
> = {
  ISSUED: { label: "Pendiente", icon: Clock, badge: "bg-amber-100 text-amber-700 border-amber-200", hint: "Aún no está pagada" },
  PAID: { label: "Pagada", icon: CheckCircle, badge: "bg-emerald-100 text-emerald-700 border-emerald-200", hint: "Pago completado" },
  PARTIALLY_PAID: { label: "Parcialmente pagada", icon: Check, badge: "bg-blue-100 text-blue-700 border-blue-200", hint: "Pago parcial" },
  VOID: { label: "Anulada", icon: XCircle, badge: "bg-rose-100 text-rose-700 border-rose-200", hint: "Factura anulada" },
  CANCELLED: { label: "Anulada", icon: XCircle, badge: "bg-rose-100 text-rose-700 border-rose-200", hint: "Factura anulada" },
};

const methodUI: Record<string, { label: string; icon: any }> = {
  CASH: { label: "Efectivo", icon: Banknote },
  CARD: { label: "Tarjeta", icon: CreditCard },
  TRANSFER: { label: "Transferencia", icon: Building2 },
};

function money(v: unknown) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return n.toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

function safeDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const invoiceId = Number(params.id);

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // pago rápido
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("CASH");
  const [payRef, setPayRef] = useState<string>("");

  const issueDate = useMemo(() => safeDate(invoice?.issueDate), [invoice?.issueDate]);

  const paidSum = useMemo(() => {
    if (!invoice) return 0;
    return invoice.payments.reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
  }, [invoice]);

  const total = useMemo(() => Number(invoice?.total ?? 0), [invoice]);
  const remaining = useMemo(() => Math.max(0, total - paidSum), [total, paidSum]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const data = await apiGetInvoice(invoiceId);
        if (!mounted) return;
        setInvoice(data);
        setPayAmount(String(Math.max(0, Number(data.total) - data.payments.reduce((a, p) => a + Number(p.amount), 0)).toFixed(2)));
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Error");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [invoiceId]);

  const ui = invoice ? (statusUI[invoice.status] ?? { label: invoice.status, icon: Clock, badge: "bg-slate-100 text-slate-700 border-slate-200", hint: "" }) : null;
  const StatusIcon = ui?.icon ?? Clock;

  const canPay = invoice && invoice.status !== "PAID" && invoice.status !== "VOID" && invoice.status !== "CANCELLED";
  const canVoid = invoice && invoice.status !== "VOID" && invoice.status !== "CANCELLED";

  const refresh = async () => {
    const data = await apiGetInvoice(invoiceId);
    setInvoice(data);
  };

  const handlePrint = () => window.print();

  const markVoid = async () => {
    if (!invoice) return;
    await apiUpdateInvoice(invoice.id, { status: "VOID" });
    await refresh();
  };

  const quickPay = async () => {
    if (!invoice) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    await apiCreatePayment(invoice.id, {
      amount,
      method: payMethod,
      reference: payRef ? payRef : null,
    });

    await refresh();
  };

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-6">
        <div className="h-6 w-48 bg-muted rounded mb-3 animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded mb-8 animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (err || !invoice) {
    return (
      <div className="rounded-2xl border bg-card p-6">
        <p className="font-semibold text-foreground">No se pudo cargar la factura</p>
        <p className="text-sm text-muted-foreground mt-1">{err ?? "Factura no encontrada"}</p>
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </div>
      </div>
    );
  }

  const petEmoji = invoice.pet?.species ? (speciesEmoji[invoice.pet.species] ?? "🐾") : "🐾";

  return (
    <div className="space-y-6">
      {/* Print tweaks */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-sheet { box-shadow: none !important; border: none !important; }
          .print-padding { padding: 0 !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{invoice.number}</h1>
              <Badge className={`${ui?.badge} border px-3 py-1`}>
                <StatusIcon className="w-4 h-4 mr-1" />
                {ui?.label}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              {issueDate ? format(issueDate, "EEEE d 'de' MMMM, yyyy", { locale: es }) : "—"}
              {ui?.hint ? <span className="text-muted-foreground/80">• {ui.hint}</span> : null}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>

          {canVoid && (
            <Button variant="outline" className="text-rose-600 hover:bg-rose-50" onClick={markVoid}>
              <XCircle className="w-4 h-4 mr-2" /> Anular
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Invoice sheet */}
        <div className="lg:col-span-2">
          <div className="print-sheet overflow-hidden rounded-2xl border bg-card">
            {/* Top brand bar */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <PawPrint className="w-6 h-6" />
                </div>
                <div className="leading-tight">
                  <p className="text-xl font-bold">VetCare</p>
                  <p className="text-teal-100 text-sm">Factura veterinaria</p>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-teal-100 text-sm">Factura</p>
                  <p className="text-2xl font-bold">{invoice.number}</p>
                </div>
                <div className="text-right">
                  <p className="text-teal-100 text-sm">Fecha</p>
                  <p className="font-semibold">
                    {issueDate ? format(issueDate, "d MMM yyyy", { locale: es }) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="p-6 print-padding">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 text-xs font-semibold text-muted-foreground">CONCEPTO</th>
                      <th className="text-center py-3 text-xs font-semibold text-muted-foreground">CANT</th>
                      <th className="text-right py-3 text-xs font-semibold text-muted-foreground">P. UNIT</th>
                      <th className="text-right py-3 text-xs font-semibold text-muted-foreground">ITBIS</th>
                      <th className="text-right py-3 text-xs font-semibold text-muted-foreground">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoice.items.map((it) => {
                      const isProduct = String(it.type).toUpperCase() === "PRODUCT";
                      return (
                        <tr key={it.id}>
                          <td className="py-4">
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5">
                                {isProduct ? <Package className="w-4 h-4 text-muted-foreground" /> : <Stethoscope className="w-4 h-4 text-muted-foreground" />}
                              </span>
                              <div>
                                <p className="font-medium text-foreground">{it.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {isProduct ? "Producto" : "Servicio"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-4 text-sm text-muted-foreground">{Number(it.quantity)}</td>
                          <td className="text-right py-4 text-sm text-muted-foreground">{money(it.unitPrice)}</td>
                          <td className="text-right py-4 text-sm text-muted-foreground">{Number(it.taxRate ?? 0)}%</td>
                          <td className="text-right py-4 font-semibold text-foreground">{money(it.lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-end">
                  <div className="w-full max-w-sm space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="text-foreground/90">{money(invoice.subtotal)}</span>
                    </div>
                    {Number(invoice.discount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-600">Descuento</span>
                        <span className="text-orange-600">-{money(invoice.discount)}</span>
                      </div>
                    )}
                    {Number(invoice.tax) > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Impuestos</span>
                        <span className="text-foreground/90">{money(invoice.tax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>{money(invoice.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes ? (
                <div className="mt-6 rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">NOTAS</p>
                  <p className="text-sm text-foreground">{invoice.notes}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* RIGHT: Info cards */}
        <div className="space-y-6">
          {/* Cliente */}
          <div className={invoice.pet ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-teal-500" /> Cliente
              </h3>

              <p className="font-semibold text-lg text-foreground">{invoice.client.fullName}</p>

              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {invoice.client.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" /> <span className="text-foreground/90">{invoice.client.phone}</span>
                  </div>
                ) : null}

                {invoice.client.email ? (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> <span className="text-foreground/90">{invoice.client.email}</span>
                  </div>
                ) : null}

                {invoice.client.address ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> <span className="text-foreground/90">{invoice.client.address}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Paciente */}
            {invoice.pet ? (
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <PawPrint className="w-5 h-5 text-teal-500" /> Paciente
                </h3>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center text-3xl">
                    {petEmoji}
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-foreground">{invoice.pet.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.pet.species} {invoice.pet.breed ? `• ${invoice.pet.breed}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Pago / resumen */}
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-500" /> Pago
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Total</span>
                <span className="text-foreground/90 font-medium">{money(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Pagado</span>
                <span className="text-foreground/90 font-medium">{money(paidSum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pendiente</span>
                <span className={`font-semibold ${remaining > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  {money(remaining)}
                </span>
              </div>

              <div className="pt-3">
                <Badge className={`${ui?.badge} border`}>
                  <StatusIcon className="w-4 h-4 mr-1" /> {ui?.label}
                </Badge>
              </div>
            </div>

            {/* Pago rápido */}
            {canPay ? (
              <div className="mt-4 rounded-xl border bg-muted/30 p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3">REGISTRAR PAGO</p>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Monto</label>
                    <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={payMethod === "CASH" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setPayMethod("CASH")}
                    >
                      <Banknote className="w-4 h-4 mr-2" /> Efectivo
                    </Button>
                    <Button
                      type="button"
                      variant={payMethod === "CARD" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setPayMethod("CARD")}
                    >
                      <CreditCard className="w-4 h-4 mr-2" /> Tarjeta
                    </Button>
                    <Button
                      type="button"
                      variant={payMethod === "TRANSFER" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setPayMethod("TRANSFER")}
                    >
                      <Building2 className="w-4 h-4 mr-2" /> Transfer
                    </Button>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Referencia (opcional)</label>
                    <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Ej: voucher, transacción..." />
                  </div>

                  <Button onClick={quickPay} className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" /> Registrar pago
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Historial */}
            {invoice.payments.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">HISTORIAL</p>
                <div className="space-y-2">
                  {invoice.payments.slice(0, 5).map((p) => {
                    const m = methodUI[p.method] ?? { label: p.method, icon: CreditCard };
                    const Ico = m.icon;
                    const d = safeDate(p.paidAt);
                    return (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border bg-background p-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <Ico className="w-4 h-4 text-muted-foreground" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{m.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {d ? format(d, "d MMM yyyy • h:mm a", { locale: es }) : "—"}
                              {p.reference ? ` • ${p.reference}` : ""}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold text-foreground">{money(p.amount)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-4">No hay pagos registrados aún.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
