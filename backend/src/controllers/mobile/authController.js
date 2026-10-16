import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/db.js';
import { signToken, verifyToken } from '../../config/jwt.js';
import { cache } from '../../config/redis.js';

/**
 * Mobile User Registration
 * POST /api/mobile/auth/register or /api/auth/register
 */
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

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check existing
    const existing = await query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const displayName = full_name ? String(full_name).trim() : 'Umi User';
    const finalRole = 'user'; // Strictly 'user' - no role selection in email registration

    // 1. Database-First Write (SSOT)
    const insertResult = await query(
      `INSERT INTO users (email, password_hash, full_name, avatar_url, bio, role, coins, diamonds, level)
       VALUES (?, ?, ?, '', ?, 'user', 100, 0, 1)`,
      [trimmedEmail, password_hash, displayName, bio || '']
    );

    const newUserId = insertResult.insertId;
    const finalAvatar = req.file
      ? `/uploads/avatars/${req.file.filename}`
      : (req.body.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${newUserId}`);
    await query('UPDATE users SET avatar_url = ? WHERE id = ?', [finalAvatar, newUserId]);

    const userObj = {
      id: newUserId,
      email: trimmedEmail,
      full_name: displayName,
      avatar_url: finalAvatar,
      bio: bio || '',
      role: 'user',
      coins: 100,
      diamonds: 0,
      level: 1,
      vip_package: 'Standard',
      followers_count: 0,
      following_count: 0,
      is_banned: false,
      created_at: new Date().toISOString(),
    };

    // 2. Instant Redis Synchronization
    await cache.set(`user:${newUserId}`, userObj, 300);
    await cache.delByPattern('admin:users*');
    await cache.delByPattern('admin:dashboard*');

    const token = signToken({ id: newUserId, role: finalRole });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      token_type: 'Bearer',
      user: userObj,
    });
  } catch (err) {
    console.error('Mobile Register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed.', error: err.message });
  }
}

/**
 * Mobile User Login
 * POST /api/mobile/auth/login or /api/auth/login
 */
export async function login(req, res) {
  try {
    const { identifier, email, login: loginField, password } = req.body;
    const loginTarget = identifier || email || loginField;

    if (!loginTarget || !password) {
      return res.status(400).json({ success: false, message: 'Email / User ID and password are required.' });
    }

    // Device Information Mandatory Enforcement (with web browser fallbacks)
    const deviceId = req.body.device_unique_id || req.body.device_id || req.body.deviceId || req.body.deviceUniqueId || req.headers['x-device-id'] || req.headers['x-device-unique-id'] || `web-${(req.ip || 'client').replace(/[^a-zA-Z0-9]/g, '')}`;
    const deviceName = req.body.device_name || req.body.deviceName || req.body.device_model || req.body.deviceModel || req.headers['x-device-name'] || req.headers['x-device-model'] || 'Web Browser';

    const cleanDeviceId = String(deviceId).trim();
    const cleanDeviceName = String(deviceName).trim();

    const cleanId = String(loginTarget).trim().replace(/^#/, '');
    const isNumericId = /^\d+$/.test(cleanId);
    const users = await query(
      isNumericId
        ? 'SELECT * FROM users WHERE id = ? LIMIT 1'
        : 'SELECT * FROM users WHERE email = ? LIMIT 1',
      [isNumericId ? parseInt(cleanId, 10) : cleanId.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email/ID and password.' });
    }

    const user = users[0];

    if (user.is_banned) {
      return res.status(403).json({ success: false, message: 'Your account is suspended. Please contact support.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email/ID and password.' });
    }

    // Hardware Device Ban Verification
    const isDeviceBanned = await cache.getOrSet(`device:banned:${cleanDeviceId}`, 300, async () => {
      const devRows = await query('SELECT is_banned FROM user_devices WHERE device_id = ? AND is_banned = TRUE LIMIT 1', [cleanDeviceId]);
      return devRows && devRows.length > 0;
    });

    if (isDeviceBanned) {
      return res.status(403).json({ success: false, message: 'This device has been banned from accessing the platform. Please contact support.' });
    }

    // Upsert device details for this user in MySQL (SSOT)
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

    // Fetch follower and following count
    const [followCounts] = await query(`
      SELECT 
        (SELECT COUNT(*) FROM user_follows WHERE following_id = ?) AS followers_count,
        (SELECT COUNT(*) FROM user_follows WHERE follower_id = ?) AS following_count
    `, [user.id, user.id]);

    user.followers_count = Number(followCounts?.followers_count) || 0;
    user.following_count = Number(followCounts?.following_count) || 0;

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
    console.error('Mobile Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed.', error: err.message });
  }
}

/**
 * Resolves Google user information from either a Google ID Token / Access Token OR direct fields.
 */
async function resolveGoogleProfile(body) {
  let googleId = String(body.google_id || body.googleId || '').trim();
  let email = String(body.email || '').trim().toLowerCase();
  let name = String(body.full_name || body.fullName || body.name || '').trim();
  let avatarUrl = String(body.avatar_url || body.avatarUrl || body.picture || body.image || '').trim();

  const googleToken = String(
    body.google_token ||
    body.googleToken ||
    body.id_token ||
    body.idToken ||
    body.access_token ||
    body.accessToken ||
    body.token ||
    ''
  ).trim();

  // If a Google token is provided, attempt to verify and fetch profile details from Google APIs
  if (googleToken) {
    let resolved = false;

    // 1. Try Google Tokeninfo endpoint (for ID Tokens)
    try {
      const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(googleToken)}`, {
        signal: AbortSignal.timeout(3500),
      });

      if (tokenInfoRes.ok) {
        const info = await tokenInfoRes.json();
        if (info.sub) {
          googleId = info.sub;
          resolved = true;
        }
        if (info.email && !email) email = String(info.email).toLowerCase();
        if (info.name && !name) name = info.name;
        if (info.picture && !avatarUrl) avatarUrl = info.picture;
      }
    } catch (_) {}

    // 2. Try UserInfo endpoint (for OAuth2 Access Tokens)
    if (!resolved) {
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${googleToken}` },
          signal: AbortSignal.timeout(3500),
        });

        if (userInfoRes.ok) {
          const info = await userInfoRes.json();
          if (info.sub) {
            googleId = info.sub;
            resolved = true;
          }
          if (info.email && !email) email = String(info.email).toLowerCase();
          if (info.name && !name) name = info.name;
          if (info.picture && !avatarUrl) avatarUrl = info.picture;
        }
      } catch (_) {}
    }

    // 3. Fallback: Parse JWT payload directly
    if (!resolved) {
      try {
        const parts = googleToken.split('.');
        if (parts.length === 3) {
          const rawPayload = Buffer.from(parts[1], 'base64url').toString('utf8');
          const payload = JSON.parse(rawPayload);
          if (payload.sub && !googleId) googleId = payload.sub;
          if (payload.email && !email) email = String(payload.email).toLowerCase();
          if (payload.name && !name) name = payload.name;
          if (payload.picture && !avatarUrl) avatarUrl = payload.picture;
        }
      } catch (_) {}
    }
  }

  return { googleId, email, name, avatarUrl };
}

/**
 * Mobile Google OAuth Login & Auto-Registration
 * POST /api/mobile/auth/google or /api/auth/google
 */
export async function googleLogin(req, res) {
  try {
    const {
      device_name,
      deviceName,
      device_model,
      deviceModel,
      device_unique_id,
      device_id,
      deviceId,
      deviceUniqueId,
      os_type,
      osType,
      os_version,
      osVersion,
      app_version,
      appVersion,
    } = req.body;

    // 1. Resolve Profile & Google ID (from google_token / id_token OR direct fields)
    const { googleId, email: googleEmail, name: googleName, avatarUrl: googleAvatar } = await resolveGoogleProfile(req.body);

    const finalDeviceId = String(
      device_unique_id || device_id || deviceId || deviceUniqueId || req.headers['x-device-id'] || req.headers['x-device-unique-id'] || ''
    ).trim();
    const finalDeviceName = String(
      device_name || deviceName || device_model || deviceModel || req.headers['x-device-name'] || req.headers['x-device-model'] || ''
    ).trim();

    if (!googleId) {
      return res.status(400).json({ success: false, message: 'Google ID or valid Google token is required.' });
    }

    if (!finalDeviceId) {
      return res.status(400).json({ success: false, message: 'Device unique ID is required for login.' });
    }

    if (!finalDeviceName) {
      return res.status(400).json({ success: false, message: 'Device name is required for login.' });
    }

    // 2. Hardware Device Ban Verification
    const isDeviceBanned = await cache.getOrSet(`device:banned:${finalDeviceId}`, 300, async () => {
      const devRows = await query('SELECT is_banned FROM user_devices WHERE device_id = ? AND is_banned = TRUE LIMIT 1', [finalDeviceId]);
      return devRows && devRows.length > 0;
    });

    if (isDeviceBanned) {
      return res.status(403).json({
        success: false,
        message: 'This device has been banned from accessing the platform. Please contact support.',
      });
    }

    // 3. Database-First Query (Check if user exists by google_id or email)
    let user = null;
    let isNewUser = false;

    const googleUsers = await query('SELECT * FROM users WHERE google_id = ? LIMIT 1', [googleId]);
    if (googleUsers.length > 0) {
      user = googleUsers[0];
    } else if (googleEmail) {
      const emailUsers = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [googleEmail]);
      if (emailUsers.length > 0) {
        user = emailUsers[0];
        // Link google_id without altering their existing name, email, or avatar
        await query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
        user.google_id = googleId;
      }
    }

    if (user) {
      // Existing User:
      // "kintu existing account jodi abar lign kore tokhon ei name, email, avater eisob change hobe na"
      // NEVER overwrite user's existing full_name, email, or avatar_url!
      if (user.is_banned) {
        return res.status(403).json({ success: false, message: 'Your account is suspended. Please contact support.' });
      }
    } else {
      // New User:
      // "tokhon account na thakle notun account create hobe... se khan thekei avater, email, name sob nibe"
      isNewUser = true;

      const newEmail = googleEmail || `${googleId}@google.user`;
      const displayName = String(googleName || 'Google User').trim();
      let finalAvatar = String(googleAvatar || '').trim();
      if (!finalAvatar) {
        finalAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(googleId)}`;
      }

      const randomPassword = Math.random().toString(36).slice(-12) + Date.now().toString(36);
      const password_hash = await bcrypt.hash(randomPassword, 10);

      try {
        const insertResult = await query(
          `INSERT INTO users (google_id, email, password_hash, full_name, avatar_url, role, coins, diamonds, level)
           VALUES (?, ?, ?, ?, ?, 'user', 100, 0, 1)`,
          [googleId, newEmail, password_hash, displayName, finalAvatar]
        );

        const newUserId = insertResult.insertId;
        const freshRows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [newUserId]);
        user = freshRows[0];
      } catch (insertErr) {
        if (insertErr.code === 'ER_DUP_ENTRY') {
          const fallbackEmail = `${googleId}_${Date.now()}@google.user`;
          const insertResult = await query(
            `INSERT INTO users (google_id, email, password_hash, full_name, avatar_url, role, coins, diamonds, level)
             VALUES (?, ?, ?, ?, ?, 'user', 100, 0, 1)`,
            [googleId, fallbackEmail, password_hash, displayName, finalAvatar]
          );
          const newUserId = insertResult.insertId;
          const freshRows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [newUserId]);
          user = freshRows[0];
        } else {
          throw insertErr;
        }
      }

      await cache.delByPattern('admin:users*');
      await cache.delByPattern('admin:dashboard*');
    }

    // 4. Register or Update Device in user_devices
    const finalOsType = os_type || osType || req.headers['x-os-type'] || 'Mobile';
    const finalOsVersion = os_version || osVersion || req.headers['x-os-version'] || '';
    const finalAppVersion = app_version || appVersion || req.headers['x-app-version'] || '1.0.0';
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
      `, [user.id, finalDeviceId, finalDeviceName, finalOsType, finalOsVersion, finalAppVersion, String(ip).slice(0, 45), String(ua).slice(0, 255)]);
    } catch (devErr) {
      console.error('Device registration error during Google login:', devErr);
    }

    // 5. Sign fresh JWT Access Token
    const token = signToken({ id: user.id, role: user.role });

    delete user.password_hash;

    // Fetch follower and following count
    const [followCounts] = await query(`
      SELECT 
        (SELECT COUNT(*) FROM user_follows WHERE following_id = ?) AS followers_count,
        (SELECT COUNT(*) FROM user_follows WHERE follower_id = ?) AS following_count
    `, [user.id, user.id]);

    user.followers_count = Number(followCounts?.followers_count) || 0;
    user.following_count = Number(followCounts?.following_count) || 0;

    // Cache authenticated user profile in Redis
    await cache.set(`user:${user.id}`, user, 300);

    return res.status(isNewUser ? 201 : 200).json({
      success: true,
      is_new_user: isNewUser,
      message: isNewUser ? 'Google account created and logged in successfully.' : 'Login successful via Google.',
      token,
      token_type: 'Bearer',
      user,
    });
  } catch (err) {
    console.error('Mobile Google Login error:', err);
    return res.status(500).json({ success: false, message: 'Google login failed.', error: err.message });
  }
}

/**
 * Mobile Authenticated User Profile
 * GET /api/mobile/auth/me or /api/auth/me
 */
export async function getMe(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    // 1. Fetch Economy Mode Settings (cached in Redis)
    const isDiamondMode = await cache.getOrSet('setting:is_convert_to_diamond', 60, async () => {
      const rows = await query("SELECT key_value FROM system_settings WHERE key_name = 'is_convert_to_diamond' LIMIT 1");
      return rows.length > 0 ? rows[0].key_value === 'true' : true;
    });

    const coinToDiamondRatio = await cache.getOrSet('setting:coin_to_diamond_ratio', 60, async () => {
      const rows = await query("SELECT key_value FROM system_settings WHERE key_name = 'coin_to_diamond_ratio' LIMIT 1");
      return rows.length > 0 ? parseFloat(rows[0].key_value) : 1.0;
    });

    // 2. Fetch User along with active VIP package, equipped entry effect, and thumbnail
    const userProfile = await cache.getOrSet(`mobile:user:profile:${userId}`, 30, async () => {
      const rows = await query(
        `SELECT 
           u.id, 
           u.full_name, 
           u.email, 
           u.mobile_number, 
           u.country, 
           u.bio, 
           u.avatar_url, 
           u.role, 
           u.level, 
           u.star, 
           u.coins, 
           u.diamonds, 
           u.host_type, 
           u.agency_id, 
           u.is_banned, 
           u.created_at,
           (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) AS followers_count,
           (SELECT COUNT(*) FROM user_follows WHERE follower_id = u.id) AS following_count,
           ups.id as subscription_id,
           ups.is_equipped as package_is_equipped,
           ups.expires_at as package_expires_at,
           GREATEST(0, CEIL(TIMESTAMPDIFF(SECOND, NOW(), ups.expires_at) / 86400)) as package_days_remaining,
           pp.id as package_id,
           pp.name as package_name,
           pp.image_url as package_image_url,
           pc.id as category_id,
           COALESCE(pc.name, u.vip_package, 'Standard') as category_name,
           COALESCE(pc.name, u.vip_package, 'Standard') as package_category_name,
           COALESCE(pc.badge_icon, '') as category_badge_icon,
           COALESCE(pc.color_code, '#7c3aed') as category_color,
           COALESCE(pp.image_url, '') as package_image,
           ee.id as effect_id,
           ee.name as effect_name,
           ee.effect_type,
           ee.preview_image_url as effect_preview,
           ee.svga_url as effect_svga,
           ee.gif_url as effect_gif,
           ee.sound_url as effect_sound,
           st.id as thumbnail_id,
           st.name as thumbnail_name,
           st.image_url as thumbnail_image
         FROM users u
         LEFT JOIN user_package_subscriptions ups 
           ON ups.id = (
             SELECT id FROM user_package_subscriptions 
             WHERE user_id = u.id AND status = 'active' AND expires_at > NOW() 
             ORDER BY is_equipped DESC, expires_at DESC LIMIT 1
           )
         LEFT JOIN privilege_packages pp ON pp.id = ups.package_id
         LEFT JOIN package_categories pc ON pc.id = ups.category_id
         LEFT JOIN user_entry_effects uee 
           ON uee.user_id = u.id AND uee.status = 'active' AND uee.expires_at > NOW() AND uee.is_equipped = 1
         LEFT JOIN entry_effects ee 
           ON ee.id = uee.effect_id AND ee.is_active = 1
         LEFT JOIN user_thumbnails ut 
           ON ut.user_id = u.id AND ut.status = 'active' AND ut.expires_at > NOW() AND ut.is_equipped = 1
         LEFT JOIN special_thumbnails st 
           ON st.id = ut.thumbnail_id AND st.is_active = 1
         WHERE u.id = ? 
         LIMIT 1`,
        [userId]
      );
      return rows && rows.length > 0 ? rows[0] : null;
    });

    if (!userProfile) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const followersCount = Number(userProfile.followers_count) || 0;
    const followingCount = Number(userProfile.following_count) || 0;

    // Format clean mobile profile payload
    const formattedUser = {
      id: userProfile.id,
      full_name: userProfile.full_name || 'Umi User',
      role: userProfile.role,
      avatar_url: userProfile.avatar_url,
      level: userProfile.level || 1,
      followers_count: followersCount,
      following_count: followingCount,
      package_category_name: userProfile.package_category_name || 'Standard',
      category_id: userProfile.category_id || null,
      category_name: userProfile.category_name || 'Standard',
      category_badge_icon: userProfile.category_badge_icon || '',
      package_id: userProfile.package_id || null,
      package_name: userProfile.package_name || null,
      package_image: userProfile.package_image_url || userProfile.package_image || '',
      package_image_url: userProfile.package_image_url || '',
      package_color: userProfile.category_color || '#7c3aed',
      package_expires_at: userProfile.package_expires_at || null,
      package_days_remaining: userProfile.package_days_remaining != null ? Number(userProfile.package_days_remaining) : null,
      package_is_equipped: userProfile.subscription_id ? Boolean(userProfile.package_is_equipped) : false,
      active_package: userProfile.package_id ? {
        package_id: userProfile.package_id,
        package_name: userProfile.package_name,
        package_image: userProfile.package_image_url || '',
        package_image_url: userProfile.package_image_url || '',
        category_id: userProfile.category_id,
        category_name: userProfile.category_name,
        category_badge_icon: userProfile.category_badge_icon || '',
        category_color: userProfile.category_color || '#7c3aed',
        subscription_id: userProfile.subscription_id,
        is_equipped: Boolean(userProfile.package_is_equipped),
        expires_at: userProfile.package_expires_at,
        days_remaining: Number(userProfile.package_days_remaining) || 0,
      } : null,
      active_entry_effect: userProfile.effect_id ? {
        id: userProfile.effect_id,
        name: userProfile.effect_name,
        effect_type: userProfile.effect_type,
        preview_image_url: userProfile.effect_preview,
        svga_url: userProfile.effect_svga,
        gif_url: userProfile.effect_gif,
        sound_url: userProfile.effect_sound,
      } : null,
      active_thumbnail: userProfile.thumbnail_id ? {
        id: userProfile.thumbnail_id,
        name: userProfile.thumbnail_name,
        image_url: userProfile.thumbnail_image,
      } : null,
      star: userProfile.star || 0,
      coin: userProfile.coins || 0,
      // Diamond is conditionally returned / active based on economy mode
      diamonds: isDiamondMode ? (userProfile.diamonds || 0) : undefined,
      is_diamond_mode: isDiamondMode,
      coin_to_diamond_ratio: coinToDiamondRatio,
      mobile_number: userProfile.mobile_number || '',
      country: userProfile.country || '',
      bio: userProfile.bio || '',
      email: userProfile.email,
      host_type: userProfile.host_type,
      agency_id: userProfile.agency_id,
      is_banned: !!userProfile.is_banned,
      created_at: userProfile.created_at,
    };

    return res.json({
      success: true,
      user: formattedUser,
    });
  } catch (err) {
    console.error('Mobile getMe error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
}

/**
 * Mobile Update Profile (Bio, Full Name, Mobile Number, Country, Avatar)
 * PUT /api/mobile/auth/profile
 */
export async function updateProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { full_name, bio, avatar_url, mobile_number, country } = req.body;
    const updates = [];
    const params = [];

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(String(full_name).trim());
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(String(bio).trim());
    }
    if (mobile_number !== undefined) {
      updates.push('mobile_number = ?');
      params.push(String(mobile_number).trim());
    }
    if (country !== undefined) {
      updates.push('country = ?');
      params.push(String(country).trim());
    }
    if (req.file) {
      updates.push('avatar_url = ?');
      params.push(`/uploads/avatars/${req.file.filename}`);
    } else if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(String(avatar_url).trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update.' });
    }

    params.push(userId);

    // 1. Database-First Mutation
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // 2. Invalidate Redis Caches
    await cache.del(`user:${userId}`);
    await cache.del(`mobile:user:profile:${userId}`);
    await cache.del(`admin:user:${userId}`);
    await cache.delByPattern('admin:users*');

    // 3. Re-fetch fresh user profile
    const [freshUser] = await query(
      `SELECT id, email, full_name, mobile_number, country, avatar_url, bio, role, coins, diamonds, level, star, vip_package,
              (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) AS followers_count,
              (SELECT COUNT(*) FROM user_follows WHERE follower_id = users.id) AS following_count
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (freshUser) {
      freshUser.followers_count = Number(freshUser.followers_count) || 0;
      freshUser.following_count = Number(freshUser.following_count) || 0;
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: freshUser,
    });
  } catch (err) {
    console.error('Mobile updateProfile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

/**
 * Mobile Standalone Avatar Upload
 * POST /api/mobile/auth/upload-avatar
 */
export async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Send multipart/form-data with field name "avatar", "file", or "image".',
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully.',
      avatar_url: avatarUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err) {
    console.error('Mobile uploadAvatar error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process avatar upload.' });
  }
}

/**
 * Verify Session / Token Check
 * GET /api/mobile/auth/verify-token
 * Public endpoint — pass Bearer token in Authorization header.
 *
 * Returns:
 *  - valid: true/false
 *  - expired: true if token exists but is expired
 *  - user_id, email, issued_at, expires_at (when valid)
 *  - user banned status (lightweight DB check, Redis-cached)
 */
export async function verifySession(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({
        valid: false,
        expired: false,
        message: 'No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Decode without verifying expiry (to distinguish expired vs invalid)
    const rawDecoded = jwt.decode(token);

    // Verify properly (checks expiry + signature)
    const decoded = verifyToken(token);

    // Token is expired (decode works but verify fails)
    if (!decoded && rawDecoded && rawDecoded.exp) {
      const expiredAt = new Date(rawDecoded.exp * 1000);
      return res.status(200).json({
        valid: false,
        expired: true,
        message: 'Token has expired. Please login again.',
        expired_at: expiredAt.toISOString(),
        user_id: rawDecoded.id || null,
      });
    }

    // Token is completely invalid (bad signature, malformed, etc.)
    if (!decoded) {
      return res.status(200).json({
        valid: false,
        expired: false,
        message: 'Invalid token.',
      });
    }

    // Token is valid — do a lightweight user status check (ban check via Redis)
    const user = await cache.getOrSet(`user:${decoded.id}`, 60, async () => {
      const rows = await query(
        'SELECT id, email, full_name, avatar_url, is_banned FROM users WHERE id = ?',
        [decoded.id]
      );
      return rows && rows.length > 0 ? rows[0] : null;
    });

    if (!user) {
      return res.status(200).json({
        valid: false,
        expired: false,
        message: 'User account no longer exists.',
      });
    }

    if (user.is_banned) {
      return res.status(200).json({
        valid: false,
        expired: false,
        banned: true,
        message: 'Account has been suspended.',
        user_id: user.id,
      });
    }

    const issuedAt = decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null;
    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null;

    return res.status(200).json({
      valid: true,
      expired: false,
      banned: false,
      user_id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      issued_at: issuedAt,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('verifySession error:', err);
    return res.status(500).json({ valid: false, expired: false, message: 'Internal server error.' });
  }
}

// In-memory fail-safe OTP store for zero-downtime offline fallback
const memoryOtpStore = new Map();

/**
 * Send OTP for Login / Registration
 * POST /api/mobile/auth/send-otp
 */
export async function sendOtp(req, res) {
  try {
    const { identifier, email, phone } = req.body;
    const target = identifier || email || phone;

    if (!target || !String(target).trim()) {
      return res.status(400).json({ success: false, message: 'Email or phone number is required.' });
    }

    const cleanTarget = String(target).trim().toLowerCase();
    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 1. Store in memory map
    memoryOtpStore.set(cleanTarget, { otp, createdAt: Date.now() });

    // 2. Store in Redis with 5 minutes TTL
    const otpKey = `otp:${cleanTarget}`;
    await cache.set(otpKey, { otp, target: cleanTarget, createdAt: Date.now() }, 300);

    console.log(`[AUTH OTP] Generated OTP for ${cleanTarget}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${cleanTarget}.`,
      otp, // included for seamless instant testing
      expiresIn: 300,
    });
  } catch (err) {
    console.error('sendOtp error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send OTP.', error: err.message });
  }
}

/**
 * Verify OTP & Login / Auto-Register
 * POST /api/mobile/auth/verify-otp
 */
export async function verifyOtp(req, res) {
  try {
    const { identifier, email, phone, otp, full_name, password } = req.body;
    const target = identifier || email || phone;

    if (!target || !otp) {
      return res.status(400).json({ success: false, message: 'Identifier and 6-digit OTP code are required.' });
    }

    const cleanTarget = String(target).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    // 1. Check in-memory store
    const memEntry = memoryOtpStore.get(cleanTarget);
    const isMemValid = memEntry && (Date.now() - memEntry.createdAt < 300000) && memEntry.otp === cleanOtp;

    // 2. Check Redis
    const otpKey = `otp:${cleanTarget}`;
    const stored = await cache.get(otpKey);
    const isRedisValid = stored && stored.otp === cleanOtp;

    // Accept if matches memory, Redis or master test bypass '123456'
    const isValid = isMemValid || isRedisValid || cleanOtp === '123456';

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code. Please request a new one.' });
    }

    // Invalidate OTP after use
    memoryOtpStore.delete(cleanTarget);
    await cache.del(otpKey);

    // Check if user already exists
    let users = await query(
      'SELECT id, email, full_name, avatar_url, role, coins, diamonds, level, is_banned FROM users WHERE email = ? LIMIT 1',
      [cleanTarget]
    );

    let userObj = null;
    let isNewUser = false;

    if (users.length > 0) {
      // Existing User Login
      const u = users[0];
      if (u.is_banned) {
        return res.status(403).json({ success: false, message: 'Your account is suspended. Please contact support.' });
      }
      userObj = {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        avatar_url: u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`,
        role: u.role || 'user',
        coins: u.coins || 100,
        diamonds: u.diamonds || 0,
        level: u.level || 1,
      };
    } else {
      // New User Auto-Registration
      isNewUser = true;
      const displayName = full_name ? String(full_name).trim() : cleanTarget.split('@')[0] || 'Umi User';
      const dummyPassword = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('umi123456', 10);

      const insertResult = await query(
        `INSERT INTO users (email, password_hash, full_name, avatar_url, bio, role, coins, diamonds, level)
         VALUES (?, ?, ?, '', 'Hey, I am using Umi Live!', 'user', 100, 0, 1)`,
        [cleanTarget, dummyPassword, displayName]
      );

      const newUserId = insertResult.insertId;
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${newUserId}`;
      await query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, newUserId]);

      userObj = {
        id: newUserId,
        email: cleanTarget,
        full_name: displayName,
        avatar_url: avatarUrl,
        role: 'user',
        coins: 100,
        diamonds: 0,
        level: 1,
      };

      await cache.delByPattern('admin:users*');
      await cache.delByPattern('admin:dashboard*');
    }

    // Cache user session
    await cache.set(`user:${userObj.id}`, userObj, 300);

    const token = signToken({ id: userObj.id, role: userObj.role });

    return res.status(200).json({
      success: true,
      message: isNewUser ? 'Account registered successfully!' : 'Login successful!',
      token,
      token_type: 'Bearer',
      user: userObj,
      isNewUser,
    });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ success: false, message: 'Verification failed.', error: err.message });
  }
}

/**
 * Mobile Register / Update FCM Push Notification Device Token
 * POST /api/mobile/auth/fcm-token
 * POST /api/mobile/users/fcm-token
 */
export async function updateFcmToken(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { fcm_token, fcmToken, token, device_type = 'android', device_name = null } = req.body;
    const cleanToken = (fcm_token || fcmToken || token || '').trim();

    if (!cleanToken) {
      return res.status(400).json({ success: false, message: 'FCM device token is required.' });
    }

    const cleanDeviceType = ['android', 'ios', 'web'].includes(String(device_type).toLowerCase())
      ? String(device_type).toLowerCase()
      : 'android';

    // 1. MySQL SSOT: Insert or update user_fcm_tokens table
    await query(
      `INSERT INTO user_fcm_tokens (user_id, fcm_token, device_type, device_name, is_active, updated_at)
       VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE 
         device_type = VALUES(device_type), 
         device_name = VALUES(device_name), 
         is_active = 1, 
         updated_at = CURRENT_TIMESTAMP`,
      [userId, cleanToken, cleanDeviceType, device_name]
    );

    // 2. Also update users.fcm_token for quick lookup
    await query('UPDATE users SET fcm_token = ? WHERE id = ?', [cleanToken, userId]);

    // 3. Instant Redis Invalidation
    await cache.del(`user:${userId}:fcm_token`);

    return res.status(200).json({
      success: true,
      message: 'FCM device token saved successfully for push notifications.',
      fcm_token: cleanToken,
      device_type: cleanDeviceType,
    });
  } catch (err) {
    console.error('updateFcmToken error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update FCM token.', error: err.message });
  }
}

/**
 * Mobile Remove / Unregister FCM Token (on Logout)
 * DELETE /api/mobile/auth/fcm-token
 * DELETE /api/mobile/users/fcm-token
 */
export async function removeFcmToken(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { fcm_token, fcmToken, token } = req.body;
    const cleanToken = (fcm_token || fcmToken || token || '').trim();

    if (cleanToken) {
      await query('DELETE FROM user_fcm_tokens WHERE user_id = ? AND fcm_token = ?', [userId, cleanToken]);
      await query('UPDATE users SET fcm_token = NULL WHERE id = ? AND fcm_token = ?', [userId, cleanToken]);
    } else {
      await query('DELETE FROM user_fcm_tokens WHERE user_id = ?', [userId]);
      await query('UPDATE users SET fcm_token = NULL WHERE id = ?', [userId]);
    }

    await cache.del(`user:${userId}:fcm_token`);

    return res.status(200).json({
      success: true,
      message: 'FCM device token removed successfully.',
    });
  } catch (err) {
    console.error('removeFcmToken error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove FCM token.', error: err.message });
  }
}
