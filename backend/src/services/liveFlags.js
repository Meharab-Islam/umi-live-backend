import '../config/env.js';
import { query } from '../config/db.js';
import { cache } from '../config/redis.js';

/**
 * Live-room runtime flags & limits. Source of truth = system_settings (editable in the admin panel,
 * takes effect within ~10s on every process, no app release or restart). .env supplies defaults.
 * Used as kill switches during incidents: turn off join banners / entry effects / reactions / frames.
 */
const bool = (v, d) => {
  if (v === undefined || v === null || v === '') return d;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};
const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};

const DEFAULTS = () => ({
  live_frames_enabled: process.env.LIVE_FRAMES_ENABLED ?? 'true',
  live_frame_threshold_viewers: process.env.LIVE_FRAME_THRESHOLD_VIEWERS ?? '150',
  live_frame_interval_ms: process.env.LIVE_FRAME_INTERVAL_MS ?? '250',
  live_chat_room_max_per_sec: process.env.LIVE_CHAT_ROOM_MAX_PER_SEC ?? '25',
  live_chat_legacy_max_per_sec: process.env.LIVE_CHAT_LEGACY_MAX_PER_SEC ?? '8',
  live_reaction_legacy_max_per_sec: process.env.LIVE_REACTION_LEGACY_MAX_PER_SEC ?? '6',
  live_disable_join_announce: process.env.LIVE_DISABLE_JOIN_ANNOUNCE ?? 'false',
  live_disable_entry_effect: process.env.LIVE_DISABLE_ENTRY_EFFECT ?? 'false',
  live_disable_reactions: process.env.LIVE_DISABLE_REACTIONS ?? 'false',
});

let memo = null;
let memoAt = 0;
const MEMO_MS = 5000;

function build(map) {
  const d = DEFAULTS();
  const g = (k) => (map[k] !== undefined && map[k] !== '' ? map[k] : d[k]);
  return {
    framesEnabled: bool(g('live_frames_enabled'), true),
    frameThreshold: Math.max(1, num(g('live_frame_threshold_viewers'), 150)),
    frameIntervalMs: Math.min(2000, Math.max(100, num(g('live_frame_interval_ms'), 250))),
    chatRoomMaxPerSec: Math.max(1, num(g('live_chat_room_max_per_sec'), 25)),
    chatLegacyMaxPerSec: Math.max(1, num(g('live_chat_legacy_max_per_sec'), 8)),
    reactionLegacyMaxPerSec: Math.max(1, num(g('live_reaction_legacy_max_per_sec'), 6)),
    disableJoinAnnounce: bool(g('live_disable_join_announce'), false),
    disableEntryEffect: bool(g('live_disable_entry_effect'), false),
    disableReactions: bool(g('live_disable_reactions'), false),
  };
}

/** Never throws; falls back to last known flags, then to .env defaults. */
export async function getLiveFlags() {
  const now = Date.now();
  if (memo && now - memoAt < MEMO_MS) return memo;
  try {
    const rows = await cache.getOrSet('live:flags', 10, async () => {
      return (await query("SELECT key_name, key_value FROM system_settings WHERE key_name LIKE 'live\\_%'")) || [];
    });
    const map = {};
    for (const r of rows || []) map[r.key_name] = r.key_value;
    memo = build(map);
  } catch (_) {
    memo = memo || build({});
  }
  memoAt = now;
  return memo;
}

/** Test/admin hook: drop the in-process memo (cache key expires on its own within 10s). */
export function resetLiveFlagsMemo() {
  memo = null;
  memoAt = 0;
}
