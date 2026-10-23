import { query } from '../config/db.js';
import cache from '../config/redis.js';
import path from 'path';
import fs from 'fs';

/**
 * Admin: Get all Theme Items with optional type, search and status filters
 * Cached in Redis by query params.
 */
export async function getAdminThemeItems(req, res) {
  try {
    const { type, q, status } = req.query;
    const cacheKey = `themes:admin:${type || 'all'}:${status || 'all'}:${q ? encodeURIComponent(q.trim()) : 'none'}`;

    const items = await cache.getOrSet(cacheKey, 120, async () => {
      let whereClause = '1=1';
      const params = [];

      if (type && type !== 'all') {
        whereClause += ' AND type = ?';
        params.push(type);
      }

      if (status === 'active') {
        whereClause += ' AND is_active = 1';
      } else if (status === 'inactive') {
        whereClause += ' AND is_active = 0';
      }

      if (q && q.trim()) {
        whereClause += ' AND (name LIKE ? OR value LIKE ?)';
        const searchPattern = `%${q.trim()}%`;
        params.push(searchPattern, searchPattern);
      }

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
          is_active,
          sort_order,
          created_at,
          updated_at
        FROM app_theme_items
        WHERE ${whereClause}
        ORDER BY is_default DESC, sort_order ASC, id DESC
      `, params);

      return rows || [];
    });

    return res.json({
      success: true,
      items: items || [],
    });
  } catch (err) {
    console.error('getAdminThemeItems error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch theme items.', error: err.message });
  }
}

/**
 * Admin: Get Overview Statistics for Theme items & Active Defaults
 */
export async function getThemeStats(req, res) {
  try {
    const stats = await cache.getOrSet('themes:admin:stats', 60, async () => {
      const [counts] = await query(`
        SELECT 
          COUNT(*) as total_items,
          SUM(CASE WHEN type = 'page_image' THEN 1 ELSE 0 END) as total_page_images,
          SUM(CASE WHEN type = 'bottom_sheet_image' THEN 1 ELSE 0 END) as total_bottom_sheets,
          SUM(CASE WHEN type = 'color' THEN 1 ELSE 0 END) as total_colors,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_items
        FROM app_theme_items
      `);

      const defaults = await query(`
        SELECT id, type, name, value, secondary_value, price 
        FROM app_theme_items 
        WHERE is_default = 1
      `);

      return {
        summary: counts || {},
        activeDefaults: defaults || [],
      };
    });

    return res.json({
      success: true,
      ...stats,
    });
  } catch (err) {
    console.error('getThemeStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch theme statistics.', error: err.message });
  }
}

/**
 * Admin: Create a new theme item
 * Accepts multipart/form-data (for images) or JSON
 */
export async function createThemeItem(req, res) {
  try {
    const { type, name, secondary_value, preview_url, sort_order } = req.body;
    let value = req.body.value;

    if (!type || !['page_image', 'bottom_sheet_image', 'color'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Valid type is required: page_image, bottom_sheet_image, or color.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }

    // Handle uploaded file if present
    if (req.file) {
      value = `/uploads/themes/${req.file.filename}`;
    }

    if (!value || !String(value).trim()) {
      return res.status(400).json({ success: false, message: type === 'color' ? 'Color code is required.' : 'Image file or URL is required.' });
    }

    const price = Math.max(0, parseInt(req.body.price, 10) || 0);
    const validityDays = Math.max(0, parseInt(req.body.validity_days, 10) || 0);
    const isDefault = req.body.is_default === '1' || req.body.is_default === 1 || req.body.is_default === true ? 1 : 0;
    const isActive = req.body.is_active === '0' || req.body.is_active === 0 || req.body.is_active === false ? 0 : 1;
    const sort = parseInt(sort_order, 10) || 0;

    // If marked as default, atomically reset others of this type
    if (isDefault === 1) {
      await query('UPDATE app_theme_items SET is_default = 0 WHERE type = ?', [type]);
    }

    const result = await query(`
      INSERT INTO app_theme_items (
        type, name, value, secondary_value, preview_url, 
        price, validity_days, is_default, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [type, name.trim(), String(value).trim(), secondary_value || null, preview_url || null, price, validityDays, isDefault, isActive, sort]);

    // Instant Redis Invalidation
    await cache.delByPattern('themes:*');

    return res.status(201).json({
      success: true,
      message: 'Theme item created successfully.',
      itemId: result.insertId,
    });
  } catch (err) {
    console.error('createThemeItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create theme item.', error: err.message });
  }
}

/**
 * Admin: Update an existing theme item
 */
export async function updateThemeItem(req, res) {
  try {
    const { id } = req.params;
    const itemId = parseInt(id, 10);
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'Valid theme item ID is required.' });
    }

    const [existing] = await query('SELECT * FROM app_theme_items WHERE id = ?', [itemId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Theme item not found.' });
    }

    let value = req.body.value !== undefined ? req.body.value : existing.value;
    if (req.file) {
      value = `/uploads/themes/${req.file.filename}`;
    }

    const type = req.body.type || existing.type;
    const name = req.body.name !== undefined ? req.body.name.trim() : existing.name;
    const secondaryValue = req.body.secondary_value !== undefined ? req.body.secondary_value : existing.secondary_value;
    const previewUrl = req.body.preview_url !== undefined ? req.body.preview_url : existing.preview_url;
    const price = req.body.price !== undefined ? Math.max(0, parseInt(req.body.price, 10) || 0) : existing.price;
    const validityDays = req.body.validity_days !== undefined ? Math.max(0, parseInt(req.body.validity_days, 10) || 0) : existing.validity_days;
    const isActive = req.body.is_active !== undefined ? (req.body.is_active === '1' || req.body.is_active === 1 || req.body.is_active === true ? 1 : 0) : existing.is_active;
    const sortOrder = req.body.sort_order !== undefined ? parseInt(req.body.sort_order, 10) || 0 : existing.sort_order;

    let isDefault = existing.is_default;
    if (req.body.is_default !== undefined) {
      isDefault = req.body.is_default === '1' || req.body.is_default === 1 || req.body.is_default === true ? 1 : 0;
      if (isDefault === 1) {
        await query('UPDATE app_theme_items SET is_default = 0 WHERE type = ?', [type]);
      }
    }

    await query(`
      UPDATE app_theme_items SET 
        type = ?,
        name = ?,
        value = ?,
        secondary_value = ?,
        preview_url = ?,
        price = ?,
        validity_days = ?,
        is_default = ?,
        is_active = ?,
        sort_order = ?
      WHERE id = ?
    `, [type, name, value, secondaryValue, previewUrl, price, validityDays, isDefault, isActive, sortOrder, itemId]);

    // Instant Redis Invalidation
    await cache.delByPattern('themes:*');

    return res.json({
      success: true,
      message: 'Theme item updated successfully.',
    });
  } catch (err) {
    console.error('updateThemeItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update theme item.', error: err.message });
  }
}

/**
 * Admin: Set an item as the active default for its type
 */
export async function setDefaultThemeItem(req, res) {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'Invalid theme item ID.' });
    }

    const [item] = await query('SELECT * FROM app_theme_items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Theme item not found.' });
    }

    // Reset others of this type and set this one as default and active
    await query('UPDATE app_theme_items SET is_default = 0 WHERE type = ?', [item.type]);
    await query('UPDATE app_theme_items SET is_default = 1, is_active = 1 WHERE id = ?', [itemId]);

    // Instant Redis Invalidation
    await cache.delByPattern('themes:*');

    return res.json({
      success: true,
      message: `"${item.name}" is now the active default ${item.type.replace('_', ' ')}.`,
      item: { ...item, is_default: 1, is_active: 1 },
    });
  } catch (err) {
    console.error('setDefaultThemeItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to set default theme item.', error: err.message });
  }
}

/**
 * Admin: Delete a theme item
 */
export async function deleteThemeItem(req, res) {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'Invalid theme item ID.' });
    }

    const [item] = await query('SELECT * FROM app_theme_items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Theme item not found.' });
    }

    await query('DELETE FROM app_theme_items WHERE id = ?', [itemId]);

    // Remove local file if stored locally
    if (item.value && item.value.startsWith('/uploads/themes/')) {
      const localFilePath = path.join(process.cwd(), item.value);
      if (fs.existsSync(localFilePath)) {
        fs.unlink(localFilePath, () => {});
      }
    }

    // Instant Redis Invalidation
    await cache.delByPattern('themes:*');

    return res.json({
      success: true,
      message: 'Theme item deleted successfully.',
    });
  } catch (err) {
    console.error('deleteThemeItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete theme item.', error: err.message });
  }
}
