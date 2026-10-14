"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTablePagination from "@/components/shared/DataTablePagination";
import StatusBadge from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { formatCurrency } from "@/lib/utility";
import { apiListPetInvoices, type InvoiceListRow } from "@/lib/api/invoices";

type PatientInvoiceRow = Pick<InvoiceListRow, "id" | "number" | "status" | "issueDate" | "total" | "paidTotal" | "client" | "pet" | "paymentsCount"> & {
  dueDate: string | null;
};

const statusConfig: Record<string, { label: string; badge: "success" | "info" | "warning" | "destructive" | "neutral" }> = {
  PAID: { label: "Pagada", badge: "success" },
  PARTIALLY_PAID: { label: "Parcialmente pagada", badge: "info" },
  ISSUED: { label: "Pendiente", badge: "warning" },
  VOID: { label: "Anulada", badge: "destructive" },
  DRAFT: { label: "Borrador", badge: "neutral" },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });
}

export default function PatientInvoicesTab({ petId, currency = "DOP" }: { petId: number; currency?: string }) {
  const [invoices, setInvoices] = useState<PatientInvoiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // This effect owns request lifecycle state for each server query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    apiListPetInvoices(petId, { page, pageSize: 10, q: search.trim(), status: status === "ALL" ? undefined : status })
      .then((result) => {
        if (!active) return;
        setInvoices(result.data);
        setTotal(result.total);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "No se pudieron cargar las facturas");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, petId, search, status]);

  return (
    <div className="app-panel-strong overflow-hidden">
      <div className="border-b border-border/70 p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /><h2 className="app-heading text-2xl">Facturación</h2></div>
          <p className="text-sm text-muted-foreground">Consulta las facturas asociadas a esta mascota.</p>
        </div>
        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Buscar facturas" className="pl-9" placeholder="Buscar por número o cliente" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} /></div>
          <Select value={status} onValueChange={(value) => { setStatus(value); setPage(0); }}><SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos los estados</SelectItem>{Object.entries(statusConfig).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      {error ? <div className="p-5 text-sm text-destructive">{error}</div> : loading ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <LoadingSkeleton key={item} className="h-12" />)}</div> : invoices.length === 0 ? <div className="p-12 text-center"><Receipt className="mx-auto mb-3 h-9 w-9 text-muted-foreground/45" /><p className="font-medium">No hay facturas asociadas</p><p className="mt-1 text-sm text-muted-foreground">Las facturas de esta mascota aparecerán aquí.</p></div> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[820px]"><thead><tr className="border-b border-border/70 bg-muted/35 text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-5 py-3 font-semibold">Factura</th><th className="px-5 py-3 font-semibold">Fecha</th><th className="px-5 py-3 font-semibold">Cliente</th><th className="px-5 py-3 font-semibold">Total</th><th className="px-5 py-3 font-semibold">Pagado</th><th className="px-5 py-3 font-semibold">Pendiente</th><th className="px-5 py-3 font-semibold">Estado</th><th className="px-5 py-3 text-right font-semibold">Acción</th></tr></thead><tbody className="divide-y divide-border/60">{invoices.map((invoice) => { const statusInfo = statusConfig[invoice.status] ?? statusConfig.ISSUED; const pending = invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID" ? Math.max(0, Number(invoice.total) - Number(invoice.paidTotal)) : 0; return <tr key={invoice.id} className="hover:bg-muted/30"><td className="px-5 py-4"><Link className="font-semibold text-primary hover:underline" href={`/invoices/${invoice.id}`}>{invoice.number}</Link></td><td className="px-5 py-4 text-sm text-muted-foreground">{formatDate(invoice.issueDate)}</td><td className="px-5 py-4 text-sm">{invoice.client.fullName}</td><td className="px-5 py-4 text-sm font-semibold">{formatCurrency(Number(invoice.total), currency)}</td><td className="px-5 py-4 text-sm text-muted-foreground">{formatCurrency(Number(invoice.paidTotal), currency)}</td><td className="px-5 py-4 text-sm text-muted-foreground">{formatCurrency(pending, currency)}</td><td className="px-5 py-4"><StatusBadge status={statusInfo.badge} label={statusInfo.label} /></td><td className="px-5 py-4 text-right"><Button asChild variant="ghost" size="icon-sm" aria-label={`Ver detalle de ${invoice.number}`}><Link href={`/invoices/${invoice.id}`}><Eye className="h-4 w-4" /></Link></Button></td></tr>; })}</tbody></table></div>
        <DataTablePagination page={page} pageSize={10} total={total} onPageChange={setPage} />
      </>}
    </div>
  );
}
