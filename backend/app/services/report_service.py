import io
import csv
import json
from pathlib import Path
from typing import Dict, Any
from app.storage.storage_service import storage_service

class ReportService:
    @classmethod
    def export_json(cls, analysis_data: Dict[str, Any]) -> str:
        """Generate structured JSON report string."""
        return json.dumps(analysis_data, indent=2, default=str)

    @classmethod
    def export_csv(cls, analysis_data: Dict[str, Any]) -> str:
        """
        Generate CSV report combining detections, timestamps, bounding boxes, and frame captions.
        """
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "analysis_id",
            "video_filename",
            "timestamp_seconds",
            "frame_id",
            "event_type",
            "class_name",
            "confidence",
            "bbox_x1",
            "bbox_y1",
            "bbox_x2",
            "bbox_y2",
            "caption_or_details"
        ])

        video_name = analysis_data.get("video", {}).get("original_name", "")
        analysis_id = analysis_data.get("analysis_id", "")

        # Detections
        for d in analysis_data.get("detections", []):
            bbox = d.get("bbox", [0, 0, 0, 0])
            writer.writerow([
                analysis_id,
                video_name,
                d.get("timestamp", 0.0),
                d.get("frame_id", ""),
                "detection",
                d.get("class_name", ""),
                d.get("confidence", 0.0),
                bbox[0] if len(bbox) > 0 else "",
                bbox[1] if len(bbox) > 1 else "",
                bbox[2] if len(bbox) > 2 else "",
                bbox[3] if len(bbox) > 3 else "",
                f"Model: {d.get('model_name', '')}"
            ])

        # Scene Changes
        for s in analysis_data.get("scene_candidates", []):
            writer.writerow([
                analysis_id,
                video_name,
                s.get("timestamp", 0.0),
                f"frame_idx_{s.get('frame_index', 0)}",
                "scene_change_candidate",
                "",
                s.get("difference_score", 0.0),
                "", "", "", "",
                s.get("reason", "")
            ])

        # Captions
        for c in analysis_data.get("captions", []):
            writer.writerow([
                analysis_id,
                video_name,
                c.get("timestamp", 0.0),
                c.get("frame_id", ""),
                "frame_caption",
                "",
                "",
                "", "", "", "",
                c.get("caption_text", "")
            ])

        return output.getvalue()

report_service = ReportService()
