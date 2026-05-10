import { create } from 'zustand';
import type { SiteAuth, SiteAuthInfo } from '@shared/types';

interface AuthState {
  entries: SiteAuth[];
  supportedSites: SiteAuthInfo[];
  browsers: string[];
  loading: boolean;

  // Actions
  loadEntries: () => Promise<void>;
  loadSupportedSites: () => Promise<void>;
  loadBrowsers: () => Promise<void>;
  saveEntry: (auth: SiteAuth) => Promise<SiteAuth>;
  deleteEntry: (id: string) => Promise<void>;
  testEntry: (auth: SiteAuth) => Promise<{ success: boolean; message: string }>;
  importCookies: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  entries: [],
  supportedSites: [],
  browsers: [],
  loading: false,

  loadEntries: async () => {
    set({ loading: true });
    try {
      const entries = await window.electronAPI.authList();
      set({ entries });
    } finally {
      set({ loading: false });
    }
  },

  loadSupportedSites: async () => {
    const supportedSites = await window.electronAPI.authGetSupportedSites();
    set({ supportedSites });
  },

  loadBrowsers: async () => {
    const browsers = await window.electronAPI.authListBrowsers();
    set({ browsers });
  },

  saveEntry: async (auth) => {
    const saved = await window.electronAPI.authSave(auth);
    await get().loadEntries();
    return saved;
  },

  deleteEntry: async (id) => {
    await window.electronAPI.authDelete(id);
    await get().loadEntries();
  },

  testEntry: async (auth) => {
    return await window.electronAPI.authTest(auth);
  },

  importCookies: async () => {
    return await window.electronAPI.authImportCookies();
  },
}));
