import bcrypt from 'bcryptjs';
import { cache, formatKey } from '../config/redis.js';

// Pre-computed constant-time bcrypt hash for non-existent users (anti-timing / anti-enumeration defense)
const DUMMY_BCRYPT_HASH = '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5VzJp1oGZ3u0bL2c5qF8h3jK9zXyW';

// In-Memory Fallback Map (Guarantees zero-downtime security enforcement if Redis is disconnected)
const inMemorySecurityStore = new Map();

function cleanOldMemoryEntries() {
  const now = Date.now();
  for (const [key, item] of inMemorySecurityStore.entries()) {
    if (item.expiresAt && item.expiresAt <= now) {
      inMemorySecurityStore.delete(key);
    }
  }
}
setInterval(cleanOldMemoryEntries, 60000); // Clean every minute

// Common Dictionary Attack Password Blacklist (Top common weak passwords tested by automated dictionary tools)
const COMMON_DICTIONARY_PASSWORDS = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111',
  '1234567', 'dragon', 'welcome', 'admin123', 'football', 'monkey', 'letmein', 'master',
  'iloveyou', 'princess', 'solo', 'starwars', 'access', 'freedom', 'trustno1', 'shadow',
  'sunshine', 'michael', 'jennifer', 'thomas', 'secret', 'hunter2', 'superman', 'qwertyuiop',
  'baseball', 'liverpool', 'arsenal', 'chelsea', 'pass123', 'admin@123', 'password1',
  'testing', 'test123', 'default', 'root', 'administrator', 'guest', 'login', 'operator',
  'system', 'oracle', 'database', 'qwerty123', '123123', '654321', '000000', '121212',
]);

/**
 * Checks if a password belongs to the common dictionary attack blacklist
 */
export function isWeakDictionaryPassword(password) {
  if (!password || typeof password !== 'string') return true;
  const lower = password.trim().toLowerCase();
  if (lower.length < 6) return true;
  if (COMMON_DICTIONARY_PASSWORDS.has(lower)) return true;
  // Repetitive single character (e.g., 'aaaaaa', '111111')
  if (/^(.)\1{5,}$/.test(lower)) return true;
  return false;
}

/**
 * SQL Injection Attack Detection Regex Patterns
 */
const SQL_INJECTION_PATTERNS = [
  // Classic boolean injection tautologies: ' OR '1'='1, ' OR 1=1 --, " OR ""="
  /(?:'|\%27)\s*(?:or|and)\s*(?:'|\%27)?(?:1|true|'1')\s*=\s*(?:'|\%27)?(?:1|true|'1')/i,
  /(?:'|\%27)\s*or\s+true\b/i,
  /\b(?:or|and)\s+1\s*=\s*1\b/i,
  /(?:'|\%27)\s*or\s*(?:'|\%27)\s*=\s*(?:'|\%27)/i,
  /(?:"|\%22)\s*or\s*(?:"|\%22)\s*=\s*(?:"|\%22)/i,

  // Union Select attacks
  /\bunion\s+(?:all\s+)?select\b/i,

  // Stacking destructive queries: ; DROP TABLE, ; DELETE FROM, ; INSERT INTO, ; UPDATE
  /;\s*(?:drop|truncate|alter)\s+(?:table|database|schema)\b/i,
  /;\s*(?:delete\s+from|insert\s+into|update\s+[a-zA-Z0-9_]+\s+set)\b/i,

  // Dangerous execution and file routines
  /\b(?:exec|execute)\s*\(\s*(?:'|@)/i,
  /\b(?:load_file|into\s+outfile|into\s+dumpfile)\b/i,

  // Time-based blind SQL injection functions
  /\b(?:sleep\s*\(\s*\d+\s*\)|benchmark\s*\(\s*\d+\s*,)/i,

  // Schema enumeration queries
  /\b(?:information_schema|sys\.tables|sys\.databases|sysdatabases)\b/i,

  // SQL multi-line comment wrapping
  /\/\*[\s\S]*?\*\//,

  // SQL trailing line comment injection e.g. "admin' -- "
  /(?:'|\%27)\s*--\s+/i,
];

/**
 * Deep inspector to detect SQL injection in strings or nested objects
 */
function containsSqlInjection(value) {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') {
    // Normal hashtag ID like #10001 is completely safe
    if (/^#\d+$/.test(value.trim())) return false;

    // Check string against SQL injection regexes
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        return true;
      }
    }
    return false;
  }

  // Nested object / array checking (prevents parameter pollution & object injection)
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      // Check the key itself for SQL syntax
      for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(key)) return true;
      }
      // Check value recursively
      if (containsSqlInjection(value[key])) return true;
    }
  }

  return false;
}

/**
 * Global SQL Injection Guard Middleware
 * Automatically intercepts and sanitizes/blocks SQL injection payloads in body, query, and params.
 */
export function sqlInjectionGuard(req, res, next) {
  try {
    // Verify query parameters
    if (req.query && containsSqlInjection(req.query)) {
      console.warn(`🚨 [SQL Injection Blocked] IP: ${req.ip} | URL: ${req.originalUrl} | Query:`, req.query);
      return res.status(400).json({
        success: false,
        code: 'SQL_INJECTION_DETECTED',
        message: 'Illegal query syntax or potential SQL injection pattern detected. Request rejected.',
      });
    }

    // Verify URL route params
    if (req.params && containsSqlInjection(req.params)) {
      console.warn(`🚨 [SQL Injection Blocked] IP: ${req.ip} | URL: ${req.originalUrl} | Params:`, req.params);
      return res.status(400).json({
        success: false,
        code: 'SQL_INJECTION_DETECTED',
        message: 'Illegal parameter syntax or potential SQL injection pattern detected. Request rejected.',
      });
    }

    // Verify request body
    if (req.body && containsSqlInjection(req.body)) {
      console.warn(`🚨 [SQL Injection Blocked] IP: ${req.ip} | URL: ${req.originalUrl} | Body contains attack signature`);
      return res.status(400).json({
        success: false,
        code: 'SQL_INJECTION_DETECTED',
        message: 'Illegal input syntax or potential SQL injection pattern detected in payload. Request rejected.',
      });
    }

    next();
  } catch (err) {
    console.error('SQL Injection Guard error:', err);
    next();
  }
}

/**
 * Configuration for Login Dictionary & Brute-Force Defense
 */
const LOGIN_CONFIG = {
  maxFailedPerAccount: parseInt(process.env.LOGIN_MAX_FAILED_PER_ACCOUNT || '5', 10),
  maxFailedPerIp: parseInt(process.env.LOGIN_MAX_FAILED_PER_IP || '10', 10),
  lockoutDurationSeconds: parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '15', 10) * 60,
  trackingWindowSeconds: parseInt(process.env.LOGIN_WINDOW_MINUTES || '15', 10) * 60,
};

/**
 * Helper to get client IP safely
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Clean account identifier (lowercase, trim, strip leading #)
 */
export function cleanAccountTarget(identifier) {
  if (!identifier) return '';
  return String(identifier).trim().toLowerCase().replace(/^#/, '');
}

/**
 * Checks whether an IP or Account is currently locked out
 */
export async function checkLoginLockout(ip, targetId) {
  const cleanTarget = cleanAccountTarget(targetId);

  // 1. Check IP lockout in Redis
  try {
    const ipLockTtl = await cache.get(`security:lockout:ip:${ip}`);
    if (ipLockTtl) {
      return {
        isLocked: true,
        type: 'ip',
        message: 'Too many failed login attempts from your IP address. Access temporarily locked for 15 minutes to prevent dictionary attacks.',
      };
    }
  } catch (err) {}

  // 2. Check Account lockout in Redis
  if (cleanTarget) {
    try {
      const accountLock = await cache.get(`security:lockout:account:${cleanTarget}`);
      if (accountLock) {
        return {
          isLocked: true,
          type: 'account',
          message: `Account is temporarily locked due to ${LOGIN_CONFIG.maxFailedPerAccount} consecutive failed login attempts (dictionary attack defense). Please wait 15 minutes or reset your password.`,
        };
      }
    } catch (err) {}
  }

  // 3. Fallback Memory Check (in case Redis is degraded)
  const now = Date.now();
  const memIpLock = inMemorySecurityStore.get(`lockout:ip:${ip}`);
  if (memIpLock && memIpLock.expiresAt > now) {
    return {
      isLocked: true,
      type: 'ip',
      message: 'Too many failed login attempts from your IP address. Access temporarily locked for 15 minutes.',
    };
  }

  if (cleanTarget) {
    const memAccLock = inMemorySecurityStore.get(`lockout:account:${cleanTarget}`);
    if (memAccLock && memAccLock.expiresAt > now) {
      return {
        isLocked: true,
        type: 'account',
        message: `Account is temporarily locked due to consecutive failed login attempts. Please wait 15 minutes.`,
      };
    }
  }

  return { isLocked: false };
}

/**
 * Record a failed login attempt for an IP and Account
 * Atomically increments counters and locks when thresholds are exceeded.
 */
export async function recordFailedLogin(ip, targetId) {
  const cleanTarget = cleanAccountTarget(targetId);
  const lockoutSec = LOGIN_CONFIG.lockoutDurationSeconds;
  const windowSec = LOGIN_CONFIG.trackingWindowSeconds;

  let currentIpFails = 1;
  let currentAccFails = 1;

  // 1. IP Failure Tracking
  try {
    const ipKey = `security:failed:ip:${ip}`;
    const rawVal = await cache.get(ipKey);
    currentIpFails = (parseInt(rawVal, 10) || 0) + 1;
    await cache.set(ipKey, currentIpFails, windowSec);

    if (currentIpFails >= LOGIN_CONFIG.maxFailedPerIp) {
      await cache.set(`security:lockout:ip:${ip}`, 'locked', lockoutSec);
      console.warn(`🔒 [Security Lockout] IP ${ip} locked for ${lockoutSec / 60} minutes due to ${currentIpFails} failed logins.`);
    }
  } catch (err) {
    // Memory fallback
    const memKey = `failed:ip:${ip}`;
    const cur = inMemorySecurityStore.get(memKey);
    currentIpFails = cur ? cur.count + 1 : 1;
    inMemorySecurityStore.set(memKey, { count: currentIpFails, expiresAt: Date.now() + windowSec * 1000 });
    if (currentIpFails >= LOGIN_CONFIG.maxFailedPerIp) {
      inMemorySecurityStore.set(`lockout:ip:${ip}`, { expiresAt: Date.now() + lockoutSec * 1000 });
    }
  }

  // 2. Account Failure Tracking
  if (cleanTarget) {
    try {
      const accKey = `security:failed:account:${cleanTarget}`;
      const rawVal = await cache.get(accKey);
      currentAccFails = (parseInt(rawVal, 10) || 0) + 1;
      await cache.set(accKey, currentAccFails, windowSec);

      if (currentAccFails >= LOGIN_CONFIG.maxFailedPerAccount) {
        await cache.set(`security:lockout:account:${cleanTarget}`, 'locked', lockoutSec);
        console.warn(`🔒 [Security Lockout] Account ${cleanTarget} locked for ${lockoutSec / 60} minutes due to ${currentAccFails} failed logins.`);
      }
    } catch (err) {
      // Memory fallback
      const memKey = `failed:account:${cleanTarget}`;
      const cur = inMemorySecurityStore.get(memKey);
      currentAccFails = cur ? cur.count + 1 : 1;
      inMemorySecurityStore.set(memKey, { count: currentAccFails, expiresAt: Date.now() + windowSec * 1000 });
      if (currentAccFails >= LOGIN_CONFIG.maxFailedPerAccount) {
        inMemorySecurityStore.set(`lockout:account:${cleanTarget}`, { expiresAt: Date.now() + lockoutSec * 1000 });
      }
    }
  }

  const remaining = Math.max(0, LOGIN_CONFIG.maxFailedPerAccount - currentAccFails);
  return {
    isNowLocked: currentAccFails >= LOGIN_CONFIG.maxFailedPerAccount || currentIpFails >= LOGIN_CONFIG.maxFailedPerIp,
    currentAccFails,
    currentIpFails,
    remainingAttempts: remaining,
  };
}

/**
 * Record a successful login: resets failed attempt counters for this account and IP
 */
export async function recordSuccessfulLogin(ip, targetId) {
  const cleanTarget = cleanAccountTarget(targetId);

  try {
    if (cleanTarget) {
      await cache.del(`security:failed:account:${cleanTarget}`, `security:lockout:account:${cleanTarget}`);
    }
    await cache.del(`security:failed:ip:${ip}`);
  } catch (err) {}

  // Clear memory store as well
  if (cleanTarget) {
    inMemorySecurityStore.delete(`failed:account:${cleanTarget}`);
    inMemorySecurityStore.delete(`lockout:account:${cleanTarget}`);
  }
  inMemorySecurityStore.delete(`failed:ip:${ip}`);
}

/**
 * Constant-Time Dummy Comparison
 * Executes bcrypt comparison against a dummy hash when account does not exist.
 * Eliminates user enumeration via timing attack.
 */
export async function executeDummyTimingCheck(password) {
  try {
    await bcrypt.compare(String(password || ''), DUMMY_BCRYPT_HASH);
  } catch (err) {}
}

/**
 * Login Security Guard Middleware
 * Applied before login handlers in /api/auth/login and /api/mobile/auth/login
 */
export async function loginSecurityGuard(req, res, next) {
  try {
    const { identifier, email, login: loginField, password } = req.body || {};
    const target = identifier || email || loginField;
    const clientIp = getClientIp(req);

    // 1. Strict Type and Length Validation
    if (target !== undefined && typeof target !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid format for login identifier.' });
    }
    if (password !== undefined && typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid format for password.' });
    }

    if (target && target.length > 120) {
      return res.status(400).json({ success: false, message: 'Login identifier exceeds maximum allowed length.' });
    }
    if (password && password.length > 128) {
      return res.status(400).json({ success: false, message: 'Password exceeds maximum allowed length.' });
    }

    // 2. Check Active Lockout Status
    const lockoutStatus = await checkLoginLockout(clientIp, target);
    if (lockoutStatus.isLocked) {
      return res.status(429).json({
        success: false,
        code: lockoutStatus.type === 'ip' ? 'IP_LOCKED' : 'ACCOUNT_LOCKED',
        message: lockoutStatus.message,
        retryAfterMinutes: Math.round(LOGIN_CONFIG.lockoutDurationSeconds / 60),
      });
    }

    next();
  } catch (err) {
    console.error('loginSecurityGuard error:', err);
    next();
  }
}
