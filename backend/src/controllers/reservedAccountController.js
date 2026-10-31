import { getPool, query } from '../config/db.js';
import cache from '../config/redis.js';

/**
 * Tables and column mappings that reference users(id).
 * Used during atomic user ID reassignment.
 */
const USER_RELATION_TABLES = [
  ['live_rooms', 'host_id'],
  ['live_room_seats', 'user_id'],
  ['live_room_viewers', 'user_id'],
  ['live_room_messages', 'user_id'],
  ['live_room_seat_requests', 'user_id'],
  ['live_room_admins', 'user_id'],
  ['live_room_kicks', 'user_id'],
  ['gifts', 'created_by'],
  ['gift_transactions', 'sender_id'],
  ['gift_transactions', 'receiver_id'],
  ['transactions', 'user_id'],
  ['chat_messages', 'sender_id'],
  ['chat_messages', 'receiver_id'],
  ['host_requests', 'user_id'],
  ['moderators', 'user_id'],
  ['moderation_reports', 'reporter_id'],
  ['moderation_reports', 'reported_id'],
  ['notifications', 'user_id'],
  ['notifications', 'actor_id'],
  ['p2p_calls', 'caller_id'],
  ['p2p_calls', 'receiver_id'],
  ['posts', 'user_id'],
  ['post_media', 'user_id'],
  ['post_comments', 'user_id'],
  ['post_reactions', 'user_id'],
  ['user_follows', 'follower_id'],
  ['user_follows', 'following_id'],
  ['user_blocks', 'blocker_id'],
  ['user_blocks', 'blocked_id'],
  ['user_entry_effects', 'user_id'],
  ['user_thumbnails', 'user_id'],
  ['user_package_subscriptions', 'user_id'],
  ['user_theme_items', 'user_id'],
  ['user_devices', 'user_id'],
  ['user_fcm_tokens', 'user_id'],
  ['user_level_rewards', 'user_id'],
  ['reseller_sales', 'buyer_id'],
  ['reseller_sales', 'reseller_id'],
  ['withdrawals', 'host_id'],
  ['agencies', 'owner_id'],
  ['agency_host_requests', 'user_id'],
  ['live_duration_reward_history', 'user_id'],
];

/**
 * Invalidate all Redis caches related to reserved accounts and users.
 */
async function invalidateCaches(oldUserId = null, newUserId = null) {
  try {
    await cache.delByPattern('reserved_accounts:*');
    await cache.delByPattern('admin:users*');
    await cache.delByPattern('hosts:*');
    await cache.delByPattern('leaderboard:*');

    if (oldUserId) {
      await cache.del(`user:${oldUserId}`);
      await cache.del(`profile:${oldUserId}`);
      await cache.del(`wallet:${oldUserId}`);
    }
    if (newUserId) {
      await cache.del(`user:${newUserId}`);
      await cache.del(`profile:${newUserId}`);
      await cache.del(`wallet:${newUserId}`);
    }
  } catch (err) {
    console.warn('[Reserved Accounts] Non-fatal Redis cache invalidation error:', err.message);
  }
}

/**
 * GET /api/admin/reserved-accounts
 * Fetch reserved accounts list with pagination, filtering, and search.
 */
export async function getReservedAccounts(req, res) {
  try {
    const {
      status = 'all',
      category = 'all',
      search = '',
      page = 1,
      limit = 50,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const cacheKey = `reserved_accounts:list:${status}:${category}:${search}:${pageNum}:${limitNum}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      let whereClauses = [];
      let params = [];

      if (status && status !== 'all') {
        whereClauses.push('ra.status = ?');
        params.push(status);
      }

      if (category && category !== 'all') {
        whereClauses.push('ra.category = ?');
        params.push(category);
      }

      if (search && search.trim()) {
        const term = `%${search.trim().replace(/^#/, '')}%`;
        const numTerm = parseInt(search.trim().replace(/^#/, ''), 10);
        if (!isNaN(numTerm)) {
          whereClauses.push('(ra.reserved_id = ? OR u.full_name LIKE ? OR u.email LIKE ?)');
          params.push(numTerm, term, term);
        } else {
          whereClauses.push('(u.full_name LIKE ? OR u.email LIKE ?)');
          params.push(term, term);
        }
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Count query
      const [countResult] = await query(
        `SELECT COUNT(*) as total
         FROM reserved_accounts ra
         LEFT JOIN users u ON ra.assigned_to_user_id = u.id
         ${whereSql}`,
        params
      );
      const total = countResult ? countResult.total : 0;

      // Data query
      const rows = await query(
        `SELECT 
           ra.id,
           ra.reserved_id,
           ra.category,
           ra.status,
           ra.assigned_to_user_id,
           ra.assigned_at,
           ra.notes,
           ra.created_at,
           ra.updated_at,
           u.full_name as assigned_user_name,
           u.email as assigned_user_email,
           u.avatar_url as assigned_user_avatar,
           u.role as assigned_user_role,
           u.coins as assigned_user_coins,
           u.diamonds as assigned_user_diamonds
         FROM reserved_accounts ra
         LEFT JOIN users u ON ra.assigned_to_user_id = u.id
         ${whereSql}
         ORDER BY ra.status ASC, ra.reserved_id ASC
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );

      return {
        accounts: rows || [],
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      };
    });

    return res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error('[Reserved Accounts Error] getReservedAccounts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reserved accounts.',
      error: error.message,
    });
  }
}

/**
 * GET /api/admin/reserved-accounts/stats
 * Overview counts of total, available, and assigned reserved IDs.
 */
export async function getReservedStats(req, res) {
  try {
    const cacheKey = 'reserved_accounts:stats';
    const stats = await cache.getOrSet(cacheKey, 60, async () => {
      const rows = await query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned
        FROM reserved_accounts
      `);
      return {
        total: rows[0]?.total || 0,
        available: rows[0]?.available || 0,
        assigned: rows[0]?.assigned || 0,
      };
    });

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Reserved Accounts Error] getReservedStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reserved account statistics.',
      error: error.message,
    });
  }
}

/**
 * POST /api/admin/reserved-accounts
 * Add new reserved ID or bulk range of IDs.
 */
export async function addReservedIds(req, res) {
  try {
    const { type = 'single', reservedId, startId, endId, category = 'vip', notes = '' } = req.body;

    const validCategories = ['vip', 'special', 'agency_lead', 'founder', 'system'];
    const chosenCategory = validCategories.includes(category) ? category : 'vip';

    const idsToAdd = [];

    if (type === 'range') {
      const start = parseInt(startId, 10);
      const end = parseInt(endId, 10);

      if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid Start ID and End ID are required for range.',
        });
      }

      if (start > end) {
        return res.status(400).json({
          success: false,
          message: 'Start ID cannot be greater than End ID.',
        });
      }

      if (end - start > 500) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 500 IDs can be reserved in a single batch range.',
        });
      }

      for (let i = start; i <= end; i++) {
        idsToAdd.push(i);
      }
    } else {
      const cleanId = parseInt(String(reservedId).replace(/^#/, ''), 10);
      if (isNaN(cleanId) || cleanId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'A valid positive Reserved ID is required.',
        });
      }
      idsToAdd.push(cleanId);
    }

    if (idsToAdd.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No IDs specified to reserve.',
      });
    }

    if (idsToAdd.includes(1)) {
      return res.status(400).json({
        success: false,
        message: 'ID #1 belongs strictly to the Super Administrator and cannot be added to the reserved pool.',
      });
    }

    // Check collisions with active users table
    const existingUsers = await query(
      `SELECT id FROM users WHERE id IN (${idsToAdd.map(() => '?').join(',')})`,
      idsToAdd
    );

    if (existingUsers && existingUsers.length > 0) {
      const takenUserIds = existingUsers.map((u) => `#${u.id}`).join(', ');
      return res.status(409).json({
        success: false,
        message: `Cannot reserve IDs that are already occupied by active users: ${takenUserIds}.`,
      });
    }

    // Check existing reserved_accounts
    const existingReserved = await query(
      `SELECT reserved_id FROM reserved_accounts WHERE reserved_id IN (${idsToAdd.map(() => '?').join(',')})`,
      idsToAdd
    );

    const alreadyReservedSet = new Set((existingReserved || []).map((r) => r.reserved_id));
    const newIds = idsToAdd.filter((id) => !alreadyReservedSet.has(id));

    if (newIds.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'All specified IDs are already in the reserved accounts pool.',
      });
    }

    const placeholders = newIds.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const flatParams = [];
    for (const id of newIds) {
      flatParams.push(
        id,
        chosenCategory,
        'available',
        null,
        null,
        notes || `Reserved ${chosenCategory.toUpperCase()} ID #${id}`
      );
    }

    await query(
      `INSERT IGNORE INTO reserved_accounts (reserved_id, category, status, assigned_to_user_id, assigned_at, notes) VALUES ${placeholders}`,
      flatParams
    );

    // Invalidate caches
    await invalidateCaches();

    return res.status(201).json({
      success: true,
      message: `Successfully reserved ${newIds.length} account ID(s).`,
      addedCount: newIds.length,
      skippedCount: idsToAdd.length - newIds.length,
    });
  } catch (error) {
    console.error('[Reserved Accounts Error] addReservedIds:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add reserved accounts.',
      error: error.message,
    });
  }
}

/**
 * POST /api/admin/reserved-accounts/set-range
 * Configure reserved pool starting from ID 2 up to end_id (e.g. 100, 200).
 * Prunes unassigned IDs outside this range, seeds missing IDs, and sets users AUTO_INCREMENT to end_id + 1.
 */
export async function setReservedRange(req, res) {
  try {
    const { start_id = 2, end_id = 100, category = 'vip', notes = '' } = req.body;
    const start = Math.max(2, parseInt(start_id, 10) || 2);
    const end = parseInt(end_id, 10);

    if (isNaN(end) || end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End ID must be greater than Start ID (minimum 3).',
      });
    }

    if (end > 2000) {
      return res.status(400).json({
        success: false,
        message: 'End ID cannot exceed 2000 to maintain system responsiveness.',
      });
    }

    // 0. Remove any unassigned available IDs outside the requested range [start, end]
    // (such as old seeded golden VIPs: 8888, 9999, 123456, 666666, etc. or unassigned IDs above end_id)
    await query(
      `DELETE FROM reserved_accounts WHERE status = 'available' AND (reserved_id < ? OR reserved_id > ?)`,
      [start, end]
    );

    // Also remove available reserved records that collide with active users
    await query(
      `DELETE r FROM reserved_accounts r 
       INNER JOIN users u ON r.reserved_id = u.id 
       WHERE r.status = 'available'`
    );

    // 1. Find which IDs from start to end already exist in reserved_accounts
    const rangeIds = [];
    for (let i = start; i <= end; i++) {
      rangeIds.push(i);
    }

    const existingReserved = await query(
      `SELECT reserved_id FROM reserved_accounts WHERE reserved_id BETWEEN ? AND ?`,
      [start, end]
    );
    const existingReservedSet = new Set((existingReserved || []).map((r) => r.reserved_id));

    // 2. Find any active users occupying these IDs
    const existingUsers = await query(
      `SELECT id FROM users WHERE id BETWEEN ? AND ?`,
      [start, end]
    );
    const existingUsersSet = new Set((existingUsers || []).map((u) => u.id));

    // 3. New IDs to insert into reserved_accounts
    const idsToInsert = rangeIds.filter((id) => !existingReservedSet.has(id) && !existingUsersSet.has(id));

    if (idsToInsert.length > 0) {
      const placeholders = idsToInsert.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const flatParams = [];
      for (const id of idsToInsert) {
        flatParams.push(id, category || 'vip', 'available', null, null, notes || `System Reserved VIP #${id}`);
      }

      await query(
        `INSERT IGNORE INTO reserved_accounts (reserved_id, category, status, assigned_to_user_id, assigned_at, notes) VALUES ${placeholders}`,
        flatParams
      );
    }

    // 4. Update users table AUTO_INCREMENT to start immediately after end_id
    const maxUserRows = await query('SELECT MAX(id) as max_id FROM users');
    const currentMax = maxUserRows[0]?.max_id || 0;
    const nextAutoInc = Math.max(end + 1, currentMax + 1);

    try {
      await query(`ALTER TABLE users AUTO_INCREMENT = ${nextAutoInc}`);
    } catch (altErr) {
      console.warn('Note on setting auto_increment:', altErr.message);
    }

    // 5. Invalidate caches
    await invalidateCaches();

    return res.json({
      success: true,
      message: `Reserved pool successfully configured from ID ${start} to ID ${end}. Regular user registrations will now start at ID #${nextAutoInc}.`,
      startId: start,
      endId: end,
      addedCount: idsToInsert.length,
      nextAutoIncrement: nextAutoInc,
    });
  } catch (error) {
    console.error('[Reserved Accounts Error] setReservedRange:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to configure reserved range.',
      error: error.message,
    });
  }
}

/**
 * POST /api/admin/reserved-accounts/assign
 * Assign an available reserved ID to an existing user.
 * Atomically updates user's ID across all system tables without data loss.
 */
export async function assignReservedId(req, res) {
  let conn;
  try {
    const { reserved_id, user_id, notes } = req.body;

    const cleanReservedId = parseInt(String(reserved_id).replace(/^#/, ''), 10);
    const cleanUserId = parseInt(String(user_id).replace(/^#/, ''), 10);

    if (isNaN(cleanReservedId) || isNaN(cleanUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Both Reserved ID and Target User ID are required.',
      });
    }

    if (cleanReservedId === cleanUserId) {
      return res.status(400).json({
        success: false,
        message: 'User already holds this ID.',
      });
    }

    conn = await getPool().getConnection();
    await conn.beginTransaction();

    // 1. Verify reserved account exists and is available
    const [reservedRows] = await conn.execute(
      'SELECT * FROM reserved_accounts WHERE reserved_id = ? FOR UPDATE',
      [cleanReservedId]
    );

    if (reservedRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({
        success: false,
        message: `Reserved ID #${cleanReservedId} does not exist in the pool.`,
      });
    }

    const reservedRecord = reservedRows[0];
    if (reservedRecord.status !== 'available') {
      await conn.rollback();
      conn.release();
      return res.status(409).json({
        success: false,
        message: `Reserved ID #${cleanReservedId} is already assigned to user #${reservedRecord.assigned_to_user_id}.`,
      });
    }

    // 2. Verify target user exists
    const [userRows] = await conn.execute(
      'SELECT id, email, full_name, role, coins, diamonds FROM users WHERE id = ? FOR UPDATE',
      [cleanUserId]
    );

    if (userRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({
        success: false,
        message: `Target User #${cleanUserId} was not found.`,
      });
    }

    const targetUser = userRows[0];

    // 3. Ensure reserved_id is not already taken in users table by another account
    const [collisionRows] = await conn.execute(
      'SELECT id FROM users WHERE id = ? FOR UPDATE',
      [cleanReservedId]
    );

    if (collisionRows.length > 0) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({
        success: false,
        message: `Cannot assign: ID #${cleanReservedId} is already occupied in the active users table.`,
      });
    }

    // 4. Temporarily disable foreign keys for atomic cascading update
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 4a. Update primary users table
    await conn.execute('UPDATE users SET id = ?, updated_at = NOW() WHERE id = ?', [
      cleanReservedId,
      cleanUserId,
    ]);

    // 4b. Update all referencing tables
    for (const [table, col] of USER_RELATION_TABLES) {
      try {
        await conn.query(`UPDATE \`${table}\` SET \`${col}\` = ? WHERE \`${col}\` = ?`, [
          cleanReservedId,
          cleanUserId,
        ]);
      } catch (tableErr) {
        // Table or column might not exist or be empty in current deployment; non-fatal
      }
    }

    // 4c. Update reserved_accounts status
    const assignmentNote = notes || `Assigned to ${targetUser.full_name || targetUser.email} (formerly #${cleanUserId})`;
    await conn.execute(
      `UPDATE reserved_accounts 
       SET status = 'assigned', 
           assigned_to_user_id = ?, 
           assigned_at = NOW(), 
           notes = ? 
       WHERE reserved_id = ?`,
      [cleanReservedId, assignmentNote, cleanReservedId]
    );

    // 4d. Re-enable foreign key checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    await conn.commit();
    conn.release();

    // 5. Invalidate caches
    await invalidateCaches(cleanUserId, cleanReservedId);

    return res.json({
      success: true,
      message: `User #${cleanUserId} (${targetUser.full_name || targetUser.email}) successfully upgraded to VIP ID #${cleanReservedId}.`,
      user: {
        id: cleanReservedId,
        previous_id: cleanUserId,
        full_name: targetUser.full_name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        await conn.rollback();
      } catch (_) {}
      conn.release();
    }
    console.error('[Reserved Accounts Error] assignReservedId:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign reserved ID.',
      error: error.message,
    });
  }
}

/**
 * POST /api/admin/reserved-accounts/release
 * Release an assigned reserved ID back to 'available'.
 * Generates a new auto-increment ID for the user currently holding it (if still active).
 */
export async function releaseReservedId(req, res) {
  let conn;
  try {
    const { reserved_id } = req.body;
    const cleanReservedId = parseInt(String(reserved_id).replace(/^#/, ''), 10);

    if (isNaN(cleanReservedId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid Reserved ID is required.',
      });
    }

    conn = await getPool().getConnection();
    await conn.beginTransaction();

    const [reservedRows] = await conn.execute(
      'SELECT * FROM reserved_accounts WHERE reserved_id = ? FOR UPDATE',
      [cleanReservedId]
    );

    if (reservedRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({
        success: false,
        message: `Reserved ID #${cleanReservedId} not found.`,
      });
    }

    const reservedRecord = reservedRows[0];
    if (reservedRecord.status !== 'assigned') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        success: false,
        message: `Reserved ID #${cleanReservedId} is already Available.`,
      });
    }

    const assignedUserId = reservedRecord.assigned_to_user_id;

    // Check if user still exists
    const [userRows] = await conn.execute('SELECT id, email FROM users WHERE id = ? FOR UPDATE', [
      assignedUserId,
    ]);

    let newAllocatedId = null;

    if (userRows.length > 0) {
      // Find highest user ID and allocate next number
      const [maxRows] = await conn.execute('SELECT MAX(id) as max_id FROM users');
      newAllocatedId = Math.max(100000, (maxRows[0]?.max_id || 100000) + 1);

      await conn.query('SET FOREIGN_KEY_CHECKS = 0');

      // Update user ID to new allocated ID
      await conn.execute('UPDATE users SET id = ?, updated_at = NOW() WHERE id = ?', [
        newAllocatedId,
        assignedUserId,
      ]);

      for (const [table, col] of USER_RELATION_TABLES) {
        try {
          await conn.query(`UPDATE \`${table}\` SET \`${col}\` = ? WHERE \`${col}\` = ?`, [
            newAllocatedId,
            assignedUserId,
          ]);
        } catch (_) {}
      }

      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // Reset reserved account back to available
    await conn.execute(
      `UPDATE reserved_accounts 
       SET status = 'available', 
           assigned_to_user_id = NULL, 
           assigned_at = NULL, 
           notes = ? 
       WHERE reserved_id = ?`,
      [`Released from user #${assignedUserId}`, cleanReservedId]
    );

    await conn.commit();
    conn.release();

    await invalidateCaches(assignedUserId, newAllocatedId);

    return res.json({
      success: true,
      message: `Reserved ID #${cleanReservedId} released back to Available pool.${
        newAllocatedId ? ` Previous user shifted to ID #${newAllocatedId}.` : ''
      }`,
      releasedId: cleanReservedId,
      newUserId: newAllocatedId,
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        await conn.rollback();
      } catch (_) {}
      conn.release();
    }
    console.error('[Reserved Accounts Error] releaseReservedId:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to release reserved ID.',
      error: error.message,
    });
  }
}

/**
 * DELETE /api/admin/reserved-accounts/:id
 * Delete an unassigned reserved ID from the pool.
 */
export async function deleteReservedId(req, res) {
  try {
    const { id } = req.params;
    const cleanId = parseInt(id, 10);

    if (isNaN(cleanId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reserved account record ID.',
      });
    }

    const [rows] = await query('SELECT * FROM reserved_accounts WHERE id = ? OR reserved_id = ?', [
      cleanId,
      cleanId,
    ]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reserved account not found.',
      });
    }

    const record = rows[0];
    if (record.status === 'assigned') {
      return res.status(409).json({
        success: false,
        message: `Cannot delete reserved ID #${record.reserved_id} while it is assigned to an active user. Release it first.`,
      });
    }

    await query('DELETE FROM reserved_accounts WHERE id = ?', [record.id]);
    await invalidateCaches();

    return res.json({
      success: true,
      message: `Reserved ID #${record.reserved_id} successfully removed from the pool.`,
    });
  } catch (error) {
    console.error('[Reserved Accounts Error] deleteReservedId:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete reserved ID.',
      error: error.message,
    });
  }
}
