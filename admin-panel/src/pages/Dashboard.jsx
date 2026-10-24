import React, { useState, useEffect } from 'react';
import {
  Radio,
  Users,
  Coins,
  CreditCard,
  Flame,
  Gift,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  RefreshCw,
  Wallet,
  TrendingUp,
  Filter,
  Sparkles,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Loader from '../components/Loader';
import dashboardApi from '../api/dashboardApi';
import { useEconomy } from '../context/EconomyContext';
import { useBranding } from '../context/BrandingContext';

export default function Dashboard({ stats: initialStats, onNavigate, onTerminateStream }) {
  const { isDiamondMode } = useEconomy();
  const { brandName } = useBranding();
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(!initialStats);
  const [period, setPeriod] = useState('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync initialStats when prop updates
  useEffect(() => {
    if (initialStats && period === 'all' && !startDate && !endDate) {
      setStats(initialStats);
    }
  }, [initialStats]);

  const fetchFilteredStats = async (selectedPeriod = period, customStart = startDate, customEnd = endDate) => {
    try {
      setIsRefreshing(true);
      const params = { period: selectedPeriod };
      if (selectedPeriod === 'custom' && customStart) {
        params.start_date = customStart;
        if (customEnd) params.end_date = customEnd;
      }
      const res = await dashboardApi.getStats(params);
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn('Dashboard stats refresh error:', err.message);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      fetchFilteredStats(newPeriod);
    }
  };

  const handleCustomFilterApply = (e) => {
    e.preventDefault();
    if (!startDate) return;
    fetchFilteredStats('custom', startDate, endDate);
  };

  if (loading && !stats) {
    return <Loader text={`Analyzing ${brandName} real-time telemetry...`} size="lg" />;
  }

  const usersStats = stats?.users || {
    total: 0,
    hosts: 0,
    banned: 0,
    newUsers: 0,
    totalCoins: 0,
    totalDiamonds: 0,
    hostCoins: 0,
    regularUserCoins: 0,
  };

  const streamsStats = stats?.streams || { active: 0, total: 0, liveViewers: 0 };

  const financials = stats?.financials || {
    coinsSold: 0,
    adminCommission: 0,
    giftCoinsSpent: 0,
    coinSalesCount: 0,
    commissionCount: 0,
    allTimeCoinsSold: 0,
    allTimeAdminCommission: 0,
    totalUserCoins: 0,
    pendingWithdrawalCount: 0,
    pendingWithdrawalUsd: '0.00',
  };

  const recentGifts = stats?.recentGifts || [];
  const activeStreams = stats?.activeStreams || [];

  const getPeriodLabel = () => {
    switch (period) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'week':
        return 'Past 7 Days';
      case 'month':
        return 'Past 30 Days';
      case 'custom':
        return startDate ? `${startDate} to ${endDate || 'Now'}` : 'Custom Range';
      default:
        return 'All Time';
    }
  };

  return (
    <div>
      {/* Dashboard Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1rem 1.25rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.95rem' }}>
            <Filter size={18} color="var(--primary)" />
            <span>Time Filter:</span>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: '30 Days' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePeriodChange(p.id)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: active ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    background: active ? 'var(--primary)' : 'var(--bg-primary)',
                    color: active ? '#ffffff' : 'var(--text-muted)',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchFilteredStats()}
            disabled={isRefreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Refresh metrics"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Custom Date Pickers Drawer */}
        {period === 'custom' && (
          <form
            onSubmit={handleCustomFilterApply}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-color)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From:</span>
              <input
                type="date"
                className="input-field"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To:</span>
              <input
                type="date"
                className="input-field"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-sm" disabled={isRefreshing}>
              <span>Apply Range</span>
            </button>
          </form>
        )}
      </div>

      {/* 6 Top KPI Metrics Cards */}
      <div className="stats-grid">
        {/* 1. Coins Sold */}
        <StatCard
          label={`Coins Sold (${getPeriodLabel()})`}
          value={Number(financials.coinsSold || 0).toLocaleString()}
          subtext={`🛒 ${financials.coinSalesCount || 0} sales • All-Time: ${Number(financials.allTimeCoinsSold || 0).toLocaleString()}`}
          icon={Coins}
          iconColor="#f59e0b"
          bgColor="rgba(245, 158, 11, 0.15)"
        />

        {/* 2. Total User Coins (Current Circulation) */}
        <StatCard
          label="Total User Coins (Circulation)"
          value={Number(usersStats.totalCoins || financials.totalUserCoins || 0).toLocaleString()}
          subtext={`👑 Hosts: ${Number(usersStats.hostCoins || 0).toLocaleString()} • 👤 Users: ${Number(usersStats.regularUserCoins || 0).toLocaleString()}`}
          icon={Wallet}
          iconColor="#10b981"
          bgColor="rgba(16, 185, 129, 0.15)"
        />

        {/* 3. Total Admin Commission */}
        <StatCard
          label={`Admin Commission (${getPeriodLabel()})`}
          value={`${Number(financials.adminCommission || 0).toLocaleString()} Coins`}
          subtext={`💼 ${financials.commissionCount || 0} events • All-Time: ${Number(financials.allTimeAdminCommission || 0).toLocaleString()} Coins`}
          icon={TrendingUp}
          iconColor="#8b5cf6"
          bgColor="rgba(139, 92, 246, 0.15)"
        />

        {/* 4. Total Registered Users */}
        <StatCard
          label="Total Registered Users"
          value={Number(usersStats.total || 0).toLocaleString()}
          subtext={`🌟 ${usersStats.hosts} certified hosts • ➕ ${usersStats.newUsers || 0} in period`}
          icon={Users}
          iconColor="#3b82f6"
          bgColor="rgba(59, 130, 246, 0.15)"
        />

        {/* 5. Active Live Streams */}
        <StatCard
          label="Active Live Streams"
          value={streamsStats.active}
          subtext={`👀 ${Number(streamsStats.liveViewers || 0).toLocaleString()} live viewers • 📻 ${streamsStats.total} total`}
          icon={Radio}
          iconColor="#f43f5e"
          bgColor="rgba(244, 63, 94, 0.15)"
        />

        {/* 6. Pending Withdrawals */}
        {(() => {
          const pendingCoins = Number(financials.pendingWithdrawalCoins || 0);
          const pendingDiamonds = Number(financials.pendingWithdrawalDiamonds || 0);
          const pendingCount = financials.pendingWithdrawalCount || 0;

          if (isDiamondMode) {
            return (
              <StatCard
                label="Pending Diamond Withdrawals"
                value={`${pendingDiamonds.toLocaleString()} 💎`}
                subtext={`💳 ${pendingCount} payout requests pending`}
                icon={Sparkles}
                iconColor="#06b6d4"
                bgColor="rgba(6, 182, 212, 0.15)"
              />
            );
          }

          return (
            <StatCard
              label="Pending Coin Withdrawals"
              value={`${pendingCoins.toLocaleString()} 🪙`}
              subtext={`💳 ${pendingCount} payout requests pending`}
              icon={Coins}
              iconColor="#f59e0b"
              bgColor="rgba(245, 158, 11, 0.15)"
            />
          );
        })()}
      </div>

      <div className="dashboard-columns-grid">
        {/* Active Streams Monitoring Radar */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <Flame size={20} color="#f43f5e" />
              <span>Real-Time Active Live Streams</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('streams')}
            >
              <span>View All Streams</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {activeStreams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
              <Radio size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p>No streams currently live</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeStreams.map((stream) => (
                <div
                  key={stream.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.85rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <img
                    src={stream.background_image_url || stream.background_image || stream.cover_image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'}
                    alt={stream.title}
                    style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover' }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span className="badge badge-primary">{stream.category}</span>
                      <span style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span className="pulsing-dot" /> {stream.viewer_count} viewers
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {stream.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Host: <strong style={{ color: 'var(--text-main)', whiteSpace: 'nowrap' }}>ID: #{stream.host_id} • {stream.host_name}</strong>{isDiamondMode ? ` • 💎 ${stream.total_diamonds}` : ''}
                    </div>
                  </div>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onTerminateStream(stream.room_id)}
                    title="Force terminate this stream"
                  >
                    <ShieldAlert size={14} />
                    <span>Terminate</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Gifting Feed */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <Gift size={20} color="#8b5cf6" />
              <span>Recent Live Gifting Feed</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('gifts')}
            >
              <span>Manage Gifts</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {recentGifts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
              <Gift size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p>No gift transactions recorded yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentGifts.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}>
                      🎁
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        <span style={{ color: '#6d28d9', fontWeight: 600, whiteSpace: 'nowrap' }}>ID: #{tx.sender_id} {tx.sender_name}</span> sent <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{tx.gift_name}</span> to <span style={{ color: '#0284c7', fontWeight: 600, whiteSpace: 'nowrap' }}>ID: #{tx.receiver_id} {tx.receiver_name}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {new Date(tx.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem' }}>
                      🪙 {tx.coin_amount}
                    </div>
                    {isDiamondMode && (
                      <div style={{ color: '#06b6d4', fontSize: '0.72rem' }}>
                        💎 +{tx.diamond_amount}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
