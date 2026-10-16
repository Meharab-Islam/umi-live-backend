import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Zap,
  MessageSquare,
  Send,
  User,
  Users,
  Activity,
  Check,
  CheckCheck,
  Clock,
  RefreshCw,
  Trash2,
  Sliders,
  Radio,
  ArrowRight,
  Shield,
  Smartphone,
  Terminal,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { request, API_BASE, getCurrentUser } from '../api/client';

export default function RealtimeChatTester({ onToast }) {
  const currentAdmin = getCurrentUser() || { id: 1, full_name: 'System Admin', role: 'superadmin' };

  // Mode: 'mobile_chat' (Direct chat with mobile app) | 'dual_sandbox' (Simulate A & B)
  const [activeMode, setActiveMode] = useState('mobile_chat');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Selected Mobile Partner
  const [selectedMobileUser, setSelectedMobileUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [mobileChatMessages, setMobileChatMessages] = useState([]);
  const [mobileChatInput, setMobileChatInput] = useState('');
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [mobileUserTyping, setMobileUserTyping] = useState(false);

  // Admin Socket Connection
  const [adminSocket, setAdminSocket] = useState(null);
  const [adminSocketStatus, setAdminSocketStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected' | 'error'
  const [adminToken, setAdminToken] = useState(null);

  // Dual Simulator State (Client A & B)
  const [userA, setUserA] = useState(null);
  const [socketA, setSocketA] = useState(null);
  const [statusA, setStatusA] = useState('disconnected');
  const [messagesA, setMessagesA] = useState([]);
  const [inputA, setInputA] = useState('');
  const [peerTypingA, setPeerTypingA] = useState(false);

  const [userB, setUserB] = useState(null);
  const [socketB, setSocketB] = useState(null);
  const [statusB, setStatusB] = useState('disconnected');
  const [messagesB, setMessagesB] = useState([]);
  const [inputB, setInputB] = useState('');
  const [peerTypingB, setPeerTypingB] = useState(false);

  // Live Socket Event Logs
  const [eventLogs, setEventLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('all');
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);
  const [serverPing, setServerPing] = useState(null);
  const [pinging, setPinging] = useState(false);

  const logsEndRef = useRef(null);
  const mobileChatEndRef = useRef(null);
  const chatAEndRef = useRef(null);
  const chatBEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const adminTypingTimeoutRef = useRef(null);

  const socketBaseUrl = API_BASE.replace(/\/api\/?$/, '');

  // Log Socket events
  const logEvent = (direction, event, payload, clientLabel = 'Admin') => {
    const newLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      direction, // 'IN' | 'OUT' | 'SYS'
      event,
      payload,
      clientLabel,
    };
    setEventLogs((prev) => [newLog, ...prev.slice(0, 199)]);
  };

  // 1. Initial Load: Fetch users & tokens
  const fetchUsers = async (query = '') => {
    setIsSearching(true);
    try {
      const url = query ? `/admin/chat-tester/users?search=${encodeURIComponent(query)}` : '/admin/chat-tester/users';
      const res = await request(url);
      if (res.success && res.users) {
        setSearchResults(res.users);
        if (!query) {
          setAllUsers(res.users);
          // Set Admin token
          const adminUser = res.users.find((u) => u.id === currentAdmin.id) || res.users[0];
          if (adminUser?.token) setAdminToken(adminUser.token);

          // Select default mobile partner (e.g. user 2 or next available)
          if (!selectedMobileUser) {
            const partner = res.users.find((u) => u.id !== (adminUser?.id || 1)) || res.users[0];
            if (partner) setSelectedMobileUser(partner);
          }

          if (!userA) setUserA(adminUser || res.users[0]);
          if (!userB) setUserB(res.users[1] || res.users[0]);
        }
      }
    } catch (err) {
      console.error('fetchUsers error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Debounced search on input change
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchUsers(val.trim());
    }, 300);
  };

  // 2. Load Conversation History when selectedMobileUser changes
  const loadConversationHistory = async (partnerId) => {
    if (!partnerId) return;
    setLoadingConversation(true);
    try {
      const res = await request(`/admin/chat-tester/conversation?user_id=${partnerId}`);
      if (res.success) {
        setConversationId(res.conversation?.id || null);
        setMobileChatMessages(res.messages || []);
      }
    } catch (err) {
      console.error('loadConversationHistory error:', err);
      onToast?.('Failed to load past messages', 'error');
    } finally {
      setLoadingConversation(false);
    }
  };

  useEffect(() => {
    if (selectedMobileUser?.id) {
      loadConversationHistory(selectedMobileUser.id);
    }
  }, [selectedMobileUser?.id]);

  // 3. Connect Admin Socket (for Mobile Chat mode)
  useEffect(() => {
    if (!adminToken) return;

    setAdminSocketStatus('connecting');
    const s = io(socketBaseUrl, {
      auth: { token: adminToken, userId: currentAdmin.id },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    s.on('connect', () => {
      setAdminSocketStatus('connected');
      logEvent('SYS', 'connect', { socketId: s.id, userId: currentAdmin.id }, 'Admin');
      s.emit('chat:join', { userId: currentAdmin.id, token: adminToken });
    });

    s.on('disconnect', (reason) => {
      setAdminSocketStatus('disconnected');
      logEvent('SYS', 'disconnect', { reason }, 'Admin');
    });

    s.on('connect_error', (err) => {
      setAdminSocketStatus('error');
      logEvent('SYS', 'connect_error', { message: err.message }, 'Admin');
    });

    // Real-Time incoming messages from mobile app
    s.on('chat:new_message', (payload) => {
      logEvent('IN', 'chat:new_message', payload, 'Admin');
      const msg = payload.message || payload;
      if (msg) {
        setMobileChatMessages((prev) => {
          if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (payload.conversation_id) setConversationId(payload.conversation_id);

        // Auto mark as read if received from selected mobile partner
        if (selectedMobileUser && msg.sender_id === selectedMobileUser.id) {
          s.emit('chat:mark_read', {
            conversationId: payload.conversation_id || msg.conversation_id,
            senderId: msg.sender_id,
          });
        }
      }
    });

    // Real-Time typing from mobile user
    s.on('chat:user_typing', (data) => {
      logEvent('IN', 'chat:user_typing', data, 'Admin');
      if (selectedMobileUser && data.sender_id === selectedMobileUser.id) {
        setMobileUserTyping(data.is_typing === true);
      }
    });

    // Read receipt notification from mobile app
    s.on('chat:messages_read', (data) => {
      logEvent('IN', 'chat:messages_read', data, 'Admin');
      setMobileChatMessages((prev) =>
        prev.map((m) => (m.sender_id === currentAdmin.id ? { ...m, is_read: 1 } : m))
      );
    });

    // Inbox conversation sync
    s.on('chat:conversation_update', (data) => {
      logEvent('IN', 'chat:conversation_update', data, 'Admin');
    });

    setAdminSocket(s);

    return () => {
      s.disconnect();
    };
  }, [adminToken, currentAdmin.id, selectedMobileUser?.id]);

  // Auto-scroll chat and logs
  useEffect(() => {
    mobileChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mobileChatMessages, mobileUserTyping]);

  useEffect(() => {
    if (autoScrollLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [eventLogs, autoScrollLogs]);

  // Ping Latency
  const testPing = () => {
    const s = activeMode === 'mobile_chat' ? adminSocket : socketA;
    if (!s || !s.connected) {
      onToast?.('Socket is not connected', 'info');
      return;
    }
    setPinging(true);
    const start = performance.now();
    s.emit('ping', () => {
      const latency = Math.round(performance.now() - start);
      setServerPing(latency);
      setPinging(false);
      logEvent('SYS', 'ping_pong_ack', { latencyMs: latency });
    });
    setTimeout(() => {
      if (pinging) {
        setServerPing(Math.round(performance.now() - start));
        setPinging(false);
      }
    }, 250);
  };

  // Send message to mobile app user
  const sendMobileMessage = (textOverride = null) => {
    const text = (textOverride || mobileChatInput).trim();
    if (!text || !adminSocket || !selectedMobileUser) return;
    if (!textOverride) setMobileChatInput('');

    // Stop typing
    adminSocket.emit('chat:typing', {
      receiverId: selectedMobileUser.id,
      conversationId,
      isTyping: false,
    });

    const payload = {
      receiverId: selectedMobileUser.id,
      message: text,
      type: 'text',
      conversationId: conversationId || undefined,
    };

    logEvent('OUT', 'chat:send_message', payload, 'Admin');

    adminSocket.emit('chat:send_message', payload, (ack) => {
      logEvent('IN', 'chat:send_message (Ack)', ack, 'Admin');
      if (ack?.success && ack.message) {
        setMobileChatMessages((prev) => {
          if (prev.some((m) => m.id === ack.message.id)) return prev;
          return [...prev, ack.message];
        });
        if (ack.message.conversation_id) setConversationId(ack.message.conversation_id);
      }
    });
  };

  // Typing handler for Admin
  const handleMobileInputChange = (val) => {
    setMobileChatInput(val);
    if (!adminSocket || !selectedMobileUser) return;

    adminSocket.emit('chat:typing', {
      receiverId: selectedMobileUser.id,
      conversationId,
      isTyping: true,
    });

    if (adminTypingTimeoutRef.current) clearTimeout(adminTypingTimeoutRef.current);
    adminTypingTimeoutRef.current = setTimeout(() => {
      adminSocket.emit('chat:typing', {
        receiverId: selectedMobileUser.id,
        conversationId,
        isTyping: false,
      });
    }, 1500);
  };

  // Quick message presets
  const quickMessages = [
    'Hello! How are you? 👋',
    'Are you connected from the mobile app? 📱',
    'Voice/Video call test 🎙️',
    'Real-time socket test message ⚡',
  ];

  // Filtered Event Logs
  const filteredLogs = eventLogs.filter((log) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'messages') return log.event.includes('message');
    if (logFilter === 'typing') return log.event.includes('typing');
    if (logFilter === 'read') return log.event.includes('read');
    if (logFilter === 'system') return log.direction === 'SYS';
    return true;
  });

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-in-out', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header Card */}
      <div
        className="panel-card"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(2, 132, 199, 0.06) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          borderLeft: '6px solid #7c3aed',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div
                style={{
                  padding: '7px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #0284c7 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                }}
              >
                <Smartphone size={20} />
              </div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                Mobile App Real-Time Chat & Socket Tester
              </h1>
              <span className="badge badge-primary" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                {adminSocketStatus === 'connected' ? '🟢 WS Online' : '🔴 WS Offline'}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>
              যেকোনো ইউজারকে নাম বা আইডি দিয়ে সার্চ করুন, সিলেক্ট করে মোবাইল অ্যাপের সাথে সরাসরি রিয়েল-টাইম চ্যাট ও সকেট ইভেন্ট পরীক্ষা করুন।
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Mode Switcher */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-secondary)',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveMode('mobile_chat')}
                className={`btn btn-sm ${activeMode === 'mobile_chat' ? 'btn-primary' : ''}`}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Smartphone size={14} />
                <span>Chat with Mobile App</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('dual_sandbox')}
                className={`btn btn-sm ${activeMode === 'dual_sandbox' ? 'btn-primary' : ''}`}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Users size={14} />
                <span>Dual Simulator (A ➔ B)</span>
              </button>
            </div>

            {/* Ping Button */}
            <button
              type="button"
              onClick={testPing}
              className="btn btn-secondary btn-sm"
              disabled={pinging}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
            >
              <Activity size={14} color="#0284c7" />
              <span>{serverPing ? `${serverPing}ms` : 'Ping'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODE 1: CHAT DIRECTLY WITH MOBILE APP USER */}
      {/* ===================================================================== */}
      {activeMode === 'mobile_chat' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Left Column: Search & User Selector */}
          <div
            className="panel-card"
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              maxHeight: '620px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                Search & Select Mobile User
              </span>
              <span className="badge" style={{ fontSize: '0.72rem' }}>
                {searchResults.length} Users
              </span>
            </div>

            {/* Search Input Bar */}
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                color="var(--text-dim)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="input-field"
                placeholder="Search by Name, Email, or ID..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ borderRadius: '10px', paddingLeft: '36px', fontSize: '0.84rem' }}
              />
            </div>

            {/* Users List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                paddingRight: '4px',
              }}
            >
              {isSearching ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                  Searching users...
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                  No users found for "{searchQuery}".
                </div>
              ) : (
                searchResults.map((u) => {
                  const isSelected = selectedMobileUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedMobileUser(u)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(124, 58, 237, 0.12)' : 'var(--bg-secondary)',
                        border: isSelected ? '1px solid #7c3aed' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: '#7c3aed22',
                            color: '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.86rem',
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}
                        >
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            u.full_name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.full_name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', gap: '6px' }}>
                            <span>ID: #{u.id}</span>
                            <span>•</span>
                            <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 6px #7c3aed' }} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Live Chat Window with Mobile User */}
          <div
            className="panel-card"
            style={{
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: '620px',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Chat Header */}
            <div
              style={{
                padding: '14px 18px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #0284c7 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    overflow: 'hidden',
                  }}
                >
                  {selectedMobileUser?.avatar_url ? (
                    <img src={selectedMobileUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    selectedMobileUser?.full_name?.charAt(0) || 'M'
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                      {selectedMobileUser?.full_name || 'Select a user'}
                    </span>
                    <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                      ID #{selectedMobileUser?.id}
                    </span>
                    <span className="badge" style={{ fontSize: '0.7rem', background: '#0284c722', color: '#0284c7' }}>
                      {selectedMobileUser?.role}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                    <span>Socket Channel: <code>user_{selectedMobileUser?.id}</code></span>
                    {conversationId && <span>• Conv ID: #{conversationId}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => selectedMobileUser?.id && loadConversationHistory(selectedMobileUser.id)}
                  className="btn btn-secondary btn-sm"
                  title="Reload conversation history"
                  style={{ borderRadius: '8px', padding: '6px 10px' }}
                >
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Quick Messages Bar */}
            <div
              style={{
                padding: '8px 16px',
                background: 'rgba(124, 58, 237, 0.04)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} />
                Quick Send:
              </span>
              {quickMessages.map((text, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMobileMessage(text)}
                  className="btn btn-sm"
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                >
                  {text}
                </button>
              ))}
            </div>

            {/* Chat Messages Body */}
            <div
              style={{
                flex: 1,
                padding: '18px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: 'rgba(0,0,0,0.03)',
              }}
            >
              {loadingConversation ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-dim)', fontSize: '0.86rem' }}>
                  Loading conversation history...
                </div>
              ) : mobileChatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-dim)', fontSize: '0.88rem' }}>
                  <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>No messages yet with {selectedMobileUser?.full_name}.</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>
                    Type a message below or send from your Flutter mobile app to test real-time delivery!
                  </p>
                </div>
              ) : (
                mobileChatMessages.map((msg, idx) => {
                  const isMine = msg.sender_id === currentAdmin.id;
                  return (
                    <div
                      key={msg.id || idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMine ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '75%',
                          padding: '10px 14px',
                          borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                          background: isMine
                            ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                            : 'var(--bg-secondary)',
                          color: isMine ? '#fff' : 'var(--text-main)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          border: isMine ? 'none' : '1px solid var(--border-color)',
                        }}
                      >
                        <div style={{ fontSize: '0.9rem', wordBreak: 'break-word', lineHeight: 1.45 }}>
                          {msg.message}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '4px',
                            marginTop: '4px',
                            fontSize: '0.68rem',
                            color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-dim)',
                          }}
                        >
                          <span>
                            {msg.created_at
                              ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                              : 'Now'}
                          </span>
                          {isMine && (
                            <span>
                              {msg.is_read ? (
                                <CheckCheck size={14} color="#38bdf8" title="Read by Mobile User (Double blue check)" />
                              ) : (
                                <Check size={14} title="Delivered to Socket" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Mobile User Typing Indicator */}
              {mobileUserTyping && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7c3aed', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  <span className="pulsing-dot" style={{ background: '#7c3aed' }} />
                  <span>{selectedMobileUser?.full_name} is typing on mobile...</span>
                </div>
              )}

              <div ref={mobileChatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div
              style={{
                padding: '14px',
                background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '10px',
              }}
            >
              <input
                type="text"
                className="input-field"
                placeholder={`Type a message to ${selectedMobileUser?.full_name || 'mobile user'}...`}
                value={mobileChatInput}
                onChange={(e) => handleMobileInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMobileMessage();
                  }
                }}
                style={{ borderRadius: '10px', fontSize: '0.9rem' }}
              />
              <button
                type="button"
                onClick={() => sendMobileMessage()}
                className="btn btn-primary"
                style={{
                  borderRadius: '10px',
                  padding: '0 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                }}
              >
                <Send size={16} />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODE 2: DUAL SIMULATOR SANDBOX (A ➔ B) */}
      {/* ===================================================================== */}
      {activeMode === 'dual_sandbox' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {/* Client A */}
          <div className="panel-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800 }}>Client A: {userA?.full_name}</span>
              <select
                className="input-field"
                value={userA?.id || ''}
                onChange={(e) => {
                  const s = allUsers.find((u) => u.id === Number(e.target.value));
                  if (s) {
                    setUserA(s);
                    setMessagesA([]);
                  }
                }}
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.78rem' }}
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    #{u.id} {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ height: '320px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messagesA.map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.sender_id === userA?.id ? 'flex-end' : 'flex-start', background: msg.sender_id === userA?.id ? '#7c3aed' : 'var(--bg-secondary)', color: msg.sender_id === userA?.id ? '#fff' : 'inherit', padding: '8px 12px', borderRadius: '10px' }}>
                  {msg.message}
                </div>
              ))}
            </div>
            <div style={{ padding: '10px', background: 'var(--bg-secondary)', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Send to Client B..."
                value={inputA}
                onChange={(e) => setInputA(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMobileMessage()}
              />
              <button type="button" onClick={() => sendMobileMessage()} className="btn btn-primary">
                Send
              </button>
            </div>
          </div>

          {/* Client B */}
          <div className="panel-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800 }}>Client B: {userB?.full_name}</span>
              <select
                className="input-field"
                value={userB?.id || ''}
                onChange={(e) => {
                  const s = allUsers.find((u) => u.id === Number(e.target.value));
                  if (s) {
                    setUserB(s);
                    setMessagesB([]);
                  }
                }}
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.78rem' }}
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    #{u.id} {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ height: '320px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messagesB.map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.sender_id === userB?.id ? 'flex-end' : 'flex-start', background: msg.sender_id === userB?.id ? '#0284c7' : 'var(--bg-secondary)', color: msg.sender_id === userB?.id ? '#fff' : 'inherit', padding: '8px 12px', borderRadius: '10px' }}>
                  {msg.message}
                </div>
              ))}
            </div>
            <div style={{ padding: '10px', background: 'var(--bg-secondary)', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Send to Client A..."
                value={inputB}
                onChange={(e) => setInputB(e.target.value)}
              />
              <button type="button" className="btn btn-primary" style={{ background: '#0284c7' }}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

