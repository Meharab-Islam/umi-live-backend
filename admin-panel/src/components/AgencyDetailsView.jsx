import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Users,
  Coins,
  Gem,
  Percent,
  Radio,
  Phone,
  User,
  UserPlus,
  Trash2,
  Edit,
  CheckCircle,
  Eye,
  Video,
  Mic,
  RotateCw,
  Save,
  Sparkles,
  Search,
  X,
  FileText,
  ShieldCheck,
  Award,
  Crown,
} from 'lucide-react';
import agencyApi from '../api/agencyApi';
import userApi from '../api/userApi';
import Loader from './Loader';
import Pagination from './Pagination';
import { useEconomy } from '../context/EconomyContext';

export default function AgencyDetailsView({
  agency: initialAgency,
  onBack,
  onViewUser,
  onDeleteAgency,
  onToast,
}) {
  const { isDiamondMode } = useEconomy();
  const [agencyData, setAgencyData] = useState(initialAgency);
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination for hosts roster
  const [hostPage, setHostPage] = useState(1);
  const [hostPageSize, setHostPageSize] = useState(10);
  const [hostFilterSearch, setHostFilterSearch] = useState('');

  // Host Recruitment state
  const [hostSearchInput, setHostSearchInput] = useState('');
  const [searchingHost, setSearchingHost] = useState(false);
  const [hostSearchError, setHostSearchError] = useState('');
  const [foundHostUser, setFoundHostUser] = useState(null);
  const [selectedHostType, setSelectedHostType] = useState('video');
  const [recruitingHost, setRecruitingHost] = useState(false);

  // Agency Edit state
  const [isEditingAgency, setIsEditingAgency] = useState(false);
  const [savingAgency, setSavingAgency] = useState(false);
  const [editForm, setEditForm] = useState({
    name: initialAgency?.name || '',
    logo_url: initialAgency?.logo_url || initialAgency?.avatar_url || '',
    commissionRate: initialAgency?.commission_rate || 10,
    contactPhone: initialAgency?.contact_phone || '',
    notes: initialAgency?.notes || '',
    status: initialAgency?.status || 'active',
  });

  const fetchDetails = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await agencyApi.getAgencyHosts(agencyData.id);
      if (res.success) {
        setHosts(res.hosts || []);
        if (res.agency) {
          setAgencyData((prev) => ({
            ...prev,
            ...res.agency,
            owner_coins: res.agency.owner_coins ?? res.owner_coins ?? prev.owner_coins,
            total_host_coins: res.agency.total_host_coins ?? res.hosts_coins ?? prev.total_host_coins,
            total_commission_coins: res.agency.total_commission_coins ?? res.total_commission_coins ?? prev.total_commission_coins,
            total_coins: res.agency.total_coins ?? res.total_coins ?? prev.total_coins,
          }));
          setEditForm({
            name: res.agency.name || '',
            logo_url: res.agency.logo_url || res.agency.avatar_url || '',
            commissionRate: res.agency.commission_rate || 10,
            contactPhone: res.agency.contact_phone || '',
            notes: res.agency.notes || '',
            status: res.agency.status || 'active',
          });
        }
      }
    } catch (err) {
      onToast(err.message || 'Failed to fetch agency details.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [agencyData.id]);

  // Handle Search Host for Recruitment
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
        if (candidate.agency_id === agencyData.id) {
          setHostSearchError(`User #${candidate.id} (${candidate.full_name || 'User'}) is already assigned to this agency.`);
        } else {
          setFoundHostUser(candidate);
          setSelectedHostType(candidate.host_type === 'audio' ? 'audio' : 'video');
        }
      } else {
        setHostSearchError(`Candidate with User ID #${cleanId} not found.`);
      }
    } catch (err) {
      setHostSearchError(err.message || 'Error searching user.');
    } finally {
      setSearchingHost(false);
    }
  };

  // Recruit Host
  const handleRecruitHost = async () => {
    if (!foundHostUser) return;
    try {
      setRecruitingHost(true);
      const res = await agencyApi.assignUserToAgency(
        agencyData.id,
        foundHostUser.id,
        selectedHostType
      );
      if (res.success) {
        onToast(res.message || 'Host successfully recruited!', 'success');
        setFoundHostUser(null);
        setHostSearchInput('');
        setHostSearchError('');
        fetchDetails(true);
      }
    } catch (err) {
      onToast(err.message || 'Failed to recruit host.', 'error');
    } finally {
      setRecruitingHost(false);
    }
  };

  // Toggle Host Type (Video <-> Audio)
  const handleToggleHostType = async (userId, currentType) => {
    const newType = currentType === 'audio' ? 'video' : 'audio';
    try {
      const res = await userApi.updateUser(userId, { host_type: newType });
      if (res.success) {
        onToast(`Host #${userId} type switched to ${newType === 'audio' ? '🎙️ Audio Host' : '📹 Video Host'}!`, 'success');
        setHosts((prev) =>
          prev.map((h) => (h.id === userId ? { ...h, host_type: newType } : h))
        );
      }
    } catch (err) {
      onToast(err.message || 'Failed to change host type.', 'error');
    }
  };

  // Remove Host from Agency
  const handleRemoveHost = async (userId, hostName) => {
    if (!window.confirm(`Are you sure you want to remove ${hostName || `Host #${userId}`} from this agency?`)) {
      return;
    }
    try {
      const res = await agencyApi.removeUserFromAgency(agencyData.id, userId);
      if (res.success) {
        onToast('Host removed from agency successfully.', 'success');
        fetchDetails(true);
      }
    } catch (err) {
      onToast(err.message || 'Failed to remove host.', 'error');
    }
  };

  // Save Agency Profile Changes
  const handleSaveAgencyProfile = async (e) => {
    if (e) e.preventDefault();
    if (!editForm.name.trim()) {
      onToast('Agency name cannot be empty.', 'error');
      return;
    }
    try {
      setSavingAgency(true);
      const payload = {
        name: editForm.name.trim(),
        logo_url: editForm.logo_url.trim() || null,
        avatar_url: editForm.logo_url.trim() || null,
        commissionRate: editForm.commissionRate,
        contactPhone: editForm.contactPhone.trim(),
        notes: editForm.notes.trim(),
        status: editForm.status,
      };
      const res = await agencyApi.updateAgency(agencyData.id, payload);
      if (res.success) {
        onToast('Agency details updated successfully!', 'success');
        setIsEditingAgency(false);
        setAgencyData((prev) => ({
          ...prev,
          name: payload.name,
          logo_url: payload.logo_url,
          avatar_url: payload.avatar_url,
          commission_rate: payload.commissionRate,
          contact_phone: payload.contactPhone,
          notes: payload.notes,
          status: payload.status,
        }));
      }
    } catch (err) {
      onToast(err.message || 'Failed to update agency profile.', 'error');
    } finally {
      setSavingAgency(false);
    }
  };

  // Filtered Hosts
  const filteredHosts = hosts.filter((h) => {
    if (!hostFilterSearch.trim()) return true;
    const q = hostFilterSearch.toLowerCase().trim();
    const idMatch = String(h.id).includes(q);
    const nameMatch = (h.full_name || '').toLowerCase().includes(q);
    const emailMatch = (h.email || '').toLowerCase().includes(q);
    return idMatch || nameMatch || emailMatch;
  });

  const paginatedHosts = filteredHosts.slice((hostPage - 1) * hostPageSize, hostPage * hostPageSize);
  const totalHostPages = Math.ceil(filteredHosts.length / hostPageSize) || 1;

  // Key Metrics
  const totalHostCoins = agencyData.total_coins ?? agencyData.total_host_coins ?? hosts.reduce((sum, h) => sum + (parseInt(h.coins, 10) || 0), 0);
  const totalCommissionCoins = agencyData.total_commission_coins || 0;
  const ownerCoins = agencyData.owner_coins || 0;
  const totalHostsCount = hosts.length;
  const agencyLogo = agencyData.logo_url || agencyData.avatar_url;

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* 1. Dedicated Top Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.6rem 1.15rem',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            <ArrowLeft size={17} />
            <span>Back to Agencies</span>
          </button>

          <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>/</span>
          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
            {agencyData.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchDetails(true)}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Refresh agency telemetry"
          >
            <RotateCw size={14} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsEditingAgency(!isEditingAgency)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit size={14} />
            <span>{isEditingAgency ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>

          {onDeleteAgency && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => onDeleteAgency(agencyData)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={14} />
              <span>Delete Agency</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Agency Profile Showcase Banner */}
      <div
        className="panel-card"
        style={{
          padding: '1.5rem',
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(236, 72, 153, 0.04) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: '16px',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}>
          {/* Agency Brand Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
              {agencyLogo ? (
                <img
                  src={agencyLogo}
                  alt={agencyData.name}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = 'flex';
                    }
                  }}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    objectFit: 'cover',
                    border: '2px solid rgba(139, 92, 246, 0.4)',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                  }}
                />
              ) : null}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                  display: agencyLogo ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                }}
              >
                <Building2 size={32} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {agencyData.name}
                </h2>
                <span className="user-id-badge" style={{ fontSize: '0.78rem', padding: '3px 8px' }}>
                  Agency ID: #{agencyData.owner_id || agencyData.id}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#c4b5fd',
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 700,
                }}>
                  {agencyData.agency_code || `AGY-${agencyData.id}`}
                </span>
                {agencyData.status === 'active' ? (
                  <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>Active</span>
                ) : (
                  <span className="badge badge-danger" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>Inactive</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', color: 'var(--text-dim)', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Percent size={14} color="#10b981" />
                  <span>Commission: <strong style={{ color: '#10b981' }}>{agencyData.commission_rate || 10}%</strong></span>
                </span>
                {agencyData.contact_phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={14} color="#06b6d4" />
                    <span>Contact: <strong style={{ color: 'var(--text-main)' }}>{agencyData.contact_phone}</strong></span>
                  </span>
                )}
                {agencyData.notes && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <FileText size={14} color="#94a3b8" />
                    <span>{agencyData.notes}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Agency Owner Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0.85rem 1.15rem',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <img
              src={agencyData.owner_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${agencyData.owner_id}`}
              alt={String(agencyData.owner_id)}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #8b5cf6',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
              }}
            />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#c4b5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Agency Owner
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{agencyData.owner_name || `Host #${agencyData.owner_id}`}</span>
                <span className="user-id-badge" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                  ID: #{agencyData.owner_id}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onViewUser && onViewUser(agencyData.owner_id)}
                style={{
                  marginTop: '4px',
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Eye size={12} />
                <span>View Owner Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 4-Metric Grid (Hosts Coins, Total Commission, Owner Coins, Total Hosts) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.1rem',
        marginBottom: '1.25rem',
      }}>
        {/* Metric 1: Total Host Coins (Pure Agency Coins per user instruction) */}
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-top">
            <span className="stat-label">Total Host Coins</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <Coins size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            🪙 {Number(totalHostCoins).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Combined balance of all hosts under this agency
          </div>
        </div>

        {/* Metric 2: Total Commission */}
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-top">
            <span className="stat-label">Total Commission</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Percent size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#059669' }}>
            🪙 {Number(totalCommissionCoins).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Cumulative commission earned ({agencyData.commission_rate || 10}% cut from gifts)
          </div>
        </div>

        {/* Metric 3: Owner Coin Balance */}
        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="stat-top">
            <span className="stat-label">Owner Coin Balance</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <Crown size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#7c3aed' }}>
            🪙 {Number(ownerCoins).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Agency owner's individual coin wallet
          </div>
        </div>

        {/* Metric 4: Total Hosts */}
        <div className="stat-card" style={{ borderLeft: '4px solid #ec4899' }}>
          <div className="stat-top">
            <span className="stat-label">Total Recruited Hosts</span>
            <div className="stat-icon-wrap" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#db2777' }}>
            {totalHostsCount} Hosts
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Active broadcasters and streamers
          </div>
        </div>

        {/* Optional Metric 5: Diamonds */}
        {isDiamondMode && (
          <div className="stat-card" style={{ borderLeft: '4px solid #06b6d4' }}>
            <div className="stat-top">
              <span className="stat-label">Host Diamonds</span>
              <div className="stat-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                <Gem size={20} />
              </div>
            </div>
            <div className="stat-value" style={{ color: '#0284c7' }}>
              💎 {Number(agencyData.total_host_diamonds || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Total diamonds accumulated
            </div>
          </div>
        )}
      </div>

      {/* 4. Edit Agency Profile Form (Toggleable Accordion) */}
      {isEditingAgency && (
        <div className="panel-card" style={{ padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(139, 92, 246, 0.35)' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit size={16} color="#8b5cf6" />
            <span>Edit Agency Profile & Settings</span>
          </h4>

          <form onSubmit={handleSaveAgencyProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Agency Name:
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Agency Profile Image / Logo URL:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://example.com/logo.png"
                  value={editForm.logo_url}
                  onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Commission Rate (%):
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="input-field"
                  value={editForm.commissionRate}
                  onChange={(e) => setEditForm({ ...editForm, commissionRate: e.target.value })}
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
                  value={editForm.contactPhone}
                  onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Status:
                </label>
                <select
                  className="input-field"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Agreement Notes / Terms:
              </label>
              <textarea
                className="input-field"
                rows="2"
                placeholder="Official notes or agreement terms..."
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditingAgency(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingAgency}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={15} />
                <span>{savingAgency ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Recruit Broadcaster by User ID */}
      <div className="panel-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={17} color="#8b5cf6" />
          <span>Recruit Broadcaster / Host by User ID</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.85rem' }}>
          Enter the exact numeric User ID to search and recruit a broadcaster under this agency.
        </p>

        <form onSubmit={handleSearchHost} style={{ display: 'flex', gap: '8px', maxWidth: '480px' }}>
          <div className="search-input-wrap" style={{ flex: 1 }}>
            <Search size={16} />
            <input
              type="text"
              className="input-field"
              placeholder="Enter User ID (e.g. 5)..."
              value={hostSearchInput}
              onChange={(e) => {
                setHostSearchInput(e.target.value);
                setHostSearchError('');
              }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={searchingHost}
            style={{ whiteSpace: 'nowrap' }}
          >
            {searchingHost ? 'Searching...' : 'Find User'}
          </button>
        </form>

        {hostSearchError && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.55rem 0.85rem',
            fontSize: '0.8rem',
            color: '#fda4af',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            borderRadius: '8px',
            maxWidth: '520px',
          }}>
            ⚠️ {hostSearchError}
          </div>
        )}

        {/* Found Candidate Preview Card */}
        {foundHostUser && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '650px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={foundHostUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${foundHostUser.id}`}
                  alt={String(foundHostUser.id)}
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{foundHostUser.full_name || `Host #${foundHostUser.id}`}</span>
                    <span className="user-id-badge" style={{ fontSize: '0.7rem' }}>
                      ID: #{foundHostUser.id}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                      Lv.{foundHostUser.level}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#0284c7', fontWeight: 600 }}>Role: {foundHostUser.role}</span>
                    <span style={{ color: '#be185d', fontWeight: 600 }}>👑 {foundHostUser.vip_package || 'Standard'}</span>
                    <span style={{ color: '#b45309', fontWeight: 600 }}>🪙 {Number(foundHostUser.coins || 0).toLocaleString()} coins</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleRecruitHost}
                disabled={recruitingHost}
                style={{ padding: '7px 16px', fontWeight: 600 }}
              >
                <UserPlus size={15} />
                <span>{recruitingHost ? 'Recruiting...' : 'Confirm Recruitment'}</span>
              </button>
            </div>

            {/* Host Type Selector */}
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

      {/* 6. Agency Broadcaster Roster (Table View) */}
      <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#8b5cf6" />
              <span>Affiliated Broadcasters Roster ({hosts.length} Hosts)</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              All audio and video broadcasters managed by {agencyData.name}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="search-input-wrap" style={{ width: '220px' }}>
              <Search size={14} />
              <input
                type="text"
                className="input-field"
                placeholder="Filter by name / ID..."
                value={hostFilterSearch}
                onChange={(e) => {
                  setHostFilterSearch(e.target.value);
                  setHostPage(1);
                }}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem 0.4rem 2rem' }}
              />
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th className="user-id-cell" style={{ width: '110px' }}>Host ID</th>
                <th>Broadcaster</th>
                <th>Host Type</th>
                <th>Level & VIP</th>
                <th>Coins Earned</th>
                {isDiamondMode && <th>Diamonds</th>}
                <th style={{ textAlign: 'right', minWidth: '180px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isDiamondMode ? 7 : 6} style={{ padding: '3rem 1rem' }}>
                    <Loader text="Loading agency broadcaster roster..." />
                  </td>
                </tr>
              ) : paginatedHosts.length === 0 ? (
                <tr>
                  <td colSpan={isDiamondMode ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    {hostFilterSearch
                      ? `No broadcasters match "${hostFilterSearch}".`
                      : 'No broadcasters affiliated with this agency yet. Use the recruitment box above to assign hosts!'}
                  </td>
                </tr>
              ) : (
                paginatedHosts.map((host) => (
                  <tr key={host.id}>
                    {/* Host ID */}
                    <td className="user-id-cell">
                      <span className="user-id-badge">
                        ID: #{host.id}
                      </span>
                    </td>

                    {/* Host Avatar & Name */}
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                        onClick={() => onViewUser && onViewUser(host.id)}
                        title="Click to view full user profile"
                      >
                        <img
                          src={host.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${host.id}`}
                          alt={String(host.id)}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid rgba(139, 92, 246, 0.3)',
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                            {host.full_name || `Host #${host.id}`}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {host.email || 'No email registered'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Host Type */}
                    <td>
                      {host.host_type === 'audio' ? (
                        <span style={{
                          fontSize: '0.72rem',
                          color: '#0284c7',
                          background: 'rgba(2, 132, 199, 0.12)',
                          border: '1px solid rgba(2, 132, 199, 0.3)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Mic size={12} /> Audio Host
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.72rem',
                          color: '#ec4899',
                          background: 'rgba(236, 72, 153, 0.12)',
                          border: '1px solid rgba(236, 72, 153, 0.3)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Video size={12} /> Video Host
                        </span>
                      )}
                    </td>

                    {/* Level & VIP */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          Lv.{host.level || 1}
                        </span>
                        {host.vip_package && (
                          <span style={{ fontSize: '0.72rem', color: '#be185d', fontWeight: 600 }}>
                            👑 {host.vip_package}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Coins */}
                    <td>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          color: '#d97706',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Coins size={13} color="#f59e0b" />
                        <span>{Number(host.coins || 0).toLocaleString()}</span>
                      </span>
                    </td>

                    {/* Diamonds */}
                    {isDiamondMode && (
                      <td>
                        <span style={{ color: '#0284c7', fontWeight: 700, fontSize: '0.85rem' }}>
                          💎 {Number(host.diamonds || 0).toLocaleString()}
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleHostType(host.id, host.host_type)}
                          title={`Switch to ${host.host_type === 'audio' ? 'Video Host' : 'Audio Host'}`}
                          style={{ fontSize: '0.72rem', padding: '3px 8px', gap: '4px' }}
                        >
                          {host.host_type === 'audio' ? <Video size={12} /> : <Mic size={12} />}
                          <span>To {host.host_type === 'audio' ? 'Video' : 'Audio'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onViewUser && onViewUser(host.id)}
                          title="View complete user telemetry & profile"
                          style={{ fontSize: '0.72rem', padding: '3px 8px', gap: '4px' }}
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRemoveHost(host.id, host.full_name)}
                          title="Remove host from this agency"
                          style={{
                            color: '#fda4af',
                            borderColor: 'rgba(244, 63, 94, 0.3)',
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            gap: '4px',
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Hosts Pagination */}
        <Pagination
          currentPage={hostPage}
          totalPages={totalHostPages}
          totalItems={filteredHosts.length}
          pageSize={hostPageSize}
          onPageChange={setHostPage}
          onPageSizeChange={(sz) => {
            setHostPageSize(sz);
            setHostPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
}

