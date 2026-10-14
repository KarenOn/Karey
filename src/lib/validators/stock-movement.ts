import { z } from "zod";
import { isValid, parse } from "date-fns";

export const stockMovementTypes = [
  "IN",
  "OUT",
  "ADJUST",
  "SALE",
  "PURCHASE",
  "EXPIRED",
] as const;

// Values used by current integrations. Keep database/API fields as strings for legacy compatibility.
export const stockMovementReferenceTypes = ["PRODUCT", "INVOICE", "INVOICE_VOID"] as const;
export const stockMovementReferenceLabels: Record<(typeof stockMovementReferenceTypes)[number], string> = {
  PRODUCT: "Producto",
  INVOICE: "Factura",
  INVOICE_VOID: "Anulación de factura",
};

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
    batchNumber: emptyToNull,
    expirationDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.").refine((value) => isValid(parse(value, "yyyy-MM-dd", new Date())), "Fecha inválida.").nullable().optional(),
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
