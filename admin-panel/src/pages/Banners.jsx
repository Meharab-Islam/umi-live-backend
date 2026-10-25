import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Search,
  Eye,
  EyeOff,
  Calendar,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { bannerApi } from '../api/bannerApi';
import { resolveAssetUrl } from '../api/client';
import FileUploadInput from '../components/FileUploadInput';
import Loader from '../components/Loader';
import BulkActionBar from '../components/BulkActionBar';
import { adminApi } from '../api/adminApi';

export default function Banners({ onToast }) {
  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formLinkUrl, setFormLinkUrl] = useState('');
  const [formTargetType, setFormTargetType] = useState('none');
  const [formTargetValue, setFormTargetValue] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  // Bulk Selection State
  const [selectedBannerIds, setSelectedBannerIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Delete Confirm Modal
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleToggleSelectAll = () => {
    if (selectedBannerIds.length === banners.length) {
      setSelectedBannerIds([]);
    } else {
      setSelectedBannerIds(banners.map((b) => b.id));
    }
  };

  const handleToggleSelectBanner = (id) => {
    setSelectedBannerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteBanners = async () => {
    if (selectedBannerIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await adminApi.bulkDelete('banners', selectedBannerIds);
      if (res.success) {
        if (onToast) onToast(`Successfully deleted ${res.count || selectedBannerIds.length} banners.`, 'success');
        setSelectedBannerIds([]);
        fetchBanners();
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to bulk delete banners.', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Fetch Banners
  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await bannerApi.getBanners({
        q: searchQuery,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      const list = res?.banners || res?.data?.banners || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      setBanners(list);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch banners');
      if (onToastRef.current) onToastRef.current(err.message || 'Failed to fetch banners', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingBanner(null);
    setFormTitle('');
    setFormImageUrl('');
    setFormLinkUrl('');
    setFormTargetType('none');
    setFormTargetValue('');
    setFormDisplayOrder(String(banners.length + 1));
    setFormIsActive(true);
    setFormStartDate('');
    setFormEndDate('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (banner) => {
    setEditingBanner(banner);
    setFormTitle(banner.title || '');
    setFormImageUrl(banner.image_url || '');
    setFormLinkUrl(banner.link_url || '');
    setFormTargetType(banner.target_type || 'none');
    setFormTargetValue(banner.target_value || '');
    setFormDisplayOrder(String(banner.display_order ?? 0));
    setFormIsActive(Boolean(banner.is_active));
    setFormStartDate(banner.start_date ? banner.start_date.substring(0, 16) : '');
    setFormEndDate(banner.end_date ? banner.end_date.substring(0, 16) : '');
    setModalOpen(true);
  };

  // Submit Create / Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      if (onToast) onToast('Banner title is required', 'error');
      return;
    }
    if (!formImageUrl.trim()) {
      if (onToast) onToast('Banner image is required (upload or enter URL)', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formTitle.trim(),
        image_url: formImageUrl.trim(),
        link_url: formLinkUrl.trim() || undefined,
        target_type: formTargetType,
        target_value: formTargetValue.trim() || undefined,
        display_order: parseInt(formDisplayOrder, 10) || 0,
        is_active: formIsActive ? 1 : 0,
        start_date: formStartDate ? new Date(formStartDate).toISOString().slice(0, 19).replace('T', ' ') : null,
        end_date: formEndDate ? new Date(formEndDate).toISOString().slice(0, 19).replace('T', ' ') : null,
      };

      if (editingBanner) {
        const res = await bannerApi.updateBanner(editingBanner.id, payload);
        if (res.success) {
          if (onToast) onToast('Banner updated successfully!', 'success');
          setModalOpen(false);
          fetchBanners();
        }
      } else {
        const res = await bannerApi.createBanner(payload);
        if (res.success) {
          if (onToast) onToast('Banner created successfully!', 'success');
          setModalOpen(false);
          fetchBanners();
        }
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (banner) => {
    try {
      const res = await bannerApi.toggleBannerStatus(banner.id);
      if (res.success) {
        if (onToast) onToast(`Banner ${res.is_active ? 'activated' : 'deactivated'}`, 'info');
        setBanners((prev) =>
          prev.map((b) => (b.id === banner.id ? { ...b, is_active: res.is_active ? 1 : 0 } : b))
        );
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  // Quick Order Adjustment
  const handleMoveOrder = async (banner, direction) => {
    const currentIndex = banners.findIndex((b) => b.id === banner.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const targetBanner = banners[targetIndex];
    const orderings = [
      { id: banner.id, display_order: targetBanner.display_order },
      { id: targetBanner.id, display_order: banner.display_order },
    ];

    try {
      const res = await bannerApi.reorderBanners(orderings);
      if (res.success) {
        fetchBanners();
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to update order', 'error');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await bannerApi.deleteBanner(deleteConfirm.id);
      if (res.success) {
        if (onToast) onToast(`Banner "${deleteConfirm.title}" deleted`, 'success');
        setDeleteConfirm(null);
        fetchBanners();
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to delete banner', 'error');
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: '3.5rem' }}>
      {/* Action Toolbar */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
          Banners ({banners.length})
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleOpenCreate}
          style={{ borderRadius: '8px', padding: '0.45rem 1rem', gap: '6px' }}
        >
          <Plus size={15} />
          <span>Add Banner</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div
        className="panel-card"
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '14px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Search banners by title or target..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.3rem' }}
            />
          </div>

          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '130px' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {banners.length > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-main)', margin: 0 }}>
              <input
                type="checkbox"
                checked={selectedBannerIds.length === banners.length && banners.length > 0}
                onChange={handleToggleSelectAll}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
              />
              <span style={{ fontWeight: 600 }}>Select All</span>
            </label>
          )}
          <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
            Showing <strong>{banners.length}</strong> banners
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedBannerIds.length}
        totalCount={banners.length}
        onSelectAll={handleToggleSelectAll}
        onClearSelection={() => setSelectedBannerIds([])}
        onDelete={handleBulkDeleteBanners}
        entityName="banners"
        deleting={bulkDeleting}
      />

      {/* Banners Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem' }}>
          <Loader inline />
          <p style={{ marginTop: '0.75rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Loading banners...</p>
        </div>
      ) : errorMsg ? (
        <div
          className="panel-card"
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            borderRadius: '16px',
            border: '1px solid #fecaca',
            background: '#fff5f5',
          }}
        >
          <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: '0 0 6px', color: '#b91c1c', fontSize: '1.1rem' }}>Failed to Load Banners</h3>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.86rem', color: '#7f1d1d' }}>{errorMsg}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchBanners}>
            Retry
          </button>
        </div>
      ) : banners.length === 0 ? (
        <div
          className="panel-card"
          style={{
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            borderRadius: '16px',
            color: 'var(--text-dim)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#6366f1',
            }}
          >
            <ImageIcon size={30} />
          </div>
          <h3 style={{ margin: '0 0 6px', color: 'var(--text-main)', fontSize: '1.15rem' }}>No Banners Found</h3>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.86rem' }}>
            {searchQuery ? 'No banners match your search filter.' : 'Get started by creating your first promotional banner.'}
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
            + Add First Banner
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {banners.map((item, idx) => {
            const hasSchedule = Boolean(item.start_date || item.end_date);
            const isActive = Boolean(item.is_active);
            const isSelected = selectedBannerIds.includes(item.id);

            return (
              <div
                key={item.id}
                className="panel-card"
                style={{
                  borderRadius: '14px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: isSelected ? '2px solid #ef4444' : '1px solid var(--border-color)',
                  boxShadow: isSelected ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  background: 'var(--bg-secondary)',
                }}
              >
                {/* Banner Image Preview Header */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '170px',
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Selection Checkbox */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      zIndex: 3,
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(4px)',
                      padding: '4px 6px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectBanner(item.id)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444', margin: 0 }}
                      title={`Select banner #${item.id}`}
                    />
                  </div>

                  {/* Priority / Order Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '46px',
                      background: 'rgba(15, 23, 42, 0.78)',
                      backdropFilter: 'blur(4px)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>Order #{item.display_order}</span>
                  </div>

                  {/* Active / Inactive Pill */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      style={{
                        border: 'none',
                        cursor: 'pointer',
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: isActive ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                        color: '#fff',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      }}
                      title="Click to toggle active status"
                    >
                      {isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                      <span>{isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>

                  {/* Banner Image Preview */}
                  {item.image_url ? (
                    <img
                      src={resolveAssetUrl(item.image_url)}
                      alt={item.title || 'Banner'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/600x200?text=Banner+Image';
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                      <ImageIcon size={36} />
                    </div>
                  )}
                </div>

                {/* Banner Content Body */}
                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <h3
                      style={{
                        margin: '0 0 4px',
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </h3>

                    {/* Target Information */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      <span
                        style={{
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          borderRadius: '6px',
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#6366f1',
                        }}
                      >
                        {item.target_type || 'none'}
                      </span>
                      {item.link_url || item.target_value ? (
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            maxWidth: '200px',
                          }}
                          title={item.link_url || item.target_value}
                        >
                          🔗 {item.link_url || item.target_value}
                        </span>
                      ) : (
                        <span>No link action</span>
                      )}
                    </div>
                  </div>

                  {/* Schedule dates if configured */}
                  {hasSchedule && (
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--text-dim)',
                        background: 'var(--bg-primary)',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Calendar size={13} color="#6366f1" />
                      <span>
                        {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'Now'}
                        {' → '}
                        {item.end_date ? new Date(item.end_date).toLocaleDateString() : 'Forever'}
                      </span>
                    </div>
                  )}

                  {/* Actions & Reordering */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '0.65rem',
                      borderTop: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    {/* Reorder Buttons */}
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleMoveOrder(item, 'up')}
                        disabled={idx === 0}
                        style={{ padding: '3px 6px' }}
                        title="Move Up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleMoveOrder(item, 'down')}
                        disabled={idx === banners.length - 1}
                        style={{ padding: '3px 6px' }}
                        title="Move Down"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    {/* Edit & Delete Buttons */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEdit(item)}
                        style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteConfirm(item)}
                        style={{ padding: '4px 8px', borderRadius: '6px' }}
                        title="Delete Banner"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="modal-box" style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={20} color="#6366f1" />
                <span>{editingBanner ? 'Edit Promotional Banner' : 'Add New Promotional Banner'}</span>
              </div>
              <button type="button" className="btn-close" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Banner Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Banner Title: *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Summer Music Carnival 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              {/* Banner Image Upload */}
              <FileUploadInput
                label="Banner Image: *"
                value={formImageUrl}
                onChange={(url) => setFormImageUrl(url)}
                category="banners"
                accept="image/*"
                type="image"
                placeholder="Upload banner image from computer or enter URL"
                required
                helperText="Recommended ratio: 16:9 or 3:1 banner format (e.g. 1080x450px)"
                onToast={onToast}
              />

              {/* Target Type & Value */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Action Target Type:
                  </label>
                  <select
                    className="input-field"
                    value={formTargetType}
                    onChange={(e) => setFormTargetType(e.target.value)}
                  >
                    <option value="none">No Action (View Only)</option>
                    <option value="web">External Web Link</option>
                    <option value="room">Live Room ID</option>
                    <option value="vip">VIP Packages Store</option>
                    <option value="recharge">Coin Recharge Page</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Target Link / ID:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={
                      formTargetType === 'web'
                        ? 'https://example.com/event'
                        : formTargetType === 'room'
                        ? 'e.g. 1024'
                        : 'Optional link or parameter'
                    }
                    value={formLinkUrl || formTargetValue}
                    onChange={(e) => {
                      setFormLinkUrl(e.target.value);
                      setFormTargetValue(e.target.value);
                    }}
                    disabled={formTargetType === 'none' || formTargetType === 'vip' || formTargetType === 'recharge'}
                  />
                </div>
              </div>

              {/* Display Order & Active Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Display Order / Rank:
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(e.target.value)}
                    placeholder="0"
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                    Lower number shows first
                  </span>
                </div>

                <div style={{ paddingTop: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                    />
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Active (Visible to Users)
                    </span>
                  </label>
                </div>
              </div>

              {/* Schedule (Optional) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Start Date (Optional):
                  </label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    End Date (Optional):
                  </label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingBanner ? 'Save Changes' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-box" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <AlertTriangle size={26} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', color: 'var(--text-main)' }}>
              Delete Banner?
            </h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.86rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>"{deleteConfirm.title}"</strong>? This will remove it from the mobile app home screen.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleConfirmDelete}>
                Yes, Delete Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
