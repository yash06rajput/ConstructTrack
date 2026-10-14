# ConstructTrack AI service (FastAPI + YOLO11, CPU-only).
#
# Works as-is on a Hugging Face Space (Docker SDK, free CPU tier) and on
# Render / Railway / any Docker host. Listens on $PORT (default 7860, the
# port Hugging Face Spaces expects).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=7860 \
    YOLO_CONFIG_DIR=/tmp/Ultralytics

RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 libgl1 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU-only PyTorch first (the default PyPI wheel bundles ~2 GB of CUDA).
RUN pip install --index-url https://download.pytorch.org/whl/cpu \
        torch==2.5.1 torchvision==0.20.1

COPY requirements.txt .
RUN pip install -r requirements.txt \
    && (pip uninstall -y opencv-python || true) \
    && pip install --force-reinstall --no-deps opencv-python-headless==4.10.0.84

# Bake the pretrained YOLO11n checkpoint into the image so the service never
# downloads it at request time.
RUN mkdir -p models \
    && curl -fsSL -o models/yolo11n.pt \
       https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt

COPY app ./app

# Hugging Face Spaces run containers as a non-root user (uid 1000).
RUN useradd -m -u 1000 appuser && chown -R appuser /app
USER appuser

EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
