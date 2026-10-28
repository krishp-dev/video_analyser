import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { formatDuration } from '../utils/formatters';
import { Detection } from '../types';

export interface VideoPlayerRef {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
}

interface VideoPlayerProps {
  streamUrl: string;
  detections?: Detection[];
  videoDuration?: number;
  onTimeUpdate?: (currentTime: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  streamUrl,
  detections = [],
  videoDuration = 0,
  onTimeUpdate
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(videoDuration);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showTripwire, setShowTripwire] = useState(false);

  // Expose imperative seeking handle
  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, Math.min(seconds, duration || 9999));
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    },
    play: () => videoRef.current?.play().catch(() => {}),
    pause: () => videoRef.current?.pause(),
  }));

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      onTimeUpdate?.(cur);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      if (d && !isNaN(d) && d > 0) {
        setDuration(d);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  // Find active detections for current time window (+/- 0.6s)
  const activeDetections = showOverlays
    ? detections.filter((d) => Math.abs(d.timestamp - currentTime) < 0.6)
    : [];

  // Tripwire cross count
  const tripwireCount = detections.filter(d => d.bbox && (d.bbox[1] + d.bbox[3]) / 2.0 > 180).length;

  return (
    <div
      ref={containerRef}
      className="group relative overflow-hidden rounded-xl border border-dark-750 bg-black shadow-2xl"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={streamUrl}
        className="h-full w-full max-h-[500px] object-contain cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        playsInline
      />

      {/* Real-Time Detection Overlays (with Track IDs & Ripeness) */}
      {showOverlays && activeDetections.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-start p-4">
          <div className="flex flex-wrap gap-2">
            {activeDetections.map((det) => {
              const track = det.track_id ? `#${det.track_id} ` : '';
              const rip = det.attributes?.ripeness_status ? ` • ${det.attributes.ripeness_status}` : '';
              return (
                <span
                  key={det.id}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand-600/90 px-2.5 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-md border border-brand-400/40"
                >
                  <Sparkles className="h-3 w-3 text-brand-200" />
                  {track}{det.class_name} ({Math.round(det.confidence * 100)}%){rip}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Virtual Tripwire Line */}
      {showTripwire && (
        <div
          className="pointer-events-none absolute inset-x-0 z-15 border-b-2 border-dashed border-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.8)] flex items-center justify-between px-3"
          style={{ top: '55%' }}
        >
          <span className="bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono px-2 py-0.5 rounded shadow">
            TRIPWIRE SENSOR A &bull; {tripwireCount} DETECTIONS MONITORED
          </span>
          <span className="bg-cyan-950/90 text-cyan-400 border border-cyan-500/40 text-[10px] font-mono px-2 py-0.5 rounded">
            ACTIVE ROI
          </span>
        </div>
      )}

      {/* Custom Video Controls Bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
        {/* Scrubber Range Bar */}
        <div className="relative mb-3 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-dark-700/80 accent-brand-500 hover:accent-brand-400"
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between text-slate-200">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="rounded-lg p-1.5 hover:bg-white/10 transition"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>

            {/* Restart */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => {});
                  setIsPlaying(true);
                }
              }}
              className="rounded-lg p-1.5 hover:bg-white/10 transition text-slate-400 hover:text-white"
              aria-label="Restart Video"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="rounded-lg p-1.5 hover:bg-white/10 transition"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 cursor-pointer appearance-none rounded-lg bg-dark-700 accent-brand-500"
              />
            </div>

            {/* Time display */}
            <div className="font-mono text-xs text-slate-300 ml-2">
              <span>{formatDuration(currentTime)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-slate-400">{formatDuration(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tripwire Toggle */}
            <button
              onClick={() => setShowTripwire(!showTripwire)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                showTripwire
                  ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                  : 'border-dark-700 bg-dark-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Virtual Tripwire Boundary"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Tripwire {showTripwire ? 'ON' : 'OFF'}</span>
            </button>

            {/* Toggle Overlay Badge */}
            {detections.length > 0 && (
              <button
                onClick={() => setShowOverlays(!showOverlays)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                  showOverlays
                    ? 'border-brand-500/40 bg-brand-500/20 text-brand-300'
                    : 'border-dark-700 bg-dark-800 text-slate-400'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Tags: {showOverlays ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="rounded-lg p-1.5 hover:bg-white/10 transition"
              aria-label="Toggle Fullscreen"
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
