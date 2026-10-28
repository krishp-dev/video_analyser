import os
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable
from PIL import Image
import torch
from app.config import settings

class CaptionService:
    def __init__(self):
        self._processor = None
        self._model = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self._model_name = settings.CAPTION_MODEL_NAME
        self._load_failed = False
        self._load_error_msg = ""

    def load_model(self):
        """Lazy load Hugging Face BLIP captioning model."""
        if self._model is not None:
            return True
        if self._load_failed:
            return False

        try:
            from transformers import BlipProcessor, BlipForConditionalGeneration
            # Set cache directory
            cache_dir = str(settings.MODEL_CACHE_DIR)
            self._processor = BlipProcessor.from_pretrained(self._model_name, cache_dir=cache_dir)
            self._model = BlipForConditionalGeneration.from_pretrained(self._model_name, cache_dir=cache_dir).to(self._device)
            self._model.eval()
            return True
        except Exception as e:
            self._load_failed = True
            self._load_error_msg = str(e)
            return False

    def is_available(self) -> tuple[bool, str]:
        """Check if caption model can be loaded."""
        success = self.load_model()
        return success, self._load_error_msg

    def generate_caption(self, image_path: Path) -> Optional[str]:
        """Generate visual description for a single image."""
        if not self.load_model():
            return None

        try:
            raw_image = Image.open(image_path).convert('RGB')
            inputs = self._processor(raw_image, return_tensors="pt").to(self._device)
            with torch.no_grad():
                out = self._model.generate(**inputs, max_new_tokens=40)
            caption = self._processor.decode(out[0], skip_special_tokens=True).strip()
            return caption.capitalize() if caption else None
        except Exception:
            return None

    def caption_frames(
        self,
        frames_to_caption: List[Dict[str, Any]],
        analysis_id: str,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> tuple[List[Dict[str, Any]], Optional[str]]:
        """
        Generate captions for selected frames.
        Returns (list_of_captions, warning_message_if_any).
        """
        if not settings.ENABLE_CAPTIONING:
            return [], "Image captioning is disabled by user configuration."

        can_load = self.load_model()
        if not can_load:
            warning = f"Caption model '{self._model_name}' could not be loaded: {self._load_error_msg}"
            return [], warning

        captions = []
        total = len(frames_to_caption)

        for idx, frame in enumerate(frames_to_caption):
            cap_text = self.generate_caption(Path(frame["file_path"]))
            if cap_text:
                captions.append({
                    "id": f"cap_{frame['id']}_{str(uuid.uuid4())[:6]}",
                    "frame_id": frame["id"],
                    "analysis_id": analysis_id,
                    "timestamp": frame["timestamp"],
                    "caption_text": cap_text,
                    "model_name": self._model_name,
                    "status": "completed"
                })
            else:
                captions.append({
                    "id": f"cap_{frame['id']}_{str(uuid.uuid4())[:6]}",
                    "frame_id": frame["id"],
                    "analysis_id": analysis_id,
                    "timestamp": frame["timestamp"],
                    "caption_text": "Failed to generate caption",
                    "model_name": self._model_name,
                    "status": "failed"
                })

            if progress_callback:
                progress_callback(idx + 1, total)

        return captions, None

caption_service = CaptionService()
