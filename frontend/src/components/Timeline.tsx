import React from 'react';
import { Sparkles, Scissors, Clock } from 'lucide-react';
import { Detection, SceneCandidate } from '../types';
import { formatTimestamp } from '../utils/formatters';

interface TimelineProps {
  duration: number;
  currentTime: number;
  detections: Detection[];
  sceneCandidates: SceneCandidate[];
  onSeekTo: (timestamp: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  detections,
  sceneCandidates,
  onSeekTo,
}) => {
  const safeDuration = Math.max(1, duration);

  // Group detections by rounded timestamp
  const detectionsByTimestamp = detections.reduce((acc, d) => {
    const t = Math.round(d.timestamp * 10) / 10;
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-slate-100">Interactive Visual Timeline</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-400" />
            <span>Object Detections</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span>Scene Shifts</span>
          </span>
          <span className="font-mono text-brand-300 font-medium">
            t = {formatTimestamp(currentTime)}
          </span>
        </div>
      </div>

      {/* Main Timeline Bar */}
      <div className="relative h-14 w-full rounded-xl bg-dark-950 border border-dark-750/80 p-2 overflow-hidden select-none">
        {/* Playhead Indicator */}
        <div
          className="absolute top-0 bottom-0 z-20 w-0.5 bg-brand-400 shadow-[0_0_8px_rgba(99,102,241,0.8)] transition-all pointer-events-none"
          style={{ left: `${(currentTime / safeDuration) * 100}%` }}
        >
          <div className="absolute -top-1 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-brand-400" />
        </div>

        {/* Scene Change Markers (Amber diamonds) */}
        {sceneCandidates.map((scene) => {
          const leftPct = (scene.timestamp / safeDuration) * 100;
          return (
            <button
              key={scene.id}
              onClick={() => onSeekTo(scene.timestamp)}
              title={`Scene shift at ${formatTimestamp(scene.timestamp)}: ${scene.reason}`}
              className="absolute top-1 -translate-x-1/2 z-10 p-0.5 hover:scale-125 transition-transform"
              style={{ left: `${leftPct}%` }}
              aria-label={`Scene Shift at ${formatTimestamp(scene.timestamp)}`}
            >
              <div className="h-3 w-3 rotate-45 rounded-sm bg-amber-400 border border-amber-200 shadow-sm" />
            </button>
          );
        })}

        {/* Detection Markers (Violet pills) */}
        {Object.entries(detectionsByTimestamp).map(([tStr, count]) => {
          const t = parseFloat(tStr);
          const leftPct = (t / safeDuration) * 100;
          return (
            <button
              key={`det_${tStr}`}
              onClick={() => onSeekTo(t)}
              title={`${count} detection(s) at ${formatTimestamp(t)}`}
              className="absolute bottom-1 -translate-x-1/2 z-10 p-0.5 hover:scale-125 transition-transform"
              style={{ left: `${leftPct}%` }}
              aria-label={`${count} detections at ${formatTimestamp(t)}`}
            >
              <div className="h-4 w-2 rounded-full bg-brand-500 hover:bg-brand-400 border border-brand-300 shadow-sm" />
            </button>
          );
        })}
      </div>

      {/* Timeline Click Guidance */}
      <p className="text-[11px] text-slate-400">
        Click any marker along the timeline to instantly seek the video player to that timestamp.
      </p>
    </div>
  );
};
