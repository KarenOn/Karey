import { z } from "zod";

export const MedicalAttachmentCreateSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().trim().max(120).optional().or(z.literal("")),
  url: z.string().trim().url(),
});

export type MedicalAttachmentCreateInput = z.infer<typeof MedicalAttachmentCreateSchema>;
