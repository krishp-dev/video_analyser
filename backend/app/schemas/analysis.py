from typing import Optional, Any
from pydantic import BaseModel, Field
from app.schemas.video import VideoMetadata

class AnalysisConfig(BaseModel):
    sample_rate_fps: float = Field(default=1.0, ge=0.1, le=10.0, description="Frames sampled per second")
    confidence_threshold: float = Field(default=0.25, ge=0.05, le=0.95, description="YOLO detection confidence threshold")
    max_keyframes: int = Field(default=10, ge=1, le=30, description="Maximum keyframes to extract")
    enable_captioning: bool = Field(default=True, description="Enable AI frame captioning (BLIP)")
    max_captions: int = Field(default=15, ge=1, le=50, description="Maximum frames to caption")
    scene_threshold: float = Field(default=0.35, ge=0.05, le=0.95, description="Scene change difference threshold")

class AnalysisCreateRequest(BaseModel):
    video_id: str
    config: Optional[AnalysisConfig] = None

class DetectionItem(BaseModel):
    id: str
    frame_id: str
    class_name: str
    confidence: float
    bbox: list[float]  # [x1, y1, x2, y2] pixel coordinates
    timestamp: float
    model_name: str
    track_id: Optional[int] = None
    attributes: Optional[dict[str, Any]] = None

class CaptionItem(BaseModel):
    id: str
    frame_id: str
    timestamp: float
    caption_text: str
    model_name: str
    status: str

class SceneCandidateItem(BaseModel):
    id: str
    timestamp: float
    frame_index: int
    difference_score: float
    reason: str

class KeyframeItem(BaseModel):
    id: str
    frame_id: str
    timestamp: float
    preview_url: str
    selection_reason: str
    detections_count: int = 0
    caption_text: Optional[str] = None
    detections: list[DetectionItem] = []

class SampledFrameDetail(BaseModel):
    id: str
    frame_index: int
    timestamp: float
    width: int
    height: int
    preview_url: str
    detections: list[DetectionItem] = []
    caption: Optional[str] = None

class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    video_id: str
    status: str
    stage: str
    human_status: str
    progress_current: int
    progress_total: int
    progress_percentage: float
    warnings: list[str] = []
    errors: list[str] = []
    elapsed_time_seconds: Optional[float] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

class AnalysisSummarySection(BaseModel):
    overall_description: str
    chronological_observations: list[str]
    frequently_detected_objects: dict[str, int]
    significant_timestamps: list[float]
    evidence_statement: str
    limitations: list[str]

class AnalysisDetailResponse(BaseModel):
    analysis_id: str
    video: VideoMetadata
    status: str
    stage: str
    config: AnalysisConfig
    summary: Optional[AnalysisSummarySection] = None
    summary_raw_text: Optional[str] = None
    scene_candidates: list[SceneCandidateItem] = []
    detections: list[DetectionItem] = []
    captions: list[CaptionItem] = []
    keyframes: list[KeyframeItem] = []
    class_distribution: dict[str, int] = {}
    total_detections: int = 0
    warnings: list[str] = []
    errors: list[str] = []
    processing_duration: Optional[float] = None
    models_used: dict[str, str] = {}
    domain_insights: Optional[dict[str, Any]] = None
    created_at: str

class SearchMomentItem(BaseModel):
    timestamp: float
    formatted_time: str
    relevance_score: float
    match_type: str  # "object", "attribute", "caption", "scene"
    label: str
    description: str
    bbox: Optional[list[float]] = None
    frame_preview_url: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    total_matches: int
    results: list[SearchMomentItem]

class AnalysisListItem(BaseModel):
    analysis_id: str
    video_id: str
    original_name: str
    status: str
    stage: str
    duration: float
    total_detections: int
    keyframes_count: int
    created_at: str
    completed_at: Optional[str] = None
