import React, { useEffect, useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Ban
} from 'lucide-react';
import { api } from '../services/api';
import { AnalysisStatus } from '../types';

interface ProcessingPageProps {
  analysisId: string;
  onCompleted: (analysisId: string) => void;
  onRetry: () => void;
}

const STAGES_FLOW = [
  { id: 'validating', label: 'Video Validation' },
  { id: 'extracting_frames', label: 'Frame Sampling' },
  { id: 'detecting_scenes', label: 'Scene Boundary Detection' },
  { id: 'detecting_objects', label: 'YOLO Object Detection' },
  { id: 'generating_captions', label: 'BLIP Visual Descriptions' },
  { id: 'selecting_keyframes', label: 'Keyframe Selection' },
  { id: 'generating_summary', label: 'Evidence Summarization' },
];

export const ProcessingPage: React.FC<ProcessingPageProps> = ({
  analysisId,
  onCompleted,
  onRetry,
}) => {
  const [statusData, setStatusData] = useState<AnalysisStatus | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const data = await api.getAnalysisStatus(analysisId);
        if (!isMounted) return;
        setStatusData(data);
        setPollError(null);

        // Terminal states
        if (data.status === 'completed' || data.status === 'completed_with_warnings') {
          // Finished!
          return;
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          return;
        } else {
          // Poll every 1.5s
          timer = setTimeout(poll, 1500);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setPollError(err.message || 'Error communicating with analysis service.');
        timer = setTimeout(poll, 3000);
      }
    };

    poll();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [analysisId]);

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      await api.cancelAnalysis(analysisId);
    } catch (e) {
      // Ignore
    } finally {
      setIsCancelling(false);
    }
  };

  const isTerminal = statusData?.status === 'completed' || statusData?.status === 'completed_with_warnings';
  const isFailed = statusData?.status === 'failed';
  const isCancelled = statusData?.status === 'cancelled';

  // Find index of current stage in STAGES_FLOW
  const currentStageIndex = STAGES_FLOW.findIndex((s) => s.id === statusData?.stage);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {isTerminal ? 'Analysis Complete' : isFailed ? 'Analysis Encountered an Error' : isCancelled ? 'Analysis Cancelled' : 'Processing Video Analysis'}
        </h1>
        <p className="text-sm text-slate-400 font-mono">
          Job Reference: {analysisId}
        </p>
      </div>

      {/* Main Processing Box */}
      <div className="card-surface p-6 sm:p-8 space-y-6">
        {/* State Icon & Primary Status */}
        <div className="flex flex-col items-center text-center space-y-3">
          {isTerminal ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          ) : isFailed ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <XCircle className="h-8 w-8" />
            </div>
          ) : isCancelled ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Ban className="h-8 w-8" />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30 shadow-lg shadow-brand-500/20 animate-pulse">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-white">
              {statusData?.human_status || 'Initializing Pipeline...'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isTerminal
                ? 'All video processing, detection, and summarization stages completed.'
                : isFailed
                ? 'The analysis pipeline stopped due to an error.'
                : 'Local AI models are actively analyzing video frames. Please do not close this window.'}
            </p>
          </div>
        </div>

        {/* Real Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Pipeline Completion</span>
            <span className="font-mono text-brand-300 font-bold">
              {statusData ? `${statusData.progress_percentage.toFixed(0)}%` : '0%'}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-dark-800 border border-dark-750">
            <div
              className={`h-full transition-all duration-300 ${
                isTerminal
                  ? 'bg-emerald-500'
                  : isFailed
                  ? 'bg-rose-500'
                  : isCancelled
                  ? 'bg-amber-500'
                  : 'bg-brand-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(statusData?.progress_percentage || 0, 4))}%` }}
            />
          </div>
        </div>

        {/* Stage Checklist */}
        <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-2.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Pipeline Execution Flow
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {STAGES_FLOW.map((stage, idx) => {
              const isPast = currentStageIndex > idx || isTerminal;
              const isCurrent = currentStageIndex === idx && !isTerminal && !isFailed && !isCancelled;

              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
                      : isPast
                      ? 'text-slate-300'
                      : 'text-slate-400'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 text-brand-400 animate-spin shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-dark-600 shrink-0" />
                  )}
                  <span className="font-medium">{stage.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diagnostic Warnings (if any) */}
        {statusData?.warnings && statusData.warnings.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1.5 text-xs text-amber-300">
            <div className="flex items-center gap-1.5 font-semibold text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Pipeline Diagnostic Warnings</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              {statusData.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Errors (if failed) */}
        {statusData?.errors && statusData.errors.length > 0 && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-1.5 text-xs text-rose-300">
            <div className="flex items-center gap-1.5 font-semibold text-rose-400">
              <XCircle className="h-4 w-4" />
              <span>Execution Error Details</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              {statusData.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Elapsed: {statusData?.elapsed_time_seconds !== undefined ? `${statusData.elapsed_time_seconds}s` : 'Counting...'}
            </span>
          </div>

          <div className="flex gap-3">
            {!isTerminal && !isFailed && !isCancelled && (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex items-center gap-1.5 rounded-lg border border-dark-700 bg-dark-800 hover:bg-dark-750 text-slate-300 px-3.5 py-2 text-xs font-medium transition"
              >
                <Ban className="h-3.5 w-3.5 text-slate-400" />
                <span>{isCancelling ? 'Cancelling...' : 'Cancel Job'}</span>
              </button>
            )}

            {(isFailed || isCancelled) && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-white px-4 py-2 text-xs font-semibold transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Try Another Video</span>
              </button>
            )}

            {isTerminal && (
              <button
                onClick={() => onCompleted(analysisId)}
                className="flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 text-xs font-semibold shadow-lg shadow-brand-500/25 transition transform hover:-translate-y-0.5"
              >
                <span>View Full Analysis Results</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
