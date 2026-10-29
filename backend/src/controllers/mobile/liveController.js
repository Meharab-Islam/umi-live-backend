import { v4 as uuidv4 } from 'uuid';
import { cache } from '../../config/redis.js';
import { query } from '../../config/db.js';
import { generateLiveKitToken, LIVEKIT_URL } from '../../config/livekit.js';
import { sendLiveRoomStartedPushNotification } from '../../config/firebase.js';
import { cancelHostDisconnectGraceTimer, hostDisconnectGraceTimers, clearRoomMemoryState } from '../../sockets/liveSocket.js';
import { checkStreamRewardStatus, claimAndAwardLiveReward } from '../../services/liveRewardService.js';
import { notifyLiveStarted, handleLiveEndedNotifications } from '../../services/notificationService.js';
import { checkUserSelfSeatAcceptPrivilege, checkUserInvisibleRoomEnterPrivilege } from '../../services/userPrivilegeService.js';
import { getRoomMusicState, setRoomMusicState, clearRoomMusicState } from '../../services/roomMusicService.js';

/**
 * Format elapsed seconds into standard timer format:
 * HH:MM:SS (if >= 1 hour) or MM:SS
 */
function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Build rich, structured room data including:
 * - Room ID & Basic Meta
 * - Room background image URL & cover image
 * - Total seats count & live stream type (video/audio)
 * - Elapsed live duration in seconds & formatted string (HH:MM:SS)
 * - Comprehensive Seat details:
 *     - seat_number, is_main_seat, is_occupied, is_camera_on, is_muted, is_locked
 *     - user (name, profile/avatar, coin, diamond if enabled, is_main_seat, camera & mute state)
 */
export async function buildRoomResponse(roomId, currentUser = null) {
  // 1. Fetch Room & Host info (supports numeric id or string room_id)
  const isNum = /^\d+$/.test(String(roomId).trim());
  const rooms = await query(
    `SELECT r.id, r.room_id, r.host_id, r.title, r.category, r.live_type, r.total_seats,
            r.cover_image, r.background_image, r.status, r.viewer_count, r.total_diamonds,
            r.is_comment_disabled, r.is_reaction_disabled, r.is_locked, r.room_password,
            r.stream_key, r.started_at, r.created_at,
            u.full_name as host_name, u.avatar_url as host_avatar, u.level as host_level,
            u.coins as host_coins, u.diamonds as host_diamonds, u.role as host_role,
            COALESCE(pp.image_url, pc.badge_icon, '') as host_package_image,
            pc.color_code as host_package_color,
            pc.name as host_package_category_name
     FROM live_rooms r
     JOIN users u ON r.host_id = u.id
     LEFT JOIN user_package_subscriptions ups 
       ON ups.id = (
         SELECT id FROM user_package_subscriptions 
         WHERE user_id = u.id AND status = 'active' AND expires_at > NOW() 
         ORDER BY is_equipped DESC, expires_at DESC LIMIT 1
       )
     LEFT JOIN privilege_packages pp ON pp.id = ups.package_id
     LEFT JOIN package_categories pc ON pc.id = ups.category_id AND pc.is_active = 1
     WHERE r.room_id = ? OR r.id = ?
     LIMIT 1`,
    [String(roomId), isNum ? Number(roomId) : -1]
  );

  if (rooms.length === 0) return null;
  const room = rooms[0];
  const canonicalRoomId = room.room_id;

  // 2. Check Diamond Mode & Screen Security from system_settings
  const settingRows = await query(
    "SELECT key_name, key_value FROM system_settings WHERE key_name IN ('is_convert_to_diamond', 'live_screen_guard_enabled', 'live_screen_record_enabled', 'live_screen_share_enabled', 'screen_guard_creator_bypass', 'screen_guard_allow_creator_record', 'screen_guard_allow_creator_share')"
  );
  const settingsMap = {};
  for (const r of settingRows) settingsMap[r.key_name] = r.key_value;
  const isDiamondMode = settingsMap['is_convert_to_diamond'] !== 'false';

  // 3. Calculate Live Duration
  const startedAt = new Date(room.started_at || room.created_at);
  const now = new Date();
  const durationSeconds = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
  const liveDurationFormatted = formatDuration(durationSeconds);

  const totalSeats = parseInt(room.total_seats, 10) || 8;

  // 4. Fetch Seats from live_room_seats
  let seatRows = await query(
    `SELECT s.id as seat_id, s.seat_number, s.is_main_seat, s.is_camera_on, s.is_muted, s.is_locked,
            u.id as user_id, u.full_name as user_name, u.avatar_url as user_avatar,
            u.coins as user_coin, u.diamonds as user_diamond, u.role as user_role, u.level as user_level,
            st.image_url as equipped_thumbnail,
            ee.preview_image_url as equipped_entry_preview,
            ee.svga_url as equipped_entry_svga,
            COALESCE(pp.image_url, pc.badge_icon, '') as package_image,
            pc.color_code as package_color,
            pc.name as package_category_name
     FROM live_room_seats s
     LEFT JOIN users u ON s.user_id = u.id
     LEFT JOIN user_thumbnails ut ON ut.user_id = u.id AND ut.status = 'active' AND ut.is_equipped = 1 AND ut.expires_at > NOW()
     LEFT JOIN special_thumbnails st ON ut.thumbnail_id = st.id
     LEFT JOIN user_entry_effects uee ON uee.user_id = u.id AND uee.status = 'active' AND uee.is_equipped = 1 AND uee.expires_at > NOW()
     LEFT JOIN entry_effects ee ON uee.effect_id = ee.id
     LEFT JOIN user_package_subscriptions ups 
       ON ups.id = (
         SELECT id FROM user_package_subscriptions 
         WHERE user_id = u.id AND status = 'active' AND expires_at > NOW() 
         ORDER BY is_equipped DESC, expires_at DESC LIMIT 1
       )
     LEFT JOIN privilege_packages pp ON pp.id = ups.package_id
     LEFT JOIN package_categories pc ON pc.id = ups.category_id AND pc.is_active = 1
     WHERE (s.room_id = ? OR s.room_id = ?)
     ORDER BY s.seat_number ASC`,
    [canonicalRoomId, String(roomId)]
  );

  // If seats haven't been seeded for this room yet, auto-initialize
  if (seatRows.length === 0) {
    await query(
      `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
       VALUES (?, 1, ?, 1, 1, 0)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), is_main_seat = 1`,
      [canonicalRoomId, room.host_id]
    );
    for (let s = 2; s <= totalSeats; s++) {
      await query(
        `INSERT IGNORE INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
         VALUES (?, ?, NULL, 0, 0, 0)`,
        [canonicalRoomId, s]
      );
    }
    seatRows = await query(
      `SELECT s.id as seat_id, s.seat_number, s.is_main_seat, s.is_camera_on, s.is_muted, s.is_locked,
              u.id as user_id, u.full_name as user_name, u.avatar_url as user_avatar,
              u.coins as user_coin, u.diamonds as user_diamond, u.role as user_role, u.level as user_level,
              st.image_url as equipped_thumbnail,
              ee.preview_image_url as equipped_entry_preview,
              ee.svga_url as equipped_entry_svga,
              COALESCE(pp.image_url, pc.badge_icon, '') as package_image,
              pc.color_code as package_color,
              pc.name as package_category_name
       FROM live_room_seats s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN user_thumbnails ut ON ut.user_id = u.id AND ut.status = 'active' AND ut.is_equipped = 1 AND ut.expires_at > NOW()
       LEFT JOIN special_thumbnails st ON ut.thumbnail_id = st.id
       LEFT JOIN user_entry_effects uee ON uee.user_id = u.id AND uee.status = 'active' AND uee.is_equipped = 1 AND uee.expires_at > NOW()
       LEFT JOIN entry_effects ee ON uee.effect_id = ee.id
       LEFT JOIN user_package_subscriptions ups 
         ON ups.id = (
           SELECT id FROM user_package_subscriptions 
           WHERE user_id = u.id AND status = 'active' AND expires_at > NOW() 
           ORDER BY is_equipped DESC, expires_at DESC LIMIT 1
         )
       LEFT JOIN privilege_packages pp ON pp.id = ups.package_id
       LEFT JOIN package_categories pc ON pc.id = ups.category_id AND pc.is_active = 1
       WHERE (s.room_id = ? OR s.room_id = ?)
       ORDER BY s.seat_number ASC`,
      [canonicalRoomId, String(roomId)]
    );
  }

  const seatMap = {};
  for (const row of seatRows) {
    seatMap[row.seat_number] = row;
  }

  // Ensure Seat 1 is occupied by the host
  if (!seatMap[1] || !seatMap[1].user_id) {
    seatMap[1] = {
      seat_number: 1,
      is_main_seat: 1,
      is_camera_on: 1,
      is_muted: 0,
      is_locked: 0,
      user_id: room.host_id,
      user_name: room.host_name,
      user_avatar: room.host_avatar,
      user_coin: room.host_coins,
      user_diamond: room.host_diamonds,
      user_role: room.host_role,
      user_level: room.host_level,
      equipped_thumbnail: null,
      equipped_entry_preview: null,
      equipped_entry_svga: null,
      package_image: room.host_package_image || null,
      package_color: room.host_package_color || null,
      package_category_name: room.host_package_category_name || null,
    };
  }

  const seats = [];
  for (let num = 1; num <= totalSeats; num++) {
    const s = seatMap[num];
    const isOccupied = Boolean(s && s.user_id);
    const isMain = num === 1 || Boolean(s && s.is_main_seat);

    let seatUser = null;
    if (isOccupied) {
      seatUser = {
        id: s.user_id,
        name: s.user_name,
        profile: s.user_avatar,
        coin: s.user_coin ?? 0,
        ...(isDiamondMode ? { diamond: s.user_diamond ?? 0 } : {}),
        role: s.user_role || 'user',
        level: s.user_level || 1,
        is_camera_on: Boolean(s.is_camera_on),
        is_muted: Boolean(s.is_muted),
        is_main_seat: isMain,
        is_spotlight: isMain,
        equipped_thumbnail: s.equipped_thumbnail || null,
        thumbnail: s.equipped_thumbnail || null,
        equipped_entry_effect: s.equipped_entry_svga || s.equipped_entry_preview || null,
        entry_effect: s.equipped_entry_svga || s.equipped_entry_preview || null,
        package_image: s.package_image || null,
        package_color: s.package_color || null,
        package_category_name: s.package_category_name || null,
      };
    }

    seats.push({
      seat_number: num,
      user_id: seatUser ? seatUser.id : null,
      user_name: seatUser ? seatUser.name : null,
      user_avatar: seatUser ? (seatUser.profile || seatUser.avatar) : null,
      is_main_seat: isMain,
      is_spotlight: isMain,
      is_occupied: isOccupied,
      is_empty: !isOccupied,
      is_locked: Boolean(s && s.is_locked),
      is_open: !isOccupied && !Boolean(s && s.is_locked),
      is_camera_on: isOccupied ? Boolean(s.is_camera_on) : false,
      is_muted: isOccupied ? Boolean(s.is_muted) : false,
      package_image: seatUser ? seatUser.package_image : null,
      package_color: seatUser ? seatUser.package_color : null,
      package_category_name: seatUser ? seatUser.package_category_name : null,
      user: seatUser,
    });
  }

  const bgUrl = (room.background_image && room.background_image.trim()) ? room.background_image.trim() : null;

  const roomResponse = {
    id: room.id,
    room_id: room.room_id,
    host_id: room.host_id,
    host_name: room.host_name,
    host_avatar: room.host_avatar,
    host_level: room.host_level,
    host_coins: room.host_coins,
    host_diamonds: room.host_diamonds,
    title: room.title,
    category: room.category,
    live_type: room.live_type || 'video',
    is_audio: (room.live_type || 'video') === 'audio',
    is_video: (room.live_type || 'video') === 'video',
    spotlight_seat_number: 1,
    spotlight_user_id: seatMap[1]?.user_id || room.host_id,
    spotlight_user: seats[0]?.user || null,
    background_image_url: bgUrl,
    room_background_url: bgUrl,
    thumbnail_url: bgUrl,
    background_thumbnail: bgUrl,
    status: room.status,
    viewer_count: room.viewer_count,
    total_diamonds: room.total_diamonds,
    is_comment_disabled: Boolean(room.is_comment_disabled),
    is_reaction_disabled: Boolean(room.is_reaction_disabled),
    is_locked: Boolean(room.is_locked),
    is_password_protected: Boolean(room.is_locked && room.room_password),
    started_at: room.started_at,
    live_duration: {
      started_at: room.started_at,
      duration_seconds: durationSeconds,
      duration_formatted: liveDurationFormatted,
      duration: liveDurationFormatted,
    },
    live_duration_seconds: durationSeconds,
    live_duration_formatted: liveDurationFormatted,
    total_seats: totalSeats,
    occupied_seats_count: seats.filter((st) => st.is_occupied).length,
    empty_seats_count: seats.filter((st) => !st.is_occupied).length,
    open_seats_count: seats.filter((st) => !st.is_occupied && !st.is_locked).length,
    locked_seats_count: seats.filter((st) => st.is_locked).length,
    muted_seats_count: seats.filter((st) => st.is_occupied && st.is_muted).length,
    unmuted_seats_count: seats.filter((st) => st.is_occupied && !st.is_muted).length,
    host: {
      id: room.host_id,
      name: room.host_name,
      profile: room.host_avatar,
      level: room.host_level,
      coin: room.host_coins,
      package_image: room.host_package_image || null,
      package_color: room.host_package_color || null,
      package_category_name: room.host_package_category_name || null,
      ...(isDiamondMode ? { diamond: room.host_diamonds || 0 } : {}),
    },
    seats,
  };

  // Screen Security & Screen Guard Permissions
  const isRoomCreator = currentUser && (Number(currentUser.id) === Number(room.host_id));
  const creatorBypass = settingsMap['screen_guard_creator_bypass'] !== 'false';
  const creatorCanRecord = settingsMap['screen_guard_allow_creator_record'] !== 'false';
  const creatorCanShare = settingsMap['screen_guard_allow_creator_share'] !== 'false';
  const globalGuardEnabled = settingsMap['live_screen_guard_enabled'] !== 'false';
  const globalRecordEnabled = settingsMap['live_screen_record_enabled'] === 'true';
  const globalShareEnabled = settingsMap['live_screen_share_enabled'] !== 'false';

  roomResponse.screen_security = {
    is_room_creator: Boolean(isRoomCreator),
    screen_guard_enabled: globalGuardEnabled,
    is_screen_guard_active: isRoomCreator ? (!creatorBypass && globalGuardEnabled) : globalGuardEnabled,
    can_screen_record: isRoomCreator ? (creatorCanRecord || globalRecordEnabled) : globalRecordEnabled,
    can_screen_share: isRoomCreator ? (creatorCanShare || globalShareEnabled) : globalShareEnabled,
    bypass_screen_guard: isRoomCreator ? creatorBypass : false,
  };

  // Only host or admin gets the stream_key and plain room_password
  if (currentUser && (Number(currentUser.id) === Number(room.host_id) || currentUser.role === 'admin' || currentUser.role === 'superadmin')) {
    roomResponse.stream_key = room.stream_key;
    if (room.room_password) {
      roomResponse.room_password = room.room_password;
    }
  }

  // Active YouTube Music & Stream BGM Playback State Sync
  const musicState = await getRoomMusicState(room.room_id || room.id);
  roomResponse.youtube_music = musicState || null;
  roomResponse.music = musicState || null;

  return roomResponse;
}

/**
 * Mobile Live Rooms Explore Feed
 * GET /api/mobile/live/rooms
 * 
 * Production-Grade Ultra-Low Overhead Architecture:
 * - Shared Master Redis Cache (5s TTL): All mobile users share the same master feed.
 *   Even with 10,000+ concurrent polling clients, MySQL is executed at most once every 5 seconds.
 * - In-Memory Host Self-Exclusion: Excludes user's own broadcast room in RAM (<0.01ms).
 * - HTTP ETag / 304 Not Modified: Saves 99% network bandwidth & CPU when live cards have not changed.
 */
export async function getRooms(req, res) {
  try {
    const currentUserId = req.user?.id;
    const { category, search, live_type, liveType, type, status = 'live', page = 1, limit = 20 } = req.query;
    const filterLiveType = (live_type || liveType || type || '').toLowerCase().trim();

    // Shared Master Cache Key across all users
    const masterCacheKey = `mobile:rooms:master_feed:${filterLiveType || 'all'}:${category || 'all'}:${search || ''}:${status}:${page}:${limit}`;

    const masterData = await cache.getOrSet(masterCacheKey, 5, async () => {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      let whereClauses = ['r.status = ?'];
      let params = [status];

      // Exclude rooms hosted by superadmin
      whereClauses.push("u.role != 'superadmin'");

      // Exclude rooms currently in disconnected/reconnecting grace period
      if (hostDisconnectGraceTimers && hostDisconnectGraceTimers.size > 0) {
        const disIds = Array.from(hostDisconnectGraceTimers.keys());
        const pl = disIds.map(() => '?').join(', ');
        whereClauses.push(`r.room_id NOT IN (${pl})`);
        params.push(...disIds);
      }

      if (['video', 'audio'].includes(filterLiveType)) {
        whereClauses.push('r.live_type = ?');
        params.push(filterLiveType);
      }

      if (category && category !== 'All') {
        whereClauses.push('r.category = ?');
        params.push(category);
      }

      if (search) {
        whereClauses.push('(r.title LIKE ? OR u.full_name LIKE ?)');
        const s = `%${search}%`;
        params.push(s, s);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // 1. Identify Top 2 rooms across the entire platform with highest viewer count
      const top2ViewerRows = await query(
        `SELECT r.id 
         FROM live_rooms r 
         JOIN users u ON r.host_id = u.id 
         ${whereSql} 
         ORDER BY r.viewer_count DESC, r.started_at DESC 
         LIMIT 2`,
        params
      );
      const top2Ids = (top2ViewerRows || []).map((row) => row.id);

      // 2. Dynamic Hybrid Ordering:
      // Priority 0: Top 2 highest-viewer rooms on the platform (Position 1 & 2)
      // Priority 1: Remaining rooms sorted by VIP package display rank, then viewers, then start time
      let orderClause;
      let queryParams = [...params];

      if (top2Ids.length > 0) {
        const top2Placeholders = top2Ids.map(() => '?').join(', ');
        orderClause = `
          ORDER BY 
            CASE WHEN r.id IN (${top2Placeholders}) THEN 0 ELSE 1 END ASC,
            CASE WHEN r.id IN (${top2Placeholders}) THEN r.viewer_count ELSE 0 END DESC,
            vip_rank ASC,
            r.viewer_count DESC,
            r.started_at DESC
        `;
        queryParams = [...params, ...top2Ids, ...top2Ids, parseInt(limit, 10), offset];
      } else {
        orderClause = `ORDER BY vip_rank ASC, r.viewer_count DESC, r.started_at DESC`;
        queryParams = [...params, parseInt(limit, 10), offset];
      }

      const rooms = await query(
        `SELECT r.id, r.room_id, r.host_id, r.title, r.category, r.live_type, r.total_seats,
                r.background_image, r.status,
                r.viewer_count, r.total_diamonds, r.is_comment_disabled, r.is_reaction_disabled, r.is_locked, r.started_at,
                u.full_name as host_name, u.avatar_url as host_avatar, u.level as host_level, u.role as host_role,
                pc.name as host_vip_category,
                pc.badge_icon as host_vip_icon,
                pc.color_code as host_vip_color,
                COALESCE(pp.image_url, pc.badge_icon, '') as package_image,
                COALESCE(pp.image_url, pc.badge_icon, '') as host_package_image,
                COALESCE(CASE WHEN pc.top_live_list = 1 THEN pc.display_order ELSE 999999 END, 999999) as vip_rank
         FROM live_rooms r
         JOIN users u ON r.host_id = u.id
         LEFT JOIN user_package_subscriptions ups 
           ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW()
         LEFT JOIN package_categories pc 
           ON pc.id = ups.category_id AND pc.is_active = 1
         LEFT JOIN privilege_packages pp 
           ON pp.id = ups.package_id
         ${whereSql}
         ${orderClause}
         LIMIT ? OFFSET ?`,
        queryParams
      );

      const [countResult] = await query(
        `SELECT COUNT(*) as total FROM live_rooms r JOIN users u ON r.host_id = u.id ${whereSql}`,
        params
      );

      // Deduplicate rooms by host_id to guarantee no duplicate room card is ever displayed
      const seenHostIds = new Set();
      const uniqueRooms = [];
      for (const rm of rooms) {
        if (!seenHostIds.has(rm.host_id)) {
          seenHostIds.add(rm.host_id);
          const bg = (rm.background_image && rm.background_image.trim()) ? rm.background_image.trim() : null;
          const isTop2Viewer = top2Ids.includes(rm.id);
          const topViewerRank = isTop2Viewer ? (top2Ids.indexOf(rm.id) + 1) : null;

          uniqueRooms.push({
            ...rm,
            is_top_viewer_rank: isTop2Viewer,
            top_viewer_rank: topViewerRank,
            is_audio: rm.live_type === 'audio',
            is_comment_disabled: Boolean(rm.is_comment_disabled),
            is_reaction_disabled: Boolean(rm.is_reaction_disabled),
            is_locked: Boolean(rm.is_locked),
            is_password_protected: Boolean(rm.is_locked),
            background_image_url: bg,
            room_background_url: bg,
            thumbnail_url: bg,
            background_thumbnail: bg,
          });
        }
      }

      return {
        rooms: uniqueRooms,
        total: countResult ? countResult.total : 0,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        version: Date.now(),
      };
    });

    // In-memory instant user exclusion (<0.01ms in RAM)
    let userRooms = masterData.rooms || [];
    let total = masterData.total || 0;
    if (currentUserId && userRooms.length > 0) {
      const filtered = userRooms.filter((rm) => Number(rm.host_id) !== Number(currentUserId));
      if (filtered.length !== userRooms.length) {
        userRooms = filtered;
        total = Math.max(0, total - 1);
      }
    }

    // High-Efficiency ETag / 304 Not Modified Support
    const etagSeed = `${userRooms.length}_${userRooms.map((r) => `${r.id}:${r.viewer_count || 0}:${r.total_diamonds || 0}:${r.status}`).join(';')}`;
    const etag = `W/"${Buffer.from(etagSeed).toString('base64').slice(0, 24)}"`;

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=3, must-revalidate');

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    return res.json({
      success: true,
      rooms: userRooms,
      total,
      page: masterData.page,
      limit: masterData.limit,
    });
  } catch (err) {
    console.error('Mobile getRooms error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve live rooms.' });
  }
}

/**
 * Mobile Current User's Active Live Stream
 * GET /api/mobile/live/rooms/my-active
 */
export async function getMyActiveRoom(req, res) {
  try {
    const userId = req.user.id;
    const cacheKey = `mobile:live:my_active:${userId}`;

    const data = await cache.getOrSet(cacheKey, 15, async () => {
      const rooms = await query(
        `SELECT r.*, u.full_name as host_name, u.avatar_url as host_avatar, u.level as host_level, u.role as host_role
         FROM live_rooms r
         JOIN users u ON r.host_id = u.id
         WHERE r.host_id = ? AND r.status = 'live'
         LIMIT 1`,
        [userId]
      );

      if (rooms.length === 0) {
        return {
          has_active_room: false,
          room: null,
        };
      }

      const roomData = await buildRoomResponse(rooms[0].room_id, req.user);

      return {
        has_active_room: true,
        room: roomData,
      };
    });

    return res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('Mobile getMyActiveRoom error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve your active room.' });
  }
}

/**
 * Mobile Get Room Details
 * GET /api/mobile/live/rooms/:roomId
 */
export async function getRoomDetails(req, res) {
  try {
    const { roomId } = req.params;
    // Cache public room details without host private secrets
    const baseRoom = await cache.getOrSet(`mobile:room_details:${roomId}`, 10, async () => {
      return buildRoomResponse(roomId, null);
    });

    if (!baseRoom) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const roomData = { ...baseRoom };
    // Attach stream_key and room_password exclusively for the host or platform admins
    if (req.user && (Number(req.user.id) === Number(baseRoom.host_id) || req.user.role === 'admin' || req.user.role === 'superadmin')) {
      const isNum = /^\d+$/.test(String(roomId).trim());
      const secretRows = await query(
        'SELECT stream_key, room_password FROM live_rooms WHERE (room_id = ? OR id = ?) LIMIT 1',
        [String(roomId), isNum ? Number(roomId) : -1]
      );
      if (secretRows.length > 0) {
        roomData.stream_key = secretRows[0].stream_key;
        if (secretRows[0].room_password) {
          roomData.room_password = secretRows[0].room_password;
        }
      }
    }

    return res.json({
      success: true,
      room: roomData,
    });
  } catch (err) {
    console.error('Mobile getRoomDetails error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch room details.' });
  }
}

/**
 * Mobile Create / Start Live Stream
 * POST /api/mobile/live/rooms
 */
export async function createRoom(req, res) {
  try {
    const hostId = req.user.id;
    const {
      title,
      category = 'Chatting',
      background_image,
      cover_image,
      total_seats,
      totalSeats,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Stream title is required.' });
    }

    // 0. Check if host has an active timed broadcast suspension
    const [hostProfile] = await query(
      'SELECT id, is_banned, broadcast_banned_until, broadcast_ban_reason FROM users WHERE id = ?',
      [hostId]
    );

    if (hostProfile) {
      if (hostProfile.is_banned) {
        return res.status(403).json({ success: false, message: 'Your account has been suspended by administration.' });
      }

      if (hostProfile.broadcast_banned_until && new Date(hostProfile.broadcast_banned_until) > new Date()) {
        const expiresAt = new Date(hostProfile.broadcast_banned_until).toISOString();
        return res.status(403).json({
          success: false,
          message: `You are temporarily suspended from broadcasting live rooms until ${expiresAt}. Reason: ${hostProfile.broadcast_ban_reason || 'Agency broadcasting suspension.'}`,
          broadcast_banned_until: expiresAt,
          reason: hostProfile.broadcast_ban_reason,
        });
      }
    }

    // 1. End any previous active room for this host (DB-First)
    await query("UPDATE live_rooms SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE host_id = ? AND status = 'live'", [hostId]);

    const roomId = `room-${uuidv4().substring(0, 8)}`;
    const streamKey = `sk_umi_${uuidv4().replace(/-/g, '')}`;

    // 1. Resolve initial background thumbnail:
    let selectedBg = (background_image || req.body.thumbnail_url || req.body.thumbnail || req.body.backgroundImage || '').trim() || null;

    // If host didn't pass background_image, fetch host's currently equipped/selected thumbnail from user_thumbnails
    if (!selectedBg) {
      const equippedThumbRows = await query(
        `SELECT st.image_url 
         FROM user_thumbnails ut
         JOIN special_thumbnails st ON ut.thumbnail_id = st.id
         WHERE ut.user_id = ? AND ut.status = 'active' AND ut.is_equipped = 1 AND ut.expires_at > NOW()
         LIMIT 1`,
        [hostId]
      );
      if (equippedThumbRows.length > 0 && equippedThumbRows[0].image_url) {
        selectedBg = equippedThumbRows[0].image_url;
      }
    }

    // Default background is the host's equipped thumbnail or null if none
    const defaultBg = selectedBg || null;
    const defaultCover = (cover_image ? cover_image.trim() : null) || defaultBg || req.user?.avatar_url || null;

    const rawLiveType = req.body.live_type ?? req.body.liveType ?? req.body.type ?? req.body.stream_type ?? req.body.streamType ?? 'video';
    const liveType = String(rawLiveType).toLowerCase().trim() === 'audio' ? 'audio' : 'video';

    const rawSeats = total_seats !== undefined ? total_seats : totalSeats;
    let seatCount;

    if (liveType === 'video') {
      // Video Live: Max 12 seats!
      const requested = parseInt(rawSeats, 10);
      seatCount = requested ? Math.min(12, Math.max(2, requested)) : 12;
    } else {
      // Audio Live: Minimum 7 seats! (1 Host + 6 Guest seats). Default is 7.
      const requested = parseInt(rawSeats, 10);
      seatCount = requested ? Math.max(7, requested) : 7;
    }

    const isCommentDisabled = req.body.is_comment_disabled === true || req.body.is_comment_disabled === 'true' || req.body.is_comment_disabled === 1 ? 1 : 0;
    const isReactionDisabled = req.body.is_reaction_disabled === true || req.body.is_reaction_disabled === 'true' || req.body.is_reaction_disabled === 1 ? 1 : 0;

    const rawLocked = req.body.is_locked ?? req.body.isLocked ?? req.body.is_password_protected ?? req.body.isPasswordProtected ?? 0;
    const rawPass = req.body.room_password ?? req.body.roomPassword ?? req.body.password ?? req.body.pin ?? null;
    const roomPassword = rawPass ? String(rawPass).trim() : null;
    const isLocked = (Boolean(rawLocked) || Boolean(roomPassword)) && roomPassword ? 1 : 0;

    // Terminate any previous dangling live rooms for this host to prevent duplicate room cards
    const priorActiveRooms = await query(
      "SELECT room_id, id FROM live_rooms WHERE host_id = ? AND status = 'live'",
      [hostId]
    );
    if (priorActiveRooms.length > 0) {
      await query(
        "UPDATE live_rooms SET status = 'ended', ended_at = NOW() WHERE host_id = ? AND status = 'live'",
        [hostId]
      );
      for (const par of priorActiveRooms) {
        cancelHostDisconnectGraceTimer(par.room_id);
        if (par.id) cancelHostDisconnectGraceTimer(String(par.id));
        await Promise.allSettled([
          cache.del(`mobile:room_details:${par.room_id}`),
          cache.del(`mobile:room_details:${par.id}`),
        ]);
      }
    }

    await query(
      `INSERT INTO live_rooms (room_id, host_id, title, category, live_type, total_seats, cover_image, background_image, is_comment_disabled, is_reaction_disabled, is_locked, room_password, status, stream_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', ?)`,
      [roomId, hostId, title, category, liveType, seatCount, defaultCover, defaultBg, isCommentDisabled, isReactionDisabled, isLocked, isLocked ? roomPassword : null, streamKey]
    );

    // Auto-register host in live_room_admins
    await query(
      `INSERT INTO live_room_admins (room_id, user_id, assigned_by, permissions)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
      [roomId, hostId, hostId, JSON.stringify(['all'])]
    );

    // Seed seat 1 for the host (camera ON for video live, OFF for audio live)
    const hostCameraOn = liveType === 'audio' ? 0 : 1;
    await query(
      `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
       VALUES (?, 1, ?, 1, ?, 0)`,
      [roomId, hostId, hostCameraOn]
    );

    // Seed empty guest seats
    for (let s = 2; s <= seatCount; s++) {
      await query(
        `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
         VALUES (?, ?, NULL, 0, 0, 0)`,
        [roomId, s]
      );
    }

    // 2. Instant Redis Invalidation for rooms explore, room details & admins
    await Promise.allSettled([
      cache.delByPattern('mobile:rooms:*'),
      cache.del(`mobile:room_details:${roomId}`),
      cache.del(`mobile:live:room_admins:${roomId}`),
      cache.del(`mobile:live:my_active:${hostId}`),
      cache.delByPattern('host:*'),
    ]);

    const roomData = await buildRoomResponse(roomId, req.user);

    // 3. Asynchronously trigger in-app & push notification strictly to followers only
    notifyLiveStarted({
      hostId,
      roomId,
      title,
      liveType,
      coverImage: defaultBg,
    }).catch((err) => console.error('[Notification] Live start error:', err.message));

    sendLiveRoomStartedPushNotification({
      roomId,
      host: req.user,
      title,
      liveType,
      coverImage: defaultBg,
    }).catch((err) => console.error('[FCM] Live room start push error:', err.message));

    // 4. Broadcast live room started event globally to update mobile feeds in real time
    if (req.io) {
      req.io.emit('room_started', { room: roomData });
      req.io.emit('live_room_started', { room: roomData });
    }

    return res.status(201).json({
      success: true,
      message: 'Live stream started successfully.',
      room: roomData,
    });
  } catch (err) {
    console.error('Mobile createRoom error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create live room.', error: err.message });
  }
}

/**
 * Mobile Join Live Room
 * POST /api/mobile/live/rooms/:roomId/join
 * 
 * Returns full room specifications:
 * - Room ID & Background image URL
 * - Live type (video/audio) & total seats
 * - Live duration in seconds & formatted string (HH:MM:SS)
 * - All seats array with user details (name, profile, coin, diamond, camera state, mute state, main seat indicator)
 */
export async function joinRoom(req, res) {
  try {
    const { roomId } = req.params;
    const currentUser = req.user;
    const isNum = /^\d+$/.test(String(roomId).trim());

    const rooms = await query(
      'SELECT * FROM live_rooms WHERE room_id = ? OR id = ?',
      [String(roomId), isNum ? Number(roomId) : -1]
    );
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Live room is not active or does not exist.' });
    }
    const room = rooms[0];
    const canonicalRoomId = room.room_id;

    // Reject if room status is ended
    if (room.status !== 'live') {
      return res.status(400).json({
        success: false,
        message: 'This live stream has ended.',
        is_ended: true,
      });
    }

    // 0. Verify Room Lock / Password Protection
    const isRoomLocked = Boolean(room.is_locked && room.room_password);
    if (isRoomLocked) {
      const isHost = Number(currentUser.id) === Number(room.host_id);
      const isSuperOrAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';

      let canBypassPassword = isHost || isSuperOrAdmin;

      if (!canBypassPassword) {
        // A. Check if user is a system-level moderator with bypass permission
        if (currentUser.role === 'moderator') {
          const modRows = await query(
            "SELECT permissions, status FROM moderators WHERE user_id = ? AND status = 'active' LIMIT 1",
            [currentUser.id]
          );
          if (modRows.length > 0) {
            let perms = modRows[0].permissions;
            if (typeof perms === 'string') {
              try { perms = JSON.parse(perms); } catch (_) { perms = {}; }
            }
            if (perms && (perms.bypass_private_password === true || perms.bypass_room_password === true || perms.all === true || perms.silent_room_entry === true || perms.enter_locked_room === true)) {
              canBypassPassword = true;
            }
          }
        }

        // B. Check if user is a room admin with bypass permission
        if (!canBypassPassword) {
          const roomAdminRows = await query(
            'SELECT permissions FROM live_room_admins WHERE (room_id = ? OR room_id = ?) AND user_id = ? LIMIT 1',
            [canonicalRoomId, String(room.id), currentUser.id]
          );
          if (roomAdminRows.length > 0) {
            let rPerms = roomAdminRows[0].permissions;
            if (typeof rPerms === 'string') {
              try { rPerms = JSON.parse(rPerms); } catch (_) { rPerms = []; }
            }
            if (Array.isArray(rPerms)) {
              if (rPerms.includes('all') || rPerms.includes('bypass_private_password') || rPerms.includes('enter_locked_room')) {
                canBypassPassword = true;
              }
            } else if (rPerms && typeof rPerms === 'object') {
              if (rPerms.bypass_private_password === true || rPerms.all === true || rPerms.enter_locked_room === true) {
                canBypassPassword = true;
              }
            }
          }
        }
      }

      // If user cannot bypass password, verify supplied password
      if (!canBypassPassword) {
        const inputPassword = (req.body.password ?? req.body.room_password ?? req.body.pin ?? req.query.password ?? req.headers['x-room-password'] ?? '').toString().trim();
        if (!inputPassword) {
          return res.status(403).json({
            success: false,
            is_locked: true,
            is_password_protected: true,
            requires_password: true,
            message: 'This live room is locked with a password. Please enter the password to join.',
          });
        }
        if (inputPassword !== String(room.room_password).trim()) {
          return res.status(403).json({
            success: false,
            is_locked: true,
            is_password_protected: true,
            requires_password: true,
            message: 'Incorrect room password. Please try again.',
          });
        }
      }
    }

    // Stealth / Invisible room entry check for moderators & admins
    const hasInvisiblePrivilege = await checkUserInvisibleRoomEnterPrivilege(currentUser.id, currentUser.role);
    const requestedInvisible = Boolean(
      req.body.is_invisible || req.body.invisible || req.body.is_stealth || req.body.stealth ||
      req.query.is_invisible || req.query.invisible || req.query.is_stealth || req.query.stealth ||
      req.headers['x-invisible-entry'] === 'true'
    );
    const isInvisible = hasInvisiblePrivilege && (requestedInvisible || (req.body.is_invisible !== false && req.query.is_invisible !== 'false'));

    // 1. DB-First: Record user in live_room_viewers (EXCLUDE HOST AND INVISIBLE/STEALTH MODERATORS)
    if (currentUser.id !== room.host_id && !isInvisible) {
      await query(
        `INSERT INTO live_room_viewers (room_id, user_id, joined_at, last_active_at)
         VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE last_active_at = CURRENT_TIMESTAMP`,
        [canonicalRoomId, currentUser.id]
      );
    }

    // Ensure host is NEVER in live_room_viewers
    await query(
      `DELETE FROM live_room_viewers WHERE (room_id = ? OR room_id = ?) AND user_id = ?`,
      [canonicalRoomId, String(room.id), room.host_id]
    );

    // Update real viewer count in live_rooms (excluding host)
    await query(
      `UPDATE live_rooms SET viewer_count = (SELECT COUNT(*) FROM live_room_viewers WHERE (room_id = ? OR room_id = ?) AND user_id != ?) WHERE id = ?`,
      [canonicalRoomId, String(room.id), room.host_id, room.id]
    );

    const [freshRoomCount] = await query('SELECT viewer_count FROM live_rooms WHERE id = ?', [room.id]);
    const currentViewerCount = freshRoomCount ? Math.max(0, freshRoomCount.viewer_count) : 0;

    // 2. Instant Redis Invalidation for room lists and details
    await Promise.allSettled([
      cache.delByPattern('mobile:rooms:*'),
      cache.del(`mobile:room_details:${roomId}`),
      cache.del(`mobile:room_details:${canonicalRoomId}`),
      cache.del(`mobile:room_details:${room.id}`),
      cache.delByPattern(`mobile:room:users:${roomId}*`),
      cache.delByPattern(`mobile:room:users:${canonicalRoomId}*`),
      cache.delByPattern(`mobile:room:users:${room.id}*`),
      cache.del(`room:${canonicalRoomId}`),
      cache.del(`room:${room.id}`),
    ]);

    // 3. Socket broadcast: join notification is handled by socket 'join-room' event.
    // HTTP API only syncs viewer count and joins socket room to prevent duplicate welcome messages.
    // If user entered in invisible stealth mode, suppress viewer-count-update broadcast!
    if (req.io && !isInvisible) {
      req.io.to(canonicalRoomId).emit('viewer-count-update', { roomId: canonicalRoomId, count: currentViewerCount, viewer_count: currentViewerCount });
    }

    // 4. Build comprehensive room response with seats and duration
    const roomData = await buildRoomResponse(roomId, currentUser);

    return res.json({
      success: true,
      message: isInvisible ? 'Joined live room in invisible stealth mode.' : 'Joined live room successfully.',
      room: roomData,
      viewer_count: currentViewerCount,
      is_invisible: isInvisible,
      invisible_room_enter: isInvisible,
      invigible_room_enter: isInvisible,
    });
  } catch (err) {
    console.error('Mobile joinRoom error:', err);
    return res.status(500).json({ success: false, message: 'Failed to join live room.', error: err.message });
  }
}

/**
 * Handle seat departure and automatic seat rearrangement:
 * - If a non-host user occupied the Main Seat (Seat 1) and departs/vacates:
 *     1. The room's host (room.host_id) is immediately restored to Seat 1 (Main Seat).
 *     2. Any other seat where the host was seated is vacated.
 *     3. All remaining active co-hosts are rearranged consecutively into Seats 2, 3, 4... without gaps.
 *     4. All remaining seats up to total_seats are set to empty.
 *     5. DB is committed first, Redis caches are invalidated, and sockets broadcast the new seat state.
 * - If a user occupied a guest seat (Seat > 1):
 *     1. The seat is vacated.
 *     2. Remaining guest seats are rearranged consecutively without gaps.
 *     3. Sockets broadcast the updated seats.
 */
export async function handleUserSeatDeparture(roomId, leavingUserId, io = null) {
  if (!roomId || !leavingUserId) return null;

  try {
    const rooms = await query(
      'SELECT id, room_id, host_id, total_seats, live_type, status FROM live_rooms WHERE room_id = ?',
      [roomId]
    );
    if (rooms.length === 0) return null;
    const room = rooms[0];
    const hostId = room.host_id;
    const totalSeats = parseInt(room.total_seats, 10) || 8;

    // Fetch all current seats for this room
    const seats = await query(
      'SELECT * FROM live_room_seats WHERE room_id = ? ORDER BY seat_number ASC',
      [roomId]
    );

    const departingSeat = seats.find((s) => String(s.user_id) === String(leavingUserId));
    if (!departingSeat) {
      // User was not on any seat
      return null;
    }

    // Host permanently owns and retains Seat 1 in live room
    if (String(leavingUserId) === String(hostId)) {
      return { success: true, action: 'host_retained_on_main', seatNumber: 1 };
    }

    const wasMainSeat = departingSeat.seat_number === 1 || Boolean(departingSeat.is_main_seat);

    if (wasMainSeat && String(leavingUserId) !== String(hostId)) {
      // -------------------------------------------------------------
      // SCENARIO 1: Main Seat occupant (non-host) left the room/seat
      // -> Host returns to Main Seat (Seat 1)
      // -> Remaining co-hosts are rearranged into Seats 2, 3, 4...
      // -------------------------------------------------------------
      const hostPrevSeat = seats.find((s) => s.user_id === hostId);
      const hostCamera = hostPrevSeat ? hostPrevSeat.is_camera_on : 1;
      const hostMuted = hostPrevSeat ? hostPrevSeat.is_muted : 0;

      // Remaining co-hosts: all occupied seats except the departing user and except host
      const otherCoHosts = seats.filter(
        (s) => s.user_id && Number(s.user_id) !== Number(leavingUserId) && Number(s.user_id) !== Number(hostId)
      );

      // 1. Move host to Seat 1 (Main Seat)
      await query(
        `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
         VALUES (?, 1, ?, 1, ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), is_main_seat = 1, is_camera_on = VALUES(is_camera_on), is_muted = VALUES(is_muted)`,
        [roomId, hostId, hostCamera, hostMuted]
      );

      // 2. Rearrange remaining co-hosts into Seat 2, Seat 3, etc.
      let nextSeatNum = 2;
      for (const coHost of otherCoHosts) {
        if (nextSeatNum <= totalSeats) {
          await query(
            `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
             VALUES (?, ?, ?, 0, ?, ?)
             ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), is_main_seat = 0, is_camera_on = VALUES(is_camera_on), is_muted = VALUES(is_muted)`,
            [roomId, nextSeatNum, coHost.user_id, coHost.is_camera_on, coHost.is_muted]
          );
          nextSeatNum++;
        }
      }

      // 3. Clear remaining seats up to totalSeats
      for (let s = nextSeatNum; s <= totalSeats; s++) {
        await query(
          `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
           VALUES (?, ?, NULL, 0, 0, 0)
           ON DUPLICATE KEY UPDATE user_id = NULL, is_main_seat = 0, is_camera_on = 0, is_muted = 0`,
          [roomId, s]
        );
      }

      // Remove any excess seats if seat_number > totalSeats
      await query('DELETE FROM live_room_seats WHERE room_id = ? AND seat_number > ?', [roomId, totalSeats]);

      // Instant Redis Invalidation
      await Promise.allSettled([
        cache.del(`mobile:room_details:${roomId}`),
        cache.delByPattern(`mobile:room:users:${roomId}*`),
        cache.del(`mobile:live:my_active:${hostId}`),
        cache.delByPattern('mobile:rooms:*'),
      ]);

      const freshSeats = await query(
        `SELECT s.seat_number, s.is_main_seat, s.is_camera_on, s.is_muted, s.is_locked,
                s.user_id, u.full_name as user_name, u.avatar_url as user_avatar,
                u.coins as user_coin, u.diamonds as user_diamond, u.level as user_level, u.role as user_role
         FROM live_room_seats s
         LEFT JOIN users u ON s.user_id = u.id
         WHERE (s.room_id = ? OR s.room_id = ?)
         ORDER BY s.seat_number ASC`,
        [roomId, String(room.id || '')]
      );

      const formattedSeats = (freshSeats || []).map((st) => {
        const isOcc = Boolean(st.user_id);
        const isMain = st.seat_number === 1 || Boolean(st.is_main_seat);
        return {
          seat_number: st.seat_number,
          seatNumber: st.seat_number,
          seatIndex: st.seat_number,
          seat_index: st.seat_number,
          user_id: st.user_id || null,
          userId: st.user_id || null,
          user_name: st.user_name || null,
          userName: st.user_name || null,
          name: st.user_name || null,
          user_avatar: st.user_avatar || null,
          userAvatar: st.user_avatar || null,
          avatar: st.user_avatar || null,
          is_occupied: isOcc,
          isOccupied: isOcc,
          is_empty: !isOcc,
          isEmpty: !isOcc,
          is_main_seat: isMain,
          isMainSeat: isMain,
          is_spotlight: isMain,
          is_camera_on: Boolean(st.is_camera_on),
          isCameraOn: Boolean(st.is_camera_on),
          is_muted: Boolean(st.is_muted),
          isMuted: Boolean(st.is_muted),
          is_locked: Boolean(st.is_locked),
          isLocked: Boolean(st.is_locked),
          user: isOcc ? {
            id: Number(st.user_id),
            name: st.user_name || '',
            fullName: st.user_name || '',
            full_name: st.user_name || '',
            profile: st.user_avatar || '',
            avatarUrl: st.user_avatar || '',
            avatar_url: st.user_avatar || '',
            coin: Number(st.user_coin || 0),
            coins: Number(st.user_coin || 0),
            level: Number(st.user_level || 1),
            role: st.user_role || 'user',
          } : null,
        };
      });

      const seatOrder = [];
      for (let s = 1; s <= totalSeats; s++) {
        const found = freshSeats.find((fs) => fs.seat_number === s);
        seatOrder.push(found && found.user_id ? Number(found.user_id) : 0);
      }

      // Socket broadcasts
      if (io) {
        const channels = new Set([String(roomId), String(room.room_id), String(room.id)].filter(Boolean));
        for (const ch of channels) {
          io.to(ch).emit('main_seat_restored', {
            roomId: room.room_id,
            hostId,
            departedUserId: leavingUserId,
            message: 'Main seat occupant left the room. Room host has returned to the main seat.',
          });
          io.to(ch).emit('seats_rearranged', {
            roomId: room.room_id,
            reason: 'main_seat_departed',
            departedUserId: leavingUserId,
            hostId,
            seatOrder,
          });
          io.to(ch).emit('seats-sync', { roomId: room.room_id, seats: formattedSeats, spotlight_seat_number: 1 });
          io.to(ch).emit('room-seats-sync', { roomId: room.room_id, seats: formattedSeats, spotlight_seat_number: 1 });
          io.to(ch).emit('seats_sync', { roomId: room.room_id, seats: formattedSeats, spotlight_seat_number: 1 });
          io.to(ch).emit('seats_updated', { roomId: room.room_id, seats: formattedSeats, seatOrder });
          io.to(ch).emit('seat_updated', {
            roomId: room.room_id,
            seatNumber: 1,
            seatIndex: 1,
            seat_index: 1,
            action: 'restore_main',
            hostId,
            departedUserId: leavingUserId,
            seats: formattedSeats,
            rawSeats: formattedSeats,
            seatOrder,
          });
        }
      }

      return { success: true, action: 'host_restored_to_main', departedSeat: departingSeat.seat_number };
    } else {
      // -------------------------------------------------------------
      // SCENARIO 2: Departing user occupied a guest seat (Seat > 1)
      // or Host stepped down from a seat
      // -------------------------------------------------------------
      const isVideoLive = (room.live_type || 'video') !== 'audio';
      const targetRoomId = room.room_id || roomId;

      // 1. Vacate departing user's seat ONLY (never disturb other co-host seats)
      await query(
        'UPDATE live_room_seats SET user_id = NULL, is_camera_on = 0, is_muted = 0 WHERE (room_id = ? OR room_id = ?) AND (seat_number = ? OR user_id = ?)',
        [targetRoomId, String(room.id || ''), departingSeat.seat_number, leavingUserId]
      );

      // Instant Redis Invalidation
      await Promise.allSettled([
        cache.del(`mobile:room_details:${roomId}`),
        cache.del(`mobile:room_details:${room.room_id}`),
        room.id ? cache.del(`mobile:room_details:${room.id}`) : null,
        cache.delByPattern(`mobile:room:users:${roomId}*`),
        cache.delByPattern(`mobile:room:users:${room.room_id}*`),
      ]);

      const freshSeats = await query(
        `SELECT s.seat_number, s.is_main_seat, s.is_camera_on, s.is_muted, s.is_locked,
                s.user_id, u.full_name as user_name, u.avatar_url as user_avatar,
                u.coins as user_coin, u.diamonds as user_diamond, u.level as user_level, u.role as user_role
         FROM live_room_seats s
         LEFT JOIN users u ON s.user_id = u.id
         WHERE (s.room_id = ? OR s.room_id = ?)
         ORDER BY s.seat_number ASC`,
        [roomId, String(room.id || '')]
      );

      const formattedSeats = (freshSeats || []).map((st) => {
        const isOcc = Boolean(st.user_id);
        const isMain = st.seat_number === 1 || Boolean(st.is_main_seat);
        return {
          seat_number: st.seat_number,
          seatNumber: st.seat_number,
          seatIndex: st.seat_number,
          seat_index: st.seat_number,
          user_id: st.user_id || null,
          userId: st.user_id || null,
          user_name: st.user_name || null,
          userName: st.user_name || null,
          name: st.user_name || null,
          user_avatar: st.user_avatar || null,
          userAvatar: st.user_avatar || null,
          avatar: st.user_avatar || null,
          is_occupied: isOcc,
          isOccupied: isOcc,
          is_empty: !isOcc,
          isEmpty: !isOcc,
          is_main_seat: isMain,
          isMainSeat: isMain,
          is_spotlight: isMain,
          is_camera_on: Boolean(st.is_camera_on),
          isCameraOn: Boolean(st.is_camera_on),
          is_muted: Boolean(st.is_muted),
          isMuted: Boolean(st.is_muted),
          is_locked: Boolean(st.is_locked),
          isLocked: Boolean(st.is_locked),
          user: isOcc ? {
            id: Number(st.user_id),
            name: st.user_name || '',
            fullName: st.user_name || '',
            full_name: st.user_name || '',
            profile: st.user_avatar || '',
            avatarUrl: st.user_avatar || '',
            avatar_url: st.user_avatar || '',
            coin: Number(st.user_coin || 0),
            coins: Number(st.user_coin || 0),
            level: Number(st.user_level || 1),
            role: st.user_role || 'user',
          } : null,
        };
      });

      const seatOrder = [];
      for (let s = 1; s <= totalSeats; s++) {
        const found = freshSeats.find((fs) => fs.seat_number === s);
        seatOrder.push(found && found.user_id ? Number(found.user_id) : 0);
      }

      if (io) {
        const channels = new Set([String(roomId), String(room.room_id), String(room.id)].filter(Boolean));
        for (const ch of channels) {
          io.to(ch).emit('seats-sync', { roomId: room.room_id, seats: formattedSeats, spotlight_seat_number: 1 });
          io.to(ch).emit('room-seats-sync', { roomId: room.room_id, seats: formattedSeats, spotlight_seat_number: 1 });
          io.to(ch).emit('seats_sync', { roomId: room.room_id, seats: formattedSeats, spotlight_seat_number: 1 });
          io.to(ch).emit('seats_updated', { roomId: room.room_id, seats: formattedSeats, seatOrder });
          io.to(ch).emit('seat_updated', {
            roomId: room.room_id,
            seatNumber: departingSeat.seat_number,
            seatIndex: departingSeat.seat_number,
            seat_index: departingSeat.seat_number,
            action: 'leave',
            userId: Number(leavingUserId),
            seat: {
              seatIndex: departingSeat.seat_number,
              seat_index: departingSeat.seat_number,
              isLocked: Boolean(departingSeat.is_locked),
              isMuted: false,
              isVideoMuted: true,
              user: null,
            },
            seats: formattedSeats,
            rawSeats: formattedSeats,
            seatOrder,
          });
          io.to(ch).emit('seats_rearranged', {
            roomId: room.room_id,
            reason: 'guest_seat_departed',
            departedUserId: Number(leavingUserId),
            seatOrder,
          });
        }
      }

      return { success: true, action: 'guest_seat_cleared', departedSeat: departingSeat.seat_number };
    }
  } catch (err) {
    console.error('handleUserSeatDeparture error:', err);
    return null;
  }
}

/**
 * Mobile Leave Live Room
 * POST /api/mobile/live/rooms/:roomId/leave
 */
export async function leaveRoom(req, res) {
  try {
    const { roomId } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userId = currentUser.id;

    // 1. Check room details (supports numeric id or string room_id)
    const isNum = /^\d+$/.test(String(roomId).trim());
    const rooms = await query(
      'SELECT id, room_id, host_id FROM live_rooms WHERE room_id = ? OR id = ?',
      [String(roomId), isNum ? Number(roomId) : -1]
    );
    const room = rooms.length > 0 ? rooms[0] : null;
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }
    const canonicalRoomId = room.room_id;
    const numericRoomId = room.id;

    // Special Guard: If the departing user is the room HOST, automatically end the live room completely for everyone!
    if (Number(room.host_id) === Number(userId)) {
      console.log(`🔴 [Host Leave HTTP] Host ${userId} called leaveRoom for ${canonicalRoomId}. Automatically ending room for all viewers...`);
      return endRoom(req, res);
    }

    // 2. Seat Stage: Handle seat departure
    await handleUserSeatDeparture(canonicalRoomId, userId, req.io);

    // 3. Waiting List (Seat Requests): If user has pending seat request, remove it
    const pendingReqs = await query(
      'SELECT id FROM live_room_seat_requests WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
      [canonicalRoomId, String(numericRoomId || ''), userId]
    );
    if (pendingReqs.length > 0) {
      await query(
        'DELETE FROM live_room_seat_requests WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
        [canonicalRoomId, String(numericRoomId || ''), userId]
      );
      if (req.io) {
        req.io.to(canonicalRoomId).emit('seat_request_cancelled', { roomId: canonicalRoomId, userId });
        if (numericRoomId && String(numericRoomId) !== canonicalRoomId) {
          req.io.to(String(numericRoomId)).emit('seat_request_cancelled', { roomId: canonicalRoomId, userId });
        }
      }
    }

    // 4. Admin List: If user is room admin (and not the host/owner), remove from admin list
    if (room && room.host_id !== userId) {
      const adminRows = await query(
        'SELECT id FROM live_room_admins WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
        [canonicalRoomId, String(numericRoomId || ''), userId]
      );
      if (adminRows.length > 0) {
        await query(
          'DELETE FROM live_room_admins WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
          [canonicalRoomId, String(numericRoomId || ''), userId]
        );
        if (req.io) {
          req.io.to(canonicalRoomId).emit('room_admin_removed', { roomId: canonicalRoomId, userId });
          if (numericRoomId && String(numericRoomId) !== canonicalRoomId) {
            req.io.to(String(numericRoomId)).emit('room_admin_removed', { roomId: canonicalRoomId, userId });
          }
        }
      }
    }

    // 5. Viewers List: Remove user from live_room_viewers
    await query(
      'DELETE FROM live_room_viewers WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
      [canonicalRoomId, String(numericRoomId || ''), userId]
    );

    // Update real viewer count in live_rooms (excluding host)
    const hostId = room ? room.host_id : 0;
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

    const [updatedCountRow] = numericRoomId
      ? await query('SELECT viewer_count FROM live_rooms WHERE id = ?', [numericRoomId])
      : await query('SELECT viewer_count FROM live_rooms WHERE room_id = ?', [canonicalRoomId]);
    const currentViewerCount = updatedCountRow ? Math.max(0, updatedCountRow.viewer_count) : 0;

    // 6. Instant Redis Invalidation for room list and all room-related caches
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

    // 7. Socket notifications & channel unsubscription
    if (req.io) {
      const leavePayload = {
        roomId: canonicalRoomId,
        numericRoomId,
        userId,
        user_id: userId,
        userName: currentUser.full_name || currentUser.name || `User ${userId}`,
        user_name: currentUser.full_name || currentUser.name || `User ${userId}`,
        userAvatar: currentUser.avatar_url || currentUser.avatar || '',
        user_avatar: currentUser.avatar_url || currentUser.avatar || '',
        packageCategoryName: currentUser.package_category_name || '',
        package_category_name: currentUser.package_category_name || '',
        packageName: currentUser.package_category_name || '',
        package_name: currentUser.package_category_name || '',
        packageImage: currentUser.package_image || '',
        package_image: currentUser.package_image || '',
        packageColor: currentUser.package_color || '',
        package_color: currentUser.package_color || '',
        user: {
          id: currentUser.id,
          name: currentUser.full_name,
          full_name: currentUser.full_name,
          avatar_url: currentUser.avatar_url,
          package_category_name: currentUser.package_category_name || '',
          package_image: currentUser.package_image || '',
          package_color: currentUser.package_color || '',
        },
        count: currentViewerCount,
        viewer_count: currentViewerCount,
        timestamp: new Date().toISOString(),
      };

      const channels = new Set([canonicalRoomId, String(numericRoomId), String(roomId)].filter(Boolean));
      for (const ch of channels) {
        req.io.to(ch).emit('user-left', leavePayload);
        req.io.to(ch).emit('user_left', leavePayload);
        req.io.to(ch).emit('viewer_left', leavePayload);
        req.io.to(ch).emit('viewer-count-update', { roomId: canonicalRoomId, count: currentViewerCount, viewer_count: currentViewerCount });
        req.io.to(ch).emit('room_viewers_updated', { roomId: canonicalRoomId, count: currentViewerCount, viewer_count: currentViewerCount });
      }

      // Evict this user's socket connections from the live room socket channel
      const userRoom = `user_${userId}`;
      const userSockets = await req.io.in(userRoom).fetchSockets().catch(() => []);
      for (const s of userSockets) {
        s.leave(canonicalRoomId);
        if (numericRoomId) s.leave(String(numericRoomId));
      }
    }

    return res.json({
      success: true,
      message: 'Left live room successfully. Removed from seats, waiting list, admin list, and viewer list.',
      viewer_count: currentViewerCount,
    });
  } catch (err) {
    console.error('Mobile leaveRoom error:', err);
    return res.status(500).json({ success: false, message: 'Failed to leave live room.', error: err.message });
  }
}

/**
 * Mobile Get Active Users/Viewers in Live Room
 * GET /api/mobile/live/rooms/:roomId/users
 * 
 * Returns full audience list with:
 * - total_users count
 * - users: id, name, image (avatar_url), package_category_name, package_image, coin, diamond, role, level, is_host, is_seated
 * Cached via Redis (Rule #3) with Cache-Aside.
 */
export async function getRoomUsers(req, res) {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const rooms = await query('SELECT id, room_id, host_id, title, status FROM live_rooms WHERE room_id = ?', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Live room not found.' });
    }
    const room = rooms[0];

    // Ensure host is never tracked in live_room_viewers
    await query(
      'DELETE FROM live_room_viewers WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
      [roomId, String(room.id), room.host_id]
    );

    // Check system diamond conversion setting
    const settingRows = await query("SELECT key_value FROM system_settings WHERE key_name = 'is_convert_to_diamond'");
    const isDiamondMode = settingRows && settingRows.length > 0
      ? (settingRows[0].key_value === 'true' || settingRows[0].key_value === '1')
      : true;

    const cacheKey = `mobile:room:users:${roomId}:${page}:${limit}`;

    const data = await cache.getOrSet(cacheKey, 10, async () => {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const users = await query(
        `SELECT u.id, u.full_name as name, u.avatar_url as image,
                u.coins as coin, u.diamonds as diamond, u.role, u.level,
                pc.name as package_category_name,
                COALESCE(pp.image_url, pc.badge_icon, '') as package_image,
                pc.color_code as package_color,
                COALESCE(pc.display_order, 999999) as vip_order,
                v.joined_at,
                (u.id = r.host_id) as is_host,
                s.seat_number,
                (s.seat_number IS NOT NULL) as is_seated,
                COALESCE(s.is_main_seat, 0) as is_main_seat,
                COALESCE(s.is_camera_on, 0) as is_camera_on,
                COALESCE(s.is_muted, 0) as is_muted
         FROM live_room_viewers v
         JOIN live_rooms r ON r.room_id = v.room_id
         JOIN users u ON u.id = v.user_id
         LEFT JOIN user_package_subscriptions ups 
           ON ups.id = (
             SELECT id FROM user_package_subscriptions 
             WHERE user_id = u.id AND status = 'active' AND expires_at > NOW() 
             ORDER BY is_equipped DESC, expires_at DESC LIMIT 1
           )
         LEFT JOIN privilege_packages pp ON pp.id = ups.package_id
         LEFT JOIN package_categories pc 
           ON pc.id = ups.category_id AND pc.is_active = 1
         LEFT JOIN live_room_seats s 
           ON s.room_id = v.room_id AND s.user_id = u.id
         WHERE (v.room_id = ? OR v.room_id = ?) AND v.user_id != r.host_id AND u.role != 'superadmin'
         ORDER BY is_seated DESC, vip_order ASC, u.coins DESC, v.joined_at ASC
         LIMIT ? OFFSET ?`,
        [roomId, String(room.id), parseInt(limit, 10), offset]
      );

      const [countResult] = await query(
        'SELECT COUNT(*) as total FROM live_room_viewers v JOIN users u ON u.id = v.user_id WHERE (v.room_id = ? OR v.room_id = ?) AND v.user_id != ? AND u.role != \'superadmin\'',
        [roomId, String(room.id), room.host_id]
      );

      const formattedUsers = users.map((u) => ({
        id: u.id,
        name: u.name,
        image: u.image,
        avatar_url: u.image,
        package_category_name: u.package_category_name || null,
        package_image: u.package_image || null,
        package_color: u.package_color || null,
        coin: u.coin ?? 0,
        ...(isDiamondMode ? { diamond: u.diamond ?? 0 } : {}),
        role: u.role || 'user',
        level: u.level || 1,
        is_host: Boolean(u.is_host),
        is_seated: Boolean(u.is_seated),
        seat_number: u.seat_number || null,
        is_main_seat: Boolean(u.is_main_seat),
        is_camera_on: Boolean(u.is_camera_on),
        is_muted: Boolean(u.is_muted),
      }));

      return {
        room_id: roomId,
        total_users: countResult ? countResult.total : 0,
        users: formattedUsers,
        pagination: {
          total: countResult ? countResult.total : 0,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
        },
      };
    });

    return res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('getRoomUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve room users.', error: err.message });
  }
}

/**
 * Mobile Take a Co-host Seat
 * POST /api/mobile/live/rooms/:roomId/seats/take
 */
export async function takeSeat(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const rooms = await query('SELECT id, room_id, total_seats, host_id, live_type FROM live_rooms WHERE room_id = ? AND status = "live"', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Live room not active.' });
    }
    const room = rooms[0];
    const totalSeats = parseInt(room.total_seats, 10) || 7;

    // Strict Video Live Rule: Direct seating requires host acceptance OR VIP self-seat-accept privilege
    if (room.live_type === 'video') {
      const canSelfAccept = await checkUserSelfSeatAcceptPrivilege(userId);
      if (!canSelfAccept) {
        const existing = await query('SELECT seat_number FROM live_room_seats WHERE (room_id = ? OR room_id = ?) AND user_id = ?', [roomId, String(room.id || ''), userId]);
        if (existing.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Direct seating is not allowed in Video Live rooms without host acceptance or VIP self-seat-accept privilege.',
          });
        }
      }
    }

    const rawSeat = req.params.seatNumber !== undefined
      ? req.params.seatNumber
      : (req.body.seatNumber !== undefined
        ? req.body.seatNumber
        : (req.body.seat_number !== undefined
          ? req.body.seat_number
          : (req.body.targetSeatNumber !== undefined
            ? req.body.targetSeatNumber
            : req.body.target_seat_number)));
    let num = (rawSeat !== undefined && rawSeat !== null && rawSeat !== '') ? parseInt(rawSeat, 10) : null;

    if (num !== null) {
      if (num < 2) {
        return res.status(400).json({ success: false, message: 'Invalid seat number. Seat 1 is reserved for the host.' });
      }
      if (num > totalSeats) {
        return res.status(400).json({ success: false, message: `Seat ${num} exceeds total room seats (${totalSeats}).` });
      }
    } else {
      // Auto-assign: Find the first open unlocked seat > 1 without requiring request
      const openSeats = await query(
        `SELECT seat_number FROM live_room_seats 
         WHERE room_id = ? AND seat_number > 1 AND user_id IS NULL AND is_locked = 0 
         ORDER BY seat_number ASC LIMIT 1`,
        [roomId]
      );
      if (openSeats.length > 0) {
        num = openSeats[0].seat_number;
      } else {
        const existing = await query('SELECT seat_number, user_id, is_locked FROM live_room_seats WHERE room_id = ?', [roomId]);
        const seatMap = {};
        for (const s of existing) seatMap[s.seat_number] = s;
        for (let s = 2; s <= totalSeats; s++) {
          if (!seatMap[s] || (!seatMap[s].user_id && !seatMap[s].is_locked)) {
            num = s;
            break;
          }
        }
      }

      if (!num || num > totalSeats) {
        return res.status(400).json({ success: false, message: 'All seats are currently occupied or locked.' });
      }
    }

    // Check if target seat is free
    const targetSeat = await query('SELECT user_id, is_locked FROM live_room_seats WHERE room_id = ? AND seat_number = ?', [roomId, num]);
    if (targetSeat.length > 0 && targetSeat[0].user_id && Number(targetSeat[0].user_id) !== Number(userId)) {
      return res.status(400).json({ success: false, message: `Seat ${num} is already occupied.` });
    }
    if (targetSeat.length > 0 && targetSeat[0].is_locked) {
      return res.status(403).json({ success: false, message: `Seat ${num} is locked by the host.` });
    }

    // Check if user is already occupying another seat in this room (Allow switching!)
    const existing = await query('SELECT seat_number, is_camera_on, is_muted FROM live_room_seats WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    let isSwitch = false;
    let oldSeatNumber = null;
    let cameraState = room.live_type === 'audio' ? 0 : 1;
    let muteState = 0;

    if (existing.length > 0) {
      oldSeatNumber = existing[0].seat_number;
      if (oldSeatNumber === 1 && userId === room.host_id) {
        return res.status(400).json({ success: false, message: 'The host cannot move away from main seat #1.' });
      }
      if (oldSeatNumber === num) {
        const roomData = await buildRoomResponse(roomId, req.user);
        return res.json({ success: true, message: `You are already occupying seat ${num}.`, room: roomData });
      }

      isSwitch = true;
      cameraState = room.live_type === 'audio' ? 0 : (existing[0].is_camera_on !== undefined ? existing[0].is_camera_on : 1);
      muteState = existing[0].is_muted !== undefined ? existing[0].is_muted : 0;

      // Free previous seat in DB
      await query(
        'UPDATE live_room_seats SET user_id = NULL, is_camera_on = 0, is_muted = 0 WHERE room_id = ? AND seat_number = ?',
        [roomId, oldSeatNumber]
      );
    }

    // Assign seat (DB-First)
    await query(
      `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
       VALUES (?, ?, ?, 0, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), is_camera_on = VALUES(is_camera_on), is_muted = VALUES(is_muted)`,
      [roomId, num, userId, cameraState, muteState]
    );

    // Instant Redis Invalidation
    await Promise.allSettled([
      cache.del(`mobile:room_details:${roomId}`),
      cache.delByPattern(`mobile:room:users:${roomId}*`),
      cache.del(`mobile:live:seat_requests:${roomId}`),
    ]);

    const roomData = await buildRoomResponse(roomId, req.user);

    if (req.io) {
      const userData = {
        id: Number(req.user.id),
        fullName: req.user.full_name,
        full_name: req.user.full_name,
        name: req.user.full_name,
        avatarUrl: req.user.avatar_url,
        avatar_url: req.user.avatar_url,
        profile: req.user.avatar_url,
        coin: Number(req.user.coins || 0),
        coins: Number(req.user.coins || 0),
        role: req.user.role,
        vipLevel: Number(req.user.level || 1),
        vip_level: Number(req.user.level || 1),
      };

      if (isSwitch && oldSeatNumber) {
        req.io.to(roomId).emit('seat_updated', {
          roomId,
          seatNumber: oldSeatNumber,
          seatIndex: oldSeatNumber,
          seat_index: oldSeatNumber,
          action: 'leave',
          userId: Number(userId),
          seat: {
            seatIndex: oldSeatNumber,
            seat_index: oldSeatNumber,
            isLocked: false,
            isMuted: false,
            isVideoMuted: true,
            user: null,
          },
        });
      }
      req.io.to(roomId).emit('seat_updated', {
        roomId,
        seatNumber: num,
        seatIndex: num,
        seat_index: num,
        action: isSwitch ? 'switch' : 'take',
        fromSeatNumber: oldSeatNumber,
        previousSeatIndex: oldSeatNumber,
        user: userData,
        seat: {
          seatIndex: num,
          seat_index: num,
          isLocked: false,
          isMuted: Boolean(muteState),
          isVideoMuted: !Boolean(cameraState),
          user: userData,
        },
      });
    }

    return res.json({
      success: true,
      message: isSwitch ? `Moved to seat ${num} successfully.` : `You took seat ${num} successfully.`,
      is_switch: isSwitch,
      from_seat_number: oldSeatNumber,
      to_seat_number: num,
      seat_number: num,
      room: roomData,
    });
  } catch (err) {
    console.error('takeSeat error:', err);
    return res.status(500).json({ success: false, message: 'Failed to take seat.', error: err.message });
  }
}

/**
 * Mobile Switch / Move from Current Seat to Another Empty Seat
 * POST /api/mobile/live/rooms/:roomId/seats/switch
 * POST /api/mobile/live/rooms/:roomId/seats/move
 * POST /api/mobile/live/rooms/:roomId/seats/:seatNumber/switch
 * POST /api/mobile/live/rooms/:roomId/seats/:seatNumber/move
 */
export async function switchSeat(req, res) {
  return takeSeat(req, res);
}

/**
 * Mobile Leave Co-host Seat
 * POST /api/mobile/live/rooms/:roomId/seats/leave
 */
export async function leaveSeat(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    await handleUserSeatDeparture(roomId, userId, req.io);

    const roomData = await buildRoomResponse(roomId, req.user);

    return res.json({
      success: true,
      message: 'Left seat successfully.',
      room: roomData,
    });
  } catch (err) {
    console.error('leaveSeat error:', err);
    return res.status(500).json({ success: false, message: 'Failed to leave seat.', error: err.message });
  }
}

/**
 * Mobile Toggle Seat Media (Camera On/Off & Mute/Unmute)
 * POST /api/mobile/live/rooms/:roomId/seats/media
 */
export async function toggleSeatMedia(req, res) {
  try {
    const { roomId } = req.params;
    const { isCameraOn, isMuted } = req.body;
    const userId = req.user.id;

    const updates = [];
    const params = [];
    if (isCameraOn !== undefined) {
      updates.push('is_camera_on = ?');
      params.push(isCameraOn ? 1 : 0);
    }
    if (isMuted !== undefined) {
      updates.push('is_muted = ?');
      params.push(isMuted ? 1 : 0);
    }

    const isNum = /^\d+$/.test(String(roomId).trim());
    const rooms = await query('SELECT id, room_id FROM live_rooms WHERE (room_id = ? OR id = ?)', [roomId, isNum ? Number(roomId) : -1]);
    const canonicalRoomId = rooms.length > 0 ? rooms[0].room_id : roomId;
    const numericRoomId = rooms.length > 0 ? String(rooms[0].id) : '';

    if (updates.length > 0) {
      params.push(canonicalRoomId, numericRoomId, userId);
      await query(`UPDATE live_room_seats SET ${updates.join(', ')} WHERE (room_id = ? OR room_id = ?) AND user_id = ?`, params);
    }

    // Instant Redis Invalidation
    await cache.del(`mobile:room_details:${canonicalRoomId}`);
    if (numericRoomId) await cache.del(`mobile:room_details:${numericRoomId}`);

    const roomData = await buildRoomResponse(canonicalRoomId, req.user);

    if (req.io) {
      const payload = {
        roomId: canonicalRoomId,
        numericRoomId,
        userId,
        isCameraOn: Boolean(isCameraOn),
        is_camera_on: Boolean(isCameraOn),
        isVideoMuted: !Boolean(isCameraOn),
        is_video_muted: !Boolean(isCameraOn),
        isMuted: Boolean(isMuted),
        is_muted: Boolean(isMuted),
        actionBy: userId,
      };
      req.io.to(canonicalRoomId).emit('seat_media_updated', payload);
      req.io.to(canonicalRoomId).emit('seat-media-updated', payload);
    }

    return res.json({
      success: true,
      message: 'Seat media updated successfully.',
      room: roomData,
    });
  } catch (err) {
    console.error('toggleSeatMedia error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update seat media.', error: err.message });
  }
}

/**
 * Mobile Lock / Unlock Seat
 * POST /api/mobile/live/rooms/:roomId/seats/lock
 * POST /api/mobile/live/rooms/:roomId/seats/:seatNumber/lock
 */
export async function lockSeat(req, res) {
  try {
    const { roomId } = req.params;
    const callerId = req.user.id;
    const callerRole = req.user.role;
    const rawSeat = req.params.seatNumber !== undefined ? req.params.seatNumber : (req.body.seatNumber !== undefined ? req.body.seatNumber : req.body.seat_number);
    const num = parseInt(rawSeat, 10);

    if (!num || num < 2) {
      return res.status(400).json({ success: false, message: 'Invalid seat number. Cannot lock Seat 1 (host seat).' });
    }

    const rooms = await query('SELECT id, room_id, host_id, total_seats FROM live_rooms WHERE room_id = ? AND status = "live"', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Active live room not found.' });
    }
    const room = rooms[0];

    // Check caller permission: Host, Room Admin, or Platform Admin
    let isAuthorized = (callerId === room.host_id) || (callerRole === 'admin') || (callerRole === 'superadmin');
    if (!isAuthorized) {
      const adminRows = await query('SELECT id FROM live_room_admins WHERE room_id = ? AND user_id = ?', [roomId, callerId]);
      isAuthorized = adminRows.length > 0;
    }
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Only host or room moderators can lock/unlock seats.' });
    }

    let seats = await query('SELECT * FROM live_room_seats WHERE room_id = ? AND seat_number = ?', [roomId, num]);
    if (seats.length === 0) {
      if (num <= (room.total_seats || 7)) {
        await query(
          'INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted, is_locked) VALUES (?, ?, NULL, 0, 0, 0, 0)',
          [roomId, num]
        );
        seats = await query('SELECT * FROM live_room_seats WHERE room_id = ? AND seat_number = ?', [roomId, num]);
      } else {
        return res.status(404).json({ success: false, message: `Seat ${num} not found in this room.` });
      }
    }
    const seat = seats[0];

    let newLockStatus;
    if (req.path.endsWith('/unlock') || req.body.action === 'unlock') {
      newLockStatus = 0;
    } else if (req.body.action === 'lock') {
      newLockStatus = 1;
    } else if (req.body.isLocked !== undefined) {
      newLockStatus = req.body.isLocked ? 1 : 0;
    } else if (req.body.is_locked !== undefined) {
      newLockStatus = req.body.is_locked ? 1 : 0;
    } else if (req.body.lock !== undefined) {
      newLockStatus = req.body.lock ? 1 : 0;
    } else {
      newLockStatus = seat.is_locked ? 0 : 1;
    }

    // If locking and seat currently has an occupant, optionally eject them
    if (newLockStatus === 1 && seat.user_id) {
      await handleUserSeatDeparture(roomId, seat.user_id, req.io);
    }

    // Update seat lock state in DB
    await query('UPDATE live_room_seats SET is_locked = ? WHERE room_id = ? AND seat_number = ?', [newLockStatus, roomId, num]);

    // Instant Redis Invalidation
    await cache.del(`mobile:room_details:${roomId}`);

    const roomData = await buildRoomResponse(roomId, req.user);

    if (req.io) {
      req.io.to(roomId).emit('seat_locked', {
        roomId,
        seatNumber: num,
        isLocked: Boolean(newLockStatus),
        lockedBy: callerId,
      });
    }

    return res.json({
      success: true,
      message: `Seat ${num} ${newLockStatus ? 'locked' : 'unlocked'} successfully.`,
      isLocked: Boolean(newLockStatus),
      seatNumber: num,
      room: roomData,
    });
  } catch (err) {
    console.error('lockSeat error:', err);
    return res.status(500).json({ success: false, message: 'Failed to lock/unlock seat.', error: err.message });
  }
}

/**
 * Mobile Host / Moderator Force Mute Seat
 * POST /api/mobile/live/rooms/:roomId/seats/mute
 * POST /api/mobile/live/rooms/:roomId/seats/:seatNumber/mute
 */
export async function muteSeat(req, res) {
  try {
    const { roomId } = req.params;
    const callerId = req.user.id;
    const callerRole = req.user.role;
    const rawSeat = req.params.seatNumber !== undefined ? req.params.seatNumber : (req.body.seatNumber !== undefined ? req.body.seatNumber : req.body.seat_number);
    const rawUser = req.params.userId || req.body.userId || req.body.user_id;
    let num = parseInt(rawSeat, 10);

    const rooms = await query('SELECT id, room_id, host_id FROM live_rooms WHERE room_id = ? AND status = "live"', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Active live room not found.' });
    }
    const room = rooms[0];

    // If seatNumber not given, resolve via userId
    if ((!num || isNaN(num)) && rawUser) {
      const userSeats = await query('SELECT seat_number FROM live_room_seats WHERE room_id = ? AND user_id = ?', [roomId, rawUser]);
      if (userSeats.length > 0) {
        num = userSeats[0].seat_number;
      }
    }

    if (!num || num < 1) {
      return res.status(400).json({ success: false, message: 'Invalid seat number or user is not seated in this room.' });
    }

    const seats = await query('SELECT * FROM live_room_seats WHERE (room_id = ? OR room_id = ?) AND seat_number = ?', [roomId, String(room.id || ''), num]);
    if (seats.length === 0) {
      return res.status(404).json({ success: false, message: `Seat ${num} not found in this room.` });
    }
    const seat = seats[0];

    // Check caller permission: Host, Admin, Room Moderator, or the occupant of this seat
    let isAuthorized = (callerId === room.host_id) || (callerRole === 'admin') || (callerRole === 'superadmin') || (seat.user_id && Number(seat.user_id) === Number(callerId));
    if (!isAuthorized) {
      const adminRows = await query('SELECT id FROM live_room_admins WHERE (room_id = ? OR room_id = ?) AND user_id = ?', [roomId, String(room.id || ''), callerId]);
      isAuthorized = adminRows.length > 0;
    }
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Only host, room moderators, or the seated user can mute/unmute this seat.' });
    }

    let newMuteStatus = seat.is_muted;
    if (req.path.endsWith('/unmute') || req.body.action === 'unmute') {
      newMuteStatus = 0;
    } else if (req.body.action === 'mute') {
      newMuteStatus = 1;
    } else if (req.body.isMuted !== undefined) {
      newMuteStatus = req.body.isMuted ? 1 : 0;
    } else if (req.body.is_muted !== undefined) {
      newMuteStatus = req.body.is_muted ? 1 : 0;
    } else if (req.body.mute !== undefined) {
      newMuteStatus = req.body.mute ? 1 : 0;
    }

    let newCameraStatus = seat.is_camera_on;
    if (req.body.isCameraOn !== undefined) {
      newCameraStatus = req.body.isCameraOn ? 1 : 0;
    } else if (req.body.isVideoMuted !== undefined) {
      newCameraStatus = req.body.isVideoMuted ? 0 : 1;
    } else if (req.body.is_camera_on !== undefined) {
      newCameraStatus = req.body.is_camera_on ? 1 : 0;
    } else if (req.body.is_video_muted !== undefined) {
      newCameraStatus = req.body.is_video_muted ? 0 : 1;
    }

    // Update seat mute & camera in DB (Single Source of Truth)
    await query(
      'UPDATE live_room_seats SET is_muted = ?, is_camera_on = ? WHERE (room_id = ? OR room_id = ?) AND seat_number = ?',
      [newMuteStatus, newCameraStatus, roomId, String(room.id || ''), num]
    );

    // Instant Redis Invalidation
    await cache.del(`mobile:room_details:${roomId}`);
    if (room.id) await cache.del(`mobile:room_details:${room.id}`);

    const roomData = await buildRoomResponse(roomId, req.user);

    if (req.io) {
      const payload = {
        roomId: room.room_id || roomId,
        seatNumber: num,
        seatIndex: num,
        userId: seat.user_id,
        isMuted: Boolean(newMuteStatus),
        is_muted: Boolean(newMuteStatus),
        isCameraOn: Boolean(newCameraStatus),
        is_camera_on: Boolean(newCameraStatus),
        isVideoMuted: !Boolean(newCameraStatus),
        is_video_muted: !Boolean(newCameraStatus),
        mutedBy: callerId,
        actionBy: callerId,
      };
      req.io.to(room.room_id || roomId).emit('seat_media_updated', payload);
      req.io.to(room.room_id || roomId).emit('seat-media-updated', payload);
    }

    return res.json({
      success: true,
      message: `Seat ${num} media updated successfully.`,
      isMuted: Boolean(newMuteStatus),
      isCameraOn: Boolean(newCameraStatus),
      isVideoMuted: !Boolean(newCameraStatus),
      seatNumber: num,
      room: roomData,
    });
  } catch (err) {
    console.error('muteSeat error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mute/unmute seat.', error: err.message });
  }
}

/**
 * Mobile End Live Stream
 * POST /api/mobile/live/rooms/:roomId/end
 */
export async function endRoom(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const isNum = /^\d+$/.test(String(roomId).trim());

    const rooms = await query(
      'SELECT * FROM live_rooms WHERE room_id = ? OR id = ?',
      [String(roomId), isNum ? Number(roomId) : -1]
    );
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const room = rooms[0];
    const canonicalRoomId = room.room_id;
    const numericRoomId = room.id;

    // If a disconnect grace period timer was pending, cancel it immediately
    cancelHostDisconnectGraceTimer(canonicalRoomId);
    if (numericRoomId) cancelHostDisconnectGraceTimer(String(numericRoomId));

    // Check permissions: Host, System Admin, or Global Moderator
    // NOTE: Temporary Room Admins (promoted viewers) are strictly FORBIDDEN from terminating the room!
    const isHost = room.host_id === userId;
    const isSystemAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isGlobalModerator = req.user.role === 'moderator';

    if (!isHost && !isSystemAdmin && !isGlobalModerator) {
      // Check if caller is a room admin to provide an explicit security rejection
      const roomAdminRows = await query(
        'SELECT id FROM live_room_admins WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
        [canonicalRoomId, String(numericRoomId), userId]
      );
      if (roomAdminRows.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Room admins are not authorized to terminate this live stream. Only the host or official platform moderators can terminate the stream.',
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Only the host or an authorized platform moderator can end this stream.',
      });
    }

    const closedByRole = isHost ? 'host' : req.user.role;

    // 0. Wipe all in-memory runtime trackers and timers
    clearRoomMemoryState(canonicalRoomId, numericRoomId);

    // 1. Mark room as ended with 0 viewers in MySQL SSOT
    await query(
      "UPDATE live_rooms SET status = 'ended', viewer_count = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?",
      [numericRoomId]
    );

    // 2. Clean up ALL runtime room data from database:
    await Promise.allSettled([
      query('DELETE FROM live_room_seats WHERE room_id = ? OR room_id = ?', [canonicalRoomId, String(numericRoomId)]),
      query('DELETE FROM live_room_viewers WHERE room_id = ? OR room_id = ?', [canonicalRoomId, String(numericRoomId)]),
      query('DELETE FROM live_room_seat_requests WHERE room_id = ? OR room_id = ?', [canonicalRoomId, String(numericRoomId)]),
      query('DELETE FROM live_room_admins WHERE room_id = ? OR room_id = ?', [canonicalRoomId, String(numericRoomId)]),
      clearRoomMusicState(canonicalRoomId),
      numericRoomId ? clearRoomMusicState(String(numericRoomId)) : null,
    ]);

    // 3. Redis Cache Invalidation: Wipe targeted cache keys for this room and host only
    const patternsToDelete = [
      'mobile:rooms:*',
      `mobile:room_details:${canonicalRoomId}`,
      numericRoomId ? `mobile:room_details:${numericRoomId}` : null,
      `mobile:room:users:${canonicalRoomId}*`,
      numericRoomId ? `mobile:room:users:${numericRoomId}*` : null,
      `mobile:live:seat_requests:${canonicalRoomId}*`,
      numericRoomId ? `mobile:live:seat_requests:${numericRoomId}*` : null,
      `mobile:live:room_admins:${canonicalRoomId}*`,
      numericRoomId ? `mobile:live:room_admins:${numericRoomId}*` : null,
      `room:${canonicalRoomId}`,
      numericRoomId ? `room:${numericRoomId}` : null,
      `host:${room.host_id}:*`,
      `host:${userId}:*`,
      `mobile:live:rewards:${room.host_id}:*`,
      `mobile:live:rewards:${userId}:*`,
    ].filter(Boolean);

    await Promise.allSettled([
      ...patternsToDelete.map((p) => cache.delByPattern(p)),
      cache.del(`mobile:live:my_active:${room.host_id}`),
      cache.del(`mobile:live:my_active:${userId}`),
    ]);

    // Update in-app notifications to mark live as ended
    handleLiveEndedNotifications({ roomId: canonicalRoomId, numericRoomId }).catch((err) => {
      console.error('[Notification] Handle live ended error:', err.message);
    });

    // 4. Socket notifications exclusively to participants in this room's channel
    if (req.io) {
      const closePayload = {
        roomId: canonicalRoomId,
        numericRoomId,
        closedBy: userId,
        closedByRole,
        message: 'Stream has been closed by ' + (isHost ? 'host' : 'moderator') + '.',
        reason: 'Stream closed by ' + closedByRole,
        timestamp: new Date().toISOString(),
      };

      const targetChannels = new Set([canonicalRoomId, String(numericRoomId)].filter(Boolean));
      for (const ch of targetChannels) {
        req.io.to(ch).emit('room-closed', closePayload);
        req.io.to(ch).emit('room_closed', closePayload);
        req.io.to(ch).emit('room_ended', { roomId: canonicalRoomId, numericRoomId, message: closePayload.message });
        req.io.to(ch).emit('stream-terminated', { roomId: canonicalRoomId, numericRoomId, reason: closePayload.reason });
        req.io.to(ch).emit('viewer-count-update', { roomId: canonicalRoomId, count: 0, viewer_count: 0 });
      }

      // Broadcast ONLY feed-card removal events globally to Home / Lobby / Explore screens
      // (NEVER broadcast room-closed, room_ended, or stream-terminated globally, as that closes other hosts' live rooms!)
      req.io.emit('room_removed', { roomId: canonicalRoomId, numericRoomId, hostId: room.host_id });
      req.io.emit('live_room_deleted', { roomId: canonicalRoomId, numericRoomId });

      // Evict and unsubscribe ALL sockets from this room channel
      if (typeof req.io.socketsLeave === 'function') {
        req.io.socketsLeave(canonicalRoomId);
        if (numericRoomId) req.io.socketsLeave(String(numericRoomId));
      }
    }

    // 5. Evaluate and auto-award live streaming reward if host is eligible
    let rewardResult = null;
    if (isHost) {
      try {
        const rewardCheck = await checkStreamRewardStatus({ userId: room.host_id, roomId: canonicalRoomId });
        if (rewardCheck && rewardCheck.eligible) {
          rewardResult = await claimAndAwardLiveReward({
            userId: room.host_id,
            roomId: canonicalRoomId,
            io: req.io,
          });
          if (rewardResult && rewardResult.success) {
            console.log(`🎉 [Live Reward] Auto-awarded ${rewardResult.reward?.coins} coins to host ${room.host_id} for stream ${canonicalRoomId}`);
          }
        }
      } catch (rewardErr) {
        console.warn('⚠️ [Live Reward Auto-Check Warning]:', rewardErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Live stream ended successfully. All room data cleared and viewers unsubscribed from socket channel.',
      reward: rewardResult && rewardResult.success ? rewardResult.reward : null,
    });
  } catch (err) {
    console.error('Mobile endRoom error:', err);
    return res.status(500).json({ success: false, message: 'Failed to end stream.', error: err.message });
  }
}

/**
 * Mobile Request a Seat in Room (Video / Audio Multi-Seat Request)
 * POST /api/mobile/live/rooms/:roomId/seats/request
 */
export async function requestSeat(req, res) {
  try {
    const { roomId } = req.params;
    const { seatNumber, seat_number, preferred_seat_number, preferredSeatNumber } = req.body;
    const userId = req.user.id;

    const rooms = await query('SELECT id, room_id, host_id, total_seats, status, live_type FROM live_rooms WHERE room_id = ? AND status = "live"', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Live room not active or not found.' });
    }
    const room = rooms[0];

    // Check if user already on a seat in this room
    const existingSeat = await query('SELECT seat_number FROM live_room_seats WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    if (existingSeat.length > 0) {
      return res.status(400).json({ success: false, message: `You are already occupying seat #${existingSeat[0].seat_number}.` });
    }

    // Check VIP privilege self_seat_accept
    const subs = await query(
      `SELECT pc.self_seat_accept 
       FROM user_package_subscriptions ups
       JOIN package_categories pc ON pc.id = ups.category_id
       WHERE ups.user_id = ? AND ups.status = 'active' AND ups.expires_at > NOW() AND pc.self_seat_accept = 1
       LIMIT 1`,
      [userId]
    );
    // In Video Live, no user can auto-seat under any circumstances without host acceptance
    const hasAutoSeatPrivilege = subs.length > 0 && room.live_type !== 'video';

    let targetSeatNum = parseInt(seat_number || seatNumber || preferred_seat_number || preferredSeatNumber, 10);
    if (targetSeatNum && targetSeatNum < 2) targetSeatNum = null; // seat 1 is reserved for host

    if (hasAutoSeatPrivilege) {
      // VIP Privilege: Take seat automatically!
      if (!targetSeatNum) {
        const freeSeats = await query(
          'SELECT seat_number FROM live_room_seats WHERE room_id = ? AND user_id IS NULL AND seat_number > 1 AND is_locked = 0 ORDER BY seat_number ASC LIMIT 1',
          [roomId]
        );
        targetSeatNum = freeSeats.length > 0 ? freeSeats[0].seat_number : 2;
      }

      await query(
        `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
         VALUES (?, ?, ?, 0, 1, 0)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), is_camera_on = 1, is_muted = 0`,
        [roomId, targetSeatNum, userId]
      );

      // Instant Redis Invalidation
      await Promise.allSettled([
        cache.del(`mobile:room_details:${roomId}`),
        cache.delByPattern(`mobile:room:users:${roomId}*`),
        cache.del(`mobile:live:seat_requests:${roomId}`),
      ]);

      const roomData = await buildRoomResponse(roomId, req.user);
      if (req.io) {
        const userData = {
          id: Number(req.user.id),
          fullName: req.user.full_name,
          full_name: req.user.full_name,
          name: req.user.full_name,
          avatarUrl: req.user.avatar_url,
          avatar_url: req.user.avatar_url,
          profile: req.user.avatar_url,
          coin: Number(req.user.coins || 0),
          coins: Number(req.user.coins || 0),
          role: req.user.role,
          level: Number(req.user.level || 1),
          vipLevel: Number(req.user.level || 1),
          vip_level: Number(req.user.level || 1),
        };
        req.io.to(roomId).emit('seat_updated', {
          roomId,
          seatNumber: targetSeatNum,
          seatIndex: targetSeatNum,
          seat_index: targetSeatNum,
          action: 'take',
          userId: Number(userId),
          user: userData,
          seat: {
            seatIndex: targetSeatNum,
            seat_index: targetSeatNum,
            isLocked: false,
            isMuted: false,
            isVideoMuted: false,
            user: userData,
          },
        });
      }

      return res.json({
        success: true,
        auto_accepted: true,
        message: `VIP Privilege: You automatically took seat #${targetSeatNum}!`,
        seat_number: targetSeatNum,
        room: roomData,
      });
    }

    // Regular user: create pending request
    const pending = await query(
      "SELECT id FROM live_room_seat_requests WHERE room_id = ? AND user_id = ? AND status = 'pending'",
      [roomId, userId]
    );
    if (pending.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have a pending seat request for this room.' });
    }

    const insertRes = await query(
      `INSERT INTO live_room_seat_requests (room_id, user_id, seat_number, status)
       VALUES (?, ?, ?, 'pending')`,
      [roomId, userId, targetSeatNum || null]
    );

    // Instant Redis update with fresh waiting list
    const updatedWaitingList = await fetchAndCacheSeatRequests(roomId);

    if (req.io) {
      req.io.to(roomId).emit('seat_request_created', {
        roomId,
        requestId: insertRes.insertId,
        user: {
          id: req.user.id,
          name: req.user.full_name,
          profile: req.user.avatar_url,
          coin: req.user.coins,
          level: req.user.level,
        },
        requested_seat: targetSeatNum || null,
      });
    }

    return res.status(201).json({
      success: true,
      auto_accepted: false,
      message: 'Seat request submitted successfully. Waiting for host approval.',
      request_id: insertRes.insertId,
      waiting_list: updatedWaitingList,
    });
  } catch (err) {
    console.error('requestSeat error:', err);
    return res.status(500).json({ success: false, message: 'Failed to request seat.', error: err.message });
  }
}

/**
 * Query active pending seat requests from DB and immediately prime Redis cache.
 * Guarantees zero stale reads and instant Redis synchronization.
 */
export async function fetchAndCacheSeatRequests(roomId) {
  const cacheKey = `mobile:live:seat_requests:${roomId}`;
  const settingRows = await query("SELECT key_value FROM system_settings WHERE key_name = 'is_convert_to_diamond'");
  const isDiamondMode = settingRows && settingRows.length > 0
    ? (settingRows[0].key_value === 'true' || settingRows[0].key_value === '1')
    : true;

  const requests = await query(
    `SELECT sr.id, sr.room_id, sr.seat_number, sr.status, sr.created_at,
            u.id as user_id, u.full_name as user_name, u.avatar_url as user_avatar,
            u.coins as user_coin, u.diamonds as user_diamond, u.role as user_role, u.level as user_level,
            pc.name as package_category_name,
            COALESCE(pp.image_url, pc.badge_icon, '') as package_image,
            pc.color_code as package_color
     FROM live_room_seat_requests sr
     JOIN users u ON u.id = sr.user_id
     LEFT JOIN user_package_subscriptions ups 
       ON ups.id = (
         SELECT id FROM user_package_subscriptions 
         WHERE user_id = u.id AND status = 'active' AND expires_at > NOW() 
         ORDER BY is_equipped DESC, expires_at DESC LIMIT 1
       )
     LEFT JOIN privilege_packages pp ON pp.id = ups.package_id
     LEFT JOIN package_categories pc 
       ON pc.id = ups.category_id AND pc.is_active = 1
     WHERE sr.room_id = ? AND sr.status = 'pending' AND u.role != 'superadmin'
     ORDER BY sr.created_at ASC`,
    [roomId]
  );

  const formatted = requests.map((r) => ({
    id: r.id,
    seat_number: r.seat_number,
    created_at: r.created_at,
    user: {
      id: r.user_id,
      name: r.user_name,
      image: r.user_avatar,
      avatar_url: r.user_avatar,
      coin: r.user_coin ?? 0,
      ...(isDiamondMode ? { diamond: r.user_diamond ?? 0 } : {}),
      package_category_name: r.package_category_name || null,
      package_image: r.package_image || null,
      package_color: r.package_color || null,
      level: r.user_level || 1,
      role: r.user_role || 'user',
    },
  }));

  const payload = {
    room_id: roomId,
    total_requests: formatted.length,
    requests: formatted,
  };

  // Prime Redis with fresh state
  await cache.set(cacheKey, payload, 30);
  return payload;
}

/**
 * Mobile Get Pending Seat Requests (Waiting List)
 * GET /api/mobile/live/rooms/:roomId/seats/requests
 * Cached via Redis Cache-Aside (Rule #3)
 */
export async function getSeatRequests(req, res) {
  try {
    const { roomId } = req.params;
    const cacheKey = `mobile:live:seat_requests:${roomId}`;

    const data = await cache.getOrSet(cacheKey, 30, async () => {
      return fetchAndCacheSeatRequests(roomId);
    });

    return res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('getSeatRequests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve seat requests.', error: err.message });
  }
}

/**
 * Mobile Approve / Accept Seat Request (Host or Room Admin Action)
 * POST /api/mobile/live/rooms/:roomId/seats/requests/:requestId/approve
 * POST /api/mobile/live/rooms/:roomId/seats/requests/:requestId/accept
 */
export async function approveSeatRequest(req, res) {
  try {
    const { roomId, requestId } = req.params;
    const { seatNumber, seat_number } = req.body;
    const hostId = req.user.id;

    // Verify room is live by canonical room_id or numeric id
    const isNum = /^\d+$/.test(String(roomId).trim());
    const rooms = await query(
      'SELECT id, room_id, host_id, total_seats, live_type, status FROM live_rooms WHERE (room_id = ? OR id = ?) AND status = "live"',
      [String(roomId), isNum ? Number(roomId) : -1]
    );
    if (rooms.length === 0) return res.status(404).json({ success: false, message: 'Live room not active.' });
    const room = rooms[0];
    const canonicalRoomId = room.room_id;
    const numericRoomId = room.id;

    // 1. Robust Request Lookup: Match by ID, caller's pending request, or target user ID
    let requestRows = [];
    const isNumericRequestId = /^\d+$/.test(String(requestId).trim());
    if (isNumericRequestId) {
      requestRows = await query(
        'SELECT * FROM live_room_seat_requests WHERE id = ? AND (room_id = ? OR room_id = ?) AND status = "pending"',
        [Number(requestId), canonicalRoomId, String(numericRoomId)]
      );
    }
    // Fallback 1: Look for caller's own pending request in this room
    if (requestRows.length === 0) {
      requestRows = await query(
        'SELECT * FROM live_room_seat_requests WHERE (room_id = ? OR room_id = ?) AND user_id = ? AND status = "pending" ORDER BY id DESC LIMIT 1',
        [canonicalRoomId, String(numericRoomId), hostId]
      );
    }
    // Fallback 2: Look for target user's pending request if userId passed in body
    const fallbackTargetUserId = req.body.userId || req.body.user_id || req.body.targetUserId;
    if (requestRows.length === 0 && fallbackTargetUserId) {
      requestRows = await query(
        'SELECT * FROM live_room_seat_requests WHERE (room_id = ? OR room_id = ?) AND user_id = ? AND status = "pending" ORDER BY id DESC LIMIT 1',
        [canonicalRoomId, String(numericRoomId), Number(fallbackTargetUserId)]
      );
    }

    let requestRow = requestRows.length > 0 ? requestRows[0] : null;
    let targetUserId = requestRow ? requestRow.user_id : (fallbackTargetUserId ? Number(fallbackTargetUserId) : hostId);

    // If still no requestRow, check if user is self-approving with VIP self_seat_accept privilege!
    if (!requestRow) {
      const isSelf = Number(targetUserId) === Number(req.user.id);
      if (isSelf) {
        const canSelfAccept = await checkUserSelfSeatAcceptPrivilege(req.user.id);
        if (canSelfAccept) {
          requestRow = {
            id: null,
            room_id: canonicalRoomId,
            user_id: req.user.id,
            seat_number: req.body.seat_number || req.body.seatNumber || null,
            status: 'pending',
          };
        }
      }
    }

    if (!requestRow) {
      return res.status(404).json({ success: false, message: 'Pending seat request not found.' });
    }

    // Authorization:
    // 1. Host or Room Admin or System Admin/Superadmin
    // 2. OR Self-approval if user is accepting their own seat request and possesses self_seat_accept privilege
    const isSelfApproval = Number(targetUserId) === Number(req.user.id);
    let isAuthorized = hostId === room.host_id || req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isAuthorized && isSelfApproval) {
      const canSelfAccept = await checkUserSelfSeatAcceptPrivilege(req.user.id);
      if (canSelfAccept) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const adminRows = await query(
        'SELECT id FROM live_room_admins WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
        [canonicalRoomId, String(numericRoomId), hostId]
      );
      if (adminRows.length > 0) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: isSelfApproval
          ? 'Your active VIP package does not have privilege to self-accept seat requests.'
          : 'Only host or room admin can approve seat requests.',
      });
    }

    // Determine seat number
    const isVideoLive = (room.live_type || 'video') !== 'audio';
    let assignSeatNum = parseInt(seat_number || seatNumber || requestRow.seat_number, 10);
    if (isVideoLive || !assignSeatNum || assignSeatNum < 2) {
      const freeSeats = await query(
        'SELECT seat_number FROM live_room_seats WHERE (room_id = ? OR room_id = ?) AND user_id IS NULL AND seat_number > 1 AND is_locked = 0 ORDER BY seat_number ASC LIMIT 1',
        [canonicalRoomId, String(numericRoomId)]
      );
      if (freeSeats.length === 0) {
        return res.status(400).json({ success: false, message: 'No available free seats in this room.' });
      }
      assignSeatNum = freeSeats[0].seat_number;
    }

    // Check if target seat is free; if already occupied or locked, auto-assign the next free seat
    const targetSeat = await query(
      'SELECT user_id, is_locked FROM live_room_seats WHERE (room_id = ? OR room_id = ?) AND seat_number = ?',
      [canonicalRoomId, String(numericRoomId), assignSeatNum]
    );
    if (targetSeat.length > 0 && (targetSeat[0].user_id || targetSeat[0].is_locked)) {
      const fallbackFreeSeats = await query(
        'SELECT seat_number FROM live_room_seats WHERE (room_id = ? OR room_id = ?) AND user_id IS NULL AND seat_number > 1 AND is_locked = 0 ORDER BY seat_number ASC LIMIT 1',
        [canonicalRoomId, String(numericRoomId)]
      );
      if (fallbackFreeSeats.length === 0) {
        return res.status(400).json({ success: false, message: 'All seats in this room are currently occupied.' });
      }
      assignSeatNum = fallbackFreeSeats[0].seat_number;
    }

    // 1. Assign seat in live_room_seats (DB-First Single Source of Truth)
    await query(
      `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
       VALUES (?, ?, ?, 0, 1, 0)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), is_camera_on = 1, is_muted = 0`,
      [canonicalRoomId, assignSeatNum, targetUserId]
    );

    // 2. Remove accepted request from waiting list table in database
    if (requestRow.id) {
      await query('DELETE FROM live_room_seat_requests WHERE id = ?', [requestRow.id]);
    }
    await query(
      'DELETE FROM live_room_seat_requests WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
      [canonicalRoomId, String(numericRoomId), targetUserId]
    );

    // 3. Instant Redis Invalidation & Pre-caching updated waiting list
    await Promise.allSettled([
      cache.del(`mobile:room_details:${canonicalRoomId}`),
      numericRoomId ? cache.del(`mobile:room_details:${numericRoomId}`) : null,
      cache.delByPattern(`mobile:room:users:${canonicalRoomId}*`),
      cache.del(`mobile:live:seat_requests:${canonicalRoomId}`),
    ]);
    const updatedWaitingList = await fetchAndCacheSeatRequests(canonicalRoomId);

    const roomData = await buildRoomResponse(canonicalRoomId, req.user);

    // Fetch user details for real-time seat update broadcast
    const [targetUser] = await query(
      'SELECT id, full_name, avatar_url, coins, role, level FROM users WHERE id = ?',
      [targetUserId]
    );

    const userPayload = targetUser ? {
      id: Number(targetUser.id),
      fullName: targetUser.full_name,
      full_name: targetUser.full_name,
      name: targetUser.full_name,
      avatarUrl: targetUser.avatar_url,
      avatar_url: targetUser.avatar_url,
      profile: targetUser.avatar_url,
      coin: Number(targetUser.coins || 0),
      coins: Number(targetUser.coins || 0),
      role: targetUser.role,
      level: Number(targetUser.level || 1),
      vipLevel: Number(targetUser.level || 1),
      vip_level: Number(targetUser.level || 1),
    } : {
      id: Number(targetUserId),
      fullName: req.user?.full_name || 'User',
      full_name: req.user?.full_name || 'User',
      name: req.user?.full_name || 'User',
      avatarUrl: req.user?.avatar_url || '',
      avatar_url: req.user?.avatar_url || '',
      profile: req.user?.avatar_url || '',
      coin: Number(req.user?.coins || 0),
      coins: Number(req.user?.coins || 0),
      role: req.user?.role || 'user',
      level: Number(req.user?.level || 1),
      vipLevel: Number(req.user?.level || 1),
      vip_level: Number(req.user?.level || 1),
    };

    if (req.io) {
      const approvalPayload = {
        roomId: canonicalRoomId,
        numericRoomId,
        requestId: requestRow.id || requestId,
        userId: Number(targetUserId),
        seatNumber: assignSeatNum,
        seatIndex: assignSeatNum,
        seat_index: assignSeatNum,
        user: userPayload,
        seat: {
          seatIndex: assignSeatNum,
          seat_index: assignSeatNum,
          isLocked: false,
          isMuted: false,
          isVideoMuted: false,
          user: userPayload,
        },
        seats: roomData?.seats || [],
        rawSeats: roomData?.seats || [],
      };

      const seatUpdatedPayload = {
        roomId: canonicalRoomId,
        numericRoomId,
        seatNumber: assignSeatNum,
        seatIndex: assignSeatNum,
        seat_index: assignSeatNum,
        action: 'take',
        userId: Number(targetUserId),
        user: userPayload,
        seat: {
          seatIndex: assignSeatNum,
          seat_index: assignSeatNum,
          isLocked: false,
          isMuted: false,
          isVideoMuted: false,
          user: userPayload,
        },
        seats: roomData?.seats || [],
        rawSeats: roomData?.seats || [],
      };

      const channels = new Set([canonicalRoomId, String(numericRoomId)].filter(Boolean));
      for (const ch of channels) {
        req.io.to(ch).emit('seat_request_approved', approvalPayload);
        req.io.to(ch).emit('seat_updated', seatUpdatedPayload);
        req.io.to(ch).emit('seats_updated', { roomId: canonicalRoomId, seats: roomData?.seats || [], rawSeats: roomData?.seats || [] });
        req.io.to(ch).emit('seats-sync', { roomId: canonicalRoomId, seats: roomData?.seats || [], rawSeats: roomData?.seats || [] });
      }
    }

    return res.json({
      success: true,
      message: `Seat request approved. User assigned to seat #${assignSeatNum}. Removed from waiting list.`,
      seat_number: assignSeatNum,
      room: roomData,
      waiting_list: updatedWaitingList,
    });
  } catch (err) {
    console.error('approveSeatRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve seat request.', error: err.message });
  }
}

/**
 * Mobile Reject Seat Request (Host or Room Admin Action)
 * POST /api/mobile/live/rooms/:roomId/seats/requests/:requestId/reject
 */
export async function rejectSeatRequest(req, res) {
  try {
    const { roomId, requestId } = req.params;
    const hostId = req.user.id;

    const isNum = /^\d+$/.test(String(roomId).trim());
    const rooms = await query(
      'SELECT id, room_id, host_id FROM live_rooms WHERE (room_id = ? OR id = ?)',
      [String(roomId), isNum ? Number(roomId) : -1]
    );
    if (rooms.length === 0) return res.status(404).json({ success: false, message: 'Room not found.' });
    const room = rooms[0];
    const canonicalRoomId = room.room_id;
    const numericRoomId = room.id;

    if (hostId !== room.host_id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      const adminRows = await query(
        'SELECT id FROM live_room_admins WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
        [canonicalRoomId, String(numericRoomId), hostId]
      );
      if (adminRows.length === 0) return res.status(403).json({ success: false, message: 'Only host or room admin can reject seat requests.' });
    }

    // 1. Remove rejected request from waiting list table in database
    await query(
      'DELETE FROM live_room_seat_requests WHERE id = ? AND (room_id = ? OR room_id = ?)',
      [requestId, canonicalRoomId, String(numericRoomId)]
    );

    // 2. Instant Redis update with fresh waiting list
    const updatedWaitingList = await fetchAndCacheSeatRequests(canonicalRoomId);

    if (req.io) {
      req.io.to(canonicalRoomId).emit('seat_request_rejected', {
        roomId: canonicalRoomId,
        numericRoomId,
        requestId,
      });
      if (numericRoomId) {
        req.io.to(String(numericRoomId)).emit('seat_request_rejected', {
          roomId: canonicalRoomId,
          numericRoomId,
          requestId,
        });
      }
    }

    return res.json({
      success: true,
      message: 'Seat request rejected successfully. Removed from waiting list.',
      waiting_list: updatedWaitingList,
    });
  } catch (err) {
    console.error('rejectSeatRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject seat request.', error: err.message });
  }
}

/**
 * Mobile Cancel Seat Request (Applicant Action - Cancel Own Request)
 * POST /api/mobile/live/rooms/:roomId/seats/requests/cancel
 * POST /api/mobile/live/rooms/:roomId/seats/requests/:requestId/cancel
 * DELETE /api/mobile/live/rooms/:roomId/seats/request
 * DELETE /api/mobile/live/rooms/:roomId/seats/requests/:requestId
 */
export async function cancelSeatRequest(req, res) {
  try {
    const { roomId, requestId } = req.params;
    const userId = req.user.id;

    let targetReqId = requestId ? parseInt(requestId, 10) : null;

    if (targetReqId) {
      const rows = await query('SELECT id FROM live_room_seat_requests WHERE id = ? AND room_id = ? AND user_id = ?', [targetReqId, roomId, userId]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Pending seat request not found or not owned by you.' });
      }
    } else {
      const rows = await query('SELECT id FROM live_room_seat_requests WHERE room_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1', [roomId, userId]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'No pending seat request found to cancel.' });
      }
      targetReqId = rows[0].id;
    }

    // 1. Delete from database waiting list
    await query('DELETE FROM live_room_seat_requests WHERE id = ?', [targetReqId]);

    // 2. Instant Redis update with fresh waiting list
    const updatedWaitingList = await fetchAndCacheSeatRequests(roomId);

    if (req.io) {
      req.io.to(roomId).emit('seat_request_cancelled', {
        roomId,
        requestId: targetReqId,
        userId,
      });
    }

    return res.json({
      success: true,
      message: 'Seat request cancelled successfully. Removed from waiting list.',
      waiting_list: updatedWaitingList,
    });
  } catch (err) {
    console.error('cancelSeatRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel seat request.', error: err.message });
  }
}

/**
 * Mobile Get Room Admins / Moderators
 * GET /api/mobile/live/rooms/:roomId/admins
 * Cached via Redis Cache-Aside (Rule #3)
 */
export async function getRoomAdmins(req, res) {
  try {
    const { roomId } = req.params;
    const cacheKey = `mobile:live:room_admins:${roomId}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      const rooms = await query(
        `SELECT r.id, r.room_id, r.host_id, u.full_name as host_name, u.avatar_url as host_avatar, u.role as host_role
         FROM live_rooms r
         JOIN users u ON u.id = r.host_id
         WHERE r.room_id = ?`,
        [roomId]
      );
      if (rooms.length === 0) return null;
      const room = rooms[0];

      const settingRows = await query("SELECT key_value FROM system_settings WHERE key_name = 'is_convert_to_diamond'");
      const isDiamondMode = settingRows && settingRows.length > 0
        ? (settingRows[0].key_value === 'true' || settingRows[0].key_value === '1')
        : true;

      const admins = await query(
        `SELECT u.id, u.full_name as name, u.avatar_url as image,
                u.coins as coin, u.diamonds as diamond, u.role, u.level,
                ra.permissions, ra.created_at as assigned_at,
                (u.id = ?) as is_owner,
                pc.name as package_category_name,
                COALESCE(pp.image_url, pc.badge_icon, '') as package_image,
                pc.color_code as package_color
         FROM live_room_admins ra
         JOIN users u ON u.id = ra.user_id
         LEFT JOIN user_package_subscriptions ups 
           ON ups.id = (
             SELECT id FROM user_package_subscriptions 
             WHERE user_id = u.id AND status = 'active' AND expires_at > NOW() 
             ORDER BY is_equipped DESC, expires_at DESC LIMIT 1
           )
         LEFT JOIN privilege_packages pp ON pp.id = ups.package_id
         LEFT JOIN package_categories pc 
           ON pc.id = ups.category_id AND pc.is_active = 1
         WHERE ra.room_id = ?
         ORDER BY is_owner DESC, ra.created_at ASC`,
        [room.host_id, roomId]
      );

      const hasHost = admins.some((a) => a.id === room.host_id);
      const adminList = [...admins];
      if (!hasHost) {
        adminList.unshift({
          id: room.host_id,
          name: room.host_name,
          image: room.host_avatar,
          avatar_url: room.host_avatar,
          role: 'host',
          is_owner: true,
          permissions: ['all'],
          assigned_at: room.created_at,
          coin: 0,
          level: 1,
          package_category_name: null,
          package_image: null,
          package_color: null,
        });
      }

      const formatted = adminList.map((a) => ({
        id: a.id,
        name: a.name,
        image: a.image,
        avatar_url: a.image,
        coin: a.coin ?? 0,
        ...(isDiamondMode ? { diamond: a.diamond ?? 0 } : {}),
        role: a.is_owner ? 'host' : 'room_admin',
        is_owner: Boolean(a.is_owner),
        level: a.level || 1,
        package_category_name: a.package_category_name || null,
        package_image: a.package_image || null,
        package_color: a.package_color || null,
        permissions: a.permissions || ['all'],
        assigned_at: a.assigned_at,
      }));

      return {
        room_id: roomId,
        host: {
          id: room.host_id,
          name: room.host_name,
          image: room.host_avatar,
          role: 'host',
        },
        total_admins: formatted.length,
        admins: formatted,
      };
    });

    if (!data) return res.status(404).json({ success: false, message: 'Room not found.' });

    return res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('getRoomAdmins error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve room admins.', error: err.message });
  }
}

/**
 * Mobile Assign Room Admin (Host action)
 * POST /api/mobile/live/rooms/:roomId/admins
 */
export async function assignRoomAdmin(req, res) {
  try {
    const { roomId } = req.params;
    const { userId, user_id, permissions } = req.body;
    const hostId = req.user.id;

    const isNum = /^\d+$/.test(String(roomId).trim());
    const rooms = await query(
      'SELECT id, room_id, host_id FROM live_rooms WHERE (room_id = ? OR id = ?)',
      [String(roomId), isNum ? Number(roomId) : -1]
    );
    if (rooms.length === 0) return res.status(404).json({ success: false, message: 'Room not found.' });
    const room = rooms[0];
    const canonicalRoomId = room.room_id;
    const numericRoomId = room.id;

    if (room.host_id !== hostId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only room host can assign room admins.' });
    }

    const targetId = parseInt(user_id !== undefined ? user_id : userId, 10);
    if (!targetId) return res.status(400).json({ success: false, message: 'User ID is required.' });

    const perms = permissions || ['manage_seats', 'mute_users', 'kick_users'];
    await query(
      `INSERT INTO live_room_admins (room_id, user_id, assigned_by, permissions)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE permissions = VALUES(permissions)`,
      [canonicalRoomId, targetId, hostId, JSON.stringify(perms)]
    );

    // Instant Redis Invalidation
    await Promise.allSettled([
      cache.del(`mobile:live:room_admins:${canonicalRoomId}`),
      numericRoomId ? cache.del(`mobile:live:room_admins:${numericRoomId}`) : null,
    ]);

    if (req.io) {
      req.io.to(canonicalRoomId).emit('room_admin_assigned', {
        roomId: canonicalRoomId,
        numericRoomId,
        userId: targetId,
        assignedBy: hostId,
      });
      if (numericRoomId) {
        req.io.to(String(numericRoomId)).emit('room_admin_assigned', {
          roomId: canonicalRoomId,
          numericRoomId,
          userId: targetId,
          assignedBy: hostId,
        });
      }
    }

    return res.json({
      success: true,
      message: 'Room admin assigned successfully.',
    });
  } catch (err) {
    console.error('assignRoomAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign room admin.', error: err.message });
  }
}

/**
 * Mobile Remove Room Admin (Host action)
 * DELETE /api/mobile/live/rooms/:roomId/admins/:userId
 */
export async function removeRoomAdmin(req, res) {
  try {
    const { roomId, userId } = req.params;
    const targetUserId = parseInt(userId || req.params.user_id || req.body?.user_id || req.body?.userId, 10);
    const hostId = req.user.id;

    const isNum = /^\d+$/.test(String(roomId).trim());
    const rooms = await query(
      'SELECT id, room_id, host_id FROM live_rooms WHERE (room_id = ? OR id = ?)',
      [String(roomId), isNum ? Number(roomId) : -1]
    );
    if (rooms.length === 0) return res.status(404).json({ success: false, message: 'Room not found.' });
    const room = rooms[0];
    const canonicalRoomId = room.room_id;
    const numericRoomId = room.id;

    if (room.host_id !== hostId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only room host can remove room admins.' });
    }

    const targetId = parseInt(targetUserId, 10);
    if (targetId === room.host_id) {
      return res.status(400).json({ success: false, message: 'Cannot remove the room host from admins.' });
    }

    await query(
      'DELETE FROM live_room_admins WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
      [canonicalRoomId, String(numericRoomId), targetId]
    );

    // Instant Redis Invalidation
    await Promise.allSettled([
      cache.del(`mobile:live:room_admins:${canonicalRoomId}`),
      numericRoomId ? cache.del(`mobile:live:room_admins:${numericRoomId}`) : null,
    ]);

    if (req.io) {
      req.io.to(canonicalRoomId).emit('room_admin_removed', {
        roomId: canonicalRoomId,
        numericRoomId,
        userId: targetId,
        removedBy: hostId,
      });
      if (numericRoomId) {
        req.io.to(String(numericRoomId)).emit('room_admin_removed', {
          roomId: canonicalRoomId,
          numericRoomId,
          userId: targetId,
          removedBy: hostId,
        });
      }
    }

    return res.json({
      success: true,
      message: 'Room admin removed successfully.',
    });
  } catch (err) {
    console.error('removeRoomAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove room admin.', error: err.message });
  }
}

/**
 * Mobile Update Audio Live Room Seat Count (Dynamic Scaling)
 * PATCH /api/mobile/live/rooms/:roomId/seats/count
 * POST /api/mobile/live/rooms/:roomId/seats/update-count
 * 
 * Rules:
 * - Only Audio Live rooms allow dynamic seat scaling. Video live rooms have a fixed maximum of 9 seats.
 * - Minimum seat count for Audio Live is 7 seats (no upper limit).
 * - Host or room admin action.
 */
export async function updateRoomSeatsCount(req, res) {
  try {
    const { roomId } = req.params;
    const { totalSeats, total_seats, seatCount, seat_count } = req.body;
    const userId = req.user.id;

    const rooms = await query('SELECT id, room_id, host_id, total_seats, live_type, status FROM live_rooms WHERE room_id = ? AND status = "live"', [roomId]);
    if (rooms.length === 0) return res.status(404).json({ success: false, message: 'Live room not active or not found.' });
    const room = rooms[0];

    // Check permissions
    if (userId !== room.host_id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      const adminRows = await query('SELECT id FROM live_room_admins WHERE room_id = ? AND user_id = ?', [roomId, userId]);
      if (adminRows.length === 0) return res.status(403).json({ success: false, message: 'Only host or room admin can update seat count.' });
    }

    const isVideo = room.live_type === 'video';
    const currentSeats = parseInt(room.total_seats, 10) || (isVideo ? 12 : 7);
    const action = String(req.body.action || '').toLowerCase().trim();
    const stepVal = parseInt(req.body.step !== undefined ? req.body.step : (req.body.delta !== undefined ? req.body.delta : 1), 10) || 1;

    let newSeats;
    if (action === 'increase' || action === 'increment' || req.path.endsWith('/increase')) {
      newSeats = currentSeats + stepVal;
    } else if (action === 'decrease' || action === 'decrement' || req.path.endsWith('/decrease')) {
      newSeats = currentSeats - stepVal;
    } else {
      const rawSeats = total_seats !== undefined ? total_seats : (totalSeats !== undefined ? totalSeats : (seat_count !== undefined ? seat_count : seatCount));
      newSeats = parseInt(rawSeats, 10);
    }

    if (isVideo) {
      if (!newSeats || newSeats < 2 || newSeats > 12) {
        return res.status(400).json({
          success: false,
          message: 'Video Live rooms can have between 2 and 12 seats (maximum is 12 seats).',
        });
      }
    } else {
      if (!newSeats || newSeats < 7) {
        return res.status(400).json({
          success: false,
          message: 'Audio Live rooms must have at least 7 seats (minimum seat count is 7). Cannot decrease below 7.',
        });
      }
    }

    if (newSeats > currentSeats) {
      // Increase seats: seed empty seats
      for (let s = currentSeats + 1; s <= newSeats; s++) {
        await query(
          `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
           VALUES (?, ?, NULL, 0, 0, 0)
           ON DUPLICATE KEY UPDATE is_main_seat = 0`,
          [roomId, s]
        );
      }
    } else if (newSeats < currentSeats) {
      // Decrease seats: check if seats > newSeats are occupied
      const occupied = await query(
        'SELECT seat_number, user_id FROM live_room_seats WHERE room_id = ? AND seat_number > ? AND user_id IS NOT NULL',
        [roomId, newSeats]
      );
      if (occupied.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce seat count to ${newSeats} while seat(s) ${occupied.map((o) => '#' + o.seat_number).join(', ')} are currently occupied. Please remove users from those seats first.`,
        });
      }
      await query('DELETE FROM live_room_seats WHERE room_id = ? AND seat_number > ?', [roomId, newSeats]);
    }

    // Update live_rooms DB
    await query('UPDATE live_rooms SET total_seats = ? WHERE room_id = ?', [newSeats, roomId]);

    // Invalidate Redis caches
    await Promise.allSettled([
      cache.delByPattern('mobile:rooms:*'),
      cache.del(`mobile:room_details:${roomId}`),
      cache.delByPattern(`mobile:room:users:${roomId}*`),
    ]);

    if (req.io) {
      req.io.to(roomId).emit('room_seats_count_updated', {
        roomId,
        totalSeats: newSeats,
        previousSeats: currentSeats,
      });
    }

    const roomData = await buildRoomResponse(roomId, req.user);

    return res.json({
      success: true,
      message: `Live room seat count updated to ${newSeats} seats successfully.`,
      total_seats: newSeats,
      previous_seats: currentSeats,
      room: roomData,
    });
  } catch (err) {
    console.error('updateRoomSeatsCount error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update seat count.', error: err.message });
  }
}

/**
 * Mobile Step Increase Audio Live Room Seats (+1 or +step)
 * POST /api/mobile/live/rooms/:roomId/seats/increase
 */
export async function increaseRoomSeats(req, res) {
  req.body.action = 'increase';
  return updateRoomSeatsCount(req, res);
}

/**
 * Mobile Step Decrease Audio Live Room Seats (-1 or -step, min 7)
 * POST /api/mobile/live/rooms/:roomId/seats/decrease
 */
export async function decreaseRoomSeats(req, res) {
  req.body.action = 'decrease';
  return updateRoomSeatsCount(req, res);
}

/**
 * Mobile Lock / Unlock All Empty Seats in Room at once
 * POST /api/mobile/live/rooms/:roomId/seats/lock-all-empty
 * POST /api/mobile/live/rooms/:roomId/seats/empty/lock
 * POST /api/mobile/live/rooms/:roomId/seats/empty/unlock
 */
export async function lockAllEmptySeats(req, res) {
  try {
    const { roomId } = req.params;
    const callerId = req.user.id;
    const callerRole = req.user.role;

    const rooms = await query('SELECT id, room_id, host_id, total_seats, live_type FROM live_rooms WHERE room_id = ? AND status = "live"', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Active live room not found.' });
    }
    const room = rooms[0];

    // Check caller permission: Host, Room Admin, or Platform Admin
    let isAuthorized = (callerId === room.host_id) || (callerRole === 'admin') || (callerRole === 'superadmin');
    if (!isAuthorized) {
      const adminRows = await query('SELECT id FROM live_room_admins WHERE room_id = ? AND user_id = ?', [roomId, callerId]);
      isAuthorized = adminRows.length > 0;
    }
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Only host or room moderators can lock/unlock empty seats.' });
    }

    // Determine target lock state: 1 (lock) or 0 (unlock)
    let targetLockState;
    if (req.path.endsWith('/unlock') || req.body.action === 'unlock') {
      targetLockState = 0;
    } else if (req.body.action === 'lock') {
      targetLockState = 1;
    } else if (req.body.is_locked !== undefined) {
      targetLockState = req.body.is_locked ? 1 : 0;
    } else if (req.body.isLocked !== undefined) {
      targetLockState = req.body.isLocked ? 1 : 0;
    } else if (req.body.lock !== undefined) {
      targetLockState = req.body.lock ? 1 : 0;
    } else {
      // Toggle: if any empty seat is unlocked, lock all; otherwise unlock all
      const unlockedEmpty = await query(
        'SELECT COUNT(*) as count FROM live_room_seats WHERE room_id = ? AND seat_number > 1 AND user_id IS NULL AND is_locked = 0',
        [roomId]
      );
      targetLockState = (unlockedEmpty[0]?.count > 0) ? 1 : 0;
    }

    // Ensure all seats up to total_seats exist in DB
    const totalSeats = parseInt(room.total_seats, 10) || 7;
    for (let s = 2; s <= totalSeats; s++) {
      await query(
        `INSERT IGNORE INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted, is_locked)
         VALUES (?, ?, NULL, 0, 0, 0, ?)`,
        [roomId, s, targetLockState]
      );
    }

    // DB-First: Update all empty guest seats
    const result = await query(
      'UPDATE live_room_seats SET is_locked = ? WHERE room_id = ? AND seat_number > 1 AND user_id IS NULL',
      [targetLockState, roomId]
    );

    // Instant Redis Invalidation
    await Promise.allSettled([
      cache.del(`mobile:room_details:${roomId}`),
      cache.delByPattern(`mobile:room:users:${roomId}*`),
    ]);

    const roomData = await buildRoomResponse(roomId, req.user);

    if (req.io) {
      req.io.to(roomId).emit('empty_seats_lock_toggled', {
        roomId,
        isLocked: Boolean(targetLockState),
        affectedSeatsCount: result.affectedRows || 0,
        lockedBy: callerId,
      });
    }

    return res.json({
      success: true,
      message: targetLockState
        ? `All empty seats locked successfully (${result.affectedRows || 0} seats).`
        : `All empty seats unlocked successfully (${result.affectedRows || 0} seats).`,
      is_locked: Boolean(targetLockState),
      isLocked: Boolean(targetLockState),
      affected_seats: result.affectedRows || 0,
      room: roomData,
    });
  } catch (err) {
    console.error('lockAllEmptySeats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle lock on empty seats.', error: err.message });
  }
}

/**
 * Mobile Kick / Remove All Co-host Users from Seats at once
 * POST /api/mobile/live/rooms/:roomId/seats/kick-all
 * POST /api/mobile/live/rooms/:roomId/seats/clear-all
 * POST /api/mobile/live/rooms/:roomId/seats/eject-all
 */
export async function kickAllSeatUsers(req, res) {
  try {
    const { roomId } = req.params;
    const callerId = req.user.id;
    const callerRole = req.user.role;

    const rooms = await query('SELECT id, room_id, host_id, status FROM live_rooms WHERE room_id = ? AND status = "live"', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Active live room not found.' });
    }
    const room = rooms[0];

    // Caller must be host or platform admin
    const isAuthorized = (callerId === room.host_id) || (callerRole === 'admin') || (callerRole === 'superadmin');
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Only the room host or platform admin can kick all users from seats.' });
    }

    // Get all currently seated guest users (seat > 1 and user_id IS NOT NULL)
    const seatedGuests = await query(
      'SELECT seat_number, user_id FROM live_room_seats WHERE room_id = ? AND seat_number > 1 AND user_id IS NOT NULL',
      [roomId]
    );

    if (seatedGuests.length === 0) {
      const roomData = await buildRoomResponse(roomId, req.user);
      return res.json({
        success: true,
        message: 'No guest users are currently seated.',
        removed_count: 0,
        removed_users: [],
        room: roomData,
      });
    }

    // DB-First: clear all guest seats
    await query(
      'UPDATE live_room_seats SET user_id = NULL, is_camera_on = 0, is_muted = 0 WHERE room_id = ? AND seat_number > 1',
      [roomId]
    );

    // Instant Redis Invalidation
    await Promise.allSettled([
      cache.del(`mobile:room_details:${roomId}`),
      cache.delByPattern(`mobile:room:users:${roomId}*`),
    ]);

    const roomData = await buildRoomResponse(roomId, req.user);

    // Socket.IO notifications
    if (req.io) {
      req.io.to(roomId).emit('all_seats_cleared', {
        roomId,
        kickedBy: callerId,
        kickedUsers: seatedGuests.map((g) => ({ userId: g.user_id, seatNumber: g.seat_number })),
        message: 'All co-host users were removed from seats by the host.',
      });

      for (const g of seatedGuests) {
        req.io.to(roomId).emit('seat_updated', {
          roomId,
          seatNumber: g.seat_number,
          action: 'leave',
          userId: g.user_id,
        });
      }
    }

    return res.json({
      success: true,
      message: `Successfully removed ${seatedGuests.length} user(s) from co-host seats.`,
      removed_count: seatedGuests.length,
      removed_users: seatedGuests.map((g) => ({ seat_number: g.seat_number, user_id: g.user_id })),
      room: roomData,
    });
  } catch (err) {
    console.error('kickAllSeatUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to kick all seated users.', error: err.message });
  }
}

/**
 * Mobile Mute / Unmute All Seated Users at once
 * POST /api/mobile/live/rooms/:roomId/seats/mute-all
 * POST /api/mobile/live/rooms/:roomId/seats/unmute-all
 * POST /api/mobile/live/rooms/:roomId/seats/all/mute
 * POST /api/mobile/live/rooms/:roomId/seats/all/unmute
 */
export async function muteAllSeats(req, res) {
  try {
    const { roomId } = req.params;
    const callerId = req.user.id;
    const callerRole = req.user.role;

    const rooms = await query('SELECT id, room_id, host_id FROM live_rooms WHERE room_id = ? AND status = "live"', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Active live room not found.' });
    }
    const room = rooms[0];

    // Check caller permission: Host, Room Admin, or Platform Admin
    let isAuthorized = (callerId === room.host_id) || (callerRole === 'admin') || (callerRole === 'superadmin');
    if (!isAuthorized) {
      const adminRows = await query('SELECT id FROM live_room_admins WHERE room_id = ? AND user_id = ?', [roomId, callerId]);
      isAuthorized = adminRows.length > 0;
    }
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Only host or room moderators can mute/unmute all seats.' });
    }

    // Determine target mute state
    let targetMuteState;
    if (req.path.endsWith('/unmute') || req.path.endsWith('/unmute-all') || req.body.action === 'unmute') {
      targetMuteState = 0;
    } else if (req.body.action === 'mute') {
      targetMuteState = 1;
    } else if (req.body.is_muted !== undefined) {
      targetMuteState = req.body.is_muted ? 1 : 0;
    } else if (req.body.isMuted !== undefined) {
      targetMuteState = req.body.isMuted ? 1 : 0;
    } else if (req.body.mute !== undefined) {
      targetMuteState = req.body.mute ? 1 : 0;
    } else {
      // Default for mute-all is 1 (mute)
      targetMuteState = 1;
    }

    const includeHost = req.body.include_host === true || req.body.includeHost === true;

    // DB-First: update all seated users
    const whereSql = includeHost
      ? 'WHERE room_id = ? AND user_id IS NOT NULL'
      : 'WHERE room_id = ? AND seat_number > 1 AND user_id IS NOT NULL';

    const result = await query(
      `UPDATE live_room_seats SET is_muted = ? ${whereSql}`,
      [targetMuteState, roomId]
    );

    // Instant Redis Invalidation
    await cache.del(`mobile:room_details:${roomId}`);

    const roomData = await buildRoomResponse(roomId, req.user);

    if (req.io) {
      req.io.to(roomId).emit('all_seats_muted', {
        roomId,
        isMuted: Boolean(targetMuteState),
        includeHost,
        mutedBy: callerId,
      });
    }

    return res.json({
      success: true,
      message: targetMuteState
        ? `All seated users muted successfully (${result.affectedRows || 0} user(s)).`
        : `All seated users unmuted successfully (${result.affectedRows || 0} user(s)).`,
      is_muted: Boolean(targetMuteState),
      isMuted: Boolean(targetMuteState),
      affected_count: result.affectedRows || 0,
      room: roomData,
    });
  } catch (err) {
    console.error('muteAllSeats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mute/unmute all seats.', error: err.message });
  }
}

/**
 * Mobile Remove User from Seat (Host / Admin action)
 * POST /api/mobile/live/rooms/:roomId/seats/remove
 * POST /api/mobile/live/rooms/:roomId/seats/kick
 * 
 * Ejects a user from a co-host seat back to regular audience in the room.
 * Supports finding by seatNumber OR userId.
 */
export async function removeSeatUser(req, res) {
  try {
    const { roomId } = req.params;
    const callerId = req.user.id;
    const callerRole = req.user.role;

    const seatNumberParam = req.body?.seatNumber ?? req.body?.seat_number ?? req.params?.seatNumber;
    const userIdParam = req.body?.userId ?? req.body?.user_id ?? req.params?.userId;

    const rooms = await query('SELECT id, room_id, host_id, status, total_seats FROM live_rooms WHERE room_id = ? AND status = "live"', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Live room is not active or does not exist.' });
    }
    const room = rooms[0];

    // Check caller permission: Host, Room Admin, or Platform Admin
    let isAuthorized = (callerId === room.host_id) || (callerRole === 'admin') || (callerRole === 'superadmin');
    if (!isAuthorized) {
      const adminRows = await query('SELECT id FROM live_room_admins WHERE room_id = ? AND user_id = ?', [roomId, callerId]);
      isAuthorized = adminRows.length > 0;
    }

    // Locate target seat
    let targetSeat = null;
    if (seatNumberParam !== undefined && seatNumberParam !== null && seatNumberParam !== '') {
      const num = parseInt(seatNumberParam, 10);
      const rows = await query('SELECT * FROM live_room_seats WHERE room_id = ? AND seat_number = ?', [roomId, num]);
      if (rows.length > 0) targetSeat = rows[0];
    } else if (userIdParam !== undefined && userIdParam !== null && userIdParam !== '') {
      const uid = parseInt(userIdParam, 10);
      const rows = await query('SELECT * FROM live_room_seats WHERE room_id = ? AND user_id = ?', [roomId, uid]);
      if (rows.length > 0) targetSeat = rows[0];
    }

    if (!targetSeat) {
      return res.status(404).json({ success: false, message: 'Specified seat or seated user not found in this room.' });
    }

    if (!targetSeat.user_id) {
      return res.status(400).json({ success: false, message: `Seat ${targetSeat.seat_number} is already empty.` });
    }

    const targetUserId = targetSeat.user_id;

    // A user can always remove themselves from their own seat
    if (callerId !== targetUserId && !isAuthorized) {
      return res.status(403).json({ success: false, message: 'You are not authorized to remove users from seats in this room.' });
    }

    // Cannot remove the host from seat 1 / main seat
    if (targetUserId === room.host_id && targetSeat.seat_number === 1) {
      return res.status(400).json({ success: false, message: 'Cannot remove the room host from the main seat.' });
    }

    // Check VIP immunity if caller is a room moderator (not the host or platform admin)
    if (callerId !== room.host_id && callerRole !== 'admin' && callerRole !== 'superadmin' && callerId !== targetUserId) {
      const [vipSub] = await query(`
        SELECT pc.cant_be_removed, pc.name as cat_name 
        FROM user_package_subscriptions ups
        JOIN package_categories pc ON ups.category_id = pc.id
        WHERE ups.user_id = ? AND ups.status = 'active' AND ups.expires_at > NOW()
        ORDER BY pc.display_order ASC LIMIT 1
      `, [targetUserId]);
      if (vipSub && vipSub.cant_be_removed) {
        return res.status(403).json({
          success: false,
          message: `User is a protected ${vipSub.cat_name} member and cannot be removed from seat by room moderators.`,
        });
      }
    }

    // Clear seat and automatically rearrange remaining seats in DB (DB-First)
    await handleUserSeatDeparture(roomId, targetUserId, req.io);

    if (req.io) {
      req.io.to(roomId).emit('seat_user_removed', {
        roomId,
        seatNumber: targetSeat.seat_number,
        userId: targetUserId,
        removedBy: callerId,
      });
    }

    const roomData = await buildRoomResponse(roomId, req.user);

    return res.json({
      success: true,
      message: `User #${targetUserId} removed from seat ${targetSeat.seat_number} successfully.`,
      seat_number: targetSeat.seat_number,
      removed_user_id: targetUserId,
      room: roomData,
    });
  } catch (err) {
    console.error('removeSeatUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove user from seat.', error: err.message });
  }
}

/**
 * Mobile Kick User from Room (Eject completely from live stream)
 * POST /api/mobile/live/rooms/:roomId/kick
 * POST /api/mobile/live/rooms/:roomId/kick/:userId
 * 
 * Removes user from seats, audience viewers list, seat requests, and broadcasts user_kicked.
 */
export async function kickUserFromRoom(req, res) {
  try {
    const { roomId } = req.params;
    const callerId = req.user.id;
    const callerRole = req.user.role;

    const rawUserId = req.params?.userId ?? req.body?.userId ?? req.body?.user_id;
    if (!rawUserId) {
      return res.status(400).json({ success: false, message: 'User ID to kick is required.' });
    }
    const targetUserId = parseInt(String(rawUserId).replace(/^#/, ''), 10);
    const reason = req.body?.reason || 'Removed from room by host/moderator';

    const rooms = await query('SELECT id, room_id, host_id, status FROM live_rooms WHERE room_id = ? AND status = "live"', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Live room is not active or does not exist.' });
    }
    const room = rooms[0];

    // Check caller permission: Host, Room Admin, or Platform Admin
    let isAuthorized = (callerId === room.host_id) || (callerRole === 'admin') || (callerRole === 'superadmin');
    if (!isAuthorized) {
      const adminRows = await query('SELECT id FROM live_room_admins WHERE room_id = ? AND user_id = ?', [roomId, callerId]);
      isAuthorized = adminRows.length > 0;
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Only room host or moderators can kick users from the room.' });
    }

    if (targetUserId === room.host_id) {
      return res.status(400).json({ success: false, message: 'Cannot kick the room host.' });
    }

    if (targetUserId === callerId) {
      return res.status(400).json({ success: false, message: 'You cannot kick yourself. Use leave room instead.' });
    }

    // Check VIP Immunity against kick
    const [vipSub] = await query(`
      SELECT pc.cant_be_removed, pc.name as cat_name 
      FROM user_package_subscriptions ups
      JOIN package_categories pc ON ups.category_id = pc.id
      WHERE ups.user_id = ? AND ups.status = 'active' AND ups.expires_at > NOW()
      ORDER BY pc.display_order ASC LIMIT 1
    `, [targetUserId]);

    if (vipSub && vipSub.cant_be_removed) {
      return res.status(403).json({
        success: false,
        message: `User is a protected ${vipSub.cat_name} member and cannot be kicked from rooms.`,
      });
    }

    // 1. Handle seat departure & automatic seat rearrangement
    await handleUserSeatDeparture(roomId, targetUserId, req.io);

    // 2. Remove from seat requests
    await query('DELETE FROM live_room_seat_requests WHERE room_id = ? AND user_id = ?', [roomId, targetUserId]);

    // 3. Remove from room admins if applicable
    await query('DELETE FROM live_room_admins WHERE room_id = ? AND user_id = ?', [roomId, targetUserId]);

    // 4. Remove from live_room_viewers
    await query('DELETE FROM live_room_viewers WHERE room_id = ? AND user_id = ?', [roomId, targetUserId]);

    // 5. Update viewer count in live_rooms
    await query(
      `UPDATE live_rooms SET viewer_count = (SELECT COUNT(*) FROM live_room_viewers WHERE room_id = ?) WHERE room_id = ?`,
      [roomId, roomId]
    );

    // 6. Instant Redis Invalidation
    await Promise.allSettled([
      cache.delByPattern('mobile:rooms:*'),
      cache.del(`mobile:room_details:${roomId}`),
      cache.delByPattern(`mobile:room:users:${roomId}*`),
      cache.del(`mobile:live:seat_requests:${roomId}`),
      cache.del(`mobile:live:room_admins:${roomId}`),
    ]);

    // 7. Socket broadcast user_kicked and viewer_left
    if (req.io) {
      req.io.to(roomId).emit('user_kicked', {
        roomId,
        userId: targetUserId,
        kickedUserId: targetUserId,
        kicked_user_id: targetUserId,
        kickedBy: callerId,
        reason,
      });
      req.io.to(roomId).emit('viewer_left', {
        roomId,
        userId: targetUserId,
      });
    }

    return res.json({
      success: true,
      message: `User #${targetUserId} has been kicked from the room successfully.`,
      kicked_user_id: targetUserId,
      reason,
    });
  } catch (err) {
    console.error('kickUserFromRoom error:', err);
    return res.status(500).json({ success: false, message: 'Failed to kick user from room.', error: err.message });
  }
}

/**
 * Mobile Promote / Swap Co-host Seat to Main Seat
 * POST /api/mobile/live/rooms/:roomId/seats/make-main
 * POST /api/mobile/live/rooms/:roomId/seats/swap-main
 * 
 * Promotes a co-host from guest seat (e.g. Seat 2, 3...) to the Main Seat (Seat 1).
 * Swaps occupants so the target user is placed in Seat 1 (Main Stage), and previous occupant is placed in the guest seat.
 */
export async function promoteToMainSeat(req, res) {
  try {
    const { roomId } = req.params;
    const callerId = req.user.id;
    const callerRole = req.user.role;

    const seatNumberParam = req.body?.seatNumber ?? req.body?.seat_number ?? req.params?.seatNumber;
    const userIdParam = req.body?.userId ?? req.body?.user_id;

    const isNum = /^\d+$/.test(String(roomId).trim());
    const rooms = await query(
      'SELECT id, room_id, host_id, status, total_seats, live_type FROM live_rooms WHERE (room_id = ? OR id = ?) AND status = "live"',
      [String(roomId), isNum ? Number(roomId) : -1]
    );
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Live room is not active or does not exist.' });
    }
    const room = rooms[0];
    const canonicalRoomId = room.room_id;
    const numericRoomId = room.id;

    // Promote to Main Seat is strictly for Video Live rooms (in Audio Live only Switch Seat is supported)
    if (room.live_type === 'audio') {
      return res.status(400).json({
        success: false,
        message: 'Promote to main seat is only available for Video Live rooms. In Audio Live, please use Switch Seat.',
      });
    }

    // Check caller permission: Host or Platform Admin
    let isAuthorized = (callerId === room.host_id) || (callerRole === 'admin') || (callerRole === 'superadmin');
    if (!isAuthorized) {
      const adminRows = await query(
        'SELECT id FROM live_room_admins WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
        [canonicalRoomId, String(numericRoomId), callerId]
      );
      isAuthorized = adminRows.length > 0;
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Only the room host or moderators can promote a seat to the main seat.' });
    }

    // Locate target guest seat
    let targetSeat = null;
    if (seatNumberParam !== undefined && seatNumberParam !== null && seatNumberParam !== '') {
      const num = parseInt(seatNumberParam, 10);
      const rows = await query(
        'SELECT * FROM live_room_seats WHERE (room_id = ? OR room_id = ?) AND seat_number = ?',
        [canonicalRoomId, String(numericRoomId), num]
      );
      if (rows.length > 0) targetSeat = rows[0];
    } else if (userIdParam !== undefined && userIdParam !== null && userIdParam !== '') {
      const uid = parseInt(userIdParam, 10);
      const rows = await query(
        'SELECT * FROM live_room_seats WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
        [canonicalRoomId, String(numericRoomId), uid]
      );
      if (rows.length > 0) targetSeat = rows[0];
    }

    if (!targetSeat) {
      return res.status(404).json({ success: false, message: 'Target seat not found. Please provide seatNumber or userId.' });
    }

    const targetSeatNum = targetSeat.seat_number;
    if (targetSeatNum === 1) {
      return res.status(400).json({ success: false, message: 'Seat 1 is already the main seat.' });
    }

    if (!targetSeat.user_id) {
      return res.status(400).json({ success: false, message: `Seat ${targetSeatNum} is empty. Only occupied seats can be promoted to the main seat.` });
    }

    const targetUserId = targetSeat.user_id;
    const targetCamera = targetSeat.is_camera_on;
    const targetMuted = targetSeat.is_muted;

    // 1. Fetch current occupant of Seat 1 (Main Seat)
    const seat1Rows = await query(
      'SELECT * FROM live_room_seats WHERE (room_id = ? OR room_id = ?) AND seat_number = 1',
      [canonicalRoomId, String(numericRoomId)]
    );
    const seat1 = seat1Rows.length > 0 ? seat1Rows[0] : null;
    const currentMainUserId = seat1 && seat1.user_id ? seat1.user_id : room.host_id;
    const currentMainCamera = seat1 ? seat1.is_camera_on : 1;
    const currentMainMuted = seat1 ? seat1.is_muted : 0;

    // 2. Fetch where the Host is currently sitting
    const hostSeatRows = await query(
      'SELECT * FROM live_room_seats WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
      [canonicalRoomId, String(numericRoomId), room.host_id]
    );
    const hostSeat = hostSeatRows.length > 0 ? hostSeatRows[0] : null;
    const hostCurrentSeat = hostSeat ? hostSeat.seat_number : 1;
    const hostCamera = hostSeat ? hostSeat.is_camera_on : 1;
    const hostMuted = hostSeat ? hostSeat.is_muted : 0;

    // Only host or platform admin can promote to main seat
    if (callerId !== room.host_id && callerRole !== 'admin' && callerRole !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only the room host can promote to main seat.' });
    }

    // 3-WAY ROTATION / SWAP:
    // If current occupant of Seat 1 was the host:
    // Simply swap: Target user -> Seat 1, Host -> targetSeatNum
    if (currentMainUserId === room.host_id) {
      await query(
        `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
         VALUES (?, 1, ?, 1, ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), is_main_seat = 1, is_camera_on = VALUES(is_camera_on), is_muted = VALUES(is_muted)`,
        [canonicalRoomId, targetUserId, targetCamera, targetMuted]
      );
      await query(
        `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
         VALUES (?, ?, ?, 0, ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), is_main_seat = 0, is_camera_on = VALUES(is_camera_on), is_muted = VALUES(is_muted)`,
        [canonicalRoomId, targetSeatNum, room.host_id, hostCamera, hostMuted]
      );
      // Clean up any stray duplicate seats for host or target user in this room
      await query(
        `UPDATE live_room_seats SET user_id = NULL, is_camera_on = 0, is_muted = 0 
         WHERE (room_id = ? OR room_id = ?) 
           AND ((user_id = ? AND seat_number != 1) OR (user_id = ? AND seat_number != ?))`,
        [canonicalRoomId, String(numericRoomId), targetUserId, room.host_id, targetSeatNum]
      );
    } else {
      // 3-way rotation:
      // Target user (targetUserId) -> Seat 1
      // Previous main seat user (currentMainUserId) -> hostCurrentSeat (or targetSeatNum)
      // Host (room.host_id) -> targetSeatNum
      const destinationForPreviousMain = (hostCurrentSeat > 1 && hostCurrentSeat !== targetSeatNum) ? hostCurrentSeat : targetSeatNum;
      await query(
        `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
         VALUES (?, 1, ?, 1, ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), is_main_seat = 1, is_camera_on = VALUES(is_camera_on), is_muted = VALUES(is_muted)`,
        [canonicalRoomId, targetUserId, targetCamera, targetMuted]
      );
      await query(
        `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
         VALUES (?, ?, ?, 0, ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), is_main_seat = 0, is_camera_on = VALUES(is_camera_on), is_muted = VALUES(is_muted)`,
        [canonicalRoomId, destinationForPreviousMain, currentMainUserId, currentMainCamera, currentMainMuted]
      );
      if (destinationForPreviousMain !== targetSeatNum) {
        await query(
          `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
           VALUES (?, ?, ?, 0, ?, ?)
           ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), is_main_seat = 0, is_camera_on = VALUES(is_camera_on), is_muted = VALUES(is_muted)`,
          [canonicalRoomId, targetSeatNum, room.host_id, hostCamera, hostMuted]
        );
      }
      // Clean up any stray duplicate seats in this room
      await query(
        `UPDATE live_room_seats SET user_id = NULL, is_camera_on = 0, is_muted = 0 
         WHERE (room_id = ? OR room_id = ?) 
           AND seat_number NOT IN (1, ?, ?)
           AND user_id IN (?, ?, ?)`,
        [canonicalRoomId, String(numericRoomId), targetSeatNum, destinationForPreviousMain, targetUserId, room.host_id, currentMainUserId]
      );
    }

    // Instant Redis Invalidation
    await Promise.allSettled([
      cache.del(`mobile:room_details:${canonicalRoomId}`),
      numericRoomId ? cache.del(`mobile:room_details:${numericRoomId}`) : null,
      cache.delByPattern(`mobile:room:users:${canonicalRoomId}*`),
    ]);

    const roomData = await buildRoomResponse(canonicalRoomId, req.user);

    const prevMainUserId = currentMainUserId;

    // Socket Broadcast to all viewers and hosts in the room
    if (req.io) {
      const spotlightPayload = {
        roomId: canonicalRoomId,
        numericRoomId,
        targetSeat: targetSeatNum,
        spotlightSeat: 1,
        spotlight_seat_number: 1,
        newMainUserId: targetUserId,
        spotlightUserId: targetUserId,
        spotlight_user_id: targetUserId,
        spotlight_user: roomData.spotlight_user || null,
        previousMainUserId: prevMainUserId,
        promotedBy: callerId,
        timestamp: new Date().toISOString(),
        seats: roomData.seats,
        rawSeats: roomData.seats,
      };

      const seatUpdatedPayload = {
        roomId: canonicalRoomId,
        numericRoomId,
        action: 'swap_main',
        targetSeat: targetSeatNum,
        newMainUserId: targetUserId,
        previousMainUserId: prevMainUserId,
        spotlight_seat_number: 1,
        spotlight_user_id: targetUserId,
        seats: roomData.seats,
        rawSeats: roomData.seats,
      };

      const channels = new Set([canonicalRoomId, String(numericRoomId)].filter(Boolean));
      for (const ch of channels) {
        req.io.to(ch).emit('main_seat_swapped', spotlightPayload);
        req.io.to(ch).emit('spotlight_updated', spotlightPayload);
        req.io.to(ch).emit('spotlight_changed', spotlightPayload);
        req.io.to(ch).emit('seat_updated', seatUpdatedPayload);
        req.io.to(ch).emit('seats_updated', {
          roomId: canonicalRoomId,
          numericRoomId,
          seats: roomData.seats,
          rawSeats: roomData.seats,
          spotlight_seat_number: 1,
          spotlight_user_id: targetUserId,
          spotlight_user: roomData.spotlight_user || null,
        });
        req.io.to(ch).emit('seats-sync', {
          roomId: canonicalRoomId,
          numericRoomId,
          seats: roomData.seats,
          rawSeats: roomData.seats,
        });
      }
    }

    return res.json({
      success: true,
      message: `Seat ${targetSeatNum} promoted to main spotlight successfully.`,
      new_main_user_id: targetUserId,
      spotlight_user_id: targetUserId,
      spotlight_seat_number: 1,
      previous_main_user_id: prevMainUserId,
      swapped_seat_number: targetSeatNum,
      room: roomData,
    });
  } catch (err) {
    console.error('promoteToMainSeat error:', err);
    return res.status(500).json({ success: false, message: 'Failed to promote seat to main seat.', error: err.message });
  }
}

/**
 * Mobile Update / Change Live Room Background Thumbnail
 * PUT /api/mobile/live/rooms/:roomId/background
 * POST /api/mobile/live/rooms/:roomId/background
 * PUT /api/mobile/live/rooms/:roomId/thumbnail
 * POST /api/mobile/live/rooms/:roomId/thumbnail
 * 
 * Supports:
 * - JSON { thumbnail_url: "..." } or { background_image: "..." } or { thumbnail_id: 123 }
 * - Passing null / empty string to clear the thumbnail
 * - Multipart/form-data image file upload
 * Updates MySQL SSOT first, invalidates Redis caches, emits real-time Socket.IO events
 * to all users currently in the room, and returns the updated room state.
 */
export async function updateRoomBackground(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const isNum = /^\d+$/.test(String(roomId).trim());
    const rooms = await query(
      'SELECT id, room_id, host_id, live_type, status, background_image FROM live_rooms WHERE (room_id = ? OR id = ?) AND status = "live"',
      [String(roomId), isNum ? Number(roomId) : -1]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Live room not found or is not active.' });
    }

    const room = rooms[0];
    const canonicalRoomId = room.room_id;

    // Check authorization: Room Host, Platform Admin/Superadmin, or Room Moderator/Admin
    let isAuthorized = (userId === room.host_id) || (userRole === 'admin') || (userRole === 'superadmin');
    if (!isAuthorized) {
      const adminRows = await query('SELECT id FROM live_room_admins WHERE room_id = ? AND user_id = ?', [canonicalRoomId, userId]);
      isAuthorized = adminRows.length > 0;
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Only the room host or moderators can change the room background thumbnail.' });
    }

    let newThumbnailUrl = null;

    // 1. Check if a file was uploaded
    if (req.file) {
      newThumbnailUrl = `/uploads/rooms/${req.file.filename}`;
    } else if (req.uploadedMedia && req.uploadedMedia.length > 0) {
      newThumbnailUrl = req.uploadedMedia[0].media_url;
    } else if (req.body) {
      const {
        background_image,
        backgroundImage,
        thumbnail_url,
        thumbnailUrl,
        image_url,
        imageUrl,
        thumbnail_id,
        thumbnailId,
        thumbnail,
      } = req.body;

      const thumbId = thumbnail_id || thumbnailId;
      if (thumbId) {
        // Resolve from special_thumbnails
        const [thumbRow] = await query('SELECT image_url FROM special_thumbnails WHERE id = ?', [thumbId]);
        if (thumbRow && thumbRow.image_url) {
          newThumbnailUrl = thumbRow.image_url;
        }
      } else {
        const rawUrl = background_image ?? backgroundImage ?? thumbnail_url ?? thumbnailUrl ?? image_url ?? imageUrl ?? thumbnail;
        if (rawUrl !== undefined && rawUrl !== null) {
          const trimmed = String(rawUrl).trim();
          if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'none') {
            newThumbnailUrl = null; // explicit clear
          } else {
            newThumbnailUrl = trimmed;
          }
        }
      }
    }

    // 2. MySQL SSOT Update
    await query(
      'UPDATE live_rooms SET background_image = ? WHERE id = ? OR room_id = ?',
      [newThumbnailUrl, room.id, canonicalRoomId]
    );

    // 3. Instant Redis Cache Invalidation
    await Promise.allSettled([
      cache.delByPattern('mobile:rooms:*'),
      cache.del(`mobile:room_details:${roomId}`),
      cache.del(`mobile:room_details:${canonicalRoomId}`),
      cache.del(`mobile:room_details:${room.id}`),
      cache.del(`room:${canonicalRoomId}`),
      cache.del(`room:${room.id}`),
    ]);

    // 4. Real-Time Socket.IO Broadcast to all active users in the room
    if (req.io) {
      const socketPayload = {
        roomId: canonicalRoomId,
        background_image_url: newThumbnailUrl,
        room_background_url: newThumbnailUrl,
        thumbnail_url: newThumbnailUrl,
        background_thumbnail: newThumbnailUrl,
        updated_by: userId,
      };

      req.io.to(canonicalRoomId).emit('room_background_updated', socketPayload);
      req.io.to(canonicalRoomId).emit('room_thumbnail_updated', socketPayload);
      req.io.to(canonicalRoomId).emit('room_updated', {
        roomId: canonicalRoomId,
        background_image_url: newThumbnailUrl,
        thumbnail_url: newThumbnailUrl,
      });
    }

    // 5. Build fresh room response for late-join and state synchronization
    const updatedRoomData = await buildRoomResponse(canonicalRoomId, req.user);

    return res.status(200).json({
      success: true,
      message: newThumbnailUrl
        ? 'Room background thumbnail updated successfully.'
        : 'Room background thumbnail cleared successfully.',
      background_image_url: newThumbnailUrl,
      thumbnail_url: newThumbnailUrl,
      room: updatedRoomData,
      data: {
        room_id: canonicalRoomId,
        background_image_url: newThumbnailUrl,
        thumbnail_url: newThumbnailUrl,
        room: updatedRoomData,
      },
    });
  } catch (err) {
    console.error('updateRoomBackground error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update room background thumbnail.',
      error: err.message,
    });
  }
}

/**
 * Format total seconds into human-readable "00h 00m 00s" or "00m 00s" format.
 */
function formatHMSTime(totalSeconds) {
  const sec = Math.max(0, parseInt(totalSeconds || 0, 10));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

/**
 * GET /api/mobile/live/history
 * GET /api/mobile/live/my-history
 * GET /api/mobile/live/user-activity
 * 
 * Global Live Streaming Daily History & Breakdown for ALL users.
 * Accessible to any authenticated user (moderator, host, agency, reseller, normal user, etc.).
 * Returns:
 * - Daily list showing: date, total live minutes, audio live minutes/duration, video live minutes/duration,
 *   number of live sessions started per day, and coins received/earned on that day.
 * - Summary metrics: total active streaming days, total live minutes, audio vs video duration, total sessions, total coins received.
 * 
 * Query filters:
 * - month: YYYY-MM (default: current month e.g. '2026-10') or 'all'
 * - userId: optional target user ID (allowed for admin/superadmin/moderator; regular users see their own)
 * 
 * Redis Cache-Aside: 'user:live_activity:{targetUserId}:{month}' (TTL 60s).
 */
export async function getUserLiveHistory(req, res) {
  try {
    const caller = req.user;
    if (!caller) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    let targetUserId = caller.id;
    if (req.query.userId || req.query.hostId) {
      const explicitId = parseInt(req.query.userId || req.query.hostId, 10);
      if (!isNaN(explicitId)) {
        if (
          caller.role === 'admin' ||
          caller.role === 'superadmin' ||
          caller.role === 'moderator' ||
          caller.role === 'agency' ||
          explicitId === caller.id
        ) {
          targetUserId = explicitId;
        }
      }
    }

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const rawMonth = (req.query.month || currentMonthStr).trim().toLowerCase();
    const isAllMonths = rawMonth === 'all' || rawMonth === 'lifetime';

    if (!isAllMonths && !/^\d{4}-\d{2}$/.test(rawMonth)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Please use YYYY-MM (e.g. 2026-10) or "all".',
      });
    }

    const cacheKey = `user:live_activity:${targetUserId}:${rawMonth}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      // 1. Fetch user profile
      const [user] = await query(
        `SELECT id, full_name, email, avatar_url, role, host_type, coins, diamonds, level, created_at 
         FROM users 
         WHERE id = ?`,
        [targetUserId]
      );

      if (!user) {
        return null;
      }

      // 2. Fetch live streaming sessions grouped by date
      let streamSql = `
        SELECT 
          DATE(started_at) AS stream_date,
          COUNT(id) AS sessions_count,
          COALESCE(SUM(TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW()))), 0) AS total_seconds,
          COALESCE(SUM(CASE WHEN live_type = 'video' THEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) ELSE 0 END), 0) AS video_seconds,
          COALESCE(SUM(CASE WHEN live_type = 'audio' THEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) ELSE 0 END), 0) AS audio_seconds
        FROM live_rooms
        WHERE host_id = ?
      `;
      const streamParams = [targetUserId];

      if (!isAllMonths) {
        streamSql += ` AND DATE_FORMAT(started_at, '%Y-%m') = ?`;
        streamParams.push(rawMonth);
      }

      streamSql += ` GROUP BY DATE(started_at) ORDER BY stream_date DESC`;

      const streamRows = await query(streamSql, streamParams);

      // 3. Fetch gift transactions received grouped by date
      let giftSql = `
        SELECT 
          DATE(created_at) AS gift_date,
          COALESCE(SUM(coin_amount), 0) AS daily_coins,
          COALESCE(SUM(diamond_amount), 0) AS daily_diamonds,
          COUNT(id) AS gifts_count
        FROM gift_transactions
        WHERE receiver_id = ?
      `;
      const giftParams = [targetUserId];

      if (!isAllMonths) {
        giftSql += ` AND DATE_FORMAT(created_at, '%Y-%m') = ?`;
        giftParams.push(rawMonth);
      }

      giftSql += ` GROUP BY DATE(created_at)`;

      const giftRows = await query(giftSql, giftParams);

      const giftMap = {};
      for (const g of giftRows || []) {
        const dStr = g.gift_date instanceof Date ? g.gift_date.toISOString().slice(0, 10) : String(g.gift_date);
        giftMap[dStr] = {
          coins: parseInt(g.daily_coins || 0, 10),
          diamonds: parseInt(g.daily_diamonds || 0, 10),
          count: parseInt(g.gifts_count || 0, 10),
        };
      }

      const streamMap = {};
      const datesSet = new Set();

      for (const s of streamRows || []) {
        const dStr = s.stream_date instanceof Date ? s.stream_date.toISOString().slice(0, 10) : String(s.stream_date);
        datesSet.add(dStr);
        streamMap[dStr] = s;
      }

      for (const dStr of Object.keys(giftMap)) {
        datesSet.add(dStr);
      }

      const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));

      let totalSec = 0;
      let totalVideoSec = 0;
      let totalAudioSec = 0;
      let totalSessions = 0;
      let totalCoinsRecv = 0;
      let totalDiamondsRecv = 0;
      let totalGiftsRecv = 0;

      const dailyBreakdown = sortedDates.map((dateStr) => {
        const s = streamMap[dateStr] || {};
        const g = giftMap[dateStr] || { coins: 0, diamonds: 0, count: 0 };

        const sec = parseInt(s.total_seconds || 0, 10);
        const vSec = parseInt(s.video_seconds || 0, 10);
        const aSec = parseInt(s.audio_seconds || 0, 10);
        const sessCount = parseInt(s.sessions_count || 0, 10);
        const coins = g.coins || 0;
        const diamonds = g.diamonds || 0;
        const gCount = g.count || 0;

        totalSec += sec;
        totalVideoSec += vSec;
        totalAudioSec += aSec;
        totalSessions += sessCount;
        totalCoinsRecv += coins;
        totalDiamondsRecv += diamonds;
        totalGiftsRecv += gCount;

        const liveMinutes = Math.round(sec / 60);
        const videoMinutes = Math.round(vSec / 60);
        const audioMinutes = Math.round(aSec / 60);

        return {
          date: dateStr,
          total_live_minutes: liveMinutes,
          total_live_seconds: sec,
          formatted_total_duration: formatHMSTime(sec),
          video_live_minutes: videoMinutes,
          video_live_seconds: vSec,
          formatted_video_duration: formatHMSTime(vSec),
          audio_live_minutes: audioMinutes,
          audio_live_seconds: aSec,
          formatted_audio_duration: formatHMSTime(aSec),
          sessions_count: sessCount,
          coins_received: coins,
          diamonds_received: diamonds,
          gifts_count: gCount,
        };
      });

      const totalMinutes = Math.round(totalSec / 60);
      const totalVideoMinutes = Math.round(totalVideoSec / 60);
      const totalAudioMinutes = Math.round(totalAudioSec / 60);

      return {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          avatar_url: user.avatar_url,
          role: user.role,
          host_type: user.host_type,
          coins: user.coins,
          diamonds: user.diamonds,
          level: user.level || 1,
        },
        period: {
          month: rawMonth,
          is_all_time: isAllMonths,
        },
        summary: {
          total_active_days: sortedDates.length,
          total_live_minutes: totalMinutes,
          total_live_seconds: totalSec,
          formatted_total_duration: formatHMSTime(totalSec),
          video_live_minutes: totalVideoMinutes,
          video_live_seconds: totalVideoSec,
          formatted_video_duration: formatHMSTime(totalVideoSec),
          audio_live_minutes: totalAudioMinutes,
          audio_live_seconds: totalAudioSec,
          formatted_audio_duration: formatHMSTime(totalAudioSec),
          total_sessions_count: totalSessions,
          total_coins_received: totalCoinsRecv,
          total_diamonds_received: totalDiamondsRecv,
          total_gifts_received: totalGiftsRecv,
        },
        daily_breakdown: dailyBreakdown,
      };
    });

    if (!data) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: 'Daily live streaming and earnings history retrieved successfully.',
      data,
    });
  } catch (err) {
    console.error('getUserLiveHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve live streaming history.', error: err.message });
  }
}

/**
 * POST /api/mobile/live/rooms/:roomId/messages
 * Send a live chat message in the live room.
 * Commits to MySQL SSOT first, invalidates Redis caches, and broadcasts Socket.IO event 'new-chat'.
 */
export async function sendRoomChatMessage(req, res) {
  try {
    const { roomId } = req.params;
    const { message, message_type = 'text', metadata } = req.body;
    const userId = req.user.id;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
    }

    const trimmedMsg = message.trim().substring(0, 300);

    // Verify room exists and is active
    const roomRows = await query('SELECT room_id, host_id, status FROM live_rooms WHERE room_id = ?', [roomId]);
    if (roomRows.length === 0 || roomRows[0].status === 'ended') {
      return res.status(404).json({ success: false, message: 'Active live room not found.' });
    }

    const hostId = roomRows[0].host_id;

    // Check if user is banned or kicked from room
    const bannedRows = await query(
      'SELECT id FROM live_room_kicks WHERE room_id = ? AND user_id = ? AND (banned_until IS NULL OR banned_until > CURRENT_TIMESTAMP)',
      [roomId, userId]
    );
    if (bannedRows.length > 0) {
      return res.status(403).json({ success: false, message: 'You have been restricted from chatting in this room.' });
    }

    // Insert message into DB
    const insertRes = await query(
      `INSERT INTO live_room_messages (room_id, user_id, message, message_type, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [roomId, userId, trimmedMsg, message_type, metadata ? JSON.stringify(metadata) : null]
    );

    // Invalidate Redis chat cache
    await cache.delByPattern(`mobile:room:messages:${roomId}:*`);

    // Determine user status (is_host, is_admin, is_speaker)
    const isHost = userId === hostId;
    const adminRows = await query('SELECT id FROM live_room_admins WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    const isAdmin = isHost || adminRows.length > 0;

    const seatRows = await query('SELECT seat_number FROM live_room_seats WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    const isSpeaker = seatRows.length > 0;
    const seatNumber = isSpeaker ? seatRows[0].seat_number : null;

    const chatPayload = {
      id: insertRes.insertId,
      roomId,
      message: trimmedMsg,
      message_type,
      metadata: metadata || null,
      timestamp: new Date().toISOString(),
      user: {
        id: req.user.id,
        full_name: req.user.full_name,
        avatar_url: req.user.avatar_url || '',
        vip_level: req.user.vip_level || 0,
        level: req.user.level || 1,
        is_host: isHost,
        is_admin: isAdmin,
        is_speaker: isSpeaker,
        seat_number: seatNumber,
      },
    };

    // Broadcast real-time Socket.IO event to room channel
    if (req.io) {
      req.io.to(roomId).emit('new-chat', chatPayload);
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully.',
      data: chatPayload,
    });
  } catch (err) {
    console.error('sendRoomChatMessage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send message.', error: err.message });
  }
}

/**
 * GET /api/mobile/live/rooms/:roomId/messages
 * Retrieve chronological chat message history for a live room.
 * Handled via Cache-Aside Redis architecture.
 */
export async function getRoomChatMessages(req, res) {
  try {
    const { roomId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const beforeId = req.query.before_id ? parseInt(req.query.before_id, 10) : null;

    const cacheKey = `mobile:room:messages:${roomId}:limit:${limit}:before:${beforeId || 'latest'}`;

    const cachedData = await cache.getOrSet(cacheKey, 15, async () => {
      let sql = `
        SELECT 
          m.id,
          m.room_id as roomId,
          m.message,
          m.message_type,
          m.metadata,
          m.created_at as timestamp,
          u.id as user_id,
          u.full_name,
          u.avatar_url,
          u.vip_level,
          u.level
        FROM live_room_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.room_id = ?
      `;
      const params = [roomId];

      if (beforeId) {
        sql += ' AND m.id < ?';
        params.push(beforeId);
      }

      sql += ' ORDER BY m.id DESC LIMIT ?';
      params.push(limit);

      const rows = await query(sql, params);

      // Reverse to chronological order (oldest to newest)
      const reversed = rows.reverse().map((r) => ({
        id: r.id,
        roomId: r.roomId,
        message: r.message,
        message_type: r.message_type,
        metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : null,
        timestamp: r.timestamp,
        user: {
          id: r.user_id,
          full_name: r.full_name,
          avatar_url: r.avatar_url || '',
          vip_level: r.vip_level || 0,
          level: r.level || 1,
        },
      }));

      return reversed;
    });

    return res.json({
      success: true,
      count: cachedData.length,
      messages: cachedData,
    });
  } catch (err) {
    console.error('getRoomChatMessages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve messages.', error: err.message });
  }
}

/**
 * DELETE /api/mobile/live/rooms/:roomId/messages/:messageId
 * Host, Admin, or Message Sender deletes a message.
 * Emits 'chat_message_deleted' to the room channel.
 */
export async function deleteRoomChatMessage(req, res) {
  try {
    const { roomId, messageId } = req.params;
    const userId = req.user.id;

    // Check message existence
    const msgRows = await query('SELECT id, user_id FROM live_room_messages WHERE id = ? AND room_id = ?', [messageId, roomId]);
    if (msgRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    const messageSenderId = msgRows[0].user_id;

    // Check room host & admin privileges
    const roomRows = await query('SELECT host_id FROM live_rooms WHERE room_id = ?', [roomId]);
    const isHost = roomRows.length > 0 && roomRows[0].host_id === userId;
    const adminRows = await query('SELECT id FROM live_room_admins WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    const isAdmin = isHost || adminRows.length > 0;

    if (userId !== messageSenderId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this message.' });
    }

    // Delete from DB
    await query('DELETE FROM live_room_messages WHERE id = ?', [messageId]);

    // Invalidate Redis cache
    await cache.delByPattern(`mobile:room:messages:${roomId}:*`);

    // Broadcast deletion event to room channel
    if (req.io) {
      req.io.to(roomId).emit('chat_message_deleted', {
        roomId,
        messageId: parseInt(messageId, 10),
        deletedBy: userId,
      });
    }

    return res.json({
      success: true,
      message: 'Message deleted successfully.',
      deleted_id: parseInt(messageId, 10),
    });
  } catch (err) {
    console.error('deleteRoomChatMessage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete message.', error: err.message });
  }
}

/**
 * Generate LiveKit WebRTC Access Token for a Live Room
 * GET /api/mobile/live/rooms/:roomId/livekit-token
 * POST /api/mobile/live/rooms/:roomId/livekit-token
 */
export async function getLiveKitToken(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id;
    const userName = req.user?.full_name || 'Anonymous';

    if (!roomId) {
      return res.status(400).json({ success: false, message: 'Room ID is required.' });
    }

    const isNum = /^\d+$/.test(String(roomId).trim());
    // 1. Check room exists by either string room_id OR numeric id
    const roomRows = await query(
      'SELECT id, room_id, host_id, live_type, status FROM live_rooms WHERE room_id = ? OR id = ?',
      [String(roomId), isNum ? Number(roomId) : -1]
    );
    if (roomRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Live room not found.' });
    }
    const room = roomRows[0];
    const canonicalRoomId = room.room_id;

    // Reject if room status is ended
    if (room.status !== 'live') {
      return res.status(400).json({
        success: false,
        message: 'This live stream has ended.',
        is_ended: true,
      });
    }

    // 2. Determine permissions
    const isHost = String(room.host_id) === String(userId);

    // 3. Check if user is currently occupying a seat
    const seatRows = await query(
      'SELECT seat_number, is_camera_on, is_muted FROM live_room_seats WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
      [canonicalRoomId, String(roomId), userId]
    );
    const isSeated = seatRows.length > 0;
    // Allow publishing so when camera/mic is toggled by user, WebRTC publish succeeds seamlessly
    const canPublish = true;

    // 4. Generate LiveKit token
    const tokenData = await generateLiveKitToken({
      roomId: canonicalRoomId,
      userId,
      userName,
      isHost,
      canPublish,
      metadata: {
        avatar: req.user?.avatar_url || null,
        role: req.user?.role || 'user',
        level: req.user?.level || 1,
        seatNumber: isSeated ? seatRows[0].seat_number : null,
      },
    });

    return res.json({
      success: true,
      ...tokenData,
    });
  } catch (err) {
    console.error('getLiveKitToken error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate LiveKit token.', error: err.message });
  }
}

/**
 * Host Update Room Settings (Disable/Enable comments & reactions, room lock/password)
 * PATCH /api/mobile/live/rooms/:roomId/settings
 * PUT /api/mobile/live/rooms/:roomId/settings
 */
export async function updateRoomSettings(req, res) {
  try {
    const { roomId } = req.params;
    const hostId = req.user.id;
    const { is_comment_disabled, is_reaction_disabled, is_locked, isLocked, room_password, roomPassword, password } = req.body;

    const isNum = /^\d+$/.test(String(roomId).trim());
    const rooms = await query(
      'SELECT id, room_id, host_id, is_comment_disabled, is_reaction_disabled, is_locked, room_password FROM live_rooms WHERE (room_id = ? OR id = ?) AND status = "live" LIMIT 1',
      [String(roomId), isNum ? Number(roomId) : -1]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Active live room not found.' });
    }

    const room = rooms[0];
    if (Number(room.host_id) !== Number(hostId) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only the room host can update room settings.' });
    }

    const newCommentDisabled = is_comment_disabled !== undefined
      ? (is_comment_disabled === true || is_comment_disabled === 'true' || is_comment_disabled === 1 ? 1 : 0)
      : room.is_comment_disabled;

    const newReactionDisabled = is_reaction_disabled !== undefined
      ? (is_reaction_disabled === true || is_reaction_disabled === 'true' || is_reaction_disabled === 1 ? 1 : 0)
      : room.is_reaction_disabled;

    let newIsLocked = room.is_locked;
    let newPassword = room.room_password;

    const lockedParam = is_locked ?? isLocked;
    const passParam = room_password ?? roomPassword ?? password;

    if (lockedParam !== undefined) {
      if (lockedParam === true || lockedParam === 'true' || lockedParam === 1) {
        newIsLocked = 1;
        if (passParam !== undefined && passParam !== null) {
          newPassword = String(passParam).trim();
        }
      } else {
        newIsLocked = 0;
        newPassword = null;
      }
    } else if (passParam !== undefined) {
      if (passParam && String(passParam).trim().length > 0) {
        newIsLocked = 1;
        newPassword = String(passParam).trim();
      } else {
        newIsLocked = 0;
        newPassword = null;
      }
    }

    // 1. DB-First mutation
    await query(
      'UPDATE live_rooms SET is_comment_disabled = ?, is_reaction_disabled = ?, is_locked = ?, room_password = ? WHERE id = ?',
      [newCommentDisabled, newReactionDisabled, newIsLocked, newPassword, room.id]
    );

    // 2. Instant Redis cache invalidation
    await Promise.allSettled([
      cache.del(`mobile:room_details:${room.room_id}`),
      cache.del(`mobile:room_details:${room.id}`),
      cache.delByPattern('mobile:rooms:*'),
    ]);

    // 3. Real-time broadcast to all room viewers & global feed
    const io = req.io || req.app.get('io');
    if (io) {
      const lockPayload = {
        roomId: room.room_id,
        room_id: room.room_id,
        numericRoomId: room.id,
        is_comment_disabled: Boolean(newCommentDisabled),
        is_reaction_disabled: Boolean(newReactionDisabled),
        is_locked: Boolean(newIsLocked),
        is_password_protected: Boolean(newIsLocked && newPassword),
        updated_by: hostId,
        timestamp: new Date().toISOString(),
      };
      io.to(room.room_id).emit('room-settings-updated', lockPayload);
      io.to(room.room_id).emit('room_lock_updated', lockPayload);
      io.emit('room_lock_updated', lockPayload);
    }

    return res.json({
      success: true,
      message: 'Room settings updated successfully.',
      roomId: room.room_id,
      is_comment_disabled: Boolean(newCommentDisabled),
      is_reaction_disabled: Boolean(newReactionDisabled),
      is_locked: Boolean(newIsLocked),
      is_password_protected: Boolean(newIsLocked && newPassword),
      ...(newIsLocked && (Number(room.host_id) === Number(hostId) || req.user.role === 'admin' || req.user.role === 'superadmin') && newPassword ? { room_password: newPassword } : {}),
    });
  } catch (err) {
    console.error('updateRoomSettings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update room settings.', error: err.message });
  }
}

/**
 * Host / Admin Lock or Unlock Room with Password
 * POST /api/mobile/live/rooms/:roomId/lock
 * PATCH /api/mobile/live/rooms/:roomId/lock
 * POST /api/mobile/live/rooms/:roomId/unlock
 * PATCH /api/mobile/live/rooms/:roomId/unlock
 */
export async function toggleRoomLock(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const isNum = /^\d+$/.test(String(roomId).trim());

    const rooms = await query(
      'SELECT id, room_id, host_id, is_locked, room_password, status FROM live_rooms WHERE (room_id = ? OR id = ?) AND status = "live" LIMIT 1',
      [String(roomId), isNum ? Number(roomId) : -1]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Active live room not found.' });
    }

    const room = rooms[0];
    const isHost = Number(room.host_id) === Number(userId);
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    let isAuthorized = isHost || isAdmin;
    if (!isAuthorized) {
      const roomAdmins = await query(
        'SELECT permissions FROM live_room_admins WHERE (room_id = ? OR room_id = ?) AND user_id = ? LIMIT 1',
        [room.room_id, String(room.id), userId]
      );
      if (roomAdmins.length > 0) {
        let p = roomAdmins[0].permissions;
        if (typeof p === 'string') {
          try { p = JSON.parse(p); } catch (_) { p = []; }
        }
        if (Array.isArray(p) && (p.includes('all') || p.includes('manage_room_lock'))) {
          isAuthorized = true;
        } else if (p && typeof p === 'object' && (p.all === true || p.manage_room_lock === true)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Only the room host or authorized admin can lock/unlock this room.' });
    }

    const isUnlockRoute = req.path.includes('/unlock');
    const rawPass = req.body.password ?? req.body.room_password ?? req.body.pin ?? null;
    const password = rawPass !== null ? String(rawPass).trim() : null;
    const rawLocked = req.body.is_locked ?? req.body.isLocked;

    let shouldLock = true;
    if (isUnlockRoute || rawLocked === false || rawLocked === 'false' || rawLocked === 0) {
      shouldLock = false;
    } else if (password === '') {
      shouldLock = false;
    }

    if (shouldLock && !password && !room.room_password) {
      return res.status(400).json({
        success: false,
        message: 'A password is required to lock the room.',
      });
    }

    const finalPassword = shouldLock ? (password || room.room_password) : null;
    const finalLocked = shouldLock ? 1 : 0;

    // 1. DB-First mutation
    await query(
      'UPDATE live_rooms SET is_locked = ?, room_password = ? WHERE id = ?',
      [finalLocked, finalPassword, room.id]
    );

    // 2. Instant Redis cache invalidation
    await Promise.allSettled([
      cache.del(`mobile:room_details:${room.room_id}`),
      cache.del(`mobile:room_details:${room.id}`),
      cache.delByPattern('mobile:rooms:*'),
    ]);

    // 3. Real-time broadcast to all viewers in room (NEVER broadcast plain password)
    const io = req.io || req.app.get('io');
    if (io) {
      const lockPayload = {
        roomId: room.room_id,
        room_id: room.room_id,
        is_locked: Boolean(finalLocked),
        is_password_protected: Boolean(finalLocked),
        updated_by: userId,
        timestamp: new Date().toISOString(),
      };
      io.to(room.room_id).emit('room_lock_updated', lockPayload);
      io.to(room.room_id).emit('room-lock-updated', lockPayload);
      io.emit('room_lock_updated', lockPayload);
    }

    return res.json({
      success: true,
      message: finalLocked
        ? 'Live room locked with password successfully.'
        : 'Live room unlocked successfully.',
      roomId: room.room_id,
      is_locked: Boolean(finalLocked),
      is_password_protected: Boolean(finalLocked),
      ...(finalLocked && (isHost || isAdmin) && finalPassword ? { room_password: finalPassword } : {}),
    });
  } catch (err) {
    console.error('toggleRoomLock error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update room lock status.', error: err.message });
  }
}

/**
 * Get Live Streaming Reward Status & Milestone Progress for Broadcaster
 * GET /api/mobile/live/rooms/:roomId/reward-status
 */
export async function getLiveRewardStatus(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const status = await checkStreamRewardStatus({ userId, roomId });
    return res.json({ success: true, rewardStatus: status });
  } catch (err) {
    console.error('getLiveRewardStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch live reward status.', error: err.message });
  }
}

/**
 * Claim Live Streaming Reward manually during or after live session
 * POST /api/mobile/live/rooms/:roomId/claim-reward
 */
export async function claimLiveReward(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const result = await claimAndAwardLiveReward({ userId, roomId, io: req.io });
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('claimLiveReward error:', err);
    return res.status(500).json({ success: false, message: 'Failed to claim live reward.', error: err.message });
  }
}

/**
 * Mobile Get Room Music Playback State
 * GET /api/mobile/live/rooms/:roomId/music
 * Returns active YouTube music metadata and real-time playback timestamp (Rule #3)
 */
export async function getRoomMusic(req, res) {
  try {
    const { roomId } = req.params;
    const musicState = await getRoomMusicState(roomId);
    return res.json({
      success: true,
      music: musicState,
      youtube_music: musicState,
    });
  } catch (err) {
    console.error('getRoomMusic error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get room music state.', error: err.message });
  }
}

/**
 * Mobile Update Room Music Playback State (Host / Room Admin Action)
 * POST /api/mobile/live/rooms/:roomId/music
 * Broadcasts play/pause/seek/sync to all room participants via Socket.IO
 */
export async function updateRoomMusic(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { action, videoId, video_id, title, thumbnailUrl, thumbnail_url, positionSeconds, position_seconds, isPlaying, is_playing } = req.body;

    const isNum = /^\d+$/.test(String(roomId).trim());
    const rooms = await query(
      'SELECT id, room_id, host_id, status FROM live_rooms WHERE (room_id = ? OR id = ?) AND status = "live"',
      [String(roomId), isNum ? Number(roomId) : -1]
    );
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Live room not found or not active.' });
    }
    const room = rooms[0];
    const canonicalRoomId = room.room_id;
    const numericRoomId = room.id;

    // Authorization: Host, Room Admin, or Superadmin
    const isHost = Number(userId) === Number(room.host_id);
    let isAuthorized = isHost || req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isAuthorized) {
      const admins = await query(
        'SELECT id FROM live_room_admins WHERE (room_id = ? OR room_id = ?) AND user_id = ?',
        [canonicalRoomId, String(numericRoomId), userId]
      );
      if (admins.length > 0) isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Only host or room admin can update stream music.' });
    }

    const act = (action || 'play').toLowerCase().trim();
    const vId = videoId || video_id;

    let savedState = null;
    if (act === 'stop') {
      await clearRoomMusicState(canonicalRoomId);
      if (numericRoomId) await clearRoomMusicState(String(numericRoomId));
    } else {
      savedState = await setRoomMusicState(canonicalRoomId, {
        action: act,
        videoId: vId,
        title,
        thumbnailUrl: thumbnailUrl || thumbnail_url,
        positionSeconds: Number(positionSeconds ?? position_seconds ?? 0),
        isPlaying: act === 'pause' ? false : (isPlaying ?? is_playing ?? true),
      });
    }

    const payload = {
      roomId: canonicalRoomId,
      numericRoomId,
      action: act,
      videoId: vId || '',
      title: title || '',
      thumbnailUrl: thumbnailUrl || thumbnail_url || '',
      positionSeconds: Number(positionSeconds ?? position_seconds ?? 0),
      position_seconds: Number(positionSeconds ?? position_seconds ?? 0),
      isPlaying: act === 'stop' ? false : (act === 'pause' ? false : Boolean(isPlaying ?? is_playing ?? true)),
      is_playing: act === 'stop' ? false : (act === 'pause' ? false : Boolean(isPlaying ?? is_playing ?? true)),
      startedAt: savedState?.startedAt || Date.now(),
      timestamp: Date.now(),
    };

    if (req.io) {
      const channels = new Set([canonicalRoomId, String(numericRoomId)].filter(Boolean));
      for (const ch of channels) {
        req.io.to(ch).emit('music-updated', payload);
        req.io.to(ch).emit('music_updated', payload);
        req.io.to(ch).emit('music-sync', payload);
        req.io.to(ch).emit('youtube-music-sync', payload);
        req.io.to(ch).emit('youtube_music_updated', payload);
      }
    }

    return res.json({
      success: true,
      message: `Room music updated (${act}).`,
      music: savedState,
      youtube_music: savedState,
    });
  } catch (err) {
    console.error('updateRoomMusic error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update room music.', error: err.message });
  }
}

/**
 * Mobile Stop Room Music Playback (Host / Room Admin Action)
 * DELETE /api/mobile/live/rooms/:roomId/music
 */
export async function stopRoomMusic(req, res) {
  req.body = { ...req.body, action: 'stop' };
  return updateRoomMusic(req, res);
}





