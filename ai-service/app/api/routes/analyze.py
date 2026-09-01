from fastapi import APIRouter, HTTPException

from app.models.analysis import AnalyzeImageRequest, AnalyzeImageResponse
from app.services.image_analysis import analyze_image
from app.utils.errors import ImageDecodeError, ImageDownloadError, InferenceError, ModelLoadError

router = APIRouter(tags=["analysis"])


@router.post("/analyze", response_model=AnalyzeImageResponse)
def analyze(request: AnalyzeImageRequest) -> AnalyzeImageResponse:
    try:
        return analyze_image(request)
    except ImageDownloadError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ImageDecodeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except InferenceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
