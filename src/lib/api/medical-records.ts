import type { MedicalRecordCreateInput } from "@/lib/validators/visits";

export type MedicalRecordRow = {
  id: number;
  date: string;
  type: string;
  symptoms: string | null;
  diagnosis: string | null;
  treatment: string | null;
  weightAtVisit: number | null;
  temperature: number | null;
  veterinarian: string | null;
  nextVisit: string | null;
};

export async function apiListMedicalRecords(petId: number): Promise<MedicalRecordRow[]> {
  const res = await fetch(`/api/pets/${petId}/medical-records`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando historial clínico");
  return res.json();
}

export async function apiCreateMedicalRecord(petId: number, data: MedicalRecordCreateInput): Promise<MedicalRecordRow> {
  const res = await fetch(`/api/pets/${petId}/medical-records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error creando consulta médica");
  return res.json();
}
