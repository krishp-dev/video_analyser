export interface VideoMetadata {
  id: string;
  filename: string;
  original_name: string;
  file_size: number;
  duration: number;
  fps: number;
  width: number;
  height: number;
  total_frames?: number;
  format: string;
  mime_type?: string;
  created_at: string;
}

export interface AnalysisConfig {
  sample_rate_fps: number;
  confidence_threshold: number;
  max_keyframes: number;
  enable_captioning: boolean;
  max_captions: number;
  scene_threshold: number;
}

export interface Detection {
  id: string;
  frame_id: string;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  timestamp: number;
  model_name: string;
  track_id?: number;
  attributes?: Record<string, any>;
}

export interface Caption {
  id: string;
  frame_id: string;
  timestamp: number;
  caption_text: string;
  model_name: string;
  status: 'completed' | 'failed';
}

export interface SceneCandidate {
  id: string;
  timestamp: number;
  frame_index: number;
  difference_score: number;
  reason: string;
}

export interface Keyframe {
  id: string;
  frame_id: string;
  timestamp: number;
  preview_url: string;
  selection_reason: string;
  detections_count: number;
  caption_text?: string;
  detections: Detection[];
}

export interface AnalysisSummary {
  overall_description: string;
  chronological_observations: string[];
  frequently_detected_objects: Record<string, number>;
  significant_timestamps: number[];
  evidence_statement: string;
  limitations: string[];
}

export interface AnalysisDetail {
  analysis_id: string;
  video: VideoMetadata;
  status: string;
  stage: string;
  config: AnalysisConfig;
  summary?: AnalysisSummary;
  summary_raw_text?: string;
  scene_candidates: SceneCandidate[];
  detections: Detection[];
  captions: Caption[];
  keyframes: Keyframe[];
  class_distribution: Record<string, number>;
  total_detections: number;
  warnings: string[];
  errors: string[];
  processing_duration?: number;
  models_used: {
    object_detection?: string;
    image_captioning?: string;
  };
  domain_insights?: {
    domain_type: string;
    primary_metric_label: string;
    primary_metric_value: string;
    status_indicator: string;
    details: Record<string, any>;
  };
  created_at: string;
}

export interface SearchMomentItem {
  timestamp: number;
  formatted_time: string;
  relevance_score: number;
  match_type: 'object' | 'attribute' | 'caption' | 'scene';
  label: string;
  description: string;
  bbox?: [number, number, number, number];
  frame_preview_url?: string;
}

export interface SearchResponse {
  query: string;
  total_matches: number;
  results: SearchMomentItem[];
}

export interface AnalysisStatus {
  analysis_id: string;
  video_id: string;
  status: 'queued' | 'validating' | 'extracting_frames' | 'detecting_scenes' | 'detecting_objects' | 'generating_captions' | 'selecting_keyframes' | 'generating_summary' | 'completed' | 'completed_with_warnings' | 'failed' | 'cancelled';
  stage: string;
  human_status: string;
  progress_current: number;
  progress_total: number;
  progress_percentage: number;
  warnings: string[];
  errors: string[];
  elapsed_time_seconds?: number;
  started_at?: string;
  completed_at?: string;
}

export interface AnalysisListItem {
  analysis_id: string;
  video_id: string;
  original_name: string;
  status: string;
  stage: string;
  duration: number;
  total_detections: number;
  keyframes_count: number;
  created_at: string;
  completed_at?: string;
}

export interface SystemHealth {
  status: string;
  app_name: string;
  version: string;
  hardware: {
    device: string;
    device_name: string;
    cuda_available: boolean;
  };
  tools: {
    ffmpeg_available: boolean;
    ffprobe_available: boolean;
    opencv_available: boolean;
  };
  models: {
    object_detector: string;
    caption_model: string;
    captioning_enabled: boolean;
  };
  limits: {
    max_file_size_mb: number;
    max_duration_seconds: number;
    max_resolution: string;
  };
}
