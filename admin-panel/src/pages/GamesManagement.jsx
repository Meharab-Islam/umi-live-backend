import React, { useState, useEffect, useMemo } from 'react';
import {
  Gamepad2,
  Sparkles,
  Play,
  Sliders,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  Search,
  Filter,
  Edit3,
  Upload,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import gameApi from '../api/gameApi';
import { uploadFile } from '../api/client';
import Loader from '../components/Loader';
import './GamesManagement.css';

export default function GamesManagement({ onToast }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState(null);

  // Edit Modal State
  const [editingGame, setEditingGame] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    icon_url: '',
    min_bet: 100,
    max_bet: 50000,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const res = await gameApi.getAdminGames();
      if (res.success && Array.isArray(res.games)) {
        setGames(res.games);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch games catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    if (onToast) onToast(message, type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggle = async (game) => {
    try {
      setTogglingId(game.id || game.slug);
      const res = await gameApi.toggleGame(game.id || game.slug);
      if (res.success) {
        setGames((prev) =>
          prev.map((g) =>
            g.id === game.id || g.slug === game.slug
              ? { ...g, is_active: res.isActive }
              : g
          )
        );
        showToast(res.message || `${game.name} status updated!`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to toggle game status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (game) => {
    setEditingGame(game);
    setEditForm({
      name: game.name || '',
      description: game.description || '',
      icon_url: game.icon_url || '',
      min_bet: game.min_bet !== undefined ? game.min_bet : 100,
      max_bet: game.max_bet !== undefined ? game.max_bet : 50000,
    });
  };

  const closeEditModal = () => {
    setEditingGame(null);
    setUploadingImage(false);
    setSavingEdit(false);
  };

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const res = await uploadFile(file, 'games');
      const uploadedUrl = res.url || res.fileUrl || res.media_url;
      if (uploadedUrl) {
        setEditForm((prev) => ({ ...prev, icon_url: uploadedUrl }));
        showToast('Game thumbnail uploaded successfully!');
      } else {
        throw new Error('No URL returned from upload server');
      }
    } catch (err) {
      showToast(err.message || 'Image upload failed', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingGame) return;

    try {
      setSavingEdit(true);
      const res = await gameApi.updateGame(editingGame.id || editingGame.slug, {
        name: editForm.name,
        description: editForm.description,
        icon_url: editForm.icon_url,
        min_bet: parseInt(editForm.min_bet, 10),
        max_bet: parseInt(editForm.max_bet, 10),
      });

      if (res.success) {
        setGames((prev) =>
          prev.map((g) =>
            g.id === editingGame.id || g.slug === editingGame.slug
              ? {
                  ...g,
                  name: editForm.name,
                  description: editForm.description,
                  icon_url: editForm.icon_url,
                  min_bet: parseInt(editForm.min_bet, 10),
                  max_bet: parseInt(editForm.max_bet, 10),
                }
              : g
          )
        );
        showToast(`Saved updates for ${editForm.name}!`);
        closeEditModal();
      } else {
        throw new Error(res.message || 'Failed to save game');
      }
    } catch (err) {
      showToast(err.message || 'Failed to save changes', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyUrl = (url, slug) => {
    const fullUrl = url?.startsWith('http')
      ? url
      : `${window.location.protocol}//${window.location.host}${url?.startsWith('/') ? '' : '/'}${url}`;
    
    // Ensure trailing slash for webview routing
    const finalUrl = fullUrl.endsWith('/') ? fullUrl : `${fullUrl}/`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(finalUrl);
    } else {
      const el = document.createElement('textarea');
      el.value = finalUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    setCopiedSlug(slug);
    showToast(`Copied Mobile WebView URL for ${slug}!`);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Filtered games based on search and category
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch =
        !searchQuery ||
        game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = categoryFilter === 'all' || game.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [games, searchQuery, categoryFilter]);

  const resolveGameUrl = (rawUrl, slug, isForAdmin = false, port = null) => {
    if (!rawUrl) return '#';
    let path = rawUrl;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      try {
        const parsed = new URL(rawUrl);
        path = parsed.pathname + parsed.search;
      } catch (e) {
        path = rawUrl;
      }
    }
    if (!path.startsWith('/')) path = '/' + path;

    // Ensure directory routes have trailing slash so relative CSS and JS links load correctly
    if (!path.includes('.') && !path.endsWith('/')) {
      path = path + '/';
    }

    // Use current browser window location origin to prevent port 80 ERR_EMPTY_RESPONSE
    const urlObj = new URL(path, window.location.origin);

    // Attach SSO credentials so game admin panels & players never ask for login again
    const adminToken = localStorage.getItem('umi_admin_token') || '';
    let adminUserId = '1';
    try {
      const rawUser = localStorage.getItem('umi_admin_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u.id) adminUserId = String(u.id);
      }
    } catch (e) {}

    if (adminToken) {
      urlObj.searchParams.set('token', adminToken);
    }
    if (adminUserId) {
      urlObj.searchParams.set('id', adminUserId);
      urlObj.searchParams.set('userId', adminUserId);
    }

    if (isForAdmin) {
      urlObj.searchParams.set('secret', 'bigeater888');
      urlObj.searchParams.set('key', 'bigeater888');
    }

    if (port) {
      urlObj.searchParams.set('port', String(port));
    }

    return urlObj.toString();
  };

  const activeCount = games.filter((g) => g.is_active).length;
  const disabledCount = games.length - activeCount;

  return (
    <div className="games-page">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: '12px',
            background: toastMessage.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            fontSize: '0.85rem',
            fontWeight: 700,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Luxury Header Banner */}
      <div className="games-header-banner">
        <div className="games-header-top">
          <div>
            <div className="games-header-badge">
              <Sparkles size={13} />
              <span>Integrated Real-Time Mini-Games</span>
            </div>
            <h1 className="games-header-title">
              <Gamepad2 size={32} color="#c084fc" />
              <span>Mini-Games Management & Control Center</span>
            </h1>
            <p className="games-header-subtitle">
              Enable or disable live games, launch individual admin control rooms, monitor dedicated socket ports, and obtain copyable Flutter WebView integration routes with zero-downtime Redis Pub/Sub balance sync.
            </p>
          </div>

          <button
            onClick={fetchGames}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.65rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div className="games-stats-grid">
        <div className="games-stat-card">
          <div>
            <span className="games-stat-label">Total Mini-Games</span>
            <span className="games-stat-value">{games.length}</span>
          </div>
          <div className="games-stat-icon-wrap" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
            <Gamepad2 size={22} />
          </div>
        </div>

        <div className="games-stat-card">
          <div>
            <span className="games-stat-label">Active & Playable</span>
            <span className="games-stat-value" style={{ color: '#059669' }}>
              {activeCount}
            </span>
          </div>
          <div className="games-stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Activity size={22} />
          </div>
        </div>

        <div className="games-stat-card">
          <div>
            <span className="games-stat-label">Disabled / Inactive</span>
            <span className="games-stat-value" style={{ color: '#64748b' }}>
              {disabledCount}
            </span>
          </div>
          <div className="games-stat-icon-wrap" style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#64748b' }}>
            <Layers size={22} />
          </div>
        </div>

        <div className="games-stat-card">
          <div>
            <span className="games-stat-label">Dedicated Sockets</span>
            <span className="games-stat-value" style={{ color: '#0284c7' }}>
              Ports 5061-5067
            </span>
          </div>
          <div className="games-stat-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <Activity size={22} />
          </div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="games-toolbar">
        <div className="games-search-box">
          <Search size={15} className="games-search-icon" />
          <input
            type="text"
            className="games-search-input"
            placeholder="Search mini-games by name, slug, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'wheel', 'slots', 'casino', 'cards'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '0.42rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'capitalize',
                border: categoryFilter === cat ? '1px solid #7c3aed' : '1px solid var(--border-color, #e2e8f0)',
                background: categoryFilter === cat ? '#7c3aed' : 'var(--bg-primary, #f8fafc)',
                color: categoryFilter === cat ? '#ffffff' : 'var(--text-muted, #475569)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Games Cards Grid */}
      {loading ? (
        <div style={{ padding: '4rem 0', display: 'flex', justifyContent: 'center' }}>
          <Loader />
        </div>
      ) : filteredGames.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)',
            color: 'var(--text-dim, #64748b)',
          }}
        >
          <Gamepad2 size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <h4 style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>No games found</h4>
          <p style={{ fontSize: '0.85rem' }}>No mini-games match the selected filter criteria.</p>
        </div>
      ) : (
        <div className="games-grid">
          {filteredGames.map((game) => {
            const isToggling = togglingId === (game.id || game.slug);
            const isCopied = copiedSlug === game.slug;

            // Route for WebView display
            const rawPath = game.web_url ? (game.web_url.startsWith('http') ? (new URL(game.web_url).pathname) : game.web_url) : `/games/${game.slug}/`;
            const displayRoute = rawPath.endsWith('/') ? rawPath : `${rawPath}/`;

            // SSO and origin-safe URLs
            const ssoAdminUrl = resolveGameUrl(game.admin_url || game.web_url || `/games/${game.slug}/`, game.slug, true, game.port);
            const ssoPlayUrl = resolveGameUrl(game.web_url || `/games/${game.slug}/`, game.slug, false, game.port);

            return (
              <div
                key={game.slug || game.id}
                className={`game-card ${game.is_active ? 'active-border' : 'disabled-border'}`}
              >
                <div className="game-card-body">
                  <div className="game-card-header">
                    <div className="game-card-identity">
                      <div className="game-card-icon">
                        {game.icon_url ? (
                          <img
                            src={game.icon_url}
                            alt={game.name}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Gamepad2 size={26} color="#7c3aed" />
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div className="game-card-title-row">
                          <h3 className="game-card-title">{game.name}</h3>
                          <span className="game-category-pill">{game.category || 'Game'}</span>
                        </div>
                        <p className="game-card-description">{game.description}</p>
                      </div>
                    </div>

                    {/* Enable / Disable Toggle Switch */}
                    <div className="toggle-switch-wrap">
                      <button
                        type="button"
                        onClick={() => handleToggle(game)}
                        disabled={isToggling}
                        className={`toggle-switch ${game.is_active ? 'is-active' : ''}`}
                        title={game.is_active ? 'Click to Disable Game' : 'Click to Enable Game'}
                      >
                        <span className="toggle-slider" />
                      </button>
                      <span className={`toggle-label ${game.is_active ? 'active' : 'inactive'}`}>
                        {game.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Specs Grid */}
                  <div className="game-specs-grid">
                    <div className="game-spec-box">
                      <span className="game-spec-title">Min / Max Bet</span>
                      <span className="game-spec-val">
                        🪙 {game.min_bet?.toLocaleString()} - {game.max_bet?.toLocaleString()}
                      </span>
                    </div>

                    <div className="game-spec-box">
                      <span className="game-spec-title">Socket Port</span>
                      <span className="game-spec-val" style={{ color: '#0284c7' }}>
                        Port {game.port || (game.dedicated_url ? game.dedicated_url.split(':').pop() : '5060')}
                      </span>
                    </div>

                    <div className="game-spec-box">
                      <span className="game-spec-title">Supported Chips</span>
                      <span className="game-spec-val" style={{ color: '#d97706' }}>
                        {Array.isArray(game.chips) ? game.chips.join(', ') : '100, 500, 1000'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="game-actions-row">
                    <a
                      href={ssoAdminUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="game-btn game-btn-admin"
                      title="Open Game Admin Control Panel with Automatic Single Sign-On"
                    >
                      <Sliders size={13} />
                      <span>Admin Panel</span>
                      <ExternalLink size={12} />
                    </a>

                    <a
                      href={ssoPlayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="game-btn game-btn-play"
                      title="Play / Preview Game"
                    >
                      <Play size={13} />
                      <span>Play / Preview</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => openEditModal(game)}
                      className="game-btn game-btn-edit"
                      title="Edit Game Name & Thumbnail Image"
                    >
                      <Edit3 size={13} />
                      <span>Edit Info</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyUrl(displayRoute, game.slug)}
                      className={`game-btn game-btn-copy ${isCopied ? 'is-copied' : ''}`}
                      title="Copy Mobile In-App WebView URL"
                    >
                      {isCopied ? (
                        <>
                          <Check size={13} />
                          <span>Copied URL!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy Mobile URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer Route Info */}
                <div className="game-card-footer">
                  <span className="truncate">
                    <span className="game-route-tag">WebView Route:</span>
                    <code>{displayRoute}</code>
                  </span>
                  <span>Port {game.port}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Game Modal */}
      {editingGame && (
        <div className="game-modal-overlay" onClick={closeEditModal}>
          <div className="game-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="game-modal-header">
              <h3 className="game-modal-title">
                <Edit3 size={18} color="#7c3aed" />
                <span>Edit Mini-Game: {editingGame.name}</span>
              </h3>
              <button
                type="button"
                className="game-modal-close"
                onClick={closeEditModal}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="game-modal-body">
                {/* Game Name */}
                <div className="game-form-group">
                  <label className="game-form-label">Game Display Name *</label>
                  <input
                    type="text"
                    required
                    className="game-form-input"
                    placeholder="e.g. Teen Patti, Chinese Fruit Slot..."
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                {/* Game Thumbnail Image & Upload */}
                <div className="game-form-group">
                  <label className="game-form-label">Game Thumbnail Icon / Image</label>
                  <div className="game-image-upload-wrap">
                    <div className="game-image-preview">
                      {editForm.icon_url ? (
                        <img
                          src={editForm.icon_url}
                          alt="Game Thumbnail Preview"
                          onError={(e) => {
                            e.currentTarget.src = '';
                          }}
                        />
                      ) : (
                        <ImageIcon size={28} color="#94a3b8" />
                      )}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <input
                        type="text"
                        className="game-form-input"
                        placeholder="Image URL (or upload below)"
                        value={editForm.icon_url}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, icon_url: e.target.value }))
                        }
                      />

                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: uploadingImage ? 'not-allowed' : 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#7c3aed',
                        }}
                      >
                        <Upload size={14} />
                        <span>{uploadingImage ? 'Uploading...' : 'Upload New Image File'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={uploadingImage}
                          onChange={handleImageFileUpload}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="game-form-group">
                  <label className="game-form-label">Description</label>
                  <textarea
                    rows={3}
                    className="game-form-textarea"
                    placeholder="Short description for mobile app listing..."
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>

                {/* Bets */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="game-form-group">
                    <label className="game-form-label">Min Bet (Coins)</label>
                    <input
                      type="number"
                      min="1"
                      className="game-form-input"
                      value={editForm.min_bet}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, min_bet: e.target.value }))
                      }
                    />
                  </div>

                  <div className="game-form-group">
                    <label className="game-form-label">Max Bet (Coins)</label>
                    <input
                      type="number"
                      min="10"
                      className="game-form-input"
                      value={editForm.max_bet}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, max_bet: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="game-modal-footer">
                <button
                  type="button"
                  className="game-btn-cancel"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="game-btn-save"
                  disabled={savingEdit || uploadingImage}
                >
                  {savingEdit ? (
                    'Saving...'
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

