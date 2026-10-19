import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  UserX,
  UserCheck,
  Eye,
  Trash2,
  Clock,
  Radio,
  FileText,
  Check,
  X,
  MessageSquare,
  Smartphone,
  User,
  Shield,
  Layers,
  CheckSquare,
  Square,
  AlertOctagon,
  Info,
} from 'lucide-react';
import { reportApi } from '../api/reportApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';

export default function Reports({ onToast }) {
  const [reports, setReports] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    investigating: 0,
    resolved: 0,
    dismissed: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View mode: 'grouped' (Grouped by reported offender) | 'all' (Individual reports log)
  const [viewMode, setViewMode] = useState('grouped');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Single Report Details Modal (for 'all' view)
  const [selectedReport, setSelectedReport] = useState(null);

  // Offender Full Investigation Modal (with all reporters listed)
  const [selectedOffenderData, setSelectedOffenderData] = useState(null);
  const [offenderLoading, setOffenderLoading] = useState(false);
  const [modalAdminNotes, setModalAdminNotes] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Ban Configuration Modal
  const [banModalReport, setBanModalReport] = useState(null);
  const [banType, setBanType] = useState('both'); // 'both' | 'account' | 'device'
  const [banNotes, setBanNotes] = useState('');
  const [banSubmitting, setBanSubmitting] = useState(false);

  // Unban Configuration Modal
  const [unbanModalReport, setUnbanModalReport] = useState(null);
  const [unbanType, setUnbanType] = useState('both'); // 'both' | 'account' | 'device'
  const [unbanSubmitting, setUnbanSubmitting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch reports with pagination & filters
  const fetchReports = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await reportApi.getReports({
        status: statusFilter,
        search: debouncedSearch,
        page: pagination.page,
        limit: pagination.limit,
        view: viewMode,
      });

      if (res && res.success) {
        setReports(res.reports || []);
        if (res.counts) setCounts(res.counts);
        if (res.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: res.pagination.total,
            totalPages: res.pagination.totalPages,
          }));
        }
      } else {
        if (onToast) onToast(res?.message || 'Failed to load reports', 'error');
      }
    } catch (err) {
      console.error('fetchReports error:', err);
      if (onToast) onToast('Failed to connect to backend reports service', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, debouncedSearch, pagination.page, pagination.limit, viewMode, onToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Open Offender Full Investigation Modal
  const openOffenderModal = async (target) => {
    const userId = target.reported_id;
    if (!userId) return;
    setOffenderLoading(true);
    setSelectedOffenderData(null);
    try {
      const res = await reportApi.getOffenderReports(userId);
      if (res && res.success) {
        setSelectedOffenderData(res);
        setModalAdminNotes(res.reports?.[0]?.admin_notes || '');
      } else {
        if (onToast) onToast(res?.message || 'Failed to load offender reports', 'error');
      }
    } catch (err) {
      console.error('getOffenderReports error:', err);
      if (onToast) onToast('Failed to connect to backend', 'error');
    } finally {
      setOffenderLoading(false);
    }
  };

  // Change individual report status inside offender modal
  const handleOffenderReportStatusChange = async (reportId, newStatus) => {
    try {
      const res = await reportApi.updateReportStatus(reportId, { status: newStatus });
      if (res && res.success) {
        setSelectedOffenderData((prev) => {
          if (!prev) return prev;
          const updatedReports = prev.reports.map((r) =>
            r.id === reportId ? { ...r, status: newStatus } : r
          );
          return { ...prev, reports: updatedReports };
        });
        fetchReports(true);
        if (onToast) onToast(`Report #${reportId} status updated to ${newStatus}`, 'success');
      }
    } catch (err) {
      if (onToast) onToast('Failed to update report status', 'error');
    }
  };

  // Resolve all reports for this offender
  const handleResolveAllOffenderReports = async (reportsList) => {
    if (!reportsList || reportsList.length === 0) return;
    try {
      setModalLoading(true);
      for (const r of reportsList) {
        if (r.status !== 'resolved') {
          await reportApi.updateReportStatus(r.id, { status: 'resolved' });
        }
      }
      setSelectedOffenderData((prev) => {
        if (!prev) return prev;
        const updatedReports = prev.reports.map((r) => ({ ...r, status: 'resolved' }));
        return { ...prev, reports: updatedReports };
      });
      fetchReports(true);
      if (onToast) onToast('All complaints for this user marked as resolved', 'success');
    } catch (err) {
      if (onToast) onToast('Failed to resolve all reports', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Save admin notes across offender reports
  const handleSaveOffenderNotes = async (reportsList) => {
    if (!reportsList || reportsList.length === 0) return;
    try {
      setModalLoading(true);
      for (const r of reportsList) {
        await reportApi.updateReportStatus(r.id, { admin_notes: modalAdminNotes });
      }
      setSelectedOffenderData((prev) => {
        if (!prev) return prev;
        const updatedReports = prev.reports.map((r) => ({ ...r, admin_notes: modalAdminNotes }));
        return { ...prev, reports: updatedReports };
      });
      fetchReports(true);
      if (onToast) onToast('Admin notes saved for this investigation', 'success');
    } catch (err) {
      if (onToast) onToast('Failed to save admin notes', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Quick Status Change on Row (for 'all' view)
  const handleStatusChange = async (reportId, newStatus) => {
    try {
      const res = await reportApi.updateReportStatus(reportId, { status: newStatus });
      if (res && res.success) {
        if (onToast) onToast(res.message || 'Status updated', 'success');
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
        );
        fetchReports(true);
        if (selectedReport && selectedReport.id === reportId) {
          setSelectedReport((prev) => ({ ...prev, status: newStatus }));
        }
      } else {
        if (onToast) onToast(res?.message || 'Failed to update status', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Network error updating status', 'error');
    }
  };

  // Open Ban Modal
  const openBanModal = (report) => {
    setBanModalReport(report);
    setBanType('both');
    setBanNotes(report.admin_notes || `Banned for violations: ${report.reasons_summary || report.reason || 'Community guidelines violation'}`);
  };

  // Execute Ban from Ban Modal
  const handleExecuteBan = async () => {
    if (!banModalReport) return;
    const targetReportId = banModalReport.id || (banModalReport.report_ids ? parseInt(banModalReport.report_ids.split(',')[0], 10) : 0);
    try {
      setBanSubmitting(true);
      const res = await reportApi.takeReportAction(targetReportId, {
        action: 'ban',
        banType,
        admin_notes: banNotes,
        userId: banModalReport.reported_id,
      });

      if (res && res.success) {
        if (onToast) onToast(res.message, 'success');
        fetchReports(true);
        setBanModalReport(null);
        if (selectedOffenderData && selectedOffenderData.offender.reported_id === banModalReport.reported_id) {
          setSelectedOffenderData((prev) => ({
            ...prev,
            offender: {
              ...prev.offender,
              reported_is_banned: banType === 'device' ? prev.offender.reported_is_banned : 1,
            },
            reports: prev.reports.map((r) => ({ ...r, status: 'resolved' })),
          }));
        }
        if (selectedReport && selectedReport.reported_id === banModalReport.reported_id) {
          setSelectedReport((prev) => ({
            ...prev,
            status: 'resolved',
            reported_is_banned: banType === 'device' ? prev.reported_is_banned : 1,
            admin_notes: banNotes,
          }));
        }
      } else {
        if (onToast) onToast(res?.message || 'Failed to ban user', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Network error executing ban', 'error');
    } finally {
      setBanSubmitting(false);
    }
  };

  // Open Unban Modal
  const openUnbanModal = (report) => {
    setUnbanModalReport(report);
    setUnbanType('both');
  };

  // Execute Unban
  const handleExecuteUnban = async () => {
    if (!unbanModalReport) return;
    const targetReportId = unbanModalReport.id || (unbanModalReport.report_ids ? parseInt(unbanModalReport.report_ids.split(',')[0], 10) : 0);
    try {
      setUnbanSubmitting(true);
      const res = await reportApi.takeReportAction(targetReportId, {
        action: 'unban',
        unbanType,
        userId: unbanModalReport.reported_id,
      });

      if (res && res.success) {
        if (onToast) onToast(res.message, 'success');
        fetchReports(true);
        setUnbanModalReport(null);
        if (selectedOffenderData && selectedOffenderData.offender.reported_id === unbanModalReport.reported_id) {
          setSelectedOffenderData((prev) => ({
            ...prev,
            offender: {
              ...prev.offender,
              reported_is_banned: unbanType === 'device' ? prev.offender.reported_is_banned : 0,
            },
          }));
        }
        if (selectedReport && selectedReport.reported_id === unbanModalReport.reported_id) {
          setSelectedReport((prev) => ({
            ...prev,
            reported_is_banned: unbanType === 'device' ? prev.reported_is_banned : 0,
          }));
        }
      } else {
        if (onToast) onToast(res?.message || 'Failed to unban user', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Network error executing unban', 'error');
    } finally {
      setUnbanSubmitting(false);
    }
  };

  // Single Delete Report or All Reports for an Offender
  const handleDeleteReport = async (item) => {
    const rawIds = item.report_ids
      ? item.report_ids.split(',').map((id) => parseInt(id.trim(), 10)).filter(Boolean)
      : [item.id || item];
    const isGroup = viewMode === 'grouped' && rawIds.length > 1;
    const confirmMsg = isGroup
      ? `Permanently delete all ${rawIds.length} report(s) filed against ${item.reported_name || 'this user'}?`
      : `Permanently delete report #${rawIds[0]}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await reportApi.bulkDeleteReports(rawIds);
      if (res && res.success) {
        if (onToast) onToast('Report record(s) deleted successfully.', 'success');
        fetchReports(true);
        if (selectedOffenderData && selectedOffenderData.offender.reported_id === item.reported_id) {
          setSelectedOffenderData(null);
        }
        if (selectedReport && rawIds.includes(selectedReport.id)) {
          setSelectedReport(null);
        }
      } else {
        if (onToast) onToast(res?.message || 'Failed to delete report', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Network error deleting report', 'error');
    }
  };

  // Bulk Delete Selected Reports
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    let allReportIds = [];
    if (viewMode === 'grouped') {
      const selectedRows = reports.filter((r) => selectedIds.includes(r.reported_id));
      for (const row of selectedRows) {
        if (row.report_ids) {
          const ids = row.report_ids.split(',').map((id) => parseInt(id.trim(), 10)).filter(Boolean);
          allReportIds.push(...ids);
        } else if (row.id) {
          allReportIds.push(row.id);
        }
      }
    } else {
      allReportIds = selectedIds;
    }

    if (allReportIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${allReportIds.length} report record(s)?`)) return;

    try {
      setBulkProcessing(true);
      const res = await reportApi.bulkDeleteReports(allReportIds);
      if (res && res.success) {
        if (onToast) onToast(res.message || 'Reports deleted successfully', 'success');
        setSelectedIds([]);
        fetchReports();
      } else {
        if (onToast) onToast(res?.message || 'Failed to bulk delete reports', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Network error during bulk delete', 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Toggle Single Selection
  const toggleSelectId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select All on current page
  const toggleSelectAll = () => {
    if (reports.length === 0) return;
    const currentIds = reports.map((r) => (viewMode === 'grouped' ? r.reported_id : r.id));
    const allSelected = currentIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  // Open Details Modal (for 'all' view)
  const openDetails = (report) => {
    setSelectedReport(report);
    setModalAdminNotes(report.admin_notes || '');
  };

  // Save Modal Notes
  const handleSaveNotes = async () => {
    if (!selectedReport) return;
    try {
      setModalLoading(true);
      const res = await reportApi.updateReportStatus(selectedReport.id, {
        admin_notes: modalAdminNotes,
      });
      if (res && res.success) {
        if (onToast) onToast('Admin notes saved successfully', 'success');
        setSelectedReport((prev) => ({ ...prev, admin_notes: modalAdminNotes }));
        setReports((prev) =>
          prev.map((r) => (r.id === selectedReport.id ? { ...r, admin_notes: modalAdminNotes } : r))
        );
      } else {
        if (onToast) onToast(res?.message || 'Failed to save notes', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Network error saving notes', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const getReasonBadgeStyle = (reason = '') => {
    const r = reason.toLowerCase();
    if (r.includes('harass') || r.includes('abuse') || r.includes('bully')) {
      return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.25)' };
    }
    if (r.includes('spam') || r.includes('scam') || r.includes('fraud')) {
      return { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)' };
    }
    if (r.includes('nudity') || r.includes('inappropriate') || r.includes('porn')) {
      return { bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.25)' };
    }
    if (r.includes('fake') || r.includes('impersonat')) {
      return { bg: 'rgba(14, 165, 233, 0.12)', text: '#0ea5e9', border: 'rgba(14, 165, 233, 0.25)' };
    }
    if (r.includes('room') || r.includes('stream') || r.includes('live')) {
      return { bg: 'rgba(236, 72, 153, 0.12)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.25)' };
    }
    return { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748b', border: 'rgba(100, 116, 139, 0.25)' };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 6px #ef4444',
              }}
            />
            Pending Review
          </span>
        );
      case 'investigating':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <Clock size={12} />
            In Review
          </span>
        );
      case 'resolved':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <CheckCircle2 size={12} />
            Resolved
          </span>
        );
      case 'dismissed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(100, 116, 139, 0.15)',
              color: '#64748b',
              border: '1px solid rgba(100, 116, 139, 0.3)',
            }}
          >
            <XCircle size={12} />
            Dismissed
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const isAllPageSelected =
    reports.length > 0 &&
    reports.every((r) => selectedIds.includes(viewMode === 'grouped' ? r.reported_id : r.id));

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(239, 68, 68, 0.25)',
                color: '#fff',
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-color)' }}>
                User Moderation & Reports
              </h1>
              <p style={{ margin: '2px 0 0 0', color: 'var(--text-dim)', fontSize: '0.88rem' }}>
                Review community violation complaints, manage report records, and enforce Device Bans or Account Bans.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="action-btn"
            onClick={() => fetchReports(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Total Reports */}
        <div
          className="dashboard-card"
          style={{
            padding: '1.2rem',
            borderRadius: '14px',
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Reports</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-color)' }}>
              {counts.total}
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={22} />
          </div>
        </div>

        {/* Pending Review */}
        <div
          className="dashboard-card"
          style={{
            padding: '1.2rem',
            borderRadius: '14px',
            background: 'var(--surface-color)',
            border: counts.pending > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Pending Review
              {counts.pending > 0 && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              )}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#ef4444' }}>
              {counts.pending}
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* In Review / Investigating */}
        <div
          className="dashboard-card"
          style={{
            padding: '1.2rem',
            borderRadius: '14px',
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Under Investigation</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#f59e0b' }}>
              {counts.investigating}
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={22} />
          </div>
        </div>

        {/* Resolved */}
        <div
          className="dashboard-card"
          style={{
            padding: '1.2rem',
            borderRadius: '14px',
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Resolved Actions</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>
              {counts.resolved}
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* View Mode Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
          <button
            type="button"
            onClick={() => {
              setViewMode('grouped');
              setSelectedIds([]);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: viewMode === 'grouped' ? '#ffffff' : 'transparent',
              color: viewMode === 'grouped' ? '#7c3aed' : 'var(--text-dim)',
              boxShadow: viewMode === 'grouped' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <UserX size={15} />
            Grouped by User (Offenders)
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('all');
              setSelectedIds([]);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: viewMode === 'all' ? '#ffffff' : 'transparent',
              color: viewMode === 'all' ? '#7c3aed' : 'var(--text-dim)',
              boxShadow: viewMode === 'all' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={15} />
            All Individual Reports Log
          </button>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
          {viewMode === 'grouped'
            ? 'Viewing grouped queue prioritized by reported offender'
            : 'Viewing raw chronological stream of all individual complaints'}
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div
        style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All Reports', count: counts.total },
            { key: 'pending', label: 'Pending', count: counts.pending, color: '#ef4444' },
            { key: 'investigating', label: 'In Review', count: counts.investigating, color: '#f59e0b' },
            { key: 'resolved', label: 'Resolved', count: counts.resolved, color: '#10b981' },
            { key: 'dismissed', label: 'Dismissed', count: counts.dismissed },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #7c3aed' : '1px solid var(--border-color)',
                  background: isActive ? 'rgba(124, 58, 237, 0.12)' : 'transparent',
                  color: isActive ? '#7c3aed' : 'var(--text-color)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '1px 6px',
                      borderRadius: '12px',
                      background: isActive ? '#7c3aed' : 'var(--border-color)',
                      color: isActive ? '#fff' : 'var(--text-dim)',
                      fontWeight: 700,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px', flex: '1', maxWidth: '450px' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-dim)',
              }}
            />
            <input
              type="text"
              placeholder="Search reporter, reported user, reason, room..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.3rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-color)',
                color: 'var(--text-color)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (when reports are checked) */}
      {selectedIds.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(239, 68, 68, 0.08) 100%)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 700 }}>
            <span
              style={{
                background: '#7c3aed',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '8px',
                fontSize: '0.8rem',
              }}
            >
              {selectedIds.length}
            </span>
            <span>Report(s) selected</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkProcessing}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={14} />
              {bulkProcessing ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              style={{
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-dim)',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Reports Table Card */}
      <div
        style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }}
      >
        {loading ? (
          <div style={{ padding: '3.5rem 1rem', display: 'flex', justifyContent: 'center' }}>
            <Loader />
          </div>
        ) : reports.length === 0 ? (
          <div
            style={{
              padding: '4rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={30} />
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)' }}>
              All Clear! No Reports Found
            </div>
            <p style={{ color: 'var(--text-dim)', maxWidth: '400px', margin: 0, fontSize: '0.88rem' }}>
              {statusFilter !== 'all' || debouncedSearch
                ? 'No reports match your current filter or search criteria.'
                : 'There are currently no active violation or abuse reports from users.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--table-header-bg, rgba(0,0,0,0.02))',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-dim)',
                    fontSize: '0.78rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <th style={{ padding: '12px 14px', width: '40px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)', padding: 0 }}
                      title={isAllPageSelected ? 'Deselect All' : 'Select All'}
                    >
                      {isAllPageSelected ? <CheckSquare size={17} color="#7c3aed" /> : <Square size={17} />}
                    </button>
                  </th>
                  {viewMode === 'grouped' ? (
                    <>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Reported Offender</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Total Reports</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Latest Report Time</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Ban Option</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '12px 12px', fontWeight: 700 }}>ID</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Reported Offender & Devices</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Reporter</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Reason & Source</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Complaint Snippet</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Submitted</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Ban Option</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                    </>
                  )}
                </tr>
              </thead>
                            <tbody>
                {reports.map((report) => {
                  if (viewMode === 'grouped') {
                    const isSelected = selectedIds.includes(report.reported_id);
                    const isReportedBanned = report.reported_is_banned === 1 || report.reported_is_banned === true;
                    const devicesCount = Number(report.reported_devices_count) || 0;
                    const bannedDevCount = Number(report.reported_banned_devices_count) || 0;
                    const totalReportsCount = Number(report.total_reports_count) || 1;
                    const pendingCount = Number(report.pending_reports_count) || 0;
                    const reasonsList = report.reasons_summary
                      ? report.reasons_summary.split(',').map((s) => s.trim()).filter(Boolean)
                      : [];
                    const reportDate = report.latest_report_time || report.created_at;

                    return (
                      <tr
                        key={report.reported_id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(124, 58, 237, 0.04)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                        className="table-row-hover"
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => toggleSelectId(report.reported_id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            {isSelected ? <CheckSquare size={17} color="#7c3aed" /> : <Square size={17} color="var(--text-dim)" />}
                          </button>
                        </td>

                        {/* Reported Offender (User ID, Name, Avatar, Devices) */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ position: 'relative', width: '42px', height: '42px', flexShrink: 0 }}>
                              {report.reported_avatar ? (
                                <img
                                  src={report.reported_avatar}
                                  alt={report.reported_name || 'Offender'}
                                  style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: isReportedBanned ? '2px solid #ef4444' : '2px solid var(--border-color)',
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    background: 'rgba(124, 58, 237, 0.1)',
                                    color: '#7c3aed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    border: isReportedBanned ? '2px solid #ef4444' : '2px solid var(--border-color)',
                                  }}
                                >
                                  <User size={20} />
                                </div>
                              )}
                              {isReportedBanned && (
                                <span
                                  title="Account Banned"
                                  style={{
                                    position: 'absolute',
                                    bottom: '-2px',
                                    right: '-2px',
                                    background: '#ef4444',
                                    color: '#fff',
                                    borderRadius: '50%',
                                    width: '16px',
                                    height: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '9px',
                                    fontWeight: 800,
                                  }}
                                >
                                  ✕
                                </span>
                              )}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                                  {report.reported_name || 'Anonymous User'}
                                </span>
                                <span
                                  style={{
                                    background: 'var(--badge-bg, rgba(0,0,0,0.06))',
                                    color: 'var(--text-dim)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.74rem',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                  }}
                                >
                                  ID: {report.reported_id}
                                </span>
                                {isReportedBanned && (
                                  <span
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.12)',
                                      color: '#ef4444',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                    }}
                                  >
                                    BANNED
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                {report.reported_role && (
                                  <span style={{ textTransform: 'capitalize', color: report.reported_role === 'host' ? '#a855f7' : report.reported_role === 'reseller' ? '#0ea5e9' : 'var(--text-dim)' }}>
                                    ● {report.reported_role}
                                  </span>
                                )}
                                {report.reported_level ? <span>Lv. {report.reported_level}</span> : null}
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Smartphone size={12} />
                                  {devicesCount} {devicesCount === 1 ? 'device' : 'devices'}
                                </span>
                                {bannedDevCount > 0 && (
                                  <span style={{ color: '#ef4444', fontWeight: 700 }}>({bannedDevCount} banned)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Total Reports Count & Breakdown */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  fontSize: '0.78rem',
                                  background: totalReportsCount > 1 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                  color: totalReportsCount > 1 ? '#ef4444' : '#f59e0b',
                                  border: totalReportsCount > 1 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                                }}
                              >
                                <ShieldAlert size={13} />
                                {totalReportsCount} {totalReportsCount === 1 ? 'Report' : 'Reports'}
                              </span>
                              {pendingCount > 0 && (
                                <span
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#d97706',
                                  }}
                                >
                                  {pendingCount} Pending
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                              by {report.reporters_count || 1} distinct {(report.reporters_count || 1) === 1 ? 'user' : 'users'}
                            </div>
                            {reasonsList.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                                {reasonsList.slice(0, 2).map((reason, idx) => {
                                  const rStyle = getReasonBadgeStyle(reason);
                                  return (
                                    <span
                                      key={idx}
                                      style={{
                                        fontSize: '0.7rem',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        background: rStyle.bg,
                                        color: rStyle.text,
                                        border: `1px solid ${rStyle.border}`,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {reason}
                                    </span>
                                  );
                                })}
                                {reasonsList.length > 2 && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                    +{reasonsList.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Latest Report Time */}
                        <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={13} color="var(--text-dim)" />
                            {new Date(reportDate).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: '0.74rem', marginTop: '2px', color: 'var(--text-dim)' }}>
                            {new Date(reportDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px' }}>
                          {getStatusBadge(pendingCount > 0 ? 'pending' : (report.status || 'resolved'))}
                        </td>

                        {/* Ban Option Button */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {isReportedBanned ? (
                            <button
                              type="button"
                              title="Unban this user (Account / Device)"
                              onClick={() => openUnbanModal(report)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)',
                              }}
                            >
                              <UserCheck size={14} />
                              Unban User
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="Ban this user (Choose Account or Device Ban)"
                              onClick={() => openBanModal(report)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <UserX size={14} />
                              Ban User...
                            </button>
                          )}
                        </td>

                        {/* Actions: Details & Delete */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              title="Inspect all reports & reporters against this user"
                              onClick={() => openOffenderModal(report)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: 'rgba(124, 58, 237, 0.12)',
                                color: '#7c3aed',
                                border: '1px solid rgba(124, 58, 237, 0.25)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <Eye size={14} />
                              Details ({totalReportsCount})
                            </button>
                            <button
                              type="button"
                              title="Delete report records"
                              onClick={() => handleDeleteReport(report.report_ids || report.id)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '8px',
                                background: 'transparent',
                                color: 'var(--text-dim)',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // Fallback / View Mode 'all' (Single Report Logs)
                  const reasonStyle = getReasonBadgeStyle(report.reason);
                  const isReportedBanned = report.reported_is_banned === 1 || report.reported_is_banned === true;
                  const isSelected = selectedIds.includes(report.id);
                  const devicesCount = Number(report.reported_devices_count) || 0;
                  const bannedDevCount = Number(report.reported_banned_devices_count) || 0;

                  return (
                    <tr
                      key={report.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(124, 58, 237, 0.04)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      className="table-row-hover"
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => toggleSelectId(report.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          {isSelected ? <CheckSquare size={17} color="#7c3aed" /> : <Square size={17} color="var(--text-dim)" />}
                        </button>
                      </td>

                      {/* ID */}
                      <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--text-dim)' }}>
                        #{report.id}
                      </td>

                      {/* Reported User (Offender) + Device Info */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ position: 'relative' }}>
                            {report.reported_avatar ? (
                              <img
                                src={report.reported_avatar}
                                alt={report.reported_name}
                                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  background: 'rgba(124, 58, 237, 0.1)',
                                  color: '#7c3aed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                }}
                              >
                                {report.reported_name ? report.reported_name.charAt(0).toUpperCase() : '?'}
                              </div>
                            )}
                            {isReportedBanned && (
                              <span
                                title="Account Banned"
                                style={{
                                  position: 'absolute',
                                  bottom: '-2px',
                                  right: '-2px',
                                  background: '#ef4444',
                                  color: '#fff',
                                  borderRadius: '50%',
                                  width: '15px',
                                  height: '15px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '9px',
                                  fontWeight: 800,
                                }}
                              >
                                ✕
                              </span>
                            )}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>
                                {report.reported_name || 'User #' + report.reported_id}
                              </span>
                              {isReportedBanned && (
                                <span
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    color: '#ef4444',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  BANNED
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span>ID: {report.reported_id}</span>
                              <span>•</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                <Smartphone size={11} />
                                {devicesCount} {devicesCount === 1 ? 'dev' : 'devs'}
                              </span>
                              {bannedDevCount > 0 && (
                                <span style={{ color: '#ef4444', fontWeight: 600 }}>({bannedDevCount} banned)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Reporter Info */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {report.reporter_avatar ? (
                            <img
                              src={report.reporter_avatar}
                              alt={report.reporter_name}
                              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                color: 'var(--text-dim)',
                              }}
                            >
                              {report.reporter_name ? report.reporter_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '0.84rem' }}>
                              {report.reporter_name || 'User #' + report.reporter_id}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              ID: {report.reporter_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Reason & Source */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: reasonStyle.bg,
                              color: reasonStyle.text,
                              border: `1px solid ${reasonStyle.border}`,
                              width: 'fit-content',
                            }}
                          >
                            {report.reason || 'Other'}
                          </span>
                          {report.room_id && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: '#ec4899',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Radio size={11} /> Room #{report.room_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Complaint Snippet */}
                      <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: report.description ? 'var(--text-color)' : 'var(--text-dim)',
                            fontStyle: report.description ? 'normal' : 'italic',
                            fontSize: '0.82rem',
                          }}
                          title={report.description || 'No complaint text provided'}
                        >
                          {report.description || 'No description provided'}
                        </div>
                        {report.admin_notes && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: '#7c3aed',
                              marginTop: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <FileText size={10} /> Note: {report.admin_notes}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        {getStatusBadge(report.status)}
                      </td>

                      {/* Submitted Date */}
                      <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        <div>{new Date(report.created_at).toLocaleDateString()}</div>
                        <div>{new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>

                      {/* Ban Option Button */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {isReportedBanned ? (
                          <button
                            type="button"
                            title="Unban this user (Account / Device)"
                            onClick={() => openUnbanModal(report)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '8px',
                              background: '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <UserCheck size={13} />
                            Unban
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Ban User (Choose Account or Device Ban)"
                            onClick={() => openBanModal(report)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '8px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <UserX size={13} />
                            Ban...
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            title="Inspect Full Report"
                            onClick={() => openDetails(report)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: 'rgba(124, 58, 237, 0.1)',
                              color: '#7c3aed',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Eye size={13} />
                            Details
                          </button>

                          {/* Delete Single Report */}
                          <button
                            type="button"
                            title="Delete Report Record"
                            onClick={() => handleDeleteReport(report.id)}
                            style={{
                              padding: '6px',
                              borderRadius: '8px',
                              background: 'transparent',
                              color: 'var(--text-dim)',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Integrated Pagination Footer with Page Size Selector */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
            onPageSizeChange={(sz) => setPagination((prev) => ({ ...prev, limit: sz, page: 1 }))}
            pageSizeOptions={[10, 15, 25, 50, 100]}
          />
        </div>
      </div>

      {/* ========================================================
          BAN CONFIGURATION MODAL (DEVICE BAN vs ACCOUNT BAN)
          ======================================================== */}
      {banModalReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={() => setBanModalReport(null)}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              padding: '1.75rem',
              color: 'var(--text-main)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertOctagon size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Enforce Ban: {banModalReport.reported_name}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Report #{banModalReport.id} • Reason: {banModalReport.reason}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBanModalReport(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Offender Info Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0.85rem',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                marginBottom: '1.25rem',
              }}
            >
              <img
                src={banModalReport.reported_avatar}
                alt={banModalReport.reported_name}
                style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {banModalReport.reported_name} (ID: {banModalReport.reported_id})
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Smartphone size={12} />
                  <span>
                    {banModalReport.reported_devices_count || 0} Registered Mobile Device(s)
                    {banModalReport.reported_device_models ? ` (${banModalReport.reported_device_models})` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Choose Ban Type (Interactive Radio Cards) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
                Select Ban Scope:
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* 1. Both (Recommended) */}
                <div
                  onClick={() => setBanType('both')}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: banType === 'both' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                    background: banType === 'both' ? 'rgba(239, 68, 68, 0.06)' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="banType"
                    checked={banType === 'both'}
                    onChange={() => setBanType('both')}
                    style={{ marginTop: '3px', accentColor: '#ef4444' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} />
                      Full Blacklist (Both Account & Hardware Device Ban)
                      <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '6px', background: '#ef4444', color: '#fff', fontWeight: 800 }}>
                        RECOMMENDED
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '2px', lineHeight: 1.4 }}>
                      Suspends this user account AND bans all physical mobile device hardware IDs. The offender cannot log in or register new accounts from this phone.
                    </div>
                  </div>
                </div>

                {/* 2. Device Ban Only */}
                <div
                  onClick={() => setBanType('device')}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: banType === 'device' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                    background: banType === 'device' ? 'rgba(245, 158, 11, 0.08)' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="banType"
                    checked={banType === 'device'}
                    onChange={() => setBanType('device')}
                    style={{ marginTop: '3px', accentColor: '#f59e0b' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Smartphone size={14} />
                      Hardware Device Ban Only (Device Ban)
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '2px', lineHeight: 1.4 }}>
                      Bans the physical phone/hardware ID. Blocks any app access on this specific device while keeping the user account active for appeal.
                    </div>
                  </div>
                </div>

                {/* 3. Account Ban Only */}
                <div
                  onClick={() => setBanType('account')}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: banType === 'account' ? '2px solid #7c3aed' : '1px solid var(--border-color)',
                    background: banType === 'account' ? 'rgba(124, 58, 237, 0.06)' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="banType"
                    checked={banType === 'account'}
                    onChange={() => setBanType('account')}
                    style={{ marginTop: '3px', accentColor: '#7c3aed' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} />
                      Account Ban Only (Account Ban)
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '2px', lineHeight: 1.4 }}>
                      Suspends this user account only. Does not blacklist hardware IDs (other accounts on this device remain usable).
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ban Reason / Admin Notes */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                Ban Reason / Admin Record:
              </label>
              <textarea
                rows={2}
                value={banNotes}
                onChange={(e) => setBanNotes(e.target.value)}
                placeholder="Specify violation reason or investigation findings..."
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setBanModalReport(null)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBan}
                disabled={banSubmitting}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '10px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <UserX size={15} />
                {banSubmitting ? 'Enforcing Ban...' : 'Enforce Ban Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          UNBAN MODAL (ACCOUNT vs DEVICE vs BOTH)
          ======================================================== */}
      {unbanModalReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={() => setUnbanModalReport(null)}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              padding: '1.75rem',
              color: 'var(--text-main)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Unban: {unbanModalReport.reported_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUnbanModalReport(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
              Choose what to reinstate for this user:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
              {[
                { key: 'both', label: 'Unban Both Account & Hardware Devices', desc: 'Restores account login and lifts device bans.' },
                { key: 'account', label: 'Unban Account Only', desc: 'Activates account but keeps devices banned.' },
                { key: 'device', label: 'Unban Hardware Devices Only', desc: 'Unbans devices but keeps account suspended.' },
              ].map((opt) => (
                <div
                  key={opt.key}
                  onClick={() => setUnbanType(opt.key)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: unbanType === opt.key ? '2px solid #10b981' : '1px solid var(--border-color)',
                    background: unbanType === opt.key ? 'rgba(16, 185, 129, 0.06)' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <input
                    type="radio"
                    name="unbanType"
                    checked={unbanType === opt.key}
                    onChange={() => setUnbanType(opt.key)}
                    style={{ marginTop: '3px', accentColor: '#10b981' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {opt.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setUnbanModalReport(null)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteUnban}
                disabled={unbanSubmitting}
                style={{
                  padding: '0.5rem 1.1rem',
                  borderRadius: '8px',
                  background: '#10b981',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {unbanSubmitting ? 'Unbanning...' : 'Confirm Unban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          FULL REPORT INSPECTION & MODERATION ACTION MODAL
          ======================================================== */}
            {/* ========================================================
          OFFENDER FULL INVESTIGATION & ALL REPORTERS DETAILS MODAL
          ======================================================== */}
      {selectedOffenderData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setSelectedOffenderData(null)}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              padding: '1.75rem',
              color: 'var(--text-main)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Offender Investigation & Complaints History
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Reviewing all complaints filed against user #{selectedOffenderData.offender.reported_id}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOffenderData(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-dim)',
                  padding: '6px',
                  borderRadius: '8px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Offender Summary Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginTop: '1.25rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ position: 'relative' }}>
                  {selectedOffenderData.offender.reported_avatar ? (
                    <img
                      src={selectedOffenderData.offender.reported_avatar}
                      alt={selectedOffenderData.offender.reported_name}
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: selectedOffenderData.offender.reported_is_banned ? '2.5px solid #ef4444' : '2.5px solid #7c3aed',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: 'rgba(124, 58, 237, 0.1)',
                        color: '#7c3aed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.2rem',
                        border: selectedOffenderData.offender.reported_is_banned ? '2.5px solid #ef4444' : '2.5px solid #7c3aed',
                      }}
                    >
                      <User size={26} />
                    </div>
                  )}
                  {selectedOffenderData.offender.reported_is_banned ? (
                    <span
                      title="Account Banned"
                      style={{
                        position: 'absolute',
                        bottom: '0px',
                        right: '0px',
                        background: '#ef4444',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 800,
                      }}
                    >
                      ✕
                    </span>
                  ) : null}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {selectedOffenderData.offender.reported_name || 'Anonymous User'}
                    </span>
                    <span
                      style={{
                        background: 'rgba(124, 58, 237, 0.1)',
                        color: '#7c3aed',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                      }}
                    >
                      ID: #{selectedOffenderData.offender.reported_id}
                    </span>
                    {selectedOffenderData.offender.reported_is_banned ? (
                      <span
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                        }}
                      >
                        ACCOUNT BANNED
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        ACCOUNT ACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                    {selectedOffenderData.offender.reported_email && (
                      <span>Email: {selectedOffenderData.offender.reported_email}</span>
                    )}
                    {selectedOffenderData.offender.reported_role && (
                      <span style={{ textTransform: 'capitalize' }}>Role: <b>{selectedOffenderData.offender.reported_role}</b></span>
                    )}
                    {selectedOffenderData.offender.reported_level ? (
                      <span>Level: <b>Lv. {selectedOffenderData.offender.reported_level}</b></span>
                    ) : null}
                    <span>Coins: <b>{selectedOffenderData.offender.reported_coins ?? 0}</b></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Offender */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedOffenderData.offender.reported_is_banned ? (
                  <button
                    type="button"
                    onClick={() => openUnbanModal({
                      reported_id: selectedOffenderData.offender.reported_id,
                      reported_name: selectedOffenderData.offender.reported_name,
                      report_ids: selectedOffenderData.reports.map((r) => r.id).join(','),
                    })}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <UserCheck size={15} />
                    Unban User...
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openBanModal({
                      reported_id: selectedOffenderData.offender.reported_id,
                      reported_name: selectedOffenderData.offender.reported_name,
                      report_ids: selectedOffenderData.reports.map((r) => r.id).join(','),
                    })}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <UserX size={15} />
                    Ban Offender (Account / Device)...
                  </button>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar & Devices */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginTop: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Total Complaints</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                  {selectedOffenderData.stats?.total_reports || selectedOffenderData.reports?.length || 0}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Pending Review</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                  {selectedOffenderData.stats?.pending || 0}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Unique Reporters</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#7c3aed', marginTop: '2px' }}>
                  {selectedOffenderData.stats?.reporters_count || 1}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Registered Devices</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Smartphone size={16} />
                  {selectedOffenderData.offender.devices_count || 0}
                  {selectedOffenderData.offender.banned_devices_count > 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 800 }}>({selectedOffenderData.offender.banned_devices_count} banned)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Registered Devices List if any */}
            {selectedOffenderData.offender.devices && selectedOffenderData.offender.devices.length > 0 && (
              <div style={{ marginTop: '0.85rem', padding: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Known Devices for this user ({selectedOffenderData.offender.devices.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedOffenderData.offender.devices.map((dev) => (
                    <div
                      key={dev.id}
                      style={{
                        fontSize: '0.78rem',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: '#ffffff',
                        border: dev.is_banned ? '1px solid #ef4444' : '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Smartphone size={13} color={dev.is_banned ? '#ef4444' : 'var(--text-dim)'} />
                      <span style={{ fontWeight: 600 }}>{dev.device_model || dev.device_brand || 'Mobile Device'}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>({dev.device_id?.slice(0, 8)}...)</span>
                      {dev.is_banned ? (
                        <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.7rem' }}>BANNED</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List of Reporters & Complaints */}
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} color="#7c3aed" />
                  All Complaints & Reporters List ({selectedOffenderData.reports?.length || 0})
                </h4>
                {selectedOffenderData.reports?.some((r) => r.status !== 'resolved') && (
                  <button
                    type="button"
                    onClick={() => handleResolveAllOffenderReports(selectedOffenderData.reports)}
                    disabled={modalLoading}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Mark All as Resolved
                  </button>
                )}
              </div>

              {/* Reporters Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedOffenderData.reports && selectedOffenderData.reports.length > 0 ? (
                  selectedOffenderData.reports.map((item, index) => {
                    const rBadgeStyle = getReasonBadgeStyle(item.reason);
                    return (
                      <div
                        key={item.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '1rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          {/* Reporter Details */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(124, 58, 237, 0.1)' }}>
                              {item.reporter_avatar ? (
                                <img
                                  src={item.reporter_avatar}
                                  alt={item.reporter_name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', fontWeight: 700 }}>
                                  {item.reporter_name ? item.reporter_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                              )}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                  {item.reporter_name || 'User #' + item.reporter_id}
                                </span>
                                <span
                                  style={{
                                    background: 'var(--badge-bg, rgba(0,0,0,0.06))',
                                    color: 'var(--text-dim)',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                  }}
                                >
                                  ID: #{item.reporter_id}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                {item.reporter_email ? `${item.reporter_email} • ` : ''}
                                Reported on: {new Date(item.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* Reason Badge & Room ID */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                padding: '3px 9px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: rBadgeStyle.bg,
                                color: rBadgeStyle.text,
                                border: `1px solid ${rBadgeStyle.border}`,
                              }}
                            >
                              Reason: {item.reason || 'General Violation'}
                            </span>
                            {item.room_id && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#ec4899',
                                  background: 'rgba(236, 72, 153, 0.1)',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                <Radio size={12} /> Live Room #{item.room_id}
                              </span>
                            )}
                            {getStatusBadge(item.status)}
                          </div>
                        </div>

                        {/* Complaint Description / Details */}
                        <div
                          style={{
                            marginTop: '0.75rem',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            background: '#f8fafc',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.84rem',
                            color: item.description ? 'var(--text-main)' : 'var(--text-dim)',
                            lineHeight: 1.5,
                          }}
                        >
                          <b style={{ color: 'var(--text-dim)', fontSize: '0.76rem', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            Complaint Details / Reason:
                          </b>
                          {item.description || 'No additional written explanation was provided by this reporter.'}
                        </div>

                        {/* Individual Status Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            Report Record #{item.id}
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {item.status !== 'investigating' && (
                              <button
                                type="button"
                                onClick={() => handleOffenderReportStatusChange(item.id, 'investigating')}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  color: '#f59e0b',
                                  border: 'none',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Mark In Review
                              </button>
                            )}
                            {item.status !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => handleOffenderReportStatusChange(item.id, 'resolved')}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#10b981',
                                  border: 'none',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Mark Resolved
                              </button>
                            )}
                            {item.status !== 'dismissed' && (
                              <button
                                type="button"
                                onClick={() => handleOffenderReportStatusChange(item.id, 'dismissed')}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(100, 116, 139, 0.1)',
                                  color: '#64748b',
                                  border: 'none',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Dismiss
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No reports found.
                  </div>
                )}
              </div>
            </div>

            {/* Admin Internal Investigation Notes */}
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} color="#7c3aed" />
                  Admin Investigation & Decision Notes
                </label>
                <button
                  type="button"
                  onClick={handleSaveOffenderNotes}
                  disabled={modalLoading}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: '#7c3aed',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {modalLoading ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="Enter internal moderation findings, warnings issued, or case resolution details..."
                value={modalAdminNotes}
                onChange={(e) => setModalAdminNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
                  color: 'var(--text-main)',
                  fontSize: '0.84rem',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Modal Footer Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setSelectedOffenderData(null)}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close Investigation
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setSelectedReport(null)}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              padding: '1.75rem',
              color: 'var(--text-main)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Report Investigation #{selectedReport.id}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Submitted {new Date(selectedReport.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getStatusBadge(selectedReport.status)}
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '8px',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Side-by-side Reporter vs Reported User */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              {/* Reporter Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Reporter (Complainant)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={selectedReport.reporter_avatar}
                    alt={selectedReport.reporter_name}
                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                      {selectedReport.reporter_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      User ID: {selectedReport.reporter_id}
                    </div>
                    {selectedReport.reporter_email && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {selectedReport.reporter_email}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Reported Offender Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: selectedReport.reported_is_banned ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                    Reported User (Target)
                  </div>
                  {selectedReport.reported_is_banned === 1 && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '6px',
                        background: '#ef4444',
                        color: '#fff',
                      }}
                    >
                      BANNED
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={selectedReport.reported_avatar}
                    alt={selectedReport.reported_name}
                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                      {selectedReport.reported_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      ID: {selectedReport.reported_id} • {selectedReport.reported_role || 'user'} • Lv.{selectedReport.reported_level || 1}
                    </div>
                    {selectedReport.reported_email && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {selectedReport.reported_email}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Violation Category & Room Info */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)' }}>
                  Violation Reason:
                </div>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    ...getReasonBadgeStyle(selectedReport.reason),
                  }}
                >
                  {selectedReport.reason}
                </span>
              </div>

              {selectedReport.room_id && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    color: '#ec4899',
                    marginBottom: '8px',
                  }}
                >
                  <Radio size={14} />
                  <span>Reported inside live broadcast room: <strong>{selectedReport.room_id}</strong></span>
                </div>
              )}

              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Complainant Description:
                </div>
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    color: selectedReport.description ? 'var(--text-main)' : 'var(--text-dim)',
                    lineHeight: 1.5,
                  }}
                >
                  {selectedReport.description || 'No detailed description provided by reporter.'}
                </div>
              </div>
            </div>

            {/* Admin Notes Box */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Admin / Moderator Notes:
                </label>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={modalLoading}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#7c3aed',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {modalLoading ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="Enter internal investigation notes, warning record, or reason for resolution..."
                value={modalAdminNotes}
                onChange={(e) => setModalAdminNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
                  color: 'var(--text-main)',
                  fontSize: '0.84rem',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Action Buttons in Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedReport.id, 'investigating')}
                  disabled={modalLoading}
                  style={{
                    padding: '0.55rem 0.9rem',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Mark In Review
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedReport.id, 'dismissed')}
                  disabled={modalLoading}
                  style={{
                    padding: '0.55rem 0.9rem',
                    borderRadius: '8px',
                    background: 'rgba(100, 116, 139, 0.12)',
                    color: '#64748b',
                    border: '1px solid rgba(100, 116, 139, 0.25)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Dismiss Report
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedReport.id, 'resolved')}
                  disabled={modalLoading}
                  style={{
                    padding: '0.55rem 0.9rem',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Mark Resolved
                </button>
              </div>

              <div>
                {selectedReport.reported_is_banned ? (
                  <button
                    type="button"
                    onClick={() => openUnbanModal(selectedReport)}
                    disabled={modalLoading}
                    style={{
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <UserCheck size={15} />
                    Unban User...
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openBanModal(selectedReport)}
                    disabled={modalLoading}
                    style={{
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <UserX size={15} />
                    Ban Offender (Account / Device)...
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
