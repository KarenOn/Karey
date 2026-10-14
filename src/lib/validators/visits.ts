import { z } from "zod";
import { emptyStringToUndefined } from "@/lib/validators/common";

export const ClinicalVisitCreateSchema = z.object({
  appointmentId: z.preprocess(emptyStringToUndefined, z.coerce.number().int().positive().optional()),
  todayTurnId: z.preprocess(emptyStringToUndefined, z.coerce.number().int().positive().optional()),
  visitAt: z.coerce.date().optional(),
  weightKg: z.preprocess(emptyStringToUndefined, z.coerce.number().nonnegative().optional()),
  temperatureC: z.preprocess(emptyStringToUndefined, z.coerce.number().min(20).max(45).optional()),
  heartRateBpm: z.preprocess(emptyStringToUndefined, z.coerce.number().int().positive().max(1000).optional()),
  respiratoryRatePpm: z.preprocess(emptyStringToUndefined, z.coerce.number().int().positive().max(300).optional()),
  diagnosis: z.preprocess(emptyStringToUndefined, z.string().trim().max(2000).optional()),
  treatment: z.preprocess(emptyStringToUndefined, z.string().trim().max(2000).optional()),
  anamnesis: z.preprocess(emptyStringToUndefined, z.string().trim().max(4000).optional()),
  carePlan: z.preprocess(emptyStringToUndefined, z.string().trim().max(4000).optional()),
  notes: z.preprocess(emptyStringToUndefined, z.string().trim().max(4000).optional()),
  nextReviewAt: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
  vetId: z.string().trim().min(1, "Selecciona el veterinario que atendio"),
  attachment: z.object({
    fileName: z.string().trim().min(1),
    displayName: z.string().trim().max(255).optional().or(z.literal("")),
    originalFilename: z.string().trim().max(255).optional().or(z.literal("")),
    fileType: z.string().trim().optional(),
    fileSizeBytes: z.coerce.number().int().nonnegative().optional(),
    storageRef: z.string().trim().optional(),
    url: z.string().trim().optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (Boolean(data.appointmentId) === Boolean(data.todayTurnId) && (data.appointmentId || data.todayTurnId)) {
    ctx.addIssue({ code: "custom", path: ["appointmentId"], message: "La visita debe tener un único origen de atención." });
  }
  if (data.nextReviewAt && data.visitAt && data.nextReviewAt < data.visitAt) {
    ctx.addIssue({ code: "custom", path: ["nextReviewAt"], message: "La próxima revisión no puede ser anterior a la visita." });
  }
});

export type ClinicalVisitCreateInput = z.infer<typeof ClinicalVisitCreateSchema>;
