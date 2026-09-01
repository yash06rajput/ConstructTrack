import cv2
import numpy as np
import pytest
import respx
import httpx

from app.services.image_preprocessing import load_image_from_url, resize_for_inference
from app.utils.errors import ImageDecodeError, ImageDownloadError


def _encode_png(width: int, height: int) -> bytes:
    image = np.zeros((height, width, 3), dtype=np.uint8)
    ok, buffer = cv2.imencode(".png", image)
    assert ok
    return buffer.tobytes()


@respx.mock
def test_load_image_from_url_decodes_valid_png():
    png_bytes = _encode_png(64, 48)
    respx.get("https://example.com/valid.png").mock(
        return_value=httpx.Response(200, content=png_bytes, headers={"content-type": "image/png"})
    )
    image = load_image_from_url("https://example.com/valid.png")
    assert image.shape[0] == 48
    assert image.shape[1] == 64


@respx.mock
def test_load_image_from_url_rejects_non_image_bytes():
    respx.get("https://example.com/not-an-image.png").mock(
        return_value=httpx.Response(200, content=b"this is not an image", headers={"content-type": "image/png"})
    )
    with pytest.raises(ImageDecodeError):
        load_image_from_url("https://example.com/not-an-image.png")


@respx.mock
def test_load_image_from_url_does_not_trust_content_type_alone():
    # Content-Type claims an image, but the bytes are plainly not one —
    # the magic-byte sniff (and the cv2.imdecode fallback) must catch this.
    respx.get("https://example.com/lying.jpg").mock(
        return_value=httpx.Response(
            200, content=b"<html>not an image</html>", headers={"content-type": "image/jpeg"}
        )
    )
    with pytest.raises(ImageDecodeError):
        load_image_from_url("https://example.com/lying.jpg")


@respx.mock
def test_load_image_from_url_raises_on_http_error():
    respx.get("https://example.com/missing.jpg").mock(return_value=httpx.Response(404))
    with pytest.raises(ImageDownloadError):
        load_image_from_url("https://example.com/missing.jpg")


@respx.mock
def test_load_image_from_url_raises_on_empty_body():
    respx.get("https://example.com/empty.jpg").mock(return_value=httpx.Response(200, content=b""))
    with pytest.raises(ImageDownloadError):
        load_image_from_url("https://example.com/empty.jpg")


def test_resize_for_inference_downscales_longest_side():
    image = np.zeros((2000, 1000, 3), dtype=np.uint8)
    resized = resize_for_inference(image, max_dimension=1000)
    assert max(resized.shape[:2]) == 1000
    # Aspect ratio preserved.
    assert resized.shape[1] == 500


def test_resize_for_inference_never_upscales():
    image = np.zeros((100, 80, 3), dtype=np.uint8)
    resized = resize_for_inference(image, max_dimension=1280)
    assert resized.shape == image.shape
