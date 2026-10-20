import React, { useState, useEffect, useRef } from 'react';
import {
  Gift,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Sparkles,
  Trophy,
  Crown,
  Flame,
  AlertTriangle,
  Calendar,
  Users,
  Coins,
  RotateCcw,
  RefreshCw,
  Search,
  Upload,
  Music,
  Volume2,
  Play,
  Pause,
  Image as ImageIcon,
  Check,
  FileCode,
  Zap,
} from 'lucide-react';
import giftApi from '../api/giftApi';
import { adminApi } from '../api/adminApi';
import { settingsApi } from '../api/settingsApi';
import Loader from '../components/Loader';
import BulkActionBar from '../components/BulkActionBar';

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const host = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5050` : 'http://localhost:5050';
  return `${host}${url.startsWith('/') ? url : '/' + url}`;
};

const isMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/uploads/') || url.startsWith('blob:') || url.startsWith('data:');
};

export default function Gifts({ onToast }) {
  // Navigation Tabs: 'catalog' | 'contributors'
  const [activeTab, setActiveTab] = useState('catalog');

  // ==========================================
  // Catalog State
  // ==========================================
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGift, setEditingGift] = useState(null);

  // Bulk Selection State
  const [selectedGiftIds, setSelectedGiftIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Upload format mode: 'svga' (Image preview + SVGA) | 'gif' (GIF + Sound)
  const [formatMode, setFormatMode] = useState('svga');

  // Uploading progress indicators
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingAnimation, setUploadingAnimation] = useState(false);
  const [uploadingSound, setUploadingSound] = useState(false);

  // Card Audio Player State
  const [playingSoundGiftId, setPlayingSoundGiftId] = useState(null);
  const audioPlayerRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    icon_url: '',
    animation_type: 'svga',
    animation_url: '',
    sound_url: '',
    coin_cost: 100,
    diamond_reward: 50,
    category: 'Popular',
  });

  // ==========================================
  // Top Contributors State
  // ==========================================
  const [period, setPeriod] = useState('month'); // 'month' | '30days' | 'today' | 'all'
  const [contributorsData, setContributorsData] = useState({
    summary: { total_coins_spent: 0, total_transactions: 0, total_active_gifters: 0 },
    contributors: [],
  });
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [contributorSearch, setContributorSearch] = useState('');

  // Clear History Modal State
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [clearPeriod, setClearPeriod] = useState('all'); // 'all' | 'month'

  const quickIcons = ['🌹', '💖', '🍦', '👑', '🏎️', '🚀', '🏰', '🐉', '🛥️', '⭐', '🎉', '🦄'];

  // ==========================================
  // Fetch Functions
  // ==========================================
  const fetchGifts = async () => {
    try {
      setLoading(true);
      const res = await giftApi.getGifts();
      if (res.success) {
        setGifts(res.gifts || []);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopContributors = async () => {
    try {
      setLoadingContributors(true);
      const res = await giftApi.getTopContributors({ period });
      if (res.success) {
        setContributorsData({
          summary: res.summary || { total_coins_spent: 0, total_transactions: 0, total_active_gifters: 0 },
          contributors: res.contributors || [],
        });
      }
    } catch (err) {
      onToast(err.message || 'Failed to load top contributors.', 'error');
    } finally {
      setLoadingContributors(false);
    }
  };

  // Economy Mode Setting
  const [isDiamondMode, setIsDiamondMode] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await settingsApi.getSettings();
      if (res && res.success && Array.isArray(res.settings)) {
        const mode = res.settings.find((s) => s.key_name === 'is_convert_to_diamond');
        setIsDiamondMode(mode ? mode.key_value !== 'false' : true);
      }
    } catch (e) {
      console.warn('Failed to load economy mode in Gifts page:', e);
    }
  };

  useEffect(() => {
    fetchGifts();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'contributors') {
      fetchTopContributors();
    }
  }, [activeTab, period]);

  // ==========================================
  // Catalog Handlers
  // ==========================================
  const handleToggleSelectAll = () => {
    if (selectedGiftIds.length === gifts.length) {
      setSelectedGiftIds([]);
    } else {
      setSelectedGiftIds(gifts.map((g) => g.id));
    }
  };

  const handleToggleSelectGift = (id) => {
    setSelectedGiftIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteGifts = async () => {
    if (selectedGiftIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await adminApi.bulkDelete('gifts', selectedGiftIds);
      if (res.success) {
        onToast(`Successfully deleted ${res.count || selectedGiftIds.length} gifts.`, 'success');
        setSelectedGiftIds([]);
        fetchGifts();
      }
    } catch (err) {
      onToast(err.message || 'Failed to bulk delete gifts.', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handlePlaySound = (giftId, soundUrl) => {
    if (!soundUrl) return;
    if (playingSoundGiftId === giftId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setPlayingSoundGiftId(null);
      return;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    const audio = new Audio(resolveMediaUrl(soundUrl));
    audioPlayerRef.current = audio;
    setPlayingSoundGiftId(giftId);
    audio.play().catch(() => {});
    audio.onended = () => {
      setPlayingSoundGiftId(null);
      audioPlayerRef.current = null;
    };
  };

  const handleFileUpload = async (file, targetField, setUploading) => {
    if (!file) return;
    try {
      setUploading(true);
      const res = await giftApi.uploadMedia(file);
      if (res.success && res.url) {
        setFormData((prev) => {
          const next = { ...prev, [targetField]: res.url };
          // If uploading GIF as animation, set both icon_url and animation_url
          if (targetField === 'animation_url' && formatMode === 'gif') {
            next.icon_url = res.url;
          }
          return next;
        });
        if (onToast) onToast(`${file.name} uploaded successfully!`, 'success');
      } else {
        if (onToast) onToast(res.message || 'File upload failed', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'File upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const openCreateModal = () => {
    setEditingGift(null);
    setFormatMode('svga');
    setFormData({
      name: '',
      icon_url: '',
      animation_type: 'svga',
      animation_url: '',
      sound_url: '',
      coin_cost: 100,
      diamond_reward: isDiamondMode ? 50 : 0,
      category: 'Popular',
    });
    setModalOpen(true);
  };

  const openEditModal = (gift) => {
    setEditingGift(gift);
    const mode = gift.animation_type === 'gif' ? 'gif' : 'svga';
    setFormatMode(mode);
    setFormData({
      name: gift.name || '',
      icon_url: gift.icon_url || '',
      animation_type: gift.animation_type || mode,
      animation_url: gift.animation_url || '',
      sound_url: gift.sound_url || '',
      coin_cost: gift.coin_cost || 100,
      diamond_reward: isDiamondMode ? (gift.diamond_reward || Math.floor((gift.coin_cost || 100) / 2)) : (gift.diamond_reward || 0),
      category: gift.category || 'Popular',
    });
    setModalOpen(true);
  };

  const handleSaveGift = async (e) => {
    e.preventDefault();
    if (!formData.coin_cost || formData.coin_cost <= 0) {
      if (onToast) onToast('Please enter a valid coin cost (must be greater than 0)', 'error');
      return;
    }

    if (formatMode === 'svga') {
      if (!formData.icon_url && !formData.animation_url) {
        if (onToast) onToast('Please upload an image preview or SVGA animation file', 'error');
        return;
      }
    } else {
      if (!formData.icon_url && !formData.animation_url) {
        if (onToast) onToast('Please upload a GIF animation file', 'error');
        return;
      }
    }

    const finalName = formData.name ? formData.name.trim() : (formatMode === 'gif' ? 'GIF Gift' : 'SVGA Gift');
    const finalIcon = formData.icon_url || formData.animation_url || '';
    const finalAnim = formData.animation_url || (formatMode === 'gif' ? finalIcon : '');
    const finalSound = formatMode === 'gif' ? (formData.sound_url || null) : (formData.sound_url || null);

    const payload = {
      ...formData,
      name: finalName,
      icon_url: finalIcon,
      animation_url: finalAnim,
      sound_url: finalSound,
      animation_type: formatMode,
      diamond_reward: isDiamondMode ? (formData.diamond_reward || Math.floor(formData.coin_cost / 2)) : 0,
    };

    try {
      if (editingGift) {
        const res = await giftApi.updateGift(editingGift.id, payload);
        if (res.success) {
          if (onToast) onToast('Gift updated successfully!', 'success');
        }
      } else {
        const res = await giftApi.createGift(payload);
        if (res.success) {
          if (onToast) onToast('Gift created successfully!', 'success');
        }
      }
      setModalOpen(false);
      fetchGifts();
    } catch (err) {
      if (onToast) onToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this gift?')) return;
    try {
      const res = await giftApi.deleteGift(id);
      if (res.success) {
        onToast('Gift deleted.', 'success');
        fetchGifts();
      }
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  const handleToggleActive = async (gift) => {
    try {
      const res = await giftApi.updateGift(gift.id, { is_active: !gift.is_active });
      if (res.success) {
        onToast(`Gift is now ${!gift.is_active ? 'active' : 'inactive'}`, 'success');
        fetchGifts();
      }
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  // ==========================================
  // Clear Gift History Handler
  // ==========================================
  const handleConfirmClearHistory = async () => {
    try {
      setClearingHistory(true);
      const res = await giftApi.clearGiftHistory({ period: clearPeriod });
      if (res.success) {
        onToast(res.message || 'Gift transaction history cleared successfully.', 'success');
        setClearModalOpen(false);
        fetchTopContributors();
      }
    } catch (err) {
      onToast(err.message || 'Failed to clear gift history.', 'error');
    } finally {
      setClearingHistory(false);
    }
  };

  // Filtered contributors for search
  const filteredContributors = contributorsData.contributors.filter((c) => {
    if (!contributorSearch.trim()) return true;
    const term = contributorSearch.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(term) ||
      String(c.user_id).includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  });

  const top3 = filteredContributors.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header & Main Tab Switcher */}
      <div className="panel-card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🎁</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Virtual Gift Economy & Contributors
              </h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: '0.25rem 0 0' }}>
              Manage gifts catalog, monitor top gifting supporters, and audit economy transaction flows.
            </p>
          </div>

          {/* Navigation Pill Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-primary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveTab('catalog')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.95rem',
                borderRadius: '7px',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeTab === 'catalog' ? 'var(--color-primary, #6366f1)' : 'transparent',
                color: activeTab === 'catalog' ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              <Gift size={16} />
              <span>Gifts Catalog ({gifts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('contributors')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.95rem',
                borderRadius: '7px',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeTab === 'contributors' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                color: activeTab === 'contributors' ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              <Trophy size={16} />
              <span>Top Contributors</span>
              <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: activeTab === 'contributors' ? 'rgba(0,0,0,0.25)' : 'var(--bg-card-hover)', color: '#fff' }}>
                HOT
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: GIFTS CATALOG                                      */}
      {/* ========================================================= */}
      {activeTab === 'catalog' && (
        <>
          {/* Action Toolbar */}
          <div className="panel-card" style={{ padding: '0.75rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Configure items that viewers purchase with coins to send in live broadcasts.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {gifts.length > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-main)', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={selectedGiftIds.length === gifts.length && gifts.length > 0}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                    />
                    <span style={{ fontWeight: 600 }}>Select All</span>
                  </label>
                )}

                <button className="btn btn-primary" onClick={openCreateModal}>
                  <Plus size={16} />
                  <span>Create New Gift</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Action Bar */}
          <BulkActionBar
            selectedCount={selectedGiftIds.length}
            totalCount={gifts.length}
            onSelectAll={handleToggleSelectAll}
            onClearSelection={() => setSelectedGiftIds([])}
            onDelete={handleBulkDeleteGifts}
            entityName="gifts"
            deleting={bulkDeleting}
          />

          {/* Gifts Grid */}
          {loading ? (
            <Loader text="Loading virtual gifts catalog..." size="lg" />
          ) : gifts.length === 0 ? (
            <div className="panel-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <Gift size={48} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Gifts in Catalog</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', maxWidth: '400px', margin: '0.5rem auto 1.5rem' }}>
                Create your first virtual gift to start monetizing live broadcasts.
              </p>
              <button className="btn btn-primary" onClick={openCreateModal}>
                <Plus size={16} />
                <span>Create New Gift</span>
              </button>
            </div>
          ) : (
            <div className="gifts-grid">
              {gifts.map((gift) => {
                const isSelected = selectedGiftIds.includes(gift.id);
                return (
                  <div
                    key={gift.id}
                    className="panel-card"
                    style={{
                      padding: '1.25rem',
                      textAlign: 'center',
                      opacity: gift.is_active ? 1 : 0.6,
                      border: isSelected ? '2px solid #ef4444' : gift.is_active ? '1px solid var(--border-color)' : '1px dashed rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    {/* Selection Checkbox */}
                    <div
                      style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectGift(gift.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                      />
                    </div>

                    {/* Animation format tag */}
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      {gift.animation_type === 'svga' ? (
                        <span style={{ fontSize: '0.65rem', color: '#c084fc', background: 'rgba(139, 92, 246, 0.18)', border: '1px solid rgba(139, 92, 246, 0.35)', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                          ⚡ SVGA
                        </span>
                      ) : gift.animation_type === 'gif' ? (
                        <span style={{ fontSize: '0.65rem', color: '#f472b6', background: 'rgba(236, 72, 153, 0.18)', border: '1px solid rgba(236, 72, 153, 0.35)', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                          🎞️ GIF {gift.sound_url ? '+ 🔊' : ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px' }}>
                          {gift.animation_type || 'standard'}
                        </span>
                      )}
                    </div>

                    {/* Icon / Emoji / Image / GIF graphic */}
                    <div
                      style={{
                        margin: '1.25rem 0 0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '80px',
                      }}
                    >
                      {isMediaUrl(gift.icon_url) ? (
                        <img
                          src={resolveMediaUrl(gift.icon_url)}
                          alt={gift.name || 'Gift'}
                          style={{
                            width: '76px',
                            height: '76px',
                            objectFit: 'contain',
                            borderRadius: '10px',
                            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.25))',
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: '3.2rem',
                            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.15))',
                            lineHeight: 1,
                          }}
                        >
                          {gift.icon_url || '🎁'}
                        </div>
                      )}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      {gift.name || 'Gift'}
                    </div>

                    {/* Sound preview if gift has sound */}
                    {gift.sound_url && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySound(gift.id, gift.sound_url);
                        }}
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          marginBottom: '0.6rem',
                          cursor: 'pointer',
                          color: playingSoundGiftId === gift.id ? '#10b981' : '#f472b6',
                          borderColor: playingSoundGiftId === gift.id ? '#10b981' : 'rgba(244, 114, 182, 0.35)',
                          background: playingSoundGiftId === gift.id ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 114, 182, 0.1)',
                          border: '1px solid',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                        }}
                      >
                        <Volume2 size={12} />
                        <span>{playingSoundGiftId === gift.id ? 'Playing Sound...' : 'Test Audio'}</span>
                      </button>
                    )}

                    {/* Pricing & Host Reward */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        width: '100%',
                        marginBottom: '1rem',
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 700 }}>
                        🪙 {gift.coin_cost} Coins
                      </div>
                      {isDiamondMode && (
                        <div style={{ fontSize: '0.8rem', color: '#0e7490', fontWeight: 700 }}>
                          💎 +{gift.diamond_reward}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: 'auto' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => openEditModal(gift)}
                      >
                        <Edit size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleToggleActive(gift)}
                        title={gift.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {gift.is_active ? <CheckCircle size={14} color="#059669" /> : <XCircle size={14} color="#f43f5e" />}
                      </button>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDelete(gift.id)}
                        title="Delete Gift"
                      >
                        <Trash2 size={13} color="#fda4af" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 2: TOP CONTRIBUTORS LEADERBOARD                       */}
      {/* ========================================================= */}
      {activeTab === 'contributors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Controls Bar: Time Filter, Search & Clear History */}
          <div className="panel-card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Period Filter Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', marginRight: '0.25rem' }}>
                  Filter Period:
                </span>
                {[
                  { id: 'month', label: '📅 This Month' },
                  { id: '30days', label: '⏳ Last 30 Days' },
                  { id: 'today', label: '⚡ Today' },
                  { id: 'all', label: '🌟 All Time' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      border: period === p.id ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                      background: period === p.id ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-primary)',
                      color: period === p.id ? '#f59e0b' : 'var(--text-muted)',
                      fontSize: '0.82rem',
                      fontWeight: period === p.id ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Right Side: Refresh & Danger Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={fetchTopContributors}
                  disabled={loadingContributors}
                  title="Refresh Leaderboard"
                >
                  <RefreshCw size={14} className={loadingContributors ? 'spin' : ''} />
                  <span>Refresh</span>
                </button>

                {/* Clear History Button (Admin Purge) */}
                <button
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 700,
                  }}
                  onClick={() => setClearModalOpen(true)}
                  title="Reset / Clear all gift history"
                >
                  <Trash2 size={14} />
                  <span>Clear Gift History</span>
                </button>
              </div>
            </div>
          </div>

          {/* Metric Stats Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="panel-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.05))', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 700 }}>TOTAL COINS GIFTED</span>
                <span style={{ fontSize: '1.4rem' }}>🪙</span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)' }}>
                {contributorsData.summary.total_coins_spent.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                Spent on virtual gifts ({period === 'month' ? 'this month' : period})
              </div>
            </div>

            <div className="panel-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(79, 70, 229, 0.05))', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#6366f1', fontWeight: 700 }}>ACTIVE CONTRIBUTORS</span>
                <Users size={20} color="#6366f1" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)' }}>
                {contributorsData.summary.total_active_gifters.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                Unique users who sent gifts
              </div>
            </div>

            <div className="panel-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.05))', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700 }}>GIFT TRANSACTIONS</span>
                <Sparkles size={20} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)' }}>
                {contributorsData.summary.total_transactions.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                Total gift packets delivered
              </div>
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          {top3.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {top3.map((c, index) => {
                const medals = [
                  { label: '1st Place', color: '#f59e0b', medal: '🥇', bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.08))', border: '#f59e0b' },
                  { label: '2nd Place', color: '#94a3b8', medal: '🥈', bg: 'linear-gradient(135deg, rgba(148, 163, 184, 0.2), rgba(100, 116, 139, 0.08))', border: '#94a3b8' },
                  { label: '3rd Place', color: '#d97706', medal: '🥉', bg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.2), rgba(180, 83, 9, 0.08))', border: '#d97706' },
                ];
                const m = medals[index];

                return (
                  <div
                    key={c.user_id}
                    className="panel-card"
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      background: m.bg,
                      border: `1.5px solid ${m.border}`,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '1.4rem' }}>
                      {m.medal}
                    </div>

                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
                      <img
                        src={c.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={c.full_name}
                        style={{
                          width: '72px',
                          height: '72px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: `3px solid ${m.border}`,
                          boxShadow: `0 4px 14px ${m.border}40`,
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-4px',
                          right: '-4px',
                          background: m.border,
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '10px',
                        }}
                      >
                        #{c.rank}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.25rem' }}>
                      {c.full_name}
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.72rem', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '6px', color: 'var(--text-dim)' }}>
                        ID: #{c.user_id}
                      </span>
                      {c.vip_category && c.vip_category !== 'Standard' && (
                        <span style={{ fontSize: '0.72rem', background: `${c.vip_color || '#7c3aed'}25`, color: c.vip_color || '#7c3aed', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          {c.vip_badge} {c.vip_category}
                        </span>
                      )}
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>TOTAL GIFTED</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.15rem' }}>
                        🪙 {c.total_coins_gifted.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                        {c.total_gifts_sent} gifts sent to {c.total_recipients} hosts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="panel-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                  Top Contributor Rankings ({filteredContributors.length})
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0.2rem 0 0' }}>
                  Users sorted by total coins gifted descending. Click to view profiles.
                </p>
              </div>

              {/* Search Box */}
              <div style={{ position: 'relative', width: '240px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Search contributor..."
                  className="input-field"
                  style={{ paddingLeft: '32px', fontSize: '0.82rem', height: '34px' }}
                  value={contributorSearch}
                  onChange={(e) => setContributorSearch(e.target.value)}
                />
              </div>
            </div>

            {loadingContributors ? (
              <Loader text="Loading top contributors..." size="md" />
            ) : filteredContributors.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                <Trophy size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>No contributors found for this period.</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {period === 'month' ? 'No gifts sent in this month yet, or gift history was cleared.' : 'Try selecting another time range.'}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 0.5rem', width: '60px', textAlign: 'center' }}>RANK</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>CONTRIBUTOR</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>COINS GIFTED</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>GIFTS SENT</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>HOSTS SUPPORTED</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>LAST ACTIVITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContributors.map((c) => {
                      const medalMap = { 1: '🥇', 2: '🥈', 3: '🥉' };
                      return (
                        <tr
                          key={c.user_id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'background 0.12s',
                          }}
                        >
                          {/* Rank */}
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>
                            {medalMap[c.rank] ? (
                              <span style={{ fontSize: '1.15rem' }}>{medalMap[c.rank]}</span>
                            ) : (
                              <span style={{ color: 'var(--text-dim)' }}>#{c.rank}</span>
                            )}
                          </td>

                          {/* Contributor Info */}
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <img
                                src={c.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                                alt={c.full_name}
                                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.full_name}</span>
                                  {c.vip_category && c.vip_category !== 'Standard' && (
                                    <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: `${c.vip_color || '#7c3aed'}25`, color: c.vip_color || '#7c3aed', fontWeight: 700 }}>
                                      {c.vip_badge} {c.vip_category}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)' }}>
                                  ID: #{c.user_id} • Level {c.level} • {c.email || c.mobile_number || 'No contact'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Coins Gifted */}
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 800, color: '#f59e0b', fontSize: '0.92rem' }}>
                            🪙 {c.total_coins_gifted.toLocaleString()}
                          </td>

                          {/* Gifts Sent */}
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600 }}>
                            {c.total_gifts_sent.toLocaleString()}
                          </td>

                          {/* Hosts Supported */}
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                            {c.total_recipients}
                          </td>

                          {/* Last Activity */}
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                            {c.last_gifted_at ? new Date(c.last_gifted_at).toLocaleString() : 'N/A'}
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

      {/* ========================================================= */}
      {/* MODAL: Clear Gift History Confirmation                    */}
      {/* ========================================================= */}
      {clearModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '460px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ef4444', marginBottom: '0.75rem' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Clear Gift Transaction History
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.45', marginBottom: '1rem' }}>
              Are you sure you want to clear gift transaction records? This action:
            </p>

            <ul style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: '0 0 1.25rem 1.25rem', lineHeight: '1.5' }}>
              <li>Permanently deletes records from <code>gift_transactions</code> in MySQL.</li>
              <li>Instantly flushes Redis cache for top contributors & mobile contribution breakdown.</li>
              <li>The mobile API <code>/api/mobile/gifts/user/:id/contributions</code> will return zero records immediately.</li>
            </ul>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Scope of Deletion:
              </label>
              <select
                className="select-field"
                style={{ width: '100%' }}
                value={clearPeriod}
                onChange={(e) => setClearPeriod(e.target.value)}
              >
                <option value="all">Clear Entire Gift History (All Time)</option>
                <option value="month">Clear Only Current Month's History ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setClearModalOpen(false)}
                disabled={clearingHistory}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn"
                style={{ background: '#ef4444', color: '#fff', fontWeight: 700 }}
                onClick={handleConfirmClearHistory}
                disabled={clearingHistory}
              >
                {clearingHistory ? 'Clearing Data...' : 'Confirm Clear History'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Create or Edit Gift (SVGA vs GIF+Sound Options)    */}
      {/* ========================================================= */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '600px', width: '92%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                <Gift size={22} color="#8b5cf6" />
                <span>{editingGift ? `Edit Gift: ${editingGift.name || 'Gift'}` : 'Upload & Create Virtual Gift'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGift} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Option Selector: SVGA vs GIF+Sound */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Select Gift Upload Format:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {/* Option 1: SVGA */}
                  <div
                    onClick={() => {
                      setFormatMode('svga');
                      setFormData((prev) => ({ ...prev, animation_type: 'svga' }));
                    }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: formatMode === 'svga' ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                      background: formatMode === 'svga' ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: formatMode === 'svga' ? '#c084fc' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={16} color="#8b5cf6" />
                        <span>Option 1: SVGA</span>
                      </span>
                      {formatMode === 'svga' && <Check size={16} color="#8b5cf6" />}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Image Preview + .SVGA File
                    </span>
                  </div>

                  {/* Option 2: GIF + Sound */}
                  <div
                    onClick={() => {
                      setFormatMode('gif');
                      setFormData((prev) => ({ ...prev, animation_type: 'gif' }));
                    }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: formatMode === 'gif' ? '2px solid #ec4899' : '1px solid var(--border-color)',
                      background: formatMode === 'gif' ? 'rgba(236, 72, 153, 0.12)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: formatMode === 'gif' ? '#f472b6' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={16} color="#ec4899" />
                        <span>Option 2: GIF + Sound</span>
                      </span>
                      {formatMode === 'gif' && <Check size={16} color="#ec4899" />}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      .GIF File + Audio Sound (.mp3)
                    </span>
                  </div>
                </div>
              </div>

              {/* Conditional Upload Fields */}
              {formatMode === 'svga' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(139, 92, 246, 0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  {/* Field 1: Image Preview (Icon) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      1. Gift Image Preview (Icon / Thumbnail):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <label
                        className="btn btn-secondary btn-sm"
                        style={{ cursor: uploadingIcon ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Upload size={14} />
                        <span>{uploadingIcon ? 'Uploading Image...' : 'Choose Image File'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={uploadingIcon}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'icon_url', setUploadingIcon);
                          }}
                        />
                      </label>

                      {formData.icon_url && isMediaUrl(formData.icon_url) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={resolveMediaUrl(formData.icon_url)}
                            alt="Preview"
                            style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}
                          />
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ Image Ready</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Or paste image preview URL (/uploads/gifts/...)"
                      value={formData.icon_url}
                      onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                      style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}
                    />
                  </div>

                  {/* Field 2: SVGA Animation File */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      2. SVGA Animation File (.svga):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <label
                        className="btn btn-secondary btn-sm"
                        style={{ cursor: uploadingAnimation ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: '#8b5cf6', color: '#c084fc' }}
                      >
                        <FileCode size={14} />
                        <span>{uploadingAnimation ? 'Uploading SVGA...' : 'Choose .SVGA File'}</span>
                        <input
                          type="file"
                          accept=".svga"
                          style={{ display: 'none' }}
                          disabled={uploadingAnimation}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'animation_url', setUploadingAnimation);
                          }}
                        />
                      </label>

                      {formData.animation_url && (
                        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                          ✓ SVGA File Attached: {formData.animation_url.split('/').pop()}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Or paste SVGA URL (/uploads/gifts/...svga)"
                      value={formData.animation_url}
                      onChange={(e) => setFormData({ ...formData, animation_url: e.target.value })}
                      style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(236, 72, 153, 0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                  {/* Field 1: GIF Animation File */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      1. GIF Animation File (.gif):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <label
                        className="btn btn-secondary btn-sm"
                        style={{ cursor: uploadingAnimation ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: '#ec4899', color: '#f472b6' }}
                      >
                        <Upload size={14} />
                        <span>{uploadingAnimation ? 'Uploading GIF...' : 'Choose .GIF File'}</span>
                        <input
                          type="file"
                          accept="image/gif,.gif"
                          style={{ display: 'none' }}
                          disabled={uploadingAnimation}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'animation_url', setUploadingAnimation);
                          }}
                        />
                      </label>

                      {formData.icon_url && isMediaUrl(formData.icon_url) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={resolveMediaUrl(formData.icon_url)}
                            alt="GIF Preview"
                            style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}
                          />
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ Animated GIF Ready</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Or paste GIF URL (/uploads/gifts/...gif)"
                      value={formData.icon_url}
                      onChange={(e) => setFormData({ ...formData, icon_url: e.target.value, animation_url: e.target.value })}
                      style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}
                    />
                  </div>

                  {/* Field 2: Sound Audio File */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      2. Gift Sound Effect Audio File (.mp3, .wav, .aac, .ogg):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <label
                        className="btn btn-secondary btn-sm"
                        style={{ cursor: uploadingSound ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Music size={14} />
                        <span>{uploadingSound ? 'Uploading Sound...' : 'Choose Audio File'}</span>
                        <input
                          type="file"
                          accept="audio/*,.mp3,.wav,.aac,.ogg,.m4a"
                          style={{ display: 'none' }}
                          disabled={uploadingSound}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'sound_url', setUploadingSound);
                          }}
                        />
                      </label>

                      {formData.sound_url && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <audio
                            src={resolveMediaUrl(formData.sound_url)}
                            controls
                            style={{ height: '32px', maxWidth: '240px' }}
                          />
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ Audio Attached</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Or paste audio URL (/uploads/gifts/...mp3)"
                      value={formData.sound_url}
                      onChange={(e) => setFormData({ ...formData, sound_url: e.target.value })}
                      style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              )}

              {/* Gift Name (Optional) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Gift Display Name (Optional):
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>Optional</span>
                </div>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Diamond Sports Car (Leave blank for default name)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Pricing & Host Diamond Reward */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.35rem' }}>
                    Gift Coin Value (🪙 Price):
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    placeholder="e.g. 500"
                    value={formData.coin_cost}
                    onChange={(e) => {
                      const cost = parseInt(e.target.value, 10) || 0;
                      setFormData({
                        ...formData,
                        coin_cost: cost,
                        diamond_reward: Math.floor(cost / 2),
                      });
                    }}
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '3px' }}>
                    Coins paid by sender
                  </span>
                </div>

                {isDiamondMode && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#06b6d4', marginBottom: '0.35rem' }}>
                      Host Diamond Reward (💎):
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      placeholder="e.g. 250"
                      value={formData.diamond_reward}
                      onChange={(e) => setFormData({ ...formData, diamond_reward: parseInt(e.target.value, 10) || 0 })}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '3px' }}>
                      Auto-set to 50% of coins
                    </span>
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Economy Category:
                </label>
                <select
                  className="select-field"
                  style={{ width: '100%' }}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Popular">Popular</option>
                  <option value="Casual">Casual</option>
                  <option value="VIP">VIP</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Legendary">Legendary</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploadingIcon || uploadingAnimation || uploadingSound}
                >
                  {editingGift ? 'Update Gift' : 'Save & Publish Gift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
