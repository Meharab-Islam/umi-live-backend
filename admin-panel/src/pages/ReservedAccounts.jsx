import React, { useState, useEffect, useCallback } from 'react';
import {
  BookmarkCheck,
  Crown,
  Sparkles,
  Search,
  Plus,
  RefreshCw,
  UserCheck,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  Shield,
  Layers,
  X,
} from 'lucide-react';
import reservedAccountsApi from '../api/reservedAccountsApi';
import userApi from '../api/userApi';
import Loader from '../components/Loader';
import { copyToClipboard } from '../utils/clipboard';

export default function ReservedAccounts({ onToast }) {
  // Stats
  const [stats, setStats] = useState({ total: 0, available: 0, assigned: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  // Accounts List & Pagination
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'available' | 'assigned'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'vip' | 'special' | 'agency_lead' | 'founder' | 'system'
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Selected Item for Actions
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Quick Pool Range Setup (e.g. ID 2 to 100 or 200)
  const [customPoolEnd, setCustomPoolEnd] = useState('100');
  const [configuringPool, setConfiguringPool] = useState(false);

  // Add Form State
  const [addMode, setAddMode] = useState('single'); // 'single' | 'range'
  const [singleId, setSingleId] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [addCategory, setAddCategory] = useState('vip');
  const [addNotes, setAddNotes] = useState('');
  const [adding, setAdding] = useState(false);

  // Assign Form State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Release Form State
  const [releasing, setReleasing] = useState(false);

  // Delete Form State
  const [deleting, setDeleting] = useState(false);

  // Copied state
  const [copiedId, setCopiedId] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await reservedAccountsApi.getStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn('Failed to fetch reserved accounts stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch Accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reservedAccountsApi.getAccounts({
        status: statusFilter,
        category: categoryFilter,
        search: debouncedSearch,
        page: pagination.page,
        limit: pagination.limit,
      });
      if (res.success) {
        setAccounts(res.accounts || []);
        if (res.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: res.pagination.total,
            totalPages: res.pagination.totalPages,
          }));
        }
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to load reserved accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, debouncedSearch, pagination.page, pagination.limit, onToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle Search Users for Assignment
  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }
    const clean = userSearchQuery.trim().replace(/^#/, '');
    const handler = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        const res = await userApi.getUsers({ search: clean, limit: 6 });
        if (res.success && res.users) {
          setUserSearchResults(res.users);
        } else {
          setUserSearchResults([]);
        }
      } catch (err) {
        console.warn('User search error:', err);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [userSearchQuery]);

  // Copy helper
  const handleCopy = (id) => {
    copyToClipboard(String(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if (onToast) onToast(`Copied ID #${id} to clipboard`, 'success');
  };

  // Configure Quick Pool Range (e.g. 2 to 100 or 200)
  const handleConfigurePool = async (endVal) => {
    const end = parseInt(endVal, 10);
    if (isNaN(end) || end <= 2) {
      if (onToast) onToast('End ID must be at least 3 (e.g. 100 or 200).', 'error');
      return;
    }
    try {
      setConfiguringPool(true);
      const res = await reservedAccountsApi.setRange({
        start_id: 2,
        end_id: end,
        category: 'vip',
        notes: `System Reserved VIP`,
      });
      if (res.success) {
        if (onToast) onToast(res.message || `Reserved range 2 to ${end} set successfully!`, 'success');
        fetchStats();
        fetchAccounts();
      } else {
        if (onToast) onToast(res.message || 'Failed to configure reserved range', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Error setting reserved range', 'error');
    } finally {
      setConfiguringPool(false);
    }
  };

  // Add Reserved Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      setAdding(true);
      const payload = {
        type: addMode,
        category: addCategory,
        notes: addNotes,
      };
      if (addMode === 'single') {
        payload.reservedId = singleId;
      } else {
        payload.startId = rangeStart;
        payload.endId = rangeEnd;
      }

      const res = await reservedAccountsApi.addReserved(payload);
      if (res.success) {
        if (onToast) onToast(res.message || 'Reserved ID(s) added successfully!', 'success');
        setAddModalOpen(false);
        setSingleId('');
        setRangeStart('');
        setRangeEnd('');
        setAddNotes('');
        fetchStats();
        fetchAccounts();
      } else {
        if (onToast) onToast(res.message || 'Failed to add reserved accounts', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Error adding reserved accounts', 'error');
    } finally {
      setAdding(false);
    }
  };

  // Assign Submit
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecord || !targetUser) {
      if (onToast) onToast('Please select a target user to assign this ID.', 'error');
      return;
    }
    try {
      setAssigning(true);
      const res = await reservedAccountsApi.assignReserved({
        reserved_id: selectedRecord.reserved_id,
        user_id: targetUser.id,
        notes: assignNotes || `Assigned to ${targetUser.full_name || targetUser.email} (#${targetUser.id})`,
      });

      if (res.success) {
        if (onToast) onToast(res.message || 'User ID upgraded successfully!', 'success');
        setAssignModalOpen(false);
        setSelectedRecord(null);
        setTargetUser(null);
        setUserSearchQuery('');
        setAssignNotes('');
        fetchStats();
        fetchAccounts();
      } else {
        if (onToast) onToast(res.message || 'Failed to assign reserved ID', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Error during ID assignment', 'error');
    } finally {
      setAssigning(false);
    }
  };

  // Release Submit
  const handleReleaseSubmit = async () => {
    if (!selectedRecord) return;
    try {
      setReleasing(true);
      const res = await reservedAccountsApi.releaseReserved({
        reserved_id: selectedRecord.reserved_id,
      });
      if (res.success) {
        if (onToast) onToast(res.message || 'Reserved ID released back to available pool.', 'success');
        setReleaseModalOpen(false);
        setSelectedRecord(null);
        fetchStats();
        fetchAccounts();
      } else {
        if (onToast) onToast(res.message || 'Failed to release reserved ID', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Error releasing reserved ID', 'error');
    } finally {
      setReleasing(false);
    }
  };

  // Delete Submit
  const handleDeleteSubmit = async () => {
    if (!selectedRecord) return;
    try {
      setDeleting(true);
      const res = await reservedAccountsApi.deleteReserved(selectedRecord.id);
      if (res.success) {
        if (onToast) onToast(res.message || 'Reserved ID removed from pool.', 'success');
        setDeleteModalOpen(false);
        setSelectedRecord(null);
        fetchStats();
        fetchAccounts();
      } else {
        if (onToast) onToast(res.message || 'Failed to delete reserved ID', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Error deleting reserved ID', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Category Badge Helper
  const renderCategoryBadge = (category) => {
    switch (category) {
      case 'vip':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'rgba(217, 119, 6, 0.12)',
              color: '#d97706',
              border: '1px solid rgba(217, 119, 6, 0.25)',
            }}
          >
            <Crown size={12} />
            VIP
          </span>
        );
      case 'special':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'rgba(147, 51, 234, 0.12)',
              color: '#9333ea',
              border: '1px solid rgba(147, 51, 234, 0.25)',
            }}
          >
            <Sparkles size={12} />
            Special
          </span>
        );
      case 'agency_lead':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'rgba(30, 136, 229, 0.12)',
              color: '#1e88e5',
              border: '1px solid rgba(30, 136, 229, 0.25)',
            }}
          >
            <Shield size={12} />
            Agency Lead
          </span>
        );
      case 'founder':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'rgba(5, 150, 105, 0.12)',
              color: '#059669',
              border: '1px solid rgba(5, 150, 105, 0.25)',
            }}
          >
            <BookmarkCheck size={12} />
            Founder
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'rgba(100, 116, 139, 0.12)',
              color: '#64748b',
              border: '1px solid rgba(100, 116, 139, 0.25)',
            }}
          >
            System
          </span>
        );
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: '3.5rem' }}>
      {/* ── Top Header Toolbar ─────────────────────────────────────────── */}
      <div
        className="panel-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(30, 136, 229, 0.15))',
              border: '1px solid rgba(147, 51, 234, 0.3)',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BookmarkCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Reserved Accounts & VIP IDs
              </h2>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  background: 'rgba(147, 51, 234, 0.15)',
                  color: '#9333ea',
                  textTransform: 'uppercase',
                }}
              >
                Exclusive
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Preserve prestigious account IDs for VIPs, celebrities, and agency leaders. Allocate or swap account IDs seamlessly.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              fetchStats();
              fetchAccounts();
            }}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Reserve New ID(s)</span>
          </button>
        </div>
      </div>

      {/* ── Quick Pool Range Setup (ID 2 to 100/200) ──────────────────── */}
      <div
        className="panel-card"
        style={{
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(30, 136, 229, 0.05) 100%)',
          border: '1px solid rgba(147, 51, 234, 0.3)',
          borderRadius: '14px',
          padding: '1.15rem 1.5rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(217, 119, 6, 0.15)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Crown size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Reserved Pool Range Setup (Starts from ID #2)
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  background: 'rgba(5, 150, 105, 0.15)',
                  color: '#059669',
                }}
              >
                Auto-Increment Guard
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Set reserved VIP IDs from <strong style={{ color: '#d97706' }}>#2</strong> up to{' '}
              <strong style={{ color: '#d97706' }}>#{customPoolEnd || '100'}</strong>. Normal users will automatically start registering at{' '}
              <strong style={{ color: '#059669' }}>#{(parseInt(customPoolEnd, 10) || 100) + 1}</strong>.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-primary)',
              padding: '4px 8px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>2 to</span>
            <input
              type="number"
              min="3"
              max="2000"
              value={customPoolEnd}
              onChange={(e) => setCustomPoolEnd(e.target.value)}
              className="input-field"
              style={{
                width: '65px',
                padding: '4px 6px',
                fontSize: '0.82rem',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {['100', '200', '500'].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setCustomPoolEnd(val)}
                className={`btn btn-sm ${customPoolEnd === val ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
              >
                {val}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={configuringPool}
            onClick={() => handleConfigurePool(customPoolEnd)}
            className="btn btn-primary btn-sm"
            style={{
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              borderColor: '#059669',
              padding: '0.45rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            <CheckCircle size={14} />
            <span>{configuringPool ? 'Applying...' : 'Set Range'}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ────────────────────────────────────────────── */}
      <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total Reserved IDs</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(147, 51, 234, 0.15)', color: '#9333ea' }}>
              <Layers size={18} />
            </div>
          </div>
          <div className="stat-value">{loadingStats ? '—' : Number(stats.total).toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Available for Assignment</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(5, 150, 105, 0.15)', color: '#059669' }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {loadingStats ? '—' : Number(stats.available).toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Assigned & Active</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(30, 136, 229, 0.15)', color: '#1e88e5' }}>
              <UserCheck size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#1e88e5' }}>
            {loadingStats ? '—' : Number(stats.assigned).toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar ────────────────────────────────────────── */}
      <div className="panel-card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'all', label: 'All IDs' },
              { id: 'available', label: 'Available' },
              { id: 'assigned', label: 'Assigned' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: '8px', padding: '0.4rem 0.85rem' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <select
              className="select-field"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              style={{ width: 'auto', minWidth: '130px' }}
            >
              <option value="all">All Categories</option>
              <option value="vip">VIP Tier</option>
              <option value="special">Special</option>
              <option value="agency_lead">Agency Lead</option>
              <option value="founder">Founder</option>
              <option value="system">System</option>
            </select>

            <div className="search-input-wrap" style={{ width: '260px' }}>
              <Search size={15} />
              <input
                type="text"
                className="input-field"
                placeholder="Search ID, user name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Data Table ────────────────────────────────────────────── */}
      <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Reserved ID</th>
                <th style={{ width: '120px' }}>Category</th>
                <th style={{ width: '110px' }}>Status</th>
                <th>Assigned Holder</th>
                <th>Notes & Description</th>
                <th style={{ textAlign: 'right', width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                    <Loader text="Loading reserved account IDs..." />
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
                    No reserved accounts found matching current filters.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => {
                  const isAssigned = acc.status === 'assigned';
                  return (
                    <tr key={acc.id}>
                      {/* ID Cell */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              color: '#d97706',
                              background: 'rgba(217, 119, 6, 0.1)',
                              border: '1px solid rgba(217, 119, 6, 0.25)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            #{acc.reserved_id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(acc.reserved_id)}
                            title="Copy ID"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-dim)',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            {copiedId === acc.reserved_id ? (
                              <Check size={14} color="#059669" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Category */}
                      <td>{renderCategoryBadge(acc.category)}</td>

                      {/* Status */}
                      <td>
                        {isAssigned ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: 'rgba(30, 136, 229, 0.12)',
                              color: '#1e88e5',
                              border: '1px solid rgba(30, 136, 229, 0.25)',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#1e88e5',
                              }}
                            />
                            Assigned
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: 'rgba(5, 150, 105, 0.12)',
                              color: '#059669',
                              border: '1px solid rgba(5, 150, 105, 0.25)',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#059669',
                              }}
                            />
                            Available
                          </span>
                        )}
                      </td>

                      {/* Assigned Holder */}
                      <td>
                        {isAssigned && acc.assigned_to_user_id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={
                                acc.assigned_user_avatar ||
                                `https://api.dicebear.com/7.x/bottts/svg?seed=${acc.assigned_to_user_id}`
                              }
                              alt="Avatar"
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1px solid var(--border-color)',
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                {acc.assigned_user_name || 'Umi User'}
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    marginLeft: '6px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    background: 'var(--bg-primary)',
                                    color: 'var(--text-dim)',
                                    border: '1px solid var(--border-color)',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {acc.assigned_user_role || 'user'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                                {acc.assigned_user_email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                            — Open for assignment —
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 500 }}>
                          {acc.notes || '—'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          {isAssigned && acc.assigned_at
                            ? `Assigned: ${new Date(acc.assigned_at).toLocaleDateString()}`
                            : `Added: ${new Date(acc.created_at).toLocaleDateString()}`}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          {isAssigned ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRecord(acc);
                                setReleaseModalOpen(true);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{
                                borderColor: 'rgba(217, 119, 6, 0.4)',
                                color: '#d97706',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.75rem',
                              }}
                            >
                              Release ID
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecord(acc);
                                  setTargetUser(null);
                                  setUserSearchQuery('');
                                  setAssignNotes('');
                                  setAssignModalOpen(true);
                                }}
                                className="btn btn-primary btn-sm"
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <UserCheck size={13} />
                                <span>Assign to User</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecord(acc);
                                  setDeleteModalOpen(true);
                                }}
                                title="Remove from pool"
                                className="btn btn-secondary btn-sm"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  borderColor: 'rgba(239, 68, 68, 0.3)',
                                  color: '#ef4444',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.82rem',
              color: 'var(--text-dim)',
            }}
          >
            <div>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="btn btn-secondary btn-sm"
              >
                Previous
              </button>
              <span style={{ fontWeight: 600, color: 'var(--text-main)', padding: '0 4px' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="btn btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL 1: ADD RESERVED ID(S) ─────────────────────────────────── */}
      {addModalOpen && (
        <div className="modal-backdrop" onClick={() => setAddModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '1.75rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Reserve Account ID(s)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Mode Toggle */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                  Reservation Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setAddMode('single')}
                    className={`btn btn-sm ${addMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '6px' }}
                  >
                    Single VIP ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode('range')}
                    className={`btn btn-sm ${addMode === 'range' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '6px' }}
                  >
                    Bulk Range (e.g. 1001-1050)
                  </button>
                </div>
              </div>

              {/* ID Input */}
              {addMode === 'single' ? (
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                    Account ID to Reserve *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 777777, 888888, 1001"
                    value={singleId}
                    onChange={(e) => setSingleId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                      Start ID *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="1001"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                      End ID *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="1050"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }}
                    />
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                  Category Tier
                </label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  className="select-field"
                  style={{ width: '100%' }}
                >
                  <option value="vip">VIP Tier (Gold)</option>
                  <option value="special">Special Prestigious</option>
                  <option value="agency_lead">Agency Lead / Master</option>
                  <option value="founder">Founder / Milestone</option>
                  <option value="system">System Account</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reserved for Tier 1 Bangladesh Agencies"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="btn btn-primary"
                  style={{ flex: 1.3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Plus size={15} />
                  <span>{adding ? 'Reserving...' : 'Confirm'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ASSIGN RESERVED ID TO USER ─────────────────────────── */}
      {assignModalOpen && selectedRecord && (
        <div className="modal-backdrop" onClick={() => setAssignModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', padding: '1.75rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Assign VIP ID #{selectedRecord.reserved_id}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Upgrade a user's account ID to this prestigious number.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Target ID Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.1), rgba(147, 51, 234, 0.1))',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#d97706', fontWeight: 700, display: 'block' }}>
                    Target Reserved ID
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>
                    #{selectedRecord.reserved_id}
                  </span>
                </div>
                <div>{renderCategoryBadge(selectedRecord.category)}</div>
              </div>

              {/* User Search Input */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                  Search & Select Target User *
                </label>
                <div className="search-input-wrap" style={{ width: '100%' }}>
                  <Search size={15} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search by User ID (#100543), Name, or Email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                  />
                </div>

                {/* Dropdown Results */}
                {userSearchResults.length > 0 && !targetUser && (
                  <div
                    style={{
                      marginTop: '6px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    {userSearchResults.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setTargetUser(u);
                          setUserSearchResults([]);
                          setUserSearchQuery('');
                        }}
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                            alt=""
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {u.full_name || 'Umi User'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                              {u.email}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', color: 'var(--primary)' }}>
                          #{u.id}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Target User Card */}
              {targetUser ? (
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--primary)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={targetUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.id}`}
                      alt=""
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {targetUser.full_name || 'Umi User'}
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', marginLeft: '6px', fontFamily: 'monospace' }}>
                          Currently #{targetUser.id}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                        {targetUser.email}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTargetUser(null)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  >
                    Change
                  </button>
                </div>
              ) : null}

              {/* Zero data loss alert */}
              <div
                style={{
                  background: 'rgba(5, 150, 105, 0.08)',
                  border: '1px solid rgba(5, 150, 105, 0.25)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '0.78rem',
                  color: '#059669',
                }}
              >
                <CheckCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Zero Data Loss:</strong> All coins, diamonds, followers, live room records, and messages will atomically migrate to VIP ID #{selectedRecord.reserved_id}.
                </span>
              </div>

              {/* Assignment Note */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                  Note / Grant Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Granted for Top Host Creator Award"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetUser || assigning}
                  className="btn btn-primary"
                  style={{ flex: 1.4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <UserCheck size={15} />
                  <span>{assigning ? 'Upgrading ID...' : 'Confirm Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: RELEASE RESERVED ID ─────────────────────────────────── */}
      {releaseModalOpen && selectedRecord && (
        <div className="modal-backdrop" onClick={() => setReleaseModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', padding: '1.75rem', textAlign: 'center' }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(217, 119, 6, 0.12)',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
              Release Reserved ID #{selectedRecord.reserved_id}
            </h3>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              The user currently holding this ID will receive a regular system ID, keeping all their coins and history intact. The VIP ID will return to the Available pool.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReleaseModalOpen(false)}
                disabled={releasing}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReleaseSubmit}
                disabled={releasing}
                className="btn btn-primary"
                style={{
                  flex: 1.3,
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  borderColor: '#d97706',
                }}
              >
                <span>{releasing ? 'Releasing...' : 'Confirm Release'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: DELETE RESERVED ID ──────────────────────────────────── */}
      {deleteModalOpen && selectedRecord && (
        <div className="modal-backdrop" onClick={() => setDeleteModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', padding: '1.75rem', textAlign: 'center' }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Trash2 size={26} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
              Remove Reserved ID #{selectedRecord.reserved_id}
            </h3>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Permanently remove this ID from the reservation pool.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={deleting}
                className="btn btn-danger"
                style={{ flex: 1.3 }}
              >
                <span>{deleting ? 'Removing...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
