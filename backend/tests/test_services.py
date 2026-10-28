import os
import tempfile
from pathlib import Path
import cv2
import numpy as np
import pytest

from app.services.video_service import video_service, VideoValidationError
from app.services.frame_service import frame_service
from app.services.scene_service import scene_service
from app.services.keyframe_service import keyframe_service
from app.services.summary_service import summary_service
from app.services.report_service import report_service
from app.storage.storage_service import storage_service

@pytest.fixture
def sample_video_path(tmp_path):
    """Generate a clean 2-second synthetic test video with 2 scenes."""
    video_file = tmp_path / "test_synth.mp4"
    fps = 30
    width, height = 320, 240
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(video_file), fourcc, fps, (width, height))

    # Scene 1: Blue frames (1 second = 30 frames)
    for _ in range(30):
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        frame[:, :] = (255, 0, 0)  # BGR Blue
        cv2.putText(frame, "Scene 1", (30, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        out.write(frame)

    # Scene 2: Yellow frames (1 second = 30 frames)
    for _ in range(30):
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        frame[:, :] = (0, 255, 255)  # BGR Yellow
        cv2.putText(frame, "Scene 2", (30, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        out.write(frame)

    out.release()
    return video_file

def test_video_validation_and_metadata(sample_video_path):
    """Test video container validation and metadata extraction."""
    meta = video_service.extract_and_validate(sample_video_path, "test_synth.mp4")
    assert meta["width"] == 320
    assert meta["height"] == 240
    assert meta["fps"] > 0
    assert meta["duration"] > 0
    assert meta["file_size"] > 0

def test_video_validation_rejects_corrupted(tmp_path):
    """Test that a non-video fake file is rejected by content validation."""
    fake_file = tmp_path / "fake.mp4"
    fake_file.write_text("This is plain text and definitely not a video file.")
    with pytest.raises(VideoValidationError):
        video_service.extract_and_validate(fake_file, "fake.mp4")

def test_frame_sampling(sample_video_path):
    """Test sampling frames from video at configured fps interval."""
    analysis_id = "test_analysis_sample"
    frames = frame_service.sample_frames(
        video_path=sample_video_path,
        analysis_id=analysis_id,
        sample_rate_fps=1.0,
        max_samples=10
    )
    assert len(frames) >= 1
    assert all("timestamp" in f for f in frames)
    assert all(Path(f["file_path"]).exists() for f in frames)
    # Cleanup frames
    storage_service.delete_analysis_files(analysis_id)

def test_scene_change_detection(tmp_path):
    """Test scene change detection on visually contrasting frames."""
    analysis_id = "test_scene_diff"
    # Create blue frame and yellow frame
    f1_path = tmp_path / "frame1.jpg"
    f2_path = tmp_path / "frame2.jpg"

    f1 = np.zeros((100, 100, 3), dtype=np.uint8)
    f1[:, :] = (255, 0, 0)
    cv2.imwrite(str(f1_path), f1)

    f2 = np.zeros((100, 100, 3), dtype=np.uint8)
    f2[:, :] = (0, 255, 255)
    cv2.imwrite(str(f2_path), f2)

    diff = scene_service.calculate_frame_difference(f1_path, f2_path)
    assert diff > 0.35  # High contrast scene change

    sampled = [
        {"id": "f1", "file_path": str(f1_path), "timestamp": 0.0, "frame_index": 0},
        {"id": "f2", "file_path": str(f2_path), "timestamp": 1.0, "frame_index": 30}
    ]
    candidates = scene_service.detect_candidate_scenes(sampled, analysis_id, threshold=0.30)
    assert len(candidates) == 1
    assert candidates[0]["timestamp"] == 1.0

def test_summary_generation():
    """Test deterministic summary generation from evidence."""
    video_meta = {"duration": 15.0, "sample_rate_fps": 1.0, "width": 640, "height": 480}
    sampled_frames = [{"id": f"f_{i}", "timestamp": float(i)} for i in range(5)]
    detections = [
        {"id": "d1", "class_name": "car", "confidence": 0.88, "timestamp": 1.0, "frame_id": "f_1"},
        {"id": "d2", "class_name": "car", "confidence": 0.92, "timestamp": 2.0, "frame_id": "f_2"},
        {"id": "d3", "class_name": "person", "confidence": 0.75, "timestamp": 2.0, "frame_id": "f_2"}
    ]
    captions = [
        {"frame_id": "f_1", "timestamp": 1.0, "caption_text": "A car parked on the street", "status": "completed"}
    ]
    scene_candidates = [
        {"timestamp": 2.0, "frame_index": 60, "difference_score": 0.55, "reason": "Shift"}
    ]

    summary = summary_service.generate_summary(
        video_metadata=video_meta,
        sampled_frames=sampled_frames,
        detections=detections,
        captions=captions,
        scene_candidates=scene_candidates
    )

    assert "car" in summary["frequently_detected_objects"]
    assert len(summary["chronological_observations"]) > 0
    assert len(summary["limitations"]) > 0
    assert "Evidence base" in summary["evidence_statement"]

def test_report_exports():
    """Test JSON and CSV exports."""
    mock_data = {
        "analysis_id": "test_exp_123",
        "video": {"original_name": "demo.mp4"},
        "detections": [
            {"timestamp": 1.5, "frame_id": "f1", "class_name": "dog", "confidence": 0.89, "bbox": [10, 20, 100, 200], "model_name": "yolov8n"}
        ],
        "scene_candidates": [
            {"timestamp": 3.0, "frame_index": 90, "difference_score": 0.45, "reason": "Cut"}
        ],
        "captions": [
            {"timestamp": 1.5, "frame_id": "f1", "caption_text": "A dog running in grass"}
        ]
    }
    json_rep = report_service.export_json(mock_data)
    assert "test_exp_123" in json_rep

    csv_rep = report_service.export_csv(mock_data)
    assert "dog" in csv_rep
    assert "timestamp_seconds" in csv_rep
