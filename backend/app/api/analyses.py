import os
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse, PlainTextResponse

from app.db.database import get_db
from app.config import settings
from app.storage.storage_service import storage_service
from app.workers.analysis_worker import analysis_worker
from app.services.report_service import report_service
from app.schemas.video import VideoMetadata
from app.schemas.analysis import (
    AnalysisConfig,
    AnalysisCreateRequest,
    AnalysisStatusResponse,
    AnalysisDetailResponse,
    AnalysisListItem,
    DetectionItem,
    CaptionItem,
    SceneCandidateItem,
    KeyframeItem,
    SampledFrameDetail,
    SearchResponse,
    SearchMomentItem
)

router = APIRouter()

STAGE_HUMAN_NAMES = {
    "queued": "Queued in analysis pipeline",
    "validating": "Validating video stream and parameters",
    "extracting_frames": "Extracting and sampling video frames",
    "detecting_scenes": "Analyzing scene boundary candidates",
    "detecting_objects": "Running YOLO AI object detection",
    "generating_captions": "Generating visual frame descriptions",
    "selecting_keyframes": "Evaluating and selecting keyframes",
    "generating_summary": "Synthesizing evidence-grounded summary",
    "completed": "Analysis completed successfully",
    "completed_with_warnings": "Analysis completed with diagnostic warnings",
    "failed": "Analysis failed",
    "cancelled": "Analysis cancelled"
}

@router.post("/analyses", response_model=AnalysisStatusResponse)
def start_analysis(payload: AnalysisCreateRequest):
    """
    Register a new video analysis job and begin asynchronous pipeline processing.
    """
    video_id = payload.video_id
    with get_db() as conn:
        video_row = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
        if not video_row:
            raise HTTPException(status_code=404, detail=f"Video ID '{video_id}' not found.")

        # Check if an analysis is already running for this video
        active = conn.execute(
            "SELECT id FROM analysis_jobs WHERE video_id = ? AND status NOT IN ('completed', 'completed_with_warnings', 'failed', 'cancelled')",
            (video_id,)
        ).fetchone()
        if active:
            raise HTTPException(
                status_code=409,
                detail=f"An analysis is already active for this video (Job ID: {active['id']})."
            )

    analysis_id = str(uuid.uuid4())
    config = payload.config or AnalysisConfig()
    created_at = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        conn.execute("""
            INSERT INTO analysis_jobs (
                id, video_id, status, stage, progress_current, progress_total,
                progress_percentage, config_json, warnings_json, errors_json,
                model_yolo, model_caption, started_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            analysis_id,
            video_id,
            "queued",
            "queued",
            0,
            100,
            0.0,
            config.model_dump_json(),
            "[]",
            "[]",
            settings.YOLO_MODEL_NAME,
            settings.CAPTION_MODEL_NAME,
            created_at,
            created_at
        ))

    # Trigger background worker
    analysis_worker.start_analysis_async(analysis_id)

    return AnalysisStatusResponse(
        analysis_id=analysis_id,
        video_id=video_id,
        status="queued",
        stage="queued",
        human_status=STAGE_HUMAN_NAMES["queued"],
        progress_current=0,
        progress_total=100,
        progress_percentage=0.0,
        warnings=[],
        errors=[],
        started_at=created_at
    )

@router.get("/analyses", response_model=List[AnalysisListItem])
def list_analyses():
    """List all previous analysis jobs with persistent metadata."""
    items = []
    with get_db() as conn:
        rows = conn.execute("""
            SELECT 
                a.id as analysis_id,
                a.video_id,
                v.original_name,
                a.status,
                a.stage,
                v.duration,
                (SELECT COUNT(*) FROM detections d WHERE d.analysis_id = a.id) as total_detections,
                (SELECT COUNT(*) FROM keyframes k WHERE k.analysis_id = a.id) as keyframes_count,
                a.created_at,
                a.completed_at
            FROM analysis_jobs a
            JOIN videos v ON a.video_id = v.id
            ORDER BY a.created_at DESC
        """).fetchall()

        for r in rows:
            items.append(AnalysisListItem(
                analysis_id=r["analysis_id"],
                video_id=r["video_id"],
                original_name=r["original_name"],
                status=r["status"],
                stage=r["stage"],
                duration=r["duration"],
                total_detections=r["total_detections"],
                keyframes_count=r["keyframes_count"],
                created_at=r["created_at"],
                completed_at=r["completed_at"]
            ))

    return items

@router.get("/analyses/{analysis_id}/status", response_model=AnalysisStatusResponse)
def get_analysis_status(analysis_id: str):
    """Poll job progress and stage status."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM analysis_jobs WHERE id = ?", (analysis_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Analysis job not found.")

    status = row["status"]
    stage = row["stage"]

    # Auto-heal / start queued jobs when polled if no worker thread is active
    if status == "queued" and analysis_id not in analysis_worker._active_jobs:
        analysis_worker.start_analysis_async(analysis_id)
        stage = "validating"
        status = "processing"

    human_status = STAGE_HUMAN_NAMES.get(stage, stage.replace("_", " ").capitalize())

    warnings = json.loads(row["warnings_json"]) if row["warnings_json"] else []
    errors = json.loads(row["errors_json"]) if row["errors_json"] else []

    elapsed = None
    if row["started_at"]:
        try:
            start_dt = datetime.fromisoformat(row["started_at"])
            end_dt = datetime.fromisoformat(row["completed_at"]) if row["completed_at"] else datetime.now(timezone.utc)
            if start_dt.tzinfo is None and end_dt.tzinfo is not None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            elif start_dt.tzinfo is not None and end_dt.tzinfo is None:
                end_dt = end_dt.replace(tzinfo=timezone.utc)
            elapsed = round((end_dt - start_dt).total_seconds(), 1)
        except Exception:
            pass

    return AnalysisStatusResponse(
        analysis_id=analysis_id,
        video_id=row["video_id"],
        status=status,
        stage=stage,
        human_status=human_status,
        progress_current=row["progress_current"] or 0,
        progress_total=row["progress_total"] or 0,
        progress_percentage=row["progress_percentage"] or 0.0,
        warnings=warnings,
        errors=errors,
        elapsed_time_seconds=elapsed,
        started_at=row["started_at"],
        completed_at=row["completed_at"]
    )

@router.post("/analyses/{analysis_id}/cancel")
def cancel_analysis(analysis_id: str):
    """Cancel a running analysis job."""
    with get_db() as conn:
        row = conn.execute("SELECT status FROM analysis_jobs WHERE id = ?", (analysis_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Analysis job not found.")
        if row["status"] in ["completed", "completed_with_warnings", "failed", "cancelled"]:
            return {"message": f"Job is already finished with status '{row['status']}'."}

    success = analysis_worker.cancel_job(analysis_id)
    return {"message": "Cancellation signal sent." if success else "Job was not actively running."}

@router.post("/analyses/{analysis_id}/start")
def start_analysis_job(analysis_id: str):
    """Explicitly trigger or restart analysis for a queued, failed, or cancelled job."""
    with get_db() as conn:
        row = conn.execute("SELECT status FROM analysis_jobs WHERE id = ?", (analysis_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Analysis job not found.")
        if row["status"] in ["completed", "completed_with_warnings"]:
            return {"message": f"Job is already finished with status '{row['status']}'."}
        if analysis_id in analysis_worker._active_jobs:
            return {"message": "Job is already actively running."}

        conn.execute("""
            UPDATE analysis_jobs 
            SET status = 'queued', stage = 'validating', progress_percentage = 5.0, errors_json = '[]'
            WHERE id = ?
        """, (analysis_id,))

    analysis_worker.start_analysis_async(analysis_id)
    return {"message": "Analysis pipeline successfully triggered."}


@router.get("/analyses/{analysis_id}", response_model=AnalysisDetailResponse)
def get_analysis_detail(analysis_id: str):
    """Return full analysis results and supporting evidence."""
    with get_db() as conn:
        job = conn.execute("SELECT * FROM analysis_jobs WHERE id = ?", (analysis_id,)).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Analysis job not found.")

        video = conn.execute("SELECT * FROM videos WHERE id = ?", (job["video_id"],)).fetchone()
        if not video:
            raise HTTPException(status_code=404, detail="Video record missing.")

        # Detections
        det_rows = conn.execute(
            "SELECT * FROM detections WHERE analysis_id = ? ORDER BY timestamp ASC",
            (analysis_id,)
        ).fetchall()

        # Captions
        cap_rows = conn.execute(
            "SELECT * FROM captions WHERE analysis_id = ? ORDER BY timestamp ASC",
            (analysis_id,)
        ).fetchall()

        # Scene Candidates
        scene_rows = conn.execute(
            "SELECT * FROM scene_candidates WHERE analysis_id = ? ORDER BY timestamp ASC",
            (analysis_id,)
        ).fetchall()

        # Keyframes
        kf_rows = conn.execute(
            "SELECT * FROM keyframes WHERE analysis_id = ? ORDER BY timestamp ASC",
            (analysis_id,)
        ).fetchall()

    # Build objects with persistent tracking and attributes
    detections = []
    for i, d in enumerate(det_rows):
        attrs = {}
        if "attributes_json" in d.keys() and d["attributes_json"]:
            try:
                attrs = json.loads(d["attributes_json"])
            except Exception:
                pass
        t_id = d["track_id"] if "track_id" in d.keys() and d["track_id"] is not None else (i + 1)
        detections.append(DetectionItem(
            id=d["id"],
            frame_id=d["frame_id"],
            class_name=d["class_name"],
            confidence=d["confidence"],
            bbox=[d["bbox_x1"], d["bbox_y1"], d["bbox_x2"], d["bbox_y2"]],
            timestamp=d["timestamp"],
            model_name=d["model_name"],
            track_id=t_id,
            attributes=attrs
        ))

    captions = [
        CaptionItem(
            id=c["id"],
            frame_id=c["frame_id"],
            timestamp=c["timestamp"],
            caption_text=c["caption_text"],
            model_name=c["model_name"],
            status=c["status"]
        ) for c in cap_rows
    ]

    scenes = [
        SceneCandidateItem(
            id=s["id"],
            timestamp=s["timestamp"],
            frame_index=s["frame_index"],
            difference_score=s["difference_score"],
            reason=s["reason"]
        ) for s in scene_rows
    ]

    # Index detections by frame_id for keyframes
    dets_by_frame = {}
    for d in detections:
        dets_by_frame.setdefault(d.frame_id, []).append(d)

    keyframes = [
        KeyframeItem(
            id=k["id"],
            frame_id=k["frame_id"],
            timestamp=k["timestamp"],
            preview_url=f"/api/analyses/{analysis_id}/keyframes/{k['id']}/image",
            selection_reason=k["selection_reason"],
            detections_count=k["detections_count"],
            caption_text=k["caption_text"],
            detections=dets_by_frame.get(k["frame_id"], [])
        ) for k in kf_rows
    ]

    # Class distribution
    class_dist = {}
    for d in detections:
        class_dist[d.class_name] = class_dist.get(d.class_name, 0) + 1

    summary_obj = None
    if job["summary_text"]:
        try:
            summary_obj = json.loads(job["summary_text"])
        except Exception:
            pass

    domain_insights = None
    if "domain_insights_json" in job.keys() and job["domain_insights_json"]:
        try:
            domain_insights = json.loads(job["domain_insights_json"])
        except Exception:
            pass

    config_dict = json.loads(job["config_json"]) if job["config_json"] else {}
    warnings = json.loads(job["warnings_json"]) if job["warnings_json"] else []
    errors = json.loads(job["errors_json"]) if job["errors_json"] else []

    video_meta = VideoMetadata(
        id=video["id"],
        filename=video["filename"],
        original_name=video["original_name"],
        file_size=video["file_size"],
        duration=video["duration"],
        fps=video["fps"],
        width=video["width"],
        height=video["height"],
        total_frames=video["total_frames"],
        format=video["format"],
        mime_type=video["mime_type"],
        created_at=video["created_at"]
    )

    return AnalysisDetailResponse(
        analysis_id=analysis_id,
        video=video_meta,
        status=job["status"],
        stage=job["stage"],
        config=AnalysisConfig(**config_dict),
        summary=summary_obj,
        summary_raw_text=job["summary_text"],
        scene_candidates=scenes,
        detections=detections,
        captions=captions,
        keyframes=keyframes,
        class_distribution=class_dist,
        total_detections=len(detections),
        warnings=warnings,
        errors=errors,
        processing_duration=job["processing_duration"],
        domain_insights=domain_insights,
        models_used={
            "object_detection": job["model_yolo"] or settings.YOLO_MODEL_NAME,
            "image_captioning": job["model_caption"] or settings.CAPTION_MODEL_NAME
        },
        created_at=job["created_at"]
    )

@router.get("/analyses/{analysis_id}/keyframes")
def list_keyframes(analysis_id: str):
    """Return keyframe metadata and safe preview links."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM keyframes WHERE analysis_id = ? ORDER BY timestamp ASC",
            (analysis_id,)
        ).fetchall()

    return [{
        "id": r["id"],
        "frame_id": r["frame_id"],
        "timestamp": r["timestamp"],
        "preview_url": f"/api/analyses/{analysis_id}/keyframes/{r['id']}/image",
        "selection_reason": r["selection_reason"],
        "detections_count": r["detections_count"],
        "caption_text": r["caption_text"]
    } for r in rows]

@router.get("/analyses/{analysis_id}/keyframes/{keyframe_id}/image")
def get_keyframe_image(analysis_id: str, keyframe_id: str):
    """Safely stream keyframe image file."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT preview_path FROM keyframes WHERE id = ? AND analysis_id = ?",
            (keyframe_id, analysis_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Keyframe not found.")

    p = Path(row["preview_path"])
    if not p.exists() or not str(p.resolve()).startswith(str(settings.PROCESSED_DIR.resolve())):
        raise HTTPException(status_code=404, detail="Keyframe image file not found on disk.")

    return FileResponse(p, media_type="image/jpeg")

@router.get("/analyses/{analysis_id}/frames/{frame_id}")
def get_frame_detail(analysis_id: str, frame_id: str):
    """Return frame details including detections and caption."""
    with get_db() as conn:
        frame = conn.execute(
            "SELECT * FROM sampled_frames WHERE id = ? AND analysis_id = ?",
            (frame_id, analysis_id)
        ).fetchone()
        if not frame:
            raise HTTPException(status_code=404, detail="Frame not found.")

        det_rows = conn.execute(
            "SELECT * FROM detections WHERE frame_id = ? AND analysis_id = ?",
            (frame_id, analysis_id)
        ).fetchall()

        cap_row = conn.execute(
            "SELECT caption_text FROM captions WHERE frame_id = ? AND analysis_id = ?",
            (frame_id, analysis_id)
        ).fetchone()

    dets = [
        DetectionItem(
            id=d["id"],
            frame_id=d["frame_id"],
            class_name=d["class_name"],
            confidence=d["confidence"],
            bbox=[d["bbox_x1"], d["bbox_y1"], d["bbox_x2"], d["bbox_y2"]],
            timestamp=d["timestamp"],
            model_name=d["model_name"]
        ) for d in det_rows
    ]

    return SampledFrameDetail(
        id=frame["id"],
        frame_index=frame["frame_index"],
        timestamp=frame["timestamp"],
        width=frame["width"],
        height=frame["height"],
        preview_url=f"/api/analyses/{analysis_id}/frames/{frame['id']}/image",
        detections=dets,
        caption=cap_row["caption_text"] if cap_row else None
    )

@router.get("/analyses/{analysis_id}/frames/{frame_id}/image")
def get_frame_image(analysis_id: str, frame_id: str):
    """Safely stream sampled frame image file."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT file_path FROM sampled_frames WHERE id = ? AND analysis_id = ?",
            (frame_id, analysis_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Frame not found.")

    p = Path(row["file_path"])
    if not p.exists() or not str(p.resolve()).startswith(str(settings.PROCESSED_DIR.resolve())):
        raise HTTPException(status_code=404, detail="Frame image file not found on disk.")

    return FileResponse(p, media_type="image/jpeg")

@router.get("/analyses/{analysis_id}/export")
def export_analysis_report(analysis_id: str, format: str = Query("json", pattern="^(json|csv|pdf)$")):
    """Export analysis report in JSON, CSV, or Executive PDF Dossier format."""
    detail = get_analysis_detail(analysis_id)
    data = detail.model_dump()

    if format == "json":
        json_content = report_service.export_json(data)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=report_{analysis_id[:8]}.json"}
        )
    elif format == "csv":
        csv_content = report_service.export_csv(data)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=report_{analysis_id[:8]}.csv"}
        )
    elif format == "pdf":
        pdf_bytes = report_service.export_pdf(data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=report_{analysis_id[:8]}.pdf"}
        )

@router.get("/analyses/{analysis_id}/search", response_model=SearchResponse)
def search_analysis(analysis_id: str, q: str = Query(..., min_length=1)):
    """
    Search video content by natural language query across objects, attributes, and moments.
    """
    detail = get_analysis_detail(analysis_id)
    query_terms = [t.lower().strip() for t in q.split() if t.strip()]

    results = []
    seen_timestamps = set()

    for d in detail.detections:
        cname = d.class_name.lower()
        attrs = d.attributes or {}
        attr_words = " ".join(str(v).lower() for v in attrs.values())

        score = 0.0
        match_type = "object"
        match_label = f"{d.class_name.title()} (#{d.track_id or 1})"

        for term in query_terms:
            if term == cname or term in cname:
                score += 0.85
            elif term in attr_words:
                score += 0.70
                match_type = "attribute"
            elif term in ["car", "vehicle", "traffic", "truck"] and cname in ["car", "truck", "bus"]:
                score += 0.80
            elif term in ["fruit", "apple", "produce", "ripe"] and cname in ["apple", "orange", "banana"]:
                score += 0.85
            elif term in ["bottle", "drink", "beverage", "conveyor"] and cname == "bottle":
                score += 0.85
            elif term in ["person", "people", "student", "worker", "pedestrian"] and cname == "person":
                score += 0.80

        if score > 0:
            ts_key = round(d.timestamp, 1)
            if ts_key not in seen_timestamps or score >= 0.8:
                seen_timestamps.add(ts_key)
                mins = int(d.timestamp // 60)
                secs = int(d.timestamp % 60)
                frac = int((d.timestamp - int(d.timestamp)) * 10)
                formatted_time = f"{mins:02d}:{secs:02d}.{frac}"

                desc = f"Observed {d.class_name} with {d.confidence*100:.1f}% confidence."
                if attrs.get("grade"):
                    desc += f" Quality: {attrs['grade']}."
                elif attrs.get("ripeness_status"):
                    desc += f" Ripeness: {attrs['ripeness_status']}."

                results.append(SearchMomentItem(
                    timestamp=d.timestamp,
                    formatted_time=formatted_time,
                    relevance_score=min(1.0, score),
                    match_type=match_type,
                    label=match_label,
                    description=desc,
                    bbox=d.bbox,
                    frame_preview_url=f"/api/analyses/{analysis_id}/frames/{d.frame_id}/image"
                ))

    # Also search scene shifts
    for s in detail.scene_candidates:
        s_reason = s.reason.lower()
        if any(term in s_reason for term in query_terms) or any(term in ["scene", "cut", "transition", "shift"] for term in query_terms):
            mins = int(s.timestamp // 60)
            secs = int(s.timestamp % 60)
            formatted_time = f"{mins:02d}:{secs:02d}"
            results.append(SearchMomentItem(
                timestamp=s.timestamp,
                formatted_time=formatted_time,
                relevance_score=0.75,
                match_type="scene",
                label="Candidate Scene Transition",
                description=s.reason,
                bbox=None,
                frame_preview_url=None
            ))

    results.sort(key=lambda x: x.relevance_score, reverse=True)
    return SearchResponse(
        query=q,
        total_matches=len(results),
        results=results[:12]
    )

@router.delete("/analyses/{analysis_id}")
def delete_analysis(analysis_id: str):
    """
    Delete analysis and associated files safely from database and filesystem.
    """
    with get_db() as conn:
        job = conn.execute("SELECT video_id FROM analysis_jobs WHERE id = ?", (analysis_id,)).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Analysis not found.")

        video_id = job["video_id"]
        # Check if other analyses reference this video
        other = conn.execute(
            "SELECT id FROM analysis_jobs WHERE video_id = ? AND id != ?",
            (video_id, analysis_id)
        ).fetchone()

        video_path_to_delete = None
        if not other:
            v_row = conn.execute("SELECT storage_path FROM videos WHERE id = ?", (video_id,)).fetchone()
            if v_row:
                video_path_to_delete = v_row["storage_path"]
            conn.execute("DELETE FROM videos WHERE id = ?", (video_id,))

        conn.execute("DELETE FROM analysis_jobs WHERE id = ?", (analysis_id,))

    # Safely clean up filesystem files
    storage_service.delete_analysis_files(analysis_id, video_path=video_path_to_delete)

    return {"message": f"Analysis '{analysis_id}' and associated files deleted successfully."}
