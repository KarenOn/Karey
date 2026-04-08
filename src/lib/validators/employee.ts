// src/lib/validators/employee.ts
import { z } from "zod";

export const EmployeeInviteSchema = z.object({
  email: z.email().trim().toLowerCase(),
  name: z.string().trim().min(2).max(120),
  roleId: z.coerce.number().int().positive(),
  authRole: z.string().trim().optional().default("user"), // BetterAuth user.role
});

export const AcceptInviteSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(200),
});
