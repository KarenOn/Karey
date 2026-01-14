// import { z } from "zod";

// const emptyToUndefined = (v: unknown) => {
//   if (typeof v !== "string") return v;
//   const t = v.trim();
//   return t.length === 0 ? undefined : t;
// };

// // Soporta nombres viejos (client_id, birth_date, weight, etc.) y valores en español.
// const normalizePetBody = (val: unknown) => {
//   if (!val || typeof val !== "object") return val;
//   const obj = val as Record<string, unknown>;

//   // keys viejas
//   if (obj.clientId == null && obj.client_id != null) obj.clientId = obj.client_id;
//   if (obj.birthDate == null && obj.birth_date != null) obj.birthDate = obj.birth_date;
//   if (obj.weightKg == null && obj.weight != null) obj.weightKg = obj.weight;

//   // name trim
//   if (typeof obj.name === "string") obj.name = obj.name.trim();

//   // especie español -> enum
//   const speciesMap: Record<string, string> = {
//     Perro: "DOG",
//     Gato: "CAT",
//     Ave: "BIRD",
//     Conejo: "RABBIT",
//     Otro: "OTHER",
//   };
//   if (typeof obj.species === "string" && speciesMap[obj.species]) {
//     obj.species = speciesMap[obj.species];
//   }

//   // sexo español -> enum
//   const sexMap: Record<string, string> = {
//     Macho: "MALE",
//     Hembra: "FEMALE",
//   };
//   if (typeof obj.sex === "string" && sexMap[obj.sex]) {
//     obj.sex = sexMap[obj.sex];
//   }

//   return obj;
// };

// export const PetCreateSchema = z.preprocess(
//   normalizePetBody,
//   z.object({
//     name: z.string().trim().min(2, "Nombre requerido").max(80),

//     clientId: z.coerce.number().int().positive("Propietario inválido"),

//     species: z.enum(["DOG", "CAT", "BIRD", "RABBIT", "OTHER"], {
//       message: "Especie inválida",
//     }),

//     sex: z.enum(["MALE", "FEMALE", "UNKNOWN"]).default("UNKNOWN"),

//     breed: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
//     color: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),

//     birthDate: z.preprocess(
//       emptyToUndefined,
//       z.coerce.date().optional()
//     ),

//     microchip: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),

//     weightKg: z.preprocess(
//       emptyToUndefined,
//       z.coerce.number().positive("Peso inválido").optional()
//     ),

//     notes: z.preprocess(emptyToUndefined, z.string().trim().max(5000).optional()),
//   })
// );

// export type PetCreateInput = z.infer<typeof PetCreateSchema>;

// export const PetUpdateSchema = PetCreateSchema.refine(
//   (d) => Object.keys(d).length > 0,
//   { message: "Debes enviar al menos un campo para actualizar." }
// );

// export type PetUpdateInput = z.infer<typeof PetUpdateSchema>;

// export const IdParamSchema = z.object({
//   id: z.coerce.number().int().positive(),
// });

import { z } from "zod";

export const PetSpeciesSchema = z.enum(["DOG", "CAT", "BIRD", "RABBIT", "OTHER"]);
export const PetSexSchema = z.enum(["MALE", "FEMALE", "UNKNOWN"]);

export const PetCreateSchema = z.object({
  // clinicId: z.coerce.number().int().positive(),
  clientId: z.coerce.number().int().positive(),

  name: z.string().trim().min(2, "Nombre requerido"),
  species: PetSpeciesSchema,
  breed: z.string().trim().max(120).optional().or(z.literal("")),
  sex: PetSexSchema.optional().default("UNKNOWN"),

  color: z.string().trim().max(80).optional().or(z.literal("")),
  birthDate: z.coerce.date().optional(),
  microchip: z.string().trim().max(80).optional().or(z.literal("")),
  weightKg: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const PetUpdateSchema = PetCreateSchema
  // .omit({ clinicId: true })
  .partial()
  .refine(
    (d) => Object.values(d).some((v) => v !== undefined),
    { message: "Debes enviar al menos un campo para actualizar." }
);

export type PetUpsertInput = z.infer<typeof PetCreateSchema>;
export type PetUpdateInput = z.infer<typeof PetUpdateSchema>;
