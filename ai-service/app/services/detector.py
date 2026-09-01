"""
Object-detection abstraction: ModelAdapter -> DetectionResult.

`ModelAdapter` is the seam a future construction-specific YOLO model would
implement (e.g. one trained to recognize rebar, formwork, scaffolding,
structural completion stages, ...). Nothing outside this module needs to
change to swap models — `get_detector()` is the single place that decides
which concrete adapter is constructed, driven by `settings.yolo_model_path`.

`YOLO11Detector` is the current, real implementation: it wraps Ultralytics'
YOLO11, loaded once and reused for every request (loading it per-request
would be slow and wasteful). It is a GENERIC, COCO-pretrained (80 classes:
person, car, truck, bus, ...) object detector — not a construction-progress
model. See docs/ai-pipeline.md for what that distinction means.
"""
from __future__ import annotations

import os
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np

from app.config import settings
from app.utils.errors import InferenceError, ModelLoadError


@dataclass(frozen=True)
class Detection:
    """One real object detected in the image. Every value here must come
    from actual model output — never fabricated."""

    class_id: int
    class_name: str
    confidence: float
    bbox: tuple[float, float, float, float]  # (x1, y1, x2, y2) in pixels


@dataclass(frozen=True)
class DetectionResult:
    model_version: str
    detections: list[Detection]
    image_width: int
    image_height: int
    inference_time_ms: int


class ModelAdapter(ABC):
    """Interface a detection backend must implement to be usable by the
    analysis pipeline. Swap the concrete adapter in `get_detector()` to
    plug in a different (e.g. construction-specific) model without
    touching image_analysis.py or the API layer."""

    @property
    @abstractmethod
    def model_version(self) -> str: ...

    @abstractmethod
    def detect(self, image: np.ndarray) -> DetectionResult: ...


class YOLO11Detector(ModelAdapter):
    """Ultralytics YOLO11 adapter. Loads the checkpoint once in __init__
    and reuses it for every `detect()` call."""

    def __init__(
        self,
        model_path: str,
        confidence_threshold: float,
        iou_threshold: float,
    ) -> None:
        # Imported lazily so importing this module doesn't require torch/
        # ultralytics to be installed unless a detector is actually built
        # (keeps unit tests that don't touch inference fast/independent).
        try:
            from ultralytics import YOLO
        except ImportError as exc:  # pragma: no cover - environment issue
            raise ModelLoadError(
                "The 'ultralytics' package is not installed. "
                "Run `pip install -r requirements.txt`."
            ) from exc

        try:
            self._model = YOLO(model_path)
        except Exception as exc:  # Ultralytics raises varied exception types
            raise ModelLoadError(
                f"Failed to load YOLO model from '{os.path.basename(model_path)}': {exc}"
            ) from exc

        self._confidence_threshold = confidence_threshold
        self._iou_threshold = iou_threshold
        self._model_version = os.path.basename(model_path)

    @property
    def model_version(self) -> str:
        return self._model_version

    def detect(self, image: np.ndarray) -> DetectionResult:
        import time

        height, width = image.shape[:2]
        start = time.perf_counter()
        try:
            results = self._model.predict(
                image,
                conf=self._confidence_threshold,
                iou=self._iou_threshold,
                verbose=False,
            )
        except Exception as exc:
            raise InferenceError(f"YOLO11 inference failed: {exc}") from exc
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        detections: list[Detection] = []
        if results:
            result = results[0]
            names = result.names
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
                    detections.append(
                        Detection(
                            class_id=class_id,
                            class_name=str(names[class_id]),
                            confidence=confidence,
                            bbox=(x1, y1, x2, y2),
                        )
                    )

        return DetectionResult(
            model_version=self._model_version,
            detections=detections,
            image_width=width,
            image_height=height,
            inference_time_ms=elapsed_ms,
        )


_detector: ModelAdapter | None = None
_detector_lock = threading.Lock()
_load_error: str | None = None


def _resolve_model_path(configured_path: str) -> str:
    """If the configured path exists relative to the ai-service package
    root, use that file directly. Otherwise pass the raw value through to
    Ultralytics, which understands short names like "yolo11n.pt" and will
    download that checkpoint itself via its normal release-asset mechanism."""
    package_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    candidate = os.path.join(package_root, configured_path)
    return candidate if os.path.exists(candidate) else configured_path


def get_detector() -> ModelAdapter:
    """Returns the process-wide detector singleton, loading it on first
    use (or at FastAPI startup — see main.py). Thread-safe."""
    global _detector, _load_error
    if _detector is not None:
        return _detector

    with _detector_lock:
        if _detector is not None:
            return _detector
        try:
            model_path = _resolve_model_path(settings.yolo_model_path)
            _detector = YOLO11Detector(
                model_path=model_path,
                confidence_threshold=settings.yolo_confidence_threshold,
                iou_threshold=settings.yolo_iou_threshold,
            )
            _load_error = None
            return _detector
        except ModelLoadError as exc:
            _load_error = str(exc)
            raise


def is_model_loaded() -> bool:
    return _detector is not None


def get_load_error() -> str | None:
    return _load_error
