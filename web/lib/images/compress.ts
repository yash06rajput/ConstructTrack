/**
 * Browser-side image downscaling before upload.
 *
 * Why: serverless hosts (e.g. Vercel) cap request bodies at ~4.5 MB, and
 * modern phone photos are often 4–10 MB. Large images are re-encoded as
 * JPEG with the longest side capped, which keeps plenty of detail for
 * YOLO11 (the AI service resizes to <= 1280 px anyway) while staying well
 * under the platform limit. Small images are uploaded untouched.
 *
 * The server still re-validates size and sniffs the real format
 * (lib/services/images.ts), so this is purely a transport optimisation.
 */

/** Files at or below this size are sent as-is. */
export const COMPRESS_THRESHOLD_BYTES = 3.5 * 1024 * 1024;

const MAX_DIMENSION_PX = 2048;
const JPEG_QUALITY = 0.85;

export async function compressImageForUpload(file: File): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD_BYTES) return file;
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    // Unsupported format for decoding in this browser, etc. — fall back to
    // the original file; the server will report a clear error if too big.
    return file;
  }
}
