import { app } from 'electron';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import type { GalleryDlConfig, AppConfig, DedupConfig } from '../../shared/types';

const DEFAULT_DEDUP_CONFIG: DedupConfig = {
  enabled: false,
  autoAfterTask: false,
  // "Hardcore" default: only true SHA256 duplicates are touched.
  // Users opt into perceptual matching by raising the threshold in the UI.
  phashThreshold: 0,
  maxResolutionRatio: 0,
  duplicatesFolder: '.duplicates',
  dryRun: false,
  extensions: [],
};

const DEFAULT_APP_CONFIG: AppConfig = {
  galleryDlPath: 'gallery-dl',
  ytDlpPath: 'yt-dlp',
  defaultOutputDir: '',
  maxConcurrentDownloads: 3,
  theme: 'system',
  notifications: true,
  autoStart: false,
  minimizeToTray: false,
  language: 'en',
  checkUpdates: true,
  dedup: DEFAULT_DEDUP_CONFIG,
};

const DEFAULT_GALLERY_DL_CONFIG: GalleryDlConfig = {
  extractor: {
    base_directory: './gallery-dl/',
    archive: '~/.gallery-dl/archive.sqlite3',
    retries: 4,
    timeout: 30,
    sleep: 0,
    sleep_request: 0,
  },
  downloader: {
    retries: 4,
    timeout: 30,
    part: true,
  },
  output: {
    mode: 'terminal',
    progress: true,
    shorten: true,
  },
};

export class ConfigService {
  private configDir: string;
  private appConfigPath: string;
  private galleryDlConfigPath: string;

  constructor() {
    this.configDir = join(app.getPath('userData'), 'config');
    this.appConfigPath = join(this.configDir, 'app-config.json');
    this.galleryDlConfigPath = join(this.configDir, 'gallery-dl.json');

    this.ensureConfigDir();
  }

  private ensureConfigDir(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
  }

  // --- App Config ---

  loadAppConfig(): AppConfig {
    try {
      if (existsSync(this.appConfigPath)) {
        const data = readFileSync(this.appConfigPath, 'utf-8');
        const loaded = JSON.parse(data) as Partial<AppConfig>;
        // Deep-merge dedup so older configs (without `dedup` field) get
        // a complete object, not undefined.
        return {
          ...DEFAULT_APP_CONFIG,
          ...loaded,
          dedup: { ...DEFAULT_DEDUP_CONFIG, ...(loaded.dedup ?? {}) },
        };
      }
    } catch (error) {
      console.error('Failed to load app config:', error);
    }

    // Initialize with defaults if no output dir set
    const config = {
      ...DEFAULT_APP_CONFIG,
      defaultOutputDir: join(app.getPath('downloads'), 'gallery-dl'),
    };
    this.saveAppConfig(config);
    return config;
  }

  saveAppConfig(config: AppConfig): void {
    try {
      writeFileSync(this.appConfigPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save app config:', error);
      throw error;
    }
  }

  // --- Gallery-DL Config ---

  loadGalleryDlConfig(): GalleryDlConfig {
    try {
      if (existsSync(this.galleryDlConfigPath)) {
        const data = readFileSync(this.galleryDlConfigPath, 'utf-8');
        return JSON.parse(data) as GalleryDlConfig;
      }
    } catch (error) {
      console.error('Failed to load gallery-dl config:', error);
    }

    this.saveGalleryDlConfig(DEFAULT_GALLERY_DL_CONFIG);
    return { ...DEFAULT_GALLERY_DL_CONFIG };
  }

  saveGalleryDlConfig(config: GalleryDlConfig): void {
    try {
      writeFileSync(this.galleryDlConfigPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save gallery-dl config:', error);
      throw error;
    }
  }

  resetGalleryDlConfig(): GalleryDlConfig {
    this.saveGalleryDlConfig(DEFAULT_GALLERY_DL_CONFIG);
    return { ...DEFAULT_GALLERY_DL_CONFIG };
  }

  exportConfig(filePath: string): void {
    const config = this.loadGalleryDlConfig();
    writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
  }

  importConfig(filePath: string): GalleryDlConfig {
    const data = readFileSync(filePath, 'utf-8');
    const config = JSON.parse(data) as GalleryDlConfig;
    this.saveGalleryDlConfig(config);
    return config;
  }

  getConfigPath(): string {
    return this.galleryDlConfigPath;
  }

  backupConfig(): string {
    const backupPath = `${this.galleryDlConfigPath}.backup-${Date.now()}`;
    if (existsSync(this.galleryDlConfigPath)) {
      copyFileSync(this.galleryDlConfigPath, backupPath);
    }
    return backupPath;
  }
}
