import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import './Layout.css';

export const Layout: React.FC = () => {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout__content">
        <Header />
        <main className="layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
