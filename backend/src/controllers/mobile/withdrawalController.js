import { query, getPool } from '../../config/db.js';
import { cache } from '../../config/redis.js';

/**
 * Resolve target user ID for withdrawal operations.
 * Regular users, hosts, and agencies operate on their own account.
 * Admins and superadmins can pass ?userId= to inspect any user.
 */
function resolveUserId(req) {
  if (req.user) {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      const specified = req.query.userId || req.body?.userId || req.params.userId;
      return specified ? parseInt(specified, 10) : req.user.id;
    }
    return req.user.id;
  }
  return null;
}

/**
 * Instant Redis cache invalidation for withdrawal-related keys.
 */
async function invalidateWithdrawalCache(userId) {
  await Promise.all([
    cache.del(`withdrawal:list:${userId}`),
    cache.delByPattern(`withdrawal:list:${userId}:*`),
    cache.del(`withdrawal:history:${userId}`),
    cache.delByPattern(`withdrawal:history:${userId}:*`),
    cache.del(`user:balance:${userId}`),
    cache.delByPattern('admin:withdrawals*'),
    cache.delByPattern('admin:dashboard*'),
  ]).catch(() => {});
}

/**
 * Helper to get the active is_convert_to_diamond setting from Redis / DB.
 */
async function getIsConvertToDiamond() {
  const val = await cache.getOrSet('setting:is_convert_to_diamond', 60, async () => {
    const rows = await query("SELECT key_value FROM system_settings WHERE key_name = 'is_convert_to_diamond' LIMIT 1");
    return rows.length > 0 ? (rows[0].key_value === 'true' || rows[0].key_value === '1') : false;
  });
  return Boolean(val);
}

/**
 * Format a withdrawal row for mobile client presentation.
 * Explicitly exposes coin_amount, diamond_amount, resolved display amount & currency,
 * and current conversion mode status.
 */
function formatWithdrawalRow(w, isDiamondConversionOn) {
  const coinAmount = parseInt(w.coin_amount || 0, 10);
  const diamondAmount = parseInt(w.diamond_amount || 0, 10);

  // Historical context of this withdrawal record:
  // If diamond_amount > 0, it was requested in diamond mode.
  // If coin_amount > 0, it was requested in coin mode.
  const isDiamondRecord = diamondAmount > 0;

  // Resolved display amount based on conversion mode and user request:
  let displayAmount = 0;
  let displayCurrency = 'coins';
  let displaySymbol = '🪙';
  let displayCurrencyLabel = 'Coin';

  if (isDiamondConversionOn) {
    // When conversion is ON: show diamonds if record was diamonds, otherwise coin amount
    displayAmount = diamondAmount > 0 ? diamondAmount : coinAmount;
    displayCurrency = diamondAmount > 0 ? 'diamonds' : 'coins';
    displaySymbol = diamondAmount > 0 ? '💎' : '🪙';
    displayCurrencyLabel = diamondAmount > 0 ? 'Diamond' : 'Coin';
  } else {
    // When conversion is OFF: show coin amount (or fallback to diamonds if legacy)
    displayAmount = coinAmount > 0 ? coinAmount : diamondAmount;
    displayCurrency = coinAmount > 0 ? 'coins' : 'diamonds';
    displaySymbol = coinAmount > 0 ? '🪙' : '💎';
    displayCurrencyLabel = coinAmount > 0 ? 'Coin' : 'Diamond';
  }

  return {
    id: w.id,
    user_id: w.user_id,

    // Both specific numeric amounts are always exposed
    coin_amount: coinAmount,
    diamond_amount: diamondAmount,

    // Resolved primary values for Flutter app UI display
    amount: displayAmount,
    currency: displayCurrency,
    currency_symbol: displaySymbol,
    currency_label: displayCurrencyLabel,
    display_text: `${displayAmount.toLocaleString()} ${displayCurrencyLabel}s`,

    // Historical record mode vs current system conversion state
    record_mode: isDiamondRecord ? 'diamond' : 'coin',
    is_diamond_record: isDiamondRecord,
    is_coin_record: !isDiamondRecord,
    is_convert_to_diamond: isDiamondConversionOn,
    conversion_mode: isDiamondConversionOn ? 'diamond' : 'coin',

    // Financial / Payout details
    usd_amount: parseFloat(w.usd_amount || 0),
    payout_amount: parseFloat(w.payout_amount || 0),
    payout_currency: w.payout_currency || 'BDT',
    host_type: w.host_type,
    payment_method: w.payment_method,
    account_details: w.account_details,
    status: w.status,
    admin_notes: w.admin_notes || null,
    created_at: w.created_at,
    updated_at: w.updated_at,
  };
}

/**
 * GET /api/mobile/wallet/withdrawals
 * GET /api/mobile/wallet/withdrawal-history
 * Returns paginated withdrawal request history for the authenticated user.
 * Redis Cache-Aside: 'withdrawal:list:{userId}:{page}:{limit}:{status}:{mode}' (TTL 60s)
 */
export async function getWithdrawalHistory(req, res) {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const status = req.query.status || 'all'; // 'pending' | 'approved' | 'rejected' | 'all'
    const offset = (page - 1) * limit;

    const isDiamondConversionOn = await getIsConvertToDiamond();
    const modeKey = isDiamondConversionOn ? 'diamond' : 'coin';
    const cacheKey = `withdrawal:list:${userId}:${page}:${limit}:${status}:${modeKey}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      let whereSql = 'WHERE w.host_id = ?';
      const params = [userId];

      if (status && status !== 'all') {
        whereSql += ' AND w.status = ?';
        params.push(status);
      }

      const [totalRow] = await query(
        `SELECT COUNT(*) AS total FROM withdrawals w ${whereSql}`,
        params
      );
      const total = parseInt(totalRow?.total || 0, 10);
      const totalPages = Math.ceil(total / limit);

      const rows = await query(
        `SELECT 
           w.id,
           w.host_id AS user_id,
           w.diamond_amount,
           w.coin_amount,
           w.usd_amount,
           w.payout_amount,
           w.payout_currency,
           w.host_type,
           w.payment_method,
           w.account_details,
           w.status,
           w.admin_notes,
           w.created_at,
           w.updated_at
         FROM withdrawals w
         ${whereSql}
         ORDER BY w.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const formatted = rows.map((r) => formatWithdrawalRow(r, isDiamondConversionOn));

      return {
        withdrawals: formatted,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    });

    return res.json({
      success: true,
      message: 'Withdrawal history retrieved successfully.',
      is_convert_to_diamond: isDiamondConversionOn,
      active_currency: isDiamondConversionOn ? 'diamonds' : 'coins',
      active_currency_symbol: isDiamondConversionOn ? '💎' : '🪙',
      active_currency_label: isDiamondConversionOn ? 'Diamond' : 'Coin',
      ...data,
    });
  } catch (err) {
    console.error('getWithdrawalHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch withdrawal history.' });
  }
}

/**
 * GET /api/mobile/wallet/withdrawals/pending
 * Returns the count and list of currently pending withdrawal requests.
 * Redis Cache-Aside: 'withdrawal:pending:{userId}:{mode}' (TTL 30s)
 */
export async function getPendingWithdrawals(req, res) {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const isDiamondConversionOn = await getIsConvertToDiamond();
    const modeKey = isDiamondConversionOn ? 'diamond' : 'coin';
    const cacheKey = `withdrawal:pending:${userId}:${modeKey}`;

    const data = await cache.getOrSet(cacheKey, 30, async () => {
      const rows = await query(
        `SELECT 
           id, host_id AS user_id, diamond_amount, coin_amount, usd_amount, payout_amount, payout_currency,
           host_type, payment_method, account_details, status, admin_notes, created_at, updated_at
         FROM withdrawals
         WHERE host_id = ? AND status = 'pending'
         ORDER BY created_at DESC`,
        [userId]
      );
      const formatted = rows.map((r) => formatWithdrawalRow(r, isDiamondConversionOn));
      return { pendingCount: formatted.length, withdrawals: formatted };
    });

    return res.json({
      success: true,
      message: 'Pending withdrawal requests retrieved successfully.',
      is_convert_to_diamond: isDiamondConversionOn,
      active_currency: isDiamondConversionOn ? 'diamonds' : 'coins',
      active_currency_symbol: isDiamondConversionOn ? '💎' : '🪙',
      active_currency_label: isDiamondConversionOn ? 'Diamond' : 'Coin',
      ...data,
    });
  } catch (err) {
    console.error('getPendingWithdrawals error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch pending withdrawals.' });
  }
}

/**
 * DELETE /api/mobile/wallet/withdrawals/:id
 * Delete a single withdrawal record from history.
 * Only the owner can delete their own records (admins can delete any).
 * Pending withdrawals cannot be deleted (use cancel instead).
 * SSOT: MySQL write first, then instant Redis cache invalidation.
 */
export async function deleteWithdrawalRecord(req, res) {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const withdrawalId = parseInt(req.params.id, 10);
    if (!withdrawalId || isNaN(withdrawalId)) {
      return res.status(400).json({ success: false, message: 'Valid withdrawal ID is required.' });
    }

    // 1. Fetch the record to verify ownership
    const [record] = await query(
      'SELECT id, host_id, status, diamond_amount, payment_method FROM withdrawals WHERE id = ?',
      [withdrawalId]
    );

    if (!record) {
      return res.status(404).json({ success: false, message: `Withdrawal record #${withdrawalId} not found.` });
    }

    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
    if (!isAdmin && record.host_id !== userId) {
      return res.status(403).json({ success: false, message: 'You are only authorized to delete your own withdrawal records.' });
    }

    // 2. Prevent deletion of pending withdrawals (must be settled first)
    if (record.status === 'pending' && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Pending withdrawal requests cannot be deleted. Wait for admin review or contact support.',
      });
    }

    // 3. MySQL SSOT: Delete record
    await query('DELETE FROM withdrawals WHERE id = ?', [withdrawalId]);

    // 4. Instant Redis cache invalidation
    await invalidateWithdrawalCache(record.host_id);

    return res.json({
      success: true,
      message: `Withdrawal record #${withdrawalId} (${record.diamond_amount} diamonds via ${record.payment_method}) has been deleted.`,
      deletedId: withdrawalId,
    });
  } catch (err) {
    console.error('deleteWithdrawalRecord error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete withdrawal record.' });
  }
}

/**
 * DELETE /api/mobile/wallet/withdrawals
 * POST  /api/mobile/wallet/withdrawals/clear
 * Clear all (or filtered) withdrawal history records for this user.
 * Optionally filter by ?status=approved|rejected|pending
 * Optionally filter by ?period=today|month|all (default: all)
 * Pending withdrawals are excluded unless admin or explicitly requested.
 * SSOT: MySQL write first, then instant Redis cache invalidation.
 */
export async function clearWithdrawalHistory(req, res) {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
    const status = req.query.status || req.body?.status || null;
    const period = req.query.period || req.body?.period || 'all';
    const force = req.query.force === 'true' || req.body?.force === true;

    // Build SQL
    let whereClauses = ['host_id = ?'];
    const params = [userId];

    // By default, exclude pending records for non-admins unless forced
    if (!isAdmin && !force) {
      whereClauses.push("status != 'pending'");
    }

    // Status filter
    if (status && status !== 'all') {
      whereClauses.push('status = ?');
      params.push(status);
    }

    // Time period filter
    if (period === 'today') {
      whereClauses.push('DATE(created_at) = CURDATE()');
    } else if (period === 'month') {
      whereClauses.push('created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    }

    const whereSql = 'WHERE ' + whereClauses.join(' AND ');

    // 1. Count before delete
    const [countRow] = await query(
      `SELECT COUNT(*) AS total FROM withdrawals ${whereSql}`,
      params
    );
    const total = parseInt(countRow?.total || 0, 10);

    if (total === 0) {
      return res.json({
        success: true,
        message: 'No matching withdrawal records found to delete.',
        affectedRows: 0,
        period,
        status: status || 'all',
      });
    }

    // 2. MySQL SSOT: Delete records
    const result = await query(
      `DELETE FROM withdrawals ${whereSql}`,
      params
    );
    const affectedRows = result?.affectedRows || total;

    // 3. Instant Redis cache invalidation
    await invalidateWithdrawalCache(userId);

    return res.json({
      success: true,
      message: `Successfully deleted ${affectedRows} withdrawal record(s) from your history.`,
      affectedRows,
      period,
      status: status || 'all',
    });
  } catch (err) {
    console.error('clearWithdrawalHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to clear withdrawal history.' });
  }
}

/**
 * POST /api/mobile/wallet/withdrawals/:id/cancel
 * Cancel a PENDING withdrawal request.
 * Refunds the deducted diamonds back to the user's balance.
 * SSOT: MySQL transaction commits first, then instant Redis invalidation.
 */
export async function cancelWithdrawalRequest(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const userId = resolveUserId(req);
    if (!userId) {
      connection.release();
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const withdrawalId = parseInt(req.params.id, 10);
    if (!withdrawalId || isNaN(withdrawalId)) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Valid withdrawal ID is required.' });
    }

    // 1. Fetch the record
    const [rows] = await connection.execute(
      'SELECT id, host_id, status, diamond_amount, coin_amount, payment_method FROM withdrawals WHERE id = ?',
      [withdrawalId]
    );
    const record = rows[0];

    if (!record) {
      connection.release();
      return res.status(404).json({ success: false, message: `Withdrawal request #${withdrawalId} not found.` });
    }

    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
    if (!isAdmin && record.host_id !== userId) {
      connection.release();
      return res.status(403).json({ success: false, message: 'You are only authorized to cancel your own withdrawal requests.' });
    }

    if (record.status !== 'pending') {
      connection.release();
      return res.status(400).json({
        success: false,
        message: `Withdrawal #${withdrawalId} is already "${record.status}" and cannot be cancelled.`,
      });
    }

    // 2. MySQL Transaction: Refund coins or diamonds + update status
    await connection.beginTransaction();

    const isCoinRefund = (record.coin_amount && record.coin_amount > 0);

    if (isCoinRefund) {
      // Refund coins
      await connection.execute(
        'UPDATE users SET coins = coins + ? WHERE id = ?',
        [record.coin_amount, record.host_id]
      );

      // Add transaction record for refund
      await connection.execute(
        `INSERT INTO transactions (user_id, type, amount, description, status)
         VALUES (?, 'refund', ?, ?, 'completed')`,
        [
          record.host_id,
          record.coin_amount,
          `Refunded ${record.coin_amount} coins - Withdrawal #${withdrawalId} cancelled`,
        ]
      );
    } else {
      // Refund diamonds
      await connection.execute(
        'UPDATE users SET diamonds = diamonds + ? WHERE id = ?',
        [record.diamond_amount, record.host_id]
      );

      // Add transaction record for refund
      await connection.execute(
        `INSERT INTO transactions (user_id, type, amount, description, status)
         VALUES (?, 'refund', ?, ?, 'completed')`,
        [
          record.host_id,
          record.diamond_amount,
          `Refunded ${record.diamond_amount} diamonds - Withdrawal #${withdrawalId} cancelled`,
        ]
      );
    }

    // Mark withdrawal as rejected (cancelled)
    await connection.execute(
      `UPDATE withdrawals SET status = 'rejected', admin_notes = 'Cancelled by user' WHERE id = ?`,
      [withdrawalId]
    );

    await connection.commit();

    // 3. Instant Redis cache invalidation
    await invalidateWithdrawalCache(record.host_id);
    await cache.del(`user:${record.host_id}`);
    await cache.del(`user:balance:${record.host_id}`);

    const refundedAmount = isCoinRefund ? record.coin_amount : record.diamond_amount;
    const currencyUnit = isCoinRefund ? 'coins' : 'diamonds';

    return res.json({
      success: true,
      message: `Withdrawal request #${withdrawalId} has been cancelled. ${refundedAmount} ${currencyUnit} have been refunded to your account.`,
      data: {
        withdrawal_id: withdrawalId,
        refunded_amount: refundedAmount,
        currency: currencyUnit,
        coins_refunded: isCoinRefund ? record.coin_amount : 0,
        diamonds_refunded: isCoinRefund ? 0 : record.diamond_amount,
        status: 'rejected',
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error('cancelWithdrawalRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel withdrawal request.' });
  } finally {
    connection.release();
  }
}
