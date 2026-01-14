import { z } from "zod";

export const APPOINTMENT_TYPES = [
  "CONSULTATION",
  "VACCINATION",
  "SURGERY",
  "AESTHETIC",
  "CHECKUP",
  "EMERGENCY",
  "GROOMING",
  "DEWORMING",
  "OTHER",
] as const;

export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "WAITING",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

// si tu enum AppointmentStatus ya existe pero con otros valores,
// ajusta este array a tus valores reales.

export const AppointmentTypeSchema = z.enum(APPOINTMENT_TYPES);
export const AppointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);

const DateLike = z.preprocess((val) => {
  if (typeof val === "string" || val instanceof Date) return new Date(val);
  return val;
}, z.date());

export const AppointmentCreateSchema = z
  .object({
    clientId: z.coerce.number().int().positive(),
    petId: z.coerce.number().int().positive(),

    type: AppointmentTypeSchema.default("CONSULTATION"),

    startAt: DateLike,
    endAt: DateLike.optional().nullable(),

    status: AppointmentStatusSchema.optional(), // opcional (server default)
    reason: z.string().trim().max(200).optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),

    vetId: z.string().trim().min(1).optional().nullable(),
  })
  .superRefine((d, ctx) => {
    if (d.endAt && d.endAt < d.startAt) {
      ctx.addIssue({
        code: "custom",
        message: "endAt no puede ser menor que startAt",
        path: ["endAt"],
      });
    }
  });

export type AppointmentCreateInput = z.infer<typeof AppointmentCreateSchema>;

export const AppointmentUpdateSchema = AppointmentCreateSchema.refine(
  (d) => Object.keys(d).length > 0,
  { message: "Debes enviar al menos un campo para actualizar." }
);

export type AppointmentUpdateInput = z.infer<typeof AppointmentUpdateSchema>;

export const AppointmentStatusChangeSchema = z.object({
  status: AppointmentStatusSchema,
});

export type AppointmentStatusChangeInput = z.infer<typeof AppointmentStatusChangeSchema>;
