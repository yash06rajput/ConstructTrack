class ImageDownloadError(Exception):
    """Raised when the source image cannot be fetched (network error, too
    large, non-2xx response, etc.)."""


class ImageDecodeError(Exception):
    """Raised when fetched bytes cannot be decoded as a real image, or are
    not one of the supported formats."""


class ModelLoadError(Exception):
    """Raised when the YOLO11 model file cannot be loaded (missing file,
    corrupt checkpoint, download failure, unsupported architecture, ...)."""


class InferenceError(Exception):
    """Raised when YOLO11 inference itself throws an unexpected exception
    on an otherwise-valid, decoded image."""
