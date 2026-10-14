"""
Application configuration, loaded from environment variables.

Real YOLO11 model configuration. Centralizing it here
means the model path/thresholds are never hardcoded/scattered elsewhere in
the codebase (detector.py, image_analysis.py, tests) — everything reads
from `settings`.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Construction Progress AI Service"
    api_v1_prefix: str = "/api/v1"

    # CORS: allow the Next.js app to call this service directly in dev.
    allowed_origins: list[str] = ["http://localhost:3000"]

    # Optional shared secret for public deployments (e.g. a Hugging Face
    # Space). When set, every /api/v1/* request except /health must send it
    # in the X-API-Key header; the Next.js app sends AI_SERVICE_API_KEY.
    # Unset (the default, and in tests/local dev) means no key is required.
    service_api_key: str | None = None

    # --- YOLO11 model configuration ---
    # A lightweight, genuinely-pretrained (COCO, 80 classes) Ultralytics
    # YOLO11 checkpoint. This is a GENERIC object detector, not a
    # construction-progress model — see docs/ai-pipeline.md for what that
    # does and does not mean for this project's claims.
    #
    # Resolution order: if `yolo_model_path` points at a file that already
    # exists (e.g. ai-service/models/yolo11n.pt, downloaded once), that
    # file is loaded directly. Otherwise the value is passed straight to
    # `ultralytics.YOLO(...)`, which uses the normal Ultralytics download
    # mechanism to fetch the named checkpoint (e.g. "yolo11n.pt") from the
    # official Ultralytics GitHub releases on first use.
    yolo_model_path: str = "models/yolo11n.pt"

    # Confidence / IoU thresholds passed straight to YOLO11 inference.
    # Sensible Ultralytics defaults; not tuned for construction imagery
    # (no construction-specific model exists yet).
    yolo_confidence_threshold: float = 0.25
    yolo_iou_threshold: float = 0.45

    # Maximum image dimension (longest side, px) fed to the model. Keeps
    # inference fast/bounded on a modest local machine; YOLO letterboxes
    # internally regardless, this just avoids handing it huge raw images.
    yolo_max_image_dimension: int = 1280

    # --- Image download (SSRF-aware) ---
    # The Next.js app sends a short-lived signed Supabase Storage URL; this
    # service downloads it, so a size cap and content-type/byte sniffing
    # are enforced rather than trusting the caller or Content-Type header.
    max_image_download_bytes: int = 15 * 1024 * 1024  # 15 MB
    image_download_timeout_seconds: float = 15.0

    # Version string reported in every analysis response and in
    # AIAnalysis.modelVersion. Derived from yolo_model_path so it always
    # matches the file actually loaded.
    @property
    def model_version(self) -> str:
        return self.yolo_model_path.rsplit("/", 1)[-1]


settings = Settings()
