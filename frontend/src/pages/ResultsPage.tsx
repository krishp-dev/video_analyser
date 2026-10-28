import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Layers,
  Tag,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  Search,
  Filter,
  Zap,
  Target,
  ArrowUpRight,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { AnalysisDetail, Keyframe, Detection, SearchMomentItem } from '../types';
import { VideoPlayer, VideoPlayerRef } from '../components/VideoPlayer';
import { Timeline } from '../components/Timeline';
import { KeyframeModal } from '../components/KeyframeModal';
import { formatBytes, formatDuration, formatTimestamp, formatDate } from '../utils/formatters';

interface ResultsPageProps {
  analysisId: string;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ analysisId }) => {
  const playerRef = useRef<VideoPlayerRef>(null);

  const [detail, setDetail] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playhead time tracking
  const [currentTime, setCurrentTime] = useState(0);

  // Selected keyframe for modal inspection
  const [selectedKeyframe, setSelectedKeyframe] = useState<Keyframe | null>(null);

  // Object detection class filter
  const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(null);

  // Semantic Video Search ("Ask Video") state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchMomentItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchExecuted, setSearchExecuted] = useState(false);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'summary' | 'keyframes' | 'detections' | 'diagnostics'>('summary');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.getAnalysisDetail(analysisId)
      .then((data) => {
        if (isMounted) {
          setDetail(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load analysis results.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [analysisId]);

  const handleSeek = (timestamp: number) => {
    playerRef.current?.seekTo(timestamp);
  };

  const handleRunSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSearching(true);
    setSearchExecuted(true);
    try {
      const resp = await api.searchAnalysis(analysisId, queryText.trim());
      setSearchResults(resp.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchExecuted(false);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mx-auto" />
          <p className="text-sm text-slate-400">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="card-surface p-10 text-center space-y-4 max-w-lg mx-auto">
        <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
        <h2 className="text-base font-semibold text-white">Results Unavailable</h2>
        <p className="text-xs text-slate-400">{error || 'Analysis record could not be found.'}</p>
      </div>
    );
  }

  const streamUrl = api.getVideoStreamUrl(detail.video.id);

  // Filtered detections
  const filteredDetections = selectedClassFilter
    ? detail.detections.filter((d) => d.class_name === selectedClassFilter)
    : detail.detections;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-750 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-brand-400 uppercase font-semibold">
              Analysis Report
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                detail.status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {detail.status.replace('_', ' ')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            {detail.video.original_name}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Analyzed {formatDate(detail.created_at)} &bull; Duration: {formatDuration(detail.video.duration)} &bull; {detail.total_detections} Total Detections
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Executive PDF Dossier Export */}
          <a
            href={api.getExportUrl(analysisId, 'pdf')}
            download={`dossier_${analysisId.slice(0, 8)}.pdf`}
            className="flex items-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 px-3 py-2 text-xs font-semibold transition shadow-sm"
            title="Download Formal PDF Forensic Report"
          >
            <Download className="h-4 w-4 text-brand-400" />
            <span>Export PDF Dossier</span>
          </a>

          <a
            href={api.getExportUrl(analysisId, 'json')}
            download={`report_${analysisId.slice(0, 8)}.json`}
            className="flex items-center gap-1.5 rounded-lg border border-dark-700 bg-dark-850 hover:bg-dark-800 text-slate-300 px-3 py-2 text-xs font-medium transition shadow-sm"
          >
            <FileJson className="h-4 w-4 text-brand-400" />
            <span>Export JSON</span>
          </a>
          <a
            href={api.getExportUrl(analysisId, 'csv')}
            download={`report_${analysisId.slice(0, 8)}.csv`}
            className="flex items-center gap-1.5 rounded-lg border border-dark-700 bg-dark-850 hover:bg-dark-800 text-slate-300 px-3 py-2 text-xs font-medium transition shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* SECTION A: Video Player & Stream Properties */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VideoPlayer
            ref={playerRef}
            streamUrl={streamUrl}
            detections={detail.detections}
            videoDuration={detail.video.duration}
            onTimeUpdate={(t) => setCurrentTime(t)}
          />
        </div>

        {/* Video Metadata Card */}
        <div className="card-surface p-5 space-y-4 flex flex-col justify-between text-xs">
          <div>
            <div className="flex items-center gap-2 font-semibold text-sm text-white mb-3">
              <Info className="h-4 w-4 text-brand-400" />
              <span>Video Stream Properties</span>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between py-1 border-b border-dark-800">
                <span className="text-slate-400">Duration</span>
                <span className="font-mono text-slate-200 font-medium">{formatDuration(detail.video.duration)} ({detail.video.duration}s)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dark-800">
                <span className="text-slate-400">Dimensions</span>
                <span className="font-mono text-slate-200 font-medium">{detail.video.width} × {detail.video.height}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dark-800">
                <span className="text-slate-400">Frame Rate</span>
                <span className="font-mono text-slate-200 font-medium">{detail.video.fps} fps</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dark-800">
                <span className="text-slate-400">File Size</span>
                <span className="font-mono text-slate-200 font-medium">{formatBytes(detail.video.file_size)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dark-800">
                <span className="text-slate-400">Codec / Format</span>
                <span className="font-mono text-slate-200 font-medium uppercase">{detail.video.format}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Processing Time</span>
                <span className="font-mono text-brand-300 font-medium">{detail.processing_duration || 0} seconds</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-dark-850 p-3 border border-dark-750 text-[11px] text-slate-400">
            Interactive Video Player: Click markers or search results to seek directly to timestamped events.
          </div>
        </div>
      </div>

      {/* SECTION B: Semantic Video Search ("Ask Video") */}
      <div className="card-surface p-5 space-y-4 border border-brand-500/20 bg-gradient-to-r from-dark-900 via-dark-850 to-brand-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand-400" />
            <h3 className="text-sm font-semibold text-white">Semantic "Ask Video" Search</h3>
          </div>
          <span className="text-[11px] text-brand-300/80 font-mono">
            Zero-Shot Query Engine
          </span>
        </div>

        {/* Search Input Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunSearch(searchQuery)}
              placeholder="Search video moments: e.g. 'apple', 'ripe fruit', 'cars', 'bottles', 'person'..."
              className="w-full rounded-xl bg-dark-950 border border-dark-700 py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition"
            />
          </div>
          <button
            onClick={() => handleRunSearch(searchQuery)}
            disabled={isSearching || !searchQuery.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 text-xs font-semibold transition disabled:opacity-50 shadow-md shadow-brand-500/20"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          {searchExecuted && (
            <button
              onClick={handleClearSearch}
              className="rounded-xl border border-dark-700 bg-dark-800 hover:bg-dark-750 text-slate-400 px-3 py-2 text-xs transition"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Filter Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          <span className="text-[11px] font-medium mr-1 text-slate-500">Quick Searches:</span>
          {[
            { label: '🍎 Fresh Apples', q: 'apple' },
            { label: '🍾 Beverage Bottles', q: 'bottle' },
            { label: '🚗 Vehicles', q: 'car' },
            { label: '👥 People / Crowd', q: 'person' },
            { label: '✂️ Scene Cuts', q: 'scene' },
          ].map((pill) => (
            <button
              key={pill.q}
              onClick={() => {
                setSearchQuery(pill.q);
                handleRunSearch(pill.q);
              }}
              className="rounded-lg bg-dark-800 hover:bg-brand-600/20 hover:text-brand-300 border border-dark-750 px-2.5 py-1 text-[11px] text-slate-300 transition"
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search Results Grid */}
        {searchExecuted && (
          <div className="space-y-2 pt-2 border-t border-dark-800">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>{searchResults.length} video moments matching "{searchQuery}"</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-800 text-center text-xs text-slate-400">
                No matching moments found for "{searchQuery}". Try searching for objects like apple, car, person, or bottles.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((res, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSeek(res.timestamp)}
                    className="flex flex-col justify-between p-3 rounded-xl border border-brand-500/30 bg-dark-900/90 hover:bg-brand-950/40 hover:border-brand-500 cursor-pointer transition shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-white group-hover:text-brand-300 transition">
                        {res.label}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20 shrink-0">
                        {res.formatted_time}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                      {res.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-dark-800 pt-2">
                      <span className="text-emerald-400 font-medium">
                        Score: {Math.round(res.relevance_score * 100)}% Match
                      </span>
                      <span className="flex items-center gap-1 text-brand-400 font-semibold group-hover:underline">
                        Jump to Playhead <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION C: Timeline */}
      <Timeline
        duration={detail.video.duration}
        currentTime={currentTime}
        detections={detail.detections}
        sceneCandidates={detail.scene_candidates}
        onSeekTo={handleSeek}
      />

      {/* Sub-Tabs Navigation */}
      <div className="border-b border-dark-750">
        <nav className="flex space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-3 flex items-center gap-2 transition ${
              activeTab === 'summary'
                ? 'border-b-2 border-brand-500 text-brand-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Summary & Domain Intelligence</span>
          </button>

          <button
            onClick={() => setActiveTab('keyframes')}
            className={`pb-3 flex items-center gap-2 transition ${
              activeTab === 'keyframes'
                ? 'border-b-2 border-brand-500 text-brand-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Keyframes Gallery ({detail.keyframes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('detections')}
            className={`pb-3 flex items-center gap-2 transition ${
              activeTab === 'detections'
                ? 'border-b-2 border-brand-500 text-brand-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>Object Tracking & Detections ({detail.total_detections})</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`pb-3 flex items-center gap-2 transition ${
              activeTab === 'diagnostics'
                ? 'border-b-2 border-brand-500 text-brand-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Diagnostics & Parameters</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: SUMMARY & DOMAIN INTELLIGENCE */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Domain Intelligence Card */}
          {detail.domain_insights && (
            <div className="card-surface p-6 space-y-4 border border-cyan-500/30 bg-gradient-to-r from-dark-900 via-dark-850 to-cyan-950/20 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Target className="h-5 w-5 text-cyan-400" />
                  <div>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-400">
                      Domain Intelligence Analysis
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {detail.domain_insights.domain_type}
                    </h3>
                  </div>
                </div>
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-semibold text-cyan-300">
                  {detail.domain_insights.status_indicator}
                </span>
              </div>

              {/* Metric Hero Callout */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-dark-950 border border-dark-800">
                  <span className="text-xs text-slate-400 font-medium">
                    {detail.domain_insights.primary_metric_label}
                  </span>
                  <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">
                    {detail.domain_insights.primary_metric_value}
                  </div>
                </div>

                {Object.entries(detail.domain_insights.details || {}).slice(0, 2).map(([k, v]) => (
                  <div key={k} className="p-4 rounded-xl bg-dark-950 border border-dark-800">
                    <span className="text-xs text-slate-400 font-medium capitalize">
                      {k.replace(/_/g, ' ')}
                    </span>
                    <div className="text-xl font-bold font-mono text-slate-200 mt-1 truncate">
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail.summary ? (
            <>
              {/* Overall Description */}
              <div className="card-surface p-6 space-y-3">
                <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                  <Sparkles className="h-4 w-4 text-brand-400" />
                  <span>Executive Visual Summary</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">
                  {detail.summary.overall_description}
                </p>
                <div className="text-xs text-brand-300/80 font-mono pt-1">
                  {detail.summary.evidence_statement}
                </div>
              </div>

              {/* Chronological Observations */}
              <div className="card-surface p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white">
                  Chronological Timeline Observations
                </h3>

                {detail.summary.chronological_observations.length > 0 ? (
                  <div className="space-y-2">
                    {detail.summary.chronological_observations.map((obs, idx) => {
                      const match = obs.match(/At ([\d.]+)s:/);
                      const timeSec = match ? parseFloat(match[1]) : null;

                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-xl border border-dark-750 bg-dark-850 p-3 text-xs"
                        >
                          {timeSec !== null && (
                            <button
                              onClick={() => handleSeek(timeSec)}
                              className="font-mono text-[11px] font-semibold text-brand-400 hover:text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20 shrink-0 transition"
                              title="Seek player to timestamp"
                            >
                              {formatTimestamp(timeSec)}
                            </button>
                          )}
                          <p className="text-slate-300 leading-relaxed flex-1">
                            {obs.replace(/At [\d.]+s:\s*/, '')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No significant events detected.</p>
                )}
              </div>

              {/* Limitations Statement */}
              <div className="rounded-xl border border-dark-750 bg-dark-900/60 p-4 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <span>Methodology & Model Limitations</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                  {detail.summary.limitations.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="card-surface p-8 text-center text-xs text-slate-400">
              No summary generated for this video.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KEYFRAMES GALLERY */}
      {activeTab === 'keyframes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {detail.keyframes.map((kf) => (
              <div
                key={kf.id}
                onClick={() => setSelectedKeyframe(kf)}
                className="group card-surface overflow-hidden hover:border-brand-500/40 transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video bg-black overflow-hidden">
                    <img
                      src={kf.preview_url}
                      alt={`Keyframe at ${formatTimestamp(kf.timestamp)}`}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 rounded bg-black/80 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur">
                      t = {formatTimestamp(kf.timestamp)}
                    </div>
                  </div>

                  <div className="p-4 space-y-2 text-xs">
                    <div className="text-[11px] font-semibold text-brand-300 flex items-center gap-1">
                      <span>{kf.selection_reason}</span>
                    </div>
                    {kf.caption_text && (
                      <p className="text-slate-300 italic line-clamp-2">
                        "{kf.caption_text}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-dark-800 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3 text-emerald-400" />
                    <span>{kf.detections_count} detections</span>
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSeek(kf.timestamp);
                    }}
                    className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
                  >
                    <span>Seek Player</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: OBJECT TRACKING & DETECTIONS */}
      {activeTab === 'detections' && (
        <div className="space-y-6">
          {/* Class Filter Bar */}
          <div className="card-surface p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-brand-400" />
                <span>Filter by Detected Class</span>
              </span>
              {selectedClassFilter && (
                <button
                  onClick={() => setSelectedClassFilter(null)}
                  className="text-brand-400 hover:underline"
                >
                  Clear Filter
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedClassFilter(null)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  selectedClassFilter === null
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-dark-800 text-slate-400 hover:bg-dark-750'
                }`}
              >
                All Classes ({detail.total_detections})
              </button>
              {Object.entries(detail.class_distribution).map(([cls, count]) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClassFilter(cls)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${
                    selectedClassFilter === cls
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-dark-800 text-slate-400 hover:bg-dark-750'
                  }`}
                >
                  {cls} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Detections Table with Track IDs & Attributes */}
          <div className="card-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-850 text-slate-400 uppercase font-medium border-b border-dark-750">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">#Track</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Inspection Attributes</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Bounding Box [x1, y1, x2, y2]</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800 text-slate-300">
                  {filteredDetections.slice(0, 100).map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-dark-800/40 transition cursor-pointer"
                      onClick={() => handleSeek(d.timestamp)}
                    >
                      <td className="px-4 py-3 font-mono text-brand-300">
                        {formatTimestamp(d.timestamp)}
                      </td>
                      <td className="px-4 py-3 font-mono text-cyan-300 font-semibold">
                        #{d.track_id || 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white capitalize">
                        {d.class_name}
                      </td>
                      <td className="px-4 py-3">
                        {d.attributes && Object.keys(d.attributes).length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-brand-500/10 text-brand-300 border border-brand-500/20 px-2 py-0.5 rounded font-mono">
                            {d.attributes.grade || d.attributes.ripeness_status || d.attributes.orientation || 'Scanned'}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-emerald-400">
                          {Math.round(d.confidence * 100)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        [{d.bbox.map((v) => Math.round(v)).join(', ')}]
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSeek(d.timestamp);
                          }}
                          className="font-medium text-brand-400 hover:text-brand-300"
                        >
                          Seek
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DIAGNOSTICS */}
      {activeTab === 'diagnostics' && (
        <div className="card-surface p-6 space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-white">Diagnostics & Processing Config</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-dark-900 border border-dark-750 space-y-2">
              <span className="text-slate-400 font-medium">Pipeline Configuration</span>
              <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto">
                {JSON.stringify(detail.config, null, 2)}
              </pre>
            </div>
            <div className="p-4 rounded-xl bg-dark-900 border border-dark-750 space-y-2">
              <span className="text-slate-400 font-medium">Models Employed</span>
              <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto">
                {JSON.stringify(detail.models_used, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Keyframe Zoom Modal */}
      {selectedKeyframe && (
        <KeyframeModal
          keyframe={selectedKeyframe}
          onClose={() => setSelectedKeyframe(null)}
          onSeekTo={handleSeek}
        />
      )}
    </div>
  );
};

export default ResultsPage;
