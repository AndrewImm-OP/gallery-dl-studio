import React, { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Download, Inbox } from 'lucide-react';
import { UrlInput } from '@/components/download/UrlInput';
import { DownloadItem } from '@/components/download/DownloadItem';
import { QueueControls } from '@/components/download/QueueControls';
import { useDownloadQueue } from '@/hooks/useDownloadQueue';
import { useFileDialog } from '@/hooks/useIpc';
import type { DownloadTab } from '@/types/download';
import './Downloads.css';

export const Downloads: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DownloadTab>('active');
  const {
    tasks,
    queueStatus,
    isLoading,
    addDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
    removeDownload,
    clearCompleted,
  } = useDownloadQueue();
  const { openPath } = useFileDialog();

  const filteredTasks = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return tasks.filter((t) => t.status === 'downloading' || t.status === 'paused' || t.status === 'pending');
      case 'queued':
        return tasks.filter((t) => t.status === 'pending');
      case 'completed':
        return tasks.filter((t) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled');
      default:
        return tasks;
    }
  }, [tasks, activeTab]);

  const handlePauseAll = () => {
    tasks
      .filter((t) => t.status === 'downloading')
      .forEach((t) => pauseDownload(t.id));
  };

  const handleResumeAll = () => {
    tasks
      .filter((t) => t.status === 'paused')
      .forEach((t) => resumeDownload(t.id));
  };

  const tabs: { key: DownloadTab; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: queueStatus.active + queueStatus.paused + queueStatus.pending },
    { key: 'queued', label: 'Queued', count: queueStatus.pending },
    { key: 'completed', label: 'Completed', count: queueStatus.completed + queueStatus.failed },
  ];

  return (
    <div className="downloads-page">
      {/* Page header */}
      <div className="downloads-page__header">
        <h1 className="downloads-page__title">
          <Download size={24} />
          Downloads
        </h1>
        <p className="downloads-page__subtitle">
          Add URLs to download media from 180+ supported sites
        </p>
      </div>

      {/* URL Input */}
      <UrlInput onSubmit={addDownload} isLoading={isLoading} />

      {/* Queue controls & tabs */}
      <div>
        <QueueControls
          status={queueStatus}
          onPauseAll={handlePauseAll}
          onResumeAll={handleResumeAll}
          onClearCompleted={clearCompleted}
        />
        <div className="downloads-page__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`downloads-page__tab${activeTab === tab.key ? ' downloads-page__tab--active' : ''}`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="downloads-page__tab-count">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Download list */}
      <div className="downloads-page__list">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task) => (
            <DownloadItem
              key={task.id}
              task={task}
              onPause={pauseDownload}
              onResume={resumeDownload}
              onCancel={cancelDownload}
              onRetry={retryDownload}
              onRemove={removeDownload}
              onOpenFolder={openPath}
            />
          ))}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="downloads-page__empty">
            <Inbox size={48} strokeWidth={1.5} className="downloads-page__empty-icon" />
            <p className="downloads-page__empty-text">
              {activeTab === 'active'
                ? 'No active downloads. Paste a URL above to get started.'
                : activeTab === 'queued'
                  ? 'No queued downloads.'
                  : 'No completed downloads yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
