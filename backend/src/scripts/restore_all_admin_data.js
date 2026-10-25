import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export async function restoreAllAdminData(host, port, user, password, database) {
  const targetHost = host || process.env.DB_HOST || '127.0.0.1';
  const targetPort = parseInt(port || process.env.DB_PORT || '3306', 10);
  const targetUser = user || process.env.DB_USER || 'umi_user';
  const targetPassword = password || process.env.DB_PASSWORD || 'umi_password';
  const targetDb = database || process.env.DB_NAME || 'umi_live';

  console.log(`Connecting to ${targetHost}:${targetPort}/${targetDb} as ${targetUser}...`);
  const conn = await mysql.createConnection({
    host: targetHost,
    port: targetPort,
    user: targetUser,
    password: targetPassword,
    database: targetDb,
  });

  try {
    // 1. Restore Gifts
    const [giftCount] = await conn.query('SELECT COUNT(*) as c FROM gifts');
    if (giftCount[0].c === 0) {
      console.log('Restoring Gifts catalog...');
      await conn.query(`
        INSERT INTO gifts (name, icon_url, animation_type, coin_cost, diamond_reward, category) VALUES
        ('Rose', '🌹', 'float', 10, 5, 'Popular'),
        ('Heart', '💖', 'pulse', 50, 25, 'Popular'),
        ('Ice Cream', '🍦', 'float', 100, 50, 'Casual'),
        ('Crown', '👑', 'sparkle', 500, 250, 'VIP'),
        ('Sports Car', '🏎️', 'fullscreen', 1200, 600, 'Luxury'),
        ('Rocket', '🚀', 'fullscreen', 3000, 1500, 'Luxury'),
        ('Super Castle', '🏰', 'fullscreen', 5000, 2500, 'Luxury'),
        ('Golden Dragon', '🐉', 'fullscreen', 10000, 5000, 'Legendary');
      `);
      console.log('✅ Gifts restored.');
    }

    // 2. Restore Coin Packages
    const [coinPkgCount] = await conn.query('SELECT COUNT(*) as c FROM coin_packages');
    if (coinPkgCount[0].c === 0) {
      console.log('Restoring Coin Packages...');
      await conn.query(`
        INSERT INTO coin_packages (name, coins, price_usd, bonus_coins, badge) VALUES
        ('Starter Pack', 100, 0.99, 10, 'Starter'),
        ('Value Bundle', 500, 4.99, 80, 'Popular'),
        ('Pro Streamer', 1200, 9.99, 250, 'Best Value'),
        ('Diamond King', 6500, 49.99, 1500, 'Mega Bonus'),
        ('Ultimate VIP', 14000, 99.99, 4000, 'VIP Elite');
      `);
      console.log('✅ Coin Packages restored.');
    }

    // 3. Restore Package Categories & Privilege Packages
    const [catCount] = await conn.query('SELECT COUNT(*) as c FROM package_categories');
    if (catCount[0].c === 0) {
      console.log('Restoring Package Categories & Privilege Packages...');
      await conn.query(`
        INSERT INTO package_categories (id, name, badge_icon, color_code, display_order, cant_be_removed, cant_be_banned, self_seat_accept, top_live_list, anti_mute, special_entry, custom_privileges, is_active) VALUES 
        (1, 'Royal Crown VIP', '👑', '#f59e0b', 1, 1, 1, 1, 1, 1, 0, JSON_ARRAY(), 1),
        (2, 'King VIP', '⚡', '#8b5cf6', 2, 1, 1, 1, 1, 0, 0, JSON_ARRAY(), 1),
        (3, 'Knight VIP', '🛡️', '#3b82f6', 3, 1, 0, 1, 0, 0, 0, JSON_ARRAY(), 1)
        ON DUPLICATE KEY UPDATE name=VALUES(name);
      `);

      await conn.query(`
        INSERT INTO privilege_packages (category_id, name, image_url, validity_days, price, currency, description, is_active) VALUES
        (1, 'Royal 30-Day Pass', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300', 30, 50000, 'coins', '30 days of supreme Royal VIP status and privileges.', 1),
        (1, 'Royal Quarter Pass (90 Days)', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300', 90, 135000, 'coins', '90 days of Royal Crown VIP privilege benefits with 10% discount.', 1),
        (1, 'Royal Annual Majesty (365 Days)', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300', 365, 480000, 'coins', 'Full year of ultimate Royal privileges, supreme entrance animations, and top tier status.', 1),
        (2, 'King 7-Day Trial', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300', 7, 5000, 'coins', '7-day starter pack for King VIP privilege tier.', 1),
        (2, 'King 30-Day Pass', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300', 30, 18000, 'coins', '30-day King VIP membership with anti-kick and VIP entrance.', 1),
        (2, 'King 90-Day Pass', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300', 90, 48000, 'coins', '90-day King VIP membership with discounted pricing.', 1),
        (3, 'Knight 7-Day Pass', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300', 7, 2000, 'coins', '7-day Knight privilege pass.', 1),
        (3, 'Knight 30-Day Pass', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300', 30, 7000, 'coins', 'Monthly Knight pass with anti-kick and special entry.', 1);
      `);
      console.log('✅ VIP Categories and Packages restored.');
    }

    // 4. Restore Banners
    const [bannerCount] = await conn.query('SELECT COUNT(*) as c FROM banners');
    if (bannerCount[0].c === 0) {
      console.log('Restoring Promotional Banners...');
      await conn.query(`
        INSERT INTO banners (title, image_url, link_url, target_type, target_value, display_order, is_active) VALUES
        ('Grand Umi PK Tournament 🏆', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1000&auto=format&fit=crop&q=80', '', 'live_room', 'room-rohan-202', 1, 1),
        ('Royal Crown VIP Membership 👑', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1000&auto=format&fit=crop&q=80', '', 'vip', '1', 2, 1),
        ('Weekend Coin Recharge Mega Bonus +25% 🪙', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=1000&auto=format&fit=crop&q=80', '', 'recharge', 'packages', 3, 1),
        ('Official Agency Recruitment Program ✨', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80', '', 'agency', 'apply', 4, 1);
      `);
      console.log('✅ Banners restored.');
    }

    // 5. Restore Entry Effects
    const [entryCount] = await conn.query('SELECT COUNT(*) as c FROM entry_effects');
    if (entryCount[0].c === 0) {
      console.log('Restoring Entry Effects...');
      await conn.query(`
        INSERT INTO entry_effects (name, effect_type, preview_image_url, svga_url, gif_url, sound_url, price, validity_days, is_active) VALUES 
        ('Golden Dragon Arrival', 'svga', '/uploads/gifts/sports_car_thumb_1791794086432-13704975.png', '/uploads/gifts/sports_car_anim_1791794086435-998043722.svga', '/uploads/gifts/fire_dragon_anim_1791794086443-492844523.gif', '/uploads/gifts/dragon_roar_1791794086446-125382975.mp3', 1000, 30, 1),
        ('Cyber Supercar Entrance', 'svga', '/uploads/gifts/sports_car_thumb_1791794056867-245337673.png', '/uploads/gifts/sports_car_anim_1791794056871-502798849.svga', '/uploads/gifts/fire_dragon_anim_1791794086443-492844523.gif', NULL, 2500, 30, 1),
        ('Pegasus Wings Glory', 'gif', '/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png', NULL, '/uploads/gifts/fire_dragon_anim_1791794086443-492844523.gif', NULL, 5000, 60, 1);
      `);
      console.log('✅ Entry Effects restored.');
    }

    // 6. Restore Special Thumbnails / Avatar Frames
    const [thumbCount] = await conn.query('SELECT COUNT(*) as c FROM special_thumbnails');
    if (thumbCount[0].c === 0) {
      console.log('Restoring Special Thumbnails...');
      await conn.query(`
        INSERT INTO special_thumbnails (name, image_url, price, validity_days, is_active) VALUES 
        ('Kawaii Princess Avatar Frame', '/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png', 500, 30, 1),
        ('Golden Dragon Avatar Frame', '/uploads/gifts/sports_car_thumb_1791794086432-13704975.png', 1500, 30, 1),
        ('Cyber Neon Glow Frame', '/uploads/thumbnails/test_thumb_1791720885105-621496700.png', 3000, 60, 1);
      `);
      console.log('✅ Special Thumbnails restored.');
    }

    // 7. Restore Level Progression (Levels 1 to 20)
    const [levelCount] = await conn.query('SELECT COUNT(*) as c FROM level_configs');
    if (levelCount[0].c === 0) {
      console.log('Restoring Level Configs (1 to 20)...');
      await conn.query(`
        INSERT INTO level_configs (level_number, level_name, min_coins_spent, badge_color, reward_coins, reward_diamonds, reward_validity_days, description) VALUES 
        (1, 'Bronze Novice', 0, '#cd7f32', 0, 0, 7, 'Welcome tier for every new member.'),
        (2, 'Silver Explorer', 500, '#94a3b8', 25, 0, 7, 'Unlocked after spending 500 coins.'),
        (3, 'Gold Adventurer', 1500, '#eab308', 50, 0, 7, 'Unlocked after spending 1,500 coins.'),
        (4, 'Emerald Scout', 5000, '#10b981', 150, 0, 7, 'Unlocked after spending 5,000 coins.'),
        (5, 'Ruby Pioneer', 15000, '#ef4444', 350, 50, 7, 'Unlocked after spending 15,000 coins.'),
        (6, 'Sapphire Veteran', 40000, '#3b82f6', 750, 100, 7, 'Unlocked after spending 40,000 coins.'),
        (7, 'Amethyst Warrior', 100000, '#8b5cf6', 1500, 250, 15, 'Unlocked after spending 100,000 coins.'),
        (8, 'Diamond Champion', 250000, '#06b6d4', 3500, 500, 15, 'Unlocked after spending 250,000 coins.'),
        (9, 'Master Guardian', 600000, '#ec4899', 7500, 1000, 15, 'Unlocked after spending 600,000 coins.'),
        (10, 'Royal Conqueror', 1500000, '#f59e0b', 15000, 2500, 30, 'Unlocked after spending 1,500,000 coins.'),
        (11, 'Imperial Warlord', 3000000, '#6366f1', 30000, 5000, 30, 'Unlocked after spending 3,000,000 coins.'),
        (12, 'Grand Monarch', 6000000, '#14b8a6', 60000, 10000, 30, 'Unlocked after spending 6,000,000 coins.'),
        (13, 'Supreme Overlord', 12000000, '#d946ef', 120000, 20000, 30, 'Unlocked after spending 12,000,000 coins.'),
        (14, 'Celestial Titan', 25000000, '#84cc16', 250000, 40000, 30, 'Unlocked after spending 25,000,000 coins.'),
        (15, 'Mythic Sovereign', 50000000, '#f43f5e', 500000, 80000, 30, 'Unlocked after spending 50,000,000 coins.'),
        (16, 'Divine Immortal', 100000000, '#a855f7', 1000000, 150000, 60, 'Unlocked after spending 100,000,000 coins.'),
        (17, 'Galactic Emperor', 200000000, '#0ea5e9', 2000000, 300000, 60, 'Unlocked after spending 200,000,000 coins.'),
        (18, 'Cosmic Ruler', 400000000, '#e11d48', 4000000, 600000, 60, 'Unlocked after spending 400,000,000 coins.'),
        (19, 'Eternal Legend', 750000000, '#f97316', 7500000, 1200000, 90, 'Unlocked after spending 750,000,000 coins.'),
        (20, 'Omnipotent Deity', 1500000000, '#fbbf24', 15000000, 2500000, 365, 'The highest honor in Umi Live.');
      `);
      console.log('✅ Level Progression (1-20) restored.');
    }

    // 8. Restore App Themes
    const [themeCount] = await conn.query('SELECT COUNT(*) as c FROM app_theme_items');
    if (themeCount[0].c === 0) {
      console.log('Restoring App Theme Items...');
      await conn.query(`
        INSERT INTO app_theme_items (type, name, value, secondary_value, price, validity_days, is_default, is_active, sort_order) VALUES
        ('color', 'Royal Violet (Default)', '#7C3AED', '#A78BFA', 0, 0, 1, 1, 1),
        ('color', 'Cyber Neon Cyan', '#06B6D4', '#22D3EE', 100, 30, 0, 1, 2),
        ('color', 'Sunset Rose Gold', '#F43F5E', '#FB7185', 200, 30, 0, 1, 3),
        ('color', 'Emerald Glow', '#10B981', '#34D399', 150, 30, 0, 1, 4),
        ('color', 'Midnight Obsidian', '#0F172A', '#334155', 0, 0, 0, 1, 5),
        ('page_image', 'Default Dark Nebula', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80', NULL, 0, 0, 1, 1, 1),
        ('page_image', 'Cyberpunk City Grid', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80', NULL, 300, 30, 0, 1, 2),
        ('page_image', 'Deep Space Aurora', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80', NULL, 500, 30, 0, 1, 3),
        ('bottom_sheet_image', 'Default Frosted Glass', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80', NULL, 0, 0, 1, 1, 1),
        ('bottom_sheet_image', 'Dark Wave Texture', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80', NULL, 250, 30, 0, 1, 2),
        ('bottom_sheet_image', 'Golden Velvet Shimmer', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80', NULL, 400, 30, 0, 1, 3);
      `);
      console.log('✅ App Theme Items restored.');
    }

    // 9. Restore Live Duration Reward Settings
    const [rewardSettingCount] = await conn.query('SELECT COUNT(*) as c FROM live_duration_reward_settings');
    if (rewardSettingCount[0].c === 0) {
      console.log('Restoring Live Duration Reward Settings...');
      await conn.query(`
        INSERT INTO live_duration_reward_settings (id, is_enabled, target_role, session_type, min_sessions, required_minutes, reward_coins, target_audience, max_rewards_per_day, title, description) VALUES
        (1, 1, 'host', 'single_continuous', 1, 60, 300, 'all_hosts', 1, 'Continuous 1-Hour Stream Milestone', 'Stream continuously for 60 minutes to unlock 300 bonus coins.'),
        (2, 1, 'host', 'multiple_cumulative', 2, 120, 600, 'all_hosts', 1, 'Daily 2-Hour Stream Marathon', 'Complete at least 2 sessions totaling 120 minutes to earn 600 bonus coins.')
        ON DUPLICATE KEY UPDATE is_enabled=VALUES(is_enabled);
      `);
      console.log('✅ Live Duration Reward Settings restored.');
    }

    console.log('🎉 ALL ADMIN DATA SUCCESSFULLY RESTORED!');
  } finally {
    await conn.end();
  }
}

if (process.argv[1]?.endsWith('restore_all_admin_data.js')) {
  restoreAllAdminData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Restoration failed:', err);
      process.exit(1);
    });
}
