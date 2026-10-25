import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root and local backend .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

// Configuration with sensible production-grade defaults
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);
const PROJECT_NAME = process.env.PROJECT_NAME || 'umi';
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX !== undefined
  ? process.env.REDIS_KEY_PREFIX
  : `${PROJECT_NAME}:`;
const REDIS_CONNECT_TIMEOUT = parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10);
const REDIS_COMMAND_TIMEOUT = parseInt(process.env.REDIS_COMMAND_TIMEOUT || '2500', 10);

/**
 * Production-Grade Section-Based TTL Configuration
 * Allows fine-grained tuning per domain/entity via environment variables.
 * Each section has its own optimal default, minimum, and maximum clamp.
 */
export const CACHE_SECTIONS = {
  // 1. High-Frequency Real-Time Live Streaming (5s - 15s)
  LIVE_STREAM: {
    name: 'LIVE_STREAM',
    defaultTtl: parseInt(process.env.REDIS_TTL_LIVE_STREAM || '10', 10),
    minTtl: 3,
    maxTtl: 30,
    prefixes: ['live:', 'mobile:rooms:', 'mobile:live:', 'room:', 'mobile:room_details:', 'mobile:room:'],
  },

  // 2. Real-Time Wallets & Financial Balances (10s - 30s)
  WALLET: {
    name: 'WALLET',
    defaultTtl: parseInt(process.env.REDIS_TTL_WALLET || '20', 10),
    minTtl: 5,
    maxTtl: 60,
    prefixes: ['wallet:', 'user:balance:', 'withdrawal:', 'user:transactions:'],
  },

  // 3. User Notifications & Alerts (15s - 30s)
  NOTIFICATIONS: {
    name: 'NOTIFICATIONS',
    defaultTtl: parseInt(process.env.REDIS_TTL_NOTIFICATIONS || '20', 10),
    minTtl: 5,
    maxTtl: 60,
    prefixes: ['mobile:notifications:', 'notifications:'],
  },

  // 4. Leaderboards & Rankings (30s - 60s)
  LEADERBOARD: {
    name: 'LEADERBOARD',
    defaultTtl: parseInt(process.env.REDIS_TTL_LEADERBOARD || '60', 10),
    minTtl: 15,
    maxTtl: 180,
    prefixes: ['leaderboard:', 'agency:top:', 'admin:gifts:top_contributors'],
  },

  // 5. User Profiles, Levels & Privileges (30s - 120s)
  USER_PROFILE: {
    name: 'USER_PROFILE',
    defaultTtl: parseInt(process.env.REDIS_TTL_USER_PROFILE || '60', 10),
    minTtl: 10,
    maxTtl: 300,
    prefixes: ['user:', 'mobile:user:', 'mobile:profile:', 'user:packages:', 'user:privileges:', 'user:thumbnails:', 'user:entry_effects:'],
  },

  // 6. Host & Reseller Management (30s - 120s)
  RESELLER_AGENCY: {
    name: 'RESELLER_AGENCY',
    defaultTtl: parseInt(process.env.REDIS_TTL_RESELLER_AGENCY || '60', 10),
    minTtl: 15,
    maxTtl: 300,
    prefixes: ['reseller:', 'agency:', 'host:', 'moderator:'],
  },

  // 7. Platform Economy & Conversion Settings (30s - 120s)
  ECONOMY_CONFIG: {
    name: 'ECONOMY_CONFIG',
    defaultTtl: parseInt(process.env.REDIS_TTL_ECONOMY_CONFIG || '30', 10),
    minTtl: 10,
    maxTtl: 300,
    prefixes: ['setting:', 'settings:', 'host_ratios:', 'wallet:withdrawal:config', 'wallet:recharge:config', 'config:call_rates', 'config:star_progression'],
  },

  // 8. Visual Catalogs & Assets (Gifts, Thumbnails, Effects, Themes, Packages) (300s - 600s)
  CATALOG: {
    name: 'CATALOG',
    defaultTtl: parseInt(process.env.REDIS_TTL_CATALOG || '300', 10),
    minTtl: 60,
    maxTtl: 1800,
    prefixes: ['gifts:', 'thumbnails:', 'entry_effects:', 'packages:', 'themes:', 'levels:'],
  },

  // 9. Static System Settings & Banners (300s - 600s)
  SYSTEM_CONFIG: {
    name: 'SYSTEM_CONFIG',
    defaultTtl: parseInt(process.env.REDIS_TTL_SYSTEM_CONFIG || '300', 10),
    minTtl: 60,
    maxTtl: 3600,
    prefixes: ['config:mobile:app', 'config:screen_guard', 'banners:', 'system:maintenance:status'],
  },

  // 10. Transient Security Tokens & OTPs (120s - 300s)
  SECURITY_OTP: {
    name: 'SECURITY_OTP',
    defaultTtl: parseInt(process.env.REDIS_TTL_SECURITY_OTP || '300', 10),
    minTtl: 60,
    maxTtl: 900,
    prefixes: ['otp:', 'security:lockout:', 'security:ip:'],
  },

  // 11. Security Device & Hardware Bans (Long-lived: 7d - 30d)
  SECURITY_BAN: {
    name: 'SECURITY_BAN',
    defaultTtl: parseInt(process.env.REDIS_TTL_SECURITY_BAN || String(86400 * 7), 10), // 7 days default
    minTtl: 86400, // min 1 day
    maxTtl: 86400 * 30, // max 30 days
    prefixes: ['device:banned:', 'security:banned:', 'ip:banned:'],
  },

  // 12. Real-Time Chat & Private Messages (15s - 30s)
  CHAT: {
    name: 'CHAT',
    defaultTtl: parseInt(process.env.REDIS_TTL_CHAT || '20', 10),
    minTtl: 5,
    maxTtl: 60,
    prefixes: ['chat:', 'chat:conversations:', 'chat:messages:', 'chat:conv:'],
  },

  // 13. Social Feed, Moments & Posts (30s - 60s)
  FEED: {
    name: 'FEED',
    defaultTtl: parseInt(process.env.REDIS_TTL_FEED || '45', 10),
    minTtl: 10,
    maxTtl: 120,
    prefixes: ['feed:', 'feed:list:', 'feed:post:', 'feed:comments:', 'feed:reactions:'],
  },

  // 14. General Default Fallback
  DEFAULT: {
    name: 'DEFAULT',
    defaultTtl: parseInt(process.env.REDIS_DEFAULT_TTL || '180', 10),
    minTtl: 5,
    maxTtl: 3600,
    prefixes: [],
  },
};

let redisClient = null;
let isRedisConnected = false;

// In-flight fetch deduplication map (Singleflight / Mutex)
// Eliminates Cache Stampede (Thundering Herd): if multiple concurrent requests ask for the same missing key,
// only ONE query hits MySQL, while all other requests await that exact same promise.
const inFlightFetches = new Map();

// Pre-compute prefix-to-section mapping sorted by descending prefix length
// This guarantees specific prefixes (e.g. 'wallet:withdrawal:config') always take precedence over generic prefixes ('wallet:')
const SORTED_PREFIX_ENTRIES = Object.values(CACHE_SECTIONS)
  .flatMap((section) => (section.prefixes || []).map((prefix) => ({ prefix, section })))
  .sort((a, b) => b.prefix.length - a.prefix.length);

/**
 * Detect the appropriate cache section based on key prefix (Longest Prefix Match)
 */
export function resolveSectionForKey(key) {
  if (!key) return CACHE_SECTIONS.DEFAULT;
  const rawKey = stripKeyPrefix(key);

  for (const entry of SORTED_PREFIX_ENTRIES) {
    if (rawKey.startsWith(entry.prefix)) {
      return entry.section;
    }
  }

  return CACHE_SECTIONS.DEFAULT;
}

/**
 * Calculate jittered TTL tailored to the specific section of the key.
 * 1. Resolves the section for the key.
 * 2. If rawTtlSeconds is provided (>0), honors it within that section's min/max bounds.
 * 3. If rawTtlSeconds is omitted or <= 0, uses the section's dedicated defaultTtl.
 * 4. Applies ±10% to ±15% random jitter to eliminate expiration spikes (avoids Thundering Herd).
 */
export function calculateJitteredTtl(key, rawTtlSeconds = null) {
  const section = resolveSectionForKey(key);
  let baseTtl =
    rawTtlSeconds !== null && rawTtlSeconds !== undefined && !isNaN(parseInt(rawTtlSeconds, 10)) && parseInt(rawTtlSeconds, 10) > 0
      ? parseInt(rawTtlSeconds, 10)
      : section.defaultTtl;

  // Clamp within the section's safe bounds
  baseTtl = Math.max(section.minTtl, Math.min(baseTtl, section.maxTtl));

  // Add random jitter (±12%) to smooth out expiration curves
  const jitterRange = Math.max(2, Math.floor(baseTtl * 0.12));
  const jitter = Math.floor(Math.random() * (jitterRange * 2 + 1)) - jitterRange;

  return Math.max(section.minTtl, baseTtl + jitter);
}

// Format key with project namespace prefix (prevents collisions in shared Redis or cloned apps)
export function formatKey(key) {
  if (!key) return '';
  if (REDIS_KEY_PREFIX && !key.startsWith(REDIS_KEY_PREFIX)) {
    return `${REDIS_KEY_PREFIX}${key}`;
  }
  return key;
}

// Strip project namespace prefix when returning keys
export function stripKeyPrefix(key) {
  if (!key) return '';
  if (REDIS_KEY_PREFIX && key.startsWith(REDIS_KEY_PREFIX)) {
    return key.slice(REDIS_KEY_PREFIX.length);
  }
  return key;
}

// Command timeout wrapper: guarantees that hanging Redis operations never hold HTTP requests
function withTimeout(promise, ms = REDIS_COMMAND_TIMEOUT) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Redis command timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

try {
  const redisOptions = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_DB,
    lazyConnect: true,
    connectTimeout: REDIS_CONNECT_TIMEOUT,
    commandTimeout: REDIS_COMMAND_TIMEOUT,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    // Production Critical: disable offline queue to fail fast when disconnected
    // so API requests immediately fall back to MySQL without buffering memory or latency
    enableOfflineQueue: false,
    keepAlive: 10000,
    retryStrategy(times) {
      if (times > 25) {
        return 5000; // Cap retry backoff at 5 seconds
      }
      return Math.min(times * 150 + Math.random() * 100, 3000);
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
      return targetErrors.some((target) => err.message.includes(target));
    },
  };

  if (REDIS_PASSWORD && REDIS_PASSWORD.trim() !== '') {
    redisOptions.password = REDIS_PASSWORD.trim();
  }

  redisClient = new Redis(redisOptions);

  redisClient.on('connect', () => {
    console.log(`🔌 [Redis] Connected to ${REDIS_HOST}:${REDIS_PORT} (DB: ${REDIS_DB}, Prefix: "${REDIS_KEY_PREFIX}")`);
  });

  redisClient.on('ready', () => {
    isRedisConnected = true;
    console.log('⚡ [Redis Ready] Production-grade caching engine active and ready.');
  });

  let lastRedisWarnTime = 0;
  redisClient.on('error', (err) => {
    isRedisConnected = false;
    const now = Date.now();
    if (now - lastRedisWarnTime > 60000) {
      lastRedisWarnTime = now;
      if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
        console.warn(`⚠️ [Redis Disconnected]: ${err.message}. Direct DB queries active.`);
      } else {
        console.warn(`⚠️ [Redis Error]: ${err.message}`);
      }
    }
  });

  redisClient.on('close', () => {
    isRedisConnected = false;
  });

  // Connect asynchronously without blocking Node process startup
  redisClient.connect().catch((err) => {
    console.warn(`⚠️ [Redis Initial Connect Warning]: ${err.message}. Seamless MySQL fallback active.`);
  });
} catch (err) {
  console.warn('⚠️ Failed to initialize Redis client:', err.message);
}

/**
 * Production-Grade Cache Manager Helper
 * Enforces Database-First / Cache-Aside caching strategy.
 * Zero-downtime, non-blocking fallback on any Redis failure.
 */
export const cache = {
  client: redisClient,

  isConnected() {
    return Boolean(redisClient && isRedisConnected);
  },

  /**
   * Get parsed value from Redis
   */
  async get(key) {
    if (!this.isConnected() || !key) return null;
    try {
      const fullKey = formatKey(key);
      const data = await withTimeout(redisClient.get(fullKey));
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (err) {
      return null;
    }
  },

  /**
   * Set value in Redis with safe, bounded, section-tailored jittered TTL in seconds.
   * GUARANTEE: ALWAYS uses EX with a bounded TTL so Redis RAM never grows unboundedly.
   */
  async set(key, value, ttlSeconds = null) {
    if (!this.isConnected() || !key) return false;
    try {
      const fullKey = formatKey(key);
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      const safeTtl = calculateJitteredTtl(key, ttlSeconds);
      await withTimeout(redisClient.set(fullKey, serialized, 'EX', safeTtl));
      return true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Delete one or more keys using UNLINK (non-blocking background memory reclamation)
   */
  async del(...keys) {
    if (!this.isConnected() || keys.length === 0) return 0;
    try {
      const flatKeys = keys.flat().filter(Boolean).map(formatKey);
      if (flatKeys.length === 0) return 0;
      if (typeof redisClient.unlink === 'function') {
        return await withTimeout(redisClient.unlink(...flatKeys));
      }
      return await withTimeout(redisClient.del(...flatKeys));
    } catch (err) {
      return 0;
    }
  },

  /**
   * Non-blocking scan and unlink matching key patterns.
   * - Uses Redis UNLINK (asynchronous memory reclamation) instead of blocking DEL.
   * - Scans in chunks of 100 keys with cursor iteration.
   * - Safeguards against accidental global nukes (e.g. '*' or '').
   */
  async delByPattern(pattern) {
    if (!this.isConnected() || !pattern) return 0;
    try {
      const trimmed = String(pattern).trim();
      // Guard against accidental whole-database nukes that spike database load
      if (trimmed === '*' || trimmed === `${REDIS_KEY_PREFIX}*`) {
        console.warn(`⚠️ [Redis Guard] Broad pattern "${pattern}" blocked in delByPattern. Use cache.flush() if intentional.`);
        return 0;
      }

      const fullPattern = formatKey(trimmed);
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, matchingKeys] = await withTimeout(
          redisClient.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100)
        );
        cursor = nextCursor;

        if (matchingKeys && matchingKeys.length > 0) {
          if (typeof redisClient.unlink === 'function') {
            await withTimeout(redisClient.unlink(...matchingKeys));
          } else {
            await withTimeout(redisClient.del(...matchingKeys));
          }
          totalDeleted += matchingKeys.length;
        }
      } while (cursor !== '0');

      return totalDeleted;
    } catch (err) {
      return 0;
    }
  },

  /**
   * Production Cache-Aside Fetcher with:
   * 1. Cache hit -> immediate return
   * 2. Singleflight Deduplication -> If 50 requests miss simultaneously, only 1 DB query runs
   * 3. Section-tailored safe jittered TTL -> Prevents synchronized future expirations
   * 4. Zero-downtime MySQL fallback on any Redis error
   *
   * Signature supports both:
   *   getOrSet(key, ttlSeconds, fetchFn)
   *   getOrSet(key, fetchFn) // Auto-resolves section TTL
   */
  async getOrSet(key, ttlSecondsOrFetchFn, maybeFetchFn) {
    let ttlSeconds = null;
    let fetchFn = null;
    if (typeof ttlSecondsOrFetchFn === 'function') {
      fetchFn = ttlSecondsOrFetchFn;
      ttlSeconds = null;
    } else {
      ttlSeconds = ttlSecondsOrFetchFn;
      fetchFn = maybeFetchFn;
    }

    if (typeof fetchFn !== 'function') {
      return this.get(key);
    }

    // 1. Try cache hit first
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fullKey = formatKey(key);

    // 2. Singleflight: If this exact key is already being fetched by an active DB query, join it!
    if (inFlightFetches.has(fullKey)) {
      try {
        return await inFlightFetches.get(fullKey);
      } catch (err) {
        // Fall through to retry if in-flight failed
      }
    }

    // 3. Register single-flight promise
    const fetchPromise = (async () => {
      try {
        const freshData = await fetchFn();
        if (freshData !== null && freshData !== undefined) {
          // Asynchronously cache with safe section-tailored jittered TTL without blocking return
          this.set(key, freshData, ttlSeconds).catch(() => {});
        }
        return freshData;
      } finally {
        inFlightFetches.delete(fullKey);
      }
    })();

    inFlightFetches.set(fullKey, fetchPromise);
    return await fetchPromise;
  },

  // Expose section metadata and utility helpers
  SECTIONS: CACHE_SECTIONS,
  resolveSection: resolveSectionForKey,
  calculateTtl: calculateJitteredTtl,

  /**
   * Flush entire cache for this prefix or DB
   */
  async flush() {
    if (!this.isConnected()) return false;
    try {
      if (REDIS_KEY_PREFIX) {
        let cursor = '0';
        do {
          const [nextCursor, matchingKeys] = await withTimeout(
            redisClient.scan(cursor, 'MATCH', `${REDIS_KEY_PREFIX}*`, 'COUNT', 200)
          );
          cursor = nextCursor;
          if (matchingKeys && matchingKeys.length > 0) {
            if (typeof redisClient.unlink === 'function') {
              await withTimeout(redisClient.unlink(...matchingKeys));
            } else {
              await withTimeout(redisClient.del(...matchingKeys));
            }
          }
        } while (cursor !== '0');
        return true;
      }
      await withTimeout(redisClient.flushdb());
      return true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Health check utility for monitoring / status endpoints
   */
  async healthCheck() {
    if (!this.isConnected()) {
      return { status: 'offline', connected: false, message: 'Redis not connected' };
    }
    const start = Date.now();
    try {
      await withTimeout(redisClient.ping(), 1500);
      const latencyMs = Date.now() - start;
      return {
        status: 'healthy',
        connected: true,
        latencyMs,
        prefix: REDIS_KEY_PREFIX,
        host: REDIS_HOST,
        port: REDIS_PORT,
      };
    } catch (err) {
      return { status: 'degraded', connected: false, error: err.message };
    }
  },
};

export default cache;
