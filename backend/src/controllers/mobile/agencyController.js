import { query } from '../../config/db.js';
import { cache } from '../../config/redis.js';
import { getLiveIO } from '../../sockets/liveSocket.js';
import { sendPushNotification } from '../../config/firebase.js';

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
 * Format seconds into human-friendly "00h 00m 00s" or "00m 00s" string.
 */
function formatDuration(totalSeconds) {
  const sec = Math.max(0, parseInt(totalSeconds || 0, 10));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

/**
 * Resolve target agency for the authenticated user.
 * - Agency owners/managers access their own agency automatically.
 * - Admins, Superadmins, and Moderators can pass ?agencyId= or /:agencyId to manage any agency.
 */
async function resolveAgency(req) {
  const explicitId = req.params?.agencyId || req.query?.agencyId || req.body?.agencyId;
  const explicitCode = req.query?.agencyCode || req.body?.agencyCode;

  const isElevated =
    req.user.role === 'admin' ||
    req.user.role === 'superadmin' ||
    req.user.role === 'moderator';

  // 1. Explicit ID/Code provided (Elevated roles, Agency owners, or Owner verify)
  if (explicitId) {
    const [agency] = await query('SELECT * FROM agencies WHERE id = ?', [explicitId]);
    if (agency) {
      if (isElevated || agency.owner_id === req.user.id || req.user.role === 'agency') {
        return agency;
      }
    }
  }

  if (explicitCode) {
    const [agency] = await query('SELECT * FROM agencies WHERE agency_code = ?', [explicitCode]);
    if (agency) {
      if (isElevated || agency.owner_id === req.user.id || req.user.role === 'agency') {
        return agency;
      }
    }
  }

  // 2. Lookup agency owned by req.user
  const [ownedAgency] = await query('SELECT * FROM agencies WHERE owner_id = ? LIMIT 1', [req.user.id]);
  if (ownedAgency) {
    return ownedAgency;
  }

  // 3. Fallback: agency_id assigned on user record
  if (req.user.agency_id) {
    const [assignedAgency] = await query('SELECT * FROM agencies WHERE id = ? LIMIT 1', [req.user.agency_id]);
    if (assignedAgency) {
      return assignedAgency;
    }
  }

  // 4. Fallback for elevated roles or agency users if no specific agency specified: use first active agency
  if (isElevated || req.user.role === 'agency') {
    const [firstAgency] = await query('SELECT * FROM agencies ORDER BY id ASC LIMIT 1');
    if (firstAgency) {
      return firstAgency;
    }
  }

  // 5. If user has 'agency' role but no agency record exists yet, automatically create one
  if (req.user.role === 'agency') {
    const agencyCode = `AGY-${req.user.id}`;
    const agencyName = req.user.full_name ? `${req.user.full_name} Agency` : `Agency #${req.user.id}`;
    await query(
      `INSERT INTO agencies (id, agency_code, name, owner_id, commission_rate, status, contact_phone, notes)
       VALUES (?, ?, ?, ?, 10.00, 'active', '', '')
       ON DUPLICATE KEY UPDATE status = 'active'`,
      [req.user.id, agencyCode, agencyName, req.user.id]
    );
    const [createdAgency] = await query('SELECT * FROM agencies WHERE owner_id = ? LIMIT 1', [req.user.id]);
    if (createdAgency) {
      return createdAgency;
    }
  }

  return null;
}

/**
 * Invalidate all cached data for an agency.
 */
async function invalidateAgencyCache(agencyId) {
  try {
    await cache.del(`agency:overview:${agencyId}`);
    await cache.del(`agency:hosts:${agencyId}`);
    await cache.del(`agency:banned_hosts:${agencyId}`);
    await cache.delByPattern(`agency:requests:${agencyId}:*`);
    await cache.del('agency:list:all');
    await cache.delByPattern('agency:list:*');
    await cache.delByPattern('agency:top:*');
  } catch (err) {
    // Non-blocking cache error handling
  }
}

/**
 * GET /api/mobile/agency/list
 * GET /api/mobile/agency/all
 * GET /api/mobile/moderator/agencies
 * 
 * Returns complete list of all agencies with metrics (host count, live streamers,
 * coins, commissions, pending requests) for moderators, admins, and agency directors.
 * Redis Cache-Aside: 'agency:list:all' or 'agency:list:search:{q}' (TTL 30s).
 */
export async function getAllAgencies(req, res) {
  try {
    const search = (req.query.search || req.query.q || '').trim();
    const cacheKey = search ? `agency:list:search:${search.toLowerCase()}` : 'agency:list:all';

    const data = await cache.getOrSet(cacheKey, 30, async () => {
      let sql = `
        SELECT 
          a.id, a.agency_code, a.name, a.logo_url, a.avatar_url AS agency_avatar, a.owner_id, a.commission_rate, a.status,
          a.contact_phone, a.notes, a.created_at, a.updated_at,
          u.full_name AS owner_name, u.email AS owner_email, u.avatar_url AS owner_avatar, u.coins AS owner_coins,
          (SELECT COUNT(u2.id) FROM users u2 WHERE u2.agency_id = a.id AND u2.role != 'superadmin') AS total_hosts_count,
          (SELECT COUNT(DISTINCT lr.host_id) 
           FROM live_rooms lr 
           INNER JOIN users u3 ON u3.id = lr.host_id 
           WHERE u3.agency_id = a.id AND lr.status = 'live') AS active_streaming_hosts_count,
          (SELECT COUNT(u4.id) FROM users u4 WHERE u4.agency_id = a.id AND u4.broadcast_banned_until > CURRENT_TIMESTAMP AND u4.role != 'superadmin') AS banned_hosts_count,
          (SELECT COUNT(ahr.id) FROM agency_host_requests ahr WHERE ahr.agency_id = a.id AND ahr.status = 'pending') AS pending_requests_count,
          (SELECT COALESCE(SUM(gt.coin_amount), 0)
           FROM gift_transactions gt
           INNER JOIN users u5 ON u5.id = gt.receiver_id
           WHERE u5.agency_id = a.id AND gt.created_at >= COALESCE(u5.agency_joined_at, u5.created_at)) AS total_coins_gifted_to_hosts
        FROM agencies a
        LEFT JOIN users u ON u.id = a.owner_id
      `;
      const params = [];

      if (search) {
        sql += ` WHERE a.name LIKE ? OR a.agency_code LIKE ? OR u.full_name LIKE ?`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      sql += ` ORDER BY a.id ASC`;

      const rows = await query(sql, params);

      return (rows || []).map((row) => {
        const commissionRate = parseFloat(row.commission_rate || 10);
        const totalCoinsGifted = parseInt(row.total_coins_gifted_to_hosts || 0, 10);
        const totalCommissionCoins = Math.round(totalCoinsGifted * (commissionRate / 100));

        const rawAgencyLogo = row.logo_url || row.agency_avatar || '';
        const rawLogo = rawAgencyLogo || row.owner_avatar || '';
        const fullLogo = resolveFullAvatarUrl(req, rawLogo);
        const ownerFullAvatar = resolveFullAvatarUrl(req, row.owner_avatar || '');

        return {
          id: row.id,
          agency_code: row.agency_code,
          name: row.name,
          commission_rate: commissionRate,
          status: row.status,
          contact_phone: row.contact_phone || '',
          notes: row.notes || '',
          created_at: row.created_at,
          owner_name: row.owner_name || 'Agency Owner',
          owner_avatar: row.owner_avatar || '',
          avatar_url: rawLogo,
          profile_picture: rawLogo,
          profile_picture_url: fullLogo || rawLogo,
          profile_image: rawLogo,
          logo_url: rawLogo,
          logo: rawLogo,
          full_avatar_url: fullLogo,
          full_profile_picture: fullLogo,
          owner_coins: parseInt(row.owner_coins || 0, 10),
          total_hosts: parseInt(row.total_hosts_count || 0, 10),
          total_commission_coins: totalCommissionCoins,
          pending_requests_count: parseInt(row.pending_requests_count || 0, 10),
          banned_hosts_count: parseInt(row.banned_hosts_count || 0, 10),
          owner: {
            id: row.owner_id,
            full_name: row.owner_name || 'Agency Owner',
            email: row.owner_email || '',
            avatar_url: row.owner_avatar || '',
            profile_picture: row.owner_avatar || '',
            profile_picture_url: ownerFullAvatar || (row.owner_avatar || ''),
            profile_image: row.owner_avatar || '',
            avatar: row.owner_avatar || '',
            full_avatar_url: ownerFullAvatar,
            full_profile_picture: ownerFullAvatar,
            coins: parseInt(row.owner_coins || 0, 10),
          },
          metrics: {
            total_hosts: parseInt(row.total_hosts_count || 0, 10),
            active_streaming_hosts: parseInt(row.active_streaming_hosts_count || 0, 10),
            banned_hosts_count: parseInt(row.banned_hosts_count || 0, 10),
            pending_requests_count: parseInt(row.pending_requests_count || 0, 10),
            total_coins_gifted_to_hosts: totalCoinsGifted,
            total_commission_coins: totalCommissionCoins,
          },
        };
      });
    });

    return res.json({
      success: true,
      message: 'Agencies list retrieved successfully.',
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('getAllAgencies error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve agencies list.' });
  }
}

/**
 * Resolve effective commission rate for an agency.
 * Reads agency.commission_rate, falling back dynamically to system setting 'agency_gift_commission_percent'
 */
async function getEffectiveCommissionRate(agency) {
  if (agency && agency.commission_rate !== undefined && agency.commission_rate !== null && parseFloat(agency.commission_rate) > 0) {
    return parseFloat(agency.commission_rate);
  }
  const defaultRate = await cache.getOrSet('setting:agency_gift_commission_percent', 60, async () => {
    const [row] = await query("SELECT key_value FROM system_settings WHERE key_name = 'agency_gift_commission_percent' LIMIT 1");
    return row && !isNaN(parseFloat(row.key_value)) ? parseFloat(row.key_value) : 10.0;
  });
  return parseFloat(defaultRate || 10.0);
}

/**
 * GET /api/mobile/agency/overview
 * Returns agency profile, owner coin balance, host counts, and commission totals.
 * Redis Cache-Aside: 'agency:overview:{agencyId}' (TTL 60s).
 */
export async function getAgencyOverview(req, res) {
  try {
    const agency = await resolveAgency(req);
    if (!agency) {
      return res.status(404).json({ success: false, message: 'Agency profile not found for this account.' });
    }

    const cacheKey = `agency:overview:${agency.id}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      // 1. Fetch agency owner profile (for latest coin balance)
      const [owner] = await query(
        'SELECT id, full_name, email, avatar_url, coins, diamonds, role FROM users WHERE id = ?',
        [agency.owner_id]
      );

      // 2. Total affiliated hosts
      const [hostStats] = await query(
        'SELECT COUNT(id) AS total_hosts FROM users WHERE agency_id = ?',
        [agency.id]
      );
      const totalHosts = parseInt(hostStats?.total_hosts || 0, 10);

      // 3. Active live streaming hosts right now
      const [streamingStats] = await query(
        `SELECT COUNT(DISTINCT lr.host_id) AS active_streaming_hosts
         FROM live_rooms lr
         INNER JOIN users u ON u.id = lr.host_id
         WHERE u.agency_id = ? AND lr.status = 'live' AND u.role != 'superadmin'`,
        [agency.id]
      );
      const activeStreamingHosts = parseInt(streamingStats?.active_streaming_hosts || 0, 10);

      // 4. Currently broadcast-banned hosts
      const [bannedStats] = await query(
        `SELECT COUNT(id) AS banned_hosts_count
         FROM users
         WHERE agency_id = ? AND broadcast_banned_until > CURRENT_TIMESTAMP AND role != 'superadmin'`,
        [agency.id]
      );
      const bannedHostsCount = parseInt(bannedStats?.banned_hosts_count || 0, 10);

      // 5. Total gifts received & agency commission across all affiliated hosts while under this agency
      const [commissionStats] = await query(
        `SELECT 
           COALESCE(SUM(gt.coin_amount), 0) AS total_coins_gifted_to_hosts,
           COALESCE(SUM(gt.diamond_amount), 0) AS total_diamonds_earned_by_hosts,
           COUNT(gt.id) AS total_gifts_count
         FROM gift_transactions gt
         INNER JOIN users u ON u.id = gt.receiver_id
         WHERE u.agency_id = ? AND gt.created_at >= COALESCE(u.agency_joined_at, u.created_at) AND u.role != 'superadmin'`,
        [agency.id]
      );

      const totalCoinsGifted = parseInt(commissionStats?.total_coins_gifted_to_hosts || 0, 10);
      const commissionRate = await getEffectiveCommissionRate(agency);
      const totalCommissionCoins = Math.round(totalCoinsGifted * (commissionRate / 100));

      // 6. Pending join requests count
      const [pendingStats] = await query(
        `SELECT COUNT(id) AS pending_requests_count
         FROM agency_host_requests
         WHERE agency_id = ? AND status = 'pending'`,
        [agency.id]
      );
      const pendingRequestsCount = parseInt(pendingStats?.pending_requests_count || 0, 10);

      const rawAgencyLogo = agency.logo_url || agency.avatar_url || '';
      const rawAvatar = rawAgencyLogo || owner?.avatar_url || '';
      const fullAvatar = resolveFullAvatarUrl(req, rawAvatar);
      const ownerRawAvatar = owner?.avatar_url || '';
      const ownerFullAvatar = resolveFullAvatarUrl(req, ownerRawAvatar);

      return {
        id: agency.id,
        agency_id: agency.id,
        name: agency.name,
        agency_name: agency.name,
        agency_code: agency.agency_code,
        avatar_url: rawAvatar,
        profile_picture: rawAvatar,
        profile_picture_url: fullAvatar || rawAvatar,
        profile_image: rawAvatar,
        logo_url: rawAvatar,
        logo: rawAvatar,
        full_avatar_url: fullAvatar,
        full_profile_picture: fullAvatar,
        commission_rate: commissionRate,
        commission_rate_percentage: commissionRate,
        commission_rate_percent: commissionRate,
        agency_commission_rate: commissionRate,
        agency_commission: totalCommissionCoins,
        agency_commission_coins: totalCommissionCoins,
        total_coins: owner?.coins || 0,
        owner_coins: owner?.coins || 0,
        total_commission_coins: totalCommissionCoins,
        commission_coin_total: totalCommissionCoins,
        total_hosts: totalHosts,
        banned_hosts_count: bannedHostsCount,
        pending_requests_count: pendingRequestsCount,
        agency: {
          id: agency.id,
          agency_code: agency.agency_code,
          name: agency.name,
          commission_rate: commissionRate,
          commission_rate_percentage: commissionRate,
          agency_commission_rate: commissionRate,
          status: agency.status,
          contact_phone: agency.contact_phone || '',
          notes: agency.notes || '',
          created_at: agency.created_at,
          avatar_url: rawAvatar,
          profile_picture: rawAvatar,
          profile_picture_url: fullAvatar || rawAvatar,
          profile_image: rawAvatar,
          logo_url: rawAvatar,
          logo: rawAvatar,
          full_avatar_url: fullAvatar,
          full_profile_picture: fullAvatar,
        },
        owner: {
          id: owner?.id || agency.owner_id,
          full_name: owner?.full_name || 'Agency Manager',
          email: owner?.email || '',
          avatar_url: ownerRawAvatar,
          profile_picture: ownerRawAvatar,
          profile_picture_url: ownerFullAvatar || ownerRawAvatar,
          profile_image: ownerRawAvatar,
          avatar: ownerRawAvatar,
          full_avatar_url: ownerFullAvatar,
          full_profile_picture: ownerFullAvatar,
          coins: owner?.coins || 0,
          diamonds: owner?.diamonds || 0,
        },
        metrics: {
          total_hosts: totalHosts,
          active_streaming_hosts: activeStreamingHosts,
          banned_hosts_count: bannedHostsCount,
          total_commission_coins: totalCommissionCoins,
          total_coins_gifted_to_hosts: totalCoinsGifted,
          pending_requests_count: pendingRequestsCount,
          commission_rate: commissionRate,
          commission_rate_percentage: commissionRate,
          agency_commission_rate: commissionRate,
        },
      };
    });

    const agencyPic = data?.profile_picture || data?.owner?.profile_picture || data?.agency?.profile_picture || '';
    const fullAgencyPic = resolveFullAvatarUrl(req, agencyPic) || data?.full_profile_picture || agencyPic;

    return res.json({
      success: true,
      message: 'Agency overview retrieved successfully.',
      profile_picture: agencyPic,
      profile_picture_url: fullAgencyPic,
      avatar_url: agencyPic,
      logo_url: agencyPic,
      full_avatar_url: fullAgencyPic,
      full_profile_picture: fullAgencyPic,
      data: {
        ...data,
        avatar_url: agencyPic,
        profile_picture: agencyPic,
        profile_picture_url: fullAgencyPic,
        profile_image: agencyPic,
        logo_url: agencyPic,
        logo: agencyPic,
        full_avatar_url: fullAgencyPic,
        full_profile_picture: fullAgencyPic,
        agency: {
          ...data.agency,
          avatar_url: agencyPic,
          profile_picture: agencyPic,
          profile_picture_url: fullAgencyPic,
          profile_image: agencyPic,
          logo_url: agencyPic,
          logo: agencyPic,
          full_avatar_url: fullAgencyPic,
          full_profile_picture: fullAgencyPic,
        },
      },
    });
  } catch (error) {
    console.error('getAgencyOverview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve agency overview.' });
  }
}

/**
 * GET /api/mobile/agency/hosts
 * Lists all hosts under the agency with streaming performance, ban status, and earnings.
 * Redis Cache-Aside: 'agency:hosts:{agencyId}' (TTL 60s).
 */
export async function getAgencyHosts(req, res) {
  try {
    const agency = await resolveAgency(req);
    if (!agency) {
      return res.status(404).json({ success: false, message: 'Agency profile not found.' });
    }

    const commissionRate = await getEffectiveCommissionRate(agency);
    const cacheKey = `agency:hosts:${agency.id}`;

    const hosts = await cache.getOrSet(cacheKey, 60, async () => {
      const rows = await query(
        `SELECT 
           u.id, u.full_name, u.email, u.avatar_url, u.role, u.host_type,
           u.coins, u.diamonds, u.level, u.agency_joined_at, u.created_at,
           u.broadcast_banned_until, u.broadcast_ban_reason, u.broadcast_banned_at,
           (u.broadcast_banned_until IS NOT NULL AND u.broadcast_banned_until > CURRENT_TIMESTAMP) AS is_broadcast_banned,
           TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, u.broadcast_banned_until) AS ban_remaining_seconds,
           lr.room_id AS active_room_id,
           lr.live_type AS active_live_type,
           (lr.id IS NOT NULL) AS is_currently_live
         FROM users u
         LEFT JOIN live_rooms lr ON lr.host_id = u.id AND lr.status = 'live'
         WHERE u.agency_id = ?
         ORDER BY is_currently_live DESC, is_broadcast_banned ASC, u.id ASC`,
        [agency.id]
      );

      // Fetch stream duration & gifts for each host
      const hostIds = rows.map((r) => r.id);
      let streamStatsMap = {};
      let earningsStatsMap = {};

      if (hostIds.length > 0) {
        const streamRows = await query(
          `SELECT 
             host_id,
             COALESCE(SUM(TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW()))), 0) AS total_duration_seconds
           FROM live_rooms
           WHERE host_id IN (?)
           GROUP BY host_id`,
          [hostIds]
        );
        streamRows.forEach((s) => {
          streamStatsMap[s.host_id] = parseInt(s.total_duration_seconds || 0, 10);
        });

        const earnRows = await query(
          `SELECT 
             receiver_id,
             COALESCE(SUM(coin_amount), 0) AS total_coins_gifted
           FROM gift_transactions
           WHERE receiver_id IN (?)
           GROUP BY receiver_id`,
          [hostIds]
        );
        earnRows.forEach((e) => {
          earningsStatsMap[e.receiver_id] = parseInt(e.total_coins_gifted || 0, 10);
        });
      }

      return rows.map((host) => {
        const isBanned = Boolean(host.is_broadcast_banned);
        const banRemSec = Math.max(0, parseInt(host.ban_remaining_seconds || 0, 10));
        const streamSec = streamStatsMap[host.id] || 0;
        const totalCoinsEarned = earningsStatsMap[host.id] || 0;
        const agencyCommission = Math.round(totalCoinsEarned * (commissionRate / 100));
        const hostNetCoins = Math.max(0, totalCoinsEarned - agencyCommission);

        return {
          id: host.id,
          full_name: host.full_name,
          email: host.email,
          avatar_url: host.avatar_url,
          role: host.role,
          host_type: host.host_type || 'video',
          coins: host.coins,
          diamonds: host.diamonds,
          level: host.level,
          agency_id: agency.id,
          agency_name: agency.name,
          agency_code: agency.agency_code,
          agency_joined_at: host.agency_joined_at || host.created_at,
          is_currently_live: Boolean(host.is_currently_live),
          active_room_id: host.active_room_id || null,
          active_live_type: host.active_live_type || null,
          is_broadcast_banned: isBanned,
          broadcast_ban: isBanned
            ? {
                banned_at: host.broadcast_banned_at,
                banned_until: host.broadcast_banned_until,
                reason: host.broadcast_ban_reason || 'Temporary broadcast suspension',
                remaining_seconds: banRemSec,
                remaining_formatted: formatDuration(banRemSec),
              }
            : null,
          total_stream_seconds: streamSec,
          total_stream_formatted: formatDuration(streamSec),
          total_coins_earned: totalCoinsEarned,
          agency_commission_coins: agencyCommission,
          agency_commission: agencyCommission,
          commission: agencyCommission,
          host_net_coins: hostNetCoins,
          commission_rate: commissionRate,
          commission_rate_percentage: commissionRate,
          commission_rate_percent: commissionRate,
          agency_commission_rate: commissionRate,
          performance: {
            total_streaming_seconds: streamSec,
            total_stream_formatted: formatDuration(streamSec),
            total_coins_earned: totalCoinsEarned,
            agency_commission_coins: agencyCommission,
            agency_commission: agencyCommission,
            commission_rate: commissionRate,
            commission_rate_percentage: commissionRate,
            host_net_coins: hostNetCoins,
          },
        };
      });
    });

    return res.json({
      success: true,
      message: 'Agency hosts list retrieved successfully.',
      count: hosts.length,
      commission_rate: commissionRate,
      commission_rate_percentage: commissionRate,
      agency_commission_rate: commissionRate,
      total_commission_coins: hosts.reduce((sum, h) => sum + (h.agency_commission_coins || 0), 0),
      agency: {
        id: agency.id,
        name: agency.name,
        agency_code: agency.agency_code,
        commission_rate: commissionRate,
        commission_rate_percentage: commissionRate,
        status: agency.status,
      },
      data: hosts,
    });
  } catch (error) {
    console.error('getAgencyHosts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve agency hosts list.' });
  }
}

/**
 * PUT /api/mobile/agency/commission
 * POST /api/mobile/agency/commission
 * Allows agency owners (or moderators/admins) to update their commission percentage.
 */
export async function updateAgencyCommission(req, res) {
  try {
    const agency = await resolveAgency(req);
    if (!agency) {
      return res.status(404).json({ success: false, message: 'Agency profile not found.' });
    }

    const rawRate = req.body.commission_rate ?? req.body.commissionRate ?? req.body.rate ?? req.body.commission;
    if (rawRate === undefined || rawRate === null || isNaN(parseFloat(rawRate))) {
      return res.status(400).json({ success: false, message: 'Invalid commission rate provided.' });
    }

    const rate = Math.min(100, Math.max(0, parseFloat(rawRate)));

    // 1. Database-First Mutation
    await query('UPDATE agencies SET commission_rate = ?, updated_at = NOW() WHERE id = ?', [rate, agency.id]);

    // 2. Instant Redis Cache Invalidation
    await invalidateAgencyCache(agency.id);

    return res.json({
      success: true,
      message: `Agency commission rate updated to ${rate}% successfully.`,
      agency_id: agency.id,
      commission_rate: rate,
      commission_rate_percentage: rate,
      agency_commission_rate: rate,
    });
  } catch (error) {
    console.error('updateAgencyCommission error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update agency commission rate.' });
  }
}

/**
 * POST /api/mobile/agency/hosts/:hostId/remove
 * DELETE /api/mobile/agency/hosts/:hostId
 * Removes an affiliated host from the agency.
 * Terminates active stream if ongoing, resets agency_id, and invalidates Redis.
 */
export async function removeHostFromAgency(req, res) {
  try {
    const agency = await resolveAgency(req);
    if (!agency) {
      return res.status(404).json({ success: false, message: 'Agency profile not found.' });
    }

    const hostId = parseInt(req.params.hostId, 10);
    if (!hostId || isNaN(hostId)) {
      return res.status(400).json({ success: false, message: 'Invalid host ID provided.' });
    }

    // 1. Verify host belongs to this agency
    const [host] = await query(
      'SELECT id, full_name, agency_id FROM users WHERE id = ?',
      [hostId]
    );

    if (!host) {
      return res.status(404).json({ success: false, message: 'Host user not found.' });
    }

    if (host.agency_id !== agency.id) {
      return res.status(400).json({ success: false, message: 'Host does not belong to your agency.' });
    }

    // 2. If host has an active live stream, terminate it immediately
    const liveRooms = await query(
      `SELECT room_id FROM live_rooms WHERE host_id = ? AND status = 'live'`,
      [hostId]
    );

    if (liveRooms.length > 0) {
      await query(
        `UPDATE live_rooms SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE host_id = ? AND status = 'live'`,
        [hostId]
      );
      for (const room of liveRooms) {
        await cache.del(`room:${room.room_id}`);
      }
      await cache.delByPattern('mobile:rooms:*');
    }

    // 3. MySQL SSOT: Remove host from agency
    await query(
      `UPDATE users 
       SET agency_id = NULL, role = 'user', broadcast_banned_until = NULL, broadcast_ban_reason = NULL, broadcast_banned_at = NULL 
       WHERE id = ?`,
      [hostId]
    );

    // 4. Invalidate Redis Caches
    await invalidateAgencyCache(agency.id);
    await cache.del(`host:agency_summary:${hostId}`);
    await cache.del(`user:${hostId}`);
    await cache.del(`user:profile:${hostId}`);

    return res.json({
      success: true,
      message: `Host "${host.full_name}" has been removed from agency "${agency.name}".`,
      data: {
        host_id: hostId,
        host_name: host.full_name,
        agency_id: agency.id,
      },
    });
  } catch (error) {
    console.error('removeHostFromAgency error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove host from agency.' });
  }
}

/**
 * POST /api/mobile/agency/hosts/:hostId/ban-broadcast
 * Temporarily suspends a host from starting live rooms for a designated time duration.
 * Terminates active stream if ongoing, records ban expiration, and invalidates Redis.
 */
export async function banHostBroadcast(req, res) {
  try {
    const agency = await resolveAgency(req);
    if (!agency) {
      return res.status(404).json({ success: false, message: 'Agency profile not found.' });
    }

    const hostId = parseInt(req.params.hostId, 10);
    if (!hostId || isNaN(hostId)) {
      return res.status(400).json({ success: false, message: 'Invalid host ID provided.' });
    }

    const {
      durationMinutes,
      durationHours,
      durationDays,
      bannedUntil,
      reason = 'Agency broadcast policy violation',
    } = req.body || {};

    // 1. Verify host belongs to this agency
    const [host] = await query(
      'SELECT id, full_name, agency_id FROM users WHERE id = ?',
      [hostId]
    );

    if (!host) {
      return res.status(404).json({ success: false, message: 'Host user not found.' });
    }

    if (host.agency_id !== agency.id) {
      return res.status(400).json({ success: false, message: 'Host does not belong to your agency.' });
    }

    // 2. Compute ban expiration datetime
    let untilDate = null;
    let durationSeconds = 0;

    if (bannedUntil) {
      untilDate = new Date(bannedUntil);
      if (isNaN(untilDate.getTime()) || untilDate <= new Date()) {
        return res.status(400).json({ success: false, message: 'bannedUntil must be a valid future ISO datetime.' });
      }
      durationSeconds = Math.round((untilDate.getTime() - Date.now()) / 1000);
    } else if (durationMinutes && !isNaN(parseInt(durationMinutes, 10))) {
      const min = parseInt(durationMinutes, 10);
      untilDate = new Date(Date.now() + min * 60 * 1000);
      durationSeconds = min * 60;
    } else if (durationHours && !isNaN(parseInt(durationHours, 10))) {
      const hrs = parseInt(durationHours, 10);
      untilDate = new Date(Date.now() + hrs * 3600 * 1000);
      durationSeconds = hrs * 3600;
    } else if (durationDays && !isNaN(parseInt(durationDays, 10))) {
      const days = parseInt(durationDays, 10);
      untilDate = new Date(Date.now() + days * 86400 * 1000);
      durationSeconds = days * 86400;
    } else {
      // Default: 24 Hours
      untilDate = new Date(Date.now() + 24 * 3600 * 1000);
      durationSeconds = 24 * 3600;
    }

    const formattedUntil = untilDate.toISOString().slice(0, 19).replace('T', ' ');

    // 3. If host is currently live streaming, immediately terminate the active room
    const liveRooms = await query(
      `SELECT room_id FROM live_rooms WHERE host_id = ? AND status = 'live'`,
      [hostId]
    );

    if (liveRooms.length > 0) {
      await query(
        `UPDATE live_rooms SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE host_id = ? AND status = 'live'`,
        [hostId]
      );
      for (const room of liveRooms) {
        await cache.del(`room:${room.room_id}`);
      }
      await cache.delByPattern('mobile:rooms:*');
    }

    // 4. MySQL SSOT: Update broadcast ban fields
    await query(
      `UPDATE users 
       SET broadcast_banned_until = ?, broadcast_ban_reason = ?, broadcast_banned_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [formattedUntil, reason, hostId]
    );

    // 5. Invalidate Redis Caches
    await invalidateAgencyCache(agency.id);
    await cache.del(`host:agency_summary:${hostId}`);
    await cache.del(`user:${hostId}`);
    await cache.del(`user:profile:${hostId}`);

    return res.json({
      success: true,
      message: `Host "${host.full_name}" has been broadcast suspended until ${formattedUntil}.`,
      data: {
        host_id: hostId,
        host_name: host.full_name,
        broadcast_banned_at: new Date().toISOString(),
        broadcast_banned_until: untilDate.toISOString(),
        duration_seconds: durationSeconds,
        duration_formatted: formatDuration(durationSeconds),
        reason,
        stream_terminated: liveRooms.length > 0,
      },
    });
  } catch (error) {
    console.error('banHostBroadcast error:', error);
    return res.status(500).json({ success: false, message: 'Failed to suspend host broadcast permissions.' });
  }
}

/**
 * POST /api/mobile/agency/hosts/:hostId/unban-broadcast
 * Prematurely removes the broadcast ban from a host.
 */
export async function unbanHostBroadcast(req, res) {
  try {
    const agency = await resolveAgency(req);
    if (!agency) {
      return res.status(404).json({ success: false, message: 'Agency profile not found.' });
    }

    const hostId = parseInt(req.params.hostId, 10);
    if (!hostId || isNaN(hostId)) {
      return res.status(400).json({ success: false, message: 'Invalid host ID provided.' });
    }

    // 1. Verify host belongs to this agency
    const [host] = await query(
      'SELECT id, full_name, agency_id, broadcast_banned_until FROM users WHERE id = ?',
      [hostId]
    );

    if (!host) {
      return res.status(404).json({ success: false, message: 'Host user not found.' });
    }

    if (host.agency_id !== agency.id) {
      return res.status(400).json({ success: false, message: 'Host does not belong to your agency.' });
    }

    // 2. MySQL SSOT: Clear broadcast ban
    await query(
      `UPDATE users 
       SET broadcast_banned_until = NULL, broadcast_ban_reason = NULL, broadcast_banned_at = NULL 
       WHERE id = ?`,
      [hostId]
    );

    // 3. Invalidate Redis Caches
    await invalidateAgencyCache(agency.id);
    await cache.del(`host:agency_summary:${hostId}`);
    await cache.del(`user:${hostId}`);
    await cache.del(`user:profile:${hostId}`);

    return res.json({
      success: true,
      message: `Broadcast ban for host "${host.full_name}" has been successfully lifted.`,
      data: {
        host_id: hostId,
        host_name: host.full_name,
        broadcast_banned_until: null,
      },
    });
  } catch (error) {
    console.error('unbanHostBroadcast error:', error);
    return res.status(500).json({ success: false, message: 'Failed to unban host broadcast.' });
  }
}

/**
 * GET /api/mobile/agency/banned-hosts
 * Returns all currently broadcast-suspended hosts under this agency with ban details and countdown.
 * Redis Cache-Aside: 'agency:banned_hosts:{agencyId}' (TTL 30s).
 */
export async function getBannedHosts(req, res) {
  try {
    const agency = await resolveAgency(req);
    if (!agency) {
      return res.status(404).json({ success: false, message: 'Agency profile not found.' });
    }

    const cacheKey = `agency:banned_hosts:${agency.id}`;

    const bannedHosts = await cache.getOrSet(cacheKey, 30, async () => {
      const rows = await query(
        `SELECT 
           id, full_name, email, avatar_url, role, host_type, level,
           broadcast_banned_at, broadcast_banned_until, broadcast_ban_reason,
           TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, broadcast_banned_until) AS remaining_seconds
         FROM users
         WHERE agency_id = ? AND broadcast_banned_until > CURRENT_TIMESTAMP AND role != 'superadmin'
         ORDER BY broadcast_banned_until ASC`,
        [agency.id]
      );

      return rows.map((host) => {
        const remSec = Math.max(0, parseInt(host.remaining_seconds || 0, 10));
        return {
          id: host.id,
          full_name: host.full_name,
          email: host.email,
          avatar_url: host.avatar_url,
          host_type: host.host_type || 'video',
          level: host.level,
          broadcast_banned_at: host.broadcast_banned_at,
          broadcast_banned_until: host.broadcast_banned_until,
          broadcast_ban_reason: host.broadcast_ban_reason || 'Temporary broadcast suspension',
          remaining_seconds: remSec,
          remaining_formatted: formatDuration(remSec),
        };
      });
    });

    return res.json({
      success: true,
      message: 'Suspended hosts list retrieved successfully.',
      count: bannedHosts.length,
      data: bannedHosts,
    });
  } catch (error) {
    console.error('getBannedHosts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve suspended hosts list.' });
  }
}

/**
 * GET /api/mobile/agency/requests
 * Lists incoming host recruitment/join requests for this agency.
 * Filters by ?status=pending|approved|rejected|all (default: pending).
 * Redis Cache-Aside: 'agency:requests:{agencyId}:{status}' (TTL 30s).
 */
export async function getHostRequests(req, res) {
  try {
    const agency = await resolveAgency(req);
    if (!agency) {
      return res.status(404).json({ success: false, message: 'Agency profile not found.' });
    }

    const status = (req.query.status || 'pending').toLowerCase();
    const cacheKey = `agency:requests:${agency.id}:${status}`;

    const requests = await cache.getOrSet(cacheKey, 30, async () => {
      let statusClause = 'AND ahr.status = ?';
      const queryParams = [agency.id];

      if (status === 'all') {
        statusClause = '';
      } else {
        queryParams.push(status);
      }

      const rows = await query(
        `SELECT 
           ahr.id, ahr.agency_id, ahr.user_id, ahr.host_type, ahr.message, 
           ahr.status, ahr.responded_by, ahr.responded_at, ahr.created_at, ahr.updated_at,
           u.full_name AS applicant_name,
           u.email AS applicant_email,
           u.avatar_url AS applicant_avatar,
           u.coins AS applicant_coins,
           u.diamonds AS applicant_diamonds,
           u.level AS applicant_level,
           u.agency_id AS applicant_current_agency_id,
           resp.full_name AS responder_name
         FROM agency_host_requests ahr
         INNER JOIN users u ON u.id = ahr.user_id
         LEFT JOIN users resp ON resp.id = ahr.responded_by
         WHERE ahr.agency_id = ? ${statusClause}
         ORDER BY ahr.created_at DESC`,
        queryParams
      );

      return rows.map((r) => ({
        id: r.id,
        agency_id: r.agency_id,
        user_id: r.user_id,
        host_type: r.host_type,
        message: r.message,
        status: r.status,
        created_at: r.created_at,
        responded_at: r.responded_at,
        responded_by: r.responded_by,
        responder_name: r.responder_name || null,
        applicant: {
          id: r.user_id,
          full_name: r.applicant_name,
          email: r.applicant_email,
          avatar_url: r.applicant_avatar,
          coins: r.applicant_coins,
          diamonds: r.applicant_diamonds,
          level: r.applicant_level,
          already_in_agency: Boolean(r.applicant_current_agency_id),
        },
      }));
    });

    return res.json({
      success: true,
      message: `Agency host requests (${status}) retrieved successfully.`,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error('getHostRequests error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve host requests.' });
  }
}

/**
 * POST /api/mobile/agency/requests/:requestId/approve
 * Approves a pending host join request.
 * Affiliates the user to the agency with role 'host', updates request record, and invalidates Redis.
 */
export async function approveHostRequest(req, res) {
  try {
    const agency = await resolveAgency(req);
    if (!agency) {
      return res.status(404).json({ success: false, message: 'Agency profile not found.' });
    }

    const requestId = parseInt(req.params.requestId, 10);
    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID provided.' });
    }

    // 1. Fetch request record
    const [request] = await query(
      `SELECT ahr.*, u.full_name, u.agency_id AS current_agency_id
       FROM agency_host_requests ahr
       INNER JOIN users u ON u.id = ahr.user_id
       WHERE ahr.id = ? AND ahr.agency_id = ?`,
      [requestId, agency.id]
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Host join request not found for this agency.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request cannot be approved because it is already "${request.status}".`,
      });
    }

    const userId = request.user_id;
    const hostType = request.host_type || 'video';

    // 2. MySQL SSOT: Update user and request record
    await query(
      `UPDATE users 
       SET agency_id = ?, role = 'host', host_type = ?, agency_joined_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [agency.id, hostType, userId]
    );

    await query(
      `UPDATE agency_host_requests 
       SET status = 'approved', responded_by = ?, responded_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [req.user.id, requestId]
    );

    // 3. Invalidate Redis Caches
    await invalidateAgencyCache(agency.id);
    await cache.del(`host:agency_summary:${userId}`);
    await cache.del(`user:${userId}`);
    await cache.del(`user:profile:${userId}`);

    return res.json({
      success: true,
      message: `Applicant "${request.full_name}" is now approved as a ${hostType} host under "${agency.name}".`,
      data: {
        request_id: requestId,
        user_id: userId,
        agency_id: agency.id,
        status: 'approved',
        host_type: hostType,
      },
    });
  } catch (error) {
    console.error('approveHostRequest error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve host request.' });
  }
}

/**
 * POST /api/mobile/agency/requests/:requestId/reject
 * Rejects a pending host join request.
 */
export async function rejectHostRequest(req, res) {
  try {
    const agency = await resolveAgency(req);
    if (!agency) {
      return res.status(404).json({ success: false, message: 'Agency profile not found.' });
    }

    const requestId = parseInt(req.params.requestId, 10);
    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID provided.' });
    }

    // 1. Fetch request record
    const [request] = await query(
      `SELECT ahr.*, u.full_name
       FROM agency_host_requests ahr
       INNER JOIN users u ON u.id = ahr.user_id
       WHERE ahr.id = ? AND ahr.agency_id = ?`,
      [requestId, agency.id]
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Host join request not found for this agency.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request cannot be rejected because it is already "${request.status}".`,
      });
    }

    // 2. MySQL SSOT: Update request status
    await query(
      `UPDATE agency_host_requests 
       SET status = 'rejected', responded_by = ?, responded_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [req.user.id, requestId]
    );

    // 3. Invalidate Redis Caches
    await invalidateAgencyCache(agency.id);

    return res.json({
      success: true,
      message: `Host request #${requestId} for "${request.full_name}" has been rejected.`,
      data: {
        request_id: requestId,
        user_id: request.user_id,
        agency_id: agency.id,
        status: 'rejected',
      },
    });
  } catch (error) {
    console.error('rejectHostRequest error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject host request.' });
  }
}

/**
 * GET /api/mobile/agency/my-application
 * Returns the authenticated user's current agency affiliation and their latest/pending host application status.
 * Redis Cache-Aside: 'user:agency_application:{userId}' (TTL 30s).
 */
export async function getMyAgencyApplication(req, res) {
  try {
    const userId = req.user.id;
    const cacheKey = `user:agency_application:${userId}`;

    const data = await cache.getOrSet(cacheKey, 30, async () => {
      // 1. Current user affiliation
      const [user] = await query(
        `SELECT id, full_name, email, role, host_type, agency_id, agency_joined_at, coins, diamonds, level 
         FROM users 
         WHERE id = ?`,
        [userId]
      );

      let currentAgency = null;
      if (user?.agency_id) {
        const [agencyRow] = await query(
          `SELECT a.id, a.agency_code, a.name, a.commission_rate, a.status, a.contact_phone, a.created_at,
                  u.avatar_url AS owner_avatar
           FROM agencies a
           LEFT JOIN users u ON u.id = a.owner_id
           WHERE a.id = ?`,
          [user.agency_id]
        );
        if (agencyRow) {
          const rawAvatar = agencyRow.owner_avatar || '';
          const fullAvatar = resolveFullAvatarUrl(req, rawAvatar);
          currentAgency = {
            id: agencyRow.id,
            agency_code: agencyRow.agency_code,
            name: agencyRow.name,
            commission_rate: parseFloat(agencyRow.commission_rate || 10),
            status: agencyRow.status,
            contact_phone: agencyRow.contact_phone || '',
            joined_at: user.agency_joined_at,
            agency_logo: rawAvatar,
            logo_url: rawAvatar,
            profile_picture: rawAvatar,
            profile_picture_url: fullAvatar || rawAvatar,
            full_avatar_url: fullAvatar,
          };
        }
      }

      // 2. Fetch pending application if any
      const [pendingReq] = await query(
        `SELECT 
           ahr.id, ahr.agency_id, ahr.user_id, ahr.host_type, ahr.message, 
           ahr.status, ahr.created_at, ahr.updated_at,
           a.name AS agency_name, a.agency_code, a.commission_rate,
           u_owner.avatar_url AS owner_avatar
         FROM agency_host_requests ahr
         INNER JOIN agencies a ON a.id = ahr.agency_id
         LEFT JOIN users u_owner ON u_owner.id = a.owner_id
         WHERE ahr.user_id = ? AND ahr.status = 'pending'
         ORDER BY ahr.created_at DESC
         LIMIT 1`,
        [userId]
      );

      // 3. Fetch latest application of any status
      const [latestReq] = await query(
        `SELECT 
           ahr.id, ahr.agency_id, ahr.user_id, ahr.host_type, ahr.message, 
           ahr.status, ahr.created_at, ahr.responded_at, ahr.updated_at,
           a.name AS agency_name, a.agency_code,
           u_owner.avatar_url AS owner_avatar
         FROM agency_host_requests ahr
         INNER JOIN agencies a ON a.id = ahr.agency_id
         LEFT JOIN users u_owner ON u_owner.id = a.owner_id
         WHERE ahr.user_id = ?
         ORDER BY ahr.created_at DESC
         LIMIT 1`,
        [userId]
      );

      const pendingRawAvatar = pendingReq?.owner_avatar || '';
      const pendingFullAvatar = resolveFullAvatarUrl(req, pendingRawAvatar);

      const latestRawAvatar = latestReq?.owner_avatar || '';
      const latestFullAvatar = resolveFullAvatarUrl(req, latestRawAvatar);

      return {
        user: {
          id: user.id,
          full_name: user.full_name,
          role: user.role,
          host_type: user.host_type,
          is_host: user.role === 'host',
        },
        affiliation: {
          is_affiliated: Boolean(user?.agency_id && currentAgency),
          agency: currentAgency,
        },
        has_pending_application: Boolean(pendingReq),
        pending_application: pendingReq
          ? {
              request_id: pendingReq.id,
              agency_id: pendingReq.agency_id,
              agency_name: pendingReq.agency_name,
              agency_code: pendingReq.agency_code,
              commission_rate: parseFloat(pendingReq.commission_rate || 10),
              agency_logo: pendingRawAvatar,
              logo_url: pendingRawAvatar,
              profile_picture: pendingRawAvatar,
              profile_picture_url: pendingFullAvatar || pendingRawAvatar,
              full_avatar_url: pendingFullAvatar,
              host_type: pendingReq.host_type,
              message: pendingReq.message,
              status: pendingReq.status,
              applied_at: pendingReq.created_at,
            }
          : null,
        latest_application: latestReq
          ? {
              request_id: latestReq.id,
              agency_id: latestReq.agency_id,
              agency_name: latestReq.agency_name,
              agency_code: latestReq.agency_code,
              agency_logo: latestRawAvatar,
              logo_url: latestRawAvatar,
              profile_picture: latestRawAvatar,
              profile_picture_url: latestFullAvatar || latestRawAvatar,
              full_avatar_url: latestFullAvatar,
              host_type: latestReq.host_type,
              status: latestReq.status,
              applied_at: latestReq.created_at,
              responded_at: latestReq.responded_at,
            }
          : null,
      };
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('getMyAgencyApplication error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve application status.' });
  }
}

/**
 * POST /api/mobile/agency/apply
 * Allows any authenticated user or host to apply to join an agency.
 * Strict Guards:
 * 1. A user can only belong to AT MOST ONE agency at any given time.
 * 2. A user can only have AT MOST ONE active pending application across all agencies.
 */
export async function applyToAgency(req, res) {
  try {
    const userId = req.user.id;
    const { agencyId, agencyCode, hostType = 'video', message = '' } = req.body || {};

    if (!agencyId && !agencyCode) {
      return res.status(400).json({ success: false, message: 'agencyId or agencyCode is required to submit an application.' });
    }

    // 1. Lookup target agency
    let agency = null;
    if (agencyId) {
      const [row] = await query('SELECT * FROM agencies WHERE id = ?', [agencyId]);
      agency = row;
    } else {
      const [row] = await query('SELECT * FROM agencies WHERE agency_code = ?', [agencyCode]);
      agency = row;
    }

    if (!agency) {
      return res.status(404).json({ success: false, message: 'Target agency not found.' });
    }

    if (agency.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Target agency is currently not accepting new hosts.' });
    }

    // 2. Guard: A user can only belong to AT MOST ONE agency at a time
    const [user] = await query('SELECT id, agency_id, role FROM users WHERE id = ?', [userId]);
    if (user && user.agency_id) {
      const [currentAgency] = await query('SELECT name, agency_code FROM agencies WHERE id = ?', [user.agency_id]);
      return res.status(400).json({
        success: false,
        message: `You are already affiliated with agency "${currentAgency?.name || 'Agency #' + user.agency_id}". A host can only belong to one agency at a time. You must be released from your current agency before applying to another.`,
      });
    }

    // 3. Guard: A user can only send a request to AT MOST ONE agency simultaneously
    const [existingPending] = await query(
      `SELECT ahr.id, ahr.agency_id, ahr.created_at, a.name AS agency_name, a.agency_code
       FROM agency_host_requests ahr
       INNER JOIN agencies a ON a.id = ahr.agency_id
       WHERE ahr.user_id = ? AND ahr.status = 'pending'
       LIMIT 1`,
      [userId]
    );

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: `You already have an active pending host application with "${existingPending.agency_name}" (${existingPending.agency_code}). You can only apply to one agency at a time. Please cancel your existing application first if you wish to apply to "${agency.name}".`,
        pending_application: {
          request_id: existingPending.id,
          agency_id: existingPending.agency_id,
          agency_name: existingPending.agency_name,
          agency_code: existingPending.agency_code,
          applied_at: existingPending.created_at,
        },
      });
    }

    const validHostType = hostType === 'audio' ? 'audio' : 'video';

    // 4. MySQL SSOT: Insert request
    const result = await query(
      `INSERT INTO agency_host_requests (agency_id, user_id, host_type, message, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [agency.id, userId, validHostType, message]
    );
    const requestId = result.insertId;

    // 5. Invalidate Redis Caches
    await invalidateAgencyCache(agency.id);
    await cache.del(`user:agency_application:${userId}`);

    // 6. Real-time Socket Notification → Agency Owner sees the new request immediately
    const [applicant] = await query(
      'SELECT id, full_name, avatar_url, level FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    const io = getLiveIO();
    if (io && agency.owner_id) {
      const requestPayload = {
        type: 'agency:new_host_request',
        request_id: requestId,
        agency_id: agency.id,
        agency_name: agency.name,
        host_type: validHostType,
        status: 'pending',
        created_at: new Date().toISOString(),
        applicant: {
          id: userId,
          full_name: applicant?.full_name || 'Unknown',
          avatar_url: applicant?.avatar_url || null,
          level: applicant?.level || 1,
        },
        message,
      };
      // Notify agency owner
      io.to(`user_${agency.owner_id}`).emit('agency:new_host_request', requestPayload);
      io.to(`user_${agency.owner_id}`).emit('new_notification', {
        type: 'agency_host_request',
        title: 'New Host Request',
        body: `${applicant?.full_name || 'Someone'} wants to join your agency as a ${validHostType} host.`,
        entity_type: 'agency_request',
        entity_id: String(requestId),
        meta: requestPayload,
        created_at: new Date().toISOString(),
      });
    }

    // 7. FCM Push Notification → Agency owner receives alert even when app is closed
    try {
      const tokenRows = await query(
        `SELECT DISTINCT fcm_token FROM user_devices 
         WHERE user_id = ? AND fcm_token IS NOT NULL AND fcm_token != '' AND is_banned = FALSE 
         LIMIT 5`,
        [agency.owner_id]
      );
      const tokens = tokenRows.map(r => r.fcm_token).filter(Boolean);
      if (tokens.length > 0) {
        sendPushNotification({
          tokens,
          title: '🔔 New Host Request',
          body: `${applicant?.full_name || 'Someone'} wants to join your agency as a ${validHostType} host.`,
          data: {
            notification_category: 'agency_request',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            request_id: String(requestId),
            agency_id: String(agency.id),
          },
        }).catch(() => {});
      }
    } catch (_) {}

    return res.status(201).json({
      success: true,
      message: `Your host join application has been submitted to "${agency.name}".`,
      data: {
        request_id: requestId,
        agency_id: agency.id,
        agency_name: agency.name,
        agency_code: agency.agency_code,
        host_type: validHostType,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('applyToAgency error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit agency application.' });
  }
}

/**
 * POST /api/mobile/agency/my-application/cancel
 * POST /api/mobile/agency/requests/:requestId/cancel
 * DELETE /api/mobile/agency/my-application
 * Allows an applicant user to cancel their pending host recruitment application.
 */
export async function cancelHostApplication(req, res) {
  try {
    const userId = req.user.id;
    const targetRequestId = req.params.requestId ? parseInt(req.params.requestId, 10) : null;

    let querySql = `
      SELECT ahr.*, a.name AS agency_name, a.agency_code
      FROM agency_host_requests ahr
      INNER JOIN agencies a ON a.id = ahr.agency_id
      WHERE ahr.user_id = ? AND ahr.status = 'pending'
    `;
    const queryParams = [userId];

    if (targetRequestId && !isNaN(targetRequestId)) {
      querySql += ' AND ahr.id = ?';
      queryParams.push(targetRequestId);
    }
    querySql += ' ORDER BY ahr.created_at DESC LIMIT 1';

    const [request] = await query(querySql, queryParams);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'No active pending application was found to cancel.',
      });
    }

    // 1. MySQL SSOT: Update status to 'cancelled'
    await query(
      `UPDATE agency_host_requests 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [request.id, userId]
    );

    // 2. Invalidate Redis Caches
    await invalidateAgencyCache(request.agency_id);
    await cache.del(`user:agency_application:${userId}`);

    return res.json({
      success: true,
      message: `Your host join application to "${request.agency_name}" has been cancelled successfully. You are now free to submit a new application.`,
      data: {
        request_id: request.id,
        agency_id: request.agency_id,
        agency_name: request.agency_name,
        status: 'cancelled',
      },
    });
  } catch (error) {
    console.error('cancelHostApplication error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel agency application.' });
  }
}

/**
 * Update Agency Profile (Name and Logo / Profile Picture)
 * PUT /api/mobile/agency/profile
 * Requires role 'agency', 'admin', or 'superadmin', OR user is owner of the agency.
 * Multipart or JSON supported. Updates agency table ONLY; preserves personal account profile.
 */
export async function updateAgencyProfile(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let targetAgencyId = req.params.agencyId ? parseInt(req.params.agencyId, 10) : (req.body.agency_id ? parseInt(req.body.agency_id, 10) : null);

    let agency = null;
    if (targetAgencyId) {
      const [row] = await query('SELECT * FROM agencies WHERE id = ?', [targetAgencyId]);
      agency = row;
    } else {
      const [byOwner] = await query('SELECT * FROM agencies WHERE owner_id = ? LIMIT 1', [userId]);
      if (byOwner) {
        agency = byOwner;
      } else if (req.user.agency_id) {
        const [byAgencyId] = await query('SELECT * FROM agencies WHERE id = ? LIMIT 1', [req.user.agency_id]);
        agency = byAgencyId;
      }
    }

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'No agency found associated with this account.',
      });
    }

    const isOwner = Number(agency.owner_id) === Number(userId);
    const isAdmin = ['admin', 'superadmin', 'moderator'].includes(userRole);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Only the agency owner or system administrator can edit this agency profile.',
      });
    }

    const { name, logo_url } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (cleanName.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Agency name must be at least 2 characters long.',
        });
      }
      updates.push('name = ?');
      params.push(cleanName);
    }

    if (req.file) {
      const savedLogo = `/uploads/agencies/${req.file.filename}`;
      updates.push('logo_url = ?', 'avatar_url = ?');
      params.push(savedLogo, savedLogo);
    } else if (logo_url !== undefined) {
      const cleanLogo = String(logo_url).trim();
      updates.push('logo_url = ?', 'avatar_url = ?');
      params.push(cleanLogo, cleanLogo);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes provided. Provide "name" or attach an image file.',
      });
    }

    params.push(agency.id);
    await query(`UPDATE agencies SET ${updates.join(', ')} WHERE id = ?`, params);

    // Invalidate Redis caches instantly!
    await cache.del(`agency:${agency.id}:overview`);
    await cache.del('agency:list:all');
    await cache.delByPattern('agency:list:*');
    await cache.del('moderator:agencies:all');
    await cache.delByPattern('moderator:agencies:*');
    await cache.del(`user:agency_application:${agency.owner_id}`);

    const [updatedAgency] = await query('SELECT * FROM agencies WHERE id = ?', [agency.id]);
    const rawLogo = updatedAgency.logo_url || updatedAgency.avatar_url || '';
    const fullLogo = resolveFullAvatarUrl(req, rawLogo);

    return res.json({
      success: true,
      message: 'Agency profile updated successfully.',
      data: {
        id: updatedAgency.id,
        agency_code: updatedAgency.agency_code,
        name: updatedAgency.name,
        logo_url: rawLogo,
        avatar_url: rawLogo,
        profile_picture: rawLogo,
        profile_picture_url: fullLogo || rawLogo,
        full_avatar_url: fullLogo,
      },
    });
  } catch (error) {
    console.error('updateAgencyProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update agency profile.',
    });
  }
}

