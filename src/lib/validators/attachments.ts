import { z } from "zod";

export const MedicalAttachmentCreateSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    fileType: z.string().trim().max(120).optional().or(z.literal("")),
    storageRef: z.string().trim().min(1).max(1000).optional(),
    url: z.string().trim().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.storageRef && !data.url) {
      ctx.addIssue({
        code: "custom",
        message: "Debes subir un archivo antes de guardarlo",
        path: ["storageRef"],
      });
    }
  });

export type MedicalAttachmentCreateInput = z.infer<
  typeof MedicalAttachmentCreateSchema
>;
