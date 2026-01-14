export type VaccinationRow = {
  id: number;
  appliedAt: string;
  nextDueAt: string | null;
  batchNumber: string | null;
  pet: { id: number; name: string; species: string } | null;
  vaccine: { id: number; name: string } | null;
};

export async function apiListVaccinations(): Promise<VaccinationRow[]> {
  const res = await fetch("/api/vaccinations", { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando vacunaciones");
  return res.json();
}
