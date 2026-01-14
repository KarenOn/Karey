import { Prisma } from "@/generated/prisma/client";

export function calcInvoiceTotals(items: Array<{ quantity: number; unitPrice: number; taxRate: number }>, discount: number) {
  const subtotalNum = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
  const taxNum = items.reduce((acc, it) => {
    const line = it.quantity * it.unitPrice;
    return acc + (line * (it.taxRate || 0)) / 100;
  }, 0);

  const totalNum = Math.max(0, subtotalNum + taxNum - (discount || 0));

  return {
    subtotal: new Prisma.Decimal(subtotalNum.toFixed(2)),
    tax: new Prisma.Decimal(taxNum.toFixed(2)),
    discount: new Prisma.Decimal((discount || 0).toFixed(2)),
    total: new Prisma.Decimal(totalNum.toFixed(2)),
  };
}
