import { create } from 'zustand';
import type { Theme, ResolvedTheme } from '@shared/types';

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

function applyTheme(resolvedTheme: ResolvedTheme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolvedTheme);
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
}

function loadStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('gallery-dl-studio-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage might not be available
  }
  return 'system';
}

function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem('gallery-dl-studio-theme', theme);
  } catch {
    // localStorage might not be available
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: loadStoredTheme(),
  resolvedTheme: resolveTheme(loadStoredTheme()),

  setTheme: (theme) => {
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
    saveTheme(theme);
    set({ theme, resolvedTheme: resolved });
  },

  toggleTheme: () => {
    const { resolvedTheme } = get();
    const newTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    get().setTheme(newTheme);
  },

  initializeTheme: () => {
    const { theme } = get();
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
    set({ resolvedTheme: resolved });

    // Listen for system theme changes
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        const currentTheme = get().theme;
        if (currentTheme === 'system') {
          const newResolved = getSystemTheme();
          applyTheme(newResolved);
          set({ resolvedTheme: newResolved });
        }
      });
    }
  },
}));
