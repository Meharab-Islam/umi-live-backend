import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  Eye,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Shield,
  HelpCircle,
  Mail,
  Calendar,
} from 'lucide-react';
import legalApi from '../api/legalApi';
import Loader from '../components/Loader';

export default function LegalPolicies({ onToast }) {
  const [activeTab, setActiveTab] = useState('privacy'); // 'privacy' | 'terms'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [privacyTitle, setPrivacyTitle] = useState('UMI LIVE - Privacy Policy');
  const [privacyContent, setPrivacyContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState('2026-10-26');
  const [termsTitle, setTermsTitle] = useState('UMI LIVE - Terms of Service');
  const [termsContent, setTermsContent] = useState('');
  const [supportEmail, setSupportEmail] = useState('support@umilive.com');

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await legalApi.getLegalPolicies();
      if (res.success) {
        if (res.privacyPolicy) {
          setPrivacyTitle(res.privacyPolicy.title || 'UMI LIVE - Privacy Policy');
          setPrivacyContent(res.privacyPolicy.content || '');
          setUpdatedAt(res.privacyPolicy.updatedAt || '2026-10-26');
        }
        if (res.termsOfService) {
          setTermsTitle(res.termsOfService.title || 'UMI LIVE - Terms of Service');
          setTermsContent(res.termsOfService.content || '');
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

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const res = await legalApi.updateLegalPolicies({
        privacyTitle,
        privacyContent,
        updatedAt,
        termsTitle,
        termsContent,
        supportEmail,
      });

      if (res.success) {
        onToast('Legal policies published successfully! Public landing page updated.', 'success');
      } else {
        onToast(res.message || 'Failed to update legal policies.', 'error');
      }
    } catch (err) {
      onToast(err.message || 'Error updating policies.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Simple Markdown renderer for live preview
  const renderMarkdown = (text) => {
    if (!text) return '<p style="color: var(--text-dim); font-style: italic;">No content to preview.</p>';

    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/^### (.*$)/gim, '<h4 style="color: #38bdf8; margin: 18px 0 8px; font-size: 1.05rem;">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="color: #fff; margin: 22px 0 10px; font-size: 1.25rem;">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 style="color: #fff; margin: 24px 0 12px; font-size: 1.4rem;">$1</h2>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong style="color: #fff;">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" style="color: #38bdf8; text-decoration: underline;" target="_blank">$1</a>');
    html = html.replace(/^\- (.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 4px;">$1</li>');

    return html
      .split('\n\n')
      .map((p) => {
        if (p.startsWith('<h') || p.startsWith('<li')) return p;
        return `<p style="margin-bottom: 12px; line-height: 1.6; color: #cbd5e1;">${p}</p>`;
      })
      .join('');
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Privacy Policy &amp; Legal Hub</h1>
          <p className="page-description">
            Customize and publish your live Privacy Policy, Terms of Service, and compliance documentation. These documents are dynamically rendered on the public landing page and inside the mobile application.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px' }}
          >
            <span>Preview Public Landing Page</span>
            <ExternalLink size={14} />
          </a>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving || loading}
            style={{ gap: '6px' }}
          >
            <Save size={14} />
            <span>{saving ? 'Publishing...' : 'Save & Publish Live'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <Loader inline />
          <div style={{ marginTop: '1rem', color: 'var(--text-dim)' }}>Loading legal documents...</div>
        </div>
      ) : (
        <>
          {/* Tab Selection */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'privacy' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('privacy')}
              style={{ gap: '6px' }}
            >
              <FileText size={14} />
              <span>Privacy Policy</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'terms' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('terms')}
              style={{ gap: '6px' }}
            >
              <Shield size={14} />
              <span>Terms of Service</span>
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Meta Settings Card */}
              <div className="panel-card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
                  Configuration &amp; Compliance Details
                </h3>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">
                    {activeTab === 'privacy' ? 'Privacy Policy Document Title' : 'Terms Document Title'}
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={activeTab === 'privacy' ? privacyTitle : termsTitle}
                    onChange={(e) =>
                      activeTab === 'privacy' ? setPrivacyTitle(e.target.value) : setTermsTitle(e.target.value)
                    }
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Effective / Updated Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={updatedAt}
                      onChange={(e) => setUpdatedAt(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Support / DPO Email</label>
                    <input
                      type="email"
                      className="input-field"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="support@umilive.com"
                    />
                  </div>
                </div>
              </div>

              {/* Tips & Instructions Card */}
              <div className="panel-card" style={{ padding: '1.25rem', background: 'rgba(56, 189, 248, 0.05)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginBottom: '0.5rem' }}>
                  <Sparkles size={18} />
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Live App Store Compliance</h4>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Google Play &amp; Apple App Store require a publicly accessible Privacy Policy and a direct Account Deletion mechanism. Any updates saved here are instantly cached and served at <code>/privacy</code> and <code>/delete-account</code> on the web server.
                </p>
              </div>
            </div>

            {/* Split Editor: Markdown Source vs Live Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Left Column: Markdown Editor */}
              <div className="panel-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                    Markdown Content Source
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Supports ## Headings, **Bold**, - Lists, [Links]
                  </span>
                </div>

                <textarea
                  className="input-field"
                  style={{
                    minHeight: '520px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                    resize: 'vertical',
                  }}
                  value={activeTab === 'privacy' ? privacyContent : termsContent}
                  onChange={(e) =>
                    activeTab === 'privacy' ? setPrivacyContent(e.target.value) : setTermsContent(e.target.value)
                  }
                  placeholder="Enter markdown content..."
                  required
                ></textarea>
              </div>

              {/* Right Column: Live Formatted Preview */}
              <div className="panel-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <Eye size={16} color="var(--primary)" />
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
                    Live Customer Preview
                  </span>
                </div>

                <div
                  style={{
                    flex: 1,
                    minHeight: '520px',
                    maxHeight: '620px',
                    overflowY: 'auto',
                    padding: '1rem',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(activeTab === 'privacy' ? privacyContent : termsContent),
                  }}
                ></div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ padding: '12px 28px', gap: '8px' }}
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save & Publish Live Policy'}</span>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
