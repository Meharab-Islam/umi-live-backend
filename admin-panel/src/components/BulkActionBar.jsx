import React, { useState } from 'react';
import { Trash2, CheckSquare, X, AlertTriangle, Loader2 } from 'lucide-react';

export default function BulkActionBar({
  selectedCount = 0,
  totalCount = 0,
  onSelectAll,
  onClearSelection,
  onDelete,
  entityName = 'items',
  deleting = false,
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div
        className="bulk-action-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          marginBottom: '1rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(30, 41, 59, 0.75) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(10px)',
          animation: 'fadeInSlideDown 0.2s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
            }}
          >
            <CheckSquare size={18} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
              {selectedCount} {entityName} selected
            </span>
            {totalCount > 0 && selectedCount < totalCount && onSelectAll && (
              <button
                type="button"
                onClick={onSelectAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-color, #3b82f6)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginLeft: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Select all ({totalCount})
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {onClearSelection && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClearSelection}
              disabled={deleting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                padding: '0.45rem 0.85rem',
              }}
            >
              <X size={14} /> Deselect All
            </button>
          )}

          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setShowConfirm(true)}
            disabled={deleting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              padding: '0.45rem 1rem',
              backgroundColor: '#ef4444',
              borderColor: '#dc2626',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            }}
          >
            {deleting ? (
              <>
                <Loader2 size={15} className="spinner" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 size={15} /> Delete Selected ({selectedCount})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !deleting && setShowConfirm(false)}
        >
          <div
            className="modal-card"
            style={{
              background: 'var(--bg-secondary, #1e293b)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 800 }}>
              Bulk Delete Confirmation
            </h3>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong>{selectedCount}</strong> {entityName}? This action
              cannot be undone and will immediately clear associated records from both the database and Redis cache.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deleting}
                onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: '0.65rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleting}
                onClick={async () => {
                  setShowConfirm(false);
                  if (onDelete) await onDelete();
                }}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  backgroundColor: '#ef4444',
                  borderColor: '#dc2626',
                  fontWeight: 700,
                }}
              >
                {deleting ? 'Deleting...' : `Yes, Delete (${selectedCount})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
