/**
 * Real-time coin balance events — one contract for gifts, games, commissions.
 *
 * Every event carries the ABSOLUTE balance read from MySQL after the commit plus `balance_ts`, a
 * version that only grows. Clients apply an update only when its `balance_ts` is newer than the one
 * they already applied for that user, so:
 *   - the same change delivered several times (private channel + room channel + gift event + HTTP
 *     response + a delayed queue) is applied exactly once (no double add);
 *   - a late, older event can never overwrite a newer balance;
 *   - `userId` is always explicit, so one user's balance can never land on another user's screen.
 *
 * Events:
 *   user_<id>        -> 'wallet_balance_updated'   (only that user: their own wallet)
 *   room channel(s)  -> 'user_balance_updated'      (everyone in the room: that user's coin label)
 *                       'room_user_coins_updated'   (alias for older clients)
 */

let lastTs = 0;

/** Strictly increasing millisecond version (per process). */
export function nextBalanceTs() {
  const now = Date.now();
  lastTs = now > lastTs ? now : lastTs + 1;
  return lastTs;
}

/**
 * Socket channels (live rooms) the user is currently in, across all processes.
 * Excludes private/user/chat channels.
 */
export async function getUserLiveRoomChannels(io, userId) {
  if (!io || !userId) return [];
  try {
    const sockets = await io.in(`user_${userId}`).fetchSockets();
    const rooms = new Set();
    for (const s of sockets) {
      for (const r of s.rooms || []) {
        if (r === s.id || r.startsWith('user_') || r.startsWith('user:') || r.startsWith('conversation_') || r.startsWith('v2:')) continue;
        rooms.add(r);
      }
    }
    return [...rooms];
  } catch (_) {
    return [];
  }
}

/**
 * Emit one user's new balance.
 * @param {object} io           Socket.IO server
 * @param {object} p
 * @param {number} p.userId
 * @param {number} p.coins      Absolute balance after the change
 * @param {number} [p.diamonds]
 * @param {number} [p.delta]    Change that produced it (display only — never add it client side)
 * @param {string} p.source     'gift_sent' | 'gift_received' | 'agency_commission' | 'game' | ...
 * @param {number} p.ts         From nextBalanceTs(); reuse the same ts for every copy of one change
 * @param {string[]} [p.roomChannels] Room channels to broadcast the coin label to
 */
export function emitUserBalance(io, { userId, coins, diamonds, delta, source, ts, roomChannels = [] }) {
  if (!io || !userId || coins === undefined || coins === null) return;
  const payload = {
    userId: Number(userId),
    user_id: Number(userId),
    coins: Number(coins),
    updated_coin: Number(coins),
    ...(diamonds !== undefined && diamonds !== null ? { diamonds: Number(diamonds) } : {}),
    ...(delta !== undefined ? { delta: Number(delta) } : {}),
    source: source || 'unknown',
    balance_ts: ts,
  };
  io.to(`user_${userId}`).emit('wallet_balance_updated', payload);
  const chans = [...new Set((roomChannels || []).filter(Boolean).map(String))];
  if (chans.length) {
    // io.to([...]) delivers once per socket even when a socket is in several aliases of one room.
    io.to(chans).emit('user_balance_updated', payload);
    io.to(chans).emit('room_user_coins_updated', payload);
  }
}
