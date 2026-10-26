/**
 * Production-Grade Sequential Room Gift Dispatch Queue & Anti-Duplicate Manager
 * 
 * Features:
 * - Anti-Duplicate Guard: Suppresses accidental duplicate emissions of identical gifts within a short window.
 * - Room-Isolated FIFO Queue: Each live room has its own independent queue.
 * - Smooth Paced Dispatch: Dispatches rapid/combo gifts one-by-one with a steady interval (400ms - 700ms),
 *   allowing the mobile client to process animations and update UI without freezing or dropping events.
 * - Zero Mobile Changes: Preserves 100% exact event names, payloads, and structures.
 */

// In-memory deduplication set: key -> timestamp
const recentGiftsMap = new Map();
const DEDUP_TTL_MS = 6000; // 6 seconds anti-duplicate window

// Room gift queues: roomId -> { queue: Array, isProcessing: boolean, timer: any }
const roomQueues = new Map();

// Periodic cleanup of expired dedup keys every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentGiftsMap.entries()) {
    if (now - timestamp > DEDUP_TTL_MS) {
      recentGiftsMap.delete(key);
    }
  }
}, 30000);

/**
 * Generate a deterministic deduplication key for a gift event.
 */
function generateDedupKey(item) {
  const payload = item.socketPayload || item.payload || {};
  const gift = payload.gift || {};
  const senderId = payload.sender_id || payload.senderId || payload.sender?.id || item.senderId || '';
  const receiverId = payload.receiver_id || payload.receiverId || payload.receiver?.id || '';
  const giftId = gift.id || '';
  const count = gift.count || 1;
  const totalCoins = gift.total_coins || gift.totalCoins || 0;
  const txId = payload.transaction_id || payload.tx_id || '';

  if (txId) {
    return `tx_${txId}`;
  }

  // Fallback signature
  return `gift_${senderId}_${receiverId}_${giftId}_${count}_${totalCoins}`;
}

/**
 * Check if the gift is an accidental duplicate.
 */
function isDuplicate(key) {
  const now = Date.now();
  const lastTime = recentGiftsMap.get(key);
  if (lastTime && now - lastTime < DEDUP_TTL_MS) {
    return true;
  }
  recentGiftsMap.set(key, now);
  return false;
}

/**
 * Dispatches a single gift item through Socket.IO.
 */
function emitGiftItem(item) {
  const { io, roomTargets, socketPayload, senderId, senderUpdatedCoins, receiversList } = item;
  if (!io) return;

  const targets = Array.isArray(roomTargets) ? roomTargets : Array.from(roomTargets || []);

  for (const rm of targets) {
    if (!rm) continue;
    io.to(rm).emit('gift-broadcast', socketPayload);
    io.to(rm).emit('gift_broadcast', socketPayload);
    io.to(rm).emit('gift_received', socketPayload);
    io.to(rm).emit('gift:received', socketPayload);
    io.to(rm).emit('gift-sent', socketPayload);
    io.to(rm).emit('gift_sent', socketPayload);
    io.to(rm).emit('room_gift', socketPayload);

    // Update balances in room
    if (senderId && senderUpdatedCoins !== undefined) {
      io.to(rm).emit('user_balance_updated', { userId: senderId, coins: senderUpdatedCoins });
    }
    if (Array.isArray(receiversList)) {
      for (const r of receiversList) {
        if (r && r.id && r.updated_coin !== undefined) {
          io.to(rm).emit('user_balance_updated', { userId: r.id, coins: r.updated_coin });
        }
      }
    }
  }

  // User direct socket channels
  if (senderId) {
    if (senderUpdatedCoins !== undefined) {
      io.to(`user_${senderId}`).emit('wallet_balance_updated', { coins: senderUpdatedCoins });
    }
    io.to(`user_${senderId}`).emit('gift_sent', socketPayload);
  }

  if (Array.isArray(receiversList)) {
    for (const r of receiversList) {
      if (r && r.id) {
        if (r.updated_coin !== undefined) {
          io.to(`user_${r.id}`).emit('wallet_balance_updated', { coins: r.updated_coin });
        }
        io.to(`user_${r.id}`).emit('gift_received', socketPayload);
      }
    }
  }
}

/**
 * Worker loop that drains the room's gift queue sequentially with smooth pacing.
 */
async function processRoomQueue(canonicalRoomId) {
  const roomState = roomQueues.get(canonicalRoomId);
  if (!roomState) return;

  if (roomState.isProcessing) return;
  roomState.isProcessing = true;

  try {
    while (roomState.queue.length > 0) {
      const item = roomState.queue.shift();

      try {
        emitGiftItem(item);
      } catch (err) {
        console.error(`[GiftQueue] Error emitting gift in room ${canonicalRoomId}:`, err.message);
      }

      // If more gifts are waiting in queue, apply pacing delay
      if (roomState.queue.length > 0) {
        // Dynamic pacing: if queue is backing up (> 4 items), drain slightly faster (400ms), otherwise 650ms
        const delayMs = roomState.queue.length > 4 ? 400 : 650;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  } finally {
    roomState.isProcessing = false;
    // Clean up empty queue after 15 seconds of inactivity
    if (roomState.queue.length === 0) {
      setTimeout(() => {
        const current = roomQueues.get(canonicalRoomId);
        if (current && current.queue.length === 0 && !current.isProcessing) {
          roomQueues.delete(canonicalRoomId);
        }
      }, 15000);
    }
  }
}

/**
 * Public function to enqueue a gift for sequential, smooth, paced dispatch.
 */
export function enqueueRoomGift(giftTask) {
  const { io, roomTargets, socketPayload, senderId, senderUpdatedCoins, receiversList } = giftTask;
  if (!io) return;

  const primaryRoomId = (socketPayload?.roomId || socketPayload?.room_id || Array.from(roomTargets || [])[0] || '').toString().trim();
  if (!primaryRoomId) {
    // If not associated with any room, emit directly
    emitGiftItem(giftTask);
    return;
  }

  // Anti-Duplicate Check
  const dedupKey = generateDedupKey(giftTask);
  if (isDuplicate(dedupKey)) {
    console.log(`[GiftQueue] Suppressed duplicate gift event: ${dedupKey}`);
    return;
  }

  // Get or initialize room queue
  let roomState = roomQueues.get(primaryRoomId);
  if (!roomState) {
    roomState = {
      queue: [],
      isProcessing: false,
    };
    roomQueues.set(primaryRoomId, roomState);
  }

  // Cap maximum queued gifts per room to prevent unbounded memory growth
  if (roomState.queue.length >= 200) {
    console.warn(`[GiftQueue] Room ${primaryRoomId} reached max queue limit (200), dropping oldest`);
    roomState.queue.shift();
  }

  roomState.queue.push(giftTask);

  // Trigger processing if not already draining
  if (!roomState.isProcessing) {
    processRoomQueue(primaryRoomId).catch((err) => {
      console.error(`[GiftQueue] Unhandled queue runner error in room ${primaryRoomId}:`, err);
    });
  }
}

/**
 * Clear queue for a closed room to free memory immediately.
 */
export function clearRoomGiftQueue(roomId) {
  if (!roomId) return;
  const key = String(roomId).trim();
  roomQueues.delete(key);
}
