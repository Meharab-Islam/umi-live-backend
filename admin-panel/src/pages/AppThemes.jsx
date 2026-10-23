import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Palette,
  Image as ImageIcon,
  Layers,
  Plus,
  Search,
  Star,
  Trash2,
  Edit2,
  CheckCircle2,
  Coins,
  Sparkles,
  Upload,
  X,
  RefreshCw,
  Sliders,
  Check,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import themeApi from '../api/themeApi';
import { resolveAssetUrl } from '../api/client';
import Loader from '../components/Loader';

const TAB_TYPES = [
  { id: 'page_image', label: 'Page Backgrounds', icon: ImageIcon, desc: 'Full-screen app page backgrounds & wallpapers' },
  { id: 'bottom_sheet_image', label: 'Bottom Sheet Images', icon: Layers, desc: 'Modal sheets, gift sheets & drawer headers' },
  { id: 'color', label: 'Theme Colors', icon: Palette, desc: 'Primary accents, glow tones & gradient palettes' },
];

export default function AppThemes({ onToast }) {
  const [activeTab, setActiveTab] = useState('page_image');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewSrc, setPreviewSrc] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    type: 'page_image',
    name: '',
    value: '',
    secondary_value: '',
    price: 0,
    validity_days: 30,
    is_default: false,
    is_active: true,
  });

  // Fetch Items & Stats
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        themeApi.getThemeItems({ type: activeTab, q: searchQuery, status: statusFilter }),
        themeApi.getStats(),
      ]);

      if (itemsRes?.success) {
        setItems(itemsRes.items || []);
      }
      if (statsRes?.success) {
        setStats(statsRes);
      }
    } catch (err) {
      console.error('Fetch themes error:', err);
      if (onToast) onToast(err.message || 'Failed to load theme items.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, statusFilter, onToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setSelectedFile(null);
    setPreviewSrc('');
    setFormData({
      type: activeTab,
      name: '',
      value: activeTab === 'color' ? '#7C3AED' : '',
      secondary_value: activeTab === 'color' ? '#A78BFA' : '',
      price: 0,
      validity_days: 30,
      is_default: false,
      is_active: true,
    });
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setSelectedFile(null);
    setPreviewSrc(item.value && (item.type === 'page_image' || item.type === 'bottom_sheet_image') ? resolveAssetUrl(item.value) : '');
    setFormData({
      type: item.type,
      name: item.name,
      value: item.value,
      secondary_value: item.secondary_value || '',
      price: item.price || 0,
      validity_days: item.validity_days || 0,
      is_default: Boolean(item.is_default),
      is_active: Boolean(item.is_active),
    });
    setModalOpen(true);
  };

  // File selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewSrc(objectUrl);
    }
  };

  // Submit Create or Update
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      if (onToast) onToast('Please enter an item name.', 'error');
      return;
    }

    if (formData.type === 'color' && !formData.value) {
      if (onToast) onToast('Please select a color code.', 'error');
      return;
    }

    if (formData.type !== 'color' && !selectedFile && !formData.value) {
      if (onToast) onToast('Please select an image file or enter an image URL.', 'error');
      return;
    }

    setSaving(true);
    try {
      let payload;
      if (selectedFile) {
        payload = new FormData();
        payload.append('category', 'themes');
        payload.append('file', selectedFile);
        payload.append('type', formData.type);
        payload.append('name', formData.name);
        payload.append('secondary_value', formData.secondary_value || '');
        payload.append('price', formData.price);
        payload.append('validity_days', formData.validity_days);
        payload.append('is_default', formData.is_default ? '1' : '0');
        payload.append('is_active', formData.is_active ? '1' : '0');
      } else {
        payload = {
          type: formData.type,
          name: formData.name,
          value: formData.value,
          secondary_value: formData.secondary_value || null,
          price: parseInt(formData.price, 10) || 0,
          validity_days: parseInt(formData.validity_days, 10) || 0,
          is_default: formData.is_default ? 1 : 0,
          is_active: formData.is_active ? 1 : 0,
        };
      }

      if (editingItem) {
        await themeApi.updateThemeItem(editingItem.id, payload);
        if (onToast) onToast('Theme item updated successfully!', 'success');
      } else {
        await themeApi.createThemeItem(payload);
        if (onToast) onToast('New theme item created successfully!', 'success');
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Save theme error:', err);
      if (onToast) onToast(err.message || 'Failed to save theme item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Set as Default
  const handleSetDefault = async (item) => {
    try {
      await themeApi.setDefault(item.id);
      if (onToast) onToast(`"${item.name}" is now set as the active default!`, 'success');
      fetchData();
    } catch (err) {
      console.error('Set default error:', err);
      if (onToast) onToast(err.message || 'Failed to set default.', 'error');
    }
  };

  // Delete Item
  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await themeApi.deleteThemeItem(item.id);
      if (onToast) onToast('Theme item deleted successfully.', 'success');
      fetchData();
    } catch (err) {
      console.error('Delete theme error:', err);
      if (onToast) onToast(err.message || 'Failed to delete theme item.', 'error');
    }
  };

  // Find defaults by type
  const activeDefaultMap = useMemo(() => {
    const map = {};
    if (stats?.activeDefaults) {
      for (const d of stats.activeDefaults) {
        map[d.type] = d;
      }
    }
    return map;
  }, [stats]);

  return (
    <div className="themes-management-page" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
            }}>
              <Palette size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                App Theme Studio
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--text-dim)' }}>
                Upload wallpapers, customize bottom sheets & configure live color schemes with custom coin pricing.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh Catalog"
          >
            <RefreshCw size={15} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
              borderColor: '#7c3aed',
              fontWeight: 600,
              padding: '0.6rem 1.25rem',
            }}
          >
            <Plus size={18} />
            <span>Add New {activeTab === 'page_image' ? 'Page Image' : activeTab === 'bottom_sheet_image' ? 'Bottom Sheet' : 'Theme Color'}</span>
          </button>
        </div>
      </div>

      {/* ACTIVE DEFAULT THEME SHOWCASE BANNER */}
      {/* ACTIVE DEFAULT THEME HERO */}
      <div
        className="panel-card"
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '1.35rem',
          marginBottom: '1.75rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={18} color="#eab308" fill="#eab308" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Live System Default Theme Configuration
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
              Auto Applied to Guests & New Users
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Each section has 1 active default item that renders unless a user equips a custom theme.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Default Page Image Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#f1f5f9',
              flexShrink: 0,
              border: '1px solid var(--border-color)',
            }}>
              {activeDefaultMap.page_image?.value ? (
                <img
                  src={resolveAssetUrl(activeDefaultMap.page_image.value)}
                  alt="Default Page"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                  <ImageIcon size={20} />
                </div>
              )}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', color: '#9333ea', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Default Page Image
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeDefaultMap.page_image?.name || 'None Set'}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                {activeDefaultMap.page_image?.price === 0 ? 'Free Standard' : `🪙 ${activeDefaultMap.page_image?.price} Coins`}
              </div>
            </div>
          </div>

          {/* Default Bottom Sheet Image Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#f1f5f9',
              flexShrink: 0,
              border: '1px solid var(--border-color)',
            }}>
              {activeDefaultMap.bottom_sheet_image?.value ? (
                <img
                  src={resolveAssetUrl(activeDefaultMap.bottom_sheet_image.value)}
                  alt="Default Bottom Sheet"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                  <Layers size={20} />
                </div>
              )}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Default Bottom Sheet
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeDefaultMap.bottom_sheet_image?.name || 'None Set'}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                {activeDefaultMap.bottom_sheet_image?.price === 0 ? 'Free Standard' : `🪙 ${activeDefaultMap.bottom_sheet_image?.price} Coins`}
              </div>
            </div>
          </div>

          {/* Default Color Palette Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '8px',
              background: activeDefaultMap.color?.secondary_value
                ? `linear-gradient(135deg, ${activeDefaultMap.color.value} 0%, ${activeDefaultMap.color.secondary_value} 100%)`
                : (activeDefaultMap.color?.value || '#7c3aed'),
              flexShrink: 0,
              border: '2px solid rgba(255, 255, 255, 0.9)',
              boxShadow: `0 4px 12px ${activeDefaultMap.color?.value ? activeDefaultMap.color.value + '40' : 'rgba(0,0,0,0.1)'}`,
            }} />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', color: '#ec4899', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Default Accent Color
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeDefaultMap.color?.name || 'None Set'}
              </div>
              <div style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: '2px' }}>
                {activeDefaultMap.color?.value || '#------'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '8px', overflowX: 'auto' }}>
        {TAB_TYPES.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          let count = 0;
          if (stats?.summary) {
            if (t.id === 'page_image') count = stats.summary.total_page_images || 0;
            if (t.id === 'bottom_sheet_image') count = stats.summary.total_bottom_sheets || 0;
            if (t.id === 'color') count = stats.summary.total_colors || 0;
          }

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.85rem 1.4rem',
                border: 'none',
                background: 'transparent',
                color: isActive ? '#7c3aed' : 'var(--text-dim)',
                borderBottom: isActive ? '3px solid #7c3aed' : '3px solid transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.92rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={18} />
              <span>{t.label}</span>
              <span style={{
                background: isActive ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-secondary)',
                color: isActive ? '#7c3aed' : 'var(--text-dim)',
                fontSize: '0.74rem',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '240px', maxWidth: '420px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'page_image' ? 'wallpapers' : activeTab === 'bottom_sheet_image' ? 'bottom sheets' : 'colors'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '36px', width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
            style={{ width: 'auto', padding: '0.45rem 1rem' }}
          >
            <option value="all">All Items</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* MAIN CARDS LIST */}
      {loading ? (
        <Loader message="Loading theme items..." />
      ) : items.length === 0 ? (
        <div className="panel-card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <Palette size={48} style={{ color: 'var(--text-dim)', opacity: 0.4, margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', margin: '0 0 0.5rem' }}>
            No {activeTab.replace('_', ' ')} items found
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.86rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Get started by adding your first theme asset for this section. You can set individual prices in coins and designate default selections.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            <span>Add First Item</span>
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: activeTab === 'color' ? 'repeat(auto-fill, minmax(240px, 1fr))' : 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: '1.25rem',
        }}>
          {items.map((item) => {
            const isDefault = Boolean(item.is_default);
            const isActive = Boolean(item.is_active);

            return (
              <div
                key={item.id}
                className="panel-card theme-item-card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: isDefault ? '2px solid #7c3aed' : '1px solid var(--border-color)',
                  boxShadow: isDefault ? '0 0 20px rgba(124, 58, 237, 0.25)' : 'none',
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Default Star Badge */}
                {isDefault && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    zIndex: 2,
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(234, 179, 8, 0.5)',
                    color: '#eab308',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}>
                    <Star size={12} fill="#eab308" />
                    <span>SYSTEM DEFAULT</span>
                  </div>
                )}

                {/* Status Badge */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  zIndex: 2,
                }}>
                  <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                    {isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>

                {/* Preview Section */}
                {activeTab === 'color' ? (
                  <div style={{
                    height: '140px',
                    background: item.secondary_value
                      ? `linear-gradient(135deg, ${item.value} 0%, ${item.secondary_value} 100%)`
                      : item.value,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.5)',
                      backdropFilter: 'blur(4px)',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      color: '#fff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                    }}>
                      {item.value} {item.secondary_value ? `→ ${item.secondary_value}` : ''}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    height: activeTab === 'page_image' ? '210px' : '150px',
                    background: '#090d16',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img
                      src={resolveAssetUrl(item.value)}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/300x200?text=Preview+Unavailable';
                      }}
                    />
                  </div>
                )}

                {/* Content Section */}
                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {item.name}
                    </h4>

                    {/* Price and Duration Tags */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: item.price === 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                        color: item.price === 0 ? '#10b981' : '#eab308',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                      }}>
                        <Coins size={12} />
                        {item.price === 0 ? 'FREE' : `${item.price.toLocaleString()} Coins`}
                      </span>

                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-dim)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                      }}>
                        <Calendar size={12} />
                        {item.validity_days === 0 ? 'Lifetime' : `${item.validity_days} Days`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', gap: '6px' }}>
                    {!isDefault ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(item)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#eab308' }}
                        title="Set this as the default item for its category"
                      >
                        <Star size={13} />
                        <span>Make Default</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> Active Default
                      </span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 8px' }}
                        title="Edit Item"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 8px', color: '#f43f5e' }}
                        title="Delete Item"
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
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '560px',
              width: '92%',
              borderRadius: '16px',
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Palette size={20} color="#7c3aed" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {editingItem ? 'Edit Theme Item' : `Add New ${formData.type === 'page_image' ? 'Page Wallpaper' : formData.type === 'bottom_sheet_image' ? 'Bottom Sheet' : 'Theme Color'}`}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {/* Category Type Selector */}
                <div>
                  <label className="input-label" style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                    Asset Section / Type
                  </label>
                  <select
                    className="input-field"
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormData({
                        ...formData,
                        type: newType,
                        value: newType === 'color' ? '#7C3AED' : '',
                      });
                      setSelectedFile(null);
                      setPreviewSrc('');
                    }}
                    disabled={Boolean(editingItem)}
                  >
                    <option value="page_image">🖼️ Page Background Image</option>
                    <option value="bottom_sheet_image">📱 Bottom Sheet Image</option>
                    <option value="color">🎨 Accent Theme Color</option>
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="input-label" style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                    Title / Theme Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Neon Cyberpunk, Royal Violet, Sunset Horizon"
                    className="input-field"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* IMAGE UPLOAD / VALUE SECTION (For images) */}
                {formData.type !== 'color' && (
                  <div>
                    <label className="input-label" style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                      Image File or URL *
                    </label>

                    {/* File Dropzone */}
                    <div style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      textAlign: 'center',
                      background: 'var(--bg-secondary)',
                      cursor: 'pointer',
                      position: 'relative',
                      marginBottom: '0.75rem',
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer',
                        }}
                      />
                      <Upload size={28} style={{ color: '#7c3aed', margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {selectedFile ? selectedFile.name : 'Click or drop image file here to upload'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Supports JPG, PNG, WEBP, GIF
                      </div>
                    </div>

                    {/* Or URL input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>OR URL:</span>
                      <input
                        type="url"
                        placeholder="https://... or relative /uploads/..."
                        className="input-field"
                        value={formData.value}
                        onChange={(e) => {
                          setFormData({ ...formData, value: e.target.value });
                          setPreviewSrc(e.target.value);
                        }}
                        disabled={Boolean(selectedFile)}
                      />
                    </div>

                    {/* Image Preview Box */}
                    {previewSrc && (
                      <div style={{ marginTop: '0.75rem', borderRadius: '8px', overflow: 'hidden', height: '120px', background: '#090d16' }}>
                        <img src={resolveAssetUrl(previewSrc)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    )}
                  </div>
                )}

                {/* COLOR PICKER SECTION (For colors) */}
                {formData.type === 'color' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label className="input-label" style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                        Primary Accent Color (Hex) *
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="color"
                          value={formData.value || '#7c3aed'}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value.toUpperCase() })}
                          style={{ width: '48px', height: '40px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                        />
                        <input
                          type="text"
                          required
                          placeholder="#7C3AED"
                          className="input-field"
                          style={{ fontFamily: 'var(--font-mono)', width: '100%' }}
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="input-label" style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                        Secondary Gradient / Glow Color (Optional)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="color"
                          value={formData.secondary_value || '#a78bfa'}
                          onChange={(e) => setFormData({ ...formData, secondary_value: e.target.value.toUpperCase() })}
                          style={{ width: '48px', height: '40px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                        />
                        <input
                          type="text"
                          placeholder="#A78BFA"
                          className="input-field"
                          style={{ fontFamily: 'var(--font-mono)', width: '100%' }}
                          value={formData.secondary_value}
                          onChange={(e) => setFormData({ ...formData, secondary_value: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </div>

                    {/* Color Swatch Preview */}
                    <div style={{
                      height: '56px',
                      borderRadius: '10px',
                      background: formData.secondary_value
                        ? `linear-gradient(135deg, ${formData.value} 0%, ${formData.secondary_value} 100%)`
                        : formData.value,
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    }}>
                      Color Swatch Preview
                    </div>
                  </div>
                )}

                {/* PRICING & VALIDITY GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="input-label" style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                      Price (in Coins)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        min="0"
                        className="input-field"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0 for Free"
                        style={{ paddingLeft: '32px' }}
                      />
                      <Coins size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#eab308' }} />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                      Set 0 to make it available for all users.
                    </span>
                  </div>

                  <div>
                    <label className="input-label" style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>
                      Validity (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={formData.validity_days}
                      onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                      placeholder="e.g. 30 (0 = Lifetime)"
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                      0 = Permanent / Lifetime once bought.
                    </span>
                  </div>
                </div>

                {/* TOGGLES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.86rem', color: 'var(--text-main)' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
                    />
                    <div>
                      <span style={{ fontWeight: 600 }}>⭐ Set as Active Default for {formData.type.replace('_', ' ')}</span>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        Will replace any existing default and be active for all non-custom users.
                      </div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.86rem', color: 'var(--text-main)' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                    />
                    <div>
                      <span style={{ fontWeight: 600 }}>✅ Active (Visible in Mobile App)</span>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        If unchecked, this theme item will be hidden from the mobile store.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#7c3aed', borderColor: '#6d28d9' }}
                >
                  {saving ? <RefreshCw size={15} className="spinning" /> : <CheckCircle2 size={16} />}
                  <span>{saving ? 'Saving...' : editingItem ? 'Update Theme Item' : 'Create Theme Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
