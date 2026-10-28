import shutil
import torch
from fastapi import APIRouter
from app.config import settings
from app.services.caption_service import caption_service

router = APIRouter()

@router.get("/health")
def health_check():
    """Return application health, hardware acceleration, and tool availability."""
    cuda_avail = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_avail else "CPU"

    ffmpeg_installed = bool(settings.FFMPEG_PATH and shutil.which(settings.FFMPEG_PATH))
    ffprobe_installed = bool(settings.FFPROBE_PATH and shutil.which(settings.FFPROBE_PATH))

    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "hardware": {
            "device": "cuda" if cuda_avail else "cpu",
            "device_name": device_name,
            "cuda_available": cuda_avail
        },
        "tools": {
            "ffmpeg_available": ffmpeg_installed,
            "ffprobe_available": ffprobe_installed,
            "opencv_available": True
        },
        "models": {
            "object_detector": settings.YOLO_MODEL_NAME,
            "caption_model": settings.CAPTION_MODEL_NAME,
            "captioning_enabled": settings.ENABLE_CAPTIONING
        },
        "limits": {
            "max_file_size_mb": settings.MAX_FILE_SIZE_MB,
            "max_duration_seconds": settings.MAX_DURATION_SECONDS,
            "max_resolution": f"{settings.MAX_RESOLUTION_WIDTH}x{settings.MAX_RESOLUTION_HEIGHT}"
        }
    }
