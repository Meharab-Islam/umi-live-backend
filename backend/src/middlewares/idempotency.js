import '../config/env.js';
import crypto from 'crypto';
import { getRedisClient, formatKey } from '../config/redis.js';
import { identityKey } from '../services/rateLimiter.js';

/**
 * Idempotency-Key support for money-moving POSTs (gifts, purchases, withdrawals, packages).
 *
 * Why: on a flaky mobile network the app times out and retries a request the server already
 * processed -> double charge. With `Idempotency-Key: <uuid>` the retry returns the ORIGINAL response
 * instead of running the handler again.
 *
 *   first request   -> handler runs; its response (status < 500) is stored 24h
 *   same key again  -> stored response replayed, header `Idempotent-Replayed: true`
 *   same key, still running (concurrent retry) -> 409 `request_in_progress`
 *   same key, different body -> 422 `idempotency_key_reuse`
 *
 * Opt-in per request (old app versions that send no header behave exactly as before).
 * Needs Redis; if Redis is down the request just runs normally (fail-open, per AGENTS.md rule 2).
 */

const TTL_RESULT_SEC = 24 * 3600;
const TTL_LOCK_SEC = 60;
const MAX_STORED_BYTES = 64 * 1024;
const KEY_RE = /^[A-Za-z0-9_\-:.]{8,128}$/;

const bodyHash = (req) =>
  crypto.createHash('sha256').update(JSON.stringify(req.body ?? {})).digest('hex').slice(0, 32);

export async function idempotency(req, res, next) {
  try {
    if (req.method !== 'POST') return next();
    const headerKey = req.headers['idempotency-key'];
    if (!headerKey) return next();
    if (!KEY_RE.test(String(headerKey))) {
      return res.status(400).json({ success: false, message: 'Invalid Idempotency-Key (8-128 chars: letters, digits, _ - : .).' });
    }
    const who = identityKey(req);
    if (!who.startsWith('u:')) return next(); // only authenticated users

    const client = getRedisClient();
    if (!client || client.status !== 'ready') return next();

    const fingerprint = bodyHash(req);
    const base = `idem:${who}:${req.baseUrl || ''}${req.path}:${headerKey}`;
    const lockKey = formatKey(`${base}:lock`);
    const resKey = formatKey(`${base}:res`);

    const stored = await client.get(resKey);
    if (stored) {
      const rec = JSON.parse(stored);
      if (rec.fp !== fingerprint) {
        return res.status(422).json({ success: false, code: 'idempotency_key_reuse', message: 'This Idempotency-Key was already used with a different request.' });
      }
      res.setHeader('Idempotent-Replayed', 'true');
      return res.status(rec.status).json(rec.body);
    }

    const got = await client.set(lockKey, fingerprint, 'EX', TTL_LOCK_SEC, 'NX');
    if (got !== 'OK') {
      return res.status(409).json({ success: false, code: 'request_in_progress', message: 'The same request is still being processed. Please wait.' });
    }

    const origJson = res.json.bind(res);
    res.json = (body) => {
      // Fire-and-forget persistence; never delay or break the response.
      (async () => {
        try {
          if (res.statusCode < 500) {
            const payload = JSON.stringify({ status: res.statusCode, body, fp: fingerprint });
            if (payload.length <= MAX_STORED_BYTES) {
              await client.set(resKey, payload, 'EX', TTL_RESULT_SEC);
            }
          }
        } catch (_) { /* ignore */ }
        try { await client.del(lockKey); } catch (_) { /* ignore */ }
      })();
      return origJson(body);
    };
    // Aborted before any JSON was written (client hung up, crash): free the lock so a retry can run.
    res.on('close', () => {
      if (!res.writableEnded) client.del(lockKey).catch(() => {});
    });
    return next();
  } catch (_) {
    return next();
  }
}
