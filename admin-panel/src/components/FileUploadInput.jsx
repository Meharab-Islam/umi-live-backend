import React, { useState, useRef } from 'react';
import { Upload, Link, X, CheckCircle, Image as ImageIcon, Music, Film, Loader2 } from 'lucide-react';
import { uploadFile, resolveAssetUrl } from '../api/client';

/**
 * FileUploadInput
 * Reusable component allowing administrators to either:
 * 1. Upload a file directly from their computer (with automatic server upload)
 * 2. Or enter an external URL directly
 */
export default function FileUploadInput({
  label,
  value,
  onChange,
  category = 'general',
  accept = 'image/*',
  type = 'image', // 'image' | 'audio' | 'svga' | 'any'
  placeholder = 'https://example.com/asset.png or upload from computer',
  required = false,
  helperText,
  onToast,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await uploadFile(file, category);
      if (res.success && res.data?.url) {
        onChange(res.data.url);
        setUploadedFileName(file.name);
        if (onToast) {
          onToast(`Uploaded ${file.name} successfully!`, 'success');
        }
      } else {
        throw new Error(res.message || 'Upload failed');
      }
    } catch (err) {
      if (onToast) {
        onToast(err.message || 'Failed to upload file', 'error');
      }
    } finally {
      setUploading(false);
      // Reset input value so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    onChange('');
    setUploadedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resolvedPreviewUrl = resolveAssetUrl(value);

  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '0.35rem',
          }}
        >
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      {/* Input Group: Text/URL field + Computer Upload Button */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="input-field"
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => {
              onChange(e.target.value);
              setUploadedFileName('');
            }}
            required={required}
            style={{
              paddingRight: value ? '32px' : '10px',
              width: '100%',
              fontSize: '0.84rem',
            }}
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear input"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Hidden native file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          disabled={uploading}
        />

        {/* Upload from Computer Trigger Button */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            padding: '0.5rem 0.85rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={15} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={14} color="#06b6d4" />
              <span>Upload from PC</span>
            </>
          )}
        </button>
      </div>

      {/* Helper text or uploaded filename indicator */}
      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {uploadedFileName ? (
          <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={12} /> Uploaded: {uploadedFileName}
          </span>
        ) : (
          helperText && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {helperText}
            </span>
          )
        )}
      </div>

      {/* Live Previews depending on asset type */}
      {value && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {type === 'image' && (
            <>
              <img
                src={resolvedPreviewUrl}
                alt="Preview"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  border: '1px solid var(--border-color)',
                  background: '#111',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Image Preview</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-main)',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {value}
                </span>
              </div>
            </>
          )}

          {type === 'audio' && (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Music size={14} color="#ec4899" />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Audio Test Player</span>
              </div>
              <audio
                controls
                src={resolvedPreviewUrl}
                style={{ width: '100%', height: '32px' }}
              />
            </div>
          )}

          {type === 'svga' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Film size={18} color="#ec4899" />
              <div>
                <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'block' }}>
                  SVGA Animation File Ready
                </strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', wordBreak: 'break-all' }}>
                  {value}
                </span>
              </div>
            </div>
          )}

          {type === 'any' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Asset URL:</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                {value}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
