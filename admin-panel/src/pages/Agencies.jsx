import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Users,
  Radio,
  Gem,
  Percent,
  Search,
  Phone,
  CheckCircle,
  XCircle,
  UserPlus,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
  Check,
  Crown,
  Award,
  Eye,
  Video,
  Mic,
} from 'lucide-react';
import agencyApi from '../api/agencyApi';
import { adminApi } from '../api/adminApi';
import userApi from '../api/userApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import UserDetailsModal from '../components/UserDetailsModal';
import BulkActionBar from '../components/BulkActionBar';
import { useEconomy } from '../context/EconomyContext';

export default function Agencies({ onToast }) {
  const { isDiamondMode } = useEconomy();
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dedicated Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailsUserId, setDetailsUserId] = useState(null);

  // Bulk Selection
  const [selectedAgencyIds, setSelectedAgencyIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleToggleSelectAll = () => {
    if (selectedAgencyIds.length === agencies.length) {
      setSelectedAgencyIds([]);
    } else {
      setSelectedAgencyIds(agencies.map((a) => a.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedAgencyIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedAgencyIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await adminApi.bulkDelete('agencies', selectedAgencyIds);
      if (res.success) {
        onToast(`Successfully deleted ${res.count || selectedAgencyIds.length} agencies.`, 'success');
        setSelectedAgencyIds([]);
        fetchAgencies();
      }
    } catch (err) {
      onToast(err.message || 'Failed to bulk delete agencies.', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedAgencyForHosts, setSelectedAgencyForHosts] = useState(null);
  const [agencyHosts, setAgencyHosts] = useState([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [hostPage, setHostPage] = useState(1);
  const [hostPageSize, setHostPageSize] = useState(5);
  const [deleteConfirmAgency, setDeleteConfirmAgency] = useState(null);
  const [deletingAgency, setDeletingAgency] = useState(false);

  // Explicit Server-Side User Lookup for Create Agency (Scalable to millions)
  const [ownerSearchInput, setOwnerSearchInput] = useState('');
  const [searchingOwner, setSearchingOwner] = useState(false);
  const [ownerSearchError, setOwnerSearchError] = useState('');
  const [selectedOwner, setSelectedOwner] = useState(null);

  // Create Agency Form
  const [newAgency, setNewAgency] = useState({
    name: '',
    commissionRate: 10,
    contactPhone: '',
    notes: '',
  });

  // Explicit Server-Side Host Lookup for Recruitment (Scalable to millions)
  const [hostSearchInput, setHostSearchInput] = useState('');
  const [searchingHost, setSearchingHost] = useState(false);
  const [hostSearchError, setHostSearchError] = useState('');
  const [foundHostUser, setFoundHostUser] = useState(null);
  const [selectedHostType, setSelectedHostType] = useState('video');

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      const res = await agencyApi.getAgencies();
      if (res.success) {
        setAgencies(res.agencies);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

  // On-demand Server Lookup strictly by unique User ID
  const handleSearchOwner = async (e) => {
    if (e) e.preventDefault();
    const cleanId = ownerSearchInput.trim().replace(/^#/, '');
    if (!cleanId || isNaN(cleanId)) {
      onToast('Please enter a valid numeric User ID (e.g. 5)', 'error');
      return;
    }

    setSearchingOwner(true);
    setOwnerSearchError('');
    try {
      const res = await userApi.getUsers({ search: cleanId, limit: 1 });
      if (res.success && res.users && res.users.length > 0) {
        handleSelectOwner(res.users[0]);
      } else {
        setOwnerSearchError(`User with unique User ID #${cleanId} not found.`);
      }
    } catch (err) {
      setOwnerSearchError(err.message || 'Error finding user');
    } finally {
      setSearchingOwner(false);
    }
  };

  const handleSelectOwner = (user) => {
    setSelectedOwner(user);
    setOwnerSearchInput('');
    setOwnerSearchError('');
    const suggestedName = `${user.full_name || ('User #' + user.id)} Agency`;
    setNewAgency((prev) => ({
      ...prev,
      name: prev.name ? prev.name : suggestedName,
      contactPhone: prev.contactPhone ? prev.contactPhone : '',
    }));
  };

  const handleClearOwner = () => {
    setSelectedOwner(null);
    setOwnerSearchInput('');
    setOwnerSearchError('');
  };

  const handleCreateAgency = async (e) => {
    e.preventDefault();
    if (!selectedOwner) {
      onToast('Please search and select a user by User ID to be the agency owner.', 'error');
      return;
    }
    if (!newAgency.name.trim()) {
      onToast('Please enter an agency name.', 'error');
      return;
    }

    try {
      const payload = {
        name: newAgency.name.trim(),
        ownerId: selectedOwner.id,
        commissionRate: newAgency.commissionRate,
        contactPhone: newAgency.contactPhone,
        notes: newAgency.notes,
      };

      const res = await agencyApi.createAgency(payload);
      if (res.success) {
        onToast(res.message, 'success');
        setCreateModalOpen(false);
        setSelectedOwner(null);
        setOwnerSearchInput('');
        setOwnerSearchError('');
        setNewAgency({ name: '', commissionRate: 10, contactPhone: '', notes: '' });
        fetchAgencies();
      }
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  const openManageHostsModal = async (agency) => {
    setSelectedAgencyForHosts(agency);
    setLoadingHosts(true);
    setHostSearchInput('');
    setHostSearchError('');
    setFoundHostUser(null);
    setSelectedHostType('video');
    setHostPage(1);
    try {
      const res = await agencyApi.getAgencyHosts(agency.id);
      if (res.success) {
        setAgencyHosts(res.hosts);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoadingHosts(false);
    }
  };

  // On-demand Server Lookup for Host Candidate strictly by unique User ID
  const handleSearchHost = async (e) => {
    if (e) e.preventDefault();
    const cleanId = hostSearchInput.trim().replace(/^#/, '');
    if (!cleanId || isNaN(cleanId)) {
      onToast('Please enter a valid numeric User ID (e.g. 5)', 'error');
      return;
    }

    setSearchingHost(true);
    setHostSearchError('');
    setFoundHostUser(null);
    try {
      const res = await userApi.getUsers({ search: cleanId, limit: 1 });
      if (res.success && res.users && res.users.length > 0) {
        const candidate = res.users[0];
        if (selectedAgencyForHosts && candidate.agency_id === selectedAgencyForHosts.id) {
          setHostSearchError(`User ID #${candidate.id} (${candidate.full_name || 'User'}) is already assigned to this agency.`);
        } else {
          setFoundHostUser(candidate);
          setSelectedHostType(candidate.host_type === 'audio' ? 'audio' : 'video');
        }
      } else {
        setHostSearchError(`Host candidate with unique User ID #${cleanId} not found.`);
      }
    } catch (err) {
      setHostSearchError(err.message || 'Error searching user');
    } finally {
      setSearchingHost(false);
    }
  };

  const handleRecruitHost = async () => {
    if (!selectedAgencyForHosts || !foundHostUser) return;

    try {
      const res = await agencyApi.assignUserToAgency(
        selectedAgencyForHosts.id,
        foundHostUser.id,
        selectedHostType
      );
      if (res.success) {
        onToast(res.message, 'success');
        setFoundHostUser(null);
        setSelectedHostType('video');
        setHostSearchInput('');
        setHostSearchError('');
        // Refresh agency hosts
        const updated = await agencyApi.getAgencyHosts(selectedAgencyForHosts.id);
        if (updated.success) setAgencyHosts(updated.hosts);
        fetchAgencies();
      }
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  const handleToggleHostType = async (userId, currentType) => {
    const newType = currentType === 'audio' ? 'video' : 'audio';
    try {
      const res = await userApi.updateUser(userId, { host_type: newType });
      if (res.success) {
        onToast(`Host #${userId} type switched to ${newType === 'audio' ? '🎙️ Audio Host' : '📹 Video Host'}!`, 'success');
        setAgencyHosts((prev) =>
          prev.map((h) => (h.id === userId ? { ...h, host_type: newType } : h))
        );
        fetchAgencies();
      }
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  const handleRemoveHost = async (userId) => {
    if (!window.confirm('Remove this host from this agency?')) return;
    try {
      const res = await agencyApi.removeUserFromAgency(selectedAgencyForHosts.id, userId);
      if (res.success) {
        onToast('Host removed from agency.', 'success');
        const updated = agencyHosts.filter((h) => h.id !== userId);
        setAgencyHosts(updated);
        const maxPage = Math.ceil(updated.length / hostPageSize) || 1;
        if (hostPage > maxPage) setHostPage(maxPage);
        fetchAgencies();
      }
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  const handleDeleteAgency = async () => {
    if (!deleteConfirmAgency) return;
    try {
      setDeletingAgency(true);
      const res = await agencyApi.deleteAgency(deleteConfirmAgency.id);
      if (res.success) {
        onToast(res.message || 'Agency deleted successfully.', 'success');
        setDeleteConfirmAgency(null);
        fetchAgencies();
      }
    } catch (err) {
      onToast(err.message || 'Failed to delete agency.', 'error');
    } finally {
      setDeletingAgency(false);
    }
  };

  // Metrics
  const totalAgencies = agencies.length;
  const totalRecruitedHosts = agencies.reduce((acc, a) => acc + (parseInt(a.host_count, 10) || 0), 0);
  const totalAgencyDiamonds = agencies.reduce((acc, a) => acc + (parseInt(a.total_host_diamonds, 10) || 0), 0);

  // If viewing details of a host/user, render as a dedicated full-page view!
  if (detailsUserId) {
    return (
      <UserDetailsModal
        userId={detailsUserId}
        onClose={() => setDetailsUserId(null)}
        onToast={onToast}
        isPage={true}
        backTitle="Back to Agencies"
      />
    );
  }

  return (
    <div>
      {/* 3 Metric Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.25rem',
      }}>
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total Agencies</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <Building2 size={20} />
            </div>
          </div>
          <div className="stat-value">{totalAgencies}</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Recruited Hosts</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
              <Radio size={20} />
            </div>
          </div>
          <div className="stat-value">{totalRecruitedHosts}</div>
        </div>

        {isDiamondMode && (
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Agency Diamonds</span>
              <div className="stat-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                <Gem size={20} />
              </div>
            </div>
            <div className="stat-value">💎 {totalAgencyDiamonds.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="panel-card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
            All Agencies ({agencies.length})
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedOwner(null);
              setOwnerSearchInput('');
              setOwnerSearchError('');
              setCreateModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Create Agency</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedAgencyIds.length}
        totalCount={agencies.length}
        onSelectAll={handleToggleSelectAll}
        onClearSelection={() => setSelectedAgencyIds([])}
        onDelete={handleBulkDelete}
        entityName="agencies"
        deleting={bulkDeleting}
      />

      {/* Agencies Table */}
      <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '45px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={agencies.length > 0 && selectedAgencyIds.length === agencies.length}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                    title="Select all on this page"
                  />
                </th>
                <th className="user-id-cell" style={{ width: '125px', minWidth: '125px', whiteSpace: 'nowrap' }}>Agency ID</th>
                <th>Agency Name</th>
                <th>Owner Name & Profile</th>
                <th>Total Host Count</th>
                <th style={{ textAlign: 'right', minWidth: '160px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem 1rem' }}>
                    <Loader text="Loading registered agencies & talent networks..." />
                  </td>
                </tr>
              ) : agencies.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                    No agencies registered yet. Click "Create New Agency" to add one.
                  </td>
                </tr>
              ) : (
                agencies.slice((page - 1) * pageSize, page * pageSize).map((agency) => {
                  const isSelected = selectedAgencyIds.includes(agency.id);
                  return (
                  <tr
                    key={agency.id}
                    onClick={() => openManageHostsModal(agency)}
                    style={{ cursor: 'pointer', ...(isSelected ? { backgroundColor: 'rgba(239, 68, 68, 0.08)' } : {}) }}
                    title="Tap to view full agency details & host roster"
                  >
                    {/* Selection Checkbox */}
                    <td
                      style={{ textAlign: 'center', width: '45px', padding: '0.75rem 0.5rem' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(agency.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                        title={`Select agency #${agency.id}`}
                      />
                    </td>

                    {/* 1. Agency ID */}
                    <td className="user-id-cell" style={{ whiteSpace: 'nowrap', width: '125px', minWidth: '125px' }}>
                      <span className="user-id-badge">
                        ID: #{agency.owner_id || agency.id}
                      </span>
                    </td>

                    {/* 2. Agency Name */}
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                          {agency.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          {agency.status === 'active' ? (
                            <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>Active</span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>Inactive</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. Owner Name & Owner Profile */}
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailsUserId(agency.owner_id);
                        }}
                        title="Click to view full owner profile"
                      >
                        <img
                          src={agency.owner_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${agency.owner_id}`}
                          alt={String(agency.owner_id)}
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(124, 58, 237, 0.25)' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{agency.owner_name || `Host #${agency.owner_id}`}</span>
                            <span className="user-id-badge" style={{ fontSize: '0.7rem', padding: '1px 5px' }}>
                              ID: #{agency.owner_id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 4. Total Host Count */}
                    <td>
                      <span
                        className="badge badge-primary"
                        style={{ fontSize: '0.82rem', fontWeight: 700, padding: '4px 10px' }}
                      >
                        <Users size={14} style={{ marginRight: '5px' }} />
                        {agency.host_count || 0} Hosts
                      </span>
                    </td>

                    {/* 5. Delete Agency Button */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmAgency(agency);
                        }}
                        title="Delete this agency"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Trash2 size={14} />
                        <span>Delete Agency</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>

        {/* Dedicated Pagination for Agencies */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(agencies.length / pageSize) || 1}
          totalItems={agencies.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </div>

      {/* Modal: Create Agency with On-Demand User ID Lookup */}
      {createModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '580px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={22} color="#8b5cf6" />
              <span>Create New Agency</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
              Enter the exact <strong>User ID</strong> to fetch and promote as agency head.
            </p>

            <form onSubmit={handleCreateAgency} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              
              {/* STEP 1: Explicit User ID Search (No auto-search / No extra user list) */}
              <div style={{
                background: 'rgba(139, 92, 246, 0.06)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: '12px',
                padding: '1.1rem',
              }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#c4b5fd', marginBottom: '0.4rem' }}>
                  1. Search User by Unique User ID (Agency Head):
                </label>

                {!selectedOwner ? (
                  <div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div className="search-input-wrap" style={{ flex: 1 }}>
                        <Search size={16} />
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Enter unique User ID (e.g. 5)..."
                          value={ownerSearchInput}
                          onChange={(e) => {
                            setOwnerSearchInput(e.target.value);
                            setOwnerSearchError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchOwner();
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSearchOwner}
                        disabled={searchingOwner}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {searchingOwner ? 'Searching...' : 'Find User'}
                      </button>
                    </div>

                    {ownerSearchError && (
                      <div style={{
                        marginTop: '0.65rem',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.78rem',
                        color: '#fda4af',
                        background: 'rgba(244, 63, 94, 0.1)',
                        border: '1px solid rgba(244, 63, 94, 0.25)',
                        borderRadius: '6px',
                      }}>
                        ⚠️ {ownerSearchError}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Verified Selected Owner Card */
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={selectedOwner.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                        alt={String(selectedOwner.id)}
                        style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle size={15} color="#059669" />
                          <span>Selected Owner: <strong>{selectedOwner.full_name || ('User #' + selectedOwner.id)}</strong></span>
                          <span style={{ fontSize: '0.7rem', color: '#065f46', background: '#d1fae5', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                            ID: #{selectedOwner.id}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#0284c7', fontWeight: 600 }}>Role: <strong>{selectedOwner.role}</strong></span>
                          <span>Lv.{selectedOwner.level}</span>
                          <span style={{ color: '#be185d', fontWeight: 600 }}>👑 {selectedOwner.vip_package || 'Standard'}</span>
                          <span style={{ color: '#b45309', fontWeight: 600 }}>🪙 {Number(selectedOwner.coins || 0).toLocaleString()} coins</span>
                          {isDiamondMode && (
                            <span style={{ color: '#0e7490', fontWeight: 600 }}>💎 {Number(selectedOwner.diamonds || 0).toLocaleString()} diamonds</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#6d28d9', background: '#ede9fe', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                        Agency ID: #{selectedOwner.id} (Matches Owner User ID)
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleClearOwner}
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
                      >
                        Change User
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: Agency Name (With Quick Buttons for Owner Name vs Custom) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  2. Agency Name:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Royal Talent Agency"
                  value={newAgency.name}
                  onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value })}
                  required
                />

                {/* Quick name options if an owner is selected */}
                {selectedOwner && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Quick Fill:</span>
                    <button
                      type="button"
                      onClick={() => setNewAgency({ ...newAgency, name: selectedOwner.full_name || `Host #${selectedOwner.id}` })}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        color: '#c4b5fd',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                      }}
                    >
                      Use Owner's Name ("{selectedOwner.full_name || `Host #${selectedOwner.id}`}")
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAgency({ ...newAgency, name: `${selectedOwner.full_name || `Host #${selectedOwner.id}`} Agency` })}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        color: '#c4b5fd',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                      }}
                    >
                      "{selectedOwner.full_name || `Host #${selectedOwner.id}`} Agency"
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAgency({ ...newAgency, name: `${selectedOwner.full_name || `Host #${selectedOwner.id}`} Live` })}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        color: '#c4b5fd',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                      }}
                    >
                      "{selectedOwner.full_name || `Host #${selectedOwner.id}`} Live"
                    </button>
                  </div>
                )}
              </div>

              {/* Commission Rate & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Commission Rate (%):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    className="input-field"
                    value={newAgency.commissionRate}
                    onChange={(e) => setNewAgency({ ...newAgency, commissionRate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Contact Phone / WhatsApp:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="+8801700000000"
                    value={newAgency.contactPhone}
                    onChange={(e) => setNewAgency({ ...newAgency, contactPhone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Notes / Agreement Details:
                </label>
                <textarea
                  className="input-field"
                  rows="2"
                  placeholder="Official partner agency agreement..."
                  value={newAgency.notes}
                  onChange={(e) => setNewAgency({ ...newAgency, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedOwner}
                >
                  Create Agency & Promote Owner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agency Full Details & Managed Hosts with Host Pagination */}
      {selectedAgencyForHosts && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{selectedAgencyForHosts.name}</span>
                    <span className="user-id-badge" style={{ fontSize: '0.78rem' }}>
                      Agency ID: #{selectedAgencyForHosts.owner_id || selectedAgencyForHosts.id}
                    </span>
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${selectedAgencyForHosts.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      Status: {selectedAgencyForHosts.status}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedAgencyForHosts(null)}
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Agency Overview Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1.25rem',
            }}>
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>COMMISSION RATE</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                  {selectedAgencyForHosts.commission_rate}%
                </div>
              </div>

              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>TOTAL HOSTS</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#7c3aed', marginTop: '2px' }}>
                  {agencyHosts.length} Hosts
                </div>
              </div>

              {isDiamondMode && (
                <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>HOST DIAMONDS</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                    💎 {Number(selectedAgencyForHosts.total_host_diamonds || 0).toLocaleString()}
                  </div>
                </div>
              )}

              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>CONTACT PHONE</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedAgencyForHosts.contact_phone || 'None'}
                </div>
              </div>
            </div>

            {/* Owner Profile Showcase Banner */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(2, 132, 199, 0.05) 100%)',
                border: '1px solid rgba(124, 58, 237, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={selectedAgencyForHosts.owner_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAgencyForHosts.owner_id}`}
                  alt={String(selectedAgencyForHosts.owner_id)}
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #7c3aed' }}
                />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Owner: {selectedAgencyForHosts.owner_name || `User #${selectedAgencyForHosts.owner_id}`}</span>
                    <span className="user-id-badge" style={{ fontSize: '0.7rem', padding: '1px 5px' }}>
                      Owner ID: #{selectedAgencyForHosts.owner_id}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '1px' }}>
                    Role: <strong style={{ textTransform: 'capitalize' }}>{selectedAgencyForHosts.owner_role || 'Agency Owner'}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDetailsUserId(selectedAgencyForHosts.owner_id)}
                style={{ fontSize: '0.75rem', gap: '5px' }}
              >
                <Eye size={13} />
                <span>View Owner Profile</span>
              </button>
            </div>

            {/* Recruit Host by User ID (Explicit Server Lookup) */}
            <div style={{
              background: 'rgba(139, 92, 246, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.22)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c4b5fd', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserPlus size={15} />
                <span>Recruit Broadcaster / Host by User ID</span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: '0.65rem' }}>
                Enter the exact User ID to assign as a certified host under this agency.
              </p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '0.5rem' }}>
                <div className="search-input-wrap" style={{ flex: 1 }}>
                  <Search size={16} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter User ID (e.g. 5) to find host..."
                    value={hostSearchInput}
                    onChange={(e) => {
                      setHostSearchInput(e.target.value);
                      setHostSearchError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchHost();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSearchHost}
                  disabled={searchingHost}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {searchingHost ? 'Searching...' : 'Find User'}
                </button>
              </div>

              {hostSearchError && (
                <div style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.78rem',
                  color: '#fda4af',
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.25)',
                  borderRadius: '6px',
                  marginBottom: '0.5rem',
                }}>
                  ⚠️ {hostSearchError}
                </div>
              )}

              {/* Found Host Candidate Preview & Confirm Action */}
              {foundHostUser && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginTop: '0.65rem',
                  padding: '0.85rem',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '10px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <img
                        src={foundHostUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${foundHostUser.id}`}
                        alt={String(foundHostUser.id)}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{foundHostUser.full_name || `Host #${foundHostUser.id}`}</span>
                          <span style={{ fontSize: '0.7rem', color: '#6d28d9', background: '#ede9fe', padding: '1px 5px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            ID: #{foundHostUser.id}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                            Lv.{foundHostUser.level}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#0284c7', fontWeight: 600 }}>Role: <strong>{foundHostUser.role}</strong></span>
                          <span style={{ color: '#be185d', fontWeight: 600 }}>👑 {foundHostUser.vip_package || 'Standard'}</span>
                          <span style={{ color: '#b45309', fontWeight: 600 }}>🪙 {Number(foundHostUser.coins || 0).toLocaleString()}</span>
                          {isDiamondMode && (
                            <span style={{ color: '#0e7490', fontWeight: 600 }}>💎 {Number(foundHostUser.diamonds || 0).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleRecruitHost}
                      style={{ padding: '7px 16px', fontWeight: 600 }}
                    >
                      <UserPlus size={15} />
                      <span>Confirm Recruitment</span>
                    </button>
                  </div>

                  {/* Host Type Selection Toggle */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    paddingTop: '8px',
                    borderTop: '1px dashed rgba(16, 185, 129, 0.3)',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Assign Host Type:
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedHostType('video')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: selectedHostType === 'video' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'var(--bg-primary)',
                          color: selectedHostType === 'video' ? '#ffffff' : 'var(--text-dim)',
                          border: selectedHostType === 'video' ? '1px solid transparent' : '1px solid var(--border-color)',
                          boxShadow: selectedHostType === 'video' ? '0 2px 6px rgba(236, 72, 153, 0.3)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Video size={13} />
                        <span>📹 Video Host</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedHostType('audio')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: selectedHostType === 'audio' ? 'linear-gradient(135deg, #0284c7, #06b6d4)' : 'var(--bg-primary)',
                          color: selectedHostType === 'audio' ? '#ffffff' : 'var(--text-dim)',
                          border: selectedHostType === 'audio' ? '1px solid transparent' : '1px solid var(--border-color)',
                          boxShadow: selectedHostType === 'audio' ? '0 2px 6px rgba(2, 132, 199, 0.3)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Mic size={13} />
                        <span>🎙️ Audio Host</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Current Recruited Hosts Section with Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="var(--primary)" />
                <span>Agency Broadcaster Roster ({agencyHosts.length} Hosts)</span>
              </h4>
              {agencyHosts.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Page {hostPage} of {Math.ceil(agencyHosts.length / hostPageSize) || 1}
                </span>
              )}
            </div>

            {loadingHosts ? (
              <div style={{ padding: '2rem' }}>
                <Loader size="sm" text="Fetching agency broadcasters..." />
              </div>
            ) : agencyHosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.75rem', color: 'var(--text-dim)', border: '1px dashed var(--border-color)', borderRadius: '10px' }}>
                No broadcasters signed under this agency yet. Enter a User ID above to recruit hosts!
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', minHeight: '160px' }}>
                  {agencyHosts.slice((hostPage - 1) * hostPageSize, hostPage * hostPageSize).map((host) => (
                    <div
                      key={host.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
                        onClick={() => setDetailsUserId(host.id)}
                        title="Click to view full user profile & telemetry"
                      >
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          color: '#6d28d9',
                          background: 'rgba(124, 58, 237, 0.12)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                        }}>
                          ID: #{host.id}
                        </span>
                        <img
                          src={host.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${host.id}`}
                          alt={String(host.id)}
                          style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>{host.full_name || `Host #${host.id}`}</span>
                            {host.host_type === 'audio' ? (
                              <span style={{
                                fontSize: '0.68rem',
                                color: '#0284c7',
                                background: 'rgba(2, 132, 199, 0.12)',
                                border: '1px solid rgba(2, 132, 199, 0.3)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}>
                                <Mic size={11} /> Audio Host
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.68rem',
                                color: '#ec4899',
                                background: 'rgba(236, 72, 153, 0.12)',
                                border: '1px solid rgba(236, 72, 153, 0.3)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}>
                                <Video size={11} /> Video Host
                              </span>
                            )}
                            {host.level && (
                              <span style={{ fontSize: '0.7rem', color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                Lv.{host.level}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#be185d', fontWeight: 600 }}>👑 {host.vip_package || 'Standard'}</span>
                            <span style={{ color: '#f59e0b' }}>🪙 {Number(host.coins || 0).toLocaleString()} coins</span>
                            {isDiamondMode && (
                              <span style={{ color: '#06b6d4' }}>💎 {Number(host.diamonds || 0).toLocaleString()} diamonds</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleHostType(host.id, host.host_type)}
                          title={`Switch host type to ${host.host_type === 'audio' ? 'Video Host' : 'Audio Host'}`}
                          style={{ fontSize: '0.72rem', padding: '3px 8px', gap: '4px' }}
                        >
                          {host.host_type === 'audio' ? <Video size={12} /> : <Mic size={12} />}
                          <span>To {host.host_type === 'audio' ? 'Video' : 'Audio'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setDetailsUserId(host.id)}
                          title="View full host profile details and controls"
                          style={{ fontSize: '0.72rem', padding: '3px 8px', gap: '4px' }}
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRemoveHost(host.id)}
                          title="Remove host from agency"
                          style={{ color: '#fda4af', borderColor: 'rgba(244, 63, 94, 0.3)', fontSize: '0.72rem', padding: '3px 8px' }}
                        >
                          <Trash2 size={12} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Host Roster Pagination */}
                <div style={{ marginTop: '0.85rem' }}>
                  <Pagination
                    currentPage={hostPage}
                    totalPages={Math.ceil(agencyHosts.length / hostPageSize) || 1}
                    totalItems={agencyHosts.length}
                    pageSize={hostPageSize}
                    onPageChange={(p) => setHostPage(p)}
                    onPageSizeChange={(sz) => {
                      setHostPageSize(sz);
                      setHostPage(1);
                    }}
                    pageSizeOptions={[5, 10, 15]}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedAgencyForHosts(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Delete Agency Confirmation Modal */}
      {deleteConfirmAgency && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '460px', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              color: '#f43f5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <Trash2 size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Delete Agency?
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete agency <strong style={{ color: 'var(--text-main)' }}>"{deleteConfirmAgency.name}"</strong> (Agency ID: <strong style={{ color: '#7c3aed' }}>#{deleteConfirmAgency.id}</strong>)?
            </p>

            <div style={{
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              textAlign: 'left',
              fontSize: '0.8rem',
              color: '#fda4af',
              marginBottom: '1.5rem',
            }}>
              <div>⚠️ <strong>Consequences:</strong></div>
              <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                <li>All <strong>{deleteConfirmAgency.host_count || 0}</strong> hosts will be unlinked from this agency.</li>
                <li>Agency Head (ID: #{deleteConfirmAgency.owner_id}) will be unassigned.</li>
                <li>This action cannot be undone.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmAgency(null)}
                disabled={deletingAgency}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteAgency}
                disabled={deletingAgency}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={15} />
                <span>{deletingAgency ? 'Deleting...' : 'Confirm Delete Agency'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
