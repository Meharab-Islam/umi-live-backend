import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isInitialized = false;

// 1. Locate and load Firebase service account credentials
const configuredPath = process.env.FIREBASE_CREDENTIALS_PATH;
const candidatePaths = [
  configuredPath ? path.resolve(__dirname, '../../', configuredPath) : null,
  configuredPath ? path.resolve(process.cwd(), configuredPath) : null,
  path.resolve(__dirname, '../../../umi_firebase.json'),
  path.resolve(__dirname, '../../umi_firebase.json'),
  path.resolve(process.cwd(), '../umi_firebase.json'),
  path.resolve(process.cwd(), 'umi_firebase.json'),
].filter(Boolean);

let credentialsFilePath = candidatePaths.find((p) => fs.existsSync(p));

if (credentialsFilePath) {
  try {
    const rawData = fs.readFileSync(credentialsFilePath, 'utf8');
    const serviceAccount = JSON.parse(rawData);

    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
    isInitialized = true;
    console.log(`🔥 [Firebase Admin] Initialized successfully with project: ${serviceAccount.project_id} (Path: ${credentialsFilePath})`);
  } catch (err) {
    console.error('⚠️ [Firebase Admin] Initialization failed:', err.message);
  }
} else {
  console.warn('⚠️ [Firebase Admin] No service account JSON found. Push notifications will be skipped gracefully.');
}

/**
 * Check if Firebase is ready to send notifications
 */
export function isFirebaseReady() {
  return isInitialized && getApps().length > 0;
}

/**
 * Send Push Notification to single token or multiple tokens
 * 
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {string} [options.token] - Single FCM device token
 * @param {string[]} [options.tokens] - Array of FCM device tokens
 * @param {Object} [options.data] - Key-value string map for custom payload
 * @param {string} [options.imageUrl] - Optional image attachment URL
 * @returns {Promise<{success: boolean, sentCount?: number, failureCount?: number}>}
 */
export async function sendPushNotification({ title, body, token, tokens = [], data = {}, imageUrl = null }) {
  if (!isFirebaseReady()) {
    return { success: false, message: 'Firebase Admin is not initialized.' };
  }

  // Ensure all data values are strings (FCM requirement)
  const stringifiedData = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) {
      stringifiedData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
  }

  const notificationPayload = {
    title: String(title || 'New Notification'),
    body: String(body || ''),
  };
  if (imageUrl) {
    notificationPayload.imageUrl = imageUrl;
  }

  const androidConfig = {
    priority: 'high',
    notification: {
      channelId: 'umi_chat_messages',
      sound: 'default',
      priority: 'high',
      defaultSound: true,
      defaultVibrateTimings: true,
    },
  };

  const apnsConfig = {
    payload: {
      aps: {
        sound: 'default',
        badge: 1,
        contentAvailable: true,
      },
    },
  };

  // Collect target tokens
  const targetTokens = Array.from(
    new Set([token, ...(Array.isArray(tokens) ? tokens : [])].filter((t) => typeof t === 'string' && t.trim().length > 10))
  );

  if (targetTokens.length === 0) {
    return { success: false, message: 'No valid recipient FCM tokens.' };
  }

  try {
    const messaging = getMessaging();

    if (targetTokens.length === 1) {
      const message = {
        token: targetTokens[0],
        notification: notificationPayload,
        data: stringifiedData,
        android: androidConfig,
        apns: apnsConfig,
      };

      const response = await messaging.send(message);
      return { success: true, messageId: response, sentCount: 1 };
    } else {
      const multicastMessage = {
        tokens: targetTokens,
        notification: notificationPayload,
        data: stringifiedData,
        android: androidConfig,
        apns: apnsConfig,
      };

      const batchResponse = await messaging.sendEachForMulticast(multicastMessage);

      // Clean up invalid/unregistered tokens asynchronously
      const deadTokens = [];
      batchResponse.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            deadTokens.push(targetTokens[idx]);
          }
        }
      });

      if (deadTokens.length > 0) {
        query(
          `DELETE FROM user_fcm_tokens WHERE fcm_token IN (${deadTokens.map(() => '?').join(',')})`,
          deadTokens
        ).catch(() => {});
      }

      return {
        success: true,
        sentCount: batchResponse.successCount,
        failureCount: batchResponse.failureCount,
      };
    }
  } catch (error) {
    console.error('🔥 [Firebase Push] Error sending message:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Triggers automated push notification for 1-on-1 Chat Messages
 * 
 * @param {Object} params
 * @param {number|string} params.receiverId - Recipient user ID
 * @param {Object} params.sender - Sender user details
 * @param {string} [params.message] - Text message
 * @param {number|string} params.conversationId - Conversation ID
 * @param {Array} [params.media] - Attached media items
 * @param {string} [params.primaryType] - Message type (text, image, video, etc.)
 */
export async function sendChatPushNotification({
  receiverId,
  sender,
  message = '',
  conversationId,
  media = [],
  primaryType = 'text',
}) {
  if (!receiverId || !isFirebaseReady()) return;

  try {
    // 1. Fetch active recipient FCM tokens from DB
    const tokenRows = await query(
      `SELECT fcm_token FROM user_fcm_tokens WHERE user_id = ? AND is_active = 1
       UNION
       SELECT fcm_token FROM users WHERE id = ? AND fcm_token IS NOT NULL AND TRIM(fcm_token) != ''`,
      [receiverId, receiverId]
    ).catch(() => []);

    const tokens = tokenRows.map((r) => r.fcm_token).filter(Boolean);
    if (tokens.length === 0) return;

    // 2. Format title and body
    const senderName = sender?.name || sender?.full_name || 'Someone';
    let bodyText = (message || '').trim();

    if (!bodyText) {
      if (media && media.length > 1) {
        bodyText = `📎 Sent ${media.length} attachments`;
      } else if (primaryType === 'video') {
        bodyText = '🎥 Sent a video';
      } else if (primaryType === 'audio') {
        bodyText = '🎵 Sent an audio message';
      } else if (primaryType === 'image') {
        bodyText = '🖼️ Sent a photo';
      } else {
        bodyText = 'Sent a new message';
      }
    }

    const firstMediaUrl = media?.[0]?.media_url || null;

    // 3. Dispatch Push Notification asynchronously
    const pushResult = await sendPushNotification({
      tokens,
      title: senderName,
      body: bodyText,
      imageUrl: primaryType === 'image' && firstMediaUrl ? firstMediaUrl : null,
      data: {
        notification_category: 'dm',
        type: 'direct_message',
        target_screen: 'chat_details',
        route: '/chat-details',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        conversation_id: String(conversationId),
        sender_id: String(sender.id),
        sender_name: senderName,
        sender_avatar: sender.avatar_url || sender.profile_picture || '',
        message: bodyText,
        chat_type: primaryType,
        msg_type: primaryType,
        created_at: new Date().toISOString(),
      },
    });

    console.log(`📱 [FCM Push Sent] Receiver: ${receiverId} | Sender: ${senderName} | Sent: ${pushResult.sentCount || 1} | Result:`, pushResult);
    return pushResult;
  } catch (err) {
    console.error('🔥 [Chat Push Notification] Error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Helper: Fetch FCM tokens for specific user IDs
 */
export async function getUserFcmTokens(userIds) {
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).map(Number).filter((id) => id > 0);
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  const tokenRows = await query(
    `SELECT DISTINCT fcm_token FROM (
       SELECT fcm_token FROM user_fcm_tokens WHERE user_id IN (${placeholders}) AND is_active = 1
       UNION
       SELECT fcm_token FROM users WHERE id IN (${placeholders}) AND fcm_token IS NOT NULL AND TRIM(fcm_token) != ''
     ) t WHERE fcm_token IS NOT NULL AND TRIM(fcm_token) != ''`,
    [...ids, ...ids]
  ).catch(() => []);

  return tokenRows.map((r) => r.fcm_token).filter(Boolean);
}

/**
 * Helper: Fetch active FCM tokens strictly for users who follow targetUserId
 */
export async function getFollowerFcmTokens(targetUserId) {
  const followingId = Number(targetUserId);
  if (!followingId) return [];

  const tokenRows = await query(
    `SELECT DISTINCT t.fcm_token FROM (
       SELECT uft.fcm_token 
       FROM user_fcm_tokens uft
       JOIN user_follows uf ON uf.follower_id = uft.user_id
       WHERE uf.following_id = ? AND uf.follower_id != ? AND uft.is_active = 1
       UNION
       SELECT u.fcm_token 
       FROM users u
       JOIN user_follows uf ON uf.follower_id = u.id
       WHERE uf.following_id = ? AND uf.follower_id != ? AND u.fcm_token IS NOT NULL AND TRIM(u.fcm_token) != ''
     ) t WHERE t.fcm_token IS NOT NULL AND TRIM(t.fcm_token) != ''`,
    [followingId, followingId, followingId, followingId]
  ).catch(() => []);

  return tokenRows.map((r) => r.fcm_token).filter(Boolean);
}

/**
 * Helper: Fetch all active FCM tokens across all users (excluding a specific user ID)
 */
export async function getAllActiveFcmTokens(excludeUserId = null, limit = 500) {
  const excludeId = excludeUserId ? Number(excludeUserId) : null;
  const tokenRows = await query(
    `SELECT DISTINCT fcm_token FROM (
       SELECT fcm_token, user_id FROM user_fcm_tokens WHERE is_active = 1
       UNION
       SELECT fcm_token, id as user_id FROM users WHERE fcm_token IS NOT NULL AND TRIM(fcm_token) != ''
     ) t ${excludeId ? 'WHERE user_id != ?' : ''}
     LIMIT ${parseInt(limit, 10)}`,
    excludeId ? [excludeId] : []
  ).catch(() => []);

  return tokenRows.map((r) => r.fcm_token).filter(Boolean);
}

/**
 * 1. Push Notification: Someone commented on your post
 */
export async function sendPostCommentPushNotification({ postId, commentId, postAuthorId, commenter, content }) {
  const authorId = Number(postAuthorId);
  const commenterId = Number(commenter?.id || commenter?.user_id);
  if (!authorId || !commenterId || authorId === commenterId || !isFirebaseReady()) return;

  try {
    const tokens = await getUserFcmTokens(authorId);
    if (tokens.length === 0) return;

    const commenterName = commenter.name || commenter.full_name || 'Someone';
    const bodyText = (content || '').trim();
    const truncatedBody = bodyText.length > 100 ? `${bodyText.slice(0, 97)}...` : (bodyText || 'Commented on your post.');

    const pushResult = await sendPushNotification({
      tokens,
      title: `${commenterName} commented on your post 💬`,
      body: truncatedBody,
      data: {
        notification_category: 'post',
        type: 'post_comment',
        target_screen: 'post_details',
        route: '/post-details',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        post_id: String(postId),
        comment_id: String(commentId),
        is_reply: 'false',
        commenter_id: String(commenterId),
        commenter_name: commenterName,
        commenter_avatar: commenter.profile_picture || commenter.avatar_url || '',
        content: truncatedBody,
        created_at: new Date().toISOString(),
      },
    });

    console.log(`📱 [FCM Post Comment Push Sent] Post Author: ${authorId} | Commenter: ${commenterName} | Tokens: ${tokens.length}`);
    return pushResult;
  } catch (err) {
    console.error('🔥 [Post Comment Push] Error:', err.message);
  }
}

/**
 * 2. Push Notification: Someone replied to your comment
 */
export async function sendCommentReplyPushNotification({ postId, commentId, parentCommentAuthorId, replier, content }) {
  const authorId = Number(parentCommentAuthorId);
  const replierId = Number(replier?.id || replier?.user_id);
  if (!authorId || !replierId || authorId === replierId || !isFirebaseReady()) return;

  try {
    const tokens = await getUserFcmTokens(authorId);
    if (tokens.length === 0) return;

    const replierName = replier.name || replier.full_name || 'Someone';
    const bodyText = (content || '').trim();
    const truncatedBody = bodyText.length > 100 ? `${bodyText.slice(0, 97)}...` : (bodyText || 'Replied to your comment.');

    const pushResult = await sendPushNotification({
      tokens,
      title: `${replierName} replied to your comment 💬`,
      body: truncatedBody,
      data: {
        notification_category: 'post',
        type: 'comment_reply',
        target_screen: 'post_details',
        route: '/post-details',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        post_id: String(postId),
        comment_id: String(commentId),
        parent_id: String(authorId),
        is_reply: 'true',
        replier_id: String(replierId),
        replier_name: replierName,
        replier_avatar: replier.profile_picture || replier.avatar_url || '',
        content: truncatedBody,
        created_at: new Date().toISOString(),
      },
    });

    console.log(`📱 [FCM Comment Reply Push Sent] Parent Comment Author: ${authorId} | Replier: ${replierName} | Tokens: ${tokens.length}`);
    return pushResult;
  } catch (err) {
    console.error('🔥 [Comment Reply Push] Error:', err.message);
  }
}

/**
 * 3. Push Notification: New post to followers
 * Strictly sent to active followers only.
 */
export async function sendNewPostPushNotification({ postId, author, title, content, mediaType, firstMediaUrl }) {
  const authorId = Number(author?.id || author?.user_id);
  if (!authorId || !isFirebaseReady()) return;

  try {
    // Fetch FCM tokens of users who strictly follow this author
    const tokens = await getFollowerFcmTokens(authorId);
    if (!tokens || tokens.length === 0) return;

    const authorName = author?.name || author?.full_name || 'Someone you follow';
    const postTitle = (title || '').trim();
    const postContent = (content || '').trim();
    const bodyText = postTitle || (postContent.length > 90 ? `${postContent.slice(0, 87)}...` : postContent) || 'Shared a new post 📸';

    const pushResult = await sendPushNotification({
      tokens,
      title: `New post from ${authorName} 📰`,
      body: bodyText,
      imageUrl: mediaType === 'image' && firstMediaUrl ? firstMediaUrl : null,
      data: {
        notification_category: 'post',
        type: 'new_post',
        target_screen: 'post_details',
        route: '/post-details',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        post_id: String(postId),
        author_id: String(authorId),
        author_name: authorName,
        author_avatar: author.profile_picture || author.avatar_url || '',
        title: postTitle,
        media_type: String(mediaType || 'none'),
        created_at: new Date().toISOString(),
      },
    });

    console.log(`📱 [FCM New Post Push Sent to Followers Only] Author: ${authorName} | Recipients: ${tokens.length}`);
    return pushResult;
  } catch (err) {
    console.error('🔥 [New Post Push] Error:', err.message);
  }
}

/**
 * 4. Push Notification: Live room created / Host is LIVE
 * Strictly dispatched to active followers of the host only.
 * Non-followers will NEVER receive this notification.
 */
export async function sendLiveRoomStartedPushNotification({ roomId, host, title, liveType = 'video', coverImage = null }) {
  const hostId = Number(host?.id || host?.user_id);
  if (!hostId || !isFirebaseReady()) return;

  try {
    // Strictly notify ONLY followers of the host who have registered devices (non-followers are excluded)
    const followerTokens = await getFollowerFcmTokens(hostId);
    if (!followerTokens || followerTokens.length === 0) {
      console.log(`📱 [FCM Live Room Push] Host ${hostId} has no followers with registered devices. Skipping push.`);
      return;
    }

    const hostName = host?.name || host?.full_name || 'Host';
    const roomTitle = (title || 'Live Stream').trim();
    const typeLabel = liveType === 'audio' ? 'Audio Live 🎙️' : 'Live Stream 🎥';

    const pushResult = await sendPushNotification({
      tokens: followerTokens,
      title: `🔴 ${hostName} is now LIVE!`,
      body: `Join "${roomTitle}" now and chat live! ${typeLabel}`,
      imageUrl: coverImage && coverImage.startsWith('http') ? coverImage : null,
      data: {
        notification_category: 'live',
        type: 'live_room_started',
        target_screen: liveType === 'audio' ? 'audio_live' : 'video_live',
        route: liveType === 'audio' ? '/audio-live' : '/video-live',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        room_id: String(roomId),
        live_type: String(liveType || 'video'),
        is_host: 'false',
        host_id: String(hostId),
        host_name: hostName,
        host_avatar: host.avatar_url || host.profile_picture || '',
        title: roomTitle,
        created_at: new Date().toISOString(),
      },
    });

    console.log(`📱 [FCM Live Room Push Sent to Followers Only] Host: ${hostName} (${hostId}) | Room: ${roomId} | Followers Notified: ${followerTokens.length}`);
    return pushResult;
  } catch (err) {
    console.error('🔥 [Live Room Push] Error:', err.message);
  }
}

/**
 * 5. Push Notification: Someone started following you
 * Dispatched to target user when another user follows them.
 */
export async function sendNewFollowerPushNotification({ followingUserId, follower }) {
  const targetUserId = Number(followingUserId);
  const followerId = Number(follower?.id || follower?.user_id);
  if (!targetUserId || !followerId || targetUserId === followerId || !isFirebaseReady()) return;

  try {
    const tokens = await getUserFcmTokens(targetUserId);
    if (!tokens || tokens.length === 0) {
      console.log(`📱 [FCM New Follower Push] Target user ${targetUserId} has no active FCM tokens.`);
      return;
    }

    const followerName = follower?.name || follower?.full_name || 'Someone';
    const avatarUrl = follower?.avatar_url || follower?.profile_picture || '';

    const pushResult = await sendPushNotification({
      tokens,
      title: `👤 New Follower!`,
      body: `${followerName} started following you ✨`,
      imageUrl: avatarUrl && avatarUrl.startsWith('http') ? avatarUrl : null,
      data: {
        notification_category: 'social',
        type: 'new_follower',
        target_screen: 'user_profile',
        route: '/user-profile',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        follower_id: String(followerId),
        follower_name: followerName,
        follower_avatar: avatarUrl,
        created_at: new Date().toISOString(),
      },
    });

    console.log(`📱 [FCM New Follower Push Sent] Target User: ${targetUserId} | Follower: ${followerName} (${followerId}) | Tokens Notified: ${tokens.length}`);
    return pushResult;
  } catch (err) {
    console.error('🔥 [New Follower Push] Error:', err.message);
  }
}

