import React, { useState, useEffect } from 'react';
import {
  Crown,
  ShieldCheck,
  Mic,
  TrendingUp,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import packageApi from '../api/packageApi';
import Loader from '../components/Loader';

export default function CreateCategory({ onNavigate, onToast }) {
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    display_order: 1,
    cant_be_removed: true,
    cant_be_banned: true,
    self_seat_accept: true,
    top_live_list: true,
    anti_mute: false,
    special_entry: true,
    is_active: true,
  });

  // Load existing categories to calculate default next display_order and show order preview
  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await packageApi.getCategories();
      if (res.success) {
        const list = res.categories || [];
        setCategories(list);
        if (list.length > 0) {
          const highestOrder = Math.max(...list.map((c) => c.display_order || 0));
          setFormData((prev) => ({ ...prev, display_order: highestOrder + 1 }));
        }
      }
    } catch (err) {
      if (onToast) onToast(err.message, 'error');
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleReorder = async (index, direction) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= categories.length) return;

    const list = [...categories];
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;

    const payload = list.map((c, i) => ({ id: c.id, display_order: i + 1 }));
    setCategories(list);

    try {
      await packageApi.reorderCategories(payload);
      if (onToast) onToast('Live ranking priority updated!', 'success');
      window.dispatchEvent(new Event('categories-updated'));
    } catch (err) {
      if (onToast) onToast(err.message, 'error');
      loadCategories();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      if (onToast) onToast('Category name is required.', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await packageApi.createCategory(formData);
      if (res.success) {
        if (onToast) onToast(res.message || `Category "${formData.name}" created successfully!`, 'success');
        // Notify sidebar
        window.dispatchEvent(new Event('categories-updated'));

        // Navigate directly to the newly created category's view
        if (res.categoryId && onNavigate) {
          onNavigate(`vip-${res.categoryId}`);
        } else if (onNavigate) {
          onNavigate('packages');
        }
      }
    } catch (err) {
      if (onToast) onToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: '3.5rem' }}>
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => (onNavigate ? onNavigate('packages') : window.history.back())}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px', padding: '0.45rem 0.9rem' }}
        >
          <ArrowLeft size={15} />
          <span>Back to Packages</span>
        </button>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          VIP Category Configuration
        </span>
      </div>

      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.25)',
          borderRadius: '16px',
          padding: '1.5rem 1.75rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 6px 16px rgba(124, 58, 237, 0.3)',
            flexShrink: 0,
          }}
        >
          <Crown size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Create VIP Category
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--text-dim)' }}>
            Configure a new VIP tier with exclusive live room privileges, explore ranking priorities, and immunity perks.
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.75rem', alignItems: 'flex-start' }}>
        {/* Left Column: Form */}
        <div className="panel-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Tier Identity */}
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color="#7c3aed" />
                <span>Tier Information</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Category Name: *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. King, Duke, Knight, VIP Diamond"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{ fontSize: '0.9rem' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
                    This name will appear on user profiles, packages, and live badges.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Priority Rank (#): *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 1 })}
                    required
                    style={{ fontSize: '0.9rem' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
                    Rank 1 displays first on Live list.
                  </span>
                </div>
              </div>
            </div>

            {/* Room & Live Privileges */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="#10b981" />
                <span>Room & Broadcaster Privileges</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '0 0 1rem' }}>
                Users holding a package of this category automatically receive these privileges in live rooms:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* 1. Anti-Kick */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: formData.cant_be_removed ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-primary)',
                    border: formData.cant_be_removed ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.cant_be_removed}
                    onChange={(e) => setFormData({ ...formData, cant_be_removed: e.target.checked })}
                    style={{ marginTop: '3px', accentColor: '#10b981' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', display: 'block' }}>
                      🛡️ Anti-Kick (Cannot be removed from room)
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                      Room hosts and moderators cannot kick or remove this user from any live room.
                    </span>
                  </div>
                </label>

                {/* 2. Anti-Ban */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: formData.cant_be_banned ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-primary)',
                    border: formData.cant_be_banned ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.cant_be_banned}
                    onChange={(e) => setFormData({ ...formData, cant_be_banned: e.target.checked })}
                    style={{ marginTop: '3px', accentColor: '#10b981' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', display: 'block' }}>
                      🚫 Anti-Ban (Cannot be banned from room)
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                      Room admins cannot ban this member from joining or speaking.
                    </span>
                  </div>
                </label>

                {/* 3. Auto-Seat Approval */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: formData.self_seat_accept ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-primary)',
                    border: formData.self_seat_accept ? '1px solid rgba(124, 58, 237, 0.35)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.self_seat_accept}
                    onChange={(e) => setFormData({ ...formData, self_seat_accept: e.target.checked })}
                    style={{ marginTop: '3px', accentColor: '#7c3aed' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', display: 'block' }}>
                      🎙️ Self-Seat Approval (Auto-accept mic seat)
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                      User can accept their own seat request and immediately speak without waiting for host approval.
                    </span>
                  </div>
                </label>

                {/* 4. Top Live Ranking */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: formData.top_live_list ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-primary)',
                    border: formData.top_live_list ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.top_live_list}
                    onChange={(e) => setFormData({ ...formData, top_live_list: e.target.checked })}
                    style={{ marginTop: '3px', accentColor: '#06b6d4' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', display: 'block' }}>
                      🚀 Top Live Explore Ranking
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                      When this user hosts a live room, it is recommended at the top of the explore feed according to priority rank.
                    </span>
                  </div>
                </label>

                {/* 5. Special Entrance */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: formData.special_entry ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-primary)',
                    border: formData.special_entry ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.special_entry}
                    onChange={(e) => setFormData({ ...formData, special_entry: e.target.checked })}
                    style={{ marginTop: '3px', accentColor: '#f59e0b' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', display: 'block' }}>
                      ✨ Special Entrance Animation
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                      Displays VIP entrance banner and room notification when joining any live room.
                    </span>
                  </div>
                </label>

                {/* 6. Anti-Mute Immunity */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: formData.anti_mute ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-primary)',
                    border: formData.anti_mute ? '1px solid rgba(124, 58, 237, 0.35)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.anti_mute}
                    onChange={(e) => setFormData({ ...formData, anti_mute: e.target.checked })}
                    style={{ marginTop: '3px', accentColor: '#7c3aed' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', display: 'block' }}>
                      🔇 Anti-Mute Immunity
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                      Cannot be muted by moderators in broadcast rooms.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Active Toggle & Submit */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                />
                <span>Active Tier (Visible to users)</span>
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => (onNavigate ? onNavigate('packages') : window.history.back())}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ minWidth: '150px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {saving ? <Loader inline /> : <Crown size={16} />}
                  <span>{saving ? 'Creating...' : 'Create Category'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Existing Categories Preview & Live Order */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Order Hierarchy Info */}
          <div className="panel-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <TrendingUp size={18} color="#7c3aed" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Live Ranking Priority Hierarchy
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '0 0 1rem' }}>
              The live stream explore list orders active broadcaster rooms strictly by Category Priority Rank. (Rank #1 appears before Rank #2, etc.)
            </p>

            {loadingCategories ? (
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <Loader inline />
              </div>
            ) : categories.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-primary)', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-dim)' }}>
                  No existing categories yet. This will be your first VIP Category (#1)!
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {categories.map((cat, idx) => (
                  <div
                    key={cat.id}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: 'rgba(124, 58, 237, 0.12)',
                          color: '#7c3aed',
                        }}
                      >
                        #{cat.display_order}
                      </span>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cat.name}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleReorder(idx, 'up')}
                        disabled={idx === 0}
                        style={{ padding: '3px 6px', borderRadius: '6px' }}
                        title="Move Priority Up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleReorder(idx, 'down')}
                        disabled={idx === categories.length - 1}
                        style={{ padding: '3px 6px', borderRadius: '6px' }}
                        title="Move Priority Down"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-time Tier Preview */}
          <div className="panel-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#d97706" />
              <span>Real-Time Category Preview</span>
            </div>

            <div
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem',
                borderLeft: '4px solid #7c3aed',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                  {formData.name.trim() || 'New Category Name'}
                </strong>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: 'rgba(124, 58, 237, 0.1)',
                    color: '#7c3aed',
                    fontWeight: 800,
                  }}
                >
                  Rank #{formData.display_order}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '0.65rem' }}>
                {formData.cant_be_removed && (
                  <span className="badge badge-secondary" style={{ fontSize: '0.68rem', color: '#10b981' }}>
                    🛡️ Anti-Kick
                  </span>
                )}
                {formData.cant_be_banned && (
                  <span className="badge badge-secondary" style={{ fontSize: '0.68rem', color: '#10b981' }}>
                    🚫 Anti-Ban
                  </span>
                )}
                {formData.self_seat_accept && (
                  <span className="badge badge-secondary" style={{ fontSize: '0.68rem', color: '#7c3aed' }}>
                    🎙️ Auto-Seat
                  </span>
                )}
                {formData.top_live_list && (
                  <span className="badge badge-secondary" style={{ fontSize: '0.68rem', color: '#06b6d4' }}>
                    🚀 Top Live Rank
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
