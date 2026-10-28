import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { UploadPage } from './pages/UploadPage';
import { ProcessingPage } from './pages/ProcessingPage';
import { ResultsPage } from './pages/ResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AboutPage } from './pages/AboutPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { AnalysisListItem, SystemHealth } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);

  const fetchHealth = async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);
    } catch {
      // Backend not yet ready or offline
    }
  };

  const fetchAnalyses = async () => {
    try {
      const list = await api.listAnalyses();
      setAnalyses(list);
    } catch {
      // Backend not yet ready
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchAnalyses();

    const interval = setInterval(() => {
      fetchHealth();
      fetchAnalyses();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleStartNew = () => {
    setCurrentTab('upload');
  };

  const handleAnalysisStarted = (analysisId: string) => {
    setActiveAnalysisId(analysisId);
    setCurrentTab('processing');
    fetchAnalyses();
  };

  const handleAnalysisCompleted = (analysisId: string) => {
    setActiveAnalysisId(analysisId);
    setCurrentTab('results');
    fetchAnalyses();
  };

  const handleViewAnalysis = (analysisId: string) => {
    setActiveAnalysisId(analysisId);
    const item = analyses.find((a) => a.analysis_id === analysisId);
    if (item && (item.status === 'queued' || item.status === 'processing')) {
      setCurrentTab('processing');
    } else {
      setCurrentTab('results');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        health={health}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          activeAnalysisId={activeAnalysisId}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'overview' && (
            <OverviewPage
              analyses={analyses}
              health={health}
              onStartNew={handleStartNew}
              onViewAnalysis={handleViewAnalysis}
            />
          )}

          {currentTab === 'upload' && (
            <UploadPage onAnalysisStarted={handleAnalysisStarted} />
          )}

          {currentTab === 'processing' && activeAnalysisId && (
            <ProcessingPage
              analysisId={activeAnalysisId}
              onCompleted={handleAnalysisCompleted}
              onRetry={handleStartNew}
            />
          )}

          {currentTab === 'results' && activeAnalysisId && (
            <ResultsPage analysisId={activeAnalysisId} />
          )}

          {currentTab === 'history' && (
            <HistoryPage
              analyses={analyses}
              onViewAnalysis={handleViewAnalysis}
              onRefresh={fetchAnalyses}
              onStartNew={handleStartNew}
            />
          )}

          {currentTab === 'about' && <AboutPage />}

          {currentTab === 'settings' && (
            <SettingsPage health={health} onRefreshHealth={fetchHealth} />
          )}
        </main>
      </div>
    </div>
  );
};
export default App;
