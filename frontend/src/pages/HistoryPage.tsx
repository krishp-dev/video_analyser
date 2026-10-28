import React, { useState } from 'react';
import {
  History as HistoryIcon,
  Trash2,
  ExternalLink,
  Clock,
  Layers,
  Tag,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileVideo,
  UploadCloud
} from 'lucide-react';
import { AnalysisListItem } from '../types';
import { api } from '../services/api';
import { formatDate, formatDuration } from '../utils/formatters';

interface HistoryPageProps {
  analyses: AnalysisListItem[];
  onViewAnalysis: (id: string) => void;
  onRefresh: () => void;
  onStartNew: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  analyses,
  onViewAnalysis,
  onRefresh,
  onStartNew,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (analysisId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this analysis and all associated generated frames and report files?')) {
      return;
    }

    try {
      setDeletingId(analysisId);
      setDeleteError(null);
      await api.deleteAnalysis(analysisId);
      onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete analysis.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Analysis History</h1>
          <p className="text-sm text-slate-400 mt-1">
            Persistently stored video analyses, extracted keyframes, and detection records.
          </p>
        </div>

        <button
          onClick={onStartNew}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 text-xs font-semibold shadow-md shadow-brand-500/20 transition"
        >
          <UploadCloud className="h-4 w-4" />
          <span>New Analysis</span>
        </button>
      </div>

      {deleteError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          {deleteError}
        </div>
      )}

      {analyses.length === 0 ? (
        <div className="card-surface p-12 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-800 text-slate-500">
            <HistoryIcon className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-white">No historical analyses found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Once you upload and analyze videos, their results, keyframes, and reports will persist here across server restarts.
          </p>
          <button
            onClick={onStartNew}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-500 transition shadow-sm"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Start First Analysis</span>
          </button>
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-850 text-slate-400 uppercase font-medium border-b border-dark-750">
                <tr>
                  <th className="px-5 py-3.5">Video Name</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5">Detections</th>
                  <th className="px-5 py-3.5">Keyframes</th>
                  <th className="px-5 py-3.5">Analyzed At</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800 text-slate-300">
                {analyses.map((item) => (
                  <tr
                    key={item.analysis_id}
                    onClick={() => onViewAnalysis(item.analysis_id)}
                    className="hover:bg-dark-800/50 cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <FileVideo className="h-4 w-4 text-brand-400 shrink-0" />
                        <span className="font-semibold text-white truncate max-w-xs">
                          {item.original_name}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase ${
                          item.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.status === 'completed_with_warnings'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : item.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {formatDuration(item.duration)}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {item.total_detections}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {item.keyframes_count}
                    </td>

                    <td className="px-5 py-3.5 text-slate-400">
                      {formatDate(item.created_at)}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onViewAnalysis(item.analysis_id)}
                          className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-semibold transition px-2 py-1 rounded hover:bg-brand-500/10"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(item.analysis_id, e)}
                          disabled={deletingId === item.analysis_id}
                          className="p-1 text-slate-500 hover:text-rose-400 transition rounded hover:bg-rose-500/10"
                          title="Delete Analysis"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
