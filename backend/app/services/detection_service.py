import os
import uuid
import torch
import cv2
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable
from app.config import settings

class DetectionService:
    def __init__(self):
        self._model = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self._model_name = settings.YOLO_MODEL_NAME

    def get_model(self):
        """Lazy load and cache YOLO model."""
        if self._model is None:
            from ultralytics import YOLO
            # Cache model inside DATA_DIR/models
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
        names = model.names  # class index -> name mapping

        orig_w = frame_dict["width"]
        orig_h = frame_dict["height"]

        for i, box in enumerate(boxes):
            cls_id = int(box.cls[0].item())
            class_name = names.get(cls_id, f"class_{cls_id}")
            conf = round(float(box.conf[0].item()), 4)

            # xyxy format in pixels: [x1, y1, x2, y2]
            xyxy = box.xyxy[0].tolist()
            x1 = round(max(0.0, min(float(xyxy[0]), float(orig_w))), 1)
            y1 = round(max(0.0, min(float(xyxy[1]), float(orig_h))), 1)
            x2 = round(max(0.0, min(float(xyxy[2]), float(orig_w))), 1)
            y2 = round(max(0.0, min(float(xyxy[3]), float(orig_h))), 1)

            detections.append({
                "id": f"det_{frame_dict['id']}_{i}_{str(uuid.uuid4())[:6]}",
                "frame_id": frame_dict["id"],
                "analysis_id": frame_dict["analysis_id"],
                "class_name": class_name,
                "confidence": conf,
                "bbox": [x1, y1, x2, y2],
                "timestamp": frame_dict["timestamp"],
                "model_name": self._model_name
            })

        return detections

    def detect_batch(
        self,
        sampled_frames: List[Dict[str, Any]],
        confidence_threshold: float = 0.25,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Run detection across all sampled frames.
        """
        all_detections = []
        total = len(sampled_frames)
        for idx, frame in enumerate(sampled_frames):
            frame_dets = self.detect_in_frame(frame, confidence_threshold=confidence_threshold)
            all_detections.extend(frame_dets)
            if progress_callback:
                progress_callback(idx + 1, total)

        return all_detections

    @classmethod
    def draw_detections_on_image(
        cls,
        image_path: Path,
        detections: List[Dict[str, Any]],
        output_path: Path
    ) -> bool:
        """
        Draw bounding boxes and class labels with confidence onto preview image.
        """
        img = cv2.imread(str(image_path))
        if img is None:
            return False

        # Palette for crisp detection boxes
        colors = [
            (255, 87, 34), (76, 175, 80), (33, 150, 243),
            (255, 193, 7), (156, 39, 176), (0, 188, 212)
        ]

        for i, det in enumerate(detections):
            x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
            label = f"{det['class_name']} {int(det['confidence']*100)}%"
            color = colors[hash(det['class_name']) % len(colors)]

            # Draw rectangle
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

            # Draw label background
            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(img, (x1, max(0, y1 - 20)), (x1 + w + 6, max(0, y1)), color, -1)
            cv2.putText(
                img, label, (x1 + 3, max(14, y1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA
            )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(output_path), img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        return True

detection_service = DetectionService()
