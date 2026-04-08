import { z } from "zod";
import { AppointmentStatus, AppointmentType } from "@/generated/prisma/client";

export const APPOINTMENT_TYPES = Object.values(AppointmentType);
export const APPOINTMENT_STATUSES = Object.values(AppointmentStatus);

export const AppointmentTypeSchema = z.nativeEnum(AppointmentType);
export const AppointmentStatusSchema = z.nativeEnum(AppointmentStatus);

const DateLike = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
    return new Date(value);
  }
  return value;
}, z.date());

const NullableDateLike = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
    return new Date(value);
  }
  return value;
}, z.date().nullable());

const toNullableTrimmedString = (max: number) =>
  z.preprocess((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }, z.string().max(max).nullable());

const toNullableIdString = () =>
  z.preprocess((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }, z.string().min(1).nullable());

const AppointmentWritableSchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  petId: z.coerce.number().int().positive().optional(),
  type: AppointmentTypeSchema.optional(),
  startAt: DateLike.optional(),
  endAt: NullableDateLike.optional(),
  status: AppointmentStatusSchema.optional(),
  reason: toNullableTrimmedString(200).optional(),
  notes: toNullableTrimmedString(5000).optional(),
  vetId: toNullableIdString().optional(),
});

export const AppointmentCreateSchema = AppointmentWritableSchema.extend({
  petId: z.coerce.number().int().positive(),
  startAt: DateLike,
  type: AppointmentTypeSchema.default(AppointmentType.CONSULTATION),
}).superRefine((data, ctx) => {
  if (data.endAt && data.endAt < data.startAt) {
    ctx.addIssue({
      code: "custom",
      message: "endAt no puede ser menor que startAt",
      path: ["endAt"],
    });
  }
});

export type AppointmentCreateInput = z.infer<typeof AppointmentCreateSchema>;

export const AppointmentUpdateSchema = AppointmentWritableSchema.superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Debes enviar al menos un campo para actualizar.",
    });
  }

  if (data.startAt && data.endAt && data.endAt < data.startAt) {
    ctx.addIssue({
      code: "custom",
      message: "endAt no puede ser menor que startAt",
      path: ["endAt"],
    });
  }
});

export type AppointmentUpdateInput = z.infer<typeof AppointmentUpdateSchema>;

export const AppointmentStatusChangeSchema = z.object({
  status: AppointmentStatusSchema,
});

export type AppointmentStatusChangeInput = z.infer<typeof AppointmentStatusChangeSchema>;
