import { query } from '../config/db.js';
import { cache } from '../config/redis.js';

// ==========================================
// PACKAGE CATEGORIES CONTROLLERS & PRIVILEGE HELPERS
// ==========================================

export function formatCategoryPrivileges(category) {
  const privileges = {
    cant_be_removed: Boolean(category.cant_be_removed),
    cant_be_banned: Boolean(category.cant_be_banned),
    self_seat_accept: Boolean(category.self_seat_accept),
    top_live_list: Boolean(category.top_live_list),
    anti_mute: Boolean(category.anti_mute),
    special_entry: false,
  };

  const privilegeList = [
    {
      key: 'cant_be_removed',
      name: 'Anti-Kick',
      icon: '🛡️',
      description: 'Cannot be kicked or removed from live room by hosts or moderators',
      enabled: privileges.cant_be_removed,
    },
    {
      key: 'cant_be_banned',
      name: 'Anti-Ban',
      icon: '🚫',
      description: 'Immune to room bans and blacklists',
      enabled: privileges.cant_be_banned,
    },
    {
      key: 'self_seat_accept',
      name: 'Auto-Seat Approval',
      icon: '🎙️',
      description: 'Instantly occupy mic seat without waiting for host approval',
      enabled: privileges.self_seat_accept,
    },
    {
      key: 'top_live_list',
      name: 'Top Live Ranking',
      icon: '🚀',
      description: 'Pinned at top of audience and host exploration rankings',
      enabled: privileges.top_live_list,
    },
    {
      key: 'anti_mute',
      name: 'Anti-Mute',
      icon: '🔇',
      description: 'Immune to microphone muting by room hosts',
      enabled: privileges.anti_mute,
    },
  ];

  return {
    privileges,
    privilege_list: privilegeList,
    custom_privileges: [],
  };
}

/**
 * Fetch and cache user active package subscriptions map
 * Returns { byPackageId: {}, byCategoryId: {} }
 */
export async function getUserActiveSubscriptionsMap(userId) {
  if (!userId) return { byPackageId: {}, byCategoryId: {} };

  return await cache.getOrSet(`user:packages:active_map:${userId}`, 60, async () => {
    const rows = await query(`
      SELECT 
        ups.id as subscription_id,
        ups.package_id,
        ups.category_id,
        ups.start_date,
        ups.expires_at,
        ups.status,
        ups.is_equipped,
        GREATEST(0, CEIL(TIMESTAMPDIFF(SECOND, NOW(), ups.expires_at) / 86400)) as days_remaining,
        TIMESTAMPDIFF(SECOND, NOW(), ups.expires_at) as seconds_remaining,
        (ups.status = 'active' AND ups.expires_at > NOW()) as is_active,
        pp.name as package_name,
        pp.image_url as package_image_url,
        pp.color as package_color,
        pc.name as category_name,
        pc.badge_icon as category_badge_icon,
        pc.color_code as category_color
      FROM user_package_subscriptions ups
      LEFT JOIN privilege_packages pp ON pp.id = ups.package_id
      LEFT JOIN package_categories pc ON pc.id = ups.category_id
      WHERE ups.user_id = ? AND ups.status = 'active' AND ups.expires_at > NOW()
      ORDER BY ups.is_equipped DESC, ups.expires_at DESC
    `, [userId]);

    const byPackageId = {};
    const byCategoryId = {};

    for (const r of rows || []) {
      const subObj = {
        subscription_id: r.subscription_id,
        package_id: r.package_id,
        package_name: r.package_name || '',
        package_image: r.package_image_url || '',
        package_image_url: r.package_image_url || '',
        package_color: r.package_color || '#8b5cf6',
        color: r.package_color || '#8b5cf6',
        category_id: r.category_id,
        category_name: r.category_name || '',
        category_badge_icon: r.category_badge_icon || '',
        category_color: r.category_color || '#f59e0b',
        start_date: r.start_date,
        expires_at: r.expires_at,
        days_remaining: Number(r.days_remaining),
        seconds_remaining: Number(r.seconds_remaining),
        status: r.status,
        is_active: Boolean(r.is_active),
        is_equipped: Boolean(r.is_equipped),
      };

      if (!byPackageId[r.package_id]) {
        byPackageId[r.package_id] = subObj;
      }
      if (!byCategoryId[r.category_id]) {
        byCategoryId[r.category_id] = subObj;
      }
    }

    return { byPackageId, byCategoryId };
  });
}

/**
 * Enrich a package object with user subscription state
 */
export function enrichPackageWithUserSubscription(pkg, subsMap) {
  if (!pkg) return pkg;
  // userSub: user bought exactly this package
  const userSub = subsMap?.byPackageId?.[pkg.id] || null;
  // catSub: user has any subscription in this category
  const catSub = subsMap?.byCategoryId?.[pkg.category_id] || null;

  // A package is "purchased" only if userSub exists OR catSub points to exactly this package
  const isThisPackagePurchased = Boolean(
    userSub || (catSub && catSub.package_id === pkg.id)
  );
  // Only attach subscription details to the actually purchased package
  const activeSub = isThisPackagePurchased ? (userSub || catSub) : null;

  return {
    ...pkg,
    is_purchased: isThisPackagePurchased,
    is_active_subscription: isThisPackagePurchased && Boolean(activeSub?.is_active),
    subscription_id: activeSub ? activeSub.subscription_id : null,
    expires_at: activeSub ? activeSub.expires_at : null,
    days_remaining: activeSub ? activeSub.days_remaining : null,
    seconds_remaining: activeSub ? activeSub.seconds_remaining : null,
    is_equipped: activeSub ? Boolean(activeSub.is_equipped) : false,
    my_subscription: activeSub || null,
    category_subscribed: Boolean(catSub),
    category_active_package_id: catSub ? catSub.package_id : null,
  };
}

/**
 * Enrich a category object and its embedded packages with user subscription state
 */
export function enrichCategoryWithUserSubscription(cat, subsMap) {
  if (!cat) return cat;
  const catSub = subsMap?.byCategoryId?.[cat.id] || null;

  const enriched = {
    ...cat,
    is_subscribed: Boolean(catSub),
    active_package_id: catSub ? catSub.package_id : null,
    package_name: catSub ? catSub.package_name : null,
    package_image: catSub ? catSub.package_image : null,
    package_image_url: catSub ? catSub.package_image_url : null,
    expires_at: catSub ? catSub.expires_at : null,
    days_remaining: catSub ? catSub.days_remaining : null,
    seconds_remaining: catSub ? catSub.seconds_remaining : null,
    my_subscription: catSub || null,
  };

  if (Array.isArray(enriched.packages)) {
    enriched.packages = enriched.packages.map((p) => enrichPackageWithUserSubscription(p, subsMap));
  }

  return enriched;
}

export async function getPackageCategories(req, res) {
  try {
    const includePackages = req.query.include_packages === 'true';
    const activeOnly = req.query.activeOnly !== 'false';
    const userId = req.user?.id || (req.query.user_id ? parseInt(req.query.user_id, 10) : null) || (req.query.userId ? parseInt(req.query.userId, 10) : null);
    const cacheKey = `packages:categories:${includePackages ? 'with_pkgs' : 'plain'}:${activeOnly ? 'active' : 'all'}`;

    const categories = await cache.getOrSet(cacheKey, 120, async () => {
      const activeFilter = activeOnly ? 'WHERE pc.is_active = 1' : '';
      const rows = await query(`
        SELECT 
          pc.*,
          (SELECT COUNT(*) FROM privilege_packages pp WHERE pp.category_id = pc.id ${activeOnly ? 'AND pp.is_active = 1' : ''}) as package_count,
          (SELECT COUNT(*) FROM user_package_subscriptions ups 
           WHERE ups.category_id = pc.id AND ups.status = 'active' AND ups.expires_at > NOW()) as active_subscribers_count
        FROM package_categories pc
        ${activeFilter}
        ORDER BY pc.display_order ASC, pc.id ASC
      `);

      let packagesMap = {};
      if (includePackages && rows && rows.length > 0) {
        const pkgs = await query(`
          SELECT pp.*, 
            (SELECT COUNT(*) FROM user_package_subscriptions ups
             WHERE ups.package_id = pp.id AND ups.status = 'active' AND ups.expires_at > NOW()) as active_users_count
          FROM privilege_packages pp
          WHERE ${activeOnly ? 'pp.is_active = 1' : '1=1'}
          ORDER BY pp.price ASC
        `);
        for (const p of pkgs) {
          if (!packagesMap[p.category_id]) packagesMap[p.category_id] = [];
          packagesMap[p.category_id].push(p);
        }
      }

      return (rows || []).map((row) => {
        const priv = formatCategoryPrivileges(row);
        const catObj = {
          ...row,
          is_active: Boolean(row.is_active),
          privileges: priv.privileges,
          privilege_list: priv.privilege_list,
          custom_privileges: priv.custom_privileges,
        };
        if (includePackages) {
          catObj.packages = packagesMap[row.id] || [];
        }
        return catObj;
      });
    });

    const subsMap = userId ? await getUserActiveSubscriptionsMap(userId) : { byPackageId: {}, byCategoryId: {} };
    const enrichedCategories = (categories || []).map((cat) => enrichCategoryWithUserSubscription(cat, subsMap));
    const activeSub = Object.values(subsMap.byPackageId || {})[0] || Object.values(subsMap.byCategoryId || {})[0] || null;

    return res.json({
      success: true,
      categories: enrichedCategories,
      active_subscription: activeSub || null,
      my_subscription: activeSub || null,
      expires_at: activeSub ? activeSub.expires_at : null,
      days_remaining: activeSub ? activeSub.days_remaining : null,
    });
  } catch (err) {
    console.error('getPackageCategories error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch package categories.', error: err.message });
  }
}

export async function createPackageCategory(req, res) {
  try {
    const {
      name,
      badge_icon = '👑',
      color_code = '#f59e0b',
      display_order = 1,
      cant_be_removed = true,
      cant_be_banned = true,
      self_seat_accept = true,
      top_live_list = true,
      anti_mute = false,
      special_entry = true,
      custom_privileges = null,
      is_active = true,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const result = await query(
      `INSERT INTO package_categories 
       (name, badge_icon, color_code, display_order, cant_be_removed, cant_be_banned, 
        self_seat_accept, top_live_list, anti_mute, special_entry, custom_privileges, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        badge_icon || '👑',
        color_code || '#f59e0b',
        parseInt(display_order, 10) || 1,
        cant_be_removed ? 1 : 0,
        cant_be_banned ? 1 : 0,
        self_seat_accept ? 1 : 0,
        top_live_list ? 1 : 0,
        anti_mute ? 1 : 0,
        special_entry ? 1 : 0,
        custom_privileges ? JSON.stringify(custom_privileges) : null,
        is_active ? 1 : 0,
      ]
    );

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('packages:*');

    return res.json({
      success: true,
      message: `Category "${name}" created successfully.`,
      categoryId: result.insertId,
    });
  } catch (err) {
    console.error('createPackageCategory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create package category.', error: err.message });
  }
}

export async function updatePackageCategory(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      badge_icon,
      color_code,
      display_order,
      cant_be_removed,
      cant_be_banned,
      self_seat_accept,
      top_live_list,
      anti_mute,
      special_entry,
      custom_privileges,
      is_active,
    } = req.body;

    const [existing] = await query('SELECT * FROM package_categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Package category not found.' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (badge_icon !== undefined) {
      updates.push('badge_icon = ?');
      params.push(badge_icon);
    }
    if (color_code !== undefined) {
      updates.push('color_code = ?');
      params.push(color_code);
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(parseInt(display_order, 10) || 1);
    }
    if (cant_be_removed !== undefined) {
      updates.push('cant_be_removed = ?');
      params.push(cant_be_removed ? 1 : 0);
    }
    if (cant_be_banned !== undefined) {
      updates.push('cant_be_banned = ?');
      params.push(cant_be_banned ? 1 : 0);
    }
    if (self_seat_accept !== undefined) {
      updates.push('self_seat_accept = ?');
      params.push(self_seat_accept ? 1 : 0);
    }
    if (top_live_list !== undefined) {
      updates.push('top_live_list = ?');
      params.push(top_live_list ? 1 : 0);
    }
    if (anti_mute !== undefined) {
      updates.push('anti_mute = ?');
      params.push(anti_mute ? 1 : 0);
    }
    if (special_entry !== undefined) {
      updates.push('special_entry = ?');
      params.push(special_entry ? 1 : 0);
    }
    if (custom_privileges !== undefined) {
      updates.push('custom_privileges = ?');
      params.push(custom_privileges ? JSON.stringify(custom_privileges) : null);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(id);
      await query(`UPDATE package_categories SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('packages:*');
    await cache.delByPattern('user:privileges:*');

    return res.json({
      success: true,
      message: 'Category updated successfully.',
    });
  } catch (err) {
    console.error('updatePackageCategory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update category.', error: err.message });
  }
}

export async function deletePackageCategory(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM package_categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    // 1. Find all affected users who currently have subscriptions or VIP status of this category
    const affectedUsers = await query(`
      SELECT DISTINCT user_id FROM user_package_subscriptions WHERE category_id = ?
      UNION
      SELECT id as user_id FROM users WHERE vip_package = ?
    `, [id, existing.name]);

    // 2. Delete all user subscriptions under this category
    await query('DELETE FROM user_package_subscriptions WHERE category_id = ?', [id]);

    // 3. Delete all packages under this category
    await query('DELETE FROM privilege_packages WHERE category_id = ?', [id]);

    // 4. Delete the category itself
    await query('DELETE FROM package_categories WHERE id = ?', [id]);

    // 5. Reset / Recalculate VIP status for all affected users
    for (const u of affectedUsers) {
      if (u.user_id) {
        const [nextActive] = await query(`
          SELECT pc.name FROM user_package_subscriptions ups
          JOIN package_categories pc ON ups.category_id = pc.id
          WHERE ups.user_id = ? AND ups.status = 'active' AND ups.expires_at > NOW() AND pc.is_active = 1
          ORDER BY pc.display_order ASC LIMIT 1
        `, [u.user_id]);

        const updatedVip = nextActive ? nextActive.name : 'Standard';
        await query('UPDATE users SET vip_package = ? WHERE id = ?', [updatedVip, u.user_id]);
      }
    }

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('packages:*');
    await cache.delByPattern('user:*');
    await cache.delByPattern('admin:users*');

    return res.json({
      success: true,
      message: `Category "${existing.name}", all its packages, and all assigned user subscriptions have been completely deleted.`,
    });
  } catch (err) {
    console.error('deletePackageCategory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete category.', error: err.message });
  }
}

export async function reorderCategories(req, res) {
  try {
    const { orderings } = req.body; // Array of { id, display_order }
    if (!Array.isArray(orderings)) {
      return res.status(400).json({ success: false, message: 'orderings array is required.' });
    }

    for (const item of orderings) {
      if (item.id && item.display_order !== undefined) {
        await query('UPDATE package_categories SET display_order = ? WHERE id = ?', [
          parseInt(item.display_order, 10),
          item.id,
        ]);
      }
    }

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('packages:*');

    return res.json({
      success: true,
      message: 'Categories rank priority reordered successfully.',
    });
  } catch (err) {
    console.error('reorderCategories error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reorder categories.', error: err.message });
  }
}

// ==========================================
// PACKAGES CONTROLLERS
// ==========================================

export async function getPackages(req, res) {
  try {
    const { categoryId, search, activeOnly } = req.query;
    const userId = req.user?.id || (req.query.user_id ? parseInt(req.query.user_id, 10) : null) || (req.query.userId ? parseInt(req.query.userId, 10) : null);
    const cacheKey = `packages:list:${categoryId || 'all'}:${activeOnly || 'all'}:${search ? encodeURIComponent(search.trim()) : 'all'}`;

    const packages = await cache.getOrSet(cacheKey, 120, async () => {
      const conditions = [];
      const params = [];

      if (categoryId && categoryId !== 'all') {
        conditions.push('pp.category_id = ?');
        params.push(parseInt(categoryId, 10));
      }

      if (activeOnly === 'true') {
        conditions.push('pp.is_active = 1');
      }

      if (search && search.trim()) {
        conditions.push('(pp.name LIKE ? OR pp.description LIKE ? OR pc.name LIKE ?)');
        const s = `%${search.trim()}%`;
        params.push(s, s, s);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const rows = await query(`
        SELECT 
          pp.*,
          pc.name as category_name,
          pc.badge_icon as category_icon,
          pc.color_code as category_color,
          pc.display_order as category_order,
          pc.cant_be_removed,
          pc.cant_be_banned,
          pc.self_seat_accept,
          pc.top_live_list,
          pc.anti_mute,
          pc.special_entry,
          (SELECT COUNT(*) FROM user_package_subscriptions ups 
           WHERE ups.package_id = pp.id AND ups.status = 'active' AND ups.expires_at > NOW()) as active_users_count
        FROM privilege_packages pp
        JOIN package_categories pc ON pp.category_id = pc.id
        ${whereSql}
        ORDER BY pc.display_order ASC, pp.price ASC
      `, params);

      return rows || [];
    });

    const subsMap = userId ? await getUserActiveSubscriptionsMap(userId) : { byPackageId: {}, byCategoryId: {} };
    const enrichedPackages = (packages || []).map((p) => enrichPackageWithUserSubscription(p, subsMap));
    const activeSub = Object.values(subsMap.byPackageId || {})[0] || Object.values(subsMap.byCategoryId || {})[0] || null;

    return res.json({
      success: true,
      packages: enrichedPackages,
      active_subscription: activeSub || null,
      my_subscription: activeSub || null,
      expires_at: activeSub ? activeSub.expires_at : null,
      days_remaining: activeSub ? activeSub.days_remaining : null,
    });
  } catch (err) {
    console.error('getPackages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch packages.', error: err.message });
  }
}

export async function createPackage(req, res) {
  try {
    const {
      category_id,
      name,
      image_url = '',
      validity_days = 30,
      price = 1000,
      currency = 'coins',
      description = '',
      color = '#8b5cf6',
      is_active = true,
    } = req.body;

    if (!category_id) {
      return res.status(400).json({ success: false, message: 'Category is required for creating a package.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Package name is required.' });
    }

    const [category] = await query('SELECT * FROM package_categories WHERE id = ?', [category_id]);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Selected category does not exist.' });
    }

    const result = await query(
      `INSERT INTO privilege_packages 
       (category_id, name, image_url, validity_days, price, currency, description, color, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        name.trim(),
        image_url || '',
        parseInt(validity_days, 10) || 30,
        parseInt(price, 10) || 0,
        currency || 'coins',
        description || '',
        color && color.trim() ? color.trim() : '#8b5cf6',
        is_active ? 1 : 0,
      ]
    );

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('packages:*');

    return res.json({
      success: true,
      message: `Package "${name}" created successfully.`,
      packageId: result.insertId,
    });
  } catch (err) {
    console.error('createPackage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create package.', error: err.message });
  }
}

export async function updatePackage(req, res) {
  try {
    const { id } = req.params;
    const {
      category_id,
      name,
      image_url,
      validity_days,
      price,
      currency,
      description,
      color,
      is_active,
    } = req.body;

    const [existing] = await query('SELECT * FROM privilege_packages WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Package not found.' });
    }

    const updates = [];
    const params = [];

    if (category_id !== undefined) {
      updates.push('category_id = ?');
      params.push(parseInt(category_id, 10));
    }
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      params.push(image_url);
    }
    if (validity_days !== undefined) {
      updates.push('validity_days = ?');
      params.push(parseInt(validity_days, 10));
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(parseInt(price, 10));
    }
    if (currency !== undefined) {
      updates.push('currency = ?');
      params.push(currency);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color && color.trim() ? color.trim() : '#8b5cf6');
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(id);
      await query(`UPDATE privilege_packages SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('packages:*');

    return res.json({
      success: true,
      message: 'Package updated successfully.',
    });
  } catch (err) {
    console.error('updatePackage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update package.', error: err.message });
  }
}

export async function deletePackage(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM privilege_packages WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Package not found.' });
    }

    // 1. Find all users who currently have subscriptions for this package
    const affectedUsers = await query(
      'SELECT DISTINCT user_id FROM user_package_subscriptions WHERE package_id = ?',
      [id]
    );

    // 2. Delete all user subscriptions for this package
    await query('DELETE FROM user_package_subscriptions WHERE package_id = ?', [id]);

    // 3. Delete the package itself
    await query('DELETE FROM privilege_packages WHERE id = ?', [id]);

    // 4. Recalculate VIP status for affected users
    for (const u of affectedUsers) {
      if (u.user_id) {
        const [nextActive] = await query(`
          SELECT pc.name FROM user_package_subscriptions ups
          JOIN package_categories pc ON ups.category_id = pc.id
          WHERE ups.user_id = ? AND ups.status = 'active' AND ups.expires_at > NOW() AND pc.is_active = 1
          ORDER BY pc.display_order ASC LIMIT 1
        `, [u.user_id]);

        const updatedVip = nextActive ? nextActive.name : 'Standard';
        await query('UPDATE users SET vip_package = ? WHERE id = ?', [updatedVip, u.user_id]);
      }
    }

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('packages:*');
    await cache.delByPattern('user:*');
    await cache.delByPattern('admin:users*');

    return res.json({
      success: true,
      message: `Package "${existing.name}" and all associated user subscriptions removed successfully.`,
    });
  } catch (err) {
    console.error('deletePackage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete package.', error: err.message });
  }
}

// ==========================================
// SUBSCRIBERS & GRANTING CONTROLLERS
// ==========================================

export async function getPackageSubscribers(req, res) {
  try {
    const { categoryId, status = 'all', search, page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions = [];
    const params = [];

    if (categoryId && categoryId !== 'all') {
      conditions.push('ups.category_id = ?');
      params.push(parseInt(categoryId, 10));
    }

    if (status === 'active') {
      conditions.push("ups.status = 'active' AND ups.expires_at > NOW()");
    } else if (status === 'expired') {
      conditions.push("(ups.status = 'expired' OR ups.expires_at <= NOW())");
    }

    if (search && search.trim()) {
      const clean = search.trim().replace(/^#/, '');
      if (!isNaN(clean) && clean !== '') {
        conditions.push('(u.id = ? OR ups.id = ?)');
        const n = parseInt(clean, 10);
        params.push(n, n);
      } else {
        conditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR pp.name LIKE ? OR pc.name LIKE ?)');
        const s = `%${clean}%`;
        params.push(s, s, s, s);
      }
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const subscribers = await query(`
      SELECT 
        ups.id as subscription_id,
        ups.user_id,
        ups.package_id,
        ups.category_id,
        ups.start_date,
        ups.expires_at,
        ups.status,
        DATEDIFF(ups.expires_at, NOW()) as days_left,
        (ups.expires_at > NOW() AND ups.status = 'active') as is_currently_active,
        u.full_name as user_name,
        u.email as user_email,
        u.avatar_url as user_avatar,
        u.coins as user_coins,
        pp.name as package_name,
        pp.price as package_price,
        pp.image_url as package_image,
        pc.name as category_name,
        pc.badge_icon as category_icon,
        pc.color_code as category_color,
        pc.display_order as category_order,
        pc.cant_be_removed,
        pc.cant_be_banned,
        pc.self_seat_accept,
        pc.top_live_list,
        pc.anti_mute,
        pc.special_entry
      FROM user_package_subscriptions ups
      JOIN users u ON ups.user_id = u.id
      JOIN privilege_packages pp ON ups.package_id = pp.id
      JOIN package_categories pc ON ups.category_id = pc.id
      ${whereSql}
      ORDER BY is_currently_active DESC, ups.expires_at DESC
      LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}
    `, params);

    const [totalRows] = await query(`
      SELECT COUNT(*) as count 
      FROM user_package_subscriptions ups
      JOIN users u ON ups.user_id = u.id
      JOIN privilege_packages pp ON ups.package_id = pp.id
      JOIN package_categories pc ON ups.category_id = pc.id
      ${whereSql}
    `, params);

    // Summary stats
    const [stats] = await query(`
      SELECT 
        COUNT(DISTINCT user_id) as total_unique_subscribers,
        COUNT(CASE WHEN status = 'active' AND expires_at > NOW() THEN 1 END) as active_subscribers_count
      FROM user_package_subscriptions
    `);

    return res.json({
      success: true,
      subscribers: subscribers || [],
      summary: stats || { total_unique_subscribers: 0, active_subscribers_count: 0 },
      pagination: {
        total: totalRows.count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    console.error('getPackageSubscribers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch subscribers.', error: err.message });
  }
}

export async function grantPackageToUser(req, res) {
  try {
    const { userId, packageId, customValidityDays } = req.body;

    if (!userId || !packageId) {
      return res.status(400).json({ success: false, message: 'User ID and Package are required.' });
    }

    const cleanUserId = parseInt(String(userId).replace(/^#/, ''), 10);
    const [user] = await query('SELECT * FROM users WHERE id = ?', [cleanUserId]);
    if (!user) {
      return res.status(404).json({ success: false, message: `User #${cleanUserId} not found.` });
    }

    const [pkg] = await query(`
      SELECT pp.*, pc.name as category_name 
      FROM privilege_packages pp 
      JOIN package_categories pc ON pp.category_id = pc.id 
      WHERE pp.id = ?
    `, [packageId]);

    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Selected package not found.' });
    }

    const parsedCustom = parseInt(customValidityDays, 10);
    const durationDays = (!isNaN(parsedCustom) && parsedCustom > 0)
      ? parsedCustom
      : (parseInt(pkg.validity_days, 10) || 30);

    // Check if user already has an active subscription for this category; extend if so
    const [existingSub] = await query(`
      SELECT * FROM user_package_subscriptions 
      WHERE user_id = ? AND category_id = ? AND status = 'active' AND expires_at > NOW()
      ORDER BY expires_at DESC LIMIT 1
    `, [cleanUserId, pkg.category_id]);

    if (existingSub) {
      // Extend expiration
      await query(`
        UPDATE user_package_subscriptions 
        SET expires_at = DATE_ADD(expires_at, INTERVAL ? DAY), package_id = ?, updated_at = NOW()
        WHERE id = ?
      `, [durationDays, pkg.id, existingSub.id]);
    } else {
      // Create fresh subscription
      await query(`
        INSERT INTO user_package_subscriptions 
        (user_id, package_id, category_id, start_date, expires_at, status)
        VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active')
      `, [cleanUserId, pkg.id, pkg.category_id, durationDays]);
    }

    // Update user's vip_package string
    await query('UPDATE users SET vip_package = ? WHERE id = ?', [pkg.category_name, cleanUserId]);

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('packages:*');
    await cache.del(`user:privileges:${cleanUserId}`);
    await cache.del(`user:${cleanUserId}`);
    await cache.del(`user:packages:active_map:${cleanUserId}`);
    await cache.delByPattern('admin:users*');

    return res.json({
      success: true,
      message: `Successfully granted package "${pkg.name}" (${durationDays} days) to User #${cleanUserId} (${user.full_name || 'User'}).`,
    });
  } catch (err) {
    console.error('grantPackageToUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to grant package.', error: err.message });
  }
}

export async function revokeSubscription(req, res) {
  try {
    const { id } = req.params;
    const [sub] = await query('SELECT * FROM user_package_subscriptions WHERE id = ?', [id]);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription record not found.' });
    }

    await query("UPDATE user_package_subscriptions SET status = 'cancelled' WHERE id = ?", [id]);

    // Check if user has any other active subscriptions
    const [otherActive] = await query(`
      SELECT pc.name FROM user_package_subscriptions ups
      JOIN package_categories pc ON ups.category_id = pc.id
      WHERE ups.user_id = ? AND ups.status = 'active' AND ups.expires_at > NOW()
      ORDER BY pc.display_order ASC LIMIT 1
    `, [sub.user_id]);

    const newVip = otherActive ? otherActive.name : 'Standard';
    await query('UPDATE users SET vip_package = ? WHERE id = ?', [newVip, sub.user_id]);

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('packages:*');
    await cache.del(`user:privileges:${sub.user_id}`);
    await cache.del(`user:${sub.user_id}`);
    await cache.del(`user:packages:active_map:${sub.user_id}`);
    await cache.delByPattern('admin:users*');

    return res.json({
      success: true,
      message: 'Subscription has been revoked.',
    });
  } catch (err) {
    console.error('revokeSubscription error:', err);
    return res.status(500).json({ success: false, message: 'Failed to revoke subscription.', error: err.message });
  }
}

// ==========================================
// CLIENT / PUBLIC USER CONTROLLERS
// ==========================================

export async function purchasePackage(req, res) {
  try {
    const userId = req.user.id;
    const { packageId } = req.body;

    if (!packageId) {
      return res.status(400).json({ success: false, message: 'Package ID is required.' });
    }

    const [pkg] = await query(`
      SELECT pp.*, pc.name as category_name 
      FROM privilege_packages pp 
      JOIN package_categories pc ON pp.category_id = pc.id 
      WHERE pp.id = ? AND pp.is_active = 1
    `, [packageId]);

    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package is not available.' });
    }

    const [user] = await query('SELECT coins, full_name FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.coins < pkg.price) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coin balance. You need ${pkg.price} coins, but only have ${user.coins} coins.`,
      });
    }

    // Deduct coins
    await query('UPDATE users SET coins = coins - ? WHERE id = ?', [pkg.price, userId]);

    // Log wallet transaction
    await query(`
      INSERT INTO transactions (user_id, type, amount, description, status)
      VALUES (?, 'coin_purchase', ?, ?, 'completed')
    `, [userId, pkg.price, `Purchased Privilege Package: ${pkg.name} (${pkg.category_name})`]);

    // Check existing subscription to extend or insert
    const [existing] = await query(`
      SELECT id, expires_at FROM user_package_subscriptions 
      WHERE user_id = ? AND category_id = ? AND status = 'active' AND expires_at > NOW()
      ORDER BY expires_at DESC LIMIT 1
    `, [userId, pkg.category_id]);

    if (existing) {
      await query(`
        UPDATE user_package_subscriptions 
        SET expires_at = DATE_ADD(expires_at, INTERVAL ? DAY), package_id = ?, is_equipped = 1, updated_at = NOW()
        WHERE id = ?
      `, [pkg.validity_days, pkg.id, existing.id]);
    } else {
      await query('UPDATE user_package_subscriptions SET is_equipped = 0 WHERE user_id = ?', [userId]);
      await query(`
        INSERT INTO user_package_subscriptions 
        (user_id, package_id, category_id, start_date, expires_at, status, is_equipped)
        VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active', 1)
      `, [userId, pkg.id, pkg.category_id, pkg.validity_days]);
    }

    await query('UPDATE users SET vip_package = ? WHERE id = ?', [pkg.category_name, userId]);

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('packages:*');
    await cache.del(`user:privileges:${userId}`);
    await cache.del(`user:${userId}`);
    await cache.del(`user:balance:${userId}`);
    await cache.del(`user:packages:active_map:${userId}`);
    await cache.del(`mobile:user:profile:${userId}`);
    await cache.delByPattern('admin:users*');

    return res.json({
      success: true,
      message: `Congratulations! You unlocked ${pkg.name} (${pkg.category_name}) privileges!`,
      vip_package: pkg.category_name,
      remaining_coins: user.coins - pkg.price,
    });
  } catch (err) {
    console.error('purchasePackage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to purchase package.', error: err.message });
  }
}

export async function getUserPrivileges(req, res) {
  try {
    const userId = req.params.userId || req.user?.id;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const cacheKey = `user:privileges:${userId}`;
    const result = await cache.getOrSet(cacheKey, 60, async () => {
      const [activeSub] = await query(`
        SELECT 
          ups.*,
          pp.name as package_name,
          pp.image_url as package_image_url,
          GREATEST(0, CEIL(TIMESTAMPDIFF(SECOND, NOW(), ups.expires_at) / 86400)) as days_remaining,
          pc.name as category_name,
          pc.badge_icon,
          pc.color_code,
          pc.display_order,
          pc.cant_be_removed,
          pc.cant_be_banned,
          pc.self_seat_accept,
          pc.top_live_list,
          pc.anti_mute,
          pc.special_entry,
          pc.custom_privileges
        FROM user_package_subscriptions ups
        JOIN package_categories pc ON ups.category_id = pc.id
        LEFT JOIN privilege_packages pp ON ups.package_id = pp.id
        WHERE ups.user_id = ? AND ups.status = 'active' AND ups.expires_at > NOW()
        ORDER BY ups.is_equipped DESC, pc.display_order ASC
        LIMIT 1
      `, [userId]);

      if (!activeSub) {
        return {
          success: true,
          has_active_vip: false,
          expires_at: null,
          days_remaining: null,
          subscription: null,
          privileges: {
            cant_be_removed: false,
            cant_be_banned: false,
            self_seat_accept: false,
            top_live_list: false,
            anti_mute: false,
            special_entry: false,
          },
          privilege_list: [],
          custom_privileges: [],
        };
      }

      const priv = formatCategoryPrivileges(activeSub);

      return {
        success: true,
        has_active_vip: true,
        expires_at: activeSub.expires_at,
        days_remaining: Number(activeSub.days_remaining) || 0,
        subscription: {
          subscription_id: activeSub.id,
          package_id: activeSub.package_id,
          package_name: activeSub.package_name || '',
          package_image: activeSub.package_image_url || '',
          package_image_url: activeSub.package_image_url || '',
          category_id: activeSub.category_id,
          category_name: activeSub.category_name,
          badge_icon: activeSub.badge_icon,
          color_code: activeSub.color_code,
          display_order: activeSub.display_order,
          start_date: activeSub.start_date,
          expires_at: activeSub.expires_at,
          days_remaining: Number(activeSub.days_remaining) || 0,
          is_equipped: Boolean(activeSub.is_equipped),
        },
        privileges: priv.privileges,
        privilege_list: priv.privilege_list,
        custom_privileges: priv.custom_privileges,
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('getUserPrivileges error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get privileges.', error: err.message });
  }
}

export async function checkRoomActionPrivilege(req, res) {
  try {
    const { targetUserId, action } = req.query; // action: 'kick' | 'ban' | 'mute'
    if (!targetUserId || !action) {
      return res.status(400).json({ success: false, message: 'targetUserId and action are required.' });
    }

    const [activeSub] = await query(`
      SELECT pc.* FROM user_package_subscriptions ups
      JOIN package_categories pc ON ups.category_id = pc.id
      WHERE ups.user_id = ? AND ups.status = 'active' AND ups.expires_at > NOW()
      ORDER BY pc.display_order ASC
      LIMIT 1
    `, [targetUserId]);

    if (!activeSub) {
      return res.json({ allowed: true });
    }

    if (action === 'kick' && activeSub.cant_be_removed) {
      return res.json({
        allowed: false,
        reason: `User is a protected ${activeSub.name} member and cannot be kicked from rooms.`,
      });
    }

    if (action === 'ban' && activeSub.cant_be_banned) {
      return res.json({
        allowed: false,
        reason: `User is a protected ${activeSub.name} member and cannot be banned from rooms.`,
      });
    }

    if (action === 'mute' && activeSub.anti_mute) {
      return res.json({
        allowed: false,
        reason: `User is a protected ${activeSub.name} member and cannot be muted.`,
      });
    }

    return res.json({ allowed: true });
  } catch (err) {
    console.error('checkRoomActionPrivilege error:', err);
    return res.status(500).json({ success: false, message: 'Failed to check action privilege.', error: err.message });
  }
}

/**
 * Mobile My Owned Packages & Subscriptions
 * GET /api/mobile/packages/my-packages
 * Authenticated endpoint returning all VIP package subscriptions owned by the user.
 */
export async function getMyPackages(req, res) {
  try {
    const userId = req.user.id;
    const cacheKey = `user:packages:${userId}`;

    const items = await cache.getOrSet(cacheKey, 60, async () => {
      const rows = await query(`
        SELECT 
          ups.id as subscription_id,
          ups.package_id,
          ups.category_id,
          ups.start_date,
          ups.expires_at,
          ups.status,
          ups.is_equipped,
          CASE 
            WHEN ups.is_equipped = 1 AND ups.status = 'active' AND ups.expires_at > NOW() THEN 1 
            ELSE 0 
          END as is_active,
          CASE WHEN ups.expires_at <= NOW() OR ups.status != 'active' THEN 1 ELSE 0 END as is_expired,
          GREATEST(0, TIMESTAMPDIFF(DAY, NOW(), ups.expires_at)) as days_remaining,
          pp.name as package_name,
          pp.price as package_price,
          pp.image_url as package_image,
          pp.validity_days,
          pp.color as package_color,
          pc.name as category_name,
          pc.badge_icon,
          pc.color_code,
          pc.display_order,
          pc.cant_be_removed,
          pc.cant_be_banned,
          pc.self_seat_accept,
          pc.top_live_list,
          pc.anti_mute,
          pc.special_entry
        FROM user_package_subscriptions ups
        JOIN privilege_packages pp ON ups.package_id = pp.id
        JOIN package_categories pc ON ups.category_id = pc.id
        WHERE ups.user_id = ?
        ORDER BY is_active DESC, ups.is_equipped DESC, ups.expires_at DESC
      `, [userId]);

      return (rows || []).map((row) => ({
        subscription_id: row.subscription_id,
        package_id: row.package_id,
        category_id: row.category_id,
        name: row.package_name,
        price: row.package_price,
        image_url: row.package_image,
        validity_days: row.validity_days,
        color: row.package_color || '#8b5cf6',
        package_color: row.package_color || '#8b5cf6',
        category_name: row.category_name,
        badge_icon: row.badge_icon,
        color_code: row.color_code,
        display_order: row.display_order,
        start_date: row.start_date,
        expires_at: row.expires_at,
        days_remaining: row.days_remaining,
        is_expired: Boolean(row.is_expired),
        is_active: Boolean(row.is_active),
        is_equipped: Boolean(row.is_equipped),
        privileges: {
          cant_be_removed: Boolean(row.cant_be_removed),
          cant_be_banned: Boolean(row.cant_be_banned),
          self_seat_accept: Boolean(row.self_seat_accept),
          top_live_list: Boolean(row.top_live_list),
          anti_mute: Boolean(row.anti_mute),
          special_entry: Boolean(row.special_entry),
        },
      }));
    });

    return res.json({
      success: true,
      packages: items || [],
    });
  } catch (err) {
    console.error('getMyPackages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your packages.', error: err.message });
  }
}

/**
 * Mobile Toggle Active Package (Equip / Unequip)
 * POST /api/mobile/packages/:id/toggle
 * 
 * - If inactive: Deactivates previous active package, equips this one, and sets user's vip_package.
 * - If already active: Deactivates this package (unequips) and resets user's vip_package to 'Standard'.
 * - Matches by user_package_subscriptions.id (subscription_id) OR privilege_packages.id (package_id).
 */
export async function togglePackageActive(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Package ID or Subscription ID is required.' });
    }

    const cleanId = parseInt(String(id).replace(/^#/, ''), 10);
    if (isNaN(cleanId)) {
      return res.status(400).json({ success: false, message: 'Invalid package identifier.' });
    }

    // 1. Check ownership in database
    const [existing] = await query(`
      SELECT 
        ups.*,
        pp.name as package_name,
        pc.name as category_name,
        pc.badge_icon,
        pc.color_code
      FROM user_package_subscriptions ups
      JOIN privilege_packages pp ON ups.package_id = pp.id
      JOIN package_categories pc ON ups.category_id = pc.id
      WHERE ups.user_id = ? AND (ups.id = ? OR ups.package_id = ?)
      ORDER BY ups.expires_at DESC
      LIMIT 1
    `, [userId, cleanId, cleanId]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'You do not own this package subscription. Please purchase it first.',
      });
    }

    // Check expiration
    const isExpired = new Date(existing.expires_at) <= new Date() || existing.status !== 'active';
    if (isExpired) {
      return res.status(400).json({
        success: false,
        message: `Your subscription for "${existing.package_name}" has expired on ${new Date(existing.expires_at).toLocaleDateString()}. Please renew it.`,
      });
    }

    const wasEquipped = Boolean(existing.is_equipped);

    // 2. DB Mutation
    if (wasEquipped) {
      // Toggle OFF (Deactivate)
      await query('UPDATE user_package_subscriptions SET is_equipped = 0 WHERE id = ?', [existing.id]);
      await query("UPDATE users SET vip_package = 'Standard' WHERE id = ?", [userId]);

      // Instant Redis Invalidation
      await cache.del(`user:packages:${userId}`);
      await cache.del(`user:packages:active_map:${userId}`);
      await cache.del(`user:privileges:${userId}`);
      await cache.del(`user:${userId}`);
      await cache.del(`mobile:user:profile:${userId}`);
      await cache.delByPattern('mobile:rooms:*');

      return res.json({
        success: true,
        message: `Package "${existing.package_name}" deactivated successfully.`,
        is_active: false,
        is_equipped: false,
        subscription_id: existing.id,
        package_id: existing.package_id,
        name: existing.package_name,
        vip_package: 'Standard',
      });
    } else {
      // Toggle ON (Activate): Unequip all others, then equip this one
      await query('UPDATE user_package_subscriptions SET is_equipped = 0 WHERE user_id = ?', [userId]);
      await query('UPDATE user_package_subscriptions SET is_equipped = 1 WHERE id = ?', [existing.id]);
      await query('UPDATE users SET vip_package = ? WHERE id = ?', [existing.category_name, userId]);

      // Instant Redis Invalidation
      await cache.del(`user:packages:${userId}`);
      await cache.del(`user:packages:active_map:${userId}`);
      await cache.del(`user:privileges:${userId}`);
      await cache.del(`user:${userId}`);
      await cache.del(`mobile:user:profile:${userId}`);
      await cache.delByPattern('mobile:rooms:*');

      return res.json({
        success: true,
        message: `Package "${existing.package_name}" (${existing.category_name}) activated successfully!`,
        is_active: true,
        is_equipped: true,
        subscription_id: existing.id,
        package_id: existing.package_id,
        name: existing.package_name,
        category_name: existing.category_name,
        badge_icon: existing.badge_icon,
        vip_package: existing.category_name,
      });
    }
  } catch (err) {
    console.error('togglePackageActive error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update package active state.', error: err.message });
  }
}

// ==========================================
// GET PACKAGES BY CATEGORY
// ==========================================

/**
 * Get all packages that belong to a specific category.
 * GET /api/mobile/packages/categories/:categoryId/packages
 * Public endpoint — no auth required.
 *
 * Query params:
 *   activeOnly=true  → only return is_active = 1 packages (default: true for mobile)
 */
export async function getPackagesByCategory(req, res) {
  try {
    const { categoryId } = req.params;
    const activeOnly = req.query.activeOnly !== 'false'; // default true
    const userId = req.user?.id || (req.query.user_id ? parseInt(req.query.user_id, 10) : null) || (req.query.userId ? parseInt(req.query.userId, 10) : null);

    if (!categoryId || isNaN(parseInt(categoryId, 10))) {
      return res.status(400).json({ success: false, message: 'Valid category ID is required.' });
    }

    const parsedCategoryId = parseInt(categoryId, 10);
    const cacheKey = `packages:by_category:${parsedCategoryId}:${activeOnly ? 'active' : 'all'}`;

    const data = await cache.getOrSet(cacheKey, 120, async () => {
      // Fetch the category itself
      const [category] = await query(`
        SELECT 
          id, name, badge_icon, color_code, display_order,
          cant_be_removed, cant_be_banned, self_seat_accept,
          top_live_list, anti_mute, special_entry, custom_privileges, is_active
        FROM package_categories
        WHERE id = ?
      `, [parsedCategoryId]);

      if (!category) return null;

      // Fetch packages in this category
      const activeFilter = activeOnly ? 'AND pp.is_active = 1' : '';
      const packages = await query(`
        SELECT
          pp.id,
          pp.category_id,
          pp.name,
          pp.image_url,
          pp.validity_days,
          pp.price,
          pp.currency,
          pp.description,
          pp.color,
          pp.is_active,
          pp.created_at,
          (SELECT COUNT(*) FROM user_package_subscriptions ups
           WHERE ups.package_id = pp.id AND ups.status = 'active' AND ups.expires_at > NOW()) as active_users_count
        FROM privilege_packages pp
        WHERE pp.category_id = ? ${activeFilter}
        ORDER BY pp.price ASC
      `, [parsedCategoryId]);

      const priv = formatCategoryPrivileges(category);

      return {
        category: {
          id: category.id,
          name: category.name,
          badge_icon: category.badge_icon,
          color_code: category.color_code,
          display_order: category.display_order,
          is_active: Boolean(category.is_active),
          privileges: priv.privileges,
          privilege_list: priv.privilege_list,
          custom_privileges: priv.custom_privileges,
        },
        packages: packages || [],
        total_packages: (packages || []).length,
      };
    });

    if (!data) {
      return res.status(404).json({ success: false, message: 'Package category not found.' });
    }

    const subsMap = userId ? await getUserActiveSubscriptionsMap(userId) : { byPackageId: {}, byCategoryId: {} };
    const enrichedCategory = enrichCategoryWithUserSubscription(data.category, subsMap);
    const enrichedPackages = (data.packages || []).map((p) => enrichPackageWithUserSubscription(p, subsMap));
    const activeSub = enrichedCategory.my_subscription || Object.values(subsMap.byPackageId || {})[0] || null;

    return res.json({
      success: true,
      category: enrichedCategory,
      packages: enrichedPackages,
      total_packages: enrichedPackages.length,
      user_subscription: activeSub,
      my_subscription: activeSub,
      active_subscription: activeSub,
      expires_at: activeSub ? activeSub.expires_at : null,
      days_remaining: activeSub ? activeSub.days_remaining : null,
    });
  } catch (err) {
    console.error('getPackagesByCategory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch packages for category.', error: err.message });
  }
}
