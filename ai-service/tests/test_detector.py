"""
Real-model tests. These load the actual YOLO11 checkpoint and run actual
inference — no mocked/fabricated detections. If the model genuinely cannot
be loaded in this environment (e.g. no network to fetch it, or it hasn't
been downloaded to ai-service/models/), the tests are skipped with a clear
reason rather than being silently replaced by fake assertions.
"""
import os

import cv2
import pytest

from app.config import settings
from app.services.detector import Detection, DetectionResult, YOLO11Detector

FIXTURE_IMAGE = os.path.join(os.path.dirname(__file__), "fixtures", "sample_scene.jpg")


def _model_available() -> bool:
    package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    candidate = os.path.join(package_root, settings.yolo_model_path)
    return os.path.exists(candidate)


requires_model = pytest.mark.skipif(
    not _model_available(),
    reason=(
        f"YOLO model file not found at '{settings.yolo_model_path}'. "
        "Download it (see README) to run real-inference tests."
    ),
)


@pytest.fixture(scope="module")
def real_detector() -> YOLO11Detector:
    package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(package_root, settings.yolo_model_path)
    return YOLO11Detector(
        model_path=model_path,
        confidence_threshold=settings.yolo_confidence_threshold,
        iou_threshold=settings.yolo_iou_threshold,
    )


@requires_model
def test_real_yolo11_detector_loads_and_reports_version(real_detector: YOLO11Detector):
    assert real_detector.model_version == "yolo11n.pt"


@requires_model
def test_real_yolo11_inference_on_sample_image_produces_real_detections(real_detector: YOLO11Detector):
    image = cv2.imread(FIXTURE_IMAGE)
    assert image is not None, "Test fixture image failed to load"

    result = real_detector.detect(image)

    assert isinstance(result, DetectionResult)
    assert result.model_version == "yolo11n.pt"
    assert result.image_width == image.shape[1]
    assert result.image_height == image.shape[0]
    # The bundled fixture (Ultralytics' own bus.jpg demo image) reliably
    # contains a bus and several people at the default confidence
    # threshold — asserting on that proves genuine inference occurred,
    # not a stub returning an empty/fixed result.
    assert len(result.detections) > 0
    class_names = {d.class_name for d in result.detections}
    assert "bus" in class_names or "person" in class_names

    for detection in result.detections:
        assert isinstance(detection, Detection)
        assert 0.0 <= detection.confidence <= 1.0
        x1, y1, x2, y2 = detection.bbox
        assert x1 < x2
        assert y1 < y2


@requires_model
def test_real_yolo11_inference_is_deterministic_for_same_image(real_detector: YOLO11Detector):
    image = cv2.imread(FIXTURE_IMAGE)
    result_a = real_detector.detect(image)
    result_b = real_detector.detect(image)
    # Same model + same image + same thresholds -> same detected classes.
    assert {d.class_name for d in result_a.detections} == {d.class_name for d in result_b.detections}
