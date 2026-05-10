import { contextBridge, ipcRenderer } from "electron";
import { IpcChannel } from "../shared/types";
import type {
  DownloadTask,
  GalleryDlConfig,
  AppConfig,
  HistoryFilter,
  PaginatedResult,
  HistoryEntry,
  PreviewResult,
  QueueStatus,
  DownloadProgress,
  DownloadResult,
  DedupProgress,
  DedupResult,
  ElectronAPI,
} from "../shared/types";

const api: ElectronAPI = {
  // Download operations
  downloadStart: (url, config) =>
    ipcRenderer.invoke(IpcChannel.DOWNLOAD_START, url, config),
  downloadPause: (taskId) =>
    ipcRenderer.invoke(IpcChannel.DOWNLOAD_PAUSE, taskId),
  downloadResume: (taskId) =>
    ipcRenderer.invoke(IpcChannel.DOWNLOAD_RESUME, taskId),
  downloadCancel: (taskId) =>
    ipcRenderer.invoke(IpcChannel.DOWNLOAD_CANCEL, taskId),
  downloadRetry: (taskId) =>
    ipcRenderer.invoke(IpcChannel.DOWNLOAD_RETRY, taskId),
  downloadRemove: (taskId) =>
    ipcRenderer.invoke(IpcChannel.DOWNLOAD_REMOVE, taskId),
  downloadQueueStatus: () =>
    ipcRenderer.invoke(IpcChannel.DOWNLOAD_QUEUE_STATUS),

  // Config operations
  configLoad: () => ipcRenderer.invoke(IpcChannel.CONFIG_LOAD),
  configSave: (config) => ipcRenderer.invoke(IpcChannel.CONFIG_SAVE, config),
  configReset: () => ipcRenderer.invoke(IpcChannel.CONFIG_RESET),
  configExport: () => ipcRenderer.invoke(IpcChannel.CONFIG_EXPORT),
  configImport: () => ipcRenderer.invoke(IpcChannel.CONFIG_IMPORT),

  // App config
  appConfigLoad: () => ipcRenderer.invoke(IpcChannel.APP_CONFIG_LOAD),
  appConfigSave: (config) =>
    ipcRenderer.invoke(IpcChannel.APP_CONFIG_SAVE, config),

  // History
  historyList: (filter, page, pageSize) =>
    ipcRenderer.invoke(IpcChannel.HISTORY_LIST, filter, page, pageSize),
  historyGet: (id) => ipcRenderer.invoke(IpcChannel.HISTORY_GET, id),
  historyDelete: (id) => ipcRenderer.invoke(IpcChannel.HISTORY_DELETE, id),
  historyClear: () => ipcRenderer.invoke(IpcChannel.HISTORY_CLEAR),

  // Preview
  previewScan: (url) => ipcRenderer.invoke(IpcChannel.PREVIEW_SCAN, url),

  // File system
  selectDirectory: () => ipcRenderer.invoke(IpcChannel.FS_SELECT_DIRECTORY),
  selectFile: (filters) =>
    ipcRenderer.invoke(IpcChannel.FS_SELECT_FILE, filters),
  openPath: (path) => ipcRenderer.invoke(IpcChannel.FS_OPEN_PATH, path),

  // App window
  minimize: () => ipcRenderer.invoke(IpcChannel.APP_MINIMIZE),
  maximize: () => ipcRenderer.invoke(IpcChannel.APP_MAXIMIZE),
  close: () => ipcRenderer.invoke(IpcChannel.APP_CLOSE),
  checkGalleryDl: () => ipcRenderer.invoke(IpcChannel.APP_CHECK_GALLERY_DL),
  checkYtDlp: () => ipcRenderer.invoke(IpcChannel.APP_CHECK_YT_DLP),
  openExternal: (url) => ipcRenderer.invoke(IpcChannel.APP_OPEN_EXTERNAL, url),

  // Deduplication
  dedupScan: (dir, config, taskId) =>
    ipcRenderer.invoke(IpcChannel.DEDUP_SCAN, dir, config, taskId),
  dedupListReports: () => ipcRenderer.invoke(IpcChannel.DEDUP_LIST_REPORTS),
  dedupGetReport: (id) => ipcRenderer.invoke(IpcChannel.DEDUP_GET_REPORT, id),
  dedupRestore: (reportId, filePath) =>
    ipcRenderer.invoke(IpcChannel.DEDUP_RESTORE, reportId, filePath),
  onDedupProgress: (callback) => {
    const handler = (_e: Electron.IpcRendererEvent, p: DedupProgress) => callback(p);
    ipcRenderer.on(IpcChannel.DEDUP_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IpcChannel.DEDUP_PROGRESS, handler);
  },
  onDedupResult: (callback) => {
    const handler = (_e: Electron.IpcRendererEvent, r: DedupResult) => callback(r);
    ipcRenderer.on(IpcChannel.DEDUP_RESULT, handler);
    return () => ipcRenderer.removeListener(IpcChannel.DEDUP_RESULT, handler);
  },

  // Auth operations
  authList: () => ipcRenderer.invoke(IpcChannel.AUTH_LIST),
  authGet: (id) => ipcRenderer.invoke(IpcChannel.AUTH_GET, id),
  authSave: (auth) => ipcRenderer.invoke(IpcChannel.AUTH_SAVE, auth),
  authDelete: (id) => ipcRenderer.invoke(IpcChannel.AUTH_DELETE, id),
  authTest: (auth) => ipcRenderer.invoke(IpcChannel.AUTH_TEST, auth),
  authImportCookies: () => ipcRenderer.invoke(IpcChannel.AUTH_IMPORT_COOKIES),
  authListBrowsers: () => ipcRenderer.invoke(IpcChannel.AUTH_LIST_BROWSERS),
  authGetSupportedSites: () =>
    ipcRenderer.invoke(IpcChannel.AUTH_GET_SUPPORTED_SITES),

  // Event listeners with cleanup
  onDownloadProgress: (callback) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      progress: DownloadProgress,
    ) => callback(progress);
    ipcRenderer.on(IpcChannel.DOWNLOAD_PROGRESS, handler);
    return () =>
      ipcRenderer.removeListener(IpcChannel.DOWNLOAD_PROGRESS, handler);
  },
  onDownloadComplete: (callback) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      result: DownloadResult,
    ) => callback(result);
    ipcRenderer.on(IpcChannel.DOWNLOAD_COMPLETE, handler);
    return () =>
      ipcRenderer.removeListener(IpcChannel.DOWNLOAD_COMPLETE, handler);
  },
  onDownloadError: (callback) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      error: { taskId: string; error: string },
    ) => callback(error);
    ipcRenderer.on(IpcChannel.DOWNLOAD_ERROR, handler);
    return () => ipcRenderer.removeListener(IpcChannel.DOWNLOAD_ERROR, handler);
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
