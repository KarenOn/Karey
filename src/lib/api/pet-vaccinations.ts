import type { VaccinationCreateInput } from "@/lib/validators/vaccination-record";

export type PetVaccinationRow = {
  id: number;
  vaccineName: string;
  appliedAt: string;
  nextDueAt: string | null;
  batchNumber: string | null;
  manufacturer: string | null;
  veterinarian: string | null;
};

export async function apiListPetVaccinations(petId: number): Promise<PetVaccinationRow[]> {
  const res = await fetch(`/api/pets/${petId}/vaccinations`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando vacunas");
  return res.json();
}

export async function apiCreatePetVaccination(petId: number, data: VaccinationCreateInput): Promise<PetVaccinationRow> {
  const res = await fetch(`/api/pets/${petId}/vaccinations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error creando vacuna");
  return res.json();
}
