# Test fixtures

`sample_scene.jpg` is the standard Ultralytics demo image (bus + pedestrians),
fetched from the official ultralytics/ultralytics GitHub repo. It is used
ONLY to prove the CV pipeline (download -> decode -> YOLO11 inference ->
detections) genuinely works end-to-end in tests. It is not a construction
photo — no construction-specific test imagery/model exists yet (see
docs/ai-pipeline.md for why).
