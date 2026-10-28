import os
import json
import subprocess
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
import cv2
from app.config import settings

class VideoValidationError(Exception):
    pass

class VideoService:
    # Magic bytes signatures for common video containers
    VIDEO_SIGNATURES = [
        b"\x00\x00\x00\x18ftyp", b"\x00\x00\x00\x1cftyp", b"\x00\x00\x00\x20ftyp",
        b"\x00\x00\x00\x14ftyp", b"ftyp", b"\x1a\x45\xdf\xa3", # WebM / Matroska
        b"RIFF", # AVI
        b"moov", b"mdat"
    ]

    @classmethod
    def validate_content_header(cls, file_path: Path) -> bool:
        """Inspect the initial bytes to confirm it matches a supported video container."""
        if not file_path.exists() or file_path.stat().st_size < 12:
            return False

        with open(file_path, "rb") as f:
            header = f.read(64)

        # Check for standard container signatures
        for sig in cls.VIDEO_SIGNATURES:
            if sig in header:
                return True

        # Quick check for MP4 ftyp in the first 32 bytes
        if len(header) >= 12 and header[4:8] == b"ftyp":
            return True

        return False

    @classmethod
    def probe_with_ffprobe(cls, file_path: Path) -> Optional[Dict[str, Any]]:
        """Extract metadata using FFprobe if binary is configured/available."""
        if not settings.FFPROBE_PATH or not os.path.exists(settings.FFPROBE_PATH):
            return None

        cmd = [
            settings.FFPROBE_PATH,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(file_path)
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if res.returncode == 0 and res.stdout:
                data = json.loads(res.stdout)
                streams = data.get("streams", [])
                video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
                if not video_stream:
                    return None

                width = int(video_stream.get("width", 0))
                height = int(video_stream.get("height", 0))

                # Duration
                dur = float(video_stream.get("duration") or data.get("format", {}).get("duration", 0.0))

                # Frame rate calculation
                fps_raw = video_stream.get("avg_frame_rate") or video_stream.get("r_frame_rate", "30/1")
                if "/" in str(fps_raw):
                    num, den = fps_raw.split("/")
                    fps = float(num) / float(den) if float(den) != 0 else 30.0
                else:
                    fps = float(fps_raw) if fps_raw else 30.0

                total_frames = int(video_stream.get("nb_frames") or round(dur * fps) or 0)
                codec = video_stream.get("codec_name", "unknown")

                return {
                    "width": width,
                    "height": height,
                    "duration": round(dur, 2),
                    "fps": round(fps, 2),
                    "total_frames": total_frames,
                    "format": codec
                }
        except Exception:
            return None
        return None

    @classmethod
    def probe_with_opencv(cls, file_path: Path) -> Dict[str, Any]:
        """Extract metadata using OpenCV VideoCapture."""
        cap = cv2.VideoCapture(str(file_path))
        if not cap.isOpened():
            raise VideoValidationError("Unable to open video stream. File may be corrupted or codec unsupported.")

        try:
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = float(cap.get(cv2.CAP_PROP_FPS))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            if fps <= 0 or fps > 240:
                fps = 30.0  # Sensible standard fallback

            duration = round(total_frames / fps, 2) if total_frames > 0 and fps > 0 else 0.0

            fourcc_int = int(cap.get(cv2.CAP_PROP_FOURCC))
            fourcc_str = "".join([chr((fourcc_int >> 8 * i) & 0xFF) for i in range(4)]).strip()

            # Verify that at least one frame can actually be read
            ret, frame = cap.read()
            if not ret or frame is None:
                raise VideoValidationError("Failed to decode video frames. Stream is empty or invalid.")

            return {
                "width": width,
                "height": height,
                "duration": duration,
                "fps": round(fps, 2),
                "total_frames": total_frames,
                "format": fourcc_str or "mp4v"
            }
        finally:
            cap.release()

    @classmethod
    def extract_and_validate(cls, file_path: Path, original_filename: str) -> Dict[str, Any]:
        """Comprehensive validation and metadata extraction for uploaded video."""
        file_size = file_path.stat().st_size
        if file_size == 0:
            raise VideoValidationError("Uploaded file is empty (0 bytes).")

        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise VideoValidationError(
                f"File size ({round(file_size / (1024*1024), 1)} MB) exceeds allowed limit of {settings.MAX_FILE_SIZE_MB} MB."
            )

        # Validate extension
        ext = original_filename.split(".")[-1].lower() if "." in original_filename else ""
        if ext not in settings.ALLOWED_EXTENSIONS:
            allowed = ", ".join(settings.ALLOWED_EXTENSIONS)
            raise VideoValidationError(f"Unsupported file extension '.{ext}'. Supported formats: {allowed}.")

        # Validate container bytes
        if not cls.validate_content_header(file_path):
            raise VideoValidationError("File content does not match a valid video container signature.")

        # Extract metadata: try FFprobe first, fallback to OpenCV
        metadata = cls.probe_with_ffprobe(file_path)
        if not metadata:
            metadata = cls.probe_with_opencv(file_path)

        # Validate duration
        if metadata["duration"] > settings.MAX_DURATION_SECONDS:
            raise VideoValidationError(
                f"Video duration ({metadata['duration']}s) exceeds maximum allowed limit of {settings.MAX_DURATION_SECONDS}s."
            )

        # Validate resolution
        if (metadata["width"] > settings.MAX_RESOLUTION_WIDTH or 
            metadata["height"] > settings.MAX_RESOLUTION_HEIGHT):
            raise VideoValidationError(
                f"Video resolution ({metadata['width']}x{metadata['height']}) exceeds allowed limit of "
                f"{settings.MAX_RESOLUTION_WIDTH}x{settings.MAX_RESOLUTION_HEIGHT}."
            )

        metadata["file_size"] = file_size
        metadata["original_name"] = original_filename
        metadata["filename"] = file_path.name
        return metadata

video_service = VideoService()
