import { create } from 'zustand';
import type { DownloadTask, DownloadProgress, QueueStatus } from '@shared/types';

interface DownloadState {
  tasks: Map<string, DownloadTask>;
  queueStatus: QueueStatus;
  isLoading: boolean;
  error: string | null;

  // Actions
  addTask: (url: string, config?: Record<string, unknown>) => Promise<void>;
  pauseTask: (taskId: string) => Promise<void>;
  resumeTask: (taskId: string) => Promise<void>;
  cancelTask: (taskId: string) => Promise<void>;
  retryTask: (taskId: string) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  updateProgress: (progress: DownloadProgress) => void;
  markComplete: (taskId: string, filesDownloaded?: number) => void;
  markFailed: (taskId: string, error: string) => void;
  clearCompleted: () => void;
  refreshQueueStatus: () => Promise<void>;

  // Selectors
  getActiveTasks: () => DownloadTask[];
  getPendingTasks: () => DownloadTask[];
  getCompletedTasks: () => DownloadTask[];
  getFailedTasks: () => DownloadTask[];
  getTaskById: (id: string) => DownloadTask | undefined;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  tasks: new Map(),
  queueStatus: {
    active: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    paused: 0,
    totalSpeed: '',
  },
  isLoading: false,
  error: null,

  addTask: async (url, config) => {
    try {
      set({ isLoading: true, error: null });
      const task = await window.electronAPI.downloadStart(url, config);
      set((state) => {
        const tasks = new Map(state.tasks);
        tasks.set(task.id, task);
        return { tasks, isLoading: false };
      });
      get().refreshQueueStatus();
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
    }
  },

  pauseTask: async (taskId) => {
    await window.electronAPI.downloadPause(taskId);
    set((state) => {
      const tasks = new Map(state.tasks);
      const task = tasks.get(taskId);
      if (task) {
        tasks.set(taskId, { ...task, status: 'paused' });
      }
      return { tasks };
    });
    get().refreshQueueStatus();
  },

  resumeTask: async (taskId) => {
    await window.electronAPI.downloadResume(taskId);
    set((state) => {
      const tasks = new Map(state.tasks);
      const task = tasks.get(taskId);
      if (task) {
        tasks.set(taskId, { ...task, status: 'pending' });
      }
      return { tasks };
    });
    get().refreshQueueStatus();
  },

  cancelTask: async (taskId) => {
    await window.electronAPI.downloadCancel(taskId);
    set((state) => {
      const tasks = new Map(state.tasks);
      const task = tasks.get(taskId);
      if (task) {
        tasks.set(taskId, { ...task, status: 'cancelled' });
      }
      return { tasks };
    });
    get().refreshQueueStatus();
  },

  retryTask: async (taskId) => {
    await window.electronAPI.downloadRetry(taskId);
    set((state) => {
      const tasks = new Map(state.tasks);
      const task = tasks.get(taskId);
      if (task) {
        tasks.set(taskId, { ...task, status: 'pending', progress: 0, error: undefined });
      }
      return { tasks };
    });
    get().refreshQueueStatus();
  },

  removeTask: async (taskId) => {
    await window.electronAPI.downloadRemove(taskId);
    set((state) => {
      const tasks = new Map(state.tasks);
      tasks.delete(taskId);
      return { tasks };
    });
    get().refreshQueueStatus();
  },

  updateProgress: (progress) => {
    set((state) => {
      const tasks = new Map(state.tasks);
      const task = tasks.get(progress.taskId);
      if (task) {
        tasks.set(progress.taskId, {
          ...task,
          // If we're receiving progress, the task is actively downloading
          status: task.status === 'pending' || task.status === 'downloading' ? 'downloading' : task.status,
          progress: progress.progress,
          speed: progress.speed,
          eta: progress.eta,
          downloadedFiles: progress.downloadedFiles,
          totalFiles: progress.totalFiles,
          downloadedSize: progress.downloadedSize,
          totalSize: progress.totalSize,
        });
      }
      return { tasks };
    });
  },

  markComplete: (taskId, filesDownloaded?: number) => {
    set((state) => {
      const tasks = new Map(state.tasks);
      const task = tasks.get(taskId);
      if (task) {
        tasks.set(taskId, {
          ...task,
          status: 'completed',
          progress: 100,
          downloadedFiles: filesDownloaded ?? task.downloadedFiles,
          completedAt: new Date().toISOString(),
        });
      }
      return { tasks };
    });
    get().refreshQueueStatus();
  },

  markFailed: (taskId, error) => {
    set((state) => {
      const tasks = new Map(state.tasks);
      const task = tasks.get(taskId);
      if (task) {
        tasks.set(taskId, { ...task, status: 'failed', error });
      }
      return { tasks };
    });
    get().refreshQueueStatus();
  },

  clearCompleted: () => {
    set((state) => {
      const tasks = new Map(state.tasks);
      for (const [id, task] of tasks) {
        if (task.status === 'completed') {
          tasks.delete(id);
        }
      }
      return { tasks };
    });
    get().refreshQueueStatus();
  },

  refreshQueueStatus: async () => {
    try {
      const status = await window.electronAPI.downloadQueueStatus();
      set({ queueStatus: status });
    } catch {
      // Silently fail for status refresh
    }
  },

  // Selectors
  getActiveTasks: () => {
    const { tasks } = get();
    return Array.from(tasks.values()).filter((t) => t.status === 'downloading');
  },

  getPendingTasks: () => {
    const { tasks } = get();
    return Array.from(tasks.values()).filter((t) => t.status === 'pending');
  },

  getCompletedTasks: () => {
    const { tasks } = get();
    return Array.from(tasks.values()).filter((t) => t.status === 'completed');
  },

  getFailedTasks: () => {
    const { tasks } = get();
    return Array.from(tasks.values()).filter((t) => t.status === 'failed');
  },

  getTaskById: (id) => {
    return get().tasks.get(id);
  },
}));
