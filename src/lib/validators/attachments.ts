import { z } from "zod";

const optionalPositiveId = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

export const MedicalAttachmentCreateSchema = z
  .object({
    visitId: optionalPositiveId,
    fileName: z.string().trim().min(1).max(255),
    displayName: z.string().trim().max(255).optional().or(z.literal("")),
    originalFilename: z.string().trim().max(255).optional().or(z.literal("")),
    fileType: z.string().trim().max(120).optional().or(z.literal("")),
    fileSizeBytes: z.coerce.number().int().nonnegative().max(100 * 1024 * 1024).optional(),
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
