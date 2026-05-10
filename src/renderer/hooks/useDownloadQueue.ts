import { useEffect, useCallback } from "react";
import { useDownloadStore } from "@/stores/downloadStore";
import type { DownloadTask, QueueStatus } from "@shared/types";

interface UseDownloadQueueReturn {
  tasks: DownloadTask[];
  activeTasks: DownloadTask[];
  pendingTasks: DownloadTask[];
  completedTasks: DownloadTask[];
  failedTasks: DownloadTask[];
  queueStatus: QueueStatus;
  isLoading: boolean;
  error: string | null;
  addDownload: (url: string, config?: Record<string, unknown>) => Promise<void>;
  pauseDownload: (taskId: string) => Promise<void>;
  resumeDownload: (taskId: string) => Promise<void>;
  cancelDownload: (taskId: string) => Promise<void>;
  retryDownload: (taskId: string) => Promise<void>;
  removeDownload: (taskId: string) => Promise<void>;
  clearCompleted: () => void;
}

export function useDownloadQueue(): UseDownloadQueueReturn {
  const store = useDownloadStore();

  // Subscribe to IPC events from main process
  useEffect(() => {
    const unsubProgress = window.electronAPI.onDownloadProgress((progress) => {
      store.updateProgress(progress);
    });

    const unsubComplete = window.electronAPI.onDownloadComplete((result) => {
      if (result.success) {
        store.markComplete(result.taskId, result.filesDownloaded);
      } else {
        store.markFailed(result.taskId, result.error ?? "Download failed");
      }
    });

    const unsubError = window.electronAPI.onDownloadError((error) => {
      store.markFailed(error.taskId, error.error);
    });

    return () => {
      unsubProgress();
      unsubComplete();
      unsubError();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addDownload = useCallback(
    async (url: string, config?: Record<string, unknown>) => {
      await store.addTask(url, config);
    },
    [store],
  );

  const pauseDownload = useCallback(
    async (taskId: string) => {
      await store.pauseTask(taskId);
    },
    [store],
  );

  const resumeDownload = useCallback(
    async (taskId: string) => {
      await store.resumeTask(taskId);
    },
    [store],
  );

  const cancelDownload = useCallback(
    async (taskId: string) => {
      await store.cancelTask(taskId);
    },
    [store],
  );

  const retryDownload = useCallback(
    async (taskId: string) => {
      await store.retryTask(taskId);
    },
    [store],
  );

  const removeDownload = useCallback(
    async (taskId: string) => {
      await store.removeTask(taskId);
    },
    [store],
  );

  return {
    tasks: Array.from(store.tasks.values()),
    activeTasks: store.getActiveTasks(),
    pendingTasks: store.getPendingTasks(),
    completedTasks: store.getCompletedTasks(),
    failedTasks: store.getFailedTasks(),
    queueStatus: store.queueStatus,
    isLoading: store.isLoading,
    error: store.error,
    addDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
    removeDownload,
    clearCompleted: store.clearCompleted,
  };
}
