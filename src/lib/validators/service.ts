import { z } from "zod";

const optionalString = () =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().optional()
  );

const optionalInt = () =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().optional()
  );

export const ServiceCreateSchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido").max(120),
  category: optionalString(),
  description: optionalString(),
  price: z.coerce.number().min(0, "Precio inválido"),
  durationMins: optionalInt(),
  isActive: z.coerce.boolean().optional().default(true),
});

export const ServiceUpdateSchema = ServiceCreateSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: "Debes enviar al menos un campo." }
);

export type ServiceCreateInput = z.infer<typeof ServiceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof ServiceUpdateSchema>;
