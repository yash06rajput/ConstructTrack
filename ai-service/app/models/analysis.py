"""
Pydantic models defining the AI service's public API contract.

Kept in sync with the TypeScript contract in
web/lib/services/ai-service-client.ts.

IMPORTANT: this response contains ONLY real values produced by actual
YOLO11 inference (see app/services/detector.py). There is no
construction-progress "completion percentage" field here — a generic
pretrained COCO model cannot honestly produce one. See docs/ai-pipeline.md.
"""
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class AnalyzeImageRequest(BaseModel):
    """Request body for POST /api/v1/analyze."""

    image_url: HttpUrl = Field(
        ..., description="Short-lived signed URL of the construction-site image to analyze."
    )
    image_id: str | None = Field(
        default=None, description="ConstructionImage id, for logging/traceability only."
    )
    project_id: str | None = Field(
        default=None, description="Project id, for logging/traceability only."
    )
    include_annotated_image: bool = Field(
        default=True,
        description="Whether to return a base64-encoded JPEG with detections drawn on it.",
    )


class Detection(BaseModel):
    """One object detected in the image by YOLO11. Every field comes
    directly from real model output."""

    class_id: int
    class_name: str
    confidence: float = Field(ge=0, le=1)
    bbox: tuple[float, float, float, float] = Field(
        description="Bounding box as (x1, y1, x2, y2) in pixel coordinates of the original image."
    )


class ImageDimensions(BaseModel):
    width: int
    height: int


class AnalyzeImageResponse(BaseModel):
    """Response body for POST /api/v1/analyze."""

    success: Literal[True] = True
    model: str = Field(description="Filename of the YOLO11 checkpoint used, e.g. 'yolo11n.pt'.")
    image: ImageDimensions
    detections: list[Detection]
    object_counts: dict[str, int] = Field(
        description="Deterministic aggregation of `detections` by class_name, e.g. {'person': 8}."
    )
    average_confidence: float | None = Field(
        default=None,
        ge=0,
        le=1,
        description="Mean confidence across all detections; null (not 0) if none were found.",
    )
    analysis_summary: str = Field(
        description="A short, factual description of what was detected — never a construction-progress claim."
    )
    processing_time_ms: int = Field(description="Wall-clock YOLO11 inference time, in milliseconds.")
    annotated_image_base64: str | None = Field(
        default=None,
        description="Base64-encoded JPEG with bounding boxes/labels drawn, if requested and generation succeeded.",
    )


class AnalysisErrorResponse(BaseModel):
    success: Literal[False] = False
    error: dict[str, str]
