import logging
from contextlib import asynccontextmanager

import secrets

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import api_router
from app.config import settings
from app.services.detector import get_detector
from app.utils.errors import ModelLoadError

logger = logging.getLogger("ai-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the YOLO11 model once at startup and reuse it for every
    # request, rather than instantiating it per-request. If loading fails
    # here (e.g. the model file/download is unavailable), the service
    # still starts — GET /health will honestly report model_loaded=false
    # and POST /analyze will retry the load (and return 503 with a clear
    # error if it still fails) rather than the whole process refusing to
    # boot.
    try:
        get_detector()
        logger.info("YOLO11 model loaded successfully (%s).", settings.model_version)
    except ModelLoadError as exc:
        logger.error("YOLO11 model failed to load at startup: %s", exc)
    yield


app = FastAPI(
    title=settings.app_name,
    description=(
        "Computer-vision service for the AI-Based Construction Progress "
        "Monitoring and Delay Prediction System. Performs OpenCV image "
        "preprocessing and real YOLO11 object-detection inference on "
        "construction-site images. Business logic, database access, and "
        "Supabase Storage integration live in the Next.js app — this "
        "service only performs CV analysis and never touches Postgres or "
        "Supabase credentials directly."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.middleware("http")
async def require_api_key(request: Request, call_next):
    """Enforce the optional shared secret on analysis endpoints."""
    expected = settings.service_api_key
    path = request.url.path
    if (
        expected
        and path.startswith(settings.api_v1_prefix)
        and not path.endswith("/health")
        and request.method != "OPTIONS"
    ):
        provided = request.headers.get("x-api-key", "")
        if not secrets.compare_digest(provided, expected):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid API key."},
            )
    return await call_next(request)


app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/")
def root():
    return {
        "service": settings.app_name,
        "status": "running",
        "docs": "/docs",
    }
