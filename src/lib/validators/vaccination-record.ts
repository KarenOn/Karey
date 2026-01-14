import { z } from "zod";

const emptyToUndefined = (v: unknown) => {
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t.length === 0 ? undefined : t;
};

const normalizeVaccinationBody = (val: unknown) => {
  if (!val || typeof val !== "object") return val;
  const obj = val as Record<string, unknown>;

  // legacy keys
  if (obj.vaccineName == null && obj.vaccine_name != null) obj.vaccineName = obj.vaccine_name;
  if (obj.appliedAt == null && obj.application_date != null) obj.appliedAt = obj.application_date;
  if (obj.nextDueAt == null && obj.next_dose_date != null) obj.nextDueAt = obj.next_dose_date;
  if (obj.batchNumber == null && obj.batch_number != null) obj.batchNumber = obj.batch_number;

  return obj;
};

export const VaccinationCreateSchema = z.preprocess(
  normalizeVaccinationBody,
  z.object({
    vaccineName: z.string().trim().min(2, "Nombre de vacuna requerido").max(120),
    appliedAt: z.coerce.date({ message: "Fecha de aplicación inválida" }),

    nextDueAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    batchNumber: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
    manufacturer: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
    veterinarian: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  })
);

export type VaccinationCreateInput = z.infer<typeof VaccinationCreateSchema>;
