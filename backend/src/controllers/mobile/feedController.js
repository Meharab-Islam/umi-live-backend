import path from 'path';
import { query, getPool } from '../../config/db.js';
import { cache } from '../../config/redis.js';
import {
  sendPostCommentPushNotification,
  sendCommentReplyPushNotification,
  sendNewPostPushNotification,
} from '../../config/firebase.js';
import { notifyComment, notifyCommentReply } from '../../services/notificationService.js';

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
 * Invalidate all relevant Redis feed keys safely
 */
const invalidateFeedCache = async (postId = null) => {
  try {
    await cache.delByPattern('feed:list:*');
    if (postId) {
      await cache.del(`feed:post:${postId}`);
      await cache.delByPattern(`feed:comments:${postId}:*`);
      await cache.delByPattern(`feed:reactions:${postId}:*`);
    }
  } catch (err) {
    console.warn('[FeedCache] Invalidation warning:', err.message);
  }
};

/**
 * Auto-Heal & Ensure Feed Database Schema
 * Automatically verifies that 'title', 'media' and auxiliary tables exist
 * to completely eliminate 'Unknown column title' 500 crashes across all MySQL versions.
 */
let isFeedSchemaVerified = false;
export const ensureFeedSchema = async () => {
  if (isFeedSchemaVerified) return;
  try {
    const pool = getPool();
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND COLUMN_NAME IN ('title', 'media')`
    );
    const existingColNames = (cols || []).map((c) => c.COLUMN_NAME);

    if (!existingColNames.includes('title')) {
      await pool.query('ALTER TABLE posts ADD COLUMN title VARCHAR(255) NULL AFTER user_id');
      console.log('✅ [Self-Healing] Added missing `title` column to `posts` table.');
    }
    if (!existingColNames.includes('media')) {
      await pool.query('ALTER TABLE posts ADD COLUMN media JSON NULL AFTER media_type');
      console.log('✅ [Self-Healing] Added missing `media` column to `posts` table.');
    }
    await pool.query("ALTER TABLE posts MODIFY COLUMN media_type ENUM('image','video','audio','multiple','none') DEFAULT 'none'").catch(() => {});

    // Ensure post_media table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_media (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        media_type ENUM('image', 'video', 'audio') NOT NULL,
        media_url TEXT NOT NULL,
        thumbnail_url TEXT NULL,
        duration INT DEFAULT 0,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_post_id (post_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `).catch(() => {});

    // Ensure post_reactions table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        reaction_type VARCHAR(20) DEFAULT 'like',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_post_user (post_id, user_id),
        INDEX idx_reaction_post (post_id),
        INDEX idx_reaction_user (user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `).catch(() => {});

    // Ensure post_comments table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        parent_id INT NULL,
        content TEXT NOT NULL,
        media_url VARCHAR(255) NULL,
        likes_count INT DEFAULT 0,
        replies_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_comment_post (post_id),
        INDEX idx_comment_parent (parent_id),
        INDEX idx_comment_user (user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES post_comments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `).catch(() => {});

    isFeedSchemaVerified = true;
  } catch (err) {
    console.warn('[Self-Healing] Schema verification warning:', err.message);
  }
};

/**
 * 1. Create a New Feed Post
 * Supports multiple images, videos, audio clips, text, title.
 * Accepts multipart/form-data via optionalFeedMediaUpload or application/json.
 * POST /api/mobile/feed
 */
export const createPost = async (req, res) => {
  await ensureFeedSchema();
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const { title = null, content = '' } = req.body;

  // Gather media attachments from either multipart uploadedMedia or body JSON
  let mediaItems = [];
  if (req.uploadedMedia && Array.isArray(req.uploadedMedia) && req.uploadedMedia.length > 0) {
    mediaItems.push(...req.uploadedMedia);
  }
  if (req.body.media) {
    let parsed = [];
    if (typeof req.body.media === 'string') {
      try {
        parsed = JSON.parse(req.body.media);
      } catch (e) {
        parsed = [];
      }
    } else if (Array.isArray(req.body.media)) {
      parsed = req.body.media;
    }
    mediaItems.push(...parsed);
  } else if (req.body.media_url && mediaItems.length === 0) {
    mediaItems = [
      {
        media_type: req.body.media_type || 'image',
        media_url: req.body.media_url,
        thumbnail_url: req.body.thumbnail_url || null,
        duration: parseInt(req.body.duration || '0', 10),
      },
    ];
  }

  mediaItems.forEach((item, idx) => {
    item.display_order = idx + 1;
  });

  // Validate that post has either content or media
  const cleanContent = typeof content === 'string' ? content.trim() : '';
  const cleanTitle = typeof title === 'string' && title.trim() ? title.trim() : null;

  if (!cleanContent && mediaItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Post must contain at least text content or one media attachment (image, video, or audio).',
    });
  }

  // Determine overall media_type
  let primaryMediaType = 'none';
  if (mediaItems.length === 1) {
    primaryMediaType = mediaItems[0].media_type || 'image';
  } else if (mediaItems.length > 1) {
    const types = new Set(mediaItems.map((m) => m.media_type));
    if (types.size === 1) {
      primaryMediaType = mediaItems[0].media_type;
    } else {
      primaryMediaType = 'multiple';
    }
  }

  const primaryMediaUrl = mediaItems.length > 0 ? mediaItems[0].media_url : '';

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Insert into posts table (MySQL SSOT)
    const [result] = await conn.execute(
      `INSERT INTO posts (user_id, title, content, media_url, media_type, media, likes_count, comments_count)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
      [
        userId,
        cleanTitle,
        cleanContent,
        primaryMediaUrl,
        primaryMediaType,
        mediaItems.length > 0 ? JSON.stringify(mediaItems) : null,
      ]
    );

    const postId = result.insertId;

    // 2. Insert into post_media table
    if (mediaItems.length > 0) {
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        const mType = ['image', 'video', 'audio'].includes(item.media_type) ? item.media_type : 'image';
        const mUrl = item.media_url || item.url || '';
        const thumbUrl = item.thumbnail_url || null;
        const dur = parseInt(item.duration || 0, 10);
        const order = item.display_order || i + 1;

        if (mUrl) {
          await conn.execute(
            `INSERT INTO post_media (post_id, media_type, media_url, thumbnail_url, duration, display_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [postId, mType, mUrl, thumbUrl, dur, order]
          );
        }
      }
    }

    await conn.commit();

    // 3. Instant Redis cache invalidation after commit
    await invalidateFeedCache();

    // 4. Retrieve newly created post with author details
    const authorRows = await query(
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
      [userId]
    );

    const author = authorRows?.[0] || {};
    const packageCategory = extractPackageCategory(author);

    const newPost = {
      id: postId,
      user_id: userId,
      title: cleanTitle,
      content: cleanContent,
      media_type: primaryMediaType,
      media_url: primaryMediaUrl,
      media: mediaItems,
      likes_count: 0,
      comments_count: 0,
      is_mine: true,
      has_reacted: false,
      my_reaction: null,
      author: {
        id: author.id,
        name: author.full_name || 'Anonymous',
        profile_picture: author.avatar_url || null,
        role: author.role || 'user',
        level: author.level || 1,
        star: author.star || 0,
        package_category: packageCategory,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 5. Trigger push notification to author's followers asynchronously
    sendNewPostPushNotification({
      postId,
      author: newPost.author,
      title: cleanTitle,
      content: cleanContent,
      mediaType: primaryMediaType,
      firstMediaUrl: primaryMediaUrl,
    }).catch((err) => console.error('[FCM] New post notification error:', err.message));

    return res.status(201).json({
      success: true,
      message: 'Post created successfully.',
      post: newPost,
    });
  } catch (error) {
    await conn.rollback();
    console.error('[FeedController.createPost] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create post.',
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

/**
 * 2. Get News Feed Posts (with pagination, Redis caching, and dynamic is_mine)
 * GET /api/mobile/feed
 */
export const getFeed = async (req, res) => {
  try {
    await ensureFeedSchema();
    const currentUserId = req.user?.id ? parseInt(req.user.id, 10) : null;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const offset = (page - 1) * limit;

    const filter = req.query.filter || 'all'; // 'all', 'video', 'audio', 'image', 'my'
    const targetUserId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;

    // Cache key for the base feed chunk
    const cacheKey = `feed:list:filter:${filter}:viewer:${currentUserId || 'all'}:user:${targetUserId || 'none'}:page:${page}:limit:${limit}`;
    const TTL = 60; // 60 seconds

    const feedResult = await cache.getOrSet(cacheKey, TTL, async () => {
      let whereClause = '1=1';
      const params = [];

      if (targetUserId) {
        whereClause += ' AND p.user_id = ?';
        params.push(targetUserId);
      } else if (filter === 'video') {
        whereClause += " AND (p.media_type = 'video' OR JSON_CONTAINS(p.media, '{\"media_type\":\"video\"}'))";
      } else if (filter === 'audio') {
        whereClause += " AND (p.media_type = 'audio' OR JSON_CONTAINS(p.media, '{\"media_type\":\"audio\"}'))";
      } else if (filter === 'image') {
        whereClause += " AND (p.media_type = 'image' OR JSON_CONTAINS(p.media, '{\"media_type\":\"image\"}'))";
      }

      // Hide superadmin posts from newsfeed
      whereClause += " AND u.role != 'superadmin'";

      // Filter out posts from blocked or blocking users if viewer is logged in
      if (currentUserId) {
        whereClause += ' AND p.user_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ? UNION SELECT blocker_id FROM user_blocks WHERE blocked_id = ?)';
        params.push(currentUserId, currentUserId);
      }

      // Count total
      const countSql = `SELECT COUNT(*) as total FROM posts p JOIN users u ON u.id = p.user_id WHERE ${whereClause}`;
      const countRows = await query(countSql, params);
      const total = countRows?.[0]?.total || 0;

      // Query posts with author profile and package category
      const selectSql = `
        SELECT 
          p.id,
          p.user_id,
          p.title,
          p.content,
          p.media_url,
          p.media_type,
          p.media,
          p.likes_count,
          p.comments_count,
          p.created_at,
          p.updated_at,
          u.full_name as author_name,
          u.avatar_url as author_avatar_url,
          u.role as author_role,
          u.level as author_level,
          u.star as author_star,
          u.vip_package,
          pc.id as package_category_id,
          pc.name as package_category_name,
          pc.badge_icon as package_badge_icon,
          pc.color_code as package_color_code
        FROM posts p
        JOIN users u ON u.id = p.user_id
        LEFT JOIN user_package_subscriptions ups 
          ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
        LEFT JOIN package_categories pc 
          ON pc.id = ups.category_id AND pc.is_active = 1
        WHERE ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const postsRaw = await query(selectSql, [...params, limit, offset]);

      // Fetch attached media for posts that have them in post_media
      const postIds = postsRaw.map((p) => p.id);
      let mediaByPostId = {};

      if (postIds.length > 0) {
        const placeholders = postIds.map(() => '?').join(',');
        const mediaRows = await query(
          `SELECT id, post_id, media_type, media_url, thumbnail_url, duration, display_order 
           FROM post_media 
           WHERE post_id IN (${placeholders}) 
           ORDER BY display_order ASC, id ASC`,
          postIds
        ).catch(() => []);

        mediaRows.forEach((m) => {
          if (!mediaByPostId[m.post_id]) {
            mediaByPostId[m.post_id] = [];
          }
          mediaByPostId[m.post_id].push(m);
        });
      }

      // Structure post models
      const items = postsRaw.map((row) => {
        let parsedMedia = [];
        if (mediaByPostId[row.id] && mediaByPostId[row.id].length > 0) {
          parsedMedia = mediaByPostId[row.id];
        } else if (row.media) {
          try {
            parsedMedia = typeof row.media === 'string' ? JSON.parse(row.media) : row.media;
          } catch (e) {
            parsedMedia = [];
          }
        } else if (row.media_url) {
          parsedMedia = [
            {
              media_type: row.media_type || 'image',
              media_url: row.media_url,
              thumbnail_url: null,
              duration: 0,
            },
          ];
        }

        const packageCategory = extractPackageCategory({
          package_category_id: row.package_category_id,
          package_category_name: row.package_category_name,
          package_badge_icon: row.package_badge_icon,
          package_color_code: row.package_color_code,
          vip_package: row.vip_package,
        });

        return {
          id: row.id,
          user_id: row.user_id,
          title: row.title || null,
          content: row.content,
          media_type: row.media_type,
          media_url: row.media_url,
          media: parsedMedia,
          likes_count: parseInt(row.likes_count || 0, 10),
          comments_count: parseInt(row.comments_count || 0, 10),
          created_at: row.created_at,
          updated_at: row.updated_at,
          author: {
            id: row.user_id,
            name: row.author_name || 'Anonymous',
            profile_picture: row.author_avatar_url || null,
            role: row.author_role || 'user',
            level: row.author_level || 1,
            star: row.author_star || 0,
            package_category: packageCategory,
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

    // Check user reactions if current user is logged in
    let userReactionsMap = {};
    if (currentUserId && feedResult.items && feedResult.items.length > 0) {
      const postIds = feedResult.items.map((p) => p.id);
      const placeholders = postIds.map(() => '?').join(',');
      const reactions = await query(
        `SELECT post_id, reaction_type 
         FROM post_reactions 
         WHERE user_id = ? AND post_id IN (${placeholders})`,
        [currentUserId, ...postIds]
      ).catch(() => []);

      reactions.forEach((r) => {
        userReactionsMap[r.post_id] = r.reaction_type;
      });
    }

    // Decorate each post with `is_mine`, `has_reacted`, and `my_reaction`
    const decoratedPosts = feedResult.items.map((post) => {
      const isMine = currentUserId ? post.user_id === currentUserId : false;
      const myReaction = userReactionsMap[post.id] || null;

      return {
        ...post,
        is_mine: isMine,
        has_reacted: !!myReaction,
        my_reaction: myReaction,
      };
    });

    return res.status(200).json({
      success: true,
      page: feedResult.page,
      limit: feedResult.limit,
      total: feedResult.total,
      total_pages: feedResult.total_pages,
      data: decoratedPosts,
    });
  } catch (error) {
    console.error('[FeedController.getFeed] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch news feed.',
      error: error.message,
    });
  }
};

/**
 * 3. Get Single Post Details
 * GET /api/mobile/feed/:id
 */
export const getPostDetails = async (req, res) => {
  try {
    await ensureFeedSchema();
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.user?.id ? parseInt(req.user.id, 10) : null;

    if (!postId || isNaN(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    const post = await cache.getOrSet(`feed:post:${postId}`, 60, async () => {
      const rows = await query(
        `SELECT 
           p.id,
           p.user_id,
           p.title,
           p.content,
           p.media_url,
           p.media_type,
           p.media,
           p.likes_count,
           p.comments_count,
           p.created_at,
           p.updated_at,
           u.full_name as author_name,
           u.avatar_url as author_avatar_url,
           u.role as author_role,
           u.level as author_level,
           u.star as author_star,
           u.vip_package,
           pc.id as package_category_id,
           pc.name as package_category_name,
           pc.badge_icon as package_badge_icon,
           pc.color_code as package_color_code
         FROM posts p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN user_package_subscriptions ups 
           ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
         LEFT JOIN package_categories pc 
           ON pc.id = ups.category_id AND pc.is_active = 1
         WHERE p.id = ? LIMIT 1`,
        [postId]
      );

      if (!rows || rows.length === 0) return null;
      const row = rows[0];

      // Fetch post_media
      const mediaRows = await query(
        `SELECT id, post_id, media_type, media_url, thumbnail_url, duration, display_order 
         FROM post_media 
         WHERE post_id = ? 
         ORDER BY display_order ASC, id ASC`,
        [postId]
      ).catch(() => []);

      let parsedMedia = mediaRows;
      if (parsedMedia.length === 0 && row.media) {
        try {
          parsedMedia = typeof row.media === 'string' ? JSON.parse(row.media) : row.media;
        } catch (e) {
          parsedMedia = [];
        }
      } else if (parsedMedia.length === 0 && row.media_url) {
        parsedMedia = [
          {
            media_type: row.media_type || 'image',
            media_url: row.media_url,
            thumbnail_url: null,
            duration: 0,
          },
        ];
      }

      const packageCategory = extractPackageCategory({
        package_category_id: row.package_category_id,
        package_category_name: row.package_category_name,
        package_badge_icon: row.package_badge_icon,
        package_color_code: row.package_color_code,
        vip_package: row.vip_package,
      });

      return {
        id: row.id,
        user_id: row.user_id,
        title: row.title || null,
        content: row.content,
        media_type: row.media_type,
        media_url: row.media_url,
        media: parsedMedia,
        likes_count: parseInt(row.likes_count || 0, 10),
        comments_count: parseInt(row.comments_count || 0, 10),
        created_at: row.created_at,
        updated_at: row.updated_at,
        author: {
          id: row.user_id,
          name: row.author_name || 'Anonymous',
          profile_picture: row.author_avatar_url || null,
          role: row.author_role || 'user',
          level: row.author_level || 1,
          star: row.author_star || 0,
          package_category: packageCategory,
        },
      };
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    if (currentUserId && currentUserId !== post.user_id) {
      const blockCheck = await query(
        'SELECT blocker_id FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1',
        [currentUserId, post.user_id, post.user_id, currentUserId]
      );
      if (blockCheck.length > 0) {
        const isBlockedByMe = blockCheck[0].blocker_id === currentUserId;
        return res.status(403).json({
          success: false,
          message: isBlockedByMe
            ? 'You have blocked the author of this post.'
            : 'This post is unavailable because the author has blocked you.',
          is_blocked: true,
          blocked_by_me: isBlockedByMe,
          is_blocked_by_other: !isBlockedByMe,
          blocked_by_them: !isBlockedByMe,
        });
      }
    }

    // Check reaction if logged in
    let myReaction = null;
    if (currentUserId) {
      const reactionRow = await query(
        `SELECT reaction_type FROM post_reactions WHERE post_id = ? AND user_id = ? LIMIT 1`,
        [postId, currentUserId]
      );
      if (reactionRow && reactionRow.length > 0) {
        myReaction = reactionRow[0].reaction_type;
      }
    }

    const responseData = {
      ...post,
      is_mine: currentUserId ? post.user_id === currentUserId : false,
      has_reacted: !!myReaction,
      my_reaction: myReaction,
    };

    return res.status(200).json({
      success: true,
      post: responseData,
    });
  } catch (error) {
    console.error('[FeedController.getPostDetails] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch post details.',
      error: error.message,
    });
  }
};

/**
 * 4. Update Feed Post
 * PUT /api/mobile/feed/:id
 */
export const updatePost = async (req, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const postId = parseInt(req.params.id, 10);

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (!postId || isNaN(postId)) {
    return res.status(400).json({ success: false, message: 'Invalid post ID.' });
  }

  try {
    // Check if post exists and user owns it (or is admin)
    const [existing] = await query('SELECT * FROM posts WHERE id = ? LIMIT 1', [postId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const isOwner = existing.user_id === userId;
    const isAdmin = ['admin', 'superadmin'].includes(userRole);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this post.' });
    }

    const { title, content } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title ? title.trim() : null);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content ? content.trim() : '');
    }

    if (req.body.media !== undefined) {
      let mediaItems = req.body.media;
      if (typeof mediaItems === 'string') {
        try {
          mediaItems = JSON.parse(mediaItems);
        } catch (e) {
          mediaItems = [];
        }
      }
      updates.push('media = ?');
      params.push(Array.isArray(mediaItems) ? JSON.stringify(mediaItems) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update.' });
    }

    params.push(postId);

    // MySQL SSOT write
    await query(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`, params);

    // Instant Redis invalidation
    await invalidateFeedCache(postId);

    return res.status(200).json({
      success: true,
      message: 'Post updated successfully.',
    });
  } catch (error) {
    console.error('[FeedController.updatePost] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update post.',
      error: error.message,
    });
  }
};

/**
 * 5. Delete Feed Post
 * DELETE /api/mobile/feed/:id
 */
export const deletePost = async (req, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const postId = parseInt(req.params.id, 10);

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (!postId || isNaN(postId)) {
    return res.status(400).json({ success: false, message: 'Invalid post ID.' });
  }

  try {
    const [existing] = await query('SELECT * FROM posts WHERE id = ? LIMIT 1', [postId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const isOwner = existing.user_id === userId;
    const isAdmin = ['admin', 'superadmin'].includes(userRole);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this post.' });
    }

    // MySQL SSOT delete (cascades to post_media, post_reactions, post_comments)
    await query('DELETE FROM posts WHERE id = ?', [postId]);

    // Instant Redis invalidation
    await invalidateFeedCache(postId);

    return res.status(200).json({
      success: true,
      message: 'Post deleted successfully.',
    });
  } catch (error) {
    console.error('[FeedController.deletePost] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete post.',
      error: error.message,
    });
  }
};

/**
 * 6. React / Like a Post (Toggle or update reaction)
 * POST /api/mobile/feed/:id/react
 */
export const reactToPost = async (req, res) => {
  const userId = req.user?.id;
  const postId = parseInt(req.params.id, 10);
  const reactionType = (req.body.reaction_type || 'like').toLowerCase().trim();

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (!postId || isNaN(postId)) {
    return res.status(400).json({ success: false, message: 'Invalid post ID.' });
  }

  const validReactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
  if (!validReactions.includes(reactionType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid reaction type. Valid types: ${validReactions.join(', ')}`,
    });
  }

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Check if post exists
    const [postRows] = await conn.execute('SELECT id, likes_count FROM posts WHERE id = ? LIMIT 1', [postId]);
    if (!postRows || postRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    // Check existing reaction by this user on this post
    const [existingReaction] = await conn.execute(
      'SELECT id, reaction_type FROM post_reactions WHERE post_id = ? AND user_id = ? LIMIT 1',
      [postId, userId]
    );

    let action = 'added';
    let newReactionType = reactionType;
    let hasReacted = true;

    if (existingReaction && existingReaction.length > 0) {
      const current = existingReaction[0];
      if (current.reaction_type === reactionType) {
        // Same reaction clicked again -> TOGGLE OFF (Remove reaction)
        await conn.execute('DELETE FROM post_reactions WHERE id = ?', [current.id]);
        await conn.execute('UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', [postId]);
        action = 'removed';
        newReactionType = null;
        hasReacted = false;
      } else {
        // Different reaction clicked -> SWITCH reaction type
        await conn.execute('UPDATE post_reactions SET reaction_type = ? WHERE id = ?', [reactionType, current.id]);
        action = 'updated';
        newReactionType = reactionType;
        hasReacted = true;
      }
    } else {
      // First reaction -> INSERT and INCREMENT likes_count
      await conn.execute(
        'INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)',
        [postId, userId, reactionType]
      );
      await conn.execute('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [postId]);
      action = 'added';
      newReactionType = reactionType;
      hasReacted = true;
    }

    // Fetch updated likes_count
    const [updatedPost] = await conn.execute('SELECT likes_count FROM posts WHERE id = ?', [postId]);
    const totalLikes = updatedPost[0]?.likes_count || 0;

    await conn.commit();

    // Instant Redis cache invalidation
    await invalidateFeedCache(postId);

    return res.status(200).json({
      success: true,
      message: action === 'removed' ? 'Reaction removed.' : `Post reacted with ${reactionType}.`,
      action,
      has_reacted: hasReacted,
      my_reaction: newReactionType,
      likes_count: totalLikes,
    });
  } catch (error) {
    await conn.rollback();
    console.error('[FeedController.reactToPost] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to react to post.',
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

/**
 * 7. Get List of Users Who Reacted to a Post
 * GET /api/mobile/feed/:id/reactions
 * Returns users with user_id, name, package category, profile picture, reaction_type
 */
export const getPostReactions = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.user?.id ? parseInt(req.user.id, 10) : null;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;
    const filterType = req.query.type ? req.query.type.toLowerCase().trim() : null;

    if (!postId || isNaN(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    const cacheKey = `feed:reactions:${postId}:${filterType || 'all'}:p:${page}:l:${limit}`;
    const TTL = 30; // 30 seconds

    const result = await cache.getOrSet(cacheKey, TTL, async () => {
      let whereClause = 'pr.post_id = ?';
      const params = [postId];

      if (filterType) {
        whereClause += ' AND pr.reaction_type = ?';
        params.push(filterType);
      }

      // Count total
      const countRows = await query(
        `SELECT COUNT(*) as total FROM post_reactions pr WHERE ${whereClause}`,
        params
      );
      const total = countRows?.[0]?.total || 0;

      // Query users
      const selectSql = `
        SELECT 
          pr.id as reaction_id,
          pr.reaction_type,
          pr.created_at,
          u.id as user_id,
          u.full_name,
          u.avatar_url,
          u.role,
          u.level,
          u.star,
          u.vip_package,
          pc.id as package_category_id,
          pc.name as package_category_name,
          pc.badge_icon as package_badge_icon,
          pc.color_code as package_color_code
        FROM post_reactions pr
        JOIN users u ON u.id = pr.user_id
        LEFT JOIN user_package_subscriptions ups 
          ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
        LEFT JOIN package_categories pc 
          ON pc.id = ups.category_id AND pc.is_active = 1
        WHERE ${whereClause}
        ORDER BY pr.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const rows = await query(selectSql, [...params, limit, offset]);

      const items = rows.map((r) => {
        const packageCategory = extractPackageCategory({
          package_category_id: r.package_category_id,
          package_category_name: r.package_category_name,
          package_badge_icon: r.package_badge_icon,
          package_color_code: r.package_color_code,
          vip_package: r.vip_package,
        });

        return {
          reaction_id: r.reaction_id,
          reaction_type: r.reaction_type,
          created_at: r.created_at,
          user: {
            user_id: r.user_id,
            name: r.full_name || 'Anonymous',
            profile_picture: r.avatar_url || null,
            role: r.role || 'user',
            level: r.level || 1,
            star: r.star || 0,
            package_category: packageCategory,
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

    // Inject is_mine indicator for the reacting user
    const decorated = result.items.map((item) => ({
      ...item,
      is_mine: currentUserId ? item.user.user_id === currentUserId : false,
    }));

    return res.status(200).json({
      success: true,
      page: result.page,
      limit: result.limit,
      total: result.total,
      total_pages: result.total_pages,
      data: decorated,
    });
  } catch (error) {
    console.error('[FeedController.getPostReactions] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reactions.',
      error: error.message,
    });
  }
};

/**
 * 8. Add Comment or Reply to a Post
 * POST /api/mobile/feed/:id/comments
 */
export const addComment = async (req, res) => {
  const userId = req.user?.id;
  const postId = parseInt(req.params.id, 10);
  const { content, parent_id = null, media_url = null } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (!postId || isNaN(postId)) {
    return res.status(400).json({ success: false, message: 'Invalid post ID.' });
  }

  const cleanContent = typeof content === 'string' ? content.trim() : '';
  if (!cleanContent) {
    return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
  }

  const parentId = parent_id ? parseInt(parent_id, 10) : null;

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Check if post exists
    const [postRows] = await conn.execute('SELECT id, user_id FROM posts WHERE id = ? LIMIT 1', [postId]);
    if (!postRows || postRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    const postAuthorId = postRows[0]?.user_id;
    let parentAuthorId = null;

    // If it is a reply, ensure parent comment exists on this post
    if (parentId) {
      const [parentRows] = await conn.execute(
        'SELECT id, user_id FROM post_comments WHERE id = ? AND post_id = ? LIMIT 1',
        [parentId, postId]
      );
      if (!parentRows || parentRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Parent comment not found on this post.' });
      }
      parentAuthorId = parentRows[0]?.user_id;

      // Increment replies_count on parent comment
      await conn.execute('UPDATE post_comments SET replies_count = replies_count + 1 WHERE id = ?', [parentId]);
    }

    // Insert comment
    const [result] = await conn.execute(
      `INSERT INTO post_comments (post_id, user_id, parent_id, content, media_url, likes_count, replies_count)
       VALUES (?, ?, ?, ?, ?, 0, 0)`,
      [postId, userId, parentId, cleanContent, media_url || null]
    );

    const commentId = result.insertId;

    // Increment post's total comments_count
    await conn.execute('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [postId]);

    await conn.commit();

    // Instant Redis invalidation
    await invalidateFeedCache(postId);

    // Fetch user details for the new comment response
    const authorRows = await query(
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
      [userId]
    );

    const author = authorRows?.[0] || {};
    const packageCategory = extractPackageCategory(author);

    const newComment = {
      id: commentId,
      post_id: postId,
      parent_id: parentId,
      content: cleanContent,
      media_url: media_url || null,
      likes_count: 0,
      replies_count: 0,
      has_replies: false,
      has_reply: false,
      replies: [],
      is_mine: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        user_id: author.id,
        name: author.full_name || 'Anonymous',
        profile_picture: author.avatar_url || null,
        role: author.role || 'user',
        level: author.level || 1,
        star: author.star || 0,
        package_category: packageCategory,
      },
    };

    // Trigger in-app notification & push notification asynchronously
    if (parentId && parentAuthorId) {
      notifyCommentReply({
        replierId: userId,
        parentAuthorId,
        postId,
        replyContent: cleanContent,
        commentId,
        parentId,
      }).catch((err) => console.error('[Notification] Comment reply error:', err.message));

      sendCommentReplyPushNotification({
        postId,
        commentId,
        parentCommentAuthorId: parentAuthorId,
        replier: newComment.user,
        content: cleanContent,
      }).catch((err) => console.error('[FCM] Comment reply notification error:', err.message));
    } else if (postAuthorId) {
      notifyComment({
        commenterId: userId,
        postAuthorId,
        postId,
        commentContent: cleanContent,
        commentId,
      }).catch((err) => console.error('[Notification] Post comment error:', err.message));

      sendPostCommentPushNotification({
        postId,
        commentId,
        postAuthorId,
        commenter: newComment.user,
        content: cleanContent,
      }).catch((err) => console.error('[FCM] Post comment notification error:', err.message));
    }

    return res.status(201).json({
      success: true,
      message: parentId ? 'Reply posted successfully.' : 'Comment posted successfully.',
      comment: newComment,
    });
  } catch (error) {
    await conn.rollback();
    console.error('[FeedController.addComment] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to post comment.',
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

/**
 * 9. Get Comments for a Post (with replies support)
 * GET /api/mobile/feed/:id/comments
 */
export const getComments = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.user?.id ? parseInt(req.user.id, 10) : null;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    // Optional parent_id: if specified, returns replies for that comment; if omitted, returns root comments
    const parentId = req.query.parent_id ? parseInt(req.query.parent_id, 10) : null;

    if (!postId || isNaN(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    const cacheKey = `feed:comments:${postId}:parent:${parentId || 'root'}:p:${page}:l:${limit}`;
    const TTL = 30; // 30 seconds

    const result = await cache.getOrSet(cacheKey, TTL, async () => {
      let whereClause = 'c.post_id = ?';
      const params = [postId];

      if (parentId) {
        whereClause += ' AND c.parent_id = ?';
        params.push(parentId);
      } else {
        whereClause += ' AND c.parent_id IS NULL';
      }

      whereClause += " AND u.role != 'superadmin'";

      // Count
      const countRows = await query(
        `SELECT COUNT(*) as total FROM post_comments c JOIN users u ON u.id = c.user_id WHERE ${whereClause}`,
        params
      );
      const total = countRows?.[0]?.total || 0;

      // Select comments with author and package category
      const selectSql = `
        SELECT 
          c.id,
          c.post_id,
          c.parent_id,
          c.content,
          c.media_url,
          c.likes_count,
          c.replies_count,
          c.created_at,
          c.updated_at,
          u.id as user_id,
          u.full_name,
          u.avatar_url,
          u.role,
          u.level,
          u.star,
          u.vip_package,
          pc.id as package_category_id,
          pc.name as package_category_name,
          pc.badge_icon as package_badge_icon,
          pc.color_code as package_color_code
        FROM post_comments c
        JOIN users u ON u.id = c.user_id
        LEFT JOIN user_package_subscriptions ups 
          ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
        LEFT JOIN package_categories pc 
          ON pc.id = ups.category_id AND pc.is_active = 1
        WHERE ${whereClause}
        ORDER BY c.created_at ASC
        LIMIT ? OFFSET ?
      `;

      const rows = await query(selectSql, [...params, limit, offset]);

      const items = rows.map((r) => {
        const packageCategory = extractPackageCategory({
          package_category_id: r.package_category_id,
          package_category_name: r.package_category_name,
          package_badge_icon: r.package_badge_icon,
          package_color_code: r.package_color_code,
          vip_package: r.vip_package,
        });

        const repliesCount = parseInt(r.replies_count || 0, 10);

        return {
          id: r.id,
          post_id: r.post_id,
          parent_id: r.parent_id,
          content: r.content,
          media_url: r.media_url,
          likes_count: parseInt(r.likes_count || 0, 10),
          replies_count: repliesCount,
          has_replies: repliesCount > 0,
          has_reply: repliesCount > 0,
          created_at: r.created_at,
          updated_at: r.updated_at,
          user: {
            user_id: r.user_id,
            name: r.full_name || 'Anonymous',
            profile_picture: r.avatar_url || null,
            role: r.role || 'user',
            level: r.level || 1,
            star: r.star || 0,
            package_category: packageCategory,
          },
        };
      });

      // Populate nested replies for root comments
      if (!parentId && items.length > 0) {
        const rootIds = items.map((c) => c.id);
        const placeholders = rootIds.map(() => '?').join(',');
        const replySql = `
          SELECT 
            c.id,
            c.post_id,
            c.parent_id,
            c.content,
            c.media_url,
            c.likes_count,
            c.replies_count,
            c.created_at,
            c.updated_at,
            u.id as user_id,
            u.full_name,
            u.avatar_url,
            u.role,
            u.level,
            u.star,
            u.vip_package,
            pc.id as package_category_id,
            pc.name as package_category_name,
            pc.badge_icon as package_badge_icon,
            pc.color_code as package_color_code
          FROM post_comments c
          JOIN users u ON u.id = c.user_id
          LEFT JOIN user_package_subscriptions ups 
            ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW() AND ups.is_equipped = 1
          LEFT JOIN package_categories pc 
            ON pc.id = ups.category_id AND pc.is_active = 1
          WHERE c.post_id = ? AND c.parent_id IN (${placeholders})
          ORDER BY c.created_at ASC
        `;
        const replyRows = await query(replySql, [postId, ...rootIds]);
        const repliesByParent = {};
        for (const r of replyRows) {
          const packageCategory = extractPackageCategory({
            package_category_id: r.package_category_id,
            package_category_name: r.package_category_name,
            package_badge_icon: r.package_badge_icon,
            package_color_code: r.package_color_code,
            vip_package: r.vip_package,
          });
          const replyRepliesCount = parseInt(r.replies_count || 0, 10);
          const replyObj = {
            id: r.id,
            post_id: r.post_id,
            parent_id: r.parent_id,
            content: r.content,
            media_url: r.media_url,
            likes_count: parseInt(r.likes_count || 0, 10),
            replies_count: replyRepliesCount,
            has_replies: replyRepliesCount > 0,
            has_reply: replyRepliesCount > 0,
            created_at: r.created_at,
            updated_at: r.updated_at,
            user: {
              user_id: r.user_id,
              name: r.full_name || 'Anonymous',
              profile_picture: r.avatar_url || null,
              role: r.role || 'user',
              level: r.level || 1,
              star: r.star || 0,
              package_category: packageCategory,
            },
          };
          if (!repliesByParent[r.parent_id]) {
            repliesByParent[r.parent_id] = [];
          }
          repliesByParent[r.parent_id].push(replyObj);
        }

        for (const it of items) {
          it.replies = repliesByParent[it.id] || [];
          it.has_replies = Boolean(it.replies_count > 0 || it.replies.length > 0);
          it.has_reply = it.has_replies;
        }
      } else {
        for (const it of items) {
          it.replies = [];
          it.has_replies = Boolean(it.replies_count > 0);
          it.has_reply = it.has_replies;
        }
      }

      return {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        items,
      };
    });

    // Injects is_mine recursively on root comments and their replies, and ensures boolean has_replies
    const decorated = result.items.map((comment) => {
      const replies = (comment.replies || []).map((reply) => {
        const rHasReplies = Boolean((reply.replies_count || 0) > 0 || (reply.replies && reply.replies.length > 0));
        return {
          ...reply,
          is_mine: currentUserId ? reply.user.user_id === currentUserId : false,
          has_replies: rHasReplies,
          has_reply: rHasReplies,
        };
      });
      const hasReplies = Boolean((comment.replies_count || 0) > 0 || replies.length > 0);
      return {
        ...comment,
        is_mine: currentUserId ? comment.user.user_id === currentUserId : false,
        has_replies: hasReplies,
        has_reply: hasReplies,
        replies,
      };
    });

    return res.status(200).json({
      success: true,
      page: result.page,
      limit: result.limit,
      total: result.total,
      total_pages: result.total_pages,
      data: decorated,
    });
  } catch (error) {
    console.error('[FeedController.getComments] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch comments.',
      error: error.message,
    });
  }
};

/**
 * 9b. Get Replies for a Specific Comment
 * GET /api/mobile/feed/:id/comments/:commentId/replies
 * GET /api/mobile/feed/comments/:commentId/replies
 */
export const getCommentReplies = async (req, res) => {
  req.query.parent_id = req.params.commentId;
  return getComments(req, res);
};

/**
 * 10. Delete a Comment or Reply
 * DELETE /api/mobile/feed/:postId/comments/:commentId
 * DELETE /api/mobile/feed/comments/:commentId
 */
export const deleteComment = async (req, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const commentId = parseInt(req.params.commentId || req.params.id, 10);

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (!commentId || isNaN(commentId)) {
    return res.status(400).json({ success: false, message: 'Invalid comment ID.' });
  }

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Check comment exists
    const [commentRows] = await conn.execute(
      'SELECT id, user_id, post_id, parent_id FROM post_comments WHERE id = ? LIMIT 1',
      [commentId]
    );

    if (!commentRows || commentRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }

    const comment = commentRows[0];
    const postId = comment.post_id;

    // Check post owner
    const [postRows] = await conn.execute('SELECT user_id FROM posts WHERE id = ? LIMIT 1', [postId]);
    const postOwnerId = postRows?.[0]?.user_id;

    const isCommentOwner = comment.user_id === userId;
    const isPostOwner = postOwnerId === userId;
    const isAdmin = ['admin', 'superadmin'].includes(userRole);

    if (!isCommentOwner && !isPostOwner && !isAdmin) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this comment.' });
    }

    // Count how many nested child replies will be deleted alongside this comment
    const [childReplyRows] = await conn.execute(
      'SELECT COUNT(*) as count FROM post_comments WHERE parent_id = ?',
      [commentId]
    );
    const childRepliesCount = childReplyRows?.[0]?.count || 0;

    // If this was a reply itself, decrement parent's replies_count
    if (comment.parent_id) {
      await conn.execute(
        'UPDATE post_comments SET replies_count = GREATEST(0, replies_count - 1) WHERE id = ?',
        [comment.parent_id]
      );
    }

    // Delete comment (cascade delete child replies)
    await conn.execute('DELETE FROM post_comments WHERE parent_id = ?', [commentId]);
    await conn.execute('DELETE FROM post_comments WHERE id = ?', [commentId]);

    // Decrement post total comments_count (1 for this comment + any deleted child replies)
    const totalDeleted = 1 + childRepliesCount;
    await conn.execute(
      'UPDATE posts SET comments_count = GREATEST(0, comments_count - ?) WHERE id = ?',
      [totalDeleted, postId]
    );

    await conn.commit();

    // Instant Redis invalidation
    await invalidateFeedCache(postId);

    return res.status(200).json({
      success: true,
      message: comment.parent_id ? 'Reply deleted successfully.' : 'Comment deleted successfully.',
      deleted_id: commentId,
      post_id: postId,
    });
  } catch (error) {
    await conn.rollback();
    console.error('[FeedController.deleteComment] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete comment.',
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

/**
 * 10b. Update/Edit a Comment or Reply
 * PUT /api/mobile/feed/:postId/comments/:commentId
 * PATCH /api/mobile/feed/:postId/comments/:commentId
 * PUT /api/mobile/feed/comments/:commentId
 */
export const updateComment = async (req, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const commentId = parseInt(req.params.commentId || req.params.id, 10);
  const { content, media_url } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (!commentId || isNaN(commentId)) {
    return res.status(400).json({ success: false, message: 'Invalid comment ID.' });
  }

  const cleanContent = typeof content === 'string' ? content.trim() : '';
  if (!cleanContent) {
    return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
  }

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Check comment exists
    const [commentRows] = await conn.execute(
      'SELECT id, user_id, post_id, parent_id, media_url, likes_count, replies_count, created_at FROM post_comments WHERE id = ? LIMIT 1',
      [commentId]
    );

    if (!commentRows || commentRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }

    const comment = commentRows[0];
    const isCommentOwner = comment.user_id === userId;
    const isAdmin = ['admin', 'superadmin'].includes(userRole);

    if (!isCommentOwner && !isAdmin) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this comment.' });
    }

    const newMediaUrl = media_url !== undefined ? (media_url || null) : comment.media_url;

    // Update in MySQL SSOT
    await conn.execute(
      'UPDATE post_comments SET content = ?, media_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [cleanContent, newMediaUrl, commentId]
    );

    await conn.commit();

    // Instant Redis cache invalidation
    await invalidateFeedCache(comment.post_id);

    // Fetch author profile & VIP details
    const authorRows = await query(
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
      [comment.user_id]
    );

    const author = authorRows?.[0] || {};
    const packageCategory = extractPackageCategory(author);

    // Get current replies count
    const [replyCountRows] = await query(
      'SELECT COUNT(*) as count FROM post_comments WHERE parent_id = ?',
      [commentId]
    );
    const repliesCount = replyCountRows?.[0]?.count || 0;

    const updatedComment = {
      id: comment.id,
      post_id: comment.post_id,
      parent_id: comment.parent_id,
      content: cleanContent,
      media_url: newMediaUrl,
      likes_count: parseInt(comment.likes_count || 0, 10),
      replies_count: repliesCount,
      has_replies: repliesCount > 0,
      has_reply: repliesCount > 0,
      is_mine: true,
      created_at: comment.created_at,
      updated_at: new Date().toISOString(),
      user: {
        user_id: author.id || comment.user_id,
        name: author.full_name || 'Anonymous',
        profile_picture: author.avatar_url || null,
        role: author.role || 'user',
        level: author.level || 1,
        star: author.star || 0,
        package_category: packageCategory,
      },
    };

    return res.status(200).json({
      success: true,
      message: comment.parent_id ? 'Reply updated successfully.' : 'Comment updated successfully.',
      comment: updatedComment,
    });
  } catch (error) {
    await conn.rollback();
    console.error('[FeedController.updateComment] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update comment.',
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

/**
 * 11. Direct Media Upload for Feed Posts
 * Uploads media files (images, video, audio) directly from user device.
 * Returns structured media items with URLs, media_type, size, and display_order.
 * POST /api/mobile/feed/upload
 */
export const uploadFeedMediaDirect = async (req, res) => {
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
              media_url: `/uploads/posts/${req.file.filename}`,
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
        message: 'No media file provided. Please attach image, video, or audio file.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Media files uploaded successfully.',
      count: req.uploadedMedia.length,
      media: req.uploadedMedia,
    });
  } catch (error) {
    console.error('[FeedController.uploadFeedMediaDirect] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload media.',
      error: error.message,
    });
  }
};

