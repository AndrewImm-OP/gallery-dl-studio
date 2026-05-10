import { spawn, ChildProcess, execFile } from 'child_process';
import { BrowserWindow } from 'electron';
import { IpcChannel } from '../../shared/types';
import type { DownloadTask, DownloadProgress } from '../../shared/types';
import type { AuthService } from './auth';

export class YtDlpService {
  private processes: Map<string, ChildProcess> = new Map();
  private ytDlpPath: string = 'yt-dlp';
  private onComplete?: (taskId: string, success: boolean, error?: string) => void;
  private authService?: AuthService;

  setOnComplete(callback: (taskId: string, success: boolean, error?: string) => void): void {
    this.onComplete = callback;
  }

  setPath(path: string): void {
    this.ytDlpPath = path;
  }

  setAuthService(service: AuthService): void {
    this.authService = service;
  }

  async checkInstallation(): Promise<{ installed: boolean; version?: string; path?: string }> {
    return new Promise((resolve) => {
      execFile(this.ytDlpPath, ['--version'], (error, stdout) => {
        if (error) {
          resolve({ installed: false });
        } else {
          resolve({
            installed: true,
            version: stdout.trim(),
            path: this.ytDlpPath,
          });
        }
      });
    });
  }

  async startDownload(task: DownloadTask): Promise<void> {
    const args = this.buildArgs(task);

    const child = spawn(this.ytDlpPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.processes.set(task.id, child);

    let lastFile = '';

    child.stdout?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) lastFile = output;
    });

    child.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      const progress = this.parseProgress(task.id, output);
      if (progress) {
        this.sendToRenderer(IpcChannel.DOWNLOAD_PROGRESS, progress);
      }
    });

    child.on('close', (code) => {
      this.processes.delete(task.id);
      const success = code === 0;
      this.onComplete?.(task.id, success, success ? undefined : `yt-dlp exited with code ${code}`);

      this.sendToRenderer(IpcChannel.DOWNLOAD_COMPLETE, {
        taskId: task.id,
        success,
        filesDownloaded: success ? 1 : 0,
        outputDir: task.outputDir,
        error: !success ? `yt-dlp exited with code ${code}` : undefined,
        completedAt: new Date().toISOString(),
      });
    });

    child.on('error', (error) => {
      this.processes.delete(task.id);
      this.onComplete?.(task.id, false, error.message);
      this.sendToRenderer(IpcChannel.DOWNLOAD_ERROR, {
        taskId: task.id,
        error: error.message,
      });
    });
  }

  pauseDownload(taskId: string): boolean {
    const process = this.processes.get(taskId);
    if (process) {
      process.kill('SIGSTOP');
      return true;
    }
    return false;
  }

  resumeDownload(taskId: string): boolean {
    const process = this.processes.get(taskId);
    if (process) {
      process.kill('SIGCONT');
      return true;
    }
    return false;
  }

  cancelDownload(taskId: string): boolean {
    const process = this.processes.get(taskId);
    if (process) {
      process.kill('SIGTERM');
      this.processes.delete(taskId);
      return true;
    }
    return false;
  }

  private buildArgs(task: DownloadTask): string[] {
    const args: string[] = [];

    // Output directory
    args.push('-P', task.outputDir);

    // Output template — organize by site
    args.push('-o', '%(extractor)s/%(title)s.%(ext)s');

    // Embed metadata
    args.push('--embed-metadata');

    // Auth
    args.push(...this.buildAuthArgs(task.url));

    // Any extra config passed per-task
    if (task.config) {
      for (const [key, value] of Object.entries(task.config)) {
        args.push('--' + key, String(value));
      }
    }

    args.push(task.url);
    return args;
  }

  private buildAuthArgs(url: string): string[] {
    const args: string[] = [];
    if (!this.authService) return args;

    // Detect site from URL
    const site = this.detectSite(url);
    if (!site) return args;

    const auth = this.authService.getForDownload(site);
    if (!auth || !auth.enabled) return args;

    switch (auth.method) {
      case 'credentials':
        if (auth.username) args.push('-u', auth.username);
        if (auth.password) args.push('-p', auth.password);
        break;
      case 'cookies-file':
        if (auth.cookiesPath) args.push('--cookies', auth.cookiesPath);
        break;
      case 'cookies-browser':
        if (auth.browser) {
          let browserArg = auth.browser;
          if (auth.browserProfile) browserArg += `:${auth.browserProfile}`;
          args.push('--cookies-from-browser', browserArg);
        }
        break;
    }
    return args;
  }

  private detectSite(url: string): string | null {
    try {
      const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      // Map to gallery-dl category names for auth lookup consistency
      const map: Record<string, string> = {
        'youtube.com': 'youtube', 'youtu.be': 'youtube',
        'xvideos.com': 'xvideos',
        'pornhub.com': 'pornhub',
        'xhamster.com': 'xhamster',
        'tiktok.com': 'tiktok',
        'twitter.com': 'twitter', 'x.com': 'twitter',
        'instagram.com': 'instagram',
        'reddit.com': 'reddit',
        'twitch.tv': 'twitch',
        'vimeo.com': 'vimeo',
        'dailymotion.com': 'dailymotion',
        'bilibili.com': 'bilibili',
        'nicovideo.jp': 'niconico',
        'soundcloud.com': 'soundcloud',
      };
      for (const [domain, site] of Object.entries(map)) {
        if (hostname === domain || hostname.endsWith('.' + domain)) return site;
      }
      return hostname.split('.').slice(-2, -1)[0] || null;
    } catch {
      return null;
    }
  }

  // Parse yt-dlp stderr progress output
  // Format: [download]  45.2% of  125.30MiB at  2.50MiB/s ETA 00:35
  // Also:   [download]  45.2% of ~ 125.30MiB at  2.50MiB/s ETA 00:35 (frag 12/27)
  // Also:   [download] Destination: filename.mp4
  private parseProgress(taskId: string, output: string): DownloadProgress | null {
    // Match percentage-based progress lines
    const match = output.match(
      /\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\w+)\s+at\s+([\d.]+\w+\/s)\s+ETA\s+([\d:]+)/
    );

    if (match) {
      return {
        taskId,
        progress: parseFloat(match[1]),
        speed: match[3],
        eta: match[4],
        downloadedFiles: 0,
        totalFiles: 1,
        downloadedSize: '',
        totalSize: match[2],
        currentFile: '',
      };
    }

    // Match "100%" completion line: [download] 100% of 125.30MiB in 00:50
    const doneMatch = output.match(
      /\[download\]\s+100%\s+of\s+([\d.]+\w+)/
    );
    if (doneMatch) {
      return {
        taskId,
        progress: 100,
        speed: '',
        eta: '',
        downloadedFiles: 1,
        totalFiles: 1,
        downloadedSize: doneMatch[1],
        totalSize: doneMatch[1],
        currentFile: '',
      };
    }

    // Match "already downloaded" line
    if (output.includes('has already been downloaded')) {
      return {
        taskId,
        progress: 100,
        speed: '',
        eta: '',
        downloadedFiles: 1,
        totalFiles: 1,
        downloadedSize: '',
        totalSize: '',
        currentFile: '',
      };
    }

    return null;
  }

  private sendToRenderer(channel: IpcChannel, data: unknown): void {
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      window.webContents.send(channel, data);
    }
  }
}
