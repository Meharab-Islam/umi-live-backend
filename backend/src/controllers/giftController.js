import { query, getPool } from '../config/db.js';
import { cache } from '../config/redis.js';

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
    console.error('getGifts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch gifts.' });
  }
}

export async function sendGift(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const senderId = req.user.id;
    const { roomId, giftId, count = 1 } = req.body;

    if (!roomId || !giftId) {
      return res.status(400).json({ success: false, message: 'roomId and giftId are required.' });
    }

    const giftCount = Math.max(1, parseInt(count, 10) || 1);

    // Fetch Room & Host
    const [rooms] = await connection.execute('SELECT * FROM live_rooms WHERE room_id = ? AND status = "live"', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Active live room not found.' });
    }
    const room = rooms[0];
    const receiverId = room.host_id;

    if (senderId === receiverId) {
      return res.status(400).json({ success: false, message: 'You cannot send gifts to your own live stream.' });
    }

    // Fetch Gift
    const [gifts] = await connection.execute('SELECT * FROM gifts WHERE id = ? AND is_active = TRUE', [giftId]);
    if (gifts.length === 0) {
      return res.status(404).json({ success: false, message: 'Gift not found or inactive.' });
    }
    const gift = gifts[0];

    const totalCoinCost = gift.coin_cost * giftCount;
    const totalDiamondReward = gift.diamond_reward * giftCount;

    // Check sender balance
    const [senders] = await connection.execute('SELECT coins FROM users WHERE id = ?', [senderId]);
    if (senders.length === 0 || senders[0].coins < totalCoinCost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coins. You need ${totalCoinCost} coins (balance: ${senders[0]?.coins || 0}).`,
      });
    }

    // Begin atomic transaction
    await connection.beginTransaction();

    // 1. Deduct sender coins
    await connection.execute('UPDATE users SET coins = coins - ? WHERE id = ?', [totalCoinCost, senderId]);

    // 2. Add receiver diamonds
    await connection.execute('UPDATE users SET diamonds = diamonds + ? WHERE id = ?', [totalDiamondReward, receiverId]);

    // 3. Increment room diamond score
    await connection.execute('UPDATE live_rooms SET total_diamonds = total_diamonds + ? WHERE room_id = ?', [totalDiamondReward, roomId]);

    // 4. Record gift transaction
    const [giftTx] = await connection.execute(
      `INSERT INTO gift_transactions (sender_id, receiver_id, room_id, gift_id, gift_name, coin_amount, diamond_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [senderId, receiverId, roomId, gift.id, `${gift.name}${giftCount > 1 ? ` x${giftCount}` : ''}`, totalCoinCost, totalDiamondReward]
    );

    // 5. Record sender coin ledger
    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'gift_sent', ?, ?, 'completed')`,
      [senderId, totalCoinCost, `Sent ${gift.name} x${giftCount} to host in room ${roomId}`]
    );

    // 6. Record receiver diamond ledger
    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'gift_received', ?, ?, 'completed')`,
      [receiverId, totalDiamondReward, `Received ${gift.name} x${giftCount} from ${req.user.full_name || `User #${req.user.id}`}`]
    );

    await connection.commit();

    // Get updated sender coin balance
    const [updatedSender] = await connection.execute('SELECT coins FROM users WHERE id = ?', [senderId]);

    // Database writes succeeded -> Invalidate Redis cache immediately
    await cache.del(`user:${senderId}`);
    await cache.del(`user:${receiverId}`);
    await cache.del(`user:balance:${senderId}`);
    await cache.del(`user:balance:${receiverId}`);
    await cache.del(`room:${roomId}`);
    await cache.delByPattern('admin:dashboard*');
    await cache.delByPattern('admin:users*');

    const resultPayload = {
      success: true,
      message: `Successfully sent ${gift.name} x${giftCount}!`,
      newBalance: updatedSender[0].coins,
      gift: {
        id: gift.id,
        name: gift.name,
        icon: gift.icon_url,
        animation: gift.animation_type,
        count: giftCount,
        sender: {
          id: req.user.id,
          full_name: req.user.full_name,
          full_name: req.user.full_name,
          avatar_url: req.user.avatar_url,
        },
        diamondsEarned: totalDiamondReward,
      },
      transactionId: giftTx.insertId,
    };

    return res.json(resultPayload);
  } catch (err) {
    await connection.rollback();
    console.error('sendGift error:', err);
    return res.status(500).json({ success: false, message: 'Transaction failed.', error: err.message });
  } finally {
    connection.release();
  }
}
