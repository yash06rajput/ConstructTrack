import "server-only";
import { randomUUID } from "crypto";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import { IMAGE_MIME_TO_EXTENSION, MAX_IMAGE_SIZE_BYTES } from "@/lib/images/constants";

/**
 * Supabase Storage architecture for construction-site images.
 *
 * Flow:
 *   Browser -> Next.js API route (multipart upload)
 *            -> validate project + file (server-authoritative)
 *            -> upload to Supabase Storage (service-role client, server-only)
 *            -> register ConstructionImage row in PostgreSQL
 *
 * The bucket is PRIVATE. Construction-site photos can reveal a client's
 * site layout, security setup, and project timeline, so there is no good
 * reason to make them publicly world-readable. Because it's private:
 *   - Only `storagePath` is durable, trusted state (stored in Postgres).
 *   - Display URLs are short-lived SIGNED URLs, generated on the server
 *     on demand (see createSignedImageUrl). They are never generated in
 *     the browser, which never sees the service-role key.
 *
 * Cloudinary is intentionally NOT used anywhere in this project.
 *
 * NOTE: the "construction-images" bucket itself must be created once in
 * the Supabase dashboard (Storage -> New bucket -> "construction-images",
 * Public: OFF). This app does not attempt to auto-create it.
 */

export const CONSTRUCTION_IMAGES_BUCKET = "construction-images";

/** How long a generated signed URL stays valid for. */
export const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

// Size limit and MIME->extension mapping live in lib/images/constants.ts
// (shared with the client for UX validation) and are re-exported here for
// convenience since most storage code imports from this module.
export { MAX_IMAGE_SIZE_BYTES };
export const ALLOWED_IMAGE_MIME_TYPES = IMAGE_MIME_TO_EXTENSION;

/**
 * Sniffs the actual file format from its magic bytes rather than trusting
 * the browser-supplied `File.type`, which is attacker-controlled. Returns
 * the detected MIME type, or null if it doesn't match a supported format.
 */
export function sniffImageMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Builds a safe, collision-resistant, path-traversal-proof storage object
 * path. Never derived from the client-supplied filename — only a
 * server-validated projectId and a server-generated random id are used.
 *
 * Example: projects/ckAbc123/images/8f72c1d4-....jpg
 */
export function buildConstructionImageStoragePath(projectId: string, extension: string): string {
  return `projects/${projectId}/images/${randomUUID()}.${extension}`;
}

function getStorage() {
  return createSupabaseServiceClient().storage.from(CONSTRUCTION_IMAGES_BUCKET);
}

export async function uploadImageObject(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await getStorage().upload(storagePath, buffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new ApiError(
      "EXTERNAL_SERVICE_ERROR",
      "Could not upload the image to storage. Please try again.",
    );
  }
}

/** Best-effort cleanup — used when DB registration fails after a successful upload. */
export async function deleteImageObjectSafe(storagePath: string): Promise<void> {
  try {
    await getStorage().remove([storagePath]);
  } catch {
    // Intentionally swallowed: this is a cleanup-of-last-resort after a
    // different failure already occurred. The caller has already reported
    // the primary error; failing to clean up just leaves one orphaned
    // storage object, which is a much smaller problem than throwing over
    // a secondary error and masking the original one.
  }
}

/** Deletes a storage object as a primary (non-cleanup) operation — errors propagate. */
export async function deleteImageObject(storagePath: string): Promise<void> {
  const { error } = await getStorage().remove([storagePath]);
  if (error) {
    throw new ApiError(
      "EXTERNAL_SERVICE_ERROR",
      "The image record was removed, but its storage object could not be deleted. It may need manual cleanup.",
    );
  }
}

/**
 * Builds a safe, server-generated storage path for an AI-annotated
 * (bounding-boxes-drawn) visualization of an image, kept as a SEPARATE
 * object from the original upload (the source image is never overwritten).
 * Never derived from client input.
 */
export function buildAnnotatedImageStoragePath(projectId: string, imageId: string): string {
  return `projects/${projectId}/images/${imageId}/analysis/${randomUUID()}.jpg`;
}

export async function uploadAnnotatedImageObject(storagePath: string, buffer: Buffer): Promise<void> {
  const { error } = await getStorage().upload(storagePath, buffer, {
    contentType: "image/jpeg",
    upsert: false,
  });

  if (error) {
    throw new ApiError(
      "EXTERNAL_SERVICE_ERROR",
      "Could not upload the annotated analysis image to storage.",
    );
  }
}

export async function createSignedImageUrl(storagePath: string): Promise<string> {
  const { data, error } = await getStorage().createSignedUrl(
    storagePath,
    SIGNED_URL_EXPIRY_SECONDS,
  );

  if (error || !data?.signedUrl) {
    throw new ApiError(
      "EXTERNAL_SERVICE_ERROR",
      "Could not generate a viewing URL for this image.",
    );
  }

  return data.signedUrl;
}
