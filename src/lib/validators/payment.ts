import { z } from "zod";
import { PaymentMethod } from "@/generated/prisma/client";

const toOptionalString = () =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.string().optional());

export const PaymentCreateSchema = z.object({
  amount: z.coerce.number().positive("Monto inválido"),
  method: z.nativeEnum(PaymentMethod),
  reference: toOptionalString(),
  paidAt: toOptionalString().optional(), // ISO
});

export type PaymentCreateInput = z.infer<typeof PaymentCreateSchema>;
