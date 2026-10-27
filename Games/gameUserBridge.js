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

module.exports = {
  getUser,
  deductCoins,
  addCoins,
  getTodayProfit,
};
