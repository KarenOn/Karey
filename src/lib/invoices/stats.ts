type InvoiceStatsRow = {
  status: string;
  total: string | number;
  paidTotal: string | number;
};

function amount(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateInvoiceStats(invoices: InvoiceStatsRow[]) {
  return invoices.reduce(
    (stats, invoice) => {
      const total = amount(invoice.total);
      const paid = amount(invoice.paidTotal);
      if (invoice.status === "PAID" || invoice.status === "PARTIALLY_PAID") stats.totalPaid += paid;
      if (invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID") stats.totalPending += Math.max(0, total - paid);
      return stats;
    },
    { totalPaid: 0, totalPending: 0 },
  );
}
