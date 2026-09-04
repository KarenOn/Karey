"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SearchInput from "@/components/shared/SearchInput";
import { Plus, Receipt, Eye, MoreVertical, Download, CreditCard, Banknote, Building, Ban, ReceiptText, LayoutGrid, List } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiListInvoices, apiUpdateInvoiceStatus, type InvoiceListRow } from "@/lib/api/invoices";
import AppPageHero from "@/components/shared/AppPageHero";
import { useCurrentUserAccess } from "@/components/layout/current-user-context";
import { openInvoiceA4Print, openInvoiceReceiptPrint } from "@/lib/printing/browser-printer";
import { getManualReceiptPaper } from "@/lib/printing/settings";
import { usePrintSettings } from "@/lib/printing/usePrintSettings";
import DataTablePagination from "@/components/shared/DataTablePagination";
import DataTable, { type DataTableColumn } from "@/components/shared/Datatable";
import StatusBadge from "@/components/shared/StatusBadge";

const statusConfig: Record<string, { label: string; badge: "success" | "info" | "warning" | "destructive" | "neutral" }> = {
  PAID: { label: "Pagada", badge: "success" },
  PARTIALLY_PAID: { label: "Parcialmente pagada", badge: "info" },
  ISSUED: { label: "Pendiente", badge: "warning" },
  VOID: { label: "Anulada", badge: "destructive" },
  DRAFT: { label: "Borrador", badge: "neutral" },
};

const paymentMethodConfig: Record<string, { icon: typeof Banknote; label: string }> = {
  CASH: { icon: Banknote, label: "Efectivo" },
  CARD: { icon: CreditCard, label: "Tarjeta" },
  TRANSFER: { icon: Building, label: "Transferencia" },
};

function StatusSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Estado" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Todas</SelectItem>
        {Object.entries(statusConfig).map(([key, status]) => <SelectItem key={key} value={key}>{status.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

const toMoney = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function formatCurrency(
  amount: number,
  currency: string = 'DOP',
): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  // }).format(Math.abs(amount));
  }).format(amount);
}

export default function InvoicesPage() {
  const access = useCurrentUserAccess();
  const { settings: printSettings } = usePrintSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [view, setView] = useState<"cards" | "list">("cards");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const canCreateInvoices = !!access?.actions.invoices.create;
  const canUpdateInvoices = !!access?.actions.invoices.update;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiListInvoices({ take: 200 });
      setInvoices(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando facturas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, statusFilter]);

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

  const visibleInvoices = useMemo(
    () => filteredInvoices.slice(page * pageSize, (page + 1) * pageSize),
    [filteredInvoices, page, pageSize]
  );

  const totalPending = useMemo(
    () => invoices.filter((i) => i.status === "ISSUED").reduce((acc, i) => acc + toMoney(i.total), 0),
    [invoices]
  );

  const totalPaid = useMemo(
    () => invoices.filter((i) => i.status === "PAID").reduce((acc, i) => acc + toMoney(i.total), 0),
    [invoices]
  );

  const handleVoid = async (id: number) => {
    if (!canUpdateInvoices) return;
    await apiUpdateInvoiceStatus(id, "VOID");
    await load();
  };

  const handlePrintReceipt = (id: number) => {
    openInvoiceReceiptPrint({
      invoiceId: id,
      paper: getManualReceiptPaper(printSettings),
      autoPrint: true,
    });
  };

  const handlePrintInvoice = (id: number) => {
    openInvoiceA4Print({
      invoiceId: id,
      autoPrint: true,
    });
  };

  // const handleDownloadPdf = (id: number) => {
  //   window.open(`/invoices/${id}/print`, "_blank", "noopener,noreferrer"); // crea este endpoint cuando quieras
  // };

  const handleDownloadPdf = async (invoiceId: number) => {
    // const res = await fetch(`/api/invoices/${invoiceId}/pdf`);
    // if (!res.ok) throw new Error("No se pudo generar el PDF");

    // const blob = await res.blob();
    // const url = URL.createObjectURL(blob);

    // const a = document.createElement("a");
    // a.href = url;
    // a.download = `invoice-${invoiceNumber}.pdf`;
    // document.body.appendChild(a);
    // a.click();
    // a.remove();

    // URL.revokeObjectURL(url);
    window.open(`/api/invoices/${invoiceId}/pdf`, "_blank", "noopener,noreferrer");
  };

  const renderActions = (invoice: InvoiceListRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${invoice.number}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="gap-2" asChild><Link href={`/invoices/${invoice.id}`}><Eye className="h-4 w-4" /> Ver detalle</Link></DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onSelect={(event) => { event.preventDefault(); handlePrintReceipt(invoice.id); }}><Receipt className="h-4 w-4" /> Imprimir recibo</DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onSelect={(event) => { event.preventDefault(); handlePrintInvoice(invoice.id); }}><ReceiptText className="h-4 w-4" /> Imprimir factura</DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onSelect={(event) => { event.preventDefault(); void handleDownloadPdf(invoice.id); }}><Download className="h-4 w-4" /> Descargar PDF</DropdownMenuItem>
        {canUpdateInvoices && invoice.status !== "VOID" ? <DropdownMenuItem className="gap-2 text-rose-600" onSelect={() => void handleVoid(invoice.id)}><Ban className="h-4 w-4" /> Anular factura</DropdownMenuItem> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const invoiceColumns: DataTableColumn<InvoiceListRow>[] = [
    { header: "Factura", cell: (invoice) => <span className="font-semibold text-foreground">{invoice.number}</span> },
    { header: "Cliente / paciente", cell: (invoice) => <div><p className="font-medium text-foreground">{invoice.client.fullName}</p><p className="text-xs text-muted-foreground">{invoice.pet?.name ?? "Sin mascota"}</p></div> },
    { header: "Fecha", cell: (invoice) => <span className="text-sm text-muted-foreground">{new Date(invoice.issueDate).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" })}</span> },
    { header: "Estado", cell: (invoice) => { const status = statusConfig[invoice.status] || statusConfig.ISSUED; return <StatusBadge status={status.badge} label={status.label} />; } },
    { header: "Total", cell: (invoice) => <span className="font-semibold text-foreground">{formatCurrency(Number(invoice.total))}</span> },
    { header: "Pago", cell: (invoice) => { const payment = invoice.lastPaymentMethod ? paymentMethodConfig[invoice.lastPaymentMethod] : null; return payment ? <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><payment.icon className="h-4 w-4" />{payment.label}</span> : <span className="text-sm text-muted-foreground">-</span>; } },
    { header: "Acciones", cell: renderActions },
  ];


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
      {/* <div className="flex items-center justify-between">
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
      </div> */}

      <AppPageHero
        badgeIcon={<ReceiptText className="size-3.5" />}
        badgeLabel="Facturación"
        title="Gestión de facturas"
        description="Organiza y realiza un seguimiento de las facturas de tu clínica."
        actions={
          // <Button onClick={() => openCreateAt(selectedDay, timeSlots[0] ?? "09:00")}>
          //   <Plus className="mr-2 h-4 w-4" />
          //   Nueva Cita
          // </Button>
          canCreateInvoices ? (
            <Link href="/invoices/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Factura
              </Button>
            </Link>
          ) : null
        }
        stats={[
          { label: "Facturas", value: invoices.length, hint: "Total Facturas" },
          { label: "Cobrado", value: formatCurrency(totalPaid), hint: "Total Cobrado" },
          { label: "Pendiente", value: formatCurrency(totalPending), hint: "Total Pendiente" },
        ]}
      />

      {error ? <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div> : null}

      <Tabs value={view} onValueChange={(value) => setView(value as "cards" | "list")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="cards"><LayoutGrid className="h-4 w-4" />Cards</TabsTrigger>
            <TabsTrigger value="list"><List className="h-4 w-4" />Lista</TabsTrigger>
          </TabsList>
          {view === "cards" ? <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><SearchInput value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onClear={() => setSearchTerm("")} placeholder="Buscar por número, cliente o mascota..." className="sm:w-80" /><StatusSelect value={statusFilter ?? "ALL"} onChange={(value) => setStatusFilter(value === "ALL" ? null : value)} /></div> : null}
        </div>

        <TabsContent value="cards" className="mt-5 space-y-4">
          {visibleInvoices.map((invoice) => {
            const status = statusConfig[invoice.status] || statusConfig.ISSUED;
            const paymentMethod = invoice.lastPaymentMethod ? paymentMethodConfig[invoice.lastPaymentMethod] : null;
            const date = invoice.issueDate ? new Date(invoice.issueDate) : null;
            return (
            <div key={invoice.id} className="app-panel-strong p-4 transition-colors hover:bg-muted/30 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-xl font-semibold text-foreground">{invoice.number}</h3>
                      <StatusBadge status={status.badge} label={status.label} />
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {invoice.client.fullName} • {invoice.pet?.name ?? "Sin mascota"}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      {date ? date.toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" }) : "-"}
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
                    <p className="text-xl font-semibold text-foreground sm:text-2xl">{formatCurrency(Number(invoice.total))}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.itemsCount} {invoice.itemsCount === 1 ? "concepto" : "conceptos"}
                    </p>
                  </div>

                  {renderActions(invoice)}
                </div>
              </div>
            </div>
            );
          })}
          {filteredInvoices.length === 0 ? <div className="app-empty text-center text-sm">No hay facturas con ese filtro.</div> : null}
          {filteredInvoices.length > 0 ? <DataTablePagination page={page} pageSize={pageSize} total={filteredInvoices.length} onPageChange={setPage} pageSizeOptions={[10, 20, 50]} onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(0); }} /> : null}
        </TabsContent>

        <TabsContent value="list" className="mt-5">
          <DataTable<InvoiceListRow> title="Facturas" columns={invoiceColumns} data={filteredInvoices} searchValue={searchTerm} onSearchChange={setSearchTerm} searchKeys={["number"]} searchPredicate={(invoice, query) => !query || [invoice.number, invoice.client.fullName, invoice.pet?.name].filter(Boolean).some((value) => String(value).toLowerCase().includes(query))} searchPlaceholder="Buscar por número, cliente o mascota..." emptyMessage="No hay facturas con ese filtro." actions={<StatusSelect value={statusFilter ?? "ALL"} onChange={(value) => setStatusFilter(value === "ALL" ? null : value)} />} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
