import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Gamepad2,
  Save,
  PlugZap,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Search,
} from 'lucide-react';
import agxGamesApi from '../api/agxGamesApi';
import { getApiBase } from '../api/client';
import Loader from '../components/Loader';

const fmt = (n) => Number(n || 0).toLocaleString();

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: 42, height: 24, borderRadius: 999, position: 'relative', transition: 'background .2s',
          background: checked ? 'var(--accent-green, #22c55e)' : 'var(--border-color, #444)',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3, width: 18, height: 18, borderRadius: '50%',
          background: '#fff', transition: 'left .2s',
        }} />
      </span>
      {label && <span style={{ color: 'var(--text-main)' }}>{label}</span>}
    </label>
  );
}

/** Webhook URL AGX should call. Built from the backend origin the panel talks to. */
function webhookUrl() {
  const base = getApiBase();
  const abs = /^https?:\/\//i.test(base) ? base : `${window.location.origin}${base.startsWith('/') ? '' : '/'}${base}`;
  return `${abs.replace(/\/+$/, '')}/webhooks/agx`;
}

export default function AgxGames({ onToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success, message, games }
  const [report, setReport] = useState(null);
  const [reportDays, setReportDays] = useState(7);
  const [reportUser, setReportUser] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await agxGamesApi.getConfig();
      setCfg(res.config);
    } catch (err) {
      onToast?.(err.message || 'Failed to load AGX settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  const loadReport = useCallback(async () => {
    setLoadingReport(true);
    try {
      const res = await agxGamesApi.getSettlements({ days: reportDays, limit: 50, userId: reportUser.trim() });
      setReport(res);
    } catch (err) {
      onToast?.(err.message || 'Failed to load game results', 'error');
    } finally {
      setLoadingReport(false);
    }
  }, [reportDays, reportUser, onToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadReport(); }, [reportDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const partnerIds = useMemo(
    () => (testResult?.success ? new Set((testResult.games || []).map((g) => g.game_id)) : null),
    [testResult]
  );

  const setGame = (id, patch) =>
    setCfg((c) => ({ ...c, games: { ...c.games, [id]: { ...c.games[id], ...patch } } }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await agxGamesApi.saveConfig({
        enabled: cfg.enabled,
        base_url: cfg.base_url,
        api_key: apiKey.trim() || undefined,
        webhook_secret: secret.trim() || undefined,
        show_in_live_room: cfg.show_in_live_room,
        show_on_home: cfg.show_on_home,
        games: cfg.games,
      });
      setCfg(res.config);
      setApiKey('');
      setSecret('');
      onToast?.('AGX games settings saved', 'success');
    } catch (err) {
      onToast?.(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await agxGamesApi.testConnection();
      setTestResult(res);
      onToast?.(res.message, res.success ? 'success' : 'error');
    } catch (err) {
      setTestResult({ success: false, message: err.message });
      onToast?.(err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text).then(() => onToast?.('Copied', 'success')).catch(() => {});
  };

  if (loading || !cfg) return <Loader />;

  const games = [...(cfg.catalog || [])].sort((a, b) => (cfg.games[a.game_id]?.sort || 0) - (cfg.games[b.game_id]?.sort || 0));
  const hook = webhookUrl();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Connection */}
      <div className="panel-card">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gamepad2 size={18} /> AGX Games — Partner API
          </div>
          <Toggle checked={cfg.enabled} onChange={(v) => setCfg({ ...cfg, enabled: v })} label={cfg.enabled ? 'Games ON' : 'Games OFF'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, padding: '16px 0 0' }}>
          <div>
            <label style={{ color: 'var(--text-dim)', fontSize: 13 }}>AGX base URL</label>
            <input
              className="input-field"
              placeholder="http://107.174.137.29:8088"
              value={cfg.base_url}
              onChange={(e) => setCfg({ ...cfg, base_url: e.target.value })}
            />
          </div>
          <div>
            <label style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              API key {cfg.has_api_key && <span className="badge badge-success" style={{ marginLeft: 6 }}>saved: {cfg.api_key_masked}</span>}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="input-field"
                type={showKey ? 'text' : 'password'}
                placeholder={cfg.has_api_key ? 'Leave empty to keep the saved key' : 'agx_live_…'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              Webhook signing secret {cfg.has_webhook_secret && <span className="badge badge-success" style={{ marginLeft: 6 }}>saved: {cfg.webhook_secret_masked}</span>}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="input-field"
                type={showSecret ? 'text' : 'password'}
                placeholder={cfg.has_webhook_secret ? 'Leave empty to keep the saved secret' : 'whsec_…'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoComplete="off"
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSecret(!showSecret)}>
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ color: 'var(--text-dim)', fontSize: 13 }}>Webhook URL (paste in AGX → Manage → API &amp; Webhook)</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input-field" readOnly value={hook} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => copy(hook)}><Copy size={14} /></button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16 }}>
          <Toggle checked={cfg.show_in_live_room} onChange={(v) => setCfg({ ...cfg, show_in_live_room: v })} label="Show Games button in live rooms" />
          <Toggle checked={cfg.show_on_home} onChange={(v) => setCfg({ ...cfg, show_on_home: v })} label="Show Games button on Home" />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save settings'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={test} disabled={testing}>
            <PlugZap size={15} /> {testing ? 'Testing…' : 'Test connection'}
          </button>
        </div>

        {testResult && (
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center',
            border: '1px solid var(--border-color)', color: testResult.success ? 'var(--accent-green, #22c55e)' : 'var(--accent-red, #ef4444)',
          }}>
            {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{testResult.message}</span>
          </div>
        )}

        <p style={{ color: 'var(--text-dim)', fontSize: 12.5, marginTop: 14, lineHeight: 1.6 }}>
          Setup: register this app in the AGX portal (My Apps) → after approval copy the API key and webhook secret here →
          set the webhook URL above in AGX and press <b>Send test event</b> → add games in the AGX <b>Game Center</b> →
          enable them below. Commission, payout rate, chips and bet limits are configured in the AGX portal (Manage → Games → Configure).
          Each round's <code>net_profit</code> is added to the player's real coin balance once.
        </p>
      </div>

      {/* Games */}
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title">Games in the app</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Show in app</th>
                <th>AGX Game Center</th>
                <th>Display name</th>
                <th>Icon URL (optional)</th>
                <th>Order</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const s = cfg.games[g.game_id] || {};
                const added = partnerIds ? partnerIds.has(g.game_id) : null;
                return (
                  <tr key={g.game_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 22 }}>{g.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{g.name}</div>
                          <code style={{ fontSize: 11, color: 'var(--text-dim)' }}>{g.game_id}</code>
                        </div>
                      </div>
                    </td>
                    <td><Toggle checked={!!s.enabled} onChange={(v) => setGame(g.game_id, { enabled: v })} /></td>
                    <td>
                      {added === null ? <span style={{ color: 'var(--text-dim)' }}>Run “Test connection”</span>
                        : added ? <span className="badge badge-success">Added</span>
                          : <span className="badge badge-danger">Not added</span>}
                    </td>
                    <td>
                      <input className="input-field" placeholder={g.name} value={s.name || ''} maxLength={64}
                        onChange={(e) => setGame(g.game_id, { name: e.target.value })} />
                    </td>
                    <td>
                      <input className="input-field" placeholder="https://…/icon.png" value={s.icon_url || ''}
                        onChange={(e) => setGame(g.game_id, { icon_url: e.target.value })} />
                    </td>
                    <td style={{ width: 90 }}>
                      <input className="input-field" type="number" min={1} value={s.sort ?? 1}
                        onChange={(e) => setGame(g.game_id, { sort: Number(e.target.value) })} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 12.5, marginTop: 10 }}>
          A game appears in the app only when it is switched on here <b>and</b> added in the AGX Game Center. Press <b>Save settings</b> after changes.
        </p>
      </div>

      {/* Results */}
      <div className="panel-card">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="panel-title">Game results (from AGX webhook)</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {[1, 7, 30].map((d) => (
              <button key={d} type="button" className={`btn btn-sm ${reportDays === d ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setReportDays(d)}>
                {d === 1 ? 'Today' : `${d} days`}
              </button>
            ))}
            <input className="input-field" style={{ width: 130 }} placeholder="User ID" value={reportUser}
              onChange={(e) => setReportUser(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadReport()} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadReport} disabled={loadingReport}>
              {loadingReport ? <RefreshCw size={14} className="spin" /> : <Search size={14} />}
            </button>
          </div>
        </div>

        {report && (
          <>
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table className="data-table">
                <thead>
                  <tr><th>Game</th><th>Rounds</th><th>Players</th><th>Total bet</th><th>Paid out</th><th>Players' net</th></tr>
                </thead>
                <tbody>
                  {report.by_game.length === 0 && (
                    <tr><td colSpan={6} style={{ color: 'var(--text-dim)', textAlign: 'center' }}>No rounds in this period.</td></tr>
                  )}
                  {report.by_game.map((r) => (
                    <tr key={r.game_id}>
                      <td>{cfg.catalog.find((g) => g.game_id === r.game_id)?.name || r.game_id}</td>
                      <td>{fmt(r.rounds)}</td>
                      <td>{fmt(r.players)}</td>
                      <td>{fmt(r.total_bet)}</td>
                      <td>{fmt(r.total_won)}</td>
                      <td style={{ color: Number(r.players_net) >= 0 ? 'var(--accent-green, #22c55e)' : 'var(--accent-red, #ef4444)' }}>
                        {Number(r.players_net) > 0 ? '+' : ''}{fmt(r.players_net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ overflowX: 'auto', marginTop: 16 }}>
              <table className="data-table">
                <thead>
                  <tr><th>Time</th><th>User</th><th>Game</th><th>Round</th><th>Bet</th><th>Won</th><th>Net</th></tr>
                </thead>
                <tbody>
                  {report.recent.length === 0 && (
                    <tr><td colSpan={7} style={{ color: 'var(--text-dim)', textAlign: 'center' }}>No results yet.</td></tr>
                  )}
                  {report.recent.map((r) => (
                    <tr key={r.settlement_id}>
                      <td>{new Date(r.applied_at).toLocaleString()}</td>
                      <td>{r.full_name || '—'} <code style={{ fontSize: 11, color: 'var(--text-dim)' }}>#{r.user_id}</code></td>
                      <td>{r.game_id}</td>
                      <td>#{r.round_no}</td>
                      <td>{fmt(r.total_bet)}</td>
                      <td>{fmt(r.total_won)}</td>
                      <td style={{ color: Number(r.net_profit) >= 0 ? 'var(--accent-green, #22c55e)' : 'var(--accent-red, #ef4444)' }}>
                        {Number(r.net_profit) > 0 ? '+' : ''}{fmt(r.net_profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
