import { query, getPool } from '../../config/db.js';
import { cache } from '../../config/redis.js';

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
      count = 1,
      receiverId,
      receiver_id,
      roomId,
    } = req.body;

    if (!giftId) {
      return res.status(400).json({ success: false, message: 'giftId is required.' });
    }

    const targetReceiverId = receiverId || receiver_id;
    if (!targetReceiverId && !roomId) {
      return res.status(400).json({
        success: false,
        message: 'Either receiverId (target user) or roomId (live stream room) must be provided.',
      });
    }

    const giftCount = Math.max(1, parseInt(count, 10) || 1);

    // 1. Resolve Recipient User & Room
    let receiver = null;
    let activeRoom = null;

    if (targetReceiverId) {
      // Direct user gift or specific user in a room
      const [users] = await connection.execute(
        `SELECT id, full_name, email, avatar_url, role, agency_id, is_banned 
         FROM users WHERE id = ? LIMIT 1`,
        [targetReceiverId]
      );

      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'Recipient user not found.' });
      }

      receiver = users[0];

      if (receiver.is_banned) {
        return res.status(400).json({ success: false, message: 'Recipient account is banned or suspended.' });
      }

      // If roomId is also passed, verify and link live room
      if (roomId) {
        const [rooms] = await connection.execute(
          'SELECT * FROM live_rooms WHERE room_id = ? AND status = "live"',
          [roomId]
        );
        if (rooms.length > 0) {
          activeRoom = rooms[0];
        }
      }
    } else {
      // Room-based gifting: recipient is the room's host
      const [rooms] = await connection.execute(
        `SELECT r.*, u.id as host_user_id, u.full_name as host_name, u.email as host_email,
                u.avatar_url as host_avatar, u.role as host_role, u.agency_id, u.is_banned as host_banned
         FROM live_rooms r
         JOIN users u ON r.host_id = u.id
         WHERE r.room_id = ? AND r.status = 'live'`,
        [roomId]
      );

      if (rooms.length === 0) {
        return res.status(404).json({ success: false, message: 'Active live room not found or stream has ended.' });
      }

      const room = rooms[0];
      if (room.host_banned) {
        return res.status(400).json({ success: false, message: 'Host account is suspended.' });
      }

      receiver = {
        id: room.host_user_id,
        full_name: room.host_name,
        email: room.host_email,
        avatar_url: room.host_avatar,
        role: room.host_role,
        agency_id: room.agency_id,
      };
      activeRoom = room;
    }

    const finalReceiverId = receiver.id;

    if (senderId === finalReceiverId) {
      return res.status(400).json({ success: false, message: 'You cannot send gifts to yourself.' });
    }

    // 2. Fetch Gift specification
    const [gifts] = await connection.execute('SELECT * FROM gifts WHERE id = ? AND is_active = TRUE', [giftId]);
    if (gifts.length === 0) {
      return res.status(404).json({ success: false, message: 'Gift not found or inactive.' });
    }
    const gift = gifts[0];
    const totalCoinCost = gift.coin_cost * giftCount;

    // 3. Verify sender coin balance
    const [senders] = await connection.execute('SELECT coins, full_name, avatar_url FROM users WHERE id = ?', [senderId]);
    if (senders.length === 0 || senders[0].coins < totalCoinCost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coins balance. You need ${totalCoinCost} coins (your balance: ${senders[0]?.coins || 0}).`,
      });
    }

    // 4. Fetch Platform Economy Settings
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

    // 5. Commission Split Logic
    // If receiver is a host: Admin commission + Agency commission (if host has agency) deducted; remaining goes to receiver.
    // If receiver is NOT a host (user / audience / guest): Admin commission deducted; remaining goes to receiver.
    const isHost = (receiver.role === 'host');
    const adminCoins = Math.floor(totalCoinCost * (adminCommissionRate / 100));

    let agencyCoins = 0;
    let agencyOwnerId = null;
    let agencyName = '';
    let agencyRate = 0;

    if (isHost && receiver.agency_id) {
      const [agencies] = await connection.execute('SELECT * FROM agencies WHERE id = ? AND status = "active"', [receiver.agency_id]);
      if (agencies.length > 0) {
        const agency = agencies[0];
        agencyRate = parseFloat(agency.commission_rate || defaultAgencyCommissionRate);
        agencyCoins = Math.floor(totalCoinCost * (agencyRate / 100));
        agencyOwnerId = agency.owner_id;
        agencyName = agency.name;
      }
    }

    const recipientCoins = Math.max(0, totalCoinCost - adminCoins - agencyCoins);

    // Begin Database-First Atomic Transaction (SSOT)
    await connection.beginTransaction();

    // Deduct coins from sender wallet
    await connection.execute('UPDATE users SET coins = coins - ? WHERE id = ?', [totalCoinCost, senderId]);

    // Credit coins to recipient user wallet
    await connection.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [recipientCoins, finalReceiverId]);

    // Credit coins to agency owner if applicable
    if (agencyCoins > 0 && agencyOwnerId) {
      await connection.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [agencyCoins, agencyOwnerId]);
      await connection.execute(
        `INSERT INTO transactions (user_id, type, amount, description, status)
         VALUES (?, 'agency_commission', ?, ?, 'completed')`,
        [agencyOwnerId, agencyCoins, `Agency commission (${agencyRate}%) from gift ${gift.name} x${giftCount} sent to host ${receiver.full_name}`]
      );
    }

    // Record Admin / Platform commission
    if (adminCoins > 0) {
      const [adminUsers] = await connection.execute("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1");
      const adminUserId = adminUsers.length > 0 ? adminUsers[0].id : 1;
      await connection.execute(
        `INSERT INTO transactions (user_id, type, amount, description, status)
         VALUES (?, 'platform_commission', ?, ?, 'completed')`,
        [adminUserId, adminCoins, `Platform gift commission (${adminCommissionRate}%) on gift ${gift.name} x${giftCount} sent to ${receiver.full_name}`]
      );
    }

    const recordedRoomId = activeRoom ? activeRoom.room_id : (roomId || '');

    // If in a live room, update room total diamonds counter
    if (activeRoom) {
      const diamondInc = (gift.diamond_reward || gift.coin_cost) * giftCount;
      await connection.execute('UPDATE live_rooms SET total_diamonds = total_diamonds + ? WHERE room_id = ?', [diamondInc, activeRoom.room_id]);
    }

    // Record gift transaction
    const [giftTx] = await connection.execute(
      `INSERT INTO gift_transactions (sender_id, receiver_id, room_id, gift_id, gift_name, coin_amount, diamond_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [senderId, finalReceiverId, recordedRoomId, gift.id, `${gift.name}${giftCount > 1 ? ` x${giftCount}` : ''}`, totalCoinCost, recipientCoins]
    );

    // Sender transaction ledger
    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'gift_sent', ?, ?, 'completed')`,
      [senderId, totalCoinCost, `Sent ${gift.name} x${giftCount} to ${receiver.full_name}${recordedRoomId ? ` in room ${recordedRoomId}` : ''}`]
    );

    // Recipient transaction ledger
    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'gift_received', ?, ?, 'completed')`,
      [finalReceiverId, recipientCoins, `Earned ${recipientCoins} coins from ${gift.name} x${giftCount} sent by ${senders[0].full_name || `User #${senderId}`}`]
    );

    // Commit Transaction to MySQL (SSOT)
    await connection.commit();

    // Database committed -> Instant Redis Cache Invalidation
    await Promise.allSettled([
      cache.del(`user:${senderId}`),
      cache.del(`user:${finalReceiverId}`),
      cache.del(`user:balance:${senderId}`),
      cache.del(`user:balance:${finalReceiverId}`),
      cache.del(`mobile:user:profile:${senderId}`),
      cache.del(`mobile:user:profile:${finalReceiverId}`),
      cache.del(`user:gift_contributions:${senderId}`),
      cache.delByPattern('admin:gifts:top_contributors*'),
      cache.delByPattern('leaderboard:gifters:*'),
      cache.delByPattern('agency:top:*'),
      activeRoom ? cache.del(`room:${activeRoom.room_id}`) : null,
      activeRoom ? cache.del(`mobile:room_details:${activeRoom.room_id}`) : null,
      activeRoom ? cache.delByPattern(`mobile:room:users:${activeRoom.room_id}*`) : null,
      activeRoom ? cache.delByPattern('mobile:rooms:*') : null,
      cache.delByPattern(`user:transactions:${senderId}*`),
      cache.delByPattern(`user:transactions:${finalReceiverId}*`),
      cache.delByPattern('admin:dashboard*'),
      cache.delByPattern('admin:users*'),
      cache.delByPattern('host:*'),
    ]);

    // Query fresh updated balances directly from MySQL
    const [freshSender] = await connection.execute('SELECT coins FROM users WHERE id = ?', [senderId]);
    const [freshReceiver] = await connection.execute('SELECT coins FROM users WHERE id = ?', [finalReceiverId]);
    const senderUpdatedCoins = freshSender[0]?.coins ?? 0;
    const receiverUpdatedCoins = freshReceiver[0]?.coins ?? 0;

    // Resolve gift media URLs (SVGA, GIF, Sound)
    const animType = String(gift.animation_type || '').toLowerCase();
    const animUrl = String(gift.animation_url || '').trim();

    let isSvga = animType === 'svga' || animUrl.toLowerCase().endsWith('.svga') || animUrl.toLowerCase().includes('.svga');
    let isGif = animType === 'gif' || animUrl.toLowerCase().endsWith('.gif') || animUrl.toLowerCase().includes('.gif');

    const resolvedType = isSvga ? 'svga' : (isGif ? 'gif' : (animType || 'simple'));
    const svgaUrl = isSvga ? animUrl : (animUrl.includes('.svga') ? animUrl : null);
    const gifUrl = isGif ? animUrl : (animUrl.includes('.gif') ? animUrl : null);
    const soundUrl = gift.sound_url || null;

    const protocol = req.protocol || 'http';
    const hostHeader = (req.get ? req.get('host') : (req.headers?.host || 'localhost:5050'));
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

    const socketPayload = {
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
        total_coins: totalCoinCost,
      },
      sender_id: senderId,
      senderId: senderId,
      sender_updated_coin: senderUpdatedCoins,
      senderUpdatedCoin: senderUpdatedCoins,
      sender: {
        id: senderId,
        full_name: senders[0].full_name,
        avatar_url: senders[0].avatar_url,
        updated_coin: senderUpdatedCoins,
        coins: senderUpdatedCoins,
      },
      receiver_id: finalReceiverId,
      receiverId: finalReceiverId,
      receiver_updated_coin: receiverUpdatedCoins,
      receiverUpdatedCoin: receiverUpdatedCoins,
      receiver: {
        id: finalReceiverId,
        full_name: receiver.full_name,
        avatar_url: receiver.avatar_url,
        role: receiver.role,
        updated_coin: receiverUpdatedCoins,
        coins: receiverUpdatedCoins,
      },
      room_id: recordedRoomId,
      roomId: recordedRoomId,
      commission: {
        is_host: isHost,
        admin_commission_rate: adminCommissionRate,
        admin_commission_coins: adminCoins,
        agency_commission_rate: agencyRate,
        agency_commission_coins: agencyCoins,
        agency_name: agencyName || null,
        receiver_coins_earned: recipientCoins,
      },
      timestamp: new Date().toISOString(),
    };

    // Broadcast live event via Socket.IO
    if (req.io) {
      const roomTargets = new Set([
        activeRoom?.room_id,
        activeRoom?.id ? String(activeRoom.id) : null,
        roomId ? String(roomId) : null,
      ].filter(Boolean));

      for (const rm of roomTargets) {
        req.io.to(rm).emit('gift-broadcast', socketPayload);
        req.io.to(rm).emit('gift_broadcast', socketPayload);
        req.io.to(rm).emit('gift_received', socketPayload);
        req.io.to(rm).emit('gift:received', socketPayload);
        req.io.to(rm).emit('gift-sent', socketPayload);
        req.io.to(rm).emit('gift_sent', socketPayload);
        req.io.to(rm).emit('room_gift', socketPayload);
        req.io.to(rm).emit('user_balance_updated', { userId: senderId, coins: senderUpdatedCoins });
        req.io.to(rm).emit('user_balance_updated', { userId: finalReceiverId, coins: receiverUpdatedCoins });
      }

      req.io.to(`user_${senderId}`).emit('wallet_balance_updated', { coins: senderUpdatedCoins });
      req.io.to(`user_${finalReceiverId}`).emit('wallet_balance_updated', { coins: receiverUpdatedCoins });
      req.io.to(`user_${senderId}`).emit('gift_sent', socketPayload);
      req.io.to(`user_${finalReceiverId}`).emit('gift_received', socketPayload);
    }

    const resultPayload = {
      success: true,
      message: `Successfully sent ${gift.name} x${giftCount} to ${receiver.full_name}!`,
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
