import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  Eye,
  ExternalLink,
  Shield,
  Calendar,
  Mail,
  Code,
} from 'lucide-react';
import legalApi from '../api/legalApi';
import Loader from '../components/Loader';
import MarkdownRenderer from '../components/MarkdownRenderer';

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
        onToast('Legal policies published live! Website and mobile cache updated.', 'success');
      } else {
        onToast(res.message || 'Failed to update legal policies.', 'error');
      }
    } catch (err) {
      onToast(err.message || 'Error updating policies.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentTitle = activeTab === 'privacy' ? privacyTitle : termsTitle;
  const currentContent = activeTab === 'privacy' ? privacyContent : termsContent;

  return (
    <div className="page-container">
      {/* Page Header with Single Primary Publish Action */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Privacy Policy &amp; Terms Management</h1>
          <p className="page-description">
            Edit markdown policies for your mobile app and website. Live changes are instantly rendered on <code>/privacy</code> and <code>/terms</code>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href={activeTab === 'privacy' ? '/privacy' : '/terms'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px' }}
          >
            <span>View Public Page</span>
            <ExternalLink size={13} />
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
        <div style={{ padding: '3.5rem', textAlign: 'center' }}>
          <Loader inline />
          <div style={{ marginTop: '0.75rem', color: 'var(--text-dim)' }}>Loading policies...</div>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          {/* Clean Document Switcher & Meta Fields */}
          <div
            className="panel-card"
            style={{
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            {/* Tab Selection */}
            <div style={{ display: 'flex', gap: '8px' }}>
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

            {/* Document Title & Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Title:</span>
                <input
                  type="text"
                  className="input-field"
                  value={currentTitle}
                  onChange={(e) =>
                    activeTab === 'privacy' ? setPrivacyTitle(e.target.value) : setTermsTitle(e.target.value)
                  }
                  style={{ width: '240px', height: '34px', fontSize: '0.82rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={13} color="var(--text-dim)" />
                <input
                  type="date"
                  className="input-field"
                  value={updatedAt}
                  onChange={(e) => setUpdatedAt(e.target.value)}
                  style={{ width: '135px', height: '34px', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={13} color="var(--text-dim)" />
                <input
                  type="email"
                  className="input-field"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@umilive.com"
                  style={{ width: '170px', height: '34px', fontSize: '0.82rem' }}
                />
              </div>
            </div>
          </div>

          {/* Side-by-Side: Markdown Source Editor & Real Customer Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* Left: Markdown Editor */}
            <div className="panel-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  <Code size={14} color="var(--primary)" />
                  <span>Markdown Source</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  Supports ## Headers, **Bold**, - Lists, [Links]
                </span>
              </div>

              <textarea
                className="input-field"
                style={{
                  flex: 1,
                  minHeight: '560px',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  lineHeight: 1.65,
                  resize: 'vertical',
                }}
                value={currentContent}
                onChange={(e) =>
                  activeTab === 'privacy' ? setPrivacyContent(e.target.value) : setTermsContent(e.target.value)
                }
                placeholder="Enter markdown content here..."
                required
              ></textarea>
            </div>

            {/* Right: Real Customer Markdown Output Preview */}
            <div className="panel-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                <Eye size={14} color="#10b981" />
                <span>Exact Public Output Preview</span>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: '560px',
                  maxHeight: '680px',
                  overflowY: 'auto',
                  padding: '1.25rem',
                  background: 'rgba(10, 15, 28, 0.75)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <MarkdownRenderer content={currentContent} />
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
