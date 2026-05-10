import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Download,
  Eye,
  Clock,
  FileJson,
  KeyRound,
  Settings,
  Image,
  Heart,
  Copy,
} from 'lucide-react';
import './Sidebar.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Downloads', icon: <Download size={20} /> },
  { path: '/preview', label: 'Preview', icon: <Eye size={20} /> },
  { path: '/history', label: 'History', icon: <Clock size={20} /> },
  { path: '/config', label: 'Config', icon: <FileJson size={20} /> },
  { path: '/auth', label: 'Auth', icon: <KeyRound size={20} /> },
  { path: '/dedup', label: 'Dedup', icon: <Copy size={20} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      {/* App Logo / Title */}
      <div className="sidebar__titlebar" />
      <div className="sidebar__logo">
        <Image size={24} className="sidebar__logo-icon" />
        <span className="sidebar__logo-text">
          Gallery-DL Studio
        </span>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
          >
            <span className="sidebar__nav-icon">{item.icon}</span>
            <span className="sidebar__nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer with Creds button */}
      <div className="sidebar__footer">
        <NavLink
          to="/credits"
          className={({ isActive }) =>
            `sidebar__creds-btn${isActive ? ' sidebar__creds-btn--active' : ''}`
          }
        >
          <Heart size={14} />
          <span className="sidebar__creds-label">Creds</span>
        </NavLink>
        <span className="sidebar__footer-text">v9.93.0</span>
      </div>
    </aside>
  );
};
