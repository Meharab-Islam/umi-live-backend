import crypto from 'crypto';
import { query, getPool } from '../config/db.js';
import { cache } from '../config/redis.js';
import { nextBalanceTs, emitUserBalance, getUserLiveRoomChannels } from './balanceEvents.js';

/**
 * AGX third-party games integration (Partner API + round settlement webhook).
 * Docs: <AGX host>/pages/docs/
 *
 * Flow:
 *  1. App asks our backend to launch a game -> we call AGX `POST /api/v1/partner/launch` with the
 *     player's current real coin balance and return the `launch_url` for the WebView.
 *  2. Players bet inside the AGX WebView using a temporary AGX game wallet (our DB is untouched).
 *  3. After every round AGX POSTs `game.round_settled` to our webhook; we add `net_profit` to the
 *     player's real `users.coins`, exactly once per `settlement_id`.
 *
 * Settings live in system_settings (`agx_games_config`, editable from the admin panel) with `.env`
 * values as defaults, so a fresh clone works from `.env` alone.
 */

export const AGX_SETTINGS_KEY = 'agx_games_config';
const CONFIG_CACHE_KEY = 'agx:config';
const PARTNER_GAMES_CACHE_KEY = 'agx:partner_games';
const MOBILE_GAMES_CACHE_KEY = 'mobile:games:list';

/** The five games AGX offers (docs section "Games and betting rules"). */
export const AGX_GAME_CATALOG = [
  { game_id: 'teenpatti', name: 'Royal Teen Patti', icon: '🃏' },
  { game_id: 'fruit_wheel', name: 'Fruit Wheel', icon: '🎡' },
  { game_id: 'food', name: 'Food Feast', icon: '🍖' },
  { game_id: 'roulette', name: 'Royal European Roulette', icon: '🎰' },
  { game_id: 'jackpot', name: 'Jackpot Fruits', icon: '🍒' },
];
const CATALOG_IDS = new Set(AGX_GAME_CATALOG.map((g) => g.game_id));

const envBool = (v, def) => (v === undefined || v === '' ? def : String(v).toLowerCase() === 'true');
const REQUEST_TIMEOUT_MS = parseInt(process.env.AGX_REQUEST_TIMEOUT_MS || '8000', 10);
const WEBHOOK_MAX_SKEW_SECONDS = parseInt(process.env.AGX_WEBHOOK_MAX_SKEW_SECONDS || '300', 10);

function envDefaults() {
  return {
    enabled: envBool(process.env.AGX_ENABLED, false),
    base_url: process.env.AGX_BASE_URL || '',
    api_key: process.env.AGX_API_KEY || '',
    webhook_secret: process.env.AGX_WEBHOOK_SECRET || '',
    show_in_live_room: true,
    show_on_home: true,
    win_banner_enabled: envBool(process.env.AGX_WIN_BANNER_ENABLED, true),
    win_banner_min_coins: parseInt(process.env.AGX_WIN_BANNER_MIN_COINS || '10000', 10),
    games: {},
  };
}

function normalizeConfig(raw = {}) {
  const def = envDefaults();
  const cfg = { ...def, ...raw };
  cfg.enabled = Boolean(cfg.enabled);
  cfg.show_in_live_room = cfg.show_in_live_room !== false;
  cfg.show_on_home = cfg.show_on_home !== false;
  cfg.win_banner_enabled = cfg.win_banner_enabled !== false;
  cfg.win_banner_min_coins = Math.max(0, parseInt(cfg.win_banner_min_coins, 10) || 0);
  cfg.base_url = String(cfg.base_url || '').trim().replace(/\/+$/, '');
  cfg.api_key = String(cfg.api_key || '').trim();
  cfg.webhook_secret = String(cfg.webhook_secret || '').trim();

  const games = {};
  AGX_GAME_CATALOG.forEach((g, i) => {
    const saved = (raw.games && raw.games[g.game_id]) || {};
    games[g.game_id] = {
      // Never configured in the admin panel -> on (it still has to be added in the AGX Game Center).
      enabled: saved.enabled === undefined ? true : Boolean(saved.enabled),
      name: String(saved.name || '').trim().slice(0, 64),
      icon_url: String(saved.icon_url || '').trim().slice(0, 500),
      sort: Number.isFinite(Number(saved.sort)) ? Number(saved.sort) : i + 1,
    };
  });
  cfg.games = games;
  return cfg;
}

/** Full config including secrets. Server-side use only. */
export async function getAgxConfig() {
  const raw = await cache.getOrSet(CONFIG_CACHE_KEY, 60, async () => {
    const rows = await query('SELECT key_value FROM system_settings WHERE key_name = ?', [AGX_SETTINGS_KEY]);
    if (!rows || rows.length === 0) return {};
    try {
      return JSON.parse(rows[0].key_value) || {};
    } catch {
      return {};
    }
  });
  return normalizeConfig(raw || {});
}

const maskSecret = (s) => (s ? `${s.slice(0, 9)}…${s.slice(-4)}` : '');

/** Config safe to show in the admin panel (secrets masked). */
export async function getAgxConfigForAdmin() {
  const cfg = await getAgxConfig();
  return {
    ...cfg,
    api_key: '',
    webhook_secret: '',
    api_key_masked: maskSecret(cfg.api_key),
    webhook_secret_masked: maskSecret(cfg.webhook_secret),
    has_api_key: Boolean(cfg.api_key),
    has_webhook_secret: Boolean(cfg.webhook_secret),
    catalog: AGX_GAME_CATALOG,
  };
}

/**
 * Save admin changes. Empty `api_key` / `webhook_secret` keep the stored value, so the admin panel
 * never needs to read the secrets back.
 */
export async function saveAgxConfig(input = {}) {
  const current = await getAgxConfig();
  const next = normalizeConfig({
    ...current,
    enabled: input.enabled ?? current.enabled,
    base_url: input.base_url ?? current.base_url,
    api_key: input.api_key ? input.api_key : current.api_key,
    webhook_secret: input.webhook_secret ? input.webhook_secret : current.webhook_secret,
    show_in_live_room: input.show_in_live_room ?? current.show_in_live_room,
    show_on_home: input.show_on_home ?? current.show_on_home,
    win_banner_enabled: input.win_banner_enabled ?? current.win_banner_enabled,
    win_banner_min_coins: input.win_banner_min_coins ?? current.win_banner_min_coins,
    games: { ...current.games, ...(input.games || {}) },
  });

  if (next.base_url && !/^https?:\/\/[^\s/]+/i.test(next.base_url)) {
    const err = new Error('AGX base URL must start with http:// or https://');
    err.status = 400;
    throw err;
  }
  if (next.api_key && !next.api_key.startsWith('agx_live_')) {
    const err = new Error('AGX API key must start with agx_live_');
    err.status = 400;
    throw err;
  }

  await query(
    `INSERT INTO system_settings (key_name, key_value, description) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
    [AGX_SETTINGS_KEY, JSON.stringify(next), 'AGX third-party games integration']
  );
  await invalidateAgxCaches();
  return getAgxConfigForAdmin();
}

export async function invalidateAgxCaches() {
  await Promise.all([
    cache.del(CONFIG_CACHE_KEY),
    cache.del(PARTNER_GAMES_CACHE_KEY),
    cache.del(MOBILE_GAMES_CACHE_KEY),
    cache.del('settings:all'),
    cache.delByPattern('admin:agx:*'),
  ]).catch(() => {});
}

/** Admin report: totals for a period plus the latest settlements. */
export async function getSettlementReport({ days = 7, limit = 50, userId = null } = {}) {
  const d = Math.min(Math.max(parseInt(days, 10) || 7, 1), 90);
  const l = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const uid = userId && /^\d+$/.test(String(userId)) ? parseInt(userId, 10) : null;
  return cache.getOrSet(`admin:agx:report:${d}:${l}:${uid || 'all'}`, 30, async () => {
    const where = ['applied_at >= (NOW() - INTERVAL ? DAY)'];
    const params = [d];
    if (uid) { where.push('s.user_id = ?'); params.push(uid); }
    const w = where.join(' AND ');
    const byGame = await query(
      `SELECT game_id, COUNT(*) AS settlements, COUNT(DISTINCT round_id) AS rounds, COUNT(DISTINCT user_id) AS players,
              COALESCE(SUM(total_bet),0) AS total_bet, COALESCE(SUM(total_won),0) AS total_won,
              COALESCE(SUM(net_profit),0) AS players_net
         FROM agx_settlements s WHERE ${w} GROUP BY game_id ORDER BY total_bet DESC`,
      params
    );
    const recent = await query(
      `SELECT s.settlement_id, s.user_id, u.full_name, s.game_id, s.round_no, s.result, s.total_bet, s.total_won,
              s.net_profit, s.end_balance, s.applied_at
         FROM agx_settlements s LEFT JOIN users u ON u.id = s.user_id
        WHERE ${w} ORDER BY s.applied_at DESC LIMIT ${l}`,
      params
    );
    return { days: d, by_game: byGame, recent };
  });
}

class AgxError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

async function partnerRequest(cfg, method, path, body) {
  if (!cfg.base_url || !cfg.api_key) throw new AgxError('AGX games are not configured yet.', 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.base_url}/api/v1/partner${path}`, {
      method,
      headers: { 'X-API-Key': cfg.api_key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    if (!res.ok || !json || json.success === false) {
      const msg = (json && (json.m || json.message)) || `AGX request failed (HTTP ${res.status})`;
      // 4xx from AGX are configuration problems on our side; surface them as 502 to the app.
      const e = new AgxError(msg, res.status === 403 ? 403 : res.status === 429 ? 429 : 502);
      e.httpStatus = res.status;
      throw e;
    }
    return json;
  } catch (err) {
    if (err instanceof AgxError) throw err;
    if (err.name === 'AbortError') throw new AgxError('AGX game server timed out.', 504);
    throw new AgxError(`AGX game server unreachable: ${err.message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

/** Games added to our app in the AGX Game Center (cached 60 s). */
export async function fetchPartnerGames({ fresh = false } = {}) {
  const cfg = await getAgxConfig();
  const load = async () => {
    const json = await partnerRequest(cfg, 'GET', '/games');
    return { tenant: json.tenant || '', games: Array.isArray(json.games) ? json.games : [] };
  };
  if (fresh) {
    const data = await load();
    await cache.set(PARTNER_GAMES_CACHE_KEY, data, 60);
    return data;
  }
  return cache.getOrSet(PARTNER_GAMES_CACHE_KEY, 60, load);
}

/** Game list for the mobile app: enabled by admin AND added in the AGX Game Center. */
export async function getMobileGames() {
  return cache.getOrSet(MOBILE_GAMES_CACHE_KEY, 60, async () => {
    const cfg = await getAgxConfig();
    const empty = { enabled: false, show_in_live_room: false, show_on_home: false, games: [] };
    if (!cfg.enabled || !cfg.base_url || !cfg.api_key) return empty;

    let partnerIds = null; // null = AGX unreachable; fall back to admin selection only
    try {
      const partner = await fetchPartnerGames();
      partnerIds = new Set(partner.games.map((g) => g.game_id));
    } catch (err) {
      // Wrong / revoked key or suspended app: hide the games. Network trouble: keep the admin selection.
      if (err.httpStatus === 401) return empty;
      console.warn('[AGX] Could not load partner games list:', err.message);
    }

    const games = AGX_GAME_CATALOG
      .filter((g) => cfg.games[g.game_id]?.enabled && (!partnerIds || partnerIds.has(g.game_id)))
      .map((g) => {
        const s = cfg.games[g.game_id];
        return { game_id: g.game_id, name: s.name || g.name, icon: g.icon, icon_url: s.icon_url || '', sort: s.sort };
      })
      .sort((a, b) => a.sort - b.sort);

    return {
      enabled: games.length > 0,
      show_in_live_room: cfg.show_in_live_room && games.length > 0,
      show_on_home: cfg.show_on_home && games.length > 0,
      games,
    };
  });
}

/** Create a game session for one player and return the WebView launch URL. */
export async function launchGameForUser(userId, gameId) {
  if (!CATALOG_IDS.has(gameId)) throw new AgxError('Unknown game.', 400);
  const cfg = await getAgxConfig();
  if (!cfg.enabled) throw new AgxError('Games are currently unavailable.', 503);
  if (!cfg.games[gameId]?.enabled) throw new AgxError('This game is not available.', 403);

  // Always read the live balance from MySQL (never cache) so the AGX game wallet is current.
  const rows = await query(
    'SELECT id, full_name, avatar_url, coins, is_banned, is_coin_locked FROM users WHERE id = ?',
    [userId]
  );
  const user = rows && rows[0];
  if (!user) throw new AgxError('User not found.', 404);
  if (user.is_banned) throw new AgxError('Your account has been suspended.', 403);
  if (user.is_coin_locked) throw new AgxError('Your coins are locked. Please contact support.', 403);

  const avatar = typeof user.avatar_url === 'string' && /^https?:\/\//i.test(user.avatar_url) && user.avatar_url.length <= 500
    ? user.avatar_url : undefined;
  const username = String(user.full_name || '').trim().slice(0, 64) || undefined;

  const json = await partnerRequest(cfg, 'POST', '/launch', {
    game_id: gameId,
    user_id: String(user.id),
    username,
    avatar,
    coins: Math.max(0, parseInt(user.coins, 10) || 0),
  });

  return {
    game_id: json.game_id || gameId,
    launch_url: json.launch_url,
    expires_in: json.expires_in || 7200,
    coins: Math.max(0, parseInt(user.coins, 10) || 0),
  };
}

/** Check the AGX `X-Webhook-Signature` (HMAC-SHA256 of the exact raw body). */
export function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader || !Buffer.isBuffer(rawBody)) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const got = String(signatureHeader);
  if (got.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export function isTimestampFresh(tsHeader) {
  if (!WEBHOOK_MAX_SKEW_SECONDS) return true;
  const ts = parseInt(tsHeader, 10);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(Math.floor(Date.now() / 1000) - ts) <= WEBHOOK_MAX_SKEW_SECONDS;
}

/**
 * Apply one settlement exactly once: the agx_settlements primary key is the idempotency guard and the
 * balance update happens in the same MySQL transaction.
 * Returns { applied, duplicate, userId, coins }.
 */
async function applySettlement(event, s) {
  const settlementId = String(s.settlement_id || '').slice(0, 140);
  const userId = parseInt(s.user_id, 10);
  const net = parseInt(s.net_profit, 10);
  if (!settlementId || !Number.isInteger(userId) || String(userId) !== String(s.user_id) || !Number.isFinite(net)) {
    console.warn('[AGX] Skipping malformed settlement', s);
    return { applied: false, skipped: true };
  }

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    try {
      await connection.execute(
        `INSERT INTO agx_settlements
           (settlement_id, user_id, game_id, round_no, round_id, result, total_bet, total_won, net_profit, end_balance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          settlementId, userId, String(event.game_id || '').slice(0, 32), parseInt(event.round, 10) || 0,
          String(event.round_id || '').slice(0, 64), String(event.result ?? '').slice(0, 32),
          parseInt(s.total_bet, 10) || 0, parseInt(s.total_won, 10) || 0, net, parseInt(s.end_balance, 10) || 0,
        ]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        await connection.rollback();
        return { applied: false, duplicate: true };
      }
      throw err;
    }

    let coins = null;
    if (net !== 0) {
      const [upd] = await connection.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [net, userId]);
      if (upd.affectedRows > 0) {
        const gameName = AGX_GAME_CATALOG.find((g) => g.game_id === event.game_id)?.name || event.game_id;
        await connection.execute(
          `INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, ?, ?, ?, 'completed')`,
          [
            userId, net > 0 ? 'game_win' : 'game_loss', Math.abs(net),
            `${gameName} round #${event.round}: bet ${s.total_bet}, won ${s.total_won}`.slice(0, 255),
          ]
        );
      }
    }
    const [[row]] = await connection.query('SELECT coins FROM users WHERE id = ?', [userId]);
    coins = row ? row.coins : null;

    // Version taken while the user row is still locked: any later change to it gets a newer one.
    const ts = nextBalanceTs();
    await connection.commit();
    return { applied: true, userId, coins, ts };
  } catch (err) {
    await connection.rollback().catch(() => {});
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Apply every settlement of a `game.round_settled` event, then refresh caches, push the new balance
 * to the player and to every live room they are in, and announce big wins app-wide.
 * @param {object} [opts.toAbsoluteUrl] maps stored avatar paths to absolute URLs
 */
export async function processRoundSettled(event, io, { toAbsoluteUrl = (u) => u } = {}) {
  const settlements = Array.isArray(event.settlements) ? event.settlements : [];
  const results = [];
  for (const s of settlements) {
    results.push({ ...(await applySettlement(event, s)), settlement: s });
  }

  const touched = results.filter((r) => r.applied && r.userId);
  await Promise.all(touched.flatMap((r) => [
    cache.del(`user:${r.userId}`),
    cache.del(`user:balance:${r.userId}`),
    cache.del(`mobile:user:profile:${r.userId}`),
    cache.delByPattern(`user:transactions:${r.userId}*`),
  ])).catch(() => {});
  if (touched.length) cache.delByPattern('admin:agx:*').catch(() => {});

  // Notify after the DB work, without holding the webhook response (AGX allows 8 s per attempt and
  // looking up each player's rooms goes through the socket adapter).
  if (io && touched.length) broadcastSettlements(io, event, touched, toAbsoluteUrl).catch((e) => {
    console.warn('[AGX] settlement broadcast failed:', e.message);
  });

  return {
    applied: touched.length,
    duplicates: results.filter((r) => r.duplicate).length,
    skipped: results.filter((r) => r.skipped).length,
  };
}

async function broadcastSettlements(io, event, touched, toAbsoluteUrl) {
  {
    const cfg = await getAgxConfig().catch(() => null);
    const game = AGX_GAME_CATALOG.find((g) => g.game_id === event.game_id);
    const gameName = (cfg && cfg.games[event.game_id]?.name) || game?.name || event.game_id;
    const gameIcon = (cfg && cfg.games[event.game_id]?.icon_url) || game?.icon || '🎮';

    for (const r of touched) {
      if (r.coins === null || r.coins === undefined) continue;
      const net = parseInt(r.settlement.net_profit, 10) || 0;
      const roomChannels = await getUserLiveRoomChannels(io, r.userId);
      emitUserBalance(io, {
        userId: r.userId,
        coins: r.coins,
        delta: net,
        source: 'game',
        ts: r.ts,
        roomChannels,
      });

      const won = parseInt(r.settlement.total_won, 10) || 0;
      if (cfg && cfg.win_banner_enabled && net > 0 && won >= cfg.win_banner_min_coins) {
        try {
          const [u] = await query('SELECT id, full_name, avatar_url, level FROM users WHERE id = ?', [r.userId]);
          io.emit('global_game_win_banner', {
            id: `game_win_${r.settlement.settlement_id}`,
            type: 'game_win',
            user: {
              id: r.userId,
              name: (u && u.full_name) || r.settlement.username || `User #${r.userId}`,
              avatar_url: (u && toAbsoluteUrl(u.avatar_url)) || '',
              level: (u && u.level) || 1,
            },
            game: { id: event.game_id, name: gameName, icon: gameIcon },
            coins: won,
            total_won: won,
            net_profit: net,
            room_id: roomChannels[0] || '',
            duration_seconds: 4,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('[AGX] win banner emit failed:', e.message);
        }
      }
    }
  }
}

export { WEBHOOK_MAX_SKEW_SECONDS };
