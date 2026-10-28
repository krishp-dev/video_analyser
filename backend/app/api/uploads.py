import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from app.config import settings
from app.db.database import get_db
from app.storage.storage_service import storage_service
from app.services.video_service import video_service, VideoValidationError
from app.schemas.video import VideoUploadResponse, VideoMetadata

router = APIRouter()

@router.post("/videos/upload", response_model=VideoUploadResponse)
async def upload_video(file: UploadFile = File(...)):
    """
    Accepts video upload, validates file type, magic bytes, duration, resolution,
    stores safely on disk, extracts metadata, and records to database.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file missing filename.")

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS:
        allowed = ", ".join(settings.ALLOWED_EXTENSIONS)
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '.{ext}'. Allowed formats: {allowed}."
        )

    # Generate safe unique internal ID and target path
    video_id, target_path = storage_service.generate_video_path(ext)

    # Stream file to disk in chunks to avoid memory spikes
    total_bytes = 0
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024

    try:
        with open(target_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise VideoValidationError(
                        f"File size exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB} MB."
                    )
                buffer.write(chunk)

        # Validate video integrity and extract metadata
        metadata = video_service.extract_and_validate(target_path, file.filename)

    except VideoValidationError as ve:
        # Clean up temporary uploaded file if validation fails
        if target_path.exists():
            target_path.unlink()
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        if target_path.exists():
            target_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to process video: {str(e)}")

    # Save to SQLite database
    created_at = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute("""
            INSERT INTO videos (
                id, filename, original_name, file_size, duration, fps,
                width, height, total_frames, format, mime_type, storage_path, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            video_id,
            target_path.name,
            file.filename,
            metadata["file_size"],
            metadata["duration"],
            metadata["fps"],
            metadata["width"],
            metadata["height"],
            metadata.get("total_frames"),
            metadata["format"],
            file.content_type or f"video/{ext}",
            str(target_path),
            created_at
        ))

    video_meta = VideoMetadata(
        id=video_id,
        filename=target_path.name,
        original_name=file.filename,
        file_size=metadata["file_size"],
        duration=metadata["duration"],
        fps=metadata["fps"],
        width=metadata["width"],
        height=metadata["height"],
        total_frames=metadata.get("total_frames"),
        format=metadata["format"],
        mime_type=file.content_type or f"video/{ext}",
        created_at=created_at
    )

    return VideoUploadResponse(
        video=video_meta,
        message="Video uploaded and validated successfully."
    )

@router.get("/videos/{video_id}/stream")
def stream_video(video_id: str, request: Request):
    """
    Stream video with HTTP Range header support for interactive timeline seeking in browser.
    """
    with get_db() as conn:
        row = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Video not found.")

    file_path = Path(row["storage_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file on disk is unavailable.")

    file_size = file_path.stat().st_size
    range_header = request.headers.get("Range")

    content_type = row["mime_type"] or "video/mp4"

    if range_header:
        # Parse range header: "bytes=start-end"
        byte_range = range_header.strip().replace("bytes=", "").split("-")
        start = int(byte_range[0]) if byte_range[0] else 0
        end = int(byte_range[1]) if len(byte_range) > 1 and byte_range[1] else file_size - 1
        end = min(end, file_size - 1)
        content_length = end - start + 1

        def range_generator():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk_size = min(64 * 1024, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": content_type,
        }
        return StreamingResponse(range_generator(), status_code=status.HTTP_206_PARTIAL_CONTENT, headers=headers)
    else:
        def file_generator():
            with open(file_path, "rb") as f:
                while chunk := f.read(64 * 1024):
                    yield chunk

        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": content_type,
        }
        return StreamingResponse(file_generator(), headers=headers)
