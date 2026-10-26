import React, { useState, useEffect } from 'react';
import {
  Video,
  Gift,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Lock,
  ChevronRight,
  ExternalLink,
  Menu,
  X,
  FileText,
  AlertTriangle,
  UserX,
  HelpCircle,
  Mail,
  Calendar,
  CheckCircle2,
  Download,
  Flame,
  Radio,
  Award,
} from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useBranding } from '../context/BrandingContext';
import './LandingPage.css';

export default function LandingPage({ onNavigateToAdmin, activePage = 'home', onPageChange }) {
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

  // Fetch Public Policies & Content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoadingPolicies(true);
        const [pRes, tRes] = await Promise.all([
          fetch('/api/public/privacy-policy').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/public/terms').then((r) => (r.ok ? r.json() : null)),
        ]);

        if (pRes && pRes.success) {
          setPrivacyData({
            title: pRes.title || pRes.policy?.title || 'Privacy Policy',
            content: pRes.content || pRes.policy?.content || '',
            updatedAt: pRes.updated_at || pRes.policy?.updatedAt || '2026-10-26',
          });
          if (pRes.support_email || pRes.policy?.supportEmail) {
            setSupportEmail(pRes.support_email || pRes.policy?.supportEmail);
          }
        }
        if (tRes && tRes.success) {
          setTermsData({
            title: tRes.title || tRes.terms?.title || 'Terms of Service',
            content: tRes.content || tRes.terms?.content || '',
            updatedAt: tRes.updated_at || tRes.terms?.updatedAt || '2026-10-26',
          });
        }
      } catch (err) {
        console.error('Failed to load public policies:', err);
      } finally {
        setLoadingPolicies(false);
      }
    };

    fetchContent();
  }, []);

  // Handle Account Deletion Form Submission
  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    if (!deleteForm.identifier.trim()) {
      alert('Please provide your registered User ID, Email, or Phone number.');
      return;
    }
    if (!deleteForm.confirmed) {
      alert('Please confirm that you understand this action is permanent.');
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
    } catch (err) {
      setDeleteResult({
        success: false,
        message: 'Network connection error. Please try again later.',
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="umi-landing-wrapper">
      {/* Background Glowing Ambient Orbs */}
      <div className="umi-landing-bg-orb umi-landing-bg-orb-1" />
      <div className="umi-landing-bg-orb umi-landing-bg-orb-2" />
      <div className="umi-landing-bg-orb umi-landing-bg-orb-3" />

      {/* ====================================================================
          1. HEADER NAVBAR (Multi-Page Navigation)
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
                <Sparkles size={16} color="#ff80ee" />
              </span>
              <span className="umi-brand-tagline">
                {brandTagline || 'Broadcasting & Live Community'}
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
                  Contact
                </button>
              </li>
            </ul>
          </nav>

          {/* Right Header Actions */}
          <div className="umi-nav-actions">
            <button
              type="button"
              className="umi-btn-admin"
              onClick={onNavigateToAdmin}
              title="Admin Console Login"
            >
              <Lock size={14} />
              <span>Admin Portal</span>
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
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: currentPage === nav.id ? 'rgba(30, 136, 229, 0.08)' : 'transparent',
                  color: currentPage === nav.id ? '#1e88e5' : '#334155',
                  border: currentPage === nav.id ? '1px solid rgba(30, 136, 229, 0.25)' : 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
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
            {/* Hero Section */}
            <section className="umi-hero-section">
              <div className="umi-page-badge">
                <Flame size={14} />
                <span>Next-Gen Live Broadcasting Platform</span>
              </div>
              <h1 className="umi-hero-title">
                Experience Real-Time <br />
                <span className="umi-hero-gradient-text">Interactive Live Streaming</span>
              </h1>
              <p className="umi-hero-desc">
                Join millions of global creators, broadcast in ultra-low latency HD video &amp; audio,
                send exclusive 3D animated virtual gifts, and climb the progression leaderboards.
              </p>

              {/* Action Buttons */}
              <div className="umi-hero-cta-group">
                <a
                  href="#download"
                  className="umi-btn-primary"
                  onClick={() => alert('App Store & Google Play links are live! Download the app from your store.')}
                >
                  <Download size={18} />
                  <span>Download Mobile App</span>
                </a>
                <button
                  type="button"
                  className="umi-btn-secondary"
                  onClick={() => navigateToPage('privacy')}
                >
                  <FileText size={18} />
                  <span>View Privacy Policy</span>
                </button>
                <button
                  type="button"
                  className="umi-btn-secondary"
                  onClick={() => navigateToPage('delete-account')}
                >
                  <UserX size={18} />
                  <span>Data Deletion Request</span>
                </button>
              </div>

              {/* Statistics Highlights */}
              <div className="umi-stats-bar">
                <div className="umi-stat-item">
                  <div className="umi-stat-num">10M+</div>
                  <div className="umi-stat-lbl">Active Viewers</div>
                </div>
                <div className="umi-stat-item">
                  <div className="umi-stat-num">&lt;200ms</div>
                  <div className="umi-stat-lbl">Ultra Low Latency</div>
                </div>
                <div className="umi-stat-item">
                  <div className="umi-stat-num">500+</div>
                  <div className="umi-stat-lbl">3D Virtual Gifts</div>
                </div>
                <div className="umi-stat-item">
                  <div className="umi-stat-num">99.99%</div>
                  <div className="umi-stat-lbl">Uptime SLA</div>
                </div>
              </div>
            </section>

            {/* Core Features Showcase */}
            <section style={{ marginBottom: '60px' }}>
              <div className="umi-section-header">
                <h2>Engineered for Creators &amp; Superfans</h2>
                <p>
                  Industry-leading broadcasting tools with state-of-the-art privacy protection and real-time moderation.
                </p>
              </div>

              <div className="umi-features-grid">
                <div className="umi-feature-card">
                  <div className="umi-feature-icon" style={{ background: 'rgba(255, 128, 238, 0.1)', color: '#ff80ee' }}>
                    <Video size={26} />
                  </div>
                  <h3>Multi-Guest Live Streaming</h3>
                  <p>
                    Host 9-seat interactive audio and video parties. Invite co-hosts, take live questions, and entertain fans seamlessly.
                  </p>
                </div>

                <div className="umi-feature-card">
                  <div className="umi-feature-icon" style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#a855f7' }}>
                    <Gift size={26} />
                  </div>
                  <h3>Special Effects &amp; Gifting</h3>
                  <p>
                    Send animated SVGA &amp; GIF gifts with screen-wide effects, fire dragons, luxury supercars, and VIP entry banners.
                  </p>
                </div>

                <div className="umi-feature-card">
                  <div className="umi-feature-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                    <ShieldCheck size={26} />
                  </div>
                  <h3>Hardware Screen Guard</h3>
                  <p>
                    Built-in privacy protection prevents unauthorized screenshots and stream screen recordings to safeguard creators.
                  </p>
                </div>

                <div className="umi-feature-card">
                  <div className="umi-feature-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <Award size={26} />
                  </div>
                  <h3>VIP Tiers &amp; Progression</h3>
                  <p>
                    Level up from Bronze to Royal Deity, earning custom avatar frames, floating profile badges, and cashout rewards.
                  </p>
                </div>

                <div className="umi-feature-card">
                  <div className="umi-feature-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <Smartphone size={26} />
                  </div>
                  <h3>Cross-Platform Mobile</h3>
                  <p>
                    Optimized for Android &amp; iOS devices with adaptive bitrate streaming that works smoothly on all mobile networks.
                  </p>
                </div>

                <div className="umi-feature-card">
                  <div className="umi-feature-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                    <UserX size={26} />
                  </div>
                  <h3>Complete Data Control</h3>
                  <p>
                    Self-service account deletion and complete data removal compliance meeting Google Play and Apple App Store mandates.
                  </p>
                </div>
              </div>
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
                <FileText size={14} />
                <span>Legal &amp; Compliance</span>
              </div>
              <h1 className="umi-page-title">{privacyData.title}</h1>
              <p className="umi-page-subtitle">
                We are dedicated to safeguarding your personal data, rights, and account security.
              </p>
            </div>

            <div className="umi-doc-card">
              <div className="umi-doc-meta">
                <div className="umi-doc-date">
                  <Calendar size={15} color="#ff80ee" />
                  <span>Effective Date: {privacyData.updatedAt || 'October 26, 2026'}</span>
                </div>
                <div className="umi-doc-actions">
                  <button
                    type="button"
                    className="umi-btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                    onClick={() => navigateToPage('delete-account')}
                  >
                    <UserX size={14} />
                    <span>Delete Account Request</span>
                  </button>
                </div>
              </div>

              {loadingPolicies ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  Loading latest privacy documentation...
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
                <ShieldCheck size={14} />
                <span>User Agreement</span>
              </div>
              <h1 className="umi-page-title">{termsData.title}</h1>
              <p className="umi-page-subtitle">
                Please review our terms and community rules before participating in live rooms or purchasing virtual items.
              </p>
            </div>

            <div className="umi-doc-card">
              <div className="umi-doc-meta">
                <div className="umi-doc-date">
                  <Calendar size={15} color="#ff80ee" />
                  <span>Effective Date: {termsData.updatedAt || 'October 26, 2026'}</span>
                </div>
              </div>

              {loadingPolicies ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  Loading terms of service...
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
              <div className="umi-page-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <UserX size={14} />
                <span>Account Deletion &amp; Data Erasure</span>
              </div>
              <h1 className="umi-page-title">Request Account Deletion</h1>
              <p className="umi-page-subtitle">
                In compliance with Google Play Store &amp; Apple App Store guidelines, you can request permanent deletion of your account and personal data here.
              </p>
            </div>

            <div className="umi-form-card">
              {deleteResult && (
                <div className={deleteResult.success ? 'umi-alert umi-alert-success' : 'umi-alert umi-alert-error'}>
                  {deleteResult.success ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                      {deleteResult.success ? 'Request Registered Successfully' : 'Submission Failed'}
                    </div>
                    <div>{deleteResult.message}</div>
                    {deleteResult.referenceId && (
                      <div style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                        Ticket Reference ID: <span style={{ color: 'var(--umi-blue)', fontWeight: 700 }}>{deleteResult.referenceId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleDeleteSubmit}>
                <div className="umi-form-group">
                  <label className="umi-form-label">
                    User ID, Registered Email, or Phone Number <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="umi-input"
                    placeholder="e.g. 10042 or user@example.com"
                    value={deleteForm.identifier}
                    onChange={(e) => setDeleteForm({ ...deleteForm, identifier: e.target.value })}
                    required
                  />
                  <small style={{ color: 'var(--umi-text-dim)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                    Enter the User ID or credentials associated with your account.
                  </small>
                </div>

                <div className="umi-form-group">
                  <label className="umi-form-label">Full Name or In-App Profile Nickname</label>
                  <input
                    type="text"
                    className="umi-input"
                    placeholder="Your profile display name"
                    value={deleteForm.name}
                    onChange={(e) => setDeleteForm({ ...deleteForm, name: e.target.value })}
                  />
                </div>

                <div className="umi-form-group">
                  <label className="umi-form-label">Contact Email for Confirmation</label>
                  <input
                    type="email"
                    className="umi-input"
                    placeholder="email@example.com"
                    value={deleteForm.email}
                    onChange={(e) => setDeleteForm({ ...deleteForm, email: e.target.value })}
                  />
                </div>

                <div className="umi-form-group">
                  <label className="umi-form-label">Reason for Deletion</label>
                  <select
                    className="umi-input"
                    value={deleteForm.reason}
                    onChange={(e) => setDeleteForm({ ...deleteForm, reason: e.target.value })}
                  >
                    <option value="Personal Decision / No Longer Using App">Personal Decision / No Longer Using App</option>
                    <option value="Privacy or Data Security Concerns">Privacy or Data Security Concerns</option>
                    <option value="Creating a New Account">Creating a New Account</option>
                    <option value="App Performance or Device Storage">App Performance or Device Storage</option>
                    <option value="Other">Other Reasons</option>
                  </select>
                </div>

                <div className="umi-form-group">
                  <label className="umi-form-label">Additional Feedback (Optional)</label>
                  <textarea
                    className="umi-input"
                    placeholder="Tell us what we could have improved..."
                    value={deleteForm.details}
                    onChange={(e) => setDeleteForm({ ...deleteForm, details: e.target.value })}
                  ></textarea>
                </div>

                <div className="umi-form-group">
                  <label className="umi-checkbox-label">
                    <input
                      type="checkbox"
                      checked={deleteForm.confirmed}
                      onChange={(e) => setDeleteForm({ ...deleteForm, confirmed: e.target.checked })}
                      required
                    />
                    <span>
                      I understand that deleting my account is irreversible. All virtual coins, diamonds, VIP memberships, and chat histories will be permanently destroyed.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="umi-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                  disabled={deleteSubmitting}
                >
                  <UserX size={18} />
                  <span>{deleteSubmitting ? 'Submitting Request...' : 'Submit Account Deletion Request'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================
            PAGE: CONTACT & SUPPORT
           ================================================================ */}
        {currentPage === 'contact' && (
          <div className="umi-container">
            <div className="umi-page-header">
              <div className="umi-page-badge">
                <HelpCircle size={14} />
                <span>Help &amp; Inquiries</span>
              </div>
              <h1 className="umi-page-title">Contact &amp; Customer Support</h1>
              <p className="umi-page-subtitle">
                Have questions regarding your account, agency registration, coin top-ups, or privacy rights? We are here to assist.
              </p>
            </div>

            <div style={{ maxWidth: '720px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div className="umi-feature-card" style={{ textAlign: 'center' }}>
                <div className="umi-feature-icon" style={{ margin: '0 auto 16px', background: 'rgba(255, 128, 238, 0.1)', color: '#ff80ee' }}>
                  <Mail size={24} />
                </div>
                <h3>Official Support Email</h3>
                <p style={{ marginBottom: '14px' }}>
                  For general inquiries, account assistance, and agency partnerships.
                </p>
                <a
                  href={`mailto:${supportEmail}`}
                  style={{ color: 'var(--umi-blue)', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}
                >
                  {supportEmail}
                </a>
              </div>

              <div className="umi-feature-card" style={{ textAlign: 'center' }}>
                <div className="umi-feature-icon" style={{ margin: '0 auto 16px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
                  <ShieldCheck size={24} />
                </div>
                <h3>Data Protection Officer</h3>
                <p style={{ marginBottom: '14px' }}>
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
          3. FOOTER
         ==================================================================== */}
      <footer className="umi-footer">
        <div className="umi-container">
          <div className="umi-footer-grid">
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
              <p style={{ color: 'var(--umi-text-dim)', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: '280px' }}>
                {brandTagline || 'Ultra-low latency live streaming and real-time social community.'}
              </p>
            </div>

            <div className="umi-footer-col">
              <h5>Navigation</h5>
              <ul className="umi-footer-links">
                <li><button type="button" onClick={() => navigateToPage('home')}>Home</button></li>
                <li><button type="button" onClick={() => navigateToPage('privacy')}>Privacy Policy</button></li>
                <li><button type="button" onClick={() => navigateToPage('terms')}>Terms of Service</button></li>
                <li><button type="button" onClick={() => navigateToPage('delete-account')}>Delete Account</button></li>
              </ul>
            </div>

            <div className="umi-footer-col">
              <h5>Compliance</h5>
              <ul className="umi-footer-links">
                <li><button type="button" onClick={() => navigateToPage('privacy')}>Data Protection Policy</button></li>
                <li><button type="button" onClick={() => navigateToPage('delete-account')}>User Rights &amp; Erasure</button></li>
                <li><button type="button" onClick={() => navigateToPage('terms')}>Community Guidelines</button></li>
                <li><button type="button" onClick={() => navigateToPage('contact')}>Contact Support</button></li>
              </ul>
            </div>

            <div className="umi-footer-col">
              <h5>Platform Administration</h5>
              <p style={{ color: 'var(--umi-text-dim)', fontSize: '0.82rem', marginBottom: '14px', lineHeight: 1.5 }}>
                Authorized admin &amp; moderation portal for operations team.
              </p>
              <button
                type="button"
                className="umi-btn-admin"
                onClick={onNavigateToAdmin}
                style={{ width: 'fit-content' }}
              >
                <Lock size={13} />
                <span>Admin Console</span>
              </button>
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
