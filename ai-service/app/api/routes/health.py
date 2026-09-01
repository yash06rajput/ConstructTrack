from fastapi import APIRouter

from app.config import settings
from app.services.detector import get_load_error, is_model_loaded

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """Reports whether the YOLO11 model is loaded and ready, without
    performing any inference. Does not expose filesystem paths or other
    environment details beyond the checkpoint filename."""
    loaded = is_model_loaded()
    response = {
        "status": "ok",
        "model_loaded": loaded,
        "model": settings.model_version,
    }
    if not loaded:
        load_error = get_load_error()
        if load_error:
            response["model_load_error"] = load_error
    return response
