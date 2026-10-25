import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { cache } from '../config/redis.js';

export async function createRoom(req, res) {
  try {
    const hostId = req.user.id;
    const { title, category = 'Chatting', cover_image } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Stream title is required.' });
    }

    // Check if host already has an active live room, end previous if open
    await query("UPDATE live_rooms SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE host_id = ? AND status = 'live'", [hostId]);

    const roomId = `room-${uuidv4().substring(0, 8)}`;
    const streamKey = `sk_umi_${uuidv4().replace(/-/g, '')}`;

    const defaultCover = cover_image || req.user.avatar_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400';

    const rawLiveType = req.body.live_type ?? req.body.liveType ?? req.body.type ?? req.body.stream_type ?? req.body.streamType ?? 'video';
    const liveType = String(rawLiveType).toLowerCase().trim() === 'audio' ? 'audio' : 'video';

    const rawSeats = req.body.total_seats !== undefined ? req.body.total_seats : req.body.totalSeats;
    let seatCount;
    if (liveType === 'video') {
      const requested = parseInt(rawSeats, 10);
      seatCount = requested ? Math.min(9, Math.max(2, requested)) : 6;
    } else {
      const requested = parseInt(rawSeats, 10);
      seatCount = requested ? Math.max(7, requested) : 8;
    }

    const result = await query(
      `INSERT INTO live_rooms (room_id, host_id, title, category, live_type, total_seats, cover_image, status, stream_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'live', ?)`,
      [roomId, hostId, title, category, liveType, seatCount, defaultCover, streamKey]
    );

    const hostCameraOn = liveType === 'audio' ? 0 : 1;
    await query(
      `INSERT INTO live_room_seats (room_id, seat_number, user_id, is_main_seat, is_camera_on, is_muted)
       VALUES (?, 1, ?, 1, ?, 0)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
      [roomId, hostId, hostCameraOn]
    );

    const createdRooms = await query(
      `SELECT r.*, u.full_name as host_name, u.avatar_url as host_avatar, u.level as host_level
       FROM live_rooms r
       JOIN users u ON r.host_id = u.id
       WHERE r.id = ?`,
      [result.insertId]
    );

    // Instant Redis cache invalidation for live rooms lists
    await cache.delByPattern('mobile:rooms:*');
    await cache.delByPattern('live:*');

    return res.status(201).json({
      success: true,
      message: 'Live stream started successfully.',
      room: createdRooms[0],
    });
  } catch (err) {
    console.error('createRoom error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create room.', error: err.message });
  }
}

export async function getRooms(req, res) {
  try {
    const { category, search, live_type, liveType, type, status = 'live', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const cacheKey = `live:rooms:list:${category || 'all'}:${status}:${live_type || liveType || type || 'all'}:${search || ''}:${page}:${limit}`;

    const cachedData = await cache.getOrSet(cacheKey, 10, async () => {
      let whereClauses = ['r.status = ?'];
      let params = [status];

      const filterLiveType = live_type || liveType || type;
      if (filterLiveType && ['video', 'audio'].includes(String(filterLiveType).toLowerCase().trim())) {
        whereClauses.push('r.live_type = ?');
        params.push(String(filterLiveType).toLowerCase().trim());
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

      const rooms = await query(
        `SELECT r.id, r.room_id, r.host_id, r.title, r.category, r.live_type, r.total_seats, r.cover_image, r.status,
                r.viewer_count, r.total_diamonds, r.started_at,
                u.full_name as host_name, u.avatar_url as host_avatar, u.level as host_level,
                pc.name as host_vip_category,
                pc.badge_icon as host_vip_icon,
                pc.color_code as host_vip_color,
                COALESCE(CASE WHEN pc.top_live_list = 1 THEN pc.display_order ELSE 999999 END, 999999) as vip_rank
         FROM live_rooms r
         JOIN users u ON r.host_id = u.id
         LEFT JOIN user_package_subscriptions ups 
           ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW()
         LEFT JOIN package_categories pc 
           ON pc.id = ups.category_id AND pc.is_active = 1
         ${whereSql}
         ORDER BY vip_rank ASC, r.viewer_count DESC, r.started_at DESC
         LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`,
        params
      );

      const totalCountRows = await query(
        `SELECT COUNT(*) as count FROM live_rooms r JOIN users u ON r.host_id = u.id ${whereSql}`,
        params
      );

      return {
        rooms,
        total: totalCountRows[0]?.count || 0,
      };
    });

    return res.json({
      success: true,
      rooms: cachedData.rooms,
      pagination: {
        total: cachedData.total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    console.error('getRooms error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch rooms.', error: err.message });
  }
}

export async function getRoomDetails(req, res) {
  try {
    const { roomId } = req.params;

    const room = await cache.getOrSet(`room:${roomId}`, 10, async () => {
      const rooms = await query(
        `SELECT r.*,
                u.full_name as host_name, u.avatar_url as host_avatar, u.level as host_level, u.bio as host_bio
         FROM live_rooms r
         JOIN users u ON r.host_id = u.id
         WHERE r.room_id = ?`,
        [roomId]
      );
      return rooms.length > 0 ? rooms[0] : null;
    });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const roomCopy = { ...room };

    // If request user is not host and not admin, hide sensitive stream_key
    if (!req.user || (req.user.id !== roomCopy.host_id && req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      delete roomCopy.stream_key;
    }

    return res.json({
      success: true,
      room: roomCopy,
    });
  } catch (err) {
    console.error('getRoomDetails error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch room details.' });
  }
}

export async function endRoom(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    const rooms = await query('SELECT * FROM live_rooms WHERE room_id = ?', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const room = rooms[0];
    if (room.host_id !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only host or admin can end this stream.' });
    }

    await query("UPDATE live_rooms SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE room_id = ?", [roomId]);

    // Instant Redis cache invalidation for ended stream
    await cache.del(`room:${roomId}`, `mobile:room_details:${roomId}`);
    await cache.delByPattern('mobile:rooms:*');
    await cache.delByPattern('live:*');

    return res.json({
      success: true,
      message: 'Live stream ended successfully.',
    });
  } catch (err) {
    console.error('endRoom error:', err);
    return res.status(500).json({ success: false, message: 'Failed to end stream.' });
  }
}
