import '../config/env.js';
import crypto from 'crypto';
import { getRedisClient, formatKey } from '../config/redis.js';

/**
 * Helpers that make "one process only" logic safe when the backend runs as many processes /
 * machines behind a load balancer.
 *
 * Everything degrades gracefully: if Redis is unavailable we behave like a single node
 * (every process considers itself leader, de-dupe falls back to a local map) instead of failing.
 */

export const NODE_ID = `${process.pid}-${crypto.randomBytes(4).toString('hex')}`;

const RENEW_LUA = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  redis.call('pexpire', KEYS[1], ARGV[2])
  return 1
end
return 0
`;

function redis() {
  const c = getRedisClient();
  return c && c.status === 'ready' ? c : null;
}

/**
 * True when this process holds (or just acquired) the named lease.
 * Lease expires after ttlMs unless renewed by calling again, so a dead leader is replaced automatically.
 */
export async function isLeader(name, ttlMs) {
  const c = redis();
  if (!c) return true;
  const key = formatKey(`leader:${name}`);
  try {
    const got = await c.set(key, NODE_ID, 'PX', ttlMs, 'NX');
    if (got === 'OK') return true;
    const renewed = await c.eval(RENEW_LUA, 1, key, NODE_ID, String(ttlMs));
    return Number(renewed) === 1;
  } catch (_) {
    return true;
  }
}

/** Run fn only on the leader. Returns true if it ran. */
export async function runIfLeader(name, ttlMs, fn) {
  if (!(await isLeader(name, ttlMs))) return false;
  await fn();
  return true;
}

// ── "do this at most once per ttl across the whole cluster" ──────────────────
const localOnce = new Map();

/** True the first time `key` is seen within ttlSec cluster-wide (atomic SET NX EX). */
export async function setOnce(key, ttlSec) {
  const c = redis();
  if (c) {
    try {
      const res = await c.set(formatKey(`once:${key}`), '1', 'EX', ttlSec, 'NX');
      return res === 'OK';
    } catch (_) { /* fall through to local */ }
  }
  const now = Date.now();
  const prev = localOnce.get(key);
  if (prev && now - prev < ttlSec * 1000) return false;
  localOnce.set(key, now);
  if (localOnce.size > 50000) {
    for (const [k, t] of localOnce) if (now - t > ttlSec * 1000) localOnce.delete(k);
  }
  return true;
}

export async function clearOnce(key) {
  localOnce.delete(key);
  const c = redis();
  if (!c) return;
  try { await c.del(formatKey(`once:${key}`)); } catch (_) { /* ignore */ }
}

// ── cluster-visible host disconnect grace markers ────────────────────────────
// The grace TIMER lives in the process that saw the disconnect; this marker lets every other
// process (sweeper, REST join on another node) know a grace period is running.
export async function markHostGrace(roomId, seconds) {
  const c = redis();
  if (!c || !roomId) return;
  try { await c.set(formatKey(`host_grace:${roomId}`), NODE_ID, 'EX', Math.ceil(seconds) + 30); } catch (_) { /* ignore */ }
}

export async function clearHostGrace(roomId) {
  const c = redis();
  if (!c || !roomId) return;
  try { await c.del(formatKey(`host_grace:${roomId}`)); } catch (_) { /* ignore */ }
}

/** true = marker present, false = absent, null = unknown (Redis down). */
export async function hasHostGrace(roomId) {
  const c = redis();
  if (!c || !roomId) return null;
  try { return (await c.exists(formatKey(`host_grace:${roomId}`))) === 1; } catch (_) { return null; }
}

/** Is the user connected on ANY process (adapter-aware; local-only when no adapter). */
export async function isUserOnline(io, userId) {
  if (!io || !userId) return false;
  try {
    const sockets = await io.in(`user_${userId}`).fetchSockets();
    return sockets.length > 0;
  } catch (_) {
    return false;
  }
}

export async function roomHasSockets(io, roomId) {
  if (!io || !roomId) return false;
  try {
    const sockets = await io.in(String(roomId)).fetchSockets();
    return sockets.length > 0;
  } catch (_) {
    return false;
  }
}

/**
 * Run one-time startup work (DB schema/seed) on exactly one process; the others wait (up to
 * maxWaitMs) for it to finish instead of racing it. Without Redis every process just runs fn.
 */
export async function withStartupLock(name, fn, { lockTtlMs = 120000, maxWaitMs = 120000 } = {}) {
  // Redis connects asynchronously at boot; give it a moment so every process coordinates.
  for (let i = 0; i < 20 && !redis(); i++) await new Promise((r) => setTimeout(r, 100));
  const c = redis();
  if (!c) return fn();
  const lockKey = formatKey(`startup_lock:${name}`);
  const doneKey = formatKey(`startup_done:${name}`);
  try {
    const got = await c.set(lockKey, NODE_ID, 'PX', lockTtlMs, 'NX');
    if (got === 'OK') {
      try {
        await c.del(doneKey); // a stale marker from a previous deploy must not release waiters early
        const out = await fn();
        await c.set(doneKey, '1', 'EX', 300);
        return out;
      } finally {
        await c.del(lockKey).catch(() => {});
      }
    }
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      if ((await c.exists(doneKey)) === 1) return true;
      await new Promise((r) => setTimeout(r, 500));
    }
    return fn(); // lock holder died / took too long: do it ourselves
  } catch (_) {
    return fn();
  }
}
