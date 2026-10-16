import React from 'react';
import {
  Radio,
  Users,
  Coins,
  CreditCard,
  Flame,
  Gift,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Loader from '../components/Loader';

export default function Dashboard({ stats, onNavigate, onTerminateStream }) {
  if (!stats) {
    return <Loader text="Analyzing Umi Live real-time telemetry..." size="lg" />;
  }

  const usersStats = stats?.users || { total: 0, hosts: 0, banned: 0 };
  const streamsStats = stats?.streams || { active: 0, total: 0, liveViewers: 0 };
  const financials = stats?.financials || { coinsSold: 0, giftCoinsSpent: 0, pendingWithdrawalCount: 0, pendingWithdrawalUsd: '0.00' };
  const recentGifts = stats?.recentGifts || [];
  const activeStreams = stats?.activeStreams || [];

  return (
    <div>
      {/* 4 Top KPI Cards */}
      <div className="stats-grid">
        <StatCard
          label="Active Live Streams"
          value={streamsStats.active}
          subtext={`👀 ${streamsStats.liveViewers.toLocaleString()} total live viewers`}
          icon={Radio}
          iconColor="#f43f5e"
          bgColor="rgba(244, 63, 94, 0.15)"
        />

        <StatCard
          label="Total Registered Users"
          value={usersStats.total}
          subtext={`🌟 ${usersStats.hosts} certified hosts`}
          icon={Users}
          iconColor="#8b5cf6"
          bgColor="rgba(139, 92, 246, 0.15)"
        />

        <StatCard
          label="Coins Purchased"
          value={Number(financials.coinsSold).toLocaleString()}
          subtext={`🎁 ${Number(financials.giftCoinsSpent).toLocaleString()} coins gifted`}
          icon={Coins}
          iconColor="#f59e0b"
          bgColor="rgba(245, 158, 11, 0.15)"
        />

        <StatCard
          label="Pending Withdrawals"
          value={`$${financials.pendingWithdrawalUsd}`}
          subtext={`💳 ${financials.pendingWithdrawalCount} requests pending`}
          icon={CreditCard}
          iconColor="#10b981"
          bgColor="rgba(16, 185, 129, 0.15)"
        />
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
              <span>View All</span>
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
                      Host: <strong style={{ color: 'var(--text-main)', whiteSpace: 'nowrap' }}>ID: #{stream.host_id} • {stream.host_name}</strong> • 💎 {stream.total_diamonds}
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
                    <div style={{ color: '#06b6d4', fontSize: '0.72rem' }}>
                      💎 +{tx.diamond_amount}
                    </div>
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
