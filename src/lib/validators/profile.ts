import { z } from "zod";

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.string().max(max).optional()
  );

export const UserProfileUpdateSchema = z.object({
  name: z.string().trim().min(2, "El nombre es requerido").max(120, "El nombre es demasiado largo"),
  avatarStorageRef: z.string().trim().max(1000).optional().or(z.literal("")),
  phone: optionalTrimmedString(40),
  jobTitle: optionalTrimmedString(80),
  bio: optionalTrimmedString(1200),
});

export const UserPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida"),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
      .max(128, "La nueva contraseña es demasiado larga"),
    confirmPassword: z.string().min(1, "Debes confirmar la nueva contraseña"),
    revokeOtherSessions: z.boolean().optional().default(false),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export type UserProfileUpdateInput = z.infer<typeof UserProfileUpdateSchema>;
export type UserPasswordChangeInput = z.infer<typeof UserPasswordChangeSchema>;
