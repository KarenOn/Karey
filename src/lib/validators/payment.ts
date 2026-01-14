import { z } from "zod";
import { PaymentMethod } from "@/generated/prisma/client";

const toOptionalString = () =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.string());

export const PaymentCreateSchema = z.object({
  amount: z.coerce.number().positive("Monto inválido"),
  method: z.nativeEnum(PaymentMethod),
  reference: toOptionalString().optional(),
  paidAt: toOptionalString().optional(), // ISO
});

export type PaymentCreateInput = z.infer<typeof PaymentCreateSchema>;
