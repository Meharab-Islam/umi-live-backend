import { query } from '../../config/db.js';
import { cache } from '../../config/redis.js';

/**
 * Fetch active thumbnail subscriptions map for a user (Cache-Aside)
 */
export async function getUserActiveThumbnailsMap(userId) {
  if (!userId) return {};
  const cleanUserId = parseInt(String(userId).replace(/^#/, ''), 10);
  if (isNaN(cleanUserId) || cleanUserId <= 0) return {};

  const cacheKey = `user:thumbnails:active_map:${cleanUserId}`;
  return await cache.getOrSet(cacheKey, 60, async () => {
    const rows = await query(`
      SELECT 
        ut.id as subscription_id,
        ut.thumbnail_id,
        ut.start_date,
        ut.expires_at,
        ut.status,
        ut.is_equipped,
        GREATEST(0, TIMESTAMPDIFF(DAY, NOW(), ut.expires_at)) as days_remaining,
        GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), ut.expires_at)) as seconds_remaining
      FROM user_thumbnails ut
      WHERE ut.user_id = ? AND ut.status = 'active' AND ut.expires_at > NOW()
      ORDER BY ut.is_equipped DESC, ut.expires_at DESC
    `, [cleanUserId]);

    const map = {};
    for (const r of rows || []) {
      map[r.thumbnail_id] = {
        subscription_id: r.subscription_id,
        thumbnail_id: r.thumbnail_id,
        start_date: r.start_date,
        expires_at: r.expires_at,
        days_remaining: r.days_remaining,
        seconds_remaining: r.seconds_remaining,
        is_equipped: Boolean(r.is_equipped),
      };
    }
    return map;
  });
}

/**
 * Mobile Special Thumbnail Catalog / Store List
 * GET /api/mobile/thumbnails
 * Supports optional authentication. When user is authenticated or passes ?user_id=,
 * enriches each item with is_purchased, is_equipped, expires_at, and days_remaining.
 */
export async function getThumbnailCatalog(req, res) {
  try {
    const userId = req.user?.id || (req.query.user_id ? parseInt(req.query.user_id, 10) : null) || (req.query.userId ? parseInt(req.query.userId, 10) : null);
    const cacheKey = 'thumbnails:catalog';

    const thumbnails = await cache.getOrSet(cacheKey, 300, async () => {
      const rows = await query(`
        SELECT 
          id,
          name,
          image_url,
          price,
          validity_days,
          is_active
        FROM special_thumbnails
        WHERE is_active = 1
        ORDER BY price ASC, id ASC
      `);
      return rows || [];
    });

    const activeMap = userId ? await getUserActiveThumbnailsMap(userId) : {};

    let equippedThumbnail = null;
    const enrichedThumbnails = (thumbnails || []).map((thumb) => {
      const userSub = activeMap[thumb.id] || null;
      const isPurchased = Boolean(userSub);
      const isEquipped = Boolean(userSub && userSub.is_equipped);

      const item = {
        ...thumb,
        is_active: Boolean(thumb.is_active),
        is_purchased: isPurchased,
        is_equipped: isEquipped,
        subscription_id: userSub ? userSub.subscription_id : null,
        expires_at: userSub ? userSub.expires_at : null,
        days_remaining: userSub ? userSub.days_remaining : null,
        seconds_remaining: userSub ? userSub.seconds_remaining : null,
      };

      if (isEquipped && !equippedThumbnail) {
        equippedThumbnail = item;
      }

      return item;
    });

    return res.json({
      success: true,
      thumbnails: enrichedThumbnails,
      equipped_thumbnail: equippedThumbnail,
      active_thumbnail: equippedThumbnail,
      total_count: enrichedThumbnails.length,
    });
  } catch (err) {
    console.error('getThumbnailCatalog error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch thumbnails catalog.', error: err.message });
  }
}

/**
 * Mobile My Owned Thumbnails
 * GET /api/mobile/thumbnails/my-thumbnails
 * Authenticated endpoint returning all thumbnails owned by the requesting user.
 * Displays is_active (equipped status), days remaining, and expiration state.
 */
export async function getMyThumbnails(req, res) {
  try {
    const userId = req.user.id;
    const cacheKey = `user:thumbnails:${userId}`;

    const items = await cache.getOrSet(cacheKey, 60, async () => {
      const rows = await query(`
        SELECT 
          ut.id as subscription_id,
          ut.thumbnail_id,
          ut.start_date,
          ut.expires_at,
          ut.status,
          ut.is_equipped,
          CASE 
            WHEN ut.is_equipped = 1 AND ut.status = 'active' AND ut.expires_at > NOW() THEN 1 
            ELSE 0 
          END as is_active,
          CASE WHEN ut.expires_at <= NOW() OR ut.status != 'active' THEN 1 ELSE 0 END as is_expired,
          GREATEST(0, TIMESTAMPDIFF(DAY, NOW(), ut.expires_at)) as days_remaining,
          GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), ut.expires_at)) as seconds_remaining,
          st.name as thumbnail_name,
          st.image_url,
          st.validity_days
        FROM user_thumbnails ut
        JOIN special_thumbnails st ON ut.thumbnail_id = st.id
        WHERE ut.user_id = ?
        ORDER BY is_active DESC, ut.is_equipped DESC, ut.expires_at DESC
      `, [userId]);

      return (rows || []).map((row) => ({
        subscription_id: row.subscription_id,
        thumbnail_id: row.thumbnail_id,
        name: row.thumbnail_name,
        image_url: row.image_url,
        validity_days: row.validity_days,
        start_date: row.start_date,
        expires_at: row.expires_at,
        days_remaining: row.days_remaining,
        seconds_remaining: row.seconds_remaining,
        is_expired: Boolean(row.is_expired),
        is_active: Boolean(row.is_active),
        is_equipped: Boolean(row.is_equipped),
      }));
    });

    return res.json({
      success: true,
      thumbnails: items || [],
    });
  } catch (err) {
    console.error('getMyThumbnails error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your thumbnails.', error: err.message });
  }
}

/**
 * Mobile Purchase Special Thumbnail / Frame
 * POST /api/mobile/thumbnails/:id/purchase
 * POST /api/mobile/thumbnails/purchase
 * Authenticated endpoint: deducts coins, logs transaction, and grants / extends thumbnail frame.
 */
export async function purchaseThumbnail(req, res) {
  try {
    const userId = req.user.id;
    const rawId = req.params.id || req.body.thumbnailId || req.body.thumbnail_id || req.body.id;

    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Thumbnail ID is required.' });
    }

    const thumbnailId = parseInt(String(rawId).replace(/^#/, ''), 10);
    if (isNaN(thumbnailId)) {
      return res.status(400).json({ success: false, message: 'Invalid thumbnail identifier.' });
    }

    // 1. Fetch thumbnail details
    const [thumb] = await query('SELECT * FROM special_thumbnails WHERE id = ? AND is_active = 1', [thumbnailId]);
    if (!thumb) {
      return res.status(404).json({ success: false, message: 'Thumbnail frame not found or is currently inactive.' });
    }

    // 2. Check user balance
    const [user] = await query('SELECT id, coins, full_name FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const price = parseInt(thumb.price, 10) || 0;
    if (user.coins < price) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coin balance. You need ${price} coins, but only have ${user.coins} coins.`,
        required_coins: price,
        current_coins: user.coins,
      });
    }

    const validityDays = parseInt(thumb.validity_days, 10) || 30;

    // 3. Deduct coins (Database SSOT mutation)
    await query('UPDATE users SET coins = coins - ? WHERE id = ?', [price, userId]);

    // 4. Record transaction ledger
    await query(`
      INSERT INTO transactions (user_id, type, amount, description, status)
      VALUES (?, 'coin_purchase', ?, ?, 'completed')
    `, [userId, price, `Purchased Special Thumbnail: ${thumb.name} (${validityDays} Days)`]);

    // 5. Extend existing active subscription or insert new active subscription
    const [existing] = await query(`
      SELECT id, expires_at FROM user_thumbnails
      WHERE user_id = ? AND thumbnail_id = ? AND status = 'active' AND expires_at > NOW()
      ORDER BY expires_at DESC LIMIT 1
    `, [userId, thumb.id]);

    let subscriptionId;
    let expiresAt;

    if (existing) {
      await query(`
        UPDATE user_thumbnails 
        SET expires_at = DATE_ADD(expires_at, INTERVAL ? DAY), is_equipped = 1, updated_at = NOW()
        WHERE id = ?
      `, [validityDays, existing.id]);
      subscriptionId = existing.id;
      const [updatedRow] = await query('SELECT expires_at FROM user_thumbnails WHERE id = ?', [existing.id]);
      expiresAt = updatedRow.expires_at;
    } else {
      // Unequip previously equipped thumbnails so this new frame becomes active
      await query('UPDATE user_thumbnails SET is_equipped = 0 WHERE user_id = ?', [userId]);
      const insResult = await query(`
        INSERT INTO user_thumbnails 
        (user_id, thumbnail_id, start_date, expires_at, status, is_equipped)
        VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active', 1)
      `, [userId, thumb.id, validityDays]);
      subscriptionId = insResult.insertId;
      const [insertedRow] = await query('SELECT expires_at FROM user_thumbnails WHERE id = ?', [subscriptionId]);
      expiresAt = insertedRow.expires_at;
    }

    // 6. Instant Redis Invalidation
    await cache.del(`user:thumbnails:${userId}`);
    await cache.del(`user:thumbnails:active_map:${userId}`);
    await cache.del(`user:balance:${userId}`);
    await cache.del(`user:${userId}`);
    await cache.del(`mobile:user:profile:${userId}`);

    return res.json({
      success: true,
      message: `Congratulations! You unlocked the "${thumb.name}" thumbnail frame!`,
      thumbnail_id: thumb.id,
      thumbnail_name: thumb.name,
      image_url: thumb.image_url,
      subscription_id: subscriptionId,
      expires_at: expiresAt,
      is_equipped: true,
      price_paid: price,
      remaining_coins: user.coins - price,
    });
  } catch (err) {
    console.error('purchaseThumbnail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to purchase thumbnail frame.', error: err.message });
  }
}

/**
 * Mobile Toggle / Switch Active Thumbnail (Equip / Unequip)
 * POST /api/mobile/thumbnails/:id/toggle
 * POST /api/mobile/thumbnails/:id/equip
 * 
 * - If inactive: Deactivates previous active thumbnail, and activates this thumbnail.
 * - If already active: Deactivates this thumbnail (unequips).
 * - Matches by user_thumbnails.id (subscription_id) OR special_thumbnails.id (thumbnail_id).
 */
export async function toggleThumbnail(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Thumbnail ID or Subscription ID is required.' });
    }

    const cleanId = parseInt(String(id).replace(/^#/, ''), 10);
    if (isNaN(cleanId)) {
      return res.status(400).json({ success: false, message: 'Invalid thumbnail identifier.' });
    }

    // 1. Check ownership in database
    const [existing] = await query(`
      SELECT ut.*, st.name as thumbnail_name, st.image_url
      FROM user_thumbnails ut
      JOIN special_thumbnails st ON ut.thumbnail_id = st.id
      WHERE ut.user_id = ? AND (ut.id = ? OR ut.thumbnail_id = ?)
      ORDER BY ut.expires_at DESC
      LIMIT 1
    `, [userId, cleanId, cleanId]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'You do not own this thumbnail. Please purchase or unlock it first.',
      });
    }

    // Check expiration
    const isExpired = new Date(existing.expires_at) <= new Date() || existing.status !== 'active';
    if (isExpired) {
      return res.status(400).json({
        success: false,
        message: `Your subscription for "${existing.thumbnail_name}" has expired on ${new Date(existing.expires_at).toLocaleDateString()}. Please renew it.`,
      });
    }

    const wasEquipped = Boolean(existing.is_equipped);

    // 2. DB Mutation
    if (wasEquipped) {
      // Toggle OFF (Deactivate / Unequip)
      await query('UPDATE user_thumbnails SET is_equipped = 0 WHERE id = ?', [existing.id]);

      // Instant Redis Invalidation
      await cache.del(`user:thumbnails:${userId}`);
      await cache.del(`user:thumbnails:active_map:${userId}`);
      await cache.del(`user:${userId}`);
      await cache.del(`mobile:user:profile:${userId}`);

      return res.json({
        success: true,
        message: `Thumbnail "${existing.thumbnail_name}" deactivated successfully.`,
        is_active: false,
        is_equipped: false,
        subscription_id: existing.id,
        thumbnail_id: existing.thumbnail_id,
        name: existing.thumbnail_name,
      });
    } else {
      // Toggle ON (Activate / Equip): Unequip all others, then equip this one
      await query('UPDATE user_thumbnails SET is_equipped = 0 WHERE user_id = ?', [userId]);
      await query('UPDATE user_thumbnails SET is_equipped = 1 WHERE id = ?', [existing.id]);

      // Instant Redis Invalidation
      await cache.del(`user:thumbnails:${userId}`);
      await cache.del(`user:thumbnails:active_map:${userId}`);
      await cache.del(`user:${userId}`);
      await cache.del(`mobile:user:profile:${userId}`);

      return res.json({
        success: true,
        message: `Thumbnail "${existing.thumbnail_name}" activated successfully!`,
        is_active: true,
        is_equipped: true,
        subscription_id: existing.id,
        thumbnail_id: existing.thumbnail_id,
        name: existing.thumbnail_name,
        image_url: existing.image_url,
      });
    }
  } catch (err) {
    console.error('toggleThumbnail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update thumbnail active state.', error: err.message });
  }
}
