import { z } from "zod";

export const LoginSchema = z.object({
  email: z
    .email(),
  password: z
    .string()
    .min(1, "La contraseña es requerida")
    .regex(/\S/, "La contraseña no puede contener solo espacios"),
});