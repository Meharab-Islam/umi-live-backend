import React, { useState, useEffect, useCallback } from 'react';
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Selection for bulk operations
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Modals
  const [selectedPostDetails, setSelectedPostDetails] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [detailsUserId, setDetailsUserId] = useState(null);

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

  // If viewing details of a user, render as a dedicated full-page view!
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


      {/* 2. Top Stats KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
        <div className="card" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(168, 85, 247, 0.2) 100%)',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Newspaper size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Posts
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {stats.total_posts}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.12) 0%, rgba(244, 63, 94, 0.2) 100%)',
              color: '#e11d48',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Video size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Videos
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {stats.total_videos}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.12) 0%, rgba(192, 132, 252, 0.2) 100%)',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Music size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Audio Clips
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {stats.total_audios}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(56, 189, 248, 0.2) 100%)',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ImageIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Photos
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {stats.total_images}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(251, 113, 133, 0.2) 100%)',
              color: '#f43f5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heart size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Reactions
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {stats.total_likes}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(52, 211, 153, 0.2) 100%)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Comments
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {stats.total_comments}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="card" style={{ padding: '1.15rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '420px' }}>
            <Search
              size={16}
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
              placeholder="Search author, ID, title, or caption..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.55rem 0.8rem 0.55rem 2.3rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none',
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
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Media Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginRight: '0.25rem' }}>
              Media:
            </span>
            {[
              { id: 'all', label: 'All' },
              { id: 'video', label: 'Videos 🎥' },
              { id: 'audio', label: 'Audio 🎵' },
              { id: 'image', label: 'Photos 🖼️' },
              { id: 'none', label: 'Text Only 📝' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setMediaTypeFilter(tab.id);
                  setPage(1);
                }}
                className={`post-filter-chip ${mediaTypeFilter === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={posts.length}
        onSelectAll={handleToggleSelectAll}
        onClearSelection={() => setSelectedIds([])}
        onDelete={handleBulkDelete}
        entityName="posts"
        deleting={bulkDeleting}
      />

      {/* 5. Post Feed List */}
      {loading ? (
        <Loader message="Loading posts & community feed..." />
      ) : posts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-dim)' }}>
          <ShieldAlert size={46} style={{ margin: '0 auto 0.75rem', opacity: 0.35, color: '#7c3aed' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            No Posts Found
          </h3>
          <p style={{ fontSize: '0.86rem', maxWidth: '380px', margin: '0 auto', color: 'var(--text-muted)' }}>
            {search || mediaTypeFilter !== 'all'
              ? 'No posts matched your current search or media filter criteria.'
              : 'No community feed posts have been created on the platform yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* List Header Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              color: 'var(--text-dim)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input
                type="checkbox"
                checked={posts.length > 0 && selectedIds.length === posts.length}
                onChange={handleToggleSelectAll}
                style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#7c3aed' }}
              />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                Select All ({selectedIds.length} of {posts.length})
              </span>
            </div>
            <div>
              Showing {posts.length} of {pagination.total} total posts
            </div>
          </div>

          {/* Individual Post Cards */}
          {posts.map((post) => {
            const isSelected = selectedIds.includes(post.id);

            return (
              <div
                key={post.id}
                className={`post-feed-card ${isSelected ? 'selected' : ''}`}
              >
                {/* Post Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(post.id)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#7c3aed', marginTop: '2px' }}
                    />

                    {/* Author Avatar */}
                    <img
                      src={post.author?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.user_id}`}
                      alt={post.author?.name || 'User'}
                      onClick={() => setDetailsUserId(post.user_id)}
                      title="Click to view author profile"
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--border-color)',
                        cursor: 'pointer',
                      }}
                      onError={(e) => {
                        e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${post.user_id}`;
                      }}
                    />

                    {/* Author info */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span
                          onClick={() => setDetailsUserId(post.user_id)}
                          style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem', cursor: 'pointer' }}
                        >
                          {post.author?.name || `User #${post.user_id}`}
                        </span>

                        <span
                          className="user-id-badge"
                          onClick={() => setDetailsUserId(post.user_id)}
                          title="Click to view user telemetry"
                          style={{ fontSize: '0.74rem', padding: '1px 6px' }}
                        >
                          #{post.user_id}
                        </span>

                        {post.author?.package_category?.name && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: '4px',
                              border: `1px solid ${post.author.package_category.color_code || '#7c3aed'}`,
                              color: post.author.package_category.color_code || '#7c3aed',
                              backgroundColor: 'rgba(124, 58, 237, 0.08)',
                            }}
                          >
                            👑 {post.author.package_category.name}
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-dim)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {post.author?.role || 'user'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        <Clock size={12} />
                        <span>
                          {new Date(post.created_at).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedPostDetails(post)}
                      title="Inspect full post & media"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                    >
                      <Eye size={13} style={{ marginRight: '4px' }} />
                      <span>Inspect</span>
                    </button>

                    <button
                      className="btn btn-sm"
                      onClick={() => setDeleteConfirmId(post.id)}
                      title="Delete post"
                      style={{
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.78rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#dc2626',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Post Title */}
                {post.title && (
                  <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    {post.title}
                  </h4>
                )}

                {/* Post Content */}
                {post.content && (
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-line', marginBottom: '0.75rem' }}>
                    {post.content}
                  </p>
                )}

                {/* Attached Media Renderers */}
                {post.media && post.media.length > 0 && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                              <div style={{ padding: '4px 8px', fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', background: '#090d16' }}>
                                <span>🎥 Video Clip</span>
                                {item.duration > 0 && <span>{item.duration}s</span>}
                              </div>
                            </div>
                          ) : item.media_type === 'audio' ? (
                            <div className="post-media-audio">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a855f7', fontSize: '12px', fontWeight: 600 }}>
                                <Music size={15} /> Audio Attachment
                              </div>
                              <audio src={resolveMediaUrl(item.media_url)} controls style={{ width: '100%', height: '32px' }} />
                              {item.duration > 0 && (
                                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                  Duration: {item.duration}s
                                </div>
                              )}
                            </div>
                          ) : (
                            <img
                              src={resolveMediaUrl(item.media_url)}
                              alt={`Media ${idx + 1}`}
                              onClick={() => setSelectedPostDetails(post)}
                              title="Click to view full preview"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engagement Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="post-engagement-pill" style={{ color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
                      <Heart size={14} />
                      <span>{post.likes_count || 0} Likes</span>
                    </div>

                    <div className="post-engagement-pill" style={{ color: '#0284c7', borderColor: 'rgba(2, 132, 199, 0.2)' }}>
                      <MessageCircle size={14} />
                      <span>{post.comments_count || 0} Comments</span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-dim)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    Format: {post.media_type || 'text'}
                  </span>
                </div>
              </div>
            );
          })}

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

      {/* 6. POST DETAILS INSPECTION MODAL */}
      {selectedPostDetails && (
        <div className="modal-overlay" onClick={() => setSelectedPostDetails(null)}>
          <div
            className="modal-box"
            style={{
              maxWidth: '680px',
              width: '95%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img
                  src={selectedPostDetails.author?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedPostDetails.user_id}`}
                  alt={selectedPostDetails.author?.name || 'User'}
                  style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.98rem' }}>
                    {selectedPostDetails.author?.name || `User #${selectedPostDetails.user_id}`}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                    ID #{selectedPostDetails.user_id} • {new Date(selectedPostDetails.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedPostDetails(null)}
                style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Post Title & Content */}
            {selectedPostDetails.title && (
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
                {selectedPostDetails.title}
              </h3>
            )}

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.55, whiteSpace: 'pre-line', marginBottom: '1.25rem' }}>
              {selectedPostDetails.content}
            </p>

            {/* Media Gallery */}
            {selectedPostDetails.media && selectedPostDetails.media.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Media Gallery ({selectedPostDetails.media.length})
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  {selectedPostDetails.media.map((m, idx) => (
                    <div key={idx} style={{ background: '#090d16', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', padding: '4px' }}>
                      {m.media_type === 'video' ? (
                        <video src={resolveMediaUrl(m.media_url)} controls style={{ width: '100%', height: '220px', objectFit: 'contain', background: '#000' }} />
                      ) : m.media_type === 'audio' ? (
                        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Music size={16} /> Audio Clip
                          </span>
                          <audio src={resolveMediaUrl(m.media_url)} controls style={{ width: '100%' }} />
                        </div>
                      ) : (
                        <a href={resolveMediaUrl(m.media_url)} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                          <img
                            src={resolveMediaUrl(m.media_url)}
                            alt="Preview"
                            style={{ width: '100%', height: '220px', objectFit: 'contain', display: 'block' }}
                          />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="post-engagement-pill" style={{ color: '#f43f5e' }}>
                  <Heart size={14} />
                  <span>{selectedPostDetails.likes_count || 0} Likes</span>
                </div>
                <div className="post-engagement-pill" style={{ color: '#0284c7' }}>
                  <MessageCircle size={14} />
                  <span>{selectedPostDetails.comments_count || 0} Comments</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedPostDetails(null)}
                  style={{ fontSize: '0.85rem' }}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    setDeleteConfirmId(selectedPostDetails.id);
                  }}
                  style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={14} />
                  <span>Delete Post</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => !deletingPost && setDeleteConfirmId(null)}>
          <div
            className="modal-box"
            style={{
              maxWidth: '400px',
              width: '92%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                }}
              >
                <Trash2 size={24} />
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Delete Post #{deleteConfirmId}?
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '1.25rem' }}>
                Are you sure you want to permanently delete this community post? All associated media attachments, reactions, and comments will be erased.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={deletingPost}
                  style={{ minWidth: '90px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDeletePost(deleteConfirmId)}
                  disabled={deletingPost}
                  style={{
                    minWidth: '100px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
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
