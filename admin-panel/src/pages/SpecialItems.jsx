import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, Layers } from 'lucide-react';
import Thumbnails from './Thumbnails';
import EntryEffects from './EntryEffects';

/**
 * SpecialItems
 * Unified page containing separate tabs for Thumbnails and Entry Effects.
 */
export default function SpecialItems({ initialTab = 'thumbnails', onNavigateTab, onToast }) {
  const [currentTab, setCurrentTab] = useState(initialTab || 'thumbnails');

  useEffect(() => {
    if (initialTab && (initialTab === 'thumbnails' || initialTab === 'entry-effects')) {
      setCurrentTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: '3.5rem' }}>
      {/* Compact Top Tab Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('thumbnails')}
          style={{
            padding: '0.55rem 1.35rem',
            borderRadius: '10px',
            border: 'none',
            background: currentTab === 'thumbnails' ? 'rgba(6, 182, 212, 0.16)' : 'var(--bg-secondary)',
            color: currentTab === 'thumbnails' ? '#06b6d4' : 'var(--text-dim)',
            fontWeight: currentTab === 'thumbnails' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.92rem',
            transition: 'all 0.15s ease',
            outline: currentTab === 'thumbnails' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--border-color)',
          }}
        >
          <ImageIcon size={17} />
          <span>Thumbnails</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('entry-effects')}
          style={{
            padding: '0.55rem 1.35rem',
            borderRadius: '10px',
            border: 'none',
            background: currentTab === 'entry-effects' ? 'rgba(236, 72, 153, 0.16)' : 'var(--bg-secondary)',
            color: currentTab === 'entry-effects' ? '#ec4899' : 'var(--text-dim)',
            fontWeight: currentTab === 'entry-effects' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.92rem',
            transition: 'all 0.15s ease',
            outline: currentTab === 'entry-effects' ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid var(--border-color)',
          }}
        >
          <Sparkles size={17} />
          <span>Entry Effects</span>
        </button>
      </div>

      {/* Embedded Sub-Pages */}
      {currentTab === 'thumbnails' && (
        <Thumbnails onToast={onToast} embedded />
      )}

      {currentTab === 'entry-effects' && (
        <EntryEffects onToast={onToast} embedded />
      )}
    </div>
  );
}
