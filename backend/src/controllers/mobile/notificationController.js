import { query } from '../../config/db.js';
import { cache } from '../../config/redis.js';

/**
 * Helper to resolve asset URLs (handles relative vs absolute URLs)
 */
function resolveAssetUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5050}`;
  return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

/**
 * GET /api/mobile/notifications
 * Fetch paginated in-app notifications for the authenticated user.
 * Dynamically joins live_rooms to inspect current live status (live vs ended).
 */
export async function getNotifications(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const typeFilter = (req.query.type || 'all').toLowerCase();

    const cacheKey = `mobile:notifications:${userId}:${typeFilter}:${page}:${limit}`;

    // Cache-Aside with 15s TTL for fresh, responsive notifications
    const responseData = await cache.getOrSet(cacheKey, 15, async () => {
      let whereClause = 'n.user_id = ?';
      const whereParams = [userId];

      if (typeFilter !== 'all') {
        whereClause += ' AND n.type = ?';
        whereParams.push(typeFilter);
      }

      // 1. Fetch total count
      const [countRow] = await query(
        `SELECT COUNT(*) AS total FROM notifications n WHERE ${whereClause}`,
        whereParams
      );
      const total = countRow?.total || 0;

      // 2. Fetch unread count
      const [unreadRow] = await query(
        `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0`,
        [userId]
      );
      const unreadCount = unreadRow?.unread || 0;

      // 3. Fetch notifications with actor and live status
      const queryParams = [...whereParams, limit, offset];
      const rows = await query(
        `SELECT 
           n.id,
           n.user_id,
           n.actor_id,
           n.type,
           n.title,
           n.body,
           n.entity_type,
           n.entity_id,
           n.meta,
           n.is_read,
           n.created_at,
           n.updated_at,
           u.full_name AS actor_name,
           u.avatar_url AS actor_avatar,
           u.level AS actor_level,
           u.role AS actor_role,
           lr.id AS live_room_numeric_id,
           lr.room_id AS live_room_canonical_id,
           lr.status AS live_room_status,
           lr.live_type AS live_room_type,
           lr.title AS live_room_title,
           lr.cover_image AS live_room_cover
         FROM notifications n
         LEFT JOIN users u ON u.id = n.actor_id
         LEFT JOIN live_rooms lr ON (n.entity_type = 'live_room' AND (CONVERT(n.entity_id USING utf8mb4) = CONVERT(lr.room_id USING utf8mb4) OR n.entity_id = CAST(lr.id AS CHAR)))
         WHERE ${whereClause}
         ORDER BY n.id DESC
         LIMIT ? OFFSET ?`,
        queryParams
      );

      const items = (rows || []).map((row) => {
        let meta = null;
        if (row.meta) {
          try {
            meta = typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta;
          } catch {
            meta = null;
          }
        }

        // Live stream status calculation
        let liveInfo = null;
        let displayBody = row.body;

        if (row.type === 'live_started' || row.entity_type === 'live_room') {
          const isLiveNow = row.live_room_status === 'live';

          liveInfo = {
            is_live: isLiveNow,
            live_status: isLiveNow ? 'live' : 'ended',
            can_join: isLiveNow,
            display_status: isLiveNow ? 'Live Now' : 'Live Ended',
            room_id: row.entity_id || row.live_room_canonical_id || String(row.live_room_numeric_id || ''),
            live_type: row.live_room_type || meta?.live_type || 'video',
            room_title: row.live_room_title || meta?.title || '',
            cover_image: resolveAssetUrl(row.live_room_cover || meta?.cover_image),
          };

          if (!isLiveNow) {
            displayBody = 'This live stream has ended.';
          }
        }

        return {
          id: row.id,
          user_id: row.user_id,
          type: row.type,
          title: row.title,
          body: displayBody,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          meta,
          is_read: Boolean(row.is_read),
          created_at: row.created_at,
          actor: {
            id: row.actor_id,
            name: row.actor_name || 'Umi Live User',
            avatar_url: resolveAssetUrl(row.actor_avatar),
            level: row.actor_level || 1,
            role: row.actor_role || 'user',
          },
          live: liveInfo,
        };
      });

      return {
        unread_count: unreadCount,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit) || 1,
          has_more: page * limit < total,
        },
        notifications: items,
      };
    });

    return res.status(200).json({
      success: true,
      ...responseData,
    });
  } catch (err) {
    console.error('getNotifications error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications: ' + err.message,
    });
  }
}

/**
 * GET /api/mobile/notifications/unread-count
 * Fast endpoint for mobile navbar / notification bell badge
 */
export async function getUnreadCount(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
    }

    const cacheKey = `mobile:notifications:unread:${userId}`;
    const unreadCount = await cache.getOrSet(cacheKey, 15, async () => {
      const [row] = await query(
        `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0`,
        [userId]
      );
      return row?.unread || 0;
    });

    return res.status(200).json({
      success: true,
      unread_count: unreadCount,
    });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get unread notification count: ' + err.message,
    });
  }
}

/**
 * PATCH /api/mobile/notifications/:id/read
 * Mark a single notification as read
 */
export async function markAsRead(req, res) {
  try {
    const userId = req.user?.id;
    const notificationId = parseInt(req.params.id, 10);

    if (!userId || isNaN(notificationId)) {
      return res.status(400).json({ success: false, message: 'Valid notification ID required.' });
    }

    // Database-First Write (SSOT)
    const result = await query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found or unauthorized.' });
    }

    // Instant Redis Cache Invalidation
    await Promise.allSettled([
      cache.delByPattern(`mobile:notifications:${userId}:*`),
      cache.del(`mobile:notifications:unread:${userId}`),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification_id: notificationId,
    });
  } catch (err) {
    console.error('markAsRead error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read: ' + err.message,
    });
  }
}

/**
 * POST /api/mobile/notifications/mark-all-read
 * Mark all notifications as read for current user
 */
export async function markAllAsRead(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
    }

    // Database-First Write (SSOT)
    const result = await query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    // Instant Redis Cache Invalidation
    await Promise.allSettled([
      cache.delByPattern(`mobile:notifications:${userId}:*`),
      cache.del(`mobile:notifications:unread:${userId}`),
    ]);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      updated_count: result.affectedRows,
    });
  } catch (err) {
    console.error('markAllAsRead error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read: ' + err.message,
    });
  }
}

/**
 * DELETE /api/mobile/notifications/:id
 * Delete a specific notification
 */
export async function deleteNotification(req, res) {
  try {
    const userId = req.user?.id;
    const notificationId = parseInt(req.params.id, 10);

    if (!userId || isNaN(notificationId)) {
      return res.status(400).json({ success: false, message: 'Valid notification ID required.' });
    }

    // Database-First Write (SSOT)
    const result = await query(
      `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found or unauthorized.' });
    }

    // Instant Redis Cache Invalidation
    await Promise.allSettled([
      cache.delByPattern(`mobile:notifications:${userId}:*`),
      cache.del(`mobile:notifications:unread:${userId}`),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.',
      notification_id: notificationId,
    });
  } catch (err) {
    console.error('deleteNotification error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification: ' + err.message,
    });
  }
}

/**
 * DELETE /api/mobile/notifications
 * Clear all notifications for the current user
 */
export async function clearAllNotifications(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
    }

    // Database-First Write (SSOT)
    const result = await query(
      `DELETE FROM notifications WHERE user_id = ?`,
      [userId]
    );

    // Instant Redis Cache Invalidation
    await Promise.allSettled([
      cache.delByPattern(`mobile:notifications:${userId}:*`),
      cache.del(`mobile:notifications:unread:${userId}`),
    ]);

    return res.status(200).json({
      success: true,
      message: 'All notifications cleared successfully.',
      deleted_count: result.affectedRows,
    });
  } catch (err) {
    console.error('clearAllNotifications error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear notifications: ' + err.message,
    });
  }
}
