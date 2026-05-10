import React, { useEffect, useState, useCallback } from 'react';
import { FileJson, Save, RotateCcw, Upload, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { useConfigStore } from '@/stores/configStore';
import type { ConfigTab } from '@/types/config';
import './Config.css';

const configTabs: { key: ConfigTab; label: string; description: string }[] = [
  { key: 'extractor', label: 'Extractor', description: 'Configure site-specific extraction settings' },
  { key: 'downloader', label: 'Downloader', description: 'Download behavior, retries, and timeouts' },
  { key: 'output', label: 'Output', description: 'Output format and logging settings' },
  { key: 'postprocessor', label: 'Post-Processor', description: 'Configure post-processing actions' },
  { key: 'raw', label: 'Raw JSON', description: 'Edit the raw gallery-dl config JSON' },
];

export const Config: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('extractor');
  const {
    galleryDlConfig,
    isLoading,
    isSaving,
    isDirty,
    error,
    loadGalleryDlConfig,
    saveGalleryDlConfig,
    resetGalleryDlConfig,
    exportConfig,
    importConfig,
    updateGalleryDlConfig,
    clearError,
  } = useConfigStore();

  const [rawJson, setRawJson] = useState('');

  useEffect(() => {
    loadGalleryDlConfig();
  }, [loadGalleryDlConfig]);

  useEffect(() => {
    if (galleryDlConfig) {
      setRawJson(JSON.stringify(galleryDlConfig, null, 2));
    }
  }, [galleryDlConfig]);

  const handleSave = useCallback(() => {
    if (!galleryDlConfig) return;
    if (activeTab === 'raw') {
      try {
        const parsed = JSON.parse(rawJson);
        saveGalleryDlConfig(parsed);
      } catch {
        // JSON parse error handled by textarea validation
      }
    } else {
      saveGalleryDlConfig(galleryDlConfig);
    }
  }, [galleryDlConfig, activeTab, rawJson, saveGalleryDlConfig]);

  const renderExtractorTab = () => {
    const extractor = galleryDlConfig?.extractor ?? {};
    return (
      <div className="config-page__form">
        <Input
          label="Base Directory"
          value={String(extractor.base_directory ?? '')}
          onChange={(e) => updateGalleryDlConfig('extractor.base_directory', e.target.value)}
          helperText="Root directory for downloaded files"
        />
        <Input
          label="Archive Path"
          value={String(extractor.archive ?? '')}
          onChange={(e) => updateGalleryDlConfig('extractor.archive', e.target.value)}
          helperText="Path to the SQLite archive database"
        />
        <Input
          label="Cookies"
          value={String(extractor.cookies ?? '')}
          onChange={(e) => updateGalleryDlConfig('extractor.cookies', e.target.value)}
          helperText="Path to cookies file or browser name (e.g., firefox, chrome)"
        />
        <Input
          label="Proxy"
          value={String(extractor.proxy ?? '')}
          onChange={(e) => updateGalleryDlConfig('extractor.proxy', e.target.value)}
          helperText="HTTP/SOCKS proxy URL"
        />
        <Input
          label="User Agent"
          value={String(extractor.user_agent ?? '')}
          onChange={(e) => updateGalleryDlConfig('extractor.user_agent', e.target.value)}
          helperText="Custom User-Agent header"
        />
        <Input
          label="Retries"
          type="number"
          value={String(extractor.retries ?? 4)}
          onChange={(e) => updateGalleryDlConfig('extractor.retries', parseInt(e.target.value, 10))}
          helperText="Number of retry attempts for failed requests"
        />
        <Input
          label="Timeout (seconds)"
          type="number"
          value={String(extractor.timeout ?? 30)}
          onChange={(e) => updateGalleryDlConfig('extractor.timeout', parseInt(e.target.value, 10))}
          helperText="Connection timeout in seconds"
        />
        <Input
          label="Sleep (seconds)"
          type="number"
          value={String(extractor.sleep ?? 0)}
          onChange={(e) => updateGalleryDlConfig('extractor.sleep', parseFloat(e.target.value))}
          helperText="Wait time between requests"
        />
      </div>
    );
  };

  const renderDownloaderTab = () => {
    const downloader = galleryDlConfig?.downloader ?? {};
    return (
      <div className="config-page__form">
        <Input
          label="Rate Limit"
          value={String(downloader.rate ?? '')}
          onChange={(e) => updateGalleryDlConfig('downloader.rate', e.target.value)}
          helperText="Download speed limit (e.g., 1M, 500K)"
        />
        <Input
          label="Retries"
          type="number"
          value={String(downloader.retries ?? 4)}
          onChange={(e) => updateGalleryDlConfig('downloader.retries', parseInt(e.target.value, 10))}
          helperText="Number of download retry attempts"
        />
        <Input
          label="Timeout (seconds)"
          type="number"
          value={String(downloader.timeout ?? 30)}
          onChange={(e) => updateGalleryDlConfig('downloader.timeout', parseInt(e.target.value, 10))}
          helperText="Download timeout in seconds"
        />
        <Select
          label="Part Files"
          options={[
            { label: 'Enabled', value: 'true' },
            { label: 'Disabled', value: 'false' },
          ]}
          value={String(downloader.part ?? true)}
          onChange={(v) => updateGalleryDlConfig('downloader.part', v === 'true')}
          helperText="Use .part extension for incomplete downloads"
        />
        <Input
          label="Part Directory"
          value={String(downloader.part_directory ?? '')}
          onChange={(e) => updateGalleryDlConfig('downloader.part_directory', e.target.value)}
          helperText="Directory for partial downloads"
        />
      </div>
    );
  };

  const renderOutputTab = () => {
    const output = galleryDlConfig?.output ?? {};
    return (
      <div className="config-page__form">
        <Select
          label="Mode"
          options={[
            { label: 'Terminal', value: 'terminal' },
            { label: 'Pipe', value: 'pipe' },
            { label: 'Null', value: 'null' },
          ]}
          value={String(output.mode ?? 'terminal')}
          onChange={(v) => updateGalleryDlConfig('output.mode', v)}
          helperText="Output mode for gallery-dl"
        />
        <Select
          label="Progress"
          options={[
            { label: 'Enabled', value: 'true' },
            { label: 'Disabled', value: 'false' },
          ]}
          value={String(output.progress ?? true)}
          onChange={(v) => updateGalleryDlConfig('output.progress', v === 'true')}
          helperText="Show download progress"
        />
        <Select
          label="Shorten URLs"
          options={[
            { label: 'Enabled', value: 'true' },
            { label: 'Disabled', value: 'false' },
          ]}
          value={String(output.shorten ?? true)}
          onChange={(v) => updateGalleryDlConfig('output.shorten', v === 'true')}
          helperText="Shorten long URLs in output"
        />
        <Input
          label="Log Level"
          value={String(output.log ?? '')}
          onChange={(e) => updateGalleryDlConfig('output.log', e.target.value)}
          helperText="Logging level (e.g., info, debug, warning)"
        />
        <Input
          label="Log File"
          value={String(output.logfile ?? '')}
          onChange={(e) => updateGalleryDlConfig('output.logfile', e.target.value)}
          helperText="Path to log file"
        />
      </div>
    );
  };

  const renderPostProcessorTab = () => {
    const postprocessors = galleryDlConfig?.postprocessor ?? [];
    return (
      <div className="config-page__form">
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>
          Post-processors run after each download. Configure them in the Raw JSON tab for full control.
        </p>
        {postprocessors.length === 0 && (
          <div className="config-page__loading">
            No post-processors configured
          </div>
        )}
        {postprocessors.map((pp, idx) => (
          <div key={idx} className="config-page__pp-card">
            <div className="config-page__pp-name">
              {pp.name}
            </div>
            <pre className="config-page__pp-config">
              {JSON.stringify(pp, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    );
  };

  const renderRawTab = () => (
    <div className="config-page__form">
      <p className="config-page__json-hint">
        Edit the raw gallery-dl configuration JSON directly. Be careful with syntax.
      </p>
      <textarea
        value={rawJson}
        onChange={(e) => setRawJson(e.target.value)}
        spellCheck={false}
        className="config-page__json-editor"
      />
    </div>
  );

  const tabContent: Record<ConfigTab, () => React.ReactNode> = {
    extractor: renderExtractorTab,
    downloader: renderDownloaderTab,
    output: renderOutputTab,
    postprocessor: renderPostProcessorTab,
    raw: renderRawTab,
  };

  return (
    <div className="config-page">
      {/* Header */}
      <div className="config-page__header">
        <div className="config-page__header-left">
          <h1 className="config-page__title">
            <FileJson size={24} />
            Configuration
          </h1>
          <p className="config-page__subtitle">
            Configure gallery-dl settings and options
          </p>
        </div>
        <div className="config-page__header-actions">
          <Button variant="ghost" size="sm" icon={<Upload size={14} />} onClick={importConfig}>
            Import
          </Button>
          <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={exportConfig}>
            Export
          </Button>
          <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={resetGalleryDlConfig}>
            Reset
          </Button>
          <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={handleSave} loading={isSaving} disabled={!isDirty}>
            Save
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="config-page__error">
          <AlertCircle size={16} className="config-page__error-icon" />
          <span className="config-page__error-text">{error}</span>
          <Button variant="ghost" size="sm" onClick={clearError} className="config-page__error-dismiss">
            Dismiss
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="config-page__tabs">
        {configTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`config-page__tab${activeTab === tab.key ? ' config-page__tab--active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="config-page__content">
        {isLoading ? (
          <div className="config-page__loading">
            Loading configuration...
          </div>
        ) : galleryDlConfig ? (
          tabContent[activeTab]()
        ) : (
          <div className="config-page__failed">
            Failed to load configuration
          </div>
        )}
      </div>
    </div>
  );
};
