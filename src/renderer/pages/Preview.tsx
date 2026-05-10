import React, { useState, useCallback } from 'react';
import { Eye, Search, Image, Video, Music, Archive, File, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import type { PreviewResult, PreviewItem } from '@shared/types';
import './Preview.css';

const typeIcons: Record<PreviewItem['type'], React.ReactNode> = {
  image: <Image size={16} />,
  video: <Video size={16} />,
  audio: <Music size={16} />,
  archive: <Archive size={16} />,
  other: <File size={16} />,
};

export const Preview: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    try {
      setIsScanning(true);
      setError(null);
      setResult(null);
      const preview = await window.electronAPI.previewScan(trimmed);
      setResult(preview);
      if (preview.error) {
        setError(preview.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan URL');
    } finally {
      setIsScanning(false);
    }
  }, [url]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan();
    }
  };

  const handleDownload = useCallback(async () => {
    if (!url.trim()) return;
    await window.electronAPI.downloadStart(url.trim());
  }, [url]);

  return (
    <div className="preview-page">
      {/* Header */}
      <div className="preview-page__header">
        <h1 className="preview-page__title">
          <Eye size={24} />
          Preview
        </h1>
        <p className="preview-page__subtitle">
          Scan a URL to preview what would be downloaded before starting
        </p>
      </div>

      {/* URL input */}
      <div className="preview-page__input-row">
        <div className="preview-page__input-wrapper">
          <Search size={18} className="preview-page__input-icon" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter URL to scan..."
            className="preview-page__input"
          />
        </div>
        <Button
          variant="primary"
          onClick={handleScan}
          loading={isScanning}
          className="preview-page__scan-btn"
        >
          Scan
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="preview-page__error">
          {error}
        </div>
      )}

      {/* Loading */}
      {isScanning && (
        <div className="preview-page__loading">
          <Loader2 size={20} className="preview-page__loading-spinner" />
          <span>Scanning URL...</span>
        </div>
      )}

      {/* Results */}
      {result && !isScanning && (
        <div className="preview-page__results">
          {/* Summary */}
          <div className="preview-page__summary">
            <div>
              <div className="preview-page__summary-title">
                {result.title || result.site}
              </div>
              <div className="preview-page__summary-meta">
                {result.site} - {result.itemCount} items found
              </div>
            </div>
            <Button variant="primary" onClick={handleDownload}>
              Download All
            </Button>
          </div>

          {/* Items list */}
          <div className="preview-page__items">
            <AnimatePresence>
              {result.items.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="preview-page__item"
                >
                  <span className="preview-page__item-icon">
                    {typeIcons[item.type]}
                  </span>
                  <span className="preview-page__item-name">
                    {item.filename}
                  </span>
                  {item.size && (
                    <Badge variant="default" size="sm">
                      {item.size}
                    </Badge>
                  )}
                  <Badge variant="info" size="sm">
                    {item.type}
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !isScanning && !error && (
        <div className="preview-page__empty">
          <Eye size={48} strokeWidth={1.5} className="preview-page__empty-icon" />
          <p className="preview-page__empty-text">
            Enter a URL above to preview downloadable content
          </p>
        </div>
      )}
    </div>
  );
};
