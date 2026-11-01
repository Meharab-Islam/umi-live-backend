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
  Coins,
} from 'lucide-react';
import agencyApi from '../api/agencyApi';
import { adminApi } from '../api/adminApi';
import userApi from '../api/userApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import UserDetailsModal from '../components/UserDetailsModal';
import AgencyDetailsView from '../components/AgencyDetailsView';
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

  // Dedicated Full Page View State (STRICTLY NO POPUP)
  const [viewingAgency, setViewingAgency] = useState(null);

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
    logo_url: '',
    commissionRate: 10,
    contactPhone: '',
    notes: '',
  });

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      const res = await agencyApi.getAgencies();
      if (res.success) {
        setAgencies(res.agencies);
        // If viewing an agency, keep it fresh
        if (viewingAgency) {
          const fresh = res.agencies.find((a) => a.id === viewingAgency.id);
          if (fresh) setViewingAgency(fresh);
        }
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
        logo_url: newAgency.logo_url?.trim() || null,
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
        setNewAgency({ name: '', logo_url: '', commissionRate: 10, contactPhone: '', notes: '' });
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
        if (viewingAgency && viewingAgency.id === deleteConfirmAgency.id) {
          setViewingAgency(null);
        }
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

  // 1. If viewing details of a host/user, render as a dedicated full-page view!
  if (detailsUserId) {
    return (
      <UserDetailsModal
        userId={detailsUserId}
        onClose={() => setDetailsUserId(null)}
        onToast={onToast}
        isPage={true}
        backTitle={viewingAgency ? `Back to ${viewingAgency.name}` : 'Back to Agencies'}
      />
    );
  }

  // 2. If viewing agency details, render as a dedicated FULL-PAGE VIEW (Strictly NO POPUP!)
  if (viewingAgency) {
    return (
      <AgencyDetailsView
        agency={viewingAgency}
        onBack={() => {
          setViewingAgency(null);
          fetchAgencies();
        }}
        onViewUser={(userId) => setDetailsUserId(userId)}
        onDeleteAgency={(agency) => setDeleteConfirmAgency(agency)}
        onToast={onToast}
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
                <th style={{ minWidth: '140px' }}>Total Coins</th>
                <th style={{ textAlign: 'right', minWidth: '160px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '3rem 1rem' }}>
                    <Loader text="Loading registered agencies & talent networks..." />
                  </td>
                </tr>
              ) : agencies.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                    No agencies registered yet. Click "Create New Agency" to add one.
                  </td>
                </tr>
              ) : (
                agencies.slice((page - 1) * pageSize, page * pageSize).map((agency) => {
                  const isSelected = selectedAgencyIds.includes(agency.id);
                  const agencyLogo = agency.logo_url || agency.avatar_url;
                  return (
                  <tr
                    key={agency.id}
                    onClick={() => setViewingAgency(agency)}
                    style={{ cursor: 'pointer', ...(isSelected ? { backgroundColor: 'rgba(239, 68, 68, 0.08)' } : {}) }}
                    title="Tap to open full agency details & host roster page"
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

                    {/* 2. Agency Name WITH Agency Profile / Logo Image in front */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
                          {agencyLogo ? (
                            <img
                              src={agencyLogo}
                              alt={agency.name}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextSibling) {
                                  e.currentTarget.nextSibling.style.display = 'flex';
                                }
                              }}
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                objectFit: 'cover',
                                border: '1px solid rgba(139, 92, 246, 0.35)',
                                background: 'rgba(139, 92, 246, 0.1)',
                              }}
                            />
                          ) : null}
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
                              border: '1px solid rgba(139, 92, 246, 0.35)',
                              display: agencyLogo ? 'none' : 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#c4b5fd',
                            }}
                          >
                            <Building2 size={20} />
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                            {agency.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                            <span className="user-id-badge" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                              {agency.agency_code || `AGY-${agency.owner_id || agency.id}`}
                            </span>
                            {agency.status === 'active' ? (
                              <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>Active</span>
                            ) : (
                              <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>Inactive</span>
                            )}
                          </div>
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
                      <button
                        type="button"
                        className="badge badge-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingAgency(agency);
                        }}
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                        title="Open agency host roster page"
                      >
                        <Users size={14} style={{ marginRight: '5px' }} />
                        {agency.host_count || 0} Hosts
                      </button>
                    </td>

                    {/* 5. Total Coins (Host coins summation) */}
                    <td>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          color: '#d97706',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Coins size={14} color="#f59e0b" />
                        <span>{(agency.total_coins ?? ((agency.owner_coins || 0) + (agency.total_host_coins || 0))).toLocaleString()} 🪙</span>
                      </span>
                    </td>

                    {/* 6. Delete Agency Button */}
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
              
              {/* STEP 1: Explicit User ID Search */}
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
                        Agency ID: #{selectedOwner.id}
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

              {/* STEP 2: Agency Name */}
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
                  </div>
                )}
              </div>

              {/* STEP 3: Agency Profile / Logo Image URL */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  3. Agency Logo / Profile Image URL (Optional):
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://example.com/logo.png"
                  value={newAgency.logo_url}
                  onChange={(e) => setNewAgency({ ...newAgency, logo_url: e.target.value })}
                />
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
              <div>⚠️ <strong>Consequences of Deleting this Agency:</strong></div>
              <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                <li>All <strong>{deleteConfirmAgency.host_count || 0}</strong> hosts will become normal users (their coins stay safely in their balance).</li>
                <li>Agency commission will be credited directly to Agency Owner's (ID: #{deleteConfirmAgency.owner_id}) coin balance.</li>
                <li>Agency Owner (ID: #{deleteConfirmAgency.owner_id}) will also become a normal user.</li>
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
