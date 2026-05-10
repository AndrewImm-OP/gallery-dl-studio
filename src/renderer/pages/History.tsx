import React, { useEffect, useCallback } from 'react';
import { Clock, Search, Trash2, Download, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { useHistoryStore } from '@/stores/historyStore';
import { useFileDialog } from '@/hooks/useIpc';
import './History.css';

export const History: React.FC = () => {
  const {
    entries,
    filter,
    page,
    total,
    totalPages,
    isLoading,
    selectedIds,
    load,
    setFilter,
    setPage,
    deleteEntry,
    deleteSelected,
    clearAll,
    toggleSelect,
    selectAll,
    deselectAll,
  } = useHistoryStore();

  const { openPath } = useFileDialog();
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilter({ search: e.target.value });
    },
    [setFilter]
  );

  const handleStatusFilter = useCallback(
    (value: string) => {
      setFilter({ status: value === 'all' ? undefined : (value as 'completed' | 'failed' | 'cancelled') });
    },
    [setFilter]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      setFilter({ sortBy: value as 'date' | 'site' | 'title' | 'size' });
    },
    [setFilter]
  );

  const statusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success' as const;
      case 'failed':
        return 'error' as const;
      case 'cancelled':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <div className="history-page">
      {/* Header */}
      <div className="history-page__header">
        <div className="history-page__header-left">
          <h1 className="history-page__title">
            <Clock size={24} />
            History
          </h1>
          <p className="history-page__subtitle">
            {total} total downloads
          </p>
        </div>
        <div className="history-page__header-actions">
          {selectedIds.size > 0 && (
            <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={deleteSelected}>
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setShowClearConfirm(true)}>
            Clear All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="history-page__filters">
        <div className="history-page__search">
          <Input
            placeholder="Search downloads..."
            leftIcon={<Search size={16} />}
            value={filter.search ?? ''}
            onChange={handleSearch}
          />
        </div>
        <div className="history-page__filter-select">
          <Select
            label="Status"
            options={[
              { label: 'All', value: 'all' },
              { label: 'Completed', value: 'completed' },
              { label: 'Failed', value: 'failed' },
              { label: 'Cancelled', value: 'cancelled' },
            ]}
            value={filter.status ?? 'all'}
            onChange={handleStatusFilter}
          />
        </div>
        <div className="history-page__sort-select">
          <Select
            label="Sort by"
            options={[
              { label: 'Date', value: 'date' },
              { label: 'Site', value: 'site' },
              { label: 'Title', value: 'title' },
              { label: 'Size', value: 'size' },
            ]}
            value={filter.sortBy ?? 'date'}
            onChange={handleSortChange}
          />
        </div>
      </div>

      {/* History list */}
      <div className="history-page__list">
        {/* Select all row */}
        {entries.length > 0 && (
          <div className="history-page__select-all">
            <input
              type="checkbox"
              checked={selectedIds.size === entries.length && entries.length > 0}
              onChange={() => (selectedIds.size === entries.length ? deselectAll() : selectAll())}
            />
            <span>Select all</span>
          </div>
        )}

        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`history-page__entry${selectedIds.has(entry.id) ? ' history-page__entry--selected' : ''}`}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(entry.id)}
              onChange={() => toggleSelect(entry.id)}
            />

            {entry.thumbnail && (
              <img
                src={entry.thumbnail}
                alt=""
                className="history-page__entry-thumbnail"
              />
            )}

            <div className="history-page__entry-info">
              <div className="history-page__entry-title">
                {entry.title || entry.url}
              </div>
              <div className="history-page__entry-meta">
                {entry.site} - {entry.filesDownloaded} files - {entry.totalSize}
              </div>
              <div className="history-page__entry-date">
                {format(new Date(entry.completedAt), 'MMM d, yyyy h:mm a')}
              </div>
            </div>

            <Badge variant={statusVariant(entry.status)}>
              {entry.status}
            </Badge>

            <div className="history-page__entry-actions">
              <Button variant="ghost" size="sm" icon={<FolderOpen size={14} />} onClick={() => openPath(entry.outputDir)} />
              <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => window.electronAPI.downloadStart(entry.url)} />
              <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => deleteEntry(entry.id)} />
            </div>
          </div>
        ))}

        {entries.length === 0 && !isLoading && (
          <div className="history-page__empty">
            <Clock size={48} strokeWidth={1.5} className="history-page__empty-icon" />
            <p className="history-page__empty-text">No download history yet</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="history-page__pagination">
          <Button
            variant="ghost"
            size="sm"
            icon={<ChevronLeft size={14} />}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          />
          <span className="history-page__pagination-text">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={<ChevronRight size={14} />}
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          />
        </div>
      )}

      {/* Clear confirmation modal */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear All History"
        width={400}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>
            Are you sure you want to clear all download history? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearAll();
                setShowClearConfirm(false);
              }}
            >
              Clear All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
