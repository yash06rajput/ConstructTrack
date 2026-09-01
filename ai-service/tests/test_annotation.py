import numpy as np

from app.services.annotation import draw_detections, encode_jpeg
from app.services.detector import Detection


def test_draw_detections_preserves_image_shape():
    image = np.zeros((100, 120, 3), dtype=np.uint8)
    detections = [Detection(class_id=0, class_name="person", confidence=0.91, bbox=(10, 10, 50, 90))]
    annotated = draw_detections(image, detections)
    assert annotated.shape == image.shape


def test_draw_detections_does_not_mutate_original():
    image = np.zeros((50, 50, 3), dtype=np.uint8)
    original = image.copy()
    detections = [Detection(class_id=0, class_name="truck", confidence=0.8, bbox=(0, 0, 20, 20))]
    draw_detections(image, detections)
    assert (image == original).all()


def test_draw_detections_handles_empty_list():
    image = np.zeros((30, 30, 3), dtype=np.uint8)
    annotated = draw_detections(image, [])
    assert annotated.shape == image.shape


def test_encode_jpeg_returns_valid_jpeg_bytes():
    image = np.zeros((20, 20, 3), dtype=np.uint8)
    encoded = encode_jpeg(image)
    assert encoded[:3] == b"\xff\xd8\xff"  # JPEG magic bytes
