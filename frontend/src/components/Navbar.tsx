import React from 'react';
import { Video, Cpu, HardDrive, CheckCircle2, AlertTriangle, Menu, X } from 'lucide-react';
import { SystemHealth } from '../types';

interface NavbarProps {
  health: SystemHealth | null;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ health, mobileMenuOpen, setMobileMenuOpen }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-dark-750/80 bg-dark-900/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-600 to-violet-500 shadow-md shadow-brand-500/20">
              <Video className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">Video Analyser</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  AI Platform
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">AI-Based Video Analysis & Summarization</p>
            </div>
          </div>
        </div>

        {/* System Diagnostics Badges */}
        <div className="flex items-center gap-2 sm:gap-4">
          {health ? (
            <>
              {/* Hardware Device Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-dark-800/80 border border-dark-700 text-slate-300">
                <Cpu className="h-3.5 w-3.5 text-brand-400" />
                <span className="hidden sm:inline">Device:</span>
                <span className="font-semibold uppercase text-slate-200">
                  {health.hardware.cuda_available ? 'CUDA GPU' : 'CPU'}
                </span>
              </div>

              {/* FFmpeg status */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-dark-800/80 border border-dark-700 text-slate-300">
                <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                <span>FFmpeg:</span>
                <span className="text-emerald-400 font-medium">Ready</span>
              </div>

              {/* Overall Health Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="badge-pulse">
                  <span className="bg-emerald-400"></span>
                  <span className="bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline">System Active</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
              <span>Connecting to Backend...</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
