import { useCallback, useState } from 'react';

interface UseIpcReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Generic hook for IPC calls with loading and error state management.
 */
export function useIpc<T>(
  ipcFn: (...args: unknown[]) => Promise<T>
): UseIpcReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await ipcFn(...args);
        setData(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [ipcFn]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, execute, reset };
}

/**
 * Hook to check if gallery-dl is installed and available.
 */
export function useGalleryDlCheck() {
  return useIpc<{ installed: boolean; version?: string; path?: string }>(
    window.electronAPI.checkGalleryDl
  );
}

/**
 * Hook to check if yt-dlp is installed and available.
 */
export function useYtDlpCheck() {
  return useIpc<{ installed: boolean; version?: string; path?: string }>(
    window.electronAPI.checkYtDlp
  );
}

/**
 * Hook for file/directory selection dialogs.
 */
export function useFileDialog() {
  const selectDirectory = useCallback(async (): Promise<string | null> => {
    return window.electronAPI.selectDirectory();
  }, []);

  const selectFile = useCallback(
    async (filters?: { name: string; extensions: string[] }[]): Promise<string | null> => {
      return window.electronAPI.selectFile(filters);
    },
    []
  );

  const openPath = useCallback(async (path: string): Promise<void> => {
    return window.electronAPI.openPath(path);
  }, []);

  return { selectDirectory, selectFile, openPath };
}
