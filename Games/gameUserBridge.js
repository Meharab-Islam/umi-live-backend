const path = require('path');
let dotenv = null;
const dotenvPaths = [
  'dotenv',
  '/app/node_modules/dotenv',
  path.resolve(__dirname, '../backend/node_modules/dotenv'),
];
for (const p of dotenvPaths) {
  try {
    dotenv = require(p);
    break;
  } catch (_) {}
}

if (dotenv) {
  // Load environment variables across possible paths
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config();
}

let mysql = null;
const candidatePaths = [
  'mysql2/promise',
  '/app/node_modules/mysql2/promise',
  path.resolve(__dirname, '../backend/node_modules/mysql2/promise'),
  path.resolve(__dirname, './slote_mecine/backend/node_modules/mysql2/promise'),
];

for (const p of candidatePaths) {
  try {
    mysql = require(p);
    break;
  } catch (_) {}
}

let pool = null;
if (mysql) {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'umi_user',
      password: process.env.DB_PASSWORD || 'umi_password',
      database: process.env.DB_NAME || 'umi_live',
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 5000,
    });
    console.log('✅ [gameUserBridge] MySQL connection pool ready');
  } catch (err) {
    console.warn('⚠️ [gameUserBridge] MySQL pool initialization error:', err.message);
  }
} else {
  console.warn('⚠️ [gameUserBridge] mysql2 module not found in candidate paths');
}

let redisClient = null;
try {
  let Redis = null;
  const redisPaths = [
    'ioredis',
    '/app/node_modules/ioredis',
    path.resolve(__dirname, '../backend/node_modules/ioredis'),
  ];
  for (const p of redisPaths) {
    try {
      Redis = require(p);
      break;
    } catch (_) {}
  }
  if (Redis) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    redisClient.connect().catch(() => {});
  }
} catch (_) {}

function invalidateUserCache(userId) {
  if (!redisClient || !userId) return;
  const prefix = process.env.REDIS_KEY_PREFIX || `${process.env.PROJECT_NAME || 'umi'}:`;
  try {
    redisClient.del(`${prefix}user:${userId}`).catch(() => {});
    redisClient.del(`${prefix}user:balance:${userId}`).catch(() => {});
  } catch (_) {}
}

/**
 * Fetch real user details and current coin balance from MySQL database
 */
async function getUser(userId) {
  if (!pool || !userId) return null;
  const numId = parseInt(userId, 10);

  try {
    let rows = [];
    if (!isNaN(numId) && numId > 0) {
      const [result] = await pool.query(
        'SELECT id, email, full_name, coins, diamonds, avatar_url, is_banned FROM users WHERE id = ?',
        [numId]
      );
      rows = result;
    }

    if ((!rows || rows.length === 0) && typeof userId === 'string' && userId.includes('@')) {
      const [result] = await pool.query(
        'SELECT id, email, full_name, coins, diamonds, avatar_url, is_banned FROM users WHERE email = ?',
        [userId.trim()]
      );
      rows = result;
    }

    if (rows && rows.length > 0) {
      const u = rows[0];
      const coinBalance = Math.max(0, parseInt(u.coins, 10) || 0);
      const diamondBalance = Math.max(0, parseInt(u.diamonds, 10) || 0);
      const name = u.full_name || u.email?.split('@')[0] || 'Player';

      return {
        _id: String(u.id),
        id: u.id,
        name,
        username: name,
        diamond: coinBalance, // Teen Patti, Ferry Wheel, Greedy Baby render diamond as active balance
        rCoin: coinBalance,
        coins: coinBalance,
        balance: coinBalance, // Big Eater & Slot Machine use balance
        diamonds: diamondBalance,
        avatar: u.avatar_url || '😎',
        gameBlock: Boolean(u.is_banned),
        isRealUser: true,
        save: async () => {}, // Mock save method to prevent crash in legacy code
      };
    }
  } catch (err) {
    console.warn(`[gameUserBridge] getUser(${userId}) failed:`, err.message);
  }
  return null;
}

/**
 * Deduct coins from MySQL database (Atomic Database-First Mutation)
 */
async function deductCoins(userId, amount, gameSlug = 'mini_game', description = '') {
  if (!pool || !userId) return false;
  const numId = parseInt(userId, 10);
  const amt = Math.abs(parseInt(amount, 10));
  if (isNaN(numId) || numId <= 0 || isNaN(amt) || amt <= 0) return false;

  try {
    const [res] = await pool.query(
      'UPDATE users SET coins = GREATEST(0, coins - ?) WHERE id = ? AND coins >= ?',
      [amt, numId, amt]
    );

    if (res.affectedRows > 0) {
      invalidateUserCache(numId);
      try {
        await pool.query(
          `INSERT INTO transactions (user_id, type, amount, description, status) 
           VALUES (?, ?, ?, ?, 'completed')`,
          [numId, `game_${gameSlug}_bet`, amt, description || `Bet on ${gameSlug}`]
        );
      } catch (_) {}
      return true;
    }
  } catch (err) {
    console.warn(`[gameUserBridge] deductCoins(${userId}, ${amount}) error:`, err.message);
  }
  return false;
}

/**
 * Add won coins to MySQL database (Database-First Mutation)
 */
async function addCoins(userId, amount, gameSlug = 'mini_game', description = '') {
  if (!pool || !userId) return false;
  const numId = parseInt(userId, 10);
  const amt = Math.abs(parseInt(amount, 10));
  if (isNaN(numId) || numId <= 0 || isNaN(amt) || amt <= 0) return false;

  try {
    const [res] = await pool.query(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [amt, numId]
    );

    if (res.affectedRows > 0) {
      invalidateUserCache(numId);
      try {
        await pool.query(
          `INSERT INTO transactions (user_id, type, amount, description, status) 
           VALUES (?, ?, ?, ?, 'completed')`,
          [numId, `game_${gameSlug}_win`, amt, description || `Win on ${gameSlug}`]
        );
      } catch (_) {}
      return true;
    }
  } catch (err) {
    console.warn(`[gameUserBridge] addCoins(${userId}, ${amount}) error:`, err.message);
  }
  return false;
}

/**
 * Get user today profit for games that show daily profit (e.g. Ferry Wheel, Big Eater)
 */
async function getTodayProfit(userId, gameSlug = null) {
  if (!pool || !userId) return 0;
  const numId = parseInt(userId, 10);
  if (isNaN(numId) || numId <= 0) return 0;

  try {
    const [wins] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_win 
       FROM transactions 
       WHERE user_id = ? AND type LIKE '%_win' 
       AND created_at >= CURDATE()`,
      [numId]
    );
    const [bets] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_bet 
       FROM transactions 
       WHERE user_id = ? AND type LIKE '%_bet' 
       AND created_at >= CURDATE()`,
      [numId]
    );

    const net = (parseInt(wins[0]?.total_win, 10) || 0) - (parseInt(bets[0]?.total_bet, 10) || 0);
    return Math.max(0, net);
  } catch (_) {
    return 0;
  }
}

/**
 * Save mini game round results into MySQL mini_game_rounds
 */
async function saveRound({ gameSlug, roundNumber, winnerOutcome, totalBets = 0, totalPayout = 0, details = null }) {
  if (!pool) return null;
  try {
    const [res] = await pool.query(
      `INSERT INTO mini_game_rounds (game_slug, round_number, winner_outcome, total_bets, total_payout, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        gameSlug,
        roundNumber || Date.now(),
        String(winnerOutcome ?? ''),
        Math.max(0, parseInt(totalBets, 10) || 0),
        Math.max(0, parseInt(totalPayout, 10) || 0),
        details ? JSON.stringify(details) : null,
      ]
    );
    return res.insertId;
  } catch (err) {
    console.warn(`[gameUserBridge] saveRound(${gameSlug}) error:`, err.message);
    return null;
  }
}

/**
 * Save user bet into MySQL mini_game_bets
 */
async function saveBet({ userId, gameSlug, roundId = null, betAmount = 0, winAmount = 0, selection = null, multiplier = 1.0, status = 'pending' }) {
  if (!pool || !userId) return null;
  const numId = parseInt(userId, 10);
  if (isNaN(numId) || numId <= 0) return null;

  try {
    const [res] = await pool.query(
      `INSERT INTO mini_game_bets (user_id, game_slug, round_id, bet_amount, win_amount, selection, multiplier, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numId,
        gameSlug,
        roundId ? String(roundId) : null,
        Math.max(0, parseInt(betAmount, 10) || 0),
        Math.max(0, parseInt(winAmount, 10) || 0),
        selection ? String(selection) : null,
        parseFloat(multiplier) || 1.0,
        status || 'pending',
      ]
    );
    return res.insertId;
  } catch (err) {
    console.warn(`[gameUserBridge] saveBet(${userId}, ${gameSlug}) error:`, err.message);
    return null;
  }
}

/**
 * Fetch recent rounds for a game from MySQL mini_game_rounds
 */
async function getRecentRounds(gameSlug, limit = 10) {
  if (!pool) return [];
  try {
    const [rows] = await pool.query(
      `SELECT id, game_slug, round_number, winner_outcome, total_bets, total_payout, details, created_at
       FROM mini_game_rounds
       WHERE game_slug = ?
       ORDER BY id DESC
       LIMIT ?`,
      [gameSlug, Math.max(1, parseInt(limit, 10) || 10)]
    );
    return rows.map((r) => {
      let details = null;
      if (r.details) {
        try {
          details = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
        } catch (_) {}
      }
      return { ...r, details };
    });
  } catch (err) {
    console.warn(`[gameUserBridge] getRecentRounds(${gameSlug}) error:`, err.message);
    return [];
  }
}

/**
 * Fetch recent winning outcomes array (e.g. for roulette numbers or wheel history)
 */
async function getLastWinningOutcomes(gameSlug, limit = 20) {
  const rounds = await getRecentRounds(gameSlug, limit);
  return rounds.map((r) => {
    const val = r.winner_outcome;
    return !isNaN(Number(val)) ? Number(val) : val;
  });
}

/**
 * Fetch settings from MySQL mini_games
 */
async function getGameSettings(gameSlug, defaultSettings = {}) {
  if (!pool) return defaultSettings;
  try {
    const [rows] = await pool.query(
      `SELECT settings FROM mini_games WHERE slug = ?`,
      [gameSlug]
    );
    if (rows && rows.length > 0 && rows[0].settings) {
      return typeof rows[0].settings === 'string'
        ? JSON.parse(rows[0].settings)
        : rows[0].settings;
    }
  } catch (err) {
    console.warn(`[gameUserBridge] getGameSettings(${gameSlug}) error:`, err.message);
  }
  return defaultSettings;
}

/**
 * Save settings to MySQL mini_games
 */
async function updateGameSettings(gameSlug, settings) {
  if (!pool || !settings) return false;
  try {
    await pool.query(
      `UPDATE mini_games SET settings = ? WHERE slug = ?`,
      [JSON.stringify(settings), gameSlug]
    );
    return true;
  } catch (err) {
    console.warn(`[gameUserBridge] updateGameSettings(${gameSlug}) error:`, err.message);
    return false;
  }
}

// In-memory admin coin pool per game (fallback & cache)
const adminCoinPool = {
  teenpatti: 100000000,
  roulettecasino: 100000000,
  ferrywheel: 100000000,
  greedybaby: 100000000,
  greedylion: 100000000,
};

async function getAdminCoin(gameSlug) {
  return adminCoinPool[gameSlug] || 100000000;
}

async function updateAdminCoin(gameSlug, amount) {
  adminCoinPool[gameSlug] = (adminCoinPool[gameSlug] || 100000000) + (parseInt(amount, 10) || 0);
  return adminCoinPool[gameSlug];
}

async function getUserGameBets(userId, gameSlug, limit = 50) {
  if (!pool || !userId) return [];
  const numId = parseInt(userId, 10);
  if (isNaN(numId) || numId <= 0) return [];
  try {
    const [rows] = await pool.query(
      `SELECT id, round_id, bet_amount as Bit, selection as selectedFrame, multiplier as winnerNumberTimes, win_amount, status, created_at as createdAt
       FROM mini_game_bets
       WHERE user_id = ? AND game_slug = ?
       ORDER BY id DESC
       LIMIT ?`,
      [numId, gameSlug, Math.max(1, parseInt(limit, 10) || 50)]
    );
    return rows.map((r) => ({
      ...r,
      selectedFrame: !isNaN(Number(r.selectedFrame)) ? Number(r.selectedFrame) : r.selectedFrame,
      isWinner: r.win_amount > 0 || r.status === 'won',
    }));
  } catch (err) {
    console.warn(`[gameUserBridge] getUserGameBets error:`, err.message);
    return [];
  }
}

module.exports = {
  pool,
  getUser,
  deductCoins,
  addCoins,
  getTodayProfit,
  saveRound,
  saveBet,
  getRecentRounds,
  getLastWinningOutcomes,
  getGameSettings,
  updateGameSettings,
  getAdminCoin,
  updateAdminCoin,
  getUserGameBets,
};

