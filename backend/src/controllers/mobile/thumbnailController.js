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
    const cacheKey = 'thumbnails:mobile:catalog';

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
        WHERE is_active = 1 AND (is_custom = 0 OR is_custom IS NULL)
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
 * Displays is_active (equipped status), days remaining, expiration state, and is_custom.
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
          st.validity_days,
          st.is_custom,
          st.uploader_id
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
        is_custom: Boolean(row.is_custom),
        uploader_id: row.uploader_id,
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

/**
 * Mobile Custom Thumbnail Upload Configuration
 * GET /api/mobile/thumbnails/upload-config
 * Public/Authenticated endpoint: returns admin-configured coin fee and validity days for custom thumbnail uploads.
 */
export async function getCustomThumbnailUploadConfig(req, res) {
  try {
    const userId = req.user?.id;
    const settings = await cache.getOrSet('thumbnails:upload_config', 60, async () => {
      const rows = await query(`
        SELECT key_name, key_value FROM system_settings 
        WHERE key_name IN ('custom_thumbnail_upload_coin_cost', 'custom_thumbnail_validity_days', 'custom_thumbnail_pricing_tiers')
      `);
      const map = {};
      (rows || []).forEach((r) => {
        map[r.key_name] = r.key_value;
      });
      return map;
    });

    let pricingTiers = [
      { days: 7, coins: 200 },
      { days: 15, coins: 350 },
      { days: 30, coins: 500 },
      { days: 90, coins: 1200 }
    ];

    if (settings.custom_thumbnail_pricing_tiers) {
      try {
        const parsed = typeof settings.custom_thumbnail_pricing_tiers === 'string'
          ? JSON.parse(settings.custom_thumbnail_pricing_tiers)
          : settings.custom_thumbnail_pricing_tiers;
        if (Array.isArray(parsed) && parsed.length > 0) {
          pricingTiers = parsed.map((t) => ({
            days: parseInt(t.days, 10),
            coins: parseInt(t.coins, 10),
          })).filter((t) => !isNaN(t.days) && !isNaN(t.coins) && t.days > 0);
        }
      } catch (e) {
        console.warn('Error parsing custom_thumbnail_pricing_tiers:', e.message);
      }
    }

    const defaultTier = pricingTiers.find((t) => t.days === 30) || pricingTiers[0] || { days: 30, coins: 500 };
    const uploadCoinCost = defaultTier.coins;
    const validityDays = defaultTier.days;

    let userCoins = 0;
    if (userId) {
      const userRows = await query('SELECT coins FROM users WHERE id = ?', [userId]);
      if (userRows && userRows.length > 0) {
        userCoins = userRows[0].coins || 0;
      }
    }

    return res.json({
      success: true,
      pricing_tiers: pricingTiers,
      default_tier: defaultTier,
      upload_coin_cost: uploadCoinCost,
      validity_days: validityDays,
      user_coins: userCoins,
      can_afford: userCoins >= pricingTiers[0]?.coins,
    });
  } catch (err) {
    console.error('getCustomThumbnailUploadConfig error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch custom thumbnail upload configuration.',
      error: err.message,
    });
  }
}

/**
 * Mobile Custom Thumbnail Upload (User uploads custom room background/thumbnail with coin deduction)
 * POST /api/mobile/thumbnails/upload
 * POST /api/mobile/thumbnails/custom-upload
 * 
 * Rules:
 * 1. Admin configures pricing plans (days vs coins) in system_settings ('custom_thumbnail_pricing_tiers').
 * 2. User selects desired duration plan (days: 7, 15, 30, 90, etc.). If omitted, defaults to 30 days plan.
 * 3. User pays the coin cost from their coin balance. If insufficient, returns 400.
 * 4. The thumbnail is created with is_custom = 1 and uploader_id = userId, and added to the user's purchased thumbnails.
 * 5. The thumbnail is NEVER listed in the public store catalog for others to purchase (filtered by is_custom = 0).
 * 6. If the user is currently hosting an active live room, updates the active room's background image immediately.
 */
export async function uploadCustomThumbnail(req, res) {
  try {
    const userId = req.user.id;

    // 1. Resolve uploaded file or image URL
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/rooms/${req.file.filename}`;
    } else if (req.body.image_url && req.body.image_url.trim()) {
      imageUrl = req.body.image_url.trim();
    } else if (req.body.thumbnail_url && req.body.thumbnail_url.trim()) {
      imageUrl = req.body.thumbnail_url.trim();
    } else if (req.body.background_image && req.body.background_image.trim()) {
      imageUrl = req.body.background_image.trim();
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail image is required. Please provide a file upload (field: image or thumbnail) or valid image_url.',
      });
    }

    // 2. Fetch system settings for custom thumbnail pricing plans
    const settingsRows = await query(`
      SELECT key_name, key_value FROM system_settings 
      WHERE key_name IN ('custom_thumbnail_upload_coin_cost', 'custom_thumbnail_validity_days', 'custom_thumbnail_pricing_tiers')
    `);
    const settingsMap = {};
    (settingsRows || []).forEach((r) => {
      settingsMap[r.key_name] = r.key_value;
    });

    let pricingTiers = [
      { days: 7, coins: 200 },
      { days: 15, coins: 350 },
      { days: 30, coins: 500 },
      { days: 90, coins: 1200 }
    ];

    if (settingsMap.custom_thumbnail_pricing_tiers) {
      try {
        const parsed = typeof settingsMap.custom_thumbnail_pricing_tiers === 'string'
          ? JSON.parse(settingsMap.custom_thumbnail_pricing_tiers)
          : settingsMap.custom_thumbnail_pricing_tiers;
        if (Array.isArray(parsed) && parsed.length > 0) {
          pricingTiers = parsed.map((t) => ({
            days: parseInt(t.days, 10),
            coins: parseInt(t.coins, 10),
          })).filter((t) => !isNaN(t.days) && !isNaN(t.coins) && t.days > 0);
        }
      } catch (e) {
        console.warn('Error parsing custom_thumbnail_pricing_tiers:', e.message);
      }
    }

    // 3. Resolve requested duration / tier
    const rawRequestedDays = req.body.days || req.body.duration_days || req.body.validity_days;
    let selectedTier = null;

    if (rawRequestedDays !== undefined && rawRequestedDays !== null && String(rawRequestedDays).trim() !== '') {
      const requestedDays = parseInt(String(rawRequestedDays).trim(), 10);
      selectedTier = pricingTiers.find((t) => t.days === requestedDays);
      if (!selectedTier) {
        return res.status(400).json({
          success: false,
          message: `Invalid duration '${requestedDays}' days. Available duration plans: ${pricingTiers.map((t) => `${t.days} Days (${t.coins} Coins)`).join(', ')}`,
          available_tiers: pricingTiers,
        });
      }
    } else {
      // Default to 30-day tier or first tier
      selectedTier = pricingTiers.find((t) => t.days === 30) || pricingTiers[0] || { days: 30, coins: 500 };
    }

    const coinCost = selectedTier.coins;
    const validityDays = selectedTier.days;

    // 4. Check user balance
    const [user] = await query('SELECT id, coins, full_name, avatar_url FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (coinCost > 0 && user.coins < coinCost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coin balance for the ${validityDays}-day plan. This requires ${coinCost} coins, but you currently have ${user.coins} coins.`,
        required_coins: coinCost,
        current_coins: user.coins,
        selected_plan: selectedTier,
        available_plans: pricingTiers,
      });
    }

    const customName = (req.body.name && req.body.name.trim())
      ? req.body.name.trim()
      : `${user.full_name || 'My'} Custom Thumbnail`;

    // 4. Database SSOT Mutation:
    // a) Deduct coins if cost > 0
    if (coinCost > 0) {
      await query('UPDATE users SET coins = coins - ? WHERE id = ?', [coinCost, userId]);
      await query(`
        INSERT INTO transactions (user_id, type, amount, description, status)
        VALUES (?, 'coin_purchase', ?, ?, 'completed')
      `, [userId, coinCost, `Custom Room Background Thumbnail Upload Fee: ${customName}`]);
    }

    // b) Insert into special_thumbnails with is_custom = 1 and uploader_id = userId
    // Note: Since is_custom = 1, it will NEVER appear in the public store/catalog!
    const thumbResult = await query(`
      INSERT INTO special_thumbnails 
      (name, image_url, price, validity_days, is_active, is_custom, uploader_id)
      VALUES (?, ?, ?, ?, 1, 1, ?)
    `, [customName, imageUrl, coinCost, validityDays, userId]);

    const newThumbnailId = thumbResult.insertId;

    // c) Unequip previously active thumbnails for this user
    await query('UPDATE user_thumbnails SET is_equipped = 0 WHERE user_id = ?', [userId]);

    // d) Insert into user_thumbnails (User's owned / purchased list) with is_equipped = 1
    const subResult = await query(`
      INSERT INTO user_thumbnails 
      (user_id, thumbnail_id, start_date, expires_at, status, is_equipped)
      VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active', 1)
    `, [userId, newThumbnailId, validityDays]);

    const subscriptionId = subResult.insertId;
    const [insertedSub] = await query('SELECT expires_at FROM user_thumbnails WHERE id = ?', [subscriptionId]);
    const expiresAt = insertedSub ? insertedSub.expires_at : null;

    // 5. If user currently has an active hosted live room, update that room's background immediately
    const activeRooms = await query(
      "SELECT id, room_id FROM live_rooms WHERE host_id = ? AND status = 'live' LIMIT 1",
      [userId]
    );

    let updatedActiveRoom = null;
    if (activeRooms && activeRooms.length > 0) {
      const activeRoom = activeRooms[0];
      await query('UPDATE live_rooms SET background_image = ? WHERE id = ?', [imageUrl, activeRoom.id]);
      await cache.del(`live:room:${activeRoom.room_id}`);
      await cache.del(`live:room:details:${activeRoom.room_id}`);
      await cache.delByPattern('live:active_rooms*');

      if (req.io) {
        const socketPayload = {
          roomId: activeRoom.room_id,
          room_id: activeRoom.room_id,
          background_image_url: imageUrl,
          thumbnail_url: imageUrl,
          background_thumbnail: imageUrl,
          updated_by: userId,
        };
        req.io.to(activeRoom.room_id).emit('room_background_updated', socketPayload);
        req.io.to(activeRoom.room_id).emit('room_thumbnail_updated', socketPayload);
      }
      updatedActiveRoom = activeRoom.room_id;
    }

    // 6. Instant Redis Invalidation
    await cache.del(`user:thumbnails:${userId}`);
    await cache.del(`user:thumbnails:active_map:${userId}`);
    await cache.del(`user:balance:${userId}`);
    await cache.del(`user:${userId}`);
    await cache.del(`mobile:user:profile:${userId}`);
    await cache.del('thumbnails:mobile:catalog');
    await cache.del('thumbnails:catalog');

    const remainingCoins = user.coins - coinCost;

    return res.status(201).json({
      success: true,
      message: `Custom thumbnail "${customName}" uploaded and activated successfully!`,
      thumbnail: {
        subscription_id: subscriptionId,
        thumbnail_id: newThumbnailId,
        id: newThumbnailId,
        name: customName,
        image_url: imageUrl,
        price: coinCost,
        validity_days: validityDays,
        is_equipped: true,
        is_active: true,
        is_custom: true,
        uploader_id: userId,
        expires_at: expiresAt,
      },
      coin_cost: coinCost,
      remaining_coins: remainingCoins,
      active_room_updated: updatedActiveRoom,
    });
  } catch (err) {
    console.error('uploadCustomThumbnail error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload custom thumbnail.',
      error: err.message,
    });
  }
}
