import type { PetUpsertInput, PetUpdateInput } from "@/lib/validators/pet";

export class PetApiError extends Error {}

export type PetRow = {
  id: number;
  name: string;
  species: "DOG" | "CAT" | "BIRD" | "RABBIT" | "OTHER";
  sex: "MALE" | "FEMALE" | "UNKNOWN";
  breed: string | null;
  color: string | null;
  birthDate: string | null;
  microchip: string | null;
  weightKg: number | null;
  notes: string | null;
  clientId: number;
  createdAt: string;
  updatedAt: string;
};

async function parseError(res: Response, fallback: string): Promise<never> {
  const payload = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  throw new PetApiError(payload?.error ?? payload?.message ?? fallback);
}

export async function apiListPets(): Promise<PetRow[]> {
  const res = await fetch("/api/pets", { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando mascotas");
  return res.json();
}

export async function apiCreatePet(data: PetUpsertInput): Promise<PetRow> {
  const res = await fetch("/api/pets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) await parseError(res, "No se pudo crear el paciente.");
  return res.json();
}

export async function apiUpdatePet(id: number, data: PetUpdateInput): Promise<PetRow> {
  const res = await fetch(`/api/pets/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) await parseError(res, "No se pudo actualizar el paciente.");
  return res.json();
}

export async function apiDeletePet(id: number): Promise<void> {
  const res = await fetch(`/api/pets/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) await parseError(res, "No se pudo eliminar el paciente.");
}
