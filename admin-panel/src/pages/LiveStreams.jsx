import React, { useState, useEffect } from 'react';
import { Radio, Search, Filter, ShieldAlert, CheckCircle, Eye, User, Sparkles } from 'lucide-react';
import streamApi from '../api/streamApi';
import Loader from '../components/Loader';
import { useEconomy } from '../context/EconomyContext';

export default function LiveStreams({ onToast }) {
  const { isDiamondMode } = useEconomy();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('live');
  const [search, setSearch] = useState('');
  const [terminatingRoomId, setTerminatingRoomId] = useState(null);
  const [terminateReason, setTerminateReason] = useState('Community Guidelines Violation');

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const res = await streamApi.getStreams({ status: statusFilter, limit: 30 });
      if (res.success) {
        setStreams(res.streams);
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, [statusFilter]);

  const handleTerminate = async () => {
    if (!terminatingRoomId) return;
    try {
      const res = await streamApi.terminateStream(terminatingRoomId, terminateReason);
      if (res.success) {
        onToast(`Stream terminated successfully: ${terminatingRoomId}`, 'success');
        setTerminatingRoomId(null);
        fetchStreams();
      }
    } catch (err) {
      onToast(err.message, 'error');
    }
  };

  const filteredStreams = streams.filter(s =>
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.host_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.room_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Filters & Search Toolbar */}
      <div className="panel-card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
            <div className="search-input-wrap" style={{ flex: 1 }}>
              <Search size={16} />
              <input
                type="text"
                className="input-field"
                placeholder="Search stream title, host or room ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="var(--text-dim)" />
              <select
                className="select-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="live">Live Now</option>
                <option value="ended">Ended</option>
                <option value="blocked">Terminated / Blocked</option>
                <option value="all">All Streams</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Showing {filteredStreams.length} streams
            </span>
          </div>
        </div>
      </div>

      {/* Stream Cards Grid */}
      {loading ? (
        <Loader text="Loading live streams..." size="lg" />
      ) : filteredStreams.length === 0 ? (
        <div className="panel-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Radio size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <h3>No streams found</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            {statusFilter === 'live' ? 'There are currently no live broadcasts running.' : 'No historical streams match the criteria.'}
          </p>
        </div>
      ) : (
        <div className="stream-grid">
          {filteredStreams.map((stream) => (
            <div key={stream.id} className="stream-card">
              <div className="stream-cover-wrap">
                <img
                  src={stream.background_image_url || stream.background_image || stream.cover_image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'}
                  alt={stream.title}
                  className="stream-cover"
                />
                {stream.status === 'live' ? (
                  <>
                    <div className="stream-live-badge">
                      <span className="pulsing-dot" /> LIVE
                    </div>
                    <div className="stream-viewer-badge">
                      <Eye size={12} /> {stream.viewer_count}
                    </div>
                  </>
                ) : (
                  <div style={{
                    position: 'absolute',
                    top: '0.75rem',
                    left: '0.75rem',
                    background: stream.status === 'blocked' ? 'rgba(244, 63, 94, 0.9)' : 'rgba(100, 116, 139, 0.9)',
                    color: '#fff',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}>
                    {stream.status.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="stream-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span className="badge badge-primary">{stream.category}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    {new Date(stream.started_at).toLocaleTimeString()}
                  </span>
                </div>

                <div className="stream-title" title={stream.title}>
                  {stream.title}
                </div>

                <div className="stream-host-info">
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: '#6d28d9',
                    background: 'rgba(124, 58, 237, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}>
                    ID: #{stream.host_id}
                  </span>
                  <img
                    src={stream.host_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                    alt={String(stream.host_id)}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {stream.host_name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      Room: {stream.room_id}
                    </div>
                  </div>
                  {isDiamondMode && (
                    <div style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 700 }}>
                      💎 {stream.total_diamonds}
                    </div>
                  )}
                </div>

                {stream.status === 'live' && (
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    onClick={() => setTerminatingRoomId(stream.room_id)}
                  >
                    <ShieldAlert size={14} />
                    <span>Force Terminate</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Moderation Terminate Modal */}
      {terminatingRoomId && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#e11d48', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} />
              <span>Force Terminate Live Stream</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              This will immediately cut off the live video stream for Room: <strong>{terminatingRoomId}</strong> and notify connected audience.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Reason for Moderation Action:
              </label>
              <select
                className="select-field"
                style={{ width: '100%' }}
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
              >
                <option value="Community Guidelines Violation">Community Guidelines Violation</option>
                <option value="Inappropriate Content or Nudity">Inappropriate Content or Nudity</option>
                <option value="Copyright Infringement">Copyright Infringement</option>
                <option value="Harassment or Hate Speech">Harassment or Hate Speech</option>
                <option value="Underage Streaming Violation">Underage Streaming Violation</option>
                <option value="Emergency Broadcast Interruption">Emergency Broadcast Interruption</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setTerminatingRoomId(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleTerminate}
              >
                Terminate Stream Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
