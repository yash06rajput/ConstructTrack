import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/images/constants";

export type UploadItemStatus = "waiting" | "uploading" | "uploaded" | "failed";

export interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadItemStatus;
  error?: string;
}

/**
 * Client-side pre-validation, purely for fast feedback — the server
 * re-validates everything (real MIME sniffing, size) authoritatively.
 */
export function validateFileForUpload(file: File): string | null {
  if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type)) {
    return "Unsupported file type. Only JPEG, PNG, and WEBP images are allowed.";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const limitMb = Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024));
    return `File is larger than the ${limitMb} MB limit.`;
  }
  if (file.size <= 0) {
    return "File is empty.";
  }
  return null;
}

export function createUploadQueueItem(file: File): UploadQueueItem {
  const error = validateFileForUpload(file);
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    status: error ? "failed" : "waiting",
    error: error ?? undefined,
  };
}

/**
 * Runs `task` over `items` with at most `concurrency` running at once, so a
 * multi-image upload doesn't fire dozens of simultaneous requests.
 */
export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await task(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}
