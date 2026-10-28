import os
import shutil
from pathlib import Path
from pydantic_settings import BaseSettings

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

class Settings(BaseSettings):
    APP_NAME: str = "Video Analyser"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Directories
    DATA_PATH: Path = DATA_DIR
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    PROCESSED_DIR: Path = DATA_DIR / "processed"
    REPORTS_DIR: Path = DATA_DIR / "reports"
    DB_PATH: Path = DATA_DIR / "video_analyser.db"

    # Video Constraints
    MAX_FILE_SIZE_MB: int = 100
    MAX_DURATION_SECONDS: int = 300  # 5 minutes
    MAX_RESOLUTION_WIDTH: int = 1920
    MAX_RESOLUTION_HEIGHT: int = 1080
    ALLOWED_EXTENSIONS: list[str] = ["mp4", "mov", "webm", "avi"]

    # Analysis Defaults
    DEFAULT_SAMPLE_RATE_FPS: float = 1.0
    MAX_SAMPLES_PER_VIDEO: int = 300
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.25
    DEFAULT_MAX_KEYFRAMES: int = 10
    DEFAULT_MAX_CAPTIONS: int = 15
    DEFAULT_SCENE_THRESHOLD: float = 0.35  # Histogram correlation difference threshold

    # AI Models
    YOLO_MODEL_NAME: str = "yolov8n.pt"  # Lightweight nano model (~6MB, fast CPU inference)
    CAPTION_MODEL_NAME: str = "Salesforce/blip-image-captioning-base"
    ENABLE_CAPTIONING: bool = True
    MODEL_CACHE_DIR: Path = DATA_DIR / "models"

    # Tool discovery for FFmpeg / FFprobe
    FFMPEG_PATH: str = ""
    FFPROBE_PATH: str = ""

    model_config = {
        "env_file": ".env",
        "extra": "allow"
    }

    def initialize_directories(self):
        """Create required runtime directories."""
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        self.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        self.MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    def resolve_tools(self):
        """Resolve ffmpeg and ffprobe paths with auto-detection."""
        # Check standard PATH first
        ff = shutil.which("ffmpeg")
        fp = shutil.which("ffprobe")

        # Check common local installation paths
        local_candidates = [
            r"C:\Users\Krish Patel\AppData\Local\Programs\ffmpeg\bin",
            r"C:\Program Files\ffmpeg\bin",
        ]
        for c in local_candidates:
            c_ff = Path(c) / "ffmpeg.exe"
            c_fp = Path(c) / "ffprobe.exe"
            if not ff and c_ff.exists():
                ff = str(c_ff)
            if not fp and c_fp.exists():
                fp = str(c_fp)

        self.FFMPEG_PATH = ff or ""
        self.FFPROBE_PATH = fp or ""

settings = Settings()
settings.initialize_directories()
settings.resolve_tools()
