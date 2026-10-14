export type CashMovement = {
  id: number;
  type: "CASH_IN" | "CASH_OUT";
  amount: string;
  concept: string;
  note: string | null;
  createdAt: string;
  createdBy: { name: string };
};

export type CashSession = {
  id: number;
  openedAt: string;
  closedAt: string | null;
  openingFloat: string;
  openingAmount: string;
  status: "OPEN" | "CLOSED";
  register: { id: number; name: string };
  expectedCash: string | null;
  countedCash: string | null;
  difference: string | null;
  closingNotes: string | null;
  totalCollected: string;
  cashPayments: string;
  cardPayments: string;
  transferPayments: string;
  otherPayments: string;
  cashIn: string;
  cashOut: string;
  openedBy: { id: string; name: string };
  closedBy: { id: string; name: string } | null;
  movements: CashMovement[];
  payments: Array<{
    id: number;
    amount: string;
    method: string;
    paidAt: string;
    invoiceId: number;
    invoiceNumber: string;
    clientName: string | null;
    petName: string | null;
    context: string;
    createdBy: { name: string } | null;
  }>;
  operations: Array<{
    id: string;
    kind: "PAYMENT" | "MOVEMENT";
    paidAt: string;
    amount: string | null;
    method: string;
    invoiceId: number | null;
    invoiceNumber: string | null;
    clientName: string | null;
    petName: string | null;
    context: string;
    responsible: string | null;
    movementType?: "CASH_IN" | "CASH_OUT";
    concept?: string;
    note?: string | null;
  }>;
};

function readError(payload: unknown, fallback: string) {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : fallback;
}

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(readError(payload, "No se pudo completar la operación de caja."));
  return payload;
}

export async function apiGetCashSessions() {
  return request("/api/cash-sessions") as Promise<{ openSession: CashSession | null; openSessions: CashSession[]; history: CashSession[] }>;
}

export async function apiOpenCashSession(openingFloat: number, registerId?: number) {
  return request("/api/cash-sessions", { method: "POST", body: JSON.stringify({ openingFloat, registerId }) });
}

export async function apiGetCashRegisters() {
  return request("/api/cash-registers") as Promise<Array<{ id: number; name: string; isActive: boolean; sessions: Array<{ id: number }> }>>;
}

export async function apiCreateCashMovement(sessionId: number, data: { type: "CASH_IN" | "CASH_OUT"; amount: number; concept: string; note: string | null }) {
  return request(`/api/cash-sessions/${sessionId}/movements`, { method: "POST", body: JSON.stringify(data) });
}

export async function apiCloseCashSession(sessionId: number, countedCash: number, closingNotes: string | null) {
  return request(`/api/cash-sessions/${sessionId}/close`, { method: "POST", body: JSON.stringify({ countedCash, closingNotes }) });
}
