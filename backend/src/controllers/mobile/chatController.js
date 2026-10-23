import path from 'path';
import { query, getPool } from '../../config/db.js';
import { cache } from '../../config/redis.js';
import { sendChatPushNotification } from '../../config/firebase.js';

/**
 * Helper to build user package category object from joined SQL row
 */
const extractPackageCategory = (row) => {
  if (row.package_category_id || row.package_category_name) {
    return {
      id: row.package_category_id || null,
      name: row.package_category_name || 'Standard',
      badge_icon: row.package_badge_icon || null,
      color_code: row.package_color_code || '#f59e0b',
    };
  }
  return {
    id: null,
    name: row.vip_package || 'Standard',
    badge_icon: null,
    color_code: '#9ca3af',
  };
};

/**
 * Invalidate Redis chat caches for users involved in a conversation
 */
const invalidateChatCache = async (user1Id, user2Id, conversationId = null) => {
  try {
    if (user1Id) await cache.delByPattern(`chat:conversations:${user1Id}:*`);
    if (user2Id) await cache.delByPattern(`chat:conversations:${user2Id}:*`);
    if (conversationId) {
      await cache.delByPattern(`chat:messages:${conversationId}:*`);
      await cache.del(`chat:conv:${conversationId}`);
    }
  } catch (err) {
    console.warn('[ChatCache] Invalidation warning:', err.message);
  }
};

/**
 * Helper to find or create conversation ID between two users
 */
async function getOrCreateConversation(conn, userAId, userBId) {
  const u1 = Math.min(userAId, userBId);
  const u2 = Math.max(userAId, userBId);

  // Check existing conversation
  const [existing] = await conn.execute(
    'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ? LIMIT 1',
    [u1, u2]
  );

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Create new conversation
  const [created] = await conn.execute(
    'INSERT INTO conversations (user1_id, user2_id, last_message, last_message_at) VALUES (?, ?, ?, NOW())',
    [u1, u2, 'Started conversation']
  );

  return created.insertId;
}

/**
 * 1. Get User Conversations / Inbox List
 * GET /api/mobile/chat/conversations
 */
export const getConversations = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const offset = (page - 1) * limit;

  const cacheKey = `chat:conversations:${userId}:page:${page}:limit:${limit}`;
  const TTL = 30; // 30 seconds

  try {
    const result = await cache.getOrSet(cacheKey, TTL, async () => {
      // 1. Total count
      const countSql = `
        SELECT COUNT(*) as total 
        FROM conversations c
        WHERE (c.user1_id = ? AND c.user1_hidden = 0) OR (c.user2_id = ? AND c.user2_hidden = 0)
      `;
      const countRows = await query(countSql, [userId, userId]);
      const total = countRows?.[0]?.total || 0;

      // 2. Select conversations with other user profile and unread count
      const selectSql = `
        SELECT 
          c.id as conversation_id,
          c.user1_id,
          c.user2_id,
          c.last_message,
          c.last_message_at,
          c.background_image,
          c.background_color,
          c.background_updated_by,
          c.background_updated_at,
          c.user1_cleared_at,
          c.user2_cleared_at,
          c.created_at as conversation_created_at,
          CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END as other_user_id,
          u_other.full_name as other_name,
          u_other.avatar_url as other_avatar,
          u_other.role as other_role,
          u_other.level as other_level,
          u_other.star as other_star,
          u_other.vip_package as other_vip_package,
          CASE WHEN ub_me.id IS NOT NULL THEN 1 ELSE 0 END as blocked_by_me,
          CASE WHEN ub_other.id IS NOT NULL THEN 1 ELSE 0 END as blocked_by_other,
          pc.id as package_category_id,
          pc.name as package_category_name,
          pc.badge_icon as package_badge_icon,
          pc.color_code as package_color_code,
          (
            SELECT COUNT(*) 
            FROM chat_messages m 
            WHERE m.conversation_id = c.id 
              AND m.receiver_id = ? 
              AND m.is_read = FALSE
              AND (
                (c.user1_id = ? AND (c.user1_cleared_at IS NULL OR m.created_at > c.user1_cleared_at)) OR
                (c.user2_id = ? AND (c.user2_cleared_at IS NULL OR m.created_at > c.user2_cleared_at))
              )
          ) as unread_count
        FROM conversations c
        JOIN users u_other ON u_other.id = (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END)
        LEFT JOIN user_blocks ub_me 
          ON ub_me.blocker_id = ? AND ub_me.blocked_id = u_other.id
        LEFT JOIN user_blocks ub_other 
          ON ub_other.blocker_id = u_other.id AND ub_other.blocked_id = ?
        LEFT JOIN user_package_subscriptions ups 
          ON ups.user_id = u_other.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
        LEFT JOIN package_categories pc 
          ON pc.id = ups.category_id AND pc.is_active = 1
        WHERE ((c.user1_id = ? AND c.user1_hidden = 0) OR (c.user2_id = ? AND c.user2_hidden = 0))
          AND u_other.role != 'superadmin'
        ORDER BY c.last_message_at DESC
        LIMIT ? OFFSET ?
      `;

      const rows = await query(selectSql, [
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        limit,
        offset,
      ]);

      const items = rows.map((r) => {
        const packageCategory = extractPackageCategory({
          package_category_id: r.package_category_id,
          package_category_name: r.package_category_name,
          package_badge_icon: r.package_badge_icon,
          package_color_code: r.package_color_code,
          vip_package: r.other_vip_package,
        });

        const clearedAt = r.user1_id === userId ? r.user1_cleared_at : r.user2_cleared_at;
        const isCleared = clearedAt && r.last_message_at && new Date(r.last_message_at) <= new Date(clearedAt);

        const blockedByMe = Boolean(r.blocked_by_me);
        const blockedByOther = Boolean(r.blocked_by_other);
        const isBlocked = blockedByMe || blockedByOther;

        return {
          conversation_id: r.conversation_id,
          last_message: isCleared ? null : r.last_message,
          last_message_at: r.last_message_at,
          unread_count: isCleared ? 0 : parseInt(r.unread_count || 0, 10),
          is_blocked: isBlocked,
          blocked_by_me: blockedByMe,
          is_blocked_by_other: blockedByOther,
          blocked_by_them: blockedByOther,
          background: {
            image_url: r.background_image || null,
            imageUrl: r.background_image || null,
            background_image: r.background_image || null,
            backgroundImage: r.background_image || null,
            color: r.background_color || null,
            background_color: r.background_color || null,
            backgroundColor: r.background_color || null,
            updated_by: r.background_updated_by || null,
            updated_at: r.background_updated_at || null,
          },
          background_image: r.background_image || null,
          background_color: r.background_color || null,
          other_user: {
            id: r.other_user_id,
            name: r.other_name || 'Anonymous',
            profile_picture: r.other_avatar || null,
            role: r.other_role || 'user',
            level: r.other_level || 1,
            star: r.other_star || 0,
            package_category: packageCategory,
            is_blocked: isBlocked,
            blocked_by_me: blockedByMe,
            is_blocked_by_other: blockedByOther,
            blocked_by_them: blockedByOther,
          },
        };
      });

      return {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        items,
      };
    });

    return res.status(200).json({
      success: true,
      page: result.page,
      limit: result.limit,
      total: result.total,
      total_pages: result.total_pages,
      conversations: result.items,
    });
  } catch (error) {
    console.error('[ChatController.getConversations] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations.',
      error: error.message,
    });
  }
};

/**
 * 2. Get Messages for a Conversation
 * GET /api/mobile/chat/conversations/:id/messages
 * Also supports querying by other user ID: GET /api/mobile/chat/messages/:otherUserId
 */
export const getMessages = async (req, res) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  let conversationId = req.params.conversationId ? parseInt(req.params.conversationId, 10) : null;
  const otherUserId = req.params.otherUserId ? parseInt(req.params.otherUserId, 10) : null;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '30', 10)));
  const offset = (page - 1) * limit;

  try {
    // If conversationId not directly provided, find by otherUserId
    if (!conversationId && otherUserId) {
      const u1 = Math.min(currentUserId, otherUserId);
      const u2 = Math.max(currentUserId, otherUserId);
      const convRows = await query(
        'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ? LIMIT 1',
        [u1, u2]
      );
      if (convRows && convRows.length > 0) {
        conversationId = convRows[0].id;
      } else {
        // No conversation started yet
        return res.status(200).json({
          success: true,
          conversation_id: null,
          total: 0,
          page,
          limit,
          total_pages: 0,
          messages: [],
        });
      }
    }

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID or other user ID required.' });
    }

    // Verify conversation access
    const convRows = await query('SELECT * FROM conversations WHERE id = ? LIMIT 1', [conversationId]);
    if (!convRows || convRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const conversation = convRows[0];
    const isParticipant = conversation.user1_id === currentUserId || conversation.user2_id === currentUserId;
    if (!isParticipant && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

    // 1. Mark incoming unread messages as read in MySQL SSOT
    const updateResult = await query(
      'UPDATE chat_messages SET is_read = TRUE WHERE conversation_id = ? AND receiver_id = ? AND is_read = FALSE',
      [conversationId, currentUserId]
    );

    // If any messages were marked read, notify via Socket.IO
    if (updateResult.affectedRows > 0) {
      const partnerId = conversation.user1_id === currentUserId ? conversation.user2_id : conversation.user1_id;
      req.io?.to(`user_${partnerId}`).emit('chat:messages_read', {
        conversation_id: conversationId,
        read_by: currentUserId,
      });
      req.io?.to(`conversation_${conversationId}`).emit('chat:messages_read', {
        conversation_id: conversationId,
        read_by: currentUserId,
      });
      await invalidateChatCache(currentUserId, partnerId, conversationId);
    }

    // 2. Determine if user cleared past messages
    const clearedAt = conversation.user1_id === currentUserId ? conversation.user1_cleared_at : conversation.user2_cleared_at;

    // 3. Fetch paginated messages using Redis Cache-Aside (namespaced per caller)
    const cacheKey = `chat:messages:${conversationId}:u:${currentUserId}:page:${page}:limit:${limit}`;
    const TTL = 30; // 30 seconds

    const result = await cache.getOrSet(cacheKey, TTL, async () => {
      const countSql = clearedAt
        ? 'SELECT COUNT(*) as total FROM chat_messages WHERE conversation_id = ? AND created_at > ?'
        : 'SELECT COUNT(*) as total FROM chat_messages WHERE conversation_id = ?';
      const countParams = clearedAt ? [conversationId, clearedAt] : [conversationId];
      const countRows = await query(countSql, countParams);
      const total = countRows?.[0]?.total || 0;

      const selectSql = `
        SELECT 
          m.id,
          m.conversation_id,
          m.sender_id,
          m.receiver_id,
          m.reply_to_id,
          m.message_type,
          m.message,
          m.media_url,
          m.media,
          m.is_read,
          m.created_at,
          u_send.full_name as sender_name,
          u_send.avatar_url as sender_avatar,
          u_send.role as sender_role,
          u_send.level as sender_level,
          u_send.star as sender_star,
          u_send.vip_package as sender_vip_package,
          pc.id as package_category_id,
          pc.name as package_category_name,
          pc.badge_icon as package_badge_icon,
          pc.color_code as package_color_code,
          m_rep.id as reply_msg_id,
          m_rep.sender_id as reply_sender_id,
          m_rep.message_type as reply_message_type,
          m_rep.message as reply_message,
          m_rep.media_url as reply_media_url,
          u_rep.full_name as reply_sender_name
        FROM chat_messages m
        JOIN users u_send ON u_send.id = m.sender_id
        LEFT JOIN chat_messages m_rep ON m_rep.id = m.reply_to_id
        LEFT JOIN users u_rep ON u_rep.id = m_rep.sender_id
        LEFT JOIN user_package_subscriptions ups 
          ON ups.user_id = u_send.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
        LEFT JOIN package_categories pc 
          ON pc.id = ups.category_id AND pc.is_active = 1
        WHERE m.conversation_id = ? ${clearedAt ? 'AND m.created_at > ?' : ''}
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const selectParams = clearedAt
        ? [conversationId, clearedAt, limit, offset]
        : [conversationId, limit, offset];
      const messagesRaw = await query(selectSql, selectParams);

      // Fetch media attachments from chat_message_media for any messages with attachments
      const messageIds = messagesRaw.map((m) => m.id);
      let mediaByMsgId = {};

      if (messageIds.length > 0) {
        const placeholders = messageIds.map(() => '?').join(',');
        const mediaRows = await query(
          `SELECT id, message_id, media_type, media_url, thumbnail_url, file_name, file_size, duration, display_order 
           FROM chat_message_media 
           WHERE message_id IN (${placeholders}) 
           ORDER BY display_order ASC, id ASC`,
          messageIds
        ).catch(() => []);

        mediaRows.forEach((item) => {
          if (!mediaByMsgId[item.message_id]) mediaByMsgId[item.message_id] = [];
          mediaByMsgId[item.message_id].push(item);
        });
      }

      const rawItems = messagesRaw.map((m) => {
        let parsedMedia = [];
        if (mediaByMsgId[m.id] && mediaByMsgId[m.id].length > 0) {
          parsedMedia = mediaByMsgId[m.id];
        } else if (m.media) {
          try {
            parsedMedia = typeof m.media === 'string' ? JSON.parse(m.media) : m.media;
          } catch (e) {
            parsedMedia = [];
          }
        } else if (m.media_url) {
          parsedMedia = [
            {
              media_type: m.message_type || 'image',
              media_url: m.media_url,
              thumbnail_url: null,
              duration: 0,
            },
          ];
        }

        const packageCategory = extractPackageCategory({
          package_category_id: m.package_category_id,
          package_category_name: m.package_category_name,
          package_badge_icon: m.package_badge_icon,
          package_color_code: m.package_color_code,
          vip_package: m.sender_vip_package,
        });

        return {
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          receiver_id: m.receiver_id,
          reply_to_id: m.reply_to_id || null,
          reply_to: m.reply_to_id ? {
            id: m.reply_to_id,
            sender_id: m.reply_sender_id,
            sender_name: m.reply_sender_name || 'User',
            message_type: m.reply_message_type || 'text',
            message: m.reply_message,
            media_url: m.reply_media_url || null,
          } : null,
          message_type: m.message_type,
          message: m.message,
          media_url: m.media_url,
          media: parsedMedia,
          is_read: !!m.is_read,
          created_at: m.created_at,
          sender: {
            id: m.sender_id,
            name: m.sender_name || 'Anonymous',
            profile_picture: m.sender_avatar || null,
            role: m.sender_role || 'user',
            level: m.sender_level || 1,
            star: m.sender_star || 0,
            package_category: packageCategory,
          },
        };
      });

      return { total, rawItems };
    });

    const messages = (result.rawItems || []).map((m) => ({
      ...m,
      is_mine: m.sender_id === currentUserId,
    }));

    // Return in chronological order (oldest to newest) for messaging UI
    messages.reverse();

    const partnerId = conversation.user1_id === currentUserId ? conversation.user2_id : conversation.user1_id;
    let isBlocked = false;
    let blockedByMe = false;
    let blockedByOther = false;

    const blockRows = await query(
      `SELECT blocker_id, blocked_id FROM user_blocks 
       WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
      [currentUserId, partnerId, partnerId, currentUserId]
    ).catch(() => []);

    if (blockRows.length > 0) {
      blockedByMe = blockRows.some((b) => b.blocker_id === currentUserId);
      blockedByOther = blockRows.some((b) => b.blocker_id === partnerId);
      isBlocked = blockedByMe || blockedByOther;
    }

    return res.status(200).json({
      success: true,
      conversation_id: conversationId,
      partner_id: partnerId,
      is_blocked: isBlocked,
      blocked_by_me: blockedByMe,
      is_blocked_by_other: blockedByOther,
      blocked_by_them: blockedByOther,
      background: {
        image_url: conversation.background_image || null,
        imageUrl: conversation.background_image || null,
        background_image: conversation.background_image || null,
        backgroundImage: conversation.background_image || null,
        color: conversation.background_color || null,
        background_color: conversation.background_color || null,
        backgroundColor: conversation.background_color || null,
        updated_by: conversation.background_updated_by || null,
        updated_at: conversation.background_updated_at || null,
      },
      background_image: conversation.background_image || null,
      background_color: conversation.background_color || null,
      total: result.total,
      page,
      limit,
      total_pages: Math.ceil(result.total / limit),
      messages,
    });
  } catch (error) {
    console.error('[ChatController.getMessages] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch messages.',
      error: error.message,
    });
  }
};

/**
 * 3. Send Message (Text & Multiple Images / Video Attachments from Device)
 * POST /api/mobile/chat/messages
 */
export const sendMessage = async (req, res) => {
  const senderId = req.user?.id;
  if (!senderId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const rawMessage = req.body.message ?? req.body.content ?? req.body.text ?? '';
  const { receiver_id, conversation_id } = req.body;
  const rawReplyToId = req.body.reply_to_id ?? req.body.reply_to_message_id ?? req.body.replyToId ?? null;
  const replyToId = rawReplyToId ? parseInt(rawReplyToId, 10) : null;
  let targetReceiverId = receiver_id ? parseInt(receiver_id, 10) : null;
  let targetConvId = conversation_id ? parseInt(conversation_id, 10) : null;

  // Gather media attachments from multipart uploadedMedia or body JSON
  let mediaItems = [];
  if (req.uploadedMedia && Array.isArray(req.uploadedMedia) && req.uploadedMedia.length > 0) {
    mediaItems = req.uploadedMedia;
  } else if (req.body.media || req.body.attachments || req.body.media_files) {
    const rawMedia = req.body.media || req.body.attachments || req.body.media_files;
    try {
      mediaItems = typeof rawMedia === 'string' ? JSON.parse(rawMedia) : rawMedia;
    } catch (e) {
      mediaItems = [];
    }
  } else if (req.body.media_url || req.body.url || req.body.file_url) {
    mediaItems = [
      {
        media_type: req.body.media_type || req.body.type || 'image',
        media_url: req.body.media_url || req.body.url || req.body.file_url,
        thumbnail_url: req.body.thumbnail_url || null,
        duration: parseInt(req.body.duration || 0, 10),
      },
    ];
  }

  const cleanMessage = typeof rawMessage === 'string' ? rawMessage.trim() : '';

  if (!cleanMessage && mediaItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Message cannot be empty. Please provide text or attach image/video.',
    });
  }

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Determine receiverId and conversationId
    if (!targetReceiverId && targetConvId) {
      const [convRow] = await conn.execute(
        'SELECT user1_id, user2_id FROM conversations WHERE id = ? LIMIT 1',
        [targetConvId]
      );
      if (!convRow || convRow.length === 0) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Conversation not found.' });
      }
      targetReceiverId = convRow[0].user1_id === senderId ? convRow[0].user2_id : convRow[0].user1_id;
    }

    if (!targetReceiverId) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Recipient user ID is required.' });
    }

    if (targetReceiverId === senderId) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Cannot send message to yourself.' });
    }

    // Ensure recipient exists and is not banned
    const [recipRows] = await conn.execute('SELECT id, full_name, avatar_url, role FROM users WHERE id = ? LIMIT 1', [
      targetReceiverId,
    ]);
    if (!recipRows || recipRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Recipient user not found.' });
    }

    // Check if either user has blocked the other
    const [blockRows] = await conn.execute(
      `SELECT blocker_id, blocked_id FROM user_blocks 
       WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1`,
      [senderId, targetReceiverId, targetReceiverId, senderId]
    );

    if (blockRows && blockRows.length > 0) {
      const isBlockedByMe = blockRows[0].blocker_id === senderId;
      await conn.rollback();
      return res.status(403).json({
        success: false,
        message: isBlockedByMe
          ? 'You have blocked this user. Unblock them to send a message.'
          : 'You cannot send a message because you have been blocked by this user.',
        is_blocked: true,
        blocked_by_me: isBlockedByMe,
        is_blocked_by_other: !isBlockedByMe,
        blocked_by_them: !isBlockedByMe,
      });
    }

    // Get or create conversation row
    targetConvId = await getOrCreateConversation(conn, senderId, targetReceiverId);

    // Determine message_type
    let primaryType = 'text';
    if (mediaItems.length === 1) {
      primaryType = mediaItems[0].media_type || 'image';
    } else if (mediaItems.length > 1) {
      const types = new Set(mediaItems.map((m) => m.media_type));
      primaryType = types.size === 1 ? mediaItems[0].media_type : 'multiple';
    }

    const primaryMediaUrl = mediaItems.length > 0 ? mediaItems[0].media_url : null;

    // Compose last_message snippet for conversation preview
    let lastMessageSnippet = cleanMessage;
    if (!lastMessageSnippet) {
      if (primaryType === 'video') lastMessageSnippet = '🎥 [Video]';
      else if (primaryType === 'audio') lastMessageSnippet = '🎵 [Audio]';
      else if (primaryType === 'multiple') lastMessageSnippet = `📎 [${mediaItems.length} Attachments]`;
      else lastMessageSnippet = '🖼️ [Photo]';
    }

    // Check quoted message if replying
    let quotedMessage = null;
    if (replyToId) {
      const [qRows] = await conn.execute(
        `SELECT m.id, m.sender_id, m.message_type, m.message, m.media_url, u.full_name as sender_name 
         FROM chat_messages m 
         JOIN users u ON u.id = m.sender_id 
         WHERE m.id = ? AND m.conversation_id = ? LIMIT 1`,
        [replyToId, targetConvId]
      );
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

    // 1. Insert into chat_messages table (MySQL SSOT write)
    const [msgResult] = await conn.execute(
      `INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, reply_to_id, message_type, message, media_url, media, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
      [
        targetConvId,
        senderId,
        targetReceiverId,
        quotedMessage ? quotedMessage.id : null,
        primaryType,
        cleanMessage || null,
        primaryMediaUrl,
        mediaItems.length > 0 ? JSON.stringify(mediaItems) : null,
      ]
    );

    const messageId = msgResult.insertId;

    // 2. Insert into chat_message_media table if media attached
    if (mediaItems.length > 0) {
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        const mType = ['image', 'video', 'audio'].includes(item.media_type) ? item.media_type : 'image';
        const mUrl = item.media_url || item.url || '';
        if (mUrl) {
          await conn.execute(
            `INSERT INTO chat_message_media (message_id, media_type, media_url, thumbnail_url, file_name, file_size, duration, display_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              messageId,
              mType,
              mUrl,
              item.thumbnail_url || null,
              item.original_name || item.filename || null,
              parseInt(item.size || 0, 10),
              parseInt(item.duration || 0, 10),
              item.display_order || i + 1,
            ]
          );
        }
      }
    }

    // 3. Update conversation last message, timestamp and unhide for both users
    await conn.execute(
      'UPDATE conversations SET last_message = ?, last_message_at = NOW(), user1_hidden = 0, user2_hidden = 0 WHERE id = ?',
      [lastMessageSnippet, targetConvId]
    );

    await conn.commit();

    // 4. Instant Redis cache invalidation
    await invalidateChatCache(senderId, targetReceiverId, targetConvId);

    // 5. Build full message response model
    const senderRows = await query(
      `SELECT 
         u.id, u.full_name, u.avatar_url, u.role, u.level, u.star, u.vip_package,
         pc.id as package_category_id, pc.name as package_category_name, 
         pc.badge_icon as package_badge_icon, pc.color_code as package_color_code
       FROM users u
       LEFT JOIN user_package_subscriptions ups 
         ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
       LEFT JOIN package_categories pc 
         ON pc.id = ups.category_id AND pc.is_active = 1
       WHERE u.id = ? LIMIT 1`,
      [senderId]
    );

    const senderProfile = senderRows?.[0] || {};
    const packageCategory = extractPackageCategory(senderProfile);

    const newMessage = {
      id: messageId,
      conversation_id: targetConvId,
      sender_id: senderId,
      receiver_id: targetReceiverId,
      reply_to_id: quotedMessage ? quotedMessage.id : null,
      reply_to: quotedMessage,
      message_type: primaryType,
      message: cleanMessage,
      media_url: primaryMediaUrl,
      media: mediaItems,
      is_read: false,
      is_mine: true,
      created_at: new Date().toISOString(),
      sender: {
        id: senderId,
        name: senderProfile.full_name || 'Anonymous',
        profile_picture: senderProfile.avatar_url || null,
        role: senderProfile.role || 'user',
        level: senderProfile.level || 1,
        star: senderProfile.star || 0,
        package_category: packageCategory,
      },
    };

    // 6. Broadcast Real-Time Events via Socket.IO
    if (req.io) {
      const socketPayload = {
        message: newMessage,
        conversation_id: targetConvId,
        sender_id: senderId,
        receiver_id: targetReceiverId,
      };

      // Real-time message delivered to receiver and sender user rooms
      req.io.to(`user_${targetReceiverId}`).emit('chat:new_message', socketPayload);
      req.io.to(`user_${senderId}`).emit('chat:new_message', socketPayload);

      // Real-time message delivered to conversation room if active
      req.io.to(`conversation_${targetConvId}`).emit('chat:new_message', socketPayload);

      // Real-time conversation list updates
      req.io.to(`user_${targetReceiverId}`).emit('chat:conversation_update', {
        conversation_id: targetConvId,
        last_message: lastMessageSnippet,
        last_message_at: newMessage.created_at,
        sender_id: senderId,
        unread_increment: true,
      });

      req.io.to(`user_${senderId}`).emit('chat:conversation_update', {
        conversation_id: targetConvId,
        last_message: lastMessageSnippet,
        last_message_at: newMessage.created_at,
        sender_id: senderId,
        unread_increment: false,
      });
    }

    // 7. Trigger Firebase Cloud Messaging (FCM) Push Notification to recipient
    sendChatPushNotification({
      receiverId: targetReceiverId,
      sender: {
        id: senderId,
        name: senderProfile.full_name || 'Someone',
        full_name: senderProfile.full_name || 'Someone',
        avatar_url: senderProfile.avatar_url || null,
        profile_picture: senderProfile.avatar_url || null,
      },
      message: cleanMessage,
      conversationId: targetConvId,
      media: mediaItems,
      primaryType,
    }).catch((pushErr) => console.error('[ChatController FCM] Non-blocking push error:', pushErr.message));

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully.',
      data: newMessage,
    });
  } catch (error) {
    await conn.rollback();
    console.error('[ChatController.sendMessage] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message.',
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

/**
 * 4. Direct Device Media Upload for Chats (Multiple Images & Video)
 * POST /api/mobile/chat/upload
 */
export const uploadChatMediaDirect = async (req, res) => {
  try {
    if (!req.uploadedMedia || req.uploadedMedia.length === 0) {
      if (req.file) {
        const ext = path.extname(req.file.originalname).toLowerCase();
        const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v', '.3gp'];
        const audioExts = ['.mp3', '.wav', '.aac', '.ogg', '.m4a'];
        let mType = 'image';
        if (videoExts.includes(ext)) mType = 'video';
        else if (audioExts.includes(ext)) mType = 'audio';

        return res.status(200).json({
          success: true,
          message: 'Media uploaded successfully.',
          media: [
            {
              media_type: mType,
              media_url: `/uploads/chat/${req.file.filename}`,
              filename: req.file.filename,
              original_name: req.file.originalname,
              size: req.file.size,
              display_order: 1,
            },
          ],
        });
      }

      return res.status(400).json({
        success: false,
        message: 'No media file provided. Please attach image or video file.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chat media files uploaded successfully.',
      count: req.uploadedMedia.length,
      media: req.uploadedMedia,
    });
  } catch (error) {
    console.error('[ChatController.uploadChatMediaDirect] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload chat media.',
      error: error.message,
    });
  }
};

/**
 * 5. Mark Conversation as Read
 * PUT /api/mobile/chat/conversations/:id/read
 */
export const markConversationRead = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = parseInt(req.params.id, 10);

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (!conversationId || isNaN(conversationId)) {
    return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
  }

  try {
    const convRows = await query('SELECT user1_id, user2_id FROM conversations WHERE id = ? LIMIT 1', [
      conversationId,
    ]);
    if (!convRows || convRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const partnerId = convRows[0].user1_id === userId ? convRows[0].user2_id : convRows[0].user1_id;

    // MySQL SSOT write
    await query(
      'UPDATE chat_messages SET is_read = TRUE WHERE conversation_id = ? AND receiver_id = ? AND is_read = FALSE',
      [conversationId, userId]
    );

    // Instant Redis invalidation
    await invalidateChatCache(userId, partnerId, conversationId);

    // Socket.IO notification to partner that messages have been read
    if (req.io) {
      req.io.to(`user_${partnerId}`).emit('chat:messages_read', {
        conversation_id: conversationId,
        read_by: userId,
      });
      req.io.to(`conversation_${conversationId}`).emit('chat:messages_read', {
        conversation_id: conversationId,
        read_by: userId,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Messages marked as read.',
    });
  } catch (error) {
    console.error('[ChatController.markConversationRead] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read.',
      error: error.message,
    });
  }
};

/**
 * 6. Remove / Delete Conversation for Current User
 * DELETE /api/mobile/chat/conversations/:id
 * DELETE /api/mobile/chat/messages/:otherUserId
 * 
 * Supports soft removal (hiding from caller's inbox and clearing messages for caller)
 * or hard deletion via ?hard=true
 */
export const deleteConversation = async (req, res) => {
  const userId = req.user?.id;
  let conversationId = req.params.id ? parseInt(req.params.id, 10) : null;
  const otherUserId = req.params.otherUserId ? parseInt(req.params.otherUserId, 10) : null;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    if (!conversationId && otherUserId) {
      const u1 = Math.min(userId, otherUserId);
      const u2 = Math.max(userId, otherUserId);
      const convRows = await query(
        'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ? LIMIT 1',
        [u1, u2]
      );
      if (convRows && convRows.length > 0) {
        conversationId = convRows[0].id;
      }
    }

    if (!conversationId || isNaN(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
    }

    const convRows = await query('SELECT * FROM conversations WHERE id = ? LIMIT 1', [
      conversationId,
    ]);
    if (!convRows || convRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const conversation = convRows[0];
    const isParticipant = conversation.user1_id === userId || conversation.user2_id === userId;
    if (!isParticipant && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

    const partnerId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
    const isHardDelete = req.query.hard === 'true';

    if (isHardDelete) {
      // Hard delete from DB
      await query('DELETE FROM conversations WHERE id = ?', [conversationId]);
    } else {
      // Soft removal from caller's inbox + clear caller's message history
      const isUser1 = conversation.user1_id === userId;
      const hideField = isUser1 ? 'user1_hidden' : 'user2_hidden';
      const clearField = isUser1 ? 'user1_cleared_at' : 'user2_cleared_at';
      const otherHidden = isUser1 ? conversation.user2_hidden : conversation.user1_hidden;

      if (otherHidden === 1) {
        // Both users deleted this conversation -> safe to completely delete
        await query('DELETE FROM conversations WHERE id = ?', [conversationId]);
      } else {
        await query(
          `UPDATE conversations SET ${hideField} = 1, ${clearField} = NOW() WHERE id = ?`,
          [conversationId]
        );
      }
    }

    // Instant Redis invalidation
    await invalidateChatCache(userId, partnerId, conversationId);

    if (req.io) {
      req.io.to(`user_${userId}`).emit('chat:conversation_deleted', { conversation_id: conversationId });
      if (isHardDelete) {
        req.io.to(`user_${partnerId}`).emit('chat:conversation_deleted', { conversation_id: conversationId });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation removed from your inbox successfully.',
      conversation_id: conversationId,
    });
  } catch (error) {
    console.error('[ChatController.deleteConversation] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete conversation.',
      error: error.message,
    });
  }
};

/**
 * 6a. Clear All Messages in a Conversation for Current User Only
 * POST /api/mobile/chat/conversations/:id/clear
 * POST /api/mobile/chat/messages/:otherUserId/clear
 * 
 * Clears messages for caller while the other participant keeps full chat history.
 */
export const clearChatMessages = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  let conversationId = req.params.id ? parseInt(req.params.id, 10) : null;
  const otherUserId = req.params.otherUserId ? parseInt(req.params.otherUserId, 10) : null;

  try {
    if (!conversationId && otherUserId) {
      const u1 = Math.min(userId, otherUserId);
      const u2 = Math.max(userId, otherUserId);
      const convRows = await query(
        'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ? LIMIT 1',
        [u1, u2]
      );
      if (convRows && convRows.length > 0) {
        conversationId = convRows[0].id;
      }
    }

    if (!conversationId || isNaN(conversationId)) {
      return res.status(400).json({ success: false, message: 'Valid conversation ID is required.' });
    }

    const convRows = await query('SELECT * FROM conversations WHERE id = ? LIMIT 1', [conversationId]);
    if (!convRows || convRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const conversation = convRows[0];
    const isParticipant = conversation.user1_id === userId || conversation.user2_id === userId;
    if (!isParticipant && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

    const partnerId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

    // Clear chat ONLY for this user by recording cleared_at
    const clearedField = conversation.user1_id === userId ? 'user1_cleared_at' : 'user2_cleared_at';
    await query(
      `UPDATE conversations SET ${clearedField} = NOW() WHERE id = ?`,
      [conversationId]
    );

    // Instant Redis cache invalidation
    await invalidateChatCache(userId, partnerId, conversationId);

    const clearedAt = new Date().toISOString();

    // Notify caller's socket so client immediately clears message list in UI
    if (req.io) {
      req.io.to(`user_${userId}`).emit('chat:chat_cleared', {
        conversation_id: conversationId,
        cleared_by: userId,
        cleared_at: clearedAt,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'All messages cleared for your account. The other user will still see their chat history.',
      conversation_id: conversationId,
      cleared_at: clearedAt,
    });
  } catch (error) {
    console.error('[ChatController.clearChatMessages] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear chat messages.',
      error: error.message,
    });
  }
};

/**
 * 6b. Set / Change Chat Background (Shared for Both Participants)
 * PUT /api/mobile/chat/conversations/:id/background
 * POST /api/mobile/chat/conversations/:id/background
 * PUT /api/mobile/chat/messages/:otherUserId/background
 */
export const updateConversationBackground = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  let conversationId = req.params.id ? parseInt(req.params.id, 10) : null;
  const otherUserId = req.params.otherUserId ? parseInt(req.params.otherUserId, 10) : null;

  try {
    if (!conversationId && otherUserId) {
      const u1 = Math.min(userId, otherUserId);
      const u2 = Math.max(userId, otherUserId);
      const convRows = await query(
        'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ? LIMIT 1',
        [u1, u2]
      );
      if (convRows && convRows.length > 0) {
        conversationId = convRows[0].id;
      } else {
        const pool = getPool();
        const conn = await pool.getConnection();
        try {
          conversationId = await getOrCreateConversation(conn, userId, otherUserId);
        } finally {
          conn.release();
        }
      }
    }

    if (!conversationId || isNaN(conversationId)) {
      return res.status(400).json({ success: false, message: 'Valid conversation ID is required.' });
    }

    const convRows = await query('SELECT * FROM conversations WHERE id = ? LIMIT 1', [conversationId]);
    if (!convRows || convRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const conversation = convRows[0];
    const isParticipant = conversation.user1_id === userId || conversation.user2_id === userId;
    if (!isParticipant && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

    const partnerId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

    // Check uploaded image or body image
    let bgImage = req.body.background_image || req.body.image_url || null;
    if (req.uploadedMedia && req.uploadedMedia.length > 0) {
      bgImage = req.uploadedMedia[0].media_url;
    } else if (req.file) {
      bgImage = `/uploads/chat/${req.file.filename}`;
    }

    const bgColor = req.body.background_color || req.body.color || null;

    if (!bgImage && !bgColor) {
      return res.status(400).json({
        success: false,
        message: 'Please provide background_image (file or URL) or background_color.',
      });
    }

    // MySQL SSOT write
    await query(
      `UPDATE conversations 
       SET background_image = ?, background_color = ?, background_updated_by = ?, background_updated_at = NOW() 
       WHERE id = ?`,
      [bgImage, bgColor, userId, conversationId]
    );

    // Instant Redis cache invalidation
    await invalidateChatCache(userId, partnerId, conversationId);

    const backgroundData = {
      conversation_id: conversationId,
      image_url: bgImage,
      imageUrl: bgImage,
      background_image: bgImage,
      backgroundImage: bgImage,
      color: bgColor,
      background_color: bgColor,
      backgroundColor: bgColor,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    // Real-time broadcast to both users and conversation room
    if (req.io) {
      req.io.to(`user_${partnerId}`).emit('chat:background_updated', backgroundData);
      req.io.to(`user_${userId}`).emit('chat:background_updated', backgroundData);
      req.io.to(`conversation_${conversationId}`).emit('chat:background_updated', backgroundData);
    }

    return res.status(200).json({
      success: true,
      message: 'Chat background updated successfully for this conversation.',
      background: backgroundData,
    });
  } catch (error) {
    console.error('[ChatController.updateConversationBackground] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update chat background.',
      error: error.message,
    });
  }
};

/**
 * 6c. Remove / Reset Chat Background (Shared for Both Participants)
 * DELETE /api/mobile/chat/conversations/:id/background
 * DELETE /api/mobile/chat/messages/:otherUserId/background
 */
export const removeConversationBackground = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  let conversationId = req.params.id ? parseInt(req.params.id, 10) : null;
  const otherUserId = req.params.otherUserId ? parseInt(req.params.otherUserId, 10) : null;

  try {
    if (!conversationId && otherUserId) {
      const u1 = Math.min(userId, otherUserId);
      const u2 = Math.max(userId, otherUserId);
      const convRows = await query(
        'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ? LIMIT 1',
        [u1, u2]
      );
      if (convRows && convRows.length > 0) {
        conversationId = convRows[0].id;
      }
    }

    if (!conversationId || isNaN(conversationId)) {
      return res.status(400).json({ success: false, message: 'Valid conversation ID is required.' });
    }

    const convRows = await query('SELECT * FROM conversations WHERE id = ? LIMIT 1', [conversationId]);
    if (!convRows || convRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const conversation = convRows[0];
    const isParticipant = conversation.user1_id === userId || conversation.user2_id === userId;
    if (!isParticipant && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

    const partnerId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

    // MySQL SSOT write - reset background
    await query(
      `UPDATE conversations 
       SET background_image = NULL, background_color = NULL, background_updated_by = ?, background_updated_at = NOW() 
       WHERE id = ?`,
      [userId, conversationId]
    );

    // Instant Redis cache invalidation
    await invalidateChatCache(userId, partnerId, conversationId);

    const backgroundData = {
      conversation_id: conversationId,
      image_url: null,
      imageUrl: null,
      background_image: null,
      backgroundImage: null,
      color: null,
      background_color: null,
      backgroundColor: null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    // Real-time broadcast to both users and conversation room
    if (req.io) {
      req.io.to(`user_${partnerId}`).emit('chat:background_updated', backgroundData);
      req.io.to(`user_${userId}`).emit('chat:background_updated', backgroundData);
      req.io.to(`conversation_${conversationId}`).emit('chat:background_updated', backgroundData);
    }

    return res.status(200).json({
      success: true,
      message: 'Chat background removed successfully.',
      background: backgroundData,
    });
  } catch (error) {
    console.error('[ChatController.removeConversationBackground] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove chat background.',
      error: error.message,
    });
  }
};

/**
 * 7. Search Users for Direct Chat (by User ID or Name)
 * GET /api/mobile/chat/users/search?q=:query
 * GET /api/mobile/chat/search-users?query=:query
 *
 * Supports:
 * - Numeric ID search: exact match on user ID or partial match
 * - Text search: case-insensitive partial match on full_name or email
 * - Empty query: returns suggested active users
 * - Automatically checks if an existing 1-on-1 conversation exists and returns conversation_id
 * - Excludes current authenticated user and banned users
 * - Cached via Redis Cache-Aside
 */
export const searchUsersForChat = async (req, res) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const rawQuery = String(req.query.q || req.query.query || '').trim();
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const offset = (page - 1) * limit;

  // Cache key per query and current user
  const cacheKey = `chat:search_users:${currentUserId}:${encodeURIComponent(rawQuery)}:p:${page}:l:${limit}`;
  const TTL = 20; // 20 seconds cache

  try {
    const result = await cache.getOrSet(cacheKey, TTL, async () => {
      let whereConditions = ['u.id != ?', 'u.is_banned = 0', "u.role != 'superadmin'"];
      let queryParams = [currentUserId];

      if (rawQuery.length > 0) {
        const isNumeric = /^\d+$/.test(rawQuery);
        if (isNumeric) {
          whereConditions.push('(u.id = ? OR u.full_name LIKE ? OR u.email LIKE ?)');
          queryParams.push(parseInt(rawQuery, 10), `%${rawQuery}%`, `%${rawQuery}%`);
        } else {
          whereConditions.push('(u.full_name LIKE ? OR u.email LIKE ?)');
          queryParams.push(`%${rawQuery}%`, `%${rawQuery}%`);
        }
      }

      const whereClause = whereConditions.join(' AND ');

      // Total count
      const countSql = `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`;
      const countRows = await query(countSql, queryParams);
      const total = countRows?.[0]?.total || 0;

      // Select users with existing conversation detection
      const selectSql = `
        SELECT 
          u.id,
          u.full_name,
          u.avatar_url,
          u.bio,
          u.role,
          u.level,
          u.vip_package,
          pc.id as package_category_id,
          pc.name as package_category_name,
          pc.badge_icon as package_badge_icon,
          pc.color_code as package_color_code,
          c.id as conversation_id,
          c.last_message,
          c.last_message_at
        FROM users u
        LEFT JOIN user_package_subscriptions ups ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW()
        LEFT JOIN package_categories pc ON pc.id = ups.category_id
        LEFT JOIN conversations c ON (
          (c.user1_id = LEAST(?, u.id) AND c.user2_id = GREATEST(?, u.id))
        )
        WHERE ${whereClause}
        ORDER BY 
          CASE WHEN c.id IS NOT NULL THEN 0 ELSE 1 END ASC,
          u.level DESC,
          u.id ASC
        LIMIT ? OFFSET ?
      `;

      const selectParams = [currentUserId, currentUserId, ...queryParams, limit, offset];
      const rows = await query(selectSql, selectParams);

      const users = (rows || []).map((row) => ({
        id: row.id,
        full_name: row.full_name,
        name: row.full_name,
        avatar_url: row.avatar_url,
        profile: row.avatar_url,
        bio: row.bio || '',
        role: row.role || 'user',
        level: row.level || 1,
        vip_package: row.vip_package || 'Standard',
        package_category: extractPackageCategory(row),
        conversation_id: row.conversation_id || null,
        has_existing_chat: Boolean(row.conversation_id),
        last_message: row.last_message || null,
        last_message_at: row.last_message_at || null,
      }));

      return {
        users,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit),
          has_more: page * limit < total,
        },
      };
    });

    return res.status(200).json({
      success: true,
      query: rawQuery,
      ...result,
    });
  } catch (error) {
    console.error('[ChatController.searchUsersForChat] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search users for chat.',
      error: error.message,
    });
  }
};
