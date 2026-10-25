import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Sliders,
  Gem,
  Coins,
  Plus,
  Trash2,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  User,
  Users,
  Building,
  ShoppingBag,
  Shield,
  Video,
  Mic,
} from 'lucide-react';
import withdrawalApi from '../api/withdrawalApi';
import { adminApi } from '../api/adminApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import UserDetailsModal from '../components/UserDetailsModal';
import BulkActionBar from '../components/BulkActionBar';
import { useEconomy } from '../context/EconomyContext';

export default function Withdrawals({ onToast }) {
  const { isDiamondMode } = useEconomy();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionType, setActionType] = useState('approved');
  const [adminNotes, setAdminNotes] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailsUserId, setDetailsUserId] = useState(null);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);


  const [showConfig, setShowConfig] = useState(false);
  const [minDiamonds, setMinDiamonds] = useState(1000);
  const [presets, setPresets] = useState([1000, 2000, 5000, 10000, 25000, 50000]);
  const [newPresetVal, setNewPresetVal] = useState('');
  const [allowManualInput, setAllowManualInput] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Role-Based Cashout Rules
  const [activeRoleTab, setActiveRoleTab] = useState('user');
  const [roleFilter, setRoleFilter] = useState('all');
  const [roleRates, setRoleRates] = useState({
    user: { isEnabled: true, diamondBase: 100000, takaAmount: 4000, minWithdrawal: 1000, label: 'Normal User' },
    agency: { isEnabled: true, diamondBase: 100000, takaAmount: 6000, minWithdrawal: 5000, label: 'Agency Partner' },
    reseller: { isEnabled: true, diamondBase: 100000, takaAmount: 5500, minWithdrawal: 5000, label: 'Coin / Diamond Reseller' },
    moderator: { isEnabled: true, diamondBase: 100000, takaAmount: 4500, minWithdrawal: 1000, label: 'Platform Moderator' },
    video: { isEnabled: true, diamondBase: 100000, takaAmount: 5000, minWithdrawal: 1000, label: 'Video Host' },
    audio: { isEnabled: true, diamondBase: 100000, takaAmount: 3500, minWithdrawal: 1000, label: 'Audio Host' },
  });

  const fetchConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await withdrawalApi.getWithdrawalConfig();
      if (res.success && res.config) {
        setMinDiamonds(res.config.min_withdrawal_diamonds || res.config.minWithdrawalDiamonds || 1000);
        setPresets(res.config.withdrawal_presets || res.config.withdrawalPresets || [1000, 2000, 5000, 10000, 25000, 50000]);
        setAllowManualInput(res.config.allow_manual_withdrawal_input !== false && res.config.allowManualInput !== false);
        if (res.config.rates) {
          setRoleRates((prev) => ({
            ...prev,
            ...res.config.rates,
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch withdrawal config:', err.message);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleRoleRateChange = (roleKey, field, val) => {
    setRoleRates((prev) => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        [field]: val,
      },
    }));
  };

  const handleSaveConfig = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingConfig(true);
      const res = await withdrawalApi.updateWithdrawalConfig({
        is_convert_to_diamond: isDiamondMode,
        minWithdrawalDiamonds: parseInt(minDiamonds, 10) || 1000,
        withdrawalPresets: presets,
        allowManualInput: allowManualInput,
        rates: roleRates,
      });
      if (res.success) {
        onToast('Role-based withdrawal rules, rates & presets updated successfully!', 'success');
        fetchConfig();
        fetchWithdrawals();
      }
    } catch (err) {
      onToast(err.message || 'Failed to update withdrawal configuration.', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddPreset = () => {
    const val = parseInt(newPresetVal, 10);
    if (!val || isNaN(val) || val <= 0) {
      onToast('Enter a valid positive number for preset amount.', 'error');
      return;
    }
    if (presets.includes(val)) {
      onToast('Preset amount already exists in list.', 'error');
      return;
    }
    const updated = [...presets, val].sort((a, b) => a - b);
    setPresets(updated);
    setNewPresetVal('');
  };

  const handleRemovePreset = (val) => {
    if (presets.length <= 1) {
      onToast('You must keep at least one preset option.', 'error');
      return;
    }
    setPresets(presets.filter((p) => p !== val));
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === withdrawals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(withdrawals.map((w) => w.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await adminApi.bulkDelete('withdrawals', selectedIds);
      if (res.success) {
        onToast(`Successfully deleted ${res.count || selectedIds.length} withdrawal requests.`, 'success');
        setSelectedIds([]);
        fetchWithdrawals();
      }
    } catch (err) {
      onToast(err.message || 'Failed to bulk delete requests.', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await withdrawalApi.getWithdrawals({
        status: statusFilter,
        role: roleFilter,
      });
      if (res.success) {
        setWithdrawals(res.withdrawals);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
    fetchConfig();
  }, [statusFilter, roleFilter]);

  const handleProcess = async () => {
    if (!selectedItem) return;
    try {
      const res = await withdrawalApi.processWithdrawal(selectedItem.id, actionType, adminNotes);
      if (res.success) {
        onToast(`Withdrawal #${selectedItem.id} marked as ${actionType}.`, 'success');
        setSelectedItem(null);
        setAdminNotes('');
        fetchWithdrawals();
      }
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  return (
    <div>
      {/* Top Controls: Filter & Settings Toolbar */}
      <div className="panel-card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Payout Requests ({withdrawals.length})
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowConfig(!showConfig)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sliders size={15} color="#8b5cf6" />
              <span>Rules & Presets</span>
              {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Filter size={16} color="var(--text-dim)" />
              <select
                className="select-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Only</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                className="select-field"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Account Roles</option>
                <option value="user">👤 Normal Users</option>
                <option value="agency">🏢 Agency Partners</option>
                <option value="reseller">🛍️ Coin Resellers</option>
                <option value="moderator">🛡️ Moderators</option>
                <option value="video_host">🎥 Video Hosts</option>
                <option value="audio_host">🎙️ Audio Hosts</option>
              </select>
            </div>
          </div>
        </div>

        {/* Collapsible Withdrawal Configuration & Presets Panel */}
        {showConfig && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.03) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isDiamondMode ? <Gem size={18} color="#a78bfa" /> : <Coins size={18} color="#f59e0b" />}
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isDiamondMode ? '#c4b5fd' : '#fcd34d' }}>
                  {isDiamondMode ? 'Diamond Cashout Rules & Preset Policy' : 'Coin Cashout Rules & Preset Policy'}
                </span>
              </div>
              <span className={`badge ${isDiamondMode ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                {isDiamondMode ? '💎 Diamond Conversion Mode (ON)' : '🪙 Direct Coin Cashout Mode'}
              </span>
            </div>

            {/* Economy Mode Currency Banner */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Withdrawal Economy Currency:</span>
                  <span style={{ color: isDiamondMode ? '#7c3aed' : '#d97706', fontWeight: 800 }}>
                    {isDiamondMode ? '💎 Diamond Cashout' : '🪙 Direct Coin Cashout'}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {isDiamondMode
                    ? 'Diamond Conversion is ON: Streamers cash out accumulated Diamonds (💎).'
                    : 'Streamers cash out accumulated Coins (🪙) directly.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* 1. Minimum Withdrawal */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  {isDiamondMode ? 'Global Minimum Threshold (💎 Diamonds)' : 'Global Minimum Threshold (🪙 Coins)'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    className="input-field"
                    style={{ maxWidth: '180px' }}
                    value={minDiamonds}
                    onChange={(e) => setMinDiamonds(e.target.value)}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{isDiamondMode ? 'diamonds' : 'coins'}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  Fallback minimum for accounts without role-specific threshold.
                </span>
              </div>

              {/* 2. Manual Input Toggle */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Allow Custom Manual Amount Input
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setAllowManualInput(!allowManualInput)}
                    className={`btn btn-sm ${allowManualInput ? 'btn-success' : 'btn-secondary'}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                    }}
                  >
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: allowManualInput ? '#22c55e' : '#94a3b8',
                      }}
                    />
                    <span>{allowManualInput ? 'ON — Custom Input Allowed' : 'OFF — Presets Only'}</span>
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px', display: 'block' }}>
                  {allowManualInput
                    ? `Users can type any custom ${isDiamondMode ? 'diamond' : 'coin'} amount (must be ≥ minimum).`
                    : 'Strict Mode: Users can ONLY choose from the preset amounts below.'}
                </span>
              </div>
            </div>

            {/* 3. Withdrawal Presets Editor */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Withdrawal Preset Options ({isDiamondMode ? '💎 Diamond' : '🪙 Coin'} Amounts)
              </label>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                {presets.map((val) => (
                  <div
                    key={val}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: isDiamondMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      border: isDiamondMode ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: isDiamondMode ? '#ddd6fe' : '#fde68a',
                    }}
                  >
                    <span>{isDiamondMode ? '💎 ' : '🪙 '}{val.toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePreset(val)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: 'rgba(255,255,255,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Remove this preset"
                    >
                      <Trash2 size={13} color="#f87171" />
                    </button>
                  </div>
                ))}

                {/* Add new preset inline form */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    placeholder="New amount..."
                    className="input-field"
                    style={{ width: '130px', padding: '4px 8px', fontSize: '0.8rem' }}
                    value={newPresetVal}
                    onChange={(e) => setNewPresetVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPreset();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddPreset}
                    style={{ padding: '4px 8px' }}
                    title="Add preset"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                These preset quick-cashout buttons appear on the mobile cashout screen.
              </span>
            </div>

            {/* 4. Role-Specific Cashout Rules & Exchange Rates */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                  <Users size={18} color="#8b5cf6" />
                  <span>Role-Based Cashout Rules & Rates (Normal Users, Agencies, Resellers, Moderators & Hosts)</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Define exchange rates, minimum cashout limits, and enable/disable cashout privileges for each account role.
                </div>
              </div>

              {/* Role Switcher Pill Tabs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {[
                  { id: 'user', name: 'Normal User', icon: User, color: '#8b5cf6', desc: 'General non-host audience and regular app users' },
                  { id: 'agency', name: 'Agency Partner', icon: Building, color: '#f97316', desc: 'Agency managers withdrawing host commission earnings' },
                  { id: 'reseller', name: 'Coin Reseller', icon: ShoppingBag, color: '#f59e0b', desc: 'Authorized coin and diamond merchants/resellers' },
                  { id: 'moderator', name: 'Platform Moderator', icon: Shield, color: '#06b6d4', desc: 'In-app moderators and safety personnel' },
                  { id: 'video', name: 'Video Host', icon: Video, color: '#3b82f6', desc: 'Official video broadcasters and streamers' },
                  { id: 'audio', name: 'Audio Host', icon: Mic, color: '#10b981', desc: 'Audio space and voice chat room broadcasters' },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeRoleTab === tab.id;
                  const roleData = roleRates[tab.id] || {};
                  const isEnabled = roleData.isEnabled !== false;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveRoleTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isActive ? `1.5px solid ${tab.color}` : '1px solid var(--border-color)',
                        background: isActive ? `${tab.color}22` : 'var(--bg-secondary)',
                        color: isActive ? tab.color : 'var(--text-dim)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={14} color={isActive ? tab.color : 'var(--text-dim)'} />
                      <span>{tab.name}</span>
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: isEnabled ? '#10b981' : '#ef4444',
                        }}
                        title={isEnabled ? 'Cashout Enabled' : 'Cashout Disabled'}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Active Role Configuration Card */}
              {(() => {
                const tabsList = [
                  { id: 'user', name: 'Normal User', icon: User, color: '#8b5cf6', desc: 'General non-host audience and regular app users' },
                  { id: 'agency', name: 'Agency Partner', icon: Building, color: '#f97316', desc: 'Agency managers withdrawing host commission earnings' },
                  { id: 'reseller', name: 'Coin Reseller', icon: ShoppingBag, color: '#f59e0b', desc: 'Authorized coin and diamond merchants/resellers' },
                  { id: 'moderator', name: 'Platform Moderator', icon: Shield, color: '#06b6d4', desc: 'In-app moderators and safety personnel' },
                  { id: 'video', name: 'Video Host', icon: Video, color: '#3b82f6', desc: 'Official video broadcasters and streamers' },
                  { id: 'audio', name: 'Audio Host', icon: Mic, color: '#10b981', desc: 'Audio space and voice chat room broadcasters' },
                ];
                const currentTab = tabsList.find((t) => t.id === activeRoleTab) || tabsList[0];
                const currentData = roleRates[activeRoleTab] || {
                  isEnabled: true,
                  diamondBase: 100000,
                  takaAmount: 4000,
                  minWithdrawal: 1000,
                };
                const isEnabled = currentData.isEnabled !== false;
                const base = parseFloat(currentData.diamondBase || '100000') || 100000;
                const taka = parseFloat(currentData.takaAmount || '4000') || 4000;
                const min = parseInt(currentData.minWithdrawal || '1000', 10) || 1000;
                const unitRate = base > 0 ? taka / base : 0.04;
                const IconComponent = currentTab.icon;

                return (
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      background: 'var(--bg-secondary)',
                      border: `1px solid ${currentTab.color}40`,
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 800, color: currentTab.color }}>
                          <IconComponent size={18} />
                          <span>{currentTab.name} Cashout Configuration</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          {currentTab.desc}
                        </div>
                      </div>

                      {/* Cashout Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => handleRoleRateChange(activeRoleTab, 'isEnabled', !isEnabled)}
                        className={`btn btn-sm ${isEnabled ? 'btn-success' : 'btn-danger'}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '5px 12px' }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isEnabled ? '#22c55e' : '#f87171' }} />
                        <span>{isEnabled ? 'Cashout Allowed: ON' : 'Cashout Disabled: OFF'}</span>
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      {/* Base Units */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                          Base {isDiamondMode ? 'Diamonds (💎)' : 'Coins (🪙)'}:
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1000"
                          className="input-field"
                          value={currentData.diamondBase || 100000}
                          onChange={(e) => handleRoleRateChange(activeRoleTab, 'diamondBase', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>

                      {/* Payout BDT */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                          Payout Amount (৳ BDT):
                        </label>
                        <input
                          type="number"
                          step="10"
                          min="1"
                          className="input-field"
                          value={currentData.takaAmount || 4000}
                          onChange={(e) => handleRoleRateChange(activeRoleTab, 'takaAmount', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* Minimum Threshold */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                          Min Withdrawal ({isDiamondMode ? '💎' : '🪙'}):
                        </label>
                        <input
                          type="number"
                          step="100"
                          min="1"
                          className="input-field"
                          value={currentData.minWithdrawal || 1000}
                          onChange={(e) => handleRoleRateChange(activeRoleTab, 'minWithdrawal', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>

                    {/* Calculated Live Simulation Pill */}
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: `${currentTab.color}15`,
                        border: `1px solid ${currentTab.color}33`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: currentTab.color,
                      }}
                    >
                      <span>1 {isDiamondMode ? '💎' : '🪙'} = ৳{unitRate.toFixed(4)} BDT</span>
                      <span>10,000 = ৳{(10000 * unitRate).toFixed(0)} BDT</span>
                      <span>100,000 = ৳{(100000 * unitRate).toFixed(0)} BDT</span>
                      <span style={{ color: isEnabled ? '#10b981' : '#ef4444' }}>
                        {isEnabled ? '✓ Mobile Users can Cashout' : '✕ Mobile Cashout Blocked'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveConfig}
                disabled={savingConfig}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={15} />
                <span>{savingConfig ? 'Saving...' : 'Save Cashout Rules'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={withdrawals.length}
        onSelectAll={handleToggleSelectAll}
        onClearSelection={() => setSelectedIds([])}
        onDelete={handleBulkDelete}
        entityName="withdrawal requests"
        deleting={bulkDeleting}
      />

      {/* Table */}
      <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '45px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={withdrawals.length > 0 && selectedIds.length === withdrawals.length}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                    title="Select all on this page"
                  />
                </th>
                <th className="user-id-cell" style={{ width: '125px', minWidth: '125px', whiteSpace: 'nowrap' }}>Host / User ID</th>
                <th>Account Role</th>
                <th>User Details</th>
                <th>Request ID</th>
                <th>{isDiamondMode ? 'Requested Diamonds (💎)' : 'Requested Coins (🪙)'}</th>
                <th>Payout (BDT)</th>
                <th>Amount (USD)</th>
                <th>Payment Method</th>
                <th>Account Info</th>
                <th>Status</th>
                <th>Requested At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="13" style={{ padding: '3rem 1rem' }}>
                    <Loader text="Fetching cashout requests..." />
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                    No withdrawal requests found
                  </td>
                </tr>
              ) : (
                withdrawals.slice((page - 1) * pageSize, page * pageSize).map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                  <tr key={item.id} style={isSelected ? { backgroundColor: 'rgba(239, 68, 68, 0.08)' } : {}}>
                    {/* Selection Checkbox */}
                    <td style={{ textAlign: 'center', width: '45px', padding: '0.75rem 0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                        title={`Select request #${item.id}`}
                      />
                    </td>

                    {/* 1. Host User ID Column First */}
                    <td className="user-id-cell" style={{ whiteSpace: 'nowrap', width: '125px', minWidth: '125px' }}>
                      <span
                        className="user-id-badge"
                        onClick={() => setDetailsUserId(item.host_id)}
                        title="Click to view full user profile & telemetry"
                      >
                        ID: #{item.host_id}
                      </span>
                    </td>

                    {/* Account Role Badge */}
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: item.user_role_badge?.color || '#8b5cf6',
                          background: item.user_role_badge?.bg || 'rgba(139, 92, 246, 0.12)',
                          border: `1px solid ${item.user_role_badge?.color || '#8b5cf6'}33`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.user_role_label || 'Normal User'}
                      </span>
                    </td>

                    {/* 2. User Details */}
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
                        onClick={() => setDetailsUserId(item.host_id)}
                        title="Click to view user profile & telemetry"
                      >
                        <img
                          src={item.host_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.host_id}`}
                          alt={String(item.host_id)}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                          {item.host_name}
                        </div>
                      </div>
                    </td>

                    <td style={{ fontWeight: 600, color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      #{item.id}
                    </td>

                    {(() => {
                      if (!isDiamondMode) {
                        const amt = Number(item.coin_amount || item.diamond_amount || item.amount || 0);
                        return (
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ color: '#d97706', fontWeight: 800, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>🪙</span>
                                <span>{amt.toLocaleString()}</span>
                              </span>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  color: '#d97706',
                                  background: 'rgba(217, 119, 6, 0.12)',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  width: 'fit-content',
                                  fontWeight: 700,
                                }}
                              >
                                Coin Cashout
                              </span>
                            </div>
                          </td>
                        );
                      }

                      const isDiamond = Number(item.diamond_amount) > 0;
                      const isCoin = Number(item.coin_amount) > 0;

                      if (isDiamond) {
                        return (
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ color: '#0284c7', fontWeight: 800, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>💎</span>
                                <span>{Number(item.diamond_amount).toLocaleString()}</span>
                              </span>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  color: '#0284c7',
                                  background: 'rgba(2, 132, 199, 0.12)',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  width: 'fit-content',
                                  fontWeight: 700,
                                }}
                              >
                                Diamond Cashout
                              </span>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ color: '#d97706', fontWeight: 800, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🪙</span>
                              <span>{Number(item.coin_amount || item.amount || 0).toLocaleString()}</span>
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                color: '#d97706',
                                background: 'rgba(217, 119, 6, 0.12)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                width: 'fit-content',
                                fontWeight: 700,
                              }}
                            >
                              Coin Cashout
                            </span>
                          </div>
                        </td>
                      );
                    })()}

                    {/* Payout (BDT) */}
                    <td>
                      <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.95rem' }}>
                        ৳{item.payout_amount ? parseFloat(item.payout_amount).toLocaleString() : ((item.amount || item.diamond_amount || item.coin_amount || 0) * 0.04).toFixed(2)}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>
                        BDT
                      </span>
                    </td>

                    <td style={{ color: '#059669', fontWeight: 700, fontSize: '0.9rem' }}>
                      ${parseFloat(item.usd_amount || 0).toFixed(2)}
                    </td>

                    <td>
                      <span className="badge badge-primary">{item.payment_method}</span>
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {item.account_details}
                    </td>

                    <td>
                      {item.status === 'pending' && (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Pending
                        </span>
                      )}
                      {item.status === 'approved' && (
                        <span className="badge badge-success">Approved</span>
                      )}
                      {item.status === 'rejected' && (
                        <span className="badge badge-danger">Rejected</span>
                      )}
                    </td>

                    <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(item.created_at).toLocaleString()}
                    </td>

                    <td>
                      {item.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: '#059669' }}
                            onClick={() => {
                              setSelectedItem(item);
                              setActionType('approved');
                              setAdminNotes(`Approved payment of $${item.usd_amount} via ${item.payment_method}`);
                            }}
                          >
                            <CheckCircle size={14} />
                            <span>Approve</span>
                          </button>

                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ borderColor: 'rgba(244, 63, 94, 0.4)', color: '#e11d48' }}
                            onClick={() => {
                              setSelectedItem(item);
                              setActionType('rejected');
                              setAdminNotes('Information mismatch or invalid account details.');
                            }}
                          >
                            <XCircle size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {item.admin_notes || 'Processed'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>

        {withdrawals.length > 0 && (
          <Pagination
            currentPage={page}
            totalItems={withdrawals.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
          />
        )}
      </div>

      {/* User Details Telemetry Modal */}
      {detailsUserId && (
        <UserDetailsModal
          userId={detailsUserId}
          onClose={() => setDetailsUserId(null)}
          onToast={onToast}
        />
      )}

      {/* Process Modal */}
      {selectedItem && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: actionType === 'approved' ? '#059669' : '#e11d48' }}>
              {actionType === 'approved' ? 'Approve Cashout' : 'Reject Cashout'} #{selectedItem.id}
            </h3>

            {(() => {
              const isDiamond = isDiamondMode && Number(selectedItem.diamond_amount) > 0;
              const requestedLabel = isDiamond 
                ? `💎 ${Number(selectedItem.diamond_amount).toLocaleString()} Diamonds`
                : `🪙 ${Number(selectedItem.coin_amount || selectedItem.diamond_amount || selectedItem.amount || 0).toLocaleString()} Coins`;
              const refundLabel = isDiamond
                ? `${Number(selectedItem.diamond_amount).toLocaleString()} diamonds`
                : `${Number(selectedItem.coin_amount || selectedItem.diamond_amount || selectedItem.amount || 0).toLocaleString()} coins`;

              return (
                <div style={{ fontSize: '0.86rem', color: 'var(--text-dim)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  <div>Host: <strong>{selectedItem.host_name}</strong> (ID: #{selectedItem.host_id})</div>
                  <div style={{ marginTop: '4px' }}>
                    Requested: <strong style={{ color: isDiamond ? '#0284c7' : '#d97706' }}>{requestedLabel}</strong> | Payout Amount: <strong>${selectedItem.usd_amount} USD</strong> {selectedItem.payout_amount ? `(৳${selectedItem.payout_amount} BDT)` : ''}
                  </div>
                  {actionType === 'rejected' && (
                    <div style={{ marginTop: '0.65rem', padding: '0.6rem 0.8rem', background: 'rgba(225, 29, 72, 0.1)', border: '1px solid rgba(225, 29, 72, 0.25)', borderRadius: '8px', color: '#e11d48', fontSize: '0.8rem' }}>
                      ⚠️ <strong>Auto-Refund:</strong> Rejecting will automatically refund <strong>{refundLabel}</strong> back to the host's wallet balance.
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Admin Notes / Transaction Ref:
              </label>
              <textarea
                className="input-field"
                rows="3"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter payout confirmation code, bank reference, or reason for decline..."
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedItem(null)}
              >
                Cancel
              </button>
              <button
                className={actionType === 'approved' ? 'btn btn-primary' : 'btn btn-danger'}
                onClick={handleProcess}
              >
                Confirm {actionType === 'approved' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
