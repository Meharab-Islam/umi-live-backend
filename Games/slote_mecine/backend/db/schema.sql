-- Slot Machine Game Database Schema
CREATE DATABASE IF NOT EXISTS slotgame CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE slotgame;

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL,
  balance BIGINT DEFAULT 1000000,
  total_won BIGINT DEFAULT 0,
  total_bet BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_player_id (player_id)
) ENGINE=InnoDB;

-- Game rounds table
CREATE TABLE IF NOT EXISTS game_rounds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  round_number INT NOT NULL,
  jackpot_amount BIGINT NOT NULL,
  result_grid JSON NOT NULL,
  multiplier INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_round_number (round_number)
) ENGINE=InnoDB;

-- Bets table
CREATE TABLE IF NOT EXISTS bets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id VARCHAR(64) NOT NULL,
  round_number INT NOT NULL,
  bet_amount BIGINT NOT NULL,
  win_amount BIGINT DEFAULT 0,
  is_win BOOLEAN DEFAULT FALSE,
  result_detail JSON,
  placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_player_bets (player_id),
  INDEX idx_round_bets (round_number)
) ENGINE=InnoDB;

-- Jackpot state table
CREATE TABLE IF NOT EXISTS jackpot_state (
  id INT PRIMARY KEY DEFAULT 1,
  amount BIGINT DEFAULT 1887773133,
  round_number INT DEFAULT 2165,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert initial jackpot state
INSERT IGNORE INTO jackpot_state (id, amount, round_number) VALUES (1, 1887773133, 2165);

-- Game config table
CREATE TABLE IF NOT EXISTS game_config (
  config_key VARCHAR(64) PRIMARY KEY,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO game_config VALUES
  ('spin_interval_ms', '5000', NOW()),
  ('jackpot_increment_per_bet', '1000', NOW()),
  ('house_edge', '0.05', NOW()),
  ('auto_spin_interval', '3000', NOW());

-- Registered webhooks table for external apps and backends
CREATE TABLE IF NOT EXISTS webhooks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  webhook_id VARCHAR(64) NOT NULL UNIQUE,
  url VARCHAR(512) NOT NULL UNIQUE,
  secret VARCHAR(128) DEFAULT NULL,
  events JSON DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  success_count INT DEFAULT 0,
  fail_count INT DEFAULT 0,
  last_status INT NULL DEFAULT NULL,
  last_dispatched_at TIMESTAMP NULL DEFAULT NULL,
  last_error TEXT NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

