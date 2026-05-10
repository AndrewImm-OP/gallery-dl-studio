import { create } from 'zustand';
import type { GalleryDlConfig, AppConfig } from '@shared/types';

interface ConfigState {
  galleryDlConfig: GalleryDlConfig | null;
  appConfig: AppConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error: string | null;

  // Gallery-DL Config Actions
  loadGalleryDlConfig: () => Promise<void>;
  saveGalleryDlConfig: (config: GalleryDlConfig) => Promise<void>;
  resetGalleryDlConfig: () => Promise<void>;
  exportConfig: () => Promise<string | null>;
  importConfig: () => Promise<void>;
  updateGalleryDlConfig: (path: string, value: unknown) => void;

  // App Config Actions
  loadAppConfig: () => Promise<void>;
  saveAppConfig: (config: AppConfig) => Promise<void>;
  updateAppConfig: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;

  // Utility
  setDirty: (dirty: boolean) => void;
  clearError: () => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  galleryDlConfig: null,
  appConfig: null,
  isLoading: false,
  isSaving: false,
  isDirty: false,
  error: null,

  loadGalleryDlConfig: async () => {
    try {
      set({ isLoading: true, error: null });
      const config = await window.electronAPI.configLoad();
      set({ galleryDlConfig: config, isLoading: false, isDirty: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load config',
      });
    }
  },

  saveGalleryDlConfig: async (config) => {
    try {
      set({ isSaving: true, error: null });
      await window.electronAPI.configSave(config);
      set({ galleryDlConfig: config, isSaving: false, isDirty: false });
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to save config',
      });
    }
  },

  resetGalleryDlConfig: async () => {
    try {
      set({ isLoading: true, error: null });
      const config = await window.electronAPI.configReset();
      set({ galleryDlConfig: config, isLoading: false, isDirty: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to reset config',
      });
    }
  },

  exportConfig: async () => {
    try {
      return await window.electronAPI.configExport();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to export config' });
      return null;
    }
  },

  importConfig: async () => {
    try {
      set({ isLoading: true, error: null });
      const config = await window.electronAPI.configImport();
      if (config) {
        set({ galleryDlConfig: config, isLoading: false, isDirty: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to import config',
      });
    }
  },

  updateGalleryDlConfig: (path, value) => {
    const config = get().galleryDlConfig;
    if (!config) return;

    const keys = path.split('.');
    const updated = { ...config };
    let current: Record<string, unknown> = updated;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!;
      current[key] = { ...(current[key] as Record<string, unknown>) };
      current = current[key] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1]!;
    current[lastKey] = value;

    set({ galleryDlConfig: updated, isDirty: true });
  },

  loadAppConfig: async () => {
    try {
      set({ isLoading: true, error: null });
      const config = await window.electronAPI.appConfigLoad();
      set({ appConfig: config, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load app config',
      });
    }
  },

  saveAppConfig: async (config) => {
    try {
      set({ isSaving: true, error: null });
      await window.electronAPI.appConfigSave(config);
      set({ appConfig: config, isSaving: false });
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : 'Failed to save app config',
      });
    }
  },

  updateAppConfig: (key, value) => {
    const config = get().appConfig;
    if (!config) return;
    set({ appConfig: { ...config, [key]: value }, isDirty: true });
  },

  setDirty: (dirty) => set({ isDirty: dirty }),
  clearError: () => set({ error: null }),
}));
