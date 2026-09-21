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
  identificationType: z.union([z.literal(""), z.enum(["CEDULA", "RNC", "PASSPORT_OTHER"])]).optional(),
  identificationNumber: optionalTrimmedString(30),
}).superRefine((data, ctx) => {
  const number = data.identificationNumber?.replace(/[\s-]/g, "") ?? "";
  if (!data.identificationType && number) {
    ctx.addIssue({ code: "custom", path: ["identificationType"], message: "Selecciona el tipo de identificación" });
  }
  if (data.identificationType && !number) {
    ctx.addIssue({ code: "custom", path: ["identificationNumber"], message: "Indica el número de identificación" });
  }
  if (number && data.identificationType === "CEDULA" && !/^\d{11}$/.test(number)) {
    ctx.addIssue({ code: "custom", path: ["identificationNumber"], message: "La cédula debe tener 11 dígitos" });
  }
  if (number && data.identificationType === "RNC" && !/^\d{9,11}$/.test(number)) {
    ctx.addIssue({ code: "custom", path: ["identificationNumber"], message: "El RNC debe tener 9 u 11 dígitos" });
  }
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
