"""
Pure, deterministic aggregation over real detections. Kept separate from
detector.py so it's trivially unit-testable without loading a model.
"""
from app.services.detector import Detection


def count_objects(detections: list[Detection]) -> dict[str, int]:
    """detections -> { class_name: count }, e.g. {"person": 8, "truck": 2}."""
    counts: dict[str, int] = {}
    for detection in detections:
        counts[detection.class_name] = counts.get(detection.class_name, 0) + 1
    return counts


def average_confidence(detections: list[Detection]) -> float | None:
    """Mean confidence across all detections, or None if there were none
    (honest "unavailable" rather than a fabricated 0.0 meaning something)."""
    if not detections:
        return None
    return sum(d.confidence for d in detections) / len(detections)


def build_summary(detections: list[Detection], object_counts: dict[str, int]) -> str:
    """A short, factual, non-fabricated description of what was actually
    detected. Never claims construction-progress information."""
    if not detections:
        return "No objects were detected in this image at the configured confidence threshold."

    parts = [f"{count} {name}" for name, count in sorted(object_counts.items(), key=lambda kv: -kv[1])]
    return f"Detected {len(detections)} object(s): " + ", ".join(parts) + "."
