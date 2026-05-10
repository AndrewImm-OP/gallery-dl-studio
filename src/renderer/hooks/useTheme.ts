import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import type { Theme, ResolvedTheme } from '@shared/types';

interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

export function useTheme(): UseThemeReturn {
  const { theme, resolvedTheme, setTheme, toggleTheme, initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
}
