import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any
import uuid

class SceneService:
    @classmethod
    def calculate_frame_difference(cls, img1_path: Path, img2_path: Path) -> float:
        """
        Calculate visual difference score between two images [0.0 to 1.0].
        Combines HSV histogram Bhattacharyya distance with grayscale mean absolute difference.
        """
        img1 = cv2.imread(str(img1_path))
        img2 = cv2.imread(str(img2_path))
        if img1 is None or img2 is None:
            return 0.0

        # Resize to standardized small dimension for fast and invariant comparison
        dim = (256, 144)
        small1 = cv2.resize(img1, dim)
        small2 = cv2.resize(img2, dim)

        # 1. HSV Histogram difference
        hsv1 = cv2.cvtColor(small1, cv2.COLOR_BGR2HSV)
        hsv2 = cv2.cvtColor(small2, cv2.COLOR_BGR2HSV)

        hist1 = cv2.calcHist([hsv1], [0, 1], None, [30, 32], [0, 180, 0, 256])
        hist2 = cv2.calcHist([hsv2], [0, 1], None, [30, 32], [0, 180, 0, 256])

        cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)

        # Bhattacharyya distance: 0 is identical, 1 is completely disjoint
        b_dist = cv2.compareHist(hist1, hist2, cv2.HISTCMP_BHATTACHARYYA)

        # 2. Pixel intensity absolute difference
        gray1 = cv2.cvtColor(small1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(small2, cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(gray1, gray2)
        pixel_diff = float(np.mean(diff) / 255.0)

        # Weighted combination (70% color histogram, 30% spatial intensity)
        combined_score = round(0.7 * float(b_dist) + 0.3 * pixel_diff, 4)
        return min(1.0, max(0.0, combined_score))

    @classmethod
    def detect_candidate_scenes(
        cls,
        sampled_frames: List[Dict[str, Any]],
        analysis_id: str,
        threshold: float = 0.35
    ) -> List[Dict[str, Any]]:
        """
        Identify candidate scene boundaries from sequential sampled frames.
        """
        if len(sampled_frames) <= 1:
            return []

        candidates = []
        for i in range(1, len(sampled_frames)):
            prev_frame = sampled_frames[i - 1]
            curr_frame = sampled_frames[i]

            diff_score = cls.calculate_frame_difference(
                Path(prev_frame["file_path"]),
                Path(curr_frame["file_path"])
            )

            if diff_score >= threshold:
                candidates.append({
                    "id": f"scene_{len(candidates)+1}_{str(uuid.uuid4())[:8]}",
                    "analysis_id": analysis_id,
                    "timestamp": curr_frame["timestamp"],
                    "frame_index": curr_frame["frame_index"],
                    "difference_score": diff_score,
                    "reason": f"Visual shift between t={prev_frame['timestamp']}s and t={curr_frame['timestamp']}s (diff score: {diff_score:.2f})"
                })

        return candidates

scene_service = SceneService()
