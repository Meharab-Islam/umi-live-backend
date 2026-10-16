import { query } from '../config/db.js';
import cache from '../config/redis.js';

/**
 * Public endpoint: Returns active banners for mobile app home carousel
 * Ordered by display_order ASC, id DESC
 * Cached in Redis with auto-invalidation on updates.
 */
export async function getPublicBanners(req, res) {
  try {
    const banners = await cache.getOrSet('banners:public', 600, async () => {
      const rows = await query(`
        SELECT 
          id,
          image_url,
          link_url,
          display_order,
          start_date,
          end_date,
          created_at
        FROM banners
        WHERE is_active = 1
          AND (start_date IS NULL OR start_date <= NOW())
          AND (end_date IS NULL OR end_date >= NOW())
        ORDER BY display_order ASC, id DESC
      `);
      return rows || [];
    });

    return res.json({
      success: true,
      banners: banners || [],
    });
  } catch (err) {
    console.error('getPublicBanners error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch public banners.', error: err.message });
  }
}

/**
 * Admin endpoint: Returns all banners with filtering and search
 * Cached in Redis by query parameter key.
 */
export async function getAdminBanners(req, res) {
  try {
    const { q, status } = req.query;
    let whereClause = '1=1';
    const params = [];

    if (q && q.trim()) {
      whereClause += ' AND (title LIKE ? OR link_url LIKE ? OR target_value LIKE ?)';
      const searchPattern = `%${q.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (status === 'active') {
      whereClause += ' AND is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = 0';
    }

    const cacheKey = `banners:admin:${q ? q.trim() : 'all'}:${status || 'all'}`;
    const result = await cache.getOrSet(cacheKey, 300, async () => {
      const rows = await query(
        `SELECT * FROM banners WHERE ${whereClause} ORDER BY display_order ASC, id DESC`,
        params
      );
      return { banners: rows || [], total: (rows || []).length };
    });

    return res.json({
      success: true,
      banners: result.banners,
      total: result.total,
    });
  } catch (err) {
    console.error('getAdminBanners error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch banners.', error: err.message });
  }
}

/**
 * Admin endpoint: Create a new banner
 * 1. Inserts into database first
 * 2. Invalidates Redis banner cache
 */
export async function createBanner(req, res) {
  try {
    const {
      title = '',
      image_url,
      link_url = '',
      target_type = 'none',
      target_value = '',
      display_order = 0,
      is_active = 1,
      start_date = null,
      end_date = null,
    } = req.body;

    if (!image_url || !image_url.trim()) {
      return res.status(400).json({ success: false, message: 'Banner image is required.' });
    }

    const result = await query(
      `INSERT INTO banners (title, image_url, link_url, target_type, target_value, display_order, is_active, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title ? title.trim() : '',
        image_url.trim(),
        link_url ? link_url.trim() : null,
        target_type || 'none',
        target_value ? target_value.trim() : null,
        parseInt(display_order, 10) || 0,
        is_active ? 1 : 0,
        start_date || null,
        end_date || null,
      ]
    );

    const [created] = await query('SELECT * FROM banners WHERE id = ?', [result.insertId]);

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('banners:*');

    return res.status(201).json({
      success: true,
      message: 'Banner created successfully.',
      banner: created,
    });
  } catch (err) {
    console.error('createBanner error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create banner.', error: err.message });
  }
}

/**
 * Admin endpoint: Update existing banner
 * 1. Updates database first
 * 2. Invalidates Redis banner cache
 */
export async function updateBanner(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      image_url,
      link_url,
      target_type,
      target_value,
      display_order,
      is_active,
      start_date,
      end_date,
    } = req.body;

    const [existing] = await query('SELECT * FROM banners WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Banner not found.' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ success: false, message: 'Banner title cannot be empty.' });
      }
      updates.push('title = ?');
      params.push(title.trim());
    }

    if (image_url !== undefined) {
      if (!image_url.trim()) {
        return res.status(400).json({ success: false, message: 'Banner image URL cannot be empty.' });
      }
      updates.push('image_url = ?');
      params.push(image_url.trim());
    }

    if (link_url !== undefined) {
      updates.push('link_url = ?');
      params.push(link_url ? link_url.trim() : null);
    }

    if (target_type !== undefined) {
      updates.push('target_type = ?');
      params.push(target_type || 'none');
    }

    if (target_value !== undefined) {
      updates.push('target_value = ?');
      params.push(target_value ? target_value.trim() : null);
    }

    if (display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(parseInt(display_order, 10) || 0);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(start_date || null);
    }

    if (end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(end_date || null);
    }

    if (updates.length > 0) {
      params.push(id);
      await query(`UPDATE banners SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await query('SELECT * FROM banners WHERE id = ?', [id]);

    // Database write succeeded -> Invalidate Redis cache
    await cache.delByPattern('banners:*');

    return res.json({
      success: true,
      message: 'Banner updated successfully.',
      banner: updated,
    });
  } catch (err) {
    console.error('updateBanner error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update banner.', error: err.message });
  }
}

/**
 * Admin endpoint: Delete banner
 * 1. Deletes from database first
 * 2. Invalidates Redis banner cache
 */
export async function deleteBanner(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM banners WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Banner not found.' });
    }

    await query('DELETE FROM banners WHERE id = ?', [id]);

    // Database delete succeeded -> Invalidate Redis cache
    await cache.delByPattern('banners:*');

    return res.json({
      success: true,
      message: `Banner "${existing.title}" deleted successfully.`,
    });
  } catch (err) {
    console.error('deleteBanner error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete banner.', error: err.message });
  }
}

/**
 * Admin endpoint: Toggle active status
 * 1. Updates database first
 * 2. Invalidates Redis banner cache
 */
export async function toggleBannerStatus(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM banners WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Banner not found.' });
    }

    const nextState = existing.is_active ? 0 : 1;
    await query('UPDATE banners SET is_active = ? WHERE id = ?', [nextState, id]);

    // Database update succeeded -> Invalidate Redis cache
    await cache.delByPattern('banners:*');

    return res.json({
      success: true,
      message: `Banner ${nextState ? 'activated' : 'deactivated'} successfully.`,
      is_active: Boolean(nextState),
    });
  } catch (err) {
    console.error('toggleBannerStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle banner status.', error: err.message });
  }
}

/**
 * Admin endpoint: Reorder banners
 * 1. Updates database first
 * 2. Invalidates Redis banner cache
 */
export async function reorderBanners(req, res) {
  try {
    const { orderings } = req.body;
    if (!Array.isArray(orderings)) {
      return res.status(400).json({ success: false, message: 'orderings array is required.' });
    }

    for (const item of orderings) {
      if (item.id && item.display_order !== undefined) {
        await query('UPDATE banners SET display_order = ? WHERE id = ?', [
          parseInt(item.display_order, 10),
          item.id,
        ]);
      }
    }

    // Database update succeeded -> Invalidate Redis cache
    await cache.delByPattern('banners:*');

    return res.json({
      success: true,
      message: 'Banners reordered successfully.',
    });
  } catch (err) {
    console.error('reorderBanners error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reorder banners.', error: err.message });
  }
}
