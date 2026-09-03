import { z } from "zod";
import { emptyStringToUndefined } from "@/lib/validators/common";

export const VaccinationRecordCreateSchema = z
  .object({
    vaccineId: z.coerce.number().int().positive().optional(),
    vaccineName: z.string().trim().min(2, "Ingresa el nombre de la vacuna.").max(120),
    appliedAt: z.coerce.date().optional(),
    nextDueAt: z.coerce.date().optional(),
    batchNumber: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().max(120).optional()
    ),
    notes: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().max(2000).optional()
    ),
  })
  .superRefine((data, ctx) => {
    if (data.nextDueAt && data.appliedAt && data.nextDueAt < data.appliedAt) {
      ctx.addIssue({
        code: "custom",
        message: "La próxima dosis no puede ser anterior a la fecha de aplicación.",
        path: ["nextDueAt"],
      });
    }
  });

export type VaccinationRecordCreateInput = z.infer<typeof VaccinationRecordCreateSchema>;
