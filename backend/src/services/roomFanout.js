import '../config/env.js';
import { getRedisClient, formatKey } from '../config/redis.js';
import { consume } from './rateLimiter.js';
import { getLiveFlags } from './liveFlags.js';
import { takeBudget, hooks } from './liveScaleGuard.js';
import { metrics } from './metrics.js';

/**
 * Fan-out strategy for live rooms (Phase 2).
 *
 * Small room (<= threshold viewers): unchanged - every comment / reaction is emitted immediately.
 * Big room (> threshold):
 *   - clients speaking protocol v2 (join-room {proto: 2}) receive ONE `room_frame` per tick with all
 *     comments + aggregated reaction counts, instead of N events -> per-viewer messages drop from
 *     O(comments/sec) to O(1/tick).
 *   - clients without v2 support keep getting individual events but SAMPLED (hard per-second cap).
 *   - audience comments are capped cluster-wide per room; host / admin / package (VIP) users always pass.
 *
 * Room size is shared through Redis (`room_vc:<room>`), written by whoever computes the viewer count,
 * so every process classifies a room the same way.
 */

const sizeCache = new Map(); // room -> { n, at }
const SIZE_LOCAL_MS = 2000;

export function setRoomSize(room, n) {
  if (!room) return;
  const count = Math.max(0, Number(n) || 0);
  sizeCache.set(String(room), { n: count, at: Date.now() });
  const c = getRedisClient();
  if (c && c.status === 'ready') {
    c.set(formatKey(`room_vc:${room}`), String(count), 'EX', 120).catch(() => {});
  }
}

export async function getRoomSize(room) {
  const key = String(room);
  const hit = sizeCache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < SIZE_LOCAL_MS) return hit.n;
  const c = getRedisClient();
  if (c && c.status === 'ready') {
    try {
      const v = await c.get(formatKey(`room_vc:${room}`));
      if (v !== null) {
        const n = Number(v) || 0;
        sizeCache.set(key, { n, at: now });
        return n;
      }
    } catch (_) { /* fall through */ }
  }
  return hit ? hit.n : 0;
}

hooks.onRoomSize = (room, n) => setRoomSize(room, n);

export function forgetRoom(room) {
  const key = String(room);
  sizeCache.delete(key);
  const f = frames.get(key);
  if (f?.timer) clearTimeout(f.timer);
  frames.delete(key);
}

// ── frame buffers (per process; each process frames its own clients' traffic) ─
const frames = new Map(); // room -> { comments:[], reactions:{}, timer }

function flushFrame(io, room) {
  const f = frames.get(room);
  if (!f) return;
  frames.delete(room);
  if (f.timer) clearTimeout(f.timer);
  if (f.comments.length === 0 && Object.keys(f.reactions).length === 0) return;
  const frame = { v: 2, room, ts: Date.now(), c: f.comments };
  if (Object.keys(f.reactions).length) frame.r = f.reactions;
  const size = sizeCache.get(room)?.n;
  if (size !== undefined) frame.vc = size;
  io.to(`v2:${room}`).emit('room_frame', frame);
  metrics.roomFrames.inc();
}

function frameFor(io, room, intervalMs) {
  let f = frames.get(room);
  if (!f) {
    f = { comments: [], reactions: {}, timer: null };
    f.timer = setTimeout(() => flushFrame(io, room), intervalMs);
    if (f.timer.unref) f.timer.unref();
    frames.set(room, f);
  }
  return f;
}

/** Compact wire form used inside room_frame (keys are short on purpose: it is sent to every viewer). */
export function compactComment(p) {
  return {
    id: p.id,
    uid: p.userId,
    n: p.userName,
    a: p.userAvatar || '',
    lv: p.userLevel || 1,
    pn: p.packageCategoryName || '',
    pi: p.packageImage || '',
    pc: p.packageColor || '',
    ag: p.agencyName || '',
    aid: p.agencyId || 0,
    vt: p.vipTier || 'normal',
    m: p.message,
    ts: p.timestamp,
  };
}

/**
 * Deliver a comment to a room.
 * @param {{priority?: boolean}} opts priority = host / admin / package user: never sampled away
 * @returns {Promise<'sent'|'sampled_out'>}
 */
export async function publishComment(io, room, legacyPayload, opts = {}) {
  const flags = await getLiveFlags();
  const size = await getRoomSize(room);
  const big = size > flags.frameThreshold;

  if (!big) {
    io.to(room).emit('comment', legacyPayload);
    return 'sent';
  }

  // Cluster-wide cap on audience comments per room per second (fail-open if Redis is down).
  if (!opts.priority) {
    const r = await consume('chat_room', room, flags.chatRoomMaxPerSec, 1);
    if (!r.allowed) {
      metrics.chatSampledOut.inc();
      return 'sampled_out';
    }
  }

  if (flags.framesEnabled) {
    // v2 clients: batched. Everyone else: sampled individual events (they are NOT in the v2: room).
    frameFor(io, room, flags.frameIntervalMs).comments.push(compactComment(legacyPayload));
    if (opts.priority || takeBudget(`chat_legacy:${room}`, flags.chatLegacyMaxPerSec)) {
      io.to(room).except(`v2:${room}`).emit('comment', legacyPayload);
    }
  } else {
    io.to(room).emit('comment', legacyPayload);
  }
  return 'sent';
}

/**
 * Deliver a reaction to a room. In big rooms reactions become counters inside the frame; clients
 * animate them locally. Returns false when the reaction was dropped.
 */
export async function publishReaction(io, room, legacyPayload, emoji) {
  const flags = await getLiveFlags();
  if (flags.disableReactions) return false;
  const size = await getRoomSize(room);
  if (size <= flags.frameThreshold || !flags.framesEnabled) {
    io.to(room).emit('new-reaction', legacyPayload);
    return true;
  }
  const f = frameFor(io, room, flags.frameIntervalMs);
  f.reactions[emoji] = (f.reactions[emoji] || 0) + 1;
  if (takeBudget(`react_legacy:${room}`, flags.reactionLegacyMaxPerSec)) {
    io.to(room).except(`v2:${room}`).emit('new-reaction', legacyPayload);
  }
  return true;
}
