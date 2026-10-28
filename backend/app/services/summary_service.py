from typing import List, Dict, Any, Optional
from collections import Counter

class SummaryService:
    @classmethod
    def generate_summary(
        cls,
        video_metadata: Dict[str, Any],
        sampled_frames: List[Dict[str, Any]],
        detections: List[Dict[str, Any]],
        captions: List[Dict[str, Any]],
        scene_candidates: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Produce a deterministic, evidence-grounded summary strictly based on observed model outputs.
        """
        duration = video_metadata.get("duration", 0.0)
        total_frames_sampled = len(sampled_frames)
        total_detections = len(detections)

        # Count detected classes
        class_counts = Counter(d["class_name"] for d in detections)
        freq_objects = dict(class_counts.most_common(8))

        # Filter completed captions
        valid_captions = [c for c in captions if c.get("status") == "completed" and c.get("caption_text")]

        # Chronological observations
        chronological_notes = []

        # Index detections and captions by rounded timestamp (e.g. 1s bins)
        timeline_buckets: Dict[float, Dict[str, Any]] = {}
        for f in sampled_frames:
            t = round(f["timestamp"], 1)
            timeline_buckets[t] = {
                "classes": set(),
                "caption": None,
                "is_scene_boundary": False
            }

        for d in detections:
            t = round(d["timestamp"], 1)
            if t in timeline_buckets:
                timeline_buckets[t]["classes"].add(d["class_name"])

        for c in valid_captions:
            t = round(c["timestamp"], 1)
            if t in timeline_buckets:
                timeline_buckets[t]["caption"] = c["caption_text"]

        for s in scene_candidates:
            t = round(s["timestamp"], 1)
            if t in timeline_buckets:
                timeline_buckets[t]["is_scene_boundary"] = True

        # Synthesize chronological entries, deduplicating repetitive neighboring statements
        last_caption = None
        last_classes = set()

        for t in sorted(timeline_buckets.keys()):
            bucket = timeline_buckets[t]
            classes = bucket["classes"]
            cap = bucket["caption"]
            is_scene = bucket["is_scene_boundary"]

            # Only emit an observation if there is content or scene change
            if classes or cap or is_scene:
                parts = []
                if is_scene:
                    parts.append("[Candidate Scene Shift]")
                if cap and cap != last_caption:
                    parts.append(f"Visual scene described: \"{cap}\"")
                    last_caption = cap
                if classes and classes != last_classes:
                    parts.append(f"Detected entities: {', '.join(sorted(classes))}")
                    last_classes = classes

                if parts:
                    chronological_notes.append(f"At {t:.1f}s: " + " — ".join(parts))

        # Significant timestamps
        sig_timestamps = sorted(list({
            round(s["timestamp"], 1) for s in scene_candidates
        } | {
            round(c["timestamp"], 1) for c in valid_captions[:5]
        }))

        # Overall description synthesis
        if not valid_captions and not detections:
            overall_desc = (
                f"Video of duration {duration:.1f}s was sampled across {total_frames_sampled} frames. "
                "No visual objects met the configured detection confidence threshold, and no descriptive captions were generated."
            )
        elif valid_captions and freq_objects:
            top_classes = ", ".join([f"{k} ({v})" for k, v in list(freq_objects.items())[:4]])
            sample_caps = "; ".join([c["caption_text"] for c in valid_captions[:3]])
            overall_desc = (
                f"Video of duration {duration:.1f}s analyzed across {total_frames_sampled} sampled frames. "
                f"Primary detected entities include: {top_classes}. "
                f"Visual descriptions highlight observed scenes: {sample_caps}."
            )
        elif freq_objects:
            top_classes = ", ".join([f"{k} ({v})" for k, v in list(freq_objects.items())[:4]])
            overall_desc = (
                f"Video of duration {duration:.1f}s analyzed across {total_frames_sampled} sampled frames. "
                f"Detected prominent entities: {top_classes}. Frame captioning was not completed for this run."
            )
        else:
            sample_caps = "; ".join([c["caption_text"] for c in valid_captions[:3]])
            overall_desc = (
                f"Video of duration {duration:.1f}s analyzed across {total_frames_sampled} sampled frames. "
                f"Visual frame descriptions captured: {sample_caps}."
            )

        evidence_stmt = (
            f"Evidence base: {total_frames_sampled} sampled frames evaluated, "
            f"{total_detections} object detections recorded across {len(class_counts)} distinct classes, "
            f"{len(valid_captions)} visual descriptions generated, and "
            f"{len(scene_candidates)} candidate scene transitions calculated."
        )

        limitations = [
            "Object detection detects bounding boxes for supported COCO classes and does not verify human intent, relationship, or identity.",
            "Scene boundary candidates are calculated from visual histogram and luminance shifts and do not constitute full semantic story understanding.",
            f"Analysis is bounded by sampling rate of {video_metadata.get('sample_rate_fps', 1.0)} fps and confidence threshold; un-sampled intervals may contain unobserved events."
        ]

        return {
            "overall_description": overall_desc,
            "chronological_observations": chronological_notes[:25],  # keep concise
            "frequently_detected_objects": freq_objects,
            "significant_timestamps": sig_timestamps[:10],
            "evidence_statement": evidence_stmt,
            "limitations": limitations
        }

summary_service = SummaryService()
