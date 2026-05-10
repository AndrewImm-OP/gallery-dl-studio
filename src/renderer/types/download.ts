import type { DownloadTask, DownloadStatus, QueueStatus } from '@shared/types';

export type { DownloadTask, DownloadStatus, QueueStatus };

export type DownloadTab = 'active' | 'queued' | 'completed';

export interface DownloadFilter {
  tab: DownloadTab;
  search: string;
  site?: string;
}

export interface DownloadActions {
  start: (url: string, config?: Record<string, unknown>) => Promise<void>;
  pause: (taskId: string) => Promise<void>;
  resume: (taskId: string) => Promise<void>;
  cancel: (taskId: string) => Promise<void>;
  retry: (taskId: string) => Promise<void>;
  remove: (taskId: string) => Promise<void>;
  clearCompleted: () => void;
}

export interface UrlValidationResult {
  valid: boolean;
  url: string;
  site?: string;
  error?: string;
}

export interface BatchDownloadOptions {
  urls: string[];
  config?: Record<string, unknown>;
  outputDir?: string;
}
