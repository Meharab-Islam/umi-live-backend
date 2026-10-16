import React, { useState, useEffect } from 'react';
import {
  Radio,
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { API_BASE } from '../api/client';

export default function UserLiveAuth({ onAuthSuccess, onToast, onSwitchToAdmin }) {
  // Tabs: 'otp' | 'password' | 'register'
  const [authMode, setAuthMode] = useState('otp');

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('https://api.dicebear.com/7.x/bottts/svg?seed=Umi1');

  // OTP flow state
  const [otpSent, setOtpSent] = useState(false);
  const [receivedOtp, setReceivedOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Preset avatars for quick selection
  const avatarPresets = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Umi1',
    'https://api.dicebear.com/7.x/bottts/svg?seed=StarGirl',
    'https://api.dicebear.com/7.x/bottts/svg?seed=GamerPro',
    'https://api.dicebear.com/7.x/bottts/svg?seed=SingerLive',
    'https://api.dicebear.com/7.x/bottts/svg?seed=HostStar',
  ];

  // OTP Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 1. Send OTP Request
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const target = identifier.trim();
    if (!target) {
      setError('Please enter your email address or phone number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/mobile/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: target }),
      });
      const data = await res.json();

      if (data.success) {
        setOtpSent(true);
        setReceivedOtp(data.otp || '');
        setCountdown(60);
        onToast?.(`Verification code sent! (Debug Code: ${data.otp})`, 'success');
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setError(err.message || 'Network error sending OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP & Login/Register
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const target = identifier.trim();
    const code = otpCode.trim();

    if (!code) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/mobile/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: target,
          otp: code,
          full_name: fullName.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.success && data.token && data.user) {
        const authData = {
          token: data.token,
          user: {
            ...data.user,
            token: data.token,
          },
        };
        localStorage.setItem('user_portal_auth', JSON.stringify(authData));
        onToast?.(data.isNewUser ? 'Welcome to Umi Live! 🎉' : 'Logged in successfully! 🚀', 'success');
        onAuthSuccess(authData);
      } else {
        setError(data.message || 'Invalid verification code.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');

    const target = identifier.trim();
    const pass = password.trim();

    if (!target || !pass) {
      setError('Email/User ID and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/mobile/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': 'web-portal-user',
          'x-device-name': 'Chrome Web Client',
        },
        body: JSON.stringify({
          identifier: target,
          password: pass,
          device_unique_id: 'web-portal-user',
          device_name: 'Chrome Web Client',
        }),
      });
      const data = await res.json();

      if (data.success && data.token && data.user) {
        const authData = {
          token: data.token,
          user: {
            ...data.user,
            token: data.token,
          },
        };
        localStorage.setItem('user_portal_auth', JSON.stringify(authData));
        onToast?.(`Welcome back, ${data.user.full_name}! 👋`, 'success');
        onAuthSuccess(authData);
      } else {
        setError(data.message || 'Invalid credentials.');
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Full Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const name = fullName.trim();
    const email = identifier.trim();
    const pass = password.trim();

    if (!name || !email || !pass) {
      setError('Full name, email and password are required.');
      return;
    }

    if (pass.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/mobile/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name,
          email: email,
          password: pass,
          avatar_url: selectedAvatar,
        }),
      });
      const data = await res.json();

      if (data.success && data.token && data.user) {
        const authData = {
          token: data.token,
          user: {
            ...data.user,
            token: data.token,
          },
        };
        localStorage.setItem('user_portal_auth', JSON.stringify(authData));
        onToast?.('Account created! Welcome to Umi Live 🌟', 'success');
        onAuthSuccess(authData);
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch (err) {
      setError(err.message || 'Registration error.');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click Demo Accounts
  const handleQuickDemo = async (email, pass) => {
    setIdentifier(email);
    setPassword(pass);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/mobile/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': 'web-portal-demo',
          'x-device-name': 'Demo Quick Switcher',
        },
        body: JSON.stringify({
          identifier: email,
          password: pass,
          device_unique_id: 'web-portal-demo',
          device_name: 'Demo Quick Switcher',
        }),
      });
      const data = await res.json();
      if (data.success && data.token && data.user) {
        const authData = {
          token: data.token,
          user: {
            ...data.user,
            token: data.token,
          },
        };
        localStorage.setItem('user_portal_auth', JSON.stringify(authData));
        onToast?.(`Signed in as ${data.user.full_name} (${data.user.role})`, 'success');
        onAuthSuccess(authData);
      } else {
        setError(data.message || 'Demo login failed');
      }
    } catch (e) {
      setError(e.message || 'Demo login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #090d16 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        color: '#f8fafc',
        position: 'relative',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(124, 58, 237, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.4)',
              marginBottom: '1rem',
            }}
          >
            <Radio size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
            Umi Live Portal
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Broadcaster & Viewer Live Stage (Independent User App)
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px',
            borderRadius: '12px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMode('otp');
              setError('');
            }}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              border: 'none',
              background: authMode === 'otp' ? '#7c3aed' : 'transparent',
              color: authMode === 'otp' ? '#fff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
          >
            <Smartphone size={13} />
            <span>OTP Code</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setError('');
            }}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              border: 'none',
              background: authMode === 'password' ? '#7c3aed' : 'transparent',
              color: authMode === 'password' ? '#fff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
          >
            <KeyRound size={13} />
            <span>Password</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setError('');
            }}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              border: 'none',
              background: authMode === 'register' ? '#7c3aed' : 'transparent',
              color: authMode === 'register' ? '#fff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
          >
            <User size={13} />
            <span>Register</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '10px 14px',
              color: '#fca5a5',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 1: OTP QUICK LOGIN / REGISTRATION */}
        {/* ============================================================== */}
        {authMode === 'otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Email Address or Mobile Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. user@umi.live or 01700000000"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      style={{ paddingLeft: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}
                      required
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                    A 6-digit one-time password (OTP) will be generated.
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Full Name (Optional for new users)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{ paddingLeft: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    borderRadius: '12px',
                    padding: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {loading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  <span>{loading ? 'Sending OTP...' : 'Send Verification Code'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div
                  style={{
                    background: 'rgba(124, 58, 237, 0.1)',
                    border: '1px solid rgba(124, 58, 237, 0.25)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '0.82rem',
                    color: '#c4b5fd',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>Code sent to: <strong>{identifier}</strong></span>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    className="input-field"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    style={{
                      textAlign: 'center',
                      fontSize: '1.5rem',
                      letterSpacing: '8px',
                      fontWeight: 800,
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.08)',
                      padding: '10px',
                    }}
                    required
                  />

                  {receivedOtp && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.74rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> Demo Code: <strong>{receivedOtp}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtpCode(receivedOtp)}
                        style={{
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Auto-fill Code
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    disabled={countdown > 0}
                    onClick={() => handleSendOtp()}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: countdown > 0 ? '#64748b' : '#a855f7',
                      fontSize: '0.76rem',
                      cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend OTP Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    borderRadius: '12px',
                    padding: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {loading ? <RefreshCw size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  <span>{loading ? 'Verifying...' : 'Verify & Enter Live Stream 🎙️'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 2: PASSWORD LOGIN */}
        {/* ============================================================== */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Email or User ID
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. user@umi.live or 2"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{ paddingLeft: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                borderRadius: '12px',
                padding: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              <span>{loading ? 'Signing in...' : 'Sign In & Open Live Stage 📹'}</span>
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* MODE 3: FULL REGISTRATION */}
        {/* ============================================================== */}
        {authMode === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Full Name / Channel Display Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Sarah Jenkins"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ paddingLeft: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                <input
                  type="email"
                  className="input-field"
                  placeholder="sarah@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{ paddingLeft: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Create Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                <input
                  type="password"
                  className="input-field"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Select Broadcaster Avatar
              </label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {avatarPresets.map((av, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedAvatar(av)}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: selectedAvatar === av ? '2px solid #7c3aed' : '2px solid transparent',
                      boxShadow: selectedAvatar === av ? '0 0 10px rgba(124, 58, 237, 0.5)' : 'none',
                      flexShrink: 0,
                    }}
                  >
                    <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                borderRadius: '12px',
                padding: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
              }}
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
              <span>{loading ? 'Registering...' : 'Create Account & Start Live ✨'}</span>
            </button>
          </form>
        )}

        {/* 1-Click Quick Demo Accounts (For Paired Mobile Testing) */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '8px', textAlign: 'center' }}>
            ⚡ 1-Click Fast Switch Demo Accounts:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleQuickDemo('nila@umi.live', 'host123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.72rem', padding: '6px', borderRadius: '8px' }}
            >
              👑 Host (Nila)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('tanvir@umi.live', 'user123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.72rem', padding: '6px', borderRadius: '8px' }}
            >
              👤 User (Tanvir)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin@umi.live', 'admin123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.72rem', padding: '6px', borderRadius: '8px' }}
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        {/* Switch to Admin Panel Link */}
        {onSwitchToAdmin && (
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={onSwitchToAdmin}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ShieldCheck size={14} />
              <span>Back to Back-Office Admin Console</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
