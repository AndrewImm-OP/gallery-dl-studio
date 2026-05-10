import { create } from 'zustand';
import type { HistoryEntry, HistoryFilter, PaginatedResult } from '@shared/types';

interface HistoryState {
  entries: HistoryEntry[];
  filter: HistoryFilter;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  selectedIds: Set<string>;

  // Actions
  load: () => Promise<void>;
  setFilter: (filter: Partial<HistoryFilter>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  deleteEntry: (id: string) => Promise<void>;
  deleteSelected: () => Promise<void>;
  clearAll: () => Promise<void>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  clearError: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  filter: {
    sortBy: 'date',
    sortOrder: 'desc',
  },
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  isLoading: false,
  error: null,
  selectedIds: new Set(),

  load: async () => {
    try {
      set({ isLoading: true, error: null });
      const { filter, page, pageSize } = get();
      const result: PaginatedResult<HistoryEntry> = await window.electronAPI.historyList(filter, page, pageSize);
      set({
        entries: result.items,
        total: result.total,
        totalPages: result.totalPages,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load history',
      });
    }
  },

  setFilter: (newFilter) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
      page: 1, // Reset to first page on filter change
    }));
    get().load();
  },

  setPage: (page) => {
    set({ page });
    get().load();
  },

  setPageSize: (pageSize) => {
    set({ pageSize, page: 1 });
    get().load();
  },

  deleteEntry: async (id) => {
    try {
      await window.electronAPI.historyDelete(id);
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
        total: state.total - 1,
        selectedIds: (() => {
          const s = new Set(state.selectedIds);
          s.delete(id);
          return s;
        })(),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete entry' });
    }
  },

  deleteSelected: async () => {
    const { selectedIds } = get();
    try {
      for (const id of selectedIds) {
        await window.electronAPI.historyDelete(id);
      }
      set((state) => ({
        entries: state.entries.filter((e) => !selectedIds.has(e.id)),
        total: state.total - selectedIds.size,
        selectedIds: new Set(),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete entries' });
    }
  },

  clearAll: async () => {
    try {
      await window.electronAPI.historyClear();
      set({ entries: [], total: 0, totalPages: 0, selectedIds: new Set() });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to clear history' });
    }
  },

  toggleSelect: (id) => {
    set((state) => {
      const selectedIds = new Set(state.selectedIds);
      if (selectedIds.has(id)) {
        selectedIds.delete(id);
      } else {
        selectedIds.add(id);
      }
      return { selectedIds };
    });
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: new Set(state.entries.map((e) => e.id)),
    }));
  },

  deselectAll: () => {
    set({ selectedIds: new Set() });
  },

  clearError: () => set({ error: null }),
}));
