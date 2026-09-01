import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/api/errors";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  buildConstructionImageStoragePath,
  createSignedImageUrl,
  deleteImageObject,
  deleteImageObjectSafe,
  sniffImageMimeType,
  uploadImageObject,
} from "@/lib/supabase/storage";
import type { UploadImageFieldsInput } from "@/lib/validation/image";

/**
 * Validates an uploaded file server-side. Never trusts the browser-supplied
 * `File.type` or filename — size is checked directly, and the actual
 * format is sniffed from magic bytes.
 */
async function validateImageFile(file: File): Promise<{ buffer: Buffer; extension: string }> {
  if (file.size <= 0) {
    throw validationError("The selected file is empty.");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const limitMb = Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024));
    throw validationError(`"${file.name}" is larger than the ${limitMb} MB limit per image.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffedType = sniffImageMimeType(buffer);
  const extension = sniffedType ? ALLOWED_IMAGE_MIME_TYPES[sniffedType] : undefined;

  if (!sniffedType || !extension) {
    throw validationError(
      `"${file.name}" is not a supported image format. Only JPEG, PNG, and WEBP images are allowed.`,
    );
  }

  return { buffer, extension };
}

async function attachSignedUrl<T extends { storagePath: string }>(
  image: T,
): Promise<T & { imageUrl: string }> {
  const imageUrl = await createSignedImageUrl(image.storagePath);
  return { ...image, imageUrl };
}

export async function listImages(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound("Project", projectId);

  const images = await prisma.constructionImage.findMany({
    where: { projectId },
    orderBy: { uploadedAt: "desc" },
    // Only the small AI-evidence fields the progress-monitoring dashboard
    // needs (object counts, status, timestamp) — deliberately NOT
    // `detectedObjects` (the full per-box array), which is only fetched
    // lazily for a single image via GET /api/analysis when its detail
    // panel is opened. Keeps this list payload small regardless of how
    // many detections an image has.
    select: {
      id: true,
      projectId: true,
      progressRecordId: true,
      storagePath: true,
      imageUrl: true,
      originalFilename: true,
      fileSizeBytes: true,
      analysisStatus: true,
      uploadedAt: true,
      analysis: {
        select: { status: true, objectCounts: true, createdAt: true },
      },
    },
  });

  // Signed URLs expire, so every read regenerates fresh ones from the
  // durable `storagePath` rather than trusting whatever was stored at
  // upload time.
  return Promise.all(images.map(attachSignedUrl));
}

export interface UploadConstructionImageInput extends UploadImageFieldsInput {
  file: File;
}

/**
 * Full upload lifecycle: validate -> upload to Supabase Storage -> register
 * in Postgres. The database row is only created after the storage upload
 * succeeds; if the database write then fails, the just-uploaded storage
 * object is cleaned up so it doesn't become an orphan.
 */
export async function uploadAndRegisterImage(input: UploadConstructionImageInput) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw notFound("Project", input.projectId);

  if (input.progressRecordId) {
    const progressRecord = await prisma.progressRecord.findUnique({
      where: { id: input.progressRecordId },
    });
    if (!progressRecord || progressRecord.projectId !== input.projectId) {
      throw notFound("ProgressRecord", input.progressRecordId);
    }
  }

  const { buffer, extension } = await validateImageFile(input.file);
  const storagePath = buildConstructionImageStoragePath(input.projectId, extension);
  const contentType = `image/${extension === "jpg" ? "jpeg" : extension}`;

  await uploadImageObject(storagePath, buffer, contentType);

  try {
    const image = await prisma.constructionImage.create({
      data: {
        projectId: input.projectId,
        progressRecordId: input.progressRecordId,
        storagePath,
        // Placeholder — signed URLs expire, so the durable value here is
        // never trusted for display; every read regenerates a fresh one
        // (see listImages / attachSignedUrl). Stored only because the
        // column is non-nullable.
        imageUrl: storagePath,
        originalFilename: input.file.name.slice(0, 255),
        fileSizeBytes: input.file.size,
      },
    });

    return attachSignedUrl(image);
  } catch (error) {
    await deleteImageObjectSafe(storagePath);
    throw error;
  }
}

export interface DeleteImageResult {
  id: string;
  storageCleanupFailed: boolean;
}

/**
 * Deletes an image. The Postgres record is removed first — that's the
 * record the rest of the app treats as ground truth for "does this image
 * exist" — then the Storage object is removed. If the Storage deletion
 * fails, we do NOT pretend everything succeeded: the caller is told via
 * `storageCleanupFailed` so it can be surfaced rather than hidden. The
 * (safe) failure mode here is a harmless orphaned storage object, not a
 * gallery entry pointing at a deleted image.
 */
export async function deleteImage(id: string): Promise<DeleteImageResult> {
  const image = await prisma.constructionImage.findUnique({
    where: { id },
    include: { analysis: true },
  });
  if (!image) throw notFound("ConstructionImage", id);

  // Deleting the ConstructionImage row cascades to its AIAnalysis row
  // (see schema.prisma onDelete: Cascade) — capture the annotated image's
  // storage path first so it can be cleaned up too.
  const annotatedStoragePath = image.analysis?.annotatedStoragePath ?? null;

  await prisma.constructionImage.delete({ where: { id } });

  if (annotatedStoragePath) {
    await deleteImageObjectSafe(annotatedStoragePath);
  }

  try {
    await deleteImageObject(image.storagePath);
    return { id, storageCleanupFailed: false };
  } catch {
    return { id, storageCleanupFailed: true };
  }
}
