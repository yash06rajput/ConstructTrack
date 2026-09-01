from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check_reports_model_status():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert isinstance(body["model_loaded"], bool)
    assert isinstance(body["model"], str)
    # Health must never perform inference or leak filesystem paths.
    assert "/" not in body["model"]


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"
