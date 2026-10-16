import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Search,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  UserMinus,
  Mic,
  PhoneOff,
  PowerOff,
  Building2,
  UserX,
  Clock,
  Check,
  X,
  User,
  Sparkles,
  Sliders,
} from 'lucide-react';
import moderatorApi from '../api/moderatorApi';
import { adminApi } from '../api/adminApi';
import userApi from '../api/userApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import UserDetailsModal from '../components/UserDetailsModal';
import BulkActionBar from '../components/BulkActionBar';

// Concise 10 Granular Moderator Permissions
export const MODERATOR_PERMISSIONS = [
  // 1. Live Room Powers
  {
    key: 'silent_room_entry',
    label: 'Ghost Room Entry',
    description: 'Enter live broadcast rooms without entry notice or alerts',
    category: 'Live Room',
    icon: EyeOff,
    color: '#6366f1',
    bg: '#e0e7ff',
  },
  {
    key: 'bypass_private_password',
    label: 'Bypass Password',
    description: 'Join password-locked live rooms directly',
    category: 'Live Room',
    icon: KeyRound,
    color: '#0284c7',
    bg: '#e0f2fe',
  },
  {
    key: 'kick_room_user',
    label: 'Kick Viewers',
    description: 'Remove disruptive viewers from live broadcast rooms',
    category: 'Live Room',
    icon: UserMinus,
    color: '#dc2626',
    bg: '#fee2e2',
  },
  {
    key: 'manage_seat_requests',
    label: 'Seat & Mic Controls',
    description: 'Accept or decline audience microphone join requests',
    category: 'Live Room',
    icon: Mic,
    color: '#059669',
    bg: '#d1fae5',
  },
  {
    key: 'remove_cohost_seat',
    label: 'Drop Co-Host',
    description: 'Force remove speaking co-hosts from audio/video seats',
    category: 'Live Room',
    icon: PhoneOff,
    color: '#ea580c',
    bg: '#ffedd5',
  },
  {
    key: 'close_room',
    label: 'Force Close Room',
    description: 'Shut down violating live broadcast rooms immediately',
    category: 'Live Room',
    icon: PowerOff,
    color: '#b91c1c',
    bg: '#fef2f2',
  },

  // 2. Agency & Host Governance
  {
    key: 'audit_agencies',
    label: 'Audit Agencies',
    description: 'Inspect agency earnings, commissions, and talent rosters',
    category: 'Agency & Talent',
    icon: Building2,
    color: '#7c3aed',
    bg: '#ede9fe',
  },
  {
    key: 'manage_agency_hosts',
    label: 'Approve Hosts',
    description: 'Review and approve host applicants under agencies',
    category: 'Agency & Talent',
    icon: UserCheck,
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    key: 'remove_hosts',
    label: 'Dismiss Hosts',
    description: 'Revoke host status or unlink from agencies',
    category: 'Agency & Talent',
    icon: UserX,
    color: '#e11d48',
    bg: '#ffe4e6',
  },
  {
    key: 'temporary_ban_host',
    label: 'Timed Host Bans',
    description: 'Impose timed streaming suspensions on violating hosts',
    category: 'Agency & Talent',
    icon: Clock,
    color: '#d97706',
    bg: '#fef3c7',
  },
];

const getDefaultPermissions = () => {
  const permObj = {};
  MODERATOR_PERMISSIONS.forEach((p) => {
    permObj[p.key] = true;
  });
  return permObj;
};

export default function Moderators({ onToast }) {
  const [moderators, setModerators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailsUserId, setDetailsUserId] = useState(null);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedModerator, setSelectedModerator] = useState(null);

  // Bulk Selection
  const [selectedModIds, setSelectedModIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Add Moderator Form State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [userSearchError, setUserSearchError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPermissions, setNewPermissions] = useState(getDefaultPermissions());
  const [notes, setNotes] = useState('');

  // Action Loading
  const [actionLoading, setActionLoading] = useState(false);

  const fetchModerators = async () => {
    try {
      setLoading(true);
      const res = await moderatorApi.getModerators();
      if (res.success) {
        setModerators(res.moderators || []);
      }
    } catch (err) {
      onToast(err.message || 'Failed to fetch moderators', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerators();
  }, []);

  const handleToggleSelectAll = () => {
    if (selectedModIds.length === filteredModerators.length) {
      setSelectedModIds([]);
    } else {
      setSelectedModIds(filteredModerators.map((m) => m.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedModIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedModIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await adminApi.bulkDelete('moderators', selectedModIds);
      if (res.success) {
        onToast(`Removed ${res.count || selectedModIds.length} moderators`, 'success');
        setSelectedModIds([]);
        fetchModerators();
      }
    } catch (err) {
      onToast(err.message || 'Failed to bulk delete moderators', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSearchUser = async (e) => {
    if (e) e.preventDefault();
    const cleanId = userSearchQuery.trim().replace(/^#/, '');
    if (!cleanId || isNaN(cleanId)) {
      onToast('Enter a valid numeric User ID', 'error');
      return;
    }

    setSearchingUser(true);
    setUserSearchError('');
    setSelectedUser(null);
    try {
      const res = await userApi.getUsers({ search: cleanId, limit: 1 });
      if (res.success && res.users && res.users.length > 0) {
        const found = res.users[0];
        const alreadyMod = moderators.some((m) => m.user_id === found.id);
        if (alreadyMod) {
          setUserSearchError(`User ID #${found.id} is already a moderator`);
        } else {
          setSelectedUser(found);
        }
      } else {
        setUserSearchError(`No user found with ID #${cleanId}`);
      }
    } catch (err) {
      setUserSearchError(err.message || 'Error looking up user');
    } finally {
      setSearchingUser(false);
    }
  };

  const handleOpenAddModal = () => {
    setUserSearchQuery('');
    setUserSearchError('');
    setSelectedUser(null);
    setNewPermissions(getDefaultPermissions());
    setNotes('');
    setAddModalOpen(true);
  };

  const handleSelectAll = (checked) => {
    const updated = {};
    MODERATOR_PERMISSIONS.forEach((p) => {
      updated[p.key] = checked;
    });
    setNewPermissions(updated);
  };

  const handleAddModerator = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      onToast('Select a user by User ID first', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        userId: selectedUser.id,
        permissions: newPermissions,
        notes: notes.trim(),
      };

      const res = await moderatorApi.addModerator(payload);
      if (res.success) {
        onToast(res.message || 'Moderator assigned successfully', 'success');
        setAddModalOpen(false);
        fetchModerators();
      }
    } catch (err) {
      onToast(err.message || 'Failed to assign moderator', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditModal = (mod) => {
    setSelectedModerator(mod);
    const existingPerms = mod.permissions || {};
    const filledPerms = {};
    MODERATOR_PERMISSIONS.forEach((p) => {
      filledPerms[p.key] = !!existingPerms[p.key];
    });
    setNewPermissions(filledPerms);
    setNotes(mod.notes || '');
    setEditModalOpen(true);
  };

  const handleOpenDetailsModal = (mod) => {
    setSelectedModerator(mod);
    setDetailsModalOpen(true);
  };

  const handleUpdateModerator = async (e) => {
    e.preventDefault();
    if (!selectedModerator) return;
    setActionLoading(true);
    try {
      const res = await moderatorApi.updateModerator(selectedModerator.id, {
        permissions: newPermissions,
        status: selectedModerator.status,
        notes: notes.trim(),
      });
      if (res.success) {
        onToast(res.message || 'Permissions updated', 'success');
        setEditModalOpen(false);
        fetchModerators();
      }
    } catch (err) {
      onToast(err.message || 'Failed to update moderator', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeleteModal = (mod) => {
    setSelectedModerator(mod);
    setDeleteModalOpen(true);
  };

  const handleDeleteModerator = async () => {
    if (!selectedModerator) return;
    setActionLoading(true);
    try {
      const res = await moderatorApi.deleteModerator(selectedModerator.id);
      if (res.success) {
        onToast(res.message || 'Moderator removed', 'success');
        setDeleteModalOpen(false);
        fetchModerators();
      }
    } catch (err) {
      onToast(err.message || 'Failed to remove moderator', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (mod) => {
    const nextStatus = mod.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await moderatorApi.updateModerator(mod.id, {
        permissions: mod.permissions,
        status: nextStatus,
        notes: mod.notes,
      });
      if (res.success) {
        onToast(`Status updated to ${nextStatus}`, 'success');
        fetchModerators();
      }
    } catch (err) {
      onToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Filter moderators
  const filteredModerators = moderators.filter((mod) => {
    const term = searchFilter.trim().replace(/^#/, '');
    const matchesSearch =
      !term ||
      String(mod.user_id) === term ||
      String(mod.user_id).includes(term) ||
      (mod.full_name && mod.full_name.toLowerCase().includes(term.toLowerCase())) ||
      (mod.email && mod.email.toLowerCase().includes(term.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || mod.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = moderators.filter((m) => m.status === 'active').length;
  const enforcementCount = moderators.filter((m) => m.permissions?.close_room || m.permissions?.kick_room_user).length;

  if (loading) {
    return <Loader message="Loading moderator directory..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Sleek Top Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.15rem 1.25rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(168, 85, 247, 0.2) 100%)',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Moderators
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {moderators.length}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.15rem 1.25rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.2) 100%)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active On-Duty
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {activeCount}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.15rem 1.25rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.15) 0%, rgba(244, 63, 94, 0.2) 100%)',
              color: '#e11d48',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PowerOff size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Room Enforcers
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {enforcementCount}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Card */}
      <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        {/* Actions Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 300px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)',
                }}
              />
              <input
                type="text"
                placeholder="Search User ID or Name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.8rem 0.55rem 2.3rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                fontSize: '0.88rem',
                color: 'var(--text-main)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              background: 'var(--primary-gradient)',
              boxShadow: 'var(--glow-primary)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
            }}
          >
            <Plus size={16} />
            <span>Assign Moderator</span>
          </button>
        </div>

        {/* Moderators Table */}
        {filteredModerators.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-dim)' }}>
            <ShieldAlert size={44} style={{ margin: '0 auto 0.75rem', opacity: 0.35, color: '#7c3aed' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              No Moderators Found
            </h3>
            <p style={{ fontSize: '0.85rem', maxWidth: '360px', margin: '0 auto 1.25rem', color: 'var(--text-muted)' }}>
              {searchFilter
                ? 'No moderators match this search term'
                : 'No moderators appointed yet'}
            </p>
            {!searchFilter && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal}>
                <Plus size={15} style={{ marginRight: '4px' }} />
                Assign First Moderator
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Bulk Action Bar */}
            <BulkActionBar
              selectedCount={selectedModIds.length}
              totalCount={filteredModerators.length}
              onSelectAll={handleToggleSelectAll}
              onClearSelection={() => setSelectedModIds([])}
              onDelete={handleBulkDelete}
              entityName="moderators"
              deleting={bulkDeleting}
            />

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center', padding: '0.65rem 0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={filteredModerators.length > 0 && selectedModIds.length === filteredModerators.length}
                        onChange={handleToggleSelectAll}
                        style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#7c3aed' }}
                      />
                    </th>
                    <th style={{ width: '110px', whiteSpace: 'nowrap' }}>User ID</th>
                    <th>Moderator</th>
                    <th>Status</th>
                    <th>Privileges</th>
                    <th>Assigned</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModerators.slice((page - 1) * pageSize, page * pageSize).map((mod) => {
                    const perms = mod.permissions || {};
                    const grantedCount = MODERATOR_PERMISSIONS.filter((p) => perms[p.key]).length;
                    const isSelected = selectedModIds.includes(mod.id);

                    return (
                      <tr key={mod.id} style={isSelected ? { backgroundColor: 'rgba(124, 58, 237, 0.05)' } : {}}>
                        {/* Checkbox */}
                        <td style={{ textAlign: 'center', padding: '0.65rem 0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(mod.id)}
                            style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#7c3aed' }}
                          />
                        </td>

                        {/* User ID */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span
                            className="user-id-badge"
                            onClick={() => setDetailsUserId(mod.user_id)}
                            title="Click to view user profile"
                            style={{ cursor: 'pointer' }}
                          >
                            #{mod.user_id}
                          </span>
                        </td>

                        {/* Moderator Profile */}
                        <td>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
                            onClick={() => setDetailsUserId(mod.user_id)}
                            title="Click to view user profile"
                          >
                            <img
                              src={mod.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${mod.user_id}`}
                              alt={String(mod.user_id)}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1.5px solid var(--border-color)',
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                                {mod.full_name || `User #${mod.user_id}`}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '1px' }}>
                                {mod.role || 'user'} {mod.notes ? `• ${mod.notes}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td>
                          <button
                            onClick={() => handleToggleStatus(mod)}
                            title="Click to toggle status"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            <span
                              className={`badge ${mod.status === 'active' ? 'badge-success' : 'badge-warning'}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  backgroundColor: mod.status === 'active' ? '#10b981' : '#f59e0b',
                                }}
                              />
                              {mod.status === 'active' ? 'Active' : 'Suspended'}
                            </span>
                          </button>
                        </td>

                        {/* Privileges Badge */}
                        <td>
                          <div
                            onClick={() => handleOpenDetailsModal(mod)}
                            title="Click to view all permissions"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              backgroundColor:
                                grantedCount >= 8
                                  ? 'rgba(16, 185, 129, 0.1)'
                                  : grantedCount > 0
                                  ? 'rgba(124, 58, 237, 0.1)'
                                  : 'rgba(239, 68, 68, 0.1)',
                              color:
                                grantedCount >= 8
                                  ? '#059669'
                                  : grantedCount > 0
                                  ? '#7c3aed'
                                  : '#dc2626',
                              border: `1px solid ${
                                grantedCount >= 8
                                  ? 'rgba(16, 185, 129, 0.25)'
                                  : grantedCount > 0
                                  ? 'rgba(124, 58, 237, 0.25)'
                                  : 'rgba(239, 68, 68, 0.25)'
                              }`,
                              cursor: 'pointer',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              userSelect: 'none',
                            }}
                          >
                            <ShieldCheck size={13} />
                            <span>{grantedCount} / 10 Active</span>
                          </div>
                        </td>

                        {/* Assigned Date */}
                        <td>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                            {new Date(mod.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setDetailsUserId(mod.user_id)}
                              title="User Profile"
                              style={{ padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)' }}
                            >
                              <User size={13} />
                            </button>

                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenDetailsModal(mod)}
                              title="View Permissions"
                              style={{ padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', color: '#0284c7' }}
                            >
                              <Eye size={13} />
                            </button>

                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEditModal(mod)}
                              title="Edit Permissions"
                              style={{ padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)' }}
                            >
                              <Sliders size={13} />
                            </button>

                            <button
                              className="btn btn-sm"
                              onClick={() => handleOpenDeleteModal(mod)}
                              title="Remove Moderator"
                              style={{
                                padding: '0.35rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#dc2626',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(filteredModerators.length / pageSize) || 1}
              totalItems={filteredModerators.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          </>
        )}
      </div>

      {/* 1. ADD MODERATOR MODAL */}
      {addModalOpen && (
        <div className="modal-overlay" onClick={() => !actionLoading && setAddModalOpen(false)}>
          <div
            className="modal-box"
            style={{
              maxWidth: '620px',
              width: '95%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(168, 85, 247, 0.2) 100%)',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                    Assign Moderator
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Appoint user by ID & configure permissions
                  </div>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setAddModalOpen(false)}
                disabled={actionLoading}
                style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddModerator}>
              {/* User ID Lookup */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  User ID *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Enter User ID (e.g. 5)..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchUser();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSearchUser}
                    disabled={searchingUser || !userSearchQuery.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', padding: '0.55rem 1rem' }}
                  >
                    <Search size={14} />
                    {searchingUser ? 'Searching...' : 'Find'}
                  </button>
                </div>

                {userSearchError && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#dc2626',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <AlertTriangle size={14} />
                    {userSearchError}
                  </div>
                )}

                {selectedUser && (
                  <div style={{
                    marginTop: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}>
                    <img
                      src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedUser.id}`}
                      alt={String(selectedUser.id)}
                      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          color: '#065f46',
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}>
                          #{selectedUser.id}
                        </span>
                        <span style={{ fontWeight: 700, color: '#065f46', fontSize: '0.9rem' }}>
                          {selectedUser.full_name || `User #${selectedUser.id}`}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: '2px' }}>
                        {selectedUser.email || 'No email'} • {selectedUser.role}
                      </div>
                    </div>
                    <CheckCircle2 size={18} color="#10b981" />
                  </div>
                )}
              </div>

              {/* Permissions Grid */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Permissions (10)
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px' }}
                      onClick={() => handleSelectAll(true)}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px' }}
                      onClick={() => handleSelectAll(false)}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Section 1: Live Room */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6366f1', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Live Room Controls
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.45rem' }}>
                    {MODERATOR_PERMISSIONS.filter((p) => p.category === 'Live Room').map((perm) => {
                      const Icon = perm.icon;
                      const isChecked = !!newPermissions[perm.key];
                      return (
                        <label
                          key={perm.key}
                          title={perm.description}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0.5rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                            backgroundColor: isChecked ? 'rgba(124, 58, 237, 0.07)' : 'var(--bg-primary)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setNewPermissions({ ...newPermissions, [perm.key]: e.target.checked })}
                            style={{ accentColor: '#7c3aed', width: '14px', height: '14px' }}
                          />
                          <Icon size={14} color={isChecked ? perm.color : 'var(--text-dim)'} />
                          <span style={{ fontSize: '0.8rem', fontWeight: isChecked ? 600 : 500, color: isChecked ? 'var(--text-main)' : 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {perm.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Agency & Talent */}
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Agency & Host Governance
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.45rem' }}>
                    {MODERATOR_PERMISSIONS.filter((p) => p.category === 'Agency & Talent').map((perm) => {
                      const Icon = perm.icon;
                      const isChecked = !!newPermissions[perm.key];
                      return (
                        <label
                          key={perm.key}
                          title={perm.description}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0.5rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                            backgroundColor: isChecked ? 'rgba(124, 58, 237, 0.07)' : 'var(--bg-primary)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setNewPermissions({ ...newPermissions, [perm.key]: e.target.checked })}
                            style={{ accentColor: '#7c3aed', width: '14px', height: '14px' }}
                          />
                          <Icon size={14} color={isChecked ? perm.color : 'var(--text-dim)'} />
                          <span style={{ fontSize: '0.8rem', fontWeight: isChecked ? 600 : 500, color: isChecked ? 'var(--text-main)' : 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {perm.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                  Duty Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Night shift & room safety"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.8rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-main)',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAddModalOpen(false)}
                  disabled={actionLoading}
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading || !selectedUser}
                  style={{ fontSize: '0.85rem', background: 'var(--primary-gradient)' }}
                >
                  {actionLoading ? 'Assigning...' : 'Assign Moderator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. VIEW PRIVILEGE DETAILS MODAL */}
      {detailsModalOpen && selectedModerator && (
        <div className="modal-overlay" onClick={() => setDetailsModalOpen(false)}>
          <div
            className="modal-box"
            style={{
              maxWidth: '560px',
              width: '95%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(168, 85, 247, 0.2) 100%)',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                    Moderator Permissions
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Active powers & privileges
                  </div>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDetailsModalOpen(false)}
                style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Profile Summary Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 0.9rem',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '1.25rem',
            }}>
              <img
                src={selectedModerator.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedModerator.user_id}`}
                alt={String(selectedModerator.user_id)}
                style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    color: '#7c3aed',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}>
                    #{selectedModerator.user_id}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                    {selectedModerator.full_name || `User #${selectedModerator.user_id}`}
                  </span>
                  <span className={`badge ${selectedModerator.status === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                    {selectedModerator.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {selectedModerator.email || 'No email'} {selectedModerator.notes ? `• "${selectedModerator.notes}"` : ''}
                </div>
              </div>
            </div>

            {/* Privileges Inspection Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {['Live Room', 'Agency & Talent'].map((cat) => {
                const permsInCat = MODERATOR_PERMISSIONS.filter((p) => p.category === cat);
                const activeInCat = permsInCat.filter((p) => selectedModerator.permissions?.[p.key]).length;

                return (
                  <div key={cat}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: cat === 'Live Room' ? '#6366f1' : '#059669',
                      marginBottom: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>
                      <span>{cat}</span>
                      <span>{activeInCat} / {permsInCat.length} Active</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.4rem' }}>
                      {permsInCat.map((perm) => {
                        const Icon = perm.icon;
                        const isGranted = !!selectedModerator.permissions?.[perm.key];

                        return (
                          <div
                            key={perm.key}
                            title={perm.description}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.45rem 0.65rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: isGranted ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-primary)',
                              border: `1px solid ${isGranted ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-color)'}`,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <Icon size={14} color={isGranted ? perm.color : 'var(--text-dim)'} />
                              <span style={{ fontSize: '0.8rem', fontWeight: isGranted ? 600 : 400, color: isGranted ? 'var(--text-main)' : 'var(--text-dim)' }}>
                                {perm.label}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: isGranted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                color: isGranted ? '#059669' : '#64748b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                              }}
                            >
                              {isGranted ? <Check size={10} /> : <X size={10} />}
                              {isGranted ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDetailsModalOpen(false)}
                style={{ fontSize: '0.85rem' }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setDetailsModalOpen(false);
                  handleOpenEditModal(selectedModerator);
                }}
                style={{ fontSize: '0.85rem', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Sliders size={13} />
                <span>Edit Privileges</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EDIT PERMISSIONS MODAL */}
      {editModalOpen && selectedModerator && (
        <div className="modal-overlay" onClick={() => !actionLoading && setEditModalOpen(false)}>
          <div
            className="modal-box"
            style={{
              maxWidth: '620px',
              width: '95%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(168, 85, 247, 0.2) 100%)',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                    Edit Permissions
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    User #{selectedModerator.user_id} ({selectedModerator.full_name || 'User'})
                  </div>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setEditModalOpen(false)}
                disabled={actionLoading}
                style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateModerator}>
              {/* Permissions Grid */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Permissions (10)
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px' }}
                      onClick={() => handleSelectAll(true)}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px' }}
                      onClick={() => handleSelectAll(false)}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Section 1: Live Room */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6366f1', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Live Room Controls
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.45rem' }}>
                    {MODERATOR_PERMISSIONS.filter((p) => p.category === 'Live Room').map((perm) => {
                      const Icon = perm.icon;
                      const isChecked = !!newPermissions[perm.key];
                      return (
                        <label
                          key={perm.key}
                          title={perm.description}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0.5rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                            backgroundColor: isChecked ? 'rgba(124, 58, 237, 0.07)' : 'var(--bg-primary)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setNewPermissions({ ...newPermissions, [perm.key]: e.target.checked })}
                            style={{ accentColor: '#7c3aed', width: '14px', height: '14px' }}
                          />
                          <Icon size={14} color={isChecked ? perm.color : 'var(--text-dim)'} />
                          <span style={{ fontSize: '0.8rem', fontWeight: isChecked ? 600 : 500, color: isChecked ? 'var(--text-main)' : 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {perm.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Agency & Talent */}
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Agency & Host Governance
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.45rem' }}>
                    {MODERATOR_PERMISSIONS.filter((p) => p.category === 'Agency & Talent').map((perm) => {
                      const Icon = perm.icon;
                      const isChecked = !!newPermissions[perm.key];
                      return (
                        <label
                          key={perm.key}
                          title={perm.description}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0.5rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                            backgroundColor: isChecked ? 'rgba(124, 58, 237, 0.07)' : 'var(--bg-primary)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setNewPermissions({ ...newPermissions, [perm.key]: e.target.checked })}
                            style={{ accentColor: '#7c3aed', width: '14px', height: '14px' }}
                          />
                          <Icon size={14} color={isChecked ? perm.color : 'var(--text-dim)'} />
                          <span style={{ fontSize: '0.8rem', fontWeight: isChecked ? 600 : 500, color: isChecked ? 'var(--text-main)' : 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {perm.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Duty Note */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                  Duty Note
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes about duties or shifts..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.8rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-main)',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditModalOpen(false)}
                  disabled={actionLoading}
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                  style={{ fontSize: '0.85rem', background: 'var(--primary-gradient)' }}
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DELETE / REMOVE CONFIRMATION MODAL */}
      {deleteModalOpen && selectedModerator && (
        <div className="modal-overlay" onClick={() => !actionLoading && setDeleteModalOpen(false)}>
          <div
            className="modal-box"
            style={{
              maxWidth: '400px',
              width: '92%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
              }}>
                <Trash2 size={24} />
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Remove Moderator?
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '1.25rem' }}>
                Remove <strong>#{selectedModerator.user_id}</strong> {selectedModerator.full_name ? `(${selectedModerator.full_name})` : ''} from moderator team?
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={actionLoading}
                  style={{ minWidth: '90px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleDeleteModerator}
                  disabled={actionLoading}
                  style={{
                    minWidth: '100px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  {actionLoading ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {detailsUserId && (
        <UserDetailsModal
          userId={detailsUserId}
          onClose={() => setDetailsUserId(null)}
          onUserUpdated={fetchModerators}
          onToast={onToast}
        />
      )}
    </div>
  );
}
