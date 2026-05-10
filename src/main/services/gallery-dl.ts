import { spawn, ChildProcess, execFile } from 'child_process';
import { BrowserWindow } from 'electron';
import { IpcChannel } from '../../shared/types';
import type { DownloadTask, DownloadProgress, PreviewResult, PreviewItem } from '../../shared/types';
import type { AuthService } from './auth';

export class GalleryDlService {
  private processes: Map<string, ChildProcess> = new Map();
  private fileCounts: Map<string, number> = new Map();
  private galleryDlPath: string = 'gallery-dl';
  private onComplete?: (taskId: string, success: boolean, error?: string) => void;
  private authService?: AuthService;

  setOnComplete(callback: (taskId: string, success: boolean, error?: string) => void): void {
    this.onComplete = callback;
  }

  setPath(path: string): void {
    this.galleryDlPath = path;
  }

  setAuthService(service: AuthService): void {
    this.authService = service;
  }

  async checkInstallation(): Promise<{ installed: boolean; version?: string; path?: string }> {
    return new Promise((resolve) => {
      execFile(this.galleryDlPath, ['--version'], (error, stdout) => {
        if (error) {
          resolve({ installed: false });
        } else {
          resolve({
            installed: true,
            version: stdout.trim(),
            path: this.galleryDlPath,
          });
        }
      });
    });
  }

  async startDownload(task: DownloadTask): Promise<void> {
    const args = this.buildArgs(task);

    const child = spawn(this.galleryDlPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.processes.set(task.id, child);
    this.fileCounts.set(task.id, 0);

    child.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      const progress = this.parseProgress(task.id, output);
      if (progress) {
        this.sendToRenderer(IpcChannel.DOWNLOAD_PROGRESS, progress);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const errorOutput = data.toString();
      console.error(`[gallery-dl:${task.id}] stderr: ${errorOutput}`);
    });

    child.on('close', (code) => {
      this.processes.delete(task.id);
      const filesDownloaded = this.fileCounts.get(task.id) ?? 0;
      this.fileCounts.delete(task.id);

      const success = code === 0 || filesDownloaded > 0;

      // Notify queue service to decrement activeCount and process next
      this.onComplete?.(task.id, success, success ? undefined : `Process exited with code ${code}`);

      // Then notify renderer
      const result = {
        taskId: task.id,
        success,
        filesDownloaded,
        outputDir: task.outputDir,
        error: !success ? `Process exited with code ${code}` : undefined,
        completedAt: new Date().toISOString(),
      };
      this.sendToRenderer(IpcChannel.DOWNLOAD_COMPLETE, result);
    });

    child.on('error', (error) => {
      this.processes.delete(task.id);
      this.fileCounts.delete(task.id);

      // Notify queue service
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

  async preview(url: string): Promise<PreviewResult> {
    return new Promise((resolve) => {
      const args = ['--simulate', '--dump-json', ...this.buildAuthArgs(url), url];
      const output: string[] = [];

      const child = spawn(this.galleryDlPath, args);

      child.stdout?.on('data', (data: Buffer) => {
        output.push(data.toString());
      });

      child.on('close', (code) => {
        if (code === 0) {
          const result = this.parsePreviewOutput(url, output.join(''));
          resolve(result);
        } else {
          resolve({
            url,
            site: this.extractSite(url),
            title: '',
            itemCount: 0,
            items: [],
            error: `Preview failed with code ${code}`,
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          url,
          site: this.extractSite(url),
          title: '',
          itemCount: 0,
          items: [],
          error: error.message,
        });
      });
    });
  }

  private buildArgs(task: DownloadTask): string[] {
    const args: string[] = [];

    args.push('--dest', task.outputDir);

    // Pass auth credentials if available
    args.push(...this.buildAuthArgs(task.url));

    if (task.config) {
      for (const [key, value] of Object.entries(task.config)) {
        args.push('-o', `${key}=${String(value)}`);
      }
    }

    args.push(task.url);
    return args;
  }

  private buildAuthArgs(url: string): string[] {
    const args: string[] = [];
    if (!this.authService) return args;
    const site = this.detectSite(url);
    if (!site) return args;
    const auth = this.authService.getForDownload(site);
    if (!auth || !auth.enabled) return args;
    switch (auth.method) {
      case 'credentials':
        if (auth.username) args.push('--username', auth.username);
        if (auth.password) args.push('--password', auth.password);
        break;
      case 'cookies-file':
        if (auth.cookiesPath) args.push('--cookies', auth.cookiesPath);
        break;
      case 'cookies-browser':
        if (auth.browser) {
          let browserArg = auth.browser;
          if (auth.browserProfile) browserArg += `/${auth.browserProfile}`;
          if (auth.cookieDomain) browserArg += `::${auth.cookieDomain}`;
          args.push('--cookies-from-browser', browserArg);
        }
        break;
    }
    return args;
  }

  private detectSite(url: string): string | null {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const domainMap: Record<string, string> = {
        'instagram.com': 'instagram',
        'twitter.com': 'twitter',
        'x.com': 'twitter',
        'pixiv.net': 'pixiv',
        'deviantart.com': 'deviantart',
        'danbooru.donmai.us': 'danbooru',
        'e621.net': 'e621',
        'patreon.com': 'patreon',
        'fanbox.cc': 'fanbox',
        'fantia.jp': 'fantia',
        'kemono.su': 'kemono',
        'reddit.com': 'reddit',
        'tumblr.com': 'tumblr',
        'flickr.com': 'flickr',
        'pinterest.com': 'pinterest',
        'facebook.com': 'facebook',
        'tiktok.com': 'tiktok',
        'newgrounds.com': 'newgrounds',
        'inkbunny.net': 'inkbunny',
        'furaffinity.net': 'furaffinity',
        'sankakucomplex.com': 'sankaku',
        'mangadex.org': 'mangadex',
        'subscribestar.com': 'subscribestar',
        'subscribestar.adult': 'subscribestar',
        'boosty.to': 'boosty',
        'bsky.app': 'bluesky',
        'baraag.net': 'baraag',
        'vk.com': 'vk',
        'weibo.com': 'weibo',
        'weibo.cn': 'weibo',
        'hentairox.com': 'hentairox',
        'imhentai.xxx': 'imhentai',
        'hentaiera.com': 'hentaiera',
        'hentaifox.com': 'hentaifox',
        'hentaienvy.com': 'hentaienvy',
        'hentaizap.com': 'hentaizap',
      };
      for (const [domain, site] of Object.entries(domainMap)) {
        if (hostname === domain || hostname.endsWith('.' + domain)) return site;
      }
      // Fallback: use the first part of the hostname
      return hostname.split('.').slice(-2, -1)[0] || null;
    } catch {
      return null;
    }
  }

  private parseProgress(taskId: string, output: string): DownloadProgress | null {
    // gallery-dl outputs the full file path of each downloaded file (one per line) on stdout
    const lines = output.trim().split('\n');
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length === 0) return null;

    // Each non-empty stdout line represents a successfully downloaded file
    const currentCount = this.fileCounts.get(taskId) ?? 0;
    const newCount = currentCount + nonEmptyLines.length;
    this.fileCounts.set(taskId, newCount);

    return {
      taskId,
      progress: 0,
      speed: '',
      eta: '',
      downloadedFiles: newCount,
      totalFiles: 0,
      downloadedSize: '',
      totalSize: '',
      currentFile: nonEmptyLines[nonEmptyLines.length - 1],
    };
  }

  private parsePreviewOutput(url: string, output: string): PreviewResult {
    try {
      const items: PreviewItem[] = [];
      const lines = output.trim().split('\n');

      for (const line of lines) {
        try {
          const data = JSON.parse(line) as Record<string, unknown>;
          items.push({
            url: (data['url'] as string) ?? '',
            filename: (data['filename'] as string) ?? 'unknown',
            size: data['filesize'] ? String(data['filesize']) : undefined,
            type: this.inferFileType((data['filename'] as string) ?? ''),
            thumbnail: data['thumbnail'] as string | undefined,
          });
        } catch {
          // Skip non-JSON lines
        }
      }

      return {
        url,
        site: this.extractSite(url),
        title: items.length > 0 ? `${items.length} items found` : 'No items found',
        itemCount: items.length,
        items,
      };
    } catch {
      return {
        url,
        site: this.extractSite(url),
        title: '',
        itemCount: 0,
        items: [],
        error: 'Failed to parse preview output',
      };
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

  private inferFileType(filename: string): PreviewItem['type'] {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'];
    const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv'];
    const audioExts = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a'];
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];

    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (archiveExts.includes(ext)) return 'archive';
    return 'other';
  }

  private sendToRenderer(channel: IpcChannel, data: unknown): void {
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      window.webContents.send(channel, data);
    }
  }
}
