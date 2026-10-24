import { query } from '../config/db.js';
import { cache } from '../config/redis.js';

/**
 * System Settings & Economy Helpers
 */

/**
 * Returns dynamic default welcome coins awarded to newly registered users
 */
export async function getDefaultRegistrationCoins() {
  try {
    const val = await cache.getOrSet('setting:default_registration_coins', 120, async () => {
      const rows = await query("SELECT key_value FROM system_settings WHERE key_name = 'default_registration_coins' LIMIT 1");
      return rows && rows.length > 0 ? rows[0].key_value : '100';
    });
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  } catch (e) {
    return 100;
  }
}

/**
 * Returns Star Progression Engine Configuration
 * Example: 100,000 coins = 1.0 star, 120,000 = 1.2 star, 200,000 = 2.0 star
 */
export async function getStarProgressionConfig() {
  try {
    return await cache.getOrSet('config:star_progression', 120, async () => {
      const rows = await query(`
        SELECT key_name, key_value 
        FROM system_settings 
        WHERE key_name IN ('star_system_enabled', 'star_coins_per_unit', 'star_metric_type', 'star_decimal_precision', 'star_max_stars')
      `);
      const map = {};
      for (const r of rows) map[r.key_name] = r.key_value;
      return {
        is_enabled: map['star_system_enabled'] !== 'false',
        coins_per_unit: Math.max(1, parseInt(map['star_coins_per_unit'] || '100000', 10)),
        metric_type: map['star_metric_type'] || 'coins_spent',
        decimal_precision: Math.min(3, Math.max(0, parseInt(map['star_decimal_precision'] || '1', 10))),
        max_stars: parseFloat(map['star_max_stars'] || '100.0') || 100.0,
      };
    });
  } catch (e) {
    return {
      is_enabled: true,
      coins_per_unit: 100000,
      metric_type: 'coins_spent',
      decimal_precision: 1,
      max_stars: 100.0,
    };
  }
}

/**
 * Calculates a user's exact star rating given their points/spent and the star config
 * Example: 120,000 / 100,000 = 1.2 stars
 */
export function calculateUserStars(metricValue, starConfig) {
  if (!starConfig || !starConfig.is_enabled) return 0.0;
  const val = Number(metricValue) || 0;
  if (val <= 0) return 0.0;
  const rawStars = val / (starConfig.coins_per_unit || 100000);
  const cappedStars = Math.min(rawStars, starConfig.max_stars || 100.0);
  const precision = starConfig.decimal_precision !== undefined ? starConfig.decimal_precision : 1;
  return parseFloat(cappedStars.toFixed(precision));
}

