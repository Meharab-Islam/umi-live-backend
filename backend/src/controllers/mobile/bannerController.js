import { query } from '../../config/db.js';
import { cache } from '../../config/redis.js';

/**
 * Public Mobile Endpoint: Get active promotional & event banners
 * GET /api/mobile/banners (and /api/v1/banners)
 * 
 * Cached in Redis with TTL 300s and instant failover to direct DB query.
 */
export async function getMobileBanners(req, res) {
  try {
    const banners = await cache.getOrSet('banners:mobile', 300, async () => {
      const rows = await query(`
        SELECT 
          id,
          image_url,
          link_url,
          display_order,
          is_active,
          start_date,
          end_date,
          created_at
        FROM banners
        WHERE is_active = 1
          AND (start_date IS NULL OR start_date <= NOW())
          AND (end_date IS NULL OR end_date >= NOW())
        ORDER BY display_order ASC, id DESC
      `);

      return (rows || []).map((b) => ({
        id: b.id,
        image_url: b.image_url,
        link_url: b.link_url || '',
        display_order: parseInt(b.display_order || 0, 10),
        is_active: Boolean(b.is_active),
        start_date: b.start_date,
        end_date: b.end_date,
        created_at: b.created_at,
      }));
    });

    return res.json({
      success: true,
      message: 'Active banners retrieved successfully.',
      count: (banners || []).length,
      banners: banners || [],
    });
  } catch (error) {
    console.error('[getMobileBanners Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch mobile banners.',
      error: error.message,
    });
  }
}

export default {
  getMobileBanners,
};
