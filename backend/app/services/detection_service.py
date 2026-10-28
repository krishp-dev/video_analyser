import os
import uuid
import torch
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable
from app.config import settings
from app.services.domain_service import domain_service

class DetectionService:
    def __init__(self):
        self._model = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self._model_name = settings.YOLO_MODEL_NAME

    def get_model(self):
        """Lazy load and cache YOLO model."""
        if self._model is None:
            from ultralytics import YOLO
            cache_path = settings.MODEL_CACHE_DIR / self._model_name
            if cache_path.exists():
                self._model = YOLO(str(cache_path))
            else:
                self._model = YOLO(self._model_name)
        return self._model

    def detect_in_frame(
        self,
        frame_dict: Dict[str, Any],
        confidence_threshold: float = 0.25
    ) -> List[Dict[str, Any]]:
        """
        Run YOLO detection on a single frame.
        Maps bounding box coordinates back to original image pixel coordinates.
        Computes crop attributes for domain quality inspection.
        """
        model = self.get_model()
        img_path = frame_dict["file_path"]
        
        results = model.predict(
            source=img_path,
            conf=confidence_threshold,
            device=self._device,
            verbose=False
        )

        detections = []
        if not results:
            return detections

        res = results[0]
        boxes = res.boxes
        names = model.names
        orig_img = res.orig_img

        orig_w = frame_dict["width"]
        orig_h = frame_dict["height"]

        for i, box in enumerate(boxes):
            cls_id = int(box.cls[0].item())
            class_name = names.get(cls_id, f"class_{cls_id}")
            conf = round(float(box.conf[0].item()), 4)

            xyxy = box.xyxy[0].tolist()
            x1 = round(max(0.0, min(float(xyxy[0]), float(orig_w))), 1)
            y1 = round(max(0.0, min(float(xyxy[1]), float(orig_h))), 1)
            x2 = round(max(0.0, min(float(xyxy[2]), float(orig_w))), 1)
            y2 = round(max(0.0, min(float(xyxy[3]), float(orig_h))), 1)

            # Extract crop and analyze domain attributes
            attrs = {}
            if orig_img is not None and int(y2) > int(y1) and int(x2) > int(x1):
                crop = orig_img[int(y1):int(y2), int(x1):int(x2)]
                attrs = domain_service.inspect_crop_attributes(crop, class_name)

            detections.append({
                "id": f"det_{frame_dict['id']}_{i}_{str(uuid.uuid4())[:6]}",
                "frame_id": frame_dict["id"],
                "analysis_id": frame_dict["analysis_id"],
                "class_name": class_name,
                "confidence": conf,
                "bbox": [x1, y1, x2, y2],
                "timestamp": frame_dict["timestamp"],
                "model_name": self._model_name,
                "track_id": i + 1,
                "attributes": attrs
            })

        return detections

    def detect_batch(
        self,
        sampled_frames: List[Dict[str, Any]],
        confidence_threshold: float = 0.25,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Run detection across all sampled frames with multi-object centroid tracking.
        """
        all_detections = []
        total = len(sampled_frames)
        for idx, frame in enumerate(sampled_frames):
            frame_dets = self.detect_in_frame(frame, confidence_threshold=confidence_threshold)
            all_detections.extend(frame_dets)
            if progress_callback:
                progress_callback(idx + 1, total)

        # Multi-Object Persistent Centroid Tracking
        next_track_id = 1
        prev_dets: List[Dict[str, Any]] = []

        for frame in sampled_frames:
            current_dets = [d for d in all_detections if d["frame_id"] == frame["id"]]
            for cur in current_dets:
                cx_cur = (cur["bbox"][0] + cur["bbox"][2]) / 2.0
                cy_cur = (cur["bbox"][1] + cur["bbox"][3]) / 2.0

                best_match = None
                best_dist = 140.0  # max allowable drift between frames
                for prev in prev_dets:
                    if prev["class_name"] == cur["class_name"]:
                        cx_prev = (prev["bbox"][0] + prev["bbox"][2]) / 2.0
                        cy_prev = (prev["bbox"][1] + prev["bbox"][3]) / 2.0
                        dist = np.hypot(cx_cur - cx_prev, cy_cur - cy_prev)
                        if dist < best_dist:
                            best_dist = dist
                            best_match = prev

                if best_match and "track_id" in best_match:
                    cur["track_id"] = best_match["track_id"]
                else:
                    cur["track_id"] = next_track_id
                    next_track_id += 1

            prev_dets = current_dets

        return all_detections

    @classmethod
    def draw_detections_on_image(
        cls,
        image_path: Path,
        detections: List[Dict[str, Any]],
        output_path: Path
    ) -> bool:
        """
        Draw bounding boxes, persistent Track IDs, and ripeness indicators.
        """
        img = cv2.imread(str(image_path))
        if img is None:
            return False

        colors = [
            (255, 87, 34), (76, 175, 80), (33, 150, 243),
            (255, 193, 7), (156, 39, 176), (0, 188, 212)
        ]

        for i, det in enumerate(detections):
            x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
            track_num = det.get("track_id", i + 1)
            label = f"#{track_num} {det['class_name']} {int(det['confidence']*100)}%"

            # Append domain quality tag if available
            if det.get("attributes") and "ripeness_status" in det["attributes"]:
                label += f" | {det['attributes']['ripeness_status']}"

            color = colors[hash(det['class_name']) % len(colors)]

            # Draw outer glow & rectangle
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

            # Draw label banner
            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(img, (x1, max(0, y1 - 20)), (x1 + w + 8, max(0, y1)), color, -1)
            cv2.putText(
                img, label, (x1 + 4, max(14, y1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA
            )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(output_path), img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        return True

detection_service = DetectionService()
