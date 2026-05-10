import React from 'react';
import {
  Pause,
  Play,
  X,
  RotateCcw,
  Trash2,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Badge } from '@/components/common/Badge';
import { Tooltip } from '@/components/common/Tooltip';
import type { DownloadTask, DownloadStatus } from '@shared/types';
import './DownloadItem.css';

interface DownloadItemProps {
  task: DownloadTask;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onRetry: (taskId: string) => void;
  onRemove: (taskId: string) => void;
  onOpenFolder: (path: string) => void;
}

const statusConfig: Record<
  DownloadStatus,
  { icon: React.ReactNode; label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  pending: { icon: <Clock size={14} />, label: 'Queued', variant: 'default' },
  downloading: { icon: <Loader2 size={14} />, label: 'Downloading', variant: 'info' },
  paused: { icon: <Pause size={14} />, label: 'Paused', variant: 'warning' },
  completed: { icon: <CheckCircle2 size={14} />, label: 'Completed', variant: 'success' },
  failed: { icon: <AlertCircle size={14} />, label: 'Failed', variant: 'error' },
  cancelled: { icon: <X size={14} />, label: 'Cancelled', variant: 'default' },
};

export const DownloadItem: React.FC<DownloadItemProps> = ({
  task,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onRemove,
  onOpenFolder,
}) => {
  const status = statusConfig[task.status];

  const progressVariant = task.status === 'failed' ? 'error' : task.status === 'completed' ? 'success' : 'default';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`download-item download-item--${task.status}`}
    >
      {/* Top row: title, site, status, actions */}
      <div className="download-item__header">
        <div className="download-item__info">
          {task.thumbnail && (
            <img
              src={task.thumbnail}
              alt=""
              className="download-item__thumbnail"
            />
          )}
          <div className="download-item__text">
            <div className="download-item__title">
              {task.title || task.url}
            </div>
            <div className="download-item__site">
              {task.site}
              {task.backend && (
                <span className={`download-item__backend download-item__backend--${task.backend === 'yt-dlp' ? 'video' : 'images'}`}>
                  {task.backend === 'yt-dlp' ? 'video' : 'images'}
                </span>
              )}
            </div>
          </div>
        </div>

        <Badge variant={status.variant} dot>
          {status.label}
        </Badge>

        <div className="download-item__actions">
          {task.status === 'downloading' && (
            <Tooltip content="Pause">
              <button onClick={() => onPause(task.id)} className="download-item__action-btn">
                <Pause size={14} />
              </button>
            </Tooltip>
          )}
          {task.status === 'paused' && (
            <Tooltip content="Resume">
              <button onClick={() => onResume(task.id)} className="download-item__action-btn">
                <Play size={14} />
              </button>
            </Tooltip>
          )}
          {(task.status === 'downloading' || task.status === 'pending') && (
            <Tooltip content="Cancel">
              <button onClick={() => onCancel(task.id)} className="download-item__action-btn">
                <X size={14} />
              </button>
            </Tooltip>
          )}
          {(task.status === 'failed' || task.status === 'cancelled') && (
            <Tooltip content="Retry">
              <button onClick={() => onRetry(task.id)} className="download-item__action-btn">
                <RotateCcw size={14} />
              </button>
            </Tooltip>
          )}
          {task.status === 'completed' && task.outputDir && (
            <Tooltip content="Open folder">
              <button onClick={() => onOpenFolder(task.outputDir)} className="download-item__action-btn">
                <FolderOpen size={14} />
              </button>
            </Tooltip>
          )}
          <Tooltip content="Remove">
            <button onClick={() => onRemove(task.id)} className="download-item__action-btn download-item__action-btn--danger">
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Progress bar for active downloads */}
      {(task.status === 'downloading' || task.status === 'paused') && (
        <div className="download-item__progress">
          <ProgressBar value={task.progress} variant={progressVariant} size="sm" />
          <div className="download-item__stats">
            <span className="download-item__stats-left">
              {task.downloadedFiles > 0
                ? task.totalFiles > 0
                  ? `${task.downloadedFiles}/${task.totalFiles} files`
                  : `${task.downloadedFiles} files`
                : task.totalFiles > 0
                  ? `0/${task.totalFiles} files`
                  : 'Starting...'}
              {task.downloadedSize && ` · ${task.downloadedSize}`}
              {task.totalSize && `/${task.totalSize}`}
            </span>
            <span className="download-item__stats-right">
              {task.speed && <span className="download-item__speed">{task.speed}</span>}
              {task.eta && <span className="download-item__eta">ETA: {task.eta}</span>}
              {!task.speed && !task.eta && task.downloadedFiles > 0 && 'Scanning...'}
              {!task.speed && !task.eta && task.downloadedFiles === 0 && `${Math.round(task.progress)}%`}
            </span>
          </div>
        </div>
      )}

      {/* Completed summary */}
      {task.status === 'completed' && task.downloadedFiles > 0 && (
        <div className="download-item__completed-info">
          {task.downloadedFiles} files downloaded
        </div>
      )}

      {/* Error message */}
      {task.error && (
        <div className="download-item__error">
          {task.error}
        </div>
      )}
    </motion.div>
  );
};
