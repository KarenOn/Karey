import { z } from "zod";
import {
  optionalEmailSchema,
  optionalTrimmedString,
  requiredPhoneSchema,
} from "@/lib/validators/common";

export const ClientFormSchema = z.object({
  fullName: z
    .string("El nombre es requerido")
    .trim()
    .min(3, "Debe tener al menos 3 caracteres")
    .max(120, "Máximo 120 caracteres"),
  phone: requiredPhoneSchema,
  email: optionalEmailSchema,
  address: optionalTrimmedString(200),
  notes: optionalTrimmedString(2000),
});

export type ClientFormValues = z.infer<typeof ClientFormSchema>;

export function zodFieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
