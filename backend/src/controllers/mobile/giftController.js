import { query, getPool } from '../../config/db.js';
import { cache } from '../../config/redis.js';
import { recordCoinsSpentAndCheckLevelUp } from '../../services/levelService.js';
import { enqueueRoomGift } from '../../services/giftQueueService.js';
import { getGlobalGiftBannerConfig } from '../../services/systemService.js';

/**
 * Mobile Get Available Gifts Catalog
 * GET /api/mobile/gifts
 */
export async function getGifts(req, res) {
  try {
    const gifts = await cache.getOrSet('gifts:active', 300, async () => {
      const rows = await query('SELECT * FROM gifts WHERE is_active = TRUE ORDER BY coin_cost ASC');
      return rows || [];
    });

    return res.json({
      success: true,
      gifts,
    });
  } catch (err) {
    console.error('Mobile getGifts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch gifts.' });
  }
}

/**
 * Mobile Send Virtual Gift
 * POST /api/mobile/gifts/send
 * 
 * Supports:
 * 1. Gifting ANY user directly via receiverId (or receiver_id)
 * 2. Gifting the broadcaster/host of a live room via roomId
 * 3. Gifting a specific user/co-host/seat within a live room (both receiverId & roomId provided)
 * 
 * DUAL Economy Modes configured via system_settings:
 * Mode A: is_convert_to_diamond === true
 *   - Coins convert to Diamonds for recipient based on coin_to_diamond_ratio
 * Mode B: is_convert_to_diamond === false
 *   - Direct Coins! Split between Admin %, Agency % (if recipient has agency), and recipient coin wallet
 */
export async function sendGift(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const senderId = req.user.id;
    const {
      giftId,
      gift_id,
      count = 1,
      quantity = 1,
      receiverId,
      receiver_id,
      receiverIds,
      receiver_ids,
      receivers: rawReceivers,
      roomId,
      room_id,
    } = req.body;

    const targetGiftId = giftId || gift_id;
    if (!targetGiftId) {
      return res.status(400).json({ success: false, message: 'giftId is required.' });
    }

    const giftCount = Math.max(1, parseInt(count || quantity, 10) || 1);
    const targetRoomId = roomId || room_id || null;

    // 1. Parse target recipient IDs
    let targetReceiverIds = [];
    if (receiverIds || receiver_ids) {
      const list = receiverIds || receiver_ids;
      if (Array.isArray(list)) {
        targetReceiverIds = list.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id) && id > 0);
      } else if (typeof list === 'string') {
        targetReceiverIds = list
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id) && id > 0);
      }
    } else if (Array.isArray(rawReceivers) && rawReceivers.length > 0) {
      targetReceiverIds = rawReceivers
        .map((r) => (typeof r === 'object' ? parseInt(r.id || r.receiver_id, 10) : parseInt(r, 10)))
        .filter((id) => !isNaN(id) && id > 0);
    } else if (receiverId || receiver_id) {
      const singleId = parseInt(receiverId || receiver_id, 10);
      if (!isNaN(singleId) && singleId > 0) {
        targetReceiverIds = [singleId];
      }
    }

    // Deduplicate
    targetReceiverIds = [...new Set(targetReceiverIds)];

    // 2. Resolve Active Room if roomId provided
    let activeRoom = null;
    if (targetRoomId) {
      const [rooms] = await connection.execute(
        `SELECT r.*, u.id as host_user_id, u.full_name as host_name, u.email as host_email,
                u.avatar_url as host_avatar, u.role as host_role, u.agency_id, u.is_banned as host_banned
         FROM live_rooms r
         JOIN users u ON r.host_id = u.id
         WHERE (r.room_id = ? OR r.id = ?) AND r.status = 'live'`,
        [String(targetRoomId), !isNaN(Number(targetRoomId)) ? Number(targetRoomId) : -1]
      );
      if (rooms.length > 0) {
        activeRoom = rooms[0];
      }
    }

    // If no explicit receiverIds provided but in a room, default to the room's host
    if (targetReceiverIds.length === 0) {
      if (activeRoom) {
        if (activeRoom.host_banned) {
          return res.status(400).json({ success: false, message: 'Host account is suspended.' });
        }
        targetReceiverIds = [activeRoom.host_user_id];
      } else {
        return res.status(400).json({
          success: false,
          message: 'Either receiverId/receiverIds (target users) or roomId (live stream room) must be provided.',
        });
      }
    }

    // 3. Sender cannot gift to themselves
    if (targetReceiverIds.includes(senderId)) {
      if (targetReceiverIds.length === 1) {
        return res.status(400).json({ success: false, message: 'You cannot send gifts to yourself.' });
      }
      // If multi-recipients, filter out sender
      targetReceiverIds = targetReceiverIds.filter((id) => id !== senderId);
    }

    if (targetReceiverIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid recipient IDs specified.' });
    }

    // 4. Check Block status between sender and recipients
    const blockPlaceholders = targetReceiverIds.map(() => '?').join(',');
    const [blockRows] = await connection.execute(
      `SELECT blocker_id, blocked_id FROM user_blocks 
       WHERE (blocker_id = ? AND blocked_id IN (${blockPlaceholders}))
          OR (blocked_id = ? AND blocker_id IN (${blockPlaceholders}))`,
      [senderId, ...targetReceiverIds, senderId, ...targetReceiverIds]
    );

    if (blockRows.length > 0) {
      if (targetReceiverIds.length === 1) {
        const isBlockedByMe = blockRows[0].blocker_id === senderId;
        return res.status(403).json({
          success: false,
          message: isBlockedByMe
            ? 'You have blocked this user. Unblock them to send a gift.'
            : 'You cannot send a gift to this user because you have been blocked.',
          is_blocked: true,
          blocked_by_me: isBlockedByMe,
          is_blocked_by_other: !isBlockedByMe,
        });
      }
      // Multi-recipients: exclude blocked ones
      const blockedSet = new Set(blockRows.map((b) => (b.blocker_id === senderId ? b.blocked_id : b.blocker_id)));
      targetReceiverIds = targetReceiverIds.filter((id) => !blockedSet.has(id));
      if (targetReceiverIds.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'All selected recipients are blocked or have blocked you.',
          is_blocked: true,
        });
      }
    }

    // 5. Fetch Recipient Users from MySQL
    const userPlaceholders = targetReceiverIds.map(() => '?').join(',');
    const [receiverUsers] = await connection.execute(
      `SELECT id, full_name, email, avatar_url, role, agency_id, is_banned 
       FROM users WHERE id IN (${userPlaceholders})`,
      targetReceiverIds
    );

    const validReceivers = receiverUsers.filter((u) => !u.is_banned);
    if (validReceivers.length === 0) {
      return res.status(400).json({ success: false, message: 'None of the recipient accounts are available or they are suspended.' });
    }

    // 6. Fetch Gift Specification
    const [gifts] = await connection.execute('SELECT * FROM gifts WHERE id = ? AND is_active = TRUE', [targetGiftId]);
    if (gifts.length === 0) {
      return res.status(404).json({ success: false, message: 'Gift not found or inactive.' });
    }
    const gift = gifts[0];

    const costPerReceiver = gift.coin_cost * giftCount;
    const totalCoinCostAll = costPerReceiver * validReceivers.length;

    // 7. Verify Sender Coin Balance
    const [senders] = await connection.execute('SELECT coins, full_name, avatar_url, level FROM users WHERE id = ?', [senderId]);
    if (senders.length === 0 || senders[0].coins < totalCoinCostAll) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coins balance. You need ${totalCoinCostAll} coins for ${validReceivers.length} recipient(s) (your balance: ${senders[0]?.coins || 0}).`,
      });
    }

    // 8. Fetch Platform Economy Settings
    const [settingsRows] = await connection.execute(
      `SELECT key_name, key_value FROM system_settings 
       WHERE key_name IN ('is_convert_to_diamond', 'coin_to_diamond_ratio', 'admin_gift_commission_percent', 'agency_gift_commission_percent')`
    );

    const settingsMap = {};
    for (const row of settingsRows) {
      settingsMap[row.key_name] = row.key_value;
    }

    const adminCommissionRate = parseFloat(settingsMap['admin_gift_commission_percent'] || '15.0');
    const defaultAgencyCommissionRate = parseFloat(settingsMap['agency_gift_commission_percent'] || '10.0');

    // 9. Fetch Agency details for any host recipients with agency
    const agencyIds = [...new Set(validReceivers.filter((r) => r.role === 'host' && r.agency_id).map((r) => r.agency_id))];
    const agencyMap = new Map();
    if (agencyIds.length > 0) {
      const agencyPlaceholders = agencyIds.map(() => '?').join(',');
      const [agencies] = await connection.execute(
        `SELECT id, name, owner_id, commission_rate FROM agencies WHERE id IN (${agencyPlaceholders}) AND status = 'active'`,
        agencyIds
      );
      for (const ag of agencies) {
        agencyMap.set(ag.id, ag);
      }
    }

    // 10. Calculate Commission & Earning Splits for each recipient
    const recipientCalculations = [];
    const agencyEarningsMap = new Map(); // agencyOwnerId -> { agencyName, coins, rate, hostNames }
    let totalAdminCoins = 0;

    for (const receiver of validReceivers) {
      const isHost = receiver.role === 'host';
      const adminCoins = Math.floor(costPerReceiver * (adminCommissionRate / 100));
      totalAdminCoins += adminCoins;

      let agencyCoins = 0;
      let agencyOwnerId = null;
      let agencyName = '';
      let agencyRate = 0;

      if (isHost && receiver.agency_id && agencyMap.has(receiver.agency_id)) {
        const agency = agencyMap.get(receiver.agency_id);
        agencyRate = parseFloat(agency.commission_rate || defaultAgencyCommissionRate);
        agencyCoins = Math.floor(costPerReceiver * (agencyRate / 100));
        agencyOwnerId = agency.owner_id;
        agencyName = agency.name;

        if (agencyCoins > 0 && agencyOwnerId) {
          const current = agencyEarningsMap.get(agencyOwnerId) || { agencyName, coins: 0, rate: agencyRate, hostNames: [] };
          current.coins += agencyCoins;
          current.hostNames.push(receiver.full_name);
          agencyEarningsMap.set(agencyOwnerId, current);
        }
      }

      const recipientCoins = Math.max(0, costPerReceiver - adminCoins - agencyCoins);

      recipientCalculations.push({
        receiver,
        isHost,
        adminCoins,
        agencyCoins,
        agencyName,
        agencyRate,
        recipientCoins,
      });
    }

    // 11. Database-First Atomic Transaction (SSOT)
    await connection.beginTransaction();

    // Deduct total coins from sender wallet with atomic balance guard (anti-race condition / anti-double spending)
    const [deductResult] = await connection.execute(
      'UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?',
      [totalCoinCostAll, senderId, totalCoinCostAll]
    );

    if (!deductResult || deductResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins balance or concurrent transaction detected. Please try again.',
      });
    }

    const recordedRoomId = activeRoom ? activeRoom.room_id : (targetRoomId || '');

    // Credit each recipient and record ledgers
    for (const calc of recipientCalculations) {
      const { receiver, recipientCoins } = calc;

      // Credit recipient user wallet
      await connection.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [recipientCoins, receiver.id]);

      // Record gift transaction in gift_transactions
      await connection.execute(
        `INSERT INTO gift_transactions (sender_id, receiver_id, room_id, gift_id, gift_name, coin_amount, diamond_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [senderId, receiver.id, recordedRoomId, gift.id, `${gift.name}${giftCount > 1 ? ` x${giftCount}` : ''}`, costPerReceiver, recipientCoins]
      );

      // Recipient transaction ledger
      await connection.execute(
        `INSERT INTO transactions (user_id, type, amount, description, status)
         VALUES (?, 'gift_received', ?, ?, 'completed')`,
        [receiver.id, recipientCoins, `Earned ${recipientCoins} coins from ${gift.name} x${giftCount} sent by ${senders[0].full_name || `User #${senderId}`}`]
      );
    }

    // Credit agency owners
    for (const [agencyOwnerId, agData] of agencyEarningsMap.entries()) {
      if (agData.coins > 0) {
        await connection.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [agData.coins, agencyOwnerId]);
        await connection.execute(
          `INSERT INTO transactions (user_id, type, amount, description, status)
           VALUES (?, 'agency_commission', ?, ?, 'completed')`,
          [
            agencyOwnerId,
            agData.coins,
            `Agency commission (${agData.rate}%) from gift ${gift.name} x${giftCount} sent to ${agData.hostNames.join(', ')}`,
          ]
        );
      }
    }

    // Record Platform / Admin commission
    if (totalAdminCoins > 0) {
      const [adminUsers] = await connection.execute("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1");
      const adminUserId = adminUsers.length > 0 ? adminUsers[0].id : 1;
      const recipientNamesStr = validReceivers.map((r) => r.full_name).join(', ');
      await connection.execute(
        `INSERT INTO transactions (user_id, type, amount, description, status)
         VALUES (?, 'platform_commission', ?, ?, 'completed')`,
        [
          adminUserId,
          totalAdminCoins,
          `Platform gift commission (${adminCommissionRate}%) on gift ${gift.name} x${giftCount} sent to ${recipientNamesStr}`,
        ]
      );
    }

    // Sender transaction ledger
    const recipientSummary = validReceivers.length === 1
      ? validReceivers[0].full_name
      : `${validReceivers.length} users (${validReceivers.map((r) => r.full_name).slice(0, 3).join(', ')}${validReceivers.length > 3 ? '...' : ''})`;

    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'gift_sent', ?, ?, 'completed')`,
      [senderId, totalCoinCostAll, `Sent ${gift.name} x${giftCount} to ${recipientSummary}${recordedRoomId ? ` in room ${recordedRoomId}` : ''}`]
    );

    // If in live room, update room total diamonds counter
    if (activeRoom) {
      const diamondInc = (gift.diamond_reward || gift.coin_cost) * giftCount * validReceivers.length;
      await connection.execute('UPDATE live_rooms SET total_diamonds = total_diamonds + ? WHERE room_id = ?', [diamondInc, activeRoom.room_id]);
    }

    // Commit Transaction to MySQL (SSOT)
    await connection.commit();

    // 12. Instant Redis Cache Invalidation
    const cacheInvalidations = [
      cache.del(`user:${senderId}`),
      cache.del(`user:balance:${senderId}`),
      cache.del(`mobile:user:profile:${senderId}`),
      cache.del(`user:gift_contributions:${senderId}`),
      cache.delByPattern('admin:gifts:top_contributors*'),
      cache.delByPattern('leaderboard:gifters:*'),
      cache.delByPattern('agency:top:*'),
      cache.delByPattern(`user:transactions:${senderId}*`),
      cache.delByPattern('admin:dashboard*'),
      cache.delByPattern('admin:users*'),
      cache.delByPattern('host:*'),
    ];

    if (activeRoom) {
      cacheInvalidations.push(
        cache.del(`room:${activeRoom.room_id}`),
        cache.del(`mobile:room_details:${activeRoom.room_id}`),
        cache.delByPattern(`mobile:room:users:${activeRoom.room_id}*`),
        cache.delByPattern('mobile:rooms:*')
      );
    }

    for (const r of validReceivers) {
      cacheInvalidations.push(
        cache.del(`user:${r.id}`),
        cache.del(`user:balance:${r.id}`),
        cache.del(`mobile:user:profile:${r.id}`),
        cache.delByPattern(`user:transactions:${r.id}*`)
      );
    }

    await Promise.allSettled(cacheInvalidations);

    // 12b. Check Level Progression & Rewards Engine
    recordCoinsSpentAndCheckLevelUp(senderId, totalCoinCostAll, req.io).catch((err) => {
      console.warn('[LevelUp] check failed on sendGift:', err.message);
    });

    // 13. Query fresh updated balances directly from MySQL
    const [freshSender] = await connection.execute('SELECT coins, diamonds FROM users WHERE id = ?', [senderId]);
    const senderUpdatedCoins = freshSender[0]?.coins ?? 0;
    const senderUpdatedDiamonds = freshSender[0]?.diamonds ?? 0;

    const [freshReceiverRows] = await connection.execute(
      `SELECT id, coins, diamonds FROM users WHERE id IN (${userPlaceholders})`,
      targetReceiverIds
    );
    const freshReceiverCoinsMap = new Map(freshReceiverRows.map((row) => [row.id, row.coins]));

    // 13b. Pre-warm Redis with exact fresh balances so subsequent GETs get 100% real-time data
    const redisWarmUpdates = [
      cache.set(`user:balance:${senderId}`, { coins: senderUpdatedCoins, diamonds: senderUpdatedDiamonds }, 30),
    ];
    for (const row of freshReceiverRows) {
      redisWarmUpdates.push(
        cache.set(`user:balance:${row.id}`, { coins: row.coins, diamonds: row.diamonds || 0 }, 30)
      );
    }
    await Promise.allSettled(redisWarmUpdates);

    // 14. Resolve Gift Media URLs
    const animType = String(gift.animation_type || '').toLowerCase();
    const animUrl = String(gift.animation_url || '').trim();

    const isSvga = animType === 'svga' || animUrl.toLowerCase().endsWith('.svga') || animUrl.toLowerCase().includes('.svga');
    const isGif = animType === 'gif' || animUrl.toLowerCase().endsWith('.gif') || animUrl.toLowerCase().includes('.gif');

    const resolvedType = isSvga ? 'svga' : (isGif ? 'gif' : (animType || 'simple'));
    const svgaUrl = isSvga ? animUrl : (animUrl.includes('.svga') ? animUrl : null);
    const gifUrl = isGif ? animUrl : (animUrl.includes('.gif') ? animUrl : null);
    const soundUrl = gift.sound_url || null;

    const protocol = req.protocol || 'http';
    const hostHeader = req.get ? req.get('host') : (req.headers?.host || 'localhost:5050');
    const baseUrl = `${protocol}://${hostHeader}`;

    const toAbsoluteUrl = (path) => {
      if (!path) return null;
      if (typeof path !== 'string') return path;
      if (path.startsWith('http://') || path.startsWith('https://')) return path;
      if (path.startsWith('/uploads') || path.startsWith('uploads/')) {
        return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
      }
      return path;
    };

    // 15. Build Receivers List for Socket Payload
    const receiversList = recipientCalculations.map((calc) => {
      const { receiver, isHost, adminCoins, agencyCoins, agencyName, recipientCoins } = calc;
      const updatedCoin = freshReceiverCoinsMap.get(receiver.id) ?? 0;

      return {
        id: receiver.id,
        receiver_id: receiver.id,
        name: receiver.full_name,
        full_name: receiver.full_name,
        avatar_url: toAbsoluteUrl(receiver.avatar_url),
        role: receiver.role,
        received_coins: recipientCoins,
        updated_coin: updatedCoin,
        coins: updatedCoin,
        commission: {
          is_host: isHost,
          admin_commission_coins: adminCoins,
          agency_commission_coins: agencyCoins,
          agency_name: agencyName || null,
          receiver_coins_earned: recipientCoins,
        },
      };
    });

    const primaryReceiver = receiversList[0];

    // Single unified payload carrying all recipients
    const socketPayload = {
      is_batch: receiversList.length > 1,
      is_multi_receiver: receiversList.length > 1,
      receivers_count: receiversList.length,
      gift: {
        id: gift.id,
        name: gift.name,
        type: resolvedType,
        animation_type: gift.animation_type || resolvedType,
        svga_url: toAbsoluteUrl(svgaUrl),
        gif_url: toAbsoluteUrl(gifUrl),
        animation_url: toAbsoluteUrl(animUrl),
        sound_url: toAbsoluteUrl(soundUrl),
        sound: toAbsoluteUrl(soundUrl),
        icon_url: toAbsoluteUrl(gift.icon_url),
        icon: gift.icon_url,
        coin_cost: gift.coin_cost,
        coins: gift.coin_cost,
        count: giftCount,
        cost_per_receiver: costPerReceiver,
        total_coins: totalCoinCostAll,
      },
      sender_id: senderId,
      senderId: senderId,
      sender_level: senders[0]?.level || 1,
      senderLevel: senders[0]?.level || 1,
      sender_updated_coin: senderUpdatedCoins,
      senderUpdatedCoin: senderUpdatedCoins,
      sender: {
        id: senderId,
        full_name: senders[0].full_name,
        avatar_url: toAbsoluteUrl(senders[0].avatar_url),
        level: senders[0]?.level || 1,
        user_level: senders[0]?.level || 1,
        updated_coin: senderUpdatedCoins,
        coins: senderUpdatedCoins,
      },
      // Primary receiver fields for backward compatibility
      receiver_id: primaryReceiver.id,
      receiverId: primaryReceiver.id,
      receiver_updated_coin: primaryReceiver.updated_coin,
      receiverUpdatedCoin: primaryReceiver.updated_coin,
      receiver: primaryReceiver,
      // Full batch array of all recipients
      receiver_ids: receiversList.map((r) => r.id),
      receivers: receiversList,
      room_id: recordedRoomId,
      roomId: recordedRoomId,
      commission: primaryReceiver.commission,
      timestamp: new Date().toISOString(),
    };

    // 16. Broadcast live event via Socket.IO through the Sequential Room Dispatch Queue (Anti-Duplicate & Paced)
    if (req.io) {
      const roomTargets = new Set(
        [activeRoom?.room_id, activeRoom?.id ? String(activeRoom.id) : null, targetRoomId ? String(targetRoomId) : null].filter(Boolean)
      );

      enqueueRoomGift({
        io: req.io,
        roomTargets,
        socketPayload,
        senderId,
        senderUpdatedCoins,
        receiversList,
      });

      // 17. Broadcast real-time Global Gift Announcement Banner across all rooms and screens
      getGlobalGiftBannerConfig().then((bannerConfig) => {
        if (bannerConfig && bannerConfig.enabled && totalCoinCostAll >= bannerConfig.min_coins) {
          const globalBannerPayload = {
            id: `gift_banner_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            sender: {
              id: senderId,
              name: senders[0]?.full_name || `User #${senderId}`,
              avatar_url: toAbsoluteUrl(senders[0]?.avatar_url),
              level: senders[0]?.level || 1,
            },
            receiver: {
              id: primaryReceiver.id,
              name: primaryReceiver.name,
              avatar_url: primaryReceiver.avatar_url,
            },
            receivers_count: receiversList.length,
            gift: {
              id: gift.id,
              name: gift.name,
              icon_url: toAbsoluteUrl(gift.icon_url),
              count: giftCount,
              coin_cost: gift.coin_cost,
            },
            coins: totalCoinCostAll,
            total_coins: totalCoinCostAll,
            room_id: recordedRoomId || '',
            banner_image_url: toAbsoluteUrl(bannerConfig.image_url),
            duration_seconds: bannerConfig.duration_seconds || 4,
            timestamp: new Date().toISOString(),
          };

          req.io.emit('global_gift_banner', globalBannerPayload);
        }
      }).catch((e) => {
        console.warn('Global gift banner emit error:', e.message);
      });
    }

    const resultPayload = {
      success: true,
      message: `Successfully sent ${gift.name} x${giftCount} to ${recipientSummary}!`,
      newBalance: senderUpdatedCoins,
      ...socketPayload,
    };

    return res.json(resultPayload);
  } catch (err) {
    await connection.rollback();
    console.error('Mobile sendGift error:', err);
    return res.status(500).json({ success: false, message: 'Gift transaction failed.', error: err.message });
  } finally {
    connection.release();
  }
}

/**
 * Mobile User Gift Contributions Breakdown
 * GET /api/mobile/gifts/user/:userId/contributions
 * GET /api/mobile/gifts/contributions/:userId
 * 
 * Shows who this user has gifted to, with total coins aggregated per recipient.
 * If user gifted User A 3 times (e.g. 100, 200, 300 coins), User A appears once with total 600 coins.
 * Sorted by total_coins_gifted DESC (highest recipient first).
 * Cached via Redis (user:gift_contributions:${userId}).
 * If admin panel clears gift transactions, this returns empty list immediately.
 */
export async function getUserGiftContributions(req, res) {
  try {
    const rawUserId = req.params.userId || req.params.id;
    if (!rawUserId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const cleanUserId = parseInt(String(rawUserId).replace(/^#/, ''), 10);
    if (isNaN(cleanUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    const cacheKey = `user:gift_contributions:${cleanUserId}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      // 1. Verify user exists
      const userRows = await query('SELECT id, full_name, avatar_url, coins, diamonds, level FROM users WHERE id = ?', [cleanUserId]);
      if (userRows.length === 0) {
        return null;
      }
      const user = userRows[0];

      // 2. Aggregate gift transactions by recipient (receiver_id)
      const rows = await query(`
        SELECT 
          gt.receiver_id,
          u.id as recipient_id,
          u.full_name as recipient_name,
          u.avatar_url as recipient_avatar,
          u.level as recipient_level,
          u.role as recipient_role,
          pc.name as recipient_vip_category,
          pc.badge_icon as recipient_vip_badge,
          pc.color_code as recipient_vip_color,
          COALESCE(SUM(gt.coin_amount), 0) as total_coins_gifted,
          COUNT(gt.id) as gift_count,
          MAX(gt.created_at) as last_gifted_at
        FROM gift_transactions gt
        JOIN users u ON u.id = gt.receiver_id
        LEFT JOIN user_package_subscriptions ups 
          ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
        LEFT JOIN package_categories pc 
          ON pc.id = ups.category_id AND pc.is_active = 1
        WHERE gt.sender_id = ?
        GROUP BY gt.receiver_id, u.id, u.full_name, u.avatar_url, u.level, u.role, pc.name, pc.badge_icon, pc.color_code
        ORDER BY total_coins_gifted DESC
      `, [cleanUserId]);

      const totalCoinsSpent = (rows || []).reduce((acc, curr) => acc + parseInt(curr.total_coins_gifted || 0, 10), 0);

      const contributions = (rows || []).map((row, index) => ({
        rank: index + 1,
        recipient_id: row.recipient_id,
        recipient_name: row.recipient_name,
        recipient_avatar: row.recipient_avatar,
        recipient_level: row.recipient_level || 1,
        recipient_role: row.recipient_role,
        recipient_vip_category: row.recipient_vip_category || 'Standard',
        recipient_vip_badge: row.recipient_vip_badge || '',
        recipient_vip_color: row.recipient_vip_color || '#7c3aed',
        total_coins_gifted: parseInt(row.total_coins_gifted, 10),
        gift_count: parseInt(row.gift_count, 10),
        last_gifted_at: row.last_gifted_at,
      }));

      return {
        user: {
          id: user.id,
          name: user.full_name,
          avatar_url: user.avatar_url,
          level: user.level,
        },
        total_coins_spent: totalCoinsSpent,
        total_recipients: contributions.length,
        contributions,
      };
    });

    if (!data) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('getUserGiftContributions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch user gift contributions.', error: err.message });
  }
}

/**
 * Mobile: Get Global Gift Announcement Banner Config
 * GET /api/mobile/gifts/global-banner-config
 */
export async function getGlobalGiftBannerConfigMobile(req, res) {
  try {
    const config = await getGlobalGiftBannerConfig();
    const protocol = req.protocol || 'http';
    const hostHeader = req.get ? req.get('host') : (req.headers?.host || 'localhost:5050');
    const baseUrl = `${protocol}://${hostHeader}`;
    const toAbsoluteUrl = (path) => {
      if (!path) return null;
      if (typeof path !== 'string') return path;
      if (path.startsWith('http://') || path.startsWith('https://')) return path;
      if (path.startsWith('/uploads') || path.startsWith('uploads/')) {
        return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
      }
      return path;
    };

    return res.json({
      success: true,
      config: {
        ...config,
        image_url: toAbsoluteUrl(config.image_url),
      },
    });
  } catch (err) {
    console.error('getGlobalGiftBannerConfigMobile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch global gift banner config.' });
  }
}
