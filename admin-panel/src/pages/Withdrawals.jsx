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
} from 'lucide-react';
import withdrawalApi from '../api/withdrawalApi';
import { adminApi } from '../api/adminApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import UserDetailsModal from '../components/UserDetailsModal';
import BulkActionBar from '../components/BulkActionBar';

export default function Withdrawals({ onToast }) {
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

  // Dual Economy Mode
  const [isDiamondMode, setIsDiamondMode] = useState(true);

  // Withdrawal Rules & Preset Configuration State
  const [showConfig, setShowConfig] = useState(false);
  const [minDiamonds, setMinDiamonds] = useState(1000);
  const [presets, setPresets] = useState([1000, 2000, 5000, 10000, 25000, 50000]);
  const [newPresetVal, setNewPresetVal] = useState('');
  const [allowManualInput, setAllowManualInput] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await withdrawalApi.getWithdrawalConfig();
      if (res.success && res.config) {
        if (res.config.is_convert_to_diamond !== undefined) {
          setIsDiamondMode(res.config.is_convert_to_diamond !== false);
        }
        setMinDiamonds(res.config.min_withdrawal_diamonds || res.config.minWithdrawalDiamonds || 1000);
        setPresets(res.config.withdrawal_presets || res.config.withdrawalPresets || [1000, 2000, 5000, 10000, 25000, 50000]);
        setAllowManualInput(res.config.allow_manual_withdrawal_input !== false && res.config.allowManualInput !== false);
      }
    } catch (err) {
      console.warn('Failed to fetch withdrawal config:', err.message);
    } finally {
      setLoadingConfig(false);
    }
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
      });
      if (res.success) {
        onToast('Withdrawal rules and presets updated successfully!', 'success');
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
      const res = await withdrawalApi.getWithdrawals({ status: statusFilter });
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
  }, [statusFilter]);

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
      {/* Top Controls: Filter & Settings Header */}
      <div className="panel-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={20} color="#8b5cf6" />
              <span>Host Payout & Cashout Requests</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Manage host diamond cashout requests, minimum withdrawal thresholds, and preset cashout options.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowConfig(!showConfig)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sliders size={15} color="#8b5cf6" />
              <span>Withdrawal Rules & Presets</span>
              {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="var(--text-dim)" />
              <select
                className="select-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending Only</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
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
                {isDiamondMode ? '💎 Diamond Conversion Mode (ON)' : '🪙 Direct Coin Cashout Mode (OFF)'}
              </span>
            </div>

            {/* Economy Mode Selector Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Withdrawal Economy Currency:</span>
                  <span style={{ color: isDiamondMode ? '#7c3aed' : '#d97706', fontWeight: 800 }}>
                    {isDiamondMode ? '💎 Diamond Cashout' : '🪙 Coin Cashout'}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {isDiamondMode
                    ? 'Diamond Conversion is ON: Streamers cash out accumulated Diamonds (💎).'
                    : 'Diamond Conversion is OFF: Streamers cash out accumulated Coins (🪙) directly.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsDiamondMode(false)}
                  className={`btn btn-sm ${!isDiamondMode ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    background: !isDiamondMode ? '#d97706' : 'transparent',
                    borderColor: !isDiamondMode ? '#d97706' : 'var(--border-color)',
                    color: !isDiamondMode ? '#fff' : 'var(--text-dim)',
                  }}
                >
                  🪙 Coin Mode (OFF)
                </button>
                <button
                  type="button"
                  onClick={() => setIsDiamondMode(true)}
                  className={`btn btn-sm ${isDiamondMode ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    background: isDiamondMode ? '#7c3aed' : 'transparent',
                    borderColor: isDiamondMode ? '#7c3aed' : 'var(--border-color)',
                    color: isDiamondMode ? '#fff' : 'var(--text-dim)',
                  }}
                >
                  💎 Diamond Mode (ON)
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* 1. Minimum Withdrawal */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  {isDiamondMode ? 'Minimum Withdrawal Threshold (💎 Diamonds)' : 'Minimum Withdrawal Threshold (🪙 Coins)'}
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
                  Hosts with fewer {isDiamondMode ? 'diamonds' : 'coins'} cannot initiate a cashout request.
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
                    ? `Hosts can type any custom ${isDiamondMode ? 'diamond' : 'coin'} amount (must be ≥ minimum).`
                    : 'Strict Mode: Hosts can ONLY choose from the preset amounts below.'}
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
                These preset quick-cashout buttons appear on the streamer's mobile cashout page.
              </span>
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
                <th className="user-id-cell" style={{ width: '125px', minWidth: '125px', whiteSpace: 'nowrap' }}>Host User ID</th>
                <th>Host Details</th>
                <th>Request ID</th>
                <th>Requested Currency & Amount</th>
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
                  <td colSpan="11" style={{ padding: '3rem 1rem' }}>
                    <Loader text="Fetching broadcaster cashout requests..." />
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
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

                    {/* 1. Host User ID Column First (single line, supports up to 5 digits) */}
                    <td className="user-id-cell" style={{ whiteSpace: 'nowrap', width: '125px', minWidth: '125px' }}>
                      <span
                        className="user-id-badge"
                        onClick={() => setDetailsUserId(item.host_id)}
                        title="Click to view full host profile & telemetry"
                      >
                        ID: #{item.host_id}
                      </span>
                    </td>

                    {/* 2. Host Details with User ID first */}
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
                        onClick={() => setDetailsUserId(item.host_id)}
                        title="Click to view host profile & telemetry"
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            color: '#6d28d9',
                            background: 'rgba(124, 58, 237, 0.12)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ID: #{item.host_id}
                        </span>
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

                      if (isCoin) {
                        return (
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ color: '#d97706', fontWeight: 800, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>🪙</span>
                                <span>{Number(item.coin_amount).toLocaleString()}</span>
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

                      const fallbackAmt = Number(item.amount || item.coin_amount || item.diamond_amount || 0);
                      return (
                        <td style={{ color: isDiamondMode ? '#0284c7' : '#d97706', fontWeight: 700 }}>
                          {isDiamondMode ? '💎 ' : '🪙 '} {fallbackAmt.toLocaleString()}
                        </td>
                      );
                    })()}

                    <td style={{ color: '#059669', fontWeight: 800, fontSize: '0.95rem' }}>
                      ${parseFloat(item.usd_amount).toFixed(2)}
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
              const isDiamond = Number(selectedItem.diamond_amount) > 0;
              const requestedLabel = isDiamond 
                ? `💎 ${Number(selectedItem.diamond_amount).toLocaleString()} Diamonds`
                : `🪙 ${Number(selectedItem.coin_amount || selectedItem.amount || 0).toLocaleString()} Coins`;
              const refundLabel = isDiamond
                ? `${Number(selectedItem.diamond_amount).toLocaleString()} diamonds`
                : `${Number(selectedItem.coin_amount || selectedItem.amount || 0).toLocaleString()} coins`;

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
