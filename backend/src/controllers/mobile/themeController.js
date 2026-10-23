import { query } from '../../config/db.js';
import cache from '../../config/redis.js';

/**
 * Mobile: Get entire themes catalog grouped by section (page images, bottom sheet images, colors)
 * Enriched with user purchase and equipped state when authenticated.
 */
export async function getThemesCatalog(req, res) {
  try {
    const userId = req.user?.id || (req.query?.user_id ? parseInt(req.query.user_id, 10) : null);

    // Fetch base active catalog from Redis Cache-Aside
    const catalog = await cache.getOrSet('themes:mobile:catalog', 300, async () => {
      const rows = await query(`
        SELECT 
          id,
          type,
          name,
          value,
          secondary_value,
          preview_url,
          price,
          validity_days,
          is_default,
          sort_order,
          created_at
        FROM app_theme_items
        WHERE is_active = 1
        ORDER BY is_default DESC, sort_order ASC, id DESC
      `);

      const page_images = [];
      const bottom_sheet_images = [];
      const colors = [];

      let defaultPageImage = null;
      let defaultBottomSheetImage = null;
      let defaultColor = null;

      for (const item of rows || []) {
        if (item.type === 'page_image') {
          page_images.push(item);
          if (item.is_default && !defaultPageImage) defaultPageImage = item;
        } else if (item.type === 'bottom_sheet_image') {
          bottom_sheet_images.push(item);
          if (item.is_default && !defaultBottomSheetImage) defaultBottomSheetImage = item;
        } else if (item.type === 'color') {
          colors.push(item);
          if (item.is_default && !defaultColor) defaultColor = item;
        }
      }

      return {
        page_images,
        bottom_sheet_images,
        colors,
        active_defaults: {
          page_image: defaultPageImage,
          bottom_sheet_image: defaultBottomSheetImage,
          color: defaultColor,
        },
      };
    });

    // If user is authenticated, check which items are owned/equipped
    let userOwnedMap = {};
    if (userId) {
      const userItems = await query(`
        SELECT 
          theme_item_id,
          is_equipped,
          expires_at
        FROM user_theme_items
        WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())
      `, [userId]);

      for (const u of userItems || []) {
        userOwnedMap[u.theme_item_id] = {
          is_equipped: Boolean(u.is_equipped),
          expires_at: u.expires_at,
        };
      }
    }

    const enrichItems = (items) => {
      return items.map((item) => {
        const isFree = item.price === 0;
        const owned = userOwnedMap[item.id];
        const isPurchased = isFree || Boolean(owned);
        const isEquipped = owned ? owned.is_equipped : Boolean(item.is_default);

        return {
          ...item,
          is_free: isFree,
          is_purchased: isPurchased,
          is_equipped: isEquipped,
          expires_at: owned?.expires_at || null,
        };
      });
    };

    return res.json({
      success: true,
      catalog: {
        page_images: enrichItems(catalog.page_images),
        bottom_sheet_images: enrichItems(catalog.bottom_sheet_images),
        colors: enrichItems(catalog.colors),
        active_defaults: catalog.active_defaults,
      },
    });
  } catch (err) {
    console.error('getThemesCatalog error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch themes catalog.', error: err.message });
  }
}

/**
 * Mobile: Get system default theme (100% Public, No Auth Required)
 * Call this immediately on Flutter app launch / splash screen to render
 * page wallpaper, bottom sheets, and primary color palette without any token.
 */
export async function getDefaultTheme(req, res) {
  try {
    const defaults = await cache.getOrSet('themes:mobile:defaults', 300, async () => {
      const rows = await query(`
        SELECT id, type, name, value, secondary_value, price 
        FROM app_theme_items 
        WHERE is_default = 1 AND is_active = 1
      `);
      const map = {};
      for (const r of rows || []) {
        map[r.type] = r;
      }
      return map;
    });

    return res.json({
      success: true,
      message: 'System default theme loaded successfully.',
      theme: {
        page_image: defaults.page_image || null,
        bottom_sheet_image: defaults.bottom_sheet_image || null,
        color: defaults.color || null,
      },
    });
  } catch (err) {
    console.error('getDefaultTheme error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch default theme.', error: err.message });
  }
}

/**
 * Mobile: Get current active theme settings (Defaults + User's equipped custom theme)
 */
export async function getActiveTheme(req, res) {
  try {
    const userId = req.user?.id || (req.query?.user_id ? parseInt(req.query.user_id, 10) : null);

    // 1. Get system defaults
    const defaults = await cache.getOrSet('themes:mobile:defaults', 300, async () => {
      const rows = await query(`
        SELECT id, type, name, value, secondary_value, price 
        FROM app_theme_items 
        WHERE is_default = 1 AND is_active = 1
      `);
      const map = {};
      for (const r of rows || []) {
        map[r.type] = r;
      }
      return map;
    });

    let activeTheme = {
      page_image: defaults.page_image || null,
      bottom_sheet_image: defaults.bottom_sheet_image || null,
      color: defaults.color || null,
    };

    // 2. If user authenticated, override with any equipped custom items
    if (userId) {
      const equippedItems = await query(`
        SELECT 
          ti.id,
          ti.type,
          ti.name,
          ti.value,
          ti.secondary_value,
          uti.expires_at
        FROM user_theme_items uti
        JOIN app_theme_items ti ON uti.theme_item_id = ti.id
        WHERE uti.user_id = ? AND uti.is_equipped = 1 AND ti.is_active = 1
          AND (uti.expires_at IS NULL OR uti.expires_at > NOW())
      `, [userId]);

      for (const eq of equippedItems || []) {
        if (eq.type === 'page_image') activeTheme.page_image = eq;
        else if (eq.type === 'bottom_sheet_image') activeTheme.bottom_sheet_image = eq;
        else if (eq.type === 'color') activeTheme.color = eq;
      }
    }

    return res.json({
      success: true,
      theme: activeTheme,
    });
  } catch (err) {
    console.error('getActiveTheme error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch active theme.', error: err.message });
  }
}

/**
 * Mobile: Purchase a theme item with coins
 */
export async function buyThemeItem(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const itemId = parseInt(req.params.id, 10);
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'Valid theme item ID required.' });
    }

    const [item] = await query('SELECT * FROM app_theme_items WHERE id = ? AND is_active = 1', [itemId]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Theme item not found or unavailable.' });
    }

    // Check if already owned
    const [existing] = await query(`
      SELECT * FROM user_theme_items 
      WHERE user_id = ? AND theme_item_id = ? 
        AND (expires_at IS NULL OR expires_at > NOW())
    `, [userId, itemId]);

    if (existing) {
      return res.status(400).json({ success: false, message: 'You already own this theme item!' });
    }

    // Check user balance
    const [user] = await query('SELECT id, coins FROM users WHERE id = ?', [userId]);
    if (!user || user.coins < item.price) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coins. This theme item costs ${item.price} coins, but your balance is ${user?.coins || 0} coins.`,
      });
    }

    // Calculate expiry (if validity_days > 0)
    let expiresAt = null;
    if (item.validity_days > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + item.validity_days);
      expiresAt = expDate;
    }

    // Deduct coins & record transaction & save user item
    if (item.price > 0) {
      await query('UPDATE users SET coins = coins - ? WHERE id = ?', [item.price, userId]);
      await query(`
        INSERT INTO transactions (user_id, amount, type, status, description)
        VALUES (?, ?, 'theme_purchase', 'completed', ?)
      `, [userId, item.price, `Purchased theme: ${item.name} (${item.type})`]);
    }

    await query(`
      INSERT INTO user_theme_items (user_id, theme_item_id, is_equipped, expires_at)
      VALUES (?, ?, 1, ?)
      ON DUPLICATE KEY UPDATE 
        is_equipped = 1,
        expires_at = VALUES(expires_at)
    `, [userId, itemId, expiresAt]);

    // Un-equip other items of the same type for this user
    await query(`
      UPDATE user_theme_items uti
      JOIN app_theme_items ti ON uti.theme_item_id = ti.id
      SET uti.is_equipped = 0
      WHERE uti.user_id = ? AND ti.type = ? AND uti.theme_item_id != ?
    `, [userId, item.type, itemId]);

    // Invalidate Redis caches
    await cache.del(`user:${userId}:profile`);
    await cache.del(`user:${userId}:wallet`);
    await cache.delByPattern(`themes:user:${userId}:*`);

    const [updatedUser] = await query('SELECT coins FROM users WHERE id = ?', [userId]);

    return res.json({
      success: true,
      message: `🎉 Successfully purchased and equipped "${item.name}"!`,
      item,
      remaining_coins: updatedUser?.coins || 0,
    });
  } catch (err) {
    console.error('buyThemeItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to purchase theme item.', error: err.message });
  }
}

/**
 * Mobile: Equip or un-equip a theme item
 */
export async function equipThemeItem(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const itemId = parseInt(req.params.id, 10);
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'Valid theme item ID required.' });
    }

    const [item] = await query('SELECT * FROM app_theme_items WHERE id = ? AND is_active = 1', [itemId]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Theme item not found.' });
    }

    // If item is not free, verify ownership
    if (item.price > 0) {
      const [ownership] = await query(`
        SELECT * FROM user_theme_items 
        WHERE user_id = ? AND theme_item_id = ? 
          AND (expires_at IS NULL OR expires_at > NOW())
      `, [userId, itemId]);

      if (!ownership) {
        return res.status(403).json({ success: false, message: 'You have not purchased this theme item yet.' });
      }
    }

    // Ensure entry in user_theme_items for free/default items
    await query(`
      INSERT INTO user_theme_items (user_id, theme_item_id, is_equipped, expires_at)
      VALUES (?, ?, 1, NULL)
      ON DUPLICATE KEY UPDATE is_equipped = 1
    `, [userId, itemId]);

    // Un-equip all other items of the same type for this user
    await query(`
      UPDATE user_theme_items uti
      JOIN app_theme_items ti ON uti.theme_item_id = ti.id
      SET uti.is_equipped = 0
      WHERE uti.user_id = ? AND ti.type = ? AND uti.theme_item_id != ?
    `, [userId, item.type, itemId]);

    await cache.delByPattern(`themes:user:${userId}:*`);

    return res.json({
      success: true,
      message: `"${item.name}" has been equipped as your active ${item.type.replace('_', ' ')}.`,
      equipped_item: item,
    });
  } catch (err) {
    console.error('equipThemeItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to equip theme item.', error: err.message });
  }
}

/**
 * Mobile: Get my owned and equipped theme items
 */
export async function getMyThemeItems(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const rows = await query(`
      SELECT 
        ti.id,
        ti.type,
        ti.name,
        ti.value,
        ti.secondary_value,
        ti.preview_url,
        ti.price,
        uti.is_equipped,
        uti.expires_at,
        uti.created_at as acquired_at
      FROM user_theme_items uti
      JOIN app_theme_items ti ON uti.theme_item_id = ti.id
      WHERE uti.user_id = ? AND (uti.expires_at IS NULL OR uti.expires_at > NOW())
      ORDER BY uti.is_equipped DESC, uti.created_at DESC
    `, [userId]);

    return res.json({
      success: true,
      items: rows || [],
    });
  } catch (err) {
    console.error('getMyThemeItems error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your theme items.', error: err.message });
  }
}
