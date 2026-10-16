import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Users,
  Coins,
  Sparkles,
  Calendar,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Search,
  ExternalLink,
  Gift,
  X,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import giftApi from '../api/giftApi';
import Loader from '../components/Loader';

export default function TopContributors({ onToast }) {
  // Period filter: 'month' (default) | '30days' | 'today' | 'all'
  const [period, setPeriod] = useState('month');

  // Contributors & Summary data
  const [data, setData] = useState({
    summary: { total_coins_spent: 0, total_transactions: 0, total_active_gifters: 0 },
    contributors: [],
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Clear History Modal State
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearPeriod, setClearPeriod] = useState('all');

  // Breakdown Modal State (View individual contributor's recipients)
  const [breakdownUser, setBreakdownUser] = useState(null);
  const [breakdownData, setBreakdownData] = useState(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  const fetchContributors = async () => {
    try {
      setLoading(true);
      const res = await giftApi.getTopContributors({ period });
      if (res.success) {
        setData({
          summary: res.summary || { total_coins_spent: 0, total_transactions: 0, total_active_gifters: 0 },
          contributors: res.contributors || [],
        });
      }
    } catch (err) {
      onToast(err.message || 'Failed to fetch top contributors.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributors();
  }, [period]);

  const handleClearHistory = async () => {
    try {
      setClearing(true);
      const res = await giftApi.clearGiftHistory({ period: clearPeriod });
      if (res.success) {
        onToast(res.message || 'Gift history cleared successfully.', 'success');
        setClearModalOpen(false);
        fetchContributors();
        if (breakdownUser) {
          setBreakdownUser(null);
          setBreakdownData(null);
        }
      }
    } catch (err) {
      onToast(err.message || 'Failed to clear gift history.', 'error');
    } finally {
      setClearing(false);
    }
  };

  const handleOpenBreakdown = async (user) => {
    try {
      setBreakdownUser(user);
      setBreakdownData(null);
      setLoadingBreakdown(true);
      const res = await giftApi.getUserContributions(user.user_id);
      if (res.success) {
        setBreakdownData(res);
      }
    } catch (err) {
      onToast(err.message || 'Failed to load user contribution breakdown.', 'error');
    } finally {
      setLoadingBreakdown(false);
    }
  };

  // Filter contributors by search term
  const filtered = data.contributors.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      String(c.user_id).includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.mobile_number?.toLowerCase().includes(q)
    );
  });

  const top3 = filtered.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Banner */}
      <div className="panel-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                }}
              >
                <Trophy size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Top Gifting Contributors</span>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    LEADERBOARD
                  </span>
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: '0.2rem 0 0' }}>
                  Live ranking of users who spent the most coins gifting broadcasters this month.
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchContributors}
              disabled={loading}
              title="Refresh Leaderboard"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            {/* Clear History Button (Admin Purge) */}
            <button
              className="btn btn-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
              }}
              onClick={() => setClearModalOpen(true)}
              title="Reset or Clear gift records"
            >
              <Trash2 size={14} />
              <span>Clear Gift History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Pills & Search Bar */}
      <div className="panel-card" style={{ padding: '0.9rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Period Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', marginRight: '0.35rem' }}>
              Filter:
            </span>
            {[
              { id: 'month', label: '📅 This Month' },
              { id: '30days', label: '⏳ Last 30 Days' },
              { id: 'today', label: '⚡ Today' },
              { id: 'all', label: '🌟 All Time' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: period === p.id ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                  background: period === p.id ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-primary)',
                  color: period === p.id ? '#f59e0b' : 'var(--text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: period === p.id ? 800 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search by name, ID, email..."
              className="input-field"
              style={{ paddingLeft: '32px', fontSize: '0.82rem', height: '34px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="panel-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 800 }}>TOTAL COINS GIFTED</span>
            <span style={{ fontSize: '1.4rem' }}>🪙</span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-main)' }}>
            {data.summary.total_coins_spent.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            Gift coins spent ({period === 'month' ? 'current month' : period})
          </div>
        </div>

        <div className="panel-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(79, 70, 229, 0.05))', border: '1px solid rgba(99, 102, 241, 0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#6366f1', fontWeight: 800 }}>ACTIVE CONTRIBUTORS</span>
            <Users size={22} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-main)' }}>
            {data.summary.total_active_gifters.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            Unique gifting supporters
          </div>
        </div>

        <div className="panel-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05))', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 800 }}>GIFT TRANSACTIONS</span>
            <Sparkles size={22} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-main)' }}>
            {data.summary.total_transactions.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            Gift packets successfully delivered
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {top3.map((c, index) => {
            const medals = [
              { label: 'Champion', color: '#f59e0b', medal: '🥇', bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.08))', border: '#f59e0b' },
              { label: 'Runner Up', color: '#94a3b8', medal: '🥈', bg: 'linear-gradient(135deg, rgba(148, 163, 184, 0.22), rgba(100, 116, 139, 0.08))', border: '#94a3b8' },
              { label: 'Bronze Rank', color: '#d97706', medal: '🥉', bg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.22), rgba(180, 83, 9, 0.08))', border: '#d97706' },
            ];
            const m = medals[index];

            return (
              <div
                key={c.user_id}
                className="panel-card"
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: m.bg,
                  border: `1.5px solid ${m.border}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', top: '12px', right: '14px', fontSize: '1.6rem' }}>
                  {m.medal}
                </div>

                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
                  <img
                    src={c.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={c.full_name}
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `3px solid ${m.border}`,
                      boxShadow: `0 4px 16px ${m.border}40`,
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      background: m.border,
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      padding: '2px 7px',
                      borderRadius: '10px',
                    }}
                  >
                    #{c.rank}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.25rem' }}>
                  {c.full_name}
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.72rem', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '6px', color: 'var(--text-dim)' }}>
                    ID: #{c.user_id}
                  </span>
                  {c.vip_category && c.vip_category !== 'Standard' && (
                    <span style={{ fontSize: '0.72rem', background: `${c.vip_color || '#7c3aed'}25`, color: c.vip_color || '#7c3aed', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      {c.vip_badge} {c.vip_category}
                    </span>
                  )}
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)', fontWeight: 700 }}>COINS GIFTED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.15rem' }}>
                    🪙 {c.total_coins_gifted.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    {c.total_gifts_sent} gifts sent to {c.total_recipients} hosts
                  </div>
                </div>

                {/* Button to view who they gifted to */}
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', fontSize: '0.78rem', justifyContent: 'center' }}
                  onClick={() => handleOpenBreakdown(c)}
                >
                  <Gift size={13} />
                  <span>View Recipient Breakdown</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Leaderboard Table */}
      <div className="panel-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
              Contributor Rankings ({filtered.length})
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0.2rem 0 0' }}>
              Highest gifting spenders sorted descending. Click "Breakdown" to view individual recipients.
            </p>
          </div>
        </div>

        {loading ? (
          <Loader text="Loading contributor rankings..." size="md" />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            <Trophy size={48} style={{ opacity: 0.3, marginBottom: '0.85rem' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>No contributors found for this period.</div>
            <div style={{ fontSize: '0.82rem', marginTop: '0.35rem' }}>
              {period === 'month' ? 'No gifts sent in this month yet, or gift history was cleared.' : 'Try selecting another time range.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.5rem', width: '60px', textAlign: 'center' }}>RANK</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>CONTRIBUTOR</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>COINS GIFTED</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>GIFTS SENT</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>HOSTS SUPPORTED</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>LAST ACTIVITY</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '130px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const medalMap = { 1: '🥇', 2: '🥈', 3: '🥉' };
                  return (
                    <tr
                      key={c.user_id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.12s',
                      }}
                    >
                      {/* Rank */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>
                        {medalMap[c.rank] ? (
                          <span style={{ fontSize: '1.2rem' }}>{medalMap[c.rank]}</span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>#{c.rank}</span>
                        )}
                      </td>

                      {/* Contributor Info */}
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <img
                            src={c.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                            alt={c.full_name}
                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.full_name}</span>
                              {c.vip_category && c.vip_category !== 'Standard' && (
                                <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: `${c.vip_color || '#7c3aed'}25`, color: c.vip_color || '#7c3aed', fontWeight: 700 }}>
                                  {c.vip_badge} {c.vip_category}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)' }}>
                              ID: #{c.user_id} • Level {c.level} • {c.email || c.mobile_number || 'No contact'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Coins Gifted */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 900, color: '#f59e0b', fontSize: '0.94rem' }}>
                        🪙 {c.total_coins_gifted.toLocaleString()}
                      </td>

                      {/* Gifts Sent */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600 }}>
                        {c.total_gifts_sent.toLocaleString()}
                      </td>

                      {/* Hosts Supported */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                        {c.total_recipients}
                      </td>

                      {/* Last Activity */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        {c.last_gifted_at ? new Date(c.last_gifted_at).toLocaleString() : 'N/A'}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                          onClick={() => handleOpenBreakdown(c)}
                          title="View recipients this user gifted to"
                        >
                          <span>Breakdown</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: Contributor Recipient Breakdown                    */}
      {/* ========================================================= */}
      {breakdownUser && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img
                  src={breakdownUser.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={breakdownUser.full_name}
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                    {breakdownUser.full_name}'s Gifting Breakdown
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    User ID: #{breakdownUser.user_id} • Total Spent: 🪙 {breakdownUser.total_coins_gifted.toLocaleString()} coins
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setBreakdownUser(null)}
                style={{ padding: '4px', borderRadius: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            {loadingBreakdown ? (
              <Loader text="Loading recipient breakdown..." size="md" />
            ) : !breakdownData || breakdownData.contributions?.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                <Gift size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <div>No active recipient records found for this user.</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Aggregated gifts sent by <strong>{breakdownUser.full_name}</strong> to each recipient (highest total coins first):
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {breakdownData.contributions.map((rc) => (
                    <div
                      key={rc.recipient_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-dim)', width: '24px' }}>
                          #{rc.rank}
                        </span>
                        <img
                          src={rc.recipient_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                          alt={rc.recipient_name}
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rc.recipient_name}</span>
                            {rc.recipient_vip_category && rc.recipient_vip_category !== 'Standard' && (
                              <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: `${rc.recipient_vip_color || '#7c3aed'}25`, color: rc.recipient_vip_color || '#7c3aed', fontWeight: 700 }}>
                                {rc.recipient_vip_badge} {rc.recipient_vip_category}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            ID: #{rc.recipient_id} • Received {rc.gift_count} gift transactions
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#f59e0b' }}>
                          🪙 {rc.total_coins_gifted.toLocaleString()}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          {rc.last_gifted_at ? new Date(rc.last_gifted_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setBreakdownUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Clear Gift History Confirmation                    */}
      {/* ========================================================= */}
      {clearModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '460px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ef4444', marginBottom: '0.75rem' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Clear Gift Transaction History
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.45', marginBottom: '1rem' }}>
              Are you sure you want to clear gift transaction records? This action:
            </p>

            <ul style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: '0 0 1.25rem 1.25rem', lineHeight: '1.5' }}>
              <li>Permanently deletes records from <code>gift_transactions</code> in MySQL.</li>
              <li>Instantly flushes Redis cache for top contributors & mobile contribution breakdown.</li>
              <li>The mobile API <code>/api/mobile/gifts/user/:id/contributions</code> will return zero records immediately.</li>
            </ul>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Scope of Deletion:
              </label>
              <select
                className="select-field"
                style={{ width: '100%' }}
                value={clearPeriod}
                onChange={(e) => setClearPeriod(e.target.value)}
              >
                <option value="all">Clear Entire Gift History (All Time)</option>
                <option value="month">Clear Only Current Month's History ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setClearModalOpen(false)}
                disabled={clearing}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn"
                style={{ background: '#ef4444', color: '#fff', fontWeight: 700 }}
                onClick={handleClearHistory}
                disabled={clearing}
              >
                {clearing ? 'Clearing Data...' : 'Confirm Clear History'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
