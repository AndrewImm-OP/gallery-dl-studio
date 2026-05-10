// ============================================================
// Shared types used by both main process and renderer process
// ============================================================

// --- Download Types ---

export type DownloadBackend = "gallery-dl" | "yt-dlp";

export type DownloadStatus =
  | "pending"
  | "downloading"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface DownloadTask {
  id: string;
  url: string;
  status: DownloadStatus;
  progress: number;
  speed: string;
  eta: string;
  totalFiles: number;
  downloadedFiles: number;
  totalSize: string;
  downloadedSize: string;
  site: string;
  title: string;
  thumbnail?: string;
  outputDir: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  backend?: DownloadBackend;
  config?: Record<string, unknown>;
}

export interface DownloadProgress {
  taskId: string;
  progress: number;
  speed: string;
  eta: string;
  downloadedFiles: number;
  totalFiles: number;
  downloadedSize: string;
  totalSize: string;
  currentFile?: string;
}

export interface DownloadResult {
  taskId: string;
  success: boolean;
  filesDownloaded: number;
  outputDir: string;
  error?: string;
  completedAt: string;
}

// --- Config Types ---

export interface GalleryDlConfig {
  extractor?: ExtractorConfig;
  downloader?: DownloaderConfig;
  output?: OutputConfig;
  postprocessor?: PostprocessorConfig[];
  [key: string]: unknown;
}

export interface ExtractorConfig {
  base_directory?: string;
  archive?: string;
  cookies?: string | Record<string, string>;
  proxy?: string;
  user_agent?: string;
  retries?: number;
  timeout?: number;
  sleep?: number;
  sleep_request?: number;
  [key: string]: unknown;
}

export interface DownloaderConfig {
  rate?: string;
  retries?: number;
  timeout?: number;
  part?: boolean;
  part_directory?: string;
  [key: string]: unknown;
}

export interface OutputConfig {
  mode?: "terminal" | "pipe" | "null";
  progress?: boolean;
  shorten?: boolean;
  log?: string;
  logfile?: string;
  [key: string]: unknown;
}

export interface PostprocessorConfig {
  name: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface AppConfig {
  galleryDlPath: string;
  ytDlpPath: string;
  defaultOutputDir: string;
  maxConcurrentDownloads: number;
  theme: "light" | "dark" | "system";
  notifications: boolean;
  autoStart: boolean;
  minimizeToTray: boolean;
  language: string;
  checkUpdates: boolean;
  dedup: DedupConfig;
}

// --- Deduplication Types ---

export interface DedupConfig {
  /** Master enable/disable. When false, dedup never runs. */
  enabled: boolean;
  /** Run dedup on the task's output dir right after it finishes. */
  autoAfterTask: boolean;
  /**
   * Hamming distance threshold on 64-bit pHash.
   * 0 = only exact (SHA256) duplicates are touched (safest, "hardcore" default).
   * 1-15 = also consider perceptually-similar images as duplicates.
   * Recommended for art with variations: 0-3.
   */
  phashThreshold: number;
  /**
   * Extra safety: refuse to mark two files as duplicates if their resolutions
   * differ by more than this ratio (e.g. 1.5 = 50% larger). Prevents merging
   * a thumbnail with a totally different artwork that happens to be similar.
   * Set to 0 to disable.
   */
  maxResolutionRatio: number;
  /** Where duplicates go. Path is relative to the scanned dir. */
  duplicatesFolder: string;
  /** If true, only writes the manifest and never moves files (dry run). */
  dryRun: boolean;
  /** File extensions to consider. Empty = all images. */
  extensions: string[];
}

export interface DedupFileInfo {
  path: string;
  size: number;
  width: number;
  height: number;
  format: string;
  sha256: string;
  phash: string; // 64-bit hash as hex string
  score: number; // higher = better quality
}

export interface DedupGroup {
  /** The file kept (winner). */
  keeper: DedupFileInfo;
  /** Files that were/would be moved to the duplicates folder. */
  duplicates: DedupFileInfo[];
  /** "exact" = SHA256 match; "perceptual" = pHash within threshold. */
  reason: "exact" | "perceptual";
}

export interface DedupResult {
  scannedDir: string;
  filesScanned: number;
  imagesAnalyzed: number;
  groups: DedupGroup[];
  filesMoved: number;
  spaceSavedBytes: number;
  durationMs: number;
  dryRun: boolean;
  errors: string[];
  startedAt: string;
  completedAt: string;
}

export interface DedupProgress {
  /** Optional: tied to a download task when run automatically. */
  taskId?: string;
  scannedDir: string;
  phase: "scanning" | "hashing" | "comparing" | "moving" | "done" | "error";
  current: number;
  total: number;
  message?: string;
}

// --- History Types ---

export interface HistoryEntry {
  id: string;
  url: string;
  site: string;
  title: string;
  thumbnail?: string;
  filesDownloaded: number;
  totalSize: string;
  outputDir: string;
  status: "completed" | "failed" | "cancelled";
  error?: string;
  startedAt: string;
  completedAt: string;
  duration: number; // in seconds
  config?: Record<string, unknown>;
}

export interface HistoryFilter {
  search?: string;
  site?: string;
  status?: HistoryEntry["status"];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "date" | "site" | "title" | "size";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- Auth Types ---

export type AuthMethod = "credentials" | "cookies-file" | "cookies-browser";

export interface SiteAuth {
  id: string;
  site: string; // gallery-dl category name (e.g., "instagram", "twitter", "pixiv")
  displayName: string; // human-readable name
  method: AuthMethod;
  // For credentials method
  username?: string;
  password?: string; // stored encrypted
  // For cookies-file method
  cookiesPath?: string;
  // For cookies-browser method
  browser?: string; // "firefox", "chrome", "chromium", "opera", "edge", "brave"
  browserProfile?: string; // optional browser profile name
  cookieDomain?: string; // optional domain filter
  // Meta
  enabled: boolean;
  lastTested?: string; // ISO date of last test
  testStatus?: "success" | "failed" | "untested";
  createdAt: string;
  updatedAt: string;
}

export interface AuthTestResult {
  success: boolean;
  message: string;
  site: string;
}

// Known sites that require/support auth, with their supported methods
export interface SiteAuthInfo {
  category: string; // gallery-dl extractor category
  displayName: string;
  supportedMethods: AuthMethod[];
  notes?: string; // e.g., "Requires OAuth" or "Use browser cookies"
}

// --- IPC Channel Types ---

export enum IpcChannel {
  // Download operations
  DOWNLOAD_START = "download:start",
  DOWNLOAD_PAUSE = "download:pause",
  DOWNLOAD_RESUME = "download:resume",
  DOWNLOAD_CANCEL = "download:cancel",
  DOWNLOAD_RETRY = "download:retry",
  DOWNLOAD_REMOVE = "download:remove",
  DOWNLOAD_PROGRESS = "download:progress",
  DOWNLOAD_COMPLETE = "download:complete",
  DOWNLOAD_ERROR = "download:error",
  DOWNLOAD_QUEUE_STATUS = "download:queue-status",

  // Config operations
  CONFIG_LOAD = "config:load",
  CONFIG_SAVE = "config:save",
  CONFIG_RESET = "config:reset",
  CONFIG_EXPORT = "config:export",
  CONFIG_IMPORT = "config:import",

  // App config
  APP_CONFIG_LOAD = "app-config:load",
  APP_CONFIG_SAVE = "app-config:save",

  // History operations
  HISTORY_LIST = "history:list",
  HISTORY_GET = "history:get",
  HISTORY_DELETE = "history:delete",
  HISTORY_CLEAR = "history:clear",
  HISTORY_EXPORT = "history:export",

  // Preview / URL scanning
  PREVIEW_SCAN = "preview:scan",
  PREVIEW_RESULT = "preview:result",

  // File system
  FS_SELECT_DIRECTORY = "fs:select-directory",
  FS_SELECT_FILE = "fs:select-file",
  FS_OPEN_PATH = "fs:open-path",

  // Auth operations
  AUTH_LIST = "auth:list",
  AUTH_GET = "auth:get",
  AUTH_SAVE = "auth:save",
  AUTH_DELETE = "auth:delete",
  AUTH_TEST = "auth:test",
  AUTH_IMPORT_COOKIES = "auth:import-cookies",
  AUTH_LIST_BROWSERS = "auth:list-browsers",
  AUTH_GET_SUPPORTED_SITES = "auth:get-supported-sites",

  // Deduplication
  DEDUP_SCAN = "dedup:scan",
  DEDUP_PROGRESS = "dedup:progress",
  DEDUP_RESULT = "dedup:result",
  DEDUP_RESTORE = "dedup:restore",
  DEDUP_LIST_REPORTS = "dedup:list-reports",
  DEDUP_GET_REPORT = "dedup:get-report",

  // App
  APP_MINIMIZE = "app:minimize",
  APP_MAXIMIZE = "app:maximize",
  APP_CLOSE = "app:close",
  APP_CHECK_GALLERY_DL = "app:check-gallery-dl",
  APP_CHECK_YT_DLP = "app:check-yt-dlp",
  APP_OPEN_EXTERNAL = "app:open-external",
}

// --- Preview Types ---

export interface PreviewItem {
  url: string;
  filename: string;
  size?: string;
  type: "image" | "video" | "audio" | "archive" | "other";
  thumbnail?: string;
}

export interface PreviewResult {
  url: string;
  site: string;
  title: string;
  itemCount: number;
  items: PreviewItem[];
  error?: string;
}

// --- Queue Types ---

export interface QueueStatus {
  active: number;
  pending: number;
  completed: number;
  failed: number;
  paused: number;
  totalSpeed: string;
}

// --- Electron Preload API ---

export interface ElectronAPI {
  // Download operations
  downloadStart: (
    url: string,
    config?: Record<string, unknown>,
  ) => Promise<DownloadTask>;
  downloadPause: (taskId: string) => Promise<void>;
  downloadResume: (taskId: string) => Promise<void>;
  downloadCancel: (taskId: string) => Promise<void>;
  downloadRetry: (taskId: string) => Promise<void>;
  downloadRemove: (taskId: string) => Promise<void>;
  downloadQueueStatus: () => Promise<QueueStatus>;

  // Config operations
  configLoad: () => Promise<GalleryDlConfig>;
  configSave: (config: GalleryDlConfig) => Promise<void>;
  configReset: () => Promise<GalleryDlConfig>;
  configExport: () => Promise<string | null>;
  configImport: () => Promise<GalleryDlConfig | null>;

  // App config
  appConfigLoad: () => Promise<AppConfig>;
  appConfigSave: (config: AppConfig) => Promise<void>;

  // History operations
  historyList: (
    filter: HistoryFilter,
    page: number,
    pageSize: number,
  ) => Promise<PaginatedResult<HistoryEntry>>;
  historyGet: (id: string) => Promise<HistoryEntry | null>;
  historyDelete: (id: string) => Promise<void>;
  historyClear: () => Promise<void>;

  // Preview
  previewScan: (url: string) => Promise<PreviewResult>;

  // File system
  selectDirectory: () => Promise<string | null>;
  selectFile: (
    filters?: { name: string; extensions: string[] }[],
  ) => Promise<string | null>;
  openPath: (path: string) => Promise<void>;

  // App window
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  checkGalleryDl: () => Promise<{
    installed: boolean;
    version?: string;
    path?: string;
  }>;
  checkYtDlp: () => Promise<{
    installed: boolean;
    version?: string;
    path?: string;
  }>;
  openExternal: (url: string) => Promise<void>;

  // Deduplication
  dedupScan: (
    dir: string,
    config: DedupConfig,
    taskId?: string,
  ) => Promise<DedupResult>;
  dedupListReports: () => Promise<
    Array<{ id: string; scannedDir: string; completedAt: string; filesMoved: number }>
  >;
  dedupGetReport: (id: string) => Promise<DedupResult | null>;
  dedupRestore: (reportId: string, filePath: string) => Promise<boolean>;
  onDedupProgress: (
    callback: (progress: DedupProgress) => void,
  ) => () => void;
  onDedupResult: (callback: (result: DedupResult) => void) => () => void;

  // Auth operations
  authList: () => Promise<SiteAuth[]>;
  authGet: (id: string) => Promise<SiteAuth | null>;
  authSave: (auth: SiteAuth) => Promise<SiteAuth>;
  authDelete: (id: string) => Promise<void>;
  authTest: (auth: SiteAuth) => Promise<AuthTestResult>;
  authImportCookies: () => Promise<string | null>;
  authListBrowsers: () => Promise<string[]>;
  authGetSupportedSites: () => Promise<SiteAuthInfo[]>;

  // Event listeners
  onDownloadProgress: (
    callback: (progress: DownloadProgress) => void,
  ) => () => void;
  onDownloadComplete: (
    callback: (result: DownloadResult) => void,
  ) => () => void;
  onDownloadError: (
    callback: (error: { taskId: string; error: string }) => void,
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// --- Theme Types ---

export type Theme = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";
