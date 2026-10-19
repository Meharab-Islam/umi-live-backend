-- UMI LIVE DATABASE SCHEMA
CREATE DATABASE IF NOT EXISTS umi_live CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE umi_live;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) DEFAULT '',
  avatar_url MEDIUMTEXT,
  bio TEXT,
  mobile_number VARCHAR(30) DEFAULT '',
  country VARCHAR(50) DEFAULT '',
  role ENUM('user', 'host', 'agency', 'moderator', 'reseller', 'admin', 'superadmin') DEFAULT 'user',
  host_type ENUM('video', 'audio', 'none') DEFAULT 'video',
  agency_id INT NULL,
  agency_joined_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  coins INT DEFAULT 100,
  diamonds INT DEFAULT 0,
  level INT DEFAULT 1,
  star INT DEFAULT 0,
  vip_package VARCHAR(50) DEFAULT 'Standard',
  is_banned BOOLEAN DEFAULT FALSE,
  broadcast_banned_until TIMESTAMP NULL DEFAULT NULL,
  broadcast_ban_reason VARCHAR(255) NULL DEFAULT NULL,
  broadcast_banned_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Agencies Table
CREATE TABLE IF NOT EXISTS agencies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agency_code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  owner_id INT NOT NULL,
  commission_rate DECIMAL(5, 2) DEFAULT 10.00,
  status ENUM('active', 'inactive') DEFAULT 'active',
  contact_phone VARCHAR(50) DEFAULT '',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Agency Host Join Applications & Recruitment
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

-- Live Rooms Table
CREATE TABLE IF NOT EXISTS live_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL UNIQUE,
  host_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(50) DEFAULT 'Chatting',
  live_type ENUM('video', 'audio') DEFAULT 'video',
  total_seats INT DEFAULT 8,
  cover_image VARCHAR(255) DEFAULT '',
  background_image VARCHAR(255) DEFAULT '',
  status ENUM('live', 'ended', 'blocked') DEFAULT 'live',
  viewer_count INT DEFAULT 0,
  total_diamonds INT DEFAULT 0,
  stream_key VARCHAR(100),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Live Room Multi-Seat Management
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

-- Live Room Active Viewers / Participants
CREATE TABLE IF NOT EXISTS live_room_viewers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_room_user (room_id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Live Room Seat Requests (Video / Audio Multi-seat Requests)
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

-- Live Room Assigned Admins / Moderators
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

-- Gifts Catalog
CREATE TABLE IF NOT EXISTS gifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  icon_url VARCHAR(255) NOT NULL,
  animation_type VARCHAR(50) DEFAULT 'simple',
  coin_cost INT NOT NULL,
  diamond_reward INT NOT NULL,
  category VARCHAR(50) DEFAULT 'Popular',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Gift Transactions (Live Gifting Log)
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

-- Coin Packages for Top-up
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

-- Wallet / Balance Transactions
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

-- Withdrawal Requests for Hosts
CREATE TABLE IF NOT EXISTS withdrawals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  host_id INT NOT NULL,
  diamond_amount INT NOT NULL,
  usd_amount DECIMAL(10, 2) NOT NULL,
  payout_amount DECIMAL(12, 2) DEFAULT 0.00,
  payout_currency VARCHAR(10) DEFAULT 'BDT',
  host_type ENUM('video', 'audio') DEFAULT 'video',
  payment_method VARCHAR(50) NOT NULL,
  account_details VARCHAR(255) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Host Recruitment / Joining Requests
CREATE TABLE IF NOT EXISTS host_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  agency_id INT NULL,
  host_type ENUM('video', 'audio') DEFAULT 'video',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  notes TEXT NULL,
  admin_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Moderation Reports
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

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  key_name VARCHAR(50) PRIMARY KEY,
  key_value TEXT NOT NULL,
  description VARCHAR(255)
);

-- User Community Posts
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  media_url VARCHAR(255) DEFAULT '',
  media_type ENUM('image', 'video', 'none') DEFAULT 'none',
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Conversations Thread
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
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Chat Messages Log
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
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reseller Sales & Coin Transfers
CREATE TABLE IF NOT EXISTS reseller_sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reseller_id INT NOT NULL,
  buyer_id INT NOT NULL,
  coin_amount INT NOT NULL,
  price_amount DECIMAL(10, 2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'BDT',
  notes VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- VIP & Privilege Package Categories
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

-- Privilege Packages under Categories
CREATE TABLE IF NOT EXISTS privilege_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  image_url VARCHAR(255) DEFAULT '',
  validity_days INT NOT NULL DEFAULT 30,
  price INT NOT NULL DEFAULT 1000,
  currency VARCHAR(20) DEFAULT 'coins',
  description TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES package_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Package Subscriptions & Active Privileges
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

-- Special Thumbnails & Badges
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
  INDEX idx_uploader (uploader_id),
  FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Owned Thumbnails
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

-- Special Entry Effects
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

-- User Owned Entry Effects
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

-- App Promotional & Live Event Banners
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

-- Account Merges & Lost Email Transfer Audit Logs
CREATE TABLE IF NOT EXISTS account_merges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_user_id INT NOT NULL,
  source_old_email VARCHAR(150) NOT NULL,
  target_user_id INT NOT NULL,
  target_new_email VARCHAR(150) NOT NULL,
  admin_id INT DEFAULT NULL,
  details JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_source (source_user_id),
  INDEX idx_target (target_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Mobile Devices & Hardware Ban Control
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

-- User Follows & Social Graph Table
CREATE TABLE IF NOT EXISTS user_follows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  follower_id INT NOT NULL,
  following_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_follow (follower_id, following_id),
  INDEX idx_follower (follower_id),
  INDEX idx_following (following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Blocks Table
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



