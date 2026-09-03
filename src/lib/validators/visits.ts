import { z } from "zod";
import { emptyStringToUndefined } from "@/lib/validators/common";

export const ClinicalVisitCreateSchema = z.object({
  visitAt: z.coerce.date().optional(),
  weightKg: z.preprocess(emptyStringToUndefined, z.coerce.number().nonnegative().optional()),
  temperatureC: z.preprocess(emptyStringToUndefined, z.coerce.number().min(20).max(45).optional()),
  diagnosis: z.preprocess(emptyStringToUndefined, z.string().trim().max(2000).optional()),
  treatment: z.preprocess(emptyStringToUndefined, z.string().trim().max(2000).optional()),
  notes: z.preprocess(emptyStringToUndefined, z.string().trim().max(4000).optional()),
  vetId: z.string().trim().min(1, "Selecciona el veterinario que atendio"),
});

export type ClinicalVisitCreateInput = z.infer<typeof ClinicalVisitCreateSchema>;