import type { HistoryEntry, HistoryFilter, PaginatedResult } from '@shared/types';

export type { HistoryEntry, HistoryFilter, PaginatedResult };

export interface HistoryState {
  entries: HistoryEntry[];
  filter: HistoryFilter;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  selectedEntries: Set<string>;
}

export interface HistoryActions {
  load: () => Promise<void>;
  setFilter: (filter: Partial<HistoryFilter>) => void;
  setPage: (page: number) => void;
  deleteEntry: (id: string) => Promise<void>;
  deleteSelected: () => Promise<void>;
  clearAll: () => Promise<void>;
  selectEntry: (id: string) => void;
  deselectEntry: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelection: (id: string) => void;
}

export interface HistoryStats {
  totalDownloads: number;
  totalFiles: number;
  totalSize: string;
  siteCounts: Record<string, number>;
}
