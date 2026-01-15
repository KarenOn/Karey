// import { z } from "zod";
// import { AppointmentType, PetSpecies, TodayTurnStatus } from "@/generated/prisma/client";

// export const TodayTurnCreateSchema = z.object({
//   clientId: z.number().int().positive().optional(),
//   petId: z.number().int().positive().optional(),

//   petName: z.string().trim().min(1, "Nombre de mascota requerido"),
//   species: z.nativeEnum(PetSpecies).default(PetSpecies.DOG),

//   ownerName: z.string().trim().min(1, "Nombre del dueño requerido"),
//   ownerPhone: z.string().trim().min(5, "Teléfono requerido"),

//   type: z.nativeEnum(AppointmentType).default(AppointmentType.GROOMING),
//   serviceName: z.string().trim().min(1, "Nombre del servicio requerido"),
//   notes: z.string().trim().optional().or(z.literal("")),

//   estimatedDurationMins: z.number().int().min(5).max(8 * 60).default(60),
// });

// export const TodayTurnUpdateSchema = TodayTurnCreateSchema.partial().refine(
//   (d) => Object.keys(d).length > 0,
//   { message: "Debes enviar al menos un campo para actualizar." }
// );

// export const TodayTurnStatusSchema = z.object({
//   status: z.nativeEnum(TodayTurnStatus),
// });

// export type TodayTurnCreateInput = z.infer<typeof TodayTurnCreateSchema>;
// export type TodayTurnUpdateInput = z.infer<typeof TodayTurnUpdateSchema>;

import { z } from "zod";
import { PetSpecies } from "@/generated/prisma/client";

// Ajusta a como tengas estos enums en tu proyecto
export const TodayTurnServiceSchema = z.enum([
  "GROOMING",
  "BATH",
  "SURGERY",
  "HOSPITALIZATION",
  "OTHER",
]);

export const TodayTurnStatusSchema = z.enum([
  "WAITING",
  "IN_PROGRESS",
  "READY",
  "DELIVERED",
  "CANCELLED",
]);

const optionalTrimmedString = z
  .preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string())
  .optional();

const optionalNullableTrimmedString = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim();
  return v;
}, z.string().nullable()).optional();

export const TodayTurnCreateSchema = z
  .object({
    // EXISTING
    petId: z.coerce.number().int().positive().optional(),
    clientId: z.coerce.number().int().positive().optional(),

    // WALK-IN
    petName: optionalTrimmedString.optional(),
    ownerName: optionalTrimmedString,
    ownerPhone: optionalNullableTrimmedString,
    species: z.nativeEnum(PetSpecies).optional(),

    // COMMON
    service: TodayTurnServiceSchema,
    serviceName: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().min(1, "serviceName es requerido")
    ),
    notes: optionalNullableTrimmedString,
    estimatedDuration: z.coerce.number().int().min(5).max(24 * 60),
  })
  .superRefine((d, ctx) => {
    const isExisting = !!d.petId || !!d.clientId;

    // Si viene petId/clientId => EXISTING (requiere ambos)
    if (isExisting) {
      if (!d.petId) {
        ctx.addIssue({ code: "custom", path: ["petId"], message: "petId es requerido para turno existente" });
      }
      if (!d.clientId) {
        ctx.addIssue({ code: "custom", path: ["clientId"], message: "clientId es requerido para turno existente" });
      }
      return;
    }

    // Si NO viene petId/clientId => WALK-IN (requiere petName/ownerName/species)
    if (!d.petName) {
      ctx.addIssue({ code: "custom", path: ["petName"], message: "petName es requerido para walk-in" });
    }
    if (!d.ownerName) {
      ctx.addIssue({ code: "custom", path: ["ownerName"], message: "ownerName es requerido para walk-in" });
    }
    if (!d.species) {
      ctx.addIssue({ code: "custom", path: ["species"], message: "species es requerido para walk-in" });
    }
  });

export type TodayTurnCreateInput = z.infer<typeof TodayTurnCreateSchema>;

// Update: parcial, pero debe traer algo
export const TodayTurnUpdateSchema = TodayTurnCreateSchema.superRefine((d, ctx) => {
  if (Object.keys(d).length === 0) {
    ctx.addIssue({ code: "custom", path: [], message: "Debes enviar al menos un campo para actualizar." });
  }
});

export type TodayTurnUpdateInput = z.infer<typeof TodayTurnUpdateSchema>;
