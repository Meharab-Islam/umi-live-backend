import '../config/env.js';
import { getRedisClient, formatKey } from '../config/redis.js';
import { verifyToken } from '../config/jwt.js';
import { metrics } from './metrics.js';

/**
 * Distributed fixed-window rate limiter (Redis, shared by every Node process / machine).
 *
 * - Atomic: one Lua script does INCR + PEXPIRE, so no race between nodes.
 * - Fail-OPEN per AGENTS.md rule 2: if Redis is down/slow we fall back to a per-process
 *   in-memory counter instead of rejecting users or blocking the request.
 * - Keys go through formatKey() so multiple projects sharing a Redis never collide.
 */

const LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return {c, ttl}
`;

// ── in-memory fallback (per process) ─────────────────────────────────────────
const mem = new Map();
const memGc = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of mem) if (v.resetAt <= now) mem.delete(k);
}, 30000);
if (memGc.unref) memGc.unref();

function memConsume(key, windowMs) {
  const now = Date.now();
  let e = mem.get(key);
  if (!e || e.resetAt <= now) {
    e = { count: 0, resetAt: now + windowMs };
    mem.set(key, e);
  }
  e.count += 1;
  return { count: e.count, ttlMs: e.resetAt - now };
}

/**
 * @returns {Promise<{allowed:boolean, count:number, limit:number, remaining:number, resetMs:number, source:'redis'|'memory'}>}
 */
export async function consume(name, id, limit, windowSec) {
  const windowMs = windowSec * 1000;
  const key = formatKey(`rl:${name}:${id}`);
  let count;
  let ttlMs;
  let source = 'redis';
  try {
    const client = getRedisClient();
    if (!client || client.status !== 'ready') throw new Error('redis not ready');
    const res = await client.eval(LUA, 1, key, String(windowMs));
    count = Number(res[0]);
    ttlMs = Number(res[1]);
    if (!(ttlMs > 0)) ttlMs = windowMs;
  } catch (_) {
    source = 'memory';
    ({ count, ttlMs } = memConsume(key, windowMs));
  }
  return {
    allowed: count <= limit,
    count,
    limit,
    remaining: Math.max(0, limit - count),
    resetMs: ttlMs,
    source,
  };
}

/** Real client IP. Relies on app.set('trust proxy') so X-Forwarded-For cannot be spoofed past the proxy. */
export function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/** Identity key: verified JWT user if present, otherwise IP. */
export function identityKey(req) {
  const h = req.headers?.authorization;
  if (h && h.startsWith('Bearer ')) {
    const decoded = verifyToken(h.slice(7));
    if (decoded?.id) return `u:${decoded.id}`;
  }
  return `ip:${clientIp(req)}`;
}

/**
 * Express middleware factory.
 * @param {{name:string, limit:number, windowSec:number, key?:(req)=>string, message?:string, skip?:(req)=>boolean}} opts
 */
export function rateLimit({ name, limit, windowSec, key = (req) => `ip:${clientIp(req)}`, message, skip }) {
  return async function rateLimitMiddleware(req, res, next) {
    try {
      if (skip && skip(req)) return next();
      const r = await consume(name, key(req), limit, windowSec);
      res.setHeader('RateLimit-Limit', String(r.limit));
      res.setHeader('RateLimit-Remaining', String(r.remaining));
      res.setHeader('RateLimit-Reset', String(Math.ceil(r.resetMs / 1000)));
      if (!r.allowed) {
        const retry = Math.max(1, Math.ceil(r.resetMs / 1000));
        res.setHeader('Retry-After', String(retry));
        metrics.rateLimited.inc({ limiter: name });
        return res.status(429).json({
          success: false,
          message: message || 'Too many requests. Please slow down and try again shortly.',
          retry_after: retry,
        });
      }
      return next();
    } catch (_) {
      return next(); // never let the limiter itself take the API down
    }
  };
}

const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

/** Ready-made limiters (all tunable via .env, see .env.example "RATE LIMITING"). */
export const limiters = {
  // Mobile carrier NAT shares one IP between thousands of users => keep the per-IP ceiling generous.
  globalIp: rateLimit({
    name: 'global_ip',
    limit: int(process.env.RATE_LIMIT_GLOBAL_IP_PER_MIN, 3000),
    windowSec: 60,
    // Health/readiness probes come from LBs every few seconds and must never be throttled.
    skip: (req) => req.path === '/health' || req.path === '/ready',
  }),
  // Per authenticated user (or IP when anonymous) across the whole mobile API.
  mobileIdentity: rateLimit({
    name: 'mobile_identity',
    limit: int(process.env.RATE_LIMIT_USER_PER_MIN, 600),
    windowSec: 60,
    key: identityKey,
  }),
  // Login / register / OTP / social login: brute-force and SMS-bombing protection.
  auth: rateLimit({
    name: 'auth',
    limit: int(process.env.RATE_LIMIT_AUTH_PER_MIN, 60),
    windowSec: 60,
    skip: (req) => req.method !== 'POST',
    message: 'Too many attempts. Please wait a minute and try again.',
  }),
  // Money paths: gifts / wallet / packages.
  money: rateLimit({
    name: 'money',
    limit: int(process.env.RATE_LIMIT_MONEY_PER_MIN, 120),
    windowSec: 60,
    key: identityKey,
  }),
  // Join / leave / create live rooms.
  liveAction: rateLimit({
    name: 'live_action',
    limit: int(process.env.RATE_LIMIT_LIVE_ACTION_PER_MIN, 90),
    windowSec: 60,
    key: identityKey,
    skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  }),
  // Uploads are heavy.
  upload: rateLimit({
    name: 'upload',
    limit: int(process.env.RATE_LIMIT_UPLOAD_PER_MIN, 30),
    windowSec: 60,
    key: identityKey,
    skip: (req) => !String(req.headers['content-type'] || '').startsWith('multipart/'),
  }),
};
