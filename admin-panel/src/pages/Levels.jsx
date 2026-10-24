import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  Sparkles,
  Crown,
  Image as ImageIcon,
  Coins,
  Gem,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Calculator,
  History,
  Layers,
  ChevronRight,
  Shield,
  Zap,
  Star,
  StarHalf,
} from 'lucide-react';
import levelApi from '../api/levelApi';
import Loader from '../components/Loader';

export default function Levels({ onToast }) {
  const [activeTab, setActiveTab] = useState('levels'); // 'levels' | 'calculator' | 'history'
  const [levels, setLevels] = useState([]);
  const [rewardOptions, setRewardOptions] = useState({ entry_effects: [], thumbnails: [], packages: [] });
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [saving, setSaving] = useState(false);

  // Calculator State
  const [simCoinsSpent, setSimCoinsSpent] = useState(25000);

  // Star Progression State
  const [starConfig, setStarConfig] = useState({
    star_system_enabled: true,
    star_coins_per_unit: 100000,
    star_metric_type: 'coins_spent',
    star_decimal_precision: 1,
    star_max_stars: 100,
  });
  const [starStats, setStarStats] = useState({ total_starred_users: 0, highest_star: 0, average_star: 0 });
  const [topStarUsers, setTopStarUsers] = useState([]);
  const [loadingStars, setLoadingStars] = useState(false);
  const [savingStars, setSavingStars] = useState(false);
  const [recalculatingStars, setRecalculatingStars] = useState(false);
  const [simStarCoins, setSimStarCoins] = useState(120000);

  // Form State
  const [formData, setFormData] = useState({
    level_number: '',
    level_name: '',
    min_coins_spent: '',
    badge_color: '#f59e0b',
    badge_icon: '',
    reward_coins: '0',
    reward_diamonds: '0',
    reward_entry_effect_id: '',
    reward_thumbnail_id: '',
    reward_package_id: '',
    reward_validity_days: '7',
    is_active: true,
    description: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [levelsRes, optionsRes] = await Promise.all([
        levelApi.getLevels(),
        levelApi.getRewardOptions(),
      ]);

      if (levelsRes.success) {
        setLevels(levelsRes.levels || []);
      }
      if (optionsRes.success) {
        setRewardOptions({
          entry_effects: optionsRes.entry_effects || [],
          thumbnails: optionsRes.thumbnails || [],
          packages: optionsRes.packages || [],
        });
      }
    } catch (err) {
      onToast(err.message || 'Failed to fetch level configs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (page = 1) => {
    try {
      setLoadingHistory(true);
      const res = await levelApi.getHistory(page, 20);
      if (res.success) {
        setHistory(res.history || []);
        setHistoryTotal(res.total || 0);
        setHistoryPage(res.page || 1);
      }
    } catch (err) {
      onToast(err.message || 'Failed to fetch level reward history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(1);
    } else if (activeTab === 'stars') {
      fetchStarSettings();
    }
  }, [activeTab]);

  const fetchStarSettings = async () => {
    try {
      setLoadingStars(true);
      const res = await levelApi.getStarSettings();
      if (res.success) {
        setStarConfig(res.config || {});
        setStarStats(res.stats || {});
        setTopStarUsers(res.topUsers || []);
      }
    } catch (err) {
      console.error('Failed to load star settings:', err);
    } finally {
      setLoadingStars(false);
    }
  };

  const handleSaveStars = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingStars(true);
      const res = await levelApi.updateStarSettings(starConfig);
      if (res.success) {
        onToast(res.message || 'Star progression formula updated!', 'success');
        fetchStarSettings();
      }
    } catch (err) {
      onToast(err.message || 'Failed to save star settings', 'error');
    } finally {
      setSavingStars(false);
    }
  };

  const handleRecalculateAllStars = async () => {
    if (!window.confirm('Recalculate and update Star ratings for ALL users in the system right now based on this formula?')) {
      return;
    }
    try {
      setRecalculatingStars(true);
      const res = await levelApi.recalculateAllStars();
      if (res.success) {
        onToast(res.message || 'All user star ratings recalculated successfully!', 'success');
        fetchStarSettings();
      }
    } catch (err) {
      onToast(err.message || 'Failed to recalculate stars', 'error');
    } finally {
      setRecalculatingStars(false);
    }
  };

  const simStarComputed = useMemo(() => {
    const unit = Number(starConfig.star_coins_per_unit || 100000);
    const precision = Number(starConfig.star_decimal_precision ?? 1);
    const max = Number(starConfig.star_max_stars || 100);
    if (unit <= 0) return '0.0';
    const computed = Math.min(Number(simStarCoins || 0) / unit, max);
    return computed.toFixed(precision);
  }, [simStarCoins, starConfig]);

  const handleOpenModal = (lvl = null) => {
    if (lvl) {
      setEditingLevel(lvl);
      setFormData({
        level_number: String(lvl.level_number),
        level_name: lvl.level_name || '',
        min_coins_spent: String(lvl.min_coins_spent || '0'),
        badge_color: lvl.badge_color || '#f59e0b',
        badge_icon: lvl.badge_icon || '',
        reward_coins: String(lvl.reward_coins || '0'),
        reward_diamonds: String(lvl.reward_diamonds || '0'),
        reward_entry_effect_id: lvl.reward_entry_effect_id ? String(lvl.reward_entry_effect_id) : '',
        reward_thumbnail_id: lvl.reward_thumbnail_id ? String(lvl.reward_thumbnail_id) : '',
        reward_package_id: lvl.reward_package_id ? String(lvl.reward_package_id) : '',
        reward_validity_days: String(lvl.reward_validity_days || '7'),
        is_active: lvl.is_active !== false && lvl.is_active !== 0,
        description: lvl.description || '',
      });
    } else {
      setEditingLevel(null);
      const nextNum = levels.length > 0 ? Math.max(...levels.map((l) => l.level_number)) + 1 : 1;
      setFormData({
        level_number: String(nextNum),
        level_name: `Level ${nextNum}`,
        min_coins_spent: '1000',
        badge_color: '#f59e0b',
        badge_icon: '',
        reward_coins: '0',
        reward_diamonds: '0',
        reward_entry_effect_id: '',
        reward_thumbnail_id: '',
        reward_package_id: '',
        reward_validity_days: '7',
        is_active: true,
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLevel(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.level_number || !formData.level_name) {
      onToast('Level Number and Title are required.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        level_number: parseInt(formData.level_number, 10),
        level_name: formData.level_name.trim(),
        min_coins_spent: formData.min_coins_spent,
        badge_color: formData.badge_color,
        badge_icon: formData.badge_icon,
        reward_coins: parseInt(formData.reward_coins || 0, 10),
        reward_diamonds: parseInt(formData.reward_diamonds || 0, 10),
        reward_entry_effect_id: formData.reward_entry_effect_id ? parseInt(formData.reward_entry_effect_id, 10) : null,
        reward_thumbnail_id: formData.reward_thumbnail_id ? parseInt(formData.reward_thumbnail_id, 10) : null,
        reward_package_id: formData.reward_package_id ? parseInt(formData.reward_package_id, 10) : null,
        reward_validity_days: parseInt(formData.reward_validity_days || 7, 10),
        is_active: formData.is_active,
        description: formData.description,
      };

      if (editingLevel) {
        await levelApi.updateLevel(editingLevel.id, payload);
        onToast(`Level ${payload.level_number} updated successfully!`, 'success');
      } else {
        await levelApi.createLevel(payload);
        onToast(`Level ${payload.level_number} created successfully!`, 'success');
      }

      handleCloseModal();
      fetchData();
    } catch (err) {
      onToast(err.message || 'Operation failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lvl) => {
    if (!window.confirm(`Are you sure you want to delete Level ${lvl.level_number} (${lvl.level_name})?`)) {
      return;
    }
    try {
      await levelApi.deleteLevel(lvl.id);
      onToast(`Level ${lvl.level_number} deleted.`, 'success');
      fetchData();
    } catch (err) {
      onToast(err.message || 'Failed to delete level', 'error');
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm('Seed or reset 20 default progression levels (Level 1 to Level 20)? Existing levels with matching numbers will be updated.')) {
      return;
    }
    try {
      setLoading(true);
      await levelApi.seedDefaultLevels();
      onToast('Default 20 levels seeded successfully!', 'success');
      fetchData();
    } catch (err) {
      onToast(err.message || 'Failed to seed levels', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered levels
  const filteredLevels = useMemo(() => {
    if (!searchQuery.trim()) return levels;
    const q = searchQuery.toLowerCase();
    return levels.filter(
      (l) =>
        l.level_name?.toLowerCase().includes(q) ||
        String(l.level_number).includes(q) ||
        String(l.min_coins_spent).includes(q)
    );
  }, [levels, searchQuery]);

  // Simulation calculation
  const simulationResult = useMemo(() => {
    if (levels.length === 0) return null;
    const sorted = [...levels].sort((a, b) => a.level_number - b.level_number);
    const spent = BigInt(simCoinsSpent || 0);

    let achieved = sorted[0];
    let next = null;

    for (let i = 0; i < sorted.length; i++) {
      if (spent >= BigInt(sorted[i].min_coins_spent)) {
        achieved = sorted[i];
        next = sorted[i + 1] || null;
      } else {
        if (!next) next = sorted[i];
        break;
      }
    }

    let progress = 100;
    let needed = 0;
    if (next) {
      const minCurrent = BigInt(achieved.min_coins_spent || 0);
      const minNext = BigInt(next.min_coins_spent);
      const diff = minNext - minCurrent;
      const progressIn = spent > minCurrent ? spent - minCurrent : 0n;
      if (diff > 0n) {
        progress = Number((progressIn * 100n) / diff);
        if (progress > 100) progress = 100;
        if (progress < 0) progress = 0;
      }
      needed = spent < minNext ? Number(minNext - spent) : 0;
    }

    return {
      achieved,
      next,
      progress,
      needed,
    };
  }, [levels, simCoinsSpent]);

  // Statistics
  const totalLevels = levels.length;
  const maxReq = levels.length > 0 ? Math.max(...levels.map((l) => Number(l.min_coins_spent))) : 0;
  const withRewardsCount = levels.filter(
    (l) => l.reward_coins > 0 || l.reward_diamonds > 0 || l.reward_entry_effect_id || l.reward_thumbnail_id || l.reward_package_id
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner & Quick Actions */}
      <div
        className="panel-card"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(124, 58, 237, 0.1) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                <TrendingUp size={26} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  User Levels & Progression Rewards
                </h2>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Define spending milestones, automatic level-ups, and rewards (Coins, Diamonds, Entry Effects, Special Thumbnails, and VIP Packages with validity durations).
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={handleSeedDefaults}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
              title="Populate standard 20 level tiers"
            >
              <Sparkles size={15} color="#f59e0b" />
              <span>Seed 20 Levels</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={fetchData}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleOpenModal()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', background: '#f59e0b', borderColor: '#f59e0b', color: '#000' }}
            >
              <Plus size={16} />
              <span>Add New Level</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginTop: '1.35rem' }}>
          <div style={{ padding: '0.9rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Level Tiers</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{totalLevels} Levels</div>
          </div>

          <div style={{ padding: '0.9rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Milestone Requirement</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{maxReq.toLocaleString()} 🪙</div>
          </div>

          <div style={{ padding: '0.9rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tiers With Active Rewards</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a78bfa', marginTop: '4px' }}>{withRewardsCount} Levels</div>
          </div>

          <div style={{ padding: '0.9rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Rewards Awarded</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#06b6d4', marginTop: '4px' }}>{historyTotal} Claims</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'levels' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('levels')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Layers size={16} />
          <span>Level Progression Roadmap ({levels.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'calculator' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('calculator')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Calculator size={16} />
          <span>Level Simulator & Calculator</span>
        </button>
        <button
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('history')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <History size={16} />
          <span>Reward Audit History ({historyTotal})</span>
        </button>
        <button
          className={`btn ${activeTab === 'stars' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('stars')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeTab === 'stars' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : undefined,
            color: activeTab === 'stars' ? '#000' : undefined,
            fontWeight: activeTab === 'stars' ? 700 : undefined,
          }}
        >
          <Star size={16} fill={activeTab === 'stars' ? '#000' : '#f59e0b'} color={activeTab === 'stars' ? '#000' : '#f59e0b'} />
          <span>Star Engine (100k = 1★)</span>
        </button>
      </div>

      {/* TAB 1: LEVEL PROGRESSION ROADMAP */}
      {activeTab === 'levels' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search level by name, number, or coin requirement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', width: '100%' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem 0', textAlign: 'center' }}>
              <Loader />
              <p style={{ color: 'var(--text-dim)', marginTop: '0.5rem' }}>Loading level progression tiers...</p>
            </div>
          ) : filteredLevels.length === 0 ? (
            <div className="panel-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <AlertTriangle size={36} color="#f59e0b" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>No Level Configurations Found</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                You haven't defined any levels yet. Click the button below to generate 20 default progression tiers.
              </p>
              <button className="btn btn-primary" onClick={handleSeedDefaults} style={{ marginTop: '1rem', background: '#f59e0b', color: '#000' }}>
                <Sparkles size={16} style={{ marginRight: '6px' }} />
                <span>Seed 20 Standard Levels</span>
              </button>
            </div>
          ) : (
            <div className="panel-card" style={{ padding: '0.5rem' }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Level</th>
                      <th>Tier Name & Badge</th>
                      <th>Required Coins Spent</th>
                      <th>Currency Rewards</th>
                      <th>Item Rewards (Entry / Frame / VIP)</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLevels.map((lvl) => {
                      const hasItems = lvl.reward_entry_effect_id || lvl.reward_thumbnail_id || lvl.reward_package_id;
                      const hasCurrency = lvl.reward_coins > 0 || lvl.reward_diamonds > 0;

                      return (
                        <tr key={lvl.id}>
                          <td>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: lvl.badge_color || '#f59e0b',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.92rem',
                                boxShadow: `0 4px 10px ${lvl.badge_color}44`,
                              }}
                            >
                              {lvl.level_number}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                                {lvl.level_name}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: `${lvl.badge_color}22`,
                                  color: lvl.badge_color,
                                  fontWeight: 700,
                                  border: `1px solid ${lvl.badge_color}44`,
                                }}
                              >
                                Tier {lvl.level_number}
                              </span>
                            </div>
                            {lvl.description && (
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                {lvl.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#f59e0b', fontSize: '0.92rem' }}>
                              <Coins size={16} />
                              <span>{Number(lvl.min_coins_spent).toLocaleString()} 🪙</span>
                            </div>
                          </td>
                          <td>
                            {hasCurrency ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {lvl.reward_coins > 0 && (
                                  <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>
                                    +{Number(lvl.reward_coins).toLocaleString()} Coins
                                  </span>
                                )}
                                {lvl.reward_diamonds > 0 && (
                                  <span style={{ fontSize: '0.78rem', color: '#06b6d4', fontWeight: 600 }}>
                                    +{Number(lvl.reward_diamonds).toLocaleString()} Diamonds
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>None</span>
                            )}
                          </td>
                          <td>
                            {hasItems ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {lvl.reward_entry_effect_id && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#a78bfa' }}>
                                    <Sparkles size={13} />
                                    <span>Effect: {lvl.effect_name || `#${lvl.reward_entry_effect_id}`}</span>
                                  </div>
                                )}
                                {lvl.reward_thumbnail_id && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#38bdf8' }}>
                                    <ImageIcon size={13} />
                                    <span>Thumbnail: {lvl.thumbnail_name || `#${lvl.reward_thumbnail_id}`}</span>
                                  </div>
                                )}
                                {lvl.reward_package_id && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#f43f5e' }}>
                                    <Crown size={13} />
                                    <span>VIP: {lvl.package_name || `#${lvl.reward_package_id}`}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>None</span>
                            )}
                          </td>
                          <td>
                            {hasItems ? (
                              <span
                                style={{
                                  fontSize: '0.74rem',
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  background: 'rgba(59, 130, 246, 0.12)',
                                  color: '#60a5fa',
                                  fontWeight: 600,
                                  border: '1px solid rgba(59, 130, 246, 0.25)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Clock size={12} />
                                <span>{lvl.reward_validity_days || 7} Days</span>
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>-</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge ${lvl.is_active ? 'badge-success' : 'badge-danger'}`}
                              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                            >
                              {lvl.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenModal(lvl)}
                                title="Edit Level"
                                style={{ padding: '6px' }}
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(lvl)}
                                title="Delete Level"
                                style={{ padding: '6px' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LEVEL SIMULATOR & CALCULATOR */}
      {activeTab === 'calculator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel-card" style={{ border: '1px solid rgba(16, 185, 129, 0.35)' }}>
            <div className="panel-header">
              <div className="panel-title">
                <Calculator size={22} color="#10b981" />
                <span>Live Level & Reward Simulation Calculator</span>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
              Test how user coin spending evaluates against the active level progression tiers and preview what level status, rewards, and perks they unlock.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Simulated Total Coins Spent by User:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    className="input-field"
                    value={simCoinsSpent}
                    onChange={(e) => setSimCoinsSpent(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    style={{ fontSize: '1.1rem', fontWeight: 700, paddingLeft: '32px' }}
                  />
                  <Coins size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end', flexWrap: 'wrap' }}>
                {[500, 5000, 40000, 150000, 1500000, 10000000].map((preset) => (
                  <button
                    key={preset}
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSimCoinsSpent(preset)}
                    style={{ fontSize: '0.78rem' }}
                  >
                    {preset.toLocaleString()} 🪙
                  </button>
                ))}
              </div>
            </div>

            {simulationResult?.achieved && (
              <div
                style={{
                  padding: '1.5rem',
                  borderRadius: '12px',
                  background: 'var(--bg-primary)',
                  border: `1px solid ${simulationResult.achieved.badge_color}55`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: simulationResult.achieved.badge_color || '#f59e0b',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.6rem',
                        fontWeight: 900,
                        boxShadow: `0 6px 18px ${simulationResult.achieved.badge_color}66`,
                      }}
                    >
                      {simulationResult.achieved.level_number}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Current Unlocked Tier</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {simulationResult.achieved.level_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: simulationResult.achieved.badge_color, fontWeight: 700 }}>
                        Required Milestone: {Number(simulationResult.achieved.min_coins_spent).toLocaleString()} Coins
                      </div>
                    </div>
                  </div>

                  {simulationResult.next && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Next Level Target</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: simulationResult.next.badge_color }}>
                        Level {simulationResult.next.level_number}: {simulationResult.next.level_name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 700 }}>
                        Needs {simulationResult.needed.toLocaleString()} more coins
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '5px' }}>
                    <span>Progression towards Next Level</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{simulationResult.progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', borderRadius: '5px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${simulationResult.progress}%`,
                        height: '100%',
                        borderRadius: '5px',
                        background: `linear-gradient(90deg, ${simulationResult.achieved.badge_color}, #10b981)`,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Rewards overview for this tier */}
                <div style={{ marginTop: '1.35rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                    Rewards Granted at this Level:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                      <div style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 600 }}>🪙 Bonus Coins</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>
                        +{Number(simulationResult.achieved.reward_coins || 0).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                      <div style={{ fontSize: '0.74rem', color: '#06b6d4', fontWeight: 600 }}>💎 Bonus Diamonds</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#06b6d4' }}>
                        +{Number(simulationResult.achieved.reward_diamonds || 0).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.25)' }}>
                      <div style={{ fontSize: '0.74rem', color: '#a78bfa', fontWeight: 600 }}>✨ Entry Effect</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginTop: '3px' }}>
                        {simulationResult.achieved.effect_name || 'None'}
                      </div>
                      {simulationResult.achieved.reward_entry_effect_id && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          Valid for {simulationResult.achieved.reward_validity_days || 7} days
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                      <div style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 600 }}>🖼️ Special Thumbnail</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginTop: '3px' }}>
                        {simulationResult.achieved.thumbnail_name || 'None'}
                      </div>
                      {simulationResult.achieved.reward_thumbnail_id && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          Valid for {simulationResult.achieved.reward_validity_days || 7} days
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
                      <div style={{ fontSize: '0.74rem', color: '#f43f5e', fontWeight: 600 }}>👑 VIP Package</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginTop: '3px' }}>
                        {simulationResult.achieved.package_name || 'None'}
                      </div>
                      {simulationResult.achieved.reward_package_id && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          Valid for {simulationResult.achieved.reward_validity_days || 7} days
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REWARD AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loadingHistory ? (
            <div style={{ padding: '3rem 0', textAlign: 'center' }}>
              <Loader />
              <p style={{ color: 'var(--text-dim)', marginTop: '0.5rem' }}>Loading reward distribution logs...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="panel-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <History size={36} color="var(--text-dim)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>No Level-Up Rewards Recorded Yet</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                When users spend coins on gifts, 1-on-1 calls, or store packages, their level promotions and awarded perks will be logged here.
              </p>
            </div>
          ) : (
            <div className="panel-card" style={{ padding: '0.5rem' }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Level Reached</th>
                      <th>Coins & Diamonds</th>
                      <th>Unlocked Perks</th>
                      <th>Validity</th>
                      <th>Claimed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={h.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                              alt=""
                              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                {h.user_name || `User #${h.user_id}`}
                              </div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ID: {h.user_id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              background: `${h.badge_color || '#f59e0b'}22`,
                              color: h.badge_color || '#f59e0b',
                              fontWeight: 700,
                              border: `1px solid ${h.badge_color || '#f59e0b'}44`,
                            }}
                          >
                            Level {h.level_reached} ({h.level_name || 'Tier'})
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', fontWeight: 700 }}>
                            {h.coins_awarded > 0 && <span style={{ color: '#f59e0b' }}>+{h.coins_awarded} 🪙</span>}
                            {h.diamonds_awarded > 0 && <span style={{ color: '#06b6d4' }}>+{h.diamonds_awarded} 💎</span>}
                            {!h.coins_awarded && !h.diamonds_awarded && <span style={{ color: 'var(--text-dim)' }}>-</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.76rem' }}>
                            {h.effect_name && (
                              <span style={{ color: '#a78bfa' }}>✨ Effect: {h.effect_name}</span>
                            )}
                            {h.thumbnail_name && (
                              <span style={{ color: '#38bdf8' }}>🖼️ Frame: {h.thumbnail_name}</span>
                            )}
                            {h.package_name && (
                              <span style={{ color: '#f43f5e' }}>👑 VIP: {h.package_name}</span>
                            )}
                            {!h.effect_name && !h.thumbnail_name && !h.package_name && (
                              <span style={{ color: 'var(--text-dim)' }}>No item reward</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {h.reward_duration_days > 0 ? (
                            <span style={{ fontSize: '0.76rem', color: '#60a5fa', fontWeight: 600 }}>
                              {h.reward_duration_days} Days
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>Permanent</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                          {h.claimed_at ? new Date(h.claimed_at).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STAR PROGRESSION ENGINE */}
      {activeTab === 'stars' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header Card */}
          <div
            className="panel-card"
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Star size={26} color="#f59e0b" fill="#f59e0b" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Star Progression Engine (1 Lakh = 1.0★, 1.2 Lakh = 1.2★)
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Formula: <code>Stars = Metric / Base Coins</code>. E.g. 100,000 = 1.0 Star, 120,000 = 1.2 Stars, 200,000 = 2.0 Stars.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={recalculatingStars}
                  onClick={handleRecalculateAllStars}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} className={recalculatingStars ? 'spin' : ''} />
                  <span>{recalculatingStars ? 'Recalculating...' : 'Recalculate All Users'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={savingStars}
                  onClick={handleSaveStars}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f59e0b', borderColor: '#f59e0b', color: '#000', fontWeight: 700 }}
                >
                  {savingStars ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={14} />}
                  <span>{savingStars ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
              <div style={{ padding: '0.9rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Starred Users</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                  {Number(starStats.total_starred_users || 0).toLocaleString()} Users
                </div>
              </div>
              <div style={{ padding: '0.9rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Highest Star Rating</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  ⭐ {Number(starStats.highest_star || 0).toFixed(1)} Stars
                </div>
              </div>
              <div style={{ padding: '0.9rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Star Rating</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
                  ⭐ {Number(starStats.average_star || 0).toFixed(2)} Stars
                </div>
              </div>
            </div>
          </div>

          {/* Form & Simulator Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {/* Left: Configuration Controls */}
            <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Star Formula Parameters
              </h4>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(starConfig.star_system_enabled)}
                    onChange={(e) => setStarConfig((prev) => ({ ...prev, star_system_enabled: e.target.checked }))}
                  />
                  <span>Enable Star Progression Engine System-Wide</span>
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '24px', display: 'block', marginTop: '3px' }}>
                  When enabled, user stars are automatically calculated and displayed across mobile app and admin panels.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Coins Requirement Per 1.0 Star (Base Coins) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="input-field"
                  value={starConfig.star_coins_per_unit || 100000}
                  onChange={(e) => setStarConfig((prev) => ({ ...prev, star_coins_per_unit: Number(e.target.value) }))}
                  style={{ fontWeight: 700, fontSize: '1rem', color: '#f59e0b' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  Default: <strong>100,000</strong> (1 Lakh). With 100,000, spending 120,000 gives <strong>1.2 Stars</strong>.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Metric Source
                  </label>
                  <select
                    className="input-field"
                    value={starConfig.star_metric_type || 'coins_spent'}
                    onChange={(e) => setStarConfig((prev) => ({ ...prev, star_metric_type: e.target.value }))}
                  >
                    <option value="coins_spent">Total Coins Spent (Recommended)</option>
                    <option value="diamonds">Diamond Balance</option>
                    <option value="wallet_coins">Current Coin Balance</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Decimal Precision
                  </label>
                  <select
                    className="input-field"
                    value={starConfig.star_decimal_precision ?? 1}
                    onChange={(e) => setStarConfig((prev) => ({ ...prev, star_decimal_precision: Number(e.target.value) }))}
                  >
                    <option value={1}>1 Decimal (1.2 Stars - Recommended)</option>
                    <option value={2}>2 Decimals (1.20 Stars)</option>
                    <option value={0}>Whole Numbers Only (Floor)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Max Star Cap (Upper Limit)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="input-field"
                  value={starConfig.star_max_stars || 100}
                  onChange={(e) => setStarConfig((prev) => ({ ...prev, star_max_stars: Number(e.target.value) }))}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  Maximum stars a user can reach (default: 100).
                </span>
              </div>
            </div>

            {/* Right: Interactive Live Simulator */}
            <div
              className="panel-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem' }}>
                <Calculator size={18} color="#a78bfa" />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Interactive Live Star Simulator
                </h4>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Test Coins Spent Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="input-field"
                  value={simStarCoins}
                  onChange={(e) => setSimStarCoins(Number(e.target.value))}
                  style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}
                />
              </div>

              {/* Quick Preset Pills */}
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Quick Preset Tests
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { label: '50K (0.5★)', val: 50000 },
                    { label: '1 Lakh (1.0★)', val: 100000 },
                    { label: '1.2 Lakh (1.2★)', val: 120000 },
                    { label: '1.5 Lakh (1.5★)', val: 150000 },
                    { label: '2 Lakh (2.0★)', val: 200000 },
                    { label: '5 Lakh (5.0★)', val: 500000 },
                    { label: '10 Lakh (10★)', val: 1000000 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setSimStarCoins(preset.val)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: simStarCoins === preset.val ? '#f59e0b' : 'rgba(255, 255, 255, 0.06)',
                        color: simStarCoins === preset.val ? '#000' : 'var(--text-main)',
                        border: simStarCoins === preset.val ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation Result Box */}
              <div
                style={{
                  borderRadius: '12px',
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.05) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Computed Star Rating
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                  <Star size={32} fill="#f59e0b" color="#f59e0b" />
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f59e0b' }}>
                    {simStarComputed}
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-dim)' }}>Stars</span>
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {Number(simStarCoins).toLocaleString()} coins ÷ {Number(starConfig.star_coins_per_unit || 100000).toLocaleString()} base = <strong>{simStarComputed} Stars</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Top Starred Users Leaderboard */}
          {topStarUsers.length > 0 && (
            <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="#f59e0b" />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Current Top Starred Users on Platform
                </h4>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Level</th>
                      <th>Total Coins Spent</th>
                      <th>Current Star Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topStarUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img
                              src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
                              alt=""
                              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                              <strong style={{ color: 'var(--text-main)', display: 'block' }}>{u.full_name || 'Anonymous User'}</strong>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>ID: #{u.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.72rem', textTransform: 'capitalize', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#f59e0b' }}>Lv.{u.level}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{Number(u.total_coins_spent || 0).toLocaleString()} 🪙</span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 9px',
                              borderRadius: '12px',
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#fbbf24',
                              fontWeight: 800,
                              border: '1px solid rgba(245, 158, 11, 0.35)',
                            }}
                          >
                            <Star size={13} fill="#fbbf24" color="#fbbf24" />
                            <span>{Number(u.star || 0).toFixed(starConfig.star_decimal_precision ?? 1)} ★</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '100%' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                {editingLevel ? `Edit Level ${editingLevel.level_number}` : 'Add New Progression Level'}
              </h3>
              <button className="btn-close" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Level Number *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={formData.level_number}
                    onChange={(e) => setFormData({ ...formData, level_number: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Level Title / Name *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Bronze Novice, Diamond Champion..."
                    value={formData.level_name}
                    onChange={(e) => setFormData({ ...formData, level_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Required Coins Spent (Milestone) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    placeholder="e.g. 15000"
                    value={formData.min_coins_spent}
                    onChange={(e) => setFormData({ ...formData, min_coins_spent: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Badge Color
                  </label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={formData.badge_color}
                      onChange={(e) => setFormData({ ...formData, badge_color: e.target.value })}
                      style={{ width: '40px', height: '38px', padding: 0, borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="input-field"
                      value={formData.badge_color}
                      onChange={(e) => setFormData({ ...formData, badge_color: e.target.value })}
                      style={{ flex: 1, textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
              </div>

              {/* Currency Rewards */}
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                  Wallet Currency Bonuses (Credited to User):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Bonus Coins (🪙)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={formData.reward_coins}
                      onChange={(e) => setFormData({ ...formData, reward_coins: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Bonus Diamonds (💎)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={formData.reward_diamonds}
                      onChange={(e) => setFormData({ ...formData, reward_diamonds: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Item Rewards Selection */}
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                  Unlockable Item Perks & Validity Days:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Entry Effect */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Reward Entry Effect:
                    </label>
                    <select
                      className="select-field"
                      value={formData.reward_entry_effect_id}
                      onChange={(e) => setFormData({ ...formData, reward_entry_effect_id: e.target.value })}
                      style={{ width: '100%' }}
                    >
                      <option value="">-- No Entry Effect --</option>
                      {rewardOptions.entry_effects.map((ef) => (
                        <option key={ef.id} value={ef.id}>
                          {ef.name} ({ef.effect_type?.toUpperCase() || 'SVGA'}) - {ef.price} coins
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Thumbnail */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Reward Special Thumbnail Frame:
                    </label>
                    <select
                      className="select-field"
                      value={formData.reward_thumbnail_id}
                      onChange={(e) => setFormData({ ...formData, reward_thumbnail_id: e.target.value })}
                      style={{ width: '100%' }}
                    >
                      <option value="">-- No Thumbnail Frame --</option>
                      {rewardOptions.thumbnails.map((th) => (
                        <option key={th.id} value={th.id}>
                          {th.name} - {th.price} coins
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* VIP Package */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Reward VIP Privilege Package:
                    </label>
                    <select
                      className="select-field"
                      value={formData.reward_package_id}
                      onChange={(e) => setFormData({ ...formData, reward_package_id: e.target.value })}
                      style={{ width: '100%' }}
                    >
                      <option value="">-- No VIP Package --</option>
                      {rewardOptions.packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} - {pkg.price} coins
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Validity Days */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Reward Validity Period (Duration for Effect, Thumbnail & Package):
                    </label>
                    <select
                      className="select-field"
                      value={formData.reward_validity_days}
                      onChange={(e) => setFormData({ ...formData, reward_validity_days: e.target.value })}
                      style={{ width: '100%' }}
                    >
                      <option value="3">3 Days</option>
                      <option value="7">7 Days (Standard)</option>
                      <option value="15">15 Days</option>
                      <option value="30">30 Days (1 Month)</option>
                      <option value="60">60 Days (2 Months)</option>
                      <option value="90">90 Days (3 Months)</option>
                      <option value="365">365 Days (1 Year)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Description / Milestone Note
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional note describing the level requirements..."
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="level_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label htmlFor="level_is_active" style={{ fontSize: '0.84rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  Enable this level tier (Users can reach and unlock rewards)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#000' }}
                >
                  {saving ? 'Saving...' : editingLevel ? 'Update Level' : 'Create Level'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
