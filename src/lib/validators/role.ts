// src/lib/validators/role.ts
import { z } from "zod";
// import { optionalString } from "./_helpers";

const optionalString = () =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.string());

export const RoleCreateSchema = z.object({
  key: z.string().trim().min(2).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(80),
  description: optionalString(),
  permissions: z.record(z.array(z.string())).default({}),
  isActive: z.boolean().optional().default(true),
});

export const RoleUpdateSchema = RoleCreateSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: "Debes enviar al menos un campo." }
);
