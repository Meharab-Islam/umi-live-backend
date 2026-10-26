import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Paperclip,
  Users,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import chatApi from '../api/chatApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';

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
  const [selectedUser, setSelectedUser] = useState(null); // When filtering by a specific user
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
  const [previewMedia, setPreviewMedia] = useState(null); // { type: 'image' | 'video', url: string, name?: string }

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
      if (res.success) {
        setConversations(res.conversations || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        if (onToast) onToast(res.message || 'Failed to load conversations.', 'error');
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
      if (res.success) {
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
      if (res.success) {
        setCurrentConversation(res.conversation);
        setMessages(res.messages || []);
      } else {
        if (onToast) onToast(res.message || 'Failed to load messages.', 'error');
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
      if (res.success) {
        if (onToast) {
          onToast(
            `Message and storage files deleted successfully (${res.removed_files || 0} media files removed).`,
            'success'
          );
        }
        // Remove locally from messages array
        setMessages((prev) => prev.filter((m) => m.id !== messageToDelete.id));
        setMessageToDelete(null);
        // Refresh conversations to update last message preview and counts
        fetchConversations(false);
      } else {
        if (onToast) onToast(res.message || 'Failed to delete message.', 'error');
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
      if (res.success) {
        if (onToast) {
          onToast(
            `Conversation and all media permanently wiped from database and storage (${res.removed_files || 0} files purged).`,
            'success'
          );
        }
        setConvToDelete(null);
        setSelectedConvId(null);
        setCurrentConversation(null);
        setMessages([]);
        fetchConversations(false);
      } else {
        if (onToast) onToast(res.message || 'Failed to delete conversation.', 'error');
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Network error deleting conversation.', 'error');
    } finally {
      setDeletingConv(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">Chat Moderation & Inspection</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Search users, audit 1-to-1 conversations, inspect exchanged media (photos & videos), and delete messages with automatic storage file cleanup.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchConversations(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/60 text-sm font-medium transition-all shadow-sm active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* User Search & Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-sm relative">
        <form onSubmit={handleApplySearch} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleUserSearch(e.target.value)}
              placeholder="Search user by Name, User ID, Email, or Phone number..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-11 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearUserFilter}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* User Search Autocomplete Dropdown */}
            {userSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                <div className="p-2.5 text-xs font-semibold text-slate-400 bg-slate-950/60">
                  Select a user to inspect all their conversations:
                </div>
                {userSearchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-800/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveMediaUrl(u.avatar_url) || 'https://via.placeholder.com/40'}
                        alt={u.full_name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-700"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/40';
                        }}
                      />
                      <div>
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          {u.full_name}
                          <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                            ID: {u.id}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {u.email || u.phone_number || `Role: ${u.role}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
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
            className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Filter
          </button>
        </form>

        {/* Selected User Filter Card */}
        {selectedUser && (
          <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={resolveMediaUrl(selectedUser.avatar_url) || 'https://via.placeholder.com/40'}
                alt={selectedUser.full_name}
                className="w-10 h-10 rounded-full object-cover border border-indigo-500/30"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{selectedUser.full_name}</span>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-md">
                    User ID: {selectedUser.id}
                  </span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md capitalize">
                    {selectedUser.role}
                  </span>
                </div>
                <p className="text-xs text-indigo-200/70 mt-0.5">
                  Showing all conversations involving this user ({selectedUser.conversation_count || 0} total chats)
                </p>
              </div>
            </div>

            <button
              onClick={handleClearUserFilter}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-all font-medium"
            >
              <X className="w-3.5 h-3.5" />
              Clear User Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Split Grid Layout: Conversations (Left) + Messages (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
        {/* Left Column: Conversations List (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Conversations ({pagination.total})
              </h2>
            </div>
            {selectedUser && (
              <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-mono">
                {selectedUser.full_name}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[600px]">
            {loadingConversations ? (
              <div className="py-20 flex justify-center">
                <Loader />
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-20 text-center px-4">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-40" />
                <p className="text-sm text-slate-400 font-medium">No conversations found</p>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedUser
                    ? 'This user has not engaged in any 1-to-1 chats yet.'
                    : 'Try searching with a different user name or ID.'}
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConvId === conv.id;
                // If filtering by a specific user, highlight the other party
                const otherParty = selectedUser
                  ? conv.user1.id === selectedUser.id
                    ? conv.user2
                    : conv.user1
                  : null;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Participants Avatars */}
                      <div className="flex items-center gap-3">
                        <div className="relative flex -space-x-2">
                          <img
                            src={resolveMediaUrl(conv.user1.avatar_url) || 'https://via.placeholder.com/32'}
                            alt={conv.user1.full_name}
                            className="w-9 h-9 rounded-full object-cover border-2 border-slate-900 ring-1 ring-slate-700"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/32';
                            }}
                          />
                          <img
                            src={resolveMediaUrl(conv.user2.avatar_url) || 'https://via.placeholder.com/32'}
                            alt={conv.user2.full_name}
                            className="w-9 h-9 rounded-full object-cover border-2 border-slate-900 ring-1 ring-indigo-500/40"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/32';
                            }}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-white truncate">
                            <span className="truncate">{conv.user1.full_name}</span>
                            <span className="text-slate-500 text-xs font-normal">↔</span>
                            <span className="truncate">{conv.user2.full_name}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                            <span className="text-slate-500 font-mono">#{conv.id}</span>
                            <span>•</span>
                            <span className="truncate max-w-[140px] text-slate-300">
                              {conv.last_message || 'Media exchange'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-slate-500 block">
                          {formatTimeAgo(conv.last_message_at)}
                        </span>
                        <span className="inline-block mt-1 text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          {conv.total_messages} msgs
                        </span>
                      </div>
                    </div>

                    {/* Media Indicators row */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {conv.has_images && (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-medium">
                            <ImageIcon className="w-3 h-3" />
                            {conv.image_count} Image{conv.image_count > 1 ? 's' : ''}
                          </span>
                        )}
                        {conv.has_videos && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium">
                            <Video className="w-3 h-3" />
                            {conv.video_count} Video{conv.video_count > 1 ? 's' : ''}
                          </span>
                        )}
                        {conv.has_audio && (
                          <span className="flex items-center gap-1 text-[11px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 font-medium">
                            <Mic className="w-3 h-3" />
                            Voice
                          </span>
                        )}
                        {!conv.has_images && !conv.has_videos && !conv.has_audio && (
                          <span className="text-[11px] text-slate-500">Text only</span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConvToDelete(conv);
                        }}
                        title="Delete entire conversation and storage files"
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pt-3 border-t border-slate-800 mt-auto">
              <Pagination
                page={page}
                totalPages={pagination.totalPages}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>

        {/* Right Column: Chat Messages Timeline & Media Inspector (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
          {!selectedConvId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <div className="p-4 bg-slate-800/40 rounded-full border border-slate-700/40 mb-4">
                <MessageSquare className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-300">No Conversation Selected</h3>
              <p className="text-sm text-slate-400 max-w-sm mt-1">
                Select a conversation from the left to inspect the messages, photos, and videos exchanged between users.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Conversation Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{currentConversation?.user1?.full_name}</span>
                      <span className="text-xs text-slate-500 font-normal">and</span>
                      <span>{currentConversation?.user2?.full_name}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Conversation ID: #{selectedConvId} • {messages.length} messages
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchMessages(selectedConvId)}
                    disabled={loadingMessages}
                    title="Refresh conversation messages"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => {
                      if (currentConversation) {
                        setConvToDelete(currentConversation);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Wipe Conversation
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[550px] p-2">
                {loadingMessages ? (
                  <div className="py-24 flex justify-center">
                    <Loader />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-20 text-center text-slate-500">
                    <p className="text-sm">No messages found in this conversation.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser1 = msg.sender.id === currentConversation?.user1?.id;
                    const hasMedia =
                      Boolean(msg.media_url) ||
                      (Array.isArray(msg.media_items) && msg.media_items.length > 0) ||
                      (Array.isArray(msg.media) && msg.media.length > 0);

                    return (
                      <div
                        key={msg.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isUser1
                            ? 'bg-slate-950/70 border-slate-800/80 mr-4'
                            : 'bg-indigo-950/20 border-indigo-900/40 ml-4'
                        }`}
                      >
                        {/* Header: Sender info + Time + Delete button */}
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={resolveMediaUrl(msg.sender.avatar_url) || 'https://via.placeholder.com/28'}
                              alt={msg.sender.full_name}
                              className="w-6 h-6 rounded-full object-cover border border-slate-700"
                            />
                            <span className="text-xs font-bold text-white">
                              {msg.sender.full_name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              (ID: {msg.sender.id})
                            </span>
                            <span className="text-[10px] text-slate-500">➔</span>
                            <span className="text-xs text-slate-400">
                              {msg.receiver.full_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">
                              {formatFullDate(msg.created_at)}
                            </span>
                            <button
                              onClick={() => setMessageToDelete(msg)}
                              title="Delete this message and remove attached storage file"
                              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Text Message Content */}
                        {msg.message && (
                          <div className="text-sm text-slate-200 whitespace-pre-wrap break-words pl-8">
                            {msg.message}
                          </div>
                        )}

                        {/* Media Inspector: Single media_url */}
                        {msg.media_url && (
                          <div className="mt-2.5 pl-8">
                            {msg.message_type === 'video' || msg.media_url.match(/\.(mp4|mov|webm)$/i) ? (
                              <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-black/40 max-w-sm">
                                <video
                                  src={resolveMediaUrl(msg.media_url)}
                                  controls
                                  className="w-full max-h-60 rounded-lg object-contain bg-black"
                                />
                                <div className="absolute top-2 right-2">
                                  <button
                                    onClick={() =>
                                      setPreviewMedia({
                                        type: 'video',
                                        url: resolveMediaUrl(msg.media_url),
                                      })
                                    }
                                    className="p-1.5 bg-black/70 hover:bg-black text-white rounded-md backdrop-blur-sm"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : msg.message_type === 'audio' || msg.media_url.match(/\.(mp3|wav|aac|ogg|m4a)$/i) ? (
                              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-3 max-w-sm">
                                <Volume2 className="w-5 h-5 text-purple-400 shrink-0" />
                                <audio src={resolveMediaUrl(msg.media_url)} controls className="w-full h-8" />
                              </div>
                            ) : (
                              /* Default to Image */
                              <div className="relative inline-block group">
                                <img
                                  src={resolveMediaUrl(msg.media_url)}
                                  alt="Attachment"
                                  onClick={() =>
                                    setPreviewMedia({
                                      type: 'image',
                                      url: resolveMediaUrl(msg.media_url),
                                    })
                                  }
                                  className="max-h-52 rounded-lg border border-slate-800 object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                                />
                                <button
                                  onClick={() =>
                                    setPreviewMedia({
                                      type: 'image',
                                      url: resolveMediaUrl(msg.media_url),
                                    })
                                  }
                                  className="absolute bottom-2 right-2 p-1.5 bg-black/70 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Multiple Media Attachments (from chat_message_media) */}
                        {Array.isArray(msg.media_items) && msg.media_items.length > 0 && (
                          <div className="mt-2.5 pl-8 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {msg.media_items.map((item, idx) => (
                              <div key={item.id || idx} className="relative group rounded-lg overflow-hidden border border-slate-800">
                                {item.media_type === 'video' ? (
                                  <div className="relative">
                                    <video
                                      src={resolveMediaUrl(item.media_url)}
                                      className="w-full h-28 object-cover bg-black"
                                    />
                                    <button
                                      onClick={() =>
                                        setPreviewMedia({
                                          type: 'video',
                                          url: resolveMediaUrl(item.media_url),
                                        })
                                      }
                                      className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 text-white"
                                    >
                                      <Play className="w-6 h-6 fill-white" />
                                    </button>
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
                                    className="w-full h-28 object-cover cursor-pointer hover:scale-105 transition-transform"
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

      {/* MODAL 1: Delete Single Message Confirmation */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Chat Message</h3>
                <p className="text-xs text-slate-400">Message ID: #{messageToDelete.id}</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to delete this message?
            </p>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Physical Storage Media Removal
              </p>
              <p className="text-rose-300/80">
                Any images, videos, or audio attached to this message will be permanently deleted from server disk storage and database records.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                disabled={deletingMessage}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMessage}
                disabled={deletingMessage}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2 disabled:opacity-60"
              >
                {deletingMessage && <RefreshCw className="w-4 h-4 animate-spin" />}
                Delete Message & Media
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Entire Conversation Confirmation */}
      {convToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Wipe Entire Conversation</h3>
                <p className="text-xs text-slate-400">Conversation ID: #{convToDelete.id}</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              This will completely remove the conversation between{' '}
              <strong className="text-white">{convToDelete.user1?.full_name}</strong> and{' '}
              <strong className="text-white">{convToDelete.user2?.full_name}</strong>.
            </p>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Comprehensive Media & DB Clean
              </p>
              <p className="text-rose-300/80">
                All messages ({convToDelete.total_messages || 'all'} messages) and all attached photos, videos, voice notes, and background images will be purged from the physical file storage.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConvToDelete(null)}
                disabled={deletingConv}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteConversation}
                disabled={deletingConv}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2 disabled:opacity-60"
              >
                {deletingConv && <RefreshCw className="w-4 h-4 animate-spin" />}
                Permanently Wipe All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Media Lightbox / Fullscreen Viewer */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center"
          >
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white bg-slate-800/80 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {previewMedia.type === 'video' ? (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-xl shadow-2xl border border-slate-700"
              />
            ) : (
              <img
                src={previewMedia.url}
                alt="Fullscreen Preview"
                className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl border border-slate-700"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
