import { query } from '../../config/db.js';
import { cache } from '../../config/redis.js';

/**
 * Public Mobile Endpoint: Get Top Gifters Leaderboard
 * GET /api/mobile/leaderboard/gifters
 * Query params:
 * - timeframe: 'all' (default), 'daily' | 'today', 'weekly' | 'week', 'monthly' | 'month'
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 */
export async function getTopGifters(req, res) {
  try {
    const timeframe = (req.query.timeframe || 'all').toLowerCase();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    let dateCondition = "WHERE u.role != 'superadmin'";
    if (timeframe === 'today' || timeframe === 'daily') {
      dateCondition += ' AND gt.created_at >= CURDATE()';
    } else if (timeframe === 'week' || timeframe === 'weekly') {
      dateCondition += ' AND gt.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (timeframe === 'month' || timeframe === 'monthly') {
      dateCondition += ' AND gt.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    const cacheKey = `leaderboard:gifters:${timeframe}:${page}:${limit}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      // 1. Fetch ranked gifters
      const sql = `
        SELECT 
          gt.sender_id AS user_id,
          u.full_name,
          u.avatar_url,
          u.level,
          u.role,
          u.coins AS current_coins,
          pc.name AS vip_category,
          pc.badge_icon AS vip_badge,
          pc.color_code AS vip_color,
          COALESCE(SUM(gt.coin_amount), 0) AS total_coins_gifted,
          COUNT(gt.id) AS total_gifts_sent,
          COUNT(DISTINCT gt.receiver_id) AS total_recipients,
          MAX(gt.created_at) AS last_gifted_at
        FROM gift_transactions gt
        JOIN users u ON u.id = gt.sender_id
        LEFT JOIN user_package_subscriptions ups 
          ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
        LEFT JOIN package_categories pc 
          ON pc.id = ups.category_id AND pc.is_active = 1
        ${dateCondition}
        GROUP BY 
          gt.sender_id, u.full_name, u.avatar_url, u.level, u.role, u.coins,
          pc.name, pc.badge_icon, pc.color_code
        ORDER BY total_coins_gifted DESC, total_gifts_sent DESC
        LIMIT ? OFFSET ?
      `;

      const rows = await query(sql, [limit, offset]);

      // 2. Fetch total count and summary stats
      const countSql = `
        SELECT 
          COUNT(DISTINCT gt.sender_id) AS total_gifters,
          COALESCE(SUM(gt.coin_amount), 0) AS total_coins_spent,
          COUNT(gt.id) AS total_transactions
        FROM gift_transactions gt
        JOIN users u ON u.id = gt.sender_id
        ${dateCondition}
      `;
      const [summary] = await query(countSql);

      const totalGifters = parseInt(summary?.total_gifters || 0, 10);
      const totalCoinsSpent = parseInt(summary?.total_coins_spent || 0, 10);
      const totalTransactions = parseInt(summary?.total_transactions || 0, 10);

      const gifters = (rows || []).map((row, index) => ({
        rank: offset + index + 1,
        user_id: row.user_id,
        full_name: row.full_name || 'Anonymous Gifter',
        avatar_url: row.avatar_url || '',
        level: parseInt(row.level || 1, 10),
        role: row.role || 'user',
        vip_category: row.vip_category || 'Standard',
        vip_badge: row.vip_badge || '',
        vip_color: row.vip_color || '#7c3aed',
        total_coins_gifted: parseInt(row.total_coins_gifted || 0, 10),
        total_gifts_sent: parseInt(row.total_gifts_sent || 0, 10),
        total_recipients: parseInt(row.total_recipients || 0, 10),
        last_gifted_at: row.last_gifted_at,
      }));

      return {
        timeframe,
        page,
        limit,
        total_gifters: totalGifters,
        total_coins_spent: totalCoinsSpent,
        total_transactions: totalTransactions,
        total_pages: Math.ceil(totalGifters / limit) || 1,
        gifters,
      };
    });

    return res.json({
      success: true,
      message: 'Top gifters retrieved successfully.',
      ...data,
    });
  } catch (error) {
    console.error('[getTopGifters Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top gifters leaderboard.',
      error: error.message,
    });
  }
}

/**
 * Public Mobile Endpoint: Get Top Agencies Leaderboard
 * Sorted primarily by total coins generated, then by total hosts affiliated.
 * GET /api/mobile/leaderboard/agencies (and /api/mobile/agency/top)
 * 
 * Query params:
 * - search / q: filter by agency name or code
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 */
export async function getTopAgencies(req, res) {
  try {
    const search = (req.query.search || req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const cacheKey = `agency:top:${page}:${limit}:${search ? search.toLowerCase() : 'all'}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      let whereClause = "WHERE a.status = 'active' AND (u.role IS NULL OR u.role != 'superadmin')";
      const params = [];

      if (search) {
        whereClause += ' AND (a.name LIKE ? OR a.agency_code LIKE ? OR u.full_name LIKE ?)';
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern);
      }

      // Order by total coins gifted to affiliated hosts DESC, then total hosts count DESC
      const sql = `
        SELECT 
          a.id,
          a.agency_code,
          a.name,
          a.owner_id,
          a.commission_rate,
          a.status,
          a.contact_phone,
          a.created_at,
          u.full_name AS owner_name,
          u.avatar_url AS owner_avatar,
          u.coins AS owner_coins,
          (SELECT COUNT(u2.id) FROM users u2 WHERE u2.agency_id = a.id AND u2.role != 'superadmin') AS total_hosts,
          (SELECT COUNT(DISTINCT lr.host_id) 
           FROM live_rooms lr 
           INNER JOIN users u3 ON u3.id = lr.host_id 
           WHERE u3.agency_id = a.id AND u3.role != 'superadmin' AND lr.status = 'live') AS active_streaming_hosts,
          (SELECT COALESCE(SUM(gt.coin_amount), 0)
           FROM gift_transactions gt
           INNER JOIN users u4 ON u4.id = gt.receiver_id
           WHERE u4.agency_id = a.id AND u4.role != 'superadmin') AS total_coins_gifted_to_hosts
        FROM agencies a
        LEFT JOIN users u ON u.id = a.owner_id
        ${whereClause}
        ORDER BY total_coins_gifted_to_hosts DESC, total_hosts DESC, a.id ASC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const rows = await query(sql, params);

      // Count total agencies
      let countSql = `SELECT COUNT(a.id) AS total FROM agencies a LEFT JOIN users u ON u.id = a.owner_id ${whereClause}`;
      const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
      const [countRow] = await query(countSql, countParams);
      const totalAgencies = parseInt(countRow?.total || 0, 10);

      const agencies = (rows || []).map((row, index) => {
        const commissionRate = parseFloat(row.commission_rate || 10);
        const totalCoins = parseInt(row.total_coins_gifted_to_hosts || 0, 10);
        const totalCommissionCoins = Math.round(totalCoins * (commissionRate / 100));

        return {
          rank: offset + index + 1,
          id: row.id,
          agency_code: row.agency_code,
          name: row.name,
          commission_rate: commissionRate,
          status: row.status,
          contact_phone: row.contact_phone || '',
          created_at: row.created_at,
          total_coins: totalCoins,
          total_commission_coins: totalCommissionCoins,
          total_hosts: parseInt(row.total_hosts || 0, 10),
          active_streaming_hosts: parseInt(row.active_streaming_hosts || 0, 10),
          owner: {
            id: row.owner_id,
            full_name: row.owner_name || 'Agency Owner',
            avatar_url: row.owner_avatar || '',
            coins: parseInt(row.owner_coins || 0, 10),
          },
        };
      });

      return {
        page,
        limit,
        total_agencies: totalAgencies,
        total_pages: Math.ceil(totalAgencies / limit) || 1,
        agencies,
      };
    });

    return res.json({
      success: true,
      message: 'Top agencies list retrieved successfully.',
      ...data,
    });
  } catch (error) {
    console.error('[getTopAgencies Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top agencies leaderboard.',
      error: error.message,
    });
  }
}

export default {
  getTopGifters,
  getTopAgencies,
};
