import React, { useState, useEffect } from 'react';
import {
  Users,
  Video,
  Mic,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Calculator,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Sliders,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Filter,
  Check,
  X,
  CreditCard,
  UserCheck,
  LayoutGrid,
  List,
  Crown,
  Award,
  Radio,
  ExternalLink,
  Edit,
} from 'lucide-react';
import hostApi from '../api/hostApi';
import agencyApi from '../api/agencyApi';
import withdrawalApi from '../api/withdrawalApi';
import userApi from '../api/userApi';
import adminApi from '../api/adminApi';
import settingsApi from '../api/settingsApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import UserDetailsModal from '../components/UserDetailsModal';
import BulkActionBar from '../components/BulkActionBar';

export default function HostManagement({ onToast }) {
  const [activeTab, setActiveTab] = useState('hosts'); // 'hosts' | 'requests' | 'ratios'
  const [loading, setLoading] = useState(true);

  // Hosts list state
  const [hosts, setHosts] = useState([]);
  const [hostSummary, setHostSummary] = useState(null);
  const [hostSearch, setHostSearch] = useState('');
  const [hostTypeFilter, setHostTypeFilter] = useState('all');
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [agenciesList, setAgenciesList] = useState([]);
  const [hostPage, setHostPage] = useState(1);
  const [hostPageSize, setHostPageSize] = useState(10);
  const [hostTotal, setHostTotal] = useState(0);

  // Bulk Selection for Hosts
  const [selectedHostIds, setSelectedHostIds] = useState([]);
  const [bulkDeletingHosts, setBulkDeletingHosts] = useState(false);

  // Bulk Selection for Requests
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [bulkDeletingRequests, setBulkDeletingRequests] = useState(false);

  const handleToggleSelectAllHosts = () => {
    if (selectedHostIds.length === hosts.length && hosts.length > 0) {
      setSelectedHostIds([]);
    } else {
      setSelectedHostIds(hosts.map((h) => h.id));
    }
  };

  const handleToggleSelectHost = (id) => {
    setSelectedHostIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteHosts = async () => {
    if (selectedHostIds.length === 0) return;
    try {
      setBulkDeletingHosts(true);
      const res = await adminApi.bulkDelete('hosts', selectedHostIds);
      if (res.success) {
        onToast(`Successfully demoted ${res.count || selectedHostIds.length} hosts to regular users.`, 'success');
        setSelectedHostIds([]);
        loadHosts();
      }
    } catch (err) {
      onToast(err.message || 'Failed to bulk demote hosts.', 'error');
    } finally {
      setBulkDeletingHosts(false);
    }
  };

  const handleToggleSelectAllRequests = () => {
    if (selectedRequestIds.length === requests.length && requests.length > 0) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(requests.map((r) => r.id));
    }
  };

  const handleToggleSelectRequest = (id) => {
    setSelectedRequestIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteRequests = async () => {
    if (selectedRequestIds.length === 0) return;
    try {
      setBulkDeletingRequests(true);
      const res = await adminApi.bulkDelete('host_requests', selectedRequestIds);
      if (res.success) {
        onToast(`Successfully deleted ${res.count || selectedRequestIds.length} host requests.`, 'success');
        setSelectedRequestIds([]);
        loadRequests();
      }
    } catch (err) {
      onToast(err.message || 'Failed to bulk delete host requests.', 'error');
    } finally {
      setBulkDeletingRequests(false);
    }
  };

  // Host Requests state
  const [requests, setRequests] = useState([]);
  const [requestSummary, setRequestSummary] = useState(null);
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requestPage, setRequestPage] = useState(1);
  const [requestTotal, setRequestTotal] = useState(0);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  // New Host Request Modal
  const [createRequestModal, setCreateRequestModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [searchedUser, setSearchedUser] = useState(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [newRequestAgencyId, setNewRequestAgencyId] = useState('');
  const [newRequestHostType, setNewRequestHostType] = useState('video');
  const [newRequestNotes, setNewRequestNotes] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Change Agency Modal
  const [agencyModalHost, setAgencyModalHost] = useState(null);
  const [selectedAgencyForHost, setSelectedAgencyForHost] = useState('');
  const [savingAgencyChange, setSavingAgencyChange] = useState(false);

  // Ratios & Withdrawals state
  const [ratios, setRatios] = useState(null);
  const [savingRatios, setSavingRatios] = useState(false);
  const [ratioForm, setRatioForm] = useState({
    videoBase: 100000,
    videoTaka: 5000,
    audioBase: 100000,
    audioTaka: 3500,
  });

  // Interactive Live Calculator
  const [calcDiamonds, setCalcDiamonds] = useState(50000);
  const [calcHostType, setCalcHostType] = useState('video');

  // Withdrawals table in ratios tab
  const [withdrawals, setWithdrawals] = useState([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [processingWithdrawalId, setProcessingWithdrawalId] = useState(null);

  // User details modal
  const [detailsUserId, setDetailsUserId] = useState(null);

  // Dual Economy Mode State
  const [isDiamondMode, setIsDiamondMode] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await settingsApi.getSettings();
      if (res.success && res.settings) {
        const modeSetting = res.settings.find((s) => s.key_name === 'is_convert_to_diamond');
        if (modeSetting) {
          setIsDiamondMode(modeSetting.key_value !== 'false');
        }
      }
    } catch (err) {
      console.warn('Failed to load settings in HostManagement:', err.message);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchAgencies();
    fetchRatios();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'hosts') {
      fetchHosts();
    } else if (activeTab === 'requests') {
      fetchRequests();
    } else if (activeTab === 'ratios') {
      fetchWithdrawals();
    }
  }, [activeTab, hostPage, hostPageSize, hostTypeFilter, agencyFilter, requestPage, requestStatusFilter]);

  const fetchAgencies = async () => {
    try {
      const res = await agencyApi.getAgencies();
      if (res.success) {
        setAgenciesList(res.agencies || []);
      }
    } catch (err) {
      console.warn('Failed to fetch agencies list:', err.message);
    }
  };

  const fetchHosts = async () => {
    try {
      setLoading(true);
      const params = {
        page: hostPage,
        limit: hostPageSize,
        hostType: hostTypeFilter,
        agencyId: agencyFilter,
      };
      if (hostSearch.trim()) params.search = hostSearch.trim();

      const res = await hostApi.getHosts(params);
      if (res.success) {
        setHosts(res.hosts);
        setHostSummary(res.summary);
        setHostTotal(res.pagination.total);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {
        page: requestPage,
        limit: 12,
        status: requestStatusFilter,
      };
      const res = await hostApi.getHostRequests(params);
      if (res.success) {
        setRequests(res.requests);
        setRequestSummary(res.summary);
        setRequestTotal(res.pagination.total);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRatios = async () => {
    try {
      const res = await hostApi.getHostRatios();
      if (res.success && res.ratios) {
        setRatios(res.ratios);
        setRatioForm({
          videoBase: res.ratios.video.diamondBase || 100000,
          videoTaka: res.ratios.video.takaAmount || 5000,
          audioBase: res.ratios.audio.diamondBase || 100000,
          audioTaka: res.ratios.audio.takaAmount || 3500,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch ratios:', err.message);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      setLoadingWithdrawals(true);
      const res = await withdrawalApi.getWithdrawals({ limit: 15 });
      if (res.success) {
        setWithdrawals(res.withdrawals || []);
      }
    } catch (err) {
      console.warn('Failed to fetch withdrawals:', err.message);
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  const handleSearchUser = async () => {
    if (!targetUserId.trim()) return;
    try {
      setSearchingUser(true);
      setSearchedUser(null);
      const clean = targetUserId.trim().replace(/^#/, '');
      const res = await userApi.getUsers({ search: clean, limit: 1 });
      if (res.success && res.users && res.users.length > 0) {
        setSearchedUser(res.users[0]);
      } else {
        onToast(`No user found with identifier "${clean}".`, 'error');
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSearchingUser(false);
    }
  };

  const handleToggleHostType = async (hostId, currentType) => {
    const newType = currentType === 'audio' ? 'video' : 'audio';
    try {
      const res = await hostApi.updateHost(hostId, { host_type: newType });
      if (res.success) {
        onToast(`Host #${hostId} classification changed to ${newType.toUpperCase()} Host!`, 'success');
        fetchHosts();
      }
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  const handleOpenAgencyModal = (host) => {
    setAgencyModalHost(host);
    setSelectedAgencyForHost(host.agency_id ? String(host.agency_id) : '');
  };

  const handleSaveAgencyAssignment = async (e) => {
    e.preventDefault();
    if (!agencyModalHost) return;
    try {
      setSavingAgencyChange(true);
      const res = await hostApi.updateHost(agencyModalHost.id, {
        agency_id: selectedAgencyForHost ? parseInt(selectedAgencyForHost, 10) : null,
      });
      if (res.success) {
        onToast(`Agency assignment updated for Host #${agencyModalHost.id}!`, 'success');
        setAgencyModalHost(null);
        fetchHosts();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSavingAgencyChange(false);
    }
  };

  const handleProcessRequest = async (requestId, status) => {
    try {
      setProcessingRequestId(requestId);
      const res = await hostApi.processHostRequest(requestId, status, `Reviewed and ${status} by admin.`);
      if (res.success) {
        onToast(res.message, 'success');
        fetchRequests();
        if (hostSummary) fetchHosts();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!searchedUser) {
      onToast('Please search and select a valid user first.', 'error');
      return;
    }
    try {
      setSubmittingRequest(true);
      const res = await hostApi.createHostRequest({
        userId: searchedUser.id,
        agencyId: newRequestAgencyId || null,
        hostType: newRequestHostType,
        notes: newRequestNotes,
      });
      if (res.success) {
        onToast(res.message, 'success');
        setCreateRequestModal(false);
        setSearchedUser(null);
        setTargetUserId('');
        setNewRequestNotes('');
        fetchRequests();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleSaveRatios = async (e) => {
    e.preventDefault();
    try {
      setSavingRatios(true);
      const res = await hostApi.updateHostRatios({
        videoBase: parseFloat(ratioForm.videoBase) || 100000,
        videoTaka: parseFloat(ratioForm.videoTaka) || 5000,
        audioBase: parseFloat(ratioForm.audioBase) || 100000,
        audioTaka: parseFloat(ratioForm.audioTaka) || 3500,
      });
      if (res.success) {
        onToast(res.message, 'success');
        fetchRatios();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSavingRatios(false);
    }
  };

  const handleProcessWithdrawal = async (id, status) => {
    try {
      setProcessingWithdrawalId(id);
      const res = await withdrawalApi.processWithdrawal(id, status, `Admin ${status} from Host Management`);
      if (res.success) {
        onToast(res.message, 'success');
        fetchWithdrawals();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setProcessingWithdrawalId(null);
    }
  };

  const calculateConvertedTaka = (diamonds, type) => {
    const base = type === 'audio' ? (ratioForm.audioBase || 100000) : (ratioForm.videoBase || 100000);
    const taka = type === 'audio' ? (ratioForm.audioTaka || 3500) : (ratioForm.videoTaka || 5000);
    if (!base || base <= 0) return '0.00';
    const rate = taka / base;
    return ((diamonds || 0) * rate).toFixed(2);
  };

  return (
    <div className="page-container" style={{ paddingBottom: '3rem' }}>
      {/* Vibrant Stat Metric Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        {/* Card 1: Total Active Hosts */}
        <div className="panel-card" style={{
          padding: '1.35rem',
          borderRadius: '14px',
          borderLeft: '4px solid #7c3aed',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Active Hosts
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {hostSummary?.total_hosts?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: isDiamondMode ? '#06b6d4' : '#f59e0b', marginTop: '6px', fontWeight: 600 }}>
            {isDiamondMode
              ? `💎 ${hostSummary?.total_host_diamonds?.toLocaleString() || 0} Total Diamonds`
              : '🪙 Direct Coin Revenue Active (No Diamonds)'}
          </div>
        </div>

        {/* Card 2: Video Hosts */}
        <div className="panel-card" style={{
          padding: '1.35rem',
          borderRadius: '14px',
          borderLeft: '4px solid #0284c7',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Video Live Hosts
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
              <Video size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0284c7' }}>
            {hostSummary?.video_hosts?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '6px' }}>
            Live Camera Streaming Talents
          </div>
        </div>

        {/* Card 3: Audio Hosts */}
        <div className="panel-card" style={{
          padding: '1.35rem',
          borderRadius: '14px',
          borderLeft: '4px solid #10b981',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Audio Voice Hosts
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Mic size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981' }}>
            {hostSummary?.audio_hosts?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '6px' }}>
            Voice Rooms & Audio Podcasters
          </div>
        </div>

        {/* Card 4: Agency Affiliated */}
        <div className="panel-card" style={{
          padding: '1.35rem',
          borderRadius: '14px',
          borderLeft: '4px solid #f59e0b',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Agency Talents
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f59e0b' }}>
            {hostSummary?.agency_hosts?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '6px' }}>
            {hostSummary?.independent_hosts || 0} Independent Broadcasters
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Segmented Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-primary)',
        padding: '6px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className={`btn ${activeTab === 'hosts' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('hosts')}
            style={{ borderRadius: '8px', padding: '0.55rem 1.15rem', fontSize: '0.88rem' }}
          >
            <Users size={16} />
            <span>All Hosts List</span>
            {hostSummary && (
              <span style={{
                marginLeft: 6,
                padding: '2px 7px',
                borderRadius: '10px',
                background: activeTab === 'hosts' ? 'rgba(255,255,255,0.2)' : 'rgba(124, 58, 237, 0.15)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}>
                {hostSummary.total_hosts}
              </span>
            )}
          </button>

          <button
            className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('requests')}
            style={{ borderRadius: '8px', padding: '0.55rem 1.15rem', fontSize: '0.88rem' }}
          >
            <Clock size={16} />
            <span>Host Applications & Requests</span>
            {requestSummary && requestSummary.pending_requests > 0 && (
              <span style={{
                marginLeft: 6,
                padding: '2px 7px',
                borderRadius: '10px',
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
              }}>
                {requestSummary.pending_requests}
              </span>
            )}
          </button>

          <button
            className={`btn ${activeTab === 'ratios' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('ratios')}
            style={{ borderRadius: '8px', padding: '0.55rem 1.15rem', fontSize: '0.88rem' }}
          >
            <Calculator size={16} />
            <span>Withdrawal Ratios & Payout Desk</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (activeTab === 'hosts') fetchHosts();
              else if (activeTab === 'requests') fetchRequests();
              else { fetchRatios(); fetchWithdrawals(); }
            }}
            style={{ borderRadius: '8px', padding: '0.45rem 0.85rem' }}
            title="Refresh current tab data"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setCreateRequestModal(true)}
            style={{
              borderRadius: '8px',
              padding: '0.45rem 1.1rem',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
              gap: '6px',
            }}
          >
            <Plus size={15} />
            <span>Apply / Add New Host</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ALL HOSTS LIST */}
      {/* ======================================================== */}
      {activeTab === 'hosts' && (
        <div>
          {/* Enhanced Search & Filters Toolbar */}
          <div className="panel-card" style={{
            padding: '1.15rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            borderRadius: '14px',
          }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search hosts by User ID (#101), Name, or Email..."
                style={{ paddingLeft: '2.5rem', borderRadius: '10px' }}
                value={hostSearch}
                onChange={(e) => setHostSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchHosts()}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Host Type Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dim)' }}>Type:</span>
                <select
                  className="input-field"
                  style={{ width: 'auto', padding: '0.45rem 0.85rem', borderRadius: '10px' }}
                  value={hostTypeFilter}
                  onChange={(e) => { setHostTypeFilter(e.target.value); setHostPage(1); }}
                >
                  <option value="all">All Host Types</option>
                  <option value="video">🎥 Video Host</option>
                  <option value="audio">🎙️ Audio Host</option>
                </select>
              </div>

              {/* Agency Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dim)' }}>Agency:</span>
                <select
                  className="input-field"
                  style={{ width: 'auto', padding: '0.45rem 0.85rem', borderRadius: '10px' }}
                  value={agencyFilter}
                  onChange={(e) => { setAgencyFilter(e.target.value); setHostPage(1); }}
                >
                  <option value="all">All Agencies</option>
                  <option value="none">Independent (No Agency)</option>
                  {agenciesList.map((a) => (
                    <option key={a.id} value={a.id}>
                      #{a.id} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn btn-primary btn-sm" onClick={fetchHosts} style={{ borderRadius: '10px' }}>
                Apply Filters
              </button>
            </div>
          </div>

          {/* Hosts Content */}
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <Loader />
            </div>
          ) : hosts.length === 0 ? (
            <div className="panel-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)', borderRadius: '16px' }}>
              <Users size={48} style={{ opacity: 0.35, marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>No Hosts Found</div>
              <p style={{ fontSize: '0.88rem', marginTop: '6px' }}>Try clearing your filters or search keywords.</p>
            </div>
          ) : (
            /* ============================================ */
            /* DEDICATED TABLE / LIST VIEW                  */
            /* ============================================ */
            <div className="panel-card" style={{ padding: '0', borderRadius: '16px', overflow: 'hidden' }}>
              <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                <table className="data-table" style={{ margin: 0, minWidth: '1050px', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '45px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={hosts.length > 0 && selectedHostIds.length === hosts.length}
                          onChange={handleToggleSelectAllHosts}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                          title="Select all on this page"
                        />
                      </th>
                      <th>Host Profile</th>
                      <th>Host ID</th>
                      <th>Host Classification</th>
                      <th>Agency Membership</th>
                      <th>{isDiamondMode ? 'Diamond Balance (💎)' : 'Diamond Balance (💎 Inactive)'}</th>
                      <th>{isDiamondMode ? 'Coin Balance (🪙)' : 'Coin Balance (🪙 Active Income)'}</th>
                      <th>Broadcasting Activity</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hosts.map((h) => {
                      const isVideo = h.host_type === 'video';
                      return (
                        <tr key={h.id}>
                          {/* Selection Checkbox */}
                          <td style={{ textAlign: 'center', width: '45px', padding: '0.75rem 0.5rem' }}>
                            <input
                              type="checkbox"
                              checked={selectedHostIds.includes(h.id)}
                              onChange={() => handleToggleSelectHost(h.id)}
                              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                              title={`Select host #${h.id}`}
                            />
                          </td>
                          {/* Profile */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ position: 'relative' }}>
                                <img
                                  src={h.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${h.id}`}
                                  alt={h.full_name}
                                  style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: isVideo ? '2px solid #0284c7' : '2px solid #10b981',
                                  }}
                                />
                                <span style={{
                                  position: 'absolute',
                                  bottom: -2,
                                  right: -2,
                                  padding: '1px 4px',
                                  borderRadius: '6px',
                                  background: '#1e293b',
                                  color: '#f8fafc',
                                  fontSize: '0.6rem',
                                  fontWeight: 800,
                                }}>
                                  Lv.{h.level || 1}
                                </span>
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{h.full_name || 'Host Broadcaster'}</span>
                                  {h.vip_package && h.vip_package !== 'Standard' && (
                                    <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700 }}>
                                      ★ {h.vip_package}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>{h.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* ID */}
                          <td>
                            <span className="badge badge-secondary" style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                              #{h.id}
                            </span>
                          </td>

                          {/* Classification */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {isVideo ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)',
                                  color: '#0284c7',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  border: '1px solid rgba(2, 132, 199, 0.3)',
                                }}>
                                  <Video size={13} /> Video Host
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
                                  color: '#10b981',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                }}>
                                  <Mic size={13} /> Audio Host
                                </span>
                              )}

                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleToggleHostType(h.id, h.host_type)}
                                style={{ padding: '3px 7px', fontSize: '0.7rem', borderRadius: '6px' }}
                                title={`Switch to ${isVideo ? 'Audio' : 'Video'} Host`}
                              >
                                {isVideo ? <Mic size={12} color="#10b981" /> : <Video size={12} color="#0284c7" />}
                                <span>Switch</span>
                              </button>
                            </div>
                          </td>

                          {/* Agency Association */}
                          <td>
                            {h.agency_id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.85rem' }}>
                                    {h.agency_name}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                    Agency ID: #{h.agency_id} ({h.agency_code})
                                  </div>
                                </div>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '2px 7px', fontSize: '0.68rem', borderRadius: '6px' }}
                                  onClick={() => handleOpenAgencyModal(h)}
                                  title="Change Agency"
                                >
                                  Edit
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                  Independent
                                </span>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '2px 7px', fontSize: '0.68rem', borderRadius: '6px' }}
                                  onClick={() => handleOpenAgencyModal(h)}
                                >
                                  + Assign
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Diamonds */}
                          <td>
                            <div style={{ fontWeight: 800, color: isDiamondMode ? '#06b6d4' : 'var(--text-dim)', fontSize: '0.92rem' }}>
                              💎 {h.diamonds?.toLocaleString() || 0}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                              {isDiamondMode ? 'Diamond balance' : 'Diamonds (Inactive mode)'}
                            </div>
                          </td>

                          {/* Coins */}
                          <td>
                            <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.9rem' }}>
                              🪙 {h.coins?.toLocaleString() || 0}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: isDiamondMode ? 'var(--text-dim)' : '#10b981', fontWeight: isDiamondMode ? 'normal' : 600 }}>
                              {isDiamondMode ? 'Coin balance' : 'Earned Coins (Direct Mode)'}
                            </div>
                          </td>

                          {/* Activity */}
                          <td>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700 }}>
                              📡 {h.stream_count || 0} streams
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              Joined: {new Date(h.created_at).toLocaleDateString()}
                            </div>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => setDetailsUserId(h.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px' }}
                            >
                              <Eye size={13} />
                              <span>Manage</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Pagination Bar */}
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <Pagination
                  currentPage={hostPage}
                  totalPages={Math.ceil(hostTotal / hostPageSize) || 1}
                  totalItems={hostTotal}
                  pageSize={hostPageSize}
                  onPageChange={(p) => setHostPage(p)}
                  onPageSizeChange={(s) => {
                    setHostPageSize(s);
                    setHostPage(1);
                  }}
                />
              </div>
            </div>
          )}

          <BulkActionBar
            selectedCount={selectedHostIds.length}
            totalCount={hosts.length}
            onSelectAll={handleToggleSelectAllHosts}
            onDeselectAll={() => setSelectedHostIds([])}
            onBulkDelete={handleBulkDeleteHosts}
            isDeleting={bulkDeletingHosts}
            entityName="Hosts"
            actionLabel="Demote Selected to Regular Users"
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: HOST APPLICATIONS & REQUESTS                      */}
      {/* ======================================================== */}
      {activeTab === 'requests' && (
        <div>
          {/* Filter Bar */}
          <div className="panel-card" style={{
            padding: '1.15rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            borderRadius: '14px',
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)' }}>Filter by Status:</span>
              {['all', 'pending', 'approved', 'rejected'].map((st) => (
                <button
                  key={st}
                  className={`btn btn-sm ${requestStatusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setRequestStatusFilter(st); setRequestPage(1); }}
                  style={{ textTransform: 'capitalize', borderRadius: '8px' }}
                >
                  {st}
                  {requestSummary && st !== 'all' && (
                    <span style={{ marginLeft: 5, opacity: 0.85, fontWeight: 800 }}>({requestSummary[`${st}_requests`]})</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {requests.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleToggleSelectAllRequests}
                  style={{ borderRadius: '10px' }}
                >
                  {selectedRequestIds.length === requests.length ? 'Deselect All' : `Select All (${requests.length})`}
                </button>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setCreateRequestModal(true)}
                style={{ borderRadius: '10px' }}
              >
                <Plus size={15} />
                <span>Submit New Host Application</span>
              </button>
            </div>
          </div>

          {/* Requests Content */}
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <Loader />
            </div>
          ) : requests.length === 0 ? (
            <div className="panel-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)', borderRadius: '16px' }}>
              <CheckCircle size={48} style={{ opacity: 0.35, marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>No Applications Found</div>
              <p style={{ fontSize: '0.88rem', marginTop: '6px' }}>There are currently no requests with the selected filter.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem',
            }}>
              {requests.map((r) => {
                const isVideo = r.host_type === 'video';
                const isPending = r.status === 'pending';
                return (
                  <div
                    key={r.id}
                    className="panel-card"
                    style={{
                      padding: '1.25rem',
                      borderRadius: '16px',
                      border: isPending ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      {/* Top Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={selectedRequestIds.includes(r.id)}
                            onChange={() => handleToggleSelectRequest(r.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444', marginRight: '2px' }}
                            title={`Select application #${r.id}`}
                          />
                          <img
                            src={r.user_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${r.user_id}`}
                            alt=""
                            style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                              {r.full_name || `User #${r.user_id}`}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              User ID #{r.user_id} • Current: <span style={{ textTransform: 'capitalize' }}>{r.user_role || 'user'}</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                              Submitted: {new Date(r.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`badge ${
                            r.status === 'approved'
                              ? 'badge-success'
                              : r.status === 'rejected'
                              ? 'badge-danger'
                              : 'badge-warning'
                          }`}
                          style={{ textTransform: 'capitalize', padding: '4px 10px', borderRadius: '8px' }}
                        >
                          {r.status}
                        </span>
                      </div>

                      {/* Request Details Box */}
                      <div style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        marginBottom: '1rem',
                        fontSize: '0.82rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Target Host Type:</span>
                          {isVideo ? (
                            <span style={{ color: '#0284c7', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Video size={13} /> 🎥 Video Host
                            </span>
                          ) : (
                            <span style={{ color: '#10b981', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Mic size={13} /> 🎙️ Audio Host
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Agency Association:</span>
                          <span style={{ fontWeight: 700, color: r.agency_id ? '#f59e0b' : 'var(--text-dim)' }}>
                            {r.agency_id ? `${r.agency_name} (#${r.agency_id})` : 'Independent (None)'}
                          </span>
                        </div>
                      </div>

                      {/* Notes Quote Bubble */}
                      <div style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(124, 58, 237, 0.05)',
                        borderLeft: '3px solid #7c3aed',
                        marginBottom: '1rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-main)',
                      }}>
                        "{r.notes || 'No custom application note provided by applicant.'}"
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ flex: 1, background: '#10b981', borderColor: '#10b981', borderRadius: '8px', justifyContent: 'center' }}
                            disabled={processingRequestId === r.id}
                            onClick={() => handleProcessRequest(r.id, 'approved')}
                          >
                            <Check size={14} />
                            <span>Approve as Host</span>
                          </button>

                          <button
                            className="btn btn-sm btn-danger"
                            style={{ flex: 1, borderRadius: '8px', justifyContent: 'center' }}
                            disabled={processingRequestId === r.id}
                            onClick={() => handleProcessRequest(r.id, 'rejected')}
                          >
                            <X size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                          Application status finalized as <strong>{r.status}</strong>.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Pagination
            currentPage={requestPage}
            totalCount={requestTotal}
            pageSize={12}
            onPageChange={(p) => setRequestPage(p)}
          />

          <BulkActionBar
            selectedCount={selectedRequestIds.length}
            totalCount={requests.length}
            onSelectAll={handleToggleSelectAllRequests}
            onDeselectAll={() => setSelectedRequestIds([])}
            onBulkDelete={handleBulkDeleteRequests}
            isDeleting={bulkDeletingRequests}
            entityName="Host Applications"
            actionLabel="Delete Selected Applications"
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: RATIOS & WITHDRAWAL PAYOUT DESK                   */}
      {/* ======================================================== */}
      {activeTab === 'ratios' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(380px, 1.4fr)', gap: '1.75rem', alignItems: 'start' }}>
          {/* Left Column: Ratio Config & Simulator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Form */}
            <form onSubmit={handleSaveRatios} className="panel-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' }}>
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    {isDiamondMode ? 'Host Conversion Ratios (Diamond 💎 to Taka ৳)' : 'Host Conversion Ratios (Coin 🪙 to Taka ৳)'}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                    {isDiamondMode
                      ? 'Configure the base diamond price and equivalent Taka payout for Video vs Audio hosts.'
                      : 'Configure the base coin price and equivalent Taka payout for Video vs Audio hosts (e.g. 100 Coins = 5 Taka).'}
                  </p>
                </div>
              </div>

              {/* Video Host Box */}
              <div style={{
                padding: '1.15rem',
                borderRadius: '12px',
                background: 'var(--bg-primary)',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0284c7', marginBottom: '0.85rem', fontSize: '0.92rem' }}>
                  <Video size={16} />
                  <span>{isDiamondMode ? '🎥 Video Host Conversion Rule' : '🎥 Video Host Coin Cashout Rule'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                      {isDiamondMode ? 'Base Diamonds (💎):' : 'Base Coins (🪙):'}
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      min="1"
                      value={ratioForm.videoBase}
                      onChange={(e) => setRatioForm({ ...ratioForm, videoBase: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Payout Amount (৳ BDT):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      min="0.01"
                      value={ratioForm.videoTaka}
                      onChange={(e) => setRatioForm({ ...ratioForm, videoTaka: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem', padding: '6px 12px', borderRadius: '6px', background: 'rgba(2, 132, 199, 0.1)', fontSize: '0.76rem', color: '#0284c7', fontWeight: 600 }}>
                  ⚡ Auto Calculation: 1 {isDiamondMode ? 'Diamond' : 'Coin'} = <strong>৳{(parseFloat(ratioForm.videoTaka || 0) / parseFloat(ratioForm.videoBase || 1)).toFixed(6)} BDT</strong> (100 {isDiamondMode ? '💎' : '🪙'} = <strong>৳{(100 * parseFloat(ratioForm.videoTaka || 0) / parseFloat(ratioForm.videoBase || 1)).toFixed(2)} BDT</strong>)
                </div>
              </div>

              {/* Audio Host Box */}
              <div style={{
                padding: '1.15rem',
                borderRadius: '12px',
                background: 'var(--bg-primary)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                marginBottom: '1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#10b981', marginBottom: '0.85rem', fontSize: '0.92rem' }}>
                  <Mic size={16} />
                  <span>{isDiamondMode ? '🎙️ Audio Host Conversion Rule' : '🎙️ Audio Host Coin Cashout Rule'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                      {isDiamondMode ? 'Base Diamonds (💎):' : 'Base Coins (🪙):'}
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      min="1"
                      value={ratioForm.audioBase}
                      onChange={(e) => setRatioForm({ ...ratioForm, audioBase: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Payout Amount (৳ BDT):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      min="0.01"
                      value={ratioForm.audioTaka}
                      onChange={(e) => setRatioForm({ ...ratioForm, audioTaka: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem', padding: '6px 12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', fontSize: '0.76rem', color: '#10b981', fontWeight: 600 }}>
                  ⚡ Auto Calculation: 1 {isDiamondMode ? 'Diamond' : 'Coin'} = <strong>৳{(parseFloat(ratioForm.audioTaka || 0) / parseFloat(ratioForm.audioBase || 1)).toFixed(6)} BDT</strong> (100 {isDiamondMode ? '💎' : '🪙'} = <strong>৳{(100 * parseFloat(ratioForm.audioTaka || 0) / parseFloat(ratioForm.audioBase || 1)).toFixed(2)} BDT</strong>)
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: '10px', padding: '0.7rem' }} disabled={savingRatios}>
                {savingRatios ? <Loader inline small /> : <CheckCircle size={16} />}
                <span>{savingRatios ? 'Saving Ratios...' : 'Update & Save Conversion Rules'}</span>
              </button>
            </form>

            {/* Live Interactive Conversion Simulator */}
            <div className="panel-card" style={{
              padding: '1.5rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(2, 132, 199, 0.08) 100%)',
              border: '1px solid rgba(124, 58, 237, 0.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--text-main)', fontWeight: 800 }}>
                <Calculator size={18} color="#7c3aed" />
                <span>{isDiamondMode ? 'Instant Diamond Payout Simulator' : 'Instant Coin Payout Simulator'}</span>
              </div>

              {/* Quick Chip Presets */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {(isDiamondMode ? [1000, 5000, 10000, 50000, 100000] : [100, 500, 1000, 2500, 5000]).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCalcDiamonds(amt)}
                    style={{
                      fontSize: '0.72rem',
                      borderRadius: '6px',
                      background: calcDiamonds === amt ? '#7c3aed' : 'var(--bg-primary)',
                      color: calcDiamonds === amt ? '#fff' : 'var(--text-main)',
                    }}
                  >
                    {isDiamondMode ? '💎' : '🪙'} {amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.15rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                    {isDiamondMode ? 'Diamonds to Cashout:' : 'Coins to Cashout:'}
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={calcDiamonds}
                    onChange={(e) => setCalcDiamonds(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                    Host Type:
                  </label>
                  <select
                    className="input-field"
                    value={calcHostType}
                    onChange={(e) => setCalcHostType(e.target.value)}
                  >
                    <option value="video">🎥 Video Host</option>
                    <option value="audio">🎙️ Audio Host</option>
                  </select>
                </div>
              </div>

              <div style={{
                padding: '1.35rem',
                borderRadius: '12px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                  Calculated Cashout Amount
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#10b981', margin: '4px 0' }}>
                  ৳ {calculateConvertedTaka(calcDiamonds, calcHostType)} BDT
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Rate applied: {calcHostType === 'video' ? 'Video Host' : 'Audio Host'} active conversion rule
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Host Withdrawals Queue Table */}
          <div className="panel-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <CreditCard size={18} color="#10b981" />
                  <span>Host Payout Requests</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                  Auto-converted in BDT according to host type ratio.
                </p>
              </div>

              <button className="btn btn-secondary btn-sm" onClick={fetchWithdrawals} style={{ borderRadius: '8px' }}>
                <RefreshCw size={14} />
              </button>
            </div>

            {loadingWithdrawals ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Loader />
              </div>
            ) : withdrawals.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                <CheckCircle size={36} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                <div>No pending host cashouts found</div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Host Broadcaster</th>
                      <th>Type</th>
                      <th>{isDiamondMode ? 'Diamonds (💎)' : 'Coins (🪙)'}</th>
                      <th>Converted Payout (BDT)</th>
                      <th>Method & Details</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => {
                      const isVideo = w.host_type === 'video';
                      const isPending = w.status === 'pending';
                      const isCoinPayout = (w.coin_amount && w.coin_amount > 0) || !isDiamondMode;
                      const rawAmount = isCoinPayout ? (w.coin_amount || w.diamond_amount) : w.diamond_amount;
                      const convertedTaka = w.payout_amount && parseFloat(w.payout_amount) > 0
                        ? parseFloat(w.payout_amount).toFixed(2)
                        : calculateConvertedTaka(rawAmount, w.host_type || 'video');

                      return (
                        <tr key={w.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                              {w.host_name || `Host #${w.host_id}`}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ID #{w.host_id}</div>
                          </td>

                          <td>
                            {isVideo ? (
                              <span style={{ color: '#0284c7', fontSize: '0.75rem', fontWeight: 800 }}>
                                🎥 Video
                              </span>
                            ) : (
                              <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 800 }}>
                                🎙️ Audio
                              </span>
                            )}
                          </td>

                          <td style={{ fontWeight: 800, color: isCoinPayout ? '#f59e0b' : '#06b6d4', fontSize: '0.88rem' }}>
                            {isCoinPayout ? `🪙 ${Number(rawAmount || 0).toLocaleString()}` : `💎 ${Number(rawAmount || 0).toLocaleString()}`}
                          </td>

                          <td style={{ fontWeight: 900, color: '#10b981', fontSize: '0.95rem' }}>
                            ৳ {convertedTaka}
                          </td>

                          <td style={{ maxWidth: '140px' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {w.payment_method}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {w.account_details}
                            </div>
                          </td>

                          <td>
                            <span
                              className={`badge ${
                                w.status === 'approved'
                                  ? 'badge-success'
                                  : w.status === 'rejected'
                                  ? 'badge-danger'
                                  : 'badge-warning'
                              }`}
                              style={{ textTransform: 'capitalize', fontSize: '0.72rem', borderRadius: '6px' }}
                            >
                              {w.status}
                            </span>
                          </td>

                          <td>
                            {isPending ? (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                  className="btn btn-sm btn-primary"
                                  style={{ background: '#10b981', borderColor: '#10b981', padding: '3px 8px', borderRadius: '6px' }}
                                  disabled={processingWithdrawalId === w.id}
                                  onClick={() => handleProcessWithdrawal(w.id, 'approved')}
                                  title="Approve Payout"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  style={{ padding: '3px 8px', borderRadius: '6px' }}
                                  disabled={processingWithdrawalId === w.id}
                                  onClick={() => handleProcessWithdrawal(w.id, 'rejected')}
                                  title="Reject Payout"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Done</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CHANGE / ASSIGN AGENCY MODAL                      */}
      {/* ======================================================== */}
      {agencyModalHost && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '440px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="#f59e0b" />
                <span>Assign Agency: {agencyModalHost.full_name}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setAgencyModalHost(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAgencyAssignment}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Select Agency:
                </label>
                <select
                  className="input-field"
                  value={selectedAgencyForHost}
                  onChange={(e) => setSelectedAgencyForHost(e.target.value)}
                >
                  <option value="">Independent Broadcaster (No Agency)</option>
                  {agenciesList.map((a) => (
                    <option key={a.id} value={a.id}>
                      #{a.id} - {a.name} ({a.agency_code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAgencyModalHost(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingAgencyChange}>
                  {savingAgencyChange ? <Loader inline small /> : <CheckCircle size={16} />}
                  <span>Save Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SUBMIT HOST APPLICATION                           */}
      {/* ======================================================== */}
      {createRequestModal && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '520px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="#7c3aed" />
                <span>Submit Host Application</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setCreateRequestModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRequest}>
              {/* Lookup User by ID */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Target User ID or Email: *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 5 or user@umi.live"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    required
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleSearchUser} disabled={searchingUser}>
                    {searchingUser ? <Loader inline small /> : <Search size={15} />}
                    <span>Find</span>
                  </button>
                </div>

                {searchedUser && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <img
                      src={searchedUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${searchedUser.id}`}
                      alt={searchedUser.full_name}
                      style={{ width: '38px', height: '38px', borderRadius: '50%' }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                        {searchedUser.full_name || 'User'} (#{searchedUser.id})
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Role: {searchedUser.role} • Coins: {searchedUser.coins?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Host Type Selection */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Select Host Classification: *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    className={`btn ${newRequestHostType === 'video' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setNewRequestHostType('video')}
                    style={{ padding: '0.75rem', justifyContent: 'center', borderRadius: '10px' }}
                  >
                    <Video size={16} />
                    <span>🎥 Video Host</span>
                  </button>

                  <button
                    type="button"
                    className={`btn ${newRequestHostType === 'audio' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setNewRequestHostType('audio')}
                    style={{ padding: '0.75rem', justifyContent: 'center', borderRadius: '10px' }}
                  >
                    <Mic size={16} />
                    <span>🎙️ Audio Host</span>
                  </button>
                </div>
              </div>

              {/* Agency Assignment Option */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Assign to Agency (Optional):
                </label>
                <select
                  className="input-field"
                  value={newRequestAgencyId}
                  onChange={(e) => setNewRequestAgencyId(e.target.value)}
                >
                  <option value="">Independent Broadcaster (No Agency)</option>
                  {agenciesList.map((a) => (
                    <option key={a.id} value={a.id}>
                      #{a.id} - {a.name} ({a.agency_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Application Notes / Justification:
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="e.g. Approved talent audition for audio podcast sessions..."
                  value={newRequestNotes}
                  onChange={(e) => setNewRequestNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCreateRequestModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingRequest || !searchedUser}>
                  {submittingRequest ? <Loader inline small /> : <CheckCircle size={16} />}
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {detailsUserId && (
        <UserDetailsModal
          userId={detailsUserId}
          onClose={() => setDetailsUserId(null)}
          onToast={onToast}
          onUserUpdated={fetchHosts}
        />
      )}
    </div>
  );
}
