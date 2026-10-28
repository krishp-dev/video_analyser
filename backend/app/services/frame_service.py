import os
import uuid
from pathlib import Path
from typing import List, Dict, Any, Callable, Optional
import cv2
from app.config import settings
from app.storage.storage_service import storage_service

class FrameSamplingError(Exception):
    pass

class FrameService:
    @classmethod
    def sample_frames(
        cls,
        video_path: Path,
        analysis_id: str,
        sample_rate_fps: float = 1.0,
        max_samples: int = 300,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Sample frames across the video at specified interval.
        Saves each frame to disk under the analysis processed directory.
        """
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise FrameSamplingError(f"Cannot open video file for sampling: {video_path}")

        sampled_frames = []
        try:
            fps = float(cap.get(cv2.CAP_PROP_FPS))
            if fps <= 0 or fps > 240:
                fps = 30.0

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = float(cap.get(cv2.CAP_PROP_POS_MSEC))
            
            # Step in frames between samples: e.g. 30 fps / 1.0 sample_fps = every 30 frames
            frame_step = max(1, int(round(fps / sample_rate_fps)))

            # If total frames is known and exceeds max_samples, adjust step
            if total_frames > 0:
                estimated_samples = total_frames // frame_step
                if estimated_samples > max_samples:
                    frame_step = max(1, total_frames // max_samples)

            current_frame_idx = 0
            sample_count = 0

            while cap.isOpened() and sample_count < max_samples:
                # Seek to target frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame_idx)
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                # Get presentation timestamp in seconds
                pos_msec = cap.get(cv2.CAP_PROP_POS_MSEC)
                if pos_msec and pos_msec > 0:
                    timestamp = round(pos_msec / 1000.0, 3)
                else:
                    timestamp = round(current_frame_idx / fps, 3)

                h, w = frame.shape[:2]
                frame_id = f"frame_{sample_count:04d}_{str(uuid.uuid4())[:8]}"
                save_path = storage_service.get_frame_path(analysis_id, frame_id)

                # Save compressed JPEG preview
                cv2.imwrite(str(save_path), frame, [int(cv2.IMWRITE_JPEG_QUALITY), 88])

                sampled_frames.append({
                    "id": frame_id,
                    "analysis_id": analysis_id,
                    "frame_index": current_frame_idx,
                    "timestamp": timestamp,
                    "width": w,
                    "height": h,
                    "file_path": str(save_path),
                    "status": "sampled"
                })

                sample_count += 1
                if progress_callback:
                    progress_callback(sample_count, max_samples)

                current_frame_idx += frame_step
                if total_frames > 0 and current_frame_idx >= total_frames:
                    break

        finally:
            cap.release()

        if not sampled_frames:
            raise FrameSamplingError("No frames could be extracted from the video stream.")

        return sampled_frames

frame_service = FrameService()
