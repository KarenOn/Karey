import { z } from "zod";

export const stockMovementTypes = [
  "IN",
  "OUT",
  "ADJUST",
  "SALE",
  "PURCHASE",
  "EXPIRED",
] as const;

const emptyToNull = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (value == null) return null;
    return value.length ? value : null;
  });

export const StockMovementCreateSchema = z
  .object({
    productId: z.coerce.number().int().positive("Producto invalido."),
    type: z.enum(stockMovementTypes),
    quantity: z.coerce.number().int(),
    reason: emptyToNull,
    referenceType: emptyToNull,
    referenceId: emptyToNull,
  })
  .superRefine((data, ctx) => {
    if (data.type === "ADJUST") {
      if (data.quantity === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El ajuste debe ser distinto de cero.",
          path: ["quantity"],
        });
      }
      return;
    }

    if (data.quantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cantidad debe ser mayor a cero.",
        path: ["quantity"],
      });
    }
  });

export type StockMovementCreateInput = z.infer<typeof StockMovementCreateSchema>;
