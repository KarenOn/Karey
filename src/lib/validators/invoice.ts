import { z } from "zod";
import { InvoiceItemType, InvoiceStatus } from "@/generated/prisma/client";

const toOptionalNumber = () =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.number());

const toOptionalString = () =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.string());

export const InvoiceItemInputSchema = z.object({
  type: z.nativeEnum(InvoiceItemType),
  serviceId: toOptionalNumber().optional(),
  productId: toOptionalNumber().optional(),

  description: z.string().trim().min(1, "Descripción requerida"),
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).default(0),
});

export const InvoiceCreateSchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  petId: toOptionalNumber().optional(),
  appointmentId: toOptionalNumber().optional(),

  issueDate: toOptionalString().optional(), // ISO string
  dueDate: toOptionalString().optional(),   // ISO string

  discount: z.coerce.number().min(0).default(0),
  notes: toOptionalString().optional(),

  items: z.array(InvoiceItemInputSchema).min(1, "Agrega al menos 1 item"),
});

export const InvoiceUpdateSchema = InvoiceCreateSchema.extend({
  status: z.nativeEnum(InvoiceStatus).optional(),
}).refine((d) => Object.keys(d).length > 0, {
  message: "Debes enviar al menos un campo para actualizar.",
});

export type InvoiceCreateInput = z.infer<typeof InvoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof InvoiceUpdateSchema>;
export type InvoiceItemInput = z.infer<typeof InvoiceItemInputSchema>;
