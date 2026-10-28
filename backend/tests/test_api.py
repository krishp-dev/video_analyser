import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

def test_health_endpoint(client):
    """Test health check returns safe status and hardware metadata."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "hardware" in data
    assert "tools" in data
    assert "models" in data

def test_root_endpoint(client):
    """Test API root."""
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"

def test_invalid_analysis_id_returns_404(client):
    """Test that requesting nonexistent analysis returns 404."""
    res = client.get("/api/analyses/nonexistent-id-12345")
    assert res.status_code == 404

def test_upload_rejects_empty_file(client):
    """Test upload validation rejects 0-byte file."""
    files = {"file": ("empty.mp4", io.BytesIO(b""), "video/mp4")}
    res = client.post("/api/videos/upload", files=files)
    assert res.status_code in [400, 422]

def test_upload_rejects_invalid_extension(client):
    """Test upload validation rejects executable or text files."""
    files = {"file": ("script.py", io.BytesIO(b"print('hello')"), "text/x-python")}
    res = client.post("/api/videos/upload", files=files)
    assert res.status_code == 400

def test_full_analysis_workflow_end_to_end(client, tmp_path):
    """
    End-to-end integration test:
    1. Upload valid video
    2. Start analysis
    3. Poll until completed
    4. Fetch full analysis detail
    5. Test JSON and CSV export
    6. Delete analysis and verify cleanup
    """
    import cv2
    import numpy as np
    import time

    # Create a small valid mp4 video
    test_video_path = tmp_path / "e2e_video.mp4"
    width, height = 320, 240
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(test_video_path), fourcc, 30, (width, height))
    for i in range(45): # 1.5 seconds
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        color = (200, 100, 50) if i < 20 else (50, 150, 220)
        frame[:, :] = color
        cv2.putText(frame, f"Frame {i}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        out.write(frame)
    out.release()

    with open(test_video_path, "rb") as f:
        upload_res = client.post("/api/videos/upload", files={"file": ("e2e_video.mp4", f, "video/mp4")})

    assert upload_res.status_code == 200
    video_id = upload_res.json()["video"]["id"]

    # Start analysis (disable captioning in fast unit test to avoid external model download delay)
    start_res = client.post("/api/analyses", json={
        "video_id": video_id,
        "config": {
            "sample_rate_fps": 1.0,
            "enable_captioning": False,
            "max_keyframes": 5
        }
    })
    assert start_res.status_code == 200
    analysis_id = start_res.json()["analysis_id"]

    # Poll status until terminal state
    max_wait = 20
    status_data = None
    for _ in range(max_wait):
        poll_res = client.get(f"/api/analyses/{analysis_id}/status")
        assert poll_res.status_code == 200
        status_data = poll_res.json()
        if status_data["status"] in ["completed", "completed_with_warnings", "failed"]:
            break
        time.sleep(1)

    assert status_data["status"] in ["completed", "completed_with_warnings"]
    assert status_data["progress_percentage"] == 100.0

    # Fetch detail
    detail_res = client.get(f"/api/analyses/{analysis_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["analysis_id"] == analysis_id
    assert len(detail["keyframes"]) > 0
    assert detail["summary"] is not None

    # Export JSON
    exp_json = client.get(f"/api/analyses/{analysis_id}/export?format=json")
    assert exp_json.status_code == 200
    assert "e2e_video.mp4" in exp_json.text

    # Export CSV
    exp_csv = client.get(f"/api/analyses/{analysis_id}/export?format=csv")
    assert exp_csv.status_code == 200
    assert "analysis_id" in exp_csv.text

    # Delete analysis
    del_res = client.delete(f"/api/analyses/{analysis_id}")
    assert del_res.status_code == 200

    # Verify 404 after deletion
    after_del = client.get(f"/api/analyses/{analysis_id}")
    assert after_del.status_code == 404

