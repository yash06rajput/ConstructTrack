/**
 * Image upload constants shared between the browser (client-side UX
 * validation) and the server (authoritative validation). No "server-only"
 * guard here on purpose — both sides need these values. The server never
 * trusts the client's *use* of them (see lib/services/images.ts, which
 * re-validates size and sniffs the real file format), but there's no harm
 * in both sides agreeing on the same limits for a good UX.
 */

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ACCEPTED_IMAGE_MIME_TYPES = Object.keys(IMAGE_MIME_TO_EXTENSION);

export const ACCEPTED_IMAGE_INPUT_ACCEPT = ACCEPTED_IMAGE_MIME_TYPES.join(",");
