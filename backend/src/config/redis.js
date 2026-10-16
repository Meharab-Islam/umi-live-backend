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
const REDIS_DEFAULT_TTL = parseInt(process.env.REDIS_DEFAULT_TTL || '300', 10);

let redisClient = null;
let isRedisConnected = false;

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
    if (!this.isConnected()) return null;
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
   * Set value in Redis with TTL in seconds (default: REDIS_DEFAULT_TTL)
   */
  async set(key, value, ttlSeconds = REDIS_DEFAULT_TTL) {
    if (!this.isConnected()) return false;
    try {
      const fullKey = formatKey(key);
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      const ttl = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : REDIS_DEFAULT_TTL;
      await withTimeout(redisClient.set(fullKey, serialized, 'EX', ttl));
      return true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Delete one or more keys
   */
  async del(...keys) {
    if (!this.isConnected() || keys.length === 0) return 0;
    try {
      const flatKeys = keys.flat().filter(Boolean).map(formatKey);
      if (flatKeys.length === 0) return 0;
      return await withTimeout(redisClient.del(...flatKeys));
    } catch (err) {
      return 0;
    }
  },

  /**
   * Non-blocking scan and delete matching key patterns (e.g. "banners:*", "users:*")
   */
  async delByPattern(pattern) {
    if (!this.isConnected()) return 0;
    try {
      const fullPattern = formatKey(pattern);
      let cursor = '0';
      let totalDeleted = 0;
      do {
        const [nextCursor, matchingKeys] = await withTimeout(
          redisClient.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100)
        );
        cursor = nextCursor;
        if (matchingKeys && matchingKeys.length > 0) {
          await withTimeout(redisClient.del(...matchingKeys));
          totalDeleted += matchingKeys.length;
        }
      } while (cursor !== '0');
      return totalDeleted;
    } catch (err) {
      return 0;
    }
  },

  /**
   * Cache-Aside Fetcher:
   * 1. Try to read from Redis (Cache Hit)
   * 2. If Miss or Redis Offline -> Execute fetchFn(), save to Redis with TTL, and return
   */
  async getOrSet(key, ttlSeconds, fetchFn) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // Cache Miss or Redis Offline -> Execute DB Query
    const freshData = await fetchFn();
    if (freshData !== null && freshData !== undefined) {
      // Background cache set so client response is never delayed
      this.set(key, freshData, ttlSeconds).catch(() => {});
    }
    return freshData;
  },

  /**
   * Flush entire cache for this prefix or DB
   */
  async flush() {
    if (!this.isConnected()) return false;
    try {
      if (REDIS_KEY_PREFIX) {
        await this.delByPattern('*');
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
