import { z } from "zod";

export const PetSpeciesSchema = z.enum(["DOG", "CAT", "BIRD", "RABBIT", "OTHER"]);
export const PetSexSchema = z.enum(["MALE", "FEMALE", "UNKNOWN"]);

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalTrimmedString = (max: number) =>
  z.preprocess(emptyStringToUndefined, z.string().trim().max(max).optional());

const optionalDate = z.preprocess(emptyStringToUndefined, z.coerce.date().optional());
const optionalNumber = z.preprocess(
  emptyStringToUndefined,
  z.coerce.number().nonnegative().optional()
);

export const PetCreateSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2, "Nombre requerido"),
  species: PetSpeciesSchema,
  breed: optionalTrimmedString(120),
  sex: z.preprocess(emptyStringToUndefined, PetSexSchema.optional().default("UNKNOWN")),
  color: optionalTrimmedString(80),
  birthDate: optionalDate,
  microchip: optionalTrimmedString(80),
  weightKg: optionalNumber,
  notes: optionalTrimmedString(2000),
});

export const PetUpdateSchema = PetCreateSchema.partial().refine(
  (data) => Object.values(data).some((value) => value !== undefined),
  { message: "Debes enviar al menos un campo para actualizar." }
);

export type PetUpsertInput = z.infer<typeof PetCreateSchema>;
export type PetUpdateInput = z.infer<typeof PetUpdateSchema>;

export function zodFieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
