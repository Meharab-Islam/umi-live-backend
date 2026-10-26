import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Trash2,
  RefreshCw,
  Video,
  Image as ImageIcon,
  Mic,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  X,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  FileText,
  Eye,
  Play,
  Volume2,
  Users,
  Maximize2,
} from 'lucide-react';
import chatApi from '../api/chatApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import './ChatModeration.css';

// Helper to resolve backend media URLs
const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const host = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5050` : 'http://localhost:5050';
  return `${host}${url.startsWith('/') ? url : '/' + url}`;
};

// Helper for time formatting
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

const formatFullDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ChatModeration({ onToast }) {
  // Search & Navigation state
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Conversations list state
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [refreshing, setRefreshing] = useState(false);

  // Selected conversation & message inspection state
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Deletion modals state
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [convToDelete, setConvToDelete] = useState(null);
  const [deletingConv, setDeletingConv] = useState(false);

  // Media lightbox modal state
  const [previewMedia, setPreviewMedia] = useState(null);

  // 1. Fetch Conversations
  const fetchConversations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingConversations(true);

    try {
      const params = {
        page,
        limit: 15,
      };
      if (selectedUser?.id) {
        params.userId = selectedUser.id;
      }
      if (activeSearch) {
        params.search = activeSearch;
      }

      const res = await chatApi.getConversations(params);
      if (res && res.success) {
        setConversations(res.conversations || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        if (onToast) onToast(res?.message || 'Failed to load conversations.', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Network error fetching conversations.', 'error');
    } finally {
      setLoadingConversations(false);
      setRefreshing(false);
    }
  }, [page, selectedUser, activeSearch, onToast]);

  // Trigger conversation fetch on filter/page changes
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 2. User Search Autocomplete / Quick Select
  const handleUserSearch = async (val) => {
    setSearchInput(val);
    const query = val.trim();
    if (!query) {
      setUserSearchResults([]);
      setActiveSearch('');
      setSelectedUser(null);
      return;
    }

    setSearchingUsers(true);
    try {
      const res = await chatApi.searchChatUsers({ query, limit: 8 });
      if (res && res.success) {
        setUserSearchResults(res.users || []);
      }
    } catch {
      // silent
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setUserSearchResults([]);
    setSearchInput(user.full_name || `User #${user.id}`);
    setActiveSearch('');
    setPage(1);
    setSelectedConvId(null);
    setCurrentConversation(null);
    setMessages([]);
  };

  const handleClearUserFilter = () => {
    setSelectedUser(null);
    setSearchInput('');
    setActiveSearch('');
    setUserSearchResults([]);
    setPage(1);
  };

  const handleApplySearch = (e) => {
    if (e) e.preventDefault();
    setActiveSearch(searchInput.trim());
    setPage(1);
    setUserSearchResults([]);
  };

  // 3. Fetch Conversation Messages
  const fetchMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMessages(true);
    try {
      const res = await chatApi.getConversationMessages(convId);
      if (res && res.success) {
        setCurrentConversation(res.conversation);
        setMessages(res.messages || []);
      } else {
        if (onToast) onToast(res?.message || 'Failed to load messages.', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Error loading conversation messages.', 'error');
    } finally {
      setLoadingMessages(false);
    }
  }, [onToast]);

  const handleSelectConversation = (conv) => {
    setSelectedConvId(conv.id);
    fetchMessages(conv.id);
  };

  // 4. Delete Single Message
  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    setDeletingMessage(true);
    try {
      const res = await chatApi.deleteChatMessage(messageToDelete.id);
      if (res && res.success) {
        if (onToast) {
          onToast(
            `Message and storage media files purged (${res.removed_files || 0} files deleted).`,
            'success'
          );
        }
        setMessages((prev) => prev.filter((m) => m.id !== messageToDelete.id));
        setMessageToDelete(null);
        fetchConversations(false);
      } else {
        if (onToast) onToast(res?.message || 'Failed to delete message.', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Network error deleting message.', 'error');
    } finally {
      setDeletingMessage(false);
    }
  };

  // 5. Delete Entire Conversation
  const confirmDeleteConversation = async () => {
    if (!convToDelete) return;
    setDeletingConv(true);
    try {
      const res = await chatApi.deleteConversation(convToDelete.id);
      if (res && res.success) {
        if (onToast) {
          onToast(
            `Conversation and all media files permanently removed from database and disk storage (${res.removed_files || 0} files purged).`,
            'success'
          );
        }
        setConvToDelete(null);
        setSelectedConvId(null);
        setCurrentConversation(null);
        setMessages([]);
        fetchConversations(false);
      } else {
        if (onToast) onToast(res?.message || 'Failed to delete conversation.', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Network error deleting conversation.', 'error');
    } finally {
      setDeletingConv(false);
    }
  };

  return (
    <div className="chat-mod-container">
      {/* Top Banner / Header */}
      <div className="chat-mod-header">
        <div className="chat-mod-header-left">
          <div className="chat-mod-icon-badge">
            <MessageSquare size={26} />
          </div>
          <div>
            <h1 className="chat-mod-title">Chat Moderation & Inspection</h1>
            <p className="chat-mod-subtitle">
              Audit 1-to-1 conversations, search users, inspect photos & videos, and delete messages with automatic server disk file cleanup.
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={() => fetchConversations(true)}
            disabled={refreshing}
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
              color: 'var(--text-main)',
            }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* User Search & Filters Card */}
      <div className="chat-search-card">
        <form onSubmit={handleApplySearch} className="chat-search-form">
          <div className="chat-search-input-wrap">
            <Search size={18} className="chat-search-icon" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleUserSearch(e.target.value)}
              placeholder="Search user by Name, User ID, or Email..."
              className="chat-search-input"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearUserFilter}
                className="chat-search-clear"
              >
                <X size={16} />
              </button>
            )}

            {/* User Search Autocomplete Dropdown */}
            {userSearchResults.length > 0 && (
              <div className="chat-search-dropdown">
                <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                  SELECT A USER TO INSPECT CONVERSATIONS:
                </div>
                {userSearchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className="chat-user-item"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={resolveMediaUrl(u.avatar_url) || 'https://via.placeholder.com/36'}
                        alt={u.full_name}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/36';
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {u.full_name}{' '}
                          <span style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'rgba(30, 136, 229, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                            ID: {u.id}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {u.email || `Role: ${u.role}`}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#059669', background: 'rgba(5, 150, 105, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        {u.conversation_count || 0} chats
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            style={{
              padding: '0 20px',
              height: '42px',
              background: 'var(--primary, #1e88e5)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Search size={15} />
            Filter
          </button>
        </form>

        {/* Selected User Filter Card */}
        {selectedUser && (
          <div className="chat-selected-filter-badge">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={resolveMediaUrl(selectedUser.avatar_url) || 'https://via.placeholder.com/36'}
                alt={selectedUser.full_name}
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedUser.full_name}{' '}
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                    (User ID: {selectedUser.id})
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Filtered: Viewing all conversations involving this user ({selectedUser.conversation_count || 0} total chats)
                </div>
              </div>
            </div>

            <button
              onClick={handleClearUserFilter}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: 'rgba(225, 29, 72, 0.1)',
                color: '#e11d48',
                border: '1px solid rgba(225, 29, 72, 0.25)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <X size={14} />
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* Master-Detail Split Grid */}
      <div className="chat-split-grid">
        {/* Left Column: Conversations List */}
        <div className="chat-conversations-panel">
          <div className="chat-panel-title">
            <Users size={16} />
            <span>Conversations ({pagination.total})</span>
          </div>

          <div className="chat-conv-scroll">
            {loadingConversations ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <Loader />
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                <MessageSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No conversations found</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                  {selectedUser ? 'This user has no active 1-to-1 chats yet.' : 'Try searching for another user.'}
                </div>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConvId === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`chat-conv-card ${isSelected ? 'active' : ''}`}
                  >
                    <div className="chat-conv-header-row">
                      <div className="chat-avatars-pair">
                        <img
                          src={resolveMediaUrl(conv.user1.avatar_url) || 'https://via.placeholder.com/32'}
                          alt={conv.user1.full_name}
                          className="chat-avatar-circle"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/32';
                          }}
                        />
                        <img
                          src={resolveMediaUrl(conv.user2.avatar_url) || 'https://via.placeholder.com/32'}
                          alt={conv.user2.full_name}
                          className="chat-avatar-circle overlap"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/32';
                          }}
                        />
                      </div>

                      <div className="chat-conv-info">
                        <div className="chat-conv-names">
                          {conv.user1.full_name} ↔ {conv.user2.full_name}
                        </div>
                        <div className="chat-conv-snippet">
                          {conv.last_message || 'Media attachment'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>
                          {formatTimeAgo(conv.last_message_at)}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'rgba(30, 136, 229, 0.1)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                          {conv.total_messages} msgs
                        </span>
                      </div>
                    </div>

                    {/* Media Type Badges Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {conv.has_images && (
                          <span className="chat-media-pill pill-image">
                            <ImageIcon size={11} /> {conv.image_count} Image{conv.image_count > 1 ? 's' : ''}
                          </span>
                        )}
                        {conv.has_videos && (
                          <span className="chat-media-pill pill-video">
                            <Video size={11} /> {conv.video_count} Video{conv.video_count > 1 ? 's' : ''}
                          </span>
                        )}
                        {conv.has_audio && (
                          <span className="chat-media-pill pill-voice">
                            <Mic size={11} /> Voice
                          </span>
                        )}
                        {!conv.has_images && !conv.has_videos && !conv.has_audio && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Text only</span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConvToDelete(conv);
                        }}
                        title="Delete entire conversation and storage files"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#e11d48',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
              <Pagination
                page={page}
                totalPages={pagination.totalPages}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>

        {/* Right Column: Chat Messages Timeline & Media Inspector */}
        <div className="chat-messages-panel">
          {!selectedConvId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
              <div style={{ padding: '16px', background: 'rgba(30, 136, 229, 0.08)', borderRadius: '50%', marginBottom: '12px' }}>
                <MessageSquare size={36} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Select a Conversation</h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '340px', marginTop: '4px', lineHeight: 1.4 }}>
                Click on any conversation from the left to inspect exchanged text, images, and videos between the two users.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Conversation Top Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{currentConversation?.user1?.full_name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>↔</span>
                    <span>{currentConversation?.user2?.full_name}</span>
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Conversation #{selectedConvId} • {messages.length} messages
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => fetchMessages(selectedConvId)}
                    disabled={loadingMessages}
                    title="Refresh conversation"
                    style={{
                      padding: '6px 10px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <RefreshCw size={14} className={loadingMessages ? 'animate-spin' : ''} />
                  </button>

                  <button
                    onClick={() => {
                      if (currentConversation) {
                        setConvToDelete(currentConversation);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      background: 'rgba(225, 29, 72, 0.1)',
                      color: '#e11d48',
                      border: '1px solid rgba(225, 29, 72, 0.25)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} />
                    Wipe Conversation
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="chat-messages-stream">
                {loadingMessages ? (
                  <div style={{ padding: '60px 0', textAlign: 'center' }}>
                    <Loader />
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    No messages found in this conversation.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser1 = msg.sender.id === currentConversation?.user1?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`chat-msg-row ${isUser1 ? 'user1-bubble' : 'user2-bubble'}`}
                      >
                        <div className="chat-msg-top">
                          <div className="chat-msg-sender">
                            <img
                              src={resolveMediaUrl(msg.sender.avatar_url) || 'https://via.placeholder.com/24'}
                              alt={msg.sender.full_name}
                              className="chat-sender-img"
                            />
                            <span className="chat-sender-name">{msg.sender.full_name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>➔ {msg.receiver.full_name}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                              {formatFullDate(msg.created_at)}
                            </span>
                            <button
                              onClick={() => setMessageToDelete(msg)}
                              title="Delete message & media file"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#e11d48',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Text Message */}
                        {msg.message && (
                          <div className="chat-msg-text">{msg.message}</div>
                        )}

                        {/* Media Preview: Single media_url */}
                        {msg.media_url && (
                          <div className="chat-msg-media-wrap">
                            {msg.message_type === 'video' || msg.media_url.match(/\.(mp4|mov|webm)$/i) ? (
                              <div style={{ maxWidth: '320px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000000' }}>
                                <video
                                  src={resolveMediaUrl(msg.media_url)}
                                  controls
                                  style={{ width: '100%', maxHeight: '220px', display: 'block' }}
                                />
                              </div>
                            ) : msg.message_type === 'audio' || msg.media_url.match(/\.(mp3|wav|aac|ogg|m4a)$/i) ? (
                              <div style={{ maxWidth: '320px', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Volume2 size={18} color="var(--primary)" />
                                <audio src={resolveMediaUrl(msg.media_url)} controls style={{ width: '100%', height: '32px' }} />
                              </div>
                            ) : (
                              <div style={{ display: 'inline-block', position: 'relative' }}>
                                <img
                                  src={resolveMediaUrl(msg.media_url)}
                                  alt="Attachment"
                                  onClick={() =>
                                    setPreviewMedia({
                                      type: 'image',
                                      url: resolveMediaUrl(msg.media_url),
                                    })
                                  }
                                  className="chat-msg-thumb"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Multiple Media Items */}
                        {Array.isArray(msg.media_items) && msg.media_items.length > 0 && (
                          <div className="chat-msg-media-wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                            {msg.media_items.map((item, idx) => (
                              <div key={item.id || idx} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', height: '90px' }}>
                                {item.media_type === 'video' ? (
                                  <div
                                    onClick={() =>
                                      setPreviewMedia({
                                        type: 'video',
                                        url: resolveMediaUrl(item.media_url),
                                      })
                                    }
                                    style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                  >
                                    <Play size={20} color="#fff" />
                                  </div>
                                ) : (
                                  <img
                                    src={resolveMediaUrl(item.media_url)}
                                    alt="Media"
                                    onClick={() =>
                                      setPreviewMedia({
                                        type: 'image',
                                        url: resolveMediaUrl(item.media_url),
                                      })
                                    }
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Delete Single Message */}
      {messageToDelete && (
        <div className="chat-modal-overlay">
          <div className="chat-modal-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e11d48' }}>
              <AlertTriangle size={24} />
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Delete Chat Message</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Message ID: #{messageToDelete.id}</div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Are you sure you want to delete this message?
            </p>

            <div style={{ padding: '10px 12px', background: 'rgba(225, 29, 72, 0.08)', border: '1px solid rgba(225, 29, 72, 0.25)', borderRadius: '10px', fontSize: '0.78rem', color: '#e11d48', lineHeight: 1.4 }}>
              <strong>Permanent Disk Storage Purge:</strong> Any attached photos, videos, or voice recordings will be permanently deleted from the server storage disk and database.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                disabled={deletingMessage}
                style={{
                  padding: '8px 16px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMessage}
                disabled={deletingMessage}
                style={{
                  padding: '8px 18px',
                  background: '#e11d48',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {deletingMessage && <RefreshCw size={14} className="animate-spin" />}
                Delete Message & Media
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Entire Conversation */}
      {convToDelete && (
        <div className="chat-modal-overlay">
          <div className="chat-modal-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e11d48' }}>
              <Trash2 size={24} />
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Wipe Entire Conversation</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Conversation ID: #{convToDelete.id}</div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              This will completely wipe the conversation between <strong>{convToDelete.user1?.full_name}</strong> and <strong>{convToDelete.user2?.full_name}</strong>.
            </p>

            <div style={{ padding: '10px 12px', background: 'rgba(225, 29, 72, 0.08)', border: '1px solid rgba(225, 29, 72, 0.25)', borderRadius: '10px', fontSize: '0.78rem', color: '#e11d48', lineHeight: 1.4 }}>
              <strong>Comprehensive Cleanup:</strong> All {convToDelete.total_messages || 'all'} messages and all associated image/video files in server storage will be permanently wiped.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setConvToDelete(null)}
                disabled={deletingConv}
                style={{
                  padding: '8px 16px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteConversation}
                disabled={deletingConv}
                style={{
                  padding: '8px 18px',
                  background: '#e11d48',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {deletingConv && <RefreshCw size={14} className="animate-spin" />}
                Wipe Conversation & Media
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Fullscreen Media Preview Lightbox */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(6px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }}
          >
            <button
              onClick={() => setPreviewMedia(null)}
              style={{
                position: 'absolute',
                top: '-42px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>

            {previewMedia.type === 'video' ? (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px' }}
              />
            ) : (
              <img
                src={previewMedia.url}
                alt="Fullscreen"
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
