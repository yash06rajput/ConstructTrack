"""
OpenCV-based detection visualization. Draws real bounding boxes, class
names, and confidence values onto a COPY of the decoded image — the
original uploaded construction image is never modified or overwritten.
"""
import cv2
import numpy as np

from app.services.detector import Detection

_BOX_COLOR = (46, 204, 113)  # BGR — a visible green
_TEXT_COLOR = (255, 255, 255)
_FONT = cv2.FONT_HERSHEY_SIMPLEX


def draw_detections(image: np.ndarray, detections: list[Detection]) -> np.ndarray:
    annotated = image.copy()
    for detection in detections:
        x1, y1, x2, y2 = (int(round(v)) for v in detection.bbox)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), _BOX_COLOR, 2)

        label = f"{detection.class_name} {detection.confidence * 100:.1f}%"
        (text_w, text_h), baseline = cv2.getTextSize(label, _FONT, 0.5, 1)
        label_y_top = max(0, y1 - text_h - baseline - 4)
        cv2.rectangle(
            annotated,
            (x1, label_y_top),
            (x1 + text_w + 4, label_y_top + text_h + baseline + 4),
            _BOX_COLOR,
            -1,
        )
        cv2.putText(
            annotated,
            label,
            (x1 + 2, label_y_top + text_h + 2),
            _FONT,
            0.5,
            _TEXT_COLOR,
            1,
            cv2.LINE_AA,
        )
    return annotated


def encode_jpeg(image: np.ndarray, quality: int = 85) -> bytes:
    ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        raise ValueError("Failed to encode annotated image as JPEG.")
    return buffer.tobytes()
