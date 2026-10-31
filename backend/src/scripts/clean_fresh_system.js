import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { pool } from '../config/db.js';
import cache from '../config/redis.js';

async function cleanFreshSystem() {
  if (!process.argv.includes('--confirm-wipe-all')) {
    console.error('⛔ [SAFETY GUARD] clean_fresh_system.js wipes database tables! To run it, you must explicitly provide: --confirm-wipe-all');
    console.error('Aborting execution to protect production data.');
    process.exit(1);
  }
  console.log('====================================================');
  console.log('🚀 [CLEAN FRESH SYSTEM] Purging all dummy records...');
  console.log(`Database target: ${process.env.DB_NAME || 'umi_db'} on ${process.env.DB_HOST || 'localhost'}`);
  console.log('====================================================');

  const connection = await pool.getConnection();

  try {
    // 1. Disable Foreign Key Checks for safe bulk truncate
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Tables to truncate completely (User content, fake gifts, rooms, orders, transactions, etc.)
    const tablesToTruncate = [
      'agencies',
      'agency_host_requests',
      'app_theme_items',
      'banners',
      'chat_message_media',
      'chat_messages',
      'coin_packages',
      'conversations',
      'entry_effects',
      'gift_transactions',
      'gifts',
      'host_requests',
      'level_configs',
      'live_duration_reward_history',
      'live_duration_reward_settings',
      'live_room_admins',
      'live_room_kicks',
      'live_room_messages',
      'live_room_seat_requests',
      'live_room_seats',
      'live_room_viewers',
      'live_rooms',
      'moderation_reports',
      'moderators',
      'notifications',
      'p2p_calls',
      'package_categories',
      'post_comments',
      'post_media',
      'post_reactions',
      'posts',
      'privilege_packages',
      'reseller_sales',
      'special_thumbnails',
      'transactions',
      'user_blocks',
      'user_devices',
      'user_entry_effects',
      'user_fcm_tokens',
      'user_follows',
      'user_level_rewards',
      'user_package_subscriptions',
      'user_theme_items',
      'user_thumbnails',
      'withdrawals'
    ];

    for (const table of tablesToTruncate) {
      try {
        await connection.query(`TRUNCATE TABLE \`${table}\``);
        console.log(`  ✓ Truncated: ${table}`);
      } catch (err) {
        // Table might not exist in some environments
        console.warn(`  ⚠ Warning truncating ${table}: ${err.message}`);
      }
    }

    // 2. Remove all non-superadmin users
    await connection.query(`
      DELETE FROM users 
      WHERE email != 'admin@umi.live' AND role != 'superadmin'
    `);
    console.log('  ✓ Purged all fake and regular users (Super Admin preserved)');

    // 3. Reset Super Admin balance and properties to a clean state
    const [adminRows] = await connection.query(`
      SELECT id, email, role FROM users WHERE email = 'admin@umi.live' OR role = 'superadmin' LIMIT 1
    `);

    if (adminRows.length > 0) {
      await connection.query(`
        UPDATE users 
        SET coins = 0, 
            diamonds = 0, 
            star = 0.00, 
            bio = 'Super Administrator of Umi Live', 
            role = 'superadmin',
            host_type = 'none',
            is_banned = 0
        WHERE id = ?
      `, [adminRows[0].id]);
      console.log(`  ✓ Super Admin (ID: ${adminRows[0].id}, ${adminRows[0].email}) balance reset: 0 coins, 0 diamonds.`);
    } else {
      console.log('  ℹ No existing Super Admin found. Creating initial Super Admin (admin@umi.live)...');
      const adminPassHash = await bcrypt.hash('admin123', 10);
      await connection.query(`
        INSERT INTO users (email, password_hash, full_name, avatar_url, bio, role, coins, diamonds, level, star)
        VALUES ('admin@umi.live', ?, 'System Admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'Super Administrator of Umi Live', 'superadmin', 0, 0, 99, 0.00)
      `, [adminPassHash]);
      console.log('  ✓ Super Admin created successfully (admin@umi.live / admin123).');
    }

    // 4. Reset & Ensure Reserved Accounts Pool (VIP IDs)
    try {
      await connection.query(`
        UPDATE reserved_accounts 
        SET status = 'available', assigned_to_user_id = NULL, assigned_at = NULL, notes = 'System Reserved VIP ID'
      `);
      console.log('  ✓ Reserved Accounts pool reclaimed & reset to Available status.');

      // Check if reserved_accounts has records; if not, seed default pool (IDs 2..100)
      const [resCount] = await connection.query('SELECT COUNT(*) as count FROM reserved_accounts');
      if (resCount[0].count === 0) {
        const reservedValues = [];
        for (let i = 2; i <= 100; i++) {
          reservedValues.push([i, 'vip', 'available', null, null, `System Reserved VIP #${i}`]);
        await connection.query(
          `INSERT IGNORE INTO reserved_accounts (reserved_id, category, status, assigned_to_user_id, assigned_at, notes) VALUES ?`,
          [reservedValues]
        );
        console.log(`  ✓ Seeded default pool of ${reservedValues.length} Reserved Accounts (IDs 2..100).`);
      }

      // Reset users AUTO_INCREMENT right after reserved pool or max user ID
      const [maxUserRows] = await connection.query('SELECT MAX(id) as max_id FROM users');
      const currentMax = maxUserRows[0]?.max_id || 0;
      const [maxReservedRows] = await connection.query('SELECT MAX(reserved_id) as max_res FROM reserved_accounts WHERE reserved_id < 10000');
      const maxReserved = maxReservedRows[0]?.max_res || 100;
      const targetAutoInc = Math.max(currentMax + 1, maxReserved + 1);
      await connection.query(`ALTER TABLE users AUTO_INCREMENT = ${targetAutoInc}`);
      console.log(`  ✓ Set users AUTO_INCREMENT to ${targetAutoInc}.`);
    } catch (resErr) {
      console.warn('  ⚠ Reserved accounts setup note:', resErr.message);
    }

    // 5. Re-enable Foreign Key Checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // 5. Invalidate & Flush Redis Cache completely
    console.log('  ⏳ Clearing Redis caches...');
    try {
      if (cache && typeof cache.flushAll === 'function') {
        await cache.flushAll();
        console.log('  ✓ Redis cache flushed completely.');
      }
    } catch (redisErr) {
      console.warn('  ⚠ Redis flush warning (non-fatal):', redisErr.message);
    }

    // 6. Summary Report
    const [finalUsers] = await connection.query('SELECT id, email, role, coins, diamonds FROM users');
    console.log('\n====================================================');
    console.log('✅ [SYSTEM PURGE COMPLETE] Fresh System Status:');
    console.log('Users remaining:', finalUsers);
    console.log('All dummy gifts, packages, rooms, withdrawals, agencies & history have been permanently removed.');
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ [Error during system purge]:', error);
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (_) {}
    process.exit(1);
  } finally {
    connection.release();
  }
}

cleanFreshSystem();
