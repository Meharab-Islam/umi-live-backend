import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root and local backend .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export async function initializeDatabase() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'umi_user';
  const password = process.env.DB_PASSWORD || 'umi_password';
  const database = process.env.DB_NAME || 'umi_live';

  console.log(`[DB Init] Connecting to MySQL at ${host}:${port} as ${user}...`);

  let connection;
  try {
    // Connect without selecting DB first to create database if not exists
    connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${database}\`;`);

    // Create tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        google_id VARCHAR(191) DEFAULT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) DEFAULT '',
        avatar_url VARCHAR(255) DEFAULT '',
        bio TEXT,
        role ENUM('user', 'host', 'agency', 'moderator', 'reseller', 'admin', 'superadmin') DEFAULT 'user',
        coins INT DEFAULT 100,
        diamonds INT DEFAULT 0,
        level INT DEFAULT 1,
        is_banned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_google_id (google_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS live_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(64) NOT NULL UNIQUE,
        host_id INT NOT NULL,
        title VARCHAR(150) NOT NULL,
        category VARCHAR(50) DEFAULT 'Chatting',
        live_type ENUM('video', 'audio') DEFAULT 'video',
        total_seats INT DEFAULT 9,
        cover_image VARCHAR(255) DEFAULT '',
        background_image VARCHAR(255) DEFAULT '',
        status ENUM('live', 'ended', 'blocked') DEFAULT 'live',
        viewer_count INT DEFAULT 0,
        total_diamonds INT DEFAULT 0,
        stream_key VARCHAR(100),
        is_comment_disabled BOOLEAN DEFAULT FALSE,
        is_reaction_disabled BOOLEAN DEFAULT FALSE,
        is_locked TINYINT(1) DEFAULT 0,
        room_password VARCHAR(255) NULL DEFAULT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS live_room_seats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(64) NOT NULL,
        seat_number INT NOT NULL,
        user_id INT NULL,
        is_main_seat BOOLEAN DEFAULT FALSE,
        is_camera_on BOOLEAN DEFAULT TRUE,
        is_muted BOOLEAN DEFAULT FALSE,
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_room_seat (room_id, seat_number),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS live_room_viewers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(64) NOT NULL,
        user_id INT NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_room_user (room_id, user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS live_room_seat_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(64) NOT NULL,
        user_id INT NOT NULL,
        seat_number INT NULL,
        status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_room_status (room_id, status),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS live_room_admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(64) NOT NULL,
        user_id INT NOT NULL,
        assigned_by INT NOT NULL,
        permissions JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_room_admin (room_id, user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS gifts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NULL DEFAULT 'Gift',
        icon_url VARCHAR(500) NULL,
        animation_type VARCHAR(50) DEFAULT 'svga',
        animation_url VARCHAR(500) NULL,
        sound_url VARCHAR(500) NULL,
        coin_cost INT NOT NULL,
        diamond_reward INT NOT NULL,
        category VARCHAR(50) DEFAULT 'Popular',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure animation_url and sound_url columns exist on gifts
    const [giftColumns] = await connection.query(`SHOW COLUMNS FROM gifts LIKE 'animation_url'`);
    if (giftColumns.length === 0) {
      await connection.query(`ALTER TABLE gifts ADD COLUMN animation_url VARCHAR(500) NULL AFTER animation_type`);
    }
    const [soundColumns] = await connection.query(`SHOW COLUMNS FROM gifts LIKE 'sound_url'`);
    if (soundColumns.length === 0) {
      await connection.query(`ALTER TABLE gifts ADD COLUMN sound_url VARCHAR(500) NULL AFTER animation_url`);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS gift_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        room_id VARCHAR(64) NULL DEFAULT '',
        gift_id INT NOT NULL,
        gift_name VARCHAR(50) NOT NULL,
        coin_amount INT NOT NULL,
        diamond_amount INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (gift_id) REFERENCES gifts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS coin_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        coins INT NOT NULL,
        price_usd DECIMAL(10, 2) NOT NULL,
        bonus_coins INT DEFAULT 0,
        badge VARCHAR(50) DEFAULT '',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount INT NOT NULL,
        description VARCHAR(255),
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        host_id INT NOT NULL,
        diamond_amount INT NOT NULL,
        usd_amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        account_details VARCHAR(255) NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS moderation_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reporter_id INT NOT NULL,
        reported_id INT NOT NULL,
        room_id VARCHAR(64) NULL,
        reason VARCHAR(100) NOT NULL,
        description TEXT,
        status ENUM('pending', 'investigating', 'resolved', 'dismissed') DEFAULT 'pending',
        admin_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key_name VARCHAR(50) PRIMARY KEY,
        key_value TEXT NOT NULL,
        description VARCHAR(255)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS moderators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        assigned_by INT NULL,
        permissions JSON NULL,
        status ENUM('active', 'suspended') DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS package_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        badge_icon VARCHAR(255) DEFAULT '',
        color_code VARCHAR(50) DEFAULT '#f59e0b',
        display_order INT DEFAULT 1,
        cant_be_removed BOOLEAN DEFAULT TRUE,
        cant_be_banned BOOLEAN DEFAULT TRUE,
        self_seat_accept BOOLEAN DEFAULT TRUE,
        top_live_list BOOLEAN DEFAULT TRUE,
        anti_mute BOOLEAN DEFAULT FALSE,
        special_entry BOOLEAN DEFAULT TRUE,
        custom_privileges JSON NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS privilege_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        image_url VARCHAR(255) DEFAULT '',
        validity_days INT NOT NULL DEFAULT 30,
        price INT NOT NULL DEFAULT 1000,
        currency VARCHAR(20) DEFAULT 'coins',
        description TEXT NULL,
        color VARCHAR(50) DEFAULT '#8b5cf6',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES package_categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_package_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        package_id INT NOT NULL,
        category_id INT NOT NULL,
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
        is_equipped TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (package_id) REFERENCES privilege_packages(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES package_categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS special_thumbnails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        price INT NOT NULL DEFAULT 1000,
        validity_days INT NOT NULL DEFAULT 30,
        is_active BOOLEAN DEFAULT TRUE,
        is_custom TINYINT(1) NOT NULL DEFAULT 0,
        uploader_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_custom (is_custom),
        INDEX idx_uploader (uploader_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_thumbnails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        thumbnail_id INT NOT NULL,
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
        is_equipped TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (thumbnail_id) REFERENCES special_thumbnails(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS entry_effects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        effect_type ENUM('svga', 'gif') NOT NULL DEFAULT 'gif',
        preview_image_url VARCHAR(500) DEFAULT '',
        svga_url VARCHAR(500) DEFAULT '',
        gif_url VARCHAR(500) DEFAULT '',
        sound_url VARCHAR(500) DEFAULT '',
        price INT NOT NULL DEFAULT 2000,
        validity_days INT NOT NULL DEFAULT 30,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_entry_effects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        effect_id INT NOT NULL,
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
        is_equipped TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (effect_id) REFERENCES entry_effects(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        device_id VARCHAR(191) NOT NULL,
        device_model VARCHAR(100) DEFAULT 'Unknown Mobile Device',
        os_type VARCHAR(50) DEFAULT 'Android',
        os_version VARCHAR(50) DEFAULT '',
        app_version VARCHAR(50) DEFAULT '1.0.0',
        ip_address VARCHAR(45) DEFAULT '',
        user_agent VARCHAR(255) DEFAULT '',
        is_banned BOOLEAN DEFAULT FALSE,
        ban_reason VARCHAR(255) DEFAULT NULL,
        banned_by INT DEFAULT NULL,
        banned_at TIMESTAMP NULL DEFAULT NULL,
        last_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_device (user_id, device_id),
        INDEX idx_device_id (device_id),
        INDEX idx_user_id (user_id),
        INDEX idx_is_banned (is_banned),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS p2p_calls (
        id INT AUTO_INCREMENT PRIMARY KEY,
        call_id VARCHAR(64) NOT NULL UNIQUE,
        caller_id INT NOT NULL,
        receiver_id INT NOT NULL,
        call_type ENUM('audio', 'video') NOT NULL DEFAULT 'audio',
        status ENUM('initiating', 'ringing', 'accepted', 'rejected', 'busy', 'missed', 'ended', 'failed') NOT NULL DEFAULT 'initiating',
        rate_per_minute INT NOT NULL DEFAULT 20,
        receiver_share_percent INT NOT NULL DEFAULT 70,
        duration_seconds INT NOT NULL DEFAULT 0,
        billed_minutes INT NOT NULL DEFAULT 0,
        total_coins_spent INT NOT NULL DEFAULT 0,
        receiver_earned_diamonds INT NOT NULL DEFAULT 0,
        end_reason VARCHAR(100) NULL,
        started_at TIMESTAMP NULL DEFAULT NULL,
        ended_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_caller (caller_id),
        INDEX idx_receiver (receiver_id),
        INDEX idx_status (status),
        INDEX idx_created (created_at),
        FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure is_equipped column exists for legacy installations
    const tablesToEquip = ['user_entry_effects', 'user_thumbnails', 'user_package_subscriptions'];
    for (const tbl of tablesToEquip) {
      try {
        const [colCheck] = await connection.query(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'is_equipped'
        `, [database, tbl]);
        if (!colCheck || colCheck.length === 0) {
          await connection.query(`ALTER TABLE \`${tbl}\` ADD COLUMN is_equipped TINYINT(1) NOT NULL DEFAULT 0;`);
        }
      } catch (err) {
        // Silently continue if already exists
      }
    }

    // Ensure agency_joined_at exists in users table
    try {
      const [colCheck] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'agency_joined_at'
      `, [database]);
      if (!colCheck || colCheck.length === 0) {
        await connection.query('ALTER TABLE `users` ADD COLUMN agency_joined_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;');
        await connection.query('UPDATE `users` SET agency_joined_at = created_at WHERE agency_joined_at IS NULL;');
      }
    } catch (err) {
      // Silently continue if already exists
    }

    // Ensure broadcast_banned_until exists in users table
    try {
      const [colCheck] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'broadcast_banned_until'
      `, [database]);
      if (!colCheck || colCheck.length === 0) {
        await connection.query(`
          ALTER TABLE \`users\` 
            ADD COLUMN broadcast_banned_until TIMESTAMP NULL DEFAULT NULL,
            ADD COLUMN broadcast_ban_reason VARCHAR(255) NULL DEFAULT NULL,
            ADD COLUMN broadcast_banned_at TIMESTAMP NULL DEFAULT NULL;
        `);
      }
    } catch (err) {
      // Silently continue if already exists
    }

    // App Themes: Page Background Images, Bottom Sheet Images, and Color Palettes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_theme_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('page_image', 'bottom_sheet_image', 'color') NOT NULL,
        name VARCHAR(150) NOT NULL,
        value VARCHAR(500) NOT NULL,
        secondary_value VARCHAR(500) NULL,
        preview_url VARCHAR(500) NULL,
        price INT NOT NULL DEFAULT 0,
        validity_days INT NOT NULL DEFAULT 30,
        is_default TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_theme_type_active (type, is_active),
        INDEX idx_theme_default (type, is_default)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_theme_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        theme_item_id INT NOT NULL,
        is_equipped TINYINT(1) NOT NULL DEFAULT 0,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (theme_item_id) REFERENCES app_theme_items(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_theme (user_id, theme_item_id),
        INDEX idx_user_equipped_theme (user_id, is_equipped)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default theme items if table is empty
    try {
      const [themeRows] = await connection.query('SELECT COUNT(*) as count FROM app_theme_items');
      if (!themeRows || themeRows[0]?.count === 0) {
        await connection.query(`
          INSERT INTO app_theme_items (type, name, value, secondary_value, price, validity_days, is_default, is_active, sort_order) VALUES
          -- Colors
          ('color', 'Royal Violet (Default)', '#7C3AED', '#A78BFA', 0, 0, 1, 1, 1),
          ('color', 'Cyber Neon Cyan', '#06B6D4', '#22D3EE', 100, 30, 0, 1, 2),
          ('color', 'Sunset Rose Gold', '#F43F5E', '#FB7185', 200, 30, 0, 1, 3),
          ('color', 'Emerald Glow', '#10B981', '#34D399', 150, 30, 0, 1, 4),
          ('color', 'Midnight Obsidian', '#0F172A', '#334155', 0, 0, 0, 1, 5),
          -- Page Background Images
          ('page_image', 'Default Dark Nebula', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80', NULL, 0, 0, 1, 1, 1),
          ('page_image', 'Cyberpunk City Grid', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80', NULL, 300, 30, 0, 1, 2),
          ('page_image', 'Deep Space Aurora', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80', NULL, 500, 30, 0, 1, 3),
          -- Bottom Sheet Images
          ('bottom_sheet_image', 'Default Frosted Glass', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80', NULL, 0, 0, 1, 1, 1),
          ('bottom_sheet_image', 'Dark Wave Texture', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80', NULL, 250, 30, 0, 1, 2),
          ('bottom_sheet_image', 'Golden Velvet Shimmer', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80', NULL, 400, 30, 0, 1, 3);
        `);
        console.log('✅ [DB Init] App Theme initial seeds created.');
      }
    } catch (e) {
      console.error('Seed theme error:', e.message);
    }

    // Live Continuous & Cumulative Streaming Duration Rewards Configuration & History
    await connection.query(`
      CREATE TABLE IF NOT EXISTS live_duration_reward_settings (
        id INT PRIMARY KEY DEFAULT 1,
        is_enabled TINYINT(1) NOT NULL DEFAULT 1,
        target_role VARCHAR(50) NOT NULL DEFAULT 'host',
        session_type ENUM('single_continuous', 'multiple_cumulative') NOT NULL DEFAULT 'single_continuous',
        min_sessions INT NOT NULL DEFAULT 1,
        required_minutes INT NOT NULL DEFAULT 60,
        reward_coins INT NOT NULL DEFAULT 300,
        target_audience ENUM('all', 'agency_hosts', 'all_hosts') NOT NULL DEFAULT 'all_hosts',
        max_rewards_per_day INT NOT NULL DEFAULT 1,
        title VARCHAR(150) NOT NULL DEFAULT 'Continuous Streaming Reward',
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure columns exist on already created tables
    try {
      const [colCheck] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'live_duration_reward_settings' AND COLUMN_NAME = 'target_role'
      `, [database]);
      if (!colCheck || colCheck.length === 0) {
        await connection.query(`
          ALTER TABLE live_duration_reward_settings
            ADD COLUMN target_role VARCHAR(50) NOT NULL DEFAULT 'host',
            ADD COLUMN session_type ENUM('single_continuous', 'multiple_cumulative') NOT NULL DEFAULT 'single_continuous',
            ADD COLUMN min_sessions INT NOT NULL DEFAULT 1;
        `);
      }
    } catch (err) {
      // Ignore if columns already present
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS live_duration_reward_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        room_id VARCHAR(64) NOT NULL,
        stream_id INT NULL,
        duration_minutes INT NOT NULL,
        duration_seconds INT NOT NULL,
        coins_awarded INT NOT NULL,
        target_role VARCHAR(50) NOT NULL DEFAULT 'host',
        target_audience VARCHAR(50) NOT NULL DEFAULT 'all_hosts',
        session_type VARCHAR(50) NOT NULL DEFAULT 'single_continuous',
        session_count INT NOT NULL DEFAULT 1,
        user_role VARCHAR(50) NOT NULL DEFAULT 'host',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_reward_user_created (user_id, created_at),
        INDEX idx_reward_created (created_at),
        INDEX idx_reward_room (room_id),
        UNIQUE KEY uniq_room_user_reward (room_id, user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      const [histColCheck] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'live_duration_reward_history' AND COLUMN_NAME = 'target_role'
      `, [database]);
      if (!histColCheck || histColCheck.length === 0) {
        await connection.query(`
          ALTER TABLE live_duration_reward_history
            ADD COLUMN target_role VARCHAR(50) NOT NULL DEFAULT 'host',
            ADD COLUMN session_type VARCHAR(50) NOT NULL DEFAULT 'single_continuous',
            ADD COLUMN session_count INT NOT NULL DEFAULT 1;
        `);
      }
    } catch (err) {
      // Ignore if already present
    }

    // Seed default settings row if missing
    try {
      await connection.query(`
        INSERT IGNORE INTO live_duration_reward_settings 
          (id, is_enabled, target_role, session_type, min_sessions, required_minutes, reward_coins, target_audience, max_rewards_per_day, title, description)
        VALUES 
          (1, 1, 'host', 'single_continuous', 1, 60, 300, 'all_hosts', 1, 'Continuous Streaming Reward', 'Reward hosts for streaming continuously in a single live session.');
      `);
      console.log('✅ [DB Init] Live Duration Reward settings table and default seed verified.');
    } catch (e) {
      console.error('Seed live duration settings error:', e.message);
    }

    // Ensure google_id exists in users table
    try {
      const [colCheck] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'google_id'
      `, [database]);
      if (!colCheck || colCheck.length === 0) {
        await connection.query(`
          ALTER TABLE \`users\` 
            ADD COLUMN google_id VARCHAR(191) NULL DEFAULT NULL,
            ADD INDEX idx_google_id (google_id);
        `);
      }
    } catch (err) {
      // Silently continue if already exists
    }

    // Ensure agency_host_requests table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS agency_host_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agency_id INT NOT NULL,
        user_id INT NOT NULL,
        host_type ENUM('video', 'audio') DEFAULT 'video',
        message TEXT,
        status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
        responded_by INT DEFAULT NULL,
        responded_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_agency_status (agency_id, status),
        INDEX idx_user (user_id),
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure posts, post_media, post_reactions, post_comments tables exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NULL,
        content TEXT NOT NULL,
        media_url VARCHAR(255) DEFAULT '',
        media_type ENUM('image','video','audio','multiple','none') DEFAULT 'none',
        media JSON NULL,
        likes_count INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS post_media (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        media_type ENUM('image', 'video', 'audio') NOT NULL,
        media_url TEXT NOT NULL,
        thumbnail_url TEXT NULL,
        duration INT DEFAULT 0,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_post_id (post_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS post_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        reaction_type VARCHAR(20) DEFAULT 'like',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_post_user (post_id, user_id),
        INDEX idx_reaction_post (post_id),
        INDEX idx_reaction_user (user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        parent_id INT NULL,
        content TEXT NOT NULL,
        media_url VARCHAR(255) NULL,
        likes_count INT DEFAULT 0,
        replies_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_comment_post (post_id),
        INDEX idx_comment_parent (parent_id),
        INDEX idx_comment_user (user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES post_comments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure conversations, chat_messages, and chat_message_media tables exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user1_id INT NOT NULL,
        user2_id INT NOT NULL,
        last_message TEXT,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        background_image TEXT NULL,
        background_color VARCHAR(64) NULL,
        background_updated_by INT NULL,
        background_updated_at TIMESTAMP NULL,
        user1_cleared_at TIMESTAMP NULL,
        user2_cleared_at TIMESTAMP NULL,
        user1_hidden TINYINT(1) DEFAULT 0,
        user2_hidden TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_pair (user1_id, user2_id),
        INDEX idx_user1 (user1_id),
        INDEX idx_user2 (user2_id),
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        reply_to_id INT NULL,
        message_type ENUM('text', 'image', 'video', 'audio', 'multiple') DEFAULT 'text',
        message TEXT NULL,
        media_url TEXT NULL,
        media JSON NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_sender_id (sender_id),
        INDEX idx_receiver_id (receiver_id),
        INDEX idx_reply_to_id (reply_to_id),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure columns exist if table was created in an older schema
    try {
      await connection.query(`
        ALTER TABLE conversations
        ADD COLUMN IF NOT EXISTS background_image TEXT NULL,
        ADD COLUMN IF NOT EXISTS background_color VARCHAR(64) NULL,
        ADD COLUMN IF NOT EXISTS background_updated_by INT NULL,
        ADD COLUMN IF NOT EXISTS background_updated_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS user1_cleared_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS user2_cleared_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS user1_hidden TINYINT(1) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS user2_hidden TINYINT(1) DEFAULT 0;
      `);
      await connection.query(`
        ALTER TABLE chat_messages 
        MODIFY COLUMN message TEXT NULL DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS reply_to_id INT NULL AFTER receiver_id,
        ADD COLUMN IF NOT EXISTS message_type ENUM('text', 'image', 'video', 'audio', 'multiple') DEFAULT 'text' AFTER receiver_id,
        ADD COLUMN IF NOT EXISTS media_url TEXT NULL AFTER message,
        ADD COLUMN IF NOT EXISTS media JSON NULL AFTER media_url;
      `);
    } catch {
      // Ignored if columns already present
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_message_media (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id INT NOT NULL,
        media_type ENUM('image', 'video', 'audio') NOT NULL,
        media_url TEXT NOT NULL,
        thumbnail_url TEXT NULL,
        file_name VARCHAR(255) NULL,
        file_size INT DEFAULT 0,
        duration INT DEFAULT 0,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_message_id (message_id),
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure banners table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        image_url TEXT NOT NULL,
        link_url VARCHAR(500) DEFAULT NULL,
        target_type VARCHAR(50) DEFAULT 'none',
        target_value VARCHAR(255) DEFAULT NULL,
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        start_date DATETIME DEFAULT NULL,
        end_date DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active_order (is_active, display_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Schema Migrations - Ensure newly added columns exist on existing tables (compatible with MySQL 5.7, 8.0, 8.4 & MariaDB)
    const safeAddColumn = async (table, column, colDef) => {
      try {
        const [existing] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [table, column]
        );
        if (!existing || existing.length === 0) {
          await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${colDef}`);
          console.log(`✅ [DB Migration] Added column ${column} to table ${table}`);
        }
      } catch (colErr) {
        if (colErr.errno !== 1060 && colErr.code !== 'ER_DUP_FIELDNAME') {
          console.warn(`[DB Migration Warning] Column ${table}.${column}:`, colErr.message);
        }
      }
    };

    const safeModifyColumn = async (table, column, colDef) => {
      try {
        await connection.query(`ALTER TABLE ${table} MODIFY COLUMN ${column} ${colDef}`);
      } catch (modErr) {
        console.warn(`[DB Migration Warning] Modify ${table}.${column}:`, modErr.message);
      }
    };

    await safeAddColumn('users', 'mobile_number', "VARCHAR(30) DEFAULT '' AFTER bio");
    await safeAddColumn('users', 'country', "VARCHAR(50) DEFAULT '' AFTER mobile_number");
    await safeAddColumn('users', 'star', "INT DEFAULT 0 AFTER level");
    await safeAddColumn('users', 'fcm_token', "VARCHAR(512) NULL");
    await safeAddColumn('live_rooms', 'live_type', "ENUM('video', 'audio') DEFAULT 'video' AFTER category");
    await safeAddColumn('live_rooms', 'total_seats', "INT DEFAULT 9 AFTER live_type");
    await safeAddColumn('live_rooms', 'background_image', "VARCHAR(255) DEFAULT '' AFTER cover_image");
    await safeAddColumn('live_rooms', 'is_comment_disabled', "BOOLEAN DEFAULT FALSE");
    await safeAddColumn('live_rooms', 'is_reaction_disabled', "BOOLEAN DEFAULT FALSE");
    await safeAddColumn('live_rooms', 'is_locked', "TINYINT(1) DEFAULT 0 AFTER is_reaction_disabled");
    await safeAddColumn('live_rooms', 'room_password', "VARCHAR(255) NULL DEFAULT NULL AFTER is_locked");
    await safeAddColumn('posts', 'title', "VARCHAR(255) NULL AFTER user_id");
    await safeAddColumn('posts', 'media', "JSON NULL AFTER media_type");
    await safeModifyColumn('posts', 'media_type', "ENUM('image','video','audio','multiple','none') DEFAULT 'none'");
    await safeAddColumn('special_thumbnails', 'is_custom', "TINYINT(1) NOT NULL DEFAULT 0");
    await safeAddColumn('special_thumbnails', 'uploader_id', "INT NULL");
    await safeAddColumn('privilege_packages', 'color', "VARCHAR(50) DEFAULT '#8b5cf6' AFTER description");

    // Seed Admin & Initial Data if users table is empty
    const [userRows] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      console.log('[DB Init] Seeding initial database records...');
      const adminPassHash = await bcrypt.hash('admin123', 10);
      const userPassHash = await bcrypt.hash('user123', 10);

      // Admin user
      await connection.query(`
        INSERT INTO users (email, password_hash, full_name, avatar_url, bio, role, coins, diamonds, level)
        VALUES 
        ('admin@umi.live', ?, 'System Admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'Super Administrator of Umi Live', 'superadmin', 100000, 50000, 99),
        ('nila@umi.live', ?, 'Nila Akter', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'Singer & Lifestyle Streamer 🎤', 'host', 5000, 18500, 15),
        ('rohan@umi.live', ?, 'Rohan Chowdhury', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Pro MLBB & Valorant Gamer 🎮', 'host', 8200, 24600, 22),
        ('tisha@umi.live', ?, 'Tisha Roy', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 'Daily acoustic songs & talk show ✨', 'host', 3100, 12400, 10),
        ('tanvir@umi.live', ?, 'Tanvir Ahmed', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'Live music enthusiast and top supporter', 'user', 25000, 450, 8);
      `, [adminPassHash, userPassHash, userPassHash, userPassHash, userPassHash]);

      // Seed Gifts
      await connection.query(`
        INSERT INTO gifts (name, icon_url, animation_type, coin_cost, diamond_reward, category)
        VALUES
        ('Rose', '🌹', 'float', 10, 5, 'Popular'),
        ('Heart', '💖', 'pulse', 50, 25, 'Popular'),
        ('Ice Cream', '🍦', 'float', 100, 50, 'Casual'),
        ('Crown', '👑', 'sparkle', 500, 250, 'VIP'),
        ('Sports Car', '🏎️', 'fullscreen', 1200, 600, 'Luxury'),
        ('Rocket', '🚀', 'fullscreen', 3000, 1500, 'Luxury'),
        ('Super Castle', '🏰', 'fullscreen', 5000, 2500, 'Luxury'),
        ('Golden Dragon', '🐉', 'fullscreen', 10000, 5000, 'Legendary');
      `);

      // Seed Coin Packages
      await connection.query(`
        INSERT INTO coin_packages (name, coins, price_usd, bonus_coins, badge)
        VALUES
        ('Starter Pack', 100, 0.99, 10, 'Starter'),
        ('Value Bundle', 500, 4.99, 80, 'Popular'),
        ('Pro Streamer', 1200, 9.99, 250, 'Best Value'),
        ('Diamond King', 6500, 49.99, 1500, 'Mega Bonus'),
        ('Ultimate VIP', 14000, 99.99, 4000, 'VIP Elite');
      `);

      // Seed Live Rooms
      await connection.query(`
        INSERT INTO live_rooms (room_id, host_id, title, category, cover_image, status, viewer_count, total_diamonds, stream_key)
        VALUES
        ('room-nila-101', 2, 'Friday Night Acoustic Live Session 🎸', 'Music', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', 'live', 428, 5420, 'sk_live_nila_9823'),
        ('room-rohan-202', 3, 'Mythical Glory Solo Rank Push! MLBB 🚀', 'Gaming', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400', 'live', 894, 9150, 'sk_live_rohan_4512'),
        ('room-tisha-303', 4, 'Chit-Chat & Q&A with Tisha ☕', 'Chatting', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', 'live', 215, 3120, 'sk_live_tisha_8731');
      `);

      // Seed Settings
      await connection.query(`
        INSERT INTO system_settings (key_name, key_value, description)
        VALUES
        ('diamond_to_usd_rate', '0.005', 'Conversion rate: USD per 1 diamond for host payouts'),
        ('min_withdrawal_diamonds', '1000', 'Minimum diamond balance required to request cashout'),
        ('withdrawal_presets', '[1000, 2000, 5000, 10000, 25000, 50000]', 'Preset diamond cashout options for hosts'),
        ('allow_manual_withdrawal_input', 'true', 'Whether users/hosts can input custom diamond amount for withdrawal'),
        ('recharge_presets', '[500, 1000, 2500, 5000, 10000, 50000, 100000]', 'Quick preset coin amounts for wallet recharge'),
        ('platform_name', 'Umi Live', 'Public platform display name'),
        ('maintenance_mode', 'false', 'Platform maintenance status flag'),
        ('live_stream_provider', 'livekit', 'Streaming WebRTC/RTMP backend provider'),
        ('action_security_password', 'admin123', 'Security action password required for coin recharge and balance deductions'),
        ('is_convert_to_diamond', 'true', 'Master economy mode: true for diamond conversion, false for direct coin commission mode'),
        ('coin_to_diamond_ratio', '1.0', 'Conversion ratio: diamonds awarded per 1 coin sent'),
        ('admin_gift_commission_percent', '15.0', 'Admin commission percentage on coin gifts when diamond mode is false'),
        ('agency_gift_commission_percent', '10.0', 'Agency commission percentage on host coin gifts when diamond mode is false'),
        ('user_transfer_commission_percent', '5.0', 'Admin commission percentage on peer-to-peer coin transfers'),
        ('custom_thumbnail_upload_coin_cost', '500', 'Required coin balance deducted when a user uploads a custom room background thumbnail'),
        ('custom_thumbnail_validity_days', '30', 'Default validity duration in days for user-uploaded custom thumbnails'),
        ('custom_thumbnail_pricing_tiers', '[{\"days\": 7, \"coins\": 200}, {\"days\": 15, \"coins\": 350}, {\"days\": 30, \"coins\": 500}, {\"days\": 90, \"coins\": 1200}]', 'Dynamic pricing tiers (days vs coins) for user-uploaded custom room background thumbnails'),
        ('livekit_url', 'wss://snlive-y3r75itj.livekit.cloud', 'LiveKit Cloud or Self-hosted WebSocket URL for WebRTC room media'),
        ('livekit_api_key', 'APInTHjZ4pwntq4', 'LiveKit Project API Key for generating access tokens'),
        ('livekit_api_secret', 'euPgL1zVA1nD0GeorSxn9amK7PayQg0nnoliE4e9xWlB', 'LiveKit Project API Secret for token signing'),
        ('call_audio_rate_per_minute', '20', 'Default coin cost per minute for 1-on-1 audio call in direct messages'),
        ('call_video_rate_per_minute', '50', 'Default coin cost per minute for 1-on-1 video call in direct messages'),
        ('call_video_live_rate_per_minute', '30', 'Coin cost per minute for Video Live seat interaction or private call'),
        ('call_min_balance_to_start', '20', 'Minimum coin balance required for a caller to initiate a 1-on-1 call'),
        ('call_receiver_earnings_percent', '70', 'Percentage of call coins awarded to call receiver as diamonds'),
        ('call_is_enabled', 'true', 'Master switch to enable or disable 1-on-1 direct audio and video calls')
        ON DUPLICATE KEY UPDATE key_value = VALUES(key_value);
      `);

      // Ensure mobile_number, country, star columns exist in users
      try {
        await connection.query("ALTER TABLE users ADD COLUMN mobile_number VARCHAR(30) DEFAULT '' AFTER bio;");
      } catch (e) { }
      try {
        await connection.query("ALTER TABLE users ADD COLUMN country VARCHAR(50) DEFAULT '' AFTER mobile_number;");
      } catch (e) { }
      try {
        await connection.query("ALTER TABLE users ADD COLUMN star INT DEFAULT 0 AFTER level;");
      } catch (e) { }
      try {
        await connection.query("ALTER TABLE withdrawals ADD COLUMN coin_amount INT DEFAULT 0 AFTER diamond_amount;");
      } catch (e) { }

      // Seed a sample withdrawal request
      await connection.query(`
        INSERT INTO withdrawals (host_id, diamond_amount, usd_amount, payment_method, account_details, status, admin_notes)
        VALUES
        (2, 5000, 25.00, 'bKash', '01700000000 (Personal)', 'pending', 'First withdrawal application for Nila Akter');
      `);

      console.log('[DB Init] Database schema and seed successfully initialized.');
    }

    // Seed Package Categories and Privilege Packages if empty
    const [pkgCatRows] = await connection.query('SELECT COUNT(*) as count FROM package_categories');
    if (pkgCatRows[0].count === 0) {
      console.log('[DB Init] Seeding package categories & packages...');
      await connection.query(`
        INSERT INTO package_categories (id, name, badge_icon, color_code, display_order, cant_be_removed, cant_be_banned, self_seat_accept, top_live_list, anti_mute, special_entry, custom_privileges, is_active)
        VALUES 
        (1, 'Royal Crown VIP', '👑', '#f59e0b', 1, 1, 1, 1, 1, 1, 0, JSON_ARRAY(), 1),
        (2, 'King VIP', '⚡', '#8b5cf6', 2, 1, 1, 1, 1, 0, 0, JSON_ARRAY(), 1),
        (3, 'Knight VIP', '🛡️', '#3b82f6', 3, 1, 0, 1, 0, 0, 0, JSON_ARRAY(), 1);
      `);

      await connection.query(`
        INSERT INTO privilege_packages (category_id, name, image_url, validity_days, price, currency, description, is_active)
        VALUES
        (1, 'Royal 30-Day Pass', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300', 30, 50000, 'coins', '30 days of supreme Royal VIP status and privileges.', 1),
        (1, 'Royal Quarter Pass (90 Days)', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300', 90, 135000, 'coins', '90 days of Royal Crown VIP privilege benefits with 10% discount.', 1),
        (1, 'Royal Annual Majesty (365 Days)', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300', 365, 480000, 'coins', 'Full year of ultimate Royal privileges, supreme entrance animations, and top tier status.', 1),
        (2, 'King 7-Day Trial', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300', 7, 5000, 'coins', '7-day starter pack for King VIP privilege tier.', 1),
        (2, 'King 30-Day Pass', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300', 30, 18000, 'coins', '30-day King VIP membership with anti-kick and VIP entrance.', 1),
        (2, 'King 90-Day Pass', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300', 90, 48000, 'coins', '90-day King VIP membership with discounted pricing.', 1),
        (3, 'Knight 7-Day Pass', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300', 7, 2000, 'coins', '7-day Knight privilege pass.', 1),
        (3, 'Knight 30-Day Pass', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300', 30, 7000, 'coins', 'Monthly Knight pass with anti-kick and special entry.', 1);
      `);
    }

    // Seed Banners if empty
    const [bannerRows] = await connection.query('SELECT COUNT(*) as count FROM banners');
    if (bannerRows[0].count === 0) {
      console.log('[DB Init] Seeding promotional banners...');
      await connection.query(`
        INSERT INTO banners (title, image_url, link_url, target_type, target_value, display_order, is_active)
        VALUES
        ('Grand Umi PK Tournament 🏆', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1000&auto=format&fit=crop&q=80', '', 'live_room', 'room-rohan-202', 1, 1),
        ('Royal Crown VIP Membership 👑', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1000&auto=format&fit=crop&q=80', '', 'vip', '1', 2, 1),
        ('Weekend Coin Recharge Mega Bonus +25% 🪙', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=1000&auto=format&fit=crop&q=80', '', 'recharge', 'packages', 3, 1),
        ('Official Agency Recruitment Program ✨', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80', '', 'agency', 'apply', 4, 1);
      `);
    }

    // Seed Entry Effects if empty
    const [entryEffectRows] = await connection.query('SELECT COUNT(*) as count FROM entry_effects');
    if (entryEffectRows[0].count === 0) {
      console.log('[DB Init] Seeding entry effects...');
      await connection.query(`
        INSERT INTO entry_effects (name, effect_type, preview_image_url, svga_url, gif_url, sound_url, price, validity_days, is_active)
        VALUES 
        ('Golden Dragon Arrival', 'svga', '/uploads/gifts/sports_car_thumb_1791794086432-13704975.png', '/uploads/gifts/sports_car_anim_1791794086435-998043722.svga', '/uploads/gifts/fire_dragon_anim_1791794086443-492844523.gif', '/uploads/gifts/dragon_roar_1791794086446-125382975.mp3', 1000, 30, 1),
        ('Cyber Supercar Entrance', 'svga', '/uploads/gifts/sports_car_thumb_1791794056867-245337673.png', '/uploads/gifts/sports_car_anim_1791794056871-502798849.svga', '/uploads/gifts/fire_dragon_anim_1791794086443-492844523.gif', NULL, 2500, 30, 1),
        ('Pegasus Wings Glory', 'gif', '/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png', NULL, '/uploads/gifts/fire_dragon_anim_1791794086443-492844523.gif', NULL, 5000, 60, 1);
      `);
    }

    // Seed Special Thumbnails if empty
    const [thumbRows] = await connection.query('SELECT COUNT(*) as count FROM special_thumbnails');
    if (thumbRows[0].count === 0) {
      console.log('[DB Init] Seeding special avatar thumbnails...');
      await connection.query(`
        INSERT INTO special_thumbnails (name, image_url, price, validity_days, is_active)
        VALUES 
        ('Kawaii Princess Avatar Frame', '/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png', 500, 30, 1),
        ('Golden Dragon Avatar Frame', '/uploads/gifts/sports_car_thumb_1791794086432-13704975.png', 1500, 30, 1),
        ('Cyber Neon Glow Frame', '/uploads/thumbnails/test_thumb_1791720885105-621496700.png', 3000, 60, 1);
      `);
    }

    // 16. Ensure user_fcm_tokens table and users.fcm_token column exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_fcm_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        fcm_token VARCHAR(512) NOT NULL,
        device_type ENUM('android', 'ios', 'web') DEFAULT 'android',
        device_name VARCHAR(100) NULL,
        is_active TINYINT(1) DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_fcm (user_id, fcm_token(255)),
        INDEX idx_fcm_user (user_id),
        INDEX idx_fcm_token (fcm_token(255)),
        INDEX idx_user_active (user_id, is_active),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 17. Ensure user_blocks table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        blocker_id INT NOT NULL,
        blocked_id INT NOT NULL,
        reason VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_block (blocker_id, blocked_id),
        INDEX idx_blocker (blocker_id),
        INDEX idx_blocked (blocked_id),
        FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Big Data Performance Indexing Helper
    const safeAddIndex = async (table, indexName, indexDef, isFulltext = false) => {
      try {
        const [existing] = await connection.query(
          'SHOW INDEX FROM ' + table + ' WHERE Key_name = ?',
          [indexName]
        );
        if (!existing || existing.length === 0) {
          const typeStr = isFulltext ? 'FULLTEXT INDEX' : 'INDEX';
          await connection.query(`ALTER TABLE ${table} ADD ${typeStr} ${indexName} ${indexDef}`);
        }
      } catch { }
    };

    // Fast Searching & Scalability Indexes
    await safeAddIndex('users', 'idx_users_full_name', '(full_name)');
    await safeAddIndex('users', 'idx_users_role', '(role)');
    await safeAddIndex('users', 'idx_users_level', '(level)');
    await safeAddIndex('users', 'idx_users_is_banned', '(is_banned)');
    await safeAddIndex('users', 'idx_users_created_at', '(created_at)');
    await safeAddIndex('users', 'idx_users_fcm', '(fcm_token(255))');
    await safeAddIndex('users', 'idx_users_search_ft', '(full_name)', true);

    await safeAddIndex('chat_messages', 'idx_conv_created', '(conversation_id, created_at)');
    await safeAddIndex('chat_messages', 'idx_receiver_unread', '(receiver_id, is_read)');
    await safeAddIndex('chat_messages', 'idx_sender_created', '(sender_id, created_at)');
    await safeAddIndex('chat_messages', 'idx_chat_msg_ft', '(message)', true);

    await safeAddIndex('conversations', 'idx_conv_last_msg', '(last_message_at)');

    await safeAddIndex('live_rooms', 'idx_rooms_status_type', '(status, live_type)');
    await safeAddIndex('live_rooms', 'idx_rooms_status_cat', '(status, category)');
    await safeAddIndex('live_rooms', 'idx_rooms_viewers', '(viewer_count)');
    await safeAddIndex('live_rooms', 'idx_rooms_started', '(started_at)');
    await safeAddIndex('live_rooms', 'idx_rooms_title_ft', '(title)', true);

    await safeAddIndex('live_room_viewers', 'idx_viewers_room_user', '(room_id, user_id)');
    await safeAddIndex('live_room_viewers', 'idx_viewers_active', '(last_active_at)');

    await safeAddIndex('live_room_seats', 'idx_seats_room_num', '(room_id, seat_number)');
    await safeAddIndex('live_room_seats', 'idx_seats_user', '(user_id)');

    await connection.end();
    return true;
  } catch (error) {
    console.error('[DB Init Error]:', error.message);
    if (connection) {
      await connection.end().catch(() => { });
    }
    return false;
  }
}

if (process.argv[1]?.endsWith('init.js') || process.argv[1]?.endsWith('seed.js')) {
  initializeDatabase().then(() => {
    console.log('[DB Init Script] Done.');
    process.exit(0);
  });
}
