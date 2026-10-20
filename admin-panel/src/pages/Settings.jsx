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
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

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
      description: 'Diamond conversion, host cashout exchange rates, and revenue sharing rules.',
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
                      <strong>Zero diamond conversion!</strong> Gifts and transfers reward direct <strong>Coins (🪙)</strong>. Hosts retain a configurable percentage and cash out directly from their coin balance into Taka (৳).
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

              {/* Commission Sharing Rules */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                  <Percent size={18} color="#d97706" />
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                    Revenue Sharing & Commissions Breakdown
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Admin Platform Commission (%)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className="input-field"
                        style={{ maxWidth: '140px' }}
                        value={settings.admin_gift_commission_percent || '15.0'}
                        onChange={(e) => handleChange('admin_gift_commission_percent', e.target.value)}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>%</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                      Retained by platform from coin gifts.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Default Agency Commission (%)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className="input-field"
                        style={{ maxWidth: '140px' }}
                        value={settings.agency_gift_commission_percent || '10.0'}
                        onChange={(e) => handleChange('agency_gift_commission_percent', e.target.value)}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>%</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                      Credited to host agency (if assigned).
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Host Remaining Share
                    </label>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', paddingTop: '2px' }}>
                      {hostCoinSharePct.toFixed(1)}%
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                      Credited directly to host wallet.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      User P2P Transfer Fee (%)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className="input-field"
                        style={{ maxWidth: '140px' }}
                        value={settings.user_transfer_commission_percent || '5.0'}
                        onChange={(e) => handleChange('user_transfer_commission_percent', e.target.value)}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>%</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                      Fee on peer-to-peer coin transfers.
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ color: '#ef4444' }}>Admin: {adminGiftPct}%</span>
                    <span style={{ color: '#3b82f6' }}>Agency: {agencyGiftPct}%</span>
                    <span style={{ color: '#10b981' }}>Host Share: {hostCoinSharePct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '12px', borderRadius: '6px', overflow: 'hidden', display: 'flex', background: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ width: `${Math.min(100, adminGiftPct)}%`, background: '#ef4444' }} title={`Admin ${adminGiftPct}%`} />
                    <div style={{ width: `${Math.min(100 - adminGiftPct, agencyGiftPct)}%`, background: '#3b82f6' }} title={`Agency ${agencyGiftPct}%`} />
                    <div style={{ width: `${Math.max(0, hostCoinSharePct)}%`, background: '#10b981' }} title={`Host ${hostCoinSharePct}%`} />
                  </div>
                </div>
              </div>

              {/* Cashout Threshold & Presets */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Minimum {isDiamondMode ? 'Diamonds' : 'Coins'} for Cashout
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      style={{ maxWidth: '200px' }}
                      value={settings.min_withdrawal_diamonds || '1000'}
                      onChange={(e) => handleChange('min_withdrawal_diamonds', e.target.value)}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                      Threshold required before host can submit cashout.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Cashout Presets List
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={settings.withdrawal_presets || '[1000, 2000, 5000, 10000, 25000, 50000]'}
                      onChange={(e) => handleChange('withdrawal_presets', e.target.value)}
                      placeholder="1000, 2000, 5000, 10000, 25000, 50000"
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                      Quick buttons shown on mobile cashout screen.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Allow Custom Manual Input for Withdrawal
                    </label>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="radio"
                          name="allow_manual_withdrawal_input"
                          checked={settings.allow_manual_withdrawal_input !== 'false'}
                          onChange={() => handleChange('allow_manual_withdrawal_input', 'true')}
                        />
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Enabled (Custom Input)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="radio"
                          name="allow_manual_withdrawal_input"
                          checked={settings.allow_manual_withdrawal_input === 'false'}
                          onChange={() => handleChange('allow_manual_withdrawal_input', 'false')}
                        />
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>Disabled (Presets Only)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Recharge Coin Presets
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={settings.recharge_presets || '[500, 1000, 2500, 5000, 10000, 50000, 100000]'}
                      onChange={(e) => handleChange('recharge_presets', e.target.value)}
                      placeholder="[500, 1000, 2500, 5000, 10000, 50000, 100000]"
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                      Quick buy options shown on user wallet recharge screen.
                    </span>
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
                    Duration Plans & Coin Pricing Tiers (কত দিনের জন্য কত কয়েন)
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
    </div>
  );
}
