import shutil
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.services.scene_service import scene_service
from app.services.detection_service import detection_service
from app.storage.storage_service import storage_service

class KeyframeService:
    @classmethod
    def select_keyframes(
        cls,
        sampled_frames: List[Dict[str, Any]],
        scene_candidates: List[Dict[str, Any]],
        detections: List[Dict[str, Any]],
        captions: List[Dict[str, Any]],
        analysis_id: str,
        max_keyframes: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Explainable keyframe selection combining scene changes, detection diversity,
        and temporal coverage with deduplication.
        """
        if not sampled_frames:
            return []

        # Index detections and captions by frame_id
        dets_by_frame: Dict[str, List[Dict[str, Any]]] = {}
        for d in detections:
            dets_by_frame.setdefault(d["frame_id"], []).append(d)

        caps_by_frame: Dict[str, str] = {}
        for c in captions:
            if c.get("status") == "completed":
                caps_by_frame[c["frame_id"]] = c["caption_text"]

        # Map scene change timestamps
        scene_timestamps = {round(s["timestamp"], 1) for s in scene_candidates}

        candidate_pool: List[Dict[str, Any]] = []

        # 1. First frame is always a baseline
        candidate_pool.append({
            "frame": sampled_frames[0],
            "reason": "Initial frame (video start anchor)",
            "priority": 10
        })

        # 2. Add scene change frames
        for frame in sampled_frames:
            t = round(frame["timestamp"], 1)
            if t in scene_timestamps:
                candidate_pool.append({
                    "frame": frame,
                    "reason": f"Candidate scene change detected at t={frame['timestamp']}s",
                    "priority": 8
                })

        # 3. Add frames with highest detection diversity
        frames_by_det_count = sorted(
            sampled_frames,
            key=lambda f: len(dets_by_frame.get(f["id"], [])),
            reverse=True
        )
        for frame in frames_by_det_count[:3]:
            det_count = len(dets_by_frame.get(frame["id"], []))
            if det_count > 0 and not any(c["frame"]["id"] == frame["id"] for c in candidate_pool):
                classes = list({d["class_name"] for d in dets_by_frame[frame["id"]]})
                candidate_pool.append({
                    "frame": frame,
                    "reason": f"High detection density ({det_count} instances: {', '.join(classes[:3])})",
                    "priority": 6
                })

        # 4. Add uniform temporal anchors to ensure full temporal coverage
        n_frames = len(sampled_frames)
        if n_frames > 2:
            step = max(1, n_frames // min(max_keyframes, 5))
            for i in range(step, n_frames, step):
                frame = sampled_frames[i]
                if not any(c["frame"]["id"] == frame["id"] for c in candidate_pool):
                    candidate_pool.append({
                        "frame": frame,
                        "reason": f"Representative temporal anchor at t={frame['timestamp']}s",
                        "priority": 4
                    })

        # Sort pool by timestamp
        candidate_pool.sort(key=lambda x: x["frame"]["timestamp"])

        # 5. Deduplication pass using visual difference
        selected: List[Dict[str, Any]] = []
        for cand in candidate_pool:
            frame = cand["frame"]
            # Check visual distance against already selected frames
            is_duplicate = False
            for s in selected:
                diff = scene_service.calculate_frame_difference(
                    Path(s["frame"]["file_path"]),
                    Path(frame["file_path"])
                )
                # If difference is negligible (< 0.12) and timestamps are close, consider duplicate
                if diff < 0.12 and abs(s["frame"]["timestamp"] - frame["timestamp"]) < 5.0:
                    is_duplicate = True
                    break

            if not is_duplicate:
                selected.append(cand)

            if len(selected) >= max_keyframes:
                break

        # Final keyframe generation with previews
        keyframes = []
        for item in selected:
            frame = item["frame"]
            frame_dets = dets_by_frame.get(frame["id"], [])
            frame_cap = caps_by_frame.get(frame["id"])

            kf_id = f"kf_{frame['id']}_{str(uuid.uuid4())[:6]}"
            kf_preview_path = storage_service.get_keyframe_path(analysis_id, kf_id)

            # Generate overlay preview if detections exist, otherwise copy clean frame
            if frame_dets:
                detection_service.draw_detections_on_image(
                    Path(frame["file_path"]),
                    frame_dets,
                    kf_preview_path
                )
            else:
                shutil.copy2(frame["file_path"], kf_preview_path)

            keyframes.append({
                "id": kf_id,
                "analysis_id": analysis_id,
                "frame_id": frame["id"],
                "timestamp": frame["timestamp"],
                "preview_path": str(kf_preview_path),
                "selection_reason": item["reason"],
                "detections_count": len(frame_dets),
                "caption_text": frame_cap,
                "detections": frame_dets
            })

        return keyframes

keyframe_service = KeyframeService()
