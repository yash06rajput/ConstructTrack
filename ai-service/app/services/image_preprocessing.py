"""
Image loading / preprocessing utilities.

Downloads a (short-lived, signed) image URL and decodes it into an OpenCV
BGR ndarray, ready for YOLO11 inference. This is the one network-facing
piece of the pipeline, so it treats its input defensively:

  - the response body is capped at `settings.max_image_download_bytes`,
    enforced while streaming (not after the fact) so a malicious/huge
    response can't be fully buffered into memory first;
  - `Content-Type` is NOT trusted by itself — the actual bytes are sniffed
    (magic numbers) before attempting a decode, and the OpenCV decode
    itself is the final authority ("is this really a valid image?");
  - only http/https URLs are accepted (enforced by Pydantic's HttpUrl at
    the request layer) to avoid this becoming an arbitrary-scheme fetch
    primitive.
"""
import cv2
import numpy as np
import httpx

from app.config import settings
from app.utils.errors import ImageDecodeError, ImageDownloadError

# Magic-byte signatures for the formats this pipeline supports. Mirrors
# web/lib/supabase/storage.ts's sniffImageMimeType so both layers agree on
# what counts as "a real image" rather than trusting file extensions.
_JPEG_MAGIC = (b"\xff\xd8\xff",)
_PNG_MAGIC = (b"\x89PNG\r\n\x1a\n",)
_WEBP_RIFF = b"RIFF"
_WEBP_TAG = b"WEBP"


def _sniff_image_format(head: bytes) -> str | None:
    if head.startswith(_JPEG_MAGIC[0]):
        return "jpeg"
    if head.startswith(_PNG_MAGIC[0]):
        return "png"
    if len(head) >= 12 and head[0:4] == _WEBP_RIFF and head[8:12] == _WEBP_TAG:
        return "webp"
    return None


def _download_image_bytes(image_url: str) -> bytes:
    """Streams the image, enforcing the byte cap while downloading rather
    than after buffering the whole response."""
    max_bytes = settings.max_image_download_bytes
    chunks: list[bytes] = []
    total = 0

    try:
        with httpx.stream(
            "GET",
            image_url,
            timeout=settings.image_download_timeout_seconds,
            follow_redirects=True,
        ) as response:
            response.raise_for_status()
            for chunk in response.iter_bytes():
                total += len(chunk)
                if total > max_bytes:
                    raise ImageDownloadError(
                        f"Image exceeds the {max_bytes // (1024 * 1024)} MB download limit."
                    )
                chunks.append(chunk)
    except httpx.HTTPStatusError as exc:
        raise ImageDownloadError(
            f"Image URL returned HTTP {exc.response.status_code}."
        ) from exc
    except httpx.HTTPError as exc:
        raise ImageDownloadError(f"Failed to download image: {exc}") from exc

    if total == 0:
        raise ImageDownloadError("Downloaded image was empty.")

    return b"".join(chunks)


def load_image_from_url(image_url: str) -> np.ndarray:
    """Downloads an image and decodes it into an OpenCV BGR ndarray.

    Raises ImageDownloadError if the fetch fails/is too large, or
    ImageDecodeError if the bytes are not a genuine, decodable image.
    """
    content = _download_image_bytes(image_url)

    # Cheap defense-in-depth check before spending time on a full decode —
    # the cv2.imdecode() call below remains the authoritative check.
    if _sniff_image_format(content[:16]) is None:
        raise ImageDecodeError(
            "Downloaded content is not a recognizable JPEG, PNG, or WEBP image."
        )

    buffer = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ImageDecodeError("Downloaded file could not be decoded as an image.")

    height, width = image.shape[:2]
    if height <= 0 or width <= 0:
        raise ImageDecodeError("Decoded image has invalid dimensions.")

    return image


def resize_for_inference(image: np.ndarray, max_dimension: int) -> np.ndarray:
    """Downscales the image so its longest side is at most `max_dimension`,
    preserving aspect ratio. Never upscales. Keeps inference time and
    memory bounded without distorting the image (uniform scale only, no
    cropping/stretching, so YOLO's own letterboxing behaves normally)."""
    height, width = image.shape[:2]
    longest_side = max(height, width)
    if longest_side <= max_dimension:
        return image

    scale = max_dimension / longest_side
    new_size = (max(1, int(width * scale)), max(1, int(height * scale)))
    return cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)
