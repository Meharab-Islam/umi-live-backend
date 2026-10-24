import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Database,
  Shield,
  Server,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Key,
  Gem,
  Coins,
  Percent,
  ArrowRightLeft,
  Sparkles,
  CheckCircle2,
  Video,
  Mic,
  Sliders,
  Calculator,
  DollarSign,
  Image as ImageIcon,
  Plus,
  Trash2,
  Calendar,
  Copy,
  Wifi,
  Check,
  AlertTriangle,
  Layers,
  TrendingUp,
  Activity,
  Zap,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Cast,
  UserCheck,
  Users,
  Fingerprint,
  VideoOff,
  X,
  Gift,
} from 'lucide-react';
import settingsApi from '../api/settingsApi';
import Loader from '../components/Loader';

export default function Settings({ onToast }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('economy');
  const [showActionPassword, setShowActionPassword] = useState(false);
  const [showLivekitSecret, setShowLivekitSecret] = useState(false);
  const [savingLivekit, setSavingLivekit] = useState(false);
  const [savingEconomy, setSavingEconomy] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savingSystem, setSavingSystem] = useState(false);
  const [savingGracePeriod, setSavingGracePeriod] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [savingCalls, setSavingCalls] = useState(false);
  const [callLogs, setCallLogs] = useState([]);
  const [loadingCallLogs, setLoadingCallLogs] = useState(false);
  const [simCallType, setSimCallType] = useState('video');
  const [simCallMinutes, setSimCallMinutes] = useState(5);
  const [savingScreenGuard, setSavingScreenGuard] = useState(false);
  const [newWithdrawalPreset, setNewWithdrawalPreset] = useState('');
  const [newRechargePreset, setNewRechargePreset] = useState('');

  const parsePresetsList = (raw, fallback = []) => {
    if (Array.isArray(raw)) return raw;
    if (!raw) return fallback;
    try {
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('[')) {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed.map(Number).filter((n) => !isNaN(n));
        }
        return trimmed.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      }
      return fallback;
    } catch (e) {
      return fallback;
    }
  };

  const handleAddWithdrawalPreset = () => {
    const num = parseInt(newWithdrawalPreset, 10);
    if (isNaN(num) || num <= 0) return;
    const current = parsePresetsList(settings.withdrawal_presets, [1000, 2000, 5000, 10000, 25000, 50000]);
    if (!current.includes(num)) {
      const updated = [...current, num].sort((a, b) => a - b);
      handleChange('withdrawal_presets', JSON.stringify(updated));
    }
    setNewWithdrawalPreset('');
  };

  const handleRemoveWithdrawalPreset = (numToRemove) => {
    const current = parsePresetsList(settings.withdrawal_presets, [1000, 2000, 5000, 10000, 25000, 50000]);
    const updated = current.filter((n) => n !== numToRemove);
    handleChange('withdrawal_presets', JSON.stringify(updated));
  };

  const handleResetWithdrawalPresets = () => {
    handleChange('withdrawal_presets', JSON.stringify([1000, 2000, 5000, 10000, 25000, 50000]));
  };

  const handleAddRechargePreset = () => {
    const num = parseInt(newRechargePreset, 10);
    if (isNaN(num) || num <= 0) return;
    const current = parsePresetsList(settings.recharge_presets, [500, 1000, 2500, 5000, 10000, 50000, 100000]);
    if (!current.includes(num)) {
      const updated = [...current, num].sort((a, b) => a - b);
      handleChange('recharge_presets', JSON.stringify(updated));
    }
    setNewRechargePreset('');
  };

  const handleRemoveRechargePreset = (numToRemove) => {
    const current = parsePresetsList(settings.recharge_presets, [500, 1000, 2500, 5000, 10000, 50000, 100000]);
    const updated = current.filter((n) => n !== numToRemove);
    handleChange('recharge_presets', JSON.stringify(updated));
  };

  const handleResetRechargePresets = () => {
    handleChange('recharge_presets', JSON.stringify([500, 1000, 2500, 5000, 10000, 50000, 100000]));
  };
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    type: null,
    title: '',
    description: '',
    actionPassword: '',
    includeAdmins: false,
    loading: false,
  });

  const handleOpenResetModal = (type) => {
    let title = '';
    let description = '';
    if (type === 'coins') {
      title = "Reset All Users' Coins to 0";
      description = "This will immediately set the coin balance to 0 for all regular users across the entire system. User diamond balances will NOT be affected. Redis user and wallet caches will be flushed immediately.";
    } else if (type === 'diamonds') {
      title = "Reset All Users' Diamonds to 0";
      description = "This will immediately set the diamond balance to 0 for all regular users across the entire system. User coin balances will NOT be affected. Redis user and wallet caches will be flushed immediately.";
    } else if (type === 'all') {
      title = "Reset ALL Users' Wallets (Coins & Diamonds) to 0";
      description = "DANGER: This will immediately set BOTH coins and diamonds to 0 for all regular users in the entire system. Redis user, wallet, and leaderboard caches will be flushed immediately.";
    }
    setResetModal({
      isOpen: true,
      type,
      title,
      description,
      actionPassword: '',
      includeAdmins: false,
      loading: false,
    });
  };

  const handleExecuteReset = async () => {
    if (!resetModal.actionPassword) {
      onToast('Please enter your admin action security password', 'error');
      return;
    }
    try {
      setResetModal((prev) => ({ ...prev, loading: true }));
      let res;
      if (resetModal.type === 'coins') {
        res = await settingsApi.resetAllCoins(resetModal.actionPassword, resetModal.includeAdmins);
      } else if (resetModal.type === 'diamonds') {
        res = await settingsApi.resetAllDiamonds(resetModal.actionPassword, resetModal.includeAdmins);
      } else if (resetModal.type === 'all') {
        res = await settingsApi.resetAllBalances(resetModal.actionPassword, resetModal.includeAdmins);
      }
      onToast(res.message || 'System wallet reset completed successfully!', 'success');
      setResetModal({
        isOpen: false,
        type: null,
        title: '',
        description: '',
        actionPassword: '',
        includeAdmins: false,
        loading: false,
      });
    } catch (err) {
      onToast(err.message || 'Failed to execute system wallet reset', 'error');
      setResetModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleSaveCalls = async () => {
    try {
      setSavingCalls(true);
      await Promise.all([
        settingsApi.updateSetting('call_audio_rate_per_minute', settings.call_audio_rate_per_minute || '20', 'Default coin cost per minute for 1-on-1 audio call in direct messages'),
        settingsApi.updateSetting('call_video_rate_per_minute', settings.call_video_rate_per_minute || '50', 'Default coin cost per minute for 1-on-1 video call in direct messages'),
        settingsApi.updateSetting('call_video_live_rate_per_minute', settings.call_video_live_rate_per_minute || '30', 'Coin cost per minute for Video Live seat interaction or private call'),
        settingsApi.updateSetting('call_min_balance_to_start', settings.call_min_balance_to_start || '20', 'Minimum coin balance required for caller to initiate call'),
        settingsApi.updateSetting('call_receiver_earnings_percent', settings.call_receiver_earnings_percent || '70', 'Percentage of call coins awarded to call receiver as diamonds'),
        settingsApi.updateSetting('call_is_enabled', settings.call_is_enabled || 'true', 'Master switch to enable or disable 1-on-1 calls'),
      ]);
      onToast('1-to-1 Audio & Video Call rates & settings updated successfully!', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSavingCalls(false);
    }
  };

  const handleSaveScreenGuard = async () => {
    try {
      setSavingScreenGuard(true);
      const keys = [
        'app_screen_guard_enabled',
        'live_screen_guard_enabled',
        'live_screen_record_enabled',
        'live_screen_share_enabled',
        'live_screen_share_roles',
        'screen_guard_allow_host',
        'screen_guard_allow_moderator',
        'screen_guard_allow_agency',
        'screen_guard_allow_general_users',
        'screen_guard_watermark_enabled',
      ];
      await Promise.all(
        keys.map((k) =>
          settingsApi.updateSetting(k, settings[k] !== undefined ? String(settings[k]) : 'true', '')
        )
      );
      onToast('Screen Guard & Privacy settings saved and pushed to all live sessions!', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSavingScreenGuard(false);
    }
  };

  const fetchCallLogs = async () => {
    try {
      setLoadingCallLogs(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/call-logs?limit=15', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success && data.calls) {
        setCallLogs(data.calls);
      }
    } catch (err) {
      console.warn('fetchCallLogs warning:', err);
    } finally {
      setLoadingCallLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'calls') {
      fetchCallLogs();
    }
  }, [activeTab]);

  const handleSaveGracePeriod = async () => {
    try {
      setSavingGracePeriod(true);
      const hostSec = Math.max(5, parseInt(settings.host_disconnect_grace_period_seconds, 10) || 90);
      const guestSec = Math.max(5, parseInt(settings.guest_seat_disconnect_grace_period_seconds, 10) || 60);

      await Promise.all([
        settingsApi.updateSetting(
          'host_disconnect_grace_period_seconds',
          String(hostSec),
          'Host reconnection grace period in seconds before terminating room'
        ),
        settingsApi.updateSetting(
          'guest_seat_disconnect_grace_period_seconds',
          String(guestSec),
          'Seated guest/co-host reconnection grace period in seconds before removing from seat'
        ),
      ]);
      setSettings((prev) => ({
        ...prev,
        host_disconnect_grace_period_seconds: String(hostSec),
        guest_seat_disconnect_grace_period_seconds: String(guestSec),
      }));
      onToast('Reconnection grace periods updated & synchronized in real-time!', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSavingGracePeriod(false);
    }
  };

  // Live Simulation Calculator State
  const [simCoins, setSimCoins] = useState(1000);

  // Dynamic Custom Thumbnail Duration & Pricing Plans
  const [pricingTiers, setPricingTiers] = useState([
    { days: 7, coins: 200 },
    { days: 15, coins: 350 },
    { days: 30, coins: 500 },
    { days: 90, coins: 1200 },
  ]);

  useEffect(() => {
    if (settings.custom_thumbnail_pricing_tiers) {
      try {
        const parsed = typeof settings.custom_thumbnail_pricing_tiers === 'string'
          ? JSON.parse(settings.custom_thumbnail_pricing_tiers)
          : settings.custom_thumbnail_pricing_tiers;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPricingTiers(parsed);
        }
      } catch (e) { }
    }
  }, [settings.custom_thumbnail_pricing_tiers]);

  const handleTierChange = (index, field, val) => {
    setPricingTiers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: parseInt(val, 10) || 0 };
      return copy;
    });
  };

  const handleAddTier = () => {
    setPricingTiers((prev) => [...prev, { days: 60, coins: 800 }]);
  };

  const handleRemoveTier = (index) => {
    if (pricingTiers.length <= 1) {
      onToast('You must keep at least 1 duration plan.', 'warning');
      return;
    }
    setPricingTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveTiers = async () => {
    try {
      setSaving(true);
      const valStr = JSON.stringify(pricingTiers);
      await settingsApi.updateSetting(
        'custom_thumbnail_pricing_tiers',
        valStr,
        'Dynamic pricing tiers (days vs coins) for user-uploaded custom room background thumbnails'
      );
      setSettings((prev) => ({ ...prev, custom_thumbnail_pricing_tiers: valStr }));
      onToast('Thumbnail duration pricing tiers saved successfully!', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLivekit = async () => {
    try {
      setSavingLivekit(true);
      await Promise.all([
        settingsApi.updateSetting(
          'live_stream_provider',
          settings.live_stream_provider || 'livekit',
          'Streaming engine provider (livekit, agora, rtmp)'
        ),
        settingsApi.updateSetting(
          'livekit_url',
          settings.livekit_url || '',
          'LiveKit Cloud or self-hosted WebSocket URL (e.g., wss://your-project.livekit.cloud)'
        ),
        settingsApi.updateSetting(
          'livekit_api_key',
          settings.livekit_api_key || '',
          'LiveKit Server/Project API Key'
        ),
        settingsApi.updateSetting(
          'livekit_api_secret',
          settings.livekit_api_secret || '',
          'LiveKit Server/Project API Secret'
        ),
      ]);
      onToast('LiveKit credentials saved & synchronized with mobile APIs!', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSavingLivekit(false);
    }
  };

  const handleSaveEconomy = async () => {
    try {
      setSavingEconomy(true);
      const keys = [
        'is_convert_to_diamond',
        'coin_to_diamond_ratio',
        'diamond_to_usd_rate',
        'video_host_diamond_base',
        'video_host_taka_amount',
        'audio_host_diamond_base',
        'audio_host_taka_amount',
        'min_withdrawal_diamonds',
        'withdrawal_presets',
        'allow_manual_withdrawal_input',
        'admin_gift_commission_percent',
        'agency_gift_commission_percent',
        'user_transfer_commission_percent',
        'recharge_presets',
        'default_registration_coins',
      ];
      await Promise.all(
        keys.map((k) =>
          settings[k] !== undefined
            ? settingsApi.updateSetting(k, settings[k])
            : Promise.resolve()
        )
      );
      onToast('Platform Economy & Currency Engine settings updated!', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSavingEconomy(false);
    }
  };

  const handleSaveSecurity = async () => {
    try {
      setSavingSecurity(true);
      await settingsApi.updateSetting(
        'action_security_password',
        settings.action_security_password || 'admin123',
        'Security action password required for coin recharge and balance deductions'
      );
      onToast('Admin security action password saved successfully!', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleSaveSystem = async () => {
    try {
      setSavingSystem(true);
      await Promise.all([
        settingsApi.updateSetting('maintenance_mode', settings.maintenance_mode || 'false', 'Platform maintenance mode flag'),
        settingsApi.updateSetting('maintenance_message', settings.maintenance_message || 'Platform is under scheduled maintenance. Please check back shortly.', 'Platform maintenance message'),
        settingsApi.updateSetting('platform_name', settings.platform_name || 'Umi Live', 'Platform display name'),
      ]);
      onToast('System and maintenance settings saved!', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSavingSystem(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await settingsApi.getSettings();
      if (res.success && res.settings) {
        const map = {};
        res.settings.forEach((s) => {
          map[s.key_name] = s.key_value;
        });
        setSettings(map);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      for (const key of Object.keys(settings)) {
        await settingsApi.updateSetting(key, settings[key]);
      }
      onToast('All platform settings updated!', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader text="Loading platform configuration..." size="lg" />;
  }

  const isDiamondMode = settings.is_convert_to_diamond !== 'false';
  const coinRatio = parseFloat(settings.coin_to_diamond_ratio || '1.0') || 1.0;
  const adminGiftPct = parseFloat(settings.admin_gift_commission_percent || '15.0') || 0;
  const agencyGiftPct = parseFloat(settings.agency_gift_commission_percent || '10.0') || 0;
  const hostCoinSharePct = Math.max(0, 100 - adminGiftPct - agencyGiftPct);
  const userTransferPct = parseFloat(settings.user_transfer_commission_percent || '5.0') || 0;

  // Conversion calculations for Video and Audio hosts (e.g. 100 coins = 5 taka)
  const videoBase = parseFloat(settings.video_host_diamond_base || '100');
  const videoTaka = parseFloat(settings.video_host_taka_amount || '5');
  const videoRate = videoBase > 0 ? videoTaka / videoBase : 0.05;

  const audioBase = parseFloat(settings.audio_host_diamond_base || '100');
  const audioTaka = parseFloat(settings.audio_host_taka_amount || '3.5');
  const audioRate = audioBase > 0 ? audioTaka / audioBase : 0.035;

  // Real-time Simulation Calculations
  const simNum = Math.max(0, parseInt(simCoins, 10) || 0);
  const simAdminCoins = Math.round((simNum * adminGiftPct) / 100);
  const simAgencyCoins = Math.round((simNum * agencyGiftPct) / 100);
  const simHostCoins = Math.max(0, simNum - simAdminCoins - simAgencyCoins);
  const simHostDiamonds = isDiamondMode ? Math.round(simHostCoins * coinRatio) : simHostCoins;
  const simVideoPayout = (simHostDiamonds * videoRate).toFixed(2);
  const simAudioPayout = (simHostDiamonds * audioRate).toFixed(2);

  const tabs = [
    {
      id: 'economy',
      name: 'Platform Economy',
      icon: Database,
      badge: isDiamondMode ? '💎 Diamond Mode' : '🪙 Direct Coins',
      badgeColor: isDiamondMode ? '#8b5cf6' : '#f59e0b',
      accent: '#8b5cf6',
      description: isDiamondMode
        ? 'Diamond conversion, host cashout exchange rates, and revenue sharing rules.'
        : 'Direct Coin split, host cashout exchange rates, and revenue sharing rules.',
    },
    {
      id: 'streaming',
      name: 'LiveKit & WebRTC',
      icon: Server,
      badge: settings.livekit_url && settings.livekit_api_key ? 'Active' : 'Setup Needed',
      badgeColor: settings.livekit_url && settings.livekit_api_key ? '#10b981' : '#ef4444',
      accent: '#06b6d4',
      description: 'LiveKit cloud websocket mesh, project API credentials, and dynamic mobile discovery.',
    },
    {
      id: 'monetization',
      name: 'Room Thumbnails',
      icon: ImageIcon,
      badge: `${pricingTiers.length} Plans`,
      badgeColor: '#ec4899',
      accent: '#ec4899',
      description: 'Dynamic duration pricing tiers for user-uploaded custom live room background wallpapers.',
    },
    {
      id: 'security',
      name: 'Financial Security',
      icon: Lock,
      badge: 'Protected',
      badgeColor: '#7c3aed',
      accent: '#7c3aed',
      description: 'Authorization passwords for coin recharges and administrative balance adjustments.',
    },
    {
      id: 'calls',
      name: '1-to-1 Calls & Rates',
      icon: PhoneCall,
      badge: settings.call_is_enabled === 'false' ? 'Disabled' : `${settings.call_video_rate_per_minute || '50'}c / ${settings.call_audio_rate_per_minute || '20'}c`,
      badgeColor: settings.call_is_enabled === 'false' ? '#ef4444' : '#10b981',
      accent: '#10b981',
      description: 'P2P Audio & Video Call per-minute coin costs, receiver revenue share, and live call logs.',
    },
    {
      id: 'screen_guard',
      name: 'Screen Guard',
      icon: Camera,
      badge: settings.app_screen_guard_enabled === 'false' ? 'Guard Off' : settings.live_screen_guard_enabled === 'false' ? 'App Only' : 'Full Guard',
      badgeColor: settings.app_screen_guard_enabled === 'false' ? '#ef4444' : '#7c3aed',
      accent: '#7c3aed',
      description: 'Control screenshot, screen recording, screen share permissions for live rooms and the entire app.',
    },
    {
      id: 'system',
      name: 'System & Maintenance',
      icon: Shield,
      badge: settings.maintenance_mode === 'true' ? 'Maintenance ON' : 'Live Online',
      badgeColor: settings.maintenance_mode === 'true' ? '#ef4444' : '#10b981',
      accent: '#3b82f6',
      description: 'Platform maintenance mode, scheduled downtime notices, and global application branding.',
    },
  ];

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          padding: '1.5rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(6, 182, 212, 0.05) 50%, rgba(245, 158, 11, 0.05) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          marginBottom: '1.75rem',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
            }}
          >
            <SettingsIcon size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                Global Platform Settings
              </h1>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(124, 58, 237, 0.15)',
                  color: '#7c3aed',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                }}
              >
                v1.0 Production
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Manage real-time economy systems, LiveKit WebRTC mesh, pricing rules, security keys, and maintenance modes.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchSettings}
            disabled={loading || saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Reload</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveAll}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.6rem 1.25rem',
              fontSize: '0.88rem',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
            }}
          >
            <Save size={16} />
            <span>{saving ? 'Saving All Changes...' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>

      {/* Modern Navigation Tabs Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.65rem',
          marginBottom: '1.5rem',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.9rem 1rem',
                borderRadius: '12px',
                border: isActive ? `2px solid ${tab.accent}` : '1px solid var(--border-color)',
                background: isActive ? 'var(--bg-secondary)' : 'var(--bg-card)',
                boxShadow: isActive ? `0 4px 16px -2px ${tab.accent}33` : 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: tab.accent,
                  }}
                />
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.4rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isActive ? `${tab.accent}20` : 'var(--bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? tab.accent : 'var(--text-dim)',
                  }}
                >
                  <Icon size={18} />
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: `${tab.badgeColor}18`,
                    color: tab.badgeColor,
                    border: `1px solid ${tab.badgeColor}33`,
                  }}
                >
                  {tab.badge}
                </span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>
                {tab.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: PLATFORM ECONOMY & CURRENCY ENGINE */}
      {activeTab === 'economy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Main Economy Configuration Panel */}
          <div className="panel-card" style={{ border: '1px solid rgba(139, 92, 246, 0.35)' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">
                <Database size={22} color="#8b5cf6" />
                <span>Platform Economy & Currency Engine</span>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isDiamondMode ? 'rgba(139, 92, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: isDiamondMode ? '#8b5cf6' : '#d97706',
                  border: isDiamondMode ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                {isDiamondMode ? <Gem size={14} /> : <Coins size={14} />}
                <span>{isDiamondMode ? 'Diamond Conversion Mode Active' : 'Direct Coin Split Mode Active'}</span>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Economy Mode Selector Cards */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                  Select Core Platform Economy Model:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  {/* Option 1: Diamond Conversion Mode */}
                  <div
                    onClick={() => handleChange('is_convert_to_diamond', 'true')}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      border: isDiamondMode ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                      background: isDiamondMode ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-primary)',
                      boxShadow: isDiamondMode ? '0 0 20px rgba(139, 92, 246, 0.22)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, color: isDiamondMode ? '#8b5cf6' : 'var(--text-main)', fontSize: '1rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(139, 92, 246, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Gem size={18} color="#8b5cf6" />
                        </div>
                        <span>Diamond Conversion Mode</span>
                      </div>
                      {isDiamondMode && <CheckCircle2 size={20} color="#8b5cf6" />}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
                      Users send <strong>Coins (🪙)</strong> which automatically convert into <strong>Diamonds (💎)</strong> for hosts. Streamers accumulate diamonds and request cashout based on dynamic Diamond-to-Taka exchange rates.
                    </p>
                  </div>

                  {/* Option 2: Direct Coin Commission Mode */}
                  <div
                    onClick={() => handleChange('is_convert_to_diamond', 'false')}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      border: !isDiamondMode ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                      background: !isDiamondMode ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-primary)',
                      boxShadow: !isDiamondMode ? '0 0 20px rgba(245, 158, 11, 0.22)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, color: !isDiamondMode ? '#d97706' : 'var(--text-main)', fontSize: '1rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Coins size={18} color="#f59e0b" />
                        </div>
                        <span>Direct Coin & Commission Mode</span>
                      </div>
                      {!isDiamondMode && <CheckCircle2 size={20} color="#f59e0b" />}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
                      <strong>Direct Coin split active!</strong> Gifts and transfers reward direct <strong>Coins (🪙)</strong>. Hosts retain a configurable percentage and cash out directly from their coin balance into Taka (৳).
                    </p>
                  </div>
                </div>
              </div>

              {/* LIVE SIMULATION CALCULATOR (PRO FEATURE) */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.04) 0%, rgba(15, 23, 42, 0.07) 100%)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calculator size={16} color="#7c3aed" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Live Economics Simulator
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Real-time calculation breakdown for gifts and cashout payouts
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Test Gift Amount:
                    </label>
                    <div style={{ position: 'relative', width: '130px' }}>
                      <input
                        type="number"
                        min="1"
                        step="100"
                        className="input-field"
                        value={simCoins}
                        onChange={(e) => setSimCoins(e.target.value)}
                        style={{ paddingRight: '2rem', fontWeight: 700, fontSize: '0.88rem' }}
                      />
                      <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem' }}>
                        🪙
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                  {/* Platform Share */}
                  <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase' }}>
                      Admin Platform ({adminGiftPct}%)
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                      {simAdminCoins} <span style={{ fontSize: '0.8rem' }}>coins</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Retained by system</div>
                  </div>

                  {/* Agency Share */}
                  <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase' }}>
                      Agency ({agencyGiftPct}%)
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6', marginTop: '2px' }}>
                      {simAgencyCoins} <span style={{ fontSize: '0.8rem' }}>coins</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Host agency commission</div>
                  </div>

                  {/* Host Received */}
                  <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#10b981', textTransform: 'uppercase' }}>
                      Host ({hostCoinSharePct.toFixed(1)}%)
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                      {isDiamondMode ? `${simHostDiamonds} 💎` : `${simHostCoins} 🪙`}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Credited to streamer</div>
                  </div>

                  {/* Video Host Cashout */}
                  <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid rgba(2, 132, 199, 0.25)' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#0284c7', textTransform: 'uppercase' }}>
                      Video Host Cashout
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                      ৳ {simVideoPayout}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Net Taka payout</div>
                  </div>

                  {/* Audio Host Cashout */}
                  <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid rgba(217, 119, 6, 0.25)' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>
                      Audio Host Cashout
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                      ৳ {simAudioPayout}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Net Taka payout</div>
                  </div>
                </div>
              </div>

              {/* Host Payout Conversion Rules (Taka Rates) */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                  <Sliders size={18} color="#7c3aed" />
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                    Host Cashout Payout Exchange Rules ({isDiamondMode ? 'Diamonds 💎' : 'Coins 🪙'} to Taka ৳ BDT)
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                  Configure exact base exchange rates for Video and Audio hosts (e.g. <strong>100 {isDiamondMode ? 'Diamonds' : 'Coins'} = 5.00 Taka</strong>).
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {/* Video Host Rule Card */}
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(2, 132, 199, 0.3)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#0284c7', fontSize: '0.92rem' }}>
                        <Video size={18} />
                        <span>🎥 Video Host Cashout Rule</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', padding: '2px 8px', borderRadius: '4px' }}>
                        High Bandwidth
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                          Base {isDiamondMode ? 'Diamonds (💎)' : 'Coins (🪙)'}:
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="input-field"
                          value={settings.video_host_diamond_base || '100'}
                          onChange={(e) => handleChange('video_host_diamond_base', e.target.value)}
                        />
                      </div>
                      <span style={{ color: 'var(--text-dim)', paddingTop: '18px', fontWeight: 700 }}>=</span>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                          Payout (৳ BDT):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="input-field"
                          value={settings.video_host_taka_amount || '5'}
                          onChange={(e) => handleChange('video_host_taka_amount', e.target.value)}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(2, 132, 199, 0.08)',
                        fontSize: '0.78rem',
                        color: '#0284c7',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>1 {isDiamondMode ? '💎' : '🪙'} = ৳{videoRate.toFixed(4)} BDT</span>
                      <span>10,000 = ৳{(10000 * videoRate).toFixed(0)} BDT</span>
                    </div>
                  </div>

                  {/* Audio Host Rule Card */}
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#10b981', fontSize: '0.92rem' }}>
                        <Mic size={18} />
                        <span>🎙️ Audio Host Cashout Rule</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '4px' }}>
                        Audio Space
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                          Base {isDiamondMode ? 'Diamonds (💎)' : 'Coins (🪙)'}:
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="input-field"
                          value={settings.audio_host_diamond_base || '100'}
                          onChange={(e) => handleChange('audio_host_diamond_base', e.target.value)}
                        />
                      </div>
                      <span style={{ color: 'var(--text-dim)', paddingTop: '18px', fontWeight: 700 }}>=</span>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                          Payout (৳ BDT):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="input-field"
                          value={settings.audio_host_taka_amount || '3.5'}
                          onChange={(e) => handleChange('audio_host_taka_amount', e.target.value)}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        fontSize: '0.78rem',
                        color: '#10b981',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>1 {isDiamondMode ? '💎' : '🪙'} = ৳{audioRate.toFixed(4)} BDT</span>
                      <span>10,000 = ৳{(10000 * audioRate).toFixed(0)} BDT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: REVENUE SHARING & COMMISSIONS BREAKDOWN */}
              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(217, 119, 6, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Percent size={18} color="#d97706" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Revenue Sharing & Commissions Breakdown
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Split ratio for coin gifting and peer-to-peer coin transfers
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '16px',
                      background: hostCoinSharePct >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: hostCoinSharePct >= 0 ? '#10b981' : '#ef4444',
                      border: `1px solid ${hostCoinSharePct >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    }}
                  >
                    Total Split: {adminGiftPct + agencyGiftPct + hostCoinSharePct}%
                  </span>
                </div>

                {/* 4 Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  {/* Card 1: Admin Platform Commission */}
                  <div
                    style={{
                      padding: '1.1rem',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(20, 10, 15, 0.4) 100%)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          Admin Platform Commission
                        </span>
                        <Shield size={16} color="#ef4444" />
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block', lineHeight: 1.4 }}>
                        Retained by platform from coin gifts.
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className="input-field"
                        style={{ maxWidth: '130px', fontWeight: 700, fontSize: '1rem', color: '#ef4444' }}
                        value={settings.admin_gift_commission_percent || '15.0'}
                        onChange={(e) => handleChange('admin_gift_commission_percent', e.target.value)}
                      />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>%</span>
                    </div>
                  </div>

                  {/* Card 2: Default Agency Commission */}
                  <div
                    style={{
                      padding: '1.1rem',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(10, 15, 25, 0.4) 100%)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          Default Agency Commission
                        </span>
                        <Users size={16} color="#3b82f6" />
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block', lineHeight: 1.4 }}>
                        Credited to host agency (if assigned).
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className="input-field"
                        style={{ maxWidth: '130px', fontWeight: 700, fontSize: '1rem', color: '#3b82f6' }}
                        value={settings.agency_gift_commission_percent || '10.0'}
                        onChange={(e) => handleChange('agency_gift_commission_percent', e.target.value)}
                      />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6' }}>%</span>
                    </div>
                  </div>

                  {/* Card 3: Host Remaining Share (Auto Calculated) */}
                  <div
                    style={{
                      padding: '1.1rem',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(10, 25, 20, 0.4) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          Host Remaining Share
                        </span>
                        <Sparkles size={16} color="#10b981" />
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block', lineHeight: 1.4 }}>
                        Credited directly to host wallet.
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                        {hostCoinSharePct.toFixed(1)}%
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>auto-calculated</span>
                    </div>
                  </div>

                  {/* Card 4: User P2P Transfer Fee */}
                  <div
                    style={{
                      padding: '1.1rem',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(25, 20, 10, 0.4) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          User P2P Transfer Fee
                        </span>
                        <ArrowRightLeft size={16} color="#f59e0b" />
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block', lineHeight: 1.4 }}>
                        Fee on peer-to-peer coin transfers.
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className="input-field"
                        style={{ maxWidth: '130px', fontWeight: 700, fontSize: '1rem', color: '#f59e0b' }}
                        value={settings.user_transfer_commission_percent || '5.0'}
                        onChange={(e) => handleChange('user_transfer_commission_percent', e.target.value)}
                      />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>%</span>
                    </div>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div style={{ padding: '0.9rem 1.1rem', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '8px' }}>
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                      Admin: {adminGiftPct}%
                    </span>
                    <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                      Agency: {agencyGiftPct}%
                    </span>
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      Host Share: {hostCoinSharePct.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: '14px', borderRadius: '7px', overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)' }}>
                    <div style={{ width: `${Math.min(100, adminGiftPct)}%`, background: '#ef4444', transition: 'width 0.3s ease' }} title={`Admin ${adminGiftPct}%`} />
                    <div style={{ width: `${Math.min(100 - adminGiftPct, agencyGiftPct)}%`, background: '#3b82f6', transition: 'width 0.3s ease' }} title={`Agency ${agencyGiftPct}%`} />
                    <div style={{ width: `${Math.max(0, hostCoinSharePct)}%`, background: '#10b981', transition: 'width 0.3s ease' }} title={`Host ${hostCoinSharePct}%`} />
                  </div>
                </div>
              </div>

              {/* SECTION: CASHOUT & HOST WITHDRAWAL ENGINE */}
              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <DollarSign size={18} color="#8b5cf6" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Cashout & Host Withdrawal Engine
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Host withdrawal threshold, custom amount input permission, and mobile quick preset buttons
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {/* Left: Threshold & Custom Input */}
                  <div
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.25rem',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                        Minimum {isDiamondMode ? 'Diamonds' : 'Coins'} for Cashout
                      </label>
                      <div style={{ position: 'relative', maxWidth: '240px' }}>
                        <input
                          type="number"
                          min="1"
                          className="input-field"
                          style={{ paddingLeft: '2.4rem', fontWeight: 700 }}
                          value={settings.min_withdrawal_diamonds || '1000'}
                          onChange={(e) => handleChange('min_withdrawal_diamonds', e.target.value)}
                        />
                        <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                          {isDiamondMode ? <Gem size={16} color="#8b5cf6" /> : <Coins size={16} color="#f59e0b" />}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                        Minimum balance required before a host can submit a withdrawal request.
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                        Allow Custom Manual Input for Withdrawal
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div
                          onClick={() => handleChange('allow_manual_withdrawal_input', 'true')}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            border: settings.allow_manual_withdrawal_input !== 'false' ? '2px solid #10b981' : '1px solid var(--border-color)',
                            background: settings.allow_manual_withdrawal_input !== 'false' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <CheckCircle2 size={16} color={settings.allow_manual_withdrawal_input !== 'false' ? '#10b981' : 'var(--text-dim)'} />
                          <div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: settings.allow_manual_withdrawal_input !== 'false' ? '#10b981' : 'var(--text-main)', display: 'block' }}>
                              Enabled
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Custom input</span>
                          </div>
                        </div>

                        <div
                          onClick={() => handleChange('allow_manual_withdrawal_input', 'false')}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            border: settings.allow_manual_withdrawal_input === 'false' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                            background: settings.allow_manual_withdrawal_input === 'false' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <AlertTriangle size={16} color={settings.allow_manual_withdrawal_input === 'false' ? '#ef4444' : 'var(--text-dim)'} />
                          <div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: settings.allow_manual_withdrawal_input === 'false' ? '#ef4444' : 'var(--text-main)', display: 'block' }}>
                              Disabled
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Presets only</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Cashout Presets - Alada Alada Chips */}
                  <div
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            Cashout Quick Presets ({isDiamondMode ? '💎 Diamonds' : '🪙 Coins'})
                          </label>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>
                            Interactive buttons shown on the mobile host cashout screen.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetWithdrawalPresets}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-dim)',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Reset Defaults
                        </button>
                      </div>

                      {/* Chips Container */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '0.75rem 0' }}>
                        {parsePresetsList(settings.withdrawal_presets, [1000, 2000, 5000, 10000, 25000, 50000]).map((num) => (
                          <div
                            key={num}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: '20px',
                              background: 'rgba(139, 92, 246, 0.12)',
                              border: '1px solid rgba(139, 92, 246, 0.35)',
                              color: '#c4b5fd',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                            }}
                          >
                            <span>{isDiamondMode ? '💎' : '🪙'} {Number(num).toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveWithdrawalPreset(num)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'rgba(255, 255, 255, 0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px',
                                borderRadius: '50%',
                              }}
                              title="Remove this preset"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add New Preset Input */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 15000"
                        className="input-field"
                        style={{ maxWidth: '160px' }}
                        value={newWithdrawalPreset}
                        onChange={(e) => setNewWithdrawalPreset(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddWithdrawalPreset();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleAddWithdrawalPreset}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px' }}
                      >
                        <Plus size={14} />
                        <span>Add Preset</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: RECHARGE PRESETS & WELCOME INCENTIVES */}
              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Coins size={18} color="#f59e0b" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Wallet Recharge & New User Registration Incentives
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Quick buy coin presets for mobile recharge and free welcome bonus coins for new accounts
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {/* Left: Recharge Coin Presets - Alada Alada Chips */}
                  <div
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            Recharge Coin Presets 🪙
                          </label>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>
                            Quick buy options shown on user wallet recharge screen.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetRechargePresets}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-dim)',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Reset Defaults
                        </button>
                      </div>

                      {/* Chips Container */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '0.75rem 0' }}>
                        {parsePresetsList(settings.recharge_presets, [500, 1000, 2500, 5000, 10000, 50000, 100000]).map((num) => (
                          <div
                            key={num}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: '20px',
                              background: 'rgba(245, 158, 11, 0.12)',
                              border: '1px solid rgba(245, 158, 11, 0.35)',
                              color: '#fbbf24',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                            }}
                          >
                            <span>🪙 {Number(num).toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRechargePreset(num)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'rgba(255, 255, 255, 0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px',
                                borderRadius: '50%',
                              }}
                              title="Remove this preset"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add New Recharge Preset Form */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 250000"
                        className="input-field"
                        style={{ maxWidth: '160px' }}
                        value={newRechargePreset}
                        onChange={(e) => setNewRechargePreset(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddRechargePreset();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleAddRechargePreset}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px' }}
                      >
                        <Plus size={14} />
                        <span>Add Preset</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: New User Registration Welcome Bonus Card */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(20, 15, 10, 0.45) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      position: 'relative',
                      boxShadow: '0 4px 20px rgba(245, 158, 11, 0.08)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Gift size={18} color="#f59e0b" />
                          <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            New User Registration Welcome Coins
                          </label>
                        </div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          Auto Credited
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', lineHeight: 1.4 }}>
                        Free bonus coins granted to newly created accounts on registration (Email, Google, Guest).
                      </span>

                      {/* Quick Select Buttons */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '0.85rem 0' }}>
                        {[0, 50, 100, 200, 500, 1000].map((amount) => {
                          const isSelected = String(settings.default_registration_coins ?? '100') === String(amount);
                          return (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => handleChange('default_registration_coins', String(amount))}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '16px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: isSelected ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)',
                                color: isSelected ? '#000000' : 'var(--text-main)',
                                border: isSelected ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {amount === 0 ? '0 (None)' : `${amount} Coins`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                        Or Enter Custom Coins Amount:
                      </label>
                      <div style={{ position: 'relative', maxWidth: '200px' }}>
                        <input
                          type="number"
                          className="input-field"
                          min="0"
                          value={settings.default_registration_coins ?? '100'}
                          onChange={(e) => handleChange('default_registration_coins', e.target.value)}
                          placeholder="100"
                          style={{ paddingLeft: '2.4rem', fontWeight: 700, fontSize: '1rem', color: '#f59e0b' }}
                        />
                        <Coins size={16} color="#f59e0b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedicated Economy Save Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveEconomy}
                  disabled={savingEconomy || saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#8b5cf6', borderColor: '#7c3aed' }}
                >
                  <Save size={16} />
                  <span>{savingEconomy ? 'Saving Economy Settings...' : 'Save Economy Configuration'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone: System-Wide Wallet Reset */}
          <div className="panel-card" style={{ border: '1px solid rgba(239, 68, 68, 0.45)', background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.06) 0%, rgba(20, 10, 15, 0.45) 100%)' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={22} color="#ef4444" />
                <span style={{ color: '#ef4444', fontWeight: 700 }}>System-Wide Wallet Balances Reset (Danger Zone)</span>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                <Lock size={12} />
                Requires Action Security Password
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                Reset all users' coin or diamond balances across the entire platform. This is an irreversible bulk operation protected by the platform's Admin Action Security Password. User balances in MySQL and cached states in Redis are instantly updated.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                {/* Option 1: Reset All Coins */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                      <Coins size={20} color="#f59e0b" />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Reset All Users' Coins
                      </h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                      Sets <code style={{ color: '#f59e0b' }}>coins = 0</code> for every user in the platform. Diamond balances remain completely untouched.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenResetModal('coins')}
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid #f59e0b',
                      color: '#f59e0b',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Coins size={15} />
                    <span>Reset All Coins to 0</span>
                  </button>
                </div>

                {/* Option 2: Reset All Diamonds */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                      <Gem size={20} color="#8b5cf6" />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Reset All Users' Diamonds
                      </h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                      Sets <code style={{ color: '#8b5cf6' }}>diamonds = 0</code> for every user in the platform. Coin balances remain completely untouched.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenResetModal('diamonds')}
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid #8b5cf6',
                      color: '#a78bfa',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Gem size={15} />
                    <span>Reset All Diamonds to 0</span>
                  </button>
                </div>

                {/* Option 3: Reset Both Coins & Diamonds */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                      <Trash2 size={20} color="#ef4444" />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ef4444' }}>
                        Reset All Wallets (Zero All)
                      </h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                      Sets both <code style={{ color: '#ef4444' }}>coins = 0 AND diamonds = 0</code> for all users in the system simultaneously.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenResetModal('all')}
                    style={{
                      background: '#ef4444',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 10px rgba(239, 68, 68, 0.35)',
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Reset All Wallets to 0</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: LIVEKIT & WEBRTC ENGINE */}
      {activeTab === 'streaming' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel-card" style={{ border: '1px solid rgba(6, 182, 212, 0.35)' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">
                <Server size={22} color="#06b6d4" />
                <span>LiveKit & WebRTC Streaming Engine</span>
              </div>
              {settings.livekit_url && settings.livekit_api_key ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  <Wifi size={14} /> Active & Connected
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  <AlertTriangle size={14} /> Incomplete Credentials
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Streaming Infrastructure Provider
                  </label>
                  <select
                    className="select-field"
                    style={{ width: '100%' }}
                    value={settings.live_stream_provider || 'livekit'}
                    onChange={(e) => handleChange('live_stream_provider', e.target.value)}
                  >
                    <option value="livekit">LiveKit Cloud / Self-hosted WebRTC (Recommended)</option>
                    <option value="agora">Agora RTC Engine</option>
                    <option value="rtmp">Native RTMP / HLS Streamer</option>
                  </select>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                    Sub-100ms ultra low-latency WebRTC SFU mesh for video & multi-seat audio parties.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Platform Display Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: '100%' }}
                    value={settings.platform_name || 'Umi Live'}
                    onChange={(e) => handleChange('platform_name', e.target.value)}
                    placeholder="e.g. Umi Live"
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                    App identifier attached to room metadata and connection handshakes.
                  </div>
                </div>
              </div>

              {/* LiveKit Server / Cloud URL */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  <Wifi size={15} color="#06b6d4" />
                  LiveKit WebSocket Server URL (<code style={{ color: '#06b6d4' }}>livekit_url</code>)
                </label>
                <input
                  type="text"
                  className="input-field"
                  style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  value={settings.livekit_url || ''}
                  onChange={(e) => handleChange('livekit_url', e.target.value)}
                  placeholder="wss://your-project.livekit.cloud or ws://192.168.0.105:7880"
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                  Your LiveKit Cloud or self-hosted server WebSocket URL. The Flutter mobile app dynamically connects to this host.
                </div>
              </div>

              {/* API Key and API Secret */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    <Key size={15} color="#3b82f6" />
                    LiveKit API Key (<code style={{ color: '#3b82f6' }}>livekit_api_key</code>)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                    value={settings.livekit_api_key || ''}
                    onChange={(e) => handleChange('livekit_api_key', e.target.value)}
                    placeholder="e.g. APIxxxxxxxxxxxx"
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                    Project API Key created from LiveKit Cloud console or self-hosted config.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={15} color="#ef4444" />
                      LiveKit API Secret (<code style={{ color: '#ef4444' }}>livekit_api_secret</code>)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLivekitSecret(!showLivekitSecret)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        padding: 0,
                      }}
                    >
                      {showLivekitSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{showLivekitSecret ? 'Hide' : 'Show'}</span>
                    </button>
                  </label>
                  <input
                    type={showLivekitSecret ? 'text' : 'password'}
                    className="input-field"
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                    value={settings.livekit_api_secret || ''}
                    onChange={(e) => handleChange('livekit_api_secret', e.target.value)}
                    placeholder="e.g. secret_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                    Kept strictly secure on the backend. Used to generate participant JWT room tokens.
                  </div>
                </div>
              </div>

              {/* Mobile App Dynamic Integration Box */}
              <div
                style={{
                  background: 'rgba(6, 182, 212, 0.05)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', color: '#06b6d4' }}>
                    <Sparkles size={18} />
                    <span>Dynamic Mobile Integration (Zero Recompilation)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('/api/mobile/config/livekit');
                      setCopiedEndpoint(true);
                      setTimeout(() => setCopiedEndpoint(false), 2000);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedEndpoint ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    <span>{copiedEndpoint ? 'Copied Path!' : 'Copy API Path'}</span>
                  </button>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  The Flutter mobile app queries the endpoints below at runtime to dynamically connect to the active LiveKit server:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: '#10b981', fontWeight: 800 }}>GET</span>
                    <code style={{ color: 'var(--text-main)', flex: 1, fontFamily: 'var(--font-mono)' }}>/api/mobile/config/livekit</code>
                    <span style={{ color: 'var(--text-dim)' }}>Returns livekit_url, server_url, provider & api_key</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: '#3b82f6', fontWeight: 800 }}>POST</span>
                    <code style={{ color: 'var(--text-main)', flex: 1, fontFamily: 'var(--font-mono)' }}>/api/mobile/live/rooms/:roomId/livekit-token</code>
                    <span style={{ color: 'var(--text-dim)' }}>Returns dynamic participant token & server URL</span>
                  </div>
                </div>
              </div>

              {/* Direct Save Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveLivekit}
                  disabled={savingLivekit || saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#06b6d4', borderColor: '#0891b2' }}
                >
                  <Save size={16} />
                  <span>{savingLivekit ? 'Saving LiveKit...' : 'Save LiveKit Credentials'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Reconnection Grace Period Panel */}
          <div className="panel-card" style={{ border: '1px solid rgba(168, 85, 247, 0.35)' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">
                <Activity size={22} color="#a855f7" />
                <span>Live Stream Disconnection & Reconnection Grace Periods</span>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(168, 85, 247, 0.12)',
                  color: '#a855f7',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                ⏱️ Real-time Socket Protection
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Configure how long the system waits when a host or seated co-host experiences an unexpected internet drop, socket disconnection, or app closure. If they reconnect within this time window, their room and seats remain completely preserved without being closed or evicted.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {/* Host Grace Period */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      👑 Host Disconnect Grace Period
                    </span>
                    <span style={{ color: '#a855f7', fontWeight: 700, fontSize: '0.8rem' }}>
                      {settings.host_disconnect_grace_period_seconds || '90'}s ({((parseInt(settings.host_disconnect_grace_period_seconds, 10) || 90) / 60).toFixed(1)} min)
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="10"
                      max="600"
                      className="input-field"
                      style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                      value={settings.host_disconnect_grace_period_seconds ?? '90'}
                      onChange={(e) => handleChange('host_disconnect_grace_period_seconds', e.target.value)}
                      placeholder="e.g. 90"
                    />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Sec</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.4rem', lineHeight: 1.4 }}>
                    If the room host's internet disconnects, wait this many seconds before terminating the live room. (Default: 90s / 1.5 mins)
                  </div>
                </div>

                {/* Participant / Seated Guest Grace Period */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🎙️ Seated Guest / Co-host Grace Period
                    </span>
                    <span style={{ color: '#06b6d4', fontWeight: 700, fontSize: '0.8rem' }}>
                      {settings.guest_seat_disconnect_grace_period_seconds || '60'}s ({((parseInt(settings.guest_seat_disconnect_grace_period_seconds, 10) || 60) / 60).toFixed(1)} min)
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      className="input-field"
                      style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                      value={settings.guest_seat_disconnect_grace_period_seconds ?? '60'}
                      onChange={(e) => handleChange('guest_seat_disconnect_grace_period_seconds', e.target.value)}
                      placeholder="e.g. 60"
                    />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Sec</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.4rem', lineHeight: 1.4 }}>
                    If a seated participant loses internet or closes the app, hold and lock their seat for this many seconds before removing them. (Default: 60s / 1 min)
                  </div>
                </div>
              </div>

              {/* Direct Save Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveGracePeriod}
                  disabled={savingGracePeriod || saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#a855f7', borderColor: '#9333ea' }}
                >
                  <Save size={16} />
                  <span>{savingGracePeriod ? 'Saving...' : 'Save Grace Period Settings'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: ROOM THUMBNAIL DURATION PRICING */}
      {activeTab === 'monetization' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel-card" style={{ border: '1px solid rgba(236, 72, 153, 0.35)' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">
                <ImageIcon size={22} color="#ec4899" />
                <span>Custom Room Thumbnail & Background Duration Pricing</span>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                User Monetization
              </span>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Configure how many days a user-uploaded custom thumbnail remains active and how many coins it costs for each duration tier.
              When uploaded, the custom thumbnail is private to the user and will <strong>never</strong> appear in the public catalog for others.
            </p>

            {/* Dynamic Pricing Plans Table / Cards */}
            <div
              style={{
                background: 'rgba(236, 72, 153, 0.04)',
                borderRadius: '12px',
                border: '1px solid rgba(236, 72, 153, 0.25)',
                padding: '1.25rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="#ec4899" />
                  <span style={{ fontWeight: 700, fontSize: '0.94rem', color: '#db2777' }}>
                    Duration Plans & Coin Pricing Tiers
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddTier}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Plus size={14} />
                  <span>Add New Plan</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {pricingTiers.map((tier, idx) => {
                  const dailyCost = tier.days > 0 ? (tier.coins / tier.days).toFixed(1) : 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        position: 'relative',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ec4899', textTransform: 'uppercase' }}>
                          Tier #{idx + 1}
                        </span>
                        {pricingTiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTier(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                            title="Delete tier"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>
                            Validity (Days):
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="input-field"
                            value={tier.days}
                            onChange={(e) => handleTierChange(idx, 'days', e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>
                            Cost (Coins):
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="input-field"
                            value={tier.coins}
                            onChange={(e) => handleTierChange(idx, 'coins', e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#ec4899', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                        <span>🪙 {tier.coins} Coins</span>
                        <span>~{dailyCost} coins/day</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveTiers}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ec4899', borderColor: '#db2777' }}
                >
                  <Save size={15} />
                  <span>Save Duration Pricing Plans</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: FINANCIAL SECURITY & PASSWORDS */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            className="panel-card"
            style={{
              border: '1px solid rgba(124, 58, 237, 0.35)',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.04) 0%, rgba(2, 132, 199, 0.04) 100%)',
            }}
          >
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">
                <Lock size={22} color="#7c3aed" />
                <span>Security Action Password (Coin Recharge & Deductions)</span>
              </div>
              <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                Critical Financial Lock
              </span>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              This security password is required whenever administrators <strong>recharge coins</strong> for users or <strong>deduct coins / diamonds</strong> from user balances. Only administrators with this authorization password can approve financial balance modifications.
            </p>

            <div style={{ maxWidth: '480px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Admin Action Password
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type={showActionPassword ? 'text' : 'password'}
                    className="input-field"
                    style={{ width: '100%', paddingRight: '2.5rem', fontFamily: 'var(--font-mono)' }}
                    placeholder="Enter security password..."
                    value={settings.action_security_password || 'admin123'}
                    onChange={(e) => handleChange('action_security_password', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowActionPassword(!showActionPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={showActionPassword ? 'Hide password' : 'Show password'}
                  >
                    {showActionPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveSecurity}
                  disabled={savingSecurity || saving}
                  style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={15} />
                  <span>{savingSecurity ? 'Saving...' : 'Save Password'}</span>
                </button>
              </div>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '6px', display: 'block' }}>
                Current default is: <code style={{ color: '#7c3aed', fontWeight: 700 }}>admin123</code>. You can change this to any secure alphanumeric key.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: SYSTEM & MAINTENANCE */}
      {activeTab === 'system' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel-card" style={{ border: '1px solid rgba(59, 130, 246, 0.35)' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">
                <Shield size={22} color="#3b82f6" />
                <span>Platform Maintenance Mode & Application Rules</span>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: settings.maintenance_mode === 'true' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  color: settings.maintenance_mode === 'true' ? '#ef4444' : '#10b981',
                  border: settings.maintenance_mode === 'true' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                {settings.maintenance_mode === 'true' ? 'Maintenance Active' : 'Normal Operations'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '10px', background: 'var(--bg-primary)' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                    Emergency / Scheduled Maintenance Mode
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    When activated, regular client mobile apps and web viewers display a scheduled maintenance screen.
                  </div>
                </div>

                <select
                  className="select-field"
                  style={{ minWidth: '180px' }}
                  value={settings.maintenance_mode || 'false'}
                  onChange={(e) => handleChange('maintenance_mode', e.target.value)}
                >
                  <option value="false">Disabled (Normal Operations)</option>
                  <option value="true">Enabled (Maintenance On)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Maintenance Notice Message
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                  value={settings.maintenance_message || 'Platform is under scheduled maintenance. Please check back shortly.'}
                  onChange={(e) => handleChange('maintenance_message', e.target.value)}
                  placeholder="Enter notice message to display on mobile apps during maintenance..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Platform Brand Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={settings.platform_name || 'Umi Live'}
                    onChange={(e) => handleChange('platform_name', e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Client Minimum Supported App Version
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={settings.min_supported_version || '1.0.0'}
                    onChange={(e) => handleChange('min_supported_version', e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveSystem}
                  disabled={savingSystem || saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#3b82f6', borderColor: '#2563eb' }}
                >
                  <Save size={16} />
                  <span>{savingSystem ? 'Saving...' : 'Save System Settings'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1-to-1 P2P Video & Audio Calling & Direct Message Rates Tab */}
      {activeTab === 'calls' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Main Pricing & Configuration Card */}
          <div className="panel-card" style={{ border: '1px solid rgba(16, 185, 129, 0.35)' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">
                <PhoneCall size={22} color="#10b981" />
                <span>1-to-1 P2P Video & Audio Call Rates & Settings</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${settings.call_is_enabled === 'false' ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                  {settings.call_is_enabled === 'false' ? 'Calling Disabled' : 'Calling Active'}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Configure per-minute coin costs for 1-to-1 direct message Audio Calls, Video Calls, and Video Live interactions.
              When a user calls another user in Direct Message, their coin balance is charged per minute and the receiver earns diamonds based on the revenue share percentage.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Master Feature Enable Switch */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#059669', marginBottom: '2px' }}>
                    1-to-1 Calling Service Master Switch
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Allow users to initiate Audio & Video calls inside Direct Message chats
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleChange('call_is_enabled', settings.call_is_enabled === 'false' ? 'true' : 'false')}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: settings.call_is_enabled === 'false' ? '#ef4444' : '#10b981',
                      color: '#fff',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {settings.call_is_enabled === 'false' ? 'Turn On Calling' : 'Calling Enabled (Active)'}
                  </button>
                </div>
              </div>

              {/* Rate Inputs Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {/* Audio Call Rate */}
                <div style={{ background: 'var(--bg-surface-secondary, rgba(255,255,255,0.02))', padding: '1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
                    <Mic size={18} color="#3b82f6" />
                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      Audio Call Rate (Coins / Minute)
                    </label>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '0.65rem' }}>
                    Coins deducted per minute from caller for 1-to-1 Audio calls in Direct Message
                  </p>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      style={{ paddingRight: '55px', fontWeight: 700, fontSize: '1rem', color: '#3b82f6' }}
                      value={settings.call_audio_rate_per_minute || '20'}
                      onChange={(e) => handleChange('call_audio_rate_per_minute', e.target.value)}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      coins/min
                    </span>
                  </div>
                </div>

                {/* Video Call Rate */}
                <div style={{ background: 'var(--bg-surface-secondary, rgba(255,255,255,0.02))', padding: '1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
                    <Video size={18} color="#10b981" />
                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      Video Call Rate (Coins / Minute)
                    </label>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '0.65rem' }}>
                    Coins deducted per minute from caller for 1-to-1 Video calls in Direct Message
                  </p>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      style={{ paddingRight: '55px', fontWeight: 700, fontSize: '1rem', color: '#10b981' }}
                      value={settings.call_video_rate_per_minute || '50'}
                      onChange={(e) => handleChange('call_video_rate_per_minute', e.target.value)}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      coins/min
                    </span>
                  </div>
                </div>

                {/* Video Live Rate */}
                <div style={{ background: 'var(--bg-surface-secondary, rgba(255,255,255,0.02))', padding: '1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
                    <Activity size={18} color="#f59e0b" />
                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      Video Live Rate (Live Interaction Coins / Min)
                    </label>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '0.65rem' }}>
                    Coins deducted per minute for Video Live seat interaction or private session
                  </p>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      style={{ paddingRight: '55px', fontWeight: 700, fontSize: '1rem', color: '#f59e0b' }}
                      value={settings.call_video_live_rate_per_minute || '30'}
                      onChange={(e) => handleChange('call_video_live_rate_per_minute', e.target.value)}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      coins/min
                    </span>
                  </div>
                </div>

                {/* Receiver Revenue Share % */}
                <div style={{ background: 'var(--bg-surface-secondary, rgba(255,255,255,0.02))', padding: '1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
                    <Percent size={18} color="#8b5cf6" />
                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      Receiver Earnings Share (%)
                    </label>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '0.65rem' }}>
                    Percentage of caller's coins awarded to the receiver as diamonds
                  </p>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input-field"
                      style={{ paddingRight: '35px', fontWeight: 700, fontSize: '1rem', color: '#8b5cf6' }}
                      value={settings.call_receiver_earnings_percent || '70'}
                      onChange={(e) => handleChange('call_receiver_earnings_percent', e.target.value)}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      %
                    </span>
                  </div>
                </div>

                {/* Min Balance to Initiate */}
                <div style={{ background: 'var(--bg-surface-secondary, rgba(255,255,255,0.02))', padding: '1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
                    <Coins size={18} color="#eab308" />
                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      Minimum Balance to Start Call (Coins)
                    </label>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '0.65rem' }}>
                    Minimum coin balance required in caller wallet to place an outgoing call
                  </p>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      style={{ paddingRight: '55px', fontWeight: 700, fontSize: '1rem' }}
                      value={settings.call_min_balance_to_start || '20'}
                      onChange={(e) => handleChange('call_min_balance_to_start', e.target.value)}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      coins
                    </span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveCalls}
                  disabled={savingCalls || saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', borderColor: '#059669' }}
                >
                  <Save size={16} />
                  <span>{savingCalls ? 'Saving...' : 'Save 1-to-1 Call Rates'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Call Simulator Card */}
          <div className="panel-card" style={{ border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">
                <Calculator size={22} color="#8b5cf6" />
                <span>Interactive Call Cost & Earnings Simulator</span>
              </div>
              <span className="badge badge-purple" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                Real-Time Preview
              </span>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
              Test how much a user will pay and how much the receiver and platform will earn for a specific call duration.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                  Call Type
                </label>
                <select
                  className="input-field"
                  value={simCallType}
                  onChange={(e) => setSimCallType(e.target.value)}
                >
                  <option value="audio">🎙️ 1-to-1 Audio Call</option>
                  <option value="video">📹 1-to-1 Video Call</option>
                  <option value="live">🎥 Video Live Stream Call</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                  Call Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className="input-field"
                  value={simCallMinutes}
                  onChange={(e) => setSimCallMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
            </div>

            {(() => {
              const audioRate = parseInt(settings.call_audio_rate_per_minute || '20', 10);
              const videoRate = parseInt(settings.call_video_rate_per_minute || '50', 10);
              const liveRate = parseInt(settings.call_video_live_rate_per_minute || '30', 10);
              const rate = simCallType === 'video' ? videoRate : (simCallType === 'live' ? liveRate : audioRate);
              const totalCoins = rate * simCallMinutes;
              const sharePct = parseInt(settings.call_receiver_earnings_percent || '70', 10);
              const receiverDiamonds = Math.floor((totalCoins * sharePct) / 100);
              const platformCoins = totalCoins - receiverDiamonds;

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', padding: '1.25rem', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Caller Pays</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                      {totalCoins} <span style={{ fontSize: '0.85rem' }}>Coins</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{rate} coins × {simCallMinutes} min</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Receiver Earns</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                      {receiverDiamonds} <span style={{ fontSize: '0.85rem' }}>Diamonds</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{sharePct}% revenue share</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Platform Margin</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
                      {platformCoins} <span style={{ fontSize: '0.85rem' }}>Coins</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{100 - sharePct}% retained</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Recent Call Sessions Table */}
          <div className="panel-card">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">
                <Clock size={20} color="#3b82f6" />
                <span>Recent 1-to-1 P2P Call Sessions</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchCallLogs}
                disabled={loadingCallLogs}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={loadingCallLogs ? 'spin' : ''} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {loadingCallLogs ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading call logs...</div>
            ) : callLogs.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                <PhoneCall size={36} color="var(--text-dim)" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No 1-to-1 call sessions recorded yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>Call ID</th>
                      <th>Caller</th>
                      <th>Receiver</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Coins Spent</th>
                      <th>Diamonds Earned</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callLogs.map((c) => {
                      const durFormatted = `${Math.floor((c.duration_seconds || 0) / 60).toString().padStart(2, '0')}:${((c.duration_seconds || 0) % 60).toString().padStart(2, '0')}`;
                      return (
                        <tr key={c.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.call_id?.slice(0, 16)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {c.caller_avatar ? (
                                <img src={c.caller_avatar} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3b82f6', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {c.caller_name?.[0] || 'C'}
                                </div>
                              )}
                              <span>{c.caller_name || `User #${c.caller_id}`}</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {c.receiver_avatar ? (
                                <img src={c.receiver_avatar} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {c.receiver_name?.[0] || 'R'}
                                </div>
                              )}
                              <span>{c.receiver_name || `User #${c.receiver_id}`}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${c.call_type === 'video' ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                              {c.call_type === 'video' ? '📹 Video' : '🎙️ Audio'}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                c.status === 'accepted' || c.status === 'ended'
                                  ? 'badge-success'
                                  : c.status === 'ringing'
                                  ? 'badge-warning'
                                  : 'badge-danger'
                              }`}
                              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{durFormatted}</td>
                          <td style={{ fontWeight: 700, color: '#f59e0b' }}>{c.total_coins_spent || 0}c</td>
                          <td style={{ fontWeight: 700, color: '#10b981' }}>{c.receiver_earned_diamonds || 0}💎</td>
                          <td style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                            {c.created_at ? new Date(c.created_at).toLocaleString() : '-'}
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

      {/* TAB CONTENT 6: SCREEN GUARD & PRIVACY CONTROLS */}
      {activeTab === 'screen_guard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Main Privacy Panel */}
          <div className="panel-card" style={{ border: '1px solid rgba(124, 58, 237, 0.35)' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">
                <Camera size={22} color="#7c3aed" />
                <span>Screen Guard, Anti-Recording & Live Privacy Master Controls</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: settings.app_screen_guard_enabled !== 'false' ? 'rgba(124, 58, 237, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: settings.app_screen_guard_enabled !== 'false' ? '#a78bfa' : '#ef4444',
                    border: settings.app_screen_guard_enabled !== 'false' ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  {settings.app_screen_guard_enabled !== 'false' ? '🛡️ Guard Active' : '⚠️ Guard Off'}
                </span>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveScreenGuard}
                  disabled={savingScreenGuard}
                  style={{ background: '#7c3aed', borderColor: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={15} />
                  <span>{savingScreenGuard ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
              Enforce enterprise-grade content protection against unauthorized screenshots, external screen grabbers, and device screen recorders. Real-time updates push automatically to connected Flutter mobile clients via WebSocket.
            </p>

            {/* Grid of Master Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* App-wide Screen Guard */}
              <div style={{ padding: '1.15rem', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa' }}>
                      <Lock size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        App-Wide Screen Guard
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        Android FLAG_SECURE & iOS Window Security
                      </div>
                    </div>
                  </div>
                  <select
                    className="select-field"
                    style={{ width: '130px', fontWeight: 600 }}
                    value={settings.app_screen_guard_enabled !== 'false' ? 'true' : 'false'}
                    onChange={(e) => handleChange('app_screen_guard_enabled', e.target.value)}
                  >
                    <option value="true">Active (Block)</option>
                    <option value="false">Disabled (Allow)</option>
                  </select>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  When enabled, screenshots and screen recording are completely blocked throughout the entire mobile application.
                </div>
              </div>

              {/* Live Room Screen Guard */}
              <div style={{ padding: '1.15rem', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                      <CameraOff size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        Live Room Privacy Guard
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        Video & Audio Streaming Sessions
                      </div>
                    </div>
                  </div>
                  <select
                    className="select-field"
                    style={{ width: '130px', fontWeight: 600 }}
                    value={settings.live_screen_guard_enabled !== 'false' ? 'true' : 'false'}
                    onChange={(e) => handleChange('live_screen_guard_enabled', e.target.value)}
                  >
                    <option value="true">Active (Block)</option>
                    <option value="false">Disabled (Allow)</option>
                  </select>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  Blocks screenshots and external recordings inside video and audio rooms to protect stream broadcasters.
                </div>
              </div>

              {/* Live Room Screen Recording */}
              <div style={{ padding: '1.15rem', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                      <Video size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        Live Screen Recording
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        Built-in Room Recording Feature
                      </div>
                    </div>
                  </div>
                  <select
                    className="select-field"
                    style={{ width: '130px', fontWeight: 600 }}
                    value={settings.live_screen_record_enabled === 'true' ? 'true' : 'false'}
                    onChange={(e) => handleChange('live_screen_record_enabled', e.target.value)}
                  >
                    <option value="false">Disallowed</option>
                    <option value="true">Allowed</option>
                  </select>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  Toggle whether users or hosts can trigger the in-app screen recording recorder during live broadcasts.
                </div>
              </div>

              {/* Live Room Screen Share */}
              <div style={{ padding: '1.15rem', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                      <Cast size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        Live Screen Share
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        WebRTC Screen Cast Feature
                      </div>
                    </div>
                  </div>
                  <select
                    className="select-field"
                    style={{ width: '130px', fontWeight: 600 }}
                    value={settings.live_screen_share_enabled !== 'false' ? 'true' : 'false'}
                    onChange={(e) => handleChange('live_screen_share_enabled', e.target.value)}
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  Enable or disable the ability for participants to broadcast their device screen during live streaming sessions.
                </div>
              </div>

              {/* Screen Share Permitted Roles */}
              <div style={{ padding: '1.15rem', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                      <Users size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        Screen Share Roles
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        Who Can Broadcast Screen
                      </div>
                    </div>
                  </div>
                  <select
                    className="select-field"
                    style={{ minWidth: '150px', fontWeight: 600 }}
                    value={settings.live_screen_share_roles || 'host_only'}
                    onChange={(e) => handleChange('live_screen_share_roles', e.target.value)}
                  >
                    <option value="host_only">Host Only</option>
                    <option value="host_and_moderator">Host & Moderators</option>
                    <option value="all">All Seated Participants</option>
                  </select>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  Restricts screen broadcasting to authorized room roles to prevent misuse.
                </div>
              </div>

              {/* Dynamic Watermark */}
              <div style={{ padding: '1.15rem', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' }}>
                      <Fingerprint size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        Anti-Leak Watermark
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        User ID & Timestamp Overlay
                      </div>
                    </div>
                  </div>
                  <select
                    className="select-field"
                    style={{ width: '130px', fontWeight: 600 }}
                    value={settings.screen_guard_watermark_enabled !== 'false' ? 'true' : 'false'}
                    onChange={(e) => handleChange('screen_guard_watermark_enabled', e.target.value)}
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  Overlays a subtle dynamic watermark showing the viewer's User ID to trace any unauthorized external recording.
                </div>
              </div>
            </div>
          </div>

          {/* Role-Based Permissions Panel */}
          <div className="panel-card" style={{ border: '1px solid rgba(16, 185, 129, 0.35)' }}>
            <div className="panel-header">
              <div className="panel-title">
                <UserCheck size={22} color="#10b981" />
                <span>Screen Guard Bypass & Role Visibility Permissions</span>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
              Configure which user groups are granted permission to view screen broadcasts when screen guard is toggled off or when role-based exceptions apply:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {/* Host */}
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>👑 Host</div>
                  <select
                    className="select-field"
                    style={{ width: '110px' }}
                    value={settings.screen_guard_allow_host !== 'false' ? 'true' : 'false'}
                    onChange={(e) => handleChange('screen_guard_allow_host', e.target.value)}
                  >
                    <option value="true">Allowed</option>
                    <option value="false">Blocked</option>
                  </select>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  Room owner / host view privileges.
                </span>
              </div>

              {/* Moderator */}
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>🛡️ Moderator</div>
                  <select
                    className="select-field"
                    style={{ width: '110px' }}
                    value={settings.screen_guard_allow_moderator !== 'false' ? 'true' : 'false'}
                    onChange={(e) => handleChange('screen_guard_allow_moderator', e.target.value)}
                  >
                    <option value="true">Allowed</option>
                    <option value="false">Blocked</option>
                  </select>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  Appointed room moderators and supervisors.
                </span>
              </div>

              {/* Agency */}
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>🏢 Agency</div>
                  <select
                    className="select-field"
                    style={{ width: '110px' }}
                    value={settings.screen_guard_allow_agency !== 'false' ? 'true' : 'false'}
                    onChange={(e) => handleChange('screen_guard_allow_agency', e.target.value)}
                  >
                    <option value="true">Allowed</option>
                    <option value="false">Blocked</option>
                  </select>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  Agency managers overseeing their hosts.
                </span>
              </div>

              {/* General Users */}
              <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>👥 General Users</div>
                  <select
                    className="select-field"
                    style={{ width: '110px' }}
                    value={settings.screen_guard_allow_general_users !== 'false' ? 'true' : 'false'}
                    onChange={(e) => handleChange('screen_guard_allow_general_users', e.target.value)}
                  >
                    <option value="true">Allowed</option>
                    <option value="false">Blocked</option>
                  </select>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  Regular audience members in room.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM-WIDE WALLET RESET CONFIRMATION MODAL */}
      {resetModal.isOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !resetModal.loading) {
              setResetModal((prev) => ({ ...prev, isOpen: false }));
            }
          }}
        >
          <div className="modal-box" style={{ maxWidth: '480px', border: '1px solid rgba(239, 68, 68, 0.45)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={22} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {resetModal.title}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                  High Impact System Action
                </span>
              </div>
            </div>

            <div
              style={{
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontSize: '0.82rem',
                color: 'var(--text-main)',
                lineHeight: 1.5,
                marginBottom: '1.25rem',
              }}
            >
              {resetModal.description}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={resetModal.includeAdmins}
                  onChange={(e) => setResetModal((prev) => ({ ...prev, includeAdmins: e.target.checked }))}
                />
                <span>Also reset balances for Admin accounts (default: excluded)</span>
              </label>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Admin Action Security Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter action password (default: admin123)"
                  value={resetModal.actionPassword}
                  onChange={(e) => setResetModal((prev) => ({ ...prev, actionPassword: e.target.value }))}
                  autoFocus
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  Configured under System Security settings (default: <code>admin123</code>).
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={resetModal.loading}
                onClick={() => setResetModal((prev) => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={resetModal.loading || !resetModal.actionPassword}
                onClick={handleExecuteReset}
                style={{
                  background: '#ef4444',
                  borderColor: '#dc2626',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {resetModal.loading ? <RefreshCw size={15} className="spin" /> : <Trash2 size={15} />}
                <span>{resetModal.loading ? 'Resetting...' : 'Confirm & Execute'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
