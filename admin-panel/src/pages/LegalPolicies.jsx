import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  FileText,
  Save,
  ExternalLink,
  Eye,
  Edit3,
  Columns,
  Maximize2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Mail,
  Calendar,
  Lock,
  Globe,
} from 'lucide-react';
import legalApi from '../api/legalApi';
import Loader from '../components/Loader';
import MarkdownRenderer from '../components/MarkdownRenderer';
import './LegalPolicies.css';

// Default Standard Google Play / Apple App Store Compliant Privacy Policy Template
const DEFAULT_PRIVACY_TEMPLATE = `## UMI LIVE Privacy Policy
**Effective Date:** 2026-10-26

Welcome to **UMI LIVE**! Your privacy and trust are our top priorities. This Privacy Policy describes how we collect, store, protect, and use your personal data when you use our mobile application and streaming services.

---

### 1. Information We Collect
To provide a secure and seamless streaming experience, we collect:
- **Account Details:** User ID, profile name, avatar, email address, and authentication provider.
- **Audio & Video Streams:** Live stream data transmitted during your live broadcasts and multi-guest voice rooms.
- **Wallet & Transactions:** Coin recharges, virtual gift receipts, diamonds converted, and withdrawal records.
- **Device & Security Logs:** Hardware identifiers, IP address, and anti-fraud fraud signals to protect against malicious activities.

### 2. Device Permissions Required
Our application requests explicit permissions for:
- **Camera & Microphone:** Required solely for live video broadcasting and joining multi-guest audio stages.
- **Storage & Photos:** Used only when you choose to upload a custom profile picture, avatar, or room thumbnail.
- **Notifications:** Used to notify you of followed hosts going live and critical account alerts.

### 3. Screen Guard & Anti-Recording Protection
UMI LIVE integrates **hardware-grade screen capture blocking** and screenshot deterrents within live streaming rooms to protect broadcasters against unauthorized recording, privacy infringement, and content theft.

### 4. Virtual Gifts, Coins & Monetization
- All purchases of in-app coins are processed securely via verified payment gateways.
- Coins and virtual gifts are platform entertainment tokens.
- Hosts can convert received diamond gifts into eligible withdrawals in accordance with our Agency and Host Compensation Rules.

### 5. User Data Deletion Rights
Under Google Play Store and Apple App Store policies, you have the right to request full account and data deletion at any time:
- Navigate to **Profile > Settings > Account Security > Request Account Deletion** inside the mobile app.
- Or submit a request directly through our web portal or via email to **support@umilive.com**.
- Upon verified deletion, your personal profile, chat history, and identity records will be permanently erased.

### 6. Contact Us
For any privacy concerns, data protection requests, or legal inquiries, reach out to our legal compliance team at:
**Email:** support@umilive.com  
**Platform:** UMI LIVE Global Operations`;

const DEFAULT_TERMS_TEMPLATE = `## UMI LIVE Terms of Service
**Effective Date:** 2026-10-26

Please read these Terms of Service carefully before creating an account or broadcasting on **UMI LIVE**.

---

### 1. Agreement to Terms
By downloading, registering, or accessing the UMI LIVE platform, you agree to comply with and be bound by these Terms. If you do not agree, you must immediately uninstall and discontinue using our services.

### 2. Eligibility & Community Guidelines
- You must be at least 18 years of age (or legal age in your jurisdiction) to use streaming and gifting features.
- Zero tolerance for harassment, hate speech, vulgarity, illegal activities, or explicit nudity.
- Violators will face immediate ban, device blacklisting, and coin forfeiture.

### 3. Virtual Coins, Gifts & Wallets
- In-app virtual coins have no real-world currency value outside the platform and cannot be directly refunded once spent.
- Resellers and official agencies operate under strict compliance monitoring. Any fraudulent coin generation or chargebacks result in instant account termination.

### 4. Intellectual Property
Broadcasters retain ownership of original performance content while granting UMI LIVE a non-exclusive license to transmit and showcase broadcast streams on the network.

### 5. Termination
UMI LIVE reserves the right to suspend or permanently terminate any account that violates platform security, circumvents screen recording protections, or abuses gifting systems.`;

export default function LegalPolicies({ onToast }) {
  const [activeTab, setActiveTab] = useState('privacy'); // 'privacy' | 'terms'
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'editor-only' | 'preview-only'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form Fields
  const [privacyTitle, setPrivacyTitle] = useState('UMI LIVE - Privacy Policy');
  const [privacyContent, setPrivacyContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState('2026-10-26');
  const [termsTitle, setTermsTitle] = useState('UMI LIVE - Terms of Service');
  const [termsContent, setTermsContent] = useState('');
  const [supportEmail, setSupportEmail] = useState('support@umilive.com');

  const textareaRef = useRef(null);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await legalApi.getLegalPolicies();
      if (res.success) {
        if (res.privacyPolicy) {
          setPrivacyTitle(res.privacyPolicy.title || 'UMI LIVE - Privacy Policy');
          setPrivacyContent(res.privacyPolicy.content || DEFAULT_PRIVACY_TEMPLATE);
          setUpdatedAt(res.privacyPolicy.updatedAt || '2026-10-26');
        }
        if (res.termsOfService) {
          setTermsTitle(res.termsOfService.title || 'UMI LIVE - Terms of Service');
          setTermsContent(res.termsOfService.content || DEFAULT_TERMS_TEMPLATE);
        }
        if (res.supportEmail) {
          setSupportEmail(res.supportEmail);
        }
      }
    } catch (err) {
      console.error('fetchPolicies error:', err);
      onToast('Failed to load legal policies.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const currentTitle = activeTab === 'privacy' ? privacyTitle : termsTitle;
  const currentContent = activeTab === 'privacy' ? privacyContent : termsContent;

  const setCurrentTitle = (val) => {
    if (activeTab === 'privacy') setPrivacyTitle(val);
    else setTermsTitle(val);
  };

  const setCurrentContent = (val) => {
    if (activeTab === 'privacy') setPrivacyContent(val);
    else setTermsContent(val);
  };

  // Content Statistics
  const wordCount = (currentContent.trim().match(/\S+/g) || []).length;
  const charCount = currentContent.length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Quick Markdown Insertion
  const handleInsert = (prefix, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentContent;

    const selectedText = text.substring(start, end) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setCurrentContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onToast('Markdown copied to clipboard!', 'success');
    } catch (e) {
      onToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleLoadTemplate = () => {
    if (window.confirm('Replace current editor text with standard compliant template?')) {
      if (activeTab === 'privacy') {
        setPrivacyContent(DEFAULT_PRIVACY_TEMPLATE);
      } else {
        setTermsContent(DEFAULT_TERMS_TEMPLATE);
      }
      onToast('Standard policy template loaded!', 'info');
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const today = new Date().toISOString().split('T')[0];
      setUpdatedAt(today);

      const res = await legalApi.updateLegalPolicies({
        privacyTitle,
        privacyContent,
        updatedAt: today,
        termsTitle,
        termsContent,
        supportEmail,
      });

      if (res.success) {
        onToast('Policies published live! App and web cache refreshed.', 'success');
      } else {
        onToast(res.message || 'Failed to update legal policies.', 'error');
      }
    } catch (err) {
      onToast(err.message || 'Error updating policies.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = activeTab === 'privacy' ? '/privacy' : '/terms';

  return (
    <div className="legal-studio-container">
      {/* 1. ELEGANT HEADER BAR */}
      <div className="legal-header-card">
        <div className="legal-header-info">
          <div className="legal-icon-box">
            <Shield size={24} />
          </div>
          <div className="legal-title-wrap">
            <h1>
              Legal Policy &amp; Terms Studio
              <span className="legal-sync-badge">
                <span className="legal-pulse-dot" />
                Live App Sync
              </span>
            </h1>
            <p>
              Manage public policies for Google Play, Apple App Store, and your web portal.
            </p>
          </div>
        </div>

        <div className="legal-header-actions">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="legal-btn-ghost"
            title="Open the live public view in new tab"
          >
            <span>Preview Public Page</span>
            <ExternalLink size={13} />
          </a>

          <button
            type="button"
            className="legal-btn-publish"
            onClick={handleSave}
            disabled={saving || loading}
          >
            <Save size={15} />
            <span>{saving ? 'Publishing...' : 'Save & Publish Live'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <Loader inline />
          <div style={{ marginTop: '0.85rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            Loading legal policies...
          </div>
        </div>
      ) : (
        <>
          {/* 2. SUB-BAR: TABS, TITLE & STATS */}
          <div className="legal-control-bar">
            {/* Document Tabs */}
            <div className="legal-tab-group">
              <button
                type="button"
                className={`legal-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
                onClick={() => setActiveTab('privacy')}
              >
                <Lock size={14} />
                <span>Privacy Policy</span>
              </button>
              <button
                type="button"
                className={`legal-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
                onClick={() => setActiveTab('terms')}
              >
                <FileText size={14} />
                <span>Terms of Service</span>
              </button>
            </div>

            {/* Document Title Input */}
            <div className="legal-title-input-wrap">
              <input
                type="text"
                className="legal-title-input"
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
                placeholder="Document Title"
                title="Public Document Title"
              />
            </div>

            {/* Content Stats & View Mode Toggle */}
            <div className="legal-meta-pills">
              <div className="legal-stat-pill" title="Content Word Count">
                <strong>{wordCount}</strong> words
              </div>
              <div className="legal-stat-pill" title="Estimated Reading Time">
                ~{readTimeMin} min read
              </div>
              <div className="legal-stat-pill" title="Last Updated Date">
                <Calendar size={12} />
                <span>{updatedAt}</span>
              </div>

              {/* View Switcher: Split | Editor | Preview */}
              <div className="legal-view-switcher">
                <button
                  type="button"
                  className={`legal-view-btn ${viewMode === 'split' ? 'active' : ''}`}
                  onClick={() => setViewMode('split')}
                  title="Split 50/50 Editor and Live Preview"
                >
                  <Columns size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Split
                </button>
                <button
                  type="button"
                  className={`legal-view-btn ${viewMode === 'editor-only' ? 'active' : ''}`}
                  onClick={() => setViewMode('editor-only')}
                  title="Editor Only"
                >
                  <Edit3 size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Editor
                </button>
                <button
                  type="button"
                  className={`legal-view-btn ${viewMode === 'preview-only' ? 'active' : ''}`}
                  onClick={() => setViewMode('preview-only')}
                  title="Preview Only"
                >
                  <Eye size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Preview
                </button>
              </div>
            </div>
          </div>

          {/* 3. WORKSPACE: EDITOR & LIVE PREVIEW */}
          <div className={`legal-workspace ${viewMode}`}>
            {/* LEFT / TOP: MARKDOWN EDITOR */}
            {viewMode !== 'preview-only' && (
              <div className="legal-editor-card">
                {/* TOOLBAR */}
                <div className="legal-toolbar">
                  <div className="legal-tool-group">
                    <button
                      type="button"
                      className="legal-tool-btn"
                      onClick={() => handleInsert('**', '**', 'bold text')}
                      title="Bold (**Text**)"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      className="legal-tool-btn"
                      style={{ fontStyle: 'italic' }}
                      onClick={() => handleInsert('*', '*', 'italic text')}
                      title="Italic (*Text*)"
                    >
                      I
                    </button>
                    <div className="legal-tool-divider" />
                    <button
                      type="button"
                      className="legal-tool-btn"
                      onClick={() => handleInsert('## ', '\n', 'Section Heading')}
                      title="Heading 2 (## Heading)"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      className="legal-tool-btn"
                      onClick={() => handleInsert('### ', '\n', 'Subheading')}
                      title="Heading 3 (### Subheading)"
                    >
                      H3
                    </button>
                    <div className="legal-tool-divider" />
                    <button
                      type="button"
                      className="legal-tool-btn"
                      onClick={() => handleInsert('- ', '\n', 'List item')}
                      title="Bullet List (- item)"
                    >
                      •
                    </button>
                    <button
                      type="button"
                      className="legal-tool-btn"
                      onClick={() => handleInsert('1. ', '\n', 'Numbered item')}
                      title="Numbered List (1. item)"
                    >
                      1.
                    </button>
                    <button
                      type="button"
                      className="legal-tool-btn"
                      onClick={() => handleInsert('> ', '\n', 'Important note or quote')}
                      title="Blockquote (> Quote)"
                    >
                      ❝
                    </button>
                    <button
                      type="button"
                      className="legal-tool-btn"
                      onClick={() => handleInsert('[', '](https://)', 'Link text')}
                      title="Insert Link [Text](URL)"
                    >
                      🔗
                    </button>
                    <button
                      type="button"
                      className="legal-tool-btn"
                      onClick={() => handleInsert('`', '`', 'code')}
                      title="Inline Code (`code`)"
                    >
                      &lt;/&gt;
                    </button>
                    <button
                      type="button"
                      className="legal-tool-btn"
                      onClick={() => handleInsert('\n---\n', '', '')}
                      title="Horizontal Divider (---)"
                    >
                      ―
                    </button>
                  </div>

                  <div className="legal-tool-group">
                    <button
                      type="button"
                      className="legal-tool-quick-action"
                      onClick={handleLoadTemplate}
                      title="Load standard compliant policy template"
                    >
                      <RotateCcw size={12} />
                      <span>Standard Template</span>
                    </button>
                    <button
                      type="button"
                      className="legal-tool-quick-action"
                      onClick={handleCopyMarkdown}
                      title="Copy all markdown text"
                    >
                      {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* TEXTAREA */}
                <textarea
                  ref={textareaRef}
                  className="legal-textarea"
                  value={currentContent}
                  onChange={(e) => setCurrentContent(e.target.value)}
                  placeholder="Write policy markdown content here..."
                  spellCheck="false"
                />
              </div>
            )}

            {/* RIGHT / BOTTOM: LIVE PUBLIC PREVIEW */}
            {viewMode !== 'editor-only' && (
              <div className="legal-preview-card">
                {/* Simulated Browser Bar */}
                <div className="legal-preview-browser-bar">
                  <div className="legal-mac-dots">
                    <span className="legal-dot legal-dot-red" />
                    <span className="legal-dot legal-dot-yellow" />
                    <span className="legal-dot legal-dot-green" />
                  </div>

                  <div className="legal-url-pill">
                    <Globe size={11} />
                    <span>umilive.com{publicUrl}</span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    Exact Public Render
                  </div>
                </div>

                {/* Rendered Document */}
                <div className="legal-preview-content">
                  <MarkdownRenderer content={currentContent} />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
