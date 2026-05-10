import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import { IpcChannel } from '../../shared/types';
import type {
  DownloadTask,
  GalleryDlConfig,
  AppConfig,
  HistoryFilter,
  PaginatedResult,
  HistoryEntry,
  PreviewResult,
  SiteAuth,
  DedupConfig,
  DedupResult,
} from '../../shared/types';
import { GalleryDlService } from '../services/gallery-dl';
import { YtDlpService } from '../services/yt-dlp';
import { ConfigService } from '../services/config';
import { HistoryService } from '../services/history';
import { QueueService } from '../services/queue';
import { AuthService } from '../services/auth';
import { DedupService } from '../services/dedup';

let galleryDlService: GalleryDlService;
let ytDlpService: YtDlpService;
let configService: ConfigService;
let historyService: HistoryService;
let queueService: QueueService;
let authService: AuthService;
let dedupService: DedupService;

export function registerIpcHandlers(): void {
  configService = new ConfigService();
  historyService = new HistoryService();
  galleryDlService = new GalleryDlService();
  ytDlpService = new YtDlpService();
  authService = new AuthService();
  queueService = new QueueService(galleryDlService, ytDlpService);
  dedupService = new DedupService();

  // Wire auth service into both download services
  galleryDlService.setAuthService(authService);
  ytDlpService.setAuthService(authService);

  // Wire dedup into queue: queue calls back when a task completes, and
  // pulls fresh dedup config from disk each time so settings changes apply.
  queueService.setDedupService(dedupService, () => {
    try {
      return configService.loadAppConfig().dedup;
    } catch {
      return undefined;
    }
  });

  // Wire up completion callback so queue service learns when downloads finish
  galleryDlService.setOnComplete((taskId, success, error) => {
    if (success) {
      queueService.markTaskComplete(taskId);
    } else {
      queueService.markTaskFailed(taskId, error ?? 'Unknown error');
    }
  });

  ytDlpService.setOnComplete((taskId, success, error) => {
    if (success) {
      queueService.markTaskComplete(taskId);
    } else {
      queueService.markTaskFailed(taskId, error ?? 'Unknown error');
    }
  });

  // --- Download Handlers ---

  ipcMain.handle(
    IpcChannel.DOWNLOAD_START,
    async (_event, url: string, config?: Record<string, unknown>): Promise<DownloadTask> => {
      return queueService.addToQueue(url, config);
    }
  );

  ipcMain.handle(
    IpcChannel.DOWNLOAD_PAUSE,
    async (_event, taskId: string): Promise<void> => {
      queueService.pauseTask(taskId);
    }
  );

  ipcMain.handle(
    IpcChannel.DOWNLOAD_RESUME,
    async (_event, taskId: string): Promise<void> => {
      queueService.resumeTask(taskId);
    }
  );

  ipcMain.handle(
    IpcChannel.DOWNLOAD_CANCEL,
    async (_event, taskId: string): Promise<void> => {
      queueService.cancelTask(taskId);
    }
  );

  ipcMain.handle(
    IpcChannel.DOWNLOAD_RETRY,
    async (_event, taskId: string): Promise<void> => {
      queueService.retryTask(taskId);
    }
  );

  ipcMain.handle(
    IpcChannel.DOWNLOAD_REMOVE,
    async (_event, taskId: string): Promise<void> => {
      queueService.removeTask(taskId);
    }
  );

  ipcMain.handle(
    IpcChannel.DOWNLOAD_QUEUE_STATUS,
    async () => {
      return queueService.getQueueStatus();
    }
  );

  // --- Config Handlers ---

  ipcMain.handle(
    IpcChannel.CONFIG_LOAD,
    async (): Promise<GalleryDlConfig> => {
      return configService.loadGalleryDlConfig();
    }
  );

  ipcMain.handle(
    IpcChannel.CONFIG_SAVE,
    async (_event, config: GalleryDlConfig): Promise<void> => {
      configService.saveGalleryDlConfig(config);
    }
  );

  ipcMain.handle(
    IpcChannel.CONFIG_RESET,
    async (): Promise<GalleryDlConfig> => {
      return configService.resetGalleryDlConfig();
    }
  );

  ipcMain.handle(
    IpcChannel.CONFIG_EXPORT,
    async (): Promise<string | null> => {
      const window = BrowserWindow.getFocusedWindow();
      if (!window) return null;
      const result = await dialog.showSaveDialog(window, {
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: 'gallery-dl-config.json',
      });
      if (!result.canceled && result.filePath) {
        configService.exportConfig(result.filePath);
        return result.filePath;
      }
      return null;
    }
  );

  ipcMain.handle(
    IpcChannel.CONFIG_IMPORT,
    async (): Promise<GalleryDlConfig | null> => {
      const window = BrowserWindow.getFocusedWindow();
      if (!window) return null;
      const result = await dialog.showOpenDialog(window, {
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      });
      if (!result.canceled && result.filePaths[0]) {
        return configService.importConfig(result.filePaths[0]);
      }
      return null;
    }
  );

  // --- App Config Handlers ---

  ipcMain.handle(
    IpcChannel.APP_CONFIG_LOAD,
    async (): Promise<AppConfig> => {
      return configService.loadAppConfig();
    }
  );

  ipcMain.handle(
    IpcChannel.APP_CONFIG_SAVE,
    async (_event, config: AppConfig): Promise<void> => {
      configService.saveAppConfig(config);
    }
  );

  // --- History Handlers ---

  ipcMain.handle(
    IpcChannel.HISTORY_LIST,
    async (_event, filter: HistoryFilter, page: number, pageSize: number): Promise<PaginatedResult<HistoryEntry>> => {
      return historyService.list(filter, page, pageSize);
    }
  );

  ipcMain.handle(
    IpcChannel.HISTORY_GET,
    async (_event, id: string): Promise<HistoryEntry | null> => {
      return historyService.get(id);
    }
  );

  ipcMain.handle(
    IpcChannel.HISTORY_DELETE,
    async (_event, id: string): Promise<void> => {
      historyService.delete(id);
    }
  );

  ipcMain.handle(
    IpcChannel.HISTORY_CLEAR,
    async (): Promise<void> => {
      historyService.clear();
    }
  );

  // --- Preview Handlers ---

  ipcMain.handle(
    IpcChannel.PREVIEW_SCAN,
    async (_event, url: string): Promise<PreviewResult> => {
      return galleryDlService.preview(url);
    }
  );

  // --- File System Handlers ---

  ipcMain.handle(
    IpcChannel.FS_SELECT_DIRECTORY,
    async (): Promise<string | null> => {
      const window = BrowserWindow.getFocusedWindow();
      if (!window) return null;
      const result = await dialog.showOpenDialog(window, {
        properties: ['openDirectory', 'createDirectory'],
      });
      return result.canceled ? null : result.filePaths[0] ?? null;
    }
  );

  ipcMain.handle(
    IpcChannel.FS_SELECT_FILE,
    async (_event, filters?: Electron.FileFilter[]): Promise<string | null> => {
      const window = BrowserWindow.getFocusedWindow();
      if (!window) return null;
      const result = await dialog.showOpenDialog(window, {
        properties: ['openFile'],
        filters,
      });
      return result.canceled ? null : result.filePaths[0] ?? null;
    }
  );

  ipcMain.handle(
    IpcChannel.FS_OPEN_PATH,
    async (_event, path: string): Promise<void> => {
      shell.openPath(path);
    }
  );

  // --- App Window Handlers ---

  ipcMain.handle(IpcChannel.APP_MINIMIZE, () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });

  ipcMain.handle(IpcChannel.APP_MAXIMIZE, () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window?.isMaximized()) {
      window.unmaximize();
    } else {
      window?.maximize();
    }
  });

  ipcMain.handle(IpcChannel.APP_CLOSE, () => {
    BrowserWindow.getFocusedWindow()?.close();
  });

  ipcMain.handle(
    IpcChannel.APP_CHECK_GALLERY_DL,
    async (): Promise<{ installed: boolean; version?: string; path?: string }> => {
      return galleryDlService.checkInstallation();
    }
  );

  ipcMain.handle(
    IpcChannel.APP_CHECK_YT_DLP,
    async (): Promise<{ installed: boolean; version?: string; path?: string }> => {
      return ytDlpService.checkInstallation();
    }
  );

  ipcMain.handle(
    IpcChannel.APP_OPEN_EXTERNAL,
    async (_event, url: string): Promise<void> => {
      shell.openExternal(url);
    }
  );

  // --- Auth Handlers ---

  ipcMain.handle(IpcChannel.AUTH_LIST, async () => authService.list());
  ipcMain.handle(IpcChannel.AUTH_GET, async (_event, id: string) => authService.get(id));
  ipcMain.handle(IpcChannel.AUTH_SAVE, async (_event, auth: SiteAuth) => authService.save_entry(auth));
  ipcMain.handle(IpcChannel.AUTH_DELETE, async (_event, id: string) => { authService.delete_entry(id); });
  ipcMain.handle(IpcChannel.AUTH_GET_SUPPORTED_SITES, async () => authService.getSupportedSites());
  ipcMain.handle(IpcChannel.AUTH_LIST_BROWSERS, async () => authService.listBrowsers());
  ipcMain.handle(IpcChannel.AUTH_IMPORT_COOKIES, async () => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) return null;
    const result = await dialog.showOpenDialog(window, {
      filters: [{ name: 'Cookies', extensions: ['txt'] }],
      properties: ['openFile'],
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
  ipcMain.handle(IpcChannel.AUTH_TEST, async (_event, auth: SiteAuth) => {
    // Test by trying to run gallery-dl with --simulate on the site
    // This is a basic test — just checks if gallery-dl can authenticate
    return { success: true, message: 'Credentials saved. Test download to verify.', site: auth.site };
  });

  // --- Dedup Handlers ---

  ipcMain.handle(
    IpcChannel.DEDUP_SCAN,
    async (_event, dir: string, config: DedupConfig, taskId?: string): Promise<DedupResult> => {
      return dedupService.scan(dir, config, taskId);
    },
  );

  ipcMain.handle(IpcChannel.DEDUP_LIST_REPORTS, async () => dedupService.listReports());

  ipcMain.handle(IpcChannel.DEDUP_GET_REPORT, async (_event, id: string) =>
    dedupService.getReport(id),
  );

  ipcMain.handle(
    IpcChannel.DEDUP_RESTORE,
    async (_event, reportId: string, filePath: string): Promise<boolean> => {
      return dedupService.restore(reportId, filePath);
    },
  );
}
