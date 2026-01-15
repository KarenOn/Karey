"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Receipt,
  Eye,
  MoreVertical,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Banknote,
  Building,
  Ban,
  Check,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { apiListInvoices, apiUpdateInvoiceStatus, type InvoiceListRow } from "@/lib/api/invoices";

const statusConfig: Record<string, { icon: any; label: string; color: string }> = {
  PAID: { icon: CheckCircle, label: "Pagada", color: "bg-emerald-100 text-emerald-700" },
  PARTIALLY_PAID: { icon: Check, label: "Parcialmente pagada", color: "bg-blue-100 text-blue-700" },
  ISSUED: { icon: Clock, label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  VOID: { icon: XCircle, label: "Anulada", color: "bg-rose-100 text-rose-700" },
  DRAFT: { icon: Clock, label: "Borrador", color: "bg-slate-100 text-slate-700" },
};

const paymentMethodConfig: Record<string, { icon: any; label: string }> = {
  CASH: { icon: Banknote, label: "Efectivo" },
  CARD: { icon: CreditCard, label: "Tarjeta" },
  TRANSFER: { icon: Building, label: "Transferencia" },
};

const toMoney = (v: any) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiListInvoices({ take: 200 });
      setInvoices(data);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando facturas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredInvoices = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.number.toLowerCase().includes(q) ||
        inv.client.fullName.toLowerCase().includes(q) ||
        (inv.pet?.name?.toLowerCase().includes(q) ?? false);

      const matchesStatus = !statusFilter || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const totalPending = useMemo(
    () => invoices.filter((i) => i.status === "ISSUED").reduce((acc, i) => acc + toMoney(i.total), 0),
    [invoices]
  );

  const totalPaid = useMemo(
    () => invoices.filter((i) => i.status === "PAID").reduce((acc, i) => acc + toMoney(i.total), 0),
    [invoices]
  );

  const handleVoid = async (id: number) => {
    await apiUpdateInvoiceStatus(id, "VOID");
    await load();
  };

  const handlePrintTicket = (id: number) => {
    // si luego creas /api/invoices/:id/pdf o /ticket, aquí lo abres
    window.open(`/invoices/${id}/ticket?paper=58`, "_blank");
  };

  // const handleDownloadPdf = (id: number) => {
  //   window.open(`/invoices/${id}/print`, "_blank", "noopener,noreferrer"); // crea este endpoint cuando quieras
  // };

  const handleDownloadPdf = async (invoiceId: number, invoiceNumber: string) => {
    const res = await fetch(`/api/invoices/${invoiceId}/pdf`);
    if (!res.ok) throw new Error("No se pudo generar el PDF");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturación</h1>
          <p className="text-muted-foreground">Gestiona las facturas de tu clínica</p>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

        <Link href="/invoices/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Factura
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Facturas</p>
              <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cobrado</p>
              <p className="text-2xl font-bold text-foreground">${totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendiente</p>
              <p className="text-2xl font-bold text-foreground">${totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente o mascota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant={statusFilter === null ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(null)}>
            Todas
          </Button>

          {["ISSUED", "PAID", "VOID", "DRAFT"].map((key) => {
            const cfg = statusConfig[key] || { label: key, icon: Clock, color: "bg-slate-100 text-slate-700" };
            return (
              <Button key={key} variant={statusFilter === key ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(key)}>
                {cfg.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.map((invoice) => {
          const status = statusConfig[invoice.status] || statusConfig.ISSUED;
          const StatusIcon = status.icon;

          const paymentMethod = invoice.lastPaymentMethod
            ? paymentMethodConfig[invoice.lastPaymentMethod]
            : null;

          const date = invoice.issueDate ? new Date(invoice.issueDate) : null;

          return (
            <div
              key={invoice.id}
              className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-primary" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{invoice.number}</h3>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1", status.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {invoice.client.fullName} • {invoice.pet?.name ?? "Sin mascota"}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      {date
                        ? date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
                        : "—"}
                      {paymentMethod && (
                        <>
                          {" • "}
                          <span className="inline-flex items-center gap-1">
                            <paymentMethod.icon className="w-3 h-3" />
                            {paymentMethod.label}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">${toMoney(invoice.total).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.itemsCount} {invoice.itemsCount === 1 ? "concepto" : "conceptos"}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2" asChild>
                        <Link href={`/invoices/${invoice.id}`}>
                          <Eye className="w-4 h-4" /> Ver detalle
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem className="gap-2" asChild>
                        <Link href={`/invoices/${invoice.id}/ticket`}>
                          <Receipt className="w-4 h-4" /> Imprimir ticket
                        </Link>
                      </DropdownMenuItem>

                      {/* <DropdownMenuItem className="gap-2" onClick={() => handleDownloadPdf(invoice.id)}>
                        <Download className="w-4 h-4" /> Descargar PDF
                      </DropdownMenuItem> */}

                      {/* <DropdownMenuItem className="gap-2" asChild>
                        <Link href={`/invoices/${invoice.id}/print`} download={`invoice-${invoice.number}.pdf`}>
                          <Download className="w-4 h-4" /> Descargar PDF
                        </Link>
                      </DropdownMenuItem> */}

                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => handleDownloadPdf(invoice.id, invoice.number)}
                      >
                        <Download className="w-4 h-4" /> Descargar PDF
                      </DropdownMenuItem>

                      {invoice.status !== "VOID" && (
                        <DropdownMenuItem className="gap-2 text-rose-600" onClick={() => handleVoid(invoice.id)}>
                          <Ban className="w-4 h-4" /> Anular factura
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          );
        })}

        {filteredInvoices.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">No hay facturas con ese filtro</div>
        )}
      </div>
    </div>
  );
}
