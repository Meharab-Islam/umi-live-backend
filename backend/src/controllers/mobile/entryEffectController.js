import { query } from '../../config/db.js';
import { cache } from '../../config/redis.js';

/**
 * Fetch active entry effect subscriptions map for a user (Cache-Aside)
 */
export async function getUserActiveEntryEffectsMap(userId) {
  if (!userId) return {};
  const cleanUserId = parseInt(String(userId).replace(/^#/, ''), 10);
  if (isNaN(cleanUserId) || cleanUserId <= 0) return {};

  const cacheKey = `user:entry_effects:active_map:${cleanUserId}`;
  return await cache.getOrSet(cacheKey, 60, async () => {
    const rows = await query(`
      SELECT 
        uee.id as subscription_id,
        uee.effect_id,
        uee.start_date,
        uee.expires_at,
        uee.status,
        uee.is_equipped,
        GREATEST(0, TIMESTAMPDIFF(DAY, NOW(), uee.expires_at)) as days_remaining,
        GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), uee.expires_at)) as seconds_remaining
      FROM user_entry_effects uee
      WHERE uee.user_id = ? AND uee.status = 'active' AND uee.expires_at > NOW()
      ORDER BY uee.is_equipped DESC, uee.expires_at DESC
    `, [cleanUserId]);

    const map = {};
    for (const r of rows || []) {
      map[r.effect_id] = {
        subscription_id: r.subscription_id,
        effect_id: r.effect_id,
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
 * Mobile Entry Effect Catalog / Store List
 * GET /api/mobile/entry-effects
 * Supports optional authentication. When user is authenticated or passes ?user_id=,
 * enriches each item with is_purchased, is_equipped, expires_at, and days_remaining.
 */
export async function getEntryEffectCatalog(req, res) {
  try {
    const userId = req.user?.id || (req.query.user_id ? parseInt(req.query.user_id, 10) : null) || (req.query.userId ? parseInt(req.query.userId, 10) : null);
    const cacheKey = 'entry_effects:catalog';

    const effects = await cache.getOrSet(cacheKey, 300, async () => {
      const rows = await query(`
        SELECT 
          id,
          name,
          effect_type,
          preview_image_url,
          svga_url,
          gif_url,
          sound_url,
          price,
          validity_days,
          is_active
        FROM entry_effects
        WHERE is_active = 1
        ORDER BY price ASC, id ASC
      `);
      return rows || [];
    });

    const activeMap = userId ? await getUserActiveEntryEffectsMap(userId) : {};

    let equippedEffect = null;
    const enrichedEffects = (effects || []).map((eff) => {
      const userSub = activeMap[eff.id] || null;
      const isPurchased = Boolean(userSub);
      const isEquipped = Boolean(userSub && userSub.is_equipped);

      const item = {
        ...eff,
        is_active: Boolean(eff.is_active),
        is_purchased: isPurchased,
        is_equipped: isEquipped,
        subscription_id: userSub ? userSub.subscription_id : null,
        expires_at: userSub ? userSub.expires_at : null,
        days_remaining: userSub ? userSub.days_remaining : null,
        seconds_remaining: userSub ? userSub.seconds_remaining : null,
      };

      if (isEquipped && !equippedEffect) {
        equippedEffect = item;
      }

      return item;
    });

    return res.json({
      success: true,
      effects: enrichedEffects,
      equipped_effect: equippedEffect,
      active_effect: equippedEffect,
      total_count: enrichedEffects.length,
    });
  } catch (err) {
    console.error('getEntryEffectCatalog error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch entry effects catalog.', error: err.message });
  }
}

/**
 * Mobile My Owned Entry Effects
 * GET /api/mobile/entry-effects/my-effects
 * Authenticated endpoint returning all entry effects owned by the requesting user.
 * Displays is_active (equipped status), days remaining, and expiration state.
 */
export async function getMyEntryEffects(req, res) {
  try {
    const userId = req.user.id;
    const cacheKey = `user:entry_effects:${userId}`;

    const items = await cache.getOrSet(cacheKey, 60, async () => {
      const rows = await query(`
        SELECT 
          uee.id as subscription_id,
          uee.effect_id,
          uee.start_date,
          uee.expires_at,
          uee.status,
          uee.is_equipped,
          CASE 
            WHEN uee.is_equipped = 1 AND uee.status = 'active' AND uee.expires_at > NOW() THEN 1 
            ELSE 0 
          END as is_active,
          CASE WHEN uee.expires_at <= NOW() OR uee.status != 'active' THEN 1 ELSE 0 END as is_expired,
          GREATEST(0, TIMESTAMPDIFF(DAY, NOW(), uee.expires_at)) as days_remaining,
          GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), uee.expires_at)) as seconds_remaining,
          ee.name as effect_name,
          ee.effect_type,
          ee.preview_image_url,
          ee.svga_url,
          ee.gif_url,
          ee.sound_url,
          ee.validity_days
        FROM user_entry_effects uee
        JOIN entry_effects ee ON uee.effect_id = ee.id
        WHERE uee.user_id = ?
        ORDER BY is_active DESC, uee.is_equipped DESC, uee.expires_at DESC
      `, [userId]);

      return (rows || []).map((row) => ({
        subscription_id: row.subscription_id,
        effect_id: row.effect_id,
        name: row.effect_name,
        effect_type: row.effect_type,
        preview_image_url: row.preview_image_url,
        svga_url: row.svga_url,
        gif_url: row.gif_url,
        sound_url: row.sound_url,
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
      effects: items || [],
    });
  } catch (err) {
    console.error('getMyEntryEffects error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your entry effects.', error: err.message });
  }
}

/**
 * Mobile Purchase Entry Effect
 * POST /api/mobile/entry-effects/:id/purchase
 * POST /api/mobile/entry-effects/purchase
 * Authenticated endpoint: deducts coins, logs transaction, and grants / extends entry effect.
 */
export async function purchaseEntryEffect(req, res) {
  try {
    const userId = req.user.id;
    const rawId = req.params.id || req.body.effectId || req.body.effect_id || req.body.id;

    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Entry effect ID is required.' });
    }

    const effectId = parseInt(String(rawId).replace(/^#/, ''), 10);
    if (isNaN(effectId)) {
      return res.status(400).json({ success: false, message: 'Invalid entry effect identifier.' });
    }

    // 1. Fetch effect details
    const [effect] = await query('SELECT * FROM entry_effects WHERE id = ? AND is_active = 1', [effectId]);
    if (!effect) {
      return res.status(404).json({ success: false, message: 'Entry effect not found or is currently inactive.' });
    }

    // 2. Check user balance
    const [user] = await query('SELECT id, coins, full_name FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const price = parseInt(effect.price, 10) || 0;
    if (user.coins < price) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coin balance. You need ${price} coins, but only have ${user.coins} coins.`,
        required_coins: price,
        current_coins: user.coins,
      });
    }

    const validityDays = parseInt(effect.validity_days, 10) || 30;

    // 3. Deduct coins (Database SSOT mutation)
    await query('UPDATE users SET coins = coins - ? WHERE id = ?', [price, userId]);

    // 4. Record transaction ledger
    await query(`
      INSERT INTO transactions (user_id, type, amount, description, status)
      VALUES (?, 'coin_purchase', ?, ?, 'completed')
    `, [userId, price, `Purchased Entry Effect: ${effect.name} (${validityDays} Days)`]);

    // 5. Extend existing active subscription or insert new active subscription
    const [existing] = await query(`
      SELECT id, expires_at FROM user_entry_effects
      WHERE user_id = ? AND effect_id = ? AND status = 'active' AND expires_at > NOW()
      ORDER BY expires_at DESC LIMIT 1
    `, [userId, effect.id]);

    let subscriptionId;
    let expiresAt;

    if (existing) {
      await query(`
        UPDATE user_entry_effects 
        SET expires_at = DATE_ADD(expires_at, INTERVAL ? DAY), is_equipped = 1, updated_at = NOW()
        WHERE id = ?
      `, [validityDays, existing.id]);
      subscriptionId = existing.id;
      const [updatedRow] = await query('SELECT expires_at FROM user_entry_effects WHERE id = ?', [existing.id]);
      expiresAt = updatedRow.expires_at;
    } else {
      // Unequip previously equipped entry effects so this new one becomes active
      await query('UPDATE user_entry_effects SET is_equipped = 0 WHERE user_id = ?', [userId]);
      const insResult = await query(`
        INSERT INTO user_entry_effects 
        (user_id, effect_id, start_date, expires_at, status, is_equipped)
        VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active', 1)
      `, [userId, effect.id, validityDays]);
      subscriptionId = insResult.insertId;
      const [insertedRow] = await query('SELECT expires_at FROM user_entry_effects WHERE id = ?', [subscriptionId]);
      expiresAt = insertedRow.expires_at;
    }

    // 6. Instant Redis Invalidation
    await cache.del(`user:entry_effects:${userId}`);
    await cache.del(`user:entry_effects:active_map:${userId}`);
    await cache.del(`user:balance:${userId}`);
    await cache.del(`user:${userId}`);
    await cache.del(`mobile:user:profile:${userId}`);

    return res.json({
      success: true,
      message: `Congratulations! You unlocked the "${effect.name}" entry effect!`,
      effect_id: effect.id,
      effect_name: effect.name,
      subscription_id: subscriptionId,
      expires_at: expiresAt,
      is_equipped: true,
      price_paid: price,
      remaining_coins: user.coins - price,
    });
  } catch (err) {
    console.error('purchaseEntryEffect error:', err);
    return res.status(500).json({ success: false, message: 'Failed to purchase entry effect.', error: err.message });
  }
}

/**
 * Mobile Toggle / Switch Active Entry Effect (Equip / Unequip)
 * POST /api/mobile/entry-effects/:id/toggle
 * POST /api/mobile/entry-effects/:id/equip
 * 
 * - If inactive: Deactivates previous active effect, and activates this effect.
 * - If already active: Deactivates this effect (unequips).
 * - Matches by user_entry_effects.id (subscription_id) OR entry_effects.id (effect_id).
 */
export async function toggleEntryEffect(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Effect ID or Subscription ID is required.' });
    }

    const cleanId = parseInt(String(id).replace(/^#/, ''), 10);
    if (isNaN(cleanId)) {
      return res.status(400).json({ success: false, message: 'Invalid effect identifier.' });
    }

    // 1. Check ownership in database
    const [existing] = await query(`
      SELECT uee.*, ee.name as effect_name, ee.preview_image_url, ee.effect_type
      FROM user_entry_effects uee
      JOIN entry_effects ee ON uee.effect_id = ee.id
      WHERE uee.user_id = ? AND (uee.id = ? OR uee.effect_id = ?)
      ORDER BY uee.expires_at DESC
      LIMIT 1
    `, [userId, cleanId, cleanId]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'You do not own this entry effect. Please purchase or unlock it first.',
      });
    }

    // Check expiration
    const isExpired = new Date(existing.expires_at) <= new Date() || existing.status !== 'active';
    if (isExpired) {
      return res.status(400).json({
        success: false,
        message: `Your subscription for "${existing.effect_name}" has expired on ${new Date(existing.expires_at).toLocaleDateString()}. Please renew it.`,
      });
    }

    const wasEquipped = Boolean(existing.is_equipped);

    // 2. DB Mutation
    if (wasEquipped) {
      // Toggle OFF (Deactivate / Unequip)
      await query('UPDATE user_entry_effects SET is_equipped = 0 WHERE id = ?', [existing.id]);

      // Instant Redis Invalidation
      await cache.del(`user:entry_effects:${userId}`);
      await cache.del(`user:entry_effects:active_map:${userId}`);
      await cache.del(`user:${userId}`);
      await cache.del(`mobile:user:profile:${userId}`);

      return res.json({
        success: true,
        message: `Entry effect "${existing.effect_name}" deactivated successfully.`,
        is_active: false,
        is_equipped: false,
        subscription_id: existing.id,
        effect_id: existing.effect_id,
        name: existing.effect_name,
      });
    } else {
      // Toggle ON (Activate / Equip): Unequip all others, then equip this one
      await query('UPDATE user_entry_effects SET is_equipped = 0 WHERE user_id = ?', [userId]);
      await query('UPDATE user_entry_effects SET is_equipped = 1 WHERE id = ?', [existing.id]);

      // Instant Redis Invalidation
      await cache.del(`user:entry_effects:${userId}`);
      await cache.del(`user:entry_effects:active_map:${userId}`);
      await cache.del(`user:${userId}`);
      await cache.del(`mobile:user:profile:${userId}`);

      return res.json({
        success: true,
        message: `Entry effect "${existing.effect_name}" activated successfully! It will now play when you enter live rooms.`,
        is_active: true,
        is_equipped: true,
        subscription_id: existing.id,
        effect_id: existing.effect_id,
        name: existing.effect_name,
        effect_type: existing.effect_type,
        preview_image_url: existing.preview_image_url,
      });
    }
  } catch (err) {
    console.error('toggleEntryEffect error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update entry effect active state.', error: err.message });
  }
}
