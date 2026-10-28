import React from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  HardDrive,
  ShieldCheck,
  RotateCw,
  FolderOpen,
  Info
} from 'lucide-react';
import { SystemHealth } from '../types';

interface SettingsPageProps {
  health: SystemHealth | null;
  onRefreshHealth: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ health, onRefreshHealth }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-dark-750 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Settings & Diagnostics</h1>
          <p className="text-sm text-slate-400 mt-1">
            Environment specifications, hardware acceleration, and video processing constraints.
          </p>
        </div>

        <button
          onClick={onRefreshHealth}
          className="flex items-center gap-1.5 rounded-xl border border-dark-700 bg-dark-850 hover:bg-dark-800 text-slate-300 px-3.5 py-2 text-xs font-semibold transition"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {health ? (
        <div className="space-y-6 text-xs">
          {/* Hardware Acceleration */}
          <div className="card-surface p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Cpu className="h-4 w-4 text-brand-400" />
              <span>Inference Hardware Acceleration</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-1">
                <span className="text-slate-400 font-medium">Selected Device</span>
                <div className="text-sm font-semibold text-white uppercase font-mono">
                  {health.hardware.device}
                </div>
                <p className="text-slate-400 text-[11px]">
                  PyTorch execution backend
                </p>
              </div>

              <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-1">
                <span className="text-slate-400 font-medium">Device Identifier</span>
                <div className="text-sm font-semibold text-white font-mono truncate">
                  {health.hardware.device_name}
                </div>
                <p className="text-slate-400 text-[11px]">
                  {health.hardware.cuda_available ? 'Hardware GPU Acceleration Active' : 'CPU Execution Path Supported'}
                </p>
              </div>
            </div>
          </div>

          {/* Media Tools */}
          <div className="card-surface p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <HardDrive className="h-4 w-4 text-emerald-400" />
              <span>Decoding & Processing Binaries</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-1">
                <span className="text-slate-400 font-medium">FFmpeg Tool</span>
                <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>{health.tools.ffmpeg_available ? 'Installed & Ready' : 'Fallback to OpenCV'}</span>
                </div>
              </div>

              <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-1">
                <span className="text-slate-400 font-medium">FFprobe Metadata</span>
                <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>{health.tools.ffprobe_available ? 'Installed & Ready' : 'OpenCV Fallback'}</span>
                </div>
              </div>

              <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-1">
                <span className="text-slate-400 font-medium">OpenCV Engine</span>
                <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Integrated</span>
                </div>
              </div>
            </div>
          </div>

          {/* Video Safety Constraints */}
          <div className="card-surface p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Configured Video Ingestion Limits</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-1">
                <span className="text-slate-400 font-medium">Maximum File Size</span>
                <div className="text-sm font-semibold text-slate-200 font-mono">
                  {health.limits.max_file_size_mb} MB
                </div>
              </div>

              <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-1">
                <span className="text-slate-400 font-medium">Maximum Duration</span>
                <div className="text-sm font-semibold text-slate-200 font-mono">
                  {health.limits.max_duration_seconds} seconds (5 min)
                </div>
              </div>

              <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-1">
                <span className="text-slate-400 font-medium">Maximum Resolution</span>
                <div className="text-sm font-semibold text-slate-200 font-mono">
                  {health.limits.max_resolution} (1080p)
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-surface p-8 text-center text-slate-400 text-xs">
          Connecting to backend server...
        </div>
      )}
    </div>
  );
};
