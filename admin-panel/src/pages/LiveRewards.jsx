import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Coins,
  Clock,
  Radio,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Save,
  Sliders,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
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
        role: roleFilter,
        sessionType: sessionTypeFilter,
      });

      if (res && res.success) {
        setHistoryItems(res.items || []);
        setHistoryTotal(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load live reward history:', err);
      if (onToast) onToast('Failed to load reward history', 'error');
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

  // Save Settings
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();

    if (settings.required_minutes < 1) {
      if (onToast) onToast('Required live duration must be at least 1 minute', 'error');
      return;
    }
    if (settings.reward_coins < 1) {
      if (onToast) onToast('Reward coins must be at least 1 coin', 'error');
      return;
    }
    if (settings.max_rewards_per_day < 1) {
      if (onToast) onToast('Daily reward limit must be at least 1 per day', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await liveRewardApi.updateSettings(settings);
      if (res && res.success) {
        setSettings(res.settings);
        if (onToast) onToast('Live streaming reward rules updated successfully!', 'success');
        // Refresh stats
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

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Live Streaming Rewards
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    settings.is_enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {settings.is_enabled ? 'System Active' : 'System Disabled'}
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Configure live broadcast duration targets, coin incentives, role criteria, and daily distribution limits.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadData();
              loadHistory();
            }}
            disabled={loading || historyLoading}
            className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading || historyLoading ? 'animate-spin text-amber-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rewarded Coins */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Total Coins Rewarded</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {stats.totalCoinsAwarded.toLocaleString()}
            </span>
            <span className="text-xs text-amber-400 font-medium">coins</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Today: +{stats.todayCoinsAwarded.toLocaleString()} coins</span>
          </div>
        </div>

        {/* Total Claims */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Total Claims Granted</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {stats.totalClaims.toLocaleString()}
            </span>
            <span className="text-xs text-purple-400 font-medium">rewards</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Today: {stats.todayClaims.toLocaleString()} claim(s)</span>
          </div>
        </div>

        {/* Active Hosts Rewarded */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Hosts Benefited</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {stats.totalHostsRewarded.toLocaleString()}
            </span>
            <span className="text-xs text-cyan-400 font-medium">broadcasters</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Today: {stats.todayHostsRewarded.toLocaleString()} host(s)</span>
          </div>
        </div>

        {/* Current Active Target Rule */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Current Milestone Target</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{settings.required_minutes}</span>
            <span className="text-xs text-emerald-400 font-medium">mins</span>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-xl font-bold text-amber-400">+{settings.reward_coins}</span>
            <span className="text-xs text-amber-400">coins</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5 truncate">
            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">
              {settings.session_type === 'single_continuous' ? 'Single continuous session' : 'Cumulative sessions'} • Max {settings.max_rewards_per_day}x/day
            </span>
          </div>
        </div>
      </div>

      {/* Main Configuration & Live Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-7 bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Reward Engine Configuration</h2>
            </div>
            {/* Active / Inactive Switch */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">
                {settings.is_enabled ? 'Active' : 'Disabled'}
              </span>
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, is_enabled: !s.is_enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settings.is_enabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.is_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            {/* Title & Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Reward Program Title
              </label>
              <input
                type="text"
                value={settings.title}
                onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
                placeholder="e.g. Daily Live Streaming Bonus"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/60 transition-colors"
                required
              />
            </div>

            {/* Target Role Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>1. Target User Role (ইউজার রোল নির্বাচন)</span>
                <span className="text-[11px] font-normal text-amber-400">Host & Agency Host are identical</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, target_role: 'host' }))}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    settings.target_role === 'host'
                      ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-lg shadow-amber-500/5'
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-300'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-lg ${
                      settings.target_role === 'host' ? 'bg-amber-500 text-black' : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Host (সকল হোস্ট)</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Both agency hosts and direct platform hosts.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, target_role: 'all' }))}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    settings.target_role === 'all'
                      ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-lg shadow-amber-500/5'
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-300'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-lg ${
                      settings.target_role === 'all' ? 'bg-amber-500 text-black' : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">All Users (সাধারণ ইউজারসহ সবাই)</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Any registered user who starts a live broadcast.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Session Criteria (Single continuous vs Multiple cumulative) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                2. Session Condition (সেশন ক্রাইটেরিয়া)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, session_type: 'single_continuous', min_sessions: 1 }))}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    settings.session_type === 'single_continuous'
                      ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-lg shadow-amber-500/5'
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-300'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-lg ${
                      settings.session_type === 'single_continuous'
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Single Continuous Session</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      একটানা ১টি সেশনে লাইভ থাকতে হবে (কোনো বিরতি ছাড়া)।
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, session_type: 'multiple_cumulative' }))}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    settings.session_type === 'multiple_cumulative'
                      ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-lg shadow-amber-500/5'
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-300'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-lg ${
                      settings.session_type === 'multiple_cumulative'
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Multiple Cumulative Sessions</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      একাধিক সেশন মিলিয়ে মোট সময় ও নির্ধারিত সেশন সংখ্যা।
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Min Session count if multiple */}
            {settings.session_type === 'multiple_cumulative' && (
              <div className="space-y-1.5 bg-white/[0.02] border border-white/10 rounded-xl p-3.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Minimum Required Sessions Count (নূন্যতম কতটি সেশন)</span>
                  <span className="text-xs text-amber-400">{settings.min_sessions} session(s)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.min_sessions}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, min_sessions: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                    }
                    className="w-32 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-400/60"
                  />
                  <span className="text-xs text-slate-400">
                    Host must complete at least this many sessions today.
                  </span>
                </div>
              </div>
            )}

            {/* Required Live Duration & Quick Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  3. Required Live Duration (কতো সময় লাইভ করতে হবে)
                </label>
                <span className="text-xs font-medium text-amber-400">
                  {formatHoursMinutes(settings.required_minutes)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={settings.required_minutes}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, required_minutes: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/60 transition-colors"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    Minutes
                  </span>
                </div>
              </div>
              {/* Preset Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[30, 45, 60, 90, 120, 180].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, required_minutes: mins }))}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      settings.required_minutes === mins
                        ? 'bg-amber-500 text-black font-semibold'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    {mins >= 60 ? `${mins / 60} Hour${mins > 60 ? 's' : ''}` : `${mins} Mins`}
                  </button>
                ))}
              </div>
            </div>

            {/* Coin Reward & Daily Limit Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Coins Awarded */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  4. Coin Reward (কয়েন রিওয়ার্ড)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={settings.reward_coins}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, reward_coins: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/60"
                    required
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-amber-400 text-xs font-semibold pointer-events-none">
                    <Coins className="w-3.5 h-3.5" />
                    Coins
                  </div>
                </div>
                {/* Coins Quick Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {[100, 200, 300, 500, 1000].map((coins) => (
                    <button
                      key={coins}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, reward_coins: coins }))}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                        settings.reward_coins === coins
                          ? 'bg-amber-500 text-black font-semibold'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                      }`}
                    >
                      {coins}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Limit */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  5. Daily Limit (দিনে কয়বার পাবে)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.max_rewards_per_day}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        max_rewards_per_day: Math.max(1, parseInt(e.target.value, 10) || 1),
                      }))
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/60"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    Times / Day
                  </span>
                </div>
                {/* Daily limit Quick Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {[1, 2, 3, 5].map((times) => (
                    <button
                      key={times}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, max_rewards_per_day: times }))}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                        settings.max_rewards_per_day === times
                          ? 'bg-amber-500 text-black font-semibold'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                      }`}
                    >
                      {times}x / Day
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Notice to Hosts (অ্যাপে হোস্টদের দেখানো বার্তা)
              </label>
              <textarea
                rows="2"
                value={settings.description}
                onChange={(e) => setSettings((s) => ({ ...s, description: e.target.value }))}
                placeholder="Brief guidelines or instructions shown in host rewards banner..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/60 transition-colors resize-none"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-black bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    Updating Reward Rules...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-black" />
                    Save & Activate Reward Rules
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Card & How It Works Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mobile App Live Preview */}
          <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                  Mobile App Live Preview
                </h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                Broadcaster View
              </span>
            </div>

            {/* Mock Mobile Host Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-amber-500/30 p-5 shadow-2xl">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{settings.title || 'Live Streaming Reward'}</h4>
                    <span className="text-[11px] text-amber-400 font-medium">
                      Target Audience: {settings.target_role === 'host' ? 'Hosts Only' : 'All Broadcasters'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs shadow-sm">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    +{settings.reward_coins} Coins
                  </div>
                </div>
              </div>

              {/* Progress simulation */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Streaming Progress</span>
                  <span className="text-slate-300 font-medium">
                    0 / {settings.required_minutes} mins (0%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full w-2/5 animate-pulse" />
                </div>
              </div>

              {/* Badges / Rules Checklist */}
              <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {settings.session_type === 'single_continuous'
                      ? 'Single Continuous Stream'
                      : `Cumulative (${settings.min_sessions} session(s))`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Max {settings.max_rewards_per_day} claim(s) / day</span>
                </div>
              </div>

              {settings.description && (
                <p className="mt-3 text-[11px] text-slate-400 bg-white/5 rounded-lg p-2 border border-white/5">
                  {settings.description}
                </p>
              )}
            </div>

            {/* Explanation box */}
            <div className="rounded-xl bg-white/[0.02] border border-white/10 p-4 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                How the Auto-Reward System Works:
              </div>
              <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                <li>
                  <strong className="text-slate-300">Automatic Award upon Stream End:</strong> When host ends their live broadcast, the server verifies elapsed minutes, user role, and daily claim limit.
                </li>
                <li>
                  <strong className="text-slate-300">Instant Wallet Credit:</strong> Coins are instantly added to the host's wallet via atomic MySQL transaction and recorded in ledger.
                </li>
                <li>
                  <strong className="text-slate-300">Real-Time Notification:</strong> Broadcasts a celebratory Socket.IO alert in the room and delivers an FCM push notification to the host device.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Reward Distribution & Claim Audit History Table */}
      <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Reward Distribution & Claim History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live audit trail of hosts who received continuous or cumulative live streaming incentives.
            </p>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHistoryPage(1);
                }}
                placeholder="Search host, email or room..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white text-xs focus:outline-none focus:border-amber-400/60"
              />
            </div>

            {/* Filter by Role */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setHistoryPage(1);
              }}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400/60"
            >
              <option value="all">All Roles</option>
              <option value="host">Host</option>
              <option value="user">User</option>
            </select>

            {/* Filter by Session Type */}
            <select
              value={sessionTypeFilter}
              onChange={(e) => {
                setSessionTypeFilter(e.target.value);
                setHistoryPage(1);
              }}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400/60"
            >
              <option value="all">All Session Types</option>
              <option value="single_continuous">Single Continuous</option>
              <option value="multiple_cumulative">Cumulative</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-white/[0.03] text-slate-400 uppercase tracking-wider text-[11px] border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Broadcaster / Host</th>
                <th className="py-3 px-4">Role & Agency</th>
                <th className="py-3 px-4">Live Room</th>
                <th className="py-3 px-4">Duration Streamed</th>
                <th className="py-3 px-4">Session Mode</th>
                <th className="py-3 px-4">Reward Coins</th>
                <th className="py-3 px-4">Claimed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {historyLoading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      Loading live rewards history...
                    </div>
                  </td>
                </tr>
              ) : historyItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Award className="w-8 h-8 text-slate-600" />
                      <span>No reward claims found matching your filter criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                historyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* User */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.avatar_url || 'https://via.placeholder.com/40'}
                          alt={item.full_name}
                          className="w-8 h-8 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <div className="font-semibold text-white">{item.full_name}</div>
                          <div className="text-[11px] text-slate-400">{item.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Agency */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                          {item.role || 'host'}
                        </span>
                        {item.agency_name && (
                          <span className="text-[11px] text-cyan-400 truncate max-w-[120px]">
                            {item.agency_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Room */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {item.room_id}
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 font-medium text-white">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{item.duration_minutes} mins</span>
                      </div>
                    </td>

                    {/* Session Type */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-slate-300">
                        {item.session_type === 'multiple_cumulative'
                          ? `Cumulative (${item.session_count || 1} sessions)`
                          : 'Single Continuous'}
                      </span>
                    </td>

                    {/* Coins Awarded */}
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        +{item.coins_awarded}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
  );
}
