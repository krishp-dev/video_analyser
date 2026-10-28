import json
import time
from urllib.request import Request, urlopen
from pathlib import Path

def test_live():
    video_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_video.mp4"
    assert video_path.exists(), f"Sample video not found at {video_path}"

    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    data = bytearray()
    data.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"sample_video.mp4\"\r\nContent-Type: video/mp4\r\n\r\n".encode("utf-8"))
    with open(video_path, "rb") as f:
        data.extend(f.read())
    data.extend(f"\r\n--{boundary}--\r\n".encode("utf-8"))

    print("Uploading sample video to http://127.0.0.1:8000/api/videos/upload ...")
    req = Request(
        "http://127.0.0.1:8000/api/videos/upload",
        data=bytes(data),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urlopen(req) as res:
        video_info = json.loads(res.read().decode("utf-8"))
    
    video_id = video_info["video"]["id"]
    print("Uploaded video ID:", video_id, "| Duration:", video_info["video"]["duration"])

    print("Starting analysis job...")
    req_start = Request(
        "http://127.0.0.1:8000/api/analyses",
        data=json.dumps({
            "video_id": video_id,
            "config": {
                "sample_rate_fps": 1.0,
                "enable_captioning": False,
                "max_keyframes": 5
            }
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urlopen(req_start) as res:
        analysis_info = json.loads(res.read().decode("utf-8"))
    
    analysis_id = analysis_info["analysis_id"]
    print("Started analysis ID:", analysis_id)

    # Poll status
    for _ in range(25):
        with urlopen(f"http://127.0.0.1:8000/api/analyses/{analysis_id}/status") as res:
            status = json.loads(res.read().decode("utf-8"))
        print(f"Stage: {status['stage']} | Progress: {status['progress_percentage']}%")
        if status["status"] in ["completed", "completed_with_warnings", "failed"]:
            break
        time.sleep(1)

    assert status["status"] in ["completed", "completed_with_warnings"], f"Job ended in status {status['status']}"

    # Fetch detail
    with urlopen(f"http://127.0.0.1:8000/api/analyses/{analysis_id}") as res:
        detail = json.loads(res.read().decode("utf-8"))

    print("\n--- LIVE VERIFICATION RESULTS ---")
    print("Status:", detail["status"])
    print("Keyframes Extracted:", len(detail["keyframes"]))
    print("Scene Candidates:", len(detail["scene_candidates"]))
    print("Executive Summary:", detail["summary"]["overall_description"])
    print("Chronological Observations Count:", len(detail["summary"]["chronological_observations"]))
    print("Evidence Statement:", detail["summary"]["evidence_statement"])
    print("ALL LIVE WORKFLOW STEPS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    test_live()
