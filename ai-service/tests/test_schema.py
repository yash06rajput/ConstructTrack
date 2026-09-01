import pytest
from pydantic import ValidationError

from app.models.analysis import AnalyzeImageRequest, AnalyzeImageResponse, Detection, ImageDimensions


def test_analyze_request_requires_image_url():
    with pytest.raises(ValidationError):
        AnalyzeImageRequest()


def test_analyze_request_rejects_non_http_url():
    with pytest.raises(ValidationError):
        AnalyzeImageRequest(image_url="not-a-url")


def test_detection_confidence_must_be_in_unit_range():
    with pytest.raises(ValidationError):
        Detection(class_id=0, class_name="person", confidence=1.5, bbox=(0, 0, 10, 10))


def test_analyze_response_round_trips_real_shaped_data():
    response = AnalyzeImageResponse(
        model="yolo11n.pt",
        image=ImageDimensions(width=1920, height=1080),
        detections=[Detection(class_id=0, class_name="person", confidence=0.91, bbox=(120, 80, 340, 520))],
        object_counts={"person": 1},
        average_confidence=0.91,
        analysis_summary="Detected 1 object(s): 1 person.",
        processing_time_ms=42,
    )
    assert response.success is True
    assert response.object_counts["person"] == 1


def test_analyze_response_allows_no_detections_without_fabricating_confidence():
    response = AnalyzeImageResponse(
        model="yolo11n.pt",
        image=ImageDimensions(width=100, height=100),
        detections=[],
        object_counts={},
        average_confidence=None,
        analysis_summary="No objects were detected in this image at the configured confidence threshold.",
        processing_time_ms=10,
    )
    assert response.average_confidence is None
    assert response.detections == []
