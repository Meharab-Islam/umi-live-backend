import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { signToken } from '../config/jwt.js';
import { cache } from '../config/redis.js';
import { getDefaultRegistrationCoins } from '../services/systemService.js';
import {
  getClientIp,
  recordFailedLogin,
  recordSuccessfulLogin,
  executeDummyTimingCheck,
  isWeakDictionaryPassword,
} from '../middlewares/securityMiddleware.js';

export async function register(req, res) {
  try {
    const { email, password, full_name, bio } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Dictionary attack defense: Reject known weak/dictionary passwords
    if (isWeakDictionaryPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'This password is too common or easily guessed (dictionary defense). Please choose a stronger password.',
      });
    }

    // Check existing
    const existing = await query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const displayName = full_name ? String(full_name).trim() : 'Umi User';

    // 1. Database-First Write (strictly 'user' role, automated avatar)
    const startingCoins = await getDefaultRegistrationCoins();
    const insertResult = await query(
      `INSERT INTO users (email, password_hash, full_name, avatar_url, bio, role, coins, diamonds, level)
       VALUES (?, ?, ?, '', ?, 'user', ?, 0, 1)`,
      [trimmedEmail, password_hash, displayName, bio || '', startingCoins]
    );

    const newUserId = insertResult.insertId;
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${newUserId}`;
    await query('UPDATE users SET avatar_url = ? WHERE id = ?', [defaultAvatar, newUserId]);

    const userObj = {
      id: newUserId,
      email: trimmedEmail,
      full_name: displayName,
      avatar_url: defaultAvatar,
      bio: bio || '',
      role: 'user',
      coins: startingCoins,
      diamonds: 0,
      level: 1,
      vip_package: 'Standard',
      is_banned: false,
      created_at: new Date().toISOString(),
    };

    // 2. Instant Redis Synchronization
    await cache.set(`user:${newUserId}`, userObj, 300);
    await cache.delByPattern('admin:users*');
    await cache.delByPattern('admin:dashboard*');

    const token = signToken({ id: newUserId, role: 'user' });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      token_type: 'Bearer',
      user: userObj,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed.', error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { identifier, email, password } = req.body;
    const loginTarget = identifier || email;

    if (!loginTarget || !password) {
      return res.status(400).json({ success: false, message: 'Email / User ID and password are required.' });
    }

    // Device Information Verification
    let deviceId = req.body.device_unique_id || req.body.device_id || req.body.deviceId || req.body.deviceUniqueId || req.headers['x-device-id'] || req.headers['x-device-unique-id'];
    let deviceName = req.body.device_name || req.body.deviceName || req.body.device_model || req.body.deviceModel || req.headers['x-device-name'] || req.headers['x-device-model'];

    const cleanId = String(loginTarget).trim().replace(/^#/, '');
    const clientIp = getClientIp(req);
    const isNumericId = /^\d+$/.test(cleanId);

    const users = await query(
      isNumericId
        ? 'SELECT * FROM users WHERE id = ? LIMIT 1'
        : 'SELECT * FROM users WHERE email = ? LIMIT 1',
      [isNumericId ? parseInt(cleanId, 10) : cleanId.toLowerCase()]
    );

    if (users.length === 0) {
      // Timing attack immunity: dummy bcrypt comparison prevents user enumeration
      await executeDummyTimingCheck(password);
      const failInfo = await recordFailedLogin(clientIp, cleanId);
      const msg = failInfo.isNowLocked
        ? 'Too many failed login attempts. Account temporarily locked for 15 minutes.'
        : `Invalid credentials. Please check your email/ID and password. (${failInfo.remainingAttempts} attempts remaining before temporary lockout)`;
      return res.status(401).json({ success: false, message: msg });
    }

    const user = users[0];

    // For web admin console, default device if not provided
    if ((user.role === 'admin' || user.role === 'superadmin') && (!deviceId || !deviceName)) {
      deviceId = deviceId || 'admin-web-console';
      deviceName = deviceName || 'Web Admin Console';
    }

    if (!deviceId || !String(deviceId).trim()) {
      return res.status(400).json({ success: false, message: 'Device unique ID is required for login.' });
    }

    if (!deviceName || !String(deviceName).trim()) {
      return res.status(400).json({ success: false, message: 'Device name is required for login.' });
    }

    const cleanDeviceId = String(deviceId).trim();
    const cleanDeviceName = String(deviceName).trim();

    if (user.is_banned) {
      return res.status(403).json({ success: false, message: 'Your account is suspended. Please contact support.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const failInfo = await recordFailedLogin(clientIp, cleanId);
      const msg = failInfo.isNowLocked
        ? 'Too many failed login attempts. Account temporarily locked for 15 minutes.'
        : `Invalid credentials. Please check your email/ID and password. (${failInfo.remainingAttempts} attempts remaining before temporary lockout)`;
      return res.status(401).json({ success: false, message: msg });
    }

    // Success! Reset failed login attempt counters for this account and IP
    await recordSuccessfulLogin(clientIp, cleanId);

    // Hardware Device Ban Verification
    const isDeviceBanned = await cache.getOrSet(`device:banned:${cleanDeviceId}`, 300, async () => {
      const devRows = await query('SELECT is_banned FROM user_devices WHERE device_id = ? AND is_banned = TRUE LIMIT 1', [cleanDeviceId]);
      return devRows && devRows.length > 0;
    });

    if (isDeviceBanned) {
      return res.status(403).json({ success: false, message: 'This device has been banned from accessing the platform. Please contact support.' });
    }

    // Upsert device details for this user
    const osType = req.body.osType || req.body.os_type || req.headers['x-os-type'] || 'Mobile';
    const osVersion = req.body.osVersion || req.body.os_version || req.headers['x-os-version'] || '';
    const appVersion = req.body.appVersion || req.body.app_version || req.headers['x-app-version'] || '1.0.0';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';

    try {
      await query(`
        INSERT INTO user_devices (user_id, device_id, device_model, os_type, os_version, app_version, ip_address, user_agent, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          device_model = VALUES(device_model),
          os_type = VALUES(os_type),
          os_version = VALUES(os_version),
          app_version = VALUES(app_version),
          ip_address = VALUES(ip_address),
          user_agent = VALUES(user_agent),
          last_login_at = NOW()
      `, [user.id, cleanDeviceId, cleanDeviceName, osType, osVersion, appVersion, String(ip).slice(0, 45), String(ua).slice(0, 255)]);
    } catch (devErr) {
      console.error('Device registration error:', devErr);
    }

    const token = signToken({ id: user.id, role: user.role });

    delete user.password_hash;

    // Cache authenticated user profile in Redis
    await cache.set(`user:${user.id}`, user, 300);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      token_type: 'Bearer',
      user,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed.', error: err.message });
  }
}

export { googleLogin } from './mobile/authController.js';

export async function getMe(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    // Cache-Aside with Redis
    const user = await cache.getOrSet(`user:${userId}`, 60, async () => {
      const rows = await query(
        `SELECT id, email, full_name, avatar_url, bio, role, host_type, agency_id, coins, diamonds, level, vip_package, is_banned, created_at,
                (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) AS followers_count,
                (SELECT COUNT(*) FROM user_follows WHERE follower_id = users.id) AS following_count
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
      if (rows && rows.length > 0) {
        const u = rows[0];
        u.followers_count = Number(u.followers_count) || 0;
        u.following_count = Number(u.following_count) || 0;
        return u;
      }
      return null;
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
}

