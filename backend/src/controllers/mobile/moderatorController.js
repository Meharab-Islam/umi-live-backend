import { query } from '../../config/db.js';
import { cache } from '../../config/redis.js';

export function resolveFullAvatarUrl(req, avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string' || !avatarUrl.trim()) {
    return null;
  }
  const clean = avatarUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  const host = req?.get ? (req.get('host') || '107.174.137.29:5050') : '107.174.137.29:5050';
  const proto = req?.headers?.['x-forwarded-proto'] || req?.protocol || 'http';
  return `${proto}://${host}${clean.startsWith('/') ? '' : '/'}${clean}`;
}

/**
 * GET /api/mobile/moderator/users/search
 * Search users by User ID, Name, or Email.
 * Returns basic profile, account ban status, and registered device counts.
 * Production Redis Cache-Aside: 'moderator:search_users:{cleanTerm}' (TTL 30s).
 */
export async function searchUsersForModeration(req, res) {
  try {
    const rawQuery = req.query.q || req.query.search || req.query.userId || '';
    const cleanTerm = String(rawQuery).trim().replace(/^#/, '');

    if (!cleanTerm) {
      return res.json({ success: true, count: 0, users: [] });
    }

    const cacheKey = `moderator:search_users:${cleanTerm.toLowerCase()}`;

    const users = await cache.getOrSet(cacheKey, 30, async () => {
      const isNumeric = !isNaN(parseInt(cleanTerm, 10));
      let sql;
      let params;

      if (isNumeric) {
        const numericId = parseInt(cleanTerm, 10);
        sql = `
          SELECT 
            u.id, 
            u.full_name, 
            u.email, 
            u.avatar_url, 
            u.role, 
            u.coins, 
            u.diamonds, 
            u.level, 
            u.is_banned, 
            u.created_at,
            (SELECT COUNT(ud.id) FROM user_devices ud WHERE ud.user_id = u.id) AS total_devices_count,
            (SELECT COUNT(ud.id) FROM user_devices ud WHERE ud.user_id = u.id AND ud.is_banned = 1) AS banned_devices_count
          FROM users u
          WHERE (u.id = ? OR u.full_name LIKE ? OR u.email LIKE ?) AND u.role != 'superadmin'
          ORDER BY (u.id = ?) DESC, u.id ASC
          LIMIT 25
        `;
        params = [numericId, `%${cleanTerm}%`, `%${cleanTerm}%`, numericId];
      } else {
        sql = `
          SELECT 
            u.id, 
            u.full_name, 
            u.email, 
            u.avatar_url, 
            u.role, 
            u.coins, 
            u.diamonds, 
            u.level, 
            u.is_banned, 
            u.created_at,
            (SELECT COUNT(ud.id) FROM user_devices ud WHERE ud.user_id = u.id) AS total_devices_count,
            (SELECT COUNT(ud.id) FROM user_devices ud WHERE ud.user_id = u.id AND ud.is_banned = 1) AS banned_devices_count
          FROM users u
          WHERE (u.full_name LIKE ? OR u.email LIKE ?) AND u.role != 'superadmin'
          ORDER BY u.id ASC
          LIMIT 25
        `;
        params = [`%${cleanTerm}%`, `%${cleanTerm}%`];
      }

      const rows = await query(sql, params);
      return (rows || []).map((u) => {
        const rawAvatar = u.avatar_url || null;
        const fullAvatar = resolveFullAvatarUrl(req, rawAvatar);
        return {
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          avatar_url: rawAvatar,
          profile_picture: rawAvatar,
          profile_picture_url: fullAvatar || rawAvatar,
          profile_image: rawAvatar,
          avatar: rawAvatar,
          image: rawAvatar,
          photo: rawAvatar,
          full_avatar_url: fullAvatar,
          full_profile_picture: fullAvatar,
          role: u.role,
          coins: u.coins,
          diamonds: u.diamonds,
          level: u.level || 1,
          is_banned: !!u.is_banned,
          created_at: u.created_at,
          devices_summary: {
            total: parseInt(u.total_devices_count || 0, 10),
            banned: parseInt(u.banned_devices_count || 0, 10),
          },
        };
      });
    });

    return res.json({
      success: true,
      query: cleanTerm,
      count: users.length,
      users,
    });
  } catch (err) {
    console.error('searchUsersForModeration error:', err);
    return res.status(500).json({ success: false, message: 'Failed to search users for moderation.', error: err.message });
  }
}

/**
 * GET /api/mobile/moderator/users/:userId
 * Inspect a specific user's complete profile and ALL mobile devices used to login.
 * Production Redis Cache-Aside: 'moderator:user_details:{userId}' (TTL 60s).
 */
export async function getUserAndDevices(req, res) {
  try {
    const rawUserId = req.params.userId || req.params.id;
    const cleanUserId = parseInt(String(rawUserId).replace(/^#/, ''), 10);

    if (!cleanUserId || isNaN(cleanUserId)) {
      return res.status(400).json({ success: false, message: 'Valid target User ID is required.' });
    }

    const cacheKey = `moderator:user_details:${cleanUserId}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      // 1. Fetch user profile
      const userRows = await query(
        `SELECT 
           id, full_name, email, avatar_url, bio, role, host_type, agency_id, 
           coins, diamonds, level, is_banned, created_at, updated_at
         FROM users 
         WHERE id = ?`,
        [cleanUserId]
      );

      if (userRows.length === 0) {
        return null;
      }

      const user = userRows[0];

      // 2. Fetch all mobile devices used by this user
      const deviceRows = await query(
        `SELECT 
           id, device_id, device_model, os_type, os_version, app_version, 
           ip_address, user_agent, is_banned, ban_reason, banned_by, banned_at, 
           last_login_at, created_at
         FROM user_devices 
         WHERE user_id = ?
         ORDER BY last_login_at DESC`,
        [cleanUserId]
      );

      const devices = (deviceRows || []).map((d) => ({
        id: d.id,
        device_id: d.device_id,
        device_model: d.device_model || 'Unknown Device',
        os_type: d.os_type || 'Mobile',
        os_version: d.os_version || '',
        app_version: d.app_version || '1.0.0',
        ip_address: d.ip_address || '',
        user_agent: d.user_agent || '',
        is_banned: !!d.is_banned,
        ban_reason: d.ban_reason || null,
        banned_by: d.banned_by,
        banned_at: d.banned_at,
        last_login_at: d.last_login_at,
        created_at: d.created_at,
      }));

      const totalDevices = devices.length;
      const bannedDevices = devices.filter((d) => d.is_banned).length;
      const rawAvatar = user.avatar_url || null;
      const fullAvatar = resolveFullAvatarUrl(req, rawAvatar);

      return {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          avatar_url: rawAvatar,
          profile_picture: rawAvatar,
          profile_picture_url: fullAvatar || rawAvatar,
          profile_image: rawAvatar,
          avatar: rawAvatar,
          image: rawAvatar,
          photo: rawAvatar,
          full_avatar_url: fullAvatar,
          full_profile_picture: fullAvatar,
          bio: user.bio,
          role: user.role,
          host_type: user.host_type,
          agency_id: user.agency_id,
          coins: user.coins,
          diamonds: user.diamonds,
          level: user.level || 1,
          is_banned: !!user.is_banned,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        deviceSummary: {
          totalDevices,
          bannedDevices,
          activeDevices: totalDevices - bannedDevices,
        },
        devices,
      };
    });

    if (!data) {
      return res.status(404).json({ success: false, message: `User #${cleanUserId} not found.` });
    }

    const userProfilePic = data.user.profile_picture || data.user.avatar_url || null;
    const fullAvatar = resolveFullAvatarUrl(req, userProfilePic) || data.user.full_avatar_url || userProfilePic;

    return res.json({
      success: true,
      user: {
        ...data.user,
        avatar_url: userProfilePic,
        profile_picture: userProfilePic,
        profile_picture_url: fullAvatar,
        profile_image: userProfilePic,
        avatar: userProfilePic,
        image: userProfilePic,
        photo: userProfilePic,
        full_avatar_url: fullAvatar,
        full_profile_picture: fullAvatar,
      },
      profile_picture: userProfilePic,
      profile_picture_url: fullAvatar,
      avatar_url: userProfilePic,
      profile_image: userProfilePic,
      avatar: userProfilePic,
      image: userProfilePic,
      photo: userProfilePic,
      full_avatar_url: fullAvatar,
      full_profile_picture: fullAvatar,
      deviceSummary: data.deviceSummary,
      devices: data.devices,
    });
  } catch (err) {
    console.error('getUserAndDevices error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user and device details.', error: err.message });
  }
}

/**
 * POST /api/mobile/moderator/users/:userId/ban
 * PUT /api/mobile/moderator/users/:userId/ban
 * Ban or unban a user account.
 * Optionally also bans all associated mobile devices used by this user.
 * Mandatory SSOT: MySQL update commits FIRST, then instant Redis cache invalidation.
 */
export async function toggleUserBan(req, res) {
  try {
    const rawUserId = req.params.userId || req.params.id;
    const cleanUserId = parseInt(String(rawUserId).replace(/^#/, ''), 10);

    if (!cleanUserId || isNaN(cleanUserId)) {
      return res.status(400).json({ success: false, message: 'Valid target User ID is required.' });
    }

    // Guard: Prevent self-ban
    if (req.user && req.user.id === cleanUserId) {
      return res.status(400).json({ success: false, message: 'You cannot ban your own account.' });
    }

    // 1. Fetch user to verify permissions
    const [targetUser] = await query('SELECT id, full_name, email, role, is_banned FROM users WHERE id = ?', [cleanUserId]);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: `User #${cleanUserId} not found.` });
    }

    // Guard: Moderators cannot ban admin/superadmin accounts
    if (targetUser.role === 'admin' || targetUser.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot ban an administrative user account.' });
    }

    // Determine target ban status (explicit from body or toggle)
    let newBanStatus;
    if (req.body.isBanned !== undefined) {
      newBanStatus = Boolean(req.body.isBanned);
    } else {
      newBanStatus = !targetUser.is_banned;
    }

    const reason = req.body.reason ? String(req.body.reason).trim() : (newBanStatus ? 'Banned by moderator' : null);
    const banAllDevices = Boolean(req.body.banAllDevices);

    // 2. MySQL Update User (SSOT)
    await query('UPDATE users SET is_banned = ? WHERE id = ?', [newBanStatus ? 1 : 0, cleanUserId]);

    let devicesUpdatedCount = 0;
    // 3. If banAllDevices is requested, update all registered devices for this user
    if (banAllDevices) {
      const devRes = await query(
        `UPDATE user_devices 
         SET is_banned = ?, ban_reason = ?, banned_by = ?, banned_at = ${newBanStatus ? 'NOW()' : 'NULL'} 
         WHERE user_id = ?`,
        [newBanStatus ? 1 : 0, reason, req.user?.id || null, cleanUserId]
      );
      devicesUpdatedCount = devRes?.affectedRows || 0;

      // Fetch all device IDs to invalidate their Redis keys
      const userDevs = await query('SELECT device_id FROM user_devices WHERE user_id = ?', [cleanUserId]);
      for (const d of userDevs) {
        if (newBanStatus) {
          await cache.set(`device:banned:${d.device_id}`, true, 86400 * 30);
        } else {
          await cache.del(`device:banned:${d.device_id}`);
        }
      }
    }

    // 4. Instant Redis Cache Invalidation
    await Promise.all([
      cache.del(`user:${cleanUserId}`),
      cache.del(`user:balance:${cleanUserId}`),
      cache.del(`mobile:user:profile:${cleanUserId}`),
      cache.del(`moderator:user_details:${cleanUserId}`),
      cache.delByPattern('moderator:search_users:*'),
      cache.delByPattern('moderator:banned_devices:*'),
      cache.delByPattern('admin:users*'),
      cache.delByPattern('admin:dashboard*'),
    ]);

    return res.json({
      success: true,
      message: newBanStatus
        ? `User #${cleanUserId} (${targetUser.full_name}) has been suspended.${banAllDevices ? ` Also banned ${devicesUpdatedCount} mobile device(s).` : ''}`
        : `User #${cleanUserId} (${targetUser.full_name}) account suspension has been lifted.`,
      userId: cleanUserId,
      is_banned: newBanStatus,
      reason,
      banAllDevices,
      devicesUpdatedCount,
    });
  } catch (err) {
    console.error('toggleUserBan error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user ban status.', error: err.message });
  }
}

/**
 * POST /api/mobile/moderator/users/:userId/devices/:deviceId/ban
 * PUT  /api/mobile/moderator/users/:userId/devices/:deviceId/ban
 * (Also supports POST /api/mobile/moderator/devices/:deviceId/ban when userId is provided in body or query)
 * 
 * Banning workflow:
 * 1. Moderator first selects a target User ID (from search or user profile).
 * 2. Moderator selects the target device belonging to that specific User ID.
 * 3. Scoped strictly to the target user so other users who happen to own a device with
 *    the same model name (e.g. "iPhone 13", "Galaxy S23") are NEVER inadvertently affected.
 * 
 * Mandatory SSOT: MySQL write commits FIRST, then instant Redis cache synchronization.
 */
export async function toggleDeviceBan(req, res) {
  try {
    const rawUserId = req.params.userId || req.body?.userId || req.query?.userId;
    const rawDeviceId = req.params.deviceId || req.body?.deviceId || req.params.id;
    const cleanDeviceId = String(rawDeviceId || '').trim();

    if (!cleanDeviceId) {
      return res.status(400).json({ success: false, message: 'Valid Device ID, Record ID, or Device Model is required.' });
    }

    // Step 1: Moderator MUST select target user ID first
    if (!rawUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target User ID is required. Please select the user ID first before banning their device to avoid conflict with same-named devices across different users.',
      });
    }

    const cleanUserId = parseInt(String(rawUserId).replace(/^#/, ''), 10);
    if (!cleanUserId || isNaN(cleanUserId)) {
      return res.status(400).json({ success: false, message: 'Valid target User ID is required.' });
    }

    // 1. Verify target user exists
    const [targetUser] = await query('SELECT id, full_name, email, role FROM users WHERE id = ?', [cleanUserId]);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: `User #${cleanUserId} not found. Please select a valid user first.` });
    }

    if (targetUser.role === 'admin' || targetUser.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot moderate devices of an administrative account.' });
    }

    // 2. Locate the specific device scoped strictly to THIS user
    const isNumericId = !isNaN(parseInt(cleanDeviceId, 10)) && !cleanDeviceId.includes('-') && !cleanDeviceId.includes('_');
    const numericId = isNumericId ? parseInt(cleanDeviceId, 10) : -1;

    const devRecords = await query(
      `SELECT id, user_id, device_id, device_model, os_type, is_banned, last_login_at
       FROM user_devices 
       WHERE user_id = ? AND (id = ? OR device_id = ? OR device_model = ?)
       ORDER BY (id = ?) DESC, (device_id = ?) DESC, last_login_at DESC
       LIMIT 1`,
      [cleanUserId, numericId, cleanDeviceId, cleanDeviceId, numericId, cleanDeviceId]
    );

    let devRecord = devRecords && devRecords.length > 0 ? devRecords[0] : null;

    if (!devRecord) {
      return res.status(404).json({
        success: false,
        message: `Device "${cleanDeviceId}" was not found for User #${cleanUserId} (${targetUser.full_name}). Please select from this user's registered devices list.`,
      });
    }

    const targetHardwareId = devRecord.device_id;
    const currentBanStatus = !!devRecord.is_banned;
    const deviceModel = devRecord.device_model || 'Unknown Device';
    const recordId = devRecord.id;

    // Determine target ban status (explicit from body or toggle)
    let newBanStatus;
    if (req.body.isBanned !== undefined) {
      newBanStatus = Boolean(req.body.isBanned);
    } else {
      newBanStatus = !currentBanStatus;
    }

    const reason = req.body.reason ? String(req.body.reason).trim() : (newBanStatus ? `Device banned by moderator for user ${targetUser.full_name}` : null);

    // 3. MySQL Update First (SSOT)
    // Update this user's specific device record
    await query(
      `UPDATE user_devices 
       SET is_banned = ?, ban_reason = ?, banned_by = ?, banned_at = ${newBanStatus ? 'NOW()' : 'NULL'} 
       WHERE id = ? AND user_id = ?`,
      [newBanStatus ? 1 : 0, reason, req.user?.id || null, recordId, cleanUserId]
    );

    // Also update any other duplicate session records for this exact same hardware device_id of this user
    await query(
      `UPDATE user_devices 
       SET is_banned = ?, ban_reason = ?, banned_by = ?, banned_at = ${newBanStatus ? 'NOW()' : 'NULL'} 
       WHERE user_id = ? AND device_id = ?`,
      [newBanStatus ? 1 : 0, reason, req.user?.id || null, cleanUserId, targetHardwareId]
    );

    // 4. Instant Redis Cache Synchronization
    if (newBanStatus) {
      await cache.set(`device:banned:${targetHardwareId}`, true, 86400 * 30); // 30-day cache
    } else {
      // If unbanning, check if any other user's record with this hardware ID is still banned
      const otherBanned = await query(
        'SELECT id FROM user_devices WHERE device_id = ? AND is_banned = 1 LIMIT 1',
        [targetHardwareId]
      );
      if (!otherBanned || otherBanned.length === 0) {
        await cache.del(`device:banned:${targetHardwareId}`);
      }
    }

    // Invalidate user details and moderator caches
    await Promise.all([
      cache.del(`moderator:user_details:${cleanUserId}`),
      cache.delByPattern('moderator:banned_devices:*'),
      cache.delByPattern('moderator:search_users:*'),
    ]);

    return res.json({
      success: true,
      message: newBanStatus
        ? `Device "${deviceModel}" (${targetHardwareId}) for User #${cleanUserId} (${targetUser.full_name}) has been banned.`
        : `Device "${deviceModel}" (${targetHardwareId}) ban for User #${cleanUserId} (${targetUser.full_name}) has been lifted.`,
      user: {
        id: cleanUserId,
        full_name: targetUser.full_name,
        email: targetUser.email,
      },
      device: {
        id: recordId,
        device_id: targetHardwareId,
        device_model: deviceModel,
        is_banned: newBanStatus,
        ban_reason: reason,
        banned_at: newBanStatus ? new Date().toISOString() : null,
      },
    });
  } catch (err) {
    console.error('toggleDeviceBan error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update device ban status.', error: err.message });
  }
}

/**
 * GET /api/mobile/moderator/devices
 * List all banned devices platform-wide with pagination and search.
 * Production Redis Cache-Aside: 'moderator:banned_devices:{page}:{limit}:{search}' (TTL 60s).
 */
export async function getBannedDevicesList(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search || req.query.q || '').trim();

    const cacheKey = `moderator:banned_devices:${page}:${limit}:${search || 'all'}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      const whereClauses = ['ud.is_banned = 1'];
      const params = [];

      if (search) {
        whereClauses.push('(ud.device_id LIKE ? OR ud.device_model LIKE ? OR ud.ban_reason LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      const whereSql = whereClauses.join(' AND ');

      // Total count
      const [countResult] = await query(
        `SELECT COUNT(ud.id) AS total 
         FROM user_devices ud 
         LEFT JOIN users u ON u.id = ud.user_id 
         WHERE ${whereSql}`,
        params
      );
      const total = countResult?.total || 0;

      // Rows
      const rows = await query(
        `SELECT 
           ud.id,
           ud.device_id,
           ud.device_model,
           ud.os_type,
           ud.os_version,
           ud.app_version,
           ud.ip_address,
           ud.is_banned,
           ud.ban_reason,
           ud.banned_at,
           ud.last_login_at,
           u.id AS user_id,
           u.full_name AS user_name,
           u.email AS user_email,
           u.avatar_url AS user_avatar,
           u.is_banned AS user_is_banned
         FROM user_devices ud
         LEFT JOIN users u ON u.id = ud.user_id
         WHERE ${whereSql}
         ORDER BY ud.banned_at DESC, ud.last_login_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        devices: (rows || []).map((r) => ({
          id: r.id,
          device_id: r.device_id,
          device_model: r.device_model,
          os_type: r.os_type,
          os_version: r.os_version,
          app_version: r.app_version,
          ip_address: r.ip_address,
          is_banned: !!r.is_banned,
          ban_reason: r.ban_reason,
          banned_at: r.banned_at,
          last_login_at: r.last_login_at,
          user: {
            id: r.user_id,
            full_name: r.user_name,
            email: r.user_email,
            avatar_url: r.user_avatar || null,
            profile_picture: r.user_avatar || null,
            profile_picture_url: resolveFullAvatarUrl(req, r.user_avatar) || r.user_avatar || null,
            profile_image: r.user_avatar || null,
            avatar: r.user_avatar || null,
            image: r.user_avatar || null,
            full_avatar_url: resolveFullAvatarUrl(req, r.user_avatar) || r.user_avatar || null,
            full_profile_picture: resolveFullAvatarUrl(req, r.user_avatar) || r.user_avatar || null,
            is_banned: !!r.user_is_banned,
          },
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    });

    return res.json({
      success: true,
      devices: data.devices,
      pagination: data.pagination,
    });
  } catch (err) {
    console.error('getBannedDevicesList error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch banned devices list.', error: err.message });
  }
}

/**
 * POST /api/mobile/moderator/users/:userId/devices/register
 * Register or update device metadata for testing or manual binding.
 */
export async function registerDeviceForUser(req, res) {
  try {
    const rawUserId = req.params.userId || req.params.id;
    const cleanUserId = parseInt(String(rawUserId).replace(/^#/, ''), 10);

    if (!cleanUserId || isNaN(cleanUserId)) {
      return res.status(400).json({ success: false, message: 'Valid target User ID is required.' });
    }

    const {
      deviceId,
      device_id,
      deviceModel,
      device_model,
      osType,
      os_type,
      osVersion,
      os_version,
      appVersion,
      app_version,
    } = req.body;

    const targetDeviceId = String(deviceId || device_id || '').trim();
    if (!targetDeviceId) {
      return res.status(400).json({ success: false, message: 'Device ID is required.' });
    }

    const model = deviceModel || device_model || 'Mobile Device';
    const os = osType || os_type || 'Android';
    const osVer = osVersion || os_version || '14.0';
    const appVer = appVersion || app_version || '1.0.0';
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    await query(`
      INSERT INTO user_devices (user_id, device_id, device_model, os_type, os_version, app_version, ip_address, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        device_model = VALUES(device_model),
        os_type = VALUES(os_type),
        os_version = VALUES(os_version),
        app_version = VALUES(app_version),
        ip_address = VALUES(ip_address),
        last_login_at = NOW()
    `, [cleanUserId, targetDeviceId, model, os, osVer, appVer, String(ip).slice(0, 45)]);

    await cache.del(`moderator:user_details:${cleanUserId}`);

    return res.json({
      success: true,
      message: `Device "${targetDeviceId}" successfully registered for User #${cleanUserId}.`,
      device_id: targetDeviceId,
      user_id: cleanUserId,
    });
  } catch (err) {
    console.error('registerDeviceForUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to register device.', error: err.message });
  }
}
