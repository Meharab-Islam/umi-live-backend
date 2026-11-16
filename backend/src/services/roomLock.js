import '../config/env.js';
import { AsyncLocalStorage } from 'async_hooks';
import { getRedisClient, formatKey } from '../config/redis.js';
import { NODE_ID } from './clusterGuard.js';
import { metrics } from './metrics.js';

/**
 * Per-room mutual exclusion for seat mutations (take / leave / switch / approve / kick / promote /
 * compact / lock / mute / seat-count / end ...).
 *
 * The race it removes: two requests for the SAME room read the seat table, each computes its own
 * "next layout", and each writes it. Interleaved, they produce duplicated users, gaps, or one
 * user's change silently overwriting another's (compactRoomGuestSeats, takeSeat + approve + leave
 * at the same instant, host promote while a guest leaves...).
 *
 * Design
 *  - Two layers: an in-process FIFO queue (cheap, no Redis round-trips for same-process contention)
 *    then a Redis lease lock (SET NX PX + owner token) for cross-process / cross-machine exclusion.
 *  - Reentrant via AsyncLocalStorage: a handler that already holds the room lock can call
 *    handleUserSeatDeparture()/compactRoomGuestSeats() (which lock internally) without deadlocking.
 *  - Lease is renewed by a watchdog while the work runs and force-released after `maxHoldMs`, so a
 *    crashed process or a stuck handler can never wedge a room forever.
 *  - Fail-open on Redis trouble (AGENTS.md rule 2): the local queue still serialises within a process.
 *  - Acquire timeout => request path answers 503 `room_busy` (client retries); internal/background
 *    callers run unlocked rather than skip cleanup.
 */

const als = new AsyncLocalStorage();

const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

export const ROOM_LOCK = {
  ttlMs: int(process.env.ROOM_LOCK_TTL_MS, 8000), // Redis lease; renewed by the watchdog
  waitMs: int(process.env.ROOM_LOCK_WAIT_MS, 5000), // how long to queue for the lock
  maxHoldMs: int(process.env.ROOM_LOCK_MAX_HOLD_MS, 30000), // hard cap on one holder
};

export class RoomBusyError extends Error {
  constructor(room) {
    super(`Room ${room} is busy`);
    this.code = 'ROOM_BUSY';
  }
}

// ── layer 1: in-process FIFO ────────────────────────────────────────────────
const locals = new Map(); // key -> { locked: boolean, waiters: [{resolve, timer}] }

function acquireLocal(key, waitMs) {
  let e = locals.get(key);
  if (!e) {
    e = { locked: false, waiters: [] };
    locals.set(key, e);
  }
  if (!e.locked) {
    e.locked = true;
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const w = { resolve, timer: null };
    w.timer = setTimeout(() => {
      const i = e.waiters.indexOf(w);
      if (i !== -1) e.waiters.splice(i, 1);
      resolve(false);
    }, waitMs);
    e.waiters.push(w);
  });
}

function releaseLocal(key) {
  const e = locals.get(key);
  if (!e) return;
  const next = e.waiters.shift();
  if (next) {
    clearTimeout(next.timer);
    next.resolve(true); // ownership passes straight to the next waiter (stays locked)
  } else {
    locals.delete(key);
  }
}

// ── layer 2: Redis lease ────────────────────────────────────────────────────
const RENEW_LUA = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('pexpire', KEYS[1], ARGV[2])
end
return 0`;
const RELEASE_LUA = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0`;

let tokenSeq = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function acquireRedis(key, deadline) {
  const c = getRedisClient();
  if (!c || c.status !== 'ready') return { ok: true, token: null }; // fail-open
  const token = `${NODE_ID}:${++tokenSeq}`;
  const rkey = formatKey(`roomlock:${key}`);
  while (Date.now() < deadline) {
    try {
      const got = await c.set(rkey, token, 'PX', ROOM_LOCK.ttlMs, 'NX');
      if (got === 'OK') return { ok: true, token, rkey };
    } catch (_) {
      return { ok: true, token: null }; // Redis hiccup: fail-open
    }
    await sleep(10 + Math.floor(Math.random() * 25));
  }
  return { ok: false };
}

/**
 * Acquire the lock for a room. Resolves to a `release()` function, or throws RoomBusyError.
 * Prefer withRoomLock()/roomLockMiddleware(); this is the primitive.
 */
async function acquire(key, waitMs) {
  const t0 = Date.now();
  const deadline = t0 + waitMs;
  if (!(await acquireLocal(key, waitMs))) {
    metrics.roomLockTimeouts.inc();
    throw new RoomBusyError(key);
  }
  let redisLease;
  try {
    redisLease = await acquireRedis(key, deadline);
  } catch (err) {
    releaseLocal(key);
    throw err;
  }
  if (!redisLease.ok) {
    releaseLocal(key);
    metrics.roomLockTimeouts.inc();
    throw new RoomBusyError(key);
  }
  metrics.roomLockWait.observe((Date.now() - t0) / 1000);

  let released = false;
  const c = getRedisClient();
  let watchdog = null;
  let forceTimer = null;

  const release = async () => {
    if (released) return;
    released = true;
    clearInterval(watchdog);
    clearTimeout(forceTimer);
    if (redisLease.token && c) {
      try { await c.eval(RELEASE_LUA, 1, redisLease.rkey, redisLease.token); } catch (_) { /* lease expires on its own */ }
    }
    releaseLocal(key);
  };

  if (redisLease.token && c) {
    watchdog = setInterval(() => {
      c.eval(RENEW_LUA, 1, redisLease.rkey, redisLease.token, String(ROOM_LOCK.ttlMs)).catch(() => {});
    }, Math.max(500, Math.floor(ROOM_LOCK.ttlMs / 3)));
    if (watchdog.unref) watchdog.unref();
  }
  // A stuck holder must not block a room forever.
  forceTimer = setTimeout(() => {
    console.warn(`[roomLock] force-releasing ${key} after ${ROOM_LOCK.maxHoldMs}ms`);
    release();
  }, ROOM_LOCK.maxHoldMs);
  if (forceTimer.unref) forceTimer.unref();

  return release;
}

function holds(key) {
  const store = als.getStore();
  return Boolean(store && store.has(key));
}

function storeWith(key) {
  const next = new Set(als.getStore() || []);
  next.add(key);
  return next;
}

/**
 * Run fn while holding the room lock. Reentrant for the same room.
 * @param {string} roomKey canonical room id (use the canonical `room_id`, not the numeric id)
 * @param {Function} fn
 * @param {{waitMs?:number, onBusy?:'throw'|'run'}} opts onBusy:'run' = run unlocked if the lock cannot
 *        be obtained in time (background cleanup that must not be skipped)
 */
export async function withRoomLock(roomKey, fn, opts = {}) {
  const key = String(roomKey || '');
  if (!key || holds(key)) return fn();
  let release;
  try {
    release = await acquire(key, opts.waitMs ?? ROOM_LOCK.waitMs);
  } catch (err) {
    if (err instanceof RoomBusyError && opts.onBusy === 'run') {
      console.warn(`[roomLock] ${key} busy; running unlocked (cleanup path)`);
      return fn();
    }
    throw err;
  }
  try {
    return await als.run(storeWith(key), fn);
  } finally {
    await release();
  }
}

/**
 * Express middleware: serialises every non-GET request for the room in req.canonicalRoomId.
 * Mount AFTER the router.param('roomId') resolver so the canonical id is known.
 * The lock is held until the response finishes (or the connection closes).
 */
export function roomLockMiddleware(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const key = req.canonicalRoomId;
  if (!key || holds(key)) return next();

  acquire(key, ROOM_LOCK.waitMs)
    .then((release) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        release();
      };
      res.once('finish', finish);
      res.once('close', finish);
      als.run(storeWith(key), () => next());
    })
    .catch((err) => {
      if (err instanceof RoomBusyError) {
        res.setHeader('Retry-After', '1');
        return res.status(503).json({
          success: false,
          code: 'room_busy',
          message: 'This room is handling another change right now. Please try again in a moment.',
          retry_after: 1,
        });
      }
      return next(err);
    });
}
