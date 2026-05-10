import { randomUUID } from 'crypto';
import type { DownloadTask, DownloadBackend, QueueStatus, DedupConfig } from '../../shared/types';
import { GalleryDlService } from './gallery-dl';
import { YtDlpService } from './yt-dlp';
import type { DedupService } from './dedup';

export class QueueService {
  private queue: Map<string, DownloadTask> = new Map();
  private activeCount = 0;
  private maxConcurrent = 3;
  private galleryDlService: GalleryDlService;
  private ytDlpService: YtDlpService;
  private dedupService?: DedupService;
  private dedupConfigProvider?: () => DedupConfig | undefined;

  constructor(galleryDlService: GalleryDlService, ytDlpService: YtDlpService) {
    this.galleryDlService = galleryDlService;
    this.ytDlpService = ytDlpService;
  }

  setDedupService(service: DedupService, configProvider: () => DedupConfig | undefined): void {
    this.dedupService = service;
    this.dedupConfigProvider = configProvider;
  }

  static detectBackend(url: string): DownloadBackend {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
      const pathname = parsed.pathname.toLowerCase();

      // Definite yt-dlp sites (video-first)
      const ytDlpSites = [
        'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
        'twitch.tv', 'bilibili.com', 'nicovideo.jp',
        'soundcloud.com', 'bandcamp.com',
      ];
      for (const site of ytDlpSites) {
        if (hostname === site || hostname.endsWith('.' + site)) return 'yt-dlp';
      }

      // Video sites where gallery-dl only gets images
      const videoOnlySites = [
        'xvideos.com', 'pornhub.com', 'xhamster.com',
        'spankbang.com', 'eporner.com',
      ];
      for (const site of videoOnlySites) {
        if (hostname === site || hostname.endsWith('.' + site)) {
          // If URL looks like a specific video page, use yt-dlp
          // If it's a profile/gallery page, use gallery-dl for photos
          if (pathname.includes('/video') || pathname.includes('/view_video') || pathname.match(/\/[\w-]+-\d+$/)) {
            return 'yt-dlp';
          }
          return 'gallery-dl';
        }
      }

      // URL path heuristics
      if (pathname.includes('/watch') || pathname.includes('/embed') || pathname.includes('/clip')) {
        return 'yt-dlp';
      }

      // Everything else -> gallery-dl (supports 180+ sites)
      return 'gallery-dl';
    } catch {
      return 'gallery-dl';
    }
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
    this.processQueue();
  }

  async addToQueue(url: string, config?: Record<string, unknown>): Promise<DownloadTask> {
    const backend = QueueService.detectBackend(url);
    const task: DownloadTask = {
      id: randomUUID(),
      url,
      status: 'pending',
      progress: 0,
      speed: '',
      eta: '',
      totalFiles: 0,
      downloadedFiles: 0,
      totalSize: '',
      downloadedSize: '',
      site: this.extractSite(url),
      title: url,
      outputDir: '', // Will be set from config
      createdAt: new Date().toISOString(),
      backend,
      config,
    };

    this.queue.set(task.id, task);
    this.processQueue();
    return task;
  }

  pauseTask(taskId: string): void {
    const task = this.queue.get(taskId);
    if (task && task.status === 'downloading') {
      if (task.backend === 'yt-dlp') {
        this.ytDlpService.pauseDownload(taskId);
      } else {
        this.galleryDlService.pauseDownload(taskId);
      }
      task.status = 'paused';
      this.activeCount--;
      this.processQueue();
    }
  }

  resumeTask(taskId: string): void {
    const task = this.queue.get(taskId);
    if (task && task.status === 'paused') {
      task.status = 'pending';
      this.processQueue();
    }
  }

  cancelTask(taskId: string): void {
    const task = this.queue.get(taskId);
    if (!task) return;

    if (task.status === 'downloading') {
      if (task.backend === 'yt-dlp') {
        this.ytDlpService.cancelDownload(taskId);
      } else {
        this.galleryDlService.cancelDownload(taskId);
      }
      this.activeCount--;
    }

    task.status = 'cancelled';
    this.processQueue();
  }

  retryTask(taskId: string): void {
    const task = this.queue.get(taskId);
    if (task && (task.status === 'failed' || task.status === 'cancelled')) {
      task.status = 'pending';
      task.progress = 0;
      task.error = undefined;
      this.processQueue();
    }
  }

  removeTask(taskId: string): void {
    const task = this.queue.get(taskId);
    if (task) {
      if (task.status === 'downloading') {
        if (task.backend === 'yt-dlp') {
          this.ytDlpService.cancelDownload(taskId);
        } else {
          this.galleryDlService.cancelDownload(taskId);
        }
        this.activeCount--;
      }
      this.queue.delete(taskId);
      this.processQueue();
    }
  }

  getTask(taskId: string): DownloadTask | undefined {
    return this.queue.get(taskId);
  }

  getAllTasks(): DownloadTask[] {
    return Array.from(this.queue.values());
  }

  getQueueStatus(): QueueStatus {
    let active = 0;
    let pending = 0;
    let completed = 0;
    let failed = 0;
    let paused = 0;

    for (const task of this.queue.values()) {
      switch (task.status) {
        case 'downloading':
          active++;
          break;
        case 'pending':
          pending++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'paused':
          paused++;
          break;
      }
    }

    return {
      active,
      pending,
      completed,
      failed,
      paused,
      totalSpeed: '', // TODO: aggregate speed from active downloads
    };
  }

  updateTaskProgress(taskId: string, updates: Partial<DownloadTask>): void {
    const task = this.queue.get(taskId);
    if (task) {
      Object.assign(task, updates);
    }
  }

  markTaskComplete(taskId: string): void {
    const task = this.queue.get(taskId);
    if (task) {
      task.status = 'completed';
      task.progress = 100;
      task.completedAt = new Date().toISOString();
      this.activeCount--;
      this.processQueue();

      // Fire-and-forget auto-dedup if configured. Errors are swallowed so
      // a bad dedup pass never breaks the download flow.
      this.maybeAutoDedup(task);
    }
  }

  private maybeAutoDedup(task: DownloadTask): void {
    if (!this.dedupService || !this.dedupConfigProvider) return;
    const cfg = this.dedupConfigProvider();
    if (!cfg || !cfg.enabled || !cfg.autoAfterTask) return;
    if (!task.outputDir) return;

    void this.dedupService
      .scan(task.outputDir, cfg, task.id)
      .catch((err) => {
        console.error(`[dedup] auto-scan failed for ${task.id}:`, err);
      });
  }

  markTaskFailed(taskId: string, error: string): void {
    const task = this.queue.get(taskId);
    if (!task) return;
    const wasDownloading = task.status === 'downloading';
    task.status = 'failed';
    task.error = error;
    if (wasDownloading) {
      this.activeCount--;
    }
    this.processQueue();
  }

  clearCompleted(): void {
    for (const [id, task] of this.queue) {
      if (task.status === 'completed') {
        this.queue.delete(id);
      }
    }
  }

  private async processQueue(): Promise<void> {
    if (this.activeCount >= this.maxConcurrent) return;

    for (const task of this.queue.values()) {
      if (this.activeCount >= this.maxConcurrent) break;

      if (task.status === 'pending') {
        task.status = 'downloading';
        task.startedAt = new Date().toISOString();
        this.activeCount++;

        // Start download asynchronously, routing to the correct backend
        const service = task.backend === 'yt-dlp' ? this.ytDlpService : this.galleryDlService;
        service.startDownload(task).catch((error) => {
          this.markTaskFailed(task.id, error instanceof Error ? error.message : String(error));
        });
      }
    }
  }

  private extractSite(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  }
}
