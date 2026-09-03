import { z } from "zod";

export const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

export function emptyStringToUndefined(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function emptyStringToNull(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  return value.trim();
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1");
}

export const requiredEmailSchema = z
  .string()
  .trim()
  .min(1, "Ingresa un correo electrónico válido.")
  .email("Ingresa un correo electrónico válido.")
  .transform(normalizeEmail);

export const optionalEmailSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .email("Ingresa un correo electrónico válido.")
    .transform(normalizeEmail)
    .optional()
);

export const requiredPhoneSchema = z
  .string()
  .trim()
  .min(1, "Ingresa un teléfono válido.")
  .refine(isValidPhone, "Ingresa un teléfono válido.")
  .transform(normalizePhone);

export const optionalPhoneSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .refine(isValidPhone, "Ingresa un teléfono válido.")
    .transform(normalizePhone)
    .optional()
);

export const optionalTrimmedString = (max: number) =>
  z.preprocess(emptyStringToUndefined, z.string().trim().max(max).optional());

export const nullableTrimmedString = (max: number) =>
  z.preprocess(emptyStringToNull, z.string().trim().max(max).nullable());
