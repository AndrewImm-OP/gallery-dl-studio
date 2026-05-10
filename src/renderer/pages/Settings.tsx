import React, { useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, FolderOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { useConfigStore } from '@/stores/configStore';
import { useTheme } from '@/hooks/useTheme';
import { useFileDialog, useGalleryDlCheck, useYtDlpCheck } from '@/hooks/useIpc';
import './Settings.css';

export const Settings: React.FC = () => {
  const { appConfig, loadAppConfig, saveAppConfig, updateAppConfig } = useConfigStore();
  const { theme, setTheme } = useTheme();
  const { selectDirectory } = useFileDialog();
  const galleryDlCheck = useGalleryDlCheck();
  const ytDlpCheck = useYtDlpCheck();

  useEffect(() => {
    loadAppConfig();
    galleryDlCheck.execute();
    ytDlpCheck.execute();
  }, [loadAppConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectOutputDir = useCallback(async () => {
    const dir = await selectDirectory();
    if (dir) {
      updateAppConfig('defaultOutputDir', dir);
    }
  }, [selectDirectory, updateAppConfig]);

  const handleSave = useCallback(() => {
    if (appConfig) {
      saveAppConfig(appConfig);
    }
  }, [appConfig, saveAppConfig]);

  if (!appConfig) {
    return (
      <div className="settings-page__loading">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-page__header">
        <div className="settings-page__header-left">
          <h1 className="settings-page__title">
            <SettingsIcon size={24} />
            Settings
          </h1>
          <p className="settings-page__subtitle">
            Application settings and preferences
          </p>
        </div>
        <Button variant="primary" onClick={handleSave}>
          Save Settings
        </Button>
      </div>

      <div className="settings-page__content">
        {/* gallery-dl Status */}
        <section className="settings-page__section">
          <h2 className="settings-page__section-title">gallery-dl</h2>
          <div className="settings-page__card">
            {/* Status */}
            <div className="settings-page__status">
              {galleryDlCheck.data?.installed ? (
                <>
                  <CheckCircle2 size={18} className="settings-page__status-icon settings-page__status-icon--ok" />
                  <span className="settings-page__status-text settings-page__status-text--ok">
                    gallery-dl found (v{galleryDlCheck.data.version})
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={18} className="settings-page__status-icon settings-page__status-icon--error" />
                  <span className="settings-page__status-text settings-page__status-text--error">
                    gallery-dl not found
                  </span>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={() => galleryDlCheck.execute()} loading={galleryDlCheck.isLoading}>
                Check
              </Button>
            </div>

            <Input
              label="gallery-dl Path"
              value={appConfig.galleryDlPath}
              onChange={(e) => updateAppConfig('galleryDlPath', e.target.value)}
              helperText="Path to the gallery-dl executable. Use 'gallery-dl' if it's in your PATH."
            />
          </div>
        </section>

        {/* yt-dlp Status */}
        <section className="settings-page__section">
          <h2 className="settings-page__section-title">yt-dlp</h2>
          <div className="settings-page__card">
            <div className="settings-page__status">
              {ytDlpCheck.data?.installed ? (
                <>
                  <CheckCircle2 size={18} className="settings-page__status-icon settings-page__status-icon--ok" />
                  <span className="settings-page__status-text settings-page__status-text--ok">
                    yt-dlp found (v{ytDlpCheck.data.version})
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={18} className="settings-page__status-icon settings-page__status-icon--error" />
                  <span className="settings-page__status-text settings-page__status-text--error">
                    yt-dlp not found — video downloads unavailable
                  </span>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={() => ytDlpCheck.execute()} loading={ytDlpCheck.isLoading}>
                Check
              </Button>
            </div>

            <Input
              label="yt-dlp Path"
              value={appConfig.ytDlpPath}
              onChange={(e) => updateAppConfig('ytDlpPath', e.target.value)}
              helperText="Path to the yt-dlp executable. Use 'yt-dlp' if it's in your PATH."
            />
          </div>
        </section>

        {/* Downloads */}
        <section className="settings-page__section">
          <h2 className="settings-page__section-title">Downloads</h2>
          <div className="settings-page__card">
            <div className="settings-page__path-row">
              <div className="settings-page__path-input">
                <Input
                  label="Default Output Directory"
                  value={appConfig.defaultOutputDir}
                  onChange={(e) => updateAppConfig('defaultOutputDir', e.target.value)}
                  helperText="Where downloaded files are saved by default"
                />
              </div>
              <Button
                variant="secondary"
                icon={<FolderOpen size={16} />}
                onClick={handleSelectOutputDir}
                className="settings-page__path-browse"
              >
                Browse
              </Button>
            </div>

            <Input
              label="Max Concurrent Downloads"
              type="number"
              value={String(appConfig.maxConcurrentDownloads)}
              onChange={(e) => updateAppConfig('maxConcurrentDownloads', parseInt(e.target.value, 10) || 1)}
              helperText="Maximum number of simultaneous downloads (1-10)"
            />
          </div>
        </section>

        {/* Appearance */}
        <section className="settings-page__section">
          <h2 className="settings-page__section-title">Appearance</h2>
          <div className="settings-page__card">
            <Select
              label="Theme"
              options={[
                { label: 'System', value: 'system' },
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
              value={theme}
              onChange={(v) => {
                setTheme(v as 'light' | 'dark' | 'system');
                updateAppConfig('theme', v as 'light' | 'dark' | 'system');
              }}
              helperText="Choose between light, dark, or system theme"
            />
          </div>
        </section>

        {/* Deduplication */}
        <section className="settings-page__section">
          <h2 className="settings-page__section-title">Deduplication</h2>
          <div className="settings-page__card">
            <div className="settings-page__toggle-row">
              <div className="settings-page__toggle-info">
                <div className="settings-page__toggle-label">Enable deduplication</div>
                <div className="settings-page__toggle-desc">
                  Master switch. When off, dedup never runs anywhere.
                </div>
              </div>
              <input
                type="checkbox"
                checked={appConfig.dedup.enabled}
                onChange={(e) =>
                  updateAppConfig('dedup', { ...appConfig.dedup, enabled: e.target.checked })
                }
              />
            </div>

            <div className="settings-page__toggle-row">
              <div className="settings-page__toggle-info">
                <div className="settings-page__toggle-label">Auto-run after each download</div>
                <div className="settings-page__toggle-desc">
                  Scan a task's output folder right after it finishes. Requires the master switch.
                </div>
              </div>
              <input
                type="checkbox"
                checked={appConfig.dedup.autoAfterTask}
                disabled={!appConfig.dedup.enabled}
                onChange={(e) =>
                  updateAppConfig('dedup', {
                    ...appConfig.dedup,
                    autoAfterTask: e.target.checked,
                  })
                }
              />
            </div>

            <Input
              label="pHash threshold (0 = exact-match only, hardcore)"
              type="number"
              min="0"
              max="15"
              value={String(appConfig.dedup.phashThreshold)}
              onChange={(e) =>
                updateAppConfig('dedup', {
                  ...appConfig.dedup,
                  phashThreshold: Math.max(0, Math.min(15, parseInt(e.target.value, 10) || 0)),
                })
              }
              helperText="0 only removes byte-identical duplicates (safe for art variations). Raise to 3–5 to also catch recompressions."
            />

            <Input
              label="Duplicates folder"
              value={appConfig.dedup.duplicatesFolder}
              onChange={(e) =>
                updateAppConfig('dedup', {
                  ...appConfig.dedup,
                  duplicatesFolder: e.target.value,
                })
              }
              helperText="Relative path inside each scanned directory."
            />

            <div className="settings-page__toggle-row">
              <div className="settings-page__toggle-info">
                <div className="settings-page__toggle-label">Dry run</div>
                <div className="settings-page__toggle-desc">
                  Generate a report but don't move any files.
                </div>
              </div>
              <input
                type="checkbox"
                checked={appConfig.dedup.dryRun}
                onChange={(e) =>
                  updateAppConfig('dedup', { ...appConfig.dedup, dryRun: e.target.checked })
                }
              />
            </div>
          </div>
        </section>

        {/* Behavior */}
        <section className="settings-page__section">
          <h2 className="settings-page__section-title">Behavior</h2>
          <div className="settings-page__card">
            <div className="settings-page__toggle-row">
              <div className="settings-page__toggle-info">
                <div className="settings-page__toggle-label">Notifications</div>
                <div className="settings-page__toggle-desc">
                  Show notifications when downloads complete
                </div>
              </div>
              <input
                type="checkbox"
                checked={appConfig.notifications}
                onChange={(e) => updateAppConfig('notifications', e.target.checked)}
              />
            </div>

            <div className="settings-page__toggle-row">
              <div className="settings-page__toggle-info">
                <div className="settings-page__toggle-label">Minimize to Tray</div>
                <div className="settings-page__toggle-desc">
                  Keep running in the system tray when window is closed
                </div>
              </div>
              <input
                type="checkbox"
                checked={appConfig.minimizeToTray}
                onChange={(e) => updateAppConfig('minimizeToTray', e.target.checked)}
              />
            </div>

            <div className="settings-page__toggle-row">
              <div className="settings-page__toggle-info">
                <div className="settings-page__toggle-label">Check for Updates</div>
                <div className="settings-page__toggle-desc">
                  Automatically check for new versions on startup
                </div>
              </div>
              <input
                type="checkbox"
                checked={appConfig.checkUpdates}
                onChange={(e) => updateAppConfig('checkUpdates', e.target.checked)}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
