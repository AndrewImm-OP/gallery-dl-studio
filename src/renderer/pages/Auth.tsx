import React, { useEffect, useState, useCallback } from 'react';
import { KeyRound, Plus, Pencil, Trash2, FolderOpen, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/common/Badge';
import { useAuthStore } from '@/stores/authStore';
import type { SiteAuth, AuthMethod } from '@shared/types';
import './Auth.css';

const METHOD_LABELS: Record<AuthMethod, string> = {
  'credentials': 'Username & Password',
  'cookies-file': 'Cookies File',
  'cookies-browser': 'Browser Cookies',
};

const emptyEntry = (): SiteAuth => ({
  id: '',
  site: '',
  displayName: '',
  method: 'credentials',
  enabled: true,
  testStatus: 'untested',
  createdAt: '',
  updatedAt: '',
});

export const Auth: React.FC = () => {
  const {
    entries,
    supportedSites,
    browsers,
    loading,
    loadEntries,
    loadSupportedSites,
    loadBrowsers,
    saveEntry,
    deleteEntry,
    testEntry,
    importCookies,
  } = useAuthStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SiteAuth>(emptyEntry());
  const [isEditing, setIsEditing] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
    loadSupportedSites();
    loadBrowsers();
  }, [loadEntries, loadSupportedSites, loadBrowsers]);

  const handleAdd = useCallback(() => {
    setEditingEntry(emptyEntry());
    setIsEditing(false);
    setTestMessage(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((entry: SiteAuth) => {
    setEditingEntry({ ...entry });
    setIsEditing(true);
    setTestMessage(null);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteEntry(id);
  }, [deleteEntry]);

  const handleToggle = useCallback(async (entry: SiteAuth) => {
    await saveEntry({ ...entry, enabled: !entry.enabled });
  }, [saveEntry]);

  const handleSave = useCallback(async () => {
    await saveEntry(editingEntry);
    setModalOpen(false);
  }, [editingEntry, saveEntry]);

  const handleTest = useCallback(async () => {
    const result = await testEntry(editingEntry);
    setTestMessage(result.message);
  }, [editingEntry, testEntry]);

  const handleBrowseCookies = useCallback(async () => {
    const filePath = await importCookies();
    if (filePath) {
      setEditingEntry(prev => ({ ...prev, cookiesPath: filePath }));
    }
  }, [importCookies]);

  const handleSiteChange = useCallback((category: string) => {
    const site = supportedSites.find(s => s.category === category);
    if (site) {
      // Pick first supported method for the site
      const method = site.supportedMethods[0] ?? 'credentials';
      setEditingEntry(prev => ({
        ...prev,
        site: site.category,
        displayName: site.displayName,
        method,
      }));
    }
  }, [supportedSites]);

  const handleMethodChange = useCallback((method: AuthMethod) => {
    setEditingEntry(prev => ({ ...prev, method }));
  }, []);

  // Get supported methods for currently selected site
  const currentSiteInfo = supportedSites.find(s => s.category === editingEntry.site);
  const availableMethods = currentSiteInfo?.supportedMethods ?? [];

  const getSiteInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  if (loading && entries.length === 0) {
    return <div className="auth-page__loading">Loading authentication data...</div>;
  }

  return (
    <div className="auth-page">
      {/* Header */}
      <div className="auth-page__header">
        <div className="auth-page__header-left">
          <h1 className="auth-page__title">
            <KeyRound size={24} />
            Authentication
          </h1>
          <p className="auth-page__subtitle">
            Manage site credentials and cookies for gallery-dl
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={handleAdd}>
          Add Site
        </Button>
      </div>

      {/* Content */}
      <div className="auth-page__content">
        {entries.length === 0 ? (
          <div className="auth-page__empty">
            <ShieldCheck size={48} className="auth-page__empty-icon" />
            <div className="auth-page__empty-title">No authentication configured</div>
            <div className="auth-page__empty-text">
              Add credentials or cookies for sites that require authentication to access content.
            </div>
            <Button variant="secondary" icon={<Plus size={16} />} onClick={handleAdd}>
              Add Your First Site
            </Button>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`auth-page__card${!entry.enabled ? ' auth-page__card--disabled' : ''}`}
            >
              {/* Site icon */}
              <div className="auth-page__card-icon">
                {getSiteInitials(entry.displayName)}
              </div>

              {/* Info */}
              <div className="auth-page__card-info">
                <div className="auth-page__card-name">
                  {entry.displayName}
                  <Badge
                    variant={entry.method === 'credentials' ? 'info' : 'default'}
                    size="sm"
                  >
                    {METHOD_LABELS[entry.method]}
                  </Badge>
                </div>
                <div className="auth-page__card-meta">
                  <span
                    className={`auth-page__status-dot auth-page__status-dot--${entry.testStatus ?? 'untested'}`}
                  />
                  {entry.testStatus === 'success'
                    ? 'Verified'
                    : entry.testStatus === 'failed'
                      ? 'Failed'
                      : 'Not tested'}
                  {entry.method === 'credentials' && entry.username && (
                    <span>&middot; {entry.username}</span>
                  )}
                  {entry.method === 'cookies-browser' && entry.browser && (
                    <span>&middot; {entry.browser}</span>
                  )}
                  {entry.method === 'cookies-file' && entry.cookiesPath && (
                    <span>&middot; cookies.txt</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="auth-page__card-actions">
                <label className="auth-page__toggle">
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={() => handleToggle(entry)}
                  />
                  <span className="auth-page__toggle-track" />
                </label>
                <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => handleEdit(entry)} />
                <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDelete(entry.id)} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Authentication' : 'Add Authentication'}
        width={520}
      >
        <div className="auth-page__form">
          {/* Site selector */}
          <Select
            label="Site"
            options={[
              { label: 'Select a site...', value: '' },
              ...supportedSites.map(s => ({ label: s.displayName, value: s.category })),
            ]}
            value={editingEntry.site}
            onChange={handleSiteChange}
            disabled={isEditing}
          />

          {/* Site notes */}
          {currentSiteInfo?.notes && (
            <div className="auth-page__form-note">
              {currentSiteInfo.notes}
            </div>
          )}

          {/* Auth method selector */}
          {editingEntry.site && availableMethods.length > 0 && (
            <>
              <div className="auth-page__form-label">Authentication Method</div>
              <div className="auth-page__method-options">
                {availableMethods.map((method) => (
                  <button
                    key={method}
                    type="button"
                    className={`auth-page__method-option${editingEntry.method === method ? ' auth-page__method-option--active' : ''}`}
                    onClick={() => handleMethodChange(method)}
                  >
                    {METHOD_LABELS[method]}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Credentials form */}
          {editingEntry.method === 'credentials' && editingEntry.site && (
            <>
              <Input
                label="Username"
                value={editingEntry.username ?? ''}
                onChange={(e) => setEditingEntry(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
              />
              <Input
                label="Password"
                type="password"
                value={editingEntry.password ?? ''}
                onChange={(e) => setEditingEntry(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password or API key"
              />
            </>
          )}

          {/* Cookies file form */}
          {editingEntry.method === 'cookies-file' && editingEntry.site && (
            <div className="auth-page__form-row">
              <Input
                label="Cookies File Path"
                value={editingEntry.cookiesPath ?? ''}
                onChange={(e) => setEditingEntry(prev => ({ ...prev, cookiesPath: e.target.value }))}
                placeholder="Path to cookies.txt (Netscape format)"
              />
              <Button
                variant="secondary"
                icon={<FolderOpen size={16} />}
                onClick={handleBrowseCookies}
                style={{ marginBottom: '20px' }}
              >
                Browse
              </Button>
            </div>
          )}

          {/* Browser cookies form */}
          {editingEntry.method === 'cookies-browser' && editingEntry.site && (
            <>
              <Select
                label="Browser"
                options={[
                  { label: 'Select browser...', value: '' },
                  ...browsers.map(b => ({ label: b.charAt(0).toUpperCase() + b.slice(1), value: b })),
                ]}
                value={editingEntry.browser ?? ''}
                onChange={(v) => setEditingEntry(prev => ({ ...prev, browser: v }))}
              />
              <Input
                label="Profile (optional)"
                value={editingEntry.browserProfile ?? ''}
                onChange={(e) => setEditingEntry(prev => ({ ...prev, browserProfile: e.target.value }))}
                placeholder="e.g., default, Profile 1"
                helperText="Leave empty to use the default profile"
              />
              <Input
                label="Cookie Domain (optional)"
                value={editingEntry.cookieDomain ?? ''}
                onChange={(e) => setEditingEntry(prev => ({ ...prev, cookieDomain: e.target.value }))}
                placeholder="e.g., .instagram.com"
                helperText="Filter cookies to a specific domain"
              />
            </>
          )}

          {/* Test message */}
          {testMessage && (
            <div className="auth-page__form-note">
              {testMessage}
            </div>
          )}

          {/* Actions */}
          <div className="auth-page__form-actions">
            {editingEntry.site && (
              <Button variant="ghost" onClick={handleTest}>
                Test
              </Button>
            )}
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!editingEntry.site}
            >
              {isEditing ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
