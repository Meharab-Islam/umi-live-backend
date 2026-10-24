import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  Radio,
  Coins,
  Gem,
  Award,
  Crown,
  Star,
  Calendar,
  Building2,
  Ban,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Edit,
  Flame,
  CreditCard,
  History,
  Activity,
  User,
  MessageSquare,
  FileText,
  Package,
  Heart,
  MessageCircle,
  Trash2,
  Clock,
  Sparkles,
  ChevronRight,
  Send,
  AtSign,
  Upload,
  Camera,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import userApi from '../api/userApi';
import Loader from './Loader';
import { useEconomy } from '../context/EconomyContext';

const MODERATOR_POWER_LABELS = {
  silent_room_entry: 'Silent Room Entry (No join notification)',
  bypass_private_password: 'Join Password-Protected & Private Rooms',
  kick_room_user: 'Kick Disruptive Users from Room',
  manage_seat_requests: 'Accept / Reject Audio/Video Guest Seats',
  remove_cohost_seat: 'Demote / Remove Co-Hosts from Seat',
  close_room: 'Terminate / Force Close Live Room',
  audit_agencies: 'Audit Agency Records & Rosters',
  manage_agency_hosts: 'Approve / Reject Agency Requested Hosts',
  remove_hosts: 'Dismiss Hosts from Agency / Room',
  ban_hosts: 'Enforce Timed Bans & Penalties',
};

export default function UserDetailsModal({
  userId,
  initialUser,
  onClose,
  onUserUpdated,
  onToast,
}) {
  const { isDiamondMode } = useEconomy();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'posts' | 'chats' | 'packages' | 'powers' | 'financials' | 'deduct'

  // Deduction State (Deductions only - positive number input turned into negative delta)
  const [deductCoins, setDeductCoins] = useState('');
  const [deductDiamonds, setDeductDiamonds] = useState('');
  const [balanceReason, setBalanceReason] = useState('Admin balance deduction');
  const [actionPassword, setActionPassword] = useState('');
  const [showActionPassword, setShowActionPassword] = useState(false);
  const [submittingDeduction, setSubmittingDeduction] = useState(false);

  // Edit Profile State (NO role, NO level, NO package; avatar picked from device)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState(initialUser?.full_name || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(initialUser?.avatar_url || '');
  const [editBio, setEditBio] = useState(initialUser?.bio || '');
  const [submittingProfile, setSubmittingProfile] = useState(false);

  const fileInputRef = useRef(null);

  // Chats & Chat Details State
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const res = await userApi.getUserDetails(userId);
      if (res.success) {
        setDetails(res);
        setEditFullName(res.user.full_name || '');
        setEditAvatarUrl(res.user.avatar_url || '');
        setEditBio(res.user.bio || '');

        // If currently on chats tab or no chat selected yet, auto-select first chat
        if (res.chats && res.chats.length > 0 && !selectedChat) {
          handleSelectChat(res.chats[0]);
        }
      } else {
        onToast(res.message || 'Failed to load user details.', 'error');
      }
    } catch (err) {
      onToast(err.message || 'Error fetching user details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    } else {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!userId && !initialUser) {
    return null;
  }

  const user = details?.user || initialUser;

  // Handle Image Pick from Device
  const handleDeviceImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onToast('Selected image exceeds 5MB limit. Please choose a smaller file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditAvatarUrl(reader.result);
      onToast('Photo selected from device!', 'info');
    };
    reader.onerror = () => {
      onToast('Failed to read image file from device.', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Select a Chat to inspect its full messages
  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    try {
      setLoadingMessages(true);
      const res = await userApi.getConversationMessages(user.id, chat.id);
      if (res.success) {
        setChatMessages(res.messages || []);
      } else {
        onToast(res.message || 'Failed to load conversation messages.', 'error');
      }
    } catch (err) {
      onToast(err.message || 'Error loading chat messages.', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Delete User Post
  const handleDeletePost = async (postId) => {
    if (!window.confirm(`Are you sure you want to delete Post #${postId}?`)) return;
    try {
      const res = await userApi.deleteUserPost(postId);
      if (res.success) {
        onToast(`Post #${postId} deleted successfully.`, 'success');
        fetchUserDetails();
      }
    } catch (err) {
      onToast(err.message || 'Failed to delete post.', 'error');
    }
  };

  // Balance Deduction (ONLY Deduct Coins or Deduct Diamonds)
  const handleDeductBalance = async (e) => {
    e.preventDefault();
    const cDeduct = parseInt(deductCoins, 10) || 0;
    const dDeduct = parseInt(deductDiamonds, 10) || 0;

    if (cDeduct <= 0 && dDeduct <= 0) {
      onToast('Please enter an amount to deduct (Coins or Diamonds).', 'error');
      return;
    }

    if (cDeduct > Number(user.coins || 0)) {
      onToast(`Cannot deduct more coins than current balance (${Number(user.coins || 0).toLocaleString()}).`, 'error');
      return;
    }

    if (dDeduct > Number(user.diamonds || 0)) {
      onToast(`Cannot deduct more diamonds than current balance (${Number(user.diamonds || 0).toLocaleString()}).`, 'error');
      return;
    }

    if (!actionPassword.trim()) {
      onToast('Please enter your Admin Action Password to authorize deduction.', 'error');
      return;
    }

    try {
      setSubmittingDeduction(true);
      // Send as negative values (deductions only)
      const res = await userApi.adjustBalance(user.id, {
        coinDelta: -Math.abs(cDeduct),
        diamondDelta: -Math.abs(dDeduct),
        reason: balanceReason.trim() || 'Admin balance deduction',
        actionPassword: actionPassword.trim(),
      });
      if (res.success) {
        onToast(`User #${user.id} balance successfully deducted!`, 'success');
        setDeductCoins('');
        setDeductDiamonds('');
        setActionPassword('');
        fetchUserDetails();
        if (onUserUpdated) onUserUpdated();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSubmittingDeduction(false);
    }
  };

  // Update Profile (Full Name, Avatar from device, Bio only)
  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault();
    if (!editFullName.trim()) {
      onToast('Full Name cannot be empty.', 'error');
      return;
    }
    try {
      setSubmittingProfile(true);
      const res = await userApi.updateUser(user.id, {
        full_name: editFullName.trim(),
        avatar_url: editAvatarUrl || undefined,
        bio: editBio.trim(),
      });
      if (res.success) {
        onToast(`User #${user.id} profile updated successfully!`, 'success');
        setIsEditingProfile(false);
        fetchUserDetails();
        if (onUserUpdated) onUserUpdated();
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSubmittingProfile(false);
    }
  };

  // Toggle Ban Status
  const handleToggleBan = async () => {
    const willBan = !user.is_banned;
    if (!window.confirm(`Are you sure you want to ${willBan ? 'BAN' : 'UNBAN'} User #${user.id}?`)) return;

    try {
      const res = await userApi.updateUser(user.id, { is_banned: willBan });
      if (res.success) {
        onToast(`User #${user.id} is now ${willBan ? 'BANNED' : 'ACTIVE'}!`, willBan ? 'warning' : 'success');
        fetchUserDetails();
        if (onUserUpdated) onUserUpdated();
      }
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box user-details-modal"
        style={{
          maxWidth: '880px',
          width: '95%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '1.75rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Prominent User ID & Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: '1.15rem',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
              whiteSpace: 'nowrap',
            }}>
              User ID: #{user?.id}
            </span>

            <span className={`badge ${user?.role === 'admin' ? 'badge-primary' : user?.role === 'moderator' ? 'badge-primary' : user?.role === 'host' ? 'badge-warning' : 'badge-neutral'}`} style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 }}>
              {user?.role}
            </span>

            {user?.role === 'host' && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: user?.host_type === 'audio' ? 'rgba(2, 132, 199, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                color: user?.host_type === 'audio' ? '#0284c7' : '#ec4899',
                border: `1px solid ${user?.host_type === 'audio' ? 'rgba(2, 132, 199, 0.3)' : 'rgba(236, 72, 153, 0.3)'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                {user?.host_type === 'audio' ? '🎙️ Audio Host' : '📹 Video Host'}
              </span>
            )}

            {user?.is_banned ? (
              <span className="badge badge-danger">Banned</span>
            ) : (
              <span className="badge badge-success">Active</span>
            )}
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            title="Close Details"
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {loading && !details ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <Loader text={`Loading telemetry for User #${userId}...`} />
            <button
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{ marginTop: '1.25rem' }}
            >
              Cancel / Close
            </button>
          </div>
        ) : (
          <>
            {/* User Hero Profile Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(2, 132, 199, 0.05) 100%)',
              border: '1px solid var(--border-color)',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}>
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                alt={String(user.id)}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: user.is_banned ? '3px solid #f43f5e' : '3px solid #7c3aed',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />

              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>{user.full_name || `User #${user.id}`}</span>
                  <span className="badge badge-purple" style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    ID: #{user.id}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} /> Joined: {new Date(user.created_at).toLocaleDateString()}
                  </span>

                  {user.agency_name && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#6d28d9', fontWeight: 600 }}>
                      <Building2 size={13} /> Agency: {user.agency_name}
                    </span>
                  )}

                  {user.bio && (
                    <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                      "{user.bio}"
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Edit Profile & Ban/Unban */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${isEditingProfile ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  style={{ gap: '6px' }}
                >
                  <Edit size={14} />
                  <span>{isEditingProfile ? 'Close Edit' : 'Edit Profile'}</span>
                </button>

                <button
                  className={`btn ${user.is_banned ? 'btn-success' : 'btn-danger'} btn-sm`}
                  onClick={handleToggleBan}
                  style={{ alignSelf: 'center' }}
                >
                  <Ban size={15} />
                  <span>{user.is_banned ? 'Unban User' : 'Ban User'}</span>
                </button>
              </div>
            </div>

            {/* Edit Profile Form (Role, Level, Package Removed; Pick Photo from Device) */}
            {isEditingProfile && (
              <form
                onSubmit={handleUpdateProfile}
                className="panel-card"
                style={{
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  border: '1px solid rgba(124, 58, 237, 0.35)',
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.04) 0%, rgba(2, 132, 199, 0.04) 100%)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Edit size={18} color="#7c3aed" />
                    <span>Edit Profile: User #{user.id}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsEditingProfile(false)}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Cancel
                  </button>
                </div>

                {/* Device Photo Picker Section */}
                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={editAvatarUrl || user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                      alt="Avatar preview"
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #7c3aed',
                        boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Profile Photo (Pick from Device)
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '0.65rem' }}>
                      Choose an image file directly from your computer or phone (JPG, PNG, WebP)
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleDeviceImagePick}
                      />

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Upload size={14} color="#7c3aed" />
                        <span>Browse / Pick Photo from Device</span>
                      </button>

                      {editAvatarUrl && editAvatarUrl !== user.avatar_url && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#f43f5e', fontSize: '0.75rem' }}
                          onClick={() => setEditAvatarUrl(user.avatar_url || '')}
                        >
                          Reset to Original
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Full Name: *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. John Doe"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Bio / About Status:
                  </label>
                  <textarea
                    className="input-field"
                    rows={2}
                    placeholder="Short user biography or description..."
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsEditingProfile(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingProfile || !editFullName.trim()}
                  >
                    {submittingProfile ? <Loader inline small /> : <CheckCircle size={16} />}
                    <span>{submittingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Quick KPI Stat Cards (Level, Coins, Diamonds, Package, Posts, Chats) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.85rem',
              marginBottom: '1.5rem',
            }}>
              <div className="stat-card" style={{ padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>COINS (🪙)</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                  {Number(user.coins || 0).toLocaleString()}
                </div>
              </div>

              {isDiamondMode && (
                <div className="stat-card" style={{ padding: '0.85rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>DIAMONDS (💎)</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#06b6d4', marginTop: '2px' }}>
                    {Number(user.diamonds || 0).toLocaleString()}
                  </div>
                </div>
              )}

              <div className="stat-card" style={{ padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>LEVEL & STARS</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8b5cf6' }}>
                    Lv.{user.level || 1}
                  </span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#f59e0b',
                    background: 'rgba(245, 158, 11, 0.12)',
                    padding: '2px 7px',
                    borderRadius: '6px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}>
                    <Star size={13} fill="#f59e0b" color="#f59e0b" />
                    {Number(user.star || 0).toFixed(1)} ★
                  </span>
                </div>
              </div>

              <div className="stat-card" style={{ padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>VIP PACKAGE</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ec4899', marginTop: '6px' }}>
                  👑 {user.vip_package || 'Standard'}
                </div>
              </div>

              <div
                className="stat-card"
                style={{ padding: '0.85rem', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => setActiveTab('posts')}
                title="View user posts"
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>POSTS</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#3b82f6', marginTop: '2px' }}>
                  {details?.posts?.length || 0}
                </div>
              </div>

              <div
                className="stat-card"
                style={{ padding: '0.85rem', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => {
                  setActiveTab('chats');
                  if (!selectedChat && details?.chats?.length > 0) {
                    handleSelectChat(details.chats[0]);
                  }
                }}
                title="View user chats"
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>CHATS</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  {details?.chats?.length || 0}
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '4px' }}>
              <button
                className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('overview')}
                type="button"
              >
                Overview & Streams
              </button>

              <button
                className={`btn btn-sm ${activeTab === 'posts' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('posts')}
                type="button"
                style={{ gap: '6px' }}
              >
                <FileText size={14} />
                <span>Posts ({details?.posts?.length || 0})</span>
              </button>

              <button
                className={`btn btn-sm ${activeTab === 'chats' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setActiveTab('chats');
                  if (!selectedChat && details?.chats?.length > 0) {
                    handleSelectChat(details.chats[0]);
                  }
                }}
                type="button"
                style={{ gap: '6px' }}
              >
                <MessageCircle size={14} />
                <span>Chats ({details?.chats?.length || 0})</span>
              </button>

              <button
                className={`btn btn-sm ${activeTab === 'packages' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('packages')}
                type="button"
                style={{ gap: '6px' }}
              >
                <Package size={14} />
                <span>Packages & VIP</span>
              </button>

              <button
                className={`btn btn-sm ${activeTab === 'financials' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('financials')}
                type="button"
              >
                Financials & History
              </button>

              {details?.moderatorInfo && (
                <button
                  className={`btn btn-sm ${activeTab === 'powers' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('powers')}
                  type="button"
                >
                  <ShieldCheck size={14} />
                  <span>Moderator Powers</span>
                </button>
              )}

              {/* Deduct Balance Tab (Deductions only, NO Add options) */}
              <button
                className={`btn btn-sm ${activeTab === 'deduct' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setActiveTab('deduct')}
                type="button"
                style={{ gap: '6px' }}
              >
                <Coins size={14} />
                <span>Deduct Balance</span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW & STREAMS */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Host Live Broadcasting Telemetry */}
                <div className="panel-card" style={{ padding: '1.25rem', marginBottom: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Radio size={16} color="#f43f5e" />
                    <span>Live Broadcasting Telemetry</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '0.85rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Total Broadcasts Hosted</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {details?.streamStats?.total_streams || 0}
                      </div>
                    </div>

                    {isDiamondMode && (
                      <div style={{ padding: '0.85rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Total Diamonds Earned</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06b6d4' }}>
                          💎 {Number(details?.streamStats?.total_stream_diamonds || 0).toLocaleString()}
                        </div>
                      </div>
                    )}

                    <div style={{ padding: '0.85rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Peak Viewer Record</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e' }}>
                        👀 {details?.streamStats?.peak_viewers || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Identity & Bio */}
                <div className="panel-card" style={{ padding: '1.25rem', marginBottom: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                    Profile Details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Unique User ID:</span>{' '}
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>#{user.id}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Email:</span>{' '}
                      <strong>{user.email || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Role:</span>{' '}
                      <strong style={{ textTransform: 'capitalize' }}>{user.role}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Last Updated:</span>{' '}
                      <strong>{new Date(user.updated_at || user.created_at).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Bio:</span>{' '}
                      <em>{user.bio || 'No profile bio entered'}</em>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: POSTS */}
            {activeTab === 'posts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} color="#7c3aed" />
                    <span>User Posts & Moments ({details?.posts?.length || 0})</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Published content by User #{user.id}
                  </span>
                </div>

                {(!details?.posts || details.posts.length === 0) ? (
                  <div className="panel-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-dim)' }}>
                    <FileText size={40} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>No posts published yet</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>This user has not created or shared any community posts yet.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {details.posts.map((post) => (
                      <div
                        key={post.id}
                        className="panel-card"
                        style={{
                          padding: '1.15rem',
                          marginBottom: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div>
                          {/* Post Author / Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <img
                                src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                                alt=""
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                                  {user.full_name || `User #${user.id}`}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                  ID: #{user.id}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Clock size={11} /> {new Date(post.created_at).toLocaleDateString()}
                              </span>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDeletePost(post.id)}
                                title="Delete Post"
                                style={{ color: '#f43f5e', padding: '4px 6px', height: 'auto', borderRadius: '6px' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Post Content */}
                          <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.45, marginBottom: post.media_url ? '0.75rem' : 0 }}>
                            {post.content}
                          </p>

                          {/* Media Preview */}
                          {post.media_url && (
                            <div style={{ marginBottom: '0.75rem', borderRadius: '8px', overflow: 'hidden', maxHeight: '180px', background: '#0f172a' }}>
                              <img
                                src={post.media_url}
                                alt="Post media"
                                style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Engagement Metrics */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f43f5e', fontWeight: 600 }}>
                            <Heart size={13} fill="#f43f5e" /> {post.likes_count || 0} Likes
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0ea5e9', fontWeight: 600 }}>
                            <MessageSquare size={13} /> {post.comments_count || 0} Comments
                          </span>
                          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            Post #{post.id}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CHATS LIST & CHAT DETAILS */}
            {activeTab === 'chats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageCircle size={16} color="#7c3aed" />
                    <span>User Chats List & Chat Details</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Total {details?.chats?.length || 0} conversation threads
                  </span>
                </div>

                {(!details?.chats || details.chats.length === 0) ? (
                  <div className="panel-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-dim)' }}>
                    <MessageCircle size={40} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>No chat conversations found</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>This user has not exchanged any private chat messages yet.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 310px) 1fr', gap: '1rem', minHeight: '380px', maxHeight: '520px' }}>
                    {/* LEFT: Chats List */}
                    <div className="panel-card" style={{ padding: '0.75rem', marginBottom: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', padding: '4px 6px', letterSpacing: '0.5px' }}>
                        Chats List ({details.chats.length})
                      </div>

                      {details.chats.map((c) => {
                        const isSelected = selectedChat?.id === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => handleSelectChat(c)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(124, 58, 237, 0.14)' : 'transparent',
                              border: isSelected ? '1px solid rgba(124, 58, 237, 0.4)' : '1px solid transparent',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ position: 'relative' }}>
                              <img
                                src={c.other_avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.other_user_id}`}
                                alt=""
                                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              {c.unread_count > 0 && (
                                <span style={{
                                  position: 'absolute',
                                  top: '-2px',
                                  right: '-2px',
                                  background: '#f43f5e',
                                  color: '#fff',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  borderRadius: '10px',
                                  padding: '1px 5px',
                                }}>
                                  {c.unread_count}
                                </span>
                              )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                <span style={{ fontWeight: isSelected ? 700 : 600, fontSize: '0.82rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {c.other_full_name || `User #${c.other_user_id || c.id}`}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                                  {new Date(c.last_message_at || c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                <span className="badge badge-neutral" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>
                                  {c.other_role}
                                </span>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {c.last_message || 'Message'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* RIGHT: Chat Details (Messages Stream) */}
                    <div className="panel-card" style={{ padding: 0, marginBottom: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      {selectedChat ? (
                        <>
                          {/* Chat Header */}
                          <div style={{
                            padding: '0.85rem 1rem',
                            borderBottom: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={selectedChat.other_avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedChat.other_user_id}`}
                                alt=""
                                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{selectedChat.other_full_name || `User #${selectedChat.other_user_id}`}</span>
                                  <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>
                                    ID: #{selectedChat.other_user_id}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                  Role: {selectedChat.other_role} • Thread #{selectedChat.id}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Chat Messages Body */}
                          <div style={{
                            flex: 1,
                            padding: '1rem',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            background: 'rgba(0,0,0,0.02)',
                          }}>
                            {loadingMessages ? (
                              <div style={{ padding: '2rem', textAlign: 'center' }}>
                                <Loader text="Loading message details..." inline small />
                              </div>
                            ) : chatMessages.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                                No messages in this chat thread yet.
                              </div>
                            ) : (
                              chatMessages.map((msg) => {
                                const isFromUser = msg.sender_id === user.id;
                                return (
                                  <div
                                    key={msg.id}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: isFromUser ? 'flex-end' : 'flex-start',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', maxWidth: '80%', flexDirection: isFromUser ? 'row-reverse' : 'row' }}>
                                      <img
                                        src={msg.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender_id}`}
                                        alt=""
                                        style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                                      />

                                      <div
                                        style={{
                                          padding: '8px 12px',
                                          borderRadius: isFromUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                          background: isFromUser ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'var(--bg-secondary)',
                                          color: isFromUser ? '#ffffff' : 'var(--text-main)',
                                          border: isFromUser ? 'none' : '1px solid var(--border-color)',
                                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                          fontSize: '0.84rem',
                                          lineHeight: 1.4,
                                          wordBreak: 'break-word',
                                        }}
                                      >
                                        {msg.message}
                                      </div>
                                    </div>

                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '3px', padding: '0 30px' }}>
                                      {isFromUser ? 'Sent by User' : `From ${msg.sender_name || `User #${msg.sender_id}`}`} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-dim)' }}>
                          <MessageCircle size={36} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                          <div>Select a conversation from the left to view messages</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PACKAGES & VIP */}
            {activeTab === 'packages' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Active VIP Package Card */}
                <div className="panel-card" style={{
                  padding: '1.25rem',
                  marginBottom: 0,
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(236, 72, 153, 0.35)',
                      }}>
                        <Crown size={24} />
                      </div>
                      <div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          Active VIP Package: {user.vip_package || 'Standard'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                          Tier perks, special animations, and entrance status
                        </div>
                      </div>
                    </div>

                    <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                      Active Tier
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>EXP Level Status</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                        Lv.{user.level || 1}
                      </div>
                    </div>

                    <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Coin Bonus Multiplier</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>
                        {user.vip_package === 'Crown Royalty' ? '2.5x' : user.vip_package === 'Diamond VIP' ? '2.0x' : user.vip_package === 'Gold VIP' ? '1.5x' : user.vip_package === 'Silver VIP' ? '1.2x' : '1.0x'} Boost
                      </div>
                    </div>

                    <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Entrance Effect</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#8b5cf6', marginTop: '2px' }}>
                        {user.vip_package === 'Standard' ? 'Normal' : 'Exclusive VIP Luxury'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platform Coin Top-up Packages */}
                <div className="panel-card" style={{ padding: '1.25rem', marginBottom: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={16} color="#f59e0b" />
                    <span>Platform Coin Packages Catalog</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {(details?.coinPackages || []).map((pkg) => (
                      <div
                        key={pkg.id}
                        style={{
                          padding: '1rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-primary)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>{pkg.name}</span>
                            {pkg.badge && (
                              <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                {pkg.badge}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                            🪙 {Number(pkg.coins).toLocaleString()}
                          </div>

                          {pkg.bonus_coins > 0 && (
                            <div style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
                              +{pkg.bonus_coins} Bonus Coins Free
                            </div>
                          )}
                        </div>

                        <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Price</span>
                          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            ${parseFloat(pkg.price_usd).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: FINANCIALS & RECENT TRANSACTIONS */}
            {activeTab === 'financials' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="panel-card" style={{ padding: '1.25rem', marginBottom: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={16} color="#10b981" />
                    <span>Withdrawal Summary</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '0.85rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Total Payouts Withdrawn</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                        ${parseFloat(details?.withdrawalStats?.total_withdrawn_usd || 0).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ padding: '0.85rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Total Withdrawal Requests</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {details?.withdrawalStats?.total_withdrawals || 0}
                      </div>
                    </div>

                    <div style={{ padding: '0.85rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Pending Payout Requests</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: details?.withdrawalStats?.pending_withdrawals > 0 ? '#f59e0b' : 'var(--text-main)' }}>
                        {details?.withdrawalStats?.pending_withdrawals || 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="panel-card" style={{ padding: '1.25rem', marginBottom: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <History size={16} color="#8b5cf6" />
                    <span>Recent Financial Transactions</span>
                  </div>

                  {(!details?.recentTransactions || details.recentTransactions.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      No financial transactions recorded for this user.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {details.recentTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span className="badge badge-neutral" style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>
                              {tx.type?.replace('_', ' ')}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{tx.description || 'Transaction'}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: tx.amount >= 0 ? '#10b981' : '#f43f5e' }}>
                              {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              {new Date(tx.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: MODERATOR POWERS */}
            {activeTab === 'powers' && details?.moderatorInfo && (
              <div className="panel-card" style={{ padding: '1.25rem', marginBottom: 0 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={18} color="#7c3aed" />
                  <span>Assigned Moderator Powers & Controls</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                  Appointed on {new Date(details.moderatorInfo.created_at).toLocaleDateString()}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.65rem' }}>
                  {Object.entries(MODERATOR_POWER_LABELS).map(([key, label]) => {
                    const isGranted = !!details.moderatorInfo.permissions[key];
                    return (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          background: isGranted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(241, 245, 249, 0.6)',
                          border: isGranted ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-color)',
                        }}
                      >
                        {isGranted ? (
                          <CheckCircle size={16} color="#059669" />
                        ) : (
                          <X size={16} color="#94a3b8" />
                        )}
                        <span style={{ fontSize: '0.8rem', fontWeight: isGranted ? 600 : 400, color: isGranted ? 'var(--text-main)' : 'var(--text-dim)' }}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 7: DEDUCT BALANCE (Coin Deduct or Diamond Deduct ONLY) */}
            {activeTab === 'deduct' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <form onSubmit={handleDeductBalance} className="panel-card" style={{ padding: '1.25rem', marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Coins size={18} color="#ef4444" />
                      <span>Deduct Balance (Coins / Diamonds Only)</span>
                    </div>
                    <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>
                      Deduction Only
                    </span>
                  </div>

                  {/* Warning Notice */}
                  <div style={{
                    padding: '0.75rem 0.9rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    marginBottom: '1.25rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Strict Financial Policy:</strong> Adding coins{isDiamondMode ? ' or diamonds' : ''} is disabled here. To add coins, use the <strong>Coin Recharge</strong> page. From this page, only deductions down to 0 are authorized.
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    {/* Coin Deduction */}
                    <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Coins size={15} /> Deduct Coins (🪙)
                        </label>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                          Current: {Number(user.coins || 0).toLocaleString()} coins
                        </span>
                      </div>

                      <input
                        type="number"
                        min="0"
                        max={user.coins || 0}
                        className="input-field"
                        placeholder="Enter coins to deduct (e.g. 500)"
                        value={deductCoins}
                        onChange={(e) => setDeductCoins(e.target.value)}
                      />

                      {/* Quick preset chips */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {[100, 500, 1000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '2px 8px', height: 'auto' }}
                            onClick={() => setDeductCoins(Math.min(amt, Number(user.coins || 0)))}
                          >
                            -{amt}
                          </button>
                        ))}
                        {Number(user.coins || 0) > 0 && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '2px 8px', height: 'auto', color: '#ef4444' }}
                            onClick={() => setDeductCoins(Number(user.coins || 0))}
                          >
                            Deduct All
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Diamond Deduction */}
                    {isDiamondMode && (
                      <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Gem size={15} /> Deduct Diamonds (💎)
                          </label>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                            Current: {Number(user.diamonds || 0).toLocaleString()} diamonds
                          </span>
                        </div>

                        <input
                          type="number"
                          min="0"
                          max={user.diamonds || 0}
                          className="input-field"
                          placeholder="Enter diamonds to deduct (e.g. 1000)"
                          value={deductDiamonds}
                          onChange={(e) => setDeductDiamonds(e.target.value)}
                        />

                        {/* Quick preset chips */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {[500, 1000, 5000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.7rem', padding: '2px 8px', height: 'auto' }}
                              onClick={() => setDeductDiamonds(Math.min(amt, Number(user.diamonds || 0)))}
                            >
                              -{amt}
                            </button>
                          ))}
                          {Number(user.diamonds || 0) > 0 && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.7rem', padding: '2px 8px', height: 'auto', color: '#ef4444' }}
                              onClick={() => setDeductDiamonds(Number(user.diamonds || 0))}
                            >
                              Deduct All to 0
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    {/* Reason */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Reason for Deduction / Audit Log *
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Violation penalty, fraudulent gift clawback..."
                        value={balanceReason}
                        onChange={(e) => setBalanceReason(e.target.value)}
                        required
                      />
                    </div>

                    {/* Action Password */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#7c3aed' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={13} /> Admin Action Password *
                        </span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showActionPassword ? 'text' : 'password'}
                          className="input-field"
                          placeholder="Enter security password to authorize"
                          value={actionPassword}
                          onChange={(e) => setActionPassword(e.target.value)}
                          required
                          style={{ paddingRight: '36px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowActionPassword(!showActionPassword)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {showActionPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="submit"
                      className="btn btn-danger"
                      disabled={submittingDeduction || (!deductCoins && !deductDiamonds)}
                      style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}
                    >
                      {submittingDeduction ? <Loader inline small /> : <Coins size={16} />}
                      <span>{submittingDeduction ? 'Processing Deduction...' : 'Confirm Balance Deduction'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
