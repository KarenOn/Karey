import type { StockMovementType } from "@/types/common";
import type { StockMovementCreateInput } from "@/lib/validators/stock-movement";

export type StockMovementRow = {
  id: number;
  clinicId: number;
  productId: number;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdById: string | null;
  createdAt: string;
  product: {
    id: number;
    name: string;
    sku: string | null;
    category: string | null;
    unit: string | null;
    trackStock: boolean;
  };
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

function errorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error
  ) {
    return payload.error;
  }

  return fallback;
}

export async function apiListStockMovements(params?: {
  q?: string;
  type?: string;
  productId?: number;
  take?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.type) sp.set("type", params.type);
  if (params?.productId) sp.set("productId", String(params.productId));
  if (params?.take) sp.set("take", String(params.take));

  const res = await fetch(
    `/api/stock-movements${sp.toString() ? `?${sp.toString()}` : ""}`,
    { cache: "no-store" }
  );
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(errorMessage(payload, "Error listando movimientos"));
  return payload as StockMovementRow[];
}

export async function apiCreateStockMovement(data: StockMovementCreateInput) {
  const res = await fetch("/api/stock-movements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(errorMessage(payload, "Error registrando movimiento"));
  return payload as {
    movement: StockMovementRow;
    product: { id: number; stockOnHand: number };
  };
}
