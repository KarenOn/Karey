"use client";

import React from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, ChevronRight, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";

import type { DashboardInvoiceDTO, DashboardClientDTO, InvoiceStatus } from "@/types/common";

const statusConfig: Record<InvoiceStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  DRAFT: { label: "Borrador", icon: Clock, color: "text-slate-600", bg: "bg-slate-100" },
  ISSUED: { label: "Emitida", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
  PAID: { label: "Pagada", icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  PARTIALLY_PAID: { label: "Pago parcial", icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-100" },
  VOID: { label: "Anulada", icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
};

type Props = {
  invoices: DashboardInvoiceDTO[];
  clients: DashboardClientDTO[];
};

export default function RecentInvoices({ invoices, clients }: Props) {
  const getClient = (id: number) => clients.find((c) => c.id === id);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="app-panel-strong overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/70 p-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-display text-2xl font-semibold text-foreground">Facturas Recientes</h3>
        </div>

        <Link href="/invoices" className="text-sm text-primary hover:text-primary/80 font-semibold flex items-center gap-1">
          Ver todas <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-border/60">
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <p>No hay facturas recientes</p>
          </div>
        ) : (
          invoices.slice(0, 4).map((invoice, index) => {
            const client = getClient(invoice.client_id);
            const cfg = statusConfig[invoice.status] ?? statusConfig.ISSUED;
            const StatusIcon = cfg.icon;

            return (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * index }} className="cursor-pointer p-4 transition-colors hover:bg-secondary/55">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-3xl ${cfg.bg}`} title={cfg.label}>
                      <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{invoice.number}</p>
                      <p className="truncate text-sm text-muted-foreground">{invoice.client_name || client?.name || "Cliente"}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">${Number(invoice.total ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(invoice.date), "d MMM", { locale: es })}</p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
