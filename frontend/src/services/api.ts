import {
  AnalysisConfig,
  AnalysisDetail,
  AnalysisListItem,
  AnalysisStatus,
  SystemHealth,
  VideoMetadata
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth(): Promise<SystemHealth> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to reach backend health endpoint.');
    return res.json();
  },

  async uploadVideo(
    file: File,
    onProgress?: (percentage: number) => void
  ): Promise<{ video: VideoMetadata; message: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.open('POST', `${API_BASE}/videos/upload`);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            onProgress(pct);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (e) {
            reject(new Error('Invalid JSON response from server.'));
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.detail || `Upload failed with HTTP ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during video upload. Check server connection.'));
      };

      xhr.send(formData);
    });
  },

  async startAnalysis(
    videoId: string,
    config: AnalysisConfig
  ): Promise<AnalysisStatus> {
    const res = await fetch(`${API_BASE}/analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: videoId, config })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to start analysis (${res.status}).`);
    }
    return res.json();
  },

  async getAnalysisStatus(analysisId: string): Promise<AnalysisStatus> {
    const res = await fetch(`${API_BASE}/analyses/${analysisId}/status`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch status (${res.status}).`);
    }
    return res.json();
  },

  async cancelAnalysis(analysisId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/analyses/${analysisId}/cancel`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to cancel analysis job.');
    return res.json();
  },

  async getAnalysisDetail(analysisId: string): Promise<AnalysisDetail> {
    const res = await fetch(`${API_BASE}/analyses/${analysisId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to load analysis results (${res.status}).`);
    }
    return res.json();
  },

  async listAnalyses(): Promise<AnalysisListItem[]> {
    const res = await fetch(`${API_BASE}/analyses`);
    if (!res.ok) throw new Error('Failed to fetch analysis history.');
    return res.json();
  },

  async deleteAnalysis(analysisId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/analyses/${analysisId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete analysis.');
    return res.json();
  },

  getVideoStreamUrl(videoId: string): string {
    return `${API_BASE}/videos/${videoId}/stream`;
  },

  getExportUrl(analysisId: string, format: 'json' | 'csv'): string {
    return `${API_BASE}/analyses/${analysisId}/export?format=${format}`;
  }
};
