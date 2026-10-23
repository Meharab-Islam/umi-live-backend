import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Coins,
  Clock,
  Radio,
  Users,
  CheckCircle,
  RefreshCw,
  Search,
  Save,
  Sliders,
  Sparkles,
  Calendar,
  Layers,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Flame,
} from 'lucide-react';
import liveRewardApi from '../api/liveRewardApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';

export default function LiveRewards({ onToast }) {
  // Config Form State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    id: 1,
    is_enabled: true,
    target_role: 'host', // 'host' (agency & independent hosts) or 'all' (all users/broadcasters)
    session_type: 'single_continuous', // 'single_continuous' or 'multiple_cumulative'
    min_sessions: 1,
    required_minutes: 60,
    reward_coins: 300,
    max_rewards_per_day: 1,
    title: 'Live Streaming Reward',
    description: 'Stream live to complete daily targets and earn bonus coins directly to your wallet.',
  });

  // Summary Metrics State
  const [stats, setStats] = useState({
    totalCoinsAwarded: 0,
    totalClaims: 0,
    totalHostsRewarded: 0,
    todayCoinsAwarded: 0,
    todayClaims: 0,
    todayHostsRewarded: 0,
  });

  // Reward Distribution Audit History State
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(15);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sessionTypeFilter, setSessionTypeFilter] = useState('all');

  // Load Settings and Stats
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsRes, statsRes] = await Promise.all([
        liveRewardApi.getSettings(),
        liveRewardApi.getStats(),
      ]);

      if (settingsRes && settingsRes.success && settingsRes.settings) {
        setSettings((prev) => ({
          ...prev,
          ...settingsRes.settings,
        }));
      }

      if (statsRes && statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      console.error('Failed to load live reward settings/stats:', err);
      if (onToast) onToast(err.message || 'Failed to load live reward settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  // Load History
  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await liveRewardApi.getHistory({
        page: historyPage,
        limit: historyPageSize,
        search: searchQuery,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        session_type: sessionTypeFilter !== 'all' ? sessionTypeFilter : undefined,
      });

      if (res && res.success) {
        setHistoryItems(res.history || []);
        setHistoryTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to load reward history:', err);
      if (onToast) onToast(err.message || 'Failed to load history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyPageSize, searchQuery, roleFilter, sessionTypeFilter, onToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();

    if (!settings.required_minutes || settings.required_minutes <= 0) {
      if (onToast) onToast('Please enter a valid required live streaming duration in minutes', 'warning');
      return;
    }
    if (!settings.reward_coins || settings.reward_coins <= 0) {
      if (onToast) onToast('Please enter a valid coin reward amount', 'warning');
      return;
    }

    try {
      setSaving(true);
      const res = await liveRewardApi.updateSettings(settings);
      if (res && res.success) {
        setSettings(res.settings);
        if (onToast) onToast('Live streaming reward rules updated successfully!', 'success');
        const statsRes = await liveRewardApi.getStats();
        if (statsRes?.stats) setStats(statsRes.stats);
      } else {
        throw new Error(res?.message || 'Failed to update settings');
      }
    } catch (err) {
      console.error('Save error:', err);
      if (onToast) onToast(err.message || 'Failed to save reward settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatHoursMinutes = (totalMins) => {
    const mins = Number(totalMins) || 0;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m (${mins} mins)`;
    if (h > 0) return `${h} hour${h > 1 ? 's' : ''} (${mins} mins)`;
    return `${mins} minutes`;
  };

  if (loading && !settings.title) {
    return (
      <div className="page-container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader text="Loading Live Reward System..." />
      </div>
    );
  }

  return (
    <div className="page-container lr-page" style={{ paddingBottom: '3.5rem' }}>
      {/* Page Header */}
      <div className="panel-card lr-header-card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="lr-header-icon-box">
              <Award size={26} color="#d97706" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Live Streaming Rewards
                </h1>
                <span className={`lr-status-pill ${settings.is_enabled ? 'active' : 'disabled'}`}>
                  <span className="lr-status-dot" />
                  {settings.is_enabled ? 'System Active' : 'System Disabled'}
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                Configure live broadcast duration targets, coin incentives, role criteria, and daily distribution limits.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              loadData();
              loadHistory();
            }}
            disabled={loading || historyLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={15} className={loading || historyLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Vibrant Stat Metric Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        {/* Card 1: Total Coins Rewarded */}
        <div className="panel-card lr-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="lr-stat-top">
            <span className="lr-stat-label">Total Coins Rewarded</span>
            <div className="lr-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
              <Coins size={20} />
            </div>
          </div>
          <div className="lr-stat-value">
            {stats.totalCoinsAwarded.toLocaleString()}{' '}
            <span style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: 600 }}>coins</span>
          </div>
          <div className="lr-stat-bottom" style={{ color: 'var(--text-dim)' }}>
            <Sparkles size={14} color="#d97706" />
            <span>Today: +{stats.todayCoinsAwarded.toLocaleString()} coins</span>
          </div>
        </div>

        {/* Card 2: Total Claims Granted */}
        <div className="panel-card lr-stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="lr-stat-top">
            <span className="lr-stat-label">Total Claims Granted</span>
            <div className="lr-stat-icon" style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' }}>
              <Award size={20} />
            </div>
          </div>
          <div className="lr-stat-value">
            {stats.totalClaims.toLocaleString()}{' '}
            <span style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 600 }}>claims</span>
          </div>
          <div className="lr-stat-bottom" style={{ color: 'var(--text-dim)' }}>
            <TrendingUp size={14} color="#059669" />
            <span>Today: {stats.todayClaims.toLocaleString()} claim(s)</span>
          </div>
        </div>

        {/* Card 3: Hosts Benefited */}
        <div className="panel-card lr-stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="lr-stat-top">
            <span className="lr-stat-label">Hosts Benefited</span>
            <div className="lr-stat-icon" style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="lr-stat-value">
            {stats.totalHostsRewarded.toLocaleString()}{' '}
            <span style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 600 }}>broadcasters</span>
          </div>
          <div className="lr-stat-bottom" style={{ color: 'var(--text-dim)' }}>
            <ShieldCheck size={14} color="#0284c7" />
            <span>Today: {stats.todayHostsRewarded.toLocaleString()} host(s)</span>
          </div>
        </div>

        {/* Card 4: Current Active Target */}
        <div className="panel-card lr-stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="lr-stat-top">
            <span className="lr-stat-label">Active Milestone Target</span>
            <div className="lr-stat-icon" style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}>
              <Flame size={20} />
            </div>
          </div>
          <div className="lr-stat-value">
            {settings.required_minutes}{' '}
            <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>mins</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: '0 4px' }}>/</span>
            <span style={{ color: '#d97706' }}>+{settings.reward_coins}</span>
            <span style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: 600, marginLeft: '3px' }}>coins</span>
          </div>
          <div className="lr-stat-bottom" style={{ color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Clock size={14} color="var(--text-dim)" />
            <span>
              {settings.session_type === 'single_continuous' ? 'Single continuous' : 'Cumulative'} • Max {settings.max_rewards_per_day}x/day
            </span>
          </div>
        </div>
      </div>

      {/* Main Configuration & Live Preview Layout */}
      <div className="lr-content-grid" style={{ marginBottom: '2rem' }}>
        {/* Left Column: Reward Engine Configuration */}
        <div className="panel-card lr-form-panel">
          <div className="lr-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div className="lr-icon-badge">
                <Sliders size={18} color="#d97706" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Reward Engine Configuration
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  Define live targets, role criteria, coin amounts & constraints
                </span>
              </div>
            </div>

            {/* Master Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: settings.is_enabled ? '#059669' : '#dc2626' }}>
                {settings.is_enabled ? 'Active' : 'Disabled'}
              </span>
              <button
                type="button"
                className={`lr-toggle-switch ${settings.is_enabled ? 'checked' : ''}`}
                onClick={() => setSettings((s) => ({ ...s, is_enabled: !s.is_enabled }))}
                title="Toggle Live Reward Engine"
              >
                <span className="lr-toggle-thumb" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
            {/* 1. Title */}
            <div className="lr-field-group">
              <label className="lr-field-label">
                Reward Program Title
              </label>
              <div className="lr-input-box">
                <input
                  type="text"
                  className="lr-custom-input"
                  value={settings.title}
                  onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
                  placeholder="e.g. Daily Live Streaming Bonus"
                  required
                />
              </div>
            </div>

            {/* 2. Target Role Selection */}
            <div className="lr-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label className="lr-field-label" style={{ margin: 0 }}>
                  1. Target User Role
                </label>
                <span className="lr-hint-pill">
                  Host & Agency Host have identical host privileges
                </span>
              </div>
              <div className="lr-cards-row">
                {/* Host Card */}
                <div
                  className={`lr-choice-card ${settings.target_role === 'host' ? 'active' : ''}`}
                  onClick={() => setSettings((s) => ({ ...s, target_role: 'host' }))}
                >
                  <div className="lr-choice-icon" style={{ background: settings.target_role === 'host' ? '#7c3aed' : '#f1f5f9', color: settings.target_role === 'host' ? '#fff' : '#64748b' }}>
                    <Radio size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      Official Host
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '3px', lineHeight: 1.35 }}>
                      Includes both agency hosts and independent platform hosts.
                    </div>
                  </div>
                </div>

                {/* All Users Card */}
                <div
                  className={`lr-choice-card ${settings.target_role === 'all' ? 'active' : ''}`}
                  onClick={() => setSettings((s) => ({ ...s, target_role: 'all' }))}
                >
                  <div className="lr-choice-icon" style={{ background: settings.target_role === 'all' ? '#7c3aed' : '#f1f5f9', color: settings.target_role === 'all' ? '#fff' : '#64748b' }}>
                    <Users size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      All Broadcasters
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '3px', lineHeight: 1.35 }}>
                      Any registered user who starts a live stream broadcast.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Session Criteria */}
            <div className="lr-field-group">
              <label className="lr-field-label">
                2. Session Requirement
              </label>
              <div className="lr-cards-row">
                {/* Single Continuous */}
                <div
                  className={`lr-choice-card ${settings.session_type === 'single_continuous' ? 'active' : ''}`}
                  onClick={() => setSettings((s) => ({ ...s, session_type: 'single_continuous', min_sessions: 1 }))}
                >
                  <div className="lr-choice-icon" style={{ background: settings.session_type === 'single_continuous' ? '#0284c7' : '#f1f5f9', color: settings.session_type === 'single_continuous' ? '#fff' : '#64748b' }}>
                    <Clock size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      Single Continuous Session
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '3px', lineHeight: 1.35 }}>
                      Must stream continuously in a single uninterrupted broadcast session.
                    </div>
                  </div>
                </div>

                {/* Multiple Cumulative */}
                <div
                  className={`lr-choice-card ${settings.session_type === 'multiple_cumulative' ? 'active' : ''}`}
                  onClick={() => setSettings((s) => ({ ...s, session_type: 'multiple_cumulative' }))}
                >
                  <div className="lr-choice-icon" style={{ background: settings.session_type === 'multiple_cumulative' ? '#0284c7' : '#f1f5f9', color: settings.session_type === 'multiple_cumulative' ? '#fff' : '#64748b' }}>
                    <Layers size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      Multiple Cumulative Sessions
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '3px', lineHeight: 1.35 }}>
                      Accumulate broadcast minutes across multiple sessions throughout the day.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Min Sessions input if multiple_cumulative */}
            {settings.session_type === 'multiple_cumulative' && (
              <div className="lr-sub-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="lr-field-label" style={{ margin: 0 }}>
                    Minimum Required Live Sessions
                  </label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7' }}>
                    {settings.min_sessions} session(s)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="lr-input-box" style={{ width: '130px' }}>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="lr-custom-input"
                      value={settings.min_sessions}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, min_sessions: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                      }
                    />
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Host must broadcast at least this many sessions today to unlock reward.
                  </span>
                </div>
              </div>
            )}

            {/* 4. Required Live Duration */}
            <div className="lr-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label className="lr-field-label" style={{ margin: 0 }}>
                  3. Required Live Streaming Duration
                </label>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706' }}>
                  {formatHoursMinutes(settings.required_minutes)}
                </span>
              </div>
              <div className="lr-input-box">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  className="lr-custom-input lr-has-suffix"
                  value={settings.required_minutes}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, required_minutes: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                  }
                  required
                />
                <span className="lr-input-suffix-tag">Minutes</span>
              </div>
              {/* Quick Duration Chips */}
              <div className="lr-chips-row">
                {[30, 45, 60, 90, 120, 180].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`lr-chip ${settings.required_minutes === mins ? 'active' : ''}`}
                    onClick={() => setSettings((s) => ({ ...s, required_minutes: mins }))}
                  >
                    {mins >= 60 ? `${mins / 60} Hour${mins > 60 ? 's' : ''}` : `${mins} Mins`}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Coin Reward & Daily Limit Row */}
            <div className="lr-cards-row">
              {/* Coin Reward */}
              <div className="lr-field-group" style={{ flex: 1 }}>
                <label className="lr-field-label">
                  4. Coin Reward Amount
                </label>
                <div className="lr-input-box">
                  <input
                    type="number"
                    min="1"
                    className="lr-custom-input lr-has-suffix"
                    value={settings.reward_coins}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, reward_coins: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                    }
                    required
                  />
                  <span className="lr-input-suffix-tag" style={{ color: '#d97706' }}>
                    🪙 Coins
                  </span>
                </div>
                <div className="lr-chips-row">
                  {[100, 200, 300, 500, 1000].map((coins) => (
                    <button
                      key={coins}
                      type="button"
                      className={`lr-chip ${settings.reward_coins === coins ? 'active' : ''}`}
                      onClick={() => setSettings((s) => ({ ...s, reward_coins: coins }))}
                    >
                      +{coins}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Limit */}
              <div className="lr-field-group" style={{ flex: 1 }}>
                <label className="lr-field-label">
                  5. Daily Claim Frequency Limit
                </label>
                <div className="lr-input-box">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="lr-custom-input lr-has-suffix"
                    value={settings.max_rewards_per_day}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        max_rewards_per_day: Math.max(1, parseInt(e.target.value, 10) || 1),
                      }))
                    }
                    required
                  />
                  <span className="lr-input-suffix-tag">Times / Day</span>
                </div>
                <div className="lr-chips-row">
                  {[1, 2, 3, 5].map((times) => (
                    <button
                      key={times}
                      type="button"
                      className={`lr-chip ${settings.max_rewards_per_day === times ? 'active' : ''}`}
                      onClick={() => setSettings((s) => ({ ...s, max_rewards_per_day: times }))}
                    >
                      {times}x / Day
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description notice */}
            <div className="lr-field-group">
              <label className="lr-field-label">
                Broadcaster Announcement / Instructions
              </label>
              <textarea
                rows="2"
                className="lr-custom-textarea"
                value={settings.description}
                onChange={(e) => setSettings((s) => ({ ...s, description: e.target.value }))}
                placeholder="Brief guidelines or instructions shown in the host rewards banner..."
              />
            </div>

            {/* Submit Button */}
            <div style={{ paddingTop: '0.25rem' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                }}
              >
                {saving ? (
                  <>
                    <RefreshCw size={17} className="spin" />
                    <span>Updating Reward Rules...</span>
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    <span>Save & Activate Reward Rules</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Mobile App Live Preview & How it Works */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Mobile App Live Preview */}
          <div className="panel-card lr-preview-panel">
            <div className="lr-panel-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e', animation: 'pulse 1.5s infinite' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Mobile App Live Preview
                </h3>
              </div>
              <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                Host Screen View
              </span>
            </div>

            {/* Mock Mobile Host Card */}
            <div className="lr-mock-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="lr-mock-icon">
                    <Award size={20} color="#f59e0b" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
                      {settings.title || 'Live Streaming Reward'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                      Target: {settings.target_role === 'host' ? 'Host Broadcasters' : 'All Broadcasters'}
                    </div>
                  </div>
                </div>

                <div className="lr-mock-badge">
                  <Coins size={14} color="#f59e0b" />
                  <span>+{settings.reward_coins} Coins</span>
                </div>
              </div>

              {/* Progress bar simulation */}
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.35rem' }}>
                  <span>Live Streaming Progress</span>
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>
                    0 / {settings.required_minutes} mins (0%)
                  </span>
                </div>
                <div className="lr-progress-track">
                  <div className="lr-progress-fill" />
                </div>
              </div>

              {/* Criteria Checklist */}
              <div className="lr-mock-rules">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
                  <CheckCircle size={14} color="#10b981" />
                  <span>
                    {settings.session_type === 'single_continuous'
                      ? 'Single Continuous Stream'
                      : `Cumulative (${settings.min_sessions} session(s))`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
                  <CheckCircle size={14} color="#10b981" />
                  <span>Max {settings.max_rewards_per_day} claim(s) / day</span>
                </div>
              </div>

              {settings.description && (
                <div className="lr-mock-desc">
                  {settings.description}
                </div>
              )}
            </div>
          </div>

          {/* Explanation Box */}
          <div className="panel-card lr-info-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '0.65rem' }}>
              <HelpCircle size={17} color="#0284c7" />
              <span>How the Auto-Reward System Operates:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Stream End Automation:</strong> When a host concludes their live broadcast, the backend calculates elapsed minutes, session criteria, and checks the daily frequency limit.
              </li>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Instant Wallet Credit:</strong> Coins are credited directly to the host's wallet via an atomic MySQL transaction with an immutable ledger entry.
              </li>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Real-Time Alert & FCM:</strong> Fires a celebratory Socket.IO animation in the live room and delivers an FCM push notification directly to the host's mobile phone.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Reward Distribution & Claim Audit History Table */}
      <div className="panel-card lr-history-panel">
        <div className="lr-panel-header" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={19} color="#d97706" />
              Reward Distribution & Claim Audit History
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Complete audit trail of hosts who achieved required live streaming milestones and received coins.
            </p>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="lr-custom-input"
                style={{ paddingLeft: '32px', fontSize: '0.82rem', height: '38px' }}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHistoryPage(1);
                }}
                placeholder="Search host name, email, room..."
              />
            </div>

            {/* Role Filter */}
            <select
              className="lr-custom-select"
              style={{ fontSize: '0.82rem', height: '38px', minWidth: '120px' }}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setHistoryPage(1);
              }}
            >
              <option value="all">All Roles</option>
              <option value="host">Host</option>
              <option value="user">User</option>
            </select>

            {/* Session Type Filter */}
            <select
              className="lr-custom-select"
              style={{ fontSize: '0.82rem', height: '38px', minWidth: '150px' }}
              value={sessionTypeFilter}
              onChange={(e) => {
                setSessionTypeFilter(e.target.value);
                setHistoryPage(1);
              }}
            >
              <option value="all">All Session Types</option>
              <option value="single_continuous">Single Continuous</option>
              <option value="multiple_cumulative">Cumulative</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Broadcaster / Host</th>
                <th>Role & Agency</th>
                <th>Live Room</th>
                <th>Duration Streamed</th>
                <th>Session Mode</th>
                <th>Reward Coins</th>
                <th>Claimed At</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-dim)' }}>
                      <RefreshCw size={16} className="spin" color="#d97706" />
                      <span>Loading live reward history...</span>
                    </div>
                  </td>
                </tr>
              ) : historyItems.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-dim)' }}>
                      <Award size={36} color="var(--text-dim)" style={{ opacity: 0.5 }} />
                      <span style={{ fontWeight: 600 }}>No reward claims found</span>
                      <span style={{ fontSize: '0.78rem' }}>Reward entries will appear automatically as hosts complete streaming targets.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                historyItems.map((item) => (
                  <tr key={item.id}>
                    {/* User */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <img
                          src={item.avatar_url || 'https://via.placeholder.com/40'}
                          alt={item.full_name}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                            {item.full_name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            {item.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Agency */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                        <span className="badge badge-purple" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>
                          {item.role || 'host'}
                        </span>
                        {item.agency_name && (
                          <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>
                            {item.agency_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Room */}
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {item.room_id}
                      </span>
                    </td>

                    {/* Duration */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        <Clock size={14} color="#d97706" />
                        <span>{item.duration_minutes} mins</span>
                      </div>
                    </td>

                    {/* Session Type */}
                    <td>
                      <span className="badge" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        {item.session_type === 'multiple_cumulative'
                          ? `Cumulative (${item.session_count || 1} sessions)`
                          : 'Single Continuous'}
                      </span>
                    </td>

                    {/* Coins Awarded */}
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '3px 8px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', fontWeight: 700, fontSize: '0.8rem' }}>
                        <Coins size={14} />
                        +{item.coins_awarded}
                      </div>
                    </td>

                    {/* Date */}
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ marginTop: '1.25rem' }}>
          <Pagination
            currentPage={historyPage}
            pageSize={historyPageSize}
            totalItems={historyTotal}
            onPageChange={(p) => setHistoryPage(p)}
            onPageSizeChange={(s) => {
              setHistoryPageSize(s);
              setHistoryPage(1);
            }}
            pageSizeOptions={[15, 30, 50, 100]}
          />
        </div>
      </div>

      {/* Scoped CSS Styles for LiveRewards Page */}
      <style>{`
        .lr-page {
          animation: fadeIn 0.25s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .lr-header-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(245, 158, 11, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(245, 158, 11, 0.25);
        }
        .lr-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .lr-status-pill.active {
          background: rgba(16, 185, 129, 0.12);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .lr-status-pill.disabled {
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .lr-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .lr-stat-card {
          padding: 1.25rem;
          border-radius: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }
        .lr-stat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
        }
        .lr-stat-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .lr-stat-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lr-stat-value {
          font-size: 1.65rem;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.5px;
        }
        .lr-stat-bottom {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          margin-top: 6px;
          font-weight: 600;
        }
        .lr-content-grid {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 1.5rem;
        }
        @media (max-width: 1080px) {
          .lr-content-grid {
            grid-template-columns: 1fr;
          }
        }
        .lr-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.85rem;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 1.25rem;
        }
        .lr-icon-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(245, 158, 11, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lr-toggle-switch {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          background: #cbd5e1;
          border: none;
          cursor: pointer;
          position: relative;
          padding: 2px;
          transition: background 0.2s ease;
        }
        .lr-toggle-switch.checked {
          background: #10b981;
        }
        .lr-toggle-thumb {
          display: block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
          transition: transform 0.2s ease;
        }
        .lr-toggle-switch.checked .lr-toggle-thumb {
          transform: translateX(20px);
        }

        /* High-End Form Input Design */
        .lr-field-group {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .lr-field-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .lr-hint-pill {
          font-size: 0.73rem;
          color: #b45309;
          background: rgba(245, 158, 11, 0.1);
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 600;
        }
        .lr-input-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .lr-custom-input {
          width: 100%;
          height: 44px;
          border-radius: 10px;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          padding: 0 14px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }
        .lr-custom-input:hover {
          border-color: #94a3b8;
          background: #fbfcfe;
        }
        .lr-custom-input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3.5px rgba(124, 58, 237, 0.12);
          background: #ffffff;
        }
        .lr-custom-input.lr-has-suffix {
          padding-right: 95px;
        }
        .lr-custom-select {
          border-radius: 10px;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          padding: 0 12px;
          font-size: 0.84rem;
          font-weight: 600;
          color: #0f172a;
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lr-custom-select:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
        }
        .lr-custom-textarea {
          width: 100%;
          min-height: 80px;
          border-radius: 10px;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          padding: 10px 14px;
          font-size: 0.88rem;
          font-weight: 500;
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          transition: all 0.2s ease;
          outline: none;
          font-family: inherit;
        }
        .lr-custom-textarea:hover {
          border-color: #94a3b8;
        }
        .lr-custom-textarea:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3.5px rgba(124, 58, 237, 0.12);
          background: #ffffff;
        }
        .lr-input-suffix-tag {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          background: #f1f5f9;
          color: #475569;
          pointer-events: none;
          border: 1px solid #e2e8f0;
        }

        .lr-cards-row {
          display: flex;
          gap: 0.85rem;
        }
        @media (max-width: 640px) {
          .lr-cards-row {
            flex-direction: column;
          }
        }
        .lr-choice-card {
          flex: 1;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.95rem 1rem;
          border-radius: 12px;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
        }
        .lr-choice-card:hover {
          border-color: #94a3b8;
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
        }
        .lr-choice-card.active {
          border-color: #7c3aed;
          background: rgba(124, 58, 237, 0.03);
          box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15), 0 4px 12px rgba(124, 58, 237, 0.08);
        }
        .lr-choice-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .lr-sub-box {
          background: #f8fafc;
          border: 1.5px dashed #cbd5e1;
          border-radius: 12px;
          padding: 0.85rem 1rem;
        }
        .lr-chips-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.35rem;
        }
        .lr-chip {
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .lr-chip:hover {
          background: #f8fafc;
          border-color: #7c3aed;
          color: #7c3aed;
          transform: translateY(-1px);
        }
        .lr-chip.active {
          background: #7c3aed;
          border-color: #7c3aed;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.25);
        }
        .lr-mock-card {
          background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
          border: 1px solid rgba(245, 158, 11, 0.4);
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          position: relative;
          overflow: hidden;
        }
        .lr-mock-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.18);
          border: 1px solid rgba(245, 158, 11, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lr-mock-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #fef3c7;
          font-size: 0.75rem;
          font-weight: 800;
        }
        .lr-progress-track {
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.15);
          overflow: hidden;
        }
        .lr-progress-fill {
          width: 45%;
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #f59e0b, #ef4444);
          animation: pulse 2s infinite;
        }
        .lr-mock-rules {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 0.85rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .lr-mock-desc {
          margin-top: 0.85rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          font-size: 0.73rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.4;
        }
        .lr-info-panel {
          border-left: 4px solid #0284c7;
          background: var(--bg-card);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
