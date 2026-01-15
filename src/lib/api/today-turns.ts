import type { TodayTurn } from "@/generated/prisma/client";
import type { TodayTurnCreateInput, TodayTurnUpdateInput } from "@/lib/validators/today-turns";
import { TodayTurnStatus } from "@/generated/prisma/client";

export async function apiListTodayTurns(date?: string): Promise<TodayTurn[]> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await fetch(`/api/today-turns${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error listando turnos");
  return res.json();
}

export async function apiCreateTodayTurn(data: TodayTurnCreateInput): Promise<TodayTurn> {
  const res = await fetch(`/api/today-turns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error creando turno");
  return res.json();
}

export async function apiUpdateTodayTurn(id: number, data: TodayTurnUpdateInput): Promise<TodayTurn> {
  const res = await fetch(`/api/today-turns/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error actualizando turno");
  return res.json();
}

export async function apiDeleteTodayTurn(id: number): Promise<void> {
  const res = await fetch(`/api/today-turns/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error eliminando turno");
}

export async function apiUpdateTodayTurnStatus(id: number, status: TodayTurnStatus): Promise<TodayTurn> {
  const res = await fetch(`/api/today-turns/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Error cambiando estado");
  return res.json();
}

export async function apiNotifyTodayTurn(id: number): Promise<TodayTurn> {
  const res = await fetch(`/api/today-turns/${id}/notify`, { method: "POST" });
  if (!res.ok) throw new Error("Error notificando");
  return res.json();
}
