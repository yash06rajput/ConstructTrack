import { z } from "zod";

/**
 * Validates the non-file form fields that accompany an image upload
 * (multipart/form-data — the file itself is validated separately in
 * lib/services/images.ts using magic-byte sniffing, since Zod doesn't
 * inspect binary content).
 */
export const uploadImageFieldsSchema = z.object({
  projectId: z.string().min(1, "projectId is required."),
  progressRecordId: z.string().min(1).optional(),
});

export type UploadImageFieldsInput = z.infer<typeof uploadImageFieldsSchema>;
