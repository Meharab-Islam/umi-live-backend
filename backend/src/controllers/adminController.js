import path from 'path';
import bcrypt from 'bcryptjs';
import { query, getPool } from '../config/db.js';
import { cache } from '../config/redis.js';
import { signToken } from '../config/jwt.js';
import {
  getLiveDurationRewardSettings,
  updateLiveDurationRewardSettings,
  getLiveDurationRewardHistory,
  getLiveDurationRewardStats,
} from '../services/liveRewardService.js';
import { getStarProgressionConfig, calculateUserStars, getGlobalGiftBannerConfig } from '../services/systemService.js';
import { invalidateWalletWithdrawalCache } from './walletController.js';
import { deleteMultipleFilesFromStorage } from '../services/fileStorageService.js';
import { getLiveIO } from '../sockets/liveSocket.js';
import { invalidateAgencyCache } from './mobile/agencyController.js';

export async function getDashboardStats(req, res) {
  try {
    const { period = 'all', start_date, end_date } = req.query;
    const cacheKey = `admin:dashboard:${period}:${start_date || ''}:${end_date || ''}`;

    const statsData = await cache.getOrSet(cacheKey, 20, async () => {
      // 1. Time filter condition for transactions & activity
      let dateCondition = '';
      const dateParams = [];

      if (period === 'today') {
        dateCondition = ' AND created_at >= CURDATE()';
      } else if (period === 'yesterday') {
        dateCondition = ' AND created_at >= CURDATE() - INTERVAL 1 DAY AND created_at < CURDATE()';
      } else if (period === 'week') {
        dateCondition = ' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      } else if (period === 'month') {
        dateCondition = ' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      } else if (period === 'custom' && start_date) {
        if (end_date) {
          dateCondition = ' AND created_at >= ? AND created_at <= ?';
          dateParams.push(`${start_date} 00:00:00`, `${end_date} 23:59:59`);
        } else {
          dateCondition = ' AND created_at >= ?';
          dateParams.push(`${start_date} 00:00:00`);
        }
      }

      // 2. User stats & current circulating coin balances
      const [userCounts] = await query(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN role = 'host' THEN 1 ELSE 0 END) as total_hosts,
          SUM(CASE WHEN is_banned = TRUE THEN 1 ELSE 0 END) as banned_users,
          COALESCE(SUM(coins), 0) as total_user_coins,
          COALESCE(SUM(diamonds), 0) as total_user_diamonds,
          COALESCE(SUM(CASE WHEN role = 'host' THEN coins ELSE 0 END), 0) as host_coins,
          COALESCE(SUM(CASE WHEN role != 'host' THEN coins ELSE 0 END), 0) as regular_user_coins
        FROM users
        WHERE role != 'superadmin'
      `);

      // New users registered in filtered timeframe
      const [newUsersCount] = await query(
        `SELECT COUNT(*) as new_users FROM users WHERE role != 'superadmin' ${dateCondition}`,
        dateParams
      );

      // 3. Stream stats (Active live rooms, viewers)
      const [streamCounts] = await query(`
        SELECT 
          COUNT(*) as total_streams,
          SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) as active_streams,
          COALESCE(SUM(viewer_count), 0) as current_viewers
        FROM live_rooms
      `);

      // 4. Period-filtered financial metrics (Coins Sold, Admin Commission, Gift Coins Spent)
      const [financeCounts] = await query(
        `SELECT 
          COALESCE(SUM(CASE WHEN (type = 'coin_purchase' OR description LIKE '[Recharge]%') THEN amount ELSE 0 END), 0) as total_coins_sold,
          COALESCE(SUM(CASE WHEN type = 'gift_sent' THEN amount ELSE 0 END), 0) as total_gift_coins_spent,
          COALESCE(SUM(CASE WHEN type = 'gift_received' THEN amount ELSE 0 END), 0) as total_diamonds_rewarded,
          COALESCE(SUM(CASE WHEN type IN ('platform_commission', 'admin_commission') THEN amount ELSE 0 END), 0) as total_admin_commission,
          COUNT(CASE WHEN (type = 'coin_purchase' OR description LIKE '[Recharge]%') THEN 1 END) as total_coin_sales_count,
          COUNT(CASE WHEN type IN ('platform_commission', 'admin_commission') THEN 1 END) as total_commission_count
        FROM transactions
        WHERE 1=1 ${dateCondition}`,
        dateParams
      );

      // 5. All-Time financial metrics for comparison
      const [allTimeFinance] = await query(`
        SELECT 
          COALESCE(SUM(CASE WHEN (type = 'coin_purchase' OR description LIKE '[Recharge]%') THEN amount ELSE 0 END), 0) as all_time_coins_sold,
          COALESCE(SUM(CASE WHEN type = 'gift_sent' THEN amount ELSE 0 END), 0) as all_time_gift_coins_spent,
          COALESCE(SUM(CASE WHEN type IN ('platform_commission', 'admin_commission') THEN amount ELSE 0 END), 0) as all_time_admin_commission
        FROM transactions
      `);

      // 6. Pending withdrawals & Diamond Conversion setting
      const diamondSettingRows = await query("SELECT key_value FROM system_settings WHERE key_name = 'is_convert_to_diamond' LIMIT 1");
      const isDiamondMode = diamondSettingRows && diamondSettingRows.length > 0
        ? (diamondSettingRows[0].key_value === 'true' || diamondSettingRows[0].key_value === '1')
        : false;

      const [withdrawalStats] = await query(`
        SELECT 
          COUNT(*) as pending_count,
          COALESCE(SUM(coin_amount), 0) as pending_coins,
          COALESCE(SUM(diamond_amount), 0) as pending_diamonds,
          COALESCE(SUM(usd_amount), 0) as pending_usd
        FROM withdrawals
        WHERE status = 'pending'
      `);

      // 7. Recent gifts activity
      const recentGifts = await query(`
        SELECT gt.*, u1.full_name as sender_name, u1.avatar_url as sender_avatar,
               u2.full_name as receiver_name, u2.avatar_url as receiver_avatar
        FROM gift_transactions gt
        JOIN users u1 ON gt.sender_id = u1.id
        JOIN users u2 ON gt.receiver_id = u2.id
        ORDER BY gt.created_at DESC
        LIMIT 6
      `);

      // 8. Currently active live streams
      const activeStreamsList = await query(`
        SELECT r.*, u.full_name as host_name, u.avatar_url as host_avatar
        FROM live_rooms r
        JOIN users u ON r.host_id = u.id
        WHERE r.status = 'live'
        ORDER BY r.viewer_count DESC
        LIMIT 6
      `);

      return {
        filter: {
          period,
          startDate: start_date || null,
          endDate: end_date || null,
        },
        users: {
          total: userCounts.total_users || 0,
          hosts: userCounts.total_hosts || 0,
          banned: userCounts.banned_users || 0,
          newUsers: newUsersCount?.new_users || 0,
          totalCoins: Number(userCounts.total_user_coins) || 0,
          totalDiamonds: Number(userCounts.total_user_diamonds) || 0,
          hostCoins: Number(userCounts.host_coins) || 0,
          regularUserCoins: Number(userCounts.regular_user_coins) || 0,
        },
        streams: {
          active: streamCounts.active_streams || 0,
          total: streamCounts.total_streams || 0,
          liveViewers: streamCounts.current_viewers || 0,
        },
        financials: {
          coinsSold: Number(financeCounts.total_coins_sold) || 0,
          adminCommission: Number(financeCounts.total_admin_commission) || 0,
          giftCoinsSpent: Number(financeCounts.total_gift_coins_spent) || 0,
          diamondsRewarded: Number(financeCounts.total_diamonds_rewarded) || 0,
          coinSalesCount: financeCounts.total_coin_sales_count || 0,
          commissionCount: financeCounts.total_commission_count || 0,
          allTimeCoinsSold: Number(allTimeFinance.all_time_coins_sold) || 0,
          allTimeAdminCommission: Number(allTimeFinance.all_time_admin_commission) || 0,
          totalUserCoins: Number(userCounts.total_user_coins) || 0,
          isDiamondMode,
          pendingWithdrawalCount: withdrawalStats.pending_count || 0,
          pendingWithdrawalCoins: Number(withdrawalStats.pending_coins || 0),
          pendingWithdrawalDiamonds: Number(withdrawalStats.pending_diamonds || 0),
          pendingWithdrawalUsd: parseFloat(withdrawalStats.pending_usd || 0).toFixed(2),
        },
        recentGifts,
        activeStreams: activeStreamsList,
      };
    });

    return res.json({
      success: true,
      stats: statsData,
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats.', error: err.message });
  }
}

export async function getUsers(req, res) {
  try {
    const { search, userId, role, is_banned, page = 1, limit = 20 } = req.query;
    const cacheKey = `admin:users:${search || ''}:${userId || ''}:${role || ''}:${is_banned || ''}:${page}:${limit}`;

    const data = await cache.getOrSet(cacheKey, 30, async () => {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      let conditions = [];
      let params = [];

      if (userId) {
        conditions.push('(u.id = ? OR FIND_IN_SET(?, REPLACE(IFNULL(u.previous_ids, ""), " ", "")) > 0)');
        params.push(parseInt(userId, 10), parseInt(userId, 10));
      } else if (search) {
        const cleanSearch = String(search).trim().replace(/^#/, '');
        const isNumeric = !isNaN(cleanSearch) && cleanSearch !== '';
        if (isNumeric) {
          // Exact unique User ID match OR historical previous ID match
          const num = parseInt(cleanSearch, 10);
          conditions.push('(u.id = ? OR FIND_IN_SET(?, REPLACE(IFNULL(u.previous_ids, ""), " ", "")) > 0)');
          params.push(num, num);
        } else {
          conditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.previous_ids LIKE ?)');
          const s = `%${cleanSearch}%`;
          params.push(s, s, s);
        }
      }

      // Always completely hide superadmin from all lists and counts
      conditions.push("u.role != 'superadmin'");

      if (role && role !== 'all') {
        conditions.push('u.role = ?');
        params.push(role);
      }

      if (is_banned !== undefined && is_banned !== 'all') {
        conditions.push('u.is_banned = ?');
        params.push(is_banned === 'true' || is_banned === '1' ? 1 : 0);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const users = await query(
        `SELECT u.id, u.email, u.full_name, u.avatar_url, u.bio, u.role, u.host_type, u.agency_id,
                a.name as agency_name, a.agency_code,
                u.coins, u.diamonds, u.level, u.star, u.total_coins_spent, u.vip_package, u.is_banned,
                u.previous_ids, u.created_at, u.updated_at
         FROM users u
         LEFT JOIN agencies a ON u.agency_id = a.id
         ${whereSql}
         ORDER BY u.id DESC
         LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`,
        params
      );

      const [totalRows] = await query(`SELECT COUNT(*) as count FROM users u ${whereSql}`, params);

      const [summaryStats] = await query(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN role = 'host' THEN 1 ELSE 0 END) as total_hosts,
          SUM(CASE WHEN role = 'agency' THEN 1 ELSE 0 END) as total_agencies,
          SUM(CASE WHEN role = 'moderator' THEN 1 ELSE 0 END) as total_moderators,
          SUM(CASE WHEN role = 'reseller' THEN 1 ELSE 0 END) as total_resellers,
          SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as total_regular,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as total_admins,
          SUM(CASE WHEN is_banned = TRUE THEN 1 ELSE 0 END) as total_banned
        FROM users
        WHERE role != 'superadmin'
      `);

      return {
        users,
        summary: summaryStats || { total_users: 0, total_hosts: 0, total_agencies: 0, total_moderators: 0, total_resellers: 0, total_regular: 0, total_admins: 0, total_banned: 0 },
        total: totalRows.count,
      };
    });

    return res.json({
      success: true,
      users: data.users,
      summary: data.summary,
      pagination: {
        total: data.total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
}

/**
 * Invalidate all Redis caches for a user and instantly notify mobile app via Socket.IO
 */
export async function invalidateUserCacheAndNotify(io, userId, extraData = {}) {
  const cleanId = Number(userId);
  if (!cleanId || isNaN(cleanId)) return;

  // 1. Instant Cache Invalidation across all Redis keys
  await Promise.allSettled([
    cache.del(`mobile:user:profile:${cleanId}`),
    cache.del(`mobile:user:public:${cleanId}`),
    cache.del(`user:${cleanId}`),
    cache.del(`admin:user:${cleanId}`),
    cache.del(`user:balance:${cleanId}`),
    cache.del(`mobile:live:my_active:${cleanId}`),
    cache.del(`moderator:user_details:${cleanId}`),
    cache.delByPattern(`host:*:${cleanId}*`),
    cache.delByPattern('host:*'),
    cache.delByPattern('moderators:*'),
    cache.delByPattern('agencies:*'),
    cache.delByPattern('resellers:*'),
    cache.delByPattern('admin:users*'),
    cache.delByPattern('admin:dashboard*'),
    cache.delByPattern('moderator:*'),
  ]);

  // 2. Real-time Socket Event to user's personal channel
  if (io) {
    const payload = {
      userId: cleanId,
      user_id: cleanId,
      timestamp: Date.now(),
      ...extraData,
    };
    io.to(`user_${cleanId}`).emit('user_profile_updated', payload);
    io.to(`user_${cleanId}`).emit('user_role_updated', payload);
    io.to(`user:${cleanId}`).emit('user_profile_updated', payload);
    io.to(`user:${cleanId}`).emit('user_role_updated', payload);
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { role, is_banned, full_name, bio, agency_id, host_type, level, vip_package, avatar_url } = req.body;

    const updates = [];
    const params = [];

    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (host_type !== undefined) {
      updates.push('host_type = ?');
      params.push(host_type);
    }
    if (is_banned !== undefined) {
      updates.push('is_banned = ?');
      params.push(Boolean(is_banned));
    }
    if (full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(full_name);
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatar_url);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }
    if (agency_id !== undefined) {
      updates.push('agency_id = ?');
      params.push(agency_id ? parseInt(agency_id, 10) : null);
      updates.push('agency_joined_at = NOW()');
    }
    if (level !== undefined) {
      updates.push('level = ?');
      params.push(parseInt(level, 10));
    }
    if (vip_package !== undefined) {
      updates.push('vip_package = ?');
      params.push(vip_package);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update.' });
    }

    params.push(id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // Database write succeeded -> Invalidate Redis cache immediately & notify via socket
    await invalidateUserCacheAndNotify(req.io, id, {
      role,
      host_type,
      agency_id,
      is_banned: Boolean(is_banned),
    });

    const updated = await query('SELECT id, full_name, email, avatar_url, bio, role, host_type, agency_id, is_banned, coins, diamonds, level, vip_package FROM users WHERE id = ?', [id]);
    return res.json({
      success: true,
      message: 'User updated successfully.',
      user: updated[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
}

export async function adjustBalance(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { coinDelta = 0, diamondDelta = 0, reason = 'Admin balance adjustment', actionPassword } = req.body;

    const cDelta = parseInt(coinDelta, 10) || 0;
    const dDelta = parseInt(diamondDelta, 10) || 0;

    if (cDelta === 0 && dDelta === 0) {
      return res.status(400).json({ success: false, message: 'Specify non-zero coin or diamond deduction.' });
    }

    // 1. Policy check: Neither coins nor diamonds can be added from user page - ONLY deductions
    if (cDelta > 0 || dDelta > 0) {
      return res.status(400).json({
        success: false,
        message: 'Only balance deductions (coin deduction or diamond deduction) are permitted here. Adding coins must be done via Coin Recharge, and diamonds cannot be manually added.',
      });
    }

    // 2. Verify security action password
    const [settingsRows] = await connection.execute(
      "SELECT key_value FROM system_settings WHERE key_name = 'action_security_password'"
    );
    const configuredPassword = settingsRows[0]?.key_value || 'admin123';

    if (!actionPassword || String(actionPassword).trim() !== String(configuredPassword).trim()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid security action password. You can view or update this in Platform Settings.',
      });
    }

    await connection.beginTransaction();

    await connection.execute(
      'UPDATE users SET coins = GREATEST(0, coins + ?), diamonds = GREATEST(0, diamonds + ?) WHERE id = ?',
      [cDelta, dDelta, id]
    );

    if (cDelta !== 0) {
      await connection.execute(
        `INSERT INTO transactions (user_id, type, amount, description, status)
         VALUES (?, 'admin_adjustment', ?, ?, 'completed')`,
        [id, Math.abs(cDelta), `[Admin] ${reason}: ${cDelta > 0 ? '+' : ''}${cDelta} coins`]
      );
    }

    await connection.commit();

    // Database write succeeded -> Invalidate Redis cache
    await cache.del(`user:${id}`);
    await cache.del(`user:balance:${id}`);
    await cache.del(`user:transactions:${id}`);
    await cache.delByPattern(`user:transactions:${id}*`);
    await cache.del(`admin:user:${id}`);
    await cache.delByPattern('admin:users*');
    await cache.delByPattern('admin:dashboard*');
    await cache.delByPattern('admin:recharge*');

    const [user] = await connection.execute('SELECT id, full_name, coins, diamonds FROM users WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Balance updated successfully.',
      user: user[0],
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Failed to adjust balance.', error: err.message });
  } finally {
    connection.release();
  }
}

export async function rechargeCoins(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const { userId, coinAmount, actionPassword, reason = 'Admin Coin Recharge' } = req.body;

    const amount = parseInt(coinAmount, 10) || 0;
    if (!userId || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid User ID and positive coin amount are required.' });
    }

    // 1. Verify User exists
    const [users] = await connection.execute('SELECT id, full_name, coins, diamonds, role FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: `User with ID #${userId} not found.` });
    }
    const targetUser = users[0];

    // 2. Verify security action password
    const [settingsRows] = await connection.execute(
      "SELECT key_value FROM system_settings WHERE key_name = 'action_security_password'"
    );
    const configuredPassword = settingsRows[0]?.key_value || 'admin123';

    if (!actionPassword || String(actionPassword).trim() !== String(configuredPassword).trim()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid security action password. You can view or update this in Platform Settings.',
      });
    }

    await connection.beginTransaction();

    await connection.execute(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [amount, userId]
    );

    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'coin_purchase', ?, ?, 'completed')`,
      [userId, amount, `[Recharge] ${reason}: +${amount} coins`]
    );

    await connection.commit();

    // Database write succeeded -> Invalidate Redis cache
    await cache.del(`user:${userId}`);
    await cache.del(`user:balance:${userId}`);
    await cache.del(`user:transactions:${userId}`);
    await cache.delByPattern(`user:transactions:${userId}*`);
    await cache.del(`admin:user:${userId}`);
    await cache.delByPattern('admin:users*');
    await cache.delByPattern('admin:dashboard*');
    await cache.delByPattern('admin:recharge*');

    const [updatedUsers] = await connection.execute('SELECT id, full_name, coins, diamonds FROM users WHERE id = ?', [userId]);

    return res.json({
      success: true,
      message: `Successfully recharged ${amount.toLocaleString()} coins for User ID #${userId} (${targetUser.full_name || 'User'})!`,
      user: updatedUsers[0],
    });
  } catch (err) {
    await connection.rollback();
    console.error('rechargeCoins error:', err);
    return res.status(500).json({ success: false, message: 'Failed to recharge coins.', error: err.message });
  } finally {
    connection.release();
  }
}

export async function getRechargeHistory(req, res) {
  try {
    const { userId, search, page = 1, limit = 15 } = req.query;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const offset = (parsedPage - 1) * parsedLimit;

    // Filter out literal "undefined", "null", or empty search queries
    const rawSearch = typeof search === 'string' ? search.trim() : '';
    const cleanSearch = (rawSearch && rawSearch !== 'undefined' && rawSearch !== 'null') ? rawSearch : '';
    const cleanUserId = (userId && userId !== 'undefined' && userId !== 'null') ? parseInt(userId, 10) : null;

    const cacheKey = `admin:recharge:history:${cleanUserId || 'all'}:${cleanSearch || 'all'}:${parsedPage}:${parsedLimit}`;

    const cachedData = await cache.getOrSet(cacheKey, 30, async () => {
      const conditions = ["(t.type IN ('coin_purchase', 'admin_adjustment', 'reseller_transfer') OR t.description LIKE '%Recharge%' OR t.description LIKE '%[Admin]%+%')"];
      const params = [];

      if (cleanUserId) {
        conditions.push('t.user_id = ?');
        params.push(cleanUserId);
      }

      if (cleanSearch) {
        const clean = cleanSearch.replace(/^#/, '');
        const isNum = !isNaN(clean) && clean !== '';
        if (isNum) {
          conditions.push('(t.id = ? OR t.user_id = ?)');
          const n = parseInt(clean, 10);
          params.push(n, n);
        } else {
          conditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR t.description LIKE ?)');
          const s = `%${clean}%`;
          params.push(s, s, s);
        }
      }

      const whereSql = `WHERE ${conditions.join(' AND ')}`;

      const recharges = await query(
        `SELECT 
          t.id,
          t.user_id,
          t.type,
          t.amount,
          t.description,
          t.status,
          t.created_at,
          COALESCE(u.full_name, CONCAT('User #', t.user_id)) as user_name,
          u.email as user_email,
          u.avatar_url as user_avatar,
          COALESCE(u.coins, 0) as current_coins
         FROM transactions t
         LEFT JOIN users u ON t.user_id = u.id
         ${whereSql}
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT ${parsedLimit} OFFSET ${offset}`,
        params
      );

      const [totalRows] = await query(
        `SELECT COUNT(*) as count 
         FROM transactions t
         LEFT JOIN users u ON t.user_id = u.id
         ${whereSql}`,
        params
      );

      const [stats] = await query(`
        SELECT 
          COUNT(*) as total_recharges,
          COALESCE(SUM(amount), 0) as total_recharged_coins,
          COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN amount ELSE 0 END), 0) as month_recharged_coins,
          COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN amount ELSE 0 END), 0) as week_recharged_coins
        FROM transactions
        WHERE (type IN ('coin_purchase', 'admin_adjustment', 'reseller_transfer') OR description LIKE '%Recharge%' OR description LIKE '%[Admin]%+%')
      `);

      return {
        history: recharges || [],
        summary: stats || { total_recharges: 0, total_recharged_coins: 0, month_recharged_coins: 0, week_recharged_coins: 0 },
        total: totalRows ? totalRows.count : 0,
      };
    });

    return res.json({
      success: true,
      history: cachedData.history,
      summary: cachedData.summary,
      pagination: {
        total: cachedData.total,
        page: parsedPage,
        limit: parsedLimit,
      },
    });
  } catch (err) {
    console.error('getRechargeHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch recharge history.', error: err.message });
  }
}

export async function getStreams(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let whereSql = '';
    let params = [];
    if (status && status !== 'all') {
      whereSql = 'WHERE r.status = ?';
      params.push(status);
    }

    const streams = await query(
      `SELECT r.*, u.full_name as host_name, u.email as host_email, u.avatar_url as host_avatar
       FROM live_rooms r
       JOIN users u ON r.host_id = u.id
       ${whereSql}
       ORDER BY r.status = 'live' DESC, r.started_at DESC
       LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`,
      params
    );

    const [totalRows] = await query(`SELECT COUNT(*) as count FROM live_rooms r ${whereSql}`, params);

    return res.json({
      success: true,
      streams,
      pagination: {
        total: totalRows.count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch streams.' });
  }
}

export async function terminateStream(req, res) {
  try {
    const { roomId } = req.params;
    const { reason = 'Moderation violation' } = req.body;

    await query("UPDATE live_rooms SET status = 'blocked', ended_at = CURRENT_TIMESTAMP WHERE room_id = ?", [roomId]);

    // Instant Redis cache invalidation for terminated stream
    await cache.del(`room:${roomId}`, `mobile:room_details:${roomId}`);
    await cache.delByPattern('mobile:rooms:*');
    await cache.delByPattern('live:*');

    const io = req.io || req.app?.get('io');
    if (io) {
      io.to(`room_${roomId}`).emit('stream:terminated', { roomId, reason });
      io.to(`room_${roomId}`).emit('room:ended', { roomId, reason });
    }

    return res.json({
      success: true,
      message: `Stream ${roomId} forcefully terminated: ${reason}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to terminate stream.' });
  }
}

export async function getGiftsAdmin(req, res) {
  try {
    const gifts = await cache.getOrSet('gifts:admin', 120, async () => {
      const rows = await query('SELECT * FROM gifts ORDER BY coin_cost ASC');
      return rows || [];
    });
    return res.json({ success: true, gifts });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch gifts.' });
  }
}

export async function createGift(req, res) {
  try {
    const {
      name,
      icon_url,
      animation_type = 'svga',
      animation_url,
      sound_url,
      coin_cost,
      diamond_reward,
      category = 'Popular',
    } = req.body;

    if (!coin_cost || isNaN(parseInt(coin_cost, 10)) || parseInt(coin_cost, 10) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid coin cost is required.' });
    }

    // Name is optional per requirements
    const trimmedName = name && typeof name === 'string' ? name.trim() : '';
    const finalName = trimmedName || (animation_type === 'gif' ? 'GIF Gift' : 'SVGA Gift');

    // Either icon_url or animation_url must be present
    const finalIconUrl = icon_url || animation_url || '';
    const finalAnimationUrl = animation_url || (animation_type === 'gif' ? finalIconUrl : null);
    const finalSoundUrl = sound_url || null;

    if (!finalIconUrl && !finalAnimationUrl) {
      return res.status(400).json({
        success: false,
        message: 'Preview image/GIF or animation file is required.',
      });
    }

    const parsedCoinCost = parseInt(coin_cost, 10);

    // Check system diamond conversion setting
    const diamondSettingRows = await query("SELECT key_value FROM system_settings WHERE key_name = 'is_convert_to_diamond' LIMIT 1");
    const isDiamondMode = diamondSettingRows && diamondSettingRows.length > 0
      ? (diamondSettingRows[0].key_value === 'true' || diamondSettingRows[0].key_value === '1')
      : false;

    let diamondReward = 0;
    if (diamond_reward !== undefined && diamond_reward !== null && !isNaN(parseInt(diamond_reward, 10))) {
      diamondReward = parseInt(diamond_reward, 10);
    } else if (isDiamondMode) {
      diamondReward = Math.floor(parsedCoinCost / 2);
    } else {
      diamondReward = 0; // Diamond conversion is off -> no diamond reward needed
    }

    const result = await query(
      `INSERT INTO gifts (name, icon_url, animation_type, animation_url, sound_url, coin_cost, diamond_reward, category, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [finalName, finalIconUrl, animation_type, finalAnimationUrl, finalSoundUrl, parsedCoinCost, diamondReward, category]
    );

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('gifts:*');

    const newGift = await query('SELECT * FROM gifts WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, message: 'Gift created successfully.', gift: newGift[0] });
  } catch (err) {
    console.error('createGift error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create gift.', error: err.message });
  }
}

export async function updateGift(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      icon_url,
      animation_type,
      animation_url,
      sound_url,
      coin_cost,
      diamond_reward,
      category,
      is_active,
    } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim() : '';
      updates.push('name = ?');
      params.push(trimmed || 'Gift');
    }
    if (icon_url !== undefined) { updates.push('icon_url = ?'); params.push(icon_url); }
    if (animation_type !== undefined) { updates.push('animation_type = ?'); params.push(animation_type); }
    if (animation_url !== undefined) { updates.push('animation_url = ?'); params.push(animation_url); }
    if (sound_url !== undefined) { updates.push('sound_url = ?'); params.push(sound_url); }
    if (coin_cost !== undefined) { updates.push('coin_cost = ?'); params.push(parseInt(coin_cost, 10)); }
    if (diamond_reward !== undefined) { updates.push('diamond_reward = ?'); params.push(parseInt(diamond_reward, 10)); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(Boolean(is_active)); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided.' });
    }

    params.push(id);
    await query(`UPDATE gifts SET ${updates.join(', ')} WHERE id = ?`, params);

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('gifts:*');

    const gift = await query('SELECT * FROM gifts WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Gift updated successfully.', gift: gift[0] });
  } catch (err) {
    console.error('updateGift error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update gift.', error: err.message });
  }
}

export async function deleteGift(req, res) {
  try {
    const { id } = req.params;
    await query('DELETE FROM gifts WHERE id = ?', [id]);

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('gifts:*');

    return res.json({ success: true, message: 'Gift deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete gift.' });
  }
}

/**
 * Admin: Get Top Gifting Contributors
 * GET /api/admin/gifts/top-contributors
 * 
 * Supports filter query ?period=month (default) | 30days | all | today
 * Groups by sender_id, calculates total coins gifted, gifts sent, recipients count.
 * Highest gifters ranked first.
 * Cached in Redis (admin:gifts:top_contributors:${period}).
 */
export async function getTopContributorsAdmin(req, res) {
  try {
    const { period = 'month', page = 1, limit = 50 } = req.query;
    const cacheKey = `admin:gifts:top_contributors:${period}:${page}:${limit}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      let dateCondition = '';
      if (period === 'month') {
        dateCondition = 'WHERE MONTH(gt.created_at) = MONTH(CURRENT_DATE()) AND YEAR(gt.created_at) = YEAR(CURRENT_DATE())';
      } else if (period === '30days') {
        dateCondition = 'WHERE gt.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      } else if (period === 'today') {
        dateCondition = 'WHERE DATE(gt.created_at) = CURRENT_DATE()';
      }

      const rows = await query(`
        SELECT 
          gt.sender_id as user_id,
          u.full_name,
          u.avatar_url,
          u.email,
          u.mobile_number,
          u.level,
          u.role,
          pc.name as vip_category,
          pc.badge_icon as vip_badge,
          pc.color_code as vip_color,
          COALESCE(SUM(gt.coin_amount), 0) as total_coins_gifted,
          COUNT(gt.id) as total_gifts_sent,
          COUNT(DISTINCT gt.receiver_id) as total_recipients,
          MAX(gt.created_at) as last_gifted_at
        FROM gift_transactions gt
        JOIN users u ON u.id = gt.sender_id
        LEFT JOIN user_package_subscriptions ups 
          ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
        LEFT JOIN package_categories pc 
          ON pc.id = ups.category_id AND pc.is_active = 1
        ${dateCondition}
        GROUP BY gt.sender_id, u.full_name, u.avatar_url, u.email, u.mobile_number, u.level, u.role, pc.name, pc.badge_icon, pc.color_code
        ORDER BY total_coins_gifted DESC
        LIMIT ? OFFSET ?
      `, [parseInt(limit, 10), (parseInt(page, 10) - 1) * parseInt(limit, 10)]);

      // Total summary stats for this period
      const summaryRows = await query(`
        SELECT 
          COALESCE(SUM(coin_amount), 0) as total_coins_spent,
          COUNT(id) as total_transactions,
          COUNT(DISTINCT sender_id) as total_active_gifters
        FROM gift_transactions gt
        ${dateCondition}
      `);

      const summary = summaryRows[0] || { total_coins_spent: 0, total_transactions: 0, total_active_gifters: 0 };

      const contributors = (rows || []).map((row, idx) => ({
        rank: (parseInt(page, 10) - 1) * parseInt(limit, 10) + idx + 1,
        user_id: row.user_id,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        email: row.email,
        mobile_number: row.mobile_number,
        level: row.level || 1,
        role: row.role,
        vip_category: row.vip_category || 'Standard',
        vip_badge: row.vip_badge || '',
        vip_color: row.vip_color || '#7c3aed',
        total_coins_gifted: parseInt(row.total_coins_gifted, 10),
        total_gifts_sent: parseInt(row.total_gifts_sent, 10),
        total_recipients: parseInt(row.total_recipients, 10),
        last_gifted_at: row.last_gifted_at,
      }));

      return {
        period,
        summary: {
          total_coins_spent: parseInt(summary.total_coins_spent, 10),
          total_transactions: parseInt(summary.total_transactions, 10),
          total_active_gifters: parseInt(summary.total_active_gifters, 10),
        },
        contributors,
      };
    });

    return res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('getTopContributorsAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch top contributors.', error: err.message });
  }
}

/**
 * Admin: Clear / Reset Gift Transactions History
 * DELETE /api/admin/gifts/history
 * POST /api/admin/gifts/clear-history
 * 
 * Clears gift_transactions table in MySQL (SSOT), and immediately flushes all Redis caches.
 * As requested: "onno admin panel theke jodi data clear kore dey taile ei api er data o remove hoye jabe."
 */
export async function clearGiftHistoryAdmin(req, res) {
  try {
    const { senderId, receiverId, period } = req.body || {};

    let queryStr = 'DELETE FROM gift_transactions';
    let params = [];
    let whereClauses = [];

    if (senderId) {
      whereClauses.push('sender_id = ?');
      params.push(senderId);
    }
    if (receiverId) {
      whereClauses.push('receiver_id = ?');
      params.push(receiverId);
    }
    if (period === 'month') {
      whereClauses.push('MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())');
    }

    if (whereClauses.length > 0) {
      queryStr += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const result = await query(queryStr, params);
    const affected = result.affectedRows || 0;

    // Instant Redis Invalidation across ALL gift related keys
    await Promise.allSettled([
      cache.delByPattern('admin:gifts:top_contributors*'),
      cache.delByPattern('leaderboard:gifters:*'),
      cache.delByPattern('agency:top:*'),
      cache.delByPattern('user:gift_contributions:*'),
      cache.delByPattern('gifts:*'),
      cache.delByPattern('admin:dashboard*'),
    ]);

    return res.json({
      success: true,
      message: `Successfully cleared ${affected} gift transaction records. All cached rankings and user contributions have been reset.`,
      cleared_count: affected,
    });
  } catch (err) {
    console.error('clearGiftHistoryAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to clear gift history.', error: err.message });
  }
}

export async function getGlobalGiftBannerConfigAdmin(req, res) {
  try {
    const config = await getGlobalGiftBannerConfig();
    return res.json({ success: true, config });
  } catch (err) {
    console.error('getGlobalGiftBannerConfigAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch global gift banner configuration.', error: err.message });
  }
}

export async function updateGlobalGiftBannerConfigAdmin(req, res) {
  try {
    const { enabled, image_url, min_coins, duration_seconds } = req.body;

    const queries = [];
    if (enabled !== undefined) {
      queries.push(
        query(
          `INSERT INTO system_settings (key_name, key_value, description)
           VALUES ('global_gift_banner_enabled', ?, 'Master switch to enable real-time global gift announcement banners across all screens')
           ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
          [enabled ? 'true' : 'false']
        )
      );
    }

    if (image_url !== undefined) {
      queries.push(
        query(
          `INSERT INTO system_settings (key_name, key_value, description)
           VALUES ('global_gift_banner_image', ?, 'Background image asset displayed on global gift broadcast banners')
           ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
          [String(image_url).trim()]
        )
      );
    }

    if (min_coins !== undefined) {
      const parsedCoins = Math.max(0, parseInt(min_coins, 10) || 0);
      queries.push(
        query(
          `INSERT INTO system_settings (key_name, key_value, description)
           VALUES ('global_gift_banner_min_coins', ?, 'Minimum total coin value required for a gift to trigger the global announcement banner')
           ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
          [String(parsedCoins)]
        )
      );
    }

    if (duration_seconds !== undefined) {
      const parsedDuration = Math.max(2, Math.min(15, parseInt(duration_seconds, 10) || 4));
      queries.push(
        query(
          `INSERT INTO system_settings (key_name, key_value, description)
           VALUES ('global_gift_banner_duration', ?, 'Duration in seconds for displaying each global gift announcement banner in the queue')
           ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
          [String(parsedDuration)]
        )
      );
    }

    await Promise.all(queries);

    // Instant Redis cache invalidation
    await Promise.allSettled([
      cache.del('config:global_gift_banner'),
      cache.del('settings:all'),
    ]);

    const updatedConfig = await getGlobalGiftBannerConfig();

    const io = req.io || req.app.get('io');
    if (io) {
      io.emit('global_gift_banner_config_updated', updatedConfig);
    }

    return res.json({
      success: true,
      message: 'Global gift banner configuration updated successfully.',
      config: updatedConfig,
    });
  } catch (err) {
    console.error('updateGlobalGiftBannerConfigAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update global gift banner configuration.', error: err.message });
  }
}

export async function sendTestGlobalGiftBannerAdmin(req, res) {
  try {
    const bannerConfig = await getGlobalGiftBannerConfig();
    const io = req.io || req.app.get('io');
    if (!io) {
      return res.status(500).json({ success: false, message: 'Socket.IO server instance not available.' });
    }

    const senderName = req.body?.sender_name || req.user?.full_name || 'Admin';
    const receiverName = req.body?.receiver_name || 'VIP Star Host';
    const coins = Number(req.body?.coins) || 5000;

    const testPayload = {
      id: `test_banner_${Date.now()}`,
      sender: {
        id: req.user?.id || 1,
        name: senderName,
        avatar_url: req.user?.avatar_url || '',
        level: 99,
      },
      receiver: {
        id: 2,
        name: receiverName,
        avatar_url: '',
      },
      receivers_count: 1,
      gift: {
        id: 999,
        name: 'Super Sports Car',
        icon_url: '/uploads/gifts/sports_car_thumb_1791794086432-13704975.png',
        count: 1,
        coin_cost: coins,
      },
      coins: coins,
      total_coins: coins,
      room_id: 'TEST_ROOM',
      banner_image_url: bannerConfig.image_url,
      duration_seconds: bannerConfig.duration_seconds || 4,
      timestamp: new Date().toISOString(),
    };

    io.emit('global_gift_banner', testPayload);

    return res.json({
      success: true,
      message: 'Test global gift banner announcement sent to all connected clients.',
      payload: testPayload,
    });
  } catch (err) {
    console.error('sendTestGlobalGiftBannerAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to emit test banner.', error: err.message });
  }
}

export async function getWithdrawals(req, res) {
  try {
    const { status, role, page = 1, limit = 20 } = req.query;

    const settingRows = await query(
      "SELECT key_value FROM system_settings WHERE key_name = 'is_convert_to_diamond' LIMIT 1"
    );
    const isDiamondMode = settingRows.length > 0
      ? (settingRows[0].key_value === 'true' || settingRows[0].key_value === '1')
      : false;

    const cacheKey = `admin:withdrawals:${status || 'all'}:${role || 'all'}:${page}:${limit}:${isDiamondMode ? 'diamond' : 'coin'}`;

    const data = await cache.getOrSet(cacheKey, 30, async () => {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const conditions = [];
      const params = [];

      if (status && status !== 'all') {
        conditions.push('w.status = ?');
        params.push(status);
      }

      if (role && role !== 'all') {
        if (role === 'video_host' || role === 'video') {
          conditions.push("(w.host_type = 'video' OR (u.role = 'host' AND u.host_type = 'video'))");
        } else if (role === 'audio_host' || role === 'audio') {
          conditions.push("(w.host_type = 'audio' OR (u.role = 'host' AND u.host_type = 'audio'))");
        } else if (role === 'user') {
          conditions.push("(w.user_role = 'user' OR w.host_type = 'user' OR (u.role = 'user' AND (w.host_type IS NULL OR w.host_type = 'none' OR w.host_type = 'user')))");
        } else if (role === 'agency') {
          conditions.push("(w.user_role = 'agency' OR w.host_type = 'agency' OR u.role = 'agency')");
        } else if (role === 'reseller') {
          conditions.push("(w.user_role = 'reseller' OR w.host_type = 'reseller' OR u.role = 'reseller')");
        } else if (role === 'moderator') {
          conditions.push("(w.user_role = 'moderator' OR w.host_type = 'moderator' OR u.role = 'moderator')");
        }
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const rows = await query(
        `SELECT w.*, u.full_name as host_name, u.email as host_email, u.avatar_url as host_avatar, 
                u.diamonds as current_diamonds, u.coins as current_coins, u.role as user_actual_role, u.host_type as user_actual_host_type
         FROM withdrawals w
         JOIN users u ON w.host_id = u.id
         ${whereSql}
         ORDER BY w.status = 'pending' DESC, w.created_at DESC
         LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`,
        params
      );

      const formatted = rows.map((w) => {
        const diamondAmount = parseInt(w.diamond_amount || 0, 10);
        const coinAmount = parseInt(w.coin_amount || 0, 10);
        const isDiamondRecord = diamondAmount > 0;
        const resolvedAmount = isDiamondRecord ? diamondAmount : coinAmount;
        const resolvedCurrency = isDiamondRecord ? 'diamonds' : 'coins';
        const resolvedSymbol = isDiamondRecord ? '💎' : '🪙';
        const resolvedLabel = isDiamondRecord ? 'Diamond' : 'Coin';

        // Resolve applicant account role
        const rawRole = w.user_role || w.user_actual_role || 'user';
        let resolvedRoleKey = 'user';
        let resolvedRoleLabel = 'Normal User';
        let resolvedRoleBadge = { label: 'Normal User', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' };

        if (rawRole === 'host' || w.host_type === 'video' || w.host_type === 'audio') {
          const isAudio = w.host_type === 'audio' || w.user_actual_host_type === 'audio';
          resolvedRoleKey = isAudio ? 'audio' : 'video';
          resolvedRoleLabel = isAudio ? 'Audio Host' : 'Video Host';
          resolvedRoleBadge = isAudio 
            ? { label: 'Audio Host', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' }
            : { label: 'Video Host', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
        } else if (rawRole === 'agency') {
          resolvedRoleKey = 'agency';
          resolvedRoleLabel = 'Agency Partner';
          resolvedRoleBadge = { label: 'Agency', color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)' };
        } else if (rawRole === 'reseller') {
          resolvedRoleKey = 'reseller';
          resolvedRoleLabel = 'Coin Reseller';
          resolvedRoleBadge = { label: 'Reseller', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
        } else if (rawRole === 'moderator') {
          resolvedRoleKey = 'moderator';
          resolvedRoleLabel = 'Platform Moderator';
          resolvedRoleBadge = { label: 'Moderator', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' };
        }

        return {
          ...w,
          diamond_amount: diamondAmount,
          coin_amount: coinAmount,
          amount: resolvedAmount,
          currency: resolvedCurrency,
          currency_symbol: resolvedSymbol,
          currency_label: resolvedLabel,
          display_text: `${resolvedAmount.toLocaleString()} ${resolvedLabel}s`,
          is_diamond_record: isDiamondRecord,
          is_coin_record: !isDiamondRecord,
          record_mode: isDiamondRecord ? 'diamond' : 'coin',
          user_role_key: resolvedRoleKey,
          user_role_label: resolvedRoleLabel,
          user_role_badge: resolvedRoleBadge,
        };
      });

      const [totalRows] = await query(
        `SELECT COUNT(*) as count 
         FROM withdrawals w 
         JOIN users u ON w.host_id = u.id 
         ${whereSql}`, 
        params
      );

      return {
        withdrawals: formatted,
        total: totalRows.count,
      };
    });

    return res.json({
      success: true,
      is_convert_to_diamond: isDiamondMode,
      active_currency: isDiamondMode ? 'diamonds' : 'coins',
      active_currency_symbol: isDiamondMode ? '💎' : '🪙',
      withdrawals: data.withdrawals,
      pagination: {
        total: data.total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch withdrawals.' });
  }
}

export async function processWithdrawal(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body; // status: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });
    }

    const [rows] = await connection.execute('SELECT * FROM withdrawals WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found.' });
    }

    const item = rows[0];
    if (item.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Withdrawal has already been ${item.status}.` });
    }

    await connection.beginTransaction();

    await connection.execute(
      'UPDATE withdrawals SET status = ?, admin_notes = ? WHERE id = ?',
      [status, adminNotes || `Processed by admin: ${status}`, id]
    );

    // If rejected, refund the deducted coins or diamonds back to host
    if (status === 'rejected') {
      const isCoinRefund = (item.coin_amount && item.coin_amount > 0);
      if (isCoinRefund) {
        await connection.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [item.coin_amount, item.host_id]);
        await connection.execute(
          `INSERT INTO transactions (user_id, type, amount, description, status)
           VALUES (?, 'refund', ?, ?, 'completed')`,
          [item.host_id, item.coin_amount, `Refunded ${item.coin_amount} coins due to rejected withdrawal #${id}`]
        );
      } else {
        await connection.execute('UPDATE users SET diamonds = diamonds + ? WHERE id = ?', [item.diamond_amount, item.host_id]);
        await connection.execute(
          `INSERT INTO transactions (user_id, type, amount, description, status)
           VALUES (?, 'gift_received', ?, ?, 'refunded')`,
          [item.host_id, item.diamond_amount, `Refunded ${item.diamond_amount} diamonds due to rejected withdrawal #${id}`]
        );
      }
    }

    await connection.commit();

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('admin:withdrawals*');
    await cache.delByPattern('withdrawal:*');
    await cache.delByPattern('wallet:*');
    await cache.del(`user:${item.host_id}`);
    await cache.del(`user:balance:${item.host_id}`);
    await cache.delByPattern('admin:dashboard*');

    return res.json({
      success: true,
      message: `Withdrawal #${id} has been ${status}.`,
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Failed to process withdrawal.' });
  } finally {
    connection.release();
  }
}

export async function getSettings(req, res) {
  try {
    const settings = await cache.getOrSet('settings:all', 300, async () => {
      const rows = await query('SELECT * FROM system_settings');
      return rows || [];
    });
    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
}

export async function updateSetting(req, res) {
  try {
    const { key } = req.params;
    const { value, key_value, description } = req.body;
    const finalValue = value !== undefined ? value : (key_value !== undefined ? key_value : '');

    await query(
      `INSERT INTO system_settings (key_name, key_value, description)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE key_value = VALUES(key_value), description = COALESCE(VALUES(description), description)`,
      [key, String(finalValue), description || '']
    );

    // Database write succeeded -> Invalidate Redis cache & immediately pre-warm with fresh DB state
    await invalidateWalletWithdrawalCache(req.io);
    await cache.del('settings:all');
    await cache.del(`setting:${key}`);
    await cache.del('config:mobile:app');
    await cache.del('config:livekit');
    await cache.delByPattern('admin:dashboard*');
    await cache.delByPattern('mobile:user:profile*');
    await cache.del('system:maintenance:status');

    // Broadcast real-time branding changes
    if (req.io && (key.includes('platform_') || key.includes('app_name') || key.includes('logo'))) {
      req.io.emit('branding_updated', {
        key,
        value: String(finalValue),
        updated_at: new Date().toISOString(),
      });
    }

    // Broadcast real-time screen guard change to connected mobile clients
    if (req.io && (key.includes('screen_') || key.includes('guard_'))) {
      req.io.emit('security:screen_guard_updated', {
        key,
        value: String(finalValue),
        updated_at: new Date().toISOString(),
      });
    }

    // Broadcast real-time maintenance status updates to mobile apps and admin panels
    if (req.io && key.includes('maintenance')) {
      req.io.emit('system:maintenance_updated', {
        key,
        value: String(finalValue),
        updated_at: new Date().toISOString(),
      });
    }

    return res.json({ success: true, message: `Setting ${key} updated successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update setting.' });
  }
}

// Agency Management Controllers
export async function getAgencies(req, res) {
  try {
    const agencies = await cache.getOrSet('agencies:all', 60, async () => {
      const rows = await query(`
        SELECT 
          a.*,
          u.full_name as owner_name,
          u.avatar_url as owner_avatar,
          u.email as owner_email,
          u.role as owner_role,
          u.level as owner_level,
          u.vip_package as owner_vip_package,
          u.coins as owner_coins,
          u.diamonds as owner_diamonds,
          (SELECT COUNT(h.id) FROM users h WHERE h.agency_id = a.id AND h.role != 'superadmin') as host_count,
          (SELECT COALESCE(SUM(h.coins), 0) FROM users h WHERE h.agency_id = a.id AND h.role != 'superadmin' AND h.id != a.owner_id) as total_host_coins,
          (SELECT COALESCE(SUM(h.diamonds), 0) FROM users h WHERE h.agency_id = a.id) as total_host_diamonds,
          (SELECT COALESCE(SUM(gt.coin_amount), 0) 
           FROM gift_transactions gt 
           INNER JOIN users u5 ON u5.id = gt.receiver_id 
           WHERE u5.agency_id = a.id AND gt.created_at >= COALESCE(u5.agency_joined_at, u5.created_at)) AS total_coins_gifted_to_hosts
        FROM agencies a
        JOIN users u ON a.owner_id = u.id
        ORDER BY a.id DESC
      `);

      return (rows || []).map((row) => {
        const commissionRate = parseFloat(row.commission_rate || 10);
        const totalCoinsGifted = parseInt(row.total_coins_gifted_to_hosts || 0, 10);
        const totalCommissionCoins = Math.round(totalCoinsGifted * (commissionRate / 100));
        const ownerCoins = parseInt(row.owner_coins || 0, 10);
        const hostsCoins = parseInt(row.total_host_coins || 0, 10);
        // Total coin = all hosts' coins + commission + agency owner's coin
        const totalCoins = hostsCoins + totalCommissionCoins + ownerCoins;

        return {
          ...row,
          host_count: parseInt(row.host_count || 0, 10),
          owner_coins: ownerCoins,
          total_host_coins: hostsCoins,
          total_commission_coins: totalCommissionCoins,
          total_coins: totalCoins,
          total_agency_coins: totalCoins,
        };
      });
    });

    return res.json({ success: true, agencies });
  } catch (err) {
    console.error('getAgencies error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch agencies.' });
  }
}

export async function createAgency(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const { name, ownerId, commissionRate = 10, contactPhone = '', notes = '' } = req.body;

    if (!name || !ownerId) {
      return res.status(400).json({ success: false, message: 'Agency name and owner are required.' });
    }

    const [owners] = await connection.execute('SELECT id, full_name, role FROM users WHERE id = ?', [ownerId]);
    if (owners.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected owner user not found.' });
    }

    // Check if owner already owns an agency or if agency ID exists
    const [existingAgencies] = await connection.execute('SELECT id, name FROM agencies WHERE owner_id = ? OR id = ?', [ownerId, ownerId]);
    if (existingAgencies.length > 0) {
      return res.status(400).json({
        success: false,
        message: `User #${ownerId} is already the owner of agency "${existingAgencies[0].name}" (Agency ID #${existingAgencies[0].id}). Each owner User ID corresponds to a unique Agency ID.`,
      });
    }

    const agencyCode = `AGY-${ownerId}`;

    await connection.beginTransaction();

    // 1. Promote owner user role to 'agency'
    await connection.execute("UPDATE users SET role = 'agency' WHERE id = ?", [ownerId]);

    // 2. Insert new agency record where agency.id = ownerId (Owner's User ID IS the Agency ID)
    await connection.execute(
      `INSERT INTO agencies (id, agency_code, name, owner_id, commission_rate, status, contact_phone, notes)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [ownerId, agencyCode, name, ownerId, parseFloat(commissionRate) || 10, contactPhone, notes]
    );

    await connection.commit();

    // Database write succeeded -> Invalidate Redis cache & notify via socket
    await invalidateUserCacheAndNotify(req.io, ownerId, { role: 'agency' });

    const [created] = await connection.execute(`
      SELECT a.*, u.full_name as owner_name, u.avatar_url as owner_avatar
      FROM agencies a
      JOIN users u ON a.owner_id = u.id
      WHERE a.id = ?
    `, [ownerId]);

    return res.status(201).json({
      success: true,
      message: `Agency "${name}" created successfully with Agency ID #${ownerId}! Owner User #${ownerId} promoted to Agency.`,
      agency: created[0],
    });
  } catch (err) {
    await connection.rollback();
    console.error('createAgency error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create agency.', error: err.message });
  } finally {
    connection.release();
  }
}

export async function updateAgency(req, res) {
  try {
    const { id } = req.params;
    const { name, commissionRate, status, contactPhone, notes } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (commissionRate !== undefined) { updates.push('commission_rate = ?'); params.push(parseFloat(commissionRate)); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (contactPhone !== undefined) { updates.push('contact_phone = ?'); params.push(contactPhone); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided.' });
    }

    params.push(id);
    await query(`UPDATE agencies SET ${updates.join(', ')} WHERE id = ?`, params);

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('agencies:*');
    await cache.delByPattern('host:*');

    return res.json({ success: true, message: 'Agency updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update agency.' });
  }
}

export async function deleteAgency(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [agencies] = await connection.execute('SELECT * FROM agencies WHERE id = ?', [id]);
    if (agencies.length === 0) {
      return res.status(404).json({ success: false, message: 'Agency not found.' });
    }

    const agency = agencies[0];
    const commissionRate = parseFloat(agency.commission_rate || 10);

    await connection.beginTransaction();

    // 1. Fetch all hosts under this agency before updating
    const [hosts] = await connection.execute(
      'SELECT id, full_name, coins FROM users WHERE agency_id = ?',
      [id]
    );

    // 2. Calculate agency commission from gifts received by hosts while under this agency
    const [giftRows] = await connection.execute(
      `SELECT COALESCE(SUM(gt.coin_amount), 0) AS total_coins_gifted_to_hosts
       FROM gift_transactions gt
       INNER JOIN users u ON u.id = gt.receiver_id
       WHERE u.agency_id = ?`,
      [id]
    );
    const totalCoinsGifted = parseInt(giftRows[0]?.total_coins_gifted_to_hosts || 0, 10);
    const totalHostCoins = (hosts || []).reduce((sum, h) => sum + parseInt(h.coins || 0, 10), 0);
    const baseCoins = totalCoinsGifted > 0 ? totalCoinsGifted : totalHostCoins;
    const totalCommissionCoins = Math.round(baseCoins * (commissionRate / 100));

    // 3. Credit commission to agency owner's coin balance
    if (totalCommissionCoins > 0 && agency.owner_id) {
      await connection.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [totalCommissionCoins, agency.owner_id]);
      await connection.execute(
        `INSERT INTO transactions (user_id, type, amount, description, status)
         VALUES (?, 'agency_commission', ?, ?, 'completed')`,
        [
          agency.owner_id,
          totalCommissionCoins,
          `Agency commission (${commissionRate}%) settlement upon deletion of agency "${agency.name}"`,
        ]
      );
    }

    // 4. Demote all hosts under this agency to normal users (role = 'user', host_type = 'general', agency_id = NULL)
    // IMPORTANT: Hosts' coins remain untouched in their wallet!
    if (hosts.length > 0) {
      const hostIds = hosts.map((h) => h.id);
      const placeholders = hostIds.map(() => '?').join(',');

      await connection.execute(
        `UPDATE users 
         SET role = 'user', host_type = 'general', agency_id = NULL,
             broadcast_banned_until = NULL, broadcast_ban_reason = NULL, broadcast_banned_at = NULL 
         WHERE agency_id = ?`,
        [id]
      );

      // Terminate any active live rooms for any of these hosts
      const [liveRooms] = await connection.execute(
        `SELECT room_id FROM live_rooms WHERE host_id IN (${placeholders}) AND status = 'live'`,
        hostIds
      );
      if (liveRooms.length > 0) {
        await connection.execute(
          `UPDATE live_rooms SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE host_id IN (${placeholders}) AND status = 'live'`,
          hostIds
        );
        for (const room of liveRooms) {
          await cache.del(`room:${room.room_id}`);
        }
        await cache.delByPattern('mobile:rooms:*');
      }
    }

    // 5. Agency owner also becomes normal user (role = 'user')
    await connection.execute(
      "UPDATE users SET role = 'user', host_type = 'general', agency_id = NULL WHERE id = ?",
      [agency.owner_id]
    );

    // 6. Cancel pending agency host requests for this agency
    await connection.execute(
      "UPDATE agency_host_requests SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE agency_id = ? AND status = 'pending'",
      [id]
    ).catch(() => {});

    // 7. Delete agency record
    await connection.execute('DELETE FROM agencies WHERE id = ?', [id]);

    await connection.commit();

    // 8. Redis cache invalidations & real-time socket notifications
    await cache.del('agencies:all');
    await cache.del('agency:list:all');
    await cache.delByPattern('agency:*');
    await cache.delByPattern('moderator:agencies:*');

    // Invalidate and notify agency owner
    await invalidateUserCacheAndNotify(req.io, agency.owner_id, {
      role: 'user',
      agency_id: null,
      host_type: 'general',
    });
    await cache.del(`user:agency_application:${agency.owner_id}`);
    await cache.del(`host:agency_summary:${agency.owner_id}`);

    if (req.io && agency.owner_id) {
      req.io.to(`user_${agency.owner_id}`).emit('agency:deleted', {
        agency_id: Number(id),
        agency_name: agency.name,
        commission_credited: totalCommissionCoins,
        message: `Agency "${agency.name}" has been deleted. You are now a normal user. Commission of ${totalCommissionCoins} coins has been added to your balance.`,
      });
      req.io.to(`user_${agency.owner_id}`).emit('agency:affiliation_updated', {
        agency_id: null,
        is_affiliated: false,
        role: 'user',
      });
    }

    // Invalidate and notify each host
    for (const host of hosts) {
      await invalidateUserCacheAndNotify(req.io, host.id, {
        role: 'user',
        agency_id: null,
        host_type: 'general',
      });
      await cache.del(`user:agency_application:${host.id}`);
      await cache.del(`host:agency_summary:${host.id}`);

      if (req.io) {
        req.io.to(`user_${host.id}`).emit('agency:deleted', {
          agency_id: Number(id),
          agency_name: agency.name,
          message: `Agency "${agency.name}" has been deleted. Your role has been reset to normal user, and all your coins remain safely in your balance. You can now apply to another agency anytime.`,
        });
        req.io.to(`user_${host.id}`).emit('agency:affiliation_updated', {
          agency_id: null,
          is_affiliated: false,
          role: 'user',
        });
      }
    }

    return res.json({
      success: true,
      message: `Agency "${agency.name}" has been deleted successfully. All ${hosts.length} hosts and owner #${agency.owner_id} are now normal users. Commission of ${totalCommissionCoins} coins credited to agency owner.`,
      data: {
        agency_id: Number(id),
        owner_id: agency.owner_id,
        commission_credited: totalCommissionCoins,
        hosts_released_count: hosts.length,
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error('deleteAgency error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete agency.', error: err.message });
  } finally {
    connection.release();
  }
}

export async function getAgencyHosts(req, res) {
  try {
    const { id } = req.params;
    const hosts = await query(
      `SELECT id, full_name, email, avatar_url, role, host_type, coins, diamonds, level, vip_package, is_banned, created_at
       FROM users
       WHERE agency_id = ?
       ORDER BY coins DESC, id DESC`,
      [id]
    );

    // Fetch agency owner and commission details
    const [agencyRow] = await query(
      `SELECT a.id, a.name, a.owner_id, a.commission_rate, u.coins as owner_coins
       FROM agencies a
       LEFT JOIN users u ON u.id = a.owner_id
       WHERE a.id = ?`,
      [id]
    );

    const ownerCoins = parseInt(agencyRow?.owner_coins || 0, 10);
    const hostCoins = (hosts || []).reduce((sum, h) => sum + parseInt(h.coins || 0, 10), 0);
    const [commRow] = await query(
      `SELECT COALESCE(SUM(coin_amount), 0) as total_gifted
       FROM gift_transactions
       WHERE receiver_id IN (SELECT id FROM users WHERE agency_id = ?)`,
      [id]
    );
    const totalGifted = parseInt(commRow?.total_gifted || 0, 10);
    const commRate = parseFloat(agencyRow?.commission_rate || 10);
    const totalCommission = Math.round(totalGifted * (commRate / 100));
    // User requirement: total coins = host coins + owner coins + agency commission
    const totalCoins = hostCoins + ownerCoins + totalCommission;

    return res.json({
      success: true,
      hosts,
      total_coins: totalCoins,
      coins: totalCoins,
      hosts_coins: hostCoins,
      owner_coins: ownerCoins,
      total_commission_coins: totalCommission,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch agency hosts.' });
  }
}

export async function assignUserToAgency(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const { id } = req.params; // agencyId
    const { userId, hostType = 'video' } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const cleanHostType = hostType === 'audio' ? 'audio' : 'video';

    const [agencies] = await connection.execute('SELECT * FROM agencies WHERE id = ?', [id]);
    if (agencies.length === 0) {
      return res.status(404).json({ success: false, message: 'Agency not found.' });
    }

    const [users] = await connection.execute('SELECT id, full_name, role, agency_id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await connection.beginTransaction();

    // Assign user to agency, elevate to 'host', and set host_type ('video' or 'audio')
    await connection.execute(
      "UPDATE users SET agency_id = ?, role = 'host', host_type = ? WHERE id = ?",
      [id, cleanHostType, userId]
    );

    await connection.commit();

    // Database write succeeded -> Invalidate Redis cache & notify via socket
    await invalidateUserCacheAndNotify(req.io, userId, { role: 'host', host_type: cleanHostType, agency_id: Number(id) });

    return res.json({
      success: true,
      message: `User #${userId} (${users[0].full_name || `User #${userId}`}) recruited as a ${cleanHostType.toUpperCase()} Host under ${agencies[0].name}!`,
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Failed to assign host.' });
  } finally {
    connection.release();
  }
}

export async function removeUserFromAgency(req, res) {
  try {
    const { id, userId } = req.params;
    await query('UPDATE users SET agency_id = NULL WHERE id = ? AND agency_id = ?', [userId, id]);

    // Database write succeeded -> Invalidate Redis cache & notify via socket
    await invalidateUserCacheAndNotify(req.io, userId, { role: 'user', agency_id: null });
    await cache.del(`user:agency_application:${userId}`);
    await cache.del(`host:agency_summary:${userId}`);
    await cache.del('agencies:all');
    await cache.del(`agency:${id}:hosts`);

    return res.json({
      success: true,
      message: 'Host removed from agency.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to remove host.' });
  }
}

// ==========================================
// MODERATOR MANAGEMENT
// ==========================================

export async function getModerators(req, res) {
  try {
    const formatted = await cache.getOrSet('moderators:all', 60, async () => {
      const moderators = await query(`
        SELECT 
          m.id,
          m.user_id,
          m.assigned_by,
          m.permissions,
          m.status,
          m.notes,
          m.created_at,
          m.updated_at,
          u.email,
          u.full_name,
          u.avatar_url,
          u.role,
          u.level,
          u.coins,
          u.diamonds,
          u.vip_package,
          u.is_banned,
          u_creator.full_name as assigned_by_name
        FROM moderators m
        JOIN users u ON m.user_id = u.id
        LEFT JOIN users u_creator ON m.assigned_by = u_creator.id
        ORDER BY m.created_at DESC
      `);

      return (moderators || []).map((mod) => ({
        ...mod,
        permissions: typeof mod.permissions === 'string' ? JSON.parse(mod.permissions || '{}') : (mod.permissions || {}),
      }));
    });

    return res.json({ success: true, moderators: formatted });
  } catch (err) {
    console.error('getModerators error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch moderators.' });
  }
}

export async function addModerator(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      userId,
      email,
      password,
      full_name,
      permissions = {
        silent_room_entry: true,
        bypass_private_password: true,
        kick_room_user: true,
        manage_seat_requests: true,
        remove_cohost_seat: true,
        close_room: true,
        audit_agencies: true,
        manage_agency_hosts: true,
        remove_hosts: true,
        temporary_ban_host: true,
      },
      notes = '',
    } = req.body;

    let targetUserId = userId;

    if (!targetUserId) {
      if (!email || !password) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Provide existing User ID, or provide email and password to create a new moderator account.',
        });
      }

      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [email]
      );
      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const [insertUserRes] = await connection.execute(
        `INSERT INTO users (email, password_hash, full_name, role, level, coins, diamonds)
         VALUES (?, ?, ?, 'moderator', 1, 500, 0)`,
        [email, password_hash, full_name || 'Moderator']
      );
      targetUserId = insertUserRes.insertId;
    } else {
      const [userRows] = await connection.execute('SELECT id, full_name, role FROM users WHERE id = ?', [targetUserId]);
      if (userRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'User not found with specified ID.' });
      }

      const [modRows] = await connection.execute('SELECT id FROM moderators WHERE user_id = ?', [targetUserId]);
      if (modRows.length > 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'This user is already registered as a moderator.' });
      }

      await connection.execute("UPDATE users SET role = 'moderator' WHERE id = ?", [targetUserId]);
    }

    const assignedBy = req.user?.id || null;
    const [modInsertRes] = await connection.execute(
      `INSERT INTO moderators (user_id, assigned_by, permissions, status, notes)
       VALUES (?, ?, ?, 'active', ?)`,
      [targetUserId, assignedBy, JSON.stringify(permissions), notes]
    );

    await connection.commit();

    // Database write succeeded -> Invalidate Redis cache & notify via socket
    await invalidateUserCacheAndNotify(req.io, targetUserId, { role: 'moderator' });

    return res.status(201).json({
      success: true,
      message: 'Moderator assigned successfully!',
      moderatorId: modInsertRes.insertId,
    });
  } catch (err) {
    await connection.rollback();
    console.error('addModerator error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to add moderator.' });
  } finally {
    connection.release();
  }
}

export async function updateModerator(req, res) {
  try {
    const { id } = req.params;
    const { permissions, status, notes } = req.body;

    const [existing] = await query('SELECT * FROM moderators WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Moderator not found.' });
    }

    const updates = [];
    const params = [];

    if (permissions !== undefined) {
      updates.push('permissions = ?');
      params.push(JSON.stringify(permissions));
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length > 0) {
      params.push(id);
      await query(`UPDATE moderators SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('moderators:*');

    return res.json({ success: true, message: 'Moderator updated successfully.' });
  } catch (err) {
    console.error('updateModerator error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update moderator.' });
  }
}

export async function deleteModerator(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const { id } = req.params;

    const [modRows] = await connection.execute('SELECT id, user_id FROM moderators WHERE id = ?', [id]);
    if (modRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Moderator not found.' });
    }

    const userId = modRows[0].user_id;

    // Delete from moderators table
    await connection.execute('DELETE FROM moderators WHERE id = ?', [id]);

    // Revert user's role to 'user' if it was 'moderator'
    await connection.execute("UPDATE users SET role = 'user' WHERE id = ? AND role = 'moderator'", [userId]);

    await connection.commit();

    // Database write succeeded -> Invalidate Redis cache & notify via socket
    await invalidateUserCacheAndNotify(req.io, userId, { role: 'user' });

    return res.json({
      success: true,
      message: 'Moderator removed successfully and role demoted to standard user.',
    });
  } catch (err) {
    await connection.rollback();
    console.error('deleteModerator error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete moderator.' });
  } finally {
    connection.release();
  }
}

export async function getUserDetails(req, res) {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid User ID.' });
    }

    const data = await cache.getOrSet(`admin:user:${userId}`, 30, async () => {
      const [user] = await query(
        `SELECT u.id, u.email, u.full_name, u.avatar_url, u.bio, u.role, u.host_type,
                u.agency_id, a.name as agency_name, a.agency_code,
                u.coins, u.diamonds, u.level, u.vip_package, u.is_banned,
                u.previous_ids, u.created_at, u.updated_at
         FROM users u
         LEFT JOIN agencies a ON u.agency_id = a.id
         WHERE (u.id = ? OR FIND_IN_SET(?, REPLACE(IFNULL(u.previous_ids, ""), " ", "")) > 0) AND u.role != 'superadmin'`,
        [userId, userId]
      );

      if (!user) {
        return null;
      }

      // 1. Moderator check & permissions
      const [mod] = await query(
        `SELECT m.id, m.permissions, m.status, m.notes, m.created_at, m.assigned_by,
                u_creator.full_name as assigned_by_name
         FROM moderators m
         LEFT JOIN users u_creator ON m.assigned_by = u_creator.id
         WHERE m.user_id = ?`,
        [userId]
      );

      let moderatorInfo = null;
      if (mod) {
        moderatorInfo = {
          ...mod,
          permissions: typeof mod.permissions === 'string' ? JSON.parse(mod.permissions || '{}') : (mod.permissions || {}),
        };
      }

      // 2. Stream stats
      const [streamStats] = await query(
        `SELECT 
           COUNT(*) as total_streams,
           COALESCE(SUM(total_diamonds), 0) as total_stream_diamonds,
           COALESCE(MAX(viewer_count), 0) as peak_viewers
         FROM live_rooms
         WHERE host_id = ?`,
        [userId]
      );

      // 3. Withdrawal stats
      const [withdrawalStats] = await query(
        `SELECT 
           COUNT(*) as total_withdrawals,
           COALESCE(SUM(usd_amount), 0) as total_withdrawn_usd,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_withdrawals
         FROM withdrawals
         WHERE host_id = ?`,
        [userId]
      );

      // 4. Recent transactions
      const recentTransactions = await query(
        `SELECT id, type, amount, status, description, created_at
         FROM transactions
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 8`,
        [userId]
      );

      // 5. User Posts
      const posts = await query(
        `SELECT id, user_id, content, media_url, media_type, likes_count, comments_count, created_at
         FROM posts
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId]
      ).catch(() => []);

      // 6. User Chats (Conversation List)
      const chats = await query(
        `SELECT 
           c.id,
           c.user1_id,
           c.user2_id,
           c.last_message,
           c.last_message_at,
           c.created_at,
           CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END as other_user_id,
           u_other.full_name as other_full_name,
           u_other.avatar_url as other_avatar_url,
           u_other.role as other_role,
           (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id AND m.receiver_id = ? AND m.is_read = FALSE) as unread_count
         FROM conversations c
         JOIN users u_other ON u_other.id = (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END)
         WHERE c.user1_id = ? OR c.user2_id = ?
         ORDER BY c.last_message_at DESC`,
        [userId, userId, userId, userId, userId]
      ).catch(() => []);

      // 7. Coin packages list (VIP and coin package reference)
      const coinPackages = await query(
        `SELECT id, name, coins, price_usd, bonus_coins, badge
         FROM coin_packages
         WHERE is_active = TRUE
         ORDER BY coins ASC`
      ).catch(() => []);

      return {
        user,
        moderatorInfo,
        streamStats: streamStats || { total_streams: 0, total_stream_diamonds: 0, peak_viewers: 0 },
        withdrawalStats: withdrawalStats || { total_withdrawals: 0, total_withdrawn_usd: 0, pending_withdrawals: 0 },
        recentTransactions: recentTransactions || [],
        posts: posts || [],
        chats: chats || [],
        coinPackages: coinPackages || [],
      };
    });

    if (!data || !data.user) {
      return res.status(404).json({ success: false, message: `User #${userId} not found.` });
    }

    return res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('getUserDetails error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch user details.' });
  }
}

export async function getConversationMessages(req, res) {
  try {
    const { userId, conversationId } = req.params;
    const convId = parseInt(conversationId, 10);
    const uId = parseInt(userId, 10);
    if (!convId || !uId) {
      return res.status(400).json({ success: false, message: 'Invalid conversation or user ID.' });
    }

    const [conv] = await query(
      `SELECT c.*,
              u1.full_name as u1_name, u1.avatar_url as u1_avatar,
              u2.full_name as u2_name, u2.avatar_url as u2_avatar
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       WHERE c.id = ? AND (c.user1_id = ? OR c.user2_id = ?)`,
      [convId, uId, uId]
    );

    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const messages = await query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id, m.message, m.is_read, m.created_at,
              u.full_name as sender_name, u.avatar_url as sender_avatar
       FROM chat_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
      [convId]
    );

    const otherUser = conv.user1_id === uId
      ? { id: conv.user2_id, full_name: conv.u2_name, avatar_url: conv.u2_avatar }
      : { id: conv.user1_id, full_name: conv.u1_name, avatar_url: conv.u1_avatar };

    return res.json({
      success: true,
      conversation: conv,
      otherUser,
      messages: messages || [],
    });
  } catch (err) {
    console.error('getConversationMessages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversation messages.' });
  }
}

export async function getAdminPosts(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '15', 10)));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const mediaType = req.query.media_type || 'all';
    const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR p.title LIKE ? OR p.content LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (mediaType && mediaType !== 'all') {
      whereConditions.push('p.media_type = ?');
      params.push(mediaType);
    }

    if (userId) {
      whereConditions.push('p.user_id = ?');
      params.push(userId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 1. Total count
    const countSql = `
      SELECT COUNT(*) as total 
      FROM posts p
      JOIN users u ON u.id = p.user_id
      ${whereClause}
    `;
    const countRows = await query(countSql, params);
    const total = countRows?.[0]?.total || 0;

    // 2. Query posts list
    const selectSql = `
      SELECT 
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.media_url,
        p.media_type,
        p.media,
        p.likes_count,
        p.comments_count,
        p.created_at,
        p.updated_at,
        u.full_name as author_name,
        u.email as author_email,
        u.avatar_url as author_avatar_url,
        u.role as author_role,
        u.level as author_level,
        u.star as author_star,
        u.vip_package,
        pc.name as package_category_name,
        pc.badge_icon as package_badge_icon,
        pc.color_code as package_color_code
      FROM posts p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN user_package_subscriptions ups 
        ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
      LEFT JOIN package_categories pc 
        ON pc.id = ups.category_id AND pc.is_active = 1
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const postsRaw = await query(selectSql, [...params, limit, offset]);

    // Fetch media attachments from post_media
    const postIds = postsRaw.map((p) => p.id);
    let mediaByPostId = {};

    if (postIds.length > 0) {
      const placeholders = postIds.map(() => '?').join(',');
      const mediaRows = await query(
        `SELECT id, post_id, media_type, media_url, thumbnail_url, duration, display_order 
         FROM post_media 
         WHERE post_id IN (${placeholders}) 
         ORDER BY display_order ASC, id ASC`,
        postIds
      ).catch(() => []);

      mediaRows.forEach((m) => {
        if (!mediaByPostId[m.post_id]) mediaByPostId[m.post_id] = [];
        mediaByPostId[m.post_id].push(m);
      });
    }

    const posts = postsRaw.map((row) => {
      let mediaItems = [];
      if (mediaByPostId[row.id] && mediaByPostId[row.id].length > 0) {
        mediaItems = mediaByPostId[row.id];
      } else if (row.media) {
        try {
          mediaItems = typeof row.media === 'string' ? JSON.parse(row.media) : row.media;
        } catch (e) {
          mediaItems = [];
        }
      } else if (row.media_url) {
        mediaItems = [
          {
            media_type: row.media_type || 'image',
            media_url: row.media_url,
            thumbnail_url: null,
            duration: 0,
          },
        ];
      }

      return {
        id: row.id,
        user_id: row.user_id,
        title: row.title || null,
        content: row.content,
        media_type: row.media_type,
        media_url: row.media_url,
        media: mediaItems,
        likes_count: parseInt(row.likes_count || 0, 10),
        comments_count: parseInt(row.comments_count || 0, 10),
        created_at: row.created_at,
        updated_at: row.updated_at,
        author: {
          id: row.user_id,
          name: row.author_name || 'Anonymous',
          email: row.author_email,
          avatar_url: row.author_avatar_url,
          role: row.author_role,
          level: row.author_level,
          star: row.author_star,
          package_category: {
            name: row.package_category_name || row.vip_package || 'Standard',
            badge_icon: row.package_badge_icon || null,
            color_code: row.package_color_code || '#f59e0b',
          },
        },
      };
    });

    // 3. Platform Posts Stats
    const statsRows = await query(`
      SELECT 
        COUNT(*) as total_posts,
        SUM(CASE WHEN media_type = 'video' THEN 1 ELSE 0 END) as total_videos,
        SUM(CASE WHEN media_type = 'audio' THEN 1 ELSE 0 END) as total_audios,
        SUM(CASE WHEN media_type = 'image' THEN 1 ELSE 0 END) as total_images,
        COALESCE(SUM(likes_count), 0) as total_likes,
        COALESCE(SUM(comments_count), 0) as total_comments
      FROM posts
    `);

    const stats = statsRows?.[0] || {
      total_posts: 0,
      total_videos: 0,
      total_audios: 0,
      total_images: 0,
      total_likes: 0,
      total_comments: 0,
    };

    return res.json({
      success: true,
      posts,
      stats: {
        total_posts: parseInt(stats.total_posts || 0, 10),
        total_videos: parseInt(stats.total_videos || 0, 10),
        total_audios: parseInt(stats.total_audios || 0, 10),
        total_images: parseInt(stats.total_images || 0, 10),
        total_likes: parseInt(stats.total_likes || 0, 10),
        total_comments: parseInt(stats.total_comments || 0, 10),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('getAdminPosts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin posts.' });
  }
}

export async function createAdminPost(req, res) {
  try {
    const adminId = req.user?.id;
    const { title = null, content = '', user_id } = req.body;
    const targetUserId = user_id ? parseInt(user_id, 10) : adminId;

    let mediaItems = [];
    if (req.uploadedMedia && Array.isArray(req.uploadedMedia) && req.uploadedMedia.length > 0) {
      mediaItems = req.uploadedMedia;
    } else if (req.body.media) {
      try {
        mediaItems = typeof req.body.media === 'string' ? JSON.parse(req.body.media) : req.body.media;
      } catch (e) {
        mediaItems = [];
      }
    } else if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v', '.3gp'];
      const audioExts = ['.mp3', '.wav', '.aac', '.ogg', '.m4a'];
      let mType = 'image';
      if (videoExts.includes(ext)) mType = 'video';
      else if (audioExts.includes(ext)) mType = 'audio';

      mediaItems = [
        {
          media_type: mType,
          media_url: `/uploads/posts/${req.file.filename}`,
          thumbnail_url: null,
          duration: 0,
        },
      ];
    }

    const cleanContent = typeof content === 'string' ? content.trim() : '';
    const cleanTitle = typeof title === 'string' && title.trim() ? title.trim() : null;

    if (!cleanContent && mediaItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Post must contain either text content or media attachment.',
      });
    }

    let primaryMediaType = 'none';
    if (mediaItems.length === 1) {
      primaryMediaType = mediaItems[0].media_type || 'image';
    } else if (mediaItems.length > 1) {
      const types = new Set(mediaItems.map((m) => m.media_type));
      primaryMediaType = types.size === 1 ? mediaItems[0].media_type : 'multiple';
    }

    const primaryMediaUrl = mediaItems.length > 0 ? mediaItems[0].media_url : '';

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      const [result] = await conn.execute(
        `INSERT INTO posts (user_id, title, content, media_url, media_type, media, likes_count, comments_count)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
        [
          targetUserId,
          cleanTitle,
          cleanContent,
          primaryMediaUrl,
          primaryMediaType,
          mediaItems.length > 0 ? JSON.stringify(mediaItems) : null,
        ]
      );
      const postId = result.insertId;

      if (mediaItems.length > 0) {
        for (let i = 0; i < mediaItems.length; i++) {
          const m = mediaItems[i];
          const mType = ['image', 'video', 'audio'].includes(m.media_type) ? m.media_type : 'image';
          const mUrl = m.media_url || m.url || '';
          if (mUrl) {
            await conn.execute(
              `INSERT INTO post_media (post_id, media_type, media_url, thumbnail_url, duration, display_order)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [postId, mType, mUrl, m.thumbnail_url || null, parseInt(m.duration || 0, 10), i + 1]
            );
          }
        }
      }

      await conn.commit();
      await cache.delByPattern('feed:*');
      await cache.delByPattern('admin:posts:*');

      return res.status(201).json({
        success: true,
        message: 'Post created successfully by administrator.',
        postId,
      });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('createAdminPost error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create post.' });
  }
}

export async function deleteUserPost(req, res) {
  try {
    const { postId } = req.params;

    // 1. Gather all media files for this post before deleting
    const postRows = await query('SELECT media_url, media FROM posts WHERE id = ? LIMIT 1', [postId]);
    const postMediaRows = await query('SELECT media_url, thumbnail_url FROM post_media WHERE post_id = ?', [postId]);
    const commentRows = await query('SELECT media_url FROM post_comments WHERE post_id = ? AND media_url IS NOT NULL', [postId]);

    const mediaToDelete = [];
    if (postRows?.[0]) {
      if (postRows[0].media_url) mediaToDelete.push(postRows[0].media_url);
      if (postRows[0].media) mediaToDelete.push(postRows[0].media);
    }
    if (postMediaRows?.length) {
      for (const m of postMediaRows) {
        if (m.media_url) mediaToDelete.push(m.media_url);
        if (m.thumbnail_url) mediaToDelete.push(m.thumbnail_url);
      }
    }
    if (commentRows?.length) {
      for (const c of commentRows) {
        if (c.media_url) mediaToDelete.push(c.media_url);
      }
    }

    // 2. Delete physical files from storage
    deleteMultipleFilesFromStorage(mediaToDelete);

    // 3. MySQL SSOT delete
    await query('DELETE FROM posts WHERE id = ?', [postId]);
    await cache.delByPattern('feed:*');
    await cache.del(`feed:post:${postId}`);
    await cache.delByPattern(`feed:comments:${postId}:*`);
    await cache.delByPattern(`feed:reactions:${postId}:*`);
    await cache.delByPattern('admin:posts:*');
    return res.json({ success: true, message: 'Post and associated media files deleted successfully.' });
  } catch (err) {
    console.error('deleteUserPost error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete post.' });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const target = await query('SELECT id, full_name, role FROM users WHERE id = ?', [id]);
    if (!target || target.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (target[0].role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Superadmin account cannot be deleted.' });
    }

    // Clean up relations
    await query('DELETE FROM agency_hosts WHERE user_id = ?', [id]).catch(() => {});
    await query('DELETE FROM moderators WHERE user_id = ?', [id]).catch(() => {});
    await query('DELETE FROM live_streams WHERE host_id = ?', [id]).catch(() => {});
    await query('DELETE FROM users WHERE id = ?', [id]);

    // Database write succeeded -> Invalidate Redis cache
    await cache.del(`user:${id}`);
    await cache.del(`user:balance:${id}`);
    await cache.del(`admin:user:${id}`);
    await cache.delByPattern('admin:users*');
    await cache.delByPattern('admin:dashboard*');
    await cache.delByPattern('hosts:*');
    await cache.delByPattern('resellers:*');
    await cache.delByPattern('moderators:*');

    return res.json({
      success: true,
      message: `User ID #${id} (${target[0].full_name || 'User'}) deleted successfully.`,
    });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete user.' });
  }
}

/**
 * Universal Bulk Delete Controller
 * Database-First mutation + Instant Redis Cache Invalidation across all entities
 */
export async function bulkDelete(req, res) {
  try {
    const { entity, ids } = req.body;
    if (!entity || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid entity or empty IDs array.' });
    }

    // Clean and validate integer or string IDs
    const cleanIds = ids
      .map((id) => (typeof id === 'number' ? id : parseInt(id, 10)))
      .filter((id) => !isNaN(id) && id > 0);

    if (cleanIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid IDs provided for bulk deletion.' });
    }

    let deletedCount = 0;

    switch (entity) {
      case 'users': {
        const currentUserId = req.user?.id;
        const placeholders = cleanIds.map(() => '?').join(',');
        const usersToDelete = await query(
          `SELECT id, role FROM users WHERE id IN (${placeholders}) AND role != 'superadmin' ${
            currentUserId ? 'AND id != ?' : ''
          }`,
          currentUserId ? [...cleanIds, currentUserId] : cleanIds
        );
        const validUserIds = usersToDelete.map((u) => u.id);

        if (validUserIds.length > 0) {
          const vPlaceholders = validUserIds.map(() => '?').join(',');
          await query(`DELETE FROM agency_hosts WHERE user_id IN (${vPlaceholders})`, validUserIds).catch(() => {});
          await query(`DELETE FROM moderators WHERE user_id IN (${vPlaceholders})`, validUserIds).catch(() => {});
          await query(`DELETE FROM live_streams WHERE host_id IN (${vPlaceholders})`, validUserIds).catch(() => {});
          const result = await query(`DELETE FROM users WHERE id IN (${vPlaceholders})`, validUserIds);
          deletedCount = result.affectedRows || validUserIds.length;

          // Invalidate Redis caches for each user and aggregate lists
          for (const uId of validUserIds) {
            await cache.del(`user:${uId}`);
            await cache.del(`user:balance:${uId}`);
            await cache.del(`admin:user:${uId}`);
          }
          await cache.delByPattern('admin:users*');
          await cache.delByPattern('admin:dashboard*');
          await cache.delByPattern('hosts:*');
          await cache.delByPattern('resellers:*');
          await cache.delByPattern('moderators:*');
        }
        break;
      }

      case 'banners': {
        const placeholders = cleanIds.map(() => '?').join(',');
        const result = await query(`DELETE FROM banners WHERE id IN (${placeholders})`, cleanIds);
        deletedCount = result.affectedRows || 0;
        await cache.del('banners:public', 'banners:admin');
        await cache.delByPattern('banners:*');
        break;
      }

      case 'gifts': {
        const placeholders = cleanIds.map(() => '?').join(',');
        const result = await query(`DELETE FROM gifts WHERE id IN (${placeholders})`, cleanIds);
        deletedCount = result.affectedRows || 0;
        await cache.del('gifts:active', 'gifts:admin');
        await cache.delByPattern('gifts:*');
        break;
      }

      case 'thumbnails': {
        const placeholders = cleanIds.map(() => '?').join(',');
        await query(`DELETE FROM user_special_items WHERE item_id IN (${placeholders})`, cleanIds).catch(() => {});
        const result = await query(
          `DELETE FROM special_items WHERE type = 'thumbnail' AND id IN (${placeholders})`,
          cleanIds
        );
        deletedCount = result.affectedRows || 0;
        await cache.delByPattern('special_items:thumbnails:*');
        await cache.delByPattern('user:privileges:*');
        break;
      }

      case 'entry_effects':
      case 'entry-effects': {
        const placeholders = cleanIds.map(() => '?').join(',');
        await query(`DELETE FROM user_special_items WHERE item_id IN (${placeholders})`, cleanIds).catch(() => {});
        const result = await query(
          `DELETE FROM special_items WHERE type = 'entry_effect' AND id IN (${placeholders})`,
          cleanIds
        );
        deletedCount = result.affectedRows || 0;
        await cache.delByPattern('special_items:effects:*');
        await cache.delByPattern('user:privileges:*');
        break;
      }

      case 'packages': {
        const placeholders = cleanIds.map(() => '?').join(',');
        await query(`DELETE FROM user_packages WHERE package_id IN (${placeholders})`, cleanIds).catch(() => {});
        const result = await query(`DELETE FROM packages WHERE id IN (${placeholders})`, cleanIds);
        deletedCount = result.affectedRows || 0;
        await cache.delByPattern('packages:*');
        await cache.delByPattern('user:privileges:*');
        break;
      }

      case 'package_categories':
      case 'categories': {
        const placeholders = cleanIds.map(() => '?').join(',');
        const result = await query(`DELETE FROM package_categories WHERE id IN (${placeholders})`, cleanIds);
        deletedCount = result.affectedRows || 0;
        await cache.del('packages:categories');
        await cache.delByPattern('packages:*');
        break;
      }

      case 'moderators': {
        const placeholders = cleanIds.map(() => '?').join(',');
        const result = await query(`DELETE FROM moderators WHERE id IN (${placeholders})`, cleanIds);
        deletedCount = result.affectedRows || 0;
        await cache.del('moderators:all');
        break;
      }

      case 'agencies': {
        const placeholders = cleanIds.map(() => '?').join(',');
        for (const agId of cleanIds) {
          const [agRows] = await query('SELECT * FROM agencies WHERE id = ?', [agId]);
          if (agRows && agRows.length > 0) {
            const ag = agRows[0];
            const cRate = parseFloat(ag.commission_rate || 10);
            const hosts = await query('SELECT id, full_name, coins FROM users WHERE agency_id = ?', [agId]);

            const [gRows] = await query(
              `SELECT COALESCE(SUM(gt.coin_amount), 0) AS total_gifted
               FROM gift_transactions gt
               INNER JOIN users u ON u.id = gt.receiver_id
               WHERE u.agency_id = ?`,
              [agId]
            );
            const tGifted = parseInt(gRows?.total_gifted || 0, 10);
            const tHostCoins = (hosts || []).reduce((sum, h) => sum + parseInt(h.coins || 0, 10), 0);
            const baseCoins = tGifted > 0 ? tGifted : tHostCoins;
            const commCoins = Math.round(baseCoins * (cRate / 100));

            if (commCoins > 0 && ag.owner_id) {
              await query('UPDATE users SET coins = coins + ? WHERE id = ?', [commCoins, ag.owner_id]);
              await query(
                `INSERT INTO transactions (user_id, type, amount, description, status)
                 VALUES (?, 'agency_commission', ?, ?, 'completed')`,
                [ag.owner_id, commCoins, `Agency commission (${cRate}%) settlement upon bulk deletion of agency "${ag.name}"`]
              );
            }

            // Demote hosts to normal users (coins remain in balance)
            if (hosts.length > 0) {
              await query(
                `UPDATE users 
                 SET role = 'user', host_type = 'general', agency_id = NULL,
                     broadcast_banned_until = NULL, broadcast_ban_reason = NULL, broadcast_banned_at = NULL 
                 WHERE agency_id = ?`,
                [agId]
              );
              for (const h of hosts) {
                await invalidateUserCacheAndNotify(req.io, h.id, { role: 'user', agency_id: null, host_type: 'general' });
                await cache.del(`user:agency_application:${h.id}`);
                await cache.del(`host:agency_summary:${h.id}`);
              }
            }

            // Demote owner to normal user
            await query("UPDATE users SET role = 'user', host_type = 'general', agency_id = NULL WHERE id = ?", [ag.owner_id]);
            await invalidateUserCacheAndNotify(req.io, ag.owner_id, { role: 'user', agency_id: null, host_type: 'general' });
            await cache.del(`user:agency_application:${ag.owner_id}`);
            await cache.del(`host:agency_summary:${ag.owner_id}`);
          }
        }

        await query(`DELETE FROM agency_hosts WHERE agency_id IN (${placeholders})`, cleanIds).catch(() => {});
        const result = await query(`DELETE FROM agencies WHERE id IN (${placeholders})`, cleanIds);
        deletedCount = result.affectedRows || 0;
        await cache.del('agencies:all');
        await cache.del('agency:list:all');
        await cache.delByPattern('agency:*');
        await cache.delByPattern('hosts:*');
        break;
      }

      case 'resellers': {
        const placeholders = cleanIds.map(() => '?').join(',');
        const result = await query(
          `UPDATE users SET role = 'user' WHERE id IN (${placeholders}) AND role = 'reseller'`,
          cleanIds
        );
        deletedCount = result.affectedRows || 0;
        for (const uId of cleanIds) {
          await cache.del(`user:${uId}`);
          await cache.del(`user:balance:${uId}`);
          await cache.del(`admin:user:${uId}`);
        }
        await cache.delByPattern('resellers:*');
        await cache.delByPattern('admin:users*');
        break;
      }

      case 'reseller_sales':
      case 'reseller-sales': {
        const placeholders = cleanIds.map(() => '?').join(',');
        const result = await query(`DELETE FROM reseller_sales WHERE id IN (${placeholders})`, cleanIds);
        deletedCount = result.affectedRows || 0;
        await cache.delByPattern('reseller_sales:all:*');
        break;
      }

      case 'withdrawals': {
        const placeholders = cleanIds.map(() => '?').join(',');
        const result = await query(`DELETE FROM withdrawals WHERE id IN (${placeholders})`, cleanIds);
        deletedCount = result.affectedRows || 0;
        await cache.delByPattern('admin:withdrawals:*');
        break;
      }

      case 'coin_packages':
      case 'coin-packages': {
        const placeholders = cleanIds.map(() => '?').join(',');
        const result = await query(`DELETE FROM coin_packages WHERE id IN (${placeholders})`, cleanIds);
        deletedCount = result.affectedRows || 0;
        await cache.del('wallet:packages');
        await cache.del('admin:coin_packages');
        await cache.del('wallet:recharge:config');
        await cache.del('config:mobile:app');
        break;
      }

      case 'hosts': {
        const placeholders = cleanIds.map(() => '?').join(',');
        await query(`DELETE FROM agency_hosts WHERE user_id IN (${placeholders})`, cleanIds).catch(() => {});
        const result = await query(
          `UPDATE users SET role = 'user', host_type = 'general', agency_id = NULL WHERE id IN (${placeholders}) AND role = 'host'`,
          cleanIds
        );
        deletedCount = result.affectedRows || 0;
        for (const uId of cleanIds) {
          await cache.del(`user:${uId}`);
          await cache.del(`admin:user:${uId}`);
        }
        await cache.delByPattern('hosts:*');
        await cache.delByPattern('admin:users*');
        break;
      }

      case 'host_requests':
      case 'host-requests': {
        const placeholders = cleanIds.map(() => '?').join(',');
        const result1 = await query(`DELETE FROM host_requests WHERE id IN (${placeholders})`, cleanIds);
        const result2 = await query(`DELETE FROM agency_host_requests WHERE id IN (${placeholders})`, cleanIds);
        deletedCount = (result1.affectedRows || 0) + (result2.affectedRows || 0);
        await cache.delByPattern('host_requests:*');
        break;
      }

      case 'posts': {
        const placeholders = cleanIds.map(() => '?').join(',');

        // 1. Gather all media files for these posts before deleting
        const postRows = await query(`SELECT media_url, media FROM posts WHERE id IN (${placeholders})`, cleanIds);
        const postMediaRows = await query(`SELECT media_url, thumbnail_url FROM post_media WHERE post_id IN (${placeholders})`, cleanIds);
        const commentRows = await query(`SELECT media_url FROM post_comments WHERE post_id IN (${placeholders}) AND media_url IS NOT NULL`, cleanIds);

        const mediaToDelete = [];
        if (postRows?.length) {
          for (const p of postRows) {
            if (p.media_url) mediaToDelete.push(p.media_url);
            if (p.media) mediaToDelete.push(p.media);
          }
        }
        if (postMediaRows?.length) {
          for (const m of postMediaRows) {
            if (m.media_url) mediaToDelete.push(m.media_url);
            if (m.thumbnail_url) mediaToDelete.push(m.thumbnail_url);
          }
        }
        if (commentRows?.length) {
          for (const c of commentRows) {
            if (c.media_url) mediaToDelete.push(c.media_url);
          }
        }

        // 2. Delete physical files from storage
        deleteMultipleFilesFromStorage(mediaToDelete);

        // 3. MySQL SSOT delete
        const result = await query(`DELETE FROM posts WHERE id IN (${placeholders})`, cleanIds);
        deletedCount = result.affectedRows || 0;
        await cache.delByPattern('feed:*');
        for (const pId of cleanIds) {
          await cache.del(`feed:post:${pId}`);
          await cache.delByPattern(`feed:comments:${pId}:*`);
          await cache.delByPattern(`feed:reactions:${pId}:*`);
        }
        await cache.delByPattern('admin:posts:*');
        break;
      }

      default:
        return res.status(400).json({ success: false, message: `Unsupported bulk delete entity: ${entity}` });
    }

    return res.json({
      success: true,
      count: deletedCount,
      message: `Successfully deleted ${deletedCount} item(s) from ${entity}.`,
    });
  } catch (err) {
    console.error('bulkDelete error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Bulk delete operation failed.' });
  }
}

// ==========================================
// HOST MANAGEMENT CONTROLLERS
// ==========================================

export async function getHosts(req, res) {
  try {
    const { search, hostType, agencyId, page = 1, limit = 20 } = req.query;
    const cacheKey = `hosts:all:${search || ''}:${hostType || ''}:${agencyId || ''}:${page}:${limit}`;

    const data = await cache.getOrSet(cacheKey, 30, async () => {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const conditions = ["u.role = 'host'"];
      const params = [];

      if (search) {
        const cleanSearch = String(search).trim().replace(/^#/, '');
        const isNumeric = !isNaN(cleanSearch) && cleanSearch !== '';
        if (isNumeric) {
          conditions.push('u.id = ?');
          params.push(parseInt(cleanSearch, 10));
        } else {
          conditions.push('(u.full_name LIKE ? OR u.email LIKE ?)');
          const s = `%${cleanSearch}%`;
          params.push(s, s);
        }
      }

      if (hostType && hostType !== 'all') {
        conditions.push('u.host_type = ?');
        params.push(hostType);
      }

      if (agencyId && agencyId !== 'all') {
        if (agencyId === 'none') {
          conditions.push('u.agency_id IS NULL');
        } else {
          conditions.push('u.agency_id = ?');
          params.push(parseInt(agencyId, 10));
        }
      }

      const whereSql = `WHERE ${conditions.join(' AND ')}`;

      const hosts = await query(
        `SELECT 
          u.id, u.email, u.full_name, u.avatar_url, u.bio, u.role, u.host_type,
          u.agency_id, a.name as agency_name, a.agency_code, a.commission_rate,
          u.coins, u.diamonds, u.level, u.vip_package, u.is_banned, u.created_at,
          (SELECT COUNT(*) FROM live_rooms lr WHERE lr.host_id = u.id) as stream_count,
          (SELECT COALESCE(SUM(total_diamonds), 0) FROM live_rooms lr WHERE lr.host_id = u.id) as stream_diamonds
         FROM users u
         LEFT JOIN agencies a ON u.agency_id = a.id
         ${whereSql}
         ORDER BY u.coins DESC, u.id DESC
         LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`,
        params
      );

      const [totalRows] = await query(`SELECT COUNT(*) as count FROM users u ${whereSql}`, params);

      const [stats] = await query(`
        SELECT 
          COUNT(*) as total_hosts,
          SUM(CASE WHEN host_type = 'video' THEN 1 ELSE 0 END) as video_hosts,
          SUM(CASE WHEN host_type = 'audio' THEN 1 ELSE 0 END) as audio_hosts,
          SUM(CASE WHEN agency_id IS NOT NULL THEN 1 ELSE 0 END) as agency_hosts,
          SUM(CASE WHEN agency_id IS NULL THEN 1 ELSE 0 END) as independent_hosts,
          COALESCE(SUM(coins), 0) as total_host_coins,
          COALESCE(SUM(diamonds), 0) as total_host_diamonds
        FROM users
        WHERE role = 'host'
      `);

      // Combined sum of agency owner coins + total commissions
      const [ownerStats] = await query(`
        SELECT COALESCE(SUM(u.coins), 0) as total_owner_coins
        FROM agencies a
        INNER JOIN users u ON u.id = a.owner_id
      `);
      const [commStats] = await query(`
        SELECT COALESCE(SUM(gt.coin_amount), 0) as total_coins_gifted
        FROM gift_transactions gt
        INNER JOIN users u ON u.id = gt.receiver_id
        WHERE u.role = 'host' AND u.agency_id IS NOT NULL
      `);
      const totalHostCoins = parseInt(stats?.total_host_coins || 0, 10);
      const totalOwnerCoins = parseInt(ownerStats?.total_owner_coins || 0, 10);
      const totalGifted = parseInt(commStats?.total_coins_gifted || 0, 10);
      const totalCommission = Math.round(totalGifted * 0.10);
      const totalCombinedCoins = totalHostCoins + totalOwnerCoins + totalCommission;

      const summaryData = {
        ...(stats || { total_hosts: 0, video_hosts: 0, audio_hosts: 0, agency_hosts: 0, independent_hosts: 0 }),
        total_host_coins: totalHostCoins,
        total_owner_coins: totalOwnerCoins,
        total_commission_coins: totalCommission,
        total_coins: totalCombinedCoins,
        total_host_diamonds: parseInt(stats?.total_host_diamonds || 0, 10),
      };

      return {
        hosts,
        summary: summaryData,
        total: totalRows.count,
      };
    });

    return res.json({
      success: true,
      hosts: data.hosts,
      summary: data.summary,
      pagination: {
        total: data.total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    console.error('getHosts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch hosts.', error: err.message });
  }
}

export async function updateHostDetails(req, res) {
  try {
    const { id } = req.params;
    const { host_type, agency_id } = req.body;

    const updates = [];
    const params = [];

    if (host_type !== undefined) {
      if (!['video', 'audio'].includes(host_type)) {
        return res.status(400).json({ success: false, message: "Host type must be either 'video' or 'audio'." });
      }
      updates.push('host_type = ?');
      params.push(host_type);
    }

    if (agency_id !== undefined) {
      updates.push('agency_id = ?');
      params.push(agency_id ? parseInt(agency_id, 10) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update.' });
    }

    params.push(id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND role = 'host'`, params);

    // Database write succeeded -> Invalidate Redis cache & notify via socket
    await invalidateUserCacheAndNotify(req.io, id, { role: 'host', host_type, agency_id });

    const [updated] = await query(
      `SELECT u.id, u.full_name, u.email, u.host_type, u.agency_id, a.name as agency_name
       FROM users u
       LEFT JOIN agencies a ON u.agency_id = a.id
       WHERE u.id = ?`,
      [id]
    );

    return res.json({
      success: true,
      message: `Host #${id} updated successfully.`,
      host: updated,
    });
  } catch (err) {
    console.error('updateHostDetails error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update host.', error: err.message });
  }
}

export async function getHostRequests(req, res) {
  try {
    const { status, page = 1, limit = 20, search = '' } = req.query;
    const cacheKey = `host_requests:all:${status || 'all'}:${page}:${limit}:${search || ''}`;

    const data = await cache.getOrSet(cacheKey, 15, async () => {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const whereConditions = [];
      const params = [];

      if (status && status !== 'all') {
        whereConditions.push('hr.status = ?');
        params.push(status);
      }

      if (search && search.trim()) {
        whereConditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.id = ? OR a.name LIKE ? OR a.agency_code LIKE ?)');
        const searchPattern = `%${search.trim()}%`;
        params.push(searchPattern, searchPattern, parseInt(search.trim(), 10) || -1, searchPattern, searchPattern);
      }

      const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const baseUnionSql = `
        SELECT 
          ahr.id,
          ahr.user_id,
          ahr.agency_id,
          ahr.host_type,
          ahr.status,
          COALESCE(ahr.message, '') AS notes,
          ahr.created_at,
          ahr.updated_at,
          'agency_host_requests' AS source_table
        FROM agency_host_requests ahr
        UNION ALL
        SELECT 
          hr.id,
          hr.user_id,
          hr.agency_id,
          hr.host_type,
          hr.status,
          COALESCE(hr.notes, '') AS notes,
          hr.created_at,
          hr.updated_at,
          'host_requests' AS source_table
        FROM host_requests hr
        WHERE NOT EXISTS (
          SELECT 1 FROM agency_host_requests ahr2 
          WHERE ahr2.user_id = hr.user_id AND ahr2.agency_id = hr.agency_id AND ahr2.status = hr.status
        )
      `;

      const requests = await query(
        `SELECT 
          hr.id,
          hr.user_id,
          hr.agency_id,
          hr.host_type,
          hr.status,
          hr.notes,
          hr.notes AS message,
          hr.created_at,
          hr.updated_at,
          hr.source_table,
          u.full_name,
          u.email as user_email,
          u.avatar_url as user_avatar,
          u.role as user_role,
          u.coins as user_coins,
          u.diamonds as user_diamonds,
          a.name as agency_name,
          a.agency_code
         FROM (${baseUnionSql}) hr
         JOIN users u ON hr.user_id = u.id
         LEFT JOIN agencies a ON hr.agency_id = a.id
         ${whereSql}
         ORDER BY hr.status = 'pending' DESC, hr.created_at DESC
         LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`,
        params
      );

      const [totalRows] = await query(
        `SELECT COUNT(*) as count 
         FROM (${baseUnionSql}) hr 
         JOIN users u ON hr.user_id = u.id
         LEFT JOIN agencies a ON hr.agency_id = a.id
         ${whereSql}`,
        params
      );

      const [counts] = await query(`
        SELECT 
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_requests
        FROM (${baseUnionSql}) hr
      `);

      return {
        requests,
        summary: {
          total_requests: parseInt(counts?.total_requests || 0, 10),
          pending_requests: parseInt(counts?.pending_requests || 0, 10),
          approved_requests: parseInt(counts?.approved_requests || 0, 10),
          rejected_requests: parseInt(counts?.rejected_requests || 0, 10),
        },
        total: totalRows ? (totalRows.count || 0) : 0,
      };
    });

    return res.json({
      success: true,
      requests: data.requests,
      summary: data.summary,
      pagination: {
        total: data.total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    console.error('getHostRequests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch host requests.', error: err.message });
  }
}

export async function createHostRequest(req, res) {
  try {
    const { userId, agencyId, hostType = 'video', notes = '' } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const [user] = await query('SELECT id, full_name, role FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const cleanHostType = hostType === 'audio' ? 'audio' : 'video';
    const cleanAgencyId = agencyId ? parseInt(agencyId, 10) : null;

    let requestId;
    if (cleanAgencyId) {
      const result = await query(
        `INSERT INTO agency_host_requests (agency_id, user_id, host_type, message, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [cleanAgencyId, userId, cleanHostType, notes]
      );
      requestId = result.insertId;
      await query(
        `INSERT INTO host_requests (user_id, agency_id, host_type, status, notes)
         VALUES (?, ?, ?, 'pending', ?)`,
        [userId, cleanAgencyId, cleanHostType, notes]
      );
      await invalidateAgencyCache(cleanAgencyId);
    } else {
      const result = await query(
        `INSERT INTO host_requests (user_id, agency_id, host_type, status, notes)
         VALUES (?, ?, ?, 'pending', ?)`,
        [userId, cleanAgencyId, cleanHostType, notes]
      );
      requestId = result.insertId;
    }

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('host_requests:*');
    await cache.del(`user:agency_application:${userId}`);

    return res.status(201).json({
      success: true,
      message: `Host request submitted successfully for ${user.full_name || `User #${userId}`}!`,
      requestId,
    });
  } catch (err) {
    console.error('createHostRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create host request.', error: err.message });
  }
}

export async function processHostRequest(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body; // status: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'." });
    }

    // 1. Look for request in agency_host_requests first, then host_requests
    const [agencyReqs] = await connection.execute('SELECT * FROM agency_host_requests WHERE id = ?', [id]);
    let isAgencyReq = agencyReqs.length > 0;
    let hr = isAgencyReq ? agencyReqs[0] : null;

    if (!hr) {
      const [hostReqs] = await connection.execute('SELECT * FROM host_requests WHERE id = ?', [id]);
      if (hostReqs.length > 0) {
        hr = hostReqs[0];
        isAgencyReq = false;
      }
    }

    if (!hr) {
      return res.status(404).json({ success: false, message: 'Host request not found.' });
    }

    if (hr.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Host request has already been ${hr.status}.` });
    }

    await connection.beginTransaction();

    const hostType = hr.host_type || 'video';
    const agencyId = hr.agency_id || null;
    const userId = hr.user_id;

    if (isAgencyReq) {
      await connection.execute(
        `UPDATE agency_host_requests 
         SET status = ?, responded_by = ?, responded_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [status, req.user?.id || null, id]
      );
      // Sync any matching pending row in host_requests
      await connection.execute(
        `UPDATE host_requests 
         SET status = ?, admin_notes = ? 
         WHERE user_id = ? AND status = 'pending'`,
        [status, adminNotes || `Reviewed and ${status} by admin.`, userId]
      );
    } else {
      await connection.execute(
        `UPDATE host_requests 
         SET status = ?, admin_notes = ? 
         WHERE id = ?`,
        [status, adminNotes || `Reviewed and ${status} by admin.`, id]
      );
      // Sync any matching pending row in agency_host_requests
      await connection.execute(
        `UPDATE agency_host_requests 
         SET status = ?, responded_by = ?, responded_at = CURRENT_TIMESTAMP 
         WHERE user_id = ? AND status = 'pending'`,
        [status, req.user?.id || null, userId]
      );
    }

    if (status === 'approved') {
      // Elevate user to host, assign host_type and agency_id
      await connection.execute(
        `UPDATE users 
         SET role = 'host', host_type = ?, agency_id = ?, agency_joined_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [hostType, agencyId, userId]
      );
    }

    await connection.commit();

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('host_requests:*');
    await cache.delByPattern('hosts:*');
    if (agencyId) {
      await invalidateAgencyCache(agencyId);
    }
    await cache.del(`host:agency_summary:${userId}`);
    await cache.del(`user:agency_application:${userId}`);
    await cache.del(`user:${userId}`);
    await cache.del(`user:profile:${userId}`);
    await cache.del(`admin:user:${userId}`);
    await cache.delByPattern('admin:users*');
    await cache.del('agencies:all');

    // Real-time Socket Event & Notifications
    try {
      const io = getLiveIO();
      if (io) {
        io.to(`user_${userId}`).emit('agency:host_request_status_changed', {
          request_id: id,
          status,
          host_type: hostType,
          agency_id: agencyId,
        });
        io.to(`user_${userId}`).emit('new_notification', {
          type: 'host_request_status',
          title: status === 'approved' ? 'Host Application Approved! 🎉' : 'Host Application Update',
          body: status === 'approved'
            ? `Congratulations! Your application has been approved. You are now an official ${hostType.toUpperCase()} Host.`
            : 'Your host application has been reviewed and was not accepted at this time.',
          entity_type: 'host_request',
          entity_id: String(id),
          created_at: new Date().toISOString(),
        });
      }
    } catch (_) {}

    return res.json({
      success: true,
      message: `Host request #${id} has been ${status}. User promoted to ${hostType.toUpperCase()} Host.`,
    });
  } catch (err) {
    await connection.rollback();
    console.error('processHostRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process host request.', error: err.message });
  } finally {
    connection.release();
  }
}

export async function getHostWithdrawalRatios(req, res) {
  try {
    const ratiosData = await cache.getOrSet('host_ratios:all', 300, async () => {
      const settings = await query(
        "SELECT key_name, key_value, description FROM system_settings WHERE key_name IN ('is_convert_to_diamond', 'video_host_diamond_base', 'video_host_taka_amount', 'audio_host_diamond_base', 'audio_host_taka_amount', 'diamond_to_usd_rate', 'min_withdrawal_diamonds', 'withdrawal_presets', 'allow_manual_withdrawal_input')"
      );

      const map = {};
      settings.forEach((s) => {
        map[s.key_name] = s.key_value;
      });

      const isDiamondMode = map['is_convert_to_diamond'] !== 'false';
      const videoBase = parseFloat(map['video_host_diamond_base'] || '100000');
      const videoTaka = parseFloat(map['video_host_taka_amount'] || '5000');
      const audioBase = parseFloat(map['audio_host_diamond_base'] || '100000');
      const audioTaka = parseFloat(map['audio_host_taka_amount'] || '3500');

      const videoRatePerUnit = videoBase > 0 ? (videoTaka / videoBase) : 0.05;
      const audioRatePerUnit = audioBase > 0 ? (audioTaka / audioBase) : 0.035;

      let presets = [1000, 2000, 5000, 10000, 25000, 50000];
      try {
        const rawP = map['withdrawal_presets'];
        if (rawP) {
          presets = typeof rawP === 'string' && rawP.startsWith('[')
            ? JSON.parse(rawP)
            : rawP.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
        }
      } catch (e) {}

      return {
        isDiamondMode,
        currency: isDiamondMode ? 'diamonds' : 'coins',
        unitLabel: isDiamondMode ? 'Diamond' : 'Coin',
        unitSymbol: isDiamondMode ? '💎' : '🪙',
        video: {
          baseAmount: videoBase,
          diamondBase: videoBase,
          coinBase: videoBase,
          takaAmount: videoTaka,
          ratePerUnit: parseFloat(videoRatePerUnit.toFixed(6)),
          ratePerDiamond: parseFloat(videoRatePerUnit.toFixed(6)),
          ratePerCoin: parseFloat(videoRatePerUnit.toFixed(6)),
          currency: 'BDT',
        },
        audio: {
          baseAmount: audioBase,
          diamondBase: audioBase,
          coinBase: audioBase,
          takaAmount: audioTaka,
          ratePerUnit: parseFloat(audioRatePerUnit.toFixed(6)),
          ratePerDiamond: parseFloat(audioRatePerUnit.toFixed(6)),
          ratePerCoin: parseFloat(audioRatePerUnit.toFixed(6)),
          currency: 'BDT',
        },
        minWithdrawalAmount: parseInt(map['min_withdrawal_diamonds'] || '1000', 10),
        minWithdrawalDiamonds: parseInt(map['min_withdrawal_diamonds'] || '1000', 10),
        minWithdrawalCoins: parseInt(map['min_withdrawal_diamonds'] || '1000', 10),
        usdRate: parseFloat(map['diamond_to_usd_rate'] || '0.005'),
        withdrawalPresets: presets,
        allowManualInput: map['allow_manual_withdrawal_input'] !== 'false',
      };
    });

    return res.json({
      success: true,
      ratios: ratiosData,
    });
  } catch (err) {
    console.error('getHostWithdrawalRatios error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch withdrawal ratios.', error: err.message });
  }
}

export async function updateHostWithdrawalRatios(req, res) {
  try {
    const {
      videoBase,
      videoTaka,
      audioBase,
      audioTaka,
      minWithdrawalDiamonds,
      minWithdrawalCoins,
      minWithdrawalAmount,
      withdrawalPresets,
      allowManualInput,
      usdRate,
    } = req.body;

    const minAmount = minWithdrawalDiamonds !== undefined 
      ? minWithdrawalDiamonds 
      : (minWithdrawalCoins !== undefined ? minWithdrawalCoins : minWithdrawalAmount);

    if (videoBase !== undefined && videoTaka !== undefined) {
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('video_host_diamond_base', ?, 'Video host diamond base count')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [String(videoBase)]
      );
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('video_host_taka_amount', ?, 'Video host payout amount in BDT')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [String(videoTaka)]
      );
    }

    if (audioBase !== undefined && audioTaka !== undefined) {
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('audio_host_diamond_base', ?, 'Audio host diamond base count')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [String(audioBase)]
      );
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('audio_host_taka_amount', ?, 'Audio host payout amount in BDT')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [String(audioTaka)]
      );
    }

    if (minAmount !== undefined) {
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('min_withdrawal_diamonds', ?, 'Minimum balance required to request cashout')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [String(minAmount)]
      );
    }

    if (withdrawalPresets !== undefined) {
      const presetsVal = Array.isArray(withdrawalPresets) ? JSON.stringify(withdrawalPresets) : String(withdrawalPresets);
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('withdrawal_presets', ?, 'Preset diamond cashout options for hosts')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [presetsVal]
      );
    }

    if (allowManualInput !== undefined) {
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('allow_manual_withdrawal_input', ?, 'Whether users/hosts can input custom diamond amount for withdrawal')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [allowManualInput ? 'true' : 'false']
      );
    }

    if (usdRate !== undefined) {
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('diamond_to_usd_rate', ?, 'Conversion rate: USD per 1 diamond for host payouts')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [String(usdRate)]
      );
    }

    // Database write succeeded -> Invalidate Redis cache & immediately pre-warm with fresh DB state
    await invalidateWalletWithdrawalCache(req.io);

    return res.json({
      success: true,
      message: 'Host withdrawal settings & conversion ratios updated successfully!',
    });
  } catch (err) {
    console.error('updateHostWithdrawalRatios error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update ratios.', error: err.message });
  }
}

// ==========================================
// RESELLER MANAGEMENT CONTROLLERS
// ==========================================

export async function getResellers(req, res) {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const cacheKey = `resellers:all:${search || ''}:${page}:${limit}`;

    const data = await cache.getOrSet(cacheKey, 30, async () => {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const conditions = ["u.role = 'reseller'"];
      const params = [];

      if (search) {
        const cleanSearch = String(search).trim().replace(/^#/, '');
        const isNumeric = !isNaN(cleanSearch) && cleanSearch !== '';
        if (isNumeric) {
          conditions.push('u.id = ?');
          params.push(parseInt(cleanSearch, 10));
        } else {
          conditions.push('(u.full_name LIKE ? OR u.email LIKE ?)');
          const s = `%${cleanSearch}%`;
          params.push(s, s);
        }
      }

      const whereSql = `WHERE ${conditions.join(' AND ')}`;

      const resellers = await query(`
        SELECT 
          u.id, u.email, u.full_name, u.avatar_url, u.bio, u.role, u.coins, u.diamonds,
          u.level, u.vip_package, u.is_banned, u.created_at,
          COALESCE(rs_all.total_coins, 0) as lifetime_coins_sold,
          COALESCE(rs_all.total_revenue, 0) as lifetime_revenue,
          COALESCE(rs_all.sales_count, 0) as lifetime_sales_count,
          COALESCE(rs_month.month_coins, 0) as this_month_coins_sold,
          COALESCE(rs_month.month_revenue, 0) as this_month_revenue,
          COALESCE(rs_week.week_coins, 0) as this_week_coins_sold,
          COALESCE(rs_week.week_revenue, 0) as this_week_revenue
        FROM users u
        LEFT JOIN (
          SELECT reseller_id, SUM(coin_amount) as total_coins, SUM(price_amount) as total_revenue, COUNT(*) as sales_count
          FROM reseller_sales
          GROUP BY reseller_id
        ) rs_all ON rs_all.reseller_id = u.id
        LEFT JOIN (
          SELECT reseller_id, SUM(coin_amount) as month_coins, SUM(price_amount) as month_revenue
          FROM reseller_sales
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY reseller_id
        ) rs_month ON rs_month.reseller_id = u.id
        LEFT JOIN (
          SELECT reseller_id, SUM(coin_amount) as week_coins, SUM(price_amount) as week_revenue
          FROM reseller_sales
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          GROUP BY reseller_id
        ) rs_week ON rs_week.reseller_id = u.id
        ${whereSql}
        ORDER BY lifetime_coins_sold DESC, u.id DESC
        LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}
      `, params);

      const [totalRows] = await query(`SELECT COUNT(*) as count FROM users u ${whereSql}`, params);

      const [summaryStats] = await query(`
        SELECT 
          COUNT(DISTINCT u.id) as total_resellers,
          COALESCE(SUM(rs.coin_amount), 0) as total_coins_sold_all_time,
          COALESCE(SUM(rs.price_amount), 0) as total_revenue_all_time,
          COALESCE(SUM(CASE WHEN rs.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN rs.coin_amount ELSE 0 END), 0) as this_month_coins_sold,
          COALESCE(SUM(CASE WHEN rs.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN rs.price_amount ELSE 0 END), 0) as this_month_revenue,
          COALESCE(SUM(CASE WHEN rs.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN rs.coin_amount ELSE 0 END), 0) as this_week_coins_sold,
          COALESCE(SUM(CASE WHEN rs.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN rs.price_amount ELSE 0 END), 0) as this_week_revenue
        FROM users u
        LEFT JOIN reseller_sales rs ON rs.reseller_id = u.id
        WHERE u.role = 'reseller'
      `);

      return {
        resellers,
        summary: summaryStats || {
          total_resellers: 0,
          total_coins_sold_all_time: 0,
          total_revenue_all_time: 0,
          this_month_coins_sold: 0,
          this_month_revenue: 0,
          this_week_coins_sold: 0,
          this_week_revenue: 0,
        },
        total: totalRows.count,
      };
    });

    return res.json({
      success: true,
      resellers: data.resellers,
      summary: data.summary,
      pagination: {
        total: data.total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    console.error('getResellers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch resellers.', error: err.message });
  }
}

export async function assignReseller(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const { userId, email, password, full_name, initialCoins = 0 } = req.body;

    await connection.beginTransaction();

    let targetUserId = userId;

    if (!targetUserId) {
      if (!email || !password) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Provide an existing User ID, or provide email and password to create a new reseller.',
        });
      }

      const [existing] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const [insertRes] = await connection.execute(
        `INSERT INTO users (email, password_hash, full_name, role, coins, level)
         VALUES (?, ?, ?, 'reseller', ?, 10)`,
        [email, password_hash, full_name || 'Reseller', parseInt(initialCoins, 10) || 0]
      );
      targetUserId = insertRes.insertId;
    } else {
      const [userRows] = await connection.execute('SELECT id, full_name, role FROM users WHERE id = ?', [targetUserId]);
      if (userRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      await connection.execute("UPDATE users SET role = 'reseller' WHERE id = ?", [targetUserId]);
      if (initialCoins && parseInt(initialCoins, 10) > 0) {
        await connection.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [parseInt(initialCoins, 10), targetUserId]);
      }
    }

    await connection.commit();

    // Database write succeeded -> Invalidate Redis cache & notify via socket
    await invalidateUserCacheAndNotify(req.io, targetUserId, { role: 'reseller' });

    const [updatedUser] = await connection.execute(
      'SELECT id, email, full_name, role, coins, level FROM users WHERE id = ?',
      [targetUserId]
    );

    return res.status(201).json({
      success: true,
      message: `User #${targetUserId} successfully promoted to Official Reseller!`,
      reseller: updatedUser[0],
    });
  } catch (err) {
    await connection.rollback();
    console.error('assignReseller error:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign reseller.', error: err.message });
  } finally {
    connection.release();
  }
}

export async function deleteReseller(req, res) {
  try {
    const { id } = req.params;

    const userRows = await query('SELECT id, full_name, role FROM users WHERE id = ?', [id]);
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const targetUser = userRows[0];

    // Demote role back to 'user'
    await query("UPDATE users SET role = 'user' WHERE id = ? AND role = 'reseller'", [id]);

    // Database write succeeded -> Invalidate Redis cache & notify via socket
    await invalidateUserCacheAndNotify(req.io, id, { role: 'user' });

    return res.json({
      success: true,
      message: `Reseller status revoked for User #${id} (${targetUser.full_name || 'User'}). Demoted to regular user.`,
    });
  } catch (err) {
    console.error('deleteReseller error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete reseller.', error: err.message });
  }
}

export async function getResellerSales(req, res) {
  try {
    const { resellerId, period = 'all', search, page = 1, limit = 50 } = req.query;
    const cacheKey = `reseller_sales:all:${resellerId || 'all'}:${period || 'all'}:${search || ''}:${page}:${limit}`;

    const data = await cache.getOrSet(cacheKey, 30, async () => {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const conditions = [];
      const params = [];

      const isSpecificReseller = resellerId && resellerId !== 'all' && !isNaN(parseInt(resellerId, 10));
      if (isSpecificReseller) {
        conditions.push('rs.reseller_id = ?');
        params.push(parseInt(resellerId, 10));
      }

      if (period === 'week') {
        conditions.push('rs.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
      } else if (period === 'month') {
        conditions.push('rs.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
      }

      if (search) {
        const clean = String(search).trim().replace(/^#/, '');
        const isNum = !isNaN(clean) && clean !== '';
        if (isNum) {
          conditions.push('(rs.id = ? OR rs.buyer_id = ? OR rs.reseller_id = ?)');
          const n = parseInt(clean, 10);
          params.push(n, n, n);
        } else {
          conditions.push('(u_buy.full_name LIKE ? OR u_buy.email LIKE ? OR u_res.full_name LIKE ? OR rs.notes LIKE ?)');
          const s = `%${clean}%`;
          params.push(s, s, s, s);
        }
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const sales = await query(
        `SELECT 
          rs.*,
          u_res.full_name as reseller_name,
          u_res.avatar_url as reseller_avatar,
          u_buy.full_name as buyer_name,
          u_buy.email as buyer_email,
          u_buy.avatar_url as buyer_avatar
         FROM reseller_sales rs
         LEFT JOIN users u_res ON rs.reseller_id = u_res.id
         LEFT JOIN users u_buy ON rs.buyer_id = u_buy.id
         ${whereSql}
         ORDER BY rs.created_at DESC
         LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`,
        params
      );

      const [totalRows] = await query(`
        SELECT COUNT(*) as count 
        FROM reseller_sales rs 
        LEFT JOIN users u_res ON rs.reseller_id = u_res.id
        LEFT JOIN users u_buy ON rs.buyer_id = u_buy.id
        ${whereSql}
      `, params);

      // Summary calculations
      const summaryConditions = isSpecificReseller ? ['reseller_id = ?'] : [];
      const summaryParams = isSpecificReseller ? [parseInt(resellerId, 10)] : [];
      const summaryWhere = summaryConditions.length > 0 ? `WHERE ${summaryConditions.join(' AND ')}` : '';

      const [periodStats] = await query(`
        SELECT 
          COUNT(*) as total_sales_count,
          COALESCE(SUM(coin_amount), 0) as total_coins_sold,
          COALESCE(SUM(price_amount), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN coin_amount ELSE 0 END), 0) as month_coins_sold,
          COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN price_amount ELSE 0 END), 0) as month_revenue,
          COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN coin_amount ELSE 0 END), 0) as week_coins_sold,
          COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN price_amount ELSE 0 END), 0) as week_revenue
        FROM reseller_sales
        ${summaryWhere}
      `, summaryParams);

      return {
        sales,
        summary: periodStats || {
          total_sales_count: 0,
          total_coins_sold: 0,
          total_revenue: 0,
          month_coins_sold: 0,
          month_revenue: 0,
          week_coins_sold: 0,
          week_revenue: 0,
        },
        total: totalRows.count,
      };
    });

    return res.json({
      success: true,
      sales: data.sales,
      summary: data.summary,
      pagination: {
        total: data.total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    console.error('getResellerSales error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reseller sales.', error: err.message });
  }
}

export async function recordResellerSale(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const { resellerId, buyerId, coinAmount, priceAmount = 0, currency = 'BDT', notes = '' } = req.body;

    const coins = parseInt(coinAmount, 10);
    if (!resellerId || !buyerId || !coins || coins <= 0) {
      return res.status(400).json({ success: false, message: 'Valid Reseller ID, Buyer ID, and positive coin amount are required.' });
    }

    const [resellers] = await connection.execute("SELECT id, full_name, coins FROM users WHERE id = ? AND role = 'reseller'", [resellerId]);
    if (resellers.length === 0) {
      return res.status(404).json({ success: false, message: 'Reseller not found.' });
    }

    if (resellers[0].coins < coins) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coins in reseller stock! Reseller #${resellerId} only has ${resellers[0].coins.toLocaleString()} coins.`,
      });
    }

    const [buyers] = await connection.execute('SELECT id, full_name FROM users WHERE id = ?', [buyerId]);
    if (buyers.length === 0) {
      return res.status(404).json({ success: false, message: 'Buyer user not found.' });
    }

    await connection.beginTransaction();

    // 1. Deduct from reseller
    await connection.execute('UPDATE users SET coins = coins - ? WHERE id = ?', [coins, resellerId]);

    // 2. Add to buyer
    await connection.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [coins, buyerId]);

    // 3. Record in reseller_sales
    const [saleRes] = await connection.execute(
      `INSERT INTO reseller_sales (reseller_id, buyer_id, coin_amount, price_amount, currency, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [resellerId, buyerId, coins, parseFloat(priceAmount) || 0, currency, notes]
    );

    // 4. Record transactions for ledger
    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'coin_purchase', ?, ?, 'completed')`,
      [buyerId, coins, `Purchased ${coins.toLocaleString()} coins from Reseller #${resellerId} (${resellers[0].full_name || 'Reseller'})`]
    );

    await connection.commit();

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('reseller_sales:*');
    await cache.delByPattern('resellers:*');
    await cache.del(`user:${resellerId}`);
    await cache.del(`user:balance:${resellerId}`);
    await cache.del(`admin:user:${resellerId}`);
    await cache.del(`user:${buyerId}`);
    await cache.del(`user:balance:${buyerId}`);
    await cache.del(`admin:user:${buyerId}`);
    await cache.delByPattern('admin:users*');

    return res.status(201).json({
      success: true,
      message: `Successfully transferred ${coins.toLocaleString()} coins from Reseller #${resellerId} to User #${buyerId} (${buyers[0].full_name})!`,
      saleId: saleRes.insertId,
    });
  } catch (err) {
    await connection.rollback();
    console.error('recordResellerSale error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record reseller sale.', error: err.message });
  } finally {
    connection.release();
  }
}

export async function deleteResellerSale(req, res) {
  try {
    const { id } = req.params;
    const saleId = parseInt(id, 10);
    if (!saleId || isNaN(saleId)) {
      return res.status(400).json({ success: false, message: 'Invalid sale transaction ID.' });
    }

    const [existing] = await query('SELECT id FROM reseller_sales WHERE id = ?', [saleId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: `Sale transaction #${saleId} not found.` });
    }

    await query('DELETE FROM reseller_sales WHERE id = ?', [saleId]);

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('reseller_sales:*');
    await cache.delByPattern('resellers:*');

    return res.json({
      success: true,
      message: `Sale transaction #${saleId} deleted successfully.`,
    });
  } catch (err) {
    console.error('deleteResellerSale error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete sale transaction.', error: err.message });
  }
}

export async function clearResellerSales(req, res) {
  try {
    const { resellerId } = req.query;
    let deleteSql = 'DELETE FROM reseller_sales';
    const params = [];

    const isSpecificReseller = resellerId && resellerId !== 'all' && !isNaN(parseInt(resellerId, 10));
    if (isSpecificReseller) {
      deleteSql += ' WHERE reseller_id = ?';
      params.push(parseInt(resellerId, 10));
    }

    const result = await query(deleteSql, params);

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('reseller_sales:*');
    await cache.delByPattern('resellers:*');

    return res.json({
      success: true,
      message: isSpecificReseller
        ? `Cleaned all transactions for Reseller #${resellerId} (${result.affectedRows || 0} records deleted).`
        : `Cleaned all reseller transactions (${result.affectedRows || 0} records deleted).`,
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error('clearResellerSales error:', err);
    return res.status(500).json({ success: false, message: 'Failed to clean reseller transactions.', error: err.message });
  }
}

// ==========================================
// COIN RECHARGE PACKAGES & PRESETS (ADMIN)
// ==========================================

export async function getCoinPackagesAdmin(req, res) {
  try {
    const data = await cache.getOrSet('admin:coin_packages', 60, async () => {
      const [packages, settings] = await Promise.all([
        query('SELECT * FROM coin_packages ORDER BY price_usd ASC'),
        query("SELECT key_value FROM system_settings WHERE key_name = 'recharge_presets'"),
      ]);

      let presets = [500, 1000, 2500, 5000, 10000, 50000, 100000];
      try {
        const raw = settings[0]?.key_value;
        if (raw) {
          presets = typeof raw === 'string' && raw.startsWith('[')
            ? JSON.parse(raw)
            : raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
        }
      } catch (e) {}

      return {
        packages: packages || [],
        quickPresets: presets,
      };
    });

    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('getCoinPackagesAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch coin packages.' });
  }
}

export async function createCoinPackageAdmin(req, res) {
  try {
    const { name, coins, price_usd, bonus_coins, badge, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Package name is required.' });
    }

    const coinCount = parseInt(coins, 10);
    if (isNaN(coinCount) || coinCount <= 0) {
      return res.status(400).json({ success: false, message: 'Coins amount must be greater than 0.' });
    }

    const price = parseFloat(price_usd);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: 'Price USD must be a valid positive number.' });
    }

    const bonus = parseInt(bonus_coins || 0, 10) || 0;
    const active = is_active === undefined ? 1 : (is_active ? 1 : 0);
    const badgeText = badge ? String(badge).trim() : '';

    const result = await query(
      `INSERT INTO coin_packages (name, coins, price_usd, bonus_coins, badge, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), coinCount, price, bonus, badgeText, active]
    );

    // Database write succeeded -> Invalidate Redis cache
    await cache.del('wallet:packages');
    await cache.del('admin:coin_packages');
    await cache.del('wallet:recharge:config');
    await cache.del('config:mobile:app');

    const [newPkg] = await query('SELECT * FROM coin_packages WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: `Coin recharge package "${name}" created successfully!`,
      package: newPkg,
    });
  } catch (err) {
    console.error('createCoinPackageAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create coin package.', error: err.message });
  }
}

export async function updateCoinPackageAdmin(req, res) {
  try {
    const { id } = req.params;
    const pkgId = parseInt(id, 10);
    if (!pkgId || isNaN(pkgId)) {
      return res.status(400).json({ success: false, message: 'Invalid package ID.' });
    }

    const [existing] = await query('SELECT * FROM coin_packages WHERE id = ?', [pkgId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Coin package not found.' });
    }

    const { name, coins, price_usd, bonus_coins, badge, is_active } = req.body;

    const newName = name !== undefined ? String(name).trim() : existing.name;
    const newCoins = coins !== undefined ? parseInt(coins, 10) : existing.coins;
    const newPrice = price_usd !== undefined ? parseFloat(price_usd) : existing.price_usd;
    const newBonus = bonus_coins !== undefined ? parseInt(bonus_coins, 10) : existing.bonus_coins;
    const newBadge = badge !== undefined ? String(badge).trim() : existing.badge;
    const newActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

    await query(
      `UPDATE coin_packages 
       SET name = ?, coins = ?, price_usd = ?, bonus_coins = ?, badge = ?, is_active = ?
       WHERE id = ?`,
      [newName, newCoins, newPrice, newBonus, newBadge, newActive, pkgId]
    );

    // Database write succeeded -> Invalidate Redis cache
    await cache.del('wallet:packages');
    await cache.del('admin:coin_packages');
    await cache.del('wallet:recharge:config');
    await cache.del('config:mobile:app');

    const [updated] = await query('SELECT * FROM coin_packages WHERE id = ?', [pkgId]);

    return res.json({
      success: true,
      message: `Coin recharge package #${pkgId} updated successfully!`,
      package: updated,
    });
  } catch (err) {
    console.error('updateCoinPackageAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update coin package.', error: err.message });
  }
}

export async function deleteCoinPackageAdmin(req, res) {
  try {
    const { id } = req.params;
    const pkgId = parseInt(id, 10);
    if (!pkgId || isNaN(pkgId)) {
      return res.status(400).json({ success: false, message: 'Invalid package ID.' });
    }

    const [existing] = await query('SELECT * FROM coin_packages WHERE id = ?', [pkgId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Coin package not found.' });
    }

    await query('DELETE FROM coin_packages WHERE id = ?', [pkgId]);

    // Database write succeeded -> Invalidate Redis cache
    await cache.del('wallet:packages');
    await cache.del('admin:coin_packages');
    await cache.del('wallet:recharge:config');
    await cache.del('config:mobile:app');

    return res.json({
      success: true,
      message: `Coin recharge package "${existing.name}" deleted successfully.`,
      deletedId: pkgId,
    });
  } catch (err) {
    console.error('deleteCoinPackageAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete coin package.', error: err.message });
  }
}

export async function toggleCoinPackageAdmin(req, res) {
  try {
    const { id } = req.params;
    const pkgId = parseInt(id, 10);
    if (!pkgId || isNaN(pkgId)) {
      return res.status(400).json({ success: false, message: 'Invalid package ID.' });
    }

    const [existing] = await query('SELECT * FROM coin_packages WHERE id = ?', [pkgId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Coin package not found.' });
    }

    const newStatus = existing.is_active ? 0 : 1;
    await query('UPDATE coin_packages SET is_active = ? WHERE id = ?', [newStatus, pkgId]);

    // Database write succeeded -> Invalidate Redis cache
    await cache.del('wallet:packages');
    await cache.del('admin:coin_packages');
    await cache.del('wallet:recharge:config');
    await cache.del('config:mobile:app');

    return res.json({
      success: true,
      message: `Package #${pkgId} is now ${newStatus ? 'active' : 'inactive'}.`,
      is_active: newStatus,
    });
  } catch (err) {
    console.error('toggleCoinPackageAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle package status.', error: err.message });
  }
}

export async function getRechargePresetsAdmin(req, res) {
  try {
    const rows = await query("SELECT key_value FROM system_settings WHERE key_name = 'recharge_presets'");
    let presets = [500, 1000, 2500, 5000, 10000, 50000, 100000];
    try {
      const raw = rows[0]?.key_value;
      if (raw) {
        presets = typeof raw === 'string' && raw.startsWith('[')
          ? JSON.parse(raw)
          : raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      }
    } catch (e) {}

    return res.json({ success: true, presets });
  } catch (err) {
    console.error('getRechargePresetsAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch recharge presets.' });
  }
}

export async function updateRechargePresetsAdmin(req, res) {
  try {
    const { presets } = req.body;
    let cleanPresets = [500, 1000, 2500, 5000, 10000, 50000, 100000];

    if (Array.isArray(presets)) {
      cleanPresets = presets.map((p) => parseInt(p, 10)).filter((p) => !isNaN(p) && p > 0);
    } else if (typeof presets === 'string') {
      cleanPresets = presets.split(',').map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p) && p > 0);
    }

    await query(
      `INSERT INTO system_settings (key_name, key_value, description)
       VALUES ('recharge_presets', ?, 'Quick preset coin amounts for wallet recharge')
       ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
      [JSON.stringify(cleanPresets)]
    );

    // Database write succeeded -> Invalidate Redis cache
    await cache.del('admin:coin_packages');
    await cache.del('wallet:recharge:config');
    await cache.del('config:mobile:app');
    await cache.del('settings:all');

    return res.json({
      success: true,
      message: 'Recharge quick presets updated successfully!',
      presets: cleanPresets,
    });
  } catch (err) {
    console.error('updateRechargePresetsAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update recharge presets.', error: err.message });
  }
}

// ==========================================
// WITHDRAWAL CONFIGURATION (ADMIN)
// ==========================================

export async function getWithdrawalConfigAdmin(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const rows = await query(
      `SELECT key_name, key_value, description FROM system_settings WHERE key_name IN (
        'is_convert_to_diamond', 'diamond_to_usd_rate', 'min_withdrawal_diamonds', 'withdrawal_presets', 'allow_manual_withdrawal_input',
        'video_host_withdrawal_enabled', 'video_host_diamond_base', 'video_host_taka_amount', 'video_host_min_withdrawal',
        'audio_host_withdrawal_enabled', 'audio_host_diamond_base', 'audio_host_taka_amount', 'audio_host_min_withdrawal',
        'user_withdrawal_enabled', 'user_diamond_base', 'user_taka_amount', 'user_min_withdrawal',
        'agency_withdrawal_enabled', 'agency_diamond_base', 'agency_taka_amount', 'agency_min_withdrawal',
        'reseller_withdrawal_enabled', 'reseller_diamond_base', 'reseller_taka_amount', 'reseller_min_withdrawal',
        'moderator_withdrawal_enabled', 'moderator_diamond_base', 'moderator_taka_amount', 'moderator_min_withdrawal'
      )`
    );
    const map = {};
    rows.forEach((r) => { map[r.key_name] = r.key_value; });

    const isDiamondMode = map['is_convert_to_diamond'] === 'true' || map['is_convert_to_diamond'] === '1';
    const minWithdrawal = parseInt(map['min_withdrawal_diamonds'] || '1000', 10);
    const allowManualInput = map['allow_manual_withdrawal_input'] !== 'false';
    let presets = [1000, 2000, 5000, 10000, 25000, 50000];
    try {
      const rawP = map['withdrawal_presets'];
      if (rawP) {
        presets = typeof rawP === 'string' && rawP.startsWith('[')
          ? JSON.parse(rawP)
          : rawP.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      }
    } catch (e) {}

    const usdRate = parseFloat(map['diamond_to_usd_rate'] || '0.005');

    const parseAdminRoleRate = (prefix, defaultName, defaultBase, defaultTaka, defaultMin, defaultEnabled = true) => {
      const isEnabled = map[`${prefix}_withdrawal_enabled`] !== undefined 
        ? (map[`${prefix}_withdrawal_enabled`] === 'true' || map[`${prefix}_withdrawal_enabled`] === '1') 
        : defaultEnabled;
      const base = parseFloat(map[`${prefix}_diamond_base`] || String(defaultBase));
      const taka = parseFloat(map[`${prefix}_taka_amount`] || String(defaultTaka));
      const minAmt = parseInt(map[`${prefix}_min_withdrawal`] || String(defaultMin), 10);
      const ratePerUnit = base > 0 ? parseFloat((taka / base).toFixed(6)) : parseFloat((defaultTaka / defaultBase).toFixed(6));

      return {
        roleKey: prefix,
        label: defaultName,
        isEnabled,
        diamondBase: base,
        coinBase: base,
        takaAmount: taka,
        ratePerUnit,
        ratePerDiamond: ratePerUnit,
        minWithdrawal: minAmt,
        currency: 'BDT',
      };
    };

    const rates = {
      video: parseAdminRoleRate('video_host', 'Video Host', 100000, 5000, minWithdrawal, true),
      audio: parseAdminRoleRate('audio_host', 'Audio Host', 100000, 3500, minWithdrawal, true),
      user: parseAdminRoleRate('user', 'Normal User', 100000, 4000, minWithdrawal, true),
      agency: parseAdminRoleRate('agency', 'Agency Partner', 100000, 6000, 5000, true),
      reseller: parseAdminRoleRate('reseller', 'Coin / Diamond Reseller', 100000, 5500, 5000, true),
      moderator: parseAdminRoleRate('moderator', 'Platform Moderator', 100000, 4500, minWithdrawal, true),
    };

    return res.json({
      success: true,
      config: {
        is_convert_to_diamond: isDiamondMode,
        isDiamondMode,
        withdrawal_currency: isDiamondMode ? 'diamonds' : 'coins',
        currency_symbol: isDiamondMode ? '💎' : '🪙',
        currency_label: isDiamondMode ? 'Diamond' : 'Coin',
        minWithdrawalDiamonds: minWithdrawal,
        withdrawalPresets: presets,
        allowManualInput,
        diamondToUsdRate: usdRate,
        rates,
      },
    });
  } catch (err) {
    console.error('getWithdrawalConfigAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch withdrawal configuration.' });
  }
}

export async function updateWithdrawalConfigAdmin(req, res) {
  try {
    const {
      is_convert_to_diamond,
      isDiamondMode,
      minWithdrawalDiamonds,
      withdrawalPresets,
      allowManualInput,
      diamondToUsdRate,
      videoBase,
      videoTaka,
      audioBase,
      audioTaka,
      rates,
    } = req.body;

    if (is_convert_to_diamond !== undefined || isDiamondMode !== undefined) {
      const modeVal = is_convert_to_diamond !== undefined ? is_convert_to_diamond : isDiamondMode;
      const isTrue = modeVal === true || modeVal === 'true' || modeVal === 1 || modeVal === '1';
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('is_convert_to_diamond', ?, 'Toggle between Coin and Diamond economy mode')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [isTrue ? 'true' : 'false']
      );
      await cache.del('setting:is_convert_to_diamond');
    }

    if (minWithdrawalDiamonds !== undefined) {
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('min_withdrawal_diamonds', ?, 'Minimum diamond/coin balance required to request cashout')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [String(minWithdrawalDiamonds)]
      );
    }

    if (withdrawalPresets !== undefined) {
      let cleanPresets = [1000, 2000, 5000, 10000, 25000, 50000];
      if (Array.isArray(withdrawalPresets)) {
        cleanPresets = withdrawalPresets.map((p) => parseInt(p, 10)).filter((p) => !isNaN(p) && p > 0);
      } else if (typeof withdrawalPresets === 'string') {
        cleanPresets = withdrawalPresets.split(',').map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p) && p > 0);
      }
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('withdrawal_presets', ?, 'Preset diamond/coin cashout options for hosts')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [JSON.stringify(cleanPresets)]
      );
    }

    if (allowManualInput !== undefined) {
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('allow_manual_withdrawal_input', ?, 'Whether users/hosts can input custom diamond/coin amount for withdrawal')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [allowManualInput ? 'true' : 'false']
      );
    }

    if (diamondToUsdRate !== undefined) {
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('diamond_to_usd_rate', ?, 'Conversion rate: USD per 1 diamond/coin for host payouts')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [String(diamondToUsdRate)]
      );
    }

    // Direct video/audio fields if sent
    if (videoBase !== undefined && videoTaka !== undefined) {
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('video_host_diamond_base', ?, 'Video host diamond base count')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [String(videoBase)]
      );
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('video_host_taka_amount', ?, 'Video host payout amount in BDT')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [String(videoTaka)]
      );
    }

    if (audioBase !== undefined && audioTaka !== undefined) {
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('audio_host_diamond_base', ?, 'Audio host diamond base count')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [String(audioBase)]
      );
      await query(
        `INSERT INTO system_settings (key_name, key_value, description)
         VALUES ('audio_host_taka_amount', ?, 'Audio host payout amount in BDT')
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [String(audioTaka)]
      );
    }

    // Comprehensive role rates dictionary
    if (rates && typeof rates === 'object') {
      const rolePrefixMap = {
        video: 'video_host',
        audio: 'audio_host',
        user: 'user',
        agency: 'agency',
        reseller: 'reseller',
        moderator: 'moderator',
      };

      for (const [k, prefix] of Object.entries(rolePrefixMap)) {
        const item = rates[k];
        if (!item) continue;

        if (item.isEnabled !== undefined || item.is_enabled !== undefined) {
          const val = item.isEnabled !== undefined ? item.isEnabled : item.is_enabled;
          await query(
            `INSERT INTO system_settings (key_name, key_value, description)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
            [`${prefix}_withdrawal_enabled`, val ? 'true' : 'false', `Withdrawal enabled for ${k}`]
          );
        }

        const baseVal = item.diamondBase || item.diamond_base || item.coinBase || item.coin_base;
        if (baseVal !== undefined) {
          await query(
            `INSERT INTO system_settings (key_name, key_value, description)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
            [`${prefix}_diamond_base`, String(baseVal), `${k} diamond/coin base count`]
          );
        }

        const takaVal = item.takaAmount || item.taka_amount;
        if (takaVal !== undefined) {
          await query(
            `INSERT INTO system_settings (key_name, key_value, description)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
            [`${prefix}_taka_amount`, String(takaVal), `${k} payout amount in BDT`]
          );
        }

        const minVal = item.minWithdrawal || item.min_amount || item.min_withdrawal;
        if (minVal !== undefined) {
          await query(
            `INSERT INTO system_settings (key_name, key_value, description)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
            [`${prefix}_min_withdrawal`, String(minVal), `${k} minimum withdrawal amount`]
          );
        }
      }
    }

    // Database write succeeded -> Invalidate Redis cache & immediately pre-warm with fresh DB state
    await invalidateWalletWithdrawalCache(req.io);

    return res.json({
      success: true,
      message: 'Role-based withdrawal rules, rates & thresholds saved successfully!',
    });
  } catch (err) {
    console.error('updateWithdrawalConfigAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update withdrawal configuration.', error: err.message });
  }
}

/**
 * Real-Time Socket & Message Tester: Get users with instant test tokens (supports search)
 */
export async function getChatTesterUsers(req, res) {
  try {
    const search = (req.query.search || '').trim();
    let sql = `
      SELECT id, full_name, email, role, avatar_url, level, star, is_banned
      FROM users
    `;
    const params = [];

    if (search) {
      const isNum = !isNaN(search) && parseInt(search, 10) > 0;
      if (isNum) {
        sql += ' WHERE id = ? OR full_name LIKE ? OR email LIKE ?';
        params.push(parseInt(search, 10), `%${search}%`, `%${search}%`);
      } else {
        sql += ' WHERE full_name LIKE ? OR email LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
      }
    }

    sql += ' ORDER BY id ASC LIMIT 50';

    const users = await query(sql, params);

    const usersWithTokens = users.map(u => ({
      ...u,
      token: signToken({ id: u.id, role: u.role, username: u.full_name }),
    }));

    return res.json({
      success: true,
      users: usersWithTokens,
    });
  } catch (err) {
    console.error('getChatTesterUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch test users.', error: err.message });
  }
}

/**
 * Real-Time Socket & Message Tester: Get or create conversation between Admin and Mobile User
 */
export async function getChatTesterConversation(req, res) {
  try {
    const adminId = req.user?.id || 1;
    const partnerId = parseInt(req.query.user_id, 10);
    if (!partnerId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const [partner] = await query(
      'SELECT id, full_name, email, role, avatar_url, level, star FROM users WHERE id = ?',
      [partnerId]
    );
    if (!partner) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const u1 = Math.min(adminId, partnerId);
    const u2 = Math.max(adminId, partnerId);

    const convRows = await query(
      'SELECT * FROM conversations WHERE user1_id = ? AND user2_id = ? LIMIT 1',
      [u1, u2]
    );

    let conversationId;
    let conv;
    if (convRows && convRows.length > 0) {
      conv = convRows[0];
      conversationId = conv.id;
    } else {
      const ins = await query(
        'INSERT INTO conversations (user1_id, user2_id, last_message, last_message_at) VALUES (?, ?, ?, NOW())',
        [u1, u2, 'Started conversation']
      );
      conversationId = ins.insertId;
      conv = { id: conversationId, user1_id: u1, user2_id: u2 };
    }

    const messages = await query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id, m.message_type, m.message, m.media_url, m.is_read, m.created_at,
              u.full_name as sender_name, u.avatar_url as sender_avatar
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    return res.json({
      success: true,
      conversation: conv,
      partner,
      messages: messages || [],
    });
  } catch (err) {
    console.error('getChatTesterConversation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load conversation', error: err.message });
  }
}

/**
 * ========================================================
 * 🛡️ USER MODERATION & REPORTS CONTROLLER
 * ========================================================
 */

/**
 * Get Paginated List of User Reports with Counts
 * GET /api/admin/reports
 */
export async function getAdminReports(req, res) {
  try {
    const {
      status = 'all',
      search = '',
      page = 1,
      limit = 20,
      view = 'grouped', // 'grouped' (by offender) or 'all' (individual report logs)
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // 1. Fetch counts breakdown (Single query)
    const [counts] = await query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'investigating' THEN 1 ELSE 0 END) AS investigating,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) AS dismissed
      FROM moderation_reports
    `);

    // 2. Build filter conditions
    const whereClauses = [];
    const params = [];

    if (status && status !== 'all') {
      whereClauses.push('r.status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereClauses.push(`(
        u_target.full_name LIKE ? OR 
        u_target.email LIKE ? OR 
        r.reason LIKE ? OR 
        r.description LIKE ? OR 
        r.room_id LIKE ?
      )`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    if (view === 'grouped') {
      // 3A. Count total matching offenders (Grouped by reported_id)
      const [totalGrouped] = await query(
        `SELECT COUNT(DISTINCT r.reported_id) AS count
         FROM moderation_reports r
         JOIN users u_target ON u_target.id = r.reported_id
         ${whereSql}`,
        params
      );
      const totalFiltered = totalGrouped?.count || 0;

      // 4A. Grouped query by offender user
      const reports = await query(
        `SELECT 
           r.reported_id,
           u_target.full_name AS reported_name,
           u_target.email AS reported_email,
           COALESCE(u_target.avatar_url, CONCAT('https://api.dicebear.com/7.x/avataaars/svg?seed=', u_target.id)) AS reported_avatar,
           u_target.role AS reported_role,
           u_target.level AS reported_level,
           u_target.is_banned AS reported_is_banned,
           (SELECT COUNT(*) FROM user_devices ud WHERE ud.user_id = r.reported_id) AS reported_devices_count,
           (SELECT COUNT(*) FROM user_devices ud WHERE ud.user_id = r.reported_id AND ud.is_banned = 1) AS reported_banned_devices_count,
           (SELECT GROUP_CONCAT(DISTINCT ud.device_model SEPARATOR ', ') FROM user_devices ud WHERE ud.user_id = r.reported_id) AS reported_device_models,
           COUNT(r.id) AS total_reports_count,
           SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) AS pending_reports_count,
           SUM(CASE WHEN r.status = 'investigating' THEN 1 ELSE 0 END) AS investigating_reports_count,
           SUM(CASE WHEN r.status = 'resolved' THEN 1 ELSE 0 END) AS resolved_reports_count,
           SUM(CASE WHEN r.status = 'dismissed' THEN 1 ELSE 0 END) AS dismissed_reports_count,
           MAX(r.created_at) AS latest_report_time,
           MIN(r.created_at) AS first_report_time,
           GROUP_CONCAT(DISTINCT r.reason SEPARATOR ', ') AS reasons_summary,
           GROUP_CONCAT(r.id ORDER BY r.created_at DESC) AS report_ids,
           COUNT(DISTINCT r.reporter_id) AS reporters_count,
           CASE 
             WHEN SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) > 0 THEN 'pending'
             WHEN SUM(CASE WHEN r.status = 'investigating' THEN 1 ELSE 0 END) > 0 THEN 'investigating'
             WHEN SUM(CASE WHEN r.status = 'resolved' THEN 1 ELSE 0 END) > 0 THEN 'resolved'
             ELSE 'dismissed'
           END AS status
         FROM moderation_reports r
         JOIN users u_target ON u_target.id = r.reported_id
         ${whereSql}
         GROUP BY r.reported_id, u_target.id
         ORDER BY 
           pending_reports_count DESC,
           total_reports_count DESC,
           latest_report_time DESC
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );

      return res.json({
        success: true,
        view: 'grouped',
        counts: {
          total: Number(counts?.total) || 0,
          pending: Number(counts?.pending) || 0,
          investigating: Number(counts?.investigating) || 0,
          resolved: Number(counts?.resolved) || 0,
          dismissed: Number(counts?.dismissed) || 0,
        },
        pagination: {
          total: totalFiltered,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalFiltered / limitNum) || 1,
        },
        reports: reports || [],
      });
    }

    // 3B. Standard individual reports feed (view === 'all')
    const [totalMatching] = await query(
      `SELECT COUNT(*) AS count
       FROM moderation_reports r
       JOIN users u_rep ON u_rep.id = r.reporter_id
       JOIN users u_target ON u_target.id = r.reported_id
       ${whereSql}`,
      params
    );

    const totalFiltered = totalMatching?.count || 0;

    // 4B. Fetch individual reports rows
    const reports = await query(
      `SELECT 
         r.id,
         r.reporter_id,
         u_rep.full_name AS reporter_name,
         u_rep.email AS reporter_email,
         COALESCE(u_rep.avatar_url, CONCAT('https://api.dicebear.com/7.x/avataaars/svg?seed=', u_rep.id)) AS reporter_avatar,
         r.reported_id,
         u_target.full_name AS reported_name,
         u_target.email AS reported_email,
         COALESCE(u_target.avatar_url, CONCAT('https://api.dicebear.com/7.x/avataaars/svg?seed=', u_target.id)) AS reported_avatar,
         u_target.role AS reported_role,
         u_target.level AS reported_level,
         u_target.is_banned AS reported_is_banned,
         (SELECT COUNT(*) FROM moderation_reports mr WHERE mr.reported_id = r.reported_id) AS total_reports_count,
         (SELECT COUNT(*) FROM user_devices ud WHERE ud.user_id = r.reported_id) AS reported_devices_count,
         (SELECT COUNT(*) FROM user_devices ud WHERE ud.user_id = r.reported_id AND ud.is_banned = 1) AS reported_banned_devices_count,
         (SELECT GROUP_CONCAT(DISTINCT ud.device_model SEPARATOR ', ') FROM user_devices ud WHERE ud.user_id = r.reported_id) AS reported_device_models,
         r.room_id,
         r.reason,
         r.description,
         r.status,
         r.admin_notes,
         r.created_at,
         r.updated_at
       FROM moderation_reports r
       JOIN users u_rep ON u_rep.id = r.reporter_id
       JOIN users u_target ON u_target.id = r.reported_id
       ${whereSql}
       ORDER BY 
         CASE WHEN r.status = 'pending' THEN 1 WHEN r.status = 'investigating' THEN 2 ELSE 3 END ASC,
         r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return res.json({
      success: true,
      view: 'all',
      counts: {
        total: Number(counts?.total) || 0,
        pending: Number(counts?.pending) || 0,
        investigating: Number(counts?.investigating) || 0,
        resolved: Number(counts?.resolved) || 0,
        dismissed: Number(counts?.dismissed) || 0,
      },
      pagination: {
        total: totalFiltered,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalFiltered / limitNum) || 1,
      },
      reports: reports || [],
    });
  } catch (err) {
    console.error('getAdminReports error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reports', error: err.message });
  }
}

/**
 * Fetch all reports filed against a specific offender with full reporter details
 */
export async function getOffenderReports(req, res) {
  try {
    const { userId } = req.params;
    const offenderId = parseInt(userId, 10);
    if (!offenderId) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    // 1. Offender profile & device info
    const [offender] = await query(
      `SELECT 
         u.id AS reported_id,
         u.full_name AS reported_name,
         u.email AS reported_email,
         COALESCE(u.avatar_url, CONCAT('https://api.dicebear.com/7.x/avataaars/svg?seed=', u.id)) AS reported_avatar,
         u.role AS reported_role,
         u.level AS reported_level,
         u.is_banned AS reported_is_banned,
         (SELECT COUNT(*) FROM user_devices ud WHERE ud.user_id = u.id) AS reported_devices_count,
         (SELECT COUNT(*) FROM user_devices ud WHERE ud.user_id = u.id AND ud.is_banned = 1) AS reported_banned_devices_count,
         (SELECT GROUP_CONCAT(DISTINCT ud.device_model SEPARATOR ', ') FROM user_devices ud WHERE ud.user_id = u.id) AS reported_device_models,
         (SELECT COUNT(*) FROM moderation_reports mr WHERE mr.reported_id = u.id) AS total_reports_count
       FROM users u
       WHERE u.id = ?`,
      [offenderId]
    );

    if (!offender) {
      return res.status(404).json({ success: false, message: 'Reported user not found' });
    }

    // 2. Fetch all individual reports against this offender with reporter details
    const reports = await query(
      `SELECT 
         r.id,
         r.reporter_id,
         u_rep.full_name AS reporter_name,
         u_rep.email AS reporter_email,
         COALESCE(u_rep.avatar_url, CONCAT('https://api.dicebear.com/7.x/avataaars/svg?seed=', u_rep.id)) AS reporter_avatar,
         u_rep.role AS reporter_role,
         u_rep.level AS reporter_level,
         r.room_id,
         r.reason,
         r.description,
         r.status,
         r.admin_notes,
         r.created_at,
         r.updated_at
       FROM moderation_reports r
       JOIN users u_rep ON u_rep.id = r.reporter_id
       WHERE r.reported_id = ?
       ORDER BY 
         CASE WHEN r.status = 'pending' THEN 1 WHEN r.status = 'investigating' THEN 2 ELSE 3 END ASC,
         r.created_at DESC`,
      [offenderId]
    );

    // 3. Reasons breakdown
    const reasonsMap = {};
    for (const rep of reports) {
      reasonsMap[rep.reason] = (reasonsMap[rep.reason] || 0) + 1;
    }

    return res.json({
      success: true,
      offender,
      total_reports: reports.length,
      reasons_breakdown: reasonsMap,
      reports: reports || [],
    });
  } catch (err) {
    console.error('getOffenderReports error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch offender reports', error: err.message });
  }
}

/**
 * Update Report Status and/or Admin Notes
 * PUT /api/admin/reports/:id/status
 */
export async function updateAdminReportStatus(req, res) {
  try {
    const reportId = parseInt(req.params.id, 10);
    const { status, admin_notes } = req.body;

    if (!reportId || isNaN(reportId)) {
      return res.status(400).json({ success: false, message: 'Valid report ID is required.' });
    }

    const validStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const [existing] = await query('SELECT * FROM moderation_reports WHERE id = ?', [reportId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const newStatus = status || existing.status;
    const newNotes = admin_notes !== undefined ? admin_notes : existing.admin_notes;

    await query(
      'UPDATE moderation_reports SET status = ?, admin_notes = ? WHERE id = ?',
      [newStatus, newNotes, reportId]
    );

    // Invalidate reports cache
    await cache.delByPattern('admin:reports:*');

    return res.json({
      success: true,
      message: `Report status updated to "${newStatus}".`,
      report: {
        id: reportId,
        status: newStatus,
        admin_notes: newNotes,
      },
    });
  } catch (err) {
    console.error('updateAdminReportStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update report status.', error: err.message });
  }
}

/**
 * Perform Moderation Action from Report (Account Ban, Device Ban, Both, Unban, Resolve, Dismiss)
 * POST /api/admin/reports/:id/action
 */
export async function takeAdminReportAction(req, res) {
  try {
    const reportId = parseInt(req.params.id, 10);
    const { action, banType = 'both', unbanType = 'both', admin_notes } = req.body;

    let targetUserId = null;
    let report = null;

    if (reportId && !isNaN(reportId) && reportId > 0) {
      const [found] = await query('SELECT * FROM moderation_reports WHERE id = ?', [reportId]);
      report = found;
      targetUserId = report?.reported_id;
    }

    if (!targetUserId && req.body.userId) {
      targetUserId = parseInt(req.body.userId, 10);
    }

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Valid report ID or target user ID is required.' });
    }

    let message = '';
    let newStatus = report?.status || 'resolved';
    const banReason = admin_notes || (report ? `Banned via report #${reportId} (${report.reason})` : 'Banned by admin investigation');

    if (action === 'ban') {
      let devicesAffected = 0;
      let accountBanned = false;

      // 1. Account Ban
      if (banType === 'account' || banType === 'both') {
        await query('UPDATE users SET is_banned = 1 WHERE id = ?', [targetUserId]);
        accountBanned = true;
      }

      // 2. Hardware Device Ban
      if (banType === 'device' || banType === 'both') {
        const devRes = await query(
          `UPDATE user_devices 
           SET is_banned = 1, ban_reason = ?, banned_by = ?, banned_at = NOW() 
           WHERE user_id = ?`,
          [banReason, req.user?.id || null, targetUserId]
        );
        devicesAffected = devRes?.affectedRows || 0;

        // Invalidate Redis cache for each device
        const userDevs = await query('SELECT device_id FROM user_devices WHERE user_id = ?', [targetUserId]);
        for (const d of userDevs) {
          if (d.device_id) {
            await cache.set(`device:banned:${d.device_id}`, true, 86400 * 30);
          }
        }
      }

      newStatus = 'resolved';
      if (banType === 'both') {
        message = `User account and all registered devices (${devicesAffected}) banned successfully.`;
      } else if (banType === 'device') {
        message = `All registered hardware devices (${devicesAffected}) banned successfully. Account remains active.`;
      } else {
        message = 'User account suspended/banned successfully. Hardware devices remain unaffected.';
      }

      // Invalidate target user cache
      await Promise.allSettled([
        cache.del(`user:${targetUserId}`),
        cache.del(`mobile:user:profile:${targetUserId}`),
        cache.del(`mobile:user:public:${targetUserId}`),
        cache.delByPattern('moderator:banned_devices:*'),
        cache.delByPattern('admin:users*'),
      ]);
    } else if (action === 'unban') {
      let devicesAffected = 0;

      // 1. Unban Account
      if (unbanType === 'account' || unbanType === 'both') {
        await query('UPDATE users SET is_banned = 0 WHERE id = ?', [targetUserId]);
      }

      // 2. Unban Devices
      if (unbanType === 'device' || unbanType === 'both') {
        const devRes = await query(
          `UPDATE user_devices 
           SET is_banned = 0, ban_reason = NULL, banned_at = NULL, banned_by = NULL 
           WHERE user_id = ?`,
          [targetUserId]
        );
        devicesAffected = devRes?.affectedRows || 0;

        const userDevs = await query('SELECT device_id FROM user_devices WHERE user_id = ?', [targetUserId]);
        for (const d of userDevs) {
          if (d.device_id) {
            await cache.del(`device:banned:${d.device_id}`);
          }
        }
      }

      if (unbanType === 'both') {
        message = `User account and devices (${devicesAffected}) unbanned successfully.`;
      } else if (unbanType === 'device') {
        message = `Hardware devices (${devicesAffected}) unbanned successfully.`;
      } else {
        message = 'User account unbanned successfully.';
      }

      await Promise.allSettled([
        cache.del(`user:${targetUserId}`),
        cache.del(`mobile:user:profile:${targetUserId}`),
        cache.del(`mobile:user:public:${targetUserId}`),
        cache.delByPattern('moderator:banned_devices:*'),
        cache.delByPattern('admin:users*'),
      ]);
    } else if (action === 'resolve') {
      newStatus = 'resolved';
      message = 'Report marked as resolved.';
    } else if (action === 'dismiss') {
      newStatus = 'dismissed';
      message = 'Report dismissed.';
    } else if (action === 'investigate') {
      newStatus = 'investigating';
      message = 'Report marked as under investigation.';
    } else {
      return res.status(400).json({ success: false, message: 'Valid action is required (ban, unban, resolve, dismiss, investigate).' });
    }

    const newNotes = admin_notes !== undefined ? admin_notes : (report ? report.admin_notes : null);

    if (reportId && !isNaN(reportId) && reportId > 0) {
      await query(
        'UPDATE moderation_reports SET status = ?, admin_notes = COALESCE(?, admin_notes), updated_at = NOW() WHERE id = ?',
        [newStatus, newNotes, reportId]
      );
    }

    if (action === 'ban' && targetUserId) {
      await query(
        'UPDATE moderation_reports SET status = "resolved", admin_notes = COALESCE(?, admin_notes), updated_at = NOW() WHERE reported_id = ? AND status IN ("pending", "investigating")',
        [banReason, targetUserId]
      );
    }

    await cache.delByPattern('admin:reports:*');

    return res.json({
      success: true,
      message,
      report_id: reportId,
      reported_id: targetUserId,
      status: newStatus,
      admin_notes: newNotes,
    });
  } catch (err) {
    console.error('takeAdminReportAction error:', err);
    return res.status(500).json({ success: false, message: 'Failed to take report action.', error: err.message });
  }
}

/**
 * Delete a Moderation Report
 * DELETE /api/admin/reports/:id
 */
export async function deleteAdminReport(req, res) {
  try {
    const reportId = parseInt(req.params.id, 10);
    if (!reportId || isNaN(reportId)) {
      return res.status(400).json({ success: false, message: 'Valid report ID is required.' });
    }

    await query('DELETE FROM moderation_reports WHERE id = ?', [reportId]);
    await cache.delByPattern('admin:reports:*');

    return res.json({
      success: true,
      message: 'Report deleted successfully.',
    });
  } catch (err) {
    console.error('deleteAdminReport error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete report.', error: err.message });
  }
}

/**
 * Bulk Delete Moderation Reports
 * POST /api/admin/reports/bulk-delete
 */
export async function bulkDeleteReports(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of report IDs is required.' });
    }

    const cleanIds = ids.map(Number).filter((id) => id > 0);
    if (cleanIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid report IDs provided.' });
    }

    const placeholders = cleanIds.map(() => '?').join(',');
    const result = await query(`DELETE FROM moderation_reports WHERE id IN (${placeholders})`, cleanIds);

    await cache.delByPattern('admin:reports:*');

    return res.json({
      success: true,
      message: `${result.affectedRows || cleanIds.length} report(s) deleted successfully.`,
      deletedCount: result.affectedRows || cleanIds.length,
    });
  } catch (err) {
    console.error('bulkDeleteReports error:', err);
    return res.status(500).json({ success: false, message: 'Failed to bulk delete reports.', error: err.message });
  }
}

/**
 * Live Duration & Session Reward Settings for Admin
 * GET /api/admin/live-rewards/settings
 */
export async function getLiveRewardSettingsAdmin(req, res) {
  try {
    const settings = await getLiveDurationRewardSettings();
    return res.json({ success: true, settings });
  } catch (err) {
    console.error('getLiveRewardSettingsAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reward settings.', error: err.message });
  }
}

/**
 * Update Live Reward Settings for Admin
 * PUT /api/admin/live-rewards/settings
 */
export async function updateLiveRewardSettingsAdmin(req, res) {
  try {
    const settings = await updateLiveDurationRewardSettings(req.body);
    return res.json({
      success: true,
      message: 'Live streaming reward settings updated successfully.',
      settings,
    });
  } catch (err) {
    console.error('updateLiveRewardSettingsAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update reward settings.', error: err.message });
  }
}

/**
 * Fetch Live Rewards Claim History for Admin
 * GET /api/admin/live-rewards/history
 */
export async function getLiveRewardHistoryAdmin(req, res) {
  try {
    const { page = 1, limit = 20, search = '', role = '', sessionType = '', userId = null } = req.query;
    const history = await getLiveDurationRewardHistory({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      role,
      sessionType,
      userId,
    });
    return res.json({ success: true, ...history });
  } catch (err) {
    console.error('getLiveRewardHistoryAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reward history.', error: err.message });
  }
}

/**
 * Fetch Live Rewards Statistics for Admin Dashboard Card
 * GET /api/admin/live-rewards/stats
 */
export async function getLiveRewardStatsAdmin(req, res) {
  try {
    const stats = await getLiveDurationRewardStats();
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('getLiveRewardStatsAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reward stats.', error: err.message });
  }
}

/**
 * Admin: Get 1-on-1 P2P Call Logs & Sessions
 * GET /api/admin/call-logs
 */
export async function getAdminCallLogs(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;
    const { status, call_type, search } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }

    if (call_type && call_type !== 'all') {
      whereClause += ' AND c.call_type = ?';
      params.push(call_type);
    }

    if (search) {
      whereClause += ' AND (u1.full_name LIKE ? OR u2.full_name LIKE ? OR c.call_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countRows = await query(
      `SELECT COUNT(*) as total FROM p2p_calls c
       LEFT JOIN users u1 ON c.caller_id = u1.id
       LEFT JOIN users u2 ON c.receiver_id = u2.id
       WHERE ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const rows = await query(
      `SELECT c.id, c.call_id, c.caller_id, c.receiver_id, c.call_type, c.status,
              c.rate_per_minute, c.duration_seconds, c.billed_minutes, c.total_coins_spent,
              c.receiver_earned_diamonds, c.end_reason, c.started_at, c.ended_at, c.created_at,
              u1.full_name as caller_name, u1.avatar_url as caller_avatar,
              u2.full_name as receiver_name, u2.avatar_url as receiver_avatar
       FROM p2p_calls c
       LEFT JOIN users u1 ON c.caller_id = u1.id
       LEFT JOIN users u2 ON c.receiver_id = u2.id
       WHERE ${whereClause}
       ORDER BY c.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      calls: rows,
    });
  } catch (err) {
    console.error('getAdminCallLogs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch call logs.' });
  }
}

// ==========================================
// User Levels & Progression Rewards Controllers
// ==========================================

export async function getLevelConfigs(req, res) {
  try {
    const levels = await cache.getOrSet('levels:all', 60, async () => {
      const rows = await query(`
        SELECT lc.*,
               ee.name as effect_name, ee.preview_image_url as effect_preview,
               st.name as thumbnail_name, st.image_url as thumbnail_preview,
               pp.name as package_name, pp.image_url as package_preview
        FROM level_configs lc
        LEFT JOIN entry_effects ee ON lc.reward_entry_effect_id = ee.id
        LEFT JOIN special_thumbnails st ON lc.reward_thumbnail_id = st.id
        LEFT JOIN privilege_packages pp ON lc.reward_package_id = pp.id
        ORDER BY lc.level_number ASC
      `);
      return rows || [];
    });

    return res.json({ success: true, levels });
  } catch (err) {
    console.error('getLevelConfigs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch level configurations.' });
  }
}

export async function getLevelRewardOptions(req, res) {
  try {
    const options = await cache.getOrSet('levels:reward_options', 60, async () => {
      const [entryEffects, thumbnails, packages] = await Promise.all([
        query('SELECT id, name, effect_type, preview_image_url, price, validity_days FROM entry_effects WHERE is_active = TRUE ORDER BY name ASC'),
        query('SELECT id, name, image_url, price, validity_days FROM special_thumbnails WHERE is_active = TRUE ORDER BY name ASC'),
        query('SELECT id, name, image_url, price, validity_days, color FROM privilege_packages WHERE is_active = TRUE ORDER BY name ASC'),
      ]);
      return {
        entry_effects: entryEffects || [],
        thumbnails: thumbnails || [],
        packages: packages || [],
      };
    });

    return res.json({ success: true, ...options });
  } catch (err) {
    console.error('getLevelRewardOptions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch level reward options.' });
  }
}

export async function createLevelConfig(req, res) {
  try {
    const {
      level_number,
      level_name,
      min_coins_spent,
      badge_icon,
      badge_color,
      reward_coins,
      reward_diamonds,
      reward_entry_effect_id,
      reward_thumbnail_id,
      reward_package_id,
      reward_validity_days,
      is_active,
      description,
    } = req.body;

    const lvlNum = parseInt(level_number, 10);
    const minCoins = BigInt(min_coins_spent || 0);

    if (isNaN(lvlNum) || lvlNum < 1) {
      return res.status(400).json({ success: false, message: 'Valid Level Number is required (e.g. 1, 2, 3).' });
    }
    if (!level_name || !level_name.trim()) {
      return res.status(400).json({ success: false, message: 'Level Title / Name is required.' });
    }

    // Check for duplicate level_number
    const existing = await query('SELECT id FROM level_configs WHERE level_number = ?', [lvlNum]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: `Level ${lvlNum} already exists. Please edit it instead.` });
    }

    // Insert to MySQL Database FIRST (SSOT)
    const result = await query(
      `INSERT INTO level_configs (
        level_number, level_name, min_coins_spent, badge_icon, badge_color,
        reward_coins, reward_diamonds, reward_entry_effect_id, reward_thumbnail_id,
        reward_package_id, reward_validity_days, is_active, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lvlNum,
        level_name.trim(),
        minCoins.toString(),
        badge_icon || '',
        badge_color || '#f59e0b',
        parseInt(reward_coins || 0, 10),
        parseInt(reward_diamonds || 0, 10),
        reward_entry_effect_id || null,
        reward_thumbnail_id || null,
        reward_package_id || null,
        Math.max(1, parseInt(reward_validity_days || 7, 10)),
        is_active === false || is_active === 'false' ? 0 : 1,
        description || '',
      ]
    );

    // Instant Redis Invalidation
    await cache.del('levels:all');
    await cache.del('levels:all_active');
    await cache.delByPattern('levels:*');

    return res.status(201).json({
      success: true,
      message: `Level ${lvlNum} (${level_name}) created successfully.`,
      id: result.insertId,
    });
  } catch (err) {
    console.error('createLevelConfig error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create level configuration.', error: err.message });
  }
}

export async function updateLevelConfig(req, res) {
  try {
    const { id } = req.params;
    const {
      level_number,
      level_name,
      min_coins_spent,
      badge_icon,
      badge_color,
      reward_coins,
      reward_diamonds,
      reward_entry_effect_id,
      reward_thumbnail_id,
      reward_package_id,
      reward_validity_days,
      is_active,
      description,
    } = req.body;

    const existing = await query('SELECT * FROM level_configs WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Level configuration not found.' });
    }

    const lvlNum = level_number !== undefined ? parseInt(level_number, 10) : existing[0].level_number;
    const minCoins = min_coins_spent !== undefined ? BigInt(min_coins_spent) : BigInt(existing[0].min_coins_spent);

    // Database update FIRST (SSOT)
    await query(
      `UPDATE level_configs SET
        level_number = ?,
        level_name = ?,
        min_coins_spent = ?,
        badge_icon = ?,
        badge_color = ?,
        reward_coins = ?,
        reward_diamonds = ?,
        reward_entry_effect_id = ?,
        reward_thumbnail_id = ?,
        reward_package_id = ?,
        reward_validity_days = ?,
        is_active = ?,
        description = ?
       WHERE id = ?`,
      [
        lvlNum,
        (level_name !== undefined ? level_name : existing[0].level_name).trim(),
        minCoins.toString(),
        badge_icon !== undefined ? badge_icon : existing[0].badge_icon,
        badge_color !== undefined ? badge_color : existing[0].badge_color,
        reward_coins !== undefined ? parseInt(reward_coins, 10) : existing[0].reward_coins,
        reward_diamonds !== undefined ? parseInt(reward_diamonds, 10) : existing[0].reward_diamonds,
        reward_entry_effect_id !== undefined ? (reward_entry_effect_id || null) : existing[0].reward_entry_effect_id,
        reward_thumbnail_id !== undefined ? (reward_thumbnail_id || null) : existing[0].reward_thumbnail_id,
        reward_package_id !== undefined ? (reward_package_id || null) : existing[0].reward_package_id,
        reward_validity_days !== undefined ? Math.max(1, parseInt(reward_validity_days, 10)) : existing[0].reward_validity_days,
        is_active !== undefined ? (is_active === false || is_active === 'false' ? 0 : 1) : existing[0].is_active,
        description !== undefined ? description : existing[0].description,
        id,
      ]
    );

    // Instant Redis Invalidation
    await cache.del('levels:all');
    await cache.del('levels:all_active');
    await cache.delByPattern('levels:*');

    return res.json({ success: true, message: `Level ${lvlNum} updated successfully.` });
  } catch (err) {
    console.error('updateLevelConfig error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update level configuration.', error: err.message });
  }
}

export async function deleteLevelConfig(req, res) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM level_configs WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Level configuration not found.' });
    }

    // Database deletion FIRST
    await query('DELETE FROM level_configs WHERE id = ?', [id]);

    // Instant Redis Invalidation
    await cache.del('levels:all');
    await cache.del('levels:all_active');
    await cache.delByPattern('levels:*');

    return res.json({ success: true, message: `Level ${existing[0].level_number} deleted successfully.` });
  } catch (err) {
    console.error('deleteLevelConfig error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete level configuration.' });
  }
}

export async function getLevelRewardHistory(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const countRows = await query('SELECT COUNT(*) as total FROM user_level_rewards');
    const total = countRows[0]?.total || 0;

    const rows = await query(`
      SELECT ulr.*,
             u.full_name as user_name, u.avatar_url as user_avatar, u.role as user_role,
             lc.level_name, lc.badge_color,
             ee.name as effect_name, ee.preview_image_url as effect_preview,
             st.name as thumbnail_name, st.image_url as thumbnail_preview,
             pp.name as package_name, pp.image_url as package_preview
      FROM user_level_rewards ulr
      LEFT JOIN users u ON ulr.user_id = u.id
      LEFT JOIN level_configs lc ON ulr.level_reached = lc.level_number
      LEFT JOIN entry_effects ee ON ulr.entry_effect_id = ee.id
      LEFT JOIN special_thumbnails st ON ulr.thumbnail_id = st.id
      LEFT JOIN privilege_packages pp ON ulr.package_id = pp.id
      ORDER BY ulr.id DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    return res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      history: rows,
    });
  } catch (err) {
    console.error('getLevelRewardHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch level reward audit history.' });
  }
}

export async function seedDefaultLevels(req, res) {
  try {
    await query(`
      INSERT INTO level_configs 
        (level_number, level_name, min_coins_spent, badge_color, reward_coins, reward_diamonds, reward_validity_days, description)
      VALUES 
        (1, 'Bronze Novice', 0, '#cd7f32', 0, 0, 7, 'Welcome tier for every new member.'),
        (2, 'Silver Explorer', 500, '#94a3b8', 25, 0, 7, 'Unlocked after spending 500 coins.'),
        (3, 'Gold Adventurer', 1500, '#eab308', 50, 0, 7, 'Unlocked after spending 1,500 coins.'),
        (4, 'Emerald Scout', 5000, '#10b981', 150, 0, 7, 'Unlocked after spending 5,000 coins.'),
        (5, 'Ruby Pioneer', 15000, '#ef4444', 350, 50, 7, 'Unlocked after spending 15,000 coins.'),
        (6, 'Sapphire Veteran', 40000, '#3b82f6', 750, 100, 7, 'Unlocked after spending 40,000 coins.'),
        (7, 'Amethyst Warrior', 100000, '#8b5cf6', 1500, 250, 15, 'Unlocked after spending 100,000 coins.'),
        (8, 'Diamond Champion', 250000, '#06b6d4', 3500, 500, 15, 'Unlocked after spending 250,000 coins.'),
        (9, 'Master Guardian', 600000, '#ec4899', 7500, 1000, 15, 'Unlocked after spending 600,000 coins.'),
        (10, 'Royal Conqueror', 1500000, '#f59e0b', 15000, 2500, 30, 'Unlocked after spending 1,500,000 coins.'),
        (11, 'Imperial Warlord', 3000000, '#6366f1', 30000, 5000, 30, 'Unlocked after spending 3,000,000 coins.'),
        (12, 'Grand Monarch', 6000000, '#14b8a6', 60000, 10000, 30, 'Unlocked after spending 6,000,000 coins.'),
        (13, 'Supreme Overlord', 12000000, '#d946ef', 120000, 20000, 30, 'Unlocked after spending 12,000,000 coins.'),
        (14, 'Celestial Titan', 25000000, '#84cc16', 250000, 40000, 30, 'Unlocked after spending 25,000,000 coins.'),
        (15, 'Mythic Sovereign', 50000000, '#f43f5e', 500000, 80000, 30, 'Unlocked after spending 50,000,000 coins.'),
        (16, 'Divine Immortal', 100000000, '#a855f7', 1000000, 150000, 60, 'Unlocked after spending 100,000,000 coins.'),
        (17, 'Galactic Emperor', 200000000, '#0ea5e9', 2000000, 300000, 60, 'Unlocked after spending 200,000,000 coins.'),
        (18, 'Cosmic Ruler', 400000000, '#e11d48', 4000000, 600000, 60, 'Unlocked after spending 400,000,000 coins.'),
        (19, 'Eternal Legend', 750000000, '#f97316', 7500000, 1200000, 90, 'Unlocked after spending 750,000,000 coins.'),
        (20, 'Omnipotent Deity', 1500000000, '#fbbf24', 15000000, 2500000, 365, 'The highest honor in Umi Live.')
      ON DUPLICATE KEY UPDATE 
        level_name = VALUES(level_name),
        min_coins_spent = VALUES(min_coins_spent),
        badge_color = VALUES(badge_color),
        reward_coins = VALUES(reward_coins),
        reward_diamonds = VALUES(reward_diamonds),
        reward_validity_days = VALUES(reward_validity_days);
    `);

    await cache.del('levels:all');
    await cache.del('levels:all_active');
    await cache.delByPattern('levels:*');

    return res.json({ success: true, message: 'Default 20 progression levels seeded successfully.' });
  } catch (err) {
    console.error('seedDefaultLevels error:', err);
    return res.status(500).json({ success: false, message: 'Failed to seed default levels.' });
  }
}

// ==========================================
// System-Wide User Wallet Reset Controllers
// ==========================================

export async function resetAllUsersCoins(req, res) {
  try {
    const { actionPassword, includeAdmins = false } = req.body;

    // 1. Verify security action password
    const settingsRows = await query(
      "SELECT key_value FROM system_settings WHERE key_name = 'action_security_password' LIMIT 1"
    );
    const configuredPassword = settingsRows[0]?.key_value || 'admin123';

    if (!actionPassword || String(actionPassword).trim() !== String(configuredPassword).trim()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid security action password. Action rejected.',
      });
    }

    // 2. Database-First Bulk Reset (SSOT)
    const sql = includeAdmins
      ? 'UPDATE users SET coins = 0'
      : "UPDATE users SET coins = 0 WHERE role NOT IN ('superadmin', 'admin')";
    const result = await query(sql);

    // 3. Invalidate Redis Caches
    await cache.delByPattern('user:*');
    await cache.delByPattern('wallet:*');
    await cache.delByPattern('mobile:user:profile*');
    await cache.delByPattern('admin:dashboard*');
    await cache.delByPattern('admin:users*');
    await cache.delByPattern('leaderboard:gifters*');

    return res.json({
      success: true,
      message: `System-wide coin reset complete. ${result.affectedRows || 0} user wallets set to 0 coins.`,
      affectedRows: result.affectedRows || 0,
    });
  } catch (err) {
    console.error('resetAllUsersCoins error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset all users coins.', error: err.message });
  }
}

export async function resetAllUsersDiamonds(req, res) {
  try {
    const { actionPassword, includeAdmins = false } = req.body;

    // 1. Verify security action password
    const settingsRows = await query(
      "SELECT key_value FROM system_settings WHERE key_name = 'action_security_password' LIMIT 1"
    );
    const configuredPassword = settingsRows[0]?.key_value || 'admin123';

    if (!actionPassword || String(actionPassword).trim() !== String(configuredPassword).trim()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid security action password. Action rejected.',
      });
    }

    // 2. Database-First Bulk Reset (SSOT)
    const sql = includeAdmins
      ? 'UPDATE users SET diamonds = 0'
      : "UPDATE users SET diamonds = 0 WHERE role NOT IN ('superadmin', 'admin')";
    const result = await query(sql);

    // 3. Invalidate Redis Caches
    await cache.delByPattern('user:*');
    await cache.delByPattern('wallet:*');
    await cache.delByPattern('mobile:user:profile*');
    await cache.delByPattern('admin:dashboard*');
    await cache.delByPattern('admin:users*');

    return res.json({
      success: true,
      message: `System-wide diamond reset complete. ${result.affectedRows || 0} user wallets set to 0 diamonds.`,
      affectedRows: result.affectedRows || 0,
    });
  } catch (err) {
    console.error('resetAllUsersDiamonds error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset all users diamonds.', error: err.message });
  }
}

export async function resetAllUsersBalances(req, res) {
  try {
    const { actionPassword, includeAdmins = false } = req.body;

    // 1. Verify security action password
    const settingsRows = await query(
      "SELECT key_value FROM system_settings WHERE key_name = 'action_security_password' LIMIT 1"
    );
    const configuredPassword = settingsRows[0]?.key_value || 'admin123';

    if (!actionPassword || String(actionPassword).trim() !== String(configuredPassword).trim()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid security action password. Action rejected.',
      });
    }

    // 2. Database-First Bulk Reset (SSOT)
    const sql = includeAdmins
      ? 'UPDATE users SET coins = 0, diamonds = 0'
      : "UPDATE users SET coins = 0, diamonds = 0 WHERE role NOT IN ('superadmin', 'admin')";
    const result = await query(sql);

    // 3. Invalidate Redis Caches
    await cache.delByPattern('user:*');
    await cache.delByPattern('wallet:*');
    await cache.delByPattern('mobile:user:profile*');
    await cache.delByPattern('admin:dashboard*');
    await cache.delByPattern('admin:users*');
    await cache.delByPattern('leaderboard:gifters*');

    return res.json({
      success: true,
      message: `System-wide wallet reset complete. ${result.affectedRows || 0} user wallets set to 0 coins and 0 diamonds.`,
      affectedRows: result.affectedRows || 0,
    });
  } catch (err) {
    console.error('resetAllUsersBalances error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset all users balances.', error: err.message });
  }
}

/**
 * Star Progression Rating Controllers
 */

export async function getStarSettings(req, res) {
  try {
    const config = await getStarProgressionConfig();

    // Summary statistics
    const [stats] = await query(`
      SELECT 
        COUNT(CASE WHEN star >= 1.0 THEN 1 END) as total_starred_users,
        COALESCE(MAX(star), 0.0) as highest_star,
        COALESCE(AVG(star), 0.0) as average_star,
        COUNT(*) as total_users
      FROM users
      WHERE role != 'superadmin'
    `);

    // Top 5 Star Users
    const topUsers = await query(`
      SELECT id, full_name, avatar_url, role, coins, diamonds, level, star, total_coins_spent
      FROM users
      WHERE role != 'superadmin'
      ORDER BY star DESC, total_coins_spent DESC
      LIMIT 5
    `);

    return res.json({
      success: true,
      config,
      stats: {
        total_starred_users: parseInt(stats?.total_starred_users || 0, 10),
        highest_star: parseFloat(Number(stats?.highest_star || 0.0).toFixed(config.decimal_precision || 1)),
        average_star: parseFloat(Number(stats?.average_star || 0.0).toFixed(2)),
        total_users: parseInt(stats?.total_users || 0, 10),
      },
      topUsers: topUsers || [],
    });
  } catch (err) {
    console.error('getStarSettings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch star progression settings.' });
  }
}

export async function updateStarSettings(req, res) {
  try {
    const {
      is_enabled = true,
      coins_per_unit = 100000,
      metric_type = 'coins_spent',
      decimal_precision = 1,
      max_stars = 100,
    } = req.body;

    const unit = Math.max(1, parseInt(coins_per_unit, 10) || 100000);
    const precision = Math.min(3, Math.max(0, parseInt(decimal_precision, 10) || 1));
    const maxVal = parseFloat(max_stars) || 100.0;
    const enabledStr = is_enabled === false || is_enabled === 'false' ? 'false' : 'true';

    // Database-First Mutation (SSOT)
    await query(`
      INSERT INTO system_settings (key_name, key_value, description)
      VALUES 
        ('star_system_enabled', ?, 'Master switch to enable or disable the Star progression rating engine'),
        ('star_coins_per_unit', ?, 'Amount of coins/diamonds required for 1 full star (e.g., 100000 = 1.0 star, 120000 = 1.2 star)'),
        ('star_metric_type', ?, 'Metric used to calculate star progression: coins_spent, diamonds, or wallet_coins'),
        ('star_decimal_precision', ?, 'Number of decimal places displayed for star progression (e.g., 1 for 1.2, 2 for 1.25)'),
        ('star_max_stars', ?, 'Maximum star rating achievable')
      ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)
    `, [enabledStr, String(unit), metric_type, String(precision), String(maxVal)]);

    // Instant Redis Invalidation
    await cache.del('config:star_progression');
    await cache.del('config:mobile:app');
    await cache.del('settings:all');
    await cache.delByPattern('setting*');

    return res.json({
      success: true,
      message: 'Star progression settings updated successfully!',
      config: {
        is_enabled: enabledStr === 'true',
        coins_per_unit: unit,
        metric_type,
        decimal_precision: precision,
        max_stars: maxVal,
      },
    });
  } catch (err) {
    console.error('updateStarSettings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update star progression settings.' });
  }
}

export async function recalculateAllUserStars(req, res) {
  try {
    const starConfig = await getStarProgressionConfig();
    const unit = starConfig.coins_per_unit;
    const precision = starConfig.decimal_precision;
    const maxStars = starConfig.max_stars;
    const metricCol = starConfig.metric_type === 'diamonds' ? 'diamonds' : starConfig.metric_type === 'wallet_coins' ? 'coins' : 'total_coins_spent';

    // Database-First Bulk Recalculation
    const result = await query(`
      UPDATE users 
      SET star = LEAST(ROUND(COALESCE(${metricCol}, 0) / ?, ?), ?)
      WHERE role != 'superadmin'
    `, [unit, precision, maxStars]);

    // Instant Invalidation of caches
    await cache.delByPattern('user:*');
    await cache.delByPattern('admin:users*');
    await cache.delByPattern('mobile:user:profile*');
    await cache.delByPattern('leaderboard:*');

    return res.json({
      success: true,
      message: `Successfully recalculated star ratings for ${result.affectedRows || 0} users using formula (${metricCol} / ${unit.toLocaleString()} = stars).`,
      affectedRows: result.affectedRows || 0,
    });
  } catch (err) {
    console.error('recalculateAllUserStars error:', err);
    return res.status(500).json({ success: false, message: 'Failed to recalculate users stars.', error: err.message });
  }
}

export async function getAdminProfile(req, res) {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const [admin] = await query(
      `SELECT id, email, full_name, avatar_url, bio, role, coins, diamonds, level, created_at, updated_at 
       FROM users WHERE id = ? LIMIT 1`,
      [adminId]
    );

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }

    return res.json({
      success: true,
      user: admin,
    });
  } catch (err) {
    console.error('getAdminProfile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin profile.', error: err.message });
  }
}

export async function updateAdminProfile(req, res) {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { full_name, avatar_url, email, password, bio } = req.body;

    const [existing] = await query('SELECT * FROM users WHERE id = ?', [adminId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }

    const updates = [];
    const params = [];

    if (full_name !== undefined) {
      const cleanName = String(full_name).trim();
      if (!cleanName) {
        return res.status(400).json({ success: false, message: 'Admin name cannot be empty.' });
      }
      updates.push('full_name = ?');
      params.push(cleanName);
    }

    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(String(avatar_url).trim());
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(String(bio).trim());
    }

    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (cleanEmail && cleanEmail !== existing.email) {
        const [dup] = await query('SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, adminId]);
        if (dup) {
          return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }
        updates.push('email = ?');
        params.push(cleanEmail);
      }
    }

    if (password && String(password).trim().length > 0) {
      const cleanPass = String(password).trim();
      if (cleanPass.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      }
      const passHash = await bcrypt.hash(cleanPass, 10);
      updates.push('password_hash = ?');
      params.push(passHash);
    }

    if (updates.length > 0) {
      params.push(adminId);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Invalidate Redis caches
    await cache.del(`user:${adminId}`);
    await cache.delByPattern('admin:users*');

    // Fetch fresh updated user
    const [updatedUser] = await query(
      `SELECT id, email, full_name, avatar_url, bio, role, coins, diamonds, level, created_at, updated_at 
       FROM users WHERE id = ? LIMIT 1`,
      [adminId]
    );

    return res.json({
      success: true,
      message: 'Super Admin profile updated successfully.',
      user: updatedUser,
    });
  } catch (err) {
    console.error('updateAdminProfile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update admin profile.', error: err.message });
  }
}

/**
 * ============================================================================
 * LEGAL POLICIES & ACCOUNT DELETION COMPLIANCE CONTROLLERS
 * ============================================================================
 */

export async function getAdminPrivacyPolicy(req, res) {
  try {
    const rows = await query(`
      SELECT key_name, key_value 
      FROM system_settings 
      WHERE key_name IN (
        'privacy_policy_title',
        'privacy_policy_content',
        'privacy_policy_updated_at',
        'terms_of_service_title',
        'terms_of_service_content',
        'contact_support_email'
      )
    `);

    const map = {};
    (rows || []).forEach((r) => {
      map[r.key_name] = r.key_value;
    });

    return res.json({
      success: true,
      privacyPolicy: {
        title: map['privacy_policy_title'] || 'UMI LIVE - Privacy Policy',
        content: map['privacy_policy_content'] || '',
        updatedAt: map['privacy_policy_updated_at'] || '2026-10-26',
      },
      termsOfService: {
        title: map['terms_of_service_title'] || 'UMI LIVE - Terms of Service',
        content: map['terms_of_service_content'] || '',
      },
      supportEmail: map['contact_support_email'] || 'support@umilive.com',
    });
  } catch (err) {
    console.error('getAdminPrivacyPolicy error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch legal policies.', error: err.message });
  }
}

export async function updateAdminPrivacyPolicy(req, res) {
  try {
    const {
      privacyTitle,
      privacyContent,
      termsTitle,
      termsContent,
      supportEmail,
      updatedAt,
    } = req.body;

    const updates = [
      ['privacy_policy_title', privacyTitle || 'UMI LIVE - Privacy Policy'],
      ['privacy_policy_content', privacyContent || ''],
      ['privacy_policy_updated_at', updatedAt || new Date().toISOString().split('T')[0]],
      ['terms_of_service_title', termsTitle || 'UMI LIVE - Terms of Service'],
      ['terms_of_service_content', termsContent || ''],
      ['contact_support_email', supportEmail || 'support@umilive.com'],
    ];

    for (const [k, v] of updates) {
      await query(
        `INSERT INTO system_settings (key_name, key_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)`,
        [k, v]
      );
    }

    // Invalidate Redis caches for public legal pages
    await cache.del('public:privacy_policy');
    await cache.del('public:terms');
    await cache.del('public:branding');
    await cache.del('public:policies');

    return res.json({
      success: true,
      message: 'Privacy policy and legal settings published successfully.',
    });
  } catch (err) {
    console.error('updateAdminPrivacyPolicy error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update privacy policy.', error: err.message });
  }
}

export async function getAdminDeletionRequests(req, res) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (parsedPage - 1) * parsedLimit;

    const rawSearch = typeof search === 'string' ? search.trim() : '';
    const cleanSearch = (rawSearch && rawSearch !== 'undefined' && rawSearch !== 'null') ? rawSearch : '';
    const cleanStatus = (status && status !== 'all' && status !== 'undefined') ? status : null;

    const cacheKey = `admin:deletion_requests:${cleanStatus || 'all'}:${cleanSearch || 'all'}:${parsedPage}:${parsedLimit}`;

    const data = await cache.getOrSet(cacheKey, 30, async () => {
      const conditions = [];
      const params = [];

      if (cleanStatus) {
        conditions.push('r.status = ?');
        params.push(cleanStatus);
      }

      if (cleanSearch) {
        const clean = cleanSearch.replace(/^#/, '');
        const isNum = !isNaN(clean) && clean !== '';
        if (isNum) {
          conditions.push('(r.id = ? OR r.user_id = ?)');
          const n = parseInt(clean, 10);
          params.push(n, n);
        } else {
          conditions.push('(r.identifier LIKE ? OR r.email LIKE ? OR r.name LIKE ? OR r.reason LIKE ?)');
          const s = `%${clean}%`;
          params.push(s, s, s, s);
        }
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const rows = await query(
        `SELECT 
          r.id,
          r.user_id,
          r.identifier,
          r.name,
          r.email,
          r.phone,
          r.reason,
          r.details,
          r.status,
          r.admin_notes,
          r.reviewed_by,
          r.ip_address,
          r.created_at,
          r.reviewed_at,
          COALESCE(u.full_name, r.name) as matched_user_name,
          u.avatar_url as matched_user_avatar,
          u.coins as matched_user_coins,
          u.diamonds as matched_user_diamonds,
          u.role as matched_user_role,
          admin.full_name as reviewer_name
         FROM account_deletion_requests r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN users admin ON r.reviewed_by = admin.id
         ${whereSql}
         ORDER BY r.created_at DESC, r.id DESC
         LIMIT ${parsedLimit} OFFSET ${offset}`,
        params
      );

      const [totalCount] = await query(
        `SELECT COUNT(*) as count FROM account_deletion_requests r ${whereSql}`,
        params
      );

      const [stats] = await query(`
        SELECT 
          COUNT(*) as total_requests,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as approved_count,
          COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected_count
        FROM account_deletion_requests
      `);

      return {
        requests: rows || [],
        total: totalCount ? totalCount.count : 0,
        summary: stats || { total_requests: 0, pending_count: 0, approved_count: 0, rejected_count: 0 },
      };
    });

    return res.json({
      success: true,
      requests: data.requests,
      summary: data.summary,
      pagination: {
        total: data.total,
        page: parsedPage,
        limit: parsedLimit,
      },
    });
  } catch (err) {
    console.error('getAdminDeletionRequests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch deletion requests.', error: err.message });
  }
}

export async function approveDeletionRequest(req, res) {
  try {
    const { id } = req.params;
    const { actionPassword, notes } = req.body;

    // Verify security action password
    const [settingsRows] = await query("SELECT key_value FROM system_settings WHERE key_name = 'action_security_password'");
    const configuredPassword = settingsRows?.key_value || 'admin123';

    if (!actionPassword || String(actionPassword).trim() !== String(configuredPassword).trim()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid security action password. You can view or change this in Admin Settings.',
      });
    }

    const [reqRow] = await query('SELECT * FROM account_deletion_requests WHERE id = ? LIMIT 1', [id]);
    if (!reqRow) {
      return res.status(404).json({ success: false, message: 'Deletion request not found.' });
    }

    let targetUserId = reqRow.user_id;

    // If user_id wasn't set, try resolving from identifier/email
    if (!targetUserId) {
      const isNum = !isNaN(reqRow.identifier) && reqRow.identifier !== '';
      if (isNum) {
        const [u] = await query('SELECT id FROM users WHERE id = ? LIMIT 1', [parseInt(reqRow.identifier, 10)]);
        if (u) targetUserId = u.id;
      }
      if (!targetUserId && reqRow.email) {
        const [u] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [reqRow.email]);
        if (u) targetUserId = u.id;
      }
    }

    // If matched user exists in database, delete user account and clean up relations
    let deletedUserName = null;
    if (targetUserId) {
      const [user] = await query('SELECT id, full_name, role FROM users WHERE id = ? LIMIT 1', [targetUserId]);
      if (user) {
        if (user.role === 'superadmin') {
          return res.status(403).json({ success: false, message: 'Superadmin account cannot be deleted.' });
        }
        deletedUserName = user.full_name;

        // Clean up relations
        await query('DELETE FROM agency_hosts WHERE user_id = ?', [targetUserId]).catch(() => {});
        await query('DELETE FROM moderators WHERE user_id = ?', [targetUserId]).catch(() => {});
        await query('DELETE FROM live_streams WHERE host_id = ?', [targetUserId]).catch(() => {});
        await query('DELETE FROM users WHERE id = ?', [targetUserId]);

        // Invalidate Redis caches
        await cache.del(`user:${targetUserId}`);
        await cache.del(`user:balance:${targetUserId}`);
        await cache.del(`admin:user:${targetUserId}`);
        await cache.delByPattern(`user:transactions:${targetUserId}*`);
        await cache.delByPattern('admin:users*');
        await cache.delByPattern('admin:dashboard*');
      }
    }

    // Update request status to 'approved'
    await query(
      `UPDATE account_deletion_requests 
       SET status = 'approved', 
           user_id = ?,
           admin_notes = ?, 
           reviewed_by = ?, 
           reviewed_at = NOW() 
       WHERE id = ?`,
      [targetUserId, notes || 'Account and data permanently deleted by Admin.', req.user?.id || 1, id]
    );

    // Invalidate deletion requests cache
    await cache.delByPattern('admin:deletion_requests*');

    return res.json({
      success: true,
      message: targetUserId
        ? `User #${targetUserId} (${deletedUserName || 'User'}) permanently deleted and request marked as Approved.`
        : 'Request marked as Approved (No active account found with matching identifier).',
    });
  } catch (err) {
    console.error('approveDeletionRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve deletion request.', error: err.message });
  }
}

export async function rejectDeletionRequest(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const [reqRow] = await query('SELECT * FROM account_deletion_requests WHERE id = ? LIMIT 1', [id]);
    if (!reqRow) {
      return res.status(404).json({ success: false, message: 'Deletion request not found.' });
    }

    const reviewerId = req.user?.id || 1;
    const finalNotes = (notes && String(notes).trim()) ? String(notes).trim() : 'Request rejected by Admin.';

    // 1. Database-First Write (SSOT)
    await query(
      `UPDATE account_deletion_requests 
       SET status = 'rejected', 
           admin_notes = ?, 
           reviewed_by = ?, 
           reviewed_at = NOW() 
       WHERE id = ?`,
      [finalNotes, reviewerId, id]
    );

    // 2. Fetch updated request with user details for instant client response
    const [updatedRow] = await query(
      `SELECT 
        r.id,
        r.user_id,
        r.identifier,
        r.name,
        r.email,
        r.phone,
        r.reason,
        r.details,
        r.status,
        r.admin_notes,
        r.reviewed_by,
        r.ip_address,
        r.created_at,
        r.reviewed_at,
        COALESCE(u.full_name, r.name) as matched_user_name,
        u.avatar_url as matched_user_avatar,
        u.coins as matched_user_coins,
        u.diamonds as matched_user_diamonds,
        u.role as matched_user_role,
        admin.full_name as reviewer_name
       FROM account_deletion_requests r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN users admin ON r.reviewed_by = admin.id
       WHERE r.id = ?
       LIMIT 1`,
      [id]
    );

    // 3. Invalidate Redis deletion requests cache
    await cache.delByPattern('admin:deletion_requests*');

    return res.json({
      success: true,
      message: 'Account deletion request has been marked as Rejected.',
      request: updatedRow || null,
    });
  } catch (err) {
    console.error('rejectDeletionRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject deletion request.', error: err.message });
  }
}

export async function deleteDeletionRequestRecord(req, res) {
  try {
    const { id } = req.params;
    await query('DELETE FROM account_deletion_requests WHERE id = ?', [id]);
    await cache.delByPattern('admin:deletion_requests*');

    return res.json({
      success: true,
      message: 'Deletion request record removed successfully.',
    });
  } catch (err) {
    console.error('deleteDeletionRequestRecord error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete record.', error: err.message });
  }
}

// =========================================================================
// CHAT MODERATION & MEDIA CLEANUP (ADMIN PANEL)
// =========================================================================

/**
 * 1. Search Users for Chat Moderation
 * GET /api/admin/chats/users?query=...
 */
export async function getAdminChatUsers(req, res) {
  try {
    const search = (req.query.query || req.query.search || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    let whereClause = "WHERE u.role != 'superadmin'";
    const params = [];

    if (search) {
      if (!isNaN(search)) {
        whereClause += ' AND (u.id = ? OR u.full_name LIKE ? OR u.email LIKE ?)';
        params.push(parseInt(search, 10), `%${search}%`, `%${search}%`);
      } else {
        whereClause += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
    }

    // Count total users matching
    const countSql = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
    const countRows = await query(countSql, params);
    const total = countRows?.[0]?.total || 0;

    // Fetch users with conversation & message counts
    const selectSql = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.avatar_url,
        u.role,
        u.level,
        u.created_at,
        (
          SELECT COUNT(*) 
          FROM conversations c 
          WHERE c.user1_id = u.id OR c.user2_id = u.id
        ) as conversation_count,
        (
          SELECT COUNT(*) 
          FROM chat_messages m 
          WHERE m.sender_id = u.id OR m.receiver_id = u.id
        ) as total_messages_count,
        (
          SELECT COUNT(*)
          FROM chat_messages m
          WHERE (m.sender_id = u.id OR m.receiver_id = u.id)
            AND (m.message_type IN ('image', 'video', 'audio', 'multiple') OR m.media_url IS NOT NULL)
        ) as total_media_messages_count
      FROM users u
      ${whereClause}
      ORDER BY total_messages_count DESC, conversation_count DESC, u.id DESC
      LIMIT ? OFFSET ?
    `;

    const users = await query(selectSql, [...params, limit, offset]);

    return res.json({
      success: true,
      users: users || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('getAdminChatUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to search users.', error: err.message });
  }
}

/**
 * 2. Get Conversations for a Specific User or Global List
 * GET /api/admin/chats/conversations?userId=...&search=...
 */
export async function getAdminConversations(req, res) {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
    const search = (req.query.search || req.query.query || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const whereParts = [];
    const params = [];

    if (userId) {
      whereParts.push('(c.user1_id = ? OR c.user2_id = ?)');
      params.push(userId, userId);
    }

    if (search) {
      if (!isNaN(search)) {
        whereParts.push('(c.id = ? OR u1.id = ? OR u2.id = ? OR u1.full_name LIKE ? OR u2.full_name LIKE ? OR c.last_message LIKE ?)');
        const sNum = parseInt(search, 10);
        params.push(sNum, sNum, sNum, `%${search}%`, `%${search}%`, `%${search}%`);
      } else {
        whereParts.push('(u1.full_name LIKE ? OR u2.full_name LIKE ? OR c.last_message LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
    }

    const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) as total 
      FROM conversations c
      JOIN users u1 ON u1.id = c.user1_id
      JOIN users u2 ON u2.id = c.user2_id
      ${whereSql}
    `;
    const countRows = await query(countSql, params);
    const total = countRows?.[0]?.total || 0;

    const selectSql = `
      SELECT 
        c.id,
        c.user1_id,
        c.user2_id,
        c.last_message,
        c.last_message_at,
        c.background_image,
        c.background_color,
        c.created_at,
        u1.full_name as user1_name,
        u1.avatar_url as user1_avatar,
        u1.email as user1_email,
        u1.role as user1_role,
        u1.level as user1_level,
        u2.full_name as user2_name,
        u2.avatar_url as user2_avatar,
        u2.email as user2_email,
        u2.role as user2_role,
        u2.level as user2_level,
        (
          SELECT COUNT(*) 
          FROM chat_messages m 
          WHERE m.conversation_id = c.id
        ) as total_messages,
        (
          SELECT COUNT(*) 
          FROM chat_messages m 
          WHERE m.conversation_id = c.id 
            AND (m.message_type = 'image' OR m.media_url REGEXP '\\.(png|jpg|jpeg|webp|gif|svg)$')
        ) as image_count,
        (
          SELECT COUNT(*) 
          FROM chat_messages m 
          WHERE m.conversation_id = c.id 
            AND (m.message_type = 'video' OR m.media_url REGEXP '\\.(mp4|mov|avi|mkv|webm)$')
        ) as video_count,
        (
          SELECT COUNT(*) 
          FROM chat_messages m 
          WHERE m.conversation_id = c.id 
            AND (m.message_type = 'audio' OR m.media_url REGEXP '\\.(mp3|wav|aac|ogg|m4a)$')
        ) as audio_count
      FROM conversations c
      JOIN users u1 ON u1.id = c.user1_id
      JOIN users u2 ON u2.id = c.user2_id
      ${whereSql}
      ORDER BY c.last_message_at DESC, c.id DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await query(selectSql, [...params, limit, offset]);

    const conversations = (rows || []).map((row) => ({
      id: row.id,
      user1: {
        id: row.user1_id,
        full_name: row.user1_name,
        avatar_url: row.user1_avatar,
        email: row.user1_email,
        role: row.user1_role,
        level: row.user1_level,
      },
      user2: {
        id: row.user2_id,
        full_name: row.user2_name,
        avatar_url: row.user2_avatar,
        email: row.user2_email,
        role: row.user2_role,
        level: row.user2_level,
      },
      last_message: row.last_message,
      last_message_at: row.last_message_at,
      background_image: row.background_image,
      background_color: row.background_color,
      created_at: row.created_at,
      total_messages: row.total_messages || 0,
      image_count: row.image_count || 0,
      video_count: row.video_count || 0,
      audio_count: row.audio_count || 0,
      has_images: (row.image_count || 0) > 0,
      has_videos: (row.video_count || 0) > 0,
      has_audio: (row.audio_count || 0) > 0,
    }));

    return res.json({
      success: true,
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('getAdminConversations error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversations.', error: err.message });
  }
}

/**
 * 3. Get Messages for a Specific Conversation
 * GET /api/admin/chats/conversations/:id/messages
 */
export async function getAdminConversationMessages(req, res) {
  try {
    const conversationId = parseInt(req.params.id, 10);
    if (!conversationId || isNaN(conversationId)) {
      return res.status(400).json({ success: false, message: 'Valid conversation ID is required.' });
    }

    // Verify conversation
    const convRows = await query(
      `SELECT c.*, 
        u1.full_name as user1_name, u1.avatar_url as user1_avatar,
        u2.full_name as user2_name, u2.avatar_url as user2_avatar
       FROM conversations c
       JOIN users u1 ON u1.id = c.user1_id
       JOIN users u2 ON u2.id = c.user2_id
       WHERE c.id = ? LIMIT 1`,
      [conversationId]
    );

    if (!convRows || convRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const conversation = convRows[0];

    // Fetch messages chronologically
    const messagesSql = `
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.receiver_id,
        m.reply_to_id,
        m.message_type,
        m.message,
        m.media_url,
        m.media,
        m.is_read,
        m.created_at,
        sender.full_name as sender_name,
        sender.avatar_url as sender_avatar,
        sender.role as sender_role,
        receiver.full_name as receiver_name,
        receiver.avatar_url as receiver_avatar,
        receiver.role as receiver_role
      FROM chat_messages m
      JOIN users sender ON sender.id = m.sender_id
      JOIN users receiver ON receiver.id = m.receiver_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC, m.id ASC
    `;

    const rawMessages = await query(messagesSql, [conversationId]);

    // Fetch media details from chat_message_media if any
    const mediaMap = new Map();
    if (rawMessages.length > 0) {
      const msgIds = rawMessages.map((m) => m.id);
      const placeholders = msgIds.map(() => '?').join(',');
      const mediaRows = await query(
        `SELECT * FROM chat_message_media WHERE message_id IN (${placeholders}) ORDER BY display_order ASC, id ASC`,
        msgIds
      );

      for (const row of mediaRows || []) {
        if (!mediaMap.has(row.message_id)) {
          mediaMap.set(row.message_id, []);
        }
        mediaMap.get(row.message_id).push(row);
      }
    }

    const messages = (rawMessages || []).map((m) => {
      let parsedMedia = null;
      if (m.media) {
        try {
          parsedMedia = typeof m.media === 'string' ? JSON.parse(m.media) : m.media;
        } catch {
          parsedMedia = null;
        }
      }

      return {
        id: m.id,
        conversation_id: m.conversation_id,
        sender: {
          id: m.sender_id,
          full_name: m.sender_name,
          avatar_url: m.sender_avatar,
          role: m.sender_role,
        },
        receiver: {
          id: m.receiver_id,
          full_name: m.receiver_name,
          avatar_url: m.receiver_avatar,
          role: m.receiver_role,
        },
        reply_to_id: m.reply_to_id,
        message_type: m.message_type,
        message: m.message,
        media_url: m.media_url,
        media: parsedMedia,
        media_items: mediaMap.get(m.id) || [],
        is_read: Boolean(m.is_read),
        created_at: m.created_at,
      };
    });

    return res.json({
      success: true,
      conversation: {
        id: conversation.id,
        user1: { id: conversation.user1_id, full_name: conversation.user1_name, avatar_url: conversation.user1_avatar },
        user2: { id: conversation.user2_id, full_name: conversation.user2_name, avatar_url: conversation.user2_avatar },
        background_image: conversation.background_image,
        background_color: conversation.background_color,
      },
      messages,
      total: messages.length,
    });
  } catch (err) {
    console.error('getAdminConversationMessages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages.', error: err.message });
  }
}

/**
 * 4. Delete Single Chat Message (Cleans Storage Files & DB)
 * DELETE /api/admin/chats/messages/:id
 */
export async function deleteAdminChatMessage(req, res) {
  try {
    const messageId = parseInt(req.params.id, 10);
    if (!messageId || isNaN(messageId)) {
      return res.status(400).json({ success: false, message: 'Valid message ID is required.' });
    }

    // 1. Locate message
    const msgRows = await query('SELECT * FROM chat_messages WHERE id = ? LIMIT 1', [messageId]);
    if (!msgRows || msgRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }
    const message = msgRows[0];

    // 2. Locate any attached media in chat_message_media
    const mediaRows = await query('SELECT media_url, thumbnail_url FROM chat_message_media WHERE message_id = ?', [messageId]);

    // 3. Collect media paths for storage deletion
    const filesToDelete = [];
    if (message.media_url) filesToDelete.push(message.media_url);
    if (message.media) filesToDelete.push(message.media);

    for (const row of mediaRows || []) {
      if (row.media_url) filesToDelete.push(row.media_url);
      if (row.thumbnail_url) filesToDelete.push(row.thumbnail_url);
    }

    // 4. Delete physical files from disk
    const removedCount = deleteMultipleFilesFromStorage(filesToDelete);

    // 5. Delete from MySQL (cascades to chat_message_media)
    await query('DELETE FROM chat_messages WHERE id = ?', [messageId]);

    // 6. Update conversation last_message if this was the last message
    const remainingLast = await query(
      'SELECT message, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
      [message.conversation_id]
    );

    if (remainingLast && remainingLast.length > 0) {
      await query(
        'UPDATE conversations SET last_message = ?, last_message_at = ? WHERE id = ?',
        [remainingLast[0].message || 'Media attachment', remainingLast[0].created_at, message.conversation_id]
      );
    }

    // 7. Instant Redis cache invalidation
    await cache.delByPattern(`chat:conversations:${message.sender_id}:*`);
    await cache.delByPattern(`chat:conversations:${message.receiver_id}:*`);
    await cache.delByPattern(`chat:messages:${message.conversation_id}:*`);
    await cache.del(`chat:conv:${message.conversation_id}`);

    // 8. Realtime socket notification
    if (req.io) {
      const socketPayload = { message_id: messageId, conversation_id: message.conversation_id };
      req.io.to(`user_${message.sender_id}`).emit('chat:message_deleted', socketPayload);
      req.io.to(`user_${message.receiver_id}`).emit('chat:message_deleted', socketPayload);
    }

    return res.json({
      success: true,
      message: 'Message and attached storage media removed permanently.',
      removed_files: removedCount,
    });
  } catch (err) {
    console.error('deleteAdminChatMessage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete message.', error: err.message });
  }
}

/**
 * 5. Delete Entire Conversation (Cleans Storage Files & DB)
 * DELETE /api/admin/chats/conversations/:id
 */
export async function deleteAdminConversation(req, res) {
  try {
    const conversationId = parseInt(req.params.id, 10);
    if (!conversationId || isNaN(conversationId)) {
      return res.status(400).json({ success: false, message: 'Valid conversation ID is required.' });
    }

    // 1. Locate conversation
    const convRows = await query('SELECT * FROM conversations WHERE id = ? LIMIT 1', [conversationId]);
    if (!convRows || convRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }
    const conversation = convRows[0];

    // 2. Gather all media files across all messages in this conversation
    const msgMediaRows = await query(
      'SELECT media_url, media FROM chat_messages WHERE conversation_id = ?',
      [conversationId]
    );

    const extraMediaRows = await query(
      `SELECT cmm.media_url, cmm.thumbnail_url 
       FROM chat_message_media cmm
       JOIN chat_messages cm ON cm.id = cmm.message_id
       WHERE cm.conversation_id = ?`,
      [conversationId]
    );

    const filesToDelete = [];
    if (conversation.background_image) {
      filesToDelete.push(conversation.background_image);
    }

    for (const m of msgMediaRows || []) {
      if (m.media_url) filesToDelete.push(m.media_url);
      if (m.media) filesToDelete.push(m.media);
    }

    for (const r of extraMediaRows || []) {
      if (r.media_url) filesToDelete.push(r.media_url);
      if (r.thumbnail_url) filesToDelete.push(r.thumbnail_url);
    }

    // 3. Delete physical files from disk
    const removedCount = deleteMultipleFilesFromStorage(filesToDelete);

    // 4. Delete conversation from MySQL (cascades to chat_messages and chat_message_media)
    await query('DELETE FROM conversations WHERE id = ?', [conversationId]);

    // 5. Invalidate Redis cache
    await cache.delByPattern(`chat:conversations:${conversation.user1_id}:*`);
    await cache.delByPattern(`chat:conversations:${conversation.user2_id}:*`);
    await cache.delByPattern(`chat:messages:${conversationId}:*`);
    await cache.del(`chat:conv:${conversationId}`);

    // 6. Realtime socket notification
    if (req.io) {
      const socketPayload = { conversation_id: conversationId };
      req.io.to(`user_${conversation.user1_id}`).emit('chat:conversation_deleted', socketPayload);
      req.io.to(`user_${conversation.user2_id}`).emit('chat:conversation_deleted', socketPayload);
    }

    return res.json({
      success: true,
      message: 'Conversation and all associated storage files permanently deleted.',
      removed_files: removedCount,
    });
  } catch (err) {
    console.error('deleteAdminConversation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete conversation.', error: err.message });
  }
}

/**
 * POST /api/admin/users/clear-all
 * Purge/delete all regular users, reset related history, reclaim reserved accounts,
 * and restart auto-increment from ID 2 (or specified offset).
 * Super Admin (admin@umi.live, ID 1) is strictly preserved.
 */
export async function clearAllUsers(req, res) {
  let conn;
  try {
    const { action_password, restart_id = 2 } = req.body;

    // Verify Action Security Password
    const settingsRows = await query(
      "SELECT key_value FROM system_settings WHERE key_name = 'action_security_password' LIMIT 1"
    );
    const requiredPassword = settingsRows[0]?.key_value || 'admin123';

    if (!action_password || action_password !== requiredPassword) {
      return res.status(403).json({
        success: false,
        message: 'Invalid Action Security Password.',
      });
    }

    conn = await getPool().getConnection();
    await conn.beginTransaction();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Truncate user-generated content and transaction tables
    const tablesToTruncate = [
      'agencies',
      'agency_host_requests',
      'chat_messages',
      'chat_message_media',
      'conversations',
      'gift_transactions',
      'host_requests',
      'live_duration_reward_history',
      'live_room_admins',
      'live_room_kicks',
      'live_room_messages',
      'live_room_seat_requests',
      'live_room_seats',
      'live_room_viewers',
      'live_rooms',
      'moderation_reports',
      'moderators',
      'notifications',
      'p2p_calls',
      'post_comments',
      'post_media',
      'post_reactions',
      'posts',
      'reseller_sales',
      'transactions',
      'user_blocks',
      'user_devices',
      'user_entry_effects',
      'user_fcm_tokens',
      'user_follows',
      'user_level_rewards',
      'user_package_subscriptions',
      'user_theme_items',
      'user_thumbnails',
      'withdrawals',
    ];

    for (const table of tablesToTruncate) {
      try {
        await conn.query(`TRUNCATE TABLE \`${table}\``);
      } catch (_) {}
    }

    // 2. Delete ALL users in the entire system except strictly Super Admin (ID 1)
    const [delResult] = await conn.query(`
      DELETE FROM users 
      WHERE id != 1 AND email != 'admin@umi.live'
    `);
    const deletedCount = delResult.affectedRows || 0;

    // 3. Reset Super Admin (ID 1) balances & status
    await conn.query(`
      UPDATE users 
      SET coins = 0, diamonds = 0, star = 0, level = 99, is_banned = 0
      WHERE id = 1 OR email = 'admin@umi.live'
    `);

    // 4. Reclaim and reset all reserved accounts back to available
    try {
      await conn.query(`
        UPDATE reserved_accounts 
        SET status = 'available', assigned_to_user_id = NULL, assigned_at = NULL, notes = 'System Reserved VIP'
      `);
    } catch (_) {}

    // 5. Reset users AUTO_INCREMENT to restart_id (default: 2)
    const nextAutoInc = Math.max(2, parseInt(restart_id, 10) || 2);
    await conn.query(`ALTER TABLE users AUTO_INCREMENT = ${nextAutoInc}`);

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.commit();
    conn.release();

    // 6. Completely flush Redis caches
    try {
      if (cache && typeof cache.flushAll === 'function') {
        await cache.flushAll();
      } else {
        await cache.delByPattern('*');
      }
    } catch (redisErr) {
      console.warn('Redis flush warning in clearAllUsers:', redisErr.message);
    }

    return res.json({
      success: true,
      message: `System purged successfully! ${deletedCount} users removed. User registrations will now restart from ID #${nextAutoInc}.`,
      deletedUsersCount: deletedCount,
      nextAutoIncrement: nextAutoInc,
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        await conn.rollback();
      } catch (_) {}
      conn.release();
    }
    console.error('[Clear All Users Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to purge users from system.',
      error: err.message,
    });
  }
}







