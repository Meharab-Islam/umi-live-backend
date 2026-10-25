import React, { useState, useEffect, useCallback } from 'react';
import {
  UserX,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  ShieldAlert,
  User,
  Shield,
  Lock,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import deletionRequestApi from '../api/deletionRequestApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import UserDetailsModal from '../components/UserDetailsModal';

export default function AccountDeletionRequests({ onToast }) {
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({
    total_requests: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [search, setSearch] = useState('');

  // Selected User Modal
  const [detailsUserId, setDetailsUserId] = useState(null);

  // Approve / Delete Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionPassword, setActionPassword] = useState('');
  const [adminNotes, setAdminNotes] = useState('Account and data permanently deleted per user request.');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const cleanSearch = search.trim();
      const params = {
        page,
        limit: pageSize,
        status: statusFilter,
      };
      if (cleanSearch) {
        params.search = cleanSearch;
      }

      const res = await deletionRequestApi.getDeletionRequests(params);
      if (res.success) {
        setRequests(res.requests || []);
        if (res.summary) setSummary(res.summary);
        if (res.pagination) setTotal(res.pagination.total || 0);
      } else {
        onToast(res.message || 'Failed to load deletion requests.', 'error');
      }
    } catch (err) {
      console.error('fetchRequests error:', err);
      onToast(err.message || 'Error loading deletion requests.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, search, onToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenApproveModal = (reqItem) => {
    setSelectedRequest(reqItem);
    setActionPassword('');
    setAdminNotes(`Account and personal data permanently erased for ${reqItem.matched_user_name || reqItem.identifier}.`);
    setApproveModalOpen(true);
  };

  const handleExecuteApprove = async (e) => {
    if (e) e.preventDefault();
    if (!selectedRequest) return;
    if (!actionPassword.trim()) {
      onToast('Security action password is required.', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await deletionRequestApi.approveRequest(selectedRequest.id, {
        actionPassword: actionPassword.trim(),
        notes: adminNotes.trim(),
      });

      if (res.success) {
        onToast(res.message || 'Account successfully deleted and request approved!', 'success');
        setApproveModalOpen(false);
        setSelectedRequest(null);
        fetchRequests();
      } else {
        onToast(res.message || 'Failed to delete account.', 'error');
      }
    } catch (err) {
      onToast(err.message || 'Error executing account deletion.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenRejectModal = (reqItem) => {
    setSelectedRequest(reqItem);
    setRejectNotes('Request rejected: unable to verify account ownership or credentials.');
    setRejectModalOpen(true);
  };

  const handleExecuteReject = async (e) => {
    if (e) e.preventDefault();
    if (!selectedRequest) return;

    const targetId = selectedRequest.id;
    const finalReason = rejectNotes.trim() || 'Request rejected by Admin.';

    try {
      setIsProcessing(true);
      const res = await deletionRequestApi.rejectRequest(targetId, {
        notes: finalReason,
      });

      if (res.success) {
        onToast(res.message || 'Request marked as rejected.', 'success');
        setRejectModalOpen(false);
        setSelectedRequest(null);

        // Immediate Optimistic UI Update: updates status to rejected immediately without waiting for network/cache
        const updatedRequest = res.request;
        setRequests((prev) =>
          prev.map((item) => {
            if (item.id === targetId) {
              return (
                updatedRequest || {
                  ...item,
                  status: 'rejected',
                  admin_notes: finalReason,
                  reviewed_at: new Date().toISOString(),
                  reviewer_name: 'Admin',
                }
              );
            }
            return item;
          })
        );

        // Immediate summary stats update
        setSummary((prev) => ({
          ...prev,
          pending_count: Math.max(0, Number(prev.pending_count || 0) - 1),
          rejected_count: Number(prev.rejected_count || 0) + 1,
        }));

        // Re-fetch in background to ensure sync
        setTimeout(() => {
          fetchRequests();
        }, 150);
      } else {
        onToast(res.message || 'Failed to reject request.', 'error');
      }
    } catch (err) {
      console.error('handleExecuteReject error:', err);
      onToast(err.message || 'Error rejecting deletion request.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm(`Delete request log #${id} permanently from database?`)) return;

    try {
      const res = await deletionRequestApi.deleteRecord(id);
      if (res.success) {
        onToast('Deletion request log removed.', 'success');
        fetchRequests();
      } else {
        onToast(res.message || 'Failed to delete record.', 'error');
      }
    } catch (err) {
      onToast(err.message || 'Error deleting record.', 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title">Account Deletion Requests</h1>
            {summary.pending_count > 0 && (
              <span className="badge badge-warning" style={{ fontSize: '0.78rem', padding: '4px 8px' }}>
                {summary.pending_count} Pending Review
              </span>
            )}
          </div>
          <p className="page-description">
            Self-service user account and data deletion requests submitted via the public landing page in compliance with Google Play Store & Apple App Store requirements.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href="/delete-account"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px' }}
          >
            <span>View Public Deletion Form</span>
            <ExternalLink size={14} />
          </a>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchRequests}
            disabled={loading}
            style={{ gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
            <UserX size={22} />
          </div>
          <div>
            <div className="stat-label">Total Requests</div>
            <div className="stat-value">{Number(summary.total_requests || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-label">Pending Review</div>
            <div className="stat-value" style={{ color: '#f59e0b' }}>
              {Number(summary.pending_count || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-label">Deleted & Approved</div>
            <div className="stat-value" style={{ color: '#10b981' }}>
              {Number(summary.approved_count || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div className="stat-label">Rejected</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>
              {Number(summary.rejected_count || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="panel-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              type="button"
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              style={{ textTransform: 'capitalize' }}
            >
              {st === 'all' ? 'All Status' : st}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '380px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Search by User ID, Email, Name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="custom-table" style={{ minWidth: '950px' }}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Ticket</th>
                <th style={{ minWidth: '220px' }}>Identifier & User Account</th>
                <th style={{ minWidth: '200px' }}>Reason & Details</th>
                <th style={{ minWidth: '130px' }}>Client Info</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ minWidth: '150px' }}>Requested At</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem' }}>
                    <Loader inline />
                    <div style={{ marginTop: '0.75rem', color: 'var(--text-dim)', fontSize: '0.88rem' }}>
                      Loading deletion requests...
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem' }}>
                    <UserX size={44} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                      No Deletion Requests Found
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      {search ? `No requests matched "${search}".` : 'No incoming account deletion requests at this time.'}
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map((reqItem) => (
                  <tr key={reqItem.id}>
                    {/* Ticket ID */}
                    <td>
                      <span className="user-id-badge" style={{ fontSize: '0.78rem' }}>
                        #REQ-{reqItem.id}
                      </span>
                    </td>

                    {/* Submitted Identifier & Matched Account */}
                    <td>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                            {reqItem.identifier}
                          </span>
                        </div>
                        {reqItem.name && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            Name: {reqItem.name}
                          </div>
                        )}

                        {/* Matched Database User */}
                        {reqItem.user_id ? (
                          <div
                            style={{
                              marginTop: '6px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(56, 189, 248, 0.08)',
                              border: '1px solid rgba(56, 189, 248, 0.2)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.75rem',
                            }}
                          >
                            <span style={{ color: '#38bdf8', fontWeight: 600 }}>Matched User #{reqItem.user_id}</span>
                            <span style={{ color: 'var(--text-muted)' }}>({reqItem.matched_user_name || 'User'})</span>
                            {reqItem.matched_user_coins !== undefined && (
                              <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                                🪙 {Number(reqItem.matched_user_coins || 0).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic', display: 'block', marginTop: '4px' }}>
                            No active account match found
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Reason & Details */}
                    <td>
                      <div style={{ maxWidth: '280px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: '3px' }}>
                          {reqItem.reason || 'Account Deletion Request'}
                        </div>
                        {reqItem.details && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            {reqItem.details}
                          </div>
                        )}
                        {reqItem.admin_notes && (
                          <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#38bdf8' }}>
                            <strong>Note:</strong> {reqItem.admin_notes}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Client Info */}
                    <td>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        <div>IP: {reqItem.ip_address || 'Unknown'}</div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      {reqItem.status === 'pending' && (
                        <span className="badge badge-warning" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} />
                          <span>Pending</span>
                        </span>
                      )}
                      {reqItem.status === 'approved' && (
                        <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={11} />
                          <span>Deleted</span>
                        </span>
                      )}
                      {reqItem.status === 'rejected' && (
                        <span className="badge badge-danger" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={11} />
                          <span>Rejected</span>
                        </span>
                      )}
                    </td>

                    {/* Requested At */}
                    <td>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {reqItem.created_at ? new Date(reqItem.created_at).toLocaleString() : 'N/A'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {reqItem.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => handleOpenApproveModal(reqItem)}
                              title="Delete Account & Approve"
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                              }}
                            >
                              <UserX size={13} />
                              <span>Delete</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => handleOpenRejectModal(reqItem)}
                              title="Reject Request"
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <XCircle size={13} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {reqItem.user_id && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setDetailsUserId(reqItem.user_id)}
                            title="View User Details"
                            style={{ padding: '4px 8px' }}
                          >
                            <Eye size={13} />
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDeleteRecord(reqItem.id)}
                          title="Delete Request Log"
                          style={{ padding: '4px 8px', color: 'var(--text-dim)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {detailsUserId && (
        <UserDetailsModal
          userId={detailsUserId}
          isOpen={true}
          onClose={() => setDetailsUserId(null)}
          onToast={onToast}
          onUpdate={fetchRequests}
        />
      )}

      {/* APPROVE & DELETE ACCOUNT MODAL */}
      {approveModalOpen && selectedRequest && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <ShieldAlert size={20} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>Confirm Account Deletion</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setApproveModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleExecuteApprove}>
              <div className="modal-body" style={{ padding: '1.25rem' }}>
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '0.85rem',
                    color: '#fca5a5',
                    marginBottom: '1rem',
                    lineHeight: 1.5,
                  }}
                >
                  <strong>⚠️ Critical Action:</strong> This will permanently delete the matched user account (ID #{selectedRequest.user_id || 'N/A'}), cancel active host contracts, erase moderation rights, and clear all associated wallet records. This action cannot be undone.
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Target Account Identifier</label>
                  <input
                    type="text"
                    className="input-field"
                    value={`${selectedRequest.identifier} ${selectedRequest.matched_user_name ? `(${selectedRequest.matched_user_name})` : ''}`}
                    disabled
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">
                    Security Action Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter security password (default: admin123)"
                    value={actionPassword}
                    onChange={(e) => setActionPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Audit Note / Reason</label>
                  <textarea
                    className="input-field"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows="2"
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setApproveModalOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Deleting...' : 'Permanently Delete User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalOpen && selectedRequest && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Reject Deletion Request</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setRejectModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleExecuteReject}>
              <div className="modal-body" style={{ padding: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Mark request <strong>#REQ-{selectedRequest.id}</strong> ({selectedRequest.identifier}) as Rejected without deleting any database records.
                </p>

                <div className="form-group">
                  <label className="form-label">Rejection Reason</label>
                  <textarea
                    className="input-field"
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    rows="3"
                    placeholder="Enter rejection reason (optional)..."
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRejectModalOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
