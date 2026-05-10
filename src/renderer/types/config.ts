import type { GalleryDlConfig, AppConfig, ExtractorConfig, DownloaderConfig, OutputConfig, PostprocessorConfig } from '@shared/types';

export type { GalleryDlConfig, AppConfig, ExtractorConfig, DownloaderConfig, OutputConfig, PostprocessorConfig };

export type ConfigTab = 'extractor' | 'downloader' | 'output' | 'postprocessor' | 'raw';

export interface ConfigSection {
  id: ConfigTab;
  label: string;
  description: string;
  icon: string;
}

export interface ConfigField {
  key: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'path' | 'json';
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface ConfigChangeEvent {
  section: string;
  key: string;
  value: unknown;
  previousValue: unknown;
}
