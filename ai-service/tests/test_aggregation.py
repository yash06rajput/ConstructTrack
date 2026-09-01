from app.services.aggregation import average_confidence, build_summary, count_objects
from app.services.detector import Detection


def _det(class_name: str, confidence: float) -> Detection:
    return Detection(class_id=0, class_name=class_name, confidence=confidence, bbox=(0, 0, 10, 10))


def test_count_objects_aggregates_by_class_name():
    detections = [_det("person", 0.9), _det("person", 0.8), _det("truck", 0.7)]
    assert count_objects(detections) == {"person": 2, "truck": 1}


def test_count_objects_empty_list():
    assert count_objects([]) == {}


def test_average_confidence_computes_mean():
    detections = [_det("person", 0.9), _det("person", 0.7)]
    assert average_confidence(detections) == 0.8


def test_average_confidence_none_when_no_detections():
    # Honest "unavailable", not a fabricated 0.0.
    assert average_confidence([]) is None


def test_build_summary_lists_detected_classes():
    detections = [_det("person", 0.9), _det("truck", 0.7)]
    counts = count_objects(detections)
    summary = build_summary(detections, counts)
    assert "person" in summary
    assert "truck" in summary
    assert "2 object" in summary or "Detected 2" in summary


def test_build_summary_empty_is_explicit_not_fabricated():
    summary = build_summary([], {})
    assert "No objects were detected" in summary
