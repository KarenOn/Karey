import assert from "node:assert/strict";
import test from "node:test";
import { calculateFEFOAllocations } from "../src/lib/server/inventory-batches";
import { calculateInvoiceStats } from "../src/lib/invoices/stats";
import { calculateExpectedCash } from "../src/lib/server/cash";

test("FEFO prioriza vencimiento más próximo y conserva sobrante legacy", () => {
  const allocations = calculateFEFOAllocations([
    { id: 2, quantity: 4, expirationDate: new Date("2027-04-01"), createdAt: new Date("2026-01-01") },
    { id: 1, quantity: 2, expirationDate: new Date("2026-11-15"), createdAt: new Date("2026-02-01") },
  ], 7);

  assert.deepEqual(allocations, [
    { batchId: 1, quantity: 2 },
    { batchId: 2, quantity: 4 },
    { batchId: null, quantity: 1 },
  ]);
});

test("FEFO coloca lotes sin vencimiento después de lotes fechados", () => {
  const allocations = calculateFEFOAllocations([
    { id: 9, quantity: 5, expirationDate: null, createdAt: new Date("2026-01-01") },
    { id: 8, quantity: 5, expirationDate: new Date("2028-01-01"), createdAt: new Date("2026-01-01") },
  ], 6);

  assert.deepEqual(allocations, [
    { batchId: 8, quantity: 5 },
    { batchId: 9, quantity: 1 },
  ]);
});

test("estadísticas suman pagos parciales y nunca producen NaN", () => {
  assert.deepEqual(calculateInvoiceStats([
    { status: "PAID", total: "100.00", paidTotal: "60.00" },
    { status: "PARTIALLY_PAID", total: "80.00", paidTotal: "30.00" },
    { status: "ISSUED", total: "50.00", paidTotal: "0.00" },
    { status: "VOID", total: "200.00", paidTotal: "200.00" },
  ]), { totalPaid: 90, totalPending: 100 });
});

test("caja calcula efectivo esperado sin incluir pagos no monetarios", () => {
  assert.equal(calculateExpectedCash(100, 250, 20, 30), 340);
});
