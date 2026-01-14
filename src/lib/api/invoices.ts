import type { InvoiceCreateInput, InvoiceUpdateInput } from "@/lib/validators/invoice";
import type { PaymentCreateInput } from "@/lib/validators/payment";

export type InvoiceListRow = {
  id: number;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  total: string;
  subtotal: string;
  tax: string;
  discount: string;
  client: { id: number; fullName: string };
  pet: { id: number; name: string } | null;
  itemsCount: number;
  paymentsCount: number;
  lastPaymentMethod: string | null;
};

export type InvoiceDetail = {
  id: number;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  notes: string | null;

  client: { id: number; fullName: string; phone: string | null; email: string | null; address: string | null };
  pet: { id: number; name: string; species: string; breed: string | null } | null;

  items: Array<{
    id: number;
    type: string;
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    lineTotal: string;
  }>;

  payments: Array<{
    id: number;
    amount: string;
    method: string;
    reference: string | null;
    paidAt: string;
  }>;
};

export async function apiListInvoices(params?: { q?: string; status?: string; take?: number }): Promise<InvoiceListRow[]> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.status) sp.set("status", params.status);
  if (params?.take) sp.set("take", String(params.take));

  const res = await fetch(`/api/invoices?${sp.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error listando facturas");
  return res.json();
}

export async function apiGetInvoice(id: number): Promise<InvoiceDetail> {
  const res = await fetch(`/api/invoices/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando factura");
  return res.json();
}

export async function apiCreateInvoice(data: InvoiceCreateInput) {
  const res = await fetch("/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error creando factura");
  return res.json();
}

export async function apiUpdateInvoice(id: number, data: InvoiceUpdateInput) {
  const res = await fetch(`/api/invoices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error actualizando factura");
  return res.json();
}

export async function apiUpdateInvoiceStatus(id: number, status: string) {
  const res = await fetch(`/api/invoices/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Error cambiando estado de factura");
  return res.json();
}

export async function apiCreatePayment(invoiceId: number, data: PaymentCreateInput) {
  const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error registrando pago");
  return res.json();
}
