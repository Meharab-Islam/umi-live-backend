import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool, query } from '../config/db.js';
import { cache } from '../config/redis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);
const PROJECT_NAME = process.env.PROJECT_NAME || 'umi';

export const GAME_EVENTS_CHANNEL = `${PROJECT_NAME}:game_events`;
export const GAME_ADMIN_CHANNEL = `${PROJECT_NAME}:game_admin`;

let publisher = null;
let subscriber = null;
let isReady = false;

function createClient(name) {
  const client = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD || undefined,
    db: REDIS_DB,
    enableOfflineQueue: false,
    retryStrategy(times) {
      return Math.min(times * 1000, 5000);
    },
    lazyConnect: true,
  });

  client.on('error', (err) => {
    // Non-blocking log to ensure fail-safe degradation
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Redis Pub/Sub ${name}] connection warning:`, err.message);
    }
  });

  return client;
}

/**
 * Initialize Redis Pub/Sub Bridge
 * Connects Publisher and Subscriber clients, listens for game events across isolated socket servers,
 * performs database-first coin updates, and broadcasts announcements to all mobile users.
 */
export async function initPubSub(io) {
  try {
    publisher = createClient('Publisher');
    subscriber = createClient('Subscriber');

    await Promise.all([publisher.connect().catch(() => {}), subscriber.connect().catch(() => {})]);

    if (subscriber.status === 'ready' && publisher.status === 'ready') {
      isReady = true;
      console.log(`📡 [Redis Pub/Sub] Connected successfully on host ${REDIS_HOST}:${REDIS_PORT}`);

      await subscriber.subscribe(GAME_EVENTS_CHANNEL, GAME_ADMIN_CHANNEL);

      subscriber.on('message', async (channel, message) => {
        try {
          const parsed = JSON.parse(message);
          const { event, data } = parsed || {};

          // ─── 1. Real-Time Game Bet Placed (Coin Deduction) ─────────────────────
          if (event === 'game:user:bet') {
            await handleUserBet(data, io);
          }

          // ─── 2. Real-Time Game Win Settled (Coin Credit) ────────────────────────
          if (event === 'game:user:win') {
            await handleUserWin(data, io);
          }

          // ─── 3. Winner / Jackpot Announcement Across All Live Rooms ────────────
          if (event === 'game:announcement') {
            if (io) {
              io.emit('game:global_announcement', {
                ...data,
                timestamp: Date.now(),
              });
            }
          }

          // ─── 4. Admin Enable / Disable Status Changed ──────────────────────────
          if (event === 'game:status_toggle') {
            if (io) {
              io.emit('games:status_update', data);
            }
          }
        } catch (err) {
          console.error('[Redis Pub/Sub Message Error]:', err.message);
        }
      });
    } else {
      console.warn('⚠️ [Redis Pub/Sub] Clients not ready, fallback to direct in-memory event dispatch.');
    }
  } catch (err) {
    console.warn('⚠️ [Redis Pub/Sub] Initialization error:', err.message);
  }
}

/**
 * Handle Bet Mutation: Database-First with Transaction
 */
async function handleUserBet({ userId, amount, gameId, gameName }, io) {
  if (!userId || !amount) return;
  const numAmount = Math.abs(parseInt(amount, 10));
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute('SELECT id, coins, diamonds FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (rows.length === 0 || rows[0].coins < numAmount) {
      await connection.rollback();
      // Notify failure back
      await publishGameEvent('game:user:bet_failed', {
        userId,
        gameId,
        reason: rows.length === 0 ? 'User not found' : 'Insufficient coins',
      });
      return;
    }

    const currentCoins = rows[0].coins;
    const newCoins = currentCoins - numAmount;

    await connection.execute('UPDATE users SET coins = coins - ? WHERE id = ?', [numAmount, userId]);
    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, ?, ?, ?, 'completed')`,
      [userId, `game_${gameId || 'mini'}_bet`, numAmount, `Bet in ${gameName || gameId || 'Mini-Game'}`]
    );
    await connection.execute(
      `INSERT INTO mini_game_bets (user_id, game_slug, bet_amount, status) VALUES (?, ?, ?, 'pending')`,
      [userId, gameId || 'mini_game', numAmount]
    );

    await connection.commit();

    // Invalidate Redis caches immediately
    await cache.del(`user:${userId}`);
    await cache.del(`user:balance:${userId}`);
    await cache.delByPattern(`user:transactions:${userId}*`);

    // Broadcast updated balance to user's client socket
    if (io) {
      io.to(`user:${userId}`).emit('wallet:balance_updated', {
        coins: newCoins,
        diamonds: rows[0].diamonds,
        delta: -numAmount,
        type: 'bet',
        gameId,
      });
    }

    await publishGameEvent('game:user:balance_synced', {
      userId,
      coins: newCoins,
      delta: -numAmount,
      type: 'bet',
      gameId,
    });
  } catch (err) {
    await connection.rollback();
    console.error('[Pub/Sub Bet Error]:', err.message);
  } finally {
    connection.release();
  }
}

/**
 * Handle Win Mutation: Database-First with Transaction
 */
async function handleUserWin({ userId, amount, gameId, gameName }, io) {
  if (!userId || !amount) return;
  const numAmount = Math.abs(parseInt(amount, 10));
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute('SELECT id, coins, diamonds FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (rows.length === 0) {
      await connection.rollback();
      return;
    }

    const currentCoins = rows[0].coins;
    const newCoins = currentCoins + numAmount;

    await connection.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [numAmount, userId]);
    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, ?, ?, ?, 'completed')`,
      [userId, `game_${gameId || 'mini'}_win`, numAmount, `Winnings from ${gameName || gameId || 'Mini-Game'}`]
    );
    await connection.execute(
      `INSERT INTO mini_game_bets (user_id, game_slug, bet_amount, win_amount, status) VALUES (?, ?, 0, ?, 'won')`,
      [userId, gameId || 'mini_game', numAmount]
    );

    await connection.commit();

    // Invalidate Redis caches immediately
    await cache.del(`user:${userId}`);
    await cache.del(`user:balance:${userId}`);
    await cache.delByPattern(`user:transactions:${userId}*`);

    // Broadcast updated balance to user's client socket
    if (io) {
      io.to(`user:${userId}`).emit('wallet:balance_updated', {
        coins: newCoins,
        diamonds: rows[0].diamonds,
        delta: numAmount,
        type: 'win',
        gameId,
      });
    }

    await publishGameEvent('game:user:balance_synced', {
      userId,
      coins: newCoins,
      delta: numAmount,
      type: 'win',
      gameId,
    });
  } catch (err) {
    await connection.rollback();
    console.error('[Pub/Sub Win Error]:', err.message);
  } finally {
    connection.release();
  }
}

/**
 * Publish game event to Redis Pub/Sub channel
 */
export async function publishGameEvent(event, data = {}) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  try {
    if (publisher && publisher.status === 'ready') {
      await publisher.publish(GAME_EVENTS_CHANNEL, payload);
      return true;
    }
  } catch (err) {
    console.warn('[Pub/Sub Publish Warning]:', err.message);
  }
  return false;
}

/**
 * Publish admin event (e.g. game enable/disable) to Redis Pub/Sub channel
 */
export async function publishAdminEvent(event, data = {}) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  try {
    if (publisher && publisher.status === 'ready') {
      await publisher.publish(GAME_ADMIN_CHANNEL, payload);
      return true;
    }
  } catch (err) {
    console.warn('[Pub/Sub Admin Publish Warning]:', err.message);
  }
  return false;
}

export function isPubSubReady() {
  return isReady && publisher?.status === 'ready' && subscriber?.status === 'ready';
}

export default {
  initPubSub,
  publishGameEvent,
  publishAdminEvent,
  isPubSubReady,
  GAME_EVENTS_CHANNEL,
  GAME_ADMIN_CHANNEL,
};
