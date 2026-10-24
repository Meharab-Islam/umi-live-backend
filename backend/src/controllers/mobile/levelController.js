import { getUserLevelProgression } from '../../services/levelService.js';
import { query } from '../../config/db.js';
import { cache } from '../../config/redis.js';

/**
 * Get Level Progression Roadmap & User Status
 * GET /api/mobile/levels
 */
export async function getLevelsProgression(req, res) {
  try {
    const userId = req.user?.id;

    if (userId) {
      const data = await getUserLevelProgression(userId);
      return res.json({ success: true, ...data });
    }

    // Public view (unauthenticated guest)
    const levels = await cache.getOrSet('levels:all_active', 300, async () => {
      return await query(
        `SELECT lc.*,
                ee.name as effect_name, ee.preview_image_url as effect_preview,
                st.name as thumbnail_name, st.image_url as thumbnail_preview,
                pp.name as package_name, pp.image_url as package_preview
         FROM level_configs lc
         LEFT JOIN entry_effects ee ON lc.reward_entry_effect_id = ee.id
         LEFT JOIN special_thumbnails st ON lc.reward_thumbnail_id = st.id
         LEFT JOIN privilege_packages pp ON lc.reward_package_id = pp.id
         WHERE lc.is_active = TRUE
         ORDER BY lc.level_number ASC`
      );
    });

    return res.json({
      success: true,
      user: null,
      all_levels: levels || [],
    });
  } catch (err) {
    console.error('getLevelsProgression error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch level progression roadmap.' });
  }
}

/**
 * Get Authenticated User's Claimed Level Rewards
 * GET /api/mobile/levels/my-rewards
 */
export async function getMyLevelRewards(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Authentication token required.' });
    }

    const claimed = await query(
      `SELECT ulr.*, lc.level_name, lc.badge_color,
              ee.name as effect_name, ee.preview_image_url as effect_preview,
              st.name as thumbnail_name, st.image_url as thumbnail_preview,
              pp.name as package_name, pp.image_url as package_preview
       FROM user_level_rewards ulr
       LEFT JOIN level_configs lc ON ulr.level_reached = lc.level_number
       LEFT JOIN entry_effects ee ON ulr.entry_effect_id = ee.id
       LEFT JOIN special_thumbnails st ON ulr.thumbnail_id = st.id
       LEFT JOIN privilege_packages pp ON ulr.package_id = pp.id
       WHERE ulr.user_id = ?
       ORDER BY ulr.level_reached DESC`,
      [userId]
    );

    return res.json({
      success: true,
      total_claimed: claimed.length,
      rewards: claimed,
    });
  } catch (err) {
    console.error('getMyLevelRewards error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch claimed level rewards.' });
  }
}
