import React, { useState, useEffect } from 'react';
import {
  Users,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  History,
  Lock,
  Mail,
  Coins,
  Crown,
  Sparkles,
  Radio,
  Search,
  RefreshCw,
  GitMerge,
  Key,
} from 'lucide-react';
import userApi from '../api/userApi';
import accountMergeApi from '../api/accountMergeApi';
import Loader from '../components/Loader';
import { useEconomy } from '../context/EconomyContext';

export default function AccountMerge({ onToast }) {
  const { isDiamondMode } = useEconomy();
  const [activeTab, setActiveTab] = useState('merge'); // 'merge' | 'history'

  // Input IDs
  const [oldIdInput, setOldIdInput] = useState('');
  const [newIdInput, setNewIdInput] = useState('');

  // Loaded Users
  const [searchingOld, setSearchingOld] = useState(false);
  const [searchingNew, setSearchingNew] = useState(false);
  const [oldUser, setOldUser] = useState(null);
  const [newUser, setNewUser] = useState(null);

  // Preview Data
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Merge Form
  const [reason, setReason] = useState('User lost old account email access');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  // History Tab
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Search Old User
  const handleSearchOldUser = async () => {
    const clean = oldIdInput.trim().replace(/^#/, '');
    if (!clean) {
      if (onToast) onToast('Please enter Old Account ID', 'error');
      return;
    }
    try {
      setSearchingOld(true);
      setOldUser(null);
      setPreviewData(null);
      const res = await userApi.getUsers({ search: clean, limit: 1 });
      if (res.success && res.users && res.users.length > 0) {
        setOldUser(res.users[0]);
        if (onToast) onToast(`Found Old Account #${res.users[0].id}`, 'success');
      } else {
        if (onToast) onToast(`User #${clean} not found`, 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Error searching user', 'error');
    } finally {
      setSearchingOld(false);
    }
  };

  // Search New User
  const handleSearchNewUser = async () => {
    const clean = newIdInput.trim().replace(/^#/, '');
    if (!clean) {
      if (onToast) onToast('Please enter New Account ID', 'error');
      return;
    }
    try {
      setSearchingNew(true);
      setNewUser(null);
      setPreviewData(null);
      const res = await userApi.getUsers({ search: clean, limit: 1 });
      if (res.success && res.users && res.users.length > 0) {
        setNewUser(res.users[0]);
        if (onToast) onToast(`Found New Account #${res.users[0].id}`, 'success');
      } else {
        if (onToast) onToast(`User #${clean} not found`, 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Error searching user', 'error');
    } finally {
      setSearchingNew(false);
    }
  };

  // Load preview when both users are present
  useEffect(() => {
    if (oldUser && newUser) {
      if (oldUser.id === newUser.id) {
        setPreviewData(null);
        if (onToast) onToast('Old Account and New Account cannot be the same user', 'error');
        return;
      }
      const fetchPreview = async () => {
        try {
          setLoadingPreview(true);
          const res = await accountMergeApi.previewMerge(oldUser.id, newUser.id);
          if (res.success) {
            setPreviewData(res.preview);
          }
        } catch (err) {
          if (onToast) onToast(err.message || 'Failed to fetch merge preview', 'error');
        } finally {
          setLoadingPreview(false);
        }
      };
      fetchPreview();
    } else {
      setPreviewData(null);
    }
  }, [oldUser, newUser, onToast]);

  // Execute Merge
  const handleExecuteMerge = async () => {
    if (!oldUser || !newUser) return;
    try {
      setMerging(true);
      const res = await accountMergeApi.executeMerge({
        oldUserId: oldUser.id,
        newUserId: newUser.id,
        reason: reason.trim(),
      });
      if (res.success) {
        if (onToast) onToast(res.message, 'success');
        setConfirmModalOpen(false);
        // Reset states
        setOldIdInput('');
        setNewIdInput('');
        setOldUser(null);
        setNewUser(null);
        setPreviewData(null);
        // Switch to history or refresh
        fetchHistory();
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Account merge failed', 'error');
    } finally {
      setMerging(false);
    }
  };

  // Fetch History
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await accountMergeApi.getMergeHistory();
      if (res.success) {
        setHistoryList(res.history || []);
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to fetch merge history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  return (
    <div className="page-container" style={{ paddingBottom: '3.5rem' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)',
          borderLeft: '5px solid #8b5cf6',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GitMerge size={22} color="#8b5cf6" />
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Account Merge & Email Recovery
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-dim)' }}>
            Recover lost email accounts by linking all original account data, User ID, VIP perks, coins, and host status to the user's new login email.
          </p>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'merge' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('merge')}
            style={{ borderRadius: '8px', padding: '0.45rem 1rem', fontWeight: 700 }}
          >
            <GitMerge size={14} />
            <span>Merge Accounts</span>
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('history')}
            style={{ borderRadius: '8px', padding: '0.45rem 1rem', fontWeight: 700 }}
          >
            <History size={14} />
            <span>Audit History</span>
          </button>
        </div>
      </div>

      {activeTab === 'merge' && (
        <>
          {/* Explanation Banner */}
          <div
            style={{
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <HelpCircle size={22} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              <strong>How Account Merge Works:</strong>
              <div style={{ color: 'var(--text-dim)', marginTop: '4px' }}>
                When a user loses access to their registered email, they create a new account in the app. Use this tool to select their <strong>Old Account</strong> (which holds their ID, coins, {isDiamondMode ? 'diamonds, ' : ''}and VIP role) and their <strong>New Account</strong> (which has their new working login email and password). After merging, the old account is updated with the new email and password, keeping their original ID and all assets!
              </div>
            </div>
          </div>

          {/* 2 Account Selection Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* COLUMN 1: OLD ACCOUNT (SOURCE DATA) */}
            <div
              className="panel-card"
              style={{
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                    }}
                  >
                    1
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Old Account (Preserved Data & ID)
                  </h3>
                </div>
                <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>Lost Email</span>
              </div>

              {/* Input & Search */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter Old User ID (e.g. 5)"
                  value={oldIdInput}
                  onChange={(e) => setOldIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchOldUser()}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSearchOldUser}
                  disabled={searchingOld}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {searchingOld ? 'Checking...' : 'Check ID'}
                </button>
              </div>

              {/* Old User Details Card */}
              {oldUser ? (
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.85rem' }}>
                    <img
                      src={oldUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${oldUser.id}`}
                      alt=""
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>{oldUser.full_name}</strong>
                        <span className="user-id-badge" style={{ fontSize: '0.72rem' }}>#{oldUser.id}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '2px', wordBreak: 'break-all' }}>
                        ✉️ {oldUser.email} (Lost)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '0.76rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Role: </span>
                      <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{oldUser.role}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>VIP: </span>
                      <strong style={{ color: '#7c3aed' }}>{oldUser.vip_package || 'Standard'}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Coins: </span>
                      <strong style={{ color: '#d97706' }}>🪙 {oldUser.coins?.toLocaleString()}</strong>
                    </div>
                    {isDiamondMode && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Diamonds: </span>
                        <strong style={{ color: '#06b6d4' }}>💎 {oldUser.diamonds?.toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    background: 'var(--bg-primary)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border-color)',
                    color: 'var(--text-dim)',
                    fontSize: '0.84rem',
                  }}
                >
                  Enter the original user ID above to load their account details.
                </div>
              )}
            </div>

            {/* COLUMN 2: NEW ACCOUNT (TARGET LOGIN EMAIL) */}
            <div
              className="panel-card"
              style={{
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                    }}
                  >
                    2
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    New Account (New Login Email)
                  </h3>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>New Email</span>
              </div>

              {/* Input & Search */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter New User ID (e.g. 102)"
                  value={newIdInput}
                  onChange={(e) => setNewIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchNewUser()}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSearchNewUser}
                  disabled={searchingNew}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {searchingNew ? 'Checking...' : 'Check ID'}
                </button>
              </div>

              {/* New User Details Card */}
              {newUser ? (
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.85rem' }}>
                    <img
                      src={newUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${newUser.id}`}
                      alt=""
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>{newUser.full_name}</strong>
                        <span className="user-id-badge" style={{ fontSize: '0.72rem' }}>#{newUser.id}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, marginTop: '2px', wordBreak: 'break-all' }}>
                        ✉️ {newUser.email} (Working)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '0.76rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>New Coins: </span>
                      <strong style={{ color: '#d97706' }}>🪙 {newUser.coins?.toLocaleString()}</strong>
                    </div>
                    {isDiamondMode && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>New Diamonds: </span>
                        <strong style={{ color: '#06b6d4' }}>💎 {newUser.diamonds?.toLocaleString()}</strong>
                      </div>
                    )}
                    <div style={{ gridColumn: 'span 2', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 8px', borderRadius: '6px', color: '#10b981' }}>
                      🔑 Password and email from this account will be transferred to Account #{oldUser?.id || '...'}.
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    background: 'var(--bg-primary)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border-color)',
                    color: 'var(--text-dim)',
                    fontSize: '0.84rem',
                  }}
                >
                  Enter the newly registered user ID above to verify their working email.
                </div>
              )}
            </div>
          </div>

          {/* PREVIEW & MERGE ACTION PANEL */}
          {previewData && (
            <div
              className="panel-card"
              style={{
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                background: 'var(--bg-secondary)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                <CheckCircle size={22} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Merge Impact & Result Summary
                </h3>
              </div>

              {/* Visual Result Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block' }}>Retained User ID:</span>
                  <strong style={{ fontSize: '1.1rem', color: '#8b5cf6' }}>#{previewData.targetId}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>(Original ID preserved)</span>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block' }}>New Active Login Email:</span>
                  <strong style={{ fontSize: '0.94rem', color: '#10b981', wordBreak: 'break-all' }}>{previewData.newLoginEmail}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>(Replaces lost email)</span>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block' }}>Consolidated Coins:</span>
                  <strong style={{ fontSize: '1.1rem', color: '#d97706' }}>🪙 {previewData.combinedCoins?.toLocaleString()}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>(Combined balance)</span>
                </div>

                {isDiamondMode && (
                  <div style={{ background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block' }}>Consolidated Diamonds:</span>
                    <strong style={{ fontSize: '1.1rem', color: '#06b6d4' }}>💎 {previewData.combinedDiamonds?.toLocaleString()}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>(Combined balance)</span>
                  </div>
                )}

                <div style={{ background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block' }}>Preserved Role & VIP:</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                    {previewData.finalRole} • {previewData.finalVipPackage}
                  </strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Host & VIP status kept</span>
                </div>
              </div>

              {/* Reason Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Merge Reason / Reference Note:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. User lost old email access; identity verified"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setOldUser(null);
                    setNewUser(null);
                    setPreviewData(null);
                    setOldIdInput('');
                    setNewIdInput('');
                  }}
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setConfirmModalOpen(true)}
                  style={{
                    padding: '0.65rem 1.75rem',
                    fontSize: '0.94rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  }}
                >
                  <GitMerge size={17} />
                  <span>Execute Account Merge</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="panel-card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Account Merge Audit Trail ({historyList.length})
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Permanent history of transferred accounts and recovered lost emails
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchHistory}
              disabled={loadingHistory}
            >
              <RefreshCw size={13} className={loadingHistory ? 'spin' : ''} />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
            <table className="data-table" style={{ margin: 0, minWidth: '850px', width: '100%' }}>
              <thead>
                <tr>
                  <th>Merged Date</th>
                  <th>Preserved Account</th>
                  <th>Previous (Lost) Email</th>
                  <th>New Active Email</th>
                  <th>Retired Placeholder</th>
                  <th>Authorized Admin</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem' }}>
                      <Loader inline />
                    </td>
                  </tr>
                ) : historyList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                      No account merges recorded yet.
                    </td>
                  </tr>
                ) : (
                  historyList.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="user-id-badge">#{item.source_user_id}</span>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            {item.current_user_name || `User #${item.source_user_id}`}
                          </strong>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#ef4444' }}>
                          {item.source_old_email}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700 }}>
                          {item.target_new_email}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                          Account #{item.target_user_id} (Closed)
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                          {item.admin_name || 'Admin'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModalOpen && previewData && (
        <div className="modal-overlay" onClick={() => setConfirmModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: '480px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <GitMerge size={28} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: 'var(--text-main)' }}>
              Confirm Account Merge?
            </h3>

            <p style={{ margin: '0 0 1.25rem', fontSize: '0.88rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              This will transfer the login credentials of <strong>"{previewData.newLoginEmail}"</strong> to <strong>Account #{previewData.targetId}</strong>.
            </p>

            <div
              style={{
                background: 'var(--bg-primary)',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                textAlign: 'left',
                fontSize: '0.82rem',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
              }}
            >
              <div>✅ <strong>Account #{previewData.targetId}</strong> will be preserved with all history & roles.</div>
              <div>✅ User will log into their original account using <strong>{previewData.newLoginEmail}</strong>.</div>
              <div>✅ Total coins will become <strong>🪙 {previewData.combinedCoins?.toLocaleString()}</strong>.</div>
              <div>⚠️ Placeholder account <strong>#{newUser.id}</strong> will be closed.</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmModalOpen(false)}
                disabled={merging}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteMerge}
                disabled={merging}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  fontWeight: 800,
                }}
              >
                {merging ? 'Merging...' : 'Yes, Complete Merge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
