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
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { AnalysisDetail, Keyframe, Detection } from '../types';
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
        <div className="flex items-center gap-2">
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

      {/* SECTION A: Video Player & Overview */}
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
            Click on any timestamp link throughout this report to seek the synchronized video player.
          </div>
        </div>
      </div>

      {/* SECTION E: Timeline */}
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
            <span>AI Summary & Observations</span>
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
            <span>Object Detections ({detail.total_detections})</span>
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

      {/* TAB CONTENT */}

      {/* TAB 1: SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
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
                      // Extract timestamp if format "At X.Xs: ..."
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
                  <p className="text-xs text-slate-400">
                    No discrete visual changes or events were observed across the sampled frames.
                  </p>
                )}
              </div>

              {/* Frequently Detected Classes */}
              {Object.keys(detail.summary.frequently_detected_objects).length > 0 && (
                <div className="card-surface p-6 space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    Prominent Detected Object Classes
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {Object.entries(detail.summary.frequently_detected_objects).map(([cls, count]) => (
                      <span
                        key={cls}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dark-700 bg-dark-850 px-3 py-1.5 text-xs font-medium text-slate-200"
                      >
                        <span className="capitalize font-semibold">{cls}</span>
                        <span className="rounded bg-brand-500/20 text-brand-300 font-mono px-1.5 py-0.2 text-[10px]">
                          {count} instances
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Academic Limitations */}
              <div className="card-surface p-6 space-y-3 border-dark-700/80 bg-dark-900/60">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <span>Model Scope & System Limitations</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-400 list-disc list-inside">
                  {detail.summary.limitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="card-surface p-8 text-center text-xs text-slate-400">
              No natural-language summary could be synthesized for this run.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KEYFRAMES GALLERY */}
      {activeTab === 'keyframes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Selected {detail.keyframes.length} representative frames based on scene transitions and temporal anchors</span>
            <span>Click any card to inspect high-resolution frame</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {detail.keyframes.map((kf) => (
              <div
                key={kf.id}
                onClick={() => setSelectedKeyframe(kf)}
                className="card-surface-hover overflow-hidden cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full bg-black overflow-hidden border-b border-dark-750">
                    <img
                      src={kf.preview_url}
                      alt={`Keyframe at ${kf.timestamp}s`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 rounded-md bg-black/80 backdrop-blur-sm border border-white/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
                      {formatTimestamp(kf.timestamp)}
                    </div>
                  </div>

                  {/* Metadata */}
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

      {/* TAB 3: OBJECT DETECTIONS */}
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

          {/* Detections Table */}
          <div className="card-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-850 text-slate-400 uppercase font-medium border-b border-dark-750">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Bounding Box [x1, y1, x2, y2]</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800 text-slate-300">
                  {filteredDetections.slice(0, 100).map((d) => (
                    <tr key={d.id} className="hover:bg-dark-800/50">
                      <td className="px-4 py-2.5 font-mono text-brand-300 font-semibold">
                        {formatTimestamp(d.timestamp)}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-white capitalize">
                        {d.class_name}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-dark-750 overflow-hidden">
                            <div
                              className="h-full bg-emerald-400"
                              style={{ width: `${Math.round(d.confidence * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-emerald-400">
                            {Math.round(d.confidence * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">
                        [{d.bbox.map((v) => Math.round(v)).join(', ')}]
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">
                        {d.model_name}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleSeek(d.timestamp)}
                          className="font-medium text-brand-400 hover:text-brand-300 transition"
                        >
                          Seek
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredDetections.length > 100 && (
              <div className="p-3 text-center text-xs text-slate-500 bg-dark-850">
                Displaying first 100 of {filteredDetections.length} detections. Download full JSON/CSV for all records.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DIAGNOSTICS & PARAMETERS */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6 text-xs">
          <div className="card-surface p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Models & Execution Diagnostic Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-2">
                <span className="text-slate-400 font-medium">Object Detection Model</span>
                <div className="font-semibold text-white font-mono text-sm">
                  {detail.models_used.object_detection || 'yolov8n.pt'}
                </div>
                <p className="text-slate-400">
                  Pretrained on COCO dataset, 80 supported categories.
                </p>
              </div>

              <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-2">
                <span className="text-slate-400 font-medium">Image Captioning Model</span>
                <div className="font-semibold text-white font-mono text-sm">
                  {detail.models_used.image_captioning || 'Salesforce/blip-image-captioning-base'}
                </div>
                <p className="text-slate-400">
                  Conditional Vision-Language generative captioning model.
                </p>
              </div>

              <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-2">
                <span className="text-slate-400 font-medium">Frame Sampling Frequency</span>
                <div className="font-semibold text-white font-mono text-sm">
                  {detail.config.sample_rate_fps} fps
                </div>
                <p className="text-slate-400">
                  Interval applied during uniform video frame extraction.
                </p>
              </div>

              <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-2">
                <span className="text-slate-400 font-medium">Confidence & Scene Thresholds</span>
                <div className="font-semibold text-white font-mono text-sm">
                  Conf: {Math.round(detail.config.confidence_threshold * 100)}% &bull; Scene Shift: {detail.config.scene_threshold}
                </div>
                <p className="text-slate-400">
                  Configured thresholds during pipeline execution.
                </p>
              </div>
            </div>
          </div>

          {/* Diagnostic Warnings (if any) */}
          {detail.warnings.length > 0 && (
            <div className="card-surface p-6 space-y-3 border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                <span>Job Diagnostic Warnings</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {detail.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Keyframe Detail Modal */}
      <KeyframeModal
        keyframe={selectedKeyframe}
        onClose={() => setSelectedKeyframe(null)}
        onSeekTo={handleSeek}
      />
    </div>
  );
};
