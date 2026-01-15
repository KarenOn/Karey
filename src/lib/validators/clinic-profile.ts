import { z } from "zod";

const optStr = () =>
   z.preprocess((v) => {
    // si no viene el campo -> no lo toques
    if (v === undefined) return undefined;

    // si viene vacío o null -> lo tratamos como "quiero borrar el valor"
    if (v === "" || v === null) return null;

    // si viene algo raro, lo convertimos a string
    if (typeof v !== "string") return String(v);

    const s = v.trim();
    return s.length ? s : null; // espacios => null
  }, z.union([z.string(), z.null()]).optional());

const timeHHMM = z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:MM)");

const dayEnum = z.enum([
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday"
]);

const dayScheduleSchema = z.object({
  open: optStr().optional(),
  close: optStr().optional(),
  closed: z.coerce.boolean().default(false),
}).superRefine((val, ctx) => {
  if (!val.closed) {
    if (!val.open || !timeHHMM.safeParse(val.open).success) {
      ctx.addIssue({ code: "custom", message: "Hora de apertura inválida", path: ["open"] });
    }
    if (!val.close || !timeHHMM.safeParse(val.close).success) {
      ctx.addIssue({ code: "custom", message: "Hora de cierre inválida", path: ["close"] });
    }
  }
});

export const ClinicProfileSchema = z.object({
  name: optStr().optional(),
  logoUrl: optStr().optional(),
  slogan: optStr().optional(),
  owner: optStr().optional(),
  email: optStr().optional().refine((v) => !v || z.email().safeParse(v).success, "Email inválido"),
  phone: optStr().optional(),
  mobile: optStr().optional(),
  website: optStr().optional(),

  address: optStr().optional(),
//   city: optStr().optional(),
//   state: optStr().optional(),
//   zipCode: optStr().optional(),
//   country: optStr().optional(),

  socialMedia: z.object({
    facebook: optStr().optional(),
    instagram: optStr().optional(),
    whatsapp: optStr().optional(),
  }).optional(),

  taxName: optStr().optional(),
  taxId: optStr().optional(),

  bankName: optStr().optional(),
  bankAccount: optStr().optional(),
  bankClabe: optStr().optional(),

  invoiceNotes: optStr().optional(),
  invoiceTerms: optStr().optional(),

  schedule: z.record(dayEnum, dayScheduleSchema).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "No hay datos para actualizar" });

export type ClinicProfileInput = z.infer<typeof ClinicProfileSchema>;
