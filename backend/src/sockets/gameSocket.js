import { getPool, query } from '../config/db.js';
import { cache } from '../config/redis.js';

// Connected games registry: gameId -> { gameId, name, port, socketId, connectedAt, lastPing }
const connectedGames = new Map();

/**
 * Setup Game Socket Bridge on the Main Backend Socket.IO Server
 * Allows all 7 sub-games to communicate with the main backend in real-time,
 * synchronize user wallet coins/diamonds, and broadcast jackpot/win announcements.
 */
export function setupGameSocket(io) {
  io.on('connection', (socket) => {
    // ─── Game Server Registration ─────────────────────────────────────────────
    socket.on('game:register', (data) => {
      const { gameId, name, port } = data || {};
      if (!gameId) return;

      connectedGames.set(gameId, {
        gameId,
        name: name || gameId,
        port: port || null,
        socketId: socket.id,
        connectedAt: new Date(),
        lastPing: Date.now(),
      });

      console.log(`🎮 [Game Socket Bridge] Registered: ${name || gameId} (Port: ${port || 'N/A'}, Socket: ${socket.id})`);

      socket.emit('game:registered', {
        success: true,
        gameId,
        message: `Registered successfully with Umi Live Main Backend`,
        timestamp: Date.now(),
      });

      // Notify admin panel or monitoring if relevant
      io.emit('games:status_update', getConnectedGames());
    });

    // ─── Game Heartbeat ───────────────────────────────────────────────────────
    socket.on('game:ping', (data) => {
      const { gameId } = data || {};
      if (gameId && connectedGames.has(gameId)) {
        const item = connectedGames.get(gameId);
        item.lastPing = Date.now();
        connectedGames.set(gameId, item);
      }
      socket.emit('game:pong', { timestamp: Date.now() });
    });

    // ─── Real-Time Wallet Balance Synchronization (Database-First) ────────────
    socket.on('game:sync_balance', async (data, callback) => {
      const { userId, amount, type, gameId, description } = data || {};
      if (!userId || amount === undefined || isNaN(amount)) {
        if (typeof callback === 'function') {
          return callback({ success: false, message: 'Invalid balance sync payload' });
        }
        return;
      }

      const numAmount = parseInt(amount, 10);
      const isDeduction = type === 'bet' || type === 'deduct';
      const pool = getPool();
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        // 1. Fetch current user balance
        const [rows] = await connection.execute('SELECT id, coins, diamonds FROM users WHERE id = ? FOR UPDATE', [userId]);
        if (rows.length === 0) {
          await connection.rollback();
          if (typeof callback === 'function') callback({ success: false, message: 'User not found' });
          return;
        }

        const user = rows[0];

        // If betting / deducting, verify sufficient coins
        if (isDeduction && user.coins < Math.abs(numAmount)) {
          await connection.rollback();
          if (typeof callback === 'function') {
            return callback({ success: false, message: 'Insufficient coins balance', currentCoins: user.coins });
          }
          return;
        }

        // 2. Apply balance mutation in MySQL Database FIRST
        const coinDelta = isDeduction ? -Math.abs(numAmount) : Math.abs(numAmount);
        await connection.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [coinDelta, userId]);

        // 3. Log transaction
        const txType = isDeduction ? `game_${gameId || 'mini'}_bet` : `game_${gameId || 'mini'}_win`;
        const txDesc = description || (isDeduction ? `Bet on ${gameId || 'Mini-Game'}` : `Winnings from ${gameId || 'Mini-Game'}`);
        await connection.execute(
          `INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, ?, ?, ?, 'completed')`,
          [userId, txType, Math.abs(numAmount), txDesc]
        );

        await connection.commit();

        // 4. Invalidate Redis Caches
        await cache.del(`user:${userId}`);
        await cache.del(`user:balance:${userId}`);
        await cache.delByPattern(`user:transactions:${userId}*`);

        const updatedCoins = user.coins + coinDelta;

        // 5. Emit updated balance to user's client socket
        io.to(`user:${userId}`).emit('wallet:balance_updated', {
          coins: updatedCoins,
          diamonds: user.diamonds,
          delta: coinDelta,
          type,
          gameId,
        });

        if (typeof callback === 'function') {
          callback({
            success: true,
            coins: updatedCoins,
            diamonds: user.diamonds,
            delta: coinDelta,
          });
        }
      } catch (err) {
        await connection.rollback();
        console.error('[Game Socket] Balance sync error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      } finally {
        connection.release();
      }
    });

    // ─── Broadcast Big Wins & Announcements Across Live Rooms ─────────────────
    socket.on('game:announcement', (payload) => {
      const { gameId, gameName, userName, amount, type } = payload || {};
      console.log(`🏆 [Game Winner Announcement] ${userName || 'Player'} won ${amount || 0} coins in ${gameName || gameId}!`);
      
      // Broadcast to all viewers across the platform and active rooms
      io.emit('game:global_announcement', {
        gameId: gameId || 'mini_game',
        gameName: gameName || 'Mini Game',
        userName: userName || 'Player',
        amount: amount || 0,
        type: type || 'win',
        timestamp: Date.now(),
      });
    });

    // ─── Disconnect Cleanup ───────────────────────────────────────────────────
    socket.on('disconnect', () => {
      for (const [gameId, item] of connectedGames.entries()) {
        if (item.socketId === socket.id) {
          console.log(`🔌 [Game Socket Bridge] Disconnected: ${item.name} (${gameId})`);
          connectedGames.delete(gameId);
          io.emit('games:status_update', getConnectedGames());
          break;
        }
      }
    });
  });
}

/**
 * Get List of currently connected sub-games
 */
export function getConnectedGames() {
  const result = [];
  for (const item of connectedGames.values()) {
    result.push({
      gameId: item.gameId,
      name: item.name,
      port: item.port,
      connectedAt: item.connectedAt,
      lastPing: item.lastPing,
      isAlive: Date.now() - item.lastPing < 60000,
    });
  }
  return result;
}

export default {
  setupGameSocket,
  getConnectedGames,
};
