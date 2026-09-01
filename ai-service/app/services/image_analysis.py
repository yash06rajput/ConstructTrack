"""
Orchestrates one image analysis request:

  download -> decode (OpenCV) -> resize-for-inference -> YOLO11 inference
  -> aggregate counts -> (optional) annotate -> structured response

Every numeric/text value in the response is derived from the actual
decoded image and actual model output. Nothing here fabricates a result —
if a step fails, it raises rather than returning a plausible-looking guess.
"""
import base64

from app.config import settings
from app.models.analysis import (
    AnalyzeImageRequest,
    AnalyzeImageResponse,
    Detection as DetectionSchema,
    ImageDimensions,
)
from app.services.aggregation import average_confidence, build_summary, count_objects
from app.services.annotation import draw_detections, encode_jpeg
from app.services.detector import get_detector
from app.services.image_preprocessing import load_image_from_url, resize_for_inference


def analyze_image(request: AnalyzeImageRequest) -> AnalyzeImageResponse:
    detector = get_detector()  # raises ModelLoadError if unavailable

    image = load_image_from_url(str(request.image_url))
    inference_image = resize_for_inference(image, settings.yolo_max_image_dimension)

    result = detector.detect(inference_image)  # raises InferenceError on failure

    object_counts = count_objects(result.detections)
    summary = build_summary(result.detections, object_counts)
    avg_confidence = average_confidence(result.detections)

    annotated_b64: str | None = None
    if request.include_annotated_image and result.detections:
        try:
            annotated = draw_detections(inference_image, result.detections)
            annotated_bytes = encode_jpeg(annotated)
            annotated_b64 = base64.b64encode(annotated_bytes).decode("ascii")
        except Exception:
            # Annotation is a bonus visualization, not core inference —
            # a failure here must not fail the whole analysis.
            annotated_b64 = None

    return AnalyzeImageResponse(
        success=True,
        model=result.model_version,
        image=ImageDimensions(width=result.image_width, height=result.image_height),
        detections=[
            DetectionSchema(
                class_id=d.class_id,
                class_name=d.class_name,
                confidence=d.confidence,
                bbox=d.bbox,
            )
            for d in result.detections
        ],
        object_counts=object_counts,
        average_confidence=avg_confidence,
        analysis_summary=summary,
        processing_time_ms=result.inference_time_ms,
        annotated_image_base64=annotated_b64,
    )
