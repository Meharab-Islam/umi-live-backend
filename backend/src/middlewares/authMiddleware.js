import { verifyToken } from '../config/jwt.js';
import { query } from '../config/db.js';
import { cache } from '../config/redis.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    // Fetch user from Redis cache first; fall back to DB on miss
    const user = await cache.getOrSet(`user:${decoded.id}`, 60, async () => {
      const users = await query('SELECT id, email, full_name, avatar_url, role, host_type, coins, diamonds, level, is_banned FROM users WHERE id = ?', [decoded.id]);
      return users && users.length > 0 ? users[0] : null;
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    if (user.is_banned) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended by administration.' });
    }

    // Check device ban if device header is present
    const deviceId = req.headers['x-device-id'];
    if (deviceId) {
      const isDeviceBanned = await cache.getOrSet(`device:banned:${deviceId}`, 300, async () => {
        const devRows = await query('SELECT is_banned FROM user_devices WHERE device_id = ? AND is_banned = TRUE LIMIT 1', [deviceId]);
        return devRows && devRows.length > 0;
      });
      if (isDeviceBanned) {
        return res.status(403).json({ success: false, message: 'This device has been banned from accessing the platform. Please contact support.' });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('requireAuth error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error in auth verification.' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Forbidden. Admin privileges required.' });
  }

  next();
}

export function requireModerator(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. No session found.' });
  }

  if (req.user.role !== 'moderator' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Forbidden. Moderator privileges required.' });
  }

  next();
}

export function requireReseller(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. No session found.' });
  }

  if (req.user.role !== 'reseller' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Forbidden. Reseller privileges required.' });
  }

  next();
}

export function requireAgency(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. No session found.' });
  }

  // Allow agency owners who may have 'host' role in DB (resolveAgency validates ownership in controller)
  if (
    req.user.role !== 'agency' &&
    req.user.role !== 'host' &&
    req.user.role !== 'moderator' &&
    req.user.role !== 'admin' &&
    req.user.role !== 'superadmin'
  ) {
    return res.status(403).json({ success: false, message: 'Forbidden. Agency or Moderator privileges required.' });
  }

  next();
}

/**
 * requireAgencyOrModerator
 * Used for moderator-level agency management routes that should also be
 * accessible by agency owners (role: agency or host) managing their own agency.
 */
export function requireAgencyOrModerator(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. No session found.' });
  }

  if (
    req.user.role !== 'agency' &&
    req.user.role !== 'host' &&
    req.user.role !== 'moderator' &&
    req.user.role !== 'admin' &&
    req.user.role !== 'superadmin'
  ) {
    return res.status(403).json({ success: false, message: 'Forbidden. Agency, Moderator, or Admin privileges required.' });
  }

  next();
}

export function requireHost(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. No session found.' });
  }

  if (req.user.role !== 'host' && req.user.role !== 'agency' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Forbidden. Host privileges required.' });
  }

  next();
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const users = await query('SELECT id, email, full_name, avatar_url, role, host_type, coins, diamonds, level, is_banned FROM users WHERE id = ?', [decoded.id]);
        if (users && users.length > 0 && !users[0].is_banned) {
          req.user = users[0];
        }
      }
    }
  } catch (err) {
    // Ignore error for optional
  }
  next();
}
