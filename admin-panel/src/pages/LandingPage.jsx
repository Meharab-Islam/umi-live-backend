import React, { useState } from 'react';
import {
  Video,
  Mic,
  Coins,
  Crown,
  ShieldCheck,
  Trophy,
  Sparkles,
  Download,
  ArrowRight,
  ExternalLink,
  Users,
  Eye,
  Heart,
  Flame,
  Radio,
  Lock,
  ChevronRight,
  Smartphone,
  Star,
  Zap,
} from 'lucide-react';
import { useBranding } from '../context/BrandingContext';
import './LandingPage.css';

export default function LandingPage({ onNavigateToAdmin, user, onLogout }) {
  const { brandName, resolvedLogoUrl, brandTagline } = useBranding();
  const [mockMode, setMockMode] = useState('video'); // 'video' | 'audio'
  const [activeShowcaseTab, setActiveShowcaseTab] = useState('video');
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const showcaseData = {
    video: {
      badge: 'WebRTC Ultra HD Streaming',
      title: 'Real-Time Video Broadcast with DeepAR AI Filters',
      desc: 'Experience 1080p 60FPS zero-lag live video broadcasting powered by LiveKit SFU infrastructure. Enhance streams with real-time AR beauty filters, dynamic virtual gifts, multi-guest stage calls, and interactive audience comments.',
      highlights: [
        'Sub-150ms glass-to-glass global latency',
        'DeepAR AI face beauty, smoothing & 3D stickers',
        'Multi-host co-streaming & PK battle challenges',
        'Real-time animated gift notifications & SVGA overlays',
      ],
      icon: <Video size={24} />,
      color: '#1E88E5',
    },
    audio: {
      badge: 'Dynamic Multi-Guest Party',
      title: 'Interactive 20-Seat Voice Party Rooms',
      desc: 'Create vibrant community party rooms supporting up to 20 voice seats with dynamic host expansions. Includes animated speaking rings, host seat locking, background wallpapers, sound effects, and private host whispers.',
      highlights: [
        'Dynamic seat expansion from 6 up to 20 seats',
        'Live animated soundwave rings on active speakers',
        'Custom 4K room themes & animated wallpapers',
        'Host controls: kick, mute, invite, lock & VIP priority',
      ],
      icon: <Mic size={24} />,
      color: '#1565C0',
    },
    economy: {
      badge: 'Creator Monetization',
      title: 'Seamless Coin Economy & Virtual Gift System',
      desc: 'Empower creators with instant monetized virtual gifts. Users recharge Coins, send animated 3D gifts during streams, and broadcasters convert received gifts to withdrawal earnings directly via local gateways.',
      highlights: [
        '100+ customized animated SVGA and 3D gifts',
        'Transparent Coin-to-Diamond conversion formulas',
        'Instant agency earnings & commission splitting',
        'Secure multi-gateway recharge & automated cash-out',
      ],
      icon: <Coins size={24} />,
      color: '#F59E0B',
    },
    vip: {
      badge: 'Exclusive Privilege Suite',
      title: 'Tiered VIP Packages & Custom Badges',
      desc: 'Reward elite community members with King, Queen, Crown, and VIP tier memberships. Enjoy exclusive entrance flash banners, anti-kick protection, auto-call seat privileges, and custom avatar rings.',
      highlights: [
        'King, Queen, Crown & VIP membership tiers',
        'Full-screen SVGA room entrance animations',
        'Auto-call queue acceptance privilege for stage seats',
        'Custom chat nameplate colors & 3D avatar frames',
      ],
      icon: <Crown size={24} />,
      color: '#8B5CF6',
    },
    pk: {
      badge: 'Live Battle Arena',
      title: 'Host vs Host PK Battles with Real-Time Scoring',
      desc: 'Ignite viewer enthusiasm with thrilling live PK battles. Two hosts compete head-to-head while audiences send gifts to drive their champion’s score bar to victory in real-time.',
      highlights: [
        'Side-by-side synchronized dual video streams',
        'Dynamic real-time progress bar powered by live gifts',
        'Victory celebrations, punishments & leaderboards',
        'Automatic winner detection and MVP gifter rewards',
      ],
      icon: <Trophy size={24} />,
      color: '#EF4444',
    },
  };

  const faqs = [
    {
      q: 'How do I start broadcasting on Umi Live?',
      a: 'Simply download the Umi Live mobile app on Android or iOS, sign in via Google, Facebook, or Phone OTP, tap the central "Go Live" button, choose between Video Live or Audio Party mode, and start streaming to millions of viewers instantly.',
    },
    {
      q: 'How does the Coin recharge and creator cash-out work?',
      a: 'Viewers purchase Coins securely through in-app recharges or authorized local Resellers. When viewers gift streamers, coins convert into creator wallet balances that hosts can withdraw anytime to their bank accounts or mobile wallets based on agency rates.',
    },
    {
      q: 'What privileges do VIP packages provide?',
      a: 'VIP subscribers enjoy exclusive privileges including custom badge colors, full-screen entrance SVGA animations, auto-seat access privileges, VIP chat nameplates, and immunity from unauthorized room kicks.',
    },
    {
      q: 'How can agencies and managers oversee their hosts?',
      a: 'Agencies get full access to dedicated agency dashboards to recruit audio/video hosts, track monthly live stream targets, view host coin earnings, and monitor performance in real-time.',
    },
  ];

  return (
    <div className="umi-landing-wrapper">
      {/* Background Ambient Glows */}
      <div className="umi-landing-bg-orb umi-landing-bg-orb-1" />
      <div className="umi-landing-bg-orb umi-landing-bg-orb-2" />

      {/* Sticky Top Navigation */}
      <header className="umi-navbar">
        <div className="umi-navbar-container">
          <div className="umi-brand-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="umi-brand-icon-box">
              {resolvedLogoUrl ? (
                <img
                  src={resolvedLogoUrl}
                  alt={brandName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <Zap size={22} fill="#FFFFFF" color="#FFFFFF" />
              )}
            </div>
            <span className="umi-brand-text">
              {brandName.split(' ')[0]} <span>{brandName.split(' ').slice(1).join(' ') || 'Live'}</span>
            </span>
          </div>

          <ul className="umi-nav-links">
            <li><a href="#features" className="umi-nav-link">Features</a></li>
            <li><a href="#live-experience" className="umi-nav-link">Live Studio</a></li>
            <li><a href="#vip-economy" className="umi-nav-link">VIP & Coins</a></li>
            <li><a href="#download" className="umi-nav-link">Download App</a></li>
            <li><a href="#faq" className="umi-nav-link">FAQ</a></li>
          </ul>

          <div className="umi-nav-actions">
            {user ? (
              <>
                <button
                  type="button"
                  className="umi-btn umi-btn-primary"
                  onClick={onNavigateToAdmin}
                >
                  <ShieldCheck size={16} />
                  <span>Admin Dashboard</span>
                </button>
                <button
                  type="button"
                  className="umi-btn umi-btn-outline"
                  onClick={onLogout}
                  title="Sign Out"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="umi-btn umi-btn-secondary"
                  onClick={onNavigateToAdmin}
                >
                  <Lock size={15} />
                  <span>Admin Console</span>
                </button>
                <a href="#download" className="umi-btn umi-btn-primary">
                  <Download size={15} />
                  <span>Get App</span>
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="umi-hero">
        <div className="umi-hero-content">
          <div className="umi-live-badge">
            <span className="umi-live-pulse-dot" />
            <span>Next-Gen Live Broadcasting Platform</span>
          </div>

          <h1 className="umi-hero-title">
            Connect, Stream & <br />
            <span className="umi-hero-title-highlight">Shine in Real-Time</span>
          </h1>

          <p className="umi-hero-description">
            Experience ultra low-latency WebRTC video streaming with DeepAR face filters, 20-seat interactive voice party rooms, real-time virtual coin gifting, and dynamic VIP privileges — all in a clean, high-performance experience.
          </p>

          <div className="umi-hero-cta-group">
            <a href="#download" className="umi-btn umi-btn-primary" style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}>
              <Download size={18} />
              <span>Download Umi Live</span>
              <ArrowRight size={16} />
            </a>
            <button
              type="button"
              className="umi-btn umi-btn-secondary"
              style={{ padding: '0.85rem 1.5rem', fontSize: '1rem' }}
              onClick={onNavigateToAdmin}
            >
              <ShieldCheck size={18} />
              <span>{user ? 'Open Admin Console' : 'Admin Portal Login'}</span>
            </button>
          </div>

          <div className="umi-hero-stats">
            <div className="umi-hero-stat-item">
              <span className="umi-hero-stat-value">100K+</span>
              <span className="umi-hero-stat-label">Active Users</span>
            </div>
            <div className="umi-hero-stat-item">
              <span className="umi-hero-stat-value">50M+</span>
              <span className="umi-hero-stat-label">Coins Gifted</span>
            </div>
            <div className="umi-hero-stat-item">
              <span className="umi-hero-stat-value">&lt; 150ms</span>
              <span className="umi-hero-stat-label">Ultra Latency</span>
            </div>
            <div className="umi-hero-stat-item">
              <span className="umi-hero-stat-value">99.9%</span>
              <span className="umi-hero-stat-label">Stream Uptime</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Phone Mockup */}
        <div className="umi-phone-preview-wrap">
          {/* Top Floating Card */}
          <div className="umi-floating-card-1">
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              🎁
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>Rocket Blast Gift!</div>
              <div style={{ fontSize: '0.7rem', color: '#D97706', fontWeight: 700 }}>+5,000 Coins 🪙</div>
            </div>
          </div>

          {/* Bottom Floating Card */}
          <div className="umi-floating-card-2">
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E88E5' }}>
              <Crown size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>King VIP Joined 👑</div>
              <div style={{ fontSize: '0.7rem', color: '#1E88E5', fontWeight: 700 }}>Auto-Seat Privilege Enabled</div>
            </div>
          </div>

          {/* Phone Shell */}
          <div className="umi-phone-container">
            <div className="umi-phone-notch" />

            <div className="umi-phone-screen">
              {/* Header inside phone */}
              <div className="umi-phone-top-bar">
                <div className="umi-phone-host-pill">
                  <div className="umi-phone-host-avatar" style={{ background: '#1E88E5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>
                    👑
                  </div>
                  <div>
                    <div className="umi-phone-host-name">Sarah Live 📹</div>
                    <div style={{ fontSize: '0.62rem', color: '#64748B' }}>1.4k viewers</div>
                  </div>
                </div>

                <div className="umi-phone-coins-pill">
                  <span>🪙</span>
                  <span>94,200</span>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="umi-phone-tab-bar">
                <button
                  type="button"
                  className={`umi-phone-tab-btn ${mockMode === 'video' ? 'active' : ''}`}
                  onClick={() => setMockMode('video')}
                >
                  Video Live 📹
                </button>
                <button
                  type="button"
                  className={`umi-phone-tab-btn ${mockMode === 'audio' ? 'active' : ''}`}
                  onClick={() => setMockMode('audio')}
                >
                  Voice Party 🎙️
                </button>
              </div>

              {/* Mode View: Video Live */}
              {mockMode === 'video' && (
                <div className="umi-phone-video-view">
                  <div className="umi-phone-floating-badge">
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                    <span>LIVE • DeepAR Beauty On ✨</span>
                  </div>

                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
                      <div style={{ fontSize: '3rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>👩‍🎤</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, marginTop: '4px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>@sarah_music</div>
                    </div>
                  </div>

                  <div className="umi-phone-chat-feed">
                    <div className="umi-phone-chat-bubble">
                      <span className="umi-phone-chat-user">Alex:</span>
                      <span>Sing that new acoustic song! 🔥</span>
                    </div>
                    <div className="umi-phone-chat-bubble" style={{ background: 'rgba(254, 243, 199, 0.95)', border: '1px solid #FCD34D' }}>
                      <span style={{ color: '#D97706', fontWeight: 800 }}>VIP Liam 👑:</span>
                      <span>Sent 5x Super Cars 🏎️💨</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode View: Audio Party Room */}
              {mockMode === 'audio' && (
                <div className="umi-phone-audio-grid">
                  <div className="umi-phone-seat-item" style={{ borderColor: '#1E88E5', background: '#F0F9FF' }}>
                    <div className="umi-phone-seat-avatar" style={{ background: '#1E88E5', color: '#fff' }}>
                      👑
                      <div className="umi-phone-speaking-ring" />
                    </div>
                    <span className="umi-phone-seat-name">Host Sarah</span>
                    <span style={{ fontSize: '0.58rem', color: '#1E88E5', fontWeight: 800 }}>Seat 1 🎙️</span>
                  </div>

                  {[2, 3, 4, 5, 6].map((s) => (
                    <div key={s} className="umi-phone-seat-item">
                      <div className="umi-phone-seat-avatar" style={{ background: '#E2E8F0', color: '#475569' }}>
                        {s === 2 ? '🎧' : s === 3 ? '🎤' : s === 4 ? '⭐️' : s === 5 ? '😎' : '💎'}
                        {s === 2 && <div className="umi-phone-speaking-ring" style={{ borderColor: '#10B981' }} />}
                      </div>
                      <span className="umi-phone-seat-name">Speaker {s}</span>
                      <span style={{ fontSize: '0.58rem', color: '#64748B' }}>Seat #{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Phone Action Bar */}
              <div style={{ padding: '8px 12px', background: '#FFFFFF', borderTop: '1px solid #EEF2F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" style={{ border: 'none', background: '#F1F5F9', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>🎙️</button>
                  <button type="button" style={{ border: 'none', background: '#F1F5F9', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>💬</button>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" style={{ border: 'none', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', borderRadius: '16px', padding: '4px 10px', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span>🎁 Send Gift</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Platform Features Grid */}
      <section id="features" className="umi-features-section">
        <div className="umi-section-header">
          <span className="umi-section-badge">Next-Generation Architecture</span>
          <h2 className="umi-section-title">Engineered for World-Class Live Social Experiences</h2>
          <p className="umi-section-subtitle">
            From high-definition interactive video to 20-seat audio party rooms, Umi Live delivers blazing speed, zero frame drops, and rich monetization for creators worldwide.
          </p>
        </div>

        <div className="umi-features-grid">
          <div className="umi-feature-card">
            <div className="umi-feature-icon-box">
              <Video size={26} />
            </div>
            <h3 className="umi-feature-title">Ultra HD Video & DeepAR</h3>
            <p className="umi-feature-desc">
              WebRTC streaming powered by LiveKit SFU. Instant face retouching, dynamic skin smoothing, and interactive 3D AR filters.
            </p>
          </div>

          <div className="umi-feature-card">
            <div className="umi-feature-icon-box">
              <Mic size={26} />
            </div>
            <h3 className="umi-feature-title">20-Seat Voice Parties</h3>
            <p className="umi-feature-desc">
              Expandable voice party rooms for up to 20 seats. Includes animated soundwaves, speaking rings, and host reservation management.
            </p>
          </div>

          <div className="umi-feature-card">
            <div className="umi-feature-icon-box">
              <Coins size={26} />
            </div>
            <h3 className="umi-feature-title">Coin Economy & Gifts</h3>
            <p className="umi-feature-desc">
              Over 100 animated virtual gifts with sound effects. Real-time coin deductions, agency splits, and instant creator cash-outs.
            </p>
          </div>

          <div className="umi-feature-card">
            <div className="umi-feature-icon-box">
              <Crown size={26} />
            </div>
            <h3 className="umi-feature-title">Tiered VIP Privilege Club</h3>
            <p className="umi-feature-desc">
              King, Queen, Crown, and VIP packages with exclusive badges, screen entrance animations, anti-kick guards, and auto-call seats.
            </p>
          </div>

          <div className="umi-feature-card">
            <div className="umi-feature-icon-box">
              <Trophy size={26} />
            </div>
            <h3 className="umi-feature-title">Live PK Battles & 3D Podium</h3>
            <p className="umi-feature-desc">
              Streamer vs Streamer competitions with synchronized score bars, live countdowns, top gifter podiums, and victory animations.
            </p>
          </div>

          <div className="umi-feature-card">
            <div className="umi-feature-icon-box">
              <ShieldCheck size={26} />
            </div>
            <h3 className="umi-feature-title">Privacy & Moderator Guard</h3>
            <p className="umi-feature-desc">
              Anti-screenshot screen guards, keyword chat filters, real-time socket bans, and multi-tier role delegation (Host, Agency, Reseller, Mod).
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Feature Showcase Section */}
      <section id="live-experience" className="umi-showcase-section">
        <div className="umi-showcase-container">
          <div className="umi-section-header" style={{ marginBottom: '2.5rem' }}>
            <span className="umi-section-badge">Interactive Capabilities</span>
            <h2 className="umi-section-title">Explore the Live Streaming Ecosystem</h2>
            <p className="umi-section-subtitle">
              Select a category below to see how our broadcasting infrastructure powers creators and audiences.
            </p>
          </div>

          <div className="umi-showcase-tabs">
            {Object.keys(showcaseData).map((key) => {
              const item = showcaseData[key];
              const isActive = activeShowcaseTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`umi-showcase-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveShowcaseTab(key)}
                >
                  {item.icon}
                  <span>{key === 'video' ? 'Video Live' : key === 'audio' ? 'Voice Parties' : key === 'economy' ? 'Gifting & Coins' : key === 'vip' ? 'VIP Privileges' : 'PK Battles'}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Box */}
          <div className="umi-showcase-content-box">
            <div>
              <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '8px', background: 'rgba(30, 136, 229, 0.1)', color: '#1E88E5', fontWeight: 800, fontSize: '0.8rem', marginBottom: '0.8rem' }}>
                {showcaseData[activeShowcaseTab].badge}
              </div>
              <h3 style={{ fontSize: '1.9rem', fontWeight: 850, letterSpacing: '-0.02em', color: '#0F172A', marginBottom: '1rem', lineHeight: 1.25 }}>
                {showcaseData[activeShowcaseTab].title}
              </h3>
              <p style={{ fontSize: '1.02rem', color: '#475569', lineHeight: 1.65, marginBottom: '1.8rem' }}>
                {showcaseData[activeShowcaseTab].desc}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {showcaseData[activeShowcaseTab].highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 900 }}>
                      ✓
                    </div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1E293B' }}>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '2rem', border: '1px solid #E0E6ED', boxShadow: 'var(--umi-shadow-md)', textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2.5rem', marginBottom: '1.5rem', boxShadow: '0 8px 24px rgba(30, 136, 229, 0.3)' }}>
                {activeShowcaseTab === 'video' ? '📹' : activeShowcaseTab === 'audio' ? '🎙️' : activeShowcaseTab === 'economy' ? '🪙' : activeShowcaseTab === 'vip' ? '👑' : '⚔️'}
              </div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                Enterprise Broadcasting Pipeline
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.55, maxWidth: '360px', margin: '0 auto 1.5rem' }}>
                Optimized for Android and iOS using Flutter ScreenUtil, hardware-accelerated shaders, and zero frame drops.
              </p>
              <button
                type="button"
                className="umi-btn umi-btn-secondary"
                style={{ width: '100%' }}
                onClick={onNavigateToAdmin}
              >
                <span>Manage in Admin Console</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Download App Section */}
      <section id="download" className="umi-download-section">
        <div className="umi-download-banner">
          <div>
            <div className="umi-download-badge">
              <Smartphone size={15} />
              <span>Available on Android & iOS</span>
            </div>
            <h2 className="umi-download-title">Download Umi Live Today</h2>
            <p className="umi-download-desc">
              Join thousands of creators and fans in real-time broadcasts. Stream, chat, play, and send gifts on the go with zero delay.
            </p>

            <div className="umi-download-store-row">
              <a href="#download" className="umi-store-badge-btn">
                <span style={{ fontSize: '1.4rem' }}>🤖</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Get it on</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>Google Play</div>
                </div>
              </a>

              <a href="#download" className="umi-store-badge-btn">
                <span style={{ fontSize: '1.4rem' }}>🍏</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Download on</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>App Store</div>
                </div>
              </a>

              <a href="#download" className="umi-store-badge-btn">
                <span style={{ fontSize: '1.4rem' }}>📦</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Direct Install</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>Download APK</div>
                </div>
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.2)', textAlign: 'center', width: '220px' }}>
              <div style={{ width: '160px', height: '160px', margin: '0 auto', background: '#F8FAFC', border: '2px dashed #CBD5E1', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#1E88E5' }}>
                <span style={{ fontSize: '3rem' }}>📱</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, marginTop: '4px' }}>Scan to Install</span>
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', marginTop: '0.75rem' }}>
                Scan with Camera
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                Fast direct download
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" style={{ maxWidth: '860px', margin: '0 auto 5rem', padding: '0 1.5rem' }}>
        <div className="umi-section-header">
          <span className="umi-section-badge">Got Questions?</span>
          <h2 className="umi-section-title">Frequently Asked Questions</h2>
          <p className="umi-section-subtitle">
            Everything you need to know about broadcasting, agency management, and coin rewards.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {faqs.map((faq, i) => {
            const isOpen = activeFaq === i;
            return (
              <div
                key={i}
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${isOpen ? '#1E88E5' : '#E0E6ED'}`,
                  borderRadius: '16px',
                  padding: '1.25rem 1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isOpen ? 'var(--umi-shadow-md)' : 'var(--umi-shadow-sm)',
                }}
                onClick={() => toggleFaq(i)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 750, color: '#0F172A', fontSize: '1.02rem' }}>
                  <span>{faq.q}</span>
                  <span style={{ color: '#1E88E5', fontSize: '1.2rem', transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(90deg)' : 'none' }}>
                    ›
                  </span>
                </div>
                {isOpen && (
                  <p style={{ marginTop: '0.85rem', color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="umi-footer">
        <div className="umi-footer-container">
          <div className="umi-footer-top">
            <div>
              <div className="umi-brand-logo" style={{ marginBottom: '1rem' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className="umi-brand-icon-box" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                  <Zap size={18} fill="#FFFFFF" color="#FFFFFF" />
                </div>
                <span className="umi-brand-text" style={{ fontSize: '1.2rem' }}>
                  {brandName}
                </span>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6, maxWidth: '300px', marginBottom: '1.25rem' }}>
                {brandTagline || 'Broadcasting & Live Streaming Next-Gen Social Entertainment App.'}
              </p>
              <button
                type="button"
                className="umi-btn umi-btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                onClick={onNavigateToAdmin}
              >
                <Lock size={14} />
                <span>Admin Console Portal</span>
              </button>
            </div>

            <div className="umi-footer-col">
              <h4>Platform</h4>
              <ul>
                <li><a href="#features">Video Broadcast</a></li>
                <li><a href="#live-experience">Voice Party Rooms</a></li>
                <li><a href="#vip-economy">VIP Packages</a></li>
                <li><a href="#features">PK Battle Arena</a></li>
              </ul>
            </div>

            <div className="umi-footer-col">
              <h4>Ecosystem</h4>
              <ul>
                <li><a href="#vip-economy">Coin Recharge</a></li>
                <li><a href="#features">Virtual Gifts</a></li>
                <li><a href="#faq">Agency Directory</a></li>
                <li><a href="#faq">Creator Cashout</a></li>
              </ul>
            </div>

            <div className="umi-footer-col">
              <h4>Administration</h4>
              <ul>
                <li><a href="#admin" onClick={(e) => { e.preventDefault(); onNavigateToAdmin(); }}>Staff & Admin Login</a></li>
                <li><a href="#admin" onClick={(e) => { e.preventDefault(); onNavigateToAdmin(); }}>Moderation Shield</a></li>
                <li><a href="#admin" onClick={(e) => { e.preventDefault(); onNavigateToAdmin(); }}>Stream Monitoring</a></li>
                <li><a href="#admin" onClick={(e) => { e.preventDefault(); onNavigateToAdmin(); }}>System Health</a></li>
              </ul>
            </div>
          </div>

          <div className="umi-footer-bottom">
            <span>© {new Date().getFullYear()} {brandName}. All rights reserved. Clean Blue & White Edition.</span>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <span style={{ cursor: 'pointer', color: '#64748B' }}>Privacy Policy</span>
              <span style={{ cursor: 'pointer', color: '#64748B' }}>Terms of Service</span>
              <span style={{ cursor: 'pointer', color: '#1E88E5', fontWeight: 700 }} onClick={onNavigateToAdmin}>
                Admin Access 🔐
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
