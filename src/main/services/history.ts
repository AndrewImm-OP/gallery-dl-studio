import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'fs';
import { randomBytes } from 'crypto';
import type { HistoryEntry, HistoryFilter, PaginatedResult } from '../../shared/types';

/**
 * JSON-file-based history storage.
 *
 * Keeps all entries in memory for fast queries and persists to a JSON file
 * in the app's userData directory. Writes are atomic (write to temp, then rename).
 * Designed for typical usage of < 10,000 entries.
 */
export class HistoryService {
  private entries: HistoryEntry[] = [];
  private filePath: string;
  private dirty = false;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly FLUSH_INTERVAL_MS = 1000;

  constructor() {
    const dataDir = join(app.getPath('userData'), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.filePath = join(dataDir, 'history.json');
    this.loadFromDisk();
  }

  // ── Public API (same interface as the old SQLite-backed service) ──

  add(entry: HistoryEntry): void {
    // Avoid duplicates by id
    const idx = this.entries.findIndex((e) => e.id === entry.id);
    if (idx !== -1) {
      this.entries[idx] = entry;
    } else {
      this.entries.push(entry);
    }
    this.scheduleSave();
  }

  get(id: string): HistoryEntry | null {
    return this.entries.find((e) => e.id === id) ?? null;
  }

  list(
    filter: HistoryFilter,
    page: number = 1,
    pageSize: number = 20,
  ): PaginatedResult<HistoryEntry> {
    let result = this.entries;

    // --- Filtering ---

    if (filter.search) {
      const term = filter.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(term) ||
          e.url.toLowerCase().includes(term) ||
          e.site.toLowerCase().includes(term),
      );
    }

    if (filter.site) {
      result = result.filter((e) => e.site === filter.site);
    }

    if (filter.status) {
      result = result.filter((e) => e.status === filter.status);
    }

    if (filter.dateFrom) {
      result = result.filter((e) => e.completedAt >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      result = result.filter((e) => e.completedAt <= filter.dateTo!);
    }

    // --- Sorting ---

    const sortKey = this.getSortKey(filter.sortBy ?? 'date');
    const order = filter.sortOrder === 'asc' ? 1 : -1;

    result = [...result].sort((a, b) => {
      const va = a[sortKey] as string | number;
      const vb = b[sortKey] as string | number;
      if (va < vb) return -1 * order;
      if (va > vb) return 1 * order;
      return 0;
    });

    // --- Pagination ---

    const total = result.length;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const items = result.slice(offset, offset + pageSize);

    return { items, total, page, pageSize, totalPages };
  }

  delete(id: string): void {
    this.entries = this.entries.filter((e) => e.id !== id);
    this.scheduleSave();
  }

  clear(): void {
    this.entries = [];
    this.scheduleSave();
  }

  getSites(): string[] {
    const sites = new Set(this.entries.map((e) => e.site));
    return [...sites].sort();
  }

  getStats(): { totalDownloads: number; totalFiles: number; totalSize: string } {
    const totalDownloads = this.entries.length;
    const totalFiles = this.entries.reduce((sum, e) => sum + e.filesDownloaded, 0);
    return {
      totalDownloads,
      totalFiles,
      totalSize: '0', // TODO: aggregate from totalSize column
    };
  }

  /** Flush pending writes and release resources. */
  close(): void {
    this.flushSync();
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
  }

  // ── Private helpers ──

  private loadFromDisk(): void {
    if (!existsSync(this.filePath)) {
      this.entries = [];
      return;
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.entries = parsed;
      } else {
        this.entries = [];
      }
    } catch {
      // Corrupted file — start fresh but keep a backup
      try {
        const backup = this.filePath + '.bak';
        if (existsSync(this.filePath)) {
          renameSync(this.filePath, backup);
        }
      } catch {
        // ignore backup failure
      }
      this.entries = [];
    }
  }

  /** Schedule a debounced write to avoid thrashing on rapid add() calls. */
  private scheduleSave(): void {
    this.dirty = true;
    if (this.writeTimer) return;
    this.writeTimer = setTimeout(() => {
      this.flushSync();
      this.writeTimer = null;
    }, HistoryService.FLUSH_INTERVAL_MS);
  }

  /** Atomic write: write to a temp file, then rename over the target. */
  private flushSync(): void {
    if (!this.dirty) return;

    const tmpPath = this.filePath + '.' + randomBytes(6).toString('hex') + '.tmp';
    try {
      writeFileSync(tmpPath, JSON.stringify(this.entries, null, 2), 'utf-8');
      renameSync(tmpPath, this.filePath);
      this.dirty = false;
    } catch (err) {
      // Clean up temp file on failure
      try {
        if (existsSync(tmpPath)) unlinkSync(tmpPath);
      } catch {
        // ignore
      }
      console.error('[HistoryService] Failed to persist history:', err);
    }
  }

  private getSortKey(sortBy: string): keyof HistoryEntry {
    switch (sortBy) {
      case 'date':
        return 'completedAt';
      case 'site':
        return 'site';
      case 'title':
        return 'title';
      case 'size':
        return 'totalSize';
      default:
        return 'completedAt';
    }
  }
}
