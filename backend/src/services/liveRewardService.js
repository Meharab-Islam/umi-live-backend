import { pool, query } from '../config/db.js';
import { cache } from '../config/redis.js';
import { sendLiveDurationRewardPushNotification } from '../config/firebase.js';

/**
 * Live Continuous & Cumulative Streaming Reward Service
 * 
 * Production-Grade Architecture:
 * 1. 100% Configurable & Redis Caching (Cache-aside with instant invalidation)
 * 2. Database Single Source of Truth (SSOT) with MySQL Transactions
 * 3. Race-Condition Proof (Redis Lock + DB Unique & Idempotency Guards)
 * 4. Multi-Channel Distribution: MySQL Ledger -> Socket.IO Realtime -> FCM Push
 */

/**
 * Fetch reward configuration settings (Redis Cached with fallback to MySQL)
 */
export async function getLiveDurationRewardSettings() {
  const cacheKey = 'live_duration_reward:settings';
  return await cache.getOrSet(cacheKey, 120, async () => {
    const rows = await query('SELECT * FROM live_duration_reward_settings WHERE id = 1 LIMIT 1');
    if (!rows || rows.length === 0) {
      // Default fallback
      return {
        id: 1,
        is_enabled: true,
        target_role: 'host', // 'host' (agency or independent) or 'all'
        session_type: 'single_continuous', // 'single_continuous' or 'multiple_cumulative'
        min_sessions: 1,
        required_minutes: 60,
        reward_coins: 300,
        target_audience: 'all_hosts',
        max_rewards_per_day: 1,
        title: 'Live Streaming Reward',
        description: 'Earn bonus coins for streaming live and meeting daily targets.',
      };
    }
    const r = rows[0];
    const targetRole = r.target_role || (r.target_audience === 'all' ? 'all' : 'host');
    return {
      id: r.id,
      is_enabled: Boolean(r.is_enabled),
      target_role: targetRole,
      session_type: r.session_type || 'single_continuous',
      min_sessions: Math.max(1, Number(r.min_sessions) || 1),
      required_minutes: Math.max(1, Number(r.required_minutes) || 60),
      reward_coins: Math.max(1, Number(r.reward_coins) || 300),
      target_audience: r.target_audience || 'all_hosts',
      max_rewards_per_day: Math.max(1, Number(r.max_rewards_per_day) || 1),
      title: r.title || 'Live Streaming Reward',
      description: r.description || '',
      updated_at: r.updated_at,
    };
  });
}

/**
 * Update reward configuration settings (MySQL SSOT -> Redis Invalidation)
 */
export async function updateLiveDurationRewardSettings(data) {
  const isEnabled = data.is_enabled === true || data.is_enabled === 'true' || data.is_enabled === 1 || data.is_enabled === '1' ? 1 : 0;
  const targetRole = ['host', 'all'].includes(data.target_role) ? data.target_role : 'host';
  const sessionType = ['single_continuous', 'multiple_cumulative'].includes(data.session_type)
    ? data.session_type
    : 'single_continuous';
  const minSessions = Math.max(1, parseInt(data.min_sessions, 10) || 1);
  const requiredMinutes = Math.max(1, parseInt(data.required_minutes, 10) || 60);
  const rewardCoins = Math.max(1, parseInt(data.reward_coins, 10) || 300);
  const maxRewardsPerDay = Math.max(1, parseInt(data.max_rewards_per_day, 10) || 1);
  const title = (data.title || 'Live Streaming Reward').trim();
  const description = (data.description || '').trim();
  const targetAudience = targetRole === 'all' ? 'all' : 'all_hosts';

  // 1. MySQL Write First (SSOT)
  await query(
    `INSERT INTO live_duration_reward_settings 
      (id, is_enabled, target_role, session_type, min_sessions, required_minutes, reward_coins, target_audience, max_rewards_per_day, title, description)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       is_enabled = VALUES(is_enabled),
       target_role = VALUES(target_role),
       session_type = VALUES(session_type),
       min_sessions = VALUES(min_sessions),
       required_minutes = VALUES(required_minutes),
       reward_coins = VALUES(reward_coins),
       target_audience = VALUES(target_audience),
       max_rewards_per_day = VALUES(max_rewards_per_day),
       title = VALUES(title),
       description = VALUES(description),
       updated_at = CURRENT_TIMESTAMP`,
    [isEnabled, targetRole, sessionType, minSessions, requiredMinutes, rewardCoins, targetAudience, maxRewardsPerDay, title, description]
  );

  // 2. Instant Redis Invalidation
  await Promise.allSettled([
    cache.del('live_duration_reward:settings'),
    cache.delByPattern('mobile:live:reward*'),
    cache.delByPattern('admin:live_reward:*'),
  ]);

  return await getLiveDurationRewardSettings();
}

/**
 * Fetch summary statistics for Admin Live Rewards Dashboard
 */
export async function getLiveDurationRewardStats() {
  const cacheKey = 'admin:live_reward:stats';
  return await cache.getOrSet(cacheKey, 60, async () => {
    // Total all-time coins & claims
    const [allTime] = await query(`
      SELECT 
        COALESCE(SUM(coins_awarded), 0) AS total_coins_awarded,
        COUNT(id) AS total_claims,
        COUNT(DISTINCT user_id) AS total_hosts_rewarded
      FROM live_duration_reward_history
    `);

    // Today's stats
    const [todayStats] = await query(`
      SELECT 
        COALESCE(SUM(coins_awarded), 0) AS today_coins_awarded,
        COUNT(id) AS today_claims,
        COUNT(DISTINCT user_id) AS today_hosts_rewarded
      FROM live_duration_reward_history
      WHERE created_at >= CURDATE()
    `);

    const settings = await getLiveDurationRewardSettings();

    return {
      totalCoinsAwarded: Number(allTime?.total_coins_awarded) || 0,
      totalClaims: Number(allTime?.total_claims) || 0,
      totalHostsRewarded: Number(allTime?.total_hosts_rewarded) || 0,
      todayCoinsAwarded: Number(todayStats?.today_coins_awarded) || 0,
      todayClaims: Number(todayStats?.today_claims) || 0,
      todayHostsRewarded: Number(todayStats?.today_hosts_rewarded) || 0,
      settings,
    };
  });
}

/**
 * Get paginated reward history (for Admin Panel & Mobile History)
 */
export async function getLiveDurationRewardHistory({ page = 1, limit = 20, search = '', role = '', sessionType = '', userId = null } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (p - 1) * l;

  const whereConditions = [];
  const params = [];

  if (userId) {
    whereConditions.push('h.user_id = ?');
    params.push(Number(userId));
  }

  if (role && role !== 'all') {
    whereConditions.push('u.role = ?');
    params.push(role);
  }

  if (sessionType && sessionType !== 'all') {
    whereConditions.push('h.session_type = ?');
    params.push(sessionType);
  }

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    whereConditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR h.room_id LIKE ?)');
    params.push(s, s, s);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const [countResult] = await query(
    `SELECT COUNT(h.id) as total FROM live_duration_reward_history h
     JOIN users u ON h.user_id = u.id
     ${whereClause}`,
    params
  );
  const total = countResult ? countResult.total : 0;

  const rows = await query(
    `SELECT h.id, h.user_id, h.room_id, h.duration_minutes, h.duration_seconds, h.coins_awarded,
            h.target_role, h.session_type, h.session_count, h.created_at,
            u.full_name, u.avatar_url, u.email, u.role, u.agency_id,
            a.name as agency_name, a.agency_code
     FROM live_duration_reward_history h
     JOIN users u ON h.user_id = u.id
     LEFT JOIN agencies a ON u.agency_id = a.id
     ${whereClause}
     ORDER BY h.id DESC
     LIMIT ? OFFSET ?`,
    [...params, l, offset]
  );

  return {
    items: rows || [],
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
    },
  };
}

/**
 * Check stream reward eligibility and live progress
 */
export async function checkStreamRewardStatus({ userId, roomId }) {
  if (!userId || !roomId) {
    return { eligible: false, message: 'Invalid user or room ID' };
  }

  const settings = await getLiveDurationRewardSettings();
  if (!settings.is_enabled) {
    return {
      enabled: false,
      eligible: false,
      message: 'Live streaming reward is currently disabled by admin.',
      settings,
    };
  }

  // 1. Check user profile & audience/role eligibility
  const [userRow] = await query(
    'SELECT id, role, agency_id, coins FROM users WHERE id = ? LIMIT 1',
    [Number(userId)]
  );
  if (!userRow) {
    return { enabled: true, eligible: false, message: 'User not found.' };
  }

  let rolePass = false;
  if (settings.target_role === 'all') {
    rolePass = true;
  } else if (settings.target_role === 'host') {
    // Both agency hosts and independent hosts have role === 'host'
    rolePass = userRow.role === 'host';
  } else {
    rolePass = userRow.role === settings.target_role;
  }

  // 2. Check room details & start time
  const [roomRow] = await query(
    'SELECT id, room_id, host_id, started_at, status FROM live_rooms WHERE (room_id = ? OR id = ?) LIMIT 1',
    [String(roomId), /^\d+$/.test(String(roomId)) ? Number(roomId) : -1]
  );

  if (!roomRow) {
    return { enabled: true, eligible: false, message: 'Live room not found.' };
  }

  const isHost = Number(roomRow.host_id) === Number(userId);
  if (!isHost) {
    return {
      enabled: true,
      eligible: false,
      message: 'Only the broadcasting host is eligible for live stream duration rewards.',
    };
  }

  const canonicalRoomId = roomRow.room_id;

  // Calculate elapsed continuous streaming time in current room
  const startTime = roomRow.started_at ? new Date(roomRow.started_at).getTime() : Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
  const currentSessionMinutes = Math.floor(elapsedSeconds / 60);

  // 3. Check daily reward count (How many times rewarded today)
  const [dailyStats] = await query(
    'SELECT COUNT(id) as count FROM live_duration_reward_history WHERE user_id = ? AND created_at >= CURDATE()',
    [Number(userId)]
  );
  const dailyCount = dailyStats ? Number(dailyStats.count) : 0;
  const dailyLimitReached = dailyCount >= settings.max_rewards_per_day;

  // 4. Session Evaluation based on configured session_type
  let qualifies = false;
  let alreadyRewarded = null;
  let totalMinutesToday = currentSessionMinutes;
  let totalSessionsToday = 1;

  if (settings.session_type === 'multiple_cumulative') {
    // Fetch all sessions of today for this host
    const [cumStats] = await query(
      `SELECT 
         COUNT(DISTINCT id) as total_sessions,
         COALESCE(SUM(TIMESTAMPDIFF(MINUTE, started_at, COALESCE(ended_at, NOW()))), 0) as total_minutes
       FROM live_rooms 
       WHERE host_id = ? AND started_at >= CURDATE()`,
      [Number(userId)]
    );

    totalMinutesToday = Math.max(currentSessionMinutes, Number(cumStats?.total_minutes) || currentSessionMinutes);
    totalSessionsToday = Math.max(1, Number(cumStats?.total_sessions) || 1);

    const minutesQualify = totalMinutesToday >= settings.required_minutes;
    const sessionsQualify = totalSessionsToday >= settings.min_sessions;

    qualifies = rolePass && !dailyLimitReached && minutesQualify && sessionsQualify;
  } else {
    // Single Continuous Session Mode (default)
    const [roomRewardCheck] = await query(
      'SELECT id, coins_awarded, created_at FROM live_duration_reward_history WHERE user_id = ? AND room_id = ? LIMIT 1',
      [Number(userId), canonicalRoomId]
    );
    alreadyRewarded = roomRewardCheck || null;

    qualifies = rolePass &&
                !alreadyRewarded &&
                !dailyLimitReached &&
                currentSessionMinutes >= settings.required_minutes;
  }

  return {
    enabled: true,
    eligible: qualifies,
    rolePass,
    targetRole: settings.target_role,
    sessionType: settings.session_type,
    minSessions: settings.min_sessions,
    alreadyClaimed: Boolean(alreadyRewarded),
    claimDetails: alreadyRewarded || null,
    dailyCount,
    dailyLimit: settings.max_rewards_per_day,
    dailyLimitReached,
    currentMinutes: settings.session_type === 'multiple_cumulative' ? totalMinutesToday : currentSessionMinutes,
    currentSeconds: elapsedSeconds,
    totalSessionsToday,
    requiredMinutes: settings.required_minutes,
    rewardCoins: settings.reward_coins,
    remainingMinutes: Math.max(0, settings.required_minutes - (settings.session_type === 'multiple_cumulative' ? totalMinutesToday : currentSessionMinutes)),
    title: settings.title,
    description: settings.description,
  };
}

/**
 * Claim and Award Live Streaming Reward
 * 
 * Atomically awards coins to the host, logs to history + ledger, emits Socket.IO event,
 * sends FCM push notification, and invalidates Redis caches.
 */
export async function claimAndAwardLiveReward({ userId, roomId, io = null }) {
  const uid = Number(userId);
  if (!uid || !roomId) {
    return { success: false, message: 'User ID and Room ID are required.' };
  }

  // Redis Distributed Lock to prevent duplicate concurrent claim executions
  const lockKey = `lock:live_reward:${roomId}:${uid}`;
  const lockAcquired = await cache.client.set(lockKey, 'locked', 'EX', 15, 'NX').catch(() => 'OK');
  if (!lockAcquired) {
    return { success: false, message: 'Reward claim already in progress.' };
  }

  const connection = await pool.getConnection();

  try {
    const status = await checkStreamRewardStatus({ userId: uid, roomId });
    if (!status.eligible) {
      return {
        success: false,
        message: status.alreadyClaimed
          ? 'Reward already claimed for this live session.'
          : status.dailyLimitReached
          ? `Daily reward claim limit (${status.dailyLimit} time(s)) reached.`
          : !status.rolePass
          ? `Target role requirement (${status.targetRole}) not met.`
          : `Streaming milestone not reached yet. (${status.currentMinutes}/${status.requiredMinutes} mins)`,
        status,
      };
    }

    // Begin Database Transaction (Single Source of Truth)
    await connection.beginTransaction();

    // 1. Re-verify idempotency with row lock
    const [existing] = await connection.execute(
      'SELECT id FROM live_duration_reward_history WHERE user_id = ? AND room_id = ? LIMIT 1 FOR UPDATE',
      [uid, String(roomId)]
    );
    if (existing && existing.length > 0 && status.sessionType === 'single_continuous') {
      await connection.rollback();
      return { success: false, message: 'Reward already granted for this session.' };
    }

    // 2. Insert into live_duration_reward_history
    const [rewardInsert] = await connection.execute(
      `INSERT INTO live_duration_reward_history 
       (user_id, room_id, duration_minutes, duration_seconds, coins_awarded, target_role, target_audience, session_type, session_count, user_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uid,
        String(roomId),
        status.currentMinutes,
        status.currentSeconds || (status.currentMinutes * 60),
        status.rewardCoins,
        status.targetRole,
        status.targetRole === 'all' ? 'all' : 'all_hosts',
        status.sessionType,
        status.totalSessionsToday || 1,
        'host',
      ]
    );

    // 3. Increment Host's Coin Balance
    await connection.execute(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [status.rewardCoins, uid]
    );

    // 4. Insert into financial transactions ledger
    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'live_duration_reward', ?, ?, 'completed')`,
      [
        uid,
        status.rewardCoins,
        `[Reward] Live Streaming: ${status.currentMinutes}m streamed (+${status.rewardCoins} coins)`,
      ]
    );

    // Commit Transaction
    await connection.commit();

    // 5. Invalidate Redis Caches
    await Promise.allSettled([
      cache.del(`user:${uid}`),
      cache.del(`user:balance:${uid}`),
      cache.del(`mobile:profile:${uid}`),
      cache.del(`mobile:live:reward_status:${roomId}:${uid}`),
      cache.delByPattern('admin:dashboard*'),
      cache.delByPattern('admin:live_reward:*'),
      cache.delByPattern('mobile:rooms:*'),
    ]);

    // 6. Real-time Socket.IO Broadcast to Host & Live Room
    if (io) {
      const rewardPayload = {
        roomId: String(roomId),
        userId: uid,
        coins: status.rewardCoins,
        durationMinutes: status.currentMinutes,
        requiredMinutes: status.requiredMinutes,
        title: status.title,
        message: `🎉 Host earned ${status.rewardCoins} bonus coins for streaming ${status.currentMinutes} minutes!`,
        timestamp: new Date().toISOString(),
      };
      // Broadcast to room viewers & host
      io.to(String(roomId)).emit('live_duration_reward_earned', rewardPayload);
      console.log(`🎁 [Live Reward Socket] Broadcasted to room ${roomId} for Host ${uid} (+${status.rewardCoins} coins)`);
    }

    // 7. Non-blocking Firebase FCM Push Notification to Host Device
    sendLiveDurationRewardPushNotification({
      userId: uid,
      coins: status.rewardCoins,
      durationMinutes: status.currentMinutes,
      title: status.title,
    }).catch((pushErr) => {
      console.warn('⚠️ [Live Reward Push Error]:', pushErr.message);
    });

    return {
      success: true,
      message: `Successfully awarded ${status.rewardCoins} coins for streaming ${status.currentMinutes} minutes!`,
      reward: {
        id: rewardInsert.insertId,
        coins: status.rewardCoins,
        durationMinutes: status.currentMinutes,
        roomId: String(roomId),
      },
    };
  } catch (err) {
    await connection.rollback();
    console.error('🔥 [Live Reward Claim Error]:', err);
    return { success: false, message: 'Failed to process reward claim.', error: err.message };
  } finally {
    connection.release();
    await cache.client.del(lockKey).catch(() => {});
  }
}
