import time
import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

from app.db.database import get_db
from app.config import settings
from app.services.video_service import video_service
from app.services.frame_service import frame_service
from app.services.scene_service import scene_service
from app.services.detection_service import detection_service
from app.services.caption_service import caption_service
from app.services.keyframe_service import keyframe_service
from app.services.summary_service import summary_service

class AnalysisWorker:
    def __init__(self):
        self._active_jobs: Dict[str, threading.Event] = {}
        self._lock = threading.Lock()

    def is_cancelled(self, analysis_id: str) -> bool:
        with self._lock:
            stop_evt = self._active_jobs.get(analysis_id)
            return stop_evt.is_set() if stop_evt else False

    def cancel_job(self, analysis_id: str) -> bool:
        with self._lock:
            if analysis_id in self._active_jobs:
                self._active_jobs[analysis_id].set()
                self._update_job_status(
                    analysis_id,
                    status="cancelled",
                    stage="cancelled",
                    warnings=["Analysis was cancelled by user request."]
                )
                return True
        return False

    def _update_job_status(
        self,
        analysis_id: str,
        status: str,
        stage: str,
        current: int = 0,
        total: int = 0,
        percentage: float = 0.0,
        warnings: Optional[list[str]] = None,
        errors: Optional[list[str]] = None,
        summary_text: Optional[str] = None,
        duration: Optional[float] = None
    ):
        with get_db() as conn:
            # Fetch existing warnings & errors
            row = conn.execute(
                "SELECT warnings_json, errors_json FROM analysis_jobs WHERE id = ?",
                (analysis_id,)
            ).fetchone()

            existing_warnings = json.loads(row["warnings_json"]) if row and row["warnings_json"] else []
            existing_errors = json.loads(row["errors_json"]) if row and row["errors_json"] else []

            if warnings:
                for w in warnings:
                    if w not in existing_warnings:
                        existing_warnings.append(w)
            if errors:
                for e in errors:
                    if e not in existing_errors:
                        existing_errors.append(e)

            now_str = datetime.now(timezone.utc).isoformat()
            completed_str = now_str if status in ["completed", "completed_with_warnings", "failed", "cancelled"] else None

            conn.execute("""
                UPDATE analysis_jobs
                SET status = ?,
                    stage = ?,
                    progress_current = ?,
                    progress_total = ?,
                    progress_percentage = ?,
                    warnings_json = ?,
                    errors_json = ?,
                    summary_text = COALESCE(?, summary_text),
                    processing_duration = COALESCE(?, processing_duration),
                    completed_at = COALESCE(?, completed_at)
                WHERE id = ?
            """, (
                status,
                stage,
                current,
                total,
                round(percentage, 1),
                json.dumps(existing_warnings),
                json.dumps(existing_errors),
                summary_text,
                duration,
                completed_str,
                analysis_id
            ))

    def run_pipeline(self, analysis_id: str):
        stop_event = threading.Event()
        with self._lock:
            self._active_jobs[analysis_id] = stop_event

        start_time = time.time()
        job_warnings: list[str] = []

        try:
            # 1. Fetch Video record and config
            with get_db() as conn:
                job_row = conn.execute("SELECT * FROM analysis_jobs WHERE id = ?", (analysis_id,)).fetchone()
                if not job_row:
                    return
                video_row = conn.execute("SELECT * FROM videos WHERE id = ?", (job_row["video_id"],)).fetchone()
                if not video_row:
                    self._update_job_status(analysis_id, "failed", "failed", errors=["Associated video record missing."])
                    return

            config = json.loads(job_row["config_json"])
            video_path = Path(video_row["storage_path"])
            sample_rate = float(config.get("sample_rate_fps", 1.0))
            conf_thresh = float(config.get("confidence_threshold", 0.25))
            max_kf = int(config.get("max_keyframes", 10))
            enable_caption = bool(config.get("enable_captioning", True))
            max_caps = int(config.get("max_captions", 15))
            scene_thresh = float(config.get("scene_threshold", 0.35))

            # STAGE: Validating
            self._update_job_status(analysis_id, "validating", "validating", 0, 100, 5.0)
            if self.is_cancelled(analysis_id):
                return

            if not video_path.exists():
                raise FileNotFoundError(f"Video file not found at {video_path}")

            # STAGE: Extracting Frames
            self._update_job_status(analysis_id, "extracting_frames", "extracting_frames", 0, 100, 10.0)
            if self.is_cancelled(analysis_id):
                return

            def frame_cb(cur, tot):
                if not self.is_cancelled(analysis_id):
                    pct = 10.0 + (cur / max(1, tot)) * 20.0
                    self._update_job_status(analysis_id, "extracting_frames", "extracting_frames", cur, tot, pct)

            sampled_frames = frame_service.sample_frames(
                video_path=video_path,
                analysis_id=analysis_id,
                sample_rate_fps=sample_rate,
                max_samples=settings.MAX_SAMPLES_PER_VIDEO,
                progress_callback=frame_cb
            )

            # Save sampled frames to DB
            with get_db() as conn:
                for sf in sampled_frames:
                    conn.execute("""
                        INSERT INTO sampled_frames (id, analysis_id, frame_index, timestamp, width, height, file_path, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        sf["id"], sf["analysis_id"], sf["frame_index"], sf["timestamp"],
                        sf["width"], sf["height"], sf["file_path"], sf["status"]
                    ))

            if self.is_cancelled(analysis_id):
                return

            # STAGE: Candidate Scene Detection
            self._update_job_status(analysis_id, "detecting_scenes", "detecting_scenes", 0, len(sampled_frames), 32.0)
            scene_candidates = scene_service.detect_candidate_scenes(
                sampled_frames=sampled_frames,
                analysis_id=analysis_id,
                threshold=scene_thresh
            )

            with get_db() as conn:
                for sc in scene_candidates:
                    conn.execute("""
                        INSERT INTO scene_candidates (id, analysis_id, timestamp, frame_index, difference_score, reason)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        sc["id"], sc["analysis_id"], sc["timestamp"], sc["frame_index"],
                        sc["difference_score"], sc["reason"]
                    ))

            if self.is_cancelled(analysis_id):
                return

            # STAGE: Detecting Objects
            total_sf = len(sampled_frames)
            self._update_job_status(analysis_id, "detecting_objects", "detecting_objects", 0, total_sf, 35.0)

            def det_cb(cur, tot):
                if not self.is_cancelled(analysis_id):
                    pct = 35.0 + (cur / max(1, tot)) * 30.0
                    self._update_job_status(analysis_id, "detecting_objects", "detecting_objects", cur, tot, pct)

            detections = detection_service.detect_batch(
                sampled_frames=sampled_frames,
                confidence_threshold=conf_thresh,
                progress_callback=det_cb
            )

            # Save detections to DB
            with get_db() as conn:
                for d in detections:
                    conn.execute("""
                        INSERT INTO detections (id, frame_id, analysis_id, class_name, confidence, bbox_x1, bbox_y1, bbox_x2, bbox_y2, timestamp, model_name)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        d["id"], d["frame_id"], d["analysis_id"], d["class_name"], d["confidence"],
                        d["bbox"][0], d["bbox"][1], d["bbox"][2], d["bbox"][3],
                        d["timestamp"], d["model_name"]
                    ))

            if self.is_cancelled(analysis_id):
                return

            # STAGE: Generating Captions (BLIP)
            captions = []
            if enable_caption:
                self._update_job_status(analysis_id, "generating_captions", "generating_captions", 0, 100, 68.0)
                
                # Pick frames to caption: representative scene candidates or uniform selection up to max_caps
                if len(sampled_frames) <= max_caps:
                    frames_for_caption = sampled_frames
                else:
                    step = max(1, len(sampled_frames) // max_caps)
                    frames_for_caption = sampled_frames[::step][:max_caps]

                def cap_cb(cur, tot):
                    if not self.is_cancelled(analysis_id):
                        pct = 68.0 + (cur / max(1, tot)) * 17.0
                        self._update_job_status(analysis_id, "generating_captions", "generating_captions", cur, tot, pct)

                caps, cap_warn = caption_service.caption_frames(
                    frames_to_caption=frames_for_caption,
                    analysis_id=analysis_id,
                    progress_callback=cap_cb
                )
                captions = caps
                if cap_warn:
                    job_warnings.append(cap_warn)

                with get_db() as conn:
                    for c in captions:
                        conn.execute("""
                            INSERT INTO captions (id, frame_id, analysis_id, timestamp, caption_text, model_name, status)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (
                            c["id"], c["frame_id"], c["analysis_id"], c["timestamp"],
                            c["caption_text"], c["model_name"], c["status"]
                        ))

            if self.is_cancelled(analysis_id):
                return

            # STAGE: Selecting Keyframes
            self._update_job_status(analysis_id, "selecting_keyframes", "selecting_keyframes", 0, 100, 86.0)
            keyframes = keyframe_service.select_keyframes(
                sampled_frames=sampled_frames,
                scene_candidates=scene_candidates,
                detections=detections,
                captions=captions,
                analysis_id=analysis_id,
                max_keyframes=max_kf
            )

            with get_db() as conn:
                for kf in keyframes:
                    conn.execute("""
                        INSERT INTO keyframes (id, analysis_id, frame_id, timestamp, preview_path, selection_reason, detections_count, caption_text)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        kf["id"], kf["analysis_id"], kf["frame_id"], kf["timestamp"],
                        kf["preview_path"], kf["selection_reason"], kf["detections_count"],
                        kf.get("caption_text")
                    ))

            if self.is_cancelled(analysis_id):
                return

            # STAGE: Generating Summary
            self._update_job_status(analysis_id, "generating_summary", "generating_summary", 0, 100, 93.0)
            summary_dict = summary_service.generate_summary(
                video_metadata={
                    "duration": video_row["duration"],
                    "sample_rate_fps": sample_rate,
                    "width": video_row["width"],
                    "height": video_row["height"]
                },
                sampled_frames=sampled_frames,
                detections=detections,
                captions=captions,
                scene_candidates=scene_candidates
            )
            summary_json_str = json.dumps(summary_dict)

            # STAGE: Finalize
            total_duration = round(time.time() - start_time, 2)
            final_status = "completed_with_warnings" if job_warnings else "completed"

            self._update_job_status(
                analysis_id,
                status=final_status,
                stage="completed",
                current=len(sampled_frames),
                total=len(sampled_frames),
                percentage=100.0,
                warnings=job_warnings,
                summary_text=summary_json_str,
                duration=total_duration
            )

        except Exception as e:
            total_duration = round(time.time() - start_time, 2)
            err_msg = str(e)
            self._update_job_status(
                analysis_id,
                status="failed",
                stage="failed",
                errors=[err_msg],
                duration=total_duration
            )
        finally:
            with self._lock:
                self._active_jobs.pop(analysis_id, None)

    def start_analysis_async(self, analysis_id: str):
        """Spawn background thread for pipeline execution."""
        thread = threading.Thread(target=self.run_pipeline, args=(analysis_id,), daemon=True)
        thread.start()

analysis_worker = AnalysisWorker()
