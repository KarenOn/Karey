import { z } from "zod";

export const VaccinationRecordCreateSchema = z.object({
  vaccineId: z.coerce.number().int().positive(),
  appliedAt: z.coerce.date().optional(),
  nextDueAt: z.coerce.date().optional(),

  batchNumber: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type VaccinationRecordCreateInput = z.infer<typeof VaccinationRecordCreateSchema>;
