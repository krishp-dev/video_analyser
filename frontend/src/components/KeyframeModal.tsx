import React, { useEffect } from 'react';
import { X, Play, Tag, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { Keyframe } from '../types';
import { formatTimestamp } from '../utils/formatters';

interface KeyframeModalProps {
  keyframe: Keyframe | null;
  onClose: () => void;
  onSeekTo: (timestamp: number) => void;
}

export const KeyframeModal: React.FC<KeyframeModalProps> = ({ keyframe, onClose, onSeekTo }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!keyframe) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-dark-700 bg-dark-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-750 px-6 py-4 bg-dark-850">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Keyframe Inspection
              </h3>
              <p className="font-mono text-xs text-brand-300">
                Timestamp: {formatTimestamp(keyframe.timestamp)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-dark-750 hover:text-white transition"
            aria-label="Close Modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Main Keyframe Image */}
          <div className="lg:col-span-2 space-y-3">
            <div className="overflow-hidden rounded-xl border border-dark-750 bg-black flex items-center justify-center min-h-[300px]">
              <img
                src={keyframe.preview_url}
                alt={`Keyframe at ${keyframe.timestamp}s`}
                className="w-full h-auto max-h-[460px] object-contain"
              />
            </div>
            
            <button
              onClick={() => {
                onSeekTo(keyframe.timestamp);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 text-sm font-medium transition shadow-md shadow-brand-600/20"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Seek Video Player to {formatTimestamp(keyframe.timestamp)}</span>
            </button>
          </div>

          {/* Details Sidebar */}
          <div className="space-y-4 text-xs">
            {/* Selection Reason */}
            <div className="rounded-xl border border-dark-750 bg-dark-850 p-4">
              <div className="text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-brand-400" />
                <span>Extraction Rationale</span>
              </div>
              <p className="text-slate-200 font-semibold leading-relaxed">
                {keyframe.selection_reason}
              </p>
            </div>

            {/* AI Visual Caption */}
            <div className="rounded-xl border border-dark-750 bg-dark-850 p-4">
              <div className="text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <span>Visual Description (BLIP)</span>
              </div>
              <p className="text-slate-200 italic leading-relaxed">
                {keyframe.caption_text ? `"${keyframe.caption_text}"` : 'No caption generated for this frame.'}
              </p>
            </div>

            {/* Detections on this frame */}
            <div className="rounded-xl border border-dark-750 bg-dark-850 p-4">
              <div className="text-slate-400 font-medium mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Detected Objects ({keyframe.detections.length})</span>
                </span>
              </div>
              {keyframe.detections.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {keyframe.detections.map((det) => (
                    <div
                      key={det.id}
                      className="flex items-center justify-between rounded-lg bg-dark-800 px-2.5 py-1.5 border border-dark-700"
                    >
                      <span className="font-medium text-slate-200 capitalize">{det.class_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-emerald-400">
                          {Math.round(det.confidence * 100)}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          [{det.bbox.map((v) => Math.round(v)).join(', ')}]
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No objects exceeded the confidence threshold.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
