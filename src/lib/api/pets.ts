import type { PetUpsertInput, PetUpdateInput } from "@/lib/validators/pet";

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

export async function apiListPets(): Promise<PetRow[]> {
  const res = await fetch("/api/pets", { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando mascotas");
  return res.json();
}

export async function apiCreatePet(data: PetUpsertInput): Promise<PetRow> {
  const res = await fetch("/api/pets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error creando mascota");
  return res.json();
}

export async function apiUpdatePet(id: number, data: PetUpdateInput): Promise<PetRow> {
  const res = await fetch(`/api/pets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error actualizando mascota");
  return res.json();
}

export async function apiDeletePet(id: number): Promise<void> {
  const res = await fetch(`/api/pets/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Error eliminando mascota");
}
