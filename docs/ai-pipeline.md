# AI pipeline (Prompt 4)

This document explains the real computer-vision pipeline added in Prompt
4, and — just as importantly for academic honesty — what it does and does
not claim to do.

## Pipeline

```
Construction image (Supabase Storage, private bucket)
        │
        ▼
Next.js: POST /api/analysis { constructionImageId }
        │  - validate image/project exist (DB)
        │  - guard against a second concurrent run (409 CONFLICT if PROCESSING)
        │  - mark ConstructionImage.analysisStatus = PROCESSING
        │  - generate a short-lived signed Supabase Storage URL (server-side only)
        ▼
FastAPI: POST /api/v1/analyze { image_url, image_id, project_id }
        │  - download the image (streamed, size-capped, magic-byte sniffed —
        │    Content-Type is never trusted alone)
        │  - decode with OpenCV (cv2.imdecode)
        │  - resize so the longest side is ≤ YOLO_MAX_IMAGE_DIMENSION (no distortion)
        │  - run real YOLO11 inference (Ultralytics, model loaded once at startup)
        │  - aggregate detections into object_counts (pure, testable function)
        │  - optionally draw boxes/labels on a COPY of the image (OpenCV) and
        │    return it as base64 JPEG — the original upload is never modified
        ▼
Next.js: persists the real result
        │  - upserts AIAnalysis (status, model, detections, object_counts,
        │    average_confidence, summary, processingTimeMs)
        │  - if an annotated image was returned, uploads it to Supabase Storage
        │    as a SEPARATE object (projects/{projectId}/images/{imageId}/analysis/{uuid}.jpg)
        │    and stores its storage path (not a permanent URL)
        │  - marks ConstructionImage.analysisStatus = COMPLETED | FAILED
        ▼
UI: Construction Image → "Analyze with AI" → live results
        (Model, status, processed-at, processing time, detected-object counts,
         per-detection confidence/bbox table, annotated image)
```

This is a **synchronous** request/response design: the `/api/analysis`
POST awaits the FastAPI call and returns the final result directly. No
queue, worker, or polling loop was introduced — appropriate for this
project's scale, per the brief's own guidance to avoid unnecessary
infrastructure.

## What the current AI can genuinely do

- Real object detection using **YOLO11n** (Ultralytics, COCO-pretrained,
  80 classes — person, car, truck, bus, bicycle, ...), run on the actual
  decoded image bytes.
- Genuine per-detection **confidence scores** and **bounding boxes**,
  taken directly from model output.
- Deterministic **object counting** (`{class_name: count}`), computed from
  the real detections by a pure, unit-tested aggregation function.
- An **annotated visualization** (boxes + labels + confidence drawn with
  OpenCV) as a separate image, when detections were found.
- Honest "unavailable" states: an image with zero detections reports
  `average_confidence: null` and an explicit "No objects were detected"
  summary — never a fabricated 0% or a guessed value.

## What it deliberately does NOT do (yet)

**YOLO11n here is a generic, COCO-pretrained object detector — not a
construction-progress model.** No construction dataset or construction-
specific fine-tuning exists yet. Concretely, this pipeline does not, and
must not be read to, produce:

- A construction **completion percentage** (e.g. "73% complete"). The
  `AIAnalysis.completionPercentage` column from Prompt 1 is kept (nullable)
  for schema continuity but is intentionally left `null` — computing it
  from generic object counts would be scientifically unjustified.
- **Delay prediction** — that remains the separate, transparent rule-based
  system in `docs/delay-prediction.md`, driven by `ProgressRecord`
  deviation, not by this CV pipeline.
- **Construction-stage classification** (foundation vs. framing vs.
  finishing, etc.) — COCO's 80 classes don't include construction-phase
  concepts at all.
- Automated report generation / PDF export.

## Swapping in a construction-specific model later

The detection backend is behind an abstraction so a future domain-trained
model doesn't require touching the API or persistence layer:

```
ModelAdapter (interface)  →  YOLO11Detector (current, generic COCO model)
                           →  <FutureConstructionModel> (implements the same interface)
```

`app/services/detector.py`'s `get_detector()` is the single place that
decides which concrete adapter is constructed (driven by
`YOLO_MODEL_PATH`); `image_analysis.py`, the API route, and everything on
the Next.js side only depend on the `DetectionResult` shape, not on YOLO11
specifically.

## Configuration

All model/runtime settings are centralized in `ai-service/app/config.py`
(no hardcoded paths/thresholds scattered through the codebase):

| Variable | Default | Purpose |
|---|---|---|
| `YOLO_MODEL_PATH` | `models/yolo11n.pt` | Local checkpoint path, or a name Ultralytics can download |
| `YOLO_CONFIDENCE_THRESHOLD` | `0.25` | Minimum detection confidence kept |
| `YOLO_IOU_THRESHOLD` | `0.45` | Non-max-suppression IoU threshold |
| `YOLO_MAX_IMAGE_DIMENSION` | `1280` | Longest side an image is downscaled to before inference |
| `MAX_IMAGE_DOWNLOAD_BYTES` | 15 MB | Cap enforced while streaming the download |
| `IMAGE_DOWNLOAD_TIMEOUT_SECONDS` | `15.0` | Download timeout |

## Security notes specific to this pipeline

- The Python service never receives Supabase service-role credentials or
  database access — only a short-lived signed URL plus the image/project
  ids (for logging/traceability only).
- The image download is not an open SSRF primitive: only `http`/`https`
  URLs are accepted (Pydantic `HttpUrl`), the body is size-capped while
  streaming, and `Content-Type` is never trusted — the bytes are sniffed
  and then authoritatively validated by `cv2.imdecode`.
- `GET /api/v1/health` reports `model_loaded`/`model` only — it never runs
  inference and never exposes filesystem paths beyond the checkpoint's
  base filename.
