import { query } from '../config/db.js';
import { cache } from '../config/redis.js';
import { getLiveIO } from '../sockets/liveSocket.js';
import {
  sendNewFollowerPushNotification,
  sendPostCommentPushNotification,
  sendCommentReplyPushNotification,
  sendLiveRoomStartedPushNotification,
} from '../config/firebase.js';

/**
 * Core helper to insert in-app notification into MySQL SSOT,
 * invalidate Redis cache, emit real-time WebSocket event, and dispatch FCM.
 */
export async function createNotification({
  userId,
  actorId,
  type,
  title,
  body,
  entityType = 'general',
  entityId = '',
  meta = null,
}) {
  if (!userId || !actorId || !type) return null;
  // Never notify user of their own action
  if (parseInt(userId, 10) === parseInt(actorId, 10)) return null;

  try {
    const metaJson = meta ? JSON.stringify(meta) : null;
    const result = await query(
      `INSERT INTO notifications (user_id, actor_id, type, title, body, entity_type, entity_id, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, actorId, type, title, body, entityType, String(entityId), metaJson]
    );

    const notificationId = result.insertId;

    // Invalidate Redis cache for recipient
    await Promise.allSettled([
      cache.delByPattern(`mobile:notifications:${userId}:*`),
      cache.del(`mobile:notifications:unread:${userId}`),
    ]);

    // Real-time socket notification to recipient
    const io = getLiveIO();
    if (io) {
      io.to(`user_${userId}`).emit('new_notification', {
        id: notificationId,
        user_id: userId,
        actor_id: actorId,
        type,
        title,
        body,
        entity_type: entityType,
        entity_id: String(entityId),
        meta,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    return notificationId;
  } catch (err) {
    console.error('Error in createNotification:', err.message);
    return null;
  }
}

/**
 * Trigger notification when a user follows another user
 */
export async function notifyFollow({ followerId, followingId }) {
  if (parseInt(followerId, 10) === parseInt(followingId, 10)) return;

  try {
    const [follower] = await query(
      'SELECT id, full_name, avatar_url FROM users WHERE id = ? LIMIT 1',
      [followerId]
    );
    if (!follower) return;

    const followerName = follower.full_name || 'Someone';
    const title = `${followerName} started following you 👤`;
    const body = `${followerName} is now following your profile.`;

    await createNotification({
      userId: followingId,
      actorId: followerId,
      type: 'follow',
      title,
      body,
      entityType: 'user',
      entityId: String(followerId),
      meta: {
        follower_id: followerId,
        follower_name: followerName,
        follower_avatar: follower.avatar_url,
      },
    });

    // Also trigger Firebase FCM
    sendNewFollowerPushNotification({
      followingUserId: followingId,
      follower,
    }).catch(() => {});
  } catch (err) {
    console.error('Error in notifyFollow:', err.message);
  }
}

/**
 * Trigger notification when someone comments on a post
 */
export async function notifyComment({ commenterId, postAuthorId, postId, commentContent, commentId }) {
  if (parseInt(commenterId, 10) === parseInt(postAuthorId, 10)) return;

  try {
    const [commenter] = await query(
      'SELECT id, full_name, avatar_url FROM users WHERE id = ? LIMIT 1',
      [commenterId]
    );
    if (!commenter) return;

    const commenterName = commenter.full_name || 'Someone';
    const preview = (commentContent || '').slice(0, 80);
    const title = `${commenterName} commented on your post 💬`;
    const body = preview || 'Commented on your post';

    await createNotification({
      userId: postAuthorId,
      actorId: commenterId,
      type: 'comment',
      title,
      body,
      entityType: 'post',
      entityId: String(postId),
      meta: {
        post_id: postId,
        comment_id: commentId,
        commenter_id: commenterId,
        commenter_name: commenterName,
      },
    });

    // Also trigger Firebase FCM
    sendPostCommentPushNotification({
      postId,
      commentId,
      postAuthorId,
      commenter,
      content: preview,
    }).catch(() => {});
  } catch (err) {
    console.error('Error in notifyComment:', err.message);
  }
}

/**
 * Trigger notification when someone replies to a comment
 */
export async function notifyCommentReply({ replierId, parentAuthorId, postId, replyContent, commentId, parentId }) {
  if (parseInt(replierId, 10) === parseInt(parentAuthorId, 10)) return;

  try {
    const [replier] = await query(
      'SELECT id, full_name, avatar_url FROM users WHERE id = ? LIMIT 1',
      [replierId]
    );
    if (!replier) return;

    const replierName = replier.full_name || 'Someone';
    const preview = (replyContent || '').slice(0, 80);
    const title = `${replierName} replied to your comment 💬`;
    const body = preview || 'Replied to your comment';

    await createNotification({
      userId: parentAuthorId,
      actorId: replierId,
      type: 'reply',
      title,
      body,
      entityType: 'post',
      entityId: String(postId),
      meta: {
        post_id: postId,
        comment_id: commentId,
        parent_id: parentId,
        replier_id: replierId,
        replier_name: replierName,
      },
    });

    // Also trigger Firebase FCM
    sendCommentReplyPushNotification({
      postId,
      commentId,
      parentCommentAuthorId: parentAuthorId,
      replier,
      content: preview,
    }).catch(() => {});
  } catch (err) {
    console.error('Error in notifyCommentReply:', err.message);
  }
}

/**
 * Trigger notification when a host opens/starts a live room
 */
export async function notifyLiveStarted({ hostId, roomId, title, liveType = 'video', coverImage = null }) {
  try {
    const [host] = await query(
      'SELECT id, full_name, avatar_url FROM users WHERE id = ? LIMIT 1',
      [hostId]
    );
    if (!host) return;

    const hostName = host.full_name || 'Host';
    const followers = await query(
      'SELECT follower_id FROM user_follows WHERE following_id = ?',
      [hostId]
    );

    if (!Array.isArray(followers) || followers.length === 0) return;

    const notifTitle = `🔴 ${hostName} is now LIVE!`;
    const notifBody = `Join "${title || 'Live Stream'}" now and chat live!`;
    const meta = {
      room_id: String(roomId),
      live_type: liveType,
      title: title || '',
      host_name: hostName,
      host_avatar: host.avatar_url,
    };
    const metaJson = JSON.stringify(meta);

    // Bulk insert into notifications table in chunks
    const values = [];
    const placeholders = [];
    const recipientIds = [];

    for (const f of followers) {
      const fid = f.follower_id;
      if (fid && parseInt(fid, 10) !== parseInt(hostId, 10)) {
        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?)');
        values.push(fid, hostId, 'live_started', notifTitle, notifBody, 'live_room', String(roomId), metaJson);
        recipientIds.push(fid);
      }
    }

    if (placeholders.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < placeholders.length; i += chunkSize) {
        const chunkPlaceholders = placeholders.slice(i, i + chunkSize);
        const chunkValues = values.slice(i * 8, (i + chunkSize) * 8);
        await query(
          `INSERT INTO notifications (user_id, actor_id, type, title, body, entity_type, entity_id, meta)
           VALUES ${chunkPlaceholders.join(', ')}`,
          chunkValues
        );
      }

      // Invalidate Redis cache for followers
      await Promise.allSettled(
        recipientIds.map((uid) => cache.delByPattern(`mobile:notifications:${uid}:*`))
      );
    }

    // Also trigger Firebase FCM push
    sendLiveRoomStartedPushNotification({
      roomId,
      host,
      title,
      liveType,
      coverImage,
    }).catch(() => {});
  } catch (err) {
    console.error('Error in notifyLiveStarted:', err.message);
  }
}

/**
 * Handle live room ended: updates notification records and invalidates follower caches
 */
export async function handleLiveEndedNotifications({ roomId, numericRoomId }) {
  try {
    const keys = [String(roomId)];
    if (numericRoomId) keys.push(String(numericRoomId));

    // Update body to indicate live ended in database
    await query(
      `UPDATE notifications 
       SET body = 'This live stream has ended.', updated_at = NOW()
       WHERE entity_type = 'live_room' AND entity_id IN (?)`,
      [keys]
    );

    // Invalidate notification caches for affected users
    const affectedUsers = await query(
      `SELECT DISTINCT user_id FROM notifications WHERE entity_type = 'live_room' AND entity_id IN (?)`,
      [keys]
    );
    if (Array.isArray(affectedUsers)) {
      await Promise.allSettled(
        affectedUsers.map((u) => cache.delByPattern(`mobile:notifications:${u.user_id}:*`))
      );
    }
  } catch (err) {
    console.error('Error in handleLiveEndedNotifications:', err.message);
  }
}
