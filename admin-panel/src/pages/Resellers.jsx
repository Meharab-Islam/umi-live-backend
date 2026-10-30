import React, { useState, useEffect } from 'react';
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Calendar,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Coins,
  X,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Receipt,
  DollarSign,
  Filter,
} from 'lucide-react';
import resellerApi from '../api/resellerApi';
import userApi from '../api/userApi';
import adminApi from '../api/adminApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import UserDetailsModal from '../components/UserDetailsModal';
import BulkActionBar from '../components/BulkActionBar';

export default function Resellers({ onToast }) {
  // Main Tab State: 'resellers' (Directory) | 'transactions' (All Transactions Page)
  const [activeTab, setActiveTab] = useState('resellers');

  // Currently inspected reseller for dedicated customer transaction history
  const [viewingReseller, setViewingReseller] = useState(null);

  // Resellers list state
  const [resellers, setResellers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalResellers, setTotalResellers] = useState(0);

  // Bulk Selection for Resellers
  const [selectedResellerIds, setSelectedResellerIds] = useState([]);
  const [bulkDeletingResellers, setBulkDeletingResellers] = useState(false);

  // Bulk Selection for Transactions
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [bulkDeletingTxs, setBulkDeletingTxs] = useState(false);

  const handleToggleSelectAllResellers = () => {
    if (selectedResellerIds.length === resellers.length && resellers.length > 0) {
      setSelectedResellerIds([]);
    } else {
      setSelectedResellerIds(resellers.map((r) => r.id));
    }
  };

  const handleToggleSelectReseller = (id) => {
    setSelectedResellerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteResellers = async () => {
    if (selectedResellerIds.length === 0) return;
    try {
      setBulkDeletingResellers(true);
      const res = await adminApi.bulkDelete('resellers', selectedResellerIds);
      if (res.success) {
        onToast(`Successfully demoted/removed ${res.count || selectedResellerIds.length} resellers.`, 'success');
        setSelectedResellerIds([]);
        fetchResellers();
      }
    } catch (err) {
      onToast(err.message || 'Failed to bulk remove resellers.', 'error');
    } finally {
      setBulkDeletingResellers(false);
    }
  };

  const handleToggleSelectAllTxs = (txList = transactions) => {
    if (selectedTxIds.length === txList.length && txList.length > 0) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(txList.map((t) => t.id));
    }
  };

  const handleToggleSelectTx = (id) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteTxs = async () => {
    if (selectedTxIds.length === 0) return;
    try {
      setBulkDeletingTxs(true);
      const res = await adminApi.bulkDelete('reseller_sales', selectedTxIds);
      if (res.success) {
        onToast(`Successfully deleted ${res.count || selectedTxIds.length} transaction records.`, 'success');
        setSelectedTxIds([]);
        if (viewingReseller) {
          loadResellerSales(viewingReseller.id);
        }
        if (activeTab === 'transactions') {
          loadAllSales();
        }
      }
    } catch (err) {
      onToast(err.message || 'Failed to bulk delete transactions.', 'error');
    } finally {
      setBulkDeletingTxs(false);
    }
  };

  // Assign Reseller Form State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState('existing'); // 'existing' | 'new'
  const [searchUserId, setSearchUserId] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [initialCoins, setInitialCoins] = useState(50000);
  const [newResellerData, setNewResellerData] = useState({
    email: '',
    password: '',
    full_name: '',
    initialCoins: 100000,
  });
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Revoke / Delete Reseller State
  const [deleteConfirmReseller, setDeleteConfirmReseller] = useState(null);
  const [deletingReseller, setDeletingReseller] = useState(false);

  // Transactions Page State
  const [transactions, setTransactions] = useState([]);
  const [txSummary, setTxSummary] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(15);
  const [txTotal, setTxTotal] = useState(0);
  const [selectedResellerId, setSelectedResellerId] = useState('all');
  const [txPeriod, setTxPeriod] = useState('all'); // 'all' | 'month' | 'week'
  const [txSearch, setTxSearch] = useState('');

  // Clean / Delete Transactions State
  const [deleteTxId, setDeleteTxId] = useState(null);
  const [deletingTx, setDeletingTx] = useState(false);
  const [cleanConfirmModalOpen, setCleanConfirmModalOpen] = useState(false);
  const [cleaningTx, setCleaningTx] = useState(false);

  // User Details Modal
  const [detailsUserId, setDetailsUserId] = useState(null);

  // Fetch data on activeTab or pagination change
  useEffect(() => {
    if (viewingReseller) {
      fetchTransactions(txPage, txSearch, String(viewingReseller.id), txPeriod);
    } else if (activeTab === 'resellers') {
      fetchResellers();
    } else {
      fetchTransactions(txPage, txSearch, selectedResellerId, txPeriod);
    }
  }, [activeTab, viewingReseller, page, pageSize, txPage, txPageSize, selectedResellerId, txPeriod]);

  // Fetch Resellers
  const fetchResellers = async (targetPage = page, query = searchQuery) => {
    try {
      setLoading(true);
      const params = {
        page: targetPage,
        limit: pageSize,
      };
      if (query.trim()) params.search = query.trim();
      const res = await resellerApi.getResellers(params);
      if (res.success) {
        setResellers(res.resellers || []);
        setSummary(res.summary);
        setTotalResellers(res.pagination?.total || (res.resellers || []).length);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Transactions List
  const fetchTransactions = async (
    targetPage = txPage,
    query = txSearch,
    targetResellerId = viewingReseller ? String(viewingReseller.id) : selectedResellerId,
    targetPeriod = txPeriod
  ) => {
    try {
      setTxLoading(true);
      const params = {
        page: targetPage,
        limit: txPageSize,
        period: targetPeriod,
      };
      if (targetResellerId && targetResellerId !== 'all') {
        params.resellerId = targetResellerId;
      }
      if (query && query.trim()) {
        params.search = query.trim();
      }
      const res = await resellerApi.getResellerSales(params);
      if (res.success) {
        setTransactions(res.sales || []);
        setTxSummary(res.summary);
        setTxTotal(res.pagination?.total || (res.sales || []).length);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setTxLoading(false);
    }
  };

  // Reseller Search Handlers
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchResellers(1, searchQuery);
  };

  const handleResetSearch = () => {
    setSearchQuery('');
    setPage(1);
    fetchResellers(1, '');
  };

  // Transaction Search Handlers
  const handleTxSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setTxPage(1);
    const targetId = viewingReseller ? String(viewingReseller.id) : selectedResellerId;
    fetchTransactions(1, txSearch, targetId, txPeriod);
  };

  const handleResetTxSearch = () => {
    setTxSearch('');
    setTxPage(1);
    const targetId = viewingReseller ? String(viewingReseller.id) : selectedResellerId;
    fetchTransactions(1, '', targetId, txPeriod);
  };

  // Search User for Assign
  const handleSearchUserForAssign = async () => {
    if (!searchUserId.trim()) return;
    try {
      setSearchingUser(true);
      setFoundUser(null);
      const clean = searchUserId.trim().replace(/^#/, '');
      const res = await userApi.getUsers({ search: clean, limit: 1 });
      if (res.success && res.users && res.users.length > 0) {
        setFoundUser(res.users[0]);
      } else {
        onToast(`No user found matching "${clean}".`, 'error');
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSearchingUser(false);
    }
  };

  // Assign Reseller Form Submission
  const handleAssignReseller = async (e) => {
    e.preventDefault();
    try {
      setSubmittingAssign(true);
      let payload = {};
      if (assignMode === 'existing') {
        if (!foundUser) {
          onToast('Please search and select a user first.', 'error');
          return;
        }
        payload = {
          userId: foundUser.id,
          initialCoins: parseInt(initialCoins, 10) || 0,
        };
      } else {
        if (!newResellerData.email || !newResellerData.password) {
          onToast('Email and password are required.', 'error');
          return;
        }
        payload = newResellerData;
      }

      const res = await resellerApi.assignReseller(payload);
      if (res.success) {
        onToast(res.message, 'success');
        setAssignModalOpen(false);
        setFoundUser(null);
        setSearchUserId('');
        fetchResellers();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Delete / Revoke Reseller
  const handleDeleteReseller = async () => {
    if (!deleteConfirmReseller) return;
    try {
      setDeletingReseller(true);
      const res = await resellerApi.deleteReseller(deleteConfirmReseller.id);
      if (res.success) {
        onToast(res.message, 'success');
        setDeleteConfirmReseller(null);
        if (viewingReseller && viewingReseller.id === deleteConfirmReseller.id) {
          setViewingReseller(null);
        }
        fetchResellers();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setDeletingReseller(false);
    }
  };

  // Delete Single Transaction
  const handleDeleteSingleTx = async () => {
    if (!deleteTxId) return;
    try {
      setDeletingTx(true);
      const res = await resellerApi.deleteResellerSale(deleteTxId);
      if (res.success) {
        onToast(res.message, 'success');
        setDeleteTxId(null);
        const targetId = viewingReseller ? String(viewingReseller.id) : selectedResellerId;
        fetchTransactions(txPage, txSearch, targetId, txPeriod);
        fetchResellers();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setDeletingTx(false);
    }
  };

  // Clean / Clear All Transactions (System-wide or Filtered Reseller)
  const handleClearTransactions = async () => {
    try {
      setCleaningTx(true);
      const targetId = viewingReseller ? String(viewingReseller.id) : selectedResellerId;
      const params = {};
      if (targetId && targetId !== 'all') {
        params.resellerId = targetId;
      }
      const res = await resellerApi.clearResellerSales(params);
      if (res.success) {
        onToast(res.message, 'success');
        setCleanConfirmModalOpen(false);
        setTxPage(1);
        fetchTransactions(1, '', targetId, txPeriod);
        fetchResellers();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setCleaningTx(false);
    }
  };

  // Open dedicated transaction view for a specific reseller
  const handleOpenResellerDetail = (reseller) => {
    setViewingReseller(reseller);
    setSelectedResellerId(String(reseller.id));
    setTxPage(1);
    setTxSearch('');
    setTxPeriod('all');
    fetchTransactions(1, '', String(reseller.id), 'all');
  };

  // Back to reseller directory list
  const handleBackToResellers = () => {
    setViewingReseller(null);
    setSelectedResellerId('all');
    setTxSearch('');
    fetchResellers(page, searchQuery);
  };

  // If viewing details of a reseller/user, render as a dedicated full-page view!
  if (detailsUserId) {
    return (
      <UserDetailsModal
        userId={detailsUserId}
        onClose={() => setDetailsUserId(null)}
        onToast={onToast}
        onUserUpdated={fetchResellers}
        isPage={true}
        backTitle="Back to Resellers"
      />
    );
  }

  return (
    <div className="page-container" style={{ paddingBottom: '3rem' }}>
      {/* Action Toolbar */}
      <div className="panel-card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Resellers Directory ({resellers.length})
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setAssignModalOpen(true)}
            style={{ borderRadius: '8px', padding: '0.45rem 1rem' }}
          >
            <Plus size={16} />
            <span>Add Reseller</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CASE A: DEDICATED RESELLER CUSTOMER TRANSACTIONS VIEW   */}
      {/* ======================================================== */}
      {viewingReseller ? (
        <div>
          {/* Top Back Navigation Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.5rem',
              background: 'var(--bg-primary)',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleBackToResellers}
                style={{ borderRadius: '10px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <ArrowLeft size={16} />
                <span>← Back to Resellers List</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '3px 8px' }}>
                  Reseller #{viewingReseller.id}
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {viewingReseller.full_name}’s Customer Sales History
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDetailsUserId(viewingReseller.id)}
                style={{ borderRadius: '8px', gap: '4px' }}
              >
                <Eye size={13} />
                <span>Reseller Profile</span>
              </button>

              {transactions.length > 0 && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setCleanConfirmModalOpen(true)}
                  style={{ borderRadius: '8px', gap: '4px' }}
                >
                  <Trash2 size={13} />
                  <span>Clean Reseller #{viewingReseller.id} Logs</span>
                </button>
              )}
            </div>
          </div>

          {/* Reseller Profile & Performance Summary Cards */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            {/* Card 1: Reseller Profile & Stock */}
            <div className="panel-card" style={{ padding: '1.15rem', borderRadius: '14px', borderLeft: '4px solid #7c3aed' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.6rem' }}>
                <img
                  src={viewingReseller.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${viewingReseller.id}`}
                  alt=""
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(124, 58, 237, 0.4)' }}
                />
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                    {viewingReseller.full_name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    ID: #{viewingReseller.id} • {viewingReseller.email}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600 }}>CURRENT STOCK BALANCE</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                🪙 {Number(viewingReseller.coins || 0).toLocaleString()} coins
              </div>
            </div>

            {/* Card 2: Total Coins Sold */}
            <div className="panel-card" style={{ padding: '1.15rem', borderRadius: '14px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Coins Sold to Users
                </span>
                <Coins size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f59e0b' }}>
                🪙 {Number(txSummary?.total_coins_sold || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Total <strong>{txSummary?.total_sales_count || txTotal || 0}</strong> customer transfers
              </div>
            </div>

            {/* Card 3: Total Money Collected */}
            <div className="panel-card" style={{ padding: '1.15rem', borderRadius: '14px', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Total Collected (BDT)
                </span>
                <DollarSign size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981' }}>
                ৳ {parseFloat(txSummary?.total_revenue || 0).toLocaleString()} BDT
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Total payment collected from buyers
              </div>
            </div>

            {/* Card 4: Month & Week Sales */}
            <div className="panel-card" style={{ padding: '1.15rem', borderRadius: '14px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Recent Sales Volume
                </span>
                <TrendingUp size={18} color="#0284c7" />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7' }}>
                🪙 {Number(txSummary?.month_coins_sold || 0).toLocaleString()} (30d)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                🪙 {Number(txSummary?.week_coins_sold || 0).toLocaleString()} in past 7 days (৳{parseFloat(txSummary?.week_revenue || 0).toLocaleString()} BDT)
              </div>
            </div>
          </div>

          {/* Search & Period Filter Toolbar for this Reseller */}
          <div
            className="panel-card"
            style={{
              padding: '1.15rem',
              borderRadius: '14px',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <form onSubmit={handleTxSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder={`Search buyer customer ID (#5), name, or notes...`}
                  style={{ paddingLeft: '2.5rem', borderRadius: '10px' }}
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: '10px', padding: '0.45rem 1rem' }}>
                <Search size={14} />
                <span>Search</span>
              </button>
              {txSearch && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetTxSearch} style={{ borderRadius: '10px' }}>
                  Clear
                </button>
              )}
            </form>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)' }}>Period:</span>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'month', label: 'This Month (30d)' },
                  { id: 'week', label: 'This Week (7d)' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`btn btn-sm ${txPeriod === p.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '6px', padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => {
                      setTxPeriod(p.id);
                      setTxPage(1);
                      fetchTransactions(1, txSearch, String(viewingReseller.id), p.id);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fetchTransactions(txPage, txSearch, String(viewingReseller.id), txPeriod)}
                title="Refresh Records"
                style={{ borderRadius: '8px', padding: '0.45rem 0.75rem' }}
              >
                <RefreshCw size={14} className={txLoading ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* Customer Transactions Table */}
          {txLoading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center' }}>
              <Loader />
            </div>
          ) : transactions.length === 0 ? (
            <div className="panel-card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-dim)', borderRadius: '16px' }}>
              <Receipt size={48} style={{ opacity: 0.35, marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)' }}>
                No Customer Transactions Found
              </div>
              <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                {txSearch
                  ? `No sales matched "${txSearch}". Try another customer ID or name.`
                  : `Reseller #${viewingReseller.id} (${viewingReseller.full_name}) has not made any customer sales yet.`}
              </p>
            </div>
          ) : (
            <div className="panel-card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '0.65rem 1.15rem',
                  background: 'rgba(16, 185, 129, 0.08)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={16} color="#10b981" />
                  <span>
                    Showing <strong>{transactions.length}</strong> of <strong>{txTotal}</strong> coin deliveries to customer users by{' '}
                    <strong>{viewingReseller.full_name} (Reseller #{viewingReseller.id})</strong>.
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Page {txPage}</span>
              </div>

              <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                <table className="data-table" style={{ margin: 0, minWidth: '1050px', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '45px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={transactions.length > 0 && selectedTxIds.length === transactions.length}
                          onChange={() => handleToggleSelectAllTxs(transactions)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                          title="Select all on this page"
                        />
                      </th>
                      <th style={{ width: '80px' }}>Tx ID</th>
                      <th style={{ minWidth: '260px' }}>Buyer Customer</th>
                      <th style={{ minWidth: '160px' }}>Coins Delivered</th>
                      <th style={{ minWidth: '150px' }}>Price Paid</th>
                      <th style={{ minWidth: '160px' }}>Transaction Date & Time</th>
                      <th style={{ minWidth: '180px' }}>Note / Memo</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        {/* Selection Checkbox */}
                        <td style={{ textAlign: 'center', width: '45px', padding: '0.75rem 0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedTxIds.includes(tx.id)}
                            onChange={() => handleToggleSelectTx(tx.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                            title={`Select transaction #${tx.id}`}
                          />
                        </td>
                        {/* Tx ID */}
                        <td>
                          <span className="badge badge-secondary" style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                            #{tx.id}
                          </span>
                        </td>

                        {/* Buyer Customer */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={tx.buyer_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${tx.buyer_id}`}
                              alt=""
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid rgba(16, 185, 129, 0.4)',
                                flexShrink: 0,
                              }}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  className="user-id-badge"
                                  style={{
                                    fontSize: '0.74rem',
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    color: '#10b981',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    fontWeight: 700,
                                  }}
                                >
                                  User #{tx.buyer_id}
                                </span>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                  {tx.buyer_name || `User #${tx.buyer_id}`}
                                </strong>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{tx.buyer_email || `ID: #${tx.buyer_id}`}</span>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setDetailsUserId(tx.buyer_id)}
                                  style={{ padding: '1px 6px', fontSize: '0.68rem', borderRadius: '4px' }}
                                >
                                  Profile
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Coins Delivered */}
                        <td>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'rgba(245, 158, 11, 0.1)',
                              color: '#f59e0b',
                              fontWeight: 800,
                              fontSize: '0.92rem',
                            }}
                          >
                            <span>🪙</span>
                            <span>+{Number(tx.coin_amount || 0).toLocaleString()}</span>
                          </div>
                        </td>

                        {/* Price Paid */}
                        <td>
                          <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.92rem' }}>
                            ৳ {parseFloat(tx.price_amount || 0).toLocaleString()} {tx.currency || 'BDT'}
                          </div>
                        </td>

                        {/* Date and Time */}
                        <td>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            {new Date(tx.created_at).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Notes */}
                        <td>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              color: tx.notes ? 'var(--text-main)' : 'var(--text-dim)',
                              fontStyle: tx.notes ? 'normal' : 'italic',
                            }}
                          >
                            {tx.notes || 'No note'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteTxId(tx.id)}
                            title="Delete this transaction record"
                            style={{ padding: '4px 8px', borderRadius: '8px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Pagination Bar for Transactions */}
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <Pagination
                  currentPage={txPage}
                  totalPages={Math.ceil(txTotal / txPageSize) || 1}
                  totalItems={txTotal}
                  pageSize={txPageSize}
                  onPageChange={(p) => setTxPage(p)}
                  onPageSizeChange={(s) => {
                    setTxPageSize(s);
                    setTxPage(1);
                  }}
                  pageSizeOptions={[10, 15, 25, 50]}
                />
              </div>
            </div>
          )}

          <BulkActionBar
            selectedCount={selectedTxIds.length}
            totalCount={transactions.length}
            onSelectAll={() => handleToggleSelectAllTxs(transactions)}
            onDeselectAll={() => setSelectedTxIds([])}
            onBulkDelete={handleBulkDeleteTxs}
            isDeleting={bulkDeletingTxs}
            entityName="Transactions"
            actionLabel="Delete Selected Records"
          />
        </div>
      ) : (
        /* ======================================================== */
        /* CASE B: TABS (RESELLERS DIRECTORY | ALL TRANSACTIONS)     */
        /* ======================================================== */
        <div>
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
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className={`btn ${activeTab === 'resellers' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('resellers')}
                style={{ borderRadius: '8px', padding: '0.55rem 1.15rem', fontSize: '0.88rem' }}
              >
                <Users size={16} />
                <span>Authorized Resellers Directory</span>
                {summary && (
                  <span
                    style={{
                      marginLeft: 6,
                      padding: '2px 7px',
                      borderRadius: '10px',
                      background: activeTab === 'resellers' ? 'rgba(255,255,255,0.2)' : 'rgba(124, 58, 237, 0.15)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {summary.total_resellers}
                  </span>
                )}
              </button>

              <button
                className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('transactions')}
                style={{ borderRadius: '8px', padding: '0.55rem 1.15rem', fontSize: '0.88rem' }}
              >
                <Receipt size={16} />
                <span>All Platform Transactions</span>
                {txTotal > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      padding: '2px 7px',
                      borderRadius: '10px',
                      background: activeTab === 'transactions' ? 'rgba(255,255,255,0.2)' : 'rgba(124, 58, 237, 0.15)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {txTotal}
                  </span>
                )}
              </button>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600, padding: '4px 8px' }}>
              {activeTab === 'resellers'
                ? `Showing ${resellers.length} of ${totalResellers} resellers`
                : `Showing ${transactions.length} of ${txTotal} transactions`}
            </div>
          </div>

          {/* TAB 1: AUTHORIZED RESELLERS DIRECTORY */}
          {activeTab === 'resellers' && (
            <div>
              {/* Top Stats Strip */}
              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="panel-card" style={{ padding: '1.15rem', borderRadius: '14px', borderLeft: '4px solid #7c3aed' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Active Resellers</span>
                    <Users size={18} color="#7c3aed" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {summary?.total_resellers?.toLocaleString() || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Official coin distribution partners
                  </div>
                </div>

                <div className="panel-card" style={{ padding: '1.15rem', borderRadius: '14px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Lifetime Coins Sold</span>
                    <Coins size={18} color="#f59e0b" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f59e0b' }}>
                    🪙 {summary?.total_coins_sold_all_time?.toLocaleString() || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                    ৳ {parseFloat(summary?.total_revenue_all_time || 0).toLocaleString()} BDT Total Revenue
                  </div>
                </div>

                <div className="panel-card" style={{ padding: '1.15rem', borderRadius: '14px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>This Month Sales</span>
                    <TrendingUp size={18} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981' }}>
                    🪙 {summary?.this_month_coins_sold?.toLocaleString() || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    ৳ {parseFloat(summary?.this_month_revenue || 0).toLocaleString()} BDT in last 30 days
                  </div>
                </div>

                <div className="panel-card" style={{ padding: '1.15rem', borderRadius: '14px', borderLeft: '4px solid #0284c7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>This Week Sales</span>
                    <Calendar size={18} color="#0284c7" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0284c7' }}>
                    🪙 {summary?.this_week_coins_sold?.toLocaleString() || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    ৳ {parseFloat(summary?.this_week_revenue || 0).toLocaleString()} BDT in last 7 days
                  </div>
                </div>
              </div>

              {/* Reseller Search and Action Toolbar */}
              <div
                className="panel-card"
                style={{
                  padding: '1.15rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '14px',
                }}
              >
                <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Search resellers by ID (#101), Name, or Email..."
                      style={{ paddingLeft: '2.5rem', borderRadius: '10px' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: '10px', padding: '0.45rem 1rem' }}>
                    <Search size={14} />
                    <span>Search</span>
                  </button>
                  {searchQuery && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetSearch} style={{ borderRadius: '10px' }}>
                      Clear
                    </button>
                  )}
                </form>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('transactions')}
                    style={{ borderRadius: '10px', padding: '0.45rem 1rem' }}
                  >
                    <Receipt size={14} color="#7c3aed" />
                    <span>View All Platform Sales</span>
                  </button>
                </div>
              </div>

              {/* Resellers Directory Table */}
              {loading ? (
                <div style={{ padding: '3.5rem', textAlign: 'center' }}>
                  <Loader />
                </div>
              ) : resellers.length === 0 ? (
                <div className="panel-card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-dim)', borderRadius: '16px' }}>
                  <ShoppingBag size={48} style={{ opacity: 0.35, marginBottom: '1rem' }} />
                  <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)' }}>No Resellers Found</div>
                  <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                    {searchQuery ? 'No reseller matched your search criteria.' : 'Click "Assign / Add Reseller" to appoint your first official coin distributor.'}
                  </p>
                </div>
              ) : (
                <div className="panel-card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
                  {/* Tip bar */}
                  <div
                    style={{
                      padding: '0.65rem 1.15rem',
                      background: 'rgba(124, 58, 237, 0.08)',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                      color: 'var(--text-main)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Receipt size={16} color="#7c3aed" />
                      <span>
                        <strong>💡 How to view transactions:</strong> Click on any reseller in the list below to see their complete customer sales history and who they sold coins to.
                      </span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                      Total {totalResellers} Partners
                    </span>
                  </div>

                  <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                    <table className="data-table" style={{ margin: 0, minWidth: '1050px', width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '45px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                            <input
                              type="checkbox"
                              checked={resellers.length > 0 && selectedResellerIds.length === resellers.length}
                              onChange={handleToggleSelectAllResellers}
                              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                              title="Select all on this page"
                            />
                          </th>
                          <th>Reseller Profile</th>
                          <th>Reseller ID</th>
                          <th>Inventory Stock</th>
                          <th>Lifetime Sales</th>
                          <th>This Month</th>
                          <th>This Week</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resellers.map((r) => {
                          const isLowStock = (r.coins || 0) < 10000;
                          return (
                            <tr
                              key={r.id}
                              onClick={() => handleOpenResellerDetail(r)}
                              style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              {/* Selection Checkbox */}
                              <td style={{ textAlign: 'center', width: '45px', padding: '0.75rem 0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedResellerIds.includes(r.id)}
                                  onChange={() => handleToggleSelectReseller(r.id)}
                                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                                  title={`Select reseller #${r.id}`}
                                />
                              </td>
                              {/* Profile */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <img
                                    src={r.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${r.id}`}
                                    alt={r.full_name}
                                    style={{
                                      width: '42px',
                                      height: '42px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      border: '2px solid rgba(124, 58, 237, 0.4)',
                                    }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{r.full_name || 'Reseller Distributor'}</span>
                                      <span className="badge badge-primary" style={{ fontSize: '0.62rem', padding: '1px 6px', fontWeight: 800 }}>
                                        RESELLER
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>{r.email}</div>
                                  </div>
                                </div>
                              </td>

                              {/* ID */}
                              <td>
                                <span className="badge badge-secondary" style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                                  #{r.id}
                                </span>
                              </td>

                              {/* Stock Coins */}
                              <td>
                                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#f59e0b' }}>
                                  🪙 {r.coins?.toLocaleString() || 0}
                                </div>
                                <div style={{ marginTop: '2px' }}>
                                  {isLowStock ? (
                                    <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 700 }}>
                                      Low Stock
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontWeight: 700 }}>
                                      In Stock
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Lifetime Sales */}
                              <td>
                                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#10b981' }}>
                                  🪙 {r.lifetime_coins_sold?.toLocaleString() || 0}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                  ৳ {parseFloat(r.lifetime_revenue || 0).toLocaleString()} BDT ({r.lifetime_sales_count || 0} orders)
                                </div>
                              </td>

                              {/* This Month */}
                              <td>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                  🪙 {r.this_month_coins_sold?.toLocaleString() || 0}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                  ৳ {parseFloat(r.this_month_revenue || 0).toLocaleString()} BDT
                                </div>
                              </td>

                              {/* This Week */}
                              <td>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0284c7' }}>
                                  🪙 {r.this_week_coins_sold?.toLocaleString() || 0}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                  ৳ {parseFloat(r.this_week_revenue || 0).toLocaleString()} BDT
                                </div>
                              </td>

                              {/* Actions: View Transactions, Profile, Revoke */}
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                  {/* Open Transaction History Page for this reseller */}
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenResellerDetail(r);
                                    }}
                                    title="Click to view this reseller's customer transactions"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '5px 10px',
                                      borderRadius: '8px',
                                      fontWeight: 700,
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    <Receipt size={14} />
                                    <span>Transactions ({r.lifetime_sales_count || 0})</span>
                                  </button>

                                  {/* View Profile */}
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailsUserId(r.id);
                                    }}
                                    title="View User Details"
                                    style={{ padding: '5px 8px', borderRadius: '8px' }}
                                  >
                                    <Eye size={13} />
                                  </button>

                                  {/* Delete / Revoke Reseller */}
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmReseller(r);
                                    }}
                                    title="Revoke Reseller Status"
                                    style={{ padding: '5px 8px', borderRadius: '8px' }}
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

                  {/* Bottom Pagination Bar */}
                  <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <Pagination
                      currentPage={page}
                      totalPages={Math.ceil(totalResellers / pageSize) || 1}
                      totalItems={totalResellers}
                      pageSize={pageSize}
                      onPageChange={(p) => setPage(p)}
                      onPageSizeChange={(s) => {
                        setPageSize(s);
                        setPage(1);
                      }}
                      pageSizeOptions={[10, 20, 50]}
                    />
                  </div>
                </div>
              )}

              <BulkActionBar
                selectedCount={selectedResellerIds.length}
                totalCount={resellers.length}
                onSelectAll={handleToggleSelectAllResellers}
                onDeselectAll={() => setSelectedResellerIds([])}
                onBulkDelete={handleBulkDeleteResellers}
                isDeleting={bulkDeletingResellers}
                entityName="Resellers"
                actionLabel="Demote / Remove Selected"
              />
            </div>
          )}

          {/* TAB 2: GLOBAL SALES & TRANSACTION HISTORY PAGE */}
          {activeTab === 'transactions' && (
            <div>
              {/* Top Stat Strip for Transactions */}
              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="panel-card" style={{ padding: '1.15rem', borderRadius: '14px', borderLeft: '4px solid #7c3aed' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      Total Transactions
                    </span>
                    <Receipt size={18} color="#7c3aed" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {txSummary?.total_sales_count?.toLocaleString() || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Completed coin deliveries
                  </div>
                </div>

                <div className="panel-card" style={{ padding: '1.15rem', borderRadius: '14px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      Total Coins Delivered
                    </span>
                    <Coins size={18} color="#f59e0b" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f59e0b' }}>
                    🪙 {txSummary?.total_coins_sold?.toLocaleString() || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Accumulated distribution volume
                  </div>
                </div>

                <div className="panel-card" style={{ padding: '1.15rem', borderRadius: '14px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      Total BDT Collected
                    </span>
                    <DollarSign size={18} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981' }}>
                    ৳ {parseFloat(txSummary?.total_revenue || 0).toLocaleString()} BDT
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Lifetime gross payments
                  </div>
                </div>

                <div className="panel-card" style={{ padding: '1.15rem', borderRadius: '14px', borderLeft: '4px solid #0284c7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      Recent 30 Days
                    </span>
                    <TrendingUp size={18} color="#0284c7" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0284c7' }}>
                    🪙 {txSummary?.month_coins_sold?.toLocaleString() || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    ৳ {parseFloat(txSummary?.month_revenue || 0).toLocaleString()} BDT (Month)
                  </div>
                </div>
              </div>

              {/* Filtering and Search Toolbar */}
              <div
                className="panel-card"
                style={{
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* Search input */}
                  <form onSubmit={handleTxSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Search by Buyer ID (#5), Buyer Name, or Notes..."
                        style={{ paddingLeft: '2.5rem', borderRadius: '10px' }}
                        value={txSearch}
                        onChange={(e) => setTxSearch(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: '10px', padding: '0.45rem 1rem' }}>
                      <Search size={14} />
                      <span>Search</span>
                    </button>
                    {txSearch && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetTxSearch} style={{ borderRadius: '10px' }}>
                        Clear
                      </button>
                    )}
                  </form>

                  {/* Clean / Clear Transactions Button */}
                  <div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setCleanConfirmModalOpen(true)}
                      style={{ borderRadius: '10px', padding: '0.5rem 1.15rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Trash2 size={15} />
                      <span>
                        {selectedResellerId && selectedResellerId !== 'all'
                          ? `Clean Reseller #${selectedResellerId} Logs`
                          : 'Clean All Transactions'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sub-Filters: Reseller Selector & Period */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dim)' }}>Filter Reseller:</span>
                      <select
                        className="input-field"
                        style={{ width: 'auto', padding: '0.45rem 0.85rem', borderRadius: '10px' }}
                        value={selectedResellerId}
                        onChange={(e) => {
                          setSelectedResellerId(e.target.value);
                          setTxPage(1);
                        }}
                      >
                        <option value="all">All Resellers</option>
                        {resellers.map((r) => (
                          <option key={r.id} value={r.id}>
                            #{r.id} - {r.full_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      {[
                        { id: 'all', label: 'All Time' },
                        { id: 'month', label: 'This Month (30d)' },
                        { id: 'week', label: 'This Week (7d)' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`btn btn-sm ${txPeriod === p.id ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ borderRadius: '6px', padding: '4px 10px', fontSize: '0.78rem' }}
                          onClick={() => {
                            setTxPeriod(p.id);
                            setTxPage(1);
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedResellerId !== 'all' && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ borderRadius: '8px', fontSize: '0.78rem' }}
                      onClick={() => setSelectedResellerId('all')}
                    >
                      <X size={13} />
                      <span>Show All Resellers</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Transactions List Table */}
              {txLoading ? (
                <div style={{ padding: '3.5rem', textAlign: 'center' }}>
                  <Loader />
                </div>
              ) : transactions.length === 0 ? (
                <div className="panel-card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-dim)', borderRadius: '16px' }}>
                  <Receipt size={48} style={{ opacity: 0.35, marginBottom: '1rem' }} />
                  <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)' }}>No Transactions Recorded</div>
                  <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                    {txSearch || selectedResellerId !== 'all'
                      ? 'No transaction records matched your filter criteria.'
                      : 'No coin distribution transactions have been recorded yet.'}
                  </p>
                </div>
              ) : (
                <div className="panel-card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
                  <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                    <table className="data-table" style={{ margin: 0, minWidth: '1050px', width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '45px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                            <input
                              type="checkbox"
                              checked={transactions.length > 0 && selectedTxIds.length === transactions.length}
                              onChange={() => handleToggleSelectAllTxs(transactions)}
                              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                              title="Select all on this page"
                            />
                          </th>
                          <th>Tx ID</th>
                          <th>Reseller</th>
                          <th>Buyer Customer</th>
                          <th>Coins Delivered</th>
                          <th>Amount Paid (BDT)</th>
                          <th>Transaction Date</th>
                          <th>Notes / Memo</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id}>
                            {/* Selection Checkbox */}
                            <td style={{ textAlign: 'center', width: '45px', padding: '0.75rem 0.5rem' }}>
                              <input
                                type="checkbox"
                                checked={selectedTxIds.includes(tx.id)}
                                onChange={() => handleToggleSelectTx(tx.id)}
                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                                title={`Select transaction #${tx.id}`}
                              />
                            </td>
                            {/* Transaction ID */}
                            <td>
                              <span className="badge badge-secondary" style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                                #{tx.id}
                              </span>
                            </td>

                            {/* Reseller Info */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img
                                  src={tx.reseller_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${tx.reseller_id}`}
                                  alt=""
                                  style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.86rem' }}>
                                    {tx.reseller_name || `Reseller #${tx.reseller_id}`}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                    Reseller ID: #{tx.reseller_id}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Buyer Info */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img
                                  src={tx.buyer_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${tx.buyer_id}`}
                                  alt=""
                                  style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(16, 185, 129, 0.4)' }}
                                />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span
                                      className="user-id-badge"
                                      style={{
                                        fontSize: '0.72rem',
                                        background: 'rgba(16, 185, 129, 0.12)',
                                        color: '#10b981',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                      }}
                                    >
                                      User #{tx.buyer_id}
                                    </span>
                                    <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.86rem' }}>
                                      {tx.buyer_name || `User #${tx.buyer_id}`}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{tx.buyer_email || `ID: #${tx.buyer_id}`}</span>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => setDetailsUserId(tx.buyer_id)}
                                      style={{ padding: '1px 6px', fontSize: '0.68rem', borderRadius: '4px' }}
                                    >
                                      Profile
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Coins Amount */}
                            <td>
                              <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.94rem' }}>
                                🪙 {tx.coin_amount?.toLocaleString() || 0}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Coins transferred</div>
                            </td>

                            {/* Price Paid */}
                            <td>
                              <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.92rem' }}>
                                ৳ {parseFloat(tx.price_amount || 0).toLocaleString()} {tx.currency || 'BDT'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Payment collected</div>
                            </td>

                            {/* Date and Time */}
                            <td>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600 }}>
                                {new Date(tx.created_at).toLocaleDateString()}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>

                            {/* Notes */}
                            <td>
                              <span style={{ fontSize: '0.78rem', color: tx.notes ? 'var(--text-main)' : 'var(--text-dim)', fontStyle: tx.notes ? 'normal' : 'italic' }}>
                                {tx.notes || 'No note'}
                              </span>
                            </td>

                            {/* Delete Single Transaction */}
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => setDeleteTxId(tx.id)}
                                title="Delete this transaction record"
                                style={{ padding: '4px 8px', borderRadius: '8px' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Pagination Bar for Transactions */}
                  <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <Pagination
                      currentPage={txPage}
                      totalPages={Math.ceil(txTotal / txPageSize) || 1}
                      totalItems={txTotal}
                      pageSize={txPageSize}
                      onPageChange={(p) => setTxPage(p)}
                      onPageSizeChange={(s) => {
                        setTxPageSize(s);
                        setTxPage(1);
                      }}
                      pageSizeOptions={[10, 15, 25, 50]}
                    />
                  </div>
                </div>
              )}

              <BulkActionBar
                selectedCount={selectedTxIds.length}
                totalCount={transactions.length}
                onSelectAll={() => handleToggleSelectAllTxs(transactions)}
                onDeselectAll={() => setSelectedTxIds([])}
                onBulkDelete={handleBulkDeleteTxs}
                isDeleting={bulkDeletingTxs}
                entityName="Transactions"
                actionLabel="Delete Selected Records"
              />
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ASSIGN RESELLER                                   */}
      {/* ======================================================== */}
      {assignModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="#7c3aed" />
                <span>Appoint Official Reseller</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setAssignModalOpen(false)}
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem', background: 'var(--bg-primary)', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                className={`btn ${assignMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, borderRadius: '8px', fontSize: '0.85rem' }}
                onClick={() => setAssignMode('existing')}
              >
                Promote Existing User
              </button>
              <button
                type="button"
                className={`btn ${assignMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, borderRadius: '8px', fontSize: '0.85rem' }}
                onClick={() => setAssignMode('new')}
              >
                Create New Reseller
              </button>
            </div>

            <form onSubmit={handleAssignReseller}>
              {assignMode === 'existing' ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Search User by ID:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. 5 or #5"
                        value={searchUserId}
                        onChange={(e) => setSearchUserId(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleSearchUserForAssign}
                        disabled={searchingUser || !searchUserId.trim()}
                      >
                        {searchingUser ? <Loader inline small /> : <Search size={15} />}
                        <span>Lookup</span>
                      </button>
                    </div>
                  </div>

                  {foundUser && (
                    <div
                      style={{
                        padding: '0.85rem',
                        borderRadius: '10px',
                        background: 'var(--bg-card-hover)',
                        border: '1px solid rgba(124, 58, 237, 0.3)',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={foundUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${foundUser.id}`}
                          alt=""
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{foundUser.full_name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                            ID: #{foundUser.id} • {foundUser.email}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        Selected
                      </span>
                    </div>
                  )}

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Set Initial Inventory Stock (Coins):
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      min="0"
                      value={initialCoins}
                      onChange={(e) => setInitialCoins(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Full Name: *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Dhaka Coins Agency"
                      value={newResellerData.full_name}
                      onChange={(e) => setNewResellerData({ ...newResellerData, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Login Email: *
                    </label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="reseller@example.com"
                      value={newResellerData.email}
                      onChange={(e) => setNewResellerData({ ...newResellerData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Login Password: *
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Enter strong password"
                      value={newResellerData.password}
                      onChange={(e) => setNewResellerData({ ...newResellerData, password: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Initial Stock Coins:
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      min="0"
                      value={newResellerData.initialCoins}
                      onChange={(e) => setNewResellerData({ ...newResellerData, initialCoins: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAssignModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingAssign || (assignMode === 'existing' && !foundUser)}>
                  {submittingAssign ? <Loader inline small /> : <CheckCircle size={16} />}
                  <span>Assign Reseller</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRM DELETE / DEMOTE RESELLER                         */}
      {/* ======================================================== */}
      {deleteConfirmReseller && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: '#f43f5e' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Revoke Reseller Status</h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Are you sure you want to demote <strong>{deleteConfirmReseller.full_name}</strong> (User #{deleteConfirmReseller.id}) back to regular user? Their reseller privileges will be revoked immediately.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmReseller(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteReseller} disabled={deletingReseller}>
                {deletingReseller ? <Loader inline small /> : <Trash2 size={16} />}
                <span>Revoke Reseller</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRM DELETE SINGLE TRANSACTION RECORD                */}
      {/* ======================================================== */}
      {deleteTxId && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: '#f43f5e' }}>
              <Trash2 size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Delete Transaction Record</h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Are you sure you want to delete transaction <strong>#{deleteTxId}</strong> from the records? This log will be permanently deleted.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTxId(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteSingleTx} disabled={deletingTx}>
                {deletingTx ? <Loader inline small /> : <Trash2 size={16} />}
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRM CLEAN / CLEAR TRANSACTIONS MODAL                 */}
      {/* ======================================================== */}
      {cleanConfirmModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: '#f43f5e' }}>
              <AlertTriangle size={26} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Clean Transaction History</h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              {viewingReseller || (selectedResellerId && selectedResellerId !== 'all') ? (
                <>
                  Are you sure you want to permanently clear all transaction logs for{' '}
                  <strong>Reseller #{viewingReseller ? viewingReseller.id : selectedResellerId}</strong>?
                </>
              ) : (
                <>
                  Are you sure you want to permanently clean <strong>ALL reseller transaction records</strong> across the entire system?
                </>
              )}
            </p>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#ef4444' }}>
              ⚠️ This will remove the audit log records from the database. This action cannot be undone.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setCleanConfirmModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleClearTransactions} disabled={cleaningTx}>
                {cleaningTx ? <Loader inline small /> : <Trash2 size={16} />}
                <span>Confirm & Clean</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
