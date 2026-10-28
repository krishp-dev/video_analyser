import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileVideo,
  AlertCircle,
  Sliders,
  CheckCircle2,
  Trash2,
  Play,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { AnalysisConfig, VideoMetadata } from '../types';
import { formatBytes, formatDuration } from '../utils/formatters';

interface UploadPageProps {
  onAnalysisStarted: (analysisId: string) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onAnalysisStarted }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Upload & processing state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Configuration state
  const [config, setConfig] = useState<AnalysisConfig>({
    sample_rate_fps: 1.0,
    confidence_threshold: 0.25,
    max_keyframes: 10,
    enable_captioning: true,
    max_captions: 15,
    scene_threshold: 0.35,
  });

  const handleFile = (file: File) => {
    setValidationError(null);

    // 1. Extension check
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['mp4', 'mov', 'webm', 'avi'];
    if (!ext || !allowed.includes(ext)) {
      setValidationError(`Invalid file type '.${ext}'. Please select an MP4, MOV, WebM, or AVI video.`);
      return;
    }

    // 2. Size check (100 MB max)
    if (file.size > 100 * 1024 * 1024) {
      setValidationError(`File size (${formatBytes(file.size)}) exceeds the maximum allowed limit of 100 MB.`);
      return;
    }

    // Create object URL for client preview & metadata probe
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);

    // Inspect video duration and resolution
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      setVideoDuration(tempVideo.duration);
      setVideoResolution({
        width: tempVideo.videoWidth,
        height: tempVideo.videoHeight
      });

      if (tempVideo.duration > 300) {
        setValidationError(`Video duration (${formatDuration(tempVideo.duration)}) exceeds maximum limit of 5 minutes.`);
      } else if (tempVideo.videoWidth > 1920 || tempVideo.videoHeight > 1080) {
        setValidationError(`Video resolution (${tempVideo.videoWidth}x${tempVideo.videoHeight}) exceeds maximum 1080p limit.`);
      }
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setVideoDuration(null);
    setVideoResolution(null);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // 1. Upload video
      const uploadRes = await api.uploadVideo(selectedFile, (pct) => {
        setUploadProgress(pct);
      });

      // 2. Start analysis with config
      const analysisRes = await api.startAnalysis(uploadRes.video.id, config);

      // 3. Transition to processing screen
      onAnalysisStarted(analysisRes.analysis_id);
    } catch (err: any) {
      setValidationError(err.message || 'Failed to start analysis.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Start New Video Analysis</h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload an input video and configure computer vision sampling, detection, and captioning parameters.
        </p>
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="text-sm">
            <span className="font-semibold">Validation Issue: </span>
            {validationError}
          </div>
        </div>
      )}

      {/* Upload Drop Zone / Preview */}
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-dark-750 bg-dark-900/60 hover:border-brand-500/50 hover:bg-dark-850/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mov,.webm,.avi,video/mp4,video/webm,video/quicktime,video/x-msvideo"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-dark-800 text-brand-400 group-hover:scale-110 group-hover:bg-brand-500/20 transition-all shadow-md">
            <UploadCloud className="h-8 w-8" />
          </div>

          <h3 className="mt-4 text-base font-semibold text-white">
            Drag and drop your video here, or <span className="text-brand-400 underline underline-offset-4">browse files</span>
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Supported formats: MP4, MOV, WebM, AVI &bull; Max 100 MB &bull; Up to 5 minutes duration
          </p>
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {/* Preview Player */}
            <div className="overflow-hidden rounded-xl border border-dark-750 bg-black flex items-center justify-center max-h-[300px]">
              <video
                src={previewUrl || ''}
                controls
                className="w-full h-full object-contain"
              />
            </div>

            {/* Video File Information */}
            <div className="space-y-4 flex flex-col justify-between text-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileVideo className="h-4 w-4 text-brand-400" />
                    <span className="font-semibold text-sm text-white truncate max-w-[220px]">
                      {selectedFile.name}
                    </span>
                  </div>
                  <button
                    onClick={handleRemove}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Remove Video"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg bg-dark-850 p-3 border border-dark-750">
                    <span className="text-slate-400">File Size</span>
                    <div className="text-slate-200 font-semibold text-sm mt-0.5">
                      {formatBytes(selectedFile.size)}
                    </div>
                  </div>

                  <div className="rounded-lg bg-dark-850 p-3 border border-dark-750">
                    <span className="text-slate-400">Duration</span>
                    <div className="text-slate-200 font-semibold text-sm mt-0.5">
                      {videoDuration !== null ? formatDuration(videoDuration) : 'Calculating...'}
                    </div>
                  </div>

                  <div className="rounded-lg bg-dark-850 p-3 border border-dark-750">
                    <span className="text-slate-400">Resolution</span>
                    <div className="text-slate-200 font-semibold text-sm mt-0.5">
                      {videoResolution ? `${videoResolution.width} × ${videoResolution.height}` : 'Reading...'}
                    </div>
                  </div>

                  <div className="rounded-lg bg-dark-850 p-3 border border-dark-750">
                    <span className="text-slate-400">Format</span>
                    <div className="text-slate-200 font-semibold text-sm mt-0.5 uppercase">
                      {selectedFile.name.split('.').pop()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Progress Bar if active */}
              {isUploading && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-300 font-medium">Uploading video to backend...</span>
                    <span className="font-mono text-slate-300 font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-dark-800">
                    <div
                      className="h-full bg-brand-500 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analysis Configuration Panel */}
      <div className="card-surface p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-dark-750 pb-4">
          <Sliders className="h-5 w-5 text-brand-400" />
          <h2 className="text-base font-semibold text-white">Pipeline Inference Parameters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Frame Sampling Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-slate-200 flex items-center gap-1.5">
                <span>Frame Sampling Frequency</span>
                <span className="font-mono text-brand-400 font-semibold">{config.sample_rate_fps} fps</span>
              </label>
            </div>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.1}
              value={config.sample_rate_fps}
              onChange={(e) => setConfig({ ...config, sample_rate_fps: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-dark-750 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <p className="text-[11px] text-slate-400">
              Samples 1 frame every {Math.round(1 / config.sample_rate_fps * 10) / 10}s of playback. Lower values speed up CPU inference.
            </p>
          </div>

          {/* YOLO Confidence Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-slate-200 flex items-center gap-1.5">
                <span>YOLO Detection Confidence</span>
                <span className="font-mono text-brand-400 font-semibold">{Math.round(config.confidence_threshold * 100)}%</span>
              </label>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.8}
              step={0.05}
              value={config.confidence_threshold}
              onChange={(e) => setConfig({ ...config, confidence_threshold: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-dark-750 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <p className="text-[11px] text-slate-400">
              Minimum detection score required to record an object bounding box (default: 25%).
            </p>
          </div>

          {/* Max Keyframes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-slate-200 flex items-center gap-1.5">
                <span>Maximum Keyframes</span>
                <span className="font-mono text-brand-400 font-semibold">{config.max_keyframes}</span>
              </label>
            </div>
            <input
              type="range"
              min={3}
              max={20}
              step={1}
              value={config.max_keyframes}
              onChange={(e) => setConfig({ ...config, max_keyframes: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-dark-750 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <p className="text-[11px] text-slate-400">
              Target count of representative deduplicated anchor frames for report gallery.
            </p>
          </div>

          {/* Scene Shift Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-slate-200 flex items-center gap-1.5">
                <span>Scene Shift Difference Threshold</span>
                <span className="font-mono text-brand-400 font-semibold">{config.scene_threshold}</span>
              </label>
            </div>
            <input
              type="range"
              min={0.15}
              max={0.65}
              step={0.05}
              value={config.scene_threshold}
              onChange={(e) => setConfig({ ...config, scene_threshold: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-dark-750 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <p className="text-[11px] text-slate-400">
              Bhattacharyya distance threshold for visual color/luminance shift detection.
            </p>
          </div>

          {/* Visual Frame Captioning Toggle */}
          <div className="md:col-span-2 pt-2 border-t border-dark-750 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-400" />
                <span className="font-medium text-slate-200">AI Visual Descriptions (BLIP Captioning)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Generate descriptive sentences for key scene frames. Uses pretrained Salesforce BLIP model.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enable_captioning}
                onChange={(e) => setConfig({ ...config, enable_captioning: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>
        </div>

        {/* Start Analysis Button */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading || !!validationError}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all ${
              !selectedFile || isUploading || !!validationError
                ? 'bg-dark-750 text-slate-500 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-500 shadow-brand-500/25 transform hover:-translate-y-0.5'
            }`}
          >
            <Play className="h-4 w-4 fill-current" />
            <span>{isUploading ? 'Uploading Video...' : 'Begin AI Video Analysis'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
