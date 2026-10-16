import React from 'react';
import { RefreshCw, Activity, Bell, Menu } from 'lucide-react';

export default function Header({ pageTitle, onRefresh, isRefreshing, isConnected, onToggleMobileMenu }) {
  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleMobileMenu}
          title="Open Menu"
          type="button"
        >
          <Menu size={20} />
        </button>
        <h2 className="page-title">{pageTitle}</h2>
      </div>

      <div className="navbar-right">
        {/* Backend & DB Health status indicator */}
        <div
          className="server-pill"
          style={{
            background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            borderColor: isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)',
            color: isConnected ? '#059669' : '#dc2626',
          }}
        >
          <span
            className="server-dot"
            style={{
              background: isConnected ? '#10b981' : '#f43f5e',
              boxShadow: isConnected ? '0 0 8px #10b981' : '0 0 8px #f43f5e',
            }}
          />
          <span>{isConnected ? 'API & MySQL Online' : 'Connecting to API...'}</span>
        </div>

        {/* Refresh button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Data"
        >
          <RefreshCw
            size={15}
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span>Refresh</span>
        </button>

        <style>{`
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </header>
  );
}
