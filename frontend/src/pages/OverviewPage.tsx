import React from 'react';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  Sparkles,
  Cpu,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { AnalysisListItem, SystemHealth } from '../types';
import { formatDate, formatDuration } from '../utils/formatters';

interface OverviewPageProps {
  analyses: AnalysisListItem[];
  health: SystemHealth | null;
  onStartNew: () => void;
  onViewAnalysis: (id: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  analyses,
  health,
  onStartNew,
  onViewAnalysis,
}) => {
  const completedCount = analyses.filter((a) => a.status === 'completed' || a.status === 'completed_with_warnings').length;
  const totalDetections = analyses.reduce((sum, a) => sum + (a.total_detections || 0), 0);
  const totalKeyframes = analyses.reduce((sum, a) => sum + (a.keyframes_count || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-dark-750 bg-gradient-to-r from-dark-900 via-dark-850 to-brand-950/30 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-Powered Local Computer Vision Platform</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Intelligent Video Analysis & Evidence-Grounded Summarization
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Extract representative keyframes, track candidate scene boundaries, run real YOLO object detection, generate visual descriptions with BLIP, and synthesize deterministic video summaries completely on local hardware.
          </p>

          <div className="pt-2 flex flex-wrap gap-4">
            <button
              onClick={onStartNew}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Start New Analysis</span>
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="card-surface p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Completed Analyses</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{completedCount}</div>
          <p className="text-xs text-slate-400">Total persistent runs in database</p>
        </div>

        {/* Metric 2 */}
        <div className="card-surface p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Objects Detected</span>
            <Sparkles className="h-4 w-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalDetections}</div>
          <p className="text-xs text-slate-400">Bounding boxes across all jobs</p>
        </div>

        {/* Metric 3 */}
        <div className="card-surface p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Keyframes Extracted</span>
            <Layers className="h-4 w-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalKeyframes}</div>
          <p className="text-xs text-slate-400">Salient scene and anchor frames</p>
        </div>

        {/* Metric 4 */}
        <div className="card-surface p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">AI Inference Device</span>
            <Cpu className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold uppercase text-white">
            {health?.hardware.cuda_available ? 'CUDA GPU' : 'CPU'}
          </div>
          <p className="text-xs text-slate-400">
            {health ? `${health.models.object_detector} active` : 'Detecting...'}
          </p>
        </div>
      </div>

      {/* System Readiness Verification Card */}
      <div className="card-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">System & Model Status</h2>
          </div>
          <span className="text-xs text-slate-400">Strict local evaluation policy</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-1">
            <span className="text-slate-400 font-medium">Object Detection</span>
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Ultralytics YOLO (yolov8n)</span>
            </div>
            <p className="text-[11px] text-slate-400">COCO 80 categories, cached locally</p>
          </div>

          <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-1">
            <span className="text-slate-400 font-medium">Image Captioning</span>
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Salesforce BLIP Base</span>
            </div>
            <p className="text-[11px] text-slate-400">Visual frame descriptions</p>
          </div>

          <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-1">
            <span className="text-slate-400 font-medium">Media Pipeline</span>
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>OpenCV & FFprobe</span>
            </div>
            <p className="text-[11px] text-slate-400">Frame-accurate PTS timestamps</p>
          </div>
        </div>
      </div>

      {/* Recent Analyses Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Recent Analyses</h2>
          {analyses.length > 0 && (
            <span className="text-xs text-slate-400">Showing last {Math.min(analyses.length, 5)} jobs</span>
          )}
        </div>

        {analyses.length === 0 ? (
          <div className="card-surface p-10 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-dark-800 text-slate-500">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">No analyses recorded yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload an MP4, WebM, MOV, or AVI video to perform local object detection, keyframe selection, and automated summarization.
            </p>
            <button
              onClick={onStartNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-500 transition shadow-sm"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Analyze First Video</span>
            </button>
          </div>
        ) : (
          <div className="card-surface overflow-hidden">
            <div className="divide-y divide-dark-750">
              {analyses.slice(0, 5).map((a) => (
                <div
                  key={a.analysis_id}
                  onClick={() => onViewAnalysis(a.analysis_id)}
                  className="flex items-center justify-between p-4 hover:bg-dark-800/60 cursor-pointer transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-200">{a.original_name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          a.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : a.status === 'completed_with_warnings'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : a.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                        }`}
                      >
                        {a.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Duration: {formatDuration(a.duration)}</span>
                      <span>Detections: {a.total_detections}</span>
                      <span>Keyframes: {a.keyframes_count}</span>
                      <span>{formatDate(a.created_at)}</span>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-500 hover:text-brand-400 transition" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
