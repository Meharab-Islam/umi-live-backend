import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
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
  Volume2,
  VolumeX,
  Film,
  Zap,
} from 'lucide-react';
import specialItemApi from '../api/specialItemApi';
import { adminApi } from '../api/adminApi';
import userApi from '../api/userApi';
import { resolveAssetUrl } from '../api/client';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import FileUploadInput from '../components/FileUploadInput';
import BulkActionBar from '../components/BulkActionBar';

export default function EntryEffects({ onToast, embedded = false }) {
  const [effects, setEffects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('effects'); // 'effects' | 'assigned'

  // Bulk Selection for Effects
  const [selectedEffectIds, setSelectedEffectIds] = useState([]);
  const [bulkDeletingEffects, setBulkDeletingEffects] = useState(false);

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

  const handleToggleSelectAllEffects = () => {
    if (selectedEffectIds.length === effects.length) {
      setSelectedEffectIds([]);
    } else {
      setSelectedEffectIds(effects.map((e) => e.id));
    }
  };

  const handleToggleSelectEffect = (id) => {
    setSelectedEffectIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteEffects = async () => {
    if (selectedEffectIds.length === 0) return;
    try {
      setBulkDeletingEffects(true);
      const res = await adminApi.bulkDelete('entry_effects', selectedEffectIds);
      if (res.success) {
        onToast(`Successfully deleted ${res.count || selectedEffectIds.length} entry effects.`, 'success');
        setSelectedEffectIds([]);
        loadEffects();
      }
    } catch (err) {
      onToast(err.message || 'Failed to bulk delete entry effects.', 'error');
    } finally {
      setBulkDeletingEffects(false);
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
        await specialItemApi.revokeEntryEffectSubscription(subId).catch(() => {});
      }
      onToast(`Revoked ${selectedSubIds.length} entry effect assignments.`, 'success');
      setSelectedSubIds([]);
      loadSubscribers();
    } catch (err) {
      onToast(err.message || 'Failed to revoke subscriptions.', 'error');
    } finally {
      setBulkRevokingSubs(false);
    }
  };

  // Audio preview playing
  const [playingAudioUrl, setPlayingAudioUrl] = useState(null);
  const [audioElement, setAudioElement] = useState(null);

  // Assign form
  const [assignUserIdInput, setAssignUserIdInput] = useState('');
  const [assignUser, setAssignUser] = useState(null);
  const [searchingAssignUser, setSearchingAssignUser] = useState(false);
  const [assignEffectId, setAssignEffectId] = useState('');
  const [assignCustomDays, setAssignCustomDays] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const handleOpenAssignModal = (effId = '') => {
    if (effId) {
      setAssignEffectId(String(effId));
    }
    setAssignModalOpen(true);
  };

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    name: '',
    effect_type: 'gif', // 'svga' or 'gif'
    preview_image_url: '',
    svga_url: '',
    gif_url: '',
    sound_url: '',
    price: 3000,
    validity_days: 30,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEffects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await specialItemApi.getEntryEffects();
      if (res.success) {
        setEffects(res.effects || []);
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
      const res = await specialItemApi.getEntryEffectSubscribers({
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
    fetchEffects();
  }, [fetchEffects]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const togglePlayAudio = (soundUrl) => {
    if (!soundUrl) return;
    if (playingAudioUrl === soundUrl && audioElement) {
      audioElement.pause();
      setPlayingAudioUrl(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(soundUrl);
    audio.play().catch(() => onToast('Could not play audio preview.', 'error'));
    audio.onended = () => setPlayingAudioUrl(null);
    setAudioElement(audio);
    setPlayingAudioUrl(soundUrl);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      name: '',
      effect_type: 'gif',
      preview_image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=300',
      svga_url: '',
      gif_url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
      sound_url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
      price: 3000,
      validity_days: 30,
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      effect_type: item.effect_type || 'gif',
      preview_image_url: item.preview_image_url || '',
      svga_url: item.svga_url || '',
      gif_url: item.gif_url || '',
      sound_url: item.sound_url || '',
      price: item.price,
      validity_days: item.validity_days,
      is_active: Boolean(item.is_active),
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      onToast('Entry effect name is required.', 'error');
      return;
    }

    if (form.effect_type === 'gif') {
      if (!form.gif_url.trim()) {
        onToast('GIF Image URL is required for GIF effect.', 'error');
        return;
      }
    } else {
      if (!form.svga_url.trim()) {
        onToast('SVGA file URL is required for SVGA effect.', 'error');
        return;
      }
      if (!form.preview_image_url.trim()) {
        onToast('Preview Image URL is required for SVGA effect.', 'error');
        return;
      }
    }

    try {
      setSaving(true);
      if (editingItem) {
        const res = await specialItemApi.updateEntryEffect(editingItem.id, form);
        if (res.success) {
          onToast(res.message, 'success');
          setModalOpen(false);
          fetchEffects();
        }
      } else {
        const res = await specialItemApi.createEntryEffect(form);
        if (res.success) {
          onToast(res.message, 'success');
          setModalOpen(false);
          fetchEffects();
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

  const selectedAssignEffect = effects.find((eff) => eff.id === parseInt(assignEffectId, 10)) || null;

  const handleSubmitAssign = async (e) => {
    e.preventDefault();
    if (!assignUser) {
      onToast('Please verify the target user first.', 'error');
      return;
    }
    if (!assignEffectId) {
      onToast('Please select an entry effect to assign.', 'error');
      return;
    }

    try {
      setSubmittingAssign(true);
      const parsedDays = parseInt(assignCustomDays, 10);
      const daysToAssign = (!isNaN(parsedDays) && parsedDays > 0)
        ? parsedDays
        : (selectedAssignEffect ? selectedAssignEffect.validity_days : undefined);

      const res = await specialItemApi.grantEntryEffect({
        userId: assignUser.id,
        effectId: assignEffectId,
        customValidityDays: daysToAssign,
      });

      if (res.success) {
        onToast(res.message, 'success');
        setAssignModalOpen(false);
        setAssignUserIdInput('');
        setAssignUser(null);
        setAssignEffectId('');
        setAssignCustomDays('');
        fetchSubscribers();
        fetchEffects();
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
      if (deleteConfirm.type === 'effect') {
        const res = await specialItemApi.deleteEntryEffect(deleteConfirm.id);
        if (res.success) {
          onToast(res.message, 'success');
          fetchEffects();
          fetchSubscribers();
        }
      } else if (deleteConfirm.type === 'subscription') {
        const res = await specialItemApi.revokeEntryEffect(deleteConfirm.id);
        if (res.success) {
          onToast(res.message, 'success');
          fetchSubscribers();
          fetchEffects();
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
          Entry Effects ({effects.length})
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenAssignModal()}
            style={{ borderRadius: '8px', padding: '0.45rem 0.95rem', gap: '6px' }}
          >
            <Gift size={14} color="#ec4899" />
            <span>Assign to User</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenCreate}
            style={{ borderRadius: '8px', padding: '0.45rem 1rem', gap: '6px' }}
          >
            <Plus size={14} />
            <span>Add Effect</span>
          </button>
        </div>
      </div>

      {/* 2 Tabs: Entry Effects & Assigned Users */}
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
          onClick={() => setCurrentTab('effects')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: currentTab === 'effects' ? 'var(--bg-secondary)' : 'transparent',
            color: currentTab === 'effects' ? '#ec4899' : 'var(--text-dim)',
            fontWeight: currentTab === 'effects' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.92rem',
            borderBottom: currentTab === 'effects' ? '3px solid #ec4899' : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <Sparkles size={17} />
          <span>Entry Effects</span>
          <span
            style={{
              fontSize: '0.72rem',
              padding: '1px 7px',
              borderRadius: '10px',
              background: currentTab === 'effects' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255,255,255,0.06)',
              color: currentTab === 'effects' ? '#ec4899' : 'var(--text-dim)',
              fontWeight: 700,
            }}
          >
            {effects.length}
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
            color: currentTab === 'assigned' ? '#ec4899' : 'var(--text-dim)',
            fontWeight: currentTab === 'assigned' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.92rem',
            borderBottom: currentTab === 'assigned' ? '3px solid #ec4899' : '3px solid transparent',
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
              background: currentTab === 'assigned' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255,255,255,0.06)',
              color: currentTab === 'assigned' ? '#ec4899' : 'var(--text-dim)',
              fontWeight: 700,
            }}
          >
            {subTotal}
          </span>
        </button>
      </div>

      {currentTab === 'effects' && (
        <>
          {/* SECTION 1: CATALOG OF ENTRY EFFECTS */}
          <div className="panel-card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Entry Effects Catalog ({effects.length})
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Configured entrance effects supporting SVGA and GIF with sound effects
                </p>
              </div>

              {effects.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-main)', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={selectedEffectIds.length === effects.length && effects.length > 0}
                    onChange={handleToggleSelectAllEffects}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                  />
                  <span style={{ fontWeight: 600 }}>Select All</span>
                </label>
              )}
            </div>

        {/* Bulk Action Bar for Effects */}
        <BulkActionBar
          selectedCount={selectedEffectIds.length}
          totalCount={effects.length}
          onSelectAll={handleToggleSelectAllEffects}
          onClearSelection={() => setSelectedEffectIds([])}
          onDelete={handleBulkDeleteEffects}
          entityName="entry effects"
          deleting={bulkDeletingEffects}
        />

        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <Loader inline />
          </div>
        ) : effects.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--bg-primary)', borderRadius: '12px' }}>
            <Sparkles size={38} style={{ opacity: 0.35, margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
              No entry effects created yet
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '4px 0 1rem' }}>
              Create an animated entrance effect in SVGA or GIF format with sound.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
              + Add First Effect
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1rem' }}>
            {effects.map((item) => {
              const isGif = item.effect_type === 'gif';
              const displayImage = isGif ? (item.gif_url || item.preview_image_url) : (item.preview_image_url || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=300');
              const isSelected = selectedEffectIds.includes(item.id);

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
                        onChange={() => handleToggleSelectEffect(item.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                        title={`Select entry effect #${item.id}`}
                      />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <img
                        src={resolveAssetUrl(displayImage)}
                        alt={item.name}
                        style={{
                          width: '68px',
                          height: '68px',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          border: '1px solid var(--border-color)',
                        }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=300';
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-4px',
                          right: '-4px',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '6px',
                          background: isGif ? '#8b5cf6' : '#ec4899',
                          color: '#fff',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.effect_type}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </strong>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.76rem', color: '#ec4899', fontWeight: 700 }}>
                          ⏳ {item.validity_days} Days
                        </span>
                        <span style={{ fontSize: '0.76rem', color: '#d97706', fontWeight: 700 }}>
                          🪙 {item.price?.toLocaleString()} Coins
                        </span>
                      </div>

                      {/* Sound or SVGA details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
                        {isGif && item.sound_url && (
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(item.sound_url)}
                            style={{
                              border: 'none',
                              background: playingAudioUrl === item.sound_url ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255,255,255,0.06)',
                              color: playingAudioUrl === item.sound_url ? '#ec4899' : 'var(--text-main)',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Volume2 size={11} />
                            <span>{playingAudioUrl === item.sound_url ? 'Playing...' : 'Audio Preview'}</span>
                          </button>
                        )}

                        {!isGif && item.svga_url && (
                          <span style={{ fontSize: '0.68rem', color: '#ec4899', fontWeight: 600 }}>
                            SVGA Asset Ready
                          </span>
                        )}
                      </div>
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
                        <Gift size={12} color="#ec4899" />
                        <span>Assign</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEdit(item)}
                        style={{ padding: '3px 7px' }}
                        title="Edit Effect"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteConfirm({ type: 'effect', id: item.id, name: item.name });
                        }}
                        style={{ padding: '4px 8px', borderRadius: '6px' }}
                        title="Delete Effect"
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
          {/* ASSIGN ENTRY EFFECT TO USER FORM */}
          <div className="panel-card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <Gift size={20} color="#ec4899" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Assign Entry Effect to User
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

              {/* Select Effect */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Select Entry Effect: *
                </label>
                <select
                  className="input-field"
                  value={assignEffectId}
                  onChange={(e) => setAssignEffectId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Entry Effect --</option>
                  {effects.map((eff) => (
                    <option key={eff.id} value={eff.id}>
                      {eff.name} ({eff.effect_type.toUpperCase()}) - {eff.validity_days} Days - {eff.price?.toLocaleString()} Coins
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
                  placeholder={selectedAssignEffect ? `Default: ${selectedAssignEffect.validity_days} Days` : 'Effect default days'}
                  value={assignCustomDays}
                  onChange={(e) => setAssignCustomDays(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '3px' }}>
                  {selectedAssignEffect
                    ? `Leave empty to assign default (${selectedAssignEffect.validity_days} days)`
                    : 'If empty, default days will be assigned'}
                </span>
              </div>

              {/* Submit */}
              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingAssign || !assignUser || !assignEffectId}
                  style={{ width: '100%', padding: '0.55rem', fontWeight: 700 }}
                >
                  {submittingAssign ? 'Assigning...' : 'Assign Effect'}
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
                  background: 'rgba(236, 72, 153, 0.08)',
                  border: '1px solid rgba(236, 72, 153, 0.25)',
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
                  Effect Assigned Users ({subTotal})
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Active and past user entrance effect assignments
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
          entityName="assigned effect subscriptions"
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
                <th>Effect</th>
                <th>Format</th>
                <th>Assigned Date</th>
                <th>Expires Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingSubs ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <Loader inline />
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                    No effect holders found.
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => {
                  const isActive = Boolean(sub.is_currently_active);
                  const isGif = sub.effect_type === 'gif';
                  const displayImg = isGif ? (sub.gif_url || sub.preview_image_url) : (sub.preview_image_url || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=300');
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
                            src={resolveAssetUrl(displayImg)}
                            alt=""
                            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                          <div>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block' }}>
                              {sub.effect_name}
                            </strong>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              {sub.validity_days} Days Pack
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: isGif ? 'rgba(139, 92, 246, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                            color: isGif ? '#8b5cf6' : '#ec4899',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {sub.effect_type}
                        </span>
                        {isGif && sub.sound_url && (
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(sub.sound_url)}
                            style={{
                              marginLeft: '6px',
                              border: 'none',
                              background: 'transparent',
                              color: playingAudioUrl === sub.sound_url ? '#ec4899' : 'var(--text-dim)',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            title="Play sound effect"
                          >
                            <Volume2 size={13} style={{ verticalAlign: 'middle' }} />
                          </button>
                        )}
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
                                name: `${sub.user_name || `User #${sub.user_id}`}'s ${sub.effect_name}`,
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
          <div className="modal-box" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#ec4899" />
                <span>{editingItem ? 'Edit Entry Effect' : 'Create Entry Effect'}</span>
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

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Effect Name: *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Dragon Descent, Supercar Arrival"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {/* Format Selection: SVGA vs GIF */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Effect Format: *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {/* Option 1: SVGA */}
                  <label
                    style={{
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: form.effect_type === 'svga' ? '2px solid #ec4899' : '1px solid var(--border-color)',
                      background: form.effect_type === 'svga' ? 'rgba(236, 72, 153, 0.08)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <input
                      type="radio"
                      name="effect_type"
                      value="svga"
                      checked={form.effect_type === 'svga'}
                      onChange={() => setForm({ ...form, effect_type: 'svga' })}
                      style={{ accentColor: '#ec4899' }}
                    />
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'block' }}>SVGA Animation</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Preview Image + SVGA file</span>
                    </div>
                  </label>

                  {/* Option 2: GIF */}
                  <label
                    style={{
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: form.effect_type === 'gif' ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                      background: form.effect_type === 'gif' ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <input
                      type="radio"
                      name="effect_type"
                      value="gif"
                      checked={form.effect_type === 'gif'}
                      onChange={() => setForm({ ...form, effect_type: 'gif' })}
                      style={{ accentColor: '#8b5cf6' }}
                    />
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'block' }}>GIF Animation</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>GIF image + Entrance sound</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Dynamic Inputs based on format */}
              {form.effect_type === 'svga' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                  <FileUploadInput
                    label="Static Preview / Cover Image (Image only):"
                    value={form.preview_image_url}
                    onChange={(url) => setForm({ ...form, preview_image_url: url })}
                    category="entry_effects"
                    accept="image/*"
                    type="image"
                    placeholder="https://example.com/preview.png or Upload from PC"
                    required
                    helperText="Image badge representing the effect in lists and profiles."
                    onToast={onToast}
                  />

                  <FileUploadInput
                    label="SVGA Animation File (*.svga):"
                    value={form.svga_url}
                    onChange={(url) => setForm({ ...form, svga_url: url })}
                    category="entry_effects"
                    accept=".svga"
                    type="svga"
                    placeholder="https://example.com/effects/arrival.svga or Upload .svga from PC"
                    required
                    helperText="Upload or enter URL to the .svga vector animation file."
                    onToast={onToast}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                  <FileUploadInput
                    label="GIF Animation File (*.gif / image):"
                    value={form.gif_url}
                    onChange={(url) => setForm({ ...form, gif_url: url })}
                    category="entry_effects"
                    accept="image/*,.gif"
                    type="image"
                    placeholder="https://example.com/animation.gif or Upload GIF from PC"
                    required
                    helperText="Animated GIF file for live room entrance."
                    onToast={onToast}
                  />

                  <FileUploadInput
                    label="Entrance Sound Audio (MP3/WAV/AAC - Optional):"
                    value={form.sound_url}
                    onChange={(url) => setForm({ ...form, sound_url: url })}
                    category="entry_effects"
                    accept="audio/*,.mp3,.wav,.aac,.ogg,.m4a"
                    type="audio"
                    placeholder="https://example.com/audio/fanfare.mp3 or Upload Sound from PC"
                    helperText="Sound played automatically when entering the room with this effect."
                    onToast={onToast}
                  />
                </div>
              )}

              {/* Price and Validity */}
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
                  style={{ accentColor: '#ec4899' }}
                />
                <span>Active (Available in Store)</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Effect'}
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
                <Gift size={20} color="#ec4899" />
                <span>Assign Entry Effect to User</span>
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
                    background: 'rgba(236, 72, 153, 0.08)',
                    border: '1px solid rgba(236, 72, 153, 0.25)',
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
                  Select Entry Effect: *
                </label>
                <select
                  className="input-field"
                  value={assignEffectId}
                  onChange={(e) => setAssignEffectId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Entry Effect --</option>
                  {effects.map((eff) => (
                    <option key={eff.id} value={eff.id}>
                      {eff.name} ({eff.effect_type.toUpperCase()}) - {eff.validity_days} Days - {eff.price?.toLocaleString()} Coins
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
                  placeholder={selectedAssignEffect ? `Default: ${selectedAssignEffect.validity_days} Days` : 'Effect default days'}
                  value={assignCustomDays}
                  onChange={(e) => setAssignCustomDays(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '3px' }}>
                  {selectedAssignEffect
                    ? `Leave empty to assign default (${selectedAssignEffect.validity_days} days)`
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
                  disabled={submittingAssign || !assignUser || !assignEffectId}
                >
                  {submittingAssign ? 'Assigning...' : 'Assign Effect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
