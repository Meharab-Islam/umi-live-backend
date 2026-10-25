import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Newspaper,
  Search,
  Trash2,
  RefreshCw,
  Video,
  Music,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Eye,
  X,
  AlertTriangle,
  Film,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  FileText,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import postApi from '../api/postApi';
import { adminApi } from '../api/adminApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import BulkActionBar from '../components/BulkActionBar';
import UserDetailsModal from '../components/UserDetailsModal';

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const host = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5050` : 'http://localhost:5050';
  return `${host}${url.startsWith('/') ? url : '/' + url}`;
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Posts({ onToast }) {
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({
    total_posts: 0,
    total_videos: 0,
    total_audios: 0,
    total_images: 0,
    total_likes: 0,
    total_comments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Selection for bulk operations
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Modals & User Details
  const [selectedPostDetails, setSelectedPostDetails] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [detailsUserId, setDetailsUserId] = useState(null);
  const [expandedContentIds, setExpandedContentIds] = useState([]);

  const toggleExpand = (id) => {
    setExpandedContentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await postApi.getPosts({
        page,
        limit: pageSize,
        search: search.trim(),
        media_type: mediaTypeFilter,
      });

      if (res && res.success) {
        setPosts(res.posts || []);
        if (res.stats) setStats(res.stats);
        if (res.pagination) setPagination(res.pagination);
      } else {
        if (onToast) onToast('Failed to load posts', 'error');
      }
    } catch (err) {
      console.error('fetchPosts error:', err);
      if (onToast) onToast(err.message || 'Error loading posts', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, search, mediaTypeFilter, onToast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Bulk Selection Handlers
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === posts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(posts.map((p) => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await adminApi.bulkDelete('posts', selectedIds);
      if (res && res.success) {
        if (onToast) onToast(`Successfully removed ${res.count || selectedIds.length} posts`, 'success');
        setSelectedIds([]);
        fetchPosts(true);
      } else {
        if (onToast) onToast(res.message || 'Failed to bulk delete posts', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to bulk delete posts', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Single Delete Handler
  const handleDeletePost = async (postId) => {
    try {
      setDeletingPost(true);
      const res = await postApi.deletePost(postId);
      if (res && res.success) {
        if (onToast) onToast('Post deleted successfully', 'success');
        setDeleteConfirmId(null);
        if (selectedPostDetails?.id === postId) {
          setSelectedPostDetails(null);
        }
        setSelectedIds((prev) => prev.filter((id) => id !== postId));
        fetchPosts(true);
      } else {
        if (onToast) onToast(res?.message || 'Failed to delete post', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to delete post', 'error');
    } finally {
      setDeletingPost(false);
    }
  };

  // Dedicated Full-Page User Details View
  if (detailsUserId) {
    return (
      <UserDetailsModal
        userId={detailsUserId}
        onClose={() => setDetailsUserId(null)}
        onUserUpdated={() => fetchPosts(true)}
        onToast={onToast}
        isPage={true}
        backTitle="Back to Community Posts"
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. HERO HEADER */}
      <div className="post-hero-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px -4px rgba(124, 58, 237, 0.4)',
              flexShrink: 0,
            }}
          >
            <Newspaper size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
                Community Posts & Feed
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  background: 'rgba(124, 58, 237, 0.1)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(124, 58, 237, 0.2)',
                }}
              >
                {stats.total_posts} Total
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '3px 0 0', lineHeight: 1.4 }}>
              Moderate moments, photos, video shorts, and audio notes with real-time content inspection.
            </p>
          </div>
        </div>

        {/* Header Action Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '3px',
              gap: '2px',
            }}
          >
            <button
              onClick={() => setViewMode('cards')}
              title="Feed Cards View"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '9px',
                border: 'none',
                background: viewMode === 'cards' ? 'var(--primary-gradient)' : 'transparent',
                color: viewMode === 'cards' ? '#ffffff' : 'var(--text-dim)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutGrid size={15} />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Moderator Table View"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '9px',
                border: 'none',
                background: viewMode === 'table' ? 'var(--primary-gradient)' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : 'var(--text-dim)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={15} />
              <span>Table</span>
            </button>
          </div>

          {/* Live Refresh Button */}
          <button
            className="btn btn-secondary"
            onClick={() => fetchPosts(true)}
            disabled={refreshing || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem',
              fontWeight: 600,
              padding: '0.55rem 0.95rem',
            }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. TOP STATS KPIS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '0.85rem' }}>
        <div className="post-stat-card">
          <div
            className="stat-icon-wrapper"
            style={{
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(168, 85, 247, 0.22) 100%)',
              color: '#7c3aed',
            }}
          >
            <Newspaper size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Posts
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15, marginTop: '2px' }}>
              {stats.total_posts.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="post-stat-card">
          <div
            className="stat-icon-wrapper"
            style={{
              background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.12) 0%, rgba(244, 63, 94, 0.22) 100%)',
              color: '#e11d48',
            }}
          >
            <Video size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Videos
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15, marginTop: '2px' }}>
              {stats.total_videos.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="post-stat-card">
          <div
            className="stat-icon-wrapper"
            style={{
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.12) 0%, rgba(192, 132, 252, 0.22) 100%)',
              color: '#9333ea',
            }}
          >
            <Music size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Audio Notes
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15, marginTop: '2px' }}>
              {stats.total_audios.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="post-stat-card">
          <div
            className="stat-icon-wrapper"
            style={{
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(56, 189, 248, 0.22) 100%)',
              color: '#0284c7',
            }}
          >
            <ImageIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Photos
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15, marginTop: '2px' }}>
              {stats.total_images.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="post-stat-card">
          <div
            className="stat-icon-wrapper"
            style={{
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(251, 113, 133, 0.22) 100%)',
              color: '#f43f5e',
            }}
          >
            <Heart size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Reactions
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15, marginTop: '2px' }}>
              {stats.total_likes.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="post-stat-card">
          <div
            className="stat-icon-wrapper"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(52, 211, 153, 0.22) 100%)',
              color: '#10b981',
            }}
          >
            <MessageCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Comments
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15, marginTop: '2px' }}>
              {stats.total_comments.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER TOOLBAR */}
      <div className="card" style={{ padding: '1.15rem 1.35rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '440px' }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search by author, user ID, title, or caption..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.62rem 2.4rem 0.62rem 2.5rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-color)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Media Format Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', marginRight: '0.2rem' }}>
              Filter:
            </span>
            {[
              { id: 'all', label: 'All Formats', icon: <SlidersHorizontal size={13} /> },
              { id: 'video', label: 'Videos', icon: <Video size={13} /> },
              { id: 'audio', label: 'Audio', icon: <Music size={13} /> },
              { id: 'image', label: 'Photos', icon: <ImageIcon size={13} /> },
              { id: 'none', label: 'Text Only', icon: <FileText size={13} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setMediaTypeFilter(tab.id);
                  setPage(1);
                }}
                className={`post-filter-chip ${mediaTypeFilter === tab.id ? 'active' : ''}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. BULK ACTION BAR */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={posts.length}
        onSelectAll={handleToggleSelectAll}
        onClearSelection={() => setSelectedIds([])}
        onDelete={handleBulkDelete}
        entityName="posts"
        deleting={bulkDeleting}
      />

      {/* 5. MAIN CONTENT DISPLAY (CARDS OR TABLE) */}
      {loading ? (
        <Loader message="Loading posts & community feed..." />
      ) : posts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-dim)' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(168, 85, 247, 0.18) 100%)',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <Newspaper size={30} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            No Posts Found
          </h3>
          <p style={{ fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.25rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {search || mediaTypeFilter !== 'all'
              ? 'No community feed posts matched your current search or media type filter.'
              : 'The community feed is currently empty. Posts shared by mobile app users will appear here.'}
          </p>
          {(search || mediaTypeFilter !== 'all') && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearch('');
                setMediaTypeFilter('all');
                setPage(1);
              }}
              style={{ fontSize: '0.84rem' }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Meta Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              fontSize: '0.82rem',
              color: 'var(--text-dim)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                checked={posts.length > 0 && selectedIds.length === posts.length}
                onChange={handleToggleSelectAll}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#7c3aed' }}
              />
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                Select All ({selectedIds.length} of {posts.length})
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>
                Showing <strong>{posts.length}</strong> of <strong>{pagination.total}</strong> posts
              </span>
            </div>
          </div>

          {/* VIEW MODE: CARDS */}
          {viewMode === 'cards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {posts.map((post) => {
                const isSelected = selectedIds.includes(post.id);
                const isExpanded = expandedContentIds.includes(post.id);
                const isLongContent = post.content && post.content.length > 240;

                return (
                  <div key={post.id} className={`post-feed-card ${isSelected ? 'selected' : ''}`}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(post.id)}
                          style={{ cursor: 'pointer', width: '17px', height: '17px', accentColor: '#7c3aed' }}
                        />

                        {/* Author Avatar with Link */}
                        <div className="post-author-avatar-wrap" onClick={() => setDetailsUserId(post.user_id)}>
                          <img
                            src={post.author?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.user_id}`}
                            alt={post.author?.name || 'User'}
                            className="post-author-avatar"
                            onError={(e) => {
                              e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${post.user_id}`;
                            }}
                          />
                        </div>

                        {/* Author Info */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span
                              onClick={() => setDetailsUserId(post.user_id)}
                              style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.96rem', cursor: 'pointer' }}
                              className="hover-underline"
                            >
                              {post.author?.name || `User #${post.user_id}`}
                            </span>

                            {/* User ID Badge */}
                            <span
                              className="user-id-badge"
                              onClick={() => setDetailsUserId(post.user_id)}
                              title="Click to view full user profile & ledger"
                              style={{
                                fontSize: '0.74rem',
                                padding: '2px 8px',
                                background: 'rgba(124, 58, 237, 0.08)',
                                color: 'var(--primary)',
                                borderRadius: '12px',
                                fontWeight: 700,
                              }}
                            >
                              #{post.user_id}
                            </span>

                            {/* VIP Package Badge */}
                            {post.author?.package_category?.name && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: `1px solid ${post.author.package_category.color_code || '#7c3aed'}`,
                                  color: post.author.package_category.color_code || '#7c3aed',
                                  backgroundColor: 'rgba(124, 58, 237, 0.06)',
                                }}
                              >
                                👑 {post.author.package_category.name}
                              </span>
                            )}

                            {/* Role Tag */}
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-dim)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {post.author?.role || 'user'}
                            </span>
                          </div>

                          {/* Time & Telemetry */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                            <Clock size={12} />
                            <span title={new Date(post.created_at).toLocaleString()}>
                              {formatTimeAgo(post.created_at)}
                            </span>
                            <span>•</span>
                            <span>{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedPostDetails(post)}
                          title="Inspect post & comments"
                          style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: 600,
                          }}
                        >
                          <Eye size={14} />
                          <span>Inspect</span>
                        </button>

                        <button
                          className="btn btn-sm"
                          onClick={() => setDeleteConfirmId(post.id)}
                          title="Permanently remove post"
                          style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            color: '#dc2626',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600,
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Post Title */}
                    {post.title && (
                      <h4
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          color: 'var(--text-main)',
                          margin: '0 0 0.45rem',
                          lineHeight: 1.35,
                        }}
                      >
                        {post.title}
                      </h4>
                    )}

                    {/* Post Body Text */}
                    {post.content && (
                      <div style={{ marginBottom: '0.9rem' }}>
                        <p
                          style={{
                            fontSize: '0.9rem',
                            color: 'var(--text-muted)',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-line',
                            margin: 0,
                          }}
                        >
                          {isLongContent && !isExpanded ? `${post.content.slice(0, 240)}...` : post.content}
                        </p>
                        {isLongContent && (
                          <button
                            onClick={() => toggleExpand(post.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary)',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '2px 0 0',
                            }}
                          >
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Attached Media Cards */}
                    {post.media && post.media.length > 0 && (
                      <div style={{ marginBottom: '0.95rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: 'var(--primary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Film size={13} /> Attached Media ({post.media.length})
                          </span>
                        </div>

                        <div className="post-media-grid">
                          {post.media.map((item, idx) => (
                            <div key={idx} className="post-media-card">
                              {item.media_type === 'video' ? (
                                <div>
                                  <video
                                    src={resolveMediaUrl(item.media_url)}
                                    controls
                                    poster={item.thumbnail_url ? resolveMediaUrl(item.thumbnail_url) : undefined}
                                  />
                                  <div
                                    style={{
                                      padding: '6px 10px',
                                      fontSize: '11px',
                                      color: '#94a3b8',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      background: '#090d16',
                                    }}
                                  >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Video size={13} color="#f43f5e" /> Video Stream
                                    </span>
                                    {item.duration > 0 && <span>{item.duration}s</span>}
                                  </div>
                                </div>
                              ) : item.media_type === 'audio' ? (
                                <div className="post-media-audio">
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9333ea', fontSize: '12px', fontWeight: 700 }}>
                                      <Music size={15} /> Audio Clip
                                    </span>
                                    {item.duration > 0 && (
                                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>
                                        {item.duration}s
                                      </span>
                                    )}
                                  </div>
                                  <audio src={resolveMediaUrl(item.media_url)} controls style={{ width: '100%', height: '36px' }} />
                                </div>
                              ) : (
                                <div style={{ position: 'relative' }}>
                                  <img
                                    src={resolveMediaUrl(item.media_url)}
                                    alt={`Post media #${idx + 1}`}
                                    onClick={() => setSelectedPostDetails(post)}
                                    title="Click to inspect high-res image"
                                  />
                                  <div
                                    style={{
                                      position: 'absolute',
                                      bottom: '6px',
                                      right: '6px',
                                      background: 'rgba(0,0,0,0.65)',
                                      color: '#ffffff',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 600,
                                      backdropFilter: 'blur(4px)',
                                    }}
                                  >
                                    Image #{idx + 1}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Engagement & Footer Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '0.8rem',
                        borderTop: '1px solid var(--border-color)',
                        flexWrap: 'wrap',
                        gap: '0.65rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div className="post-engagement-pill" style={{ color: '#e11d48', borderColor: 'rgba(225, 29, 72, 0.2)' }}>
                          <Heart size={14} />
                          <span>{post.likes_count || 0} Likes</span>
                        </div>

                        <div className="post-engagement-pill" style={{ color: '#0284c7', borderColor: 'rgba(2, 132, 199, 0.2)' }}>
                          <MessageCircle size={14} />
                          <span>{post.comments_count || 0} Comments</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-dim)',
                            border: '1px solid var(--border-color)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Type: {post.media_type || 'text'}
                        </span>

                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                          Post ID #{post.id}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE: MODERATOR TABLE */}
          {viewMode === 'table' && (
            <div className="post-table-container">
              <div style={{ overflowX: 'auto' }}>
                <table className="post-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={posts.length > 0 && selectedIds.length === posts.length}
                          onChange={handleToggleSelectAll}
                          style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#7c3aed' }}
                        />
                      </th>
                      <th>Post ID</th>
                      <th>Author</th>
                      <th>Title & Content Excerpt</th>
                      <th>Media Format</th>
                      <th>Engagement</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => {
                      const isSelected = selectedIds.includes(post.id);
                      return (
                        <tr key={post.id} className={isSelected ? 'selected' : ''}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(post.id)}
                              style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#7c3aed' }}
                            />
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                            #{post.id}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <img
                                src={post.author?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.user_id}`}
                                alt={post.author?.name || 'User'}
                                onClick={() => setDetailsUserId(post.user_id)}
                                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                              />
                              <div>
                                <div
                                  onClick={() => setDetailsUserId(post.user_id)}
                                  style={{ fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.88rem' }}
                                  className="hover-underline"
                                >
                                  {post.author?.name || `User #${post.user_id}`}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                  ID: #{post.user_id} • {post.author?.role || 'user'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ maxWidth: '320px' }}>
                            {post.title && (
                              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.86rem', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {post.title}
                              </div>
                            )}
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {post.content || <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>No caption</span>}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              {post.media_type === 'video' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#e11d48', fontWeight: 600, fontSize: '0.8rem' }}>
                                  <Video size={14} /> Video ({post.media?.length || 1})
                                </span>
                              ) : post.media_type === 'audio' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#9333ea', fontWeight: 600, fontSize: '0.8rem' }}>
                                  <Music size={14} /> Audio ({post.media?.length || 1})
                                </span>
                              ) : post.media_type === 'image' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0284c7', fontWeight: 600, fontSize: '0.8rem' }}>
                                  <ImageIcon size={14} /> Photos ({post.media?.length || 1})
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Text Only</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.8rem' }}>
                              <span style={{ color: '#e11d48', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Heart size={13} /> {post.likes_count || 0}
                              </span>
                              <span style={{ color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <MessageCircle size={13} /> {post.comments_count || 0}
                              </span>
                            </div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                            {formatTimeAgo(post.created_at)}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setSelectedPostDetails(post)}
                                title="Inspect details"
                                style={{ padding: '0.35rem 0.6rem' }}
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={() => setDeleteConfirmId(post.id)}
                                title="Delete post"
                                style={{
                                  padding: '0.35rem 0.6rem',
                                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                  color: '#dc2626',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages || Math.ceil(pagination.total / pageSize) || 1}
            totalItems={pagination.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </div>
      )}

      {/* 6. POST INSPECTION MODAL */}
      {selectedPostDetails && (
        <div className="modal-overlay" onClick={() => setSelectedPostDetails(null)}>
          <div
            className="modal-box"
            style={{
              maxWidth: '720px',
              width: '95%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <img
                  src={selectedPostDetails.author?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedPostDetails.user_id}`}
                  alt={selectedPostDetails.author?.name || 'User'}
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                      {selectedPostDetails.author?.name || `User #${selectedPostDetails.user_id}`}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(124, 58, 237, 0.1)',
                        color: 'var(--primary)',
                      }}
                    >
                      ID #{selectedPostDetails.user_id}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Posted on {new Date(selectedPostDetails.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedPostDetails(null)}
                style={{ width: 34, height: 34, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Post Title */}
            {selectedPostDetails.title && (
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.6rem', lineHeight: 1.35 }}>
                {selectedPostDetails.title}
              </h3>
            )}

            {/* Post Content */}
            <div
              style={{
                fontSize: '0.94rem',
                color: 'var(--text-main)',
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
                marginBottom: '1.4rem',
                padding: '0.9rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {selectedPostDetails.content || <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>No caption text</span>}
            </div>

            {/* Media Gallery */}
            {selectedPostDetails.media && selectedPostDetails.media.length > 0 && (
              <div style={{ marginBottom: '1.4rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Media Attachments ({selectedPostDetails.media.length})
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                  {selectedPostDetails.media.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#090d16',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      {m.media_type === 'video' ? (
                        <div>
                          <video
                            src={resolveMediaUrl(m.media_url)}
                            controls
                            style={{ width: '100%', height: '240px', objectFit: 'contain', background: '#000' }}
                          />
                          <div style={{ padding: '6px 12px', fontSize: '11px', color: '#94a3b8', background: '#090d16' }}>
                            Video clip • {m.duration || 0}s duration
                          </div>
                        </div>
                      ) : m.media_type === 'audio' ? (
                        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <span style={{ fontSize: '0.84rem', color: '#a855f7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Music size={16} /> Audio Recording
                          </span>
                          <audio src={resolveMediaUrl(m.media_url)} controls style={{ width: '100%' }} />
                        </div>
                      ) : (
                        <a href={resolveMediaUrl(m.media_url)} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                          <img
                            src={resolveMediaUrl(m.media_url)}
                            alt="Media Preview"
                            style={{ width: '100%', height: '240px', objectFit: 'contain', display: 'block' }}
                          />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer / Telemetry */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1.15rem',
                borderTop: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="post-engagement-pill" style={{ color: '#e11d48' }}>
                  <Heart size={15} />
                  <span>{selectedPostDetails.likes_count || 0} Likes</span>
                </div>
                <div className="post-engagement-pill" style={{ color: '#0284c7' }}>
                  <MessageCircle size={15} />
                  <span>{selectedPostDetails.comments_count || 0} Comments</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setDetailsUserId(selectedPostDetails.user_id);
                    setSelectedPostDetails(null);
                  }}
                  style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <User size={14} />
                  <span>Author Profile</span>
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setDeleteConfirmId(selectedPostDetails.id)}
                  style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Trash2 size={14} />
                  <span>Delete Post</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => !deletingPost && setDeleteConfirmId(null)}>
          <div
            className="modal-box"
            style={{
              maxWidth: '420px',
              width: '92%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <Trash2 size={26} />
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
                Delete Post #{deleteConfirmId}?
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.4rem' }}>
                Are you sure you want to permanently erase this post? All attached images, videos, audio notes, comments, and reactions will be permanently deleted.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={deletingPost}
                  style={{ minWidth: '95px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDeletePost(deleteConfirmId)}
                  disabled={deletingPost}
                  style={{
                    minWidth: '115px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  {deletingPost ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
