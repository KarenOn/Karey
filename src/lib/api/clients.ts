import type { ClientFormValues } from "@/lib/validators/client";

export type ClientRow = {
  id: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  address?: string | null;
  notes?: string | null;
  petsCount?: number;
};

export async function apiListClients(): Promise<ClientRow[]> {
  const res = await fetch("/api/clients", { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando clientes");
  return res.json();
}

export async function apiCreateClient(data: ClientFormValues): Promise<ClientRow> {
  const res = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error ?? "No se pudo crear el cliente.");
  }

  return payload;
}
