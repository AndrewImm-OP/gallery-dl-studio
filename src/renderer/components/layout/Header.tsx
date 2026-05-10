import React from 'react';
import { Minus, Square, X, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useDownloadStore } from '@/stores/downloadStore';
import './Header.css';

export const Header: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const queueStatus = useDownloadStore((state) => state.queueStatus);

  const handleMinimize = () => window.electronAPI.minimize();
  const handleMaximize = () => window.electronAPI.maximize();
  const handleClose = () => window.electronAPI.close();

  return (
    <header className="header">
      {/* Drag region */}
      <div className="header__drag-region" />

      {/* Status info */}
      <div className="header__status">
        {queueStatus.active > 0 && (
          <span className="header__status-item">
            <span className="header__status-dot" />
            {queueStatus.active} active
            {queueStatus.totalSpeed && ` - ${queueStatus.totalSpeed}`}
          </span>
        )}
        {queueStatus.pending > 0 && (
          <span className="header__status-item">{queueStatus.pending} queued</span>
        )}
      </div>

      {/* Actions */}
      <div className="header__actions">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="header__btn header__btn--theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="header__separator" />

        {/* Window controls */}
        <button
          onClick={handleMinimize}
          aria-label="Minimize"
          className="header__btn"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleMaximize}
          aria-label="Maximize"
          className="header__btn"
        >
          <Square size={14} />
        </button>
        <button
          onClick={handleClose}
          aria-label="Close"
          className="header__btn header__btn--close"
        >
          <X size={16} />
        </button>
      </div>
    </header>
  );
};
