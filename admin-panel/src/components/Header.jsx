import React from 'react';
import { RefreshCw, Activity, Menu, ShieldCheck, Globe } from 'lucide-react';

export default function Header({
  pageTitle,
  onRefresh,
  isRefreshing,
  isConnected,
  onToggleMobileMenu,
  onGoToLanding,
}) {
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            <span>Portal</span>
            <span>/</span>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{pageTitle}</span>
          </div>
          <h2 className="page-title" style={{ marginTop: '1px' }}>{pageTitle}</h2>
        </div>
      </div>

      <div className="navbar-right">
        {/* Backend & DB Health status indicator */}
        <div
          className="server-pill"
          style={{
            background: isConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
            borderColor: isConnected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)',
            color: isConnected ? '#059669' : '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.35rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
          title={isConnected ? 'Backend API and MySQL are connected' : 'Connecting to API server...'}
        >
          <span
            className="server-dot"
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isConnected ? '#10b981' : '#f43f5e',
              boxShadow: isConnected ? '0 0 6px #10b981' : '0 0 6px #f43f5e',
            }}
          />
          <span>{isConnected ? 'System Online' : 'Connecting...'}</span>
        </div>

        {/* View Website / Landing Page button */}
        {onGoToLanding && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onGoToLanding}
            title="View Landing Page"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
            }}
          >
            <Globe size={14} color="#1E88E5" />
            <span>Website</span>
          </button>
        )}

        {/* Refresh button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Data"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
          }}
        >
          <RefreshCw
            size={14}
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
