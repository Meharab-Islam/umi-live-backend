import { query } from '../config/db.js';
import { cache } from '../config/redis.js';
import { verifyToken } from '../config/jwt.js';
import { handleUserSeatDeparture } from '../controllers/mobile/liveController.js';
import { sendChatPushNotification } from '../config/firebase.js';

// Store connected viewers: roomId -> Set of socket IDs (Module-level scope)
const roomViewers = new Map();
const roomUserJoinAnnounced = new Map();
const roomLastViewerCount = new Map();

// Track pending host disconnect grace period timers: canonicalRoomId -> { timer, hostId, numericRoomId, startedAt }
export const hostDisconnectGraceTimers = new Map();

// Reconnection grace period (Default: 90 seconds = 1.5 minutes to withstand 1-minute network drops)
const HOST_GRACE_PERIOD_MS = (parseInt(process.env.HOST_DISCONNECT_GRACE_PERIOD_SECONDS, 10) || 90) * 1000;

/**
 * Cancel any pending host disconnect grace timer for a room
 */
export function cancelHostDisconnectGraceTimer(roomId) {
  if (!roomId) return;
  const key = String(roomId).trim();
  const entry = hostDisconnectGraceTimers.get(key);
  if (entry) {
    if (entry.timer) clearTimeout(entry.timer);
    hostDisconnectGraceTimers.delete(key);
    if (entry.canonicalRoomId) hostDisconnectGraceTimers.delete(entry.canonicalRoomId);
    if (entry.numericRoomId) hostDisconnectGraceTimers.delete(String(entry.numericRoomId));
    console.log(`⏱️ [Host Grace Timer Cancelled] Room ${roomId} timer cancelled.`);
  }
}

/**
 * Executes full formal termination of a live room in MySQL, Redis, and Socket.IO
 */
export async function executeRoomTermination(canonicalRoomId, numericRoomId, hostId, io, reason = 'host_closed') {
  try {
    cancelHostDisconnectGraceTimer(canonicalRoomId);
    if (numericRoomId) cancelHostDisconnectGraceTimer(String(numericRoomId));

    console.log(`🔴 [Room Termination] Live Room ${canonicalRoomId} (ID: ${numericRoomId}) host ${hostId} terminating room (reason: ${reason})...`);

    // 1. Mark room as ended with 0 viewers in MySQL SSOT
    await query(
      "UPDATE live_rooms SET status = 'ended', viewer_count = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ? OR room_id = ?",
      [numericRoomId || -1, canonicalRoomId]
    );

    // 2. Clear all runtime seats, viewers, requests, admins
    await query('DELETE FROM live_room_seats WHERE room_id = ? OR room_id = ?', [canonicalRoomId, String(numericRoomId || '')]);
    await query('DELETE FROM live_room_viewers WHERE room_id = ? OR room_id = ?', [canonicalRoomId, String(numericRoomId || '')]);
    await query('DELETE FROM live_room_seat_requests WHERE room_id = ? OR room_id = ?', [canonicalRoomId, String(numericRoomId || '')]);
    await query('DELETE FROM live_room_admins WHERE room_id = ? OR room_id = ?', [canonicalRoomId, String(numericRoomId || '')]);

    // 3. Clear memory viewer tracker
    if (roomViewers.has(canonicalRoomId)) {
      roomViewers.delete(canonicalRoomId);
    }
    if (numericRoomId && roomViewers.has(String(numericRoomId))) {
      roomViewers.delete(String(numericRoomId));
    }

    // 4. Invalidate all Redis caches
    await Promise.allSettled([
      cache.delByPattern('mobile:rooms:*'),
      cache.del(`mobile:room_details:${canonicalRoomId}`),
      numericRoomId ? cache.del(`mobile:room_details:${numericRoomId}`) : null,
      cache.delByPattern(`mobile:room:users:${canonicalRoomId}*`),
      numericRoomId ? cache.delByPattern(`mobile:room:users:${numericRoomId}*`) : null,
      cache.del(`mobile:live:seat_requests:${canonicalRoomId}`),
      cache.del(`mobile:live:room_admins:${canonicalRoomId}`),
      cache.del(`room:${canonicalRoomId}`),
      numericRoomId ? cache.del(`room:${numericRoomId}`) : null,
      cache.del(`mobile:live:my_active:${hostId}`),
      cache.delByPattern('host:*'),
    ]);

    // 5. Broadcast Room Closed / Ended event to all participants
    if (io) {
      const isTimeout = reason === 'host_disconnected_timeout';
      const closePayload = {
        roomId: canonicalRoomId,
        numericRoomId,
        closedBy: hostId,
        closedByRole: 'host',
        message: isTimeout
          ? 'Host did not reconnect within grace period. Live stream has ended.'
          : (reason === 'disconnect'
              ? 'Host disconnected (connection lost). Live stream has ended.'
              : 'Host has closed the live stream.'),
        reason: isTimeout ? 'host_disconnected_timeout' : (reason === 'disconnect' ? 'host_disconnected' : 'host_closed'),
        timestamp: new Date().toISOString(),
      };

      const channels = new Set([canonicalRoomId, String(numericRoomId)].filter(Boolean));
      for (const ch of channels) {
        io.to(ch).emit('room-closed', closePayload);
        io.to(ch).emit('room_closed', closePayload);
        io.to(ch).emit('room_ended', { roomId: canonicalRoomId, message: closePayload.message });
        io.to(ch).emit('stream-terminated', { roomId: canonicalRoomId, reason: closePayload.reason });
        io.to(ch).emit('viewer-count-update', { roomId: canonicalRoomId, count: 0, viewer_count: 0 });
        io.to(ch).emit('room_viewers_updated', { roomId: canonicalRoomId, count: 0, viewer_count: 0 });
      }

      // Evict and unsubscribe all sockets from this room channel
      if (typeof io.socketsLeave === 'function') {
        for (const ch of channels) {
          io.socketsLeave(ch);
        }
      }
    }

    return { isHost: true, roomEnded: true };
  } catch (err) {
    console.error('executeRoomTermination error:', err.message);
  }
}

/**
 * Helper to completely clean up a user's presence from a room
 * (seats, waiting list, admin list, viewers list, Redis caches)
 */
async function cleanupUserFromRoom(roomId, userId, io, userInfo = null, reason = 'left') {
  if (!roomId || !userId) return;
  try {
    const isNum = /^\d+$/.test(String(roomId).trim());
    const rooms = await query(
      'SELECT id, room_id, host_id, status FROM live_rooms WHERE room_id = ? OR id = ?',
      [String(roomId), isNum ? Number(roomId) : -1]
    );
    const room = rooms.length > 0 ? rooms[0] : null;
    if (!room) return;

    const canonicalRoomId = room.room_id;
    const numericRoomId = room.id;
    const hostId = room.host_id;

    // If room is already closed or ended, skip
    if (room.status === 'ended') {
      return;
    }

    const isHost = Number(userId) === Number(hostId);

    // =========================================================================
    // SCENARIO A: THE DEPARTING / DISCONNECTING USER IS THE HOST!
    // If HOST_GRACE_PERIOD_MS > 0, give temporary grace period; otherwise end room immediately!
    // =========================================================================
    if (isHost) {
      if (reason === 'disconnect' && HOST_GRACE_PERIOD_MS > 0) {
        // 1. Check if the host has any other active socket connection in this room
        const hostSockets = Array.from(io?.sockets?.sockets?.values() || []).filter(
          (s) => (Number(s.userId) === Number(hostId) || Number(s.currentUser?.id) === Number(hostId)) &&
                 (s.currentRoom === canonicalRoomId || s.rooms?.has(canonicalRoomId))
        );
        if (hostSockets.length > 0) {
          console.log(`ℹ️ [Host Disconnect] Host ${hostId} has another active socket in room ${canonicalRoomId}. Skipping grace period.`);
          return { isHost: true, activeSocketRemains: true };
        }

        // 2. Start Reconnection Grace Period if not already started
        if (hostDisconnectGraceTimers.has(canonicalRoomId) || (numericRoomId && hostDisconnectGraceTimers.has(String(numericRoomId)))) {
          console.log(`⏳ [Host Disconnect] Reconnection grace period already active for room ${canonicalRoomId}.`);
          return { isHost: true, waitingForReconnect: true };
        }

        const graceSec = Math.round(HOST_GRACE_PERIOD_MS / 1000);
        console.log(`⏳ [Host Network Disconnected] Host ${hostId} network lost in room ${canonicalRoomId}. Starting ${graceSec}s reconnection grace period...`);

        // Notify room audience that host is temporarily reconnecting
        const reconnectNotice = {
          roomId: canonicalRoomId,
          numericRoomId,
          hostId,
          status: 'reconnecting',
          message: 'Host network connection interrupted. Waiting for host to reconnect...',
          gracePeriodSeconds: graceSec,
          isReconnecting: true,
          timestamp: new Date().toISOString(),
        };

        if (io) {
          io.to(canonicalRoomId).emit('host_reconnecting', reconnectNotice);
          io.to(canonicalRoomId).emit('host_disconnected_temporarily', reconnectNotice);
          io.to(canonicalRoomId).emit('host-connection-state', {
            roomId: canonicalRoomId,
            state: 'reconnecting',
            gracePeriodSeconds: graceSec,
          });
        }

        // Schedule termination ONLY if host fails to reconnect within the full grace period
        const timer = setTimeout(async () => {
          try {
            hostDisconnectGraceTimers.delete(canonicalRoomId);
            if (numericRoomId) hostDisconnectGraceTimers.delete(String(numericRoomId));

            console.log(`🔴 [Host Grace Period Expired] Host ${hostId} failed to reconnect to room ${canonicalRoomId} within ${graceSec}s. Terminating room now...`);
            await executeRoomTermination(canonicalRoomId, numericRoomId, hostId, io, 'host_disconnected_timeout');
          } catch (e) {
            console.error('Error during grace period expiration cleanup:', e.message);
          }
        }, HOST_GRACE_PERIOD_MS);

        const timerEntry = {
          timer,
          hostId,
          canonicalRoomId,
          numericRoomId,
          startedAt: Date.now(),
        };
        hostDisconnectGraceTimers.set(canonicalRoomId, timerEntry);
        if (numericRoomId) {
          hostDisconnectGraceTimers.set(String(numericRoomId), timerEntry);
        }

        return { isHost: true, waitingForReconnect: true, gracePeriodSeconds: graceSec };
      }

      // If the host explicitly left or ended the stream, or if grace period is 0 (app closed):
      console.log(`🔴 [Host Exit/Disconnect] Terminating room ${canonicalRoomId} immediately (reason: ${reason})...`);
      return await executeRoomTermination(canonicalRoomId, numericRoomId, hostId, io, reason);
    }

    // =========================================================================
    // SCENARIO B: REGULAR VIEWER OR CO-HOST DEPARTURE
    // =========================================================================

    // 1. Handle seat departure & automatic seat rearrangement
    await handleUserSeatDeparture(canonicalRoomId, userId, io);
    if (numericRoomId && String(numericRoomId) !== canonicalRoomId) {
      await handleUserSeatDeparture(String(numericRoomId), userId, io);
    }

    // 2. Remove from waiting list (seat requests)
    await query(
      'DELETE FROM live_room_seat_requests WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
      [canonicalRoomId, String(numericRoomId || ''), userId]
    );

    // 3. Remove from room admins if not host
    const delAdminRes = await query(
      'DELETE FROM live_room_admins WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
      [canonicalRoomId, String(numericRoomId || ''), userId]
    );
    if (delAdminRes && delAdminRes.affectedRows > 0 && io) {
      const channels = new Set([canonicalRoomId, String(numericRoomId), String(roomId)].filter(Boolean));
      for (const ch of channels) {
        io.to(ch).emit('room_admin_removed', { roomId: canonicalRoomId, userId });
      }
    }

    // 4. Remove from live_room_viewers
    await query(
      'DELETE FROM live_room_viewers WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
      [canonicalRoomId, String(numericRoomId || ''), userId]
    );

    // 5. Update real viewer count in live_rooms (excluding host)
    if (numericRoomId) {
      await query(
        `UPDATE live_rooms 
         SET viewer_count = (SELECT COUNT(*) FROM live_room_viewers WHERE (room_id = ? OR room_id = ?) AND user_id != ?) 
         WHERE id = ?`,
        [canonicalRoomId, String(numericRoomId), hostId, numericRoomId]
      );
    } else {
      await query(
        `UPDATE live_rooms 
         SET viewer_count = (SELECT COUNT(*) FROM live_room_viewers WHERE room_id = ? AND user_id != ?) 
         WHERE room_id = ?`,
        [canonicalRoomId, hostId, canonicalRoomId]
      );
    }

    const [updatedRow] = numericRoomId
      ? await query('SELECT viewer_count FROM live_rooms WHERE id = ?', [numericRoomId])
      : await query('SELECT viewer_count FROM live_rooms WHERE room_id = ?', [canonicalRoomId]);
    const currentViewerCount = updatedRow ? Math.max(0, updatedRow.viewer_count) : 0;

    // 6. Invalidate all Redis caches
    await Promise.allSettled([
      cache.delByPattern('mobile:rooms:*'),
      cache.del(`mobile:room_details:${roomId}`),
      cache.del(`mobile:room_details:${canonicalRoomId}`),
      numericRoomId ? cache.del(`mobile:room_details:${numericRoomId}`) : null,
      cache.delByPattern(`mobile:room:users:${roomId}*`),
      cache.delByPattern(`mobile:room:users:${canonicalRoomId}*`),
      numericRoomId ? cache.delByPattern(`mobile:room:users:${numericRoomId}*`) : null,
      cache.del(`mobile:live:seat_requests:${canonicalRoomId}`),
      cache.del(`mobile:live:room_admins:${canonicalRoomId}`),
      cache.del(`room:${canonicalRoomId}`),
      numericRoomId ? cache.del(`room:${numericRoomId}`) : null,
    ]);

    // 7. Fetch user details for leave notification so name, avatar, and package persist
    let leaveUser = userInfo || null;
    if (!leaveUser || !leaveUser.full_name || !leaveUser.package_category_name) {
      try {
        const [uRow] = await query(
          `SELECT u.id, u.full_name, u.avatar_url,
                  pc.name as package_category_name,
                  COALESCE(pp.image_url, pc.badge_icon, '') as package_image,
                  pc.color_code as package_color
           FROM users u
           LEFT JOIN user_package_subscriptions ups 
             ON ups.id = (
               SELECT id FROM user_package_subscriptions 
               WHERE user_id = u.id AND status = 'active' AND expires_at > NOW() 
               ORDER BY is_equipped DESC, expires_at DESC LIMIT 1
             )
           LEFT JOIN privilege_packages pp ON pp.id = ups.package_id
           LEFT JOIN package_categories pc 
             ON pc.id = ups.category_id AND pc.is_active = 1
           WHERE u.id = ? LIMIT 1`,
          [userId]
        );
        if (uRow) {
          leaveUser = {
            id: uRow.id,
            full_name: leaveUser?.full_name || leaveUser?.userName || leaveUser?.name || uRow.full_name,
            avatar_url: leaveUser?.avatar_url || leaveUser?.userAvatar || leaveUser?.avatar || uRow.avatar_url,
            package_category_name: leaveUser?.package_category_name || leaveUser?.packageCategoryName || leaveUser?.packageName || uRow.package_category_name,
            package_image: leaveUser?.package_image || leaveUser?.packageImage || uRow.package_image,
            package_color: leaveUser?.package_color || leaveUser?.packageColor || uRow.package_color,
          };
        }
      } catch (err) {
        console.error('Error fetching user package on leave:', err.message);
      }
    }

    const leaveUserName = leaveUser?.full_name || leaveUser?.userName || leaveUser?.name || `User ${userId}`;
    const leaveUserAvatar = leaveUser?.avatar_url || leaveUser?.userAvatar || leaveUser?.avatar || '';
    const leavePackageName = leaveUser?.package_category_name || leaveUser?.packageCategoryName || leaveUser?.packageName || '';
    const leavePackageImage = leaveUser?.package_image || leaveUser?.packageImage || '';
    const leavePackageColor = leaveUser?.package_color || leaveUser?.packageColor || '';

    // 8. Emit viewer departure to ALL room channel aliases
    if (io) {
      const leavePayload = {
        roomId: canonicalRoomId,
        numericRoomId,
        userId,
        user_id: userId,
        userName: leaveUserName,
        user_name: leaveUserName,
        userAvatar: leaveUserAvatar,
        user_avatar: leaveUserAvatar,
        packageCategoryName: leavePackageName,
        package_category_name: leavePackageName,
        packageName: leavePackageName,
        package_name: leavePackageName,
        packageImage: leavePackageImage,
        package_image: leavePackageImage,
        packageColor: leavePackageColor,
        package_color: leavePackageColor,
        user: {
          id: userId,
          full_name: leaveUserName,
          name: leaveUserName,
          avatar_url: leaveUserAvatar,
          package_category_name: leavePackageName,
          package_image: leavePackageImage,
          package_color: leavePackageColor,
        },
        count: currentViewerCount,
        viewer_count: currentViewerCount,
        reason,
        timestamp: new Date().toISOString(),
      };

      const channels = new Set([canonicalRoomId, String(numericRoomId), String(roomId)].filter(Boolean));
      for (const ch of channels) {
        io.to(ch).emit('user-left', leavePayload);
        io.to(ch).emit('user_left', leavePayload);
        io.to(ch).emit('viewer_left', leavePayload);
        io.to(ch).emit('viewer-count-update', { roomId: canonicalRoomId, count: currentViewerCount, viewer_count: currentViewerCount });
        io.to(ch).emit('room_viewers_updated', { roomId: canonicalRoomId, count: currentViewerCount, viewer_count: currentViewerCount });
      }
    }

    roomUserJoinAnnounced.delete(`${canonicalRoomId}_${userId}`);
    return { isHost: false, viewerCount: currentViewerCount };
  } catch (err) {
    console.error(`cleanupUserFromRoom error (${roomId}, ${userId}):`, err.message);
  }
}

export function setupLiveSocket(io) {
  io.on('connection', (socket) => {
    let currentRoom = null;
    let currentUser = null;

    // Automatic authentication via handshake token or userId
    const rawHandshakeToken =
      socket.handshake?.auth?.token ||
      socket.handshake?.headers?.authorization ||
      socket.handshake?.query?.token;
    if (rawHandshakeToken) {
      const cleanToken = String(rawHandshakeToken).replace(/^Bearer\s+/i, '');
      const decoded = verifyToken(cleanToken);
      if (decoded && decoded.id) {
        socket.userId = decoded.id;
        socket.chatUserId = decoded.id;
        socket.join(`user_${decoded.id}`);
      }
    }
    const rawUserId = socket.handshake?.auth?.userId || socket.handshake?.query?.userId;
    if (rawUserId && !socket.userId) {
      socket.userId = Number(rawUserId);
      socket.chatUserId = Number(rawUserId);
      socket.join(`user_${socket.userId}`);
    }

    // Join a live streaming room
    const handleJoinRoom = async ({ roomId, room_id, user }) => {
            roomId = roomId || room_id;

      try {
        if (!roomId) return;

        // Resolve canonical room id
        const isNum = /^\d+$/.test(String(roomId).trim());
        const rooms = await query(
          'SELECT id, room_id, host_id FROM live_rooms WHERE room_id = ? OR id = ?',
          [String(roomId), isNum ? Number(roomId) : -1]
        );
        const room = rooms.length > 0 ? rooms[0] : null;
        const canonicalRoomId = room ? room.room_id : String(roomId);
        const numericRoomId = room ? room.id : null;

        // Leave any prior room ONLY if switching to a different room
        if (currentRoom && currentRoom !== canonicalRoomId) {
          socket.leave(currentRoom);
          if (roomViewers.has(currentRoom)) {
            roomViewers.get(currentRoom).delete(socket.id);
            const count = roomViewers.get(currentRoom).size;
            io.to(currentRoom).emit('viewer-count-update', { roomId: currentRoom, count, viewer_count: count });
          }
          if (currentUser?.id) {
            await cleanupUserFromRoom(currentRoom, currentUser.id, io, currentUser);
          }
        }

        currentRoom = canonicalRoomId;
        currentUser = user || { full_name: `Guest_${socket.id.substring(0, 4)}`, avatar_url: '' };
        socket.currentRoom = canonicalRoomId;
        socket.currentUser = currentUser;

        // If socket is already in this canonical room, skip re-broadcasting
        if (socket.rooms && socket.rooms.has(canonicalRoomId)) {
          return;
        }

        socket.join(canonicalRoomId);

        // Host is never counted as a viewer
        const isHost = room && (Number(currentUser.id) === Number(room.host_id) || Number(socket.userId) === Number(room.host_id));

        if (!roomViewers.has(canonicalRoomId)) {
          roomViewers.set(canonicalRoomId, new Set());
        }
        if (!isHost) {
          roomViewers.get(canonicalRoomId).add(socket.id);
        } else {
          roomViewers.get(canonicalRoomId).delete(socket.id);

          // Host Reconnect Handler: If a grace timer is active for this room, cancel it immediately!
          if (hostDisconnectGraceTimers.has(canonicalRoomId) || (numericRoomId && hostDisconnectGraceTimers.has(String(numericRoomId)))) {
            const entry = hostDisconnectGraceTimers.get(canonicalRoomId) || (numericRoomId ? hostDisconnectGraceTimers.get(String(numericRoomId)) : null);
            if (entry?.timer) {
              clearTimeout(entry.timer);
            }
            hostDisconnectGraceTimers.delete(canonicalRoomId);
            if (numericRoomId) hostDisconnectGraceTimers.delete(String(numericRoomId));

            console.log(`🟢 [Host Reconnected] Host ${currentUser.id} successfully reconnected to room ${canonicalRoomId}! Disconnect timer cancelled.`);

            const reconnectedPayload = {
              roomId: canonicalRoomId,
              numericRoomId,
              hostId: currentUser.id,
              status: 'live',
              message: 'Host has reconnected! 🎥',
              isReconnecting: false,
              timestamp: new Date().toISOString(),
            };

            io.to(canonicalRoomId).emit('host_reconnected', reconnectedPayload);
            io.to(canonicalRoomId).emit('host-connection-state', {
              roomId: canonicalRoomId,
              state: 'connected',
            });
          }
        }

        // Fetch DB real viewer count (excludes host)
        const [dbCountRow] = numericRoomId
          ? await query('SELECT viewer_count FROM live_rooms WHERE id = ?', [numericRoomId])
          : await query('SELECT viewer_count FROM live_rooms WHERE room_id = ?', [canonicalRoomId]);
        const activeCount = dbCountRow ? Math.max(0, dbCountRow.viewer_count) : roomViewers.get(canonicalRoomId).size;

        // Emit updated viewer count to room ONLY if changed
        const lastCount = roomLastViewerCount.get(canonicalRoomId);
        if (lastCount !== activeCount) {
          roomLastViewerCount.set(canonicalRoomId, activeCount);
          io.to(canonicalRoomId).emit('viewer-count-update', { roomId: canonicalRoomId, count: activeCount, viewer_count: activeCount });
        }

        // Emit user joined welcome notice ONLY if not host and not announced within 20s
        const userKey = `${canonicalRoomId}_${currentUser.id}`;
        const lastAnnounced = roomUserJoinAnnounced.get(userKey);
        const now = Date.now();
        const shouldAnnounceJoin = !isHost && currentUser?.id && (!lastAnnounced || (now - lastAnnounced > 20000));
        if (shouldAnnounceJoin) {
          roomUserJoinAnnounced.set(userKey, now);
          const joinedPayload = {
            roomId: canonicalRoomId,
            userId: currentUser.id,
            user_id: currentUser.id,
            userName: currentUser.full_name || currentUser.name || 'User',
            user_name: currentUser.full_name || currentUser.name || 'User',
            userAvatar: currentUser.avatar_url || currentUser.avatar || '',
            user_avatar: currentUser.avatar_url || currentUser.avatar || '',
            packageName: currentUser.package_category_name || '',
            packageCategoryName: currentUser.package_category_name || '',
            package_category_name: currentUser.package_category_name || '',
            packageImage: currentUser.package_image || '',
            package_image: currentUser.package_image || '',
            packageColor: currentUser.package_color || '',
            package_color: currentUser.package_color || '',
            user: currentUser,
            count: activeCount,
            viewer_count: activeCount,
            timestamp: new Date().toISOString(),
          };
          io.to(canonicalRoomId).emit('user-joined', joinedPayload);
        }
      } catch (err) {
        console.error('Socket join-room error:', err.message);
      }
    };
    socket.on('join-room', handleJoinRoom);
    socket.on('join_room', handleJoinRoom);

    // Leave live room
    const handleLeaveRoom = async (data = {}) => {
      const targetRoom = data?.roomId || data?.room_id || currentRoom;

      try {
        if (!targetRoom) return;
        const isNum = /^\d+$/.test(String(targetRoom).trim());
        const rooms = await query(
          'SELECT id, room_id, host_id FROM live_rooms WHERE room_id = ? OR id = ?',
          [String(targetRoom), isNum ? Number(targetRoom) : -1]
        );
        const room = rooms.length > 0 ? rooms[0] : null;
        const canonicalRoomId = room ? room.room_id : String(targetRoom);
        const numericRoomId = room ? room.id : null;

        socket.leave(canonicalRoomId);
        socket.leave(String(targetRoom));
        if (numericRoomId) socket.leave(String(numericRoomId));

        if (roomViewers.has(canonicalRoomId)) {
          roomViewers.get(canonicalRoomId).delete(socket.id);
        }

        const leaveUserId = data?.userId || data?.user_id || currentUser?.id || socket.userId;
        const leaveUserInfo = data?.user || (data?.userName ? data : null) || currentUser;

        if (leaveUserId) {
          await cleanupUserFromRoom(canonicalRoomId, leaveUserId, io, leaveUserInfo, 'left');
        }

        if (currentRoom === canonicalRoomId || currentRoom === targetRoom) {
          currentRoom = null;
        }
        socket.currentRoom = null;
      } catch (err) {
        console.error('Socket leave-room error:', err.message);
      }
    };
    socket.on('leave-room', handleLeaveRoom);
    socket.on('leave_room', handleLeaveRoom);

    // Chat message in room
    const handleRoomChat = (data) => {
      const targetRoom = data?.roomId || data?.room_id || currentRoom;
      const msg = data?.message || data?.text;
      if (!targetRoom || !msg) return;

      const u = data?.user || currentUser || { full_name: "Guest" };
      const payload = {
        id: data?.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        roomId: targetRoom,
        room_id: targetRoom,
        user: u,
        userId: data?.userId || data?.user_id || u?.id,
        user_id: data?.userId || data?.user_id || u?.id,
        userName: data?.userName || data?.user_name || u?.full_name || u?.name,
        user_name: data?.userName || data?.user_name || u?.full_name || u?.name,
        userAvatar: data?.userAvatar || data?.user_avatar || u?.avatar_url || u?.profile_picture,
        user_avatar: data?.userAvatar || data?.user_avatar || u?.avatar_url || u?.profile_picture,
        packageCategoryName: data?.packageCategoryName || data?.package_category_name || u?.package_category_name,
        package_category_name: data?.packageCategoryName || data?.package_category_name || u?.package_category_name,
        packageImage: data?.packageImage || data?.package_image || u?.package_image,
        package_image: data?.packageImage || data?.package_image || u?.package_image,
        vipTier: data?.vipTier || data?.vip_tier || u?.vip_tier || "normal",
        vip_tier: data?.vipTier || data?.vip_tier || u?.vip_tier || "normal",
        message: String(msg).trim().substring(0, 300),
        text: String(msg).trim().substring(0, 300),
        timestamp: new Date().toISOString(),
      };

      io.to(targetRoom).emit("comment", payload);
    };

    socket.on("send-chat", handleRoomChat);
    socket.on("new-chat", handleRoomChat);
    socket.on("comment", handleRoomChat);

    // Live reaction / like broadcast
    const handleRoomReaction = (data) => {
      const targetRoom = data?.roomId || data?.room_id || currentRoom;
      if (!targetRoom) return;

      const u = data?.user || currentUser || { full_name: "Guest" };
      const reactionPayload = {
        roomId: targetRoom,
        room_id: targetRoom,
        userId: data?.userId || data?.user_id || u?.id,
        user_id: data?.userId || data?.user_id || u?.id,
        userName: data?.userName || data?.user_name || u?.full_name || u?.name,
        user_name: data?.userName || data?.user_name || u?.full_name || u?.name,
        userAvatar: data?.userAvatar || data?.user_avatar || u?.avatar_url || u?.profile_picture,
        user_avatar: data?.userAvatar || data?.user_avatar || u?.avatar_url || u?.profile_picture,
        packageCategoryName: data?.packageCategoryName || data?.package_category_name || u?.package_category_name,
        package_category_name: data?.packageCategoryName || data?.package_category_name || u?.package_category_name,
        packageImage: data?.packageImage || data?.package_image || u?.package_image,
        package_image: data?.packageImage || data?.package_image || u?.package_image,
        emoji: data?.emoji || data?.reaction || "❤️",
        reaction: data?.emoji || data?.reaction || "❤️",
        startX: data?.startX ?? data?.start_x ?? 0.5,
        start_x: data?.startX ?? data?.start_x ?? 0.5,
        user: u,
        timestamp: new Date().toISOString(),
      };

      io.to(targetRoom).emit("new-reaction", reactionPayload);
    };

    socket.on("send-reaction", handleRoomReaction);
    socket.on("new-reaction", handleRoomReaction);
    socket.on("reaction", handleRoomReaction);
    socket.on("like", handleRoomReaction);

    // Live Gift broadcast with real-time room & user coin updates
    const handleGiftSentSocket = (giftEvent) => {
      if (!giftEvent) return;
      const targetRoomId = giftEvent.roomId || giftEvent.room_id;
      if (!targetRoomId) return;

      const payload = {
        ...giftEvent,
        timestamp: giftEvent.timestamp || new Date().toISOString(),
      };

      // Broadcast full gift explosion event to all room participants across all standard event names
      const roomKey = String(targetRoomId).trim();
      io.to(roomKey).emit('gift-broadcast', payload);
      io.to(roomKey).emit('gift_broadcast', payload);
      io.to(roomKey).emit('gift_received', payload);
      io.to(roomKey).emit('gift:received', payload);
      io.to(roomKey).emit('gift-sent', payload);
      io.to(roomKey).emit('gift_sent', payload);
      io.to(roomKey).emit('room_gift', payload);

      const senderId = giftEvent.sender_id || giftEvent.senderId || giftEvent.sender?.id;
      const receiverId = giftEvent.receiver_id || giftEvent.receiverId || giftEvent.receiver?.id;
      const senderCoin = giftEvent.sender_updated_coin ?? giftEvent.senderUpdatedCoin ?? giftEvent.sender?.updated_coin;
      const receiverCoin = giftEvent.receiver_updated_coin ?? giftEvent.receiverUpdatedCoin ?? giftEvent.receiver?.updated_coin;

      if (senderId && senderCoin !== undefined) {
        io.to(roomKey).emit('user_balance_updated', { userId: senderId, coins: senderCoin });
        io.to(`user_${senderId}`).emit('wallet_balance_updated', { coins: senderCoin });
      }
      if (receiverId && receiverCoin !== undefined) {
        io.to(roomKey).emit('user_balance_updated', { userId: receiverId, coins: receiverCoin });
        io.to(`user_${receiverId}`).emit('wallet_balance_updated', { coins: receiverCoin });
      }
    };

    socket.on('gift-sent', handleGiftSentSocket);
    socket.on('gift_sent', handleGiftSentSocket);
    socket.on('send-gift', handleGiftSentSocket);
    socket.on('send_gift', handleGiftSentSocket);

    // Admin/Host/Moderator ends the stream
    const handleCloseStreamSocket = async ({ roomId, reason, closedBy }) => {
      if (!roomId) return;
      try {
        const isNum = /^\d+$/.test(String(roomId).trim());
        const rooms = await query(
          'SELECT id, room_id, host_id FROM live_rooms WHERE room_id = ? OR id = ?',
          [String(roomId), isNum ? Number(roomId) : -1]
        );
        const room = rooms.length > 0 ? rooms[0] : null;
        const canonicalRoomId = room ? room.room_id : String(roomId);
        const numericRoomId = room ? room.id : null;

        // Mark room ended and clean up all runtime room data
        if (numericRoomId) {
          await query("UPDATE live_rooms SET status = 'ended', viewer_count = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?", [numericRoomId]);
        } else {
          await query("UPDATE live_rooms SET status = 'ended', viewer_count = 0, ended_at = CURRENT_TIMESTAMP WHERE room_id = ?", [canonicalRoomId]);
        }

        await query('DELETE FROM live_room_seats WHERE room_id = ? OR room_id = ?', [canonicalRoomId, String(numericRoomId || '')]);
        await query('DELETE FROM live_room_viewers WHERE room_id = ? OR room_id = ?', [canonicalRoomId, String(numericRoomId || '')]);
        await query('DELETE FROM live_room_seat_requests WHERE room_id = ? OR room_id = ?', [canonicalRoomId, String(numericRoomId || '')]);
        await query('DELETE FROM live_room_admins WHERE room_id = ? OR room_id = ?', [canonicalRoomId, String(numericRoomId || '')]);

        roomViewers.delete(canonicalRoomId);
        roomViewers.delete(String(roomId));
        if (numericRoomId) roomViewers.delete(String(numericRoomId));

        await Promise.allSettled([
          cache.delByPattern('mobile:rooms:*'),
          cache.del(`mobile:room_details:${canonicalRoomId}`),
          cache.del(`mobile:room_details:${roomId}`),
          numericRoomId ? cache.del(`mobile:room_details:${numericRoomId}`) : null,
          cache.delByPattern(`mobile:room:users:${canonicalRoomId}*`),
          cache.delByPattern(`mobile:room:users:${roomId}*`),
          cache.del(`mobile:live:seat_requests:${canonicalRoomId}`),
          cache.del(`mobile:live:room_admins:${canonicalRoomId}`),
          cache.del(`room:${canonicalRoomId}`),
          numericRoomId ? cache.del(`room:${numericRoomId}`) : null,
        ]);

        const closePayload = {
          roomId: canonicalRoomId,
          numericRoomId,
          closedBy: closedBy || socket.userId,
          message: 'Stream has been closed.',
          reason: reason || 'Stream closed by host/moderator',
          timestamp: new Date().toISOString(),
        };

        io.to(canonicalRoomId).emit('room-closed', closePayload);
        io.to(canonicalRoomId).emit('viewer-count-update', { roomId: canonicalRoomId, count: 0, viewer_count: 0 });

        // Evict / unsubscribe ALL sockets from this room channel
        if (typeof io.socketsLeave === 'function') {
          for (const ch of targetRooms) {
            io.socketsLeave(ch);
          }
        }
      } catch (err) {
        console.error('terminate-stream error:', err.message);
      }
    };

    socket.on('terminate-stream', handleCloseStreamSocket);
    socket.on('close-room', handleCloseStreamSocket);
    socket.on('end-room', handleCloseStreamSocket);

    // -------------------------------------------------------------------
    // 1-ON-1 REAL-TIME CHAT EVENTS
    // -------------------------------------------------------------------
    // Join user room for incoming messages & conversation updates
    socket.on('chat:join', ({ userId, token }) => {
      let uid = userId;
      if (!uid && token) {
        const decoded = verifyToken(String(token).replace(/^Bearer\s+/i, ''));
        if (decoded?.id) uid = decoded.id;
      }
      if (uid) {
        socket.join(`user_${uid}`);
        socket.chatUserId = uid;
        socket.userId = uid;
      }
    });

    // Join specific conversation room (when opening chat screen)
    socket.on('chat:join_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.join(`conversation_${conversationId}`);
      }
    });

    // Leave conversation room
    socket.on('chat:leave_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conversation_${conversationId}`);
      }
    });

    // Real-time Send Message directly over Socket.IO
    socket.on('chat:send_message', async (data, ackCallback) => {
      try {
        let senderId = socket.userId || socket.chatUserId || data?.sender_id || data?.senderId;
        if (!senderId && data?.token) {
          const decoded = verifyToken(String(data.token).replace(/^Bearer\s+/i, ''));
          if (decoded?.id) {
            senderId = decoded.id;
            socket.userId = decoded.id;
            socket.chatUserId = decoded.id;
            socket.join(`user_${decoded.id}`);
          }
        }
        if (senderId && !socket.userId) {
          socket.userId = Number(senderId);
          socket.chatUserId = Number(senderId);
          socket.join(`user_${senderId}`);
        }

        const receiverId = data?.receiver_id || data?.receiverId;
        const messageText = (data?.message || data?.content || data?.text || '').trim();
        let conversationId = data?.conversation_id || data?.conversationId;

        // Helper to detect media type from filename or URL
        const detectMediaType = (urlStr, fallback = 'image') => {
          if (!urlStr || typeof urlStr !== 'string') return fallback;
          const clean = urlStr.split('?')[0].toLowerCase();
          const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v', '.3gp'];
          const audioExts = ['.mp3', '.wav', '.aac', '.ogg', '.m4a'];
          if (videoExts.some((ext) => clean.endsWith(ext))) return 'video';
          if (audioExts.some((ext) => clean.endsWith(ext))) return 'audio';
          return fallback;
        };

        // Gather raw media items from all possible payload fields
        let rawMediaList = [];
        if (data?.media || data?.attachments || data?.media_files || data?.files || data?.images || data?.videos) {
          const rawVal = data?.media || data?.attachments || data?.media_files || data?.files || data?.images || data?.videos;
          try {
            rawMediaList = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
          } catch {
            if (typeof rawVal === 'string' && rawVal.includes(',')) {
              rawMediaList = rawVal.split(',').map((s) => s.trim()).filter(Boolean);
            } else if (typeof rawVal === 'string') {
              rawMediaList = [rawVal.trim()];
            }
          }
        } else if (data?.media_urls || data?.mediaUrls || data?.urls) {
          const rawVal = data?.media_urls || data?.mediaUrls || data?.urls;
          try {
            rawMediaList = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
          } catch {
            rawMediaList = Array.isArray(rawVal) ? rawVal : [rawVal];
          }
        } else if (data?.media_url || data?.mediaUrl || data?.url || data?.file_url) {
          const single = data?.media_url || data?.mediaUrl || data?.url || data?.file_url;
          if (typeof single === 'string' && single.includes(',')) {
            rawMediaList = single.split(',').map((s) => s.trim()).filter(Boolean);
          } else {
            rawMediaList = [
              {
                media_type: data?.media_type || data?.type || detectMediaType(single, 'image'),
                media_url: single,
                thumbnail_url: data?.thumbnail_url || null,
                duration: parseInt(data?.duration || 0, 10),
              },
            ];
          }
        }

        if (!Array.isArray(rawMediaList)) {
          rawMediaList = [rawMediaList];
        }

        // Normalize each media item
        const mediaItems = rawMediaList
          .map((item, idx) => {
            if (!item) return null;
            if (typeof item === 'string') {
              const u = item.trim();
              if (!u) return null;
              return {
                media_type: detectMediaType(u, 'image'),
                media_url: u,
                thumbnail_url: null,
                duration: 0,
                original_name: null,
                size: 0,
                display_order: idx + 1,
              };
            } else if (typeof item === 'object') {
              const u = item.media_url || item.url || item.file_url || item.path || '';
              if (!u) return null;
              let mType = item.media_type || item.type;
              if (!['image', 'video', 'audio'].includes(mType)) {
                mType = detectMediaType(u, 'image');
              }
              return {
                media_type: mType,
                media_url: u,
                thumbnail_url: item.thumbnail_url || null,
                duration: parseInt(item.duration || 0, 10),
                original_name: item.original_name || item.filename || item.name || null,
                size: parseInt(item.size || item.file_size || 0, 10),
                display_order: item.display_order || idx + 1,
              };
            }
            return null;
          })
          .filter(Boolean);

        if (!senderId) {
          const errRes = { success: false, message: 'Unauthorized. User authentication required.' };
          socket.emit('chat:error', errRes);
          return ackCallback?.(errRes);
        }
        if (!receiverId && !conversationId) {
          const errRes = { success: false, message: 'Receiver ID or Conversation ID is required.' };
          socket.emit('chat:error', errRes);
          return ackCallback?.(errRes);
        }
        if (!messageText && mediaItems.length === 0) {
          const errRes = { success: false, message: 'Message text or media is required.' };
          socket.emit('chat:error', errRes);
          return ackCallback?.(errRes);
        }

        // Determine primaryType and primaryMediaUrl
        let primaryType = data?.message_type || data?.messageType || 'text';
        if (mediaItems.length === 1) {
          primaryType = mediaItems[0].media_type;
        } else if (mediaItems.length > 1) {
          primaryType = 'multiple';
        }

        const primaryMediaUrl = mediaItems.length > 0 ? mediaItems[0].media_url : null;

        // 1. Resolve receiver ID if only conversationId was provided
        let targetReceiverId = receiverId;
        if (!targetReceiverId && conversationId) {
          const [conv] = await query('SELECT user1_id, user2_id FROM conversations WHERE id = ?', [conversationId]);
          if (conv) {
            targetReceiverId = conv.user1_id === senderId ? conv.user2_id : conv.user1_id;
          }
        }

        if (!targetReceiverId) {
          const errRes = { success: false, message: 'Recipient user not found.' };
          socket.emit('chat:error', errRes);
          return ackCallback?.(errRes);
        }

        // 2. Resolve or create conversation ID (lower ID first for uniqueness)
        if (!conversationId && targetReceiverId) {
          const u1 = Math.min(senderId, targetReceiverId);
          const u2 = Math.max(senderId, targetReceiverId);
          const [existingConv] = await query('SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?', [u1, u2]);
          if (existingConv) {
            conversationId = existingConv.id;
          } else {
            const insConv = await query(
              'INSERT INTO conversations (user1_id, user2_id, last_message, last_message_at) VALUES (?, ?, ?, NOW())',
              [u1, u2, messageText || `[${primaryType}]`]
            );
            conversationId = insConv.insertId;
          }
        }

        // Compose last_message snippet for conversation preview
        let snippet = messageText;
        if (!snippet) {
          if (mediaItems.length > 1) {
            const allVideos = mediaItems.every((m) => m.media_type === 'video');
            const allImages = mediaItems.every((m) => m.media_type === 'image');
            if (allVideos) snippet = `🎥 [${mediaItems.length} Videos]`;
            else if (allImages) snippet = `🖼️ [${mediaItems.length} Photos]`;
            else snippet = `📎 [${mediaItems.length} Attachments]`;
          } else if (mediaItems.length === 1) {
            if (mediaItems[0].media_type === 'video') snippet = '🎥 [Video]';
            else if (mediaItems[0].media_type === 'audio') snippet = '🎵 [Audio]';
            else snippet = '🖼️ [Photo]';
          } else {
            snippet = `[${primaryType}]`;
          }
        }

        // Check quoted message if replying
        const rawReplyToId = data?.reply_to_id || data?.reply_to_message_id || data?.replyToId;
        const replyToId = rawReplyToId ? parseInt(rawReplyToId, 10) : null;
        let quotedMessage = null;
        if (replyToId) {
          const qRows = await query(
            `SELECT m.id, m.sender_id, m.message_type, m.message, m.media_url, u.full_name as sender_name 
             FROM chat_messages m 
             JOIN users u ON u.id = m.sender_id 
             WHERE m.id = ? AND m.conversation_id = ? LIMIT 1`,
            [replyToId, conversationId]
          ).catch(() => []);
          if (qRows && qRows.length > 0) {
            quotedMessage = {
              id: qRows[0].id,
              sender_id: qRows[0].sender_id,
              sender_name: qRows[0].sender_name || 'User',
              message_type: qRows[0].message_type || 'text',
              message: qRows[0].message,
              media_url: qRows[0].media_url || null,
            };
          }
        }

        // 3. MySQL SSOT: Insert message
        const insMsg = await query(
          'INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, reply_to_id, message_type, message, media_url, media, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
          [
            conversationId,
            senderId,
            targetReceiverId,
            quotedMessage ? quotedMessage.id : null,
            primaryType,
            messageText || null,
            primaryMediaUrl,
            mediaItems.length > 0 ? JSON.stringify(mediaItems) : null,
          ]
        );
        const messageId = insMsg.insertId;

        // Insert individual items into chat_message_media
        if (mediaItems.length > 0) {
          for (let i = 0; i < mediaItems.length; i++) {
            const item = mediaItems[i];
            const mType = ['image', 'video', 'audio'].includes(item.media_type) ? item.media_type : 'image';
            const mUrl = item.media_url;
            if (mUrl) {
              await query(
                `INSERT INTO chat_message_media (message_id, media_type, media_url, thumbnail_url, file_name, file_size, duration, display_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  messageId,
                  mType,
                  mUrl,
                  item.thumbnail_url || null,
                  item.original_name || null,
                  parseInt(item.size || 0, 10),
                  parseInt(item.duration || 0, 10),
                  item.display_order || i + 1,
                ]
              ).catch(() => {});
            }
          }
        }

        // 4. Update conversation last_message and unhide for both users
        await query('UPDATE conversations SET last_message = ?, last_message_at = NOW(), user1_hidden = 0, user2_hidden = 0 WHERE id = ?', [snippet, conversationId]);

        // 5. Fetch sender profile
        const [senderProfile] = await query(`
          SELECT u.id, u.full_name, u.avatar_url, u.role, u.level, u.star, u.vip_package,
                 pc.id as package_category_id, pc.name as package_category_name, 
                 pc.badge_icon as package_badge_icon, pc.color_code as package_color_code
          FROM users u
          LEFT JOIN user_package_subscriptions ups 
            ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
          LEFT JOIN package_categories pc 
            ON pc.id = ups.category_id AND pc.is_active = 1
          WHERE u.id = ? LIMIT 1
        `, [senderId]);

        const packageCategory = {
          id: senderProfile?.package_category_id || null,
          name: senderProfile?.package_category_name || senderProfile?.vip_package || 'Standard',
          badge_icon: senderProfile?.package_badge_icon || null,
          color_code: senderProfile?.package_color_code || '#f59e0b',
        };

        const newMessage = {
          id: messageId,
          conversation_id: conversationId,
          sender_id: senderId,
          receiver_id: targetReceiverId,
          reply_to_id: quotedMessage ? quotedMessage.id : null,
          reply_to: quotedMessage,
          message_type: primaryType,
          message: messageText,
          media_url: primaryMediaUrl,
          media: mediaItems,
          is_read: false,
          created_at: new Date().toISOString(),
          sender: {
            id: senderId,
            name: senderProfile?.full_name || 'Anonymous',
            profile_picture: senderProfile?.avatar_url || null,
            role: senderProfile?.role || 'user',
            level: senderProfile?.level || 1,
            star: senderProfile?.star || 0,
            package_category: packageCategory,
          },
        };

        // 6. Invalidate Redis Caches
        await cache.delByPattern(`chat:conversations:${senderId}:*`);
        await cache.delByPattern(`chat:conversations:${targetReceiverId}:*`);
        await cache.delByPattern(`chat:messages:${conversationId}:*`);
        await cache.del(`chat:conv:${conversationId}`);

        // 7. Broadcast Real-Time Events via Socket.IO
        const socketPayload = {
          message: newMessage,
          conversation_id: conversationId,
          sender_id: senderId,
          receiver_id: targetReceiverId,
        };

        // Deliver to receiver and sender user rooms
        io.to(`user_${targetReceiverId}`).emit('chat:new_message', socketPayload);
        io.to(`user_${senderId}`).emit('chat:new_message', socketPayload);

        // Deliver to active conversation room
        io.to(`conversation_${conversationId}`).emit('chat:new_message', socketPayload);

        // Update conversation list for both users
        io.to(`user_${targetReceiverId}`).emit('chat:conversation_update', {
          conversation_id: conversationId,
          last_message: snippet,
          last_message_at: newMessage.created_at,
          sender_id: senderId,
          unread_increment: true,
        });

        io.to(`user_${senderId}`).emit('chat:conversation_update', {
          conversation_id: conversationId,
          last_message: snippet,
          last_message_at: newMessage.created_at,
          sender_id: senderId,
          unread_increment: false,
        });

        // Trigger Firebase Cloud Messaging (FCM) Push Notification to recipient
        sendChatPushNotification({
          receiverId: targetReceiverId,
          sender: {
            id: senderId,
            name: senderProfile?.full_name || 'Someone',
            full_name: senderProfile?.full_name || 'Someone',
            avatar_url: senderProfile?.avatar_url || null,
            profile_picture: senderProfile?.avatar_url || null,
          },
          message: messageText,
          conversationId,
          media: mediaItems,
          primaryType,
        }).catch((pushErr) => console.error('[Socket FCM Push] Non-blocking push error:', pushErr.message));

        ackCallback?.({ success: true, message: newMessage, data: newMessage });
      } catch (err) {
        console.error('Socket chat:send_message error:', err.message);
        ackCallback?.({ success: false, message: 'Failed to send message over socket.', error: err.message });
      }
    });

    // Real-time typing indicators
    socket.on('chat:typing', ({ conversationId, receiverId, isTyping }) => {
      const senderId = socket.userId || socket.chatUserId || currentUser?.id;
      if (receiverId) {
        io.to(`user_${receiverId}`).emit('chat:user_typing', {
          conversation_id: conversationId,
          sender_id: senderId,
          is_typing: !!isTyping,
        });
      }
      if (conversationId) {
        socket.to(`conversation_${conversationId}`).emit('chat:user_typing', {
          conversation_id: conversationId,
          sender_id: senderId,
          is_typing: !!isTyping,
        });
      }
    });

    // Real-time mark read (Supports chat:mark_read and chat:read)
    const handleMarkRead = async (data = {}, ackCallback) => {
      try {
        const conversationId = data?.conversationId || data?.conversation_id;
        const senderId = data?.senderId || data?.sender_id;
        let userId = socket.userId || socket.chatUserId || data?.userId || data?.user_id;
        if (!userId && data?.token) {
          const decoded = verifyToken(String(data.token).replace(/^Bearer\s+/i, ''));
          if (decoded?.id) userId = decoded.id;
        }
        if (conversationId && userId) {
          // MySQL SSOT: Mark messages as read
          await query(
            'UPDATE chat_messages SET is_read = 1 WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0',
            [conversationId, userId]
          );
          await cache.delByPattern(`chat:messages:${conversationId}:*`);
          await cache.delByPattern(`chat:conversations:${userId}:*`);

          const targetSender = senderId || (await query('SELECT user1_id, user2_id FROM conversations WHERE id = ?', [conversationId]))[0];
          const otherUserId = targetSender?.user1_id === userId ? targetSender?.user2_id : targetSender?.user1_id;
          const notifyUserId = senderId || otherUserId;

          if (notifyUserId) {
            io.to(`user_${notifyUserId}`).emit('chat:messages_read', {
              conversation_id: conversationId,
              read_by: userId,
            });
          }
          io.to(`conversation_${conversationId}`).emit('chat:messages_read', {
            conversation_id: conversationId,
            read_by: userId,
          });

          ackCallback?.({ success: true, message: 'Messages marked as read.' });
        }
      } catch (err) {
        console.error('Socket chat:mark_read error:', err.message);
      }
    };

    socket.on('chat:mark_read', handleMarkRead);
    socket.on('chat:read', handleMarkRead);

    // Real-time Chat Background Update (Shared for both participants)
    socket.on('chat:update_background', async (data, ackCallback) => {
      try {
        const userId = socket.userId || socket.chatUserId || data?.userId;
        const conversationId = data?.conversation_id || data?.conversationId;
        const backgroundImage = data?.background_image || data?.backgroundImage || null;
        const backgroundColor = data?.background_color || data?.backgroundColor || null;

        if (!userId || !conversationId) {
          ackCallback?.({ success: false, message: 'User ID and conversation ID required.' });
          return;
        }

        const convRows = await query('SELECT user1_id, user2_id FROM conversations WHERE id = ? LIMIT 1', [conversationId]);
        if (!convRows || convRows.length === 0) {
          ackCallback?.({ success: false, message: 'Conversation not found.' });
          return;
        }

        const conv = convRows[0];
        const partnerId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;

        await query(
          'UPDATE conversations SET background_image = ?, background_color = ?, background_updated_by = ?, background_updated_at = NOW() WHERE id = ?',
          [backgroundImage, backgroundColor, userId, conversationId]
        );

        await cache.delByPattern(`chat:conversations:${userId}:*`);
        await cache.delByPattern(`chat:conversations:${partnerId}:*`);
        await cache.del(`chat:conv:${conversationId}`);

        const bgPayload = {
          conversation_id: conversationId,
          background_image: backgroundImage,
          background_color: backgroundColor,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        };

        io.to(`user_${partnerId}`).emit('chat:background_updated', bgPayload);
        io.to(`user_${userId}`).emit('chat:background_updated', bgPayload);
        io.to(`conversation_${conversationId}`).emit('chat:background_updated', bgPayload);

        ackCallback?.({ success: true, background: bgPayload });
      } catch (err) {
        console.error('Socket chat:update_background error:', err.message);
        ackCallback?.({ success: false, message: err.message });
      }
    });

    // Real-time Clear Chat Messages for Caller
    socket.on('chat:clear_chat', async (data, ackCallback) => {
      try {
        const userId = socket.userId || socket.chatUserId || data?.userId;
        const conversationId = data?.conversation_id || data?.conversationId;

        if (!userId || !conversationId) {
          ackCallback?.({ success: false, message: 'User ID and conversation ID required.' });
          return;
        }

        const convRows = await query('SELECT user1_id, user2_id FROM conversations WHERE id = ? LIMIT 1', [conversationId]);
        if (!convRows || convRows.length === 0) {
          ackCallback?.({ success: false, message: 'Conversation not found.' });
          return;
        }

        const conv = convRows[0];
        const clearField = conv.user1_id === userId ? 'user1_cleared_at' : 'user2_cleared_at';
        await query(`UPDATE conversations SET ${clearField} = NOW() WHERE id = ?`, [conversationId]);

        await cache.delByPattern(`chat:conversations:${userId}:*`);
        await cache.delByPattern(`chat:messages:${conversationId}:u:${userId}:*`);

        const clearedPayload = {
          conversation_id: conversationId,
          cleared_by: userId,
          cleared_at: new Date().toISOString(),
        };

        io.to(`user_${userId}`).emit('chat:chat_cleared', clearedPayload);
        ackCallback?.({ success: true, ...clearedPayload });
      } catch (err) {
        console.error('Socket chat:clear_chat error:', err.message);
        ackCallback?.({ success: false, message: err.message });
      }
    });

    // Disconnecting - captures rooms before socket leaves
    socket.on('disconnecting', () => {
      try {
        for (const r of socket.rooms) {
          if (r !== socket.id && !r.startsWith('user_') && !r.startsWith('conversation_')) {
            if (!socket.currentRoom) {
              socket.currentRoom = r;
            }
          }
        }
      } catch (err) {
        console.error('Socket disconnecting error:', err.message);
      }
    });

    // Disconnect cleanup (handles phone power off, app kill, network loss)
    socket.on('disconnect', async (reason) => {
      try {
        const targetRoom = socket.currentRoom || currentRoom;
        const targetUserId = socket.userId || currentUser?.id || socket.currentUser?.id;
        const targetUser = socket.currentUser || currentUser;

        if (targetRoom && targetUserId) {
          if (roomViewers.has(targetRoom)) {
            roomViewers.get(targetRoom).delete(socket.id);
          }
          await cleanupUserFromRoom(targetRoom, targetUserId, io, targetUser, 'disconnect');
        }

        // FAIL-SAFE: If this disconnecting user is the host of ANY active live room, terminate immediately!
        if (targetUserId) {
          const activeHostRooms = await query(
            "SELECT id, room_id, host_id FROM live_rooms WHERE host_id = ? AND status = 'live'",
            [targetUserId]
          );
          for (const aRoom of activeHostRooms) {
            console.log(`🔴 [Host Disconnected App Close] Host ${targetUserId} closed app/disconnected while room ${aRoom.room_id} is live. Terminating room now...`);
            await executeRoomTermination(aRoom.room_id, aRoom.id, targetUserId, io, 'host_disconnected');
          }
        }
      } catch (err) {
        console.error('Socket disconnect error:', err.message);
      }
    });
  });

  return io;
}

export default setupLiveSocket;
