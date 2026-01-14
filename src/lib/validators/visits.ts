import { z } from "zod";

export const ClinicalVisitCreateSchema = z.object({
  // viene de la URL (/api/pets/:id/visits) => petId
  visitAt: z.coerce.date().optional(), // si no mandas, Prisma pone now() por default
  weightKg: z.coerce.number().nonnegative().optional(),
  temperatureC: z.coerce.number().min(20).max(45).optional(),

  diagnosis: z.string().trim().max(2000).optional().or(z.literal("")),
  treatment: z.string().trim().max(2000).optional().or(z.literal("")),

  // en tu schema existe "notes"
  notes: z.string().trim().max(4000).optional().or(z.literal("")),

  // opcional, si luego seleccionas el vet
  vetId: z.string().trim().min(1).optional().or(z.literal("")),
});

export type ClinicalVisitCreateInput = z.infer<typeof ClinicalVisitCreateSchema>;
