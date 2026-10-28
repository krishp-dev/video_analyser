import os
import shutil
import uuid
from pathlib import Path
from typing import Optional
from app.config import settings

class StorageService:
    def __init__(self):
        settings.initialize_directories()

    def get_safe_path(self, base_dir: Path, filename: str) -> Path:
        """Resolve path and verify it stays within base_dir to prevent path traversal."""
        resolved = (base_dir / filename).resolve()
        if not str(resolved).startswith(str(base_dir.resolve())):
            raise ValueError(f"Path traversal detected: {filename}")
        return resolved

    def generate_video_path(self, original_extension: str) -> tuple[str, Path]:
        """Generate safe unique internal identifier and file path for uploaded video."""
        video_id = str(uuid.uuid4())
        clean_ext = original_extension.lower().lstrip(".")
        internal_filename = f"{video_id}.{clean_ext}"
        target_path = self.get_safe_path(settings.UPLOAD_DIR, internal_filename)
        return video_id, target_path

    def get_analysis_dir(self, analysis_id: str) -> Path:
        """Get or create directory for an analysis job."""
        safe_dir = self.get_safe_path(settings.PROCESSED_DIR, analysis_id)
        safe_dir.mkdir(parents=True, exist_ok=True)
        (safe_dir / "frames").mkdir(parents=True, exist_ok=True)
        (safe_dir / "keyframes").mkdir(parents=True, exist_ok=True)
        return safe_dir

    def get_frame_path(self, analysis_id: str, frame_id: str) -> Path:
        """Get path for a saved frame image."""
        analysis_dir = self.get_analysis_dir(analysis_id)
        return self.get_safe_path(analysis_dir / "frames", f"{frame_id}.jpg")

    def get_keyframe_path(self, analysis_id: str, frame_id: str) -> Path:
        """Get path for a saved keyframe image."""
        analysis_dir = self.get_analysis_dir(analysis_id)
        return self.get_safe_path(analysis_dir / "keyframes", f"{frame_id}.jpg")

    def get_report_path(self, analysis_id: str, format_ext: str) -> Path:
        """Get path for an exported report."""
        return self.get_safe_path(settings.REPORTS_DIR, f"{analysis_id}.{format_ext}")

    def delete_analysis_files(self, analysis_id: str, video_path: Optional[str] = None):
        """Safely delete all generated frames, keyframes, reports, and optionally video file."""
        # Delete processed folder
        analysis_dir = settings.PROCESSED_DIR / analysis_id
        if analysis_dir.exists() and str(analysis_dir.resolve()).startswith(str(settings.PROCESSED_DIR.resolve())):
            shutil.rmtree(analysis_dir, ignore_errors=True)

        # Delete any exported reports
        for ext in ["json", "csv", "txt"]:
            rep = settings.REPORTS_DIR / f"{analysis_id}.{ext}"
            if rep.exists():
                try:
                    rep.unlink()
                except Exception:
                    pass

        # If video_path is provided and within upload dir, delete it
        if video_path:
            vp = Path(video_path).resolve()
            if vp.exists() and str(vp).startswith(str(settings.UPLOAD_DIR.resolve())):
                try:
                    vp.unlink()
                except Exception:
                    pass

storage_service = StorageService()
