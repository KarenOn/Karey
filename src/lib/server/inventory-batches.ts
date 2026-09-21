import { Prisma } from "@/generated/prisma/client";

export class InventoryStockError extends Error {}

export function calculateFEFOAllocations(
  batches: Array<{ id: number; quantity: number; expirationDate: Date | null; createdAt: Date }>,
  quantity: number,
) {
  const ordered = [...batches].sort((a, b) => {
    if (a.expirationDate && b.expirationDate) return a.expirationDate.getTime() - b.expirationDate.getTime() || a.createdAt.getTime() - b.createdAt.getTime();
    if (a.expirationDate) return -1;
    if (b.expirationDate) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  let remaining = quantity;
  const allocations: Array<{ batchId: number | null; quantity: number }> = [];
  for (const batch of ordered) {
    if (!remaining) break;
    const take = Math.min(remaining, batch.quantity);
    if (take > 0) allocations.push({ batchId: batch.id, quantity: take });
    remaining -= take;
  }
  if (remaining) allocations.push({ batchId: null, quantity: remaining });
  return allocations;
}

export async function consumeProductStockFEFO(
  tx: Prisma.TransactionClient,
  input: { clinicId: number; productId: number; quantity: number },
) {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new InventoryStockError("La cantidad debe ser un número entero positivo.");
  }

  const product = await tx.product.findFirst({
    where: { id: input.productId, clinicId: input.clinicId, trackStock: true },
    select: { id: true, stockOnHand: true },
  });
  if (!product) throw new InventoryStockError("Producto no encontrado o sin control de stock.");

  const batches = await tx.productBatch.findMany({
    where: { productId: product.id, quantity: { gt: 0 } },
    orderBy: [{ expirationDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    select: { id: true, quantity: true, expirationDate: true, createdAt: true },
  });
  const allocations = calculateFEFOAllocations(batches, input.quantity);
  for (const allocation of allocations) {
    if (!allocation.batchId) continue;
    const updated = await tx.productBatch.updateMany({
      where: { id: allocation.batchId, quantity: { gte: allocation.quantity } },
      data: { quantity: { decrement: allocation.quantity } },
    });
    if (!updated.count) throw new InventoryStockError("El lote cambió mientras se registraba la salida. Intenta nuevamente.");
  }
  const productUpdate = await tx.product.updateMany({
    where: { id: product.id, stockOnHand: { gte: input.quantity } },
    data: { stockOnHand: { decrement: input.quantity } },
  });
  if (!productUpdate.count) throw new InventoryStockError("No hay stock suficiente para realizar la salida.");
  return allocations;
}
