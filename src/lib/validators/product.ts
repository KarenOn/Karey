import { z } from "zod";

export const ProductCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  sku: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  unit: z.string().trim().optional().nullable(),

  cost: z.coerce.number().optional().nullable(),
  price: z.coerce.number("Precio inválido").min(0).nullable(),

  trackStock: z.coerce.boolean().default(true),
  stockOnHand: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(5),

  isActive: z.coerce.boolean().default(true),

  description: z.string().trim().optional().nullable(),
  requiresPrescription: z.coerce.boolean().default(false),
}).refine((d) => d.price !== null && d.price !== undefined, {
  message: "El precio de venta es obligatorio.",
  path: ["price"],
});

export const ProductUpdateSchema = ProductCreateSchema.refine(
  (d) => Object.keys(d).length > 0,
  { message: "Debes enviar al menos un campo para actualizar." }
);

export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
