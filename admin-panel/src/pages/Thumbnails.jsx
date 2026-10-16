import React, { useState, useEffect, useCallback } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Edit2,
  Trash2,
  Search,
  Gift,
  Coins,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  X,
  ExternalLink,
  Award,
  Layers,
  Sliders,
  Calendar,
} from 'lucide-react';
import specialItemApi from '../api/specialItemApi';
import { adminApi } from '../api/adminApi';
import settingsApi from '../api/settingsApi';
import userApi from '../api/userApi';
import { resolveAssetUrl } from '../api/client';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import FileUploadInput from '../components/FileUploadInput';
import BulkActionBar from '../components/BulkActionBar';

export default function Thumbnails({ onToast, embedded = false }) {
  const [currentTab, setCurrentTab] = useState('thumbnails'); // 'thumbnails' | 'assigned'
  const [thumbnails, setThumbnails] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bulk Selection for Thumbnails
  const [selectedThumbIds, setSelectedThumbIds] = useState([]);
  const [bulkDeletingThumbs, setBulkDeletingThumbs] = useState(false);

  // Bulk Selection for Assigned Subscribers
  const [selectedSubIds, setSelectedSubIds] = useState([]);
  const [bulkRevokingSubs, setBulkRevokingSubs] = useState(false);

  // Subscribers
  const [subscribers, setSubscribers] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [subSearch, setSubSearch] = useState('');
  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState(10);
  const [subTotal, setSubTotal] = useState(0);

  const handleToggleSelectAllThumbs = () => {
    if (selectedThumbIds.length === thumbnails.length) {
      setSelectedThumbIds([]);
    } else {
      setSelectedThumbIds(thumbnails.map((t) => t.id));
    }
  };

  const handleToggleSelectThumb = (id) => {
    setSelectedThumbIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteThumbs = async () => {
    if (selectedThumbIds.length === 0) return;
    try {
      setBulkDeletingThumbs(true);
      const res = await adminApi.bulkDelete('thumbnails', selectedThumbIds);
      if (res.success) {
        onToast(`Successfully deleted ${res.count || selectedThumbIds.length} thumbnails.`, 'success');
        setSelectedThumbIds([]);
        loadThumbnails();
      }
    } catch (err) {
      onToast(err.message || 'Failed to bulk delete thumbnails.', 'error');
    } finally {
      setBulkDeletingThumbs(false);
    }
  };

  const handleToggleSelectAllSubs = () => {
    if (selectedSubIds.length === subscribers.length) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(subscribers.map((s) => s.subscription_id));
    }
  };

  const handleToggleSelectSub = (id) => {
    setSelectedSubIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkRevokeSubs = async () => {
    if (selectedSubIds.length === 0) return;
    try {
      setBulkRevokingSubs(true);
      for (const subId of selectedSubIds) {
        await specialItemApi.revokeThumbnailSubscription(subId).catch(() => {});
      }
      onToast(`Revoked ${selectedSubIds.length} thumbnail assignments.`, 'success');
      setSelectedSubIds([]);
      loadSubscribers();
    } catch (err) {
      onToast(err.message || 'Failed to revoke subscriptions.', 'error');
    } finally {
      setBulkRevokingSubs(false);
    }
  };

  // Assign form
  const [assignUserIdInput, setAssignUserIdInput] = useState('');
  const [assignUser, setAssignUser] = useState(null);
  const [searchingAssignUser, setSearchingAssignUser] = useState(false);
  const [assignThumbId, setAssignThumbId] = useState('');
  const [assignCustomDays, setAssignCustomDays] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const handleOpenAssignModal = (thumbId = '') => {
    if (thumbId) {
      setAssignThumbId(String(thumbId));
    }
    setAssignModalOpen(true);
  };

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    name: '',
    image_url: '',
    price: 1000,
    validity_days: 30,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Custom Thumbnail Duration & Pricing Plans
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingTiers, setPricingTiers] = useState([
    { days: 7, coins: 200 },
    { days: 15, coins: 350 },
    { days: 30, coins: 500 },
    { days: 90, coins: 1200 },
  ]);
  const [savingTiers, setSavingTiers] = useState(false);

  const fetchPricingTiers = useCallback(async () => {
    try {
      const res = await settingsApi.getSettings();
      if (res.success && res.settings) {
        const found = res.settings.find((s) => s.key_name === 'custom_thumbnail_pricing_tiers');
        if (found && found.key_value) {
          const parsed = JSON.parse(found.key_value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPricingTiers(parsed);
          }
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchPricingTiers();
  }, [fetchPricingTiers]);

  const handleTierChange = (index, field, val) => {
    setPricingTiers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: parseInt(val, 10) || 0 };
      return copy;
    });
  };

  const handleAddTier = () => {
    setPricingTiers((prev) => [...prev, { days: 60, coins: 800 }]);
  };

  const handleRemoveTier = (index) => {
    if (pricingTiers.length <= 1) {
      onToast('You must keep at least 1 duration plan.', 'warning');
      return;
    }
    setPricingTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveTiers = async () => {
    try {
      setSavingTiers(true);
      const valStr = JSON.stringify(pricingTiers);
      await settingsApi.updateSetting(
        'custom_thumbnail_pricing_tiers',
        valStr,
        'Dynamic pricing tiers (days vs coins) for user-uploaded custom room background thumbnails'
      );
      onToast('Custom thumbnail duration pricing plans saved successfully!', 'success');
      setPricingModalOpen(false);
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSavingTiers(false);
    }
  };

  const fetchThumbnails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await specialItemApi.getThumbnails();
      if (res.success) {
        setThumbnails(res.thumbnails || []);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  const fetchSubscribers = useCallback(async () => {
    try {
      setLoadingSubs(true);
      const res = await specialItemApi.getThumbnailSubscribers({
        page: subPage,
        limit: subPageSize,
        search: subSearch.trim() || undefined,
      });
      if (res.success) {
        setSubscribers(res.subscribers || []);
        setSubTotal(res.pagination?.total || 0);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoadingSubs(false);
    }
  }, [subPage, subPageSize, subSearch, onToast]);

  useEffect(() => {
    fetchThumbnails();
  }, [fetchThumbnails]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      name: '',
      image_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300',
      price: 1000,
      validity_days: 30,
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      image_url: item.image_url,
      price: item.price,
      validity_days: item.validity_days,
      is_active: Boolean(item.is_active),
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      onToast('Thumbnail name is required.', 'error');
      return;
    }
    if (!form.image_url.trim()) {
      onToast('Thumbnail image URL is required.', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        const res = await specialItemApi.updateThumbnail(editingItem.id, form);
        if (res.success) {
          onToast(res.message, 'success');
          setModalOpen(false);
          fetchThumbnails();
        }
      } else {
        const res = await specialItemApi.createThumbnail(form);
        if (res.success) {
          onToast(res.message, 'success');
          setModalOpen(false);
          fetchThumbnails();
        }
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSearchUser = async () => {
    const clean = assignUserIdInput.trim().replace(/^#/, '');
    if (!clean) {
      onToast('Please enter User ID.', 'error');
      return;
    }

    try {
      setSearchingAssignUser(true);
      setAssignUser(null);
      const res = await userApi.getUsers({ search: clean, limit: 1 });
      if (res.success && res.users && res.users.length > 0) {
        setAssignUser(res.users[0]);
        onToast(`User #${res.users[0].id} found!`, 'success');
      } else {
        onToast(`User #${clean} not found.`, 'error');
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSearchingAssignUser(false);
    }
  };

  const selectedAssignThumb = thumbnails.find((t) => t.id === parseInt(assignThumbId, 10)) || null;

  const handleSubmitAssign = async (e) => {
    e.preventDefault();
    if (!assignUser) {
      onToast('Please verify the target user first.', 'error');
      return;
    }
    if (!assignThumbId) {
      onToast('Please select a thumbnail to assign.', 'error');
      return;
    }

    try {
      setSubmittingAssign(true);
      const parsedDays = parseInt(assignCustomDays, 10);
      const daysToAssign = (!isNaN(parsedDays) && parsedDays > 0)
        ? parsedDays
        : (selectedAssignThumb ? selectedAssignThumb.validity_days : undefined);

      const res = await specialItemApi.grantThumbnail({
        userId: assignUser.id,
        thumbnailId: assignThumbId,
        customValidityDays: daysToAssign,
      });

      if (res.success) {
        onToast(res.message, 'success');
        setAssignModalOpen(false);
        setAssignUserIdInput('');
        setAssignUser(null);
        setAssignThumbId('');
        setAssignCustomDays('');
        fetchSubscribers();
        fetchThumbnails();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      if (deleteConfirm.type === 'thumbnail') {
        const res = await specialItemApi.deleteThumbnail(deleteConfirm.id);
        if (res.success) {
          onToast(res.message, 'success');
          fetchThumbnails();
          fetchSubscribers();
        }
      } else if (deleteConfirm.type === 'subscription') {
        const res = await specialItemApi.revokeThumbnail(deleteConfirm.id);
        if (res.success) {
          onToast(res.message, 'success');
          fetchSubscribers();
          fetchThumbnails();
        }
      }
      setDeleteConfirm(null);
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={embedded ? '' : 'page-container'} style={{ paddingBottom: embedded ? 0 : '3.5rem' }}>
      {/* Page Header */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)',
          borderLeft: '5px solid #06b6d4',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Live Room Thumbnails
            </h1>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '3px 9px',
                borderRadius: '8px',
                background: 'rgba(6, 182, 212, 0.1)',
                color: '#06b6d4',
                fontWeight: 800,
              }}
            >
              {thumbnails.length} Items Available
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-dim)' }}>
            Special broadcast image frames and profile thumbnails with validity duration and coin prices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setPricingModalOpen(true)}
            style={{ borderRadius: '8px', padding: '0.45rem 0.95rem', gap: '6px', fontWeight: 700 }}
            title="Configure user custom thumbnail upload duration & coins"
          >
            <Sliders size={14} color="#ec4899" />
            <span>Upload Pricing Plans</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenAssignModal()}
            style={{ borderRadius: '8px', padding: '0.45rem 0.95rem', gap: '6px', fontWeight: 700 }}
          >
            <Gift size={14} color="#06b6d4" />
            <span>Assign to User</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenCreate}
            style={{ borderRadius: '8px', padding: '0.45rem 1rem', gap: '6px', fontWeight: 700 }}
          >
            <Plus size={14} />
            <span>+ Add Thumbnail</span>
          </button>
        </div>
      </div>

      {/* 2 Tabs: Thumbnails & Assigned Users */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          paddingBottom: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentTab('thumbnails')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: currentTab === 'thumbnails' ? 'var(--bg-secondary)' : 'transparent',
            color: currentTab === 'thumbnails' ? '#06b6d4' : 'var(--text-dim)',
            fontWeight: currentTab === 'thumbnails' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.92rem',
            borderBottom: currentTab === 'thumbnails' ? '3px solid #06b6d4' : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <ImageIcon size={17} />
          <span>Thumbnails</span>
          <span
            style={{
              fontSize: '0.72rem',
              padding: '1px 7px',
              borderRadius: '10px',
              background: currentTab === 'thumbnails' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.06)',
              color: currentTab === 'thumbnails' ? '#06b6d4' : 'var(--text-dim)',
              fontWeight: 700,
            }}
          >
            {thumbnails.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('assigned')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: currentTab === 'assigned' ? 'var(--bg-secondary)' : 'transparent',
            color: currentTab === 'assigned' ? '#06b6d4' : 'var(--text-dim)',
            fontWeight: currentTab === 'assigned' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.92rem',
            borderBottom: currentTab === 'assigned' ? '3px solid #06b6d4' : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <User size={17} />
          <span>Assigned Users</span>
          <span
            style={{
              fontSize: '0.72rem',
              padding: '1px 7px',
              borderRadius: '10px',
              background: currentTab === 'assigned' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.06)',
              color: currentTab === 'assigned' ? '#06b6d4' : 'var(--text-dim)',
              fontWeight: 700,
            }}
          >
            {subTotal}
          </span>
        </button>
      </div>

      {currentTab === 'thumbnails' && (
        <>
          {/* SECTION 1: CATALOG OF THUMBNAILS */}
          <div className="panel-card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Thumbnail Catalog ({thumbnails.length})
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Configured image thumbnails (image-only items) with durations and coin pricing
                </p>
              </div>

              {thumbnails.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-main)', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={selectedThumbIds.length === thumbnails.length && thumbnails.length > 0}
                    onChange={handleToggleSelectAllThumbs}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                  />
                  <span style={{ fontWeight: 600 }}>Select All</span>
                </label>
              )}
            </div>

        {/* Bulk Action Bar for Thumbnails */}
        <BulkActionBar
          selectedCount={selectedThumbIds.length}
          totalCount={thumbnails.length}
          onSelectAll={handleToggleSelectAllThumbs}
          onClearSelection={() => setSelectedThumbIds([])}
          onDelete={handleBulkDeleteThumbs}
          entityName="thumbnails"
          deleting={bulkDeletingThumbs}
        />

        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <Loader inline />
          </div>
        ) : thumbnails.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <ImageIcon size={38} style={{ opacity: 0.35, margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
              No thumbnails created yet
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '4px 0 1rem' }}>
              Add your first thumbnail image with price and validity days.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
              + Add First Thumbnail
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {thumbnails.map((item) => {
              const isSelected = selectedThumbIds.includes(item.id);
              return (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-primary)',
                  border: isSelected ? '2px solid #ef4444' : '1px solid var(--border-color)',
                  boxShadow: isSelected ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  position: 'relative',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Selection Checkbox */}
                  <div style={{ alignSelf: 'flex-start' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectThumb(item.id)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                      title={`Select thumbnail #${item.id}`}
                    />
                  </div>

                  <img
                    src={resolveAssetUrl(item.image_url)}
                    alt={item.name}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '10px',
                      objectFit: 'cover',
                      border: '1px solid var(--border-color)',
                    }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300';
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </strong>
                      {Boolean(item.is_custom) && (
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 6px' }} title={`Uploaded by user #${item.uploader_id}`}>
                          Custom
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.76rem', color: '#06b6d4', fontWeight: 700 }}>
                        ⏳ {item.validity_days} Days
                      </span>
                      <span style={{ fontSize: '0.76rem', color: '#d97706', fontWeight: 700 }}>
                        🪙 {item.price?.toLocaleString()} Coins
                      </span>
                    </div>
                    {item.active_holders_count > 0 && (
                      <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                        👥 {item.active_holders_count} Active Users
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '0.65rem',
                  }}
                >
                  <span className={`badge ${item.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem' }}>
                    {item.is_active ? 'Active' : 'Disabled'}
                  </span>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenAssignModal(item.id)}
                      style={{ padding: '3px 8px', fontSize: '0.74rem', gap: '4px' }}
                      title="Assign to User"
                    >
                      <Gift size={12} color="#06b6d4" />
                      <span>Assign</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenEdit(item)}
                      style={{ padding: '3px 7px' }}
                      title="Edit Thumbnail"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteConfirm({ type: 'thumbnail', id: item.id, name: item.name });
                      }}
                      style={{ padding: '4px 8px', borderRadius: '6px' }}
                      title="Delete Thumbnail"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
        </>
      )}

      {/* TAB 2: ASSIGNED USERS (With Assign Form + Subscribed Users) */}
      {currentTab === 'assigned' && (
        <>
          {/* ASSIGN THUMBNAIL TO USER FORM */}
          <div className="panel-card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <Gift size={20} color="#06b6d4" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Assign Thumbnail to User
              </h2>
            </div>

            <form onSubmit={handleSubmitAssign} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              {/* User ID */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  User ID: *
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter User ID (e.g. 5)"
                    value={assignUserIdInput}
                    onChange={(e) => setAssignUserIdInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSearchUser}
                    disabled={searchingAssignUser}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {searchingAssignUser ? 'Checking...' : 'Check'}
                  </button>
                </div>
              </div>

              {/* Select Thumbnail */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Select Thumbnail: *
                </label>
                <select
                  className="input-field"
                  value={assignThumbId}
                  onChange={(e) => setAssignThumbId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Thumbnail --</option>
                  {thumbnails.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.validity_days} Days) - {t.price?.toLocaleString()} Coins
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Duration (Days - Optional):
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  placeholder={selectedAssignThumb ? `Default: ${selectedAssignThumb.validity_days} Days` : 'Thumbnail default days'}
                  value={assignCustomDays}
                  onChange={(e) => setAssignCustomDays(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '3px' }}>
                  {selectedAssignThumb
                    ? `Leave empty to assign default (${selectedAssignThumb.validity_days} days)`
                    : 'If empty, default days will be assigned'}
                </span>
              </div>

              {/* Submit */}
              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingAssign || !assignUser || !assignThumbId}
                  style={{ width: '100%', padding: '0.55rem', fontWeight: 700 }}
                >
                  {submittingAssign ? 'Assigning...' : 'Assign Thumbnail'}
                </button>
              </div>
            </form>

            {/* Verified User Preview */}
            {assignUser && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <img
                  src={assignUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt=""
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)' }}>{assignUser.full_name}</strong>
                    <span className="user-id-badge">#{assignUser.id}</span>
                    <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>{assignUser.role}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{assignUser.email}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setAssignUser(null);
                    setAssignUserIdInput('');
                  }}
                  style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* SUBSCRIBED USERS TABLE */}
          <div className="panel-card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Thumbnail Assigned Users ({subTotal})
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Active and past user thumbnail assignments
                </p>
              </div>

            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search user ID / name..."
                value={subSearch}
                onChange={(e) => {
                  setSubSearch(e.target.value);
                  setSubPage(1);
                }}
                style={{ paddingLeft: '2.2rem', paddingRight: '0.75rem', paddingTop: '0.35rem', paddingBottom: '0.35rem', fontSize: '0.84rem' }}
              />
            </div>
          </div>

          {/* Bulk Action Bar for Subscribers */}
          <BulkActionBar
            selectedCount={selectedSubIds.length}
            totalCount={subscribers.length}
            onSelectAll={handleToggleSelectAllSubs}
            onClearSelection={() => setSelectedSubIds([])}
            onDelete={handleBulkRevokeSubs}
            entityName="assigned thumbnail subscriptions"
            deleting={bulkRevokingSubs}
          />

          <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
            <table className="data-table" style={{ margin: 0, minWidth: '850px', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={subscribers.length > 0 && selectedSubIds.length === subscribers.length}
                      onChange={handleToggleSelectAllSubs}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                      title="Select all on this page"
                    />
                  </th>
                  <th>User ID</th>
                  <th>User Profile</th>
                  <th>Thumbnail Preview</th>
                  <th>Assigned Date</th>
                  <th>Expires Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingSubs ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem' }}>
                      <Loader inline />
                    </td>
                  </tr>
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                      No thumbnail holders found.
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub) => {
                    const isActive = Boolean(sub.is_currently_active);
                    const isSelected = selectedSubIds.includes(sub.subscription_id);
                    return (
                      <tr key={sub.subscription_id} style={isSelected ? { backgroundColor: 'rgba(239, 68, 68, 0.08)' } : {}}>
                        {/* Selection Checkbox */}
                        <td style={{ textAlign: 'center', width: '45px', padding: '0.75rem 0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectSub(sub.subscription_id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                            title={`Select assignment #${sub.subscription_id}`}
                          />
                        </td>

                        <td>
                          <span className="user-id-badge">#{sub.user_id}</span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={sub.user_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${sub.user_id}`}
                              alt=""
                              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                              <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', display: 'block' }}>
                                {sub.user_name || `User #${sub.user_id}`}
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{sub.user_email}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img
                              src={resolveAssetUrl(sub.thumbnail_image)}
                              alt=""
                              style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
                            />
                            <div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block' }}>
                                {sub.thumbnail_name}
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                {sub.validity_days} Days Pack
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                            {new Date(sub.start_date).toLocaleDateString()}
                          </span>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isActive ? 'var(--text-main)' : 'var(--text-dim)' }}>
                            {new Date(sub.expires_at).toLocaleDateString()}
                          </span>
                          {isActive && sub.days_remaining !== undefined && (
                            <div style={{ fontSize: '0.72rem', color: sub.days_remaining <= 3 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                              {sub.days_remaining === 0 ? 'Today' : `${sub.days_remaining} days left`}
                            </div>
                          )}
                        </td>

                        <td>
                          <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                            {isActive ? 'Active' : 'Expired'}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          {isActive && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'subscription',
                                  id: sub.subscription_id,
                                  name: `${sub.user_name || `User #${sub.user_id}`}'s ${sub.thumbnail_name}`,
                                })
                              }
                              style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid var(--border-color)' }}>
            <Pagination
              currentPage={subPage}
              totalPages={Math.ceil(subTotal / subPageSize) || 1}
              totalItems={subTotal}
              pageSize={subPageSize}
              onPageChange={(p) => setSubPage(p)}
              onPageSizeChange={(s) => {
                setSubPageSize(s);
                setSubPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        </div>
        </>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal-box" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={20} color="#06b6d4" />
                <span>{editingItem ? 'Edit Thumbnail' : 'Create Thumbnail'}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setModalOpen(false)}
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Thumbnail Name: *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Neon Cyber Frame, Golden Crown"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <FileUploadInput
                label="Thumbnail Image (Image only):"
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                category="thumbnails"
                accept="image/*"
                type="image"
                placeholder="https://example.com/thumbnail.png or click Upload from PC"
                required
                helperText="Thumbnails are image only (PNG, JPG, WebP, GIF). Supports uploading from PC or pasting URL."
                onToast={onToast}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Validity Duration (Days): *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={form.validity_days}
                    onChange={(e) => setForm({ ...form, validity_days: parseInt(e.target.value, 10) || 1 })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Price (Coins): *
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseInt(e.target.value, 10) || 0 })}
                    required
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem' }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  style={{ accentColor: '#06b6d4' }}
                />
                <span>Active (Available in Store)</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Thumbnail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div className="modal-box" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: '#ef4444',
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem' }}>
              Confirm {deleteConfirm.type === 'subscription' ? 'Revoke' : 'Delete'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: '0 0 1rem' }}>
              Are you sure you want to {deleteConfirm.type === 'subscription' ? 'revoke' : 'delete'}{' '}
              <strong style={{ color: 'var(--text-main)' }}>"{deleteConfirm.name}"</strong>?
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleExecuteDelete}
                disabled={deleting}
              >
                {deleting ? 'Processing...' : 'Yes, Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ASSIGN MODAL */}
      {assignModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setAssignModalOpen(false); }}>
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift size={20} color="#06b6d4" />
                <span>Assign Thumbnail to User</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setAssignModalOpen(false)}
                style={{ borderRadius: '50%', width: '30px', height: '30px', padding: 0 }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmitAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  User ID: *
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter User ID (e.g. 5)"
                    value={assignUserIdInput}
                    onChange={(e) => setAssignUserIdInput(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSearchUser}
                    disabled={searchingAssignUser}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {searchingAssignUser ? 'Checking...' : 'Check'}
                  </button>
                </div>
              </div>

              {assignUser && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <img
                    src={assignUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt=""
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>{assignUser.full_name}</strong>
                      <span className="user-id-badge">#{assignUser.id}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{assignUser.email}</span>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Select Thumbnail: *
                </label>
                <select
                  className="input-field"
                  value={assignThumbId}
                  onChange={(e) => setAssignThumbId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Thumbnail --</option>
                  {thumbnails.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.validity_days} Days) - {t.price?.toLocaleString()} Coins
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Duration (Days - Optional):
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  placeholder={selectedAssignThumb ? `Default: ${selectedAssignThumb.validity_days} Days` : 'Thumbnail default days'}
                  value={assignCustomDays}
                  onChange={(e) => setAssignCustomDays(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '3px' }}>
                  {selectedAssignThumb
                    ? `Leave empty to assign default (${selectedAssignThumb.validity_days} days)`
                    : 'If empty, default days will be assigned'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAssignModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingAssign || !assignUser || !assignThumbId}
                >
                  {submittingAssign ? 'Assigning...' : 'Assign Thumbnail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER CUSTOM THUMBNAIL DURATION & PRICING PLANS MODAL */}
      {pricingModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPricingModalOpen(false); }}>
          <div className="modal-box" style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} color="#ec4899" />
                <span>Custom Thumbnail Duration Pricing Plans</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPricingModalOpen(false)}
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Set how many days a user-uploaded custom room thumbnail remains active and how many coins it costs for each plan (কত দিনের জন্য কত কয়েন লাগবে).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {pricingTiers.map((tier, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'var(--bg-secondary)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', minWidth: '55px' }}>
                    Plan #{idx + 1}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Days:</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="input-field"
                      style={{ width: '80px', padding: '0.35rem 0.5rem' }}
                      value={tier.days}
                      onChange={(e) => handleTierChange(idx, 'days', e.target.value)}
                    />
                    <span style={{ fontSize: '0.78rem', color: '#06b6d4', fontWeight: 600 }}>Days 📅</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Coins:</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      className="input-field"
                      style={{ width: '100px', padding: '0.35rem 0.5rem' }}
                      value={tier.coins}
                      onChange={(e) => handleTierChange(idx, 'coins', e.target.value)}
                    />
                    <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>Coins 🪙</span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{ marginLeft: 'auto', padding: '0.3rem 0.55rem' }}
                    onClick={() => handleRemoveTier(idx)}
                    title="Remove plan"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddTier}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Add Plan</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPricingModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveTiers}
                  disabled={savingTiers}
                  style={{ background: '#ec4899', borderColor: '#db2777' }}
                >
                  {savingTiers ? 'Saving...' : 'Save Pricing Plans'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
