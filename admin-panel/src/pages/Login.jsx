import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, Sparkles, ArrowLeft, Zap } from 'lucide-react';
import authApi, { setToken, setCurrentUser } from '../api/authApi';
import { useBranding } from '../context/BrandingContext';

export default function Login({ onLoginSuccess, onBackToHome }) {
  const { brandName, resolvedLogoUrl, brandTagline } = useBranding();
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
      background: 'radial-gradient(circle at 50% 30%, #ffffff 0%, #f4f6f9 100%)',
      position: 'relative',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        border: '1px solid #E0E6ED',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 20px 40px -15px rgba(30, 136, 229, 0.12), 0 0 25px rgba(30, 136, 229, 0.06)',
        position: 'relative',
      }}>
        {/* Back to Home Button */}
        {onBackToHome && (
          <button
            type="button"
            onClick={onBackToHome}
            style={{
              position: 'absolute',
              top: '1.5rem',
              left: '1.5rem',
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1E88E5')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
          >
            <ArrowLeft size={16} />
            <span>Website</span>
          </button>
        )}

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: onBackToHome ? '0.75rem' : '0' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.85rem',
            boxShadow: '0 4px 16px rgba(30, 136, 229, 0.35)',
            marginBottom: '1rem',
            color: '#fff',
            overflow: 'hidden',
          }}>
            {resolvedLogoUrl ? (
              <img
                src={resolvedLogoUrl}
                alt={brandName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.login-fallback-icon');
                  if (fallback) fallback.style.display = 'inline';
                }}
              />
            ) : null}
            <span className="login-fallback-icon" style={{ display: resolvedLogoUrl ? 'none' : 'inline' }}>
              <Zap size={30} fill="#FFFFFF" color="#FFFFFF" />
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A' }}>
            {brandName}
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {brandTagline || 'Broadcasting & Live Streaming Admin Console'}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            color: '#be123c',
            fontSize: '0.86rem',
            lineHeight: 1.4,
            fontWeight: 500,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
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
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
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
            style={{
              width: '100%',
              padding: '0.85rem',
              marginTop: '0.5rem',
              fontSize: '0.95rem',
              background: 'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)',
              borderColor: 'transparent',
              boxShadow: '0 4px 14px rgba(30, 136, 229, 0.3)',
            }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (
              <>
                <span>Sign in to Admin Console</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Helper Pill */}
        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #E0E6ED',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <Sparkles size={13} color="#1E88E5" />
            <span>Default Seed Credentials:</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', color: '#1E88E5', borderColor: '#D4E2F2' }}
            onClick={() => fillDemo('admin@umi.live', 'admin123')}
          >
            Fill: admin / admin123
          </button>
        </div>
      </div>
    </div>
  );
}
