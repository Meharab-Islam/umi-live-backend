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
