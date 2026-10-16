import { getPool, query } from '../../config/db.js';
import { cache } from '../../config/redis.js';

/**
 * Helper to resolve the active reseller ID.
 * Resellers operate strictly on their own account.
 * Admins/superadmins can optionally pass ?resellerId= to act on behalf of a reseller.
 */
function resolveResellerId(req) {
  if (req.user) {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      const specified = req.query.resellerId || req.body?.resellerId || req.params.resellerId;
      return specified ? parseInt(specified, 10) : req.user.id;
    }
    return req.user.id;
  }
  const fallback = req.query.resellerId || req.body?.resellerId || req.params.resellerId;
  return fallback ? parseInt(fallback, 10) : null;
}

/**
 * GET /api/mobile/reseller/balance
 * GET /api/mobile/reseller/profile
 * Returns the current reseller's coin balance, profile, and sales performance.
 * Production Redis Cache-Aside: 'reseller:balance:{resellerId}' (TTL 60s).
 */
export async function getResellerBalance(req, res) {
  try {
    const resellerId = resolveResellerId(req);
    if (!resellerId || isNaN(resellerId)) {
      return res.status(400).json({ success: false, message: 'Reseller ID could not be identified.' });
    }

    const cacheKey = `reseller:balance:${resellerId}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      // 1. Fetch reseller user record
      const users = await query(
        `SELECT id, full_name, email, avatar_url, role, coins, level, is_banned, created_at 
         FROM users 
         WHERE id = ?`,
        [resellerId]
      );

      if (users.length === 0) {
        return null;
      }

      const reseller = users[0];

      // 2. Fetch sales summary metrics
      const [allTimeStats] = await query(
        `SELECT 
           COALESCE(SUM(coin_amount), 0) AS total_coins_sold,
           COALESCE(SUM(price_amount), 0) AS total_revenue,
           COUNT(id) AS total_sales_count
         FROM reseller_sales 
         WHERE reseller_id = ?`,
        [resellerId]
      );

      const [todayStats] = await query(
        `SELECT 
           COALESCE(SUM(coin_amount), 0) AS today_coins_sold,
           COALESCE(SUM(price_amount), 0) AS today_revenue,
           COUNT(id) AS today_sales_count
         FROM reseller_sales 
         WHERE reseller_id = ? AND DATE(created_at) = CURDATE()`,
        [resellerId]
      );

      const [monthStats] = await query(
        `SELECT 
           COALESCE(SUM(coin_amount), 0) AS month_coins_sold,
           COALESCE(SUM(price_amount), 0) AS month_revenue,
           COUNT(id) AS month_sales_count
         FROM reseller_sales 
         WHERE reseller_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [resellerId]
      );

      return {
        reseller: {
          id: reseller.id,
          full_name: reseller.full_name,
          email: reseller.email,
          avatar_url: reseller.avatar_url,
          role: reseller.role,
          coins: reseller.coins,
          level: reseller.level || 1,
          is_banned: !!reseller.is_banned,
          created_at: reseller.created_at,
        },
        coins: reseller.coins,
        stats: {
          total_coins_sold: parseInt(allTimeStats?.total_coins_sold || 0, 10),
          total_revenue: parseFloat(allTimeStats?.total_revenue || 0),
          total_sales_count: parseInt(allTimeStats?.total_sales_count || 0, 10),
          today_coins_sold: parseInt(todayStats?.today_coins_sold || 0, 10),
          today_revenue: parseFloat(todayStats?.today_revenue || 0),
          today_sales_count: parseInt(todayStats?.today_sales_count || 0, 10),
          month_coins_sold: parseInt(monthStats?.month_coins_sold || 0, 10),
          month_revenue: parseFloat(monthStats?.month_revenue || 0),
          month_sales_count: parseInt(monthStats?.month_sales_count || 0, 10),
        },
      };
    });

    if (!data) {
      return res.status(404).json({ success: false, message: 'Reseller account not found.' });
    }

    return res.json({
      success: true,
      reseller: data.reseller,
      coins: data.coins,
      stats: data.stats,
    });
  } catch (err) {
    console.error('getResellerBalance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reseller balance.', error: err.message });
  }
}

/**
 * GET /api/mobile/reseller/users/search
 * Search customer accounts by User ID, Name, or Email.
 * Production Redis Cache-Aside: 'reseller:search_users:{cleanTerm}' (TTL 30s).
 */
export async function searchUsers(req, res) {
  try {
    const rawQuery = req.query.q || req.query.search || req.query.userId || '';
    const cleanTerm = String(rawQuery).trim().replace(/^#/, '');

    if (!cleanTerm) {
      return res.json({ success: true, count: 0, users: [] });
    }

    const cacheKey = `reseller:search_users:${cleanTerm.toLowerCase()}`;

    const users = await cache.getOrSet(cacheKey, 30, async () => {
      const isNumeric = !isNaN(parseInt(cleanTerm, 10));
      let sql;
      let params;

      if (isNumeric) {
        const numericId = parseInt(cleanTerm, 10);
        sql = `
          SELECT id, full_name, email, avatar_url, role, coins, level, is_banned, created_at 
          FROM users 
          WHERE id = ? OR full_name LIKE ? OR email LIKE ?
          ORDER BY (id = ?) DESC, id ASC 
          LIMIT 20
        `;
        params = [numericId, `%${cleanTerm}%`, `%${cleanTerm}%`, numericId];
      } else {
        sql = `
          SELECT id, full_name, email, avatar_url, role, coins, level, is_banned, created_at 
          FROM users 
          WHERE full_name LIKE ? OR email LIKE ?
          ORDER BY id ASC 
          LIMIT 20
        `;
        params = [`%${cleanTerm}%`, `%${cleanTerm}%`];
      }

      const rows = await query(sql, params);
      return (rows || []).map((u) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        avatar_url: u.avatar_url,
        role: u.role,
        coins: u.coins,
        level: u.level || 1,
        is_banned: !!u.is_banned,
        created_at: u.created_at,
      }));
    });

    return res.json({
      success: true,
      query: cleanTerm,
      count: users.length,
      users,
    });
  } catch (err) {
    console.error('searchUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to search users.', error: err.message });
  }
}

/**
 * GET /api/mobile/reseller/users/:userId
 * Select and get full details of a specific customer user by User ID.
 * Production Redis Cache-Aside: 'reseller:user_details:{userId}' (TTL 60s).
 */
export async function getUserDetails(req, res) {
  try {
    const rawUserId = req.params.userId || req.params.id;
    const cleanUserId = parseInt(String(rawUserId).replace(/^#/, ''), 10);

    if (!cleanUserId || isNaN(cleanUserId)) {
      return res.status(400).json({ success: false, message: 'Valid customer User ID is required.' });
    }

    const resellerId = resolveResellerId(req);
    const cacheKey = `reseller:user_details:${cleanUserId}:${resellerId || 'all'}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      const rows = await query(
        `SELECT id, full_name, email, avatar_url, role, coins, level, is_banned, created_at 
         FROM users 
         WHERE id = ?`,
        [cleanUserId]
      );

      if (rows.length === 0) {
        return null;
      }

      const user = rows[0];

      // Past top-up history between this reseller and this buyer
      let pastHistory = { total_coins_received: 0, recharge_count: 0, last_recharge_at: null };
      if (resellerId) {
        const [historyRows] = await query(
          `SELECT 
             COALESCE(SUM(coin_amount), 0) AS total_coins_received,
             COUNT(id) AS recharge_count,
             MAX(created_at) AS last_recharge_at
           FROM reseller_sales 
           WHERE reseller_id = ? AND buyer_id = ?`,
          [resellerId, cleanUserId]
        );
        if (historyRows) {
          pastHistory = {
            total_coins_received: parseInt(historyRows.total_coins_received || 0, 10),
            recharge_count: parseInt(historyRows.recharge_count || 0, 10),
            last_recharge_at: historyRows.last_recharge_at,
          };
        }
      }

      return {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          avatar_url: user.avatar_url,
          role: user.role,
          coins: user.coins,
          level: user.level || 1,
          is_banned: !!user.is_banned,
          created_at: user.created_at,
        },
        pastHistory,
      };
    });

    if (!data) {
      return res.status(404).json({ success: false, message: `Customer user #${cleanUserId} not found.` });
    }

    return res.json({
      success: true,
      user: data.user,
      pastHistory: data.pastHistory,
    });
  } catch (err) {
    console.error('getUserDetails error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch user details.', error: err.message });
  }
}

/**
 * POST /api/mobile/reseller/recharge
 * POST /api/mobile/reseller/transfer
 * Top-up / Recharge customer account with coins from reseller stock.
 * Mandatory SSOT: MySQL transaction commits FIRST, then instant Redis cache invalidation.
 */
export async function rechargeUser(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const resellerId = resolveResellerId(req);
    if (!resellerId || isNaN(resellerId)) {
      return res.status(400).json({ success: false, message: 'Reseller ID could not be identified.' });
    }

    const {
      buyerId,
      userId,
      coinAmount,
      coins: altCoins,
      priceAmount = 0,
      currency = 'BDT',
      notes = '',
    } = req.body;

    const targetBuyerId = parseInt(buyerId || userId, 10);
    const coinsToTransfer = parseInt(coinAmount || altCoins, 10);

    if (!targetBuyerId || isNaN(targetBuyerId)) {
      return res.status(400).json({ success: false, message: 'A valid customer User ID is required.' });
    }

    if (!coinsToTransfer || isNaN(coinsToTransfer) || coinsToTransfer <= 0) {
      return res.status(400).json({ success: false, message: 'A positive coin amount is required.' });
    }

    if (resellerId === targetBuyerId) {
      return res.status(400).json({ success: false, message: 'You cannot recharge your own reseller account.' });
    }

    // 1. Verify reseller exists & has sufficient balance (FOR UPDATE to prevent race conditions)
    const [resellerRows] = await connection.execute(
      'SELECT id, full_name, email, role, coins, is_banned FROM users WHERE id = ? FOR UPDATE',
      [resellerId]
    );

    if (resellerRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reseller account not found.' });
    }

    const reseller = resellerRows[0];
    if (reseller.is_banned) {
      return res.status(403).json({ success: false, message: 'Your reseller account has been suspended.' });
    }

    if (reseller.coins < coinsToTransfer) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coin stock! You currently have ${reseller.coins.toLocaleString()} coins, but requested ${coinsToTransfer.toLocaleString()} coins.`,
        availableCoins: reseller.coins,
      });
    }

    // 2. Verify target customer exists & is active
    const [buyerRows] = await connection.execute(
      'SELECT id, full_name, email, role, coins, is_banned FROM users WHERE id = ? FOR UPDATE',
      [targetBuyerId]
    );

    if (buyerRows.length === 0) {
      return res.status(404).json({ success: false, message: `Customer user #${targetBuyerId} not found.` });
    }

    const buyer = buyerRows[0];
    if (buyer.is_banned) {
      return res.status(403).json({ success: false, message: 'Cannot transfer coins to a suspended customer account.' });
    }

    // Begin atomic transaction
    await connection.beginTransaction();

    // 3. Deduct coins from reseller
    await connection.execute(
      'UPDATE users SET coins = coins - ? WHERE id = ?',
      [coinsToTransfer, resellerId]
    );

    // 4. Add coins to buyer
    await connection.execute(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [coinsToTransfer, targetBuyerId]
    );

    // 5. Insert record into reseller_sales audit table
    const [saleResult] = await connection.execute(
      `INSERT INTO reseller_sales (reseller_id, buyer_id, coin_amount, price_amount, currency, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        resellerId,
        targetBuyerId,
        coinsToTransfer,
        parseFloat(priceAmount) || 0,
        currency || 'BDT',
        notes ? String(notes).slice(0, 255) : '',
      ]
    );

    // 6. Record in general transactions ledger for buyer
    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'coin_purchase', ?, ?, 'completed')`,
      [
        targetBuyerId,
        coinsToTransfer,
        `Recharged ${coinsToTransfer.toLocaleString()} coins from Reseller #${resellerId} (${reseller.full_name || 'Reseller'})`,
      ]
    );

    // 7. Record in general transactions ledger for reseller
    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'reseller_transfer', ?, ?, 'completed')`,
      [
        resellerId,
        coinsToTransfer,
        `Transferred ${coinsToTransfer.toLocaleString()} coins to Customer #${targetBuyerId} (${buyer.full_name || 'Customer'})`,
      ]
    );

    // Commit MySQL transaction FIRST (SSOT)
    await connection.commit();

    const saleId = saleResult.insertId;
    const newResellerCoins = reseller.coins - coinsToTransfer;
    const newBuyerCoins = buyer.coins + coinsToTransfer;

    // Database write succeeded -> Instant Redis Invalidation
    await Promise.all([
      cache.del(`reseller:balance:${resellerId}`),
      cache.del(`user:${resellerId}`),
      cache.del(`user:balance:${resellerId}`),
      cache.del(`reseller:balance:${targetBuyerId}`),
      cache.del(`user:${targetBuyerId}`),
      cache.del(`user:balance:${targetBuyerId}`),
      cache.del(`mobile:user:profile:${resellerId}`),
      cache.del(`mobile:user:profile:${targetBuyerId}`),
      cache.delByPattern(`reseller:user_details:${targetBuyerId}*`),
      cache.delByPattern(`reseller:transactions:${resellerId}:*`),
      cache.delByPattern(`user:transactions:${resellerId}*`),
      cache.delByPattern(`user:transactions:${targetBuyerId}*`),
      cache.delByPattern('reseller_sales:*'),
      cache.delByPattern('resellers:*'),
      cache.delByPattern('admin:users*'),
      cache.delByPattern('admin:dashboard*'),
    ]);

    return res.status(201).json({
      success: true,
      message: `Successfully recharged ${coinsToTransfer.toLocaleString()} coins to User #${targetBuyerId} (${buyer.full_name})!`,
      transaction: {
        id: saleId,
        reseller_id: resellerId,
        buyer_id: targetBuyerId,
        buyer_name: buyer.full_name,
        buyer_email: buyer.email,
        coin_amount: coinsToTransfer,
        price_amount: parseFloat(priceAmount) || 0,
        currency: currency || 'BDT',
        notes: notes || '',
        created_at: new Date(),
      },
      resellerRemainingCoins: newResellerCoins,
      buyerNewBalance: newBuyerCoins,
    });
  } catch (err) {
    await connection.rollback();
    console.error('rechargeUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to complete coin recharge.', error: err.message });
  } finally {
    connection.release();
  }
}

/**
 * GET /api/mobile/reseller/transactions
 * Retrieve transaction history of coin recharges performed by this reseller.
 * Production Redis Cache-Aside: 'reseller:transactions:{resellerId}:{page}:{limit}:{period}:{search}' (TTL 60s).
 */
export async function getResellerTransactions(req, res) {
  try {
    const resellerId = resolveResellerId(req);
    if (!resellerId || isNaN(resellerId)) {
      return res.status(400).json({ success: false, message: 'Reseller ID could not be identified.' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const period = req.query.period || 'all'; // 'all' | 'today' | 'week' | 'month'
    const search = (req.query.search || req.query.q || '').trim();

    const cacheKey = `reseller:transactions:${resellerId}:${page}:${limit}:${period}:${search || 'all'}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      // Build filters
      const whereClauses = ['rs.reseller_id = ?'];
      const params = [resellerId];

      if (period === 'today') {
        whereClauses.push('DATE(rs.created_at) = CURDATE()');
      } else if (period === 'week') {
        whereClauses.push('rs.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
      } else if (period === 'month') {
        whereClauses.push('rs.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
      }

      if (search) {
        const isNumeric = !isNaN(parseInt(search, 10));
        if (isNumeric) {
          whereClauses.push('(rs.buyer_id = ? OR rs.id = ? OR b.full_name LIKE ? OR b.email LIKE ? OR rs.notes LIKE ?)');
          params.push(parseInt(search, 10), parseInt(search, 10), `%${search}%`, `%${search}%`, `%${search}%`);
        } else {
          whereClauses.push('(b.full_name LIKE ? OR b.email LIKE ? OR rs.notes LIKE ?)');
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
      }

      const whereSql = whereClauses.join(' AND ');

      // 1. Overall stats for summary card
      const [summaryStats] = await query(
        `SELECT 
           COALESCE(SUM(rs.coin_amount), 0) AS total_coins_sold,
           COALESCE(SUM(rs.price_amount), 0) AS total_revenue,
           COUNT(rs.id) AS total_transactions
         FROM reseller_sales rs
         WHERE rs.reseller_id = ?`,
        [resellerId]
      );

      const [todayStats] = await query(
        `SELECT 
           COALESCE(SUM(rs.coin_amount), 0) AS today_coins_sold,
           COALESCE(SUM(rs.price_amount), 0) AS today_revenue
         FROM reseller_sales rs
         WHERE rs.reseller_id = ? AND DATE(rs.created_at) = CURDATE()`,
        [resellerId]
      );

      // 2. Count matching current filters
      const [countResult] = await query(
        `SELECT COUNT(rs.id) AS total 
         FROM reseller_sales rs
         JOIN users b ON b.id = rs.buyer_id
         WHERE ${whereSql}`,
        params
      );
      const total = countResult?.total || 0;

      // 3. Paginated transactions
      const queryParams = [...params, limit, offset];
      const rows = await query(
        `SELECT 
           rs.id,
           rs.reseller_id,
           rs.buyer_id,
           rs.coin_amount,
           rs.price_amount,
           rs.currency,
           rs.notes,
           rs.created_at,
           b.full_name AS buyer_name,
           b.email AS buyer_email,
           b.avatar_url AS buyer_avatar,
           b.role AS buyer_role
         FROM reseller_sales rs
         JOIN users b ON b.id = rs.buyer_id
         WHERE ${whereSql}
         ORDER BY rs.created_at DESC
         LIMIT ? OFFSET ?`,
        queryParams
      );

      return {
        summary: {
          total_coins_sold: parseInt(summaryStats?.total_coins_sold || 0, 10),
          total_revenue: parseFloat(summaryStats?.total_revenue || 0),
          total_transactions: parseInt(summaryStats?.total_transactions || 0, 10),
          today_coins_sold: parseInt(todayStats?.today_coins_sold || 0, 10),
          today_revenue: parseFloat(todayStats?.today_revenue || 0),
        },
        transactions: rows || [],
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
      summary: data.summary,
      transactions: data.transactions,
      pagination: data.pagination,
    });
  } catch (err) {
    console.error('getResellerTransactions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions.', error: err.message });
  }
}

/**
 * DELETE /api/mobile/reseller/transactions/:id
 * Delete a single transaction from reseller history.
 * Mandatory SSOT: MySQL write commits FIRST, then instant Redis cache invalidation.
 */
export async function deleteTransaction(req, res) {
  try {
    const rawId = req.params.id;
    const saleId = parseInt(rawId, 10);

    if (!saleId || isNaN(saleId)) {
      return res.status(400).json({ success: false, message: 'Valid transaction ID is required.' });
    }

    const resellerId = resolveResellerId(req);
    if (!resellerId || isNaN(resellerId)) {
      return res.status(400).json({ success: false, message: 'Reseller ID could not be identified.' });
    }

    // 1. Verify existence and ownership
    const [existing] = await query(
      'SELECT id, reseller_id, buyer_id, coin_amount FROM reseller_sales WHERE id = ?',
      [saleId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: `Transaction #${saleId} not found.` });
    }

    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
    if (!isAdmin && existing.reseller_id !== resellerId) {
      return res.status(403).json({ success: false, message: 'You are only authorized to delete your own sales transactions.' });
    }

    // 2. MySQL Delete First (SSOT)
    await query('DELETE FROM reseller_sales WHERE id = ?', [saleId]);

    // 3. Instant Redis Cache Invalidation
    await Promise.all([
      cache.delByPattern(`reseller:transactions:${existing.reseller_id}:*`),
      cache.delByPattern(`reseller:balance:${existing.reseller_id}*`),
      cache.delByPattern('reseller_sales:*'),
      cache.delByPattern('resellers:*'),
    ]);

    return res.json({
      success: true,
      message: `Transaction #${saleId} deleted successfully from history.`,
      deletedId: saleId,
    });
  } catch (err) {
    console.error('deleteTransaction error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete transaction.', error: err.message });
  }
}

/**
 * DELETE /api/mobile/reseller/transactions
 * POST /api/mobile/reseller/transactions/clear
 * Clear all transaction history (or for a specific period) for this reseller.
 * Mandatory SSOT: MySQL write commits FIRST, then instant Redis cache invalidation.
 */
export async function clearTransactions(req, res) {
  try {
    const resellerId = resolveResellerId(req);
    if (!resellerId || isNaN(resellerId)) {
      return res.status(400).json({ success: false, message: 'Reseller ID could not be identified.' });
    }

    const period = req.query.period || req.body?.period || 'all';

    let deleteSql = 'DELETE FROM reseller_sales WHERE reseller_id = ?';
    const params = [resellerId];

    if (period === 'today') {
      deleteSql += ' AND DATE(created_at) = CURDATE()';
    } else if (period === 'month') {
      deleteSql += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    // 1. MySQL Delete First (SSOT)
    const result = await query(deleteSql, params);
    const affectedRows = result?.affectedRows || 0;

    // 2. Instant Redis Cache Invalidation
    await Promise.all([
      cache.delByPattern(`reseller:transactions:${resellerId}:*`),
      cache.delByPattern(`reseller:balance:${resellerId}*`),
      cache.delByPattern('reseller_sales:*'),
      cache.delByPattern('resellers:*'),
    ]);

    return res.json({
      success: true,
      message: `Successfully cleared ${affectedRows} transaction records from your reseller history.`,
      affectedRows,
      period,
    });
  } catch (err) {
    console.error('clearTransactions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to clear transaction history.', error: err.message });
  }
}
