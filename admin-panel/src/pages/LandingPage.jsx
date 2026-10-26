import React, { useState, useEffect } from 'react';
import {
  Video,
  Gift,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  FileText,
  Mail,
  Calendar,
  CheckCircle2,
  Download,
  Flame,
  Radio,
  Award,
  Zap,
  Mic,
  Users,
  Star,
  Play,
  Heart,
  HelpCircle,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldAlert,
  Send,
} from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useBranding } from '../context/BrandingContext';
import './LandingPage.css';

export default function LandingPage({ activePage = 'home', onPageChange }) {
  const { brandName, resolvedLogoUrl, brandTagline } = useBranding();

  // Multi-page state: 'home' | 'privacy' | 'terms' | 'delete-account' | 'contact'
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      const h = window.location.hash.toLowerCase().replace(/^#\/?/, '');
      if (p === '/privacy' || h === 'privacy') return 'privacy';
      if (p === '/terms' || h === 'terms') return 'terms';
      if (p === '/delete-account' || h === 'delete-account') return 'delete-account';
      if (p === '/contact' || h === 'contact') return 'contact';
    }
    return activePage || 'home';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive 3D Showcase Tab state
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'gifts' | 'security' | 'economy'

  // Interactive Live Gifting Simulator State
  const [simCombo, setSimCombo] = useState(1);
  const [simActiveGift, setSimActiveGift] = useState({ name: 'Super Sports Car', icon: '🏎️', cost: '5,000 Coins' });
  const [simChatList, setSimChatList] = useState([
    { id: 1, user: 'Aisha VIP', msg: '🔥 Amazing energy on stage tonight!' },
    { id: 2, user: 'Karim Host', msg: '❤️ Thank you everyone for the love!' },
  ]);

  const handleSimSendGift = (gift) => {
    setSimActiveGift(gift);
    setSimCombo((prev) => prev + 1);
    setSimChatList((prev) => [
      ...prev.slice(-3),
      { id: Date.now(), user: 'You', msg: `🎁 Sent ${gift.name} (Combo x${simCombo + 1})` },
    ]);
  };

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  // Policy Content Loaded from Backend API
  const [privacyData, setPrivacyData] = useState({
    title: 'Privacy Policy',
    content: '',
    updatedAt: '2026-10-26',
  });
  const [termsData, setTermsData] = useState({
    title: 'Terms of Service',
    content: '',
    updatedAt: '2026-10-26',
  });
  const [supportEmail, setSupportEmail] = useState('support@umilive.com');
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  // Account Deletion Form State
  const [deleteForm, setDeleteForm] = useState({
    identifier: '',
    name: '',
    email: '',
    reason: 'Personal Decision / No Longer Using App',
    details: '',
    confirmed: false,
  });
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);

  // Synchronize Browser History & URL
  const navigateToPage = (pageName) => {
    setCurrentPage(pageName);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof window !== 'undefined') {
      const urlPath = pageName === 'home' ? '/' : `/${pageName}`;
      window.history.pushState(null, '', urlPath);
    }
    if (onPageChange) onPageChange(pageName);
  };

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase();
      const h = window.location.hash.toLowerCase().replace(/^#\/?/, '');
      if (p === '/privacy' || h === 'privacy') setCurrentPage('privacy');
      else if (p === '/terms' || h === 'terms') setCurrentPage('terms');
      else if (p === '/delete-account' || h === 'delete-account') setCurrentPage('delete-account');
      else if (p === '/contact' || h === 'contact') setCurrentPage('contact');
      else setCurrentPage('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch Public Legal Policies & Branding Contact from Backend
  useEffect(() => {
    let isMounted = true;
    const fetchPolicies = async () => {
      try {
        setLoadingPolicies(true);
        const res = await fetch('/api/public/policies');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            if (data.privacyPolicy) {
              setPrivacyData({
                title: data.privacyPolicy.title || 'Privacy Policy',
                content: data.privacyPolicy.content || '',
                updatedAt: data.privacyPolicy.updated_at || '2026-10-26',
              });
            }
            if (data.termsOfService) {
              setTermsData({
                title: data.termsOfService.title || 'Terms of Service',
                content: data.termsOfService.content || '',
                updatedAt: data.termsOfService.updated_at || '2026-10-26',
              });
            }
            if (data.supportEmail) {
              setSupportEmail(data.supportEmail);
            }
          }
        }
      } catch {
        // Fallback default
      } finally {
        if (isMounted) setLoadingPolicies(false);
      }
    };

    fetchPolicies();
    return () => {
      isMounted = false;
    };
  }, []);

  // Submit Account Deletion Request
  const handleSubmitDeleteRequest = async (e) => {
    e.preventDefault();
    if (!deleteForm.identifier.trim()) {
      alert('Please provide your User ID, Registered Email, or Phone Number.');
      return;
    }
    if (!deleteForm.confirmed) {
      alert('Please confirm that you understand the data deletion implications.');
      return;
    }

    try {
      setDeleteSubmitting(true);
      setDeleteResult(null);

      const res = await fetch('/api/public/account-deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: deleteForm.identifier.trim(),
          name: deleteForm.name.trim() || undefined,
          email: deleteForm.email.trim() || undefined,
          reason: deleteForm.reason,
          details: deleteForm.details.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteResult({
          success: true,
          message:
            data.message ||
            'Your account deletion request has been registered. Our safety team will review and process it within 24-48 hours.',
          referenceId: data.reference_id || `REQ-${Date.now().toString().slice(-4)}`,
        });
        setDeleteForm({
          identifier: '',
          name: '',
          email: '',
          reason: 'Personal Decision / No Longer Using App',
          details: '',
          confirmed: false,
        });
      } else {
        setDeleteResult({
          success: false,
          message: data.message || 'Failed to submit request. Please try again or email support.',
        });
      }
    } catch {
      setDeleteResult({
        success: false,
        message: 'Network connection error. Please try again later.',
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const faqList = [
    {
      q: 'How do I start live broadcasting as a verified creator or host?',
      a: 'Download the official mobile app, create an account, and tap the center Go Live button. You can broadcast instantly or join an official agency to receive host bonuses, dedicated room managers, and weekly rewards.',
    },
    {
      q: 'How does virtual gifting and creator earnings cashout work?',
      a: 'Viewers purchase Coins to send 3D SVGA virtual gifts. When sent, gifts convert directly to Diamonds in the host’s wallet. Creators can request instant daily withdrawals through verified banking and mobile financial channels.',
    },
    {
      q: 'How does Hardware Screen Guard protect my streaming content?',
      a: 'Our proprietary Screen Guard enforces system-level protection against unauthorized screen recording, third-party screen grabbing, and screenshots on both Android and iOS devices, protecting creators against content piracy.',
    },
    {
      q: 'Which operating systems and devices are supported?',
      a: 'The UMI LIVE app is fully optimized for all Android devices running Android 7.0+ and iOS devices running iOS 14.0+, utilizing low-battery WebRTC hardware acceleration.',
    },
  ];

  return (
    <div className="umi-landing-wrapper">
      {/* 3D Ambient Glowing Mesh */}
      <div className="umi-landing-bg-orb umi-landing-bg-orb-1" />
      <div className="umi-landing-bg-orb umi-landing-bg-orb-2" />
      <div className="umi-landing-bg-orb umi-landing-bg-orb-3" />

      {/* ====================================================================
          1. HEADER NAVBAR (100% Public, Zero Admin Buttons)
         ==================================================================== */}
      <header className="umi-navbar">
        <div className="umi-container umi-navbar-inner">
          {/* Brand Logo & Name */}
          <div className="umi-brand" onClick={() => navigateToPage('home')}>
            <div className="umi-brand-icon">
              {resolvedLogoUrl ? (
                <img
                  src={resolvedLogoUrl}
                  alt={brandName}
                  className="umi-brand-logo-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <Radio size={22} color="#ffffff" />
              )}
            </div>
            <div>
              <span className="umi-brand-title">
                {brandName}
                <Sparkles size={16} color="var(--umi-primary)" />
              </span>
              <span className="umi-brand-tagline">
                {brandTagline || 'Broadcasting & Live Social Community'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav>
            <ul className="umi-nav-links">
              <li className={`umi-nav-item ${currentPage === 'home' ? 'active' : ''}`}>
                <button type="button" onClick={() => navigateToPage('home')}>
                  Home
                </button>
              </li>
              <li className={`umi-nav-item ${currentPage === 'privacy' ? 'active' : ''}`}>
                <button type="button" onClick={() => navigateToPage('privacy')}>
                  Privacy Policy
                </button>
              </li>
              <li className={`umi-nav-item ${currentPage === 'terms' ? 'active' : ''}`}>
                <button type="button" onClick={() => navigateToPage('terms')}>
                  Terms of Service
                </button>
              </li>
              <li className={`umi-nav-item ${currentPage === 'delete-account' ? 'active' : ''}`}>
                <button type="button" onClick={() => navigateToPage('delete-account')}>
                  Delete Account
                </button>
              </li>
              <li className={`umi-nav-item ${currentPage === 'contact' ? 'active' : ''}`}>
                <button type="button" onClick={() => navigateToPage('contact')}>
                  Contact Support
                </button>
              </li>
            </ul>
          </nav>

          {/* Download App Action */}
          <div className="umi-nav-actions">
            <button
              type="button"
              className="umi-btn-nav-download"
              onClick={() => {
                const el = document.getElementById('download-app-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else navigateToPage('home');
              }}
            >
              <Download size={15} />
              <span>Get App</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="umi-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="umi-mobile-drawer">
            {[
              { id: 'home', label: 'Home' },
              { id: 'privacy', label: 'Privacy Policy' },
              { id: 'terms', label: 'Terms of Service' },
              { id: 'delete-account', label: 'Delete Account Request' },
              { id: 'contact', label: 'Contact Support' },
            ].map((nav) => (
              <button
                key={nav.id}
                type="button"
                onClick={() => navigateToPage(nav.id)}
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: currentPage === nav.id ? 'rgba(30, 136, 229, 0.08)' : 'transparent',
                  color: currentPage === nav.id ? 'var(--umi-primary)' : 'var(--umi-text-main)',
                  border: currentPage === nav.id ? '1px solid rgba(30, 136, 229, 0.25)' : 'none',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {nav.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ====================================================================
          2. PAGE ROUTER VIEWS
         ==================================================================== */}
      <main className="umi-page-body">
        {/* ================================================================
            PAGE: HOME
           ================================================================ */}
        {currentPage === 'home' && (
          <div className="umi-container">
            {/* Hero Section with 3D Stage Preview */}
            <section className="umi-hero-section">
              <div className="umi-hero-grid">
                {/* Left: Headline & CTA */}
                <div className="umi-hero-left">
                  <div className="umi-hero-badge">
                    <Flame size={14} />
                    <span>Next-Gen 3D Live Broadcasting Platform</span>
                  </div>

                  <h1 className="umi-hero-title">
                    Broadcast, Connect &amp;{' '}
                    <span className="umi-hero-gradient-text">Celebrate Live</span> In Ultra HD.
                  </h1>

                  <p className="umi-hero-desc">
                    Experience state-of-the-art multi-guest streaming with sub-100ms real-time WebRTC, 3D animated virtual gifts, hardware screen guard security, and daily creator earnings.
                  </p>

                  <div className="umi-hero-cta-group">
                    <button
                      type="button"
                      className="umi-btn-primary"
                      onClick={() => {
                        const el = document.getElementById('download-app-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <Download size={18} />
                      <span>Download Mobile App</span>
                    </button>

                    <button
                      type="button"
                      className="umi-btn-secondary"
                      onClick={() => {
                        const el = document.getElementById('interactive-demo-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <Sparkles size={18} color="var(--umi-primary)" />
                      <span>Explore 3D Demo</span>
                    </button>
                  </div>

                  {/* Trust & Activity Indicators */}
                  <div className="umi-hero-indicators">
                    <div className="umi-indicator-chip">
                      <span className="live-pulse-dot" />
                      <span>14,500+ Live Now</span>
                    </div>
                    <div className="umi-indicator-chip">
                      <Zap size={14} color="#f59e0b" />
                      <span>&lt;100ms Ultra-Low Latency</span>
                    </div>
                    <div className="umi-indicator-chip">
                      <ShieldCheck size={14} color="#10b981" />
                      <span>Hardware Anti-Leak Shield</span>
                    </div>
                  </div>
                </div>

                {/* Right: 3D Isometric Interactive Stream Stage Mockup */}
                <div className="umi-3d-stage-wrapper">
                  {/* Floating Badges */}
                  <div className="umi-float-badge umi-float-badge-top">
                    <ShieldCheck size={18} color="#059669" />
                    <span>Hardware Screen Guard Active</span>
                  </div>

                  <div className="umi-float-badge umi-float-badge-bottom">
                    <Sparkles size={18} color="#f59e0b" />
                    <span>Real-Time Paced 3D Gifting</span>
                  </div>

                  {/* 3D Tilted Card Body */}
                  <div className="umi-3d-stage-card">
                    <div className="umi-stage-screen">
                      {/* Stage Top Bar */}
                      <div className="umi-stage-topbar">
                        <div className="umi-host-profile">
                          <img
                            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop"
                            alt="Host"
                            className="umi-host-avatar"
                          />
                          <div className="umi-host-info">
                            <span className="umi-host-name">Sarah Live ⭐</span>
                            <span className="umi-host-stars">
                              <Star size={10} fill="#fbbf24" /> 1,240,500 Diamonds
                            </span>
                          </div>
                        </div>

                        <div className="umi-live-tag">
                          <Radio size={12} /> Live
                        </div>
                      </div>

                      {/* 9-Seat Guest Video Stage */}
                      <div className="umi-seats-grid">
                        {[
                          { id: 1, name: 'Host', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop', speaking: true },
                          { id: 2, name: 'Alex', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop', speaking: false },
                          { id: 3, name: 'Mona', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop', speaking: false },
                          { id: 4, name: 'Tariq', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop', speaking: true },
                          { id: 5, name: 'Zara', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&auto=format&fit=crop', speaking: false },
                          { id: 6, name: 'Seat 6', img: null, speaking: false },
                          { id: 7, name: 'Seat 7', img: null, speaking: false },
                          { id: 8, name: 'Seat 8', img: null, speaking: false },
                          { id: 9, name: 'Seat 9', img: null, speaking: false },
                        ].map((seat) => (
                          <div
                            key={seat.id}
                            className={`umi-seat-slot ${seat.speaking ? 'umi-seat-speaking' : ''}`}
                          >
                            {seat.img ? (
                              <img src={seat.img} alt={seat.name} className="umi-seat-avatar" />
                            ) : (
                              <Mic size={16} color="#64748b" />
                            )}
                            <span className="umi-seat-num">{seat.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Floating Gift Burst Effect */}
                      <div className="umi-stage-gift-burst">
                        <div className="umi-gift-left">
                          <div className="umi-gift-icon-box">{simActiveGift.icon}</div>
                          <div className="umi-gift-text">
                            <strong style={{ color: '#fff', display: 'block' }}>{simActiveGift.name}</strong>
                            <span style={{ color: '#94a3b8' }}>Sent to Sarah Live</span>
                          </div>
                        </div>
                        <div className="umi-gift-combo">x{simCombo}</div>
                      </div>

                      {/* Live Chat Ticker */}
                      <div className="umi-stage-chat-bubble">
                        <Heart size={13} color="#f43f5e" fill="#f43f5e" />
                        <span>{simChatList[simChatList.length - 1]?.msg || 'Enjoying the stream!'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Floating 3D Stats Counter Bar */}
            <div className="umi-stats-bar">
              <div className="umi-stat-item">
                <div className="umi-stat-num">10M+</div>
                <div className="umi-stat-lbl">Global Community</div>
              </div>
              <div className="umi-stat-item">
                <div className="umi-stat-num">&lt;100ms</div>
                <div className="umi-stat-lbl">WebRTC Latency</div>
              </div>
              <div className="umi-stat-item">
                <div className="umi-stat-num">150+</div>
                <div className="umi-stat-lbl">3D SVGA Gifts &amp; FX</div>
              </div>
              <div className="umi-stat-item">
                <div className="umi-stat-num">100%</div>
                <div className="umi-stat-lbl">Hardware Anti-Leak</div>
              </div>
            </div>

            {/* ============================================================
                Interactive Tab Showcase: Deep Dive into Core Tech
               ============================================================ */}
            <div className="umi-section-header">
              <div className="umi-section-badge">
                <Layers size={13} />
                <span>Next-Generation Architecture</span>
              </div>
              <h2>Engineered for Scale, Security &amp; Excitement</h2>
              <p>
                Every layer of the UMI LIVE platform is built from the ground up for high concurrency, flawless streaming quality, and creator privacy.
              </p>
            </div>

            {/* Tabs Selector */}
            <div className="umi-tabs-bar">
              {[
                { id: 'live', label: 'Multi-Guest Stage', icon: Video },
                { id: 'gifts', label: 'Server-Queued 3D Gifting', icon: Gift },
                { id: 'security', label: 'Hardware Screen Guard', icon: ShieldCheck },
                { id: 'economy', label: 'Creator Monetization', icon: Award },
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`umi-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  >
                    <IconComponent size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Showcase Card */}
            <div className="umi-showcase-box">
              {activeTab === 'live' && (
                <>
                  <div className="umi-showcase-content">
                    <h3>9 &amp; 12-Seat Interactive Audio &amp; Video Rooms</h3>
                    <p>
                      Host interactive live talk shows, karaoke battles, gaming parties, and co-hosting streams. Our ultra-low latency WebRTC pipeline ensures instant response times with zero audio lag.
                    </p>
                    <ul className="umi-showcase-bullets">
                      <li>
                        <span className="umi-bullet-check"><CheckCircle2 size={13} /></span>
                        Dynamic host seat controls: mute, lock, invite, kick, and elevate co-hosts
                      </li>
                      <li>
                        <span className="umi-bullet-check"><CheckCircle2 size={13} /></span>
                        Crystal-clear HD voice with AI ambient noise reduction
                      </li>
                      <li>
                        <span className="umi-bullet-check"><CheckCircle2 size={13} /></span>
                        Seamless late-join participant state synchronization via Redis
                      </li>
                    </ul>
                  </div>
                  <div className="umi-showcase-visual">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Radio size={22} color="var(--umi-primary)" />
                      <strong style={{ fontSize: '1rem', color: 'var(--umi-text-title)' }}>Real-Time LiveKit Mesh</strong>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--umi-text-muted)', margin: 0 }}>
                      Automatic bitrate scaling adapts instantaneously to 3G, 4G, 5G, and Wi-Fi networks so broadcasts never buffer or drop.
                    </p>
                  </div>
                </>
              )}

              {activeTab === 'gifts' && (
                <>
                  <div className="umi-showcase-content">
                    <h3>Server-Queued Paced 3D Virtual Gifting</h3>
                    <p>
                      Send luxury supercars, mythical dragons, fireworks, and customized entry effects. Our server-side FIFO dispatch queue spaces out combo taps smoothly so no animations are missed or dropped on mobile screens.
                    </p>
                    <ul className="umi-showcase-bullets">
                      <li>
                        <span className="umi-bullet-check"><CheckCircle2 size={13} /></span>
                        Anti-duplicate suppression prevents accidental double gift broadcasts
                      </li>
                      <li>
                        <span className="umi-bullet-check"><CheckCircle2 size={13} /></span>
                        Real-time wallet and receiver balance reflection in &lt;50ms
                      </li>
                      <li>
                        <span className="umi-bullet-check"><CheckCircle2 size={13} /></span>
                        SVGA full-screen hardware-accelerated rendering
                      </li>
                    </ul>
                  </div>
                  <div className="umi-showcase-visual">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Sparkles size={22} color="#f59e0b" />
                      <strong style={{ fontSize: '1rem', color: 'var(--umi-text-title)' }}>Zero Drop Queue Engine</strong>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--umi-text-muted)', margin: 0 }}>
                      Paced dispatch queue ensures viewers enjoy every spectacular sound effect and visual burst in rhythmic sequence.
                    </p>
                  </div>
                </>
              )}

              {activeTab === 'security' && (
                <>
                  <div className="umi-showcase-content">
                    <h3>Hardware-Level Screen Guard &amp; Privacy Shield</h3>
                    <p>
                      Protect your talent and original streams. System-level screen capture prevention renders a black screen on unauthorized recording tools and screenshot utilities.
                    </p>
                    <ul className="umi-showcase-bullets">
                      <li>
                        <span className="umi-bullet-check"><CheckCircle2 size={13} /></span>
                        Android FLAG_SECURE &amp; iOS UIScreen recording detection
                      </li>
                      <li>
                        <span className="umi-bullet-check"><CheckCircle2 size={13} /></span>
                        Creator bypass toggle: hosts can record or share their own screen freely
                      </li>
                      <li>
                        <span className="umi-bullet-check"><CheckCircle2 size={13} /></span>
                        Dynamic watermarking to trace and deter unauthorized reposting
                      </li>
                    </ul>
                  </div>
                  <div className="umi-showcase-visual">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldCheck size={22} color="#059669" />
                      <strong style={{ fontSize: '1rem', color: 'var(--umi-text-title)' }}>Piracy Defense System</strong>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--umi-text-muted)', margin: 0 }}>
                      Empowering creators with 100% peace of mind, knowing their proprietary live content cannot be ripped or exploited.
                    </p>
                  </div>
                </>
              )}

              {activeTab === 'economy' && (
                <>
                  <div className="umi-showcase-content">
                    <h3>Empowering Creators With Daily Earnings &amp; Rewards</h3>
                    <p>
                      Turn your creativity into a thriving career. Every gift received converts directly to Diamonds with transparent conversion ratios and direct bank withdrawals.
                    </p>
                    <ul className="umi-showcase-bullets">
                      <li>
                        <span className="umi-bullet-check"><CheckCircle2 size={13} /></span>
                        Daily automated withdrawals with transparent ledger tracking
                      </li>
                      <li>
                        <span className="umi-bullet-check"><CheckCircle2 size={13} /></span>
                        Agency host incentives: commission tiers, talent managers, and bonuses
                      </li>
                      <li>
                        <span className="umi-bullet-check"><CheckCircle2 size={13} /></span>
                        Level progression: unlock rare badges, VIP entry effects, and custom frames
                      </li>
                    </ul>
                  </div>
                  <div className="umi-showcase-visual">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Award size={22} color="var(--umi-violet)" />
                      <strong style={{ fontSize: '1rem', color: 'var(--umi-text-title)' }}>Verified Talent Rewards</strong>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--umi-text-muted)', margin: 0 }}>
                      Join over 250+ partner agencies worldwide and maximize your monthly broadcast revenue.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* ============================================================
                Interactive Live Gifting Simulator Demo On Page
               ============================================================ */}
            <section id="interactive-demo-section" className="umi-simulator-box">
              <div className="umi-section-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderColor: 'rgba(245, 158, 11, 0.25)' }}>
                <Sparkles size={14} />
                <span>Interactive Live Demo</span>
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--umi-text-title)', marginBottom: '8px' }}>
                Test The Real-Time 3D Gifting Engine
              </h2>
              <p style={{ color: 'var(--umi-text-muted)', fontSize: '1rem', maxWidth: '580px', margin: '0 auto 24px' }}>
                Click any gift below to simulate sending a virtual gift to the stage above and watch the live combo surge!
              </p>

              <div className="umi-simulator-counter-bubble">
                <span style={{ fontSize: '1.4rem' }}>{simActiveGift.icon}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--umi-text-title)' }}>
                  Current Active Gift: <strong>{simActiveGift.name}</strong>
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#f59e0b' }}>
                  Combo x{simCombo}
                </span>
              </div>

              <div className="umi-simulator-btns">
                {[
                  { name: 'Super Sports Car', icon: '🏎️', cost: '5,000 Coins' },
                  { name: 'Mythic Dragon', icon: '🐉', cost: '10,000 Coins' },
                  { name: 'Space Rocket', icon: '🚀', cost: '2,500 Coins' },
                  { name: 'Diamond Ring', icon: '💍', cost: '1,000 Coins' },
                  { name: 'Fireworks Fiesta', icon: '🎆', cost: '500 Coins' },
                ].map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => handleSimSendGift(g)}
                    className="umi-sim-btn"
                  >
                    <span>{g.icon}</span>
                    <span>{g.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Core Features Grid */}
            <div className="umi-features-grid">
              <div className="umi-feature-card">
                <div className="umi-feature-icon" style={{ background: 'rgba(30, 136, 229, 0.1)', color: '#1e88e5' }}>
                  <Video size={24} />
                </div>
                <h3>Multi-Camera Video Live</h3>
                <p>
                  Host up to 12 simultaneous video seats with interactive co-host transitions and sub-second WebRTC delivery.
                </p>
              </div>

              <div className="umi-feature-card">
                <div className="umi-feature-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
                  <Gift size={24} />
                </div>
                <h3>Paced 3D SVGA Animations</h3>
                <p>
                  Send spectacular screen-wide animations with sequential server pacing so no user taps are ever lost.
                </p>
              </div>

              <div className="umi-feature-card">
                <div className="umi-feature-icon" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                  <ShieldCheck size={24} />
                </div>
                <h3>Anti-Recording Screen Guard</h3>
                <p>
                  Hardware-enforced anti-recording shield eliminates content ripping and unauthorized screen captures.
                </p>
              </div>

              <div className="umi-feature-card">
                <div className="umi-feature-icon" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
                  <Award size={24} />
                </div>
                <h3>Creator Economy &amp; Cashout</h3>
                <p>
                  Instant coin-to-diamond conversion with daily direct withdrawals to verified mobile and bank accounts.
                </p>
              </div>

              <div className="umi-feature-card">
                <div className="umi-feature-icon" style={{ background: 'rgba(217, 70, 239, 0.1)', color: '#d946ef' }}>
                  <Sparkles size={24} />
                </div>
                <h3>VIP Privileges &amp; Themes</h3>
                <p>
                  Custom entrance banners, animated luxury frames, unique profile thumbnails, and room wallpapers.
                </p>
              </div>

              <div className="umi-feature-card">
                <div className="umi-feature-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
                  <Users size={24} />
                </div>
                <h3>Agency Talent Network</h3>
                <p>
                  Professional agency portal for recruiting, tracking monthly broadcasting hours, and team commission payouts.
                </p>
              </div>
            </div>

            {/* ============================================================
                Download Mobile App Banner
               ============================================================ */}
            <section id="download-app-section" className="umi-download-banner">
              <div className="umi-download-left">
                <h2>Ready To Go Live? Download UMI LIVE Now</h2>
                <p>
                  Available on Google Play and Apple App Store. Start streaming, meet new friends, and enjoy interactive virtual gifting anywhere in the world.
                </p>

                <div className="umi-download-badges-row">
                  <a
                    href="#download"
                    className="umi-download-badge-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Redirecting to Google Play Store APK download...');
                    }}
                  >
                    <span className="umi-download-badge-icon">🤖</span>
                    <div className="umi-download-badge-text">
                      <div className="umi-download-badge-sub">GET IT ON</div>
                      <div className="umi-download-badge-main">Google Play</div>
                    </div>
                  </a>

                  <a
                    href="#download"
                    className="umi-download-badge-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Redirecting to Apple App Store (iOS TestFlight / App Store)...');
                    }}
                  >
                    <span className="umi-download-badge-icon">🍏</span>
                    <div className="umi-download-badge-text">
                      <div className="umi-download-badge-sub">DOWNLOAD ON THE</div>
                      <div className="umi-download-badge-main">App Store</div>
                    </div>
                  </a>

                  <a
                    href="#download"
                    className="umi-download-badge-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Direct Android APK download initiated.');
                    }}
                  >
                    <span className="umi-download-badge-icon">📦</span>
                    <div className="umi-download-badge-text">
                      <div className="umi-download-badge-sub">DIRECT PACKAGE</div>
                      <div className="umi-download-badge-main">Android APK</div>
                    </div>
                  </a>
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-block', padding: '20px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                  <div style={{ width: '130px', height: '130px', background: 'linear-gradient(135deg, #1e88e5 0%, #7c3aed 100%)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                    <Smartphone size={40} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, marginTop: '6px' }}>Scan To Install</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================================
                Frequently Asked Questions (FAQ) Accordion
               ============================================================ */}
            <section className="umi-faq-section">
              <div className="umi-section-header">
                <div className="umi-section-badge">
                  <HelpCircle size={13} />
                  <span>Questions &amp; Answers</span>
                </div>
                <h2>Frequently Asked Questions</h2>
                <p>
                  Everything you need to know about our broadcasting tools, security, and monetization.
                </p>
              </div>

              {faqList.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={item.q} className={`umi-faq-item ${isOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="umi-faq-question"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        size={18}
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          color: isOpen ? 'var(--umi-primary)' : 'var(--umi-text-dim)',
                        }}
                      />
                    </button>
                    {isOpen && <div className="umi-faq-answer">{item.a}</div>}
                  </div>
                );
              })}
            </section>
          </div>
        )}

        {/* ================================================================
            PAGE: PRIVACY POLICY
           ================================================================ */}
        {currentPage === 'privacy' && (
          <div className="umi-container">
            <div className="umi-page-header">
              <div className="umi-page-badge">
                <ShieldCheck size={14} />
                <span>Data Protection &amp; Safety</span>
              </div>
              <h1 className="umi-page-title">{privacyData.title}</h1>
              <p className="umi-page-subtitle">
                Learn how {brandName} collects, uses, and safeguards your personal data across our services.
              </p>
            </div>

            <div className="umi-doc-card">
              <div className="umi-doc-meta">
                <div className="umi-doc-date">
                  <Calendar size={15} />
                  <span>Last Updated: {privacyData.updatedAt}</span>
                </div>
                <div className="umi-doc-actions">
                  <button
                    type="button"
                    className="umi-btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                    onClick={() => window.print()}
                  >
                    <span>Print Policy</span>
                  </button>
                </div>
              </div>

              {loadingPolicies ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--umi-text-dim)' }}>
                  Loading official policy document...
                </div>
              ) : (
                <MarkdownRenderer content={privacyData.content} />
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            PAGE: TERMS OF SERVICE
           ================================================================ */}
        {currentPage === 'terms' && (
          <div className="umi-container">
            <div className="umi-page-header">
              <div className="umi-page-badge">
                <FileText size={14} />
                <span>User Agreement</span>
              </div>
              <h1 className="umi-page-title">{termsData.title}</h1>
              <p className="umi-page-subtitle">
                Please review the rules, rights, and conduct expectations when using the {brandName} platform.
              </p>
            </div>

            <div className="umi-doc-card">
              <div className="umi-doc-meta">
                <div className="umi-doc-date">
                  <Calendar size={15} />
                  <span>Last Updated: {termsData.updatedAt}</span>
                </div>
                <div className="umi-doc-actions">
                  <button
                    type="button"
                    className="umi-btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                    onClick={() => window.print()}
                  >
                    <span>Print Terms</span>
                  </button>
                </div>
              </div>

              {loadingPolicies ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--umi-text-dim)' }}>
                  Loading official terms document...
                </div>
              ) : (
                <MarkdownRenderer content={termsData.content} />
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            PAGE: DELETE ACCOUNT REQUEST
           ================================================================ */}
        {currentPage === 'delete-account' && (
          <div className="umi-container">
            <div className="umi-page-header">
              <div className="umi-page-badge" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.25)' }}>
                <ShieldAlert size={14} />
                <span>User Rights &amp; Data Erasure</span>
              </div>
              <h1 className="umi-page-title">Submit Account Deletion Request</h1>
              <p className="umi-page-subtitle">
                Under Google Play and Apple App Store user privacy requirements, you can permanently erase your account, profile, coins, and data.
              </p>
            </div>

            <div className="umi-form-card">
              {deleteResult && (
                <div className={`umi-alert ${deleteResult.success ? 'umi-alert-success' : 'umi-alert-error'}`}>
                  {deleteResult.success ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
                  <div>
                    <div>{deleteResult.message}</div>
                    {deleteResult.referenceId && (
                      <div style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                        Ticket Reference ID: <span style={{ color: 'var(--umi-primary)', fontWeight: 700 }}>{deleteResult.referenceId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitDeleteRequest}>
                <div className="umi-form-group">
                  <label className="umi-form-label">
                    Account Identifier (User ID, Email, or Phone)<span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={deleteForm.identifier}
                    onChange={(e) => setDeleteForm({ ...deleteForm, identifier: e.target.value })}
                    placeholder="e.g. User ID 12345 or your@email.com"
                    className="umi-input"
                  />
                  <small style={{ color: 'var(--umi-text-dim)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                    Provide the identifier linked with your mobile app account.
                  </small>
                </div>

                <div className="umi-form-group">
                  <label className="umi-form-label">Full Name (Optional)</label>
                  <input
                    type="text"
                    value={deleteForm.name}
                    onChange={(e) => setDeleteForm({ ...deleteForm, name: e.target.value })}
                    placeholder="Your name as displayed in app"
                    className="umi-input"
                  />
                </div>

                <div className="umi-form-group">
                  <label className="umi-form-label">Contact Email For Confirmation (Optional)</label>
                  <input
                    type="email"
                    value={deleteForm.email}
                    onChange={(e) => setDeleteForm({ ...deleteForm, email: e.target.value })}
                    placeholder="Where we can send confirmation"
                    className="umi-input"
                  />
                </div>

                <div className="umi-form-group">
                  <label className="umi-form-label">Reason For Deletion</label>
                  <select
                    value={deleteForm.reason}
                    onChange={(e) => setDeleteForm({ ...deleteForm, reason: e.target.value })}
                    className="umi-input"
                  >
                    <option value="Personal Decision / No Longer Using App">Personal Decision / No Longer Using App</option>
                    <option value="Privacy Concerns">Privacy Concerns</option>
                    <option value="Creating a New Account">Creating a New Account</option>
                    <option value="Temporary Break">Temporary Break</option>
                    <option value="Other Reasons">Other Reasons</option>
                  </select>
                </div>

                <div className="umi-form-group">
                  <label className="umi-form-label">Additional Feedback (Optional)</label>
                  <textarea
                    value={deleteForm.details}
                    onChange={(e) => setDeleteForm({ ...deleteForm, details: e.target.value })}
                    placeholder="Tell us how we could have made your experience better..."
                    className="umi-input"
                  />
                </div>

                <div className="umi-form-group">
                  <label className="umi-checkbox-label">
                    <input
                      type="checkbox"
                      checked={deleteForm.confirmed}
                      onChange={(e) => setDeleteForm({ ...deleteForm, confirmed: e.target.checked })}
                    />
                    <span>
                      I understand that account deletion is <strong>permanent and irreversible</strong>. All unused coins, diamonds, stream history, and friend connections will be wiped completely.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={deleteSubmitting}
                  className="umi-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                >
                  {deleteSubmitting ? 'Submitting Request...' : 'Confirm Account Deletion Request'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================
            PAGE: CONTACT SUPPORT
           ================================================================ */}
        {currentPage === 'contact' && (
          <div className="umi-container">
            <div className="umi-page-header">
              <div className="umi-page-badge">
                <Mail size={14} />
                <span>Help &amp; Inquiries</span>
              </div>
              <h1 className="umi-page-title">Contact {brandName} Support</h1>
              <p className="umi-page-subtitle">
                Our global trust &amp; operations team is available 24/7 to assist creators and community members.
              </p>
            </div>

            <div style={{ maxWidth: '720px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div className="umi-feature-card" style={{ textAlign: 'center' }}>
                <div className="umi-feature-icon" style={{ margin: '0 auto 16px', background: 'rgba(30, 136, 229, 0.1)', color: '#1e88e5' }}>
                  <Mail size={24} />
                </div>
                <h3>Official Support Email</h3>
                <p style={{ marginBottom: '14px', color: 'var(--umi-text-muted)' }}>
                  For general inquiries, account assistance, and agency partnerships.
                </p>
                <a
                  href={`mailto:${supportEmail}`}
                  style={{ color: 'var(--umi-primary)', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}
                >
                  {supportEmail}
                </a>
              </div>

              <div className="umi-feature-card" style={{ textAlign: 'center' }}>
                <div className="umi-feature-icon" style={{ margin: '0 auto 16px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                  <ShieldCheck size={24} />
                </div>
                <h3>Data Protection Officer</h3>
                <p style={{ marginBottom: '14px', color: 'var(--umi-text-muted)' }}>
                  For GDPR/CCPA inquiries, data export, or deletion inquiries.
                </p>
                <button
                  type="button"
                  className="umi-btn-secondary"
                  style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                  onClick={() => navigateToPage('delete-account')}
                >
                  <span>Submit Data Request</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ====================================================================
          3. FOOTER (100% Public, ZERO Admin Login Buttons or Links)
         ==================================================================== */}
      <footer className="umi-footer">
        <div className="umi-container">
          <div className="umi-footer-grid">
            {/* Col 1: Brand Info */}
            <div className="umi-footer-col">
              <div className="umi-brand" style={{ marginBottom: '14px' }} onClick={() => navigateToPage('home')}>
                <div className="umi-brand-icon" style={{ width: '36px', height: '36px' }}>
                  {resolvedLogoUrl ? (
                    <img src={resolvedLogoUrl} alt={brandName} className="umi-brand-logo-img" />
                  ) : (
                    <Radio size={18} color="#ffffff" />
                  )}
                </div>
                <span className="umi-brand-title" style={{ fontSize: '1.2rem' }}>
                  {brandName}
                </span>
              </div>
              <p style={{ color: 'var(--umi-text-dim)', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: '280px', margin: 0 }}>
                {brandTagline || 'Ultra-low latency live broadcasting, interactive gifting, and real-time social community.'}
              </p>
            </div>

            {/* Col 2: Navigation */}
            <div className="umi-footer-col">
              <h5>Navigation</h5>
              <ul className="umi-footer-links">
                <li><button type="button" onClick={() => navigateToPage('home')}>Home</button></li>
                <li><button type="button" onClick={() => navigateToPage('privacy')}>Privacy Policy</button></li>
                <li><button type="button" onClick={() => navigateToPage('terms')}>Terms of Service</button></li>
                <li><button type="button" onClick={() => navigateToPage('delete-account')}>Delete Account</button></li>
              </ul>
            </div>

            {/* Col 3: Compliance & Trust */}
            <div className="umi-footer-col">
              <h5>Compliance &amp; Trust</h5>
              <ul className="umi-footer-links">
                <li><button type="button" onClick={() => navigateToPage('privacy')}>Data Protection Policy</button></li>
                <li><button type="button" onClick={() => navigateToPage('delete-account')}>User Rights &amp; Erasure</button></li>
                <li><button type="button" onClick={() => navigateToPage('terms')}>Community Guidelines</button></li>
                <li><button type="button" onClick={() => navigateToPage('contact')}>Contact Support</button></li>
              </ul>
            </div>

            {/* Col 4: Mobile Apps (Replaced Admin Console with App Downloads) */}
            <div className="umi-footer-col">
              <h5>Get The App</h5>
              <p style={{ color: 'var(--umi-text-dim)', fontSize: '0.82rem', marginBottom: '14px', lineHeight: 1.5 }}>
                Available on Android and iOS devices. Join the live party today.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a
                  href="#download"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Redirecting to Google Play...');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    background: '#ffffff',
                    border: '1px solid var(--umi-border)',
                    borderRadius: '10px',
                    color: 'var(--umi-text-title)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: 'var(--umi-shadow-sm)',
                    width: 'fit-content',
                  }}
                >
                  <span>🤖 Google Play Store</span>
                </a>
                <a
                  href="#download"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Redirecting to Apple App Store...');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    background: '#ffffff',
                    border: '1px solid var(--umi-border)',
                    borderRadius: '10px',
                    color: 'var(--umi-text-title)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: 'var(--umi-shadow-sm)',
                    width: 'fit-content',
                  }}
                >
                  <span>🍏 Apple App Store</span>
                </a>
              </div>
            </div>
          </div>

          <div className="umi-footer-bottom">
            <div>
              &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
            </div>
            <div>
              Compliant with Google Play Store &amp; Apple App Store Data Safety Standards.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
