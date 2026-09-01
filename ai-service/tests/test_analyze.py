from fastapi.testclient import TestClient

from app.main import app
from tests.test_detector import requires_model

client = TestClient(app)


def test_analyze_rejects_invalid_body():
    response = client.post("/api/v1/analyze", json={})
    assert response.status_code == 422


def test_analyze_rejects_unreachable_url():
    response = client.post(
        "/api/v1/analyze",
        json={"image_url": "https://example.invalid/does-not-exist.jpg"},
    )
    # Download failure -> 422, handled explicitly rather than a raw 500.
    assert response.status_code == 422


def test_analyze_rejects_non_image_url(fixture_image_server):
    # This fixtures dir also has a README.md — a real, reachable URL that
    # is genuinely not an image. Confirms Content-Type is never trusted.
    response = client.post(
        "/api/v1/analyze",
        json={"image_url": f"{fixture_image_server}/README.md"},
    )
    assert response.status_code == 422


@requires_model
def test_analyze_end_to_end_real_inference(fixture_image_server):
    """Full pipeline through the actual HTTP route: real download, real
    OpenCV decode, real YOLO11 inference, real aggregation — no part of
    this response is fabricated or mocked."""
    response = client.post(
        "/api/v1/analyze",
        json={
            "image_url": f"{fixture_image_server}/sample_scene.jpg",
            "image_id": "test-image-id",
            "project_id": "test-project-id",
        },
    )
    assert response.status_code == 200
    body = response.json()

    assert body["success"] is True
    assert body["model"] == "yolo11n.pt"
    assert body["image"]["width"] > 0
    assert body["image"]["height"] > 0
    assert len(body["detections"]) > 0
    assert isinstance(body["object_counts"], dict)
    assert sum(body["object_counts"].values()) == len(body["detections"])
    assert body["average_confidence"] is not None
    assert 0.0 <= body["average_confidence"] <= 1.0
    assert body["processing_time_ms"] >= 0
    # Annotated image is a bonus feature — if present, it must be a real
    # base64-encoded JPEG, not a placeholder string.
    if body["annotated_image_base64"] is not None:
        import base64

        decoded = base64.b64decode(body["annotated_image_base64"])
        assert decoded[:3] == b"\xff\xd8\xff"


@requires_model
def test_analyze_can_skip_annotated_image(fixture_image_server):
    response = client.post(
        "/api/v1/analyze",
        json={
            "image_url": f"{fixture_image_server}/sample_scene.jpg",
            "include_annotated_image": False,
        },
    )
    assert response.status_code == 200
    assert response.json()["annotated_image_base64"] is None
