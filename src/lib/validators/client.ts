import { z } from "zod";

export const ClientFormSchema = z.object({
  fullName: z
    .string("El nombre es requerido")
    .trim()
    .min(3, "Debe tener al menos 3 caracteres")
    .max(120, "Máximo 120 caracteres"),

  phone: z
    .string("El teléfono es requerido")
    .trim()
    .min(7, "Teléfono muy corto")
    .max(25, "Teléfono muy largo")
    .regex(/^[0-9()+\-\s]+$/, "Formato de teléfono inválido"),

  email: z
    .email("Email inválido")
    .trim()
    .optional()
    .or(z.literal("")),

  address: z.string().trim().max(200, "Máximo 200 caracteres").optional().or(z.literal("")),
  notes: z.string().trim().max(2000, "Máximo 2000 caracteres").optional().or(z.literal("")),
});

export type ClientFormValues = z.infer<typeof ClientFormSchema>;

/** Convierte ZodError -> { field: "mensaje" } */
export function zodFieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
