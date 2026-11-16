import { query } from '../config/db.js';

/**
 * Scale guards for large live rooms.
 *
 * Everything here exists to stop per-join / per-leave / per-comment work from
 * growing with audience size (O(N) emits per event => O(N^2) per room).
 * All limits are configurable via .env (see .env.example, "LIVE ROOM SCALE GUARDS").
 */

const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

export const LIVE_SCALE = {
  // Rooms with at most this many viewers keep the old "announce every join/leave" behaviour.
  fullAnnounceMax: int(process.env.LIVE_FULL_ANNOUNCE_MAX_VIEWERS, 100),
  // In bigger rooms: max user-joined / user-left announcements per second per room.
  joinAnnouncePerSec: int(process.env.LIVE_JOIN_ANNOUNCE_PER_SEC, 5),
  // In bigger rooms: max entry-effect broadcasts per second per room.
  entryEffectPerSec: int(process.env.LIVE_ENTRY_EFFECT_PER_SEC, 3),
  // viewer_count DB recount (COUNT(*) + UPDATE) runs at most once per window per room.
  viewerSyncWindowMs: int(process.env.LIVE_VIEWER_SYNC_WINDOW_MS, 1500),
  // viewer-count-update to a room at most once per window.
  viewerEmitWindowMs: int(process.env.LIVE_VIEWER_EMIT_WINDOW_MS, 1000),
  // Global room_stats_update (home feed) at most once per window per room.
  statsEmitWindowMs: int(process.env.LIVE_STATS_EMIT_WINDOW_MS, 3000),
  // Expensive SCAN-based cache invalidations run at most once per window.
  cacheInvalidateWindowMs: int(process.env.LIVE_CACHE_INVALIDATE_WINDOW_MS, 2000),
  // Per-socket chat limits: sustained messages/sec and burst size.
  chatPerSec: parseFloat(process.env.LIVE_CHAT_PER_SEC || '1.5'),
  chatBurst: int(process.env.LIVE_CHAT_BURST, 4),
  // Chat profile / entry-effect lookups cached in Redis for this many seconds.
  profileCacheTtl: int(process.env.LIVE_PROFILE_CACHE_TTL, 30),
};

// ── Leading + trailing throttle that always delivers the LATEST value ────────
const latestState = new Map();

export function throttledLatest(key, windowMs, value, fire) {
  let s = latestState.get(key);
  if (!s) {
    s = { last: 0, value: undefined, timer: null };
    latestState.set(key, s);
  }
  s.value = value;
  const now = Date.now();
  if (!s.timer && now - s.last >= windowMs) {
    s.last = now;
    try { fire(value); } catch (_) { /* ignore */ }
    return;
  }
  if (!s.timer) {
    s.timer = setTimeout(() => {
      s.timer = null;
      s.last = Date.now();
      try { fire(s.value); } catch (_) { /* ignore */ }
    }, Math.max(25, windowMs - (now - s.last)));
  }
}

// ── Leading + trailing throttle for side effects (e.g. SCAN cache deletes) ───
export function throttledRun(key, windowMs, fn) {
  throttledLatest(`run:${key}`, windowMs, null, () => {
    Promise.resolve()
      .then(fn)
      .catch(() => { /* cache invalidation is best-effort */ });
  });
}

// ── Fixed 1s window budget (token counter) per key ───────────────────────────
const budgets = new Map();

export function takeBudget(key, perSec) {
  const sec = Math.floor(Date.now() / 1000);
  const b = budgets.get(key);
  if (!b || b.sec !== sec) {
    budgets.set(key, { sec, used: 1 });
    return perSec > 0;
  }
  if (b.used >= perSec) return false;
  b.used += 1;
  return true;
}

export function isBigRoom(viewerCount) {
  return Number(viewerCount || 0) > LIVE_SCALE.fullAnnounceMax;
}

// ── Coalesced viewer_count recount ───────────────────────────────────────────
const viewerSync = new Map();

async function recountViewers({ canonicalRoomId, numericRoomId, hostId }) {
  if (numericRoomId) {
    await query(
      `UPDATE live_rooms
       SET viewer_count = (SELECT COUNT(*) FROM live_room_viewers WHERE (room_id = ? OR room_id = ?) AND user_id != ?)
       WHERE id = ?`,
      [canonicalRoomId, String(numericRoomId), hostId, numericRoomId]
    );
    const [row] = await query('SELECT viewer_count FROM live_rooms WHERE id = ?', [numericRoomId]);
    return row ? Math.max(0, row.viewer_count) : 0;
  }
  await query(
    `UPDATE live_rooms
     SET viewer_count = (SELECT COUNT(*) FROM live_room_viewers WHERE room_id = ? AND user_id != ?)
     WHERE room_id = ?`,
    [canonicalRoomId, hostId, canonicalRoomId]
  );
  const [row] = await query('SELECT viewer_count FROM live_rooms WHERE room_id = ?', [canonicalRoomId]);
  return row ? Math.max(0, row.viewer_count) : 0;
}

/**
 * Recount viewers for a room, at most once per window.
 * - First call (or first after the window): recounts immediately and returns the exact count.
 * - Calls inside the window return the last known count immediately and schedule ONE trailing
 *   recount; its result is pushed through opts.onTrailing(count) so clients still converge.
 * The live_room_viewers INSERT/DELETE itself stays per-event (DB-first); only the hot-row
 * UPDATE live_rooms + COUNT(*) is coalesced.
 */
export async function syncRoomViewerCount(opts) {
  const key = String(opts.canonicalRoomId);
  const win = LIVE_SCALE.viewerSyncWindowMs;
  let s = viewerSync.get(key);
  if (!s) {
    s = { last: 0, count: null, timer: null };
    viewerSync.set(key, s);
  }
  const now = Date.now();

  if (!s.timer && now - s.last >= win) {
    s.last = now;
    const c = await recountViewers(opts);
    s.count = c;
    return c;
  }

  if (!s.timer) {
    s.timer = setTimeout(async () => {
      s.timer = null;
      s.last = Date.now();
      try {
        const c = await recountViewers(opts);
        s.count = c;
        if (typeof opts.onTrailing === 'function') opts.onTrailing(c);
      } catch (err) {
        console.warn('[liveScaleGuard] trailing viewer recount failed:', err.message);
      }
    }, Math.max(50, win - (now - s.last)));
  }

  if (s.count === null) {
    const c = await recountViewers(opts);
    s.count = c;
    return c;
  }
  return s.count;
}

/**
 * Throttled viewer-count broadcast: one to the room, one (slower) to every connected
 * client for the home feed. Callers pass the room channels (canonical + numeric aliases);
 * io.to([..]) delivers once per socket even if it joined both aliases.
 */
export function emitRoomViewerCount(io, canonicalRoomId, numericRoomId, count, { toRoom = true, toHomeFeed = true } = {}) {
  if (!io) return;
  const chans = [canonicalRoomId, numericRoomId ? String(numericRoomId) : null].filter(Boolean);
  if (toRoom) {
    throttledLatest(`vc:${canonicalRoomId}`, LIVE_SCALE.viewerEmitWindowMs, count, (c) => {
      const payload = { roomId: canonicalRoomId, count: c, viewer_count: c };
      io.to(chans).emit('viewer-count-update', payload);
      io.to(chans).emit('room_viewers_updated', payload);
    });
  }
  if (toHomeFeed) {
    throttledLatest(`stats:${canonicalRoomId}`, LIVE_SCALE.statsEmitWindowMs, count, (c) => {
      io.emit('room_stats_update', { roomId: canonicalRoomId, numericRoomId, viewer_count: c, count: c });
    });
  }
}

// ── Per-socket chat rate limit (token bucket) ────────────────────────────────
export function allowChatMessage(socket) {
  const now = Date.now();
  const b = socket._chatBucket || (socket._chatBucket = { tokens: LIVE_SCALE.chatBurst, ts: now });
  b.tokens = Math.min(LIVE_SCALE.chatBurst, b.tokens + ((now - b.ts) / 1000) * LIVE_SCALE.chatPerSec);
  b.ts = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

// ── Housekeeping so per-room maps don't grow forever ─────────────────────────
const gc = setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [k, s] of viewerSync) if (!s.timer && s.last < cutoff) viewerSync.delete(k);
  for (const [k, s] of latestState) if (!s.timer && s.last < cutoff) latestState.delete(k);
  const sec = Math.floor(Date.now() / 1000) - 60;
  for (const [k, b] of budgets) if (b.sec < sec) budgets.delete(k);
}, 60 * 1000);
if (gc.unref) gc.unref();
