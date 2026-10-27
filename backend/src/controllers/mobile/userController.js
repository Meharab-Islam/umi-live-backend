import { query } from '../../config/db.js';
import { cache } from '../../config/redis.js';
import { sendNewFollowerPushNotification } from '../../config/firebase.js';
import { notifyFollow } from '../../services/notificationService.js';
import { ensureFeedSchema } from './feedController.js';
import { getUserSpecialPrivileges } from '../../services/userPrivilegeService.js';

/**
 * Mobile User & Follow Controller
 * Follows SSOT (MySQL first) + Instant Redis Invalidation + Cache-Aside (GET)
 */

/**
 * Get Public User Profile with Follower & Following Counts, Coins Received/Gifted, Posts Count, and Social/Moderation State
 * GET /api/mobile/users/:userId/profile
 */
export async function getUserProfile(req, res) {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const currentUserId = req.user?.id || null;

    if (!targetUserId || isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required.' });
    }

    // Cache-Aside lookup for base target profile
    const profile = await cache.getOrSet(`mobile:user:public:${targetUserId}`, 30, async () => {
      const rows = await query(
        `SELECT 
           u.id, 
           u.full_name, 
           u.avatar_url, 
           u.bio, 
           u.country,
           u.role, 
           u.level, 
           u.star, 
           u.coins,
           u.diamonds,
           u.host_type, 
           u.created_at,
           (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) AS followers_count,
           (SELECT COUNT(*) FROM user_follows WHERE follower_id = u.id) AS following_count,
           (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts_count,
           COALESCE((SELECT SUM(coin_amount) FROM gift_transactions WHERE receiver_id = u.id), 0) AS total_received_coins,
           COALESCE((SELECT SUM(coin_amount) FROM gift_transactions WHERE sender_id = u.id), 0) AS total_gifted_coins,
           ups.id as subscription_id,
           ups.is_equipped as package_is_equipped,
           pp.id as package_id,
           pp.name as package_name,
           pp.image_url as package_image_url,
           pc.id as category_id,
           COALESCE(pc.name, u.vip_package, 'Standard') as category_name,
           COALESCE(pc.name, u.vip_package, 'Standard') as package_category_name,
           COALESCE(pc.badge_icon, '') as category_badge_icon,
           COALESCE(pc.color_code, '#7c3aed') as package_color,
           COALESCE(pp.image_url, '') as package_image
         FROM users u
         LEFT JOIN user_package_subscriptions ups 
           ON ups.id = (
             SELECT id FROM user_package_subscriptions 
             WHERE user_id = u.id AND status = 'active' AND expires_at > NOW() 
             ORDER BY is_equipped DESC, expires_at DESC LIMIT 1
           )
         LEFT JOIN privilege_packages pp ON pp.id = ups.package_id
         LEFT JOIN package_categories pc ON pc.id = ups.category_id
         WHERE u.id = ? AND u.is_banned = 0 AND u.role != 'superadmin'
         LIMIT 1`,
        [targetUserId]
      );
      return rows.length > 0 ? rows[0] : null;
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'User not found or account is deactivated.' });
    }

    // Dynamic real-time relationship check for viewer
    let isFollowing = false;
    let isFollowedBy = false;
    let isBlocked = false;
    let isBlockingMe = false;

    if (currentUserId && currentUserId !== targetUserId) {
      const [followMeCheck, iFollowCheck, blockCheck, blockedMeCheck] = await Promise.all([
        query('SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1', [targetUserId, currentUserId]),
        query('SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1', [currentUserId, targetUserId]),
        query('SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ? LIMIT 1', [currentUserId, targetUserId]),
        query('SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ? LIMIT 1', [targetUserId, currentUserId]),
      ]);
      isFollowedBy = followMeCheck.length > 0;
      isFollowing = iFollowCheck.length > 0;
      isBlocked = blockCheck.length > 0;
      isBlockingMe = blockedMeCheck.length > 0;
    }

    if (isBlocked || isBlockingMe) {
      return res.status(403).json({
        success: false,
        message: isBlocked
          ? 'You have blocked this user. Unblock them to view their profile.'
          : 'This profile is unavailable because this user has blocked you.',
        is_blocked: true,
        blocked_by_me: isBlocked,
        is_blocked_by_other: isBlockingMe,
        blocked_by_them: isBlockingMe,
        user: {
          id: profile.id,
          name: profile.full_name || 'Umi User',
          full_name: profile.full_name || 'Umi User',
          avatar_url: profile.avatar_url || '',
          profile_image: profile.avatar_url || '',
          is_blocked: true,
          blocked_by_me: isBlocked,
          is_blocked_by_other: isBlockingMe,
          blocked_by_them: isBlockingMe,
        },
      });
    }

    const followersCount = Number(profile.followers_count) || 0;
    const followingCount = Number(profile.following_count) || 0;
    const postsCount = Number(profile.posts_count) || 0;
    const currentCoins = Number(profile.coins) || 0;
    const totalReceivedCoins = Number(profile.total_received_coins) || 0;
    const totalGiftedCoins = Number(profile.total_gifted_coins) || 0;

    const appShareUrl = process.env.APP_SHARE_URL || 'https://umilive.app';
    const shareLink = `${appShareUrl}/user/${targetUserId}`;

    return res.json({
      success: true,
      user: {
        id: profile.id,
        name: profile.full_name || 'Umi User',
        full_name: profile.full_name || 'Umi User',
        profile_image: profile.avatar_url || '',
        avatar_url: profile.avatar_url || '',
        country: profile.country || '',
        role: profile.role,
        level: profile.level || 1,
        star: profile.star || 0,
        host_type: profile.host_type,
        bio: profile.bio || '',
        is_following: isFollowing,
        is_followed_by: isFollowedBy,
        is_follower: isFollowedBy,
        followers_count: followersCount,
        following_count: followingCount,
        posts_count: postsCount,
        current_balance: currentCoins,
        coins: currentCoins,
        diamonds: Number(profile.diamonds) || 0,
        total_received_coins: totalReceivedCoins,
        total_gifted_coins: totalGiftedCoins,
        total_sent_coins: totalGiftedCoins,
        is_blocked: false,
        blocked_by_me: false,
        is_blocked_by_other: false,
        blocked_by_them: false,
        is_blocking_me: false,
        is_mine: currentUserId === targetUserId,
        share_link: shareLink,
        profile_url: shareLink,
        package_category_name: profile.package_category_name || 'Standard',
        category_id: profile.category_id || null,
        category_name: profile.category_name || 'Standard',
        category_badge_icon: profile.category_badge_icon || '',
        package_id: profile.package_id || null,
        package_name: profile.package_name || null,
        package_image: profile.package_image_url || profile.package_image || '',
        package_image_url: profile.package_image_url || '',
        package_color: profile.package_color || '#7c3aed',
        package_is_equipped: profile.subscription_id ? Boolean(profile.package_is_equipped) : false,
        active_package: profile.package_id ? {
          package_id: profile.package_id,
          package_name: profile.package_name,
          package_image: profile.package_image_url || '',
          package_image_url: profile.package_image_url || '',
          category_id: profile.category_id,
          category_name: profile.category_name,
          category_badge_icon: profile.category_badge_icon || '',
          category_color: profile.package_color || '#7c3aed',
          subscription_id: profile.subscription_id,
          is_equipped: Boolean(profile.package_is_equipped),
        } : null,
        created_at: profile.created_at,
        ...await getUserSpecialPrivileges(profile.id, profile.role),
      },
    });
  } catch (err) {
    console.error('getUserProfile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user profile.' });
  }
}

/**
 * Unified Toggle Follow / Unfollow a User
 * POST /api/mobile/users/:userId/toggle-follow
 * Also supports optional body: { action: 'toggle' | 'follow' | 'unfollow' }
 */
export async function toggleFollowUser(req, res) {
  try {
    const followerId = req.user?.id;
    const followingId = parseInt(req.params.userId, 10);
    const requestedAction = req.body?.action || 'toggle';

    if (!followerId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!followingId || isNaN(followingId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required.' });
    }

    if (followerId === followingId) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
    }

    // Target user check
    const [targetUser] = await query('SELECT id FROM users WHERE id = ? AND is_banned = 0 LIMIT 1', [followingId]);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found or suspended.' });
    }

    // Check current follow state
    const [existingFollow] = await query(
      'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
      [followerId, followingId]
    );

    const isCurrentlyFollowing = !!existingFollow;
    let shouldFollow;

    if (requestedAction === 'follow') {
      shouldFollow = true;
    } else if (requestedAction === 'unfollow') {
      shouldFollow = false;
    } else {
      // Toggle mode
      shouldFollow = !isCurrentlyFollowing;
    }

    // 1. Database-First Write (SSOT)
    if (shouldFollow) {
      await query(
        'INSERT IGNORE INTO user_follows (follower_id, following_id) VALUES (?, ?)',
        [followerId, followingId]
      );
    } else {
      await query(
        'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?',
        [followerId, followingId]
      );
    }

    // 2. Instant Redis Cache Invalidation
    await Promise.allSettled([
      cache.del(`mobile:user:profile:${followerId}`),
      cache.del(`mobile:user:profile:${followingId}`),
      cache.del(`mobile:user:public:${followingId}`),
      cache.del(`user:${followerId}`),
      cache.del(`user:${followingId}`),
      cache.del(`mobile:user:${followingId}:followers`),
      cache.del(`mobile:user:${followerId}:following`),
    ]);

    // 3. Fetch fresh counts
    const [counts] = await query(
      `SELECT 
         (SELECT COUNT(*) FROM user_follows WHERE following_id = ?) AS target_followers_count,
         (SELECT COUNT(*) FROM user_follows WHERE follower_id = ?) AS my_following_count`,
      [followingId, followerId]
    );

    const isNowFollowing = shouldFollow;

    // 4. Non-blocking In-App & Firebase FCM push notification to target user on follow
    if (isNowFollowing) {
      notifyFollow({ followerId, followingId }).catch((err) => {
        console.error('[Follow Notification] Non-blocking error:', err.message);
      });
    }

    return res.json({
      success: true,
      message: isNowFollowing ? 'Successfully followed user.' : 'Successfully unfollowed user.',
      action: isNowFollowing ? 'followed' : 'unfollowed',
      is_following: isNowFollowing,
      followers_count: Number(counts?.target_followers_count) || 0,
      my_following_count: Number(counts?.my_following_count) || 0,
    });
  } catch (err) {
    console.error('toggleFollowUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update follow status.' });
  }
}

/**
 * Follow a User (Explicit Follow or Toggle)
 * POST /api/mobile/users/:userId/follow
 */
export async function followUser(req, res) {
  // If no specific action specified in body, delegate to toggleFollowUser with action='follow'
  // Or if client intends toggle, can pass action='toggle'
  req.body = req.body || {};
  if (!req.body.action) {
    req.body.action = 'follow';
  }
  return toggleFollowUser(req, res);
}

/**
 * Unfollow a User (Explicit Unfollow)
 * POST /api/mobile/users/:userId/unfollow or DELETE /api/mobile/users/:userId/follow
 */
export async function unfollowUser(req, res) {
  req.body = req.body || {};
  req.body.action = 'unfollow';
  return toggleFollowUser(req, res);
}

/**
 * Get List of Followers
 * GET /api/mobile/users/:userId/followers
 */
export async function getFollowers(req, res) {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    if (!targetUserId || isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required.' });
    }

    const followers = await cache.getOrSet(`mobile:user:${targetUserId}:followers`, 30, async () => {
      const rows = await query(
        `SELECT 
           u.id, 
           u.full_name, 
           u.avatar_url, 
           u.bio, 
           u.level, 
           u.role,
           uf.created_at AS followed_at
         FROM user_follows uf
         JOIN users u ON u.id = uf.follower_id
         WHERE uf.following_id = ? AND u.is_banned = 0 AND u.role != 'superadmin'
         ORDER BY uf.id DESC
         LIMIT 100`,
        [targetUserId]
      );
      return rows;
    });

    return res.json({
      success: true,
      count: (followers || []).length,
      followers: followers || [],
    });
  } catch (err) {
    console.error('getFollowers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve followers.' });
  }
}

/**
 * Get List of Following
 * GET /api/mobile/users/:userId/following
 */
export async function getFollowing(req, res) {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    if (!targetUserId || isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required.' });
    }

    const following = await cache.getOrSet(`mobile:user:${targetUserId}:following`, 30, async () => {
      const rows = await query(
        `SELECT 
           u.id, 
           u.full_name, 
           u.avatar_url, 
           u.bio, 
           u.level, 
           u.role,
           uf.created_at AS followed_at
         FROM user_follows uf
         JOIN users u ON u.id = uf.following_id
         WHERE uf.follower_id = ? AND u.is_banned = 0 AND u.role != 'superadmin'
         ORDER BY uf.id DESC
         LIMIT 100`,
        [targetUserId]
      );
      return rows;
    });

    return res.json({
      success: true,
      count: (following || []).length,
      following: following || [],
    });
  } catch (err) {
    console.error('getFollowing error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve following list.' });
  }
}

/**
 * Get User's Posts (Paginated)
 * GET /api/mobile/users/:userId/posts
 */
export async function getUserPosts(req, res) {
  try {
    await ensureFeedSchema();
    const targetUserId = parseInt(req.params.userId, 10);
    const currentUserId = req.user?.id || null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    if (!targetUserId || isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required.' });
    }

    // Check if either user has blocked the other
    if (currentUserId && currentUserId !== targetUserId) {
      const blockCheck = await query(
        'SELECT blocker_id FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1',
        [currentUserId, targetUserId, targetUserId, currentUserId]
      );
      if (blockCheck.length > 0) {
        const isBlockedByMe = blockCheck[0].blocker_id === currentUserId;
        return res.status(403).json({
          success: false,
          message: isBlockedByMe
            ? 'You have blocked this user. Unblock them to view their posts.'
            : 'Posts are unavailable because this user has blocked you.',
          is_blocked: true,
          blocked_by_me: isBlockedByMe,
          is_blocked_by_other: !isBlockedByMe,
          blocked_by_them: !isBlockedByMe,
          posts: [],
          total: 0,
        });
      }
    }

    const cacheKey = `mobile:user:posts:${targetUserId}:page:${page}:limit:${limit}`;
    const cachedData = await cache.getOrSet(cacheKey, 30, async () => {
      // 1. Total posts count
      const [countResult] = await query('SELECT COUNT(*) as total FROM posts WHERE user_id = ?', [targetUserId]);
      const total = countResult?.total || 0;

      // 2. Fetch posts
      const postsRaw = await query(
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
           u.vip_package
         FROM posts p
         JOIN users u ON u.id = p.user_id
         WHERE p.user_id = ?
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`,
        [targetUserId, limit, offset]
      );

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
          if (!mediaByPostId[m.post_id]) mediaByPostId[m.post_id] = [];
          mediaByPostId[m.post_id].push(m);
        });
      }

      const items = postsRaw.map((row) => {
        let parsedMedia = [];
        if (mediaByPostId[row.id] && mediaByPostId[row.id].length > 0) {
          parsedMedia = mediaByPostId[row.id];
        } else if (row.media) {
          try {
            parsedMedia = typeof row.media === 'string' ? JSON.parse(row.media) : row.media;
          } catch {
            parsedMedia = [];
          }
        } else if (row.media_url) {
          parsedMedia = [{ media_type: row.media_type || 'image', media_url: row.media_url }];
        }

        return {
          id: row.id,
          user_id: row.user_id,
          title: row.title || null,
          content: row.content || '',
          media_type: row.media_type,
          media_url: row.media_url || (parsedMedia[0]?.media_url || null),
          media: parsedMedia,
          likes_count: Number(row.likes_count) || 0,
          comments_count: Number(row.comments_count) || 0,
          created_at: row.created_at,
          updated_at: row.updated_at,
          author: {
            id: row.user_id,
            name: row.author_name,
            full_name: row.author_name,
            avatar_url: row.author_avatar_url,
            profile_image: row.author_avatar_url,
            role: row.author_role,
            level: row.author_level || 1,
            vip_package: row.vip_package || 'Standard',
          },
        };
      });

      return {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 1,
        posts: items,
      };
    });

    // Decorate is_liked dynamically for viewer
    let postsWithUserContext = cachedData.posts;
    if (currentUserId && postsWithUserContext.length > 0) {
      const pIds = postsWithUserContext.map((p) => p.id);
      const placeholders = pIds.map(() => '?').join(',');
      const likedRows = await query(
        `SELECT post_id FROM post_reactions WHERE user_id = ? AND post_id IN (${placeholders})`,
        [currentUserId, ...pIds]
      ).catch(() => []);
      const likedSet = new Set(likedRows.map((r) => r.post_id));

      postsWithUserContext = postsWithUserContext.map((p) => ({
        ...p,
        is_liked: likedSet.has(p.id),
        is_mine: currentUserId === p.user_id,
      }));
    } else {
      postsWithUserContext = postsWithUserContext.map((p) => ({
        ...p,
        is_liked: false,
        is_mine: false,
      }));
    }

    return res.json({
      success: true,
      total: cachedData.total,
      page: cachedData.page,
      limit: cachedData.limit,
      total_pages: cachedData.total_pages,
      posts: postsWithUserContext,
    });
  } catch (err) {
    console.error('getUserPosts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user posts.' });
  }
}

/**
 * Block a User
 * POST /api/mobile/users/:userId/block
 */
export async function blockUser(req, res) {
  try {
    const blockerId = req.user.id;
    const blockedId = parseInt(req.params.userId, 10);
    const reason = (req.body.reason || '').trim().slice(0, 255);

    if (!blockedId || isNaN(blockedId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID to block is required.' });
    }
    if (blockerId === blockedId) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself.' });
    }

    // 1. Database-First Write (SSOT)
    await query(
      'INSERT IGNORE INTO user_blocks (blocker_id, blocked_id, reason) VALUES (?, ?, ?)',
      [blockerId, blockedId, reason]
    );

    // Mutual unfollow on block
    await query(
      'DELETE FROM user_follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)',
      [blockerId, blockedId, blockedId, blockerId]
    );

    // 2. Instant Redis Cache Invalidation
    await Promise.allSettled([
      cache.del(`mobile:user:profile:${blockerId}`),
      cache.del(`mobile:user:profile:${blockedId}`),
      cache.del(`mobile:user:public:${blockedId}`),
      cache.del(`mobile:user:public:${blockerId}`),
      cache.del(`mobile:user:${blockedId}:followers`),
      cache.del(`mobile:user:${blockerId}:following`),
      cache.del(`mobile:user:${blockerId}:blocked`),
      cache.delByPattern('chat:conversations:*'),
      cache.delByPattern('feed:list:*'),
      cache.delByPattern('mobile:rooms:*'),
      cache.delByPattern(`mobile:user:posts:${blockedId}:*`),
      cache.delByPattern(`mobile:user:posts:${blockerId}:*`),
    ]);

    return res.json({
      success: true,
      message: 'User blocked successfully.',
      is_blocked: true,
    });
  } catch (err) {
    console.error('blockUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to block user.' });
  }
}

/**
 * Unblock a User
 * DELETE /api/mobile/users/:userId/block or POST /api/mobile/users/:userId/unblock
 */
export async function unblockUser(req, res) {
  try {
    const blockerId = req.user.id;
    const blockedId = parseInt(req.params.userId, 10);

    if (!blockedId || isNaN(blockedId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID to unblock is required.' });
    }

    // 1. Database-First Write (SSOT)
    await query(
      'DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
      [blockerId, blockedId]
    );

    // 2. Instant Redis Cache Invalidation
    await Promise.allSettled([
      cache.del(`mobile:user:profile:${blockerId}`),
      cache.del(`mobile:user:profile:${blockedId}`),
      cache.del(`mobile:user:public:${blockedId}`),
      cache.del(`mobile:user:public:${blockerId}`),
      cache.del(`mobile:user:${blockerId}:blocked`),
      cache.delByPattern('chat:conversations:*'),
      cache.delByPattern('feed:list:*'),
      cache.delByPattern('mobile:rooms:*'),
      cache.delByPattern(`mobile:user:posts:${blockedId}:*`),
      cache.delByPattern(`mobile:user:posts:${blockerId}:*`),
    ]);

    return res.json({
      success: true,
      message: 'User unblocked successfully.',
      is_blocked: false,
    });
  } catch (err) {
    console.error('unblockUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to unblock user.' });
  }
}

/**
 * Get List of Blocked Users
 * GET /api/mobile/users/blocked
 */
export async function getBlockedUsers(req, res) {
  try {
    const userId = req.user.id;
    const blocked = await cache.getOrSet(`mobile:user:${userId}:blocked`, 30, async () => {
      const rows = await query(
        `SELECT 
           u.id, 
           u.full_name, 
           COALESCE(u.avatar_url, CONCAT('https://api.dicebear.com/7.x/avataaars/svg?seed=', u.id)) AS avatar_url, 
           u.bio, 
           u.level, 
           u.role,
           u.country,
           ub.reason,
           ub.created_at AS blocked_at
         FROM user_blocks ub
         JOIN users u ON u.id = ub.blocked_id
         WHERE ub.blocker_id = ?
         ORDER BY ub.id DESC`,
        [userId]
      );
      return rows;
    });

    return res.json({
      success: true,
      count: (blocked || []).length,
      blocked_users: blocked || [],
    });
  } catch (err) {
    console.error('getBlockedUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve blocked users list.' });
  }
}

/**
 * Report a User
 * POST /api/mobile/users/:userId/report
 */
export async function reportUser(req, res) {
  try {
    const reporterId = req.user.id;
    const reportedId = parseInt(req.params.userId, 10);
    const { reason, description = '', room_id = null } = req.body;

    if (!reportedId || isNaN(reportedId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID to report is required.' });
    }
    if (reporterId === reportedId) {
      return res.status(400).json({ success: false, message: 'You cannot report yourself.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Report reason is required (e.g. Harassment, Spam, Inappropriate Content, Impersonation).' });
    }

    const cleanReason = reason.trim().slice(0, 100);
    const cleanDesc = (description || '').trim();
    const cleanRoomId = room_id ? String(room_id).trim().slice(0, 64) : null;

    // 1. Database-First Write (SSOT)
    const result = await query(
      `INSERT INTO moderation_reports (reporter_id, reported_id, room_id, reason, description, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [reporterId, reportedId, cleanRoomId, cleanReason, cleanDesc]
    );

    return res.status(201).json({
      success: true,
      message: 'User report submitted successfully. Our safety & moderation team will investigate this account.',
      report_id: result.insertId,
    });
  } catch (err) {
    console.error('reportUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
}

/**
 * Mobile User Search (for post tagging, profile search, mentions)
 * GET /api/mobile/users/search?q={searchTerm}
 * Excludes superadmin and banned users
 */
export async function searchUsers(req, res) {
  try {
    const rawQuery = String(req.query.q || req.query.search || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const cacheKey = `mobile:users:search:${encodeURIComponent(rawQuery)}:p:${page}:l:${limit}`;
    const data = await cache.getOrSet(cacheKey, 20, async () => {
      let whereConditions = ["u.role != 'superadmin'", "u.is_banned = 0"];
      let params = [];

      if (rawQuery.length > 0) {
        const isNumeric = /^\d+$/.test(rawQuery);
        if (isNumeric) {
          whereConditions.push('(u.id = ? OR u.full_name LIKE ?)');
          params.push(parseInt(rawQuery, 10), `%${rawQuery}%`);
        } else {
          whereConditions.push('u.full_name LIKE ?');
          params.push(`%${rawQuery}%`);
        }
      }

      const whereClause = whereConditions.join(' AND ');
      const rows = await query(
        `SELECT u.id, u.full_name, u.avatar_url, u.role, u.level, u.star,
                pc.name as package_category_name, pc.badge_icon as package_badge_icon, pc.color_code as package_color
         FROM users u
         LEFT JOIN user_package_subscriptions ups ON ups.user_id = u.id AND ups.status = 'active' AND ups.expires_at > NOW()
         LEFT JOIN package_categories pc ON pc.id = ups.category_id
         WHERE ${whereClause}
         ORDER BY (u.full_name LIKE ?) DESC, u.level DESC, u.id ASC
         LIMIT ? OFFSET ?`,
        [...params, `${rawQuery}%`, limit, offset]
      );

      const [countRow] = await query(`SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`, params);
      return {
        users: rows || [],
        total: countRow?.total || 0,
        page,
        limit,
      };
    });

    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('searchUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to search users.' });
  }
}
