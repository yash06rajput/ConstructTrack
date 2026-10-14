# AI Service — Construction Progress Monitoring

FastAPI-based computer-vision service. Downloads a construction image,
preprocesses it with OpenCV, runs real YOLO11 (Ultralytics) object-
detection inference, and returns structured, genuine detection results to
the Next.js app.

## Current status

- Full FastAPI app structure, CORS, and the `/api/v1/analyze` contract are
  implemented.
- Image download (streamed, size-capped, magic-byte-sniffed) + OpenCV
  decode is real.
- **YOLO11 inference is real.** The model (`yolo11n.pt`, Ultralytics'
  lightweight COCO-pretrained checkpoint) is loaded once at startup and
  reused per request. See [`../docs/ai-pipeline.md`](../docs/ai-pipeline.md)
  for the full pipeline and — importantly — what this generic pretrained
  model does and does not claim to detect (it does object detection, NOT
  construction-progress percentage estimation).

## Structure

```
app/
  main.py              FastAPI app, CORS, model loaded once at startup (lifespan)
  config.py            Settings (pydantic-settings) — all YOLO/thresholds centralized here
  api/routes/          HTTP route handlers (health, analyze)
  services/
    image_preprocessing.py   download (SSRF-aware) + OpenCV decode/resize
    detector.py               ModelAdapter -> YOLO11Detector (real inference)
    aggregation.py             pure object-count / confidence aggregation
    annotation.py               OpenCV bounding-box visualization
    image_analysis.py           orchestrates the full pipeline
  models/              Pydantic request/response schemas (the API contract)
  utils/               Typed errors, timing helper
tests/                 pytest tests, incl. a real end-to-end YOLO11 inference test
models/                YOLO checkpoint (yolo11n.pt) — not committed, see setup below
```

## API contract

`POST /api/v1/analyze`

Request:
```json
{
  "image_url": "https://.../signed-site-photo.jpg",
  "image_id": "optional, for logging",
  "project_id": "optional, for logging",
  "include_annotated_image": true
}
```

Response (every value here is real YOLO11 output — nothing is fabricated):
```json
{
  "success": true,
  "model": "yolo11n.pt",
  "image": { "width": 1920, "height": 1080 },
  "detections": [
    { "class_id": 0, "class_name": "person", "confidence": 0.91, "bbox": [120, 80, 340, 520] }
  ],
  "object_counts": { "person": 1 },
  "average_confidence": 0.91,
  "analysis_summary": "Detected 1 object(s): 1 person.",
  "processing_time_ms": 640,
  "annotated_image_base64": "<base64 JPEG, or null>"
}
```

`GET /api/v1/health` — liveness + `{ model_loaded, model }`. Never runs inference.

## Local setup

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# ultralytics pulls in `opencv-python` as a dependency; this project uses
# opencv-python-headless (no GUI/X11 deps needed on a server) instead —
# reinstall it after the step above so it wins:
pip uninstall -y opencv-python
pip install --force-reinstall opencv-python-headless==4.10.0.84

# Download the YOLO11n checkpoint once (~5.5 MB). If this is skipped,
# Ultralytics will attempt to download it automatically on first use.
mkdir -p models
curl -fL -o models/yolo11n.pt \
  https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt

uvicorn app.main:app --reload --port 8000
```

Visit http://localhost:8000/docs for interactive API docs.

## Tests

```bash
pytest
```

Real-model tests (in `tests/test_detector.py` and the end-to-end case in
`tests/test_analyze.py`) automatically skip with a clear reason if
`models/yolo11n.pt` isn't present, rather than being replaced by a mocked
fake result.

## Deployment

Deployed independently of the Next.js app (Railway or Render). Set
`AI_SERVICE_URL` in the Next.js app's environment to this service's public
URL once deployed. Make sure the checkpoint (`models/yolo11n.pt`) is either
included in the deployment image or downloadable at startup.

## Deployment and access control

- `Dockerfile` builds a CPU-only image (PyTorch CPU wheels, `yolo11n.pt` baked in) that runs on any Docker host (`$PORT`, default 7860). It is currently self-hosted; Hugging Face Docker Spaces are a paid option. See [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md).
- Set `SERVICE_API_KEY` to require an `X-API-Key` header on `/api/v1/analyze` when the service is publicly reachable. `/api/v1/health` stays open. Leave it unset for local development and tests.
