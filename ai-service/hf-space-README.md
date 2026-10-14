---
title: ConstructTrack AI Service
emoji: 🏗️
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# ConstructTrack AI Service

FastAPI + YOLO11 (Ultralytics, COCO-pretrained) object detection for the
ConstructTrack construction progress monitoring system.

- `GET  /api/v1/health` — service and model status
- `POST /api/v1/analyze` — `{ "image_url": "..." }` → detections, counts,
  confidence, annotated image

When the `SERVICE_API_KEY` secret is set on this Space, `/api/v1/analyze`
requires the same value in an `X-API-Key` header.

> Copy this file into the root of the Hugging Face Space as `README.md`
> (the YAML header above is what tells Spaces to build the Dockerfile).
