import type { NextRequest } from "next/server";

import { withApiErrorHandling } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { validationError } from "@/lib/api/errors";
import { uploadImageFieldsSchema } from "@/lib/validation/image";
import { listImages, uploadAndRegisterImage } from "@/lib/services/images";

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    throw validationError('Query parameter "projectId" is required.');
  }
  const images = await listImages(projectId);
  return ok(images);
});

/**
 * Uploads one construction-site image (multipart/form-data) and registers
 * its metadata. The client sends only `projectId` (+ optional
 * `progressRecordId`) and the raw file — never a storage path or URL, both
 * of which the server establishes itself (see lib/services/images.ts).
 */
export const POST = withApiErrorHandling(async (request: NextRequest) => {
  const formData = await request.formData();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw validationError('Field "file" is required and must be a file.');
  }

  const input = uploadImageFieldsSchema.parse({
    projectId: formData.get("projectId"),
    progressRecordId: formData.get("progressRecordId") || undefined,
  });

  const image = await uploadAndRegisterImage({ ...input, file });
  return created(image);
});
