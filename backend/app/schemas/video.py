from typing import Optional
from pydantic import BaseModel, Field

class VideoMetadata(BaseModel):
    id: str
    filename: str
    original_name: str
    file_size: int
    duration: float
    fps: float
    width: int
    height: int
    total_frames: Optional[int] = None
    format: str
    mime_type: Optional[str] = None
    created_at: str

class VideoUploadResponse(BaseModel):
    video: VideoMetadata
    message: str = "Video uploaded and validated successfully."
