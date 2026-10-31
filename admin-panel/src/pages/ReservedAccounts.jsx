import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookmarkCheck,
  Crown,
  Sparkles,
  Search,
  Plus,
  RefreshCw,
  UserCheck,
  UserX,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  Filter,
  X,
  HelpCircle,
  Lock,
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

  // Quick Pool Range Setup (e.g. ID 2 to 100 or 200)
  const [customPoolEnd, setCustomPoolEnd] = useState('100');
  const [configuringPool, setConfiguringPool] = useState(false);

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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Crown className="w-3 h-3 text-amber-400" />
            VIP
          </span>
        );
      case 'special':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Sparkles className="w-3 h-3 text-purple-400" />
            Special
          </span>
        );
      case 'agency_lead':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Shield className="w-3 h-3 text-blue-400" />
            Agency Lead
          </span>
        );
      case 'founder':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <BookmarkCheck className="w-3 h-3 text-emerald-400" />
            Founder
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
            System
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
            <BookmarkCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Reserved Accounts & VIP IDs
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Exclusive
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Preserve prestigious account IDs for VIPs, celebrities, and agency leaders. Allocate or swap account IDs seamlessly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchStats();
              fetchAccounts();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700/80 transition-all hover:border-slate-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-purple-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Reserve New ID(s)
          </button>
        </div>
      </div>

      {/* Quick Reserved Pool Config (IDs #2 to #100 / #200) */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 p-5 rounded-2xl border border-purple-500/30 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-lg shadow-purple-950/20">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm flex items-center gap-2">
              Reserved Pool Range Setup (Starts from ID #2)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Auto-Increment Guard
              </span>
            </h4>
            <p className="text-slate-400 text-xs mt-0.5">
              Set reserved VIP IDs from <strong className="text-amber-300 font-mono">#2</strong> up to <strong className="text-amber-300 font-mono">#{customPoolEnd || '100'}</strong>. Normal users will automatically start registering at <strong className="text-emerald-400 font-mono">#{(parseInt(customPoolEnd, 10) || 100) + 1}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-mono pl-1">2 to</span>
            <input
              type="number"
              min="3"
              max="2000"
              value={customPoolEnd}
              onChange={(e) => setCustomPoolEnd(e.target.value)}
              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-1">
            {['100', '200', '500'].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setCustomPoolEnd(val)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  customPoolEnd === val
                    ? 'bg-purple-600 text-white border-purple-500 shadow'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                }`}
              >
                {val}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={configuringPool}
            onClick={() => handleConfigurePool(customPoolEnd)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {configuringPool ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Set Range
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total Reserved IDs</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {loadingStats ? '—' : stats.total.toLocaleString()}
            </h3>
            <p className="text-slate-500 text-xs mt-1">In protection pool</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Available for Assignment</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">
              {loadingStats ? '—' : stats.available.toLocaleString()}
            </h3>
            <p className="text-slate-500 text-xs mt-1">Ready to be assigned to users</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Assigned & Active</p>
            <h3 className="text-2xl font-bold text-blue-400 mt-1">
              {loadingStats ? '—' : stats.assigned.toLocaleString()}
            </h3>
            <p className="text-slate-500 text-xs mt-1">Held by platform streamers</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All IDs' },
            { id: 'available', label: 'Available' },
            { id: 'assigned', label: 'Assigned' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full sm:w-auto bg-slate-950/60 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Categories</option>
            <option value="vip">VIP</option>
            <option value="special">Special</option>
            <option value="agency_lead">Agency Lead</option>
            <option value="founder">Founder</option>
            <option value="system">System</option>
          </select>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ID, user name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-purple-500 placeholder-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader size="lg" text="Loading reserved accounts..." />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <BookmarkCheck className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-lg font-semibold text-white">No Reserved Accounts Found</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
              No reserved accounts match your current filters. Click "Reserve New ID(s)" to add exclusive IDs to the pool.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Reserved ID</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned Holder</th>
                  <th className="py-3.5 px-4">Notes & Created</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {accounts.map((acc) => {
                  const isAssigned = acc.status === 'assigned';
                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Reserved ID */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                            #{acc.reserved_id}
                          </span>
                          <button
                            onClick={() => handleCopy(acc.reserved_id)}
                            title="Copy ID"
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                          >
                            {copiedId === acc.reserved_id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">{renderCategoryBadge(acc.category)}</td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isAssigned ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            Assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Available
                          </span>
                        )}
                      </td>

                      {/* Assigned Holder */}
                      <td className="py-4 px-4">
                        {isAssigned && acc.assigned_to_user_id ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={acc.assigned_user_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${acc.assigned_to_user_id}`}
                              alt={acc.assigned_user_name || 'User'}
                              className="w-9 h-9 rounded-full object-cover border border-purple-500/40 shadow-sm"
                            />
                            <div>
                              <div className="font-medium text-white flex items-center gap-1.5">
                                {acc.assigned_user_name || 'Umi User'}
                                <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {acc.assigned_user_role || 'user'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-mono">{acc.assigned_user_email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            — Open for assignment —
                          </span>
                        )}
                      </td>

                      {/* Notes & Created */}
                      <td className="py-4 px-4">
                        <p className="text-xs text-slate-300 font-medium truncate max-w-xs" title={acc.notes || ''}>
                          {acc.notes || '—'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {isAssigned && acc.assigned_at
                            ? `Assigned: ${new Date(acc.assigned_at).toLocaleDateString()}`
                            : `Added: ${new Date(acc.created_at).toLocaleDateString()}`}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAssigned ? (
                            <button
                              onClick={() => {
                                setSelectedRecord(acc);
                                setReleaseModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-all"
                            >
                              Release ID
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRecord(acc);
                                  setTargetUser(null);
                                  setUserSearchQuery('');
                                  setAssignNotes('');
                                  setAssignModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-medium shadow-sm transition-all flex items-center gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Assign to User
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRecord(acc);
                                  setDeleteModalOpen(true);
                                }}
                                title="Remove from pool"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
            <div>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-slate-300 font-semibold px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL 1: ADD RESERVED ID(S) ─────────────────────────────────── */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Plus className="w-5 h-5 text-purple-400" />
                Reserve Account ID(s)
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {/* Mode Toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Reservation Mode
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAddMode('single')}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                      addMode === 'single'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Single VIP ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode('range')}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                      addMode === 'range'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Bulk Range (e.g. 1001-1050)
                  </button>
                </div>
              </div>

              {/* ID Input */}
              {addMode === 'single' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Account ID to Reserve *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 777777, 888888, 1001"
                    value={singleId}
                    onChange={(e) => setSingleId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    This ID will be protected and can only be allocated via Admin Panel.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                      Start ID *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="1001"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                      End ID *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="1050"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Category Tier
                </label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
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
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reserved for Tier 1 Bangladesh Agencies"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ASSIGN RESERVED ID TO USER ─────────────────────────── */}
      {assignModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-purple-950/40 to-slate-900 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-400" />
                  Assign VIP ID #{selectedRecord.reserved_id}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Permanently upgrades a user's account ID to this prestigious number.
                </p>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-5">
              {/* Target ID Banner */}
              <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold block">
                    Target Reserved ID
                  </span>
                  <span className="font-mono text-2xl font-black text-amber-300">
                    #{selectedRecord.reserved_id}
                  </span>
                </div>
                <div>{renderCategoryBadge(selectedRecord.category)}</div>
              </div>

              {/* User Search Input */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Search & Select Target User *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by User ID (#100543), Name, or Email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-purple-500"
                  />
                  {searchingUsers && (
                    <RefreshCw className="w-4 h-4 text-purple-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {userSearchResults.length > 0 && !targetUser && (
                  <div className="mt-2 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 max-h-48 overflow-y-auto">
                    {userSearchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setTargetUser(u);
                          setUserSearchResults([]);
                          setUserSearchQuery('');
                        }}
                        className="w-full text-left p-3 hover:bg-slate-800/60 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                            alt={u.full_name || 'User'}
                            className="w-8 h-8 rounded-full object-cover border border-purple-500/30"
                          />
                          <div>
                            <p className="text-sm font-semibold text-white">{u.full_name || 'Umi User'}</p>
                            <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          #{u.id}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Target User Card */}
              {targetUser ? (
                <div className="bg-slate-950 border border-purple-500/40 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={targetUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.id}`}
                      alt={targetUser.full_name || 'User'}
                      className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{targetUser.full_name || 'Umi User'}</span>
                        <span className="font-mono text-xs text-purple-400 bg-purple-500/15 px-1.5 py-0.5 rounded">
                          Currently #{targetUser.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">{targetUser.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Coins: {targetUser.coins?.toLocaleString() || 0} • Diamonds: {targetUser.diamonds?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTargetUser(null)}
                    className="text-xs text-slate-400 hover:text-red-400 p-1.5 rounded-lg border border-slate-800 hover:border-red-500/30"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500">
                  Search above and select a user to proceed.
                </div>
              )}

              {/* Seamless Migration Info Alert */}
              <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-200">
                <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Zero Data Loss Guarantee:</strong> All followers, diamonds, coins, live room history, chat messages, active gifts, and privilege subscriptions will be atomically linked to VIP ID #{selectedRecord.reserved_id}.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Assignment Note / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Granted for Top Host Creator Award"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetUser || assigning}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {assigning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: RELEASE RESERVED ID ─────────────────────────────────── */}
      {releaseModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Release Reserved ID #{selectedRecord.reserved_id}
              </div>
              <button
                onClick={() => setReleaseModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-300">
                Are you sure you want to release Reserved ID{' '}
                <strong className="text-amber-300 font-mono">#{selectedRecord.reserved_id}</strong>?
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-200">
                The current user holding this ID will be automatically allocated a regular system ID (e.g. #100000+), preserving all their coins, diamonds, and history. The reserved VIP ID will return to the Available pool for re-assignment.
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReleaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReleaseSubmit}
                  disabled={releasing}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {releasing ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  Release to Available Pool
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: DELETE RESERVED ID ──────────────────────────────────── */}
      {deleteModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Trash2 className="w-5 h-5 text-red-400" />
                Remove Reserved ID
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-300">
                Are you sure you want to permanently remove Reserved ID{' '}
                <strong className="text-red-300 font-mono">#{selectedRecord.reserved_id}</strong> from the reservation pool?
              </p>
              <p className="text-xs text-slate-400">
                Once deleted, this ID is no longer guarded by the reservation system.
              </p>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
