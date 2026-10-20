import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ShieldCheck,
  Ban,
  CheckCircle,
  Coins,
  Edit,
  Users as UsersIcon,
  Radio,
  UserCheck,
  ShieldAlert,
  Crown,
  Sparkles,
  Award,
  Building2,
  Eye,
  EyeOff,
  Lock,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import userApi from '../api/userApi';
import { adminApi } from '../api/adminApi';
import settingsApi from '../api/settingsApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import UserDetailsModal from '../components/UserDetailsModal';
import BulkActionBar from '../components/BulkActionBar';

export default function Users({ onToast }) {
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({
    total_users: 0,
    total_hosts: 0,
    total_agencies: 0,
    total_moderators: 0,
    total_resellers: 0,
    total_regular: 0,
    total_admins: 0,
    total_banned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [bannedFilter, setBannedFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null); // 'balance' | 'edit'

  // Dedicated Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);

  // User Details Modal
  const [detailsModalUser, setDetailsModalUser] = useState(null);

  // Action Dropdown & Delete Confirmation State
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Balance Form State (Deductions only & action password protected)
  const [coinDelta, setCoinDelta] = useState(0);
  const [diamondDelta, setDiamondDelta] = useState(0);
  const [balanceReason, setBalanceReason] = useState('Admin balance deduction');
  const [actionPassword, setActionPassword] = useState('');
  const [showActionPassword, setShowActionPassword] = useState(false);

  const handleToggleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  const handleToggleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await adminApi.bulkDelete('users', selectedUserIds);
      if (res.success) {
        onToast(`Successfully deleted ${res.count || selectedUserIds.length} users.`, 'success');
        setSelectedUserIds([]);
        fetchUsers();
      }
    } catch (err) {
      onToast(err.message || 'Failed to bulk delete users.', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const fetchUsers = async (searchTerm = activeSearch, pageNum = page, limitNum = pageSize) => {
    try {
      setLoading(true);
      const res = await userApi.getUsers({
        search: searchTerm,
        role: roleFilter,
        is_banned: bannedFilter,
        page: pageNum,
        limit: limitNum,
      });
      if (res.success) {
        setUsers((res.users || []).filter((u) => u.role !== 'superadmin'));
        if (res.pagination) {
          setTotalCount(res.pagination.total);
        }
        if (res.summary) {
          setSummary({
            total_users: Number(res.summary.total_users || 0),
            total_hosts: Number(res.summary.total_hosts || 0),
            total_agencies: Number(res.summary.total_agencies || 0),
            total_regular: Number(res.summary.total_regular || 0),
            total_admins: Number(res.summary.total_admins || 0),
            total_banned: Number(res.summary.total_banned || 0),
          });
        }
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Dual Economy Mode State
  const [isDiamondMode, setIsDiamondMode] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await settingsApi.getSettings();
      if (res.success && res.settings) {
        const modeSetting = res.settings.find((s) => s.key_name === 'is_convert_to_diamond');
        if (modeSetting) {
          setIsDiamondMode(modeSetting.key_value === 'true' || modeSetting.key_value === '1');
        }
      }
    } catch (err) {
      console.warn('Failed to load settings in Users.jsx:', err.message);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchUsers(activeSearch, 1, pageSize);
  }, [roleFilter, bannedFilter]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const term = searchInput.trim();
    setActiveSearch(term);
    setPage(1);
    fetchUsers(term, 1, pageSize);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
    setPage(1);
    fetchUsers('', 1, pageSize);
  };

  const handleToggleBan = async (user) => {
    try {
      const newStatus = !user.is_banned;
      const res = await userApi.updateUser(user.id, { is_banned: newStatus });
      if (res.success) {
        onToast(`User ID #${user.id} is now ${newStatus ? 'BANNED' : 'ACTIVE'}.`, 'success');
        fetchUsers();
      }
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  // Close active dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    if (openDropdownId !== null) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [openDropdownId]);

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setDeletingUser(true);
    try {
      const res = await userApi.deleteUser(deleteConfirmUser.id);
      if (res.success) {
        onToast(res.message || `User ID #${deleteConfirmUser.id} deleted successfully.`, 'success');
        setDeleteConfirmUser(null);
        fetchUsers(activeSearch, page, pageSize);
      }
    } catch (err) {
      onToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    const cDelta = parseInt(coinDelta, 10) || 0;
    const cDeduct = Math.abs(parseInt(coinDelta, 10) || 0);
    const dDeduct = Math.abs(parseInt(diamondDelta, 10) || 0);

    if (cDeduct === 0 && dDeduct === 0) {
      onToast('Please specify a coin or diamond deduction amount.', 'error');
      return;
    }

    if (cDeduct > Number(selectedUser.coins || 0)) {
      onToast(`Cannot deduct more coins than current balance (${Number(selectedUser.coins || 0).toLocaleString()}).`, 'error');
      return;
    }

    if (dDeduct > Number(selectedUser.diamonds || 0)) {
      onToast(`Cannot deduct more diamonds than current balance (${Number(selectedUser.diamonds || 0).toLocaleString()}).`, 'error');
      return;
    }

    if (!actionPassword.trim()) {
      onToast('Security Action Password is required to authorize balance deductions.', 'error');
      return;
    }

    try {
      const res = await userApi.adjustBalance(selectedUser.id, {
        coinDelta: -cDeduct,
        diamondDelta: -dDeduct,
        reason: balanceReason.trim() || 'Admin balance deduction',
        actionPassword: actionPassword.trim(),
      });
      if (res.success) {
        onToast(`Balances deducted successfully for User ID #${selectedUser.id}`, 'success');
        setSelectedUser(null);
        setModalType(null);
        setCoinDelta(0);
        setDiamondDelta(0);
        setActionPassword('');
        fetchUsers();
      }
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  return (
    <div>
      {/* 5 User Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* Total Users */}
        <div
          className="stat-card"
          onClick={() => { setRoleFilter('all'); setBannedFilter('all'); }}
          style={{ cursor: 'pointer', border: roleFilter === 'all' && bannedFilter === 'all' ? '1px solid var(--primary)' : undefined }}
        >
          <div className="stat-top">
            <span className="stat-label">Total Users</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <UsersIcon size={20} />
            </div>
          </div>
          <div className="stat-value">{summary.total_users}</div>
          <div className="stat-sub" style={{ color: '#c4b5fd' }}>
            <span>Registered members</span>
          </div>
        </div>

        {/* Certified Hosts */}
        <div
          className="stat-card"
          onClick={() => { setRoleFilter('host'); setBannedFilter('all'); }}
          style={{ cursor: 'pointer', border: roleFilter === 'host' ? '1px solid #ec4899' : undefined }}
        >
          <div className="stat-top">
            <span className="stat-label">Verified Hosts</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
              <Radio size={20} />
            </div>
          </div>
          <div className="stat-value">{summary.total_hosts}</div>
          <div className="stat-sub" style={{ color: '#f472b6' }}>
            <span>Live broadcasters</span>
          </div>
        </div>

        {/* Partner Agencies */}
        <div
          className="stat-card"
          onClick={() => { setRoleFilter('agency'); setBannedFilter('all'); }}
          style={{ cursor: 'pointer', border: roleFilter === 'agency' ? '1px solid #8b5cf6' : undefined }}
        >
          <div className="stat-top">
            <span className="stat-label">Agencies</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
              <Building2 size={20} />
            </div>
          </div>
          <div className="stat-value">{summary.total_agencies}</div>
          <div className="stat-sub" style={{ color: '#c4b5fd' }}>
            <span>Agency managers</span>
          </div>
        </div>

        {/* Regular Members */}
        <div
          className="stat-card"
          onClick={() => { setRoleFilter('user'); setBannedFilter('all'); }}
          style={{ cursor: 'pointer', border: roleFilter === 'user' ? '1px solid #06b6d4' : undefined }}
        >
          <div className="stat-top">
            <span className="stat-label">Standard Viewers</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
              <UserCheck size={20} />
            </div>
          </div>
          <div className="stat-value">{summary.total_regular}</div>
          <div className="stat-sub" style={{ color: '#38bdf8' }}>
            <span>Audience & coin buyers</span>
          </div>
        </div>

        {/* Banned Accounts */}
        <div
          className="stat-card"
          onClick={() => { setBannedFilter('1'); }}
          style={{ cursor: 'pointer', border: bannedFilter === '1' ? '1px solid #f43f5e' : undefined }}
        >
          <div className="stat-top">
            <span className="stat-label">Banned Users</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="stat-value">{summary.total_banned}</div>
          <div className="stat-sub" style={{ color: '#fda4af' }}>
            <span>Restricted accounts</span>
          </div>
        </div>
      </div>

      {/* Quick Filter Buttons & Search Toolbar */}
      <div className="panel-card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Quick Segment Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${roleFilter === 'all' && bannedFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setRoleFilter('all'); setBannedFilter('all'); }}
            >
              All Users ({summary.total_users})
            </button>

            <button
              className={`btn btn-sm ${roleFilter === 'host' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setRoleFilter('host'); setBannedFilter('all'); }}
            >
              Hosts ({summary.total_hosts})
            </button>

            <button
              className={`btn btn-sm ${roleFilter === 'agency' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setRoleFilter('agency'); setBannedFilter('all'); }}
            >
              Agencies ({summary.total_agencies})
            </button>

            <button
              className={`btn btn-sm ${roleFilter === 'user' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setRoleFilter('user'); setBannedFilter('all'); }}
            >
              Standard Viewers ({summary.total_regular})
            </button>

            <button
              className={`btn btn-sm ${roleFilter === 'moderator' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setRoleFilter('moderator'); setBannedFilter('all'); }}
            >
              Moderators ({summary.total_moderators})
            </button>

            <button
              className={`btn btn-sm ${roleFilter === 'reseller' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setRoleFilter('reseller'); setBannedFilter('all'); }}
            >
              Resellers ({summary.total_resellers || 0})
            </button>

            <button
              className={`btn btn-sm ${roleFilter === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setRoleFilter('admin'); setBannedFilter('all'); }}
            >
              Admins ({summary.total_admins})
            </button>

            <button
              className={`btn btn-sm ${bannedFilter === '1' ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => { setBannedFilter(bannedFilter === '1' ? 'all' : '1'); }}
            >
              Banned ({summary.total_banned})
            </button>
          </div>

          {/* Explicit Search Bar (Form submit / Enter key) */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '280px' }}>
              <div className="search-input-wrap" style={{ flex: 1 }}>
                <Search size={16} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter unique User ID (e.g. 5, up to 5 digits: 10243)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                Search
              </button>
              {activeSearch && (
                <button type="button" className="btn btn-secondary" onClick={handleClearSearch} style={{ whiteSpace: 'nowrap' }}>
                  Clear
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              {activeSearch && <span style={{ color: '#c4b5fd', marginRight: '8px' }}>Filtered by: "{activeSearch}" •</span>}
              Showing {users.length} of {summary.total_users} registered users
            </div>
          </form>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedUserIds.length}
        totalCount={users.length}
        onSelectAll={handleToggleSelectAll}
        onClearSelection={() => setSelectedUserIds([])}
        onDelete={handleBulkDeleteUsers}
        entityName="users"
        deleting={bulkDeleting}
      />

      {/* Users Table */}
      <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '45px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedUserIds.length === users.length}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                    title="Select all on this page"
                  />
                </th>
                <th className="user-id-cell" style={{ width: '125px', minWidth: '125px', whiteSpace: 'nowrap' }}>User ID</th>
                <th>User Profile</th>
                <th>Role</th>
                <th>Level</th>
                <th>Coin Balance (🪙)</th>
                {isDiamondMode && <th>Diamond Balance (💎)</th>}
                <th>Status</th>
                <th style={{ textAlign: 'right', width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isDiamondMode ? 9 : 8} style={{ padding: '3rem 1rem' }}>
                    <Loader text="Fetching users & broadcaster directory..." />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={isDiamondMode ? 9 : 8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                    No users found matching query
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={`clickable-row ${isSelected ? 'row-selected' : ''}`}
                      onClick={() => setDetailsModalUser(u)}
                      title="Click to view full user profile & telemetry"
                      style={isSelected ? { backgroundColor: 'rgba(239, 68, 68, 0.08)' } : {}}
                    >
                      {/* Selection Checkbox */}
                      <td
                        style={{ textAlign: 'center', width: '45px', padding: '0.75rem 0.5rem' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectUser(u.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                          title={`Select user #${u.id}`}
                        />
                      </td>

                      {/* 1. User ID Column First (single line, supports up to 5 digits) */}
                      <td className="user-id-cell" style={{ whiteSpace: 'nowrap', width: '125px', minWidth: '125px' }}>
                        <span
                          className="user-id-badge"
                          onClick={() => setDetailsModalUser(u)}
                          title="Click to view full user details"
                        >
                          ID: #{u.id}
                        </span>
                      </td>

                      {/* 2. User Profile */}
                      <td>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                          onClick={() => setDetailsModalUser(u)}
                          title="Click to view full user details"
                        >
                          <img
                            src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                            alt={String(u.id)}
                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              {u.full_name || `User #${u.id}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Account Role */}
                      <td>
                        <span className={`badge ${
                          u.role === 'agency' ? 'badge-primary' :
                          u.role === 'host' ? (u.host_type === 'audio' ? 'badge-info' : 'badge-success') :
                          u.role === 'moderator' ? 'badge-info' :
                          u.role === 'reseller' ? 'badge-primary' :
                          u.role === 'admin' ? 'badge-warning' : 'badge-secondary'
                        }`}>
                          {u.role === 'agency' ? '🏢 Agency' :
                           u.role === 'host' ? (u.host_type === 'audio' ? '🎙️ Audio Host' : '📹 Video Host') :
                           u.role === 'moderator' ? '🛡️ Moderator' :
                           u.role === 'reseller' ? '🪙 Reseller' :
                           u.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                        </span>
                      </td>

                      {/* Level */}
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: u.level >= 20 ? 'rgba(225, 29, 72, 0.1)' : u.level >= 10 ? 'rgba(217, 119, 6, 0.1)' : '#f1f5f9',
                          color: u.level >= 20 ? '#be123c' : u.level >= 10 ? '#b45309' : '#334155',
                          border: u.level >= 20 ? '1px solid rgba(225, 29, 72, 0.25)' : u.level >= 10 ? '1px solid rgba(217, 119, 6, 0.25)' : '1px solid #cbd5e1',
                        }}>
                          <Sparkles size={11} />
                          <span>Lv.{u.level}</span>
                        </span>
                      </td>

                      {/* Coin Balance */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.88rem' }}>
                            🪙 {Number(u.coins || 0).toLocaleString()}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>coins</span>
                        </div>
                      </td>

                      {/* Diamond Balance */}
                      {isDiamondMode && (
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: '#06b6d4', fontSize: '0.88rem' }}>
                              💎 {Number(u.diamonds || 0).toLocaleString()}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>diamonds</span>
                          </div>
                        </td>
                      )}

                      {/* Status */}
                      <td>
                        {u.is_banned ? (
                          <span className="badge badge-danger">Banned</span>
                        ) : (
                          <span className="badge badge-success">Active</span>
                        )}
                      </td>

                      {/* Actions with 3-Dot Dropdown */}
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div className="action-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === u.id ? null : u.id);
                            }}
                            style={{
                              width: '34px',
                              height: '34px',
                              padding: 0,
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: openDropdownId === u.id ? 'rgba(124, 58, 237, 0.15)' : undefined,
                              borderColor: openDropdownId === u.id ? '#7c3aed' : undefined,
                              color: openDropdownId === u.id ? '#7c3aed' : 'var(--text-main)',
                              cursor: 'pointer',
                            }}
                            title="Action options"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openDropdownId === u.id && (
                            <div className="dropdown-menu-card" onClick={(e) => e.stopPropagation()}>
                              {/* 1. View & Edit Profile */}
                              <button
                                className="dropdown-item-btn"
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setDetailsModalUser(u);
                                }}
                              >
                                <Eye size={15} color="#8b5cf6" />
                                <span>View & Edit Profile</span>
                              </button>

                              {/* 2. Deduct Coins / Diamonds */}
                              <button
                                className="dropdown-item-btn"
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setSelectedUser(u);
                                  setCoinDelta(0);
                                  setDiamondDelta(0);
                                  setActionPassword('');
                                  setBalanceReason('Admin balance deduction');
                                  setModalType('balance');
                                }}
                              >
                                <Coins size={15} color="#f59e0b" />
                                <span>Deduct Balance</span>
                              </button>

                              {/* 4. Ban / Unban Account */}
                              <button
                                className="dropdown-item-btn"
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleToggleBan(u);
                                }}
                                style={{ color: u.is_banned ? '#10b981' : '#f43f5e' }}
                              >
                                {u.is_banned ? <CheckCircle size={15} color="#10b981" /> : <Ban size={15} color="#f43f5e" />}
                                <span>{u.is_banned ? 'Unban Account' : 'Ban Account'}</span>
                              </button>

                              {/* Divider */}
                              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

                              {/* 5. Delete User / Host */}
                              <button
                                className="dropdown-item-btn danger"
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setDeleteConfirmUser(u);
                                }}
                              >
                                <Trash2 size={15} color="#ef4444" />
                                <span>Delete User / Host</span>
                              </button>
                            </div>
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

        {/* Dedicated Pagination for Users */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(totalCount / pageSize) || 1}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={(p) => {
            setPage(p);
            fetchUsers(activeSearch, p, pageSize);
          }}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
            fetchUsers(activeSearch, 1, s);
          }}
        />
      </div>

      {/* Deduct Balance Modal */}
      {modalType === 'balance' && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coins size={20} color="#f59e0b" />
              <span>Deduct Wallet Balances: User ID #{selectedUser.id}</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
              User ID: <strong className="user-id-badge">#{selectedUser.id}</strong> • Current: 🪙 <strong>{Number(selectedUser.coins).toLocaleString()}</strong> coins{isDiamondMode ? <> | 💎 <strong>{Number(selectedUser.diamonds).toLocaleString()}</strong> diamonds</> : ''}
            </p>

            {/* Policy & Security Notice */}
            <div
              style={{
                borderRadius: '8px',
                padding: '0.75rem 0.9rem',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                fontSize: '0.78rem',
                color: 'var(--text-main)',
                lineHeight: 1.45,
                marginBottom: '1rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#d97706', marginBottom: '3px' }}>
                ⚠️ Financial Security Policy:
              </div>
              <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {isDiamondMode && <li>Diamonds <strong>cannot be added</strong> or increased manually. Only deductions down to 0 are permitted.</li>}
                <li>To <strong>recharge/add coins</strong>, use the dedicated <strong>Coin Recharge</strong> menu.</li>
                <li>Deducting coins{isDiamondMode ? ' or diamonds' : ''} requires your <strong>Admin Action Password</strong>.</li>
              </ul>
            </div>

            <form onSubmit={handleAdjustBalance} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Deduct Coins */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Coins size={14} /> Deduct Coins (🪙):
                  </label>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                    Current: {Number(selectedUser.coins || 0).toLocaleString()} coins
                  </span>
                </div>
                <input
                  type="number"
                  className="input-field"
                  min="0"
                  max={selectedUser.coins || 0}
                  placeholder="Enter amount to deduct (e.g. 500)"
                  value={coinDelta}
                  onChange={(e) => setCoinDelta(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[100, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', height: 'auto' }}
                      onClick={() => setCoinDelta(Math.min(amt, Number(selectedUser.coins || 0)))}
                    >
                      -{amt}
                    </button>
                  ))}
                  {Number(selectedUser.coins || 0) > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', height: 'auto', color: '#ef4444' }}
                      onClick={() => setCoinDelta(Number(selectedUser.coins || 0))}
                    >
                      Deduct All
                    </button>
                  )}
                </div>
              </div>

              {/* Deduct Diamonds */}
              {isDiamondMode && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={14} /> Deduct Diamonds (💎):
                    </label>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      Current: {Number(selectedUser.diamonds || 0).toLocaleString()} diamonds
                    </span>
                  </div>
                  <input
                    type="number"
                    className="input-field"
                    min="0"
                    max={selectedUser.diamonds || 0}
                    placeholder="Enter amount to deduct (e.g. 1000)"
                    value={diamondDelta}
                    onChange={(e) => setDiamondDelta(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {[500, 1000, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', padding: '2px 8px', height: 'auto' }}
                        onClick={() => setDiamondDelta(Math.min(amt, Number(selectedUser.diamonds || 0)))}
                      >
                        -{amt}
                      </button>
                    ))}
                    {Number(selectedUser.diamonds || 0) > 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', padding: '2px 8px', height: 'auto', color: '#ef4444' }}
                        onClick={() => setDiamondDelta(Number(selectedUser.diamonds || 0))}
                      >
                        Deduct All to 0
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Reason / Audit Log */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Reason / Audit Log:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Reason for balance deduction..."
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  required
                />
              </div>

              {/* Action Security Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Lock size={14} />
                    <span>Admin Security Action Password:</span>
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Platform Settings</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showActionPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Enter security password (default: admin123)..."
                    value={actionPassword}
                    onChange={(e) => setActionPassword(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', paddingRight: '2.5rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowActionPassword(!showActionPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    tabIndex={-1}
                  >
                    {showActionPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '3px' }}>
                  Set or updated in Platform Settings (Default: admin123).
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setModalType(null);
                    setActionPassword('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #e11d48 0%, #7c3aed 100%)' }}
                  disabled={!actionPassword.trim()}
                >
                  Authorize Deduction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal (Full Telemetry, Streams, Moderator Powers, Financials) */}
      {detailsModalUser && (
        <UserDetailsModal
          userId={detailsModalUser.id}
          initialUser={detailsModalUser}
          onClose={() => setDetailsModalUser(null)}
          onUserUpdated={() => fetchUsers(activeSearch, page, pageSize)}
          onToast={onToast}
        />
      )}

      {/* Delete User / Host Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmUser(null)}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', textAlign: 'center', padding: '2rem 1.5rem' }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <Trash2 size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Delete User / Host Account
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to permanently delete User <strong>ID: #{deleteConfirmUser.id}</strong> ({deleteConfirmUser.full_name || `User #${deleteConfirmUser.id}`})?
              <span style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', marginTop: '8px', fontWeight: 600 }}>
                ⚠️ This action is irreversible. All live stream logs, agency ties, and balances will be removed.
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmUser(null)}
                disabled={deletingUser}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteUser}
                disabled={deletingUser}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Trash2 size={15} />
                <span>{deletingUser ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
