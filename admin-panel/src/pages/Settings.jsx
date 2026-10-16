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
} from 'lucide-react';
import settingsApi from '../api/settingsApi';
import Loader from '../components/Loader';

export default function Settings({ onToast }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showActionPassword, setShowActionPassword] = useState(false);

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

  const handleSave = async (key, val, desc) => {
    try {
      setSaving(true);
      const res = await settingsApi.updateSetting(key, val, desc);
      if (res.success) {
        onToast(`Setting ${key} saved successfully!`, 'success');
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
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
  const videoRate = videoBase > 0 ? (videoTaka / videoBase) : 0.05;

  const audioBase = parseFloat(settings.audio_host_diamond_base || '100');
  const audioTaka = parseFloat(settings.audio_host_taka_amount || '3.5');
  const audioRate = audioBase > 0 ? (audioTaka / audioBase) : 0.035;

  return (
    <div style={{ maxWidth: '850px' }}>
      <form onSubmit={handleSaveAll}>
        {/* Economics Settings */}
        <div className="panel-card" style={{ border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <div className="panel-header">
            <div className="panel-title">
              <Database size={20} color="#8b5cf6" />
              <span>Platform Economy & Currency Engine</span>
            </div>
            <span
              className={`badge ${isDiamondMode ? 'badge-primary' : 'badge-warning'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              {isDiamondMode ? '💎 Diamond Conversion Active' : '🪙 Direct Coin Split Active'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Economy Mode Selector Cards */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.65rem' }}>
                Select Active Economy System:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Option 1: Diamond Mode */}
                <div
                  onClick={() => handleChange('is_convert_to_diamond', 'true')}
                  style={{
                    padding: '1.1rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: isDiamondMode ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                    background: isDiamondMode ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-primary)',
                    boxShadow: isDiamondMode ? '0 0 15px rgba(139, 92, 246, 0.2)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: isDiamondMode ? '#a78bfa' : 'var(--text-main)', fontSize: '0.95rem' }}>
                      <Gem size={18} color="#8b5cf6" />
                      <span>Diamond Conversion Mode</span>
                    </div>
                    {isDiamondMode && <CheckCircle2 size={18} color="#8b5cf6" />}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.45, margin: 0 }}>
                    Coins sent by users automatically convert into <strong>Diamonds (💎)</strong> for hosts based on the set ratio. Hosts accumulate diamonds and request cashout withdrawals.
                  </p>
                </div>

                {/* Option 2: Direct Coin Commission Mode */}
                <div
                  onClick={() => handleChange('is_convert_to_diamond', 'false')}
                  style={{
                    padding: '1.1rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: !isDiamondMode ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                    background: !isDiamondMode ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-primary)',
                    boxShadow: !isDiamondMode ? '0 0 15px rgba(245, 158, 11, 0.2)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: !isDiamondMode ? '#fbbf24' : 'var(--text-main)', fontSize: '0.95rem' }}>
                      <Coins size={18} color="#f59e0b" />
                      <span>Direct Coin & Commission Mode</span>
                    </div>
                    {!isDiamondMode && <CheckCircle2 size={18} color="#f59e0b" />}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.45, margin: 0 }}>
                    <strong>No diamond conversion!</strong> Gifts and transfers reward direct <strong>Coins (🪙)</strong>. Hosts can withdraw directly from their coin balance.
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-panel 1: Diamond Mode Controls */}
            {isDiamondMode && (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '10px',
                  background: 'rgba(139, 92, 246, 0.04)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.92rem', color: '#c4b5fd' }}>
                  <Sparkles size={18} color="#8b5cf6" />
                  <span>💎 Diamond Economy & Host Cashout Rules</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Coin to Diamond Conversion Ratio
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="input-field"
                        style={{ maxWidth: '140px' }}
                        value={settings.coin_to_diamond_ratio || '1.0'}
                        onChange={(e) => handleChange('coin_to_diamond_ratio', e.target.value)}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        100 Coins = <strong style={{ color: '#a78bfa' }}>{(100 * coinRatio).toFixed(0)} Diamonds</strong>
                      </span>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Diamond to USD Cashout Rate
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="input-field"
                        style={{ maxWidth: '140px' }}
                        value={settings.diamond_to_usd_rate || '0.005'}
                        onChange={(e) => handleChange('diamond_to_usd_rate', e.target.value)}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        1 Diamond = ${(parseFloat(settings.diamond_to_usd_rate || '0.005')).toFixed(4)} USD
                      </span>
                    </div>
                  </div>
                </div>

                {/* Host Diamond-to-BDT Conversion Rules */}
                <div style={{ borderTop: '1px solid rgba(139, 92, 246, 0.2)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.86rem', color: '#ddd6fe', marginBottom: '0.75rem' }}>
                    <Sliders size={16} />
                    <span>Host Diamond Payout Rules (Diamonds 💎 = Taka ৳ BDT)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {/* Video Host Rule */}
                    <div style={{ padding: '0.9rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#0284c7', fontSize: '0.86rem', marginBottom: '0.5rem' }}>
                        <Video size={15} />
                        <span>🎥 Video Host Conversion Rule</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Base Diamonds (💎):</label>
                          <input
                            type="number"
                            min="1"
                            className="input-field"
                            value={settings.video_host_diamond_base || '100'}
                            onChange={(e) => handleChange('video_host_diamond_base', e.target.value)}
                          />
                        </div>
                        <span style={{ color: 'var(--text-dim)', paddingTop: '16px' }}>=</span>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Payout (৳ BDT):</label>
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
                      <div style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600 }}>
                        ⚡ 1 Diamond = ৳{videoRate.toFixed(6)} BDT (100 💎 = ৳{(100 * videoRate).toFixed(2)} BDT)
                      </div>
                    </div>

                    {/* Audio Host Rule */}
                    <div style={{ padding: '0.9rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#10b981', fontSize: '0.86rem', marginBottom: '0.5rem' }}>
                        <Mic size={15} />
                        <span>🎙️ Audio Host Conversion Rule</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Base Diamonds (💎):</label>
                          <input
                            type="number"
                            min="1"
                            className="input-field"
                            value={settings.audio_host_diamond_base || '100'}
                            onChange={(e) => handleChange('audio_host_diamond_base', e.target.value)}
                          />
                        </div>
                        <span style={{ color: 'var(--text-dim)', paddingTop: '16px' }}>=</span>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Payout (৳ BDT):</label>
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
                      <div style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>
                        ⚡ 1 Diamond = ৳{audioRate.toFixed(6)} BDT (100 💎 = ৳{(100 * audioRate).toFixed(2)} BDT)
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Minimum Diamonds for Cashout Request
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      className="input-field"
                      style={{ maxWidth: '160px' }}
                      value={settings.min_withdrawal_diamonds || '1000'}
                      onChange={(e) => handleChange('min_withdrawal_diamonds', e.target.value)}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                      Hosts cannot submit withdrawal requests below this diamond balance.
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Withdrawal Presets (💎 Preset Amounts)
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="input-field"
                      style={{ maxWidth: '350px' }}
                      placeholder="1000, 2000, 5000, 10000, 25000, 50000"
                      value={settings.withdrawal_presets || '[1000, 2000, 5000, 10000, 25000, 50000]'}
                      onChange={(e) => handleChange('withdrawal_presets', e.target.value)}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                      Preset diamond amounts displayed on mobile cashout screen.
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Allow Manual Custom Amount Input for Withdrawal
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="radio"
                        name="allow_manual_withdrawal_input"
                        checked={settings.allow_manual_withdrawal_input !== 'false'}
                        onChange={() => handleChange('allow_manual_withdrawal_input', 'true')}
                      />
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>Enabled (Hosts can input custom amount)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="radio"
                        name="allow_manual_withdrawal_input"
                        checked={settings.allow_manual_withdrawal_input === 'false'}
                        onChange={() => handleChange('allow_manual_withdrawal_input', 'false')}
                      />
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>Disabled (Preset amounts only)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Quick Recharge Presets (Coin amounts for recharge desk & store)
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="input-field"
                      style={{ maxWidth: '350px' }}
                      placeholder="[500, 1000, 2500, 5000, 10000, 50000, 100000]"
                      value={settings.recharge_presets || '[500, 1000, 2500, 5000, 10000, 50000, 100000]'}
                      onChange={(e) => handleChange('recharge_presets', e.target.value)}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                      JSON array or comma-separated coin amounts.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-panel 2: Direct Coin & Commission Controls */}
            {!isDiamondMode && (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.04)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.35rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.92rem', color: '#fcd34d' }}>
                  <Coins size={18} color="#f59e0b" />
                  <span>🪙 Direct Coin Commission & Cashout Withdrawal Engine</span>
                </div>

                {/* Direct Coin Cashout Conversion Rules (e.g. 100 Coins = 5 Taka) */}
                <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem', color: '#fbbf24', marginBottom: '0.4rem' }}>
                    <Sliders size={16} />
                    <span>Direct Coin Withdrawal Payout Rules (Coins 🪙 = Taka ৳ BDT)</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0 0 1rem 0' }}>
                    Configure how many coins equal how many Taka for cashouts (e.g. <strong>100 Coins = 5 Taka</strong>). Streamers can cash out directly from their coin balance.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {/* Video Host Coin Rule */}
                    <div style={{ padding: '0.9rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#0284c7', fontSize: '0.86rem', marginBottom: '0.5rem' }}>
                        <Video size={15} />
                        <span>🎥 Video Host Coin Cashout Rule</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Base Coins (🪙):</label>
                          <input
                            type="number"
                            min="1"
                            className="input-field"
                            value={settings.video_host_diamond_base || '100'}
                            onChange={(e) => handleChange('video_host_diamond_base', e.target.value)}
                          />
                        </div>
                        <span style={{ color: 'var(--text-dim)', paddingTop: '16px' }}>=</span>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Payout (৳ BDT):</label>
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
                      <div style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600 }}>
                        ⚡ 1 Coin = ৳{videoRate.toFixed(6)} BDT (100 🪙 = ৳{(100 * videoRate).toFixed(2)} BDT)
                      </div>
                    </div>

                    {/* Audio Host Coin Rule */}
                    <div style={{ padding: '0.9rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#10b981', fontSize: '0.86rem', marginBottom: '0.5rem' }}>
                        <Mic size={15} />
                        <span>🎙️ Audio Host Coin Cashout Rule</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Base Coins (🪙):</label>
                          <input
                            type="number"
                            min="1"
                            className="input-field"
                            value={settings.audio_host_diamond_base || '100'}
                            onChange={(e) => handleChange('audio_host_diamond_base', e.target.value)}
                          />
                        </div>
                        <span style={{ color: 'var(--text-dim)', paddingTop: '16px' }}>=</span>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Payout (৳ BDT):</label>
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
                      <div style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>
                        ⚡ 1 Coin = ৳{audioRate.toFixed(6)} BDT (100 🪙 = ৳{(100 * audioRate).toFixed(2)} BDT)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coin Cashout Threshold & Presets */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Minimum Coins for Cashout Request
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        className="input-field"
                        style={{ maxWidth: '140px' }}
                        value={settings.min_withdrawal_diamonds || '1000'}
                        onChange={(e) => handleChange('min_withdrawal_diamonds', e.target.value)}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        Minimum coin balance required for cashout.
                      </span>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Coin to USD Cashout Rate
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="input-field"
                        style={{ maxWidth: '140px' }}
                        value={settings.diamond_to_usd_rate || '0.005'}
                        onChange={(e) => handleChange('diamond_to_usd_rate', e.target.value)}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        1 Coin = ${(parseFloat(settings.diamond_to_usd_rate || '0.005')).toFixed(4)} USD
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Withdrawal Presets (🪙 Coin Amounts)
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="input-field"
                      style={{ maxWidth: '350px' }}
                      placeholder="1000, 2000, 5000, 10000, 25000, 50000"
                      value={settings.withdrawal_presets || '[1000, 2000, 5000, 10000, 25000, 50000]'}
                      onChange={(e) => handleChange('withdrawal_presets', e.target.value)}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                      JSON array or comma-separated list of preset coin amounts.
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Allow Manual Custom Amount Input for Withdrawal
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="radio"
                        name="allow_manual_withdrawal_input"
                        checked={settings.allow_manual_withdrawal_input !== 'false'}
                        onChange={() => handleChange('allow_manual_withdrawal_input', 'true')}
                      />
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>Enabled (Hosts can input custom amount)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="radio"
                        name="allow_manual_withdrawal_input"
                        checked={settings.allow_manual_withdrawal_input === 'false'}
                        onChange={() => handleChange('allow_manual_withdrawal_input', 'false')}
                      />
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>Disabled (Preset amounts only)</span>
                    </label>
                  </div>
                </div>

                {/* Gift Revenue Sharing Section */}
                <div style={{ borderTop: '1px solid rgba(245, 158, 11, 0.2)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.88rem', color: '#fcd34d', marginBottom: '0.75rem' }}>
                    <Percent size={16} />
                    <span>Direct Coin Commission Breakdown (Gift Revenue Sharing)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
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
                        Deducted from every gift sent to hosts.
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
                        Transferred to host agency (if host belongs to an agency).
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                        Host Remaining Coins Share
                      </label>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', paddingTop: '4px' }}>
                        {hostCoinSharePct.toFixed(1)}%
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                        Directly credited to host's coin wallet.
                      </span>
                    </div>
                  </div>

                  {/* Visual Commission Bar */}
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      <span>Platform: {adminGiftPct}%</span>
                      <span>Agency: {agencyGiftPct}%</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>Host: {hostCoinSharePct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.1)' }}>
                      <div style={{ width: `${Math.min(100, adminGiftPct)}%`, background: '#ef4444' }} title={`Admin ${adminGiftPct}%`} />
                      <div style={{ width: `${Math.min(100 - adminGiftPct, agencyGiftPct)}%`, background: '#3b82f6' }} title={`Agency ${agencyGiftPct}%`} />
                      <div style={{ width: `${Math.max(0, hostCoinSharePct)}%`, background: '#10b981' }} title={`Host ${hostCoinSharePct}%`} />
                    </div>
                  </div>
                </div>

                {/* P2P User Transfer Fee */}
                <div style={{ paddingTop: '0.5rem', borderTop: '1px dashed rgba(245, 158, 11, 0.2)' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    User-to-User Coin Transfer Admin Fee (%)
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
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                      % fee taken by platform when user sends coins to another user.
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Quick Recharge Presets (Coin amounts for recharge desk & store)
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="input-field"
                      style={{ maxWidth: '350px' }}
                      placeholder="[500, 1000, 2500, 5000, 10000, 50000, 100000]"
                      value={settings.recharge_presets || '[500, 1000, 2500, 5000, 10000, 50000, 100000]'}
                      onChange={(e) => handleChange('recharge_presets', e.target.value)}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                      JSON array or comma-separated coin amounts.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security & Finance Action Password Configuration */}
        <div className="panel-card" style={{ border: '1px solid rgba(124, 58, 237, 0.3)', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.04) 0%, rgba(2, 132, 199, 0.04) 100%)' }}>
          <div className="panel-header">
            <div className="panel-title">
              <Lock size={20} color="#7c3aed" />
              <span>Security Action Password (Coin Recharge & Deductions)</span>
            </div>
            <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>Critical Security</span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            This security password is required whenever administrators <strong>recharge coins</strong> for users or <strong>deduct coins / diamonds</strong> from user balances. Only administrators with this password can authorize financial changes.
          </p>

          <div style={{ maxWidth: '440px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Admin Action Password
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showActionPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ width: '100%', paddingRight: '2.5rem', fontFamily: 'var(--font-mono)' }}
                  placeholder="Enter security password (e.g. admin123)..."
                  value={settings.action_security_password || 'admin123'}
                  onChange={(e) => handleChange('action_security_password', e.target.value)}
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
                className="btn btn-secondary btn-sm"
                onClick={() => handleSave('action_security_password', settings.action_security_password || 'admin123', 'Security action password required for coin recharge and balance deductions')}
                disabled={saving}
                style={{ whiteSpace: 'nowrap' }}
              >
                Save Password
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
              Default: <code style={{ color: '#c4b5fd' }}>admin123</code>. You can change this to any secure alphanumeric key.
            </span>
          </div>
        </div>

        {/* Live Streaming Engine */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <Server size={20} color="#06b6d4" />
              <span>LiveKit & WebRTC Streaming Engine</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Streaming Infrastructure Provider
              </label>
              <select
                className="select-field"
                style={{ maxWidth: '300px' }}
                value={settings.live_stream_provider || 'livekit'}
                onChange={(e) => handleChange('live_stream_provider', e.target.value)}
              >
                <option value="livekit">LiveKit Cloud / Self-hosted WebRTC</option>
                <option value="agora">Agora RTC Engine</option>
                <option value="rtmp">Native RTMP / HLS Streamer</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Platform Display Name
              </label>
              <input
                type="text"
                className="input-field"
                style={{ maxWidth: '300px' }}
                value={settings.platform_name || 'Umi Live'}
                onChange={(e) => handleChange('platform_name', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <Shield size={20} color="#f59e0b" />
              <span>Platform Maintenance Mode</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Maintenance Mode</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                When activated, regular client apps will display a scheduled maintenance screen.
              </div>
            </div>

            <select
              className="select-field"
              value={settings.maintenance_mode || 'false'}
              onChange={(e) => handleChange('maintenance_mode', e.target.value)}
            >
              <option value="false">Disabled (Normal Operations)</option>
              <option value="true">Enabled (Maintenance On)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
          disabled={saving}
        >
          <Save size={18} />
          <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </form>
    </div>
  );
}
