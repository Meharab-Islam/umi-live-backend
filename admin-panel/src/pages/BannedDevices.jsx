import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, Search, RefreshCw, ShieldCheck, Users, Clock } from 'lucide-react';
import { deviceApi } from '../api/deviceApi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';

const card = {
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--border, #e5e7eb)',
  borderRadius: 16,
  padding: 16,
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toLocaleString();
};

export default function BannedDevices({ onToast }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await deviceApi.getBannedDevices({ page, limit: pageSize, search: query });
      if (res?.success) {
        setDevices(res.devices || []);
        setTotal(res.pagination?.total || 0);
      } else {
        onToast?.(res?.message || 'Failed to load banned devices', 'error');
      }
    } catch {
      onToast?.('Failed to connect to backend', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const unban = async (device) => {
    const who = device.accounts_count > 1 ? `${device.accounts_count} accounts` : 'this account';
    if (!window.confirm(`Unban "${device.device_model}"?\nThe device will be able to log in again (${who}).`)) return;
    setBusyId(device.device_id);
    try {
      const res = await deviceApi.unbanDevices(device.device_id);
      if (res?.success) {
        onToast?.(res.message || 'Device unbanned', 'success');
        if (devices.length === 1 && page > 1) setPage(page - 1);
        else load();
      } else {
        onToast?.(res?.message || 'Failed to unban device', 'error');
      }
    } catch {
      onToast?.('Failed to unban device', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={22} /> Banned Devices
          </h2>
          <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: 13 }}>
            Hardware devices blocked from the app. Unban a device to let it log in again.
          </p>
        </div>
        <button
          onClick={load}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border, #e5e7eb)', background: 'transparent', cursor: 'pointer' }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
        style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <Search size={16} style={{ opacity: 0.6 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user name, email, user ID, device model or ID…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14 }}
        />
        <button type="submit" style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          Search
        </button>
      </form>

      {loading ? (
        <Loader />
      ) : devices.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40, opacity: 0.75 }}>
          <ShieldCheck size={34} style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 700 }}>No banned devices</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {devices.map((d) => (
            <div key={d.device_id} style={{ ...card, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'grid', placeItems: 'center' }}>
                <Smartphone size={22} />
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontWeight: 800 }}>
                  {d.device_model}{' '}
                  <span style={{ fontWeight: 600, opacity: 0.6, fontSize: 12 }}>
                    {[d.os_type, d.os_version].filter(Boolean).join(' ')}
                  </span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.6, wordBreak: 'break-all' }}>{d.device_id}</div>
                {d.ban_reason ? <div style={{ fontSize: 12, marginTop: 4 }}>Reason: {d.ban_reason}</div> : null}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> Banned {fmtDate(d.banned_at)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={12} />
                    {d.accounts.length
                      ? d.accounts.map((a) => `#${a.id} ${a.full_name}`.trim()).join(', ')
                      : `${d.accounts_count} account(s)`}
                  </span>
                </div>
              </div>

              <button
                onClick={() => unban(d)}
                disabled={busyId === d.device_id}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: busyId === d.device_id ? 0.6 : 1 }}
              >
                <ShieldCheck size={16} /> {busyId === d.device_id ? 'Unbanning…' : 'Unban'}
              </button>
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
      />
    </div>
  );
}
