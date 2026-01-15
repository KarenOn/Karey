import type { ServiceCreateInput, ServiceUpdateInput } from "@/lib/validators/service";

export type ServiceRow = {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  price: string;          // viene como string desde Prisma Decimal
  durationMins: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function apiListServices(params?: { q?: string; category?: string; active?: "true" | "false"; take?: number }) {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.category) sp.set("category", params.category);
  if (params?.active) sp.set("active", params.active);
  if (params?.take) sp.set("take", String(params.take));

  const res = await fetch(`/api/services?${sp.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando servicios");
  return (await res.json()) as ServiceRow[];
}

export async function apiCreateService(data: ServiceCreateInput) {
  const res = await fetch("/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error ?? "Error creando servicio");
  }
  return (await res.json()) as ServiceRow;
}

export async function apiUpdateService(id: number, data: ServiceUpdateInput) {
  const res = await fetch(`/api/services/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error ?? "Error actualizando servicio");
  }
  return (await res.json()) as ServiceRow;
}

export async function apiDeleteService(id: number) {
  const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error ?? "Error eliminando servicio");
  }
  return res.json();
}

export async function apiSetServiceStatus(id: number, isActive: boolean) {
  const res = await fetch(`/api/services/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error ?? "Error cambiando estado");
  }
  return res.json();
}
