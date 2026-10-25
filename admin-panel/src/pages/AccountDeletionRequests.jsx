import React, { useState, useEffect, useCallback } from 'react';
import {
  UserX,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Trash2,
  Lock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import deletionRequestApi from '../api/deletionRequestApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';

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

  // Approve / Delete Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionPassword, setActionPassword] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
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

  // Open Delete Modal
  const handleOpenApproveModal = (reqItem) => {
    setSelectedRequest(reqItem);
    setActionPassword('');
    setAdminNotes(`Account and personal data permanently erased per user request.`);
    setApproveModalOpen(true);
  };

  // Execute Permanent Delete & Approve
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

        // Instant Optimistic Update
        setRequests((prev) =>
          prev.map((item) =>
            item.id === selectedRequest.id
              ? { ...item, status: 'approved', admin_notes: adminNotes.trim() }
              : item
          )
        );
        setSummary((prev) => ({
          ...prev,
          pending_count: Math.max(0, Number(prev.pending_count || 0) - 1),
          approved_count: Number(prev.approved_count || 0) + 1,
        }));
        setTimeout(() => fetchRequests(), 150);
      } else {
        onToast(res.message || 'Failed to delete account.', 'error');
      }
    } catch (err) {
      onToast(err.message || 'Error executing account deletion.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Reject Modal
  const handleOpenRejectModal = (reqItem) => {
    setSelectedRequest(reqItem);
    setRejectNotes('Request rejected: unable to verify account ownership or credentials.');
    setRejectModalOpen(true);
  };

  // Execute Reject
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

        // Instant Optimistic State Update
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
                }
              );
            }
            return item;
          })
        );

        setSummary((prev) => ({
          ...prev,
          pending_count: Math.max(0, Number(prev.pending_count || 0) - 1),
          rejected_count: Number(prev.rejected_count || 0) + 1,
        }));

        setTimeout(() => fetchRequests(), 150);
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

  // Remove Request Record
  const handleDeleteRecord = async (id) => {
    if (!window.confirm(`Delete request log #${id} from records?`)) return;

    try {
      const res = await deletionRequestApi.deleteRecord(id);
      if (res.success) {
        onToast('Deletion request log removed.', 'success');
        setRequests((prev) => prev.filter((r) => r.id !== id));
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
            {Number(summary.pending_count || 0) > 0 && (
              <span className="badge badge-warning" style={{ fontSize: '0.78rem', padding: '4px 8px' }}>
                {summary.pending_count} Pending Review
              </span>
            )}
          </div>
          <p className="page-description">
            User self-service account and personal data deletion requests submitted per Google Play &amp; Apple Store safety guidelines.
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
            <span>Public Form</span>
            <ExternalLink size={13} />
          </a>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchRequests}
            disabled={loading}
            style={{ gap: '6px' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
            <UserX size={20} />
          </div>
          <div>
            <div className="stat-label">Total Requests</div>
            <div className="stat-value">{Number(summary.total_requests || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={20} />
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
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="stat-label">Deleted &amp; Approved</div>
            <div className="stat-value" style={{ color: '#10b981' }}>
              {Number(summary.approved_count || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <XCircle size={20} />
          </div>
          <div>
            <div className="stat-label">Rejected</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>
              {Number(summary.rejected_count || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div
        className="panel-card"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'approved', label: 'Deleted' },
            { id: 'rejected', label: 'Rejected' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              className={`btn btn-sm ${statusFilter === st.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setStatusFilter(st.id);
                setPage(1);
              }}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Search ID, email, reason..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ paddingLeft: '2.4rem', height: '36px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="custom-table" style={{ minWidth: '850px' }}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Ticket</th>
                <th style={{ minWidth: '220px' }}>Account &amp; Identifier</th>
                <th style={{ minWidth: '220px' }}>Reason &amp; Feedback</th>
                <th style={{ width: '110px' }}>Status</th>
                <th style={{ minWidth: '140px' }}>Date</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader inline />
                    <div style={{ marginTop: '0.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      Loading requests...
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                    <UserX size={36} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                      No Deletion Requests Found
                    </div>
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
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                          {reqItem.identifier}
                        </div>
                        {reqItem.name && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {reqItem.name}
                          </div>
                        )}
                        {reqItem.user_id && (
                          <div
                            style={{
                              marginTop: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.75rem',
                              color: '#38bdf8',
                            }}
                          >
                            <span>User #{reqItem.user_id}</span>
                            {reqItem.matched_user_coins !== undefined && (
                              <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                                🪙 {Number(reqItem.matched_user_coins || 0).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Reason & Feedback */}
                    <td>
                      <div style={{ maxWidth: '280px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                          {reqItem.reason || 'Account Deletion'}
                        </div>
                        {reqItem.details && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                            {reqItem.details}
                          </div>
                        )}
                        {reqItem.admin_notes && (
                          <div style={{ marginTop: '4px', fontSize: '0.72rem', color: reqItem.status === 'rejected' ? '#ef4444' : '#38bdf8' }}>
                            <strong>Note:</strong> {reqItem.admin_notes}
                          </div>
                        )}
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

                    {/* Date */}
                    <td>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {reqItem.created_at ? new Date(reqItem.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>

                    {/* Clean Actions: No Duplicate or Cluttered Buttons */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {reqItem.status === 'pending' ? (
                          <>
                            {/* Delete User Account (Red) */}
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
                                fontWeight: 600,
                              }}
                            >
                              <UserX size={13} />
                              <span>Delete</span>
                            </button>

                            {/* Reject Request (Amber) */}
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => handleOpenRejectModal(reqItem)}
                              title="Reject Request (Keeps Account)"
                              style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              <XCircle size={13} />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          /* If already approved or rejected, just 1 trash button to clear log */
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDeleteRecord(reqItem.id)}
                            title="Remove Request Log"
                            style={{ padding: '4px 8px', color: 'var(--text-dim)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > pageSize && (
          <div style={{ padding: '1rem' }}>
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* APPROVE & DELETE ACCOUNT MODAL */}
      {approveModalOpen && selectedRequest && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Confirm Account Deletion</h3>
              </div>
              <button type="button" className="close-btn" onClick={() => setApproveModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleExecuteApprove}>
              <div className="modal-body" style={{ padding: '1.25rem' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '1rem', fontSize: '0.85rem', color: '#fca5a5' }}>
                  <strong>Warning:</strong> Permanently deletes user #{selectedRequest.user_id || selectedRequest.identifier} and erases all virtual coins, diamonds, and data.
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
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Admin Notes</label>
                  <input
                    type="text"
                    className="input-field"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
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
                  className="btn btn-danger"
                  style={{ background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600 }}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalOpen && selectedRequest && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Reject Deletion Request</h3>
              <button type="button" className="close-btn" onClick={() => setRejectModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleExecuteReject}>
              <div className="modal-body" style={{ padding: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Reject ticket <strong>#REQ-{selectedRequest.id}</strong> ({selectedRequest.identifier}). The user account will remain active and intact.
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
                  style={{ background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600 }}
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
