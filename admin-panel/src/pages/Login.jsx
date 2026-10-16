import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import authApi, { setToken, setCurrentUser } from '../api/authApi';

export default function Login({ onLoginSuccess, onOpenUserPortal }) {
  const [identifier, setIdentifier] = useState('admin@umi.live');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login(identifier, password);
      if (res.success && res.token) {
        setToken(res.token);
        setCurrentUser(res.user);
        onLoginSuccess(res.user);
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Could not connect to backend server. Make sure docker or backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (id, pass) => {
    setIdentifier(id);
    setPassword(pass);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at 50% 30%, #ffffff 0%, #f1f5f9 100%)',
      position: 'relative',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.08), 0 0 25px rgba(124, 58, 237, 0.08)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
            marginBottom: '1rem',
            color: '#fff',
          }}>
            ⚡
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Umi Live
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Broadcasting & Live Streaming Admin Console
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            color: '#fda4af',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Email or User ID
            </label>
            <div className="search-input-wrap">
              <User size={18} />
              <input
                type="text"
                className="input-field"
                placeholder="admin@umi.live or 1"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Password
            </label>
            <div className="search-input-wrap">
              <Lock size={18} />
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (
              <>
                <span>Sign in to Dashboard</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Helper Pill */}
        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <Sparkles size={13} color="#c4b5fd" />
            <span>Default Seed Credentials:</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem' }}
            onClick={() => fillDemo('admin@umi.live', 'admin123')}
          >
            Fill: admin / admin123
          </button>
        </div>

        {/* Switch to User Live Portal */}
        {onOpenUserPortal && (
          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={onOpenUserPortal}
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.86rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(124, 58, 237, 0.08)',
                color: '#7c3aed',
                borderColor: 'rgba(124, 58, 237, 0.25)',
              }}
            >
              <span>🎙️</span>
              <span>Normal User Live Portal (Go Live / OTP)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
