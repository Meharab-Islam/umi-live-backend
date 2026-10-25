import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  Search,
  UserCheck,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  User,
  History,
  RotateCcw,
  RefreshCw,
  Clock,
  X,
  ExternalLink,
  PlusCircle,
  FileText,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Layers,
  Tag,
  DollarSign,
  Gift,
  Check,
  Sliders,
} from 'lucide-react';
import userApi from '../api/userApi';
import coinPackageApi from '../api/coinPackageApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import UserDetailsModal from '../components/UserDetailsModal';
import { useEconomy } from '../context/EconomyContext';

export default function CoinRecharge({ onToast }) {
  const { isDiamondMode } = useEconomy();
  const [activeTab, setActiveTab] = useState('desk'); // 'desk' | 'history' | 'presets'

  // Form fields
  const [userIdQuery, setUserIdQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [coinAmount, setCoinAmount] = useState(1000);
  const [actionPassword, setActionPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('Official Coin Recharge');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRechargeSuccess, setLastRechargeSuccess] = useState(null);

  // Recharge History State
  const [historyList, setHistoryList] = useState([]);
  const [historySummary, setHistorySummary] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);

  // User details modal
  const [detailsUserId, setDetailsUserId] = useState(null);

  // Dynamic Quick Presets & Coin Packages State
  const [quickAmounts, setQuickAmounts] = useState([500, 1000, 2500, 5000, 10000, 50000, 100000]);
  const [coinPackages, setCoinPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageForm, setPackageForm] = useState({
    name: '',
    coins: 1000,
    price_usd: 4.99,
    bonus_coins: 100,
    badge: 'Popular',
    is_active: 1,
  });
  const [savingPackage, setSavingPackage] = useState(false);
  const [newQuickAmount, setNewQuickAmount] = useState('');
  const [savingQuickPresets, setSavingQuickPresets] = useState(false);

  // Fetch coin packages & quick presets
  const fetchCoinPackages = useCallback(async () => {
    try {
      setLoadingPackages(true);
      const res = await coinPackageApi.getCoinPackages();
      if (res.success) {
        setCoinPackages(res.packages || []);
        if (res.quickPresets && res.quickPresets.length > 0) {
          setQuickAmounts(res.quickPresets);
        }
      }
    } catch (err) {
      console.warn('Failed to load coin packages:', err.message);
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  const handleSaveQuickPresets = async (newPresets) => {
    try {
      setSavingQuickPresets(true);
      const res = await coinPackageApi.updateQuickPresets(newPresets);
      if (res.success) {
        setQuickAmounts(res.presets);
        onToast('Quick recharge presets updated successfully!', 'success');
      }
    } catch (err) {
      onToast(err.message || 'Failed to update quick presets.', 'error');
    } finally {
      setSavingQuickPresets(false);
    }
  };

  const handleAddQuickAmount = () => {
    const val = parseInt(newQuickAmount, 10);
    if (!val || isNaN(val) || val <= 0) {
      onToast('Enter a valid coin amount.', 'error');
      return;
    }
    if (quickAmounts.includes(val)) {
      onToast('Amount already exists in quick presets.', 'error');
      return;
    }
    const updated = [...quickAmounts, val].sort((a, b) => a - b);
    handleSaveQuickPresets(updated);
    setNewQuickAmount('');
  };

  const handleRemoveQuickAmount = (val) => {
    if (quickAmounts.length <= 1) {
      onToast('Please keep at least one quick amount preset.', 'error');
      return;
    }
    const updated = quickAmounts.filter((a) => a !== val);
    handleSaveQuickPresets(updated);
  };

  const handleOpenCreatePackage = () => {
    setEditingPackage(null);
    setPackageForm({
      name: '',
      coins: 1000,
      price_usd: 4.99,
      bonus_coins: 100,
      badge: 'Popular',
      is_active: 1,
    });
    setPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      coins: pkg.coins,
      price_usd: pkg.price_usd,
      bonus_coins: pkg.bonus_coins,
      badge: pkg.badge || '',
      is_active: pkg.is_active ? 1 : 0,
    });
    setPackageModalOpen(true);
  };

  const handleSavePackage = async (e) => {
    if (e) e.preventDefault();
    if (!packageForm.name.trim()) {
      onToast('Package name is required.', 'error');
      return;
    }
    if (!packageForm.coins || packageForm.coins <= 0) {
      onToast('Coins must be greater than 0.', 'error');
      return;
    }
    try {
      setSavingPackage(true);
      if (editingPackage) {
        const res = await coinPackageApi.updateCoinPackage(editingPackage.id, packageForm);
        if (res.success) {
          onToast(res.message || 'Package updated successfully!', 'success');
          setPackageModalOpen(false);
          fetchCoinPackages();
        }
      } else {
        const res = await coinPackageApi.createCoinPackage(packageForm);
        if (res.success) {
          onToast(res.message || 'Package created successfully!', 'success');
          setPackageModalOpen(false);
          fetchCoinPackages();
        }
      }
    } catch (err) {
      onToast(err.message || 'Failed to save coin package.', 'error');
    } finally {
      setSavingPackage(false);
    }
  };

  const handleDeletePackage = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete package "${name}"?`)) return;
    try {
      const res = await coinPackageApi.deleteCoinPackage(id);
      if (res.success) {
        onToast(res.message || 'Package deleted successfully.', 'success');
        fetchCoinPackages();
      }
    } catch (err) {
      onToast(err.message || 'Failed to delete package.', 'error');
    }
  };

  const handleTogglePackage = async (id) => {
    try {
      const res = await coinPackageApi.toggleCoinPackage(id);
      if (res.success) {
        onToast(res.message || 'Package status updated.', 'success');
        fetchCoinPackages();
      }
    } catch (err) {
      onToast(err.message || 'Failed to toggle package.', 'error');
    }
  };

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const cleanSearch = historySearch.trim();
      const params = {
        page: historyPage,
        limit: historyPageSize,
      };
      if (cleanSearch) {
        params.search = cleanSearch;
      }
      const res = await userApi.getRechargeHistory(params);

      if (res.success) {
        setHistoryList(res.history || []);
        if (res.summary) {
          setHistorySummary(res.summary);
        }
        if (res.pagination) {
          setHistoryTotal(res.pagination.total || 0);
        }
      } else {
        onToast(res.message || 'Failed to load recharge history.', 'error');
      }
    } catch (err) {
      console.error('fetchHistory error:', err);
      onToast(err.message || 'Error loading recharge history.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyPageSize, historySearch, onToast]);

  useEffect(() => {
    fetchHistory();
    fetchCoinPackages();
  }, [fetchHistory, fetchCoinPackages, activeTab]);

  // Search user by User ID for recharge
  const handleSearchUser = async (e) => {
    if (e) e.preventDefault();
    const query = userIdQuery.trim();
    if (!query) {
      onToast('Please enter a User ID to search.', 'error');
      return;
    }

    try {
      setIsSearching(true);
      setCandidates([]);
      const res = await userApi.getUsers({
        search: query,
        limit: 10,
      });

      if (res.success && res.users && res.users.length > 0) {
        const exactMatch = res.users.find((u) => String(u.id) === query);
        if (exactMatch) {
          setSelectedUser(exactMatch);
          setCandidates([]);
          onToast(`User #${exactMatch.id} (${exactMatch.full_name}) selected.`, 'success');
        } else if (res.users.length === 1) {
          setSelectedUser(res.users[0]);
          setCandidates([]);
          onToast(`User #${res.users[0].id} (${res.users[0].full_name}) selected.`, 'success');
        } else {
          setCandidates(res.users);
          setSelectedUser(null);
        }
      } else {
        setSelectedUser(null);
        setCandidates([]);
        onToast(`No user found matching ID "${query}".`, 'error');
      }
    } catch (err) {
      onToast(err.message || 'Failed to search user.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCandidate = (user) => {
    setSelectedUser(user);
    setCandidates([]);
    setUserIdQuery(String(user.id));
    onToast(`User #${user.id} (${user.full_name || `User`}) selected.`, 'info');
  };

  // Submit recharge
  const handleRechargeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      onToast('Please search and select a user first.', 'error');
      return;
    }

    const amount = parseInt(coinAmount, 10);
    if (!amount || amount <= 0) {
      onToast('Please enter a positive coin amount greater than 0.', 'error');
      return;
    }

    if (!actionPassword.trim()) {
      onToast('Security Action Password is required to authorize coin recharge.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await userApi.rechargeCoins({
        userId: selectedUser.id,
        coinAmount: amount,
        actionPassword: actionPassword.trim(),
        reason: reason.trim() || 'Admin Coin Recharge',
      });

      if (res.success) {
        const oldCoins = Number(selectedUser.coins || 0);
        const newCoins = oldCoins + amount;

        onToast(`Successfully recharged +${amount.toLocaleString()} coins for User #${selectedUser.id}!`, 'success');

        setLastRechargeSuccess({
          user: { ...selectedUser },
          rechargedAmount: amount,
          previousCoins: oldCoins,
          newCoins: newCoins,
          timestamp: new Date().toLocaleTimeString(),
        });

        // Update local user preview
        setSelectedUser((prev) => (prev ? { ...prev, coins: newCoins } : null));

        // Reset password for security
        setActionPassword('');

        // Refresh recharge history in background
        fetchHistory();
      } else {
        onToast(res.message || 'Recharge failed.', 'error');
      }
    } catch (err) {
      onToast(err.message || 'Failed to recharge coins.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSelection = () => {
    setSelectedUser(null);
    setCandidates([]);
    setUserIdQuery('');
    setLastRechargeSuccess(null);
  };

  const selectUserForRecharge = (userItem) => {
    setSelectedUser({
      id: userItem.user_id,
      full_name: userItem.user_name,
      email: userItem.user_email,
      avatar_url: userItem.user_avatar,
      coins: userItem.current_coins,
      role: 'user',
    });
    setUserIdQuery(String(userItem.user_id));
    setActiveTab('desk');
    onToast(`Selected User #${userItem.user_id} (${userItem.user_name || 'User'}) for recharge.`, 'info');
  };

  const currentCoins = Number(selectedUser?.coins || 0);
  const rechargeVal = parseInt(coinAmount, 10) || 0;
  const projectedTotal = currentCoins + rechargeVal;

  // If viewing details of a user, render as a dedicated full-page view!
  if (detailsUserId) {
    return (
      <UserDetailsModal
        userId={detailsUserId}
        onClose={() => setDetailsUserId(null)}
        onToast={onToast}
        onUserUpdated={() => {
          fetchHistory();
          if (selectedUser && selectedUser.id === detailsUserId) {
            userApi.getUserDetails(detailsUserId).then((res) => {
              if (res.success && res.user) {
                setSelectedUser(res.user);
              }
            });
          }
        }}
        isPage={true}
        backTitle="Back to Coin Recharge"
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Banner */}
      <div
        className="panel-card"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          padding: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 8px 16px rgba(245, 158, 11, 0.3)',
              }}
            >
              <Coins size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Admin Coin Recharge & History
                <span className="badge badge-warning" style={{ fontSize: '0.72rem', verticalAlign: 'middle' }}>
                  Financial Operations
                </span>
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                Recharge coins into user accounts with security password and track complete audit transaction history.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Lock size={14} color="#7c3aed" />
            <span>Action Password Protected</span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Segmented Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-primary)',
          padding: '6px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'desk' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('desk')}
            style={{ borderRadius: '8px', padding: '0.55rem 1.25rem', fontSize: '0.88rem', gap: '8px' }}
          >
            <Coins size={16} />
            <span>Recharge Desk</span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
            style={{ borderRadius: '8px', padding: '0.55rem 1.25rem', fontSize: '0.88rem', gap: '8px' }}
          >
            <History size={16} />
            <span>Recharge History</span>
            <span
              style={{
                marginLeft: 4,
                padding: '2px 8px',
                borderRadius: '10px',
                background: activeTab === 'history' ? 'rgba(255,255,255,0.2)' : 'rgba(245, 158, 11, 0.15)',
                color: activeTab === 'history' ? '#fff' : '#f59e0b',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {historyTotal.toLocaleString()}
            </span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'presets' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveTab('presets');
              fetchCoinPackages();
            }}
            style={{ borderRadius: '8px', padding: '0.55rem 1.25rem', fontSize: '0.88rem', gap: '8px' }}
          >
            <Layers size={16} />
            <span>Presets</span>
            <span
              style={{
                marginLeft: 4,
                padding: '2px 8px',
                borderRadius: '10px',
                background: activeTab === 'presets' ? 'rgba(255,255,255,0.2)' : 'rgba(139, 92, 246, 0.15)',
                color: activeTab === 'presets' ? '#fff' : '#a78bfa',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {coinPackages.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: RECHARGE DESK */}
      {activeTab === 'desk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {/* Step 1: User ID Search & Selection */}
            <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="panel-header" style={{ marginBottom: '0.25rem' }}>
                <div className="panel-title">
                  <Search size={18} color="var(--primary)" />
                  <span>Step 1: Search User by ID</span>
                </div>
                {selectedUser && (
                  <button
                    type="button"
                    onClick={resetSelection}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', gap: '4px' }}
                  >
                    <RotateCcw size={12} />
                    <span>Change User</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSearchUser} style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter User ID (e.g. 5, 10243)..."
                    value={userIdQuery}
                    onChange={(e) => setUserIdQuery(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', paddingLeft: '2.5rem' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-dim)',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    #
                  </span>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSearching || !userIdQuery.trim()}
                  style={{ whiteSpace: 'nowrap', gap: '6px' }}
                >
                  {isSearching ? <Loader inline small /> : <Search size={16} />}
                  <span>Find User</span>
                </button>
              </form>

              {/* Candidate list if multiple users matched */}
              {candidates.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                    Multiple users found ({candidates.length}). Select one:
                  </span>
                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {candidates.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCandidate(c)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          background: 'var(--bg-card-hover)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="user-id-badge">#{c.id}</span>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {c.full_name || `User #${c.id}`}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              🪙 {Number(c.coins || 0).toLocaleString()} coins
                            </div>
                          </div>
                        </div>
                        <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected User Showcase */}
              {selectedUser ? (
                <div
                  style={{
                    borderRadius: '12px',
                    border: '1px solid rgba(124, 58, 237, 0.25)',
                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.04) 0%, rgba(2, 132, 199, 0.04) 100%)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: 'var(--primary-gradient)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          boxShadow: 'var(--glow-primary)',
                          overflow: 'hidden',
                        }}
                      >
                        {selectedUser.avatar_url ? (
                          <img
                            src={selectedUser.avatar_url}
                            alt="Avatar"
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          (selectedUser.full_name || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="user-id-badge">#{selectedUser.id}</span>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                            {selectedUser.full_name || `User #${selectedUser.id}`}
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          ID: #{selectedUser.id} • Role:{' '}
                          <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{selectedUser.role}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 8px', gap: '4px' }}
                        onClick={() => setDetailsUserId(selectedUser.id)}
                      >
                        <Eye size={12} />
                        <span>Profile</span>
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.78rem', fontWeight: 600 }}>
                        <UserCheck size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Balances Display */}
                  <div style={{ display: 'grid', gridTemplateColumns: isDiamondMode ? '1fr 1fr' : '1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <div
                      style={{
                        background: 'var(--bg-secondary)',
                        padding: '0.85rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🪙 CURRENT COINS</span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                        {currentCoins.toLocaleString()}
                      </div>
                    </div>

                    {isDiamondMode && (
                      <div
                        style={{
                          background: 'var(--bg-secondary)',
                          padding: '0.85rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>💎 CURRENT DIAMONDS</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06b6d4', marginTop: '4px' }}>
                          {Number(selectedUser.diamonds || 0).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-dim)',
                  }}
                >
                  <User size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>No User Selected</div>
                  <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    Enter a numeric User ID in the search box above to load user details.
                  </p>
                </div>
              )}

              {/* Last Recharge Result Banner */}
              {lastRechargeSuccess && (
                <div
                  style={{
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={20} color="#10b981" />
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                      <strong>Recharge Successful:</strong> User #{lastRechargeSuccess.user.id} credited with{' '}
                      <strong style={{ color: '#f59e0b' }}>+{lastRechargeSuccess.rechargedAmount.toLocaleString()}</strong> coins.
                      New balance: <strong>🪙 {lastRechargeSuccess.newCoins.toLocaleString()}</strong>.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('history')}
                    style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  >
                    View History →
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Recharge Amount & Security Password */}
            <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="panel-header" style={{ marginBottom: '0.25rem' }}>
                <div className="panel-title">
                  <Coins size={18} color="#f59e0b" />
                  <span>Step 2: Recharge Amount & Authorization</span>
                </div>
              </div>

              <form onSubmit={handleRechargeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Amount input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    Coin Recharge Amount (Coins):
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="input-field"
                      placeholder="e.g. 1000"
                      value={coinAmount}
                      onChange={(e) => setCoinAmount(e.target.value)}
                      disabled={!selectedUser}
                      style={{ fontSize: '1.1rem', fontWeight: 700, paddingLeft: '2.5rem' }}
                      required
                    />
                    <span
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '1.1rem',
                      }}
                    >
                      🪙
                    </span>
                  </div>

                  {/* Quick Amount Buttons */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.6rem' }}>
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        disabled={!selectedUser}
                        onClick={() => setCoinAmount(amt)}
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: Number(coinAmount) === amt ? 'var(--primary)' : 'var(--bg-secondary)',
                          color: Number(coinAmount) === amt ? '#fff' : 'var(--text-muted)',
                          border: Number(coinAmount) === amt ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          cursor: selectedUser ? 'pointer' : 'not-allowed',
                          fontWeight: 600,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        +{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Calculation Preview */}
                {selectedUser && (
                  <div
                    style={{
                      background: 'var(--bg-card-hover)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>CURRENT</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>🪙 {currentCoins.toLocaleString()}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 700 }}>
                      <ArrowRight size={16} />
                      <span>+{rechargeVal.toLocaleString()}</span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>AFTER RECHARGE</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f59e0b' }}>
                        🪙 {projectedTotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Audit Reason */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    Reason / Audit Log Note:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Reason for recharge (e.g. VIP topup, promotion prize)..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={!selectedUser}
                    required
                  />
                </div>

                {/* Security Action Password */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={15} />
                      <span>Admin Security Action Password:</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Configured in Platform Settings
                    </span>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      placeholder="Enter security password (default: admin123)..."
                      value={actionPassword}
                      onChange={(e) => setActionPassword(e.target.value)}
                      disabled={!selectedUser}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        borderColor: actionPassword ? 'var(--primary)' : undefined,
                        paddingRight: '2.5rem',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
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
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    🔒 This operation cannot be completed without the security action password.
                  </span>
                </div>

                {/* Submit Button */}
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!selectedUser || isSubmitting || rechargeVal <= 0 || !actionPassword.trim()}
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #7c3aed 100%)',
                      boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader inline small />
                        <span>Processing Recharge...</span>
                      </>
                    ) : (
                      <>
                        <Coins size={18} />
                        <span>
                          {selectedUser
                            ? `Authorize & Recharge +${rechargeVal.toLocaleString()} Coins for User #${selectedUser.id}`
                            : 'Select User to Recharge Coins'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Quick Recent Recharges Widget */}
          <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                <History size={18} color="#f59e0b" />
                <span>Recent Recharges Activity</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab('history')}
                style={{ fontSize: '0.8rem', gap: '4px' }}
              >
                <span>View Full History ({historyTotal})</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {historyLoading && historyList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Loader inline />
              </div>
            ) : historyList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.88rem' }}>
                No coin recharges logged yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
                {historyList.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'var(--primary-gradient)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          overflow: 'hidden',
                        }}
                      >
                        {item.user_avatar ? (
                          <img
                            src={item.user_avatar}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          (item.user_name || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="user-id-badge">#{item.user_id}</span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {item.user_name || `User #${item.user_id}`}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b' }}>
                        +{Number(item.amount || 0).toLocaleString()} 🪙
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        Success
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RECHARGE HISTORY */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Metric Cards */}
          <div className="stats-grid">
            {/* Metric 1: Total Recharges */}
            <div
              className="panel-card"
              style={{
                padding: '1.35rem',
                borderRadius: '14px',
                borderLeft: '4px solid #7c3aed',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Recharges
                </span>
                <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
                  <History size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {Number(historySummary?.total_recharges || historyTotal || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                Total completed recharge operations
              </div>
            </div>

            {/* Metric 2: Total Coins Recharged */}
            <div
              className="panel-card"
              style={{
                padding: '1.35rem',
                borderRadius: '14px',
                borderLeft: '4px solid #f59e0b',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Coins Credited
                </span>
                <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  <Coins size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f59e0b' }}>
                🪙 {Number(historySummary?.total_recharged_coins || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                All-time platform coin top-ups
              </div>
            </div>

            {/* Metric 3: 30-Day Volume */}
            <div
              className="panel-card"
              style={{
                padding: '1.35rem',
                borderRadius: '14px',
                borderLeft: '4px solid #10b981',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Last 30 Days Volume
                </span>
                <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <Sparkles size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981' }}>
                🪙 {Number(historySummary?.month_recharged_coins || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                Deposits in past 30 days
              </div>
            </div>

            {/* Metric 4: 7-Day Volume */}
            <div
              className="panel-card"
              style={{
                padding: '1.35rem',
                borderRadius: '14px',
                borderLeft: '4px solid #06b6d4',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Last 7 Days Volume
                </span>
                <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
                  <Clock size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#06b6d4' }}>
                🪙 {Number(historySummary?.week_recharged_coins || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                Deposits in past 7 days
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div
            className="panel-card"
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search by User ID (#5), User Name, or Note..."
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  style={{ paddingLeft: '2.5rem' }}
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearch('');
                      setHistoryPage(1);
                    }}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={fetchHistory}
                disabled={historyLoading}
                style={{ gap: '6px' }}
              >
                <RefreshCw size={14} className={historyLoading ? 'spin' : ''} />
                <span>Reload</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                Showing <strong>{historyList.length}</strong> of <strong>{historyTotal}</strong> logs
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('desk')}
                style={{ gap: '6px' }}
              >
                <PlusCircle size={15} />
                <span>New Recharge</span>
              </button>
            </div>
          </div>

          {/* Table Card */}
          <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="custom-table" style={{ minWidth: '1000px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>ID</th>
                    <th style={{ minWidth: '220px' }}>Recipient User</th>
                    <th style={{ minWidth: '150px' }}>Recharged Amount</th>
                    <th style={{ minWidth: '140px' }}>Current Balance</th>
                    <th style={{ minWidth: '220px' }}>Reason / Note</th>
                    <th style={{ width: '110px' }}>Status</th>
                    <th style={{ minWidth: '160px' }}>Date & Time</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem' }}>
                        <Loader inline />
                        <div style={{ marginTop: '0.75rem', color: 'var(--text-dim)', fontSize: '0.88rem' }}>
                          Loading recharge history...
                        </div>
                      </td>
                    </tr>
                  ) : historyList.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem' }}>
                        <History size={40} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                        <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                          No Recharge Records Found
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                          {historySearch
                            ? `No transaction matched "${historySearch}". Try another search term.`
                            : 'Perform a recharge from the Recharge Desk to view audit history here.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    historyList.map((tx) => (
                      <tr key={tx.id}>
                        {/* Transaction ID */}
                        <td>
                          <span className="user-id-badge" style={{ fontSize: '0.78rem' }}>
                            #{tx.id}
                          </span>
                        </td>

                        {/* Recipient User */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                background: 'var(--primary-gradient)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                overflow: 'hidden',
                                flexShrink: 0,
                              }}
                            >
                              {tx.user_avatar ? (
                                <img
                                  src={tx.user_avatar}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                (tx.user_name || 'U')[0].toUpperCase()
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="user-id-badge" style={{ fontSize: '0.72rem' }}>
                                  #{tx.user_id}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    color: 'var(--text-main)',
                                    fontSize: '0.88rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '160px',
                                  }}
                                  title={tx.user_name}
                                >
                                  {tx.user_name || `User #${tx.user_id}`}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-dim)',
                                  marginTop: '2px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '180px',
                                }}
                              >
                                {tx.user_email || `ID: #${tx.user_id}`}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Recharged Amount */}
                        <td>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              background: 'rgba(245, 158, 11, 0.1)',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              color: '#f59e0b',
                              fontWeight: 800,
                              fontSize: '0.92rem',
                            }}
                          >
                            <span>🪙</span>
                            <span>+{Number(tx.amount || 0).toLocaleString()}</span>
                          </div>
                        </td>

                        {/* Current User Balance */}
                        <td>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            🪙 {Number(tx.current_coins || 0).toLocaleString()}
                          </div>
                        </td>

                        {/* Description / Reason */}
                        <td>
                          <div
                            style={{
                              fontSize: '0.82rem',
                              color: 'var(--text-muted)',
                              lineHeight: 1.4,
                              maxWidth: '240px',
                              wordBreak: 'break-word',
                            }}
                          >
                            {tx.description || 'Admin Coin Recharge'}
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className="badge badge-success"
                            style={{
                              fontSize: '0.72rem',
                              padding: '3px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>{tx.status || 'Completed'}</span>
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {tx.created_at ? new Date(tx.created_at).toLocaleTimeString() : '—'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setDetailsUserId(tx.user_id)}
                              title="View User Details"
                              style={{ padding: '5px 8px', fontSize: '0.75rem', gap: '4px' }}
                            >
                              <Eye size={13} />
                              <span>Profile</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => selectUserForRecharge(tx)}
                              title="Recharge User Again"
                              style={{ padding: '5px 8px', fontSize: '0.75rem', color: '#f59e0b', gap: '4px' }}
                            >
                              <Coins size={13} />
                              <span>Recharge</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination */}
            <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <Pagination
                currentPage={historyPage}
                totalItems={historyTotal}
                pageSize={historyPageSize}
                onPageChange={(newPage) => setHistoryPage(newPage)}
                onPageSizeChange={(newSize) => {
                  setHistoryPageSize(newSize);
                  setHistoryPage(1);
                }}
                pageSizeOptions={[10, 15, 25, 50]}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RECHARGE PRESETS & PACKAGES MANAGER */}
      {activeTab === 'presets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Amounts Presets Editor Card */}
          <div
            className="panel-card"
            style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(139, 92, 246, 0.04) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Sliders size={18} color="#f59e0b" />
                  <span>Quick Preset Recharge Amounts (Desk & Mobile App)</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
                  These quick-recharge buttons appear on the Admin Desk and Mobile Coin Top-up bar.
                </p>
              </div>

              <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                {quickAmounts.length} Quick Presets Active
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', marginBottom: '0.85rem' }}>
              {quickAmounts.map((amt) => (
                <div
                  key={amt}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: '#fbbf24',
                  }}
                >
                  <span>🪙 {amt.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuickAmount(amt)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: '#f87171',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Remove preset"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {/* Add New Quick Amount Preset */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  placeholder="New amount (e.g. 20000)"
                  className="input-field"
                  style={{ width: '160px', padding: '5px 10px', fontSize: '0.82rem' }}
                  value={newQuickAmount}
                  onChange={(e) => setNewQuickAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddQuickAmount();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddQuickAmount}
                  disabled={savingQuickPresets}
                  style={{ padding: '5px 10px', fontSize: '0.82rem', gap: '4px' }}
                >
                  <Plus size={14} />
                  <span>Add Preset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Coin Recharge Packages List */}
          <div className="panel-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Coins size={20} color="#f59e0b" />
                  <span>Coin Recharge Packages (Mobile & Web Store)</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
                  Create and manage official coin recharge packages. Users purchase these packages to top up their wallet balances.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchCoinPackages}
                  style={{ gap: '6px' }}
                >
                  <RefreshCw size={14} className={loadingPackages ? 'spin' : ''} />
                  <span>Refresh</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenCreatePackage}
                  style={{ gap: '6px' }}
                >
                  <Plus size={15} />
                  <span>Create Recharge Package</span>
                </button>
              </div>
            </div>

            {loadingPackages ? (
              <Loader text="Loading coin packages..." size="md" />
            ) : coinPackages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
                <Coins size={42} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No recharge packages found.</p>
                <p style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Create your first coin package for users to top up.</p>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenCreatePackage}>
                  <Plus size={14} /> Create Package
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {coinPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    style={{
                      background: 'var(--bg-primary)',
                      borderRadius: '14px',
                      border: pkg.is_active ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: pkg.is_active ? '0 4px 15px rgba(245, 158, 11, 0.08)' : 'none',
                      opacity: pkg.is_active ? 1 : 0.65,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      {/* Top Row: Badge & Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        {pkg.badge ? (
                          <span
                            className="badge badge-warning"
                            style={{ fontSize: '0.7rem', padding: '3px 8px', fontWeight: 700 }}
                          >
                            ⭐ {pkg.badge}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Package #{pkg.id}</span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleTogglePackage(pkg.id)}
                          style={{
                            background: pkg.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            color: pkg.is_active ? '#22c55e' : '#94a3b8',
                            border: `1px solid ${pkg.is_active ? 'rgba(34, 197, 94, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {pkg.is_active ? '● Active' : '○ Inactive'}
                        </button>
                      </div>

                      {/* Package Title */}
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
                        {pkg.name}
                      </h4>

                      {/* Coins Breakdown */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>
                          🪙 {Number(pkg.coins).toLocaleString()}
                        </span>
                        {pkg.bonus_coins > 0 && (
                          <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
                            +{Number(pkg.bonus_coins).toLocaleString()} Bonus
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                        Total:{' '}
                        <strong style={{ color: '#fbbf24' }}>
                          {(Number(pkg.coins) + Number(pkg.bonus_coins || 0)).toLocaleString()} Coins
                        </strong>
                      </div>
                    </div>

                    {/* Bottom: Price and Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                        ${Number(pkg.price_usd).toFixed(2)}
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditPackage(pkg)}
                          style={{ padding: '5px 8px' }}
                          title="Edit Package"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                          style={{ padding: '5px 8px', color: '#f87171' }}
                          title="Delete Package"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Package Create / Edit Modal */}
      {packageModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={18} color="#f59e0b" />
                <span>{editingPackage ? `Edit Package #${editingPackage.id}` : 'Create Coin Recharge Package'}</span>
              </h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setPackageModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePackage}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Value Bundle, Pro Streamer, Starter Pack"
                    className="input-field"
                    value={packageForm.name}
                    onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Base Coins *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="1000"
                      className="input-field"
                      value={packageForm.coins}
                      onChange={(e) => setPackageForm({ ...packageForm, coins: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Price (USD $) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="4.99"
                      className="input-field"
                      value={packageForm.price_usd}
                      onChange={(e) => setPackageForm({ ...packageForm, price_usd: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Bonus Coins (Optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="100"
                      className="input-field"
                      value={packageForm.bonus_coins}
                      onChange={(e) => setPackageForm({ ...packageForm, bonus_coins: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Badge Tag (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Popular, Best Value, Hot"
                      className="input-field"
                      value={packageForm.badge}
                      onChange={(e) => setPackageForm({ ...packageForm, badge: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    type="checkbox"
                    id="pkg_active_checkbox"
                    checked={packageForm.is_active === 1 || packageForm.is_active === true}
                    onChange={(e) => setPackageForm({ ...packageForm, is_active: e.target.checked ? 1 : 0 })}
                    style={{ width: '16px', height: '16px', accentColor: '#f59e0b', cursor: 'pointer' }}
                  />
                  <label htmlFor="pkg_active_checkbox" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                    Package is Active (Available for purchase in store)
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPackageModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingPackage}
                  style={{ gap: '6px' }}
                >
                  <Save size={15} />
                  <span>{savingPackage ? 'Saving...' : editingPackage ? 'Update Package' : 'Create Package'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
