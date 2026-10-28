import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  History,
  BookOpen,
  Settings,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export type NavTab = 'overview' | 'upload' | 'processing' | 'results' | 'history' | 'about' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  activeAnalysisId: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  activeAnalysisId
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'upload' as NavTab, label: 'New Analysis', icon: UploadCloud },
    { id: 'history' as NavTab, label: 'Analysis History', icon: History },
    { id: 'about' as NavTab, label: 'About Project', icon: BookOpen },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  const handleSelect = (tab: NavTab) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 shrink-0 flex-col justify-between border-r border-dark-750/70 bg-dark-900/95 p-4 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } flex`}
      >
        <div className="space-y-6">
          {/* Active Job Quick Link banner if an analysis is in progress or viewed */}
          {activeAnalysisId && (
            <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 shadow-inner">
              <div className="flex items-center justify-between text-xs font-semibold text-brand-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                  Active Job
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {activeAnalysisId.slice(0, 6)}...
                </span>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  onClick={() => handleSelect('processing')}
                  className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                    currentTab === 'processing'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-dark-800 text-slate-300 hover:bg-dark-750'
                  }`}
                >
                  Progress
                </button>
                <button
                  onClick={() => handleSelect('results')}
                  className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                    currentTab === 'results'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-dark-800 text-slate-300 hover:bg-dark-750'
                  }`}
                >
                  Results
                </button>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                      : 'text-slate-400 hover:bg-dark-800/80 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-brand-400" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Project Meta Card at bottom */}
        <div className="rounded-xl border border-dark-750/70 bg-dark-850/60 p-3.5 text-xs text-slate-400">
          <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
            <span>Video Analyser</span>
            <span className="text-[10px] text-brand-400 font-mono">v1.0.0</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Local Computer Vision pipeline with YOLO & BLIP AI models.
          </p>
        </div>
      </aside>
    </>
  );
};
