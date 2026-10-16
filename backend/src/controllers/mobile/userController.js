import { query } from '../../config/db.js';
import { cache } from '../../config/redis.js';

/**
 * Mobile User & Follow Controller
 * Follows SSOT (MySQL first) + Instant Redis Invalidation + Cache-Aside (GET)
 */

/**
 * Get Public User Profile with Follower & Following Counts
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
           u.role, 
           u.level, 
           u.star, 
           u.host_type, 
           u.created_at,
           (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) AS followers_count,
           (SELECT COUNT(*) FROM user_follows WHERE follower_id = u.id) AS following_count,
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
         WHERE u.id = ? AND u.is_banned = 0
         LIMIT 1`,
        [targetUserId]
      );
      return rows.length > 0 ? rows[0] : null;
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'User not found or account is deactivated.' });
    }

    // Check if current user is following target user (real-time check)
    let isFollowing = false;
    if (currentUserId && currentUserId !== targetUserId) {
      const followCheck = await query(
        'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
        [currentUserId, targetUserId]
      );
      isFollowing = followCheck.length > 0;
    }

    const followersCount = Number(profile.followers_count) || 0;
    const followingCount = Number(profile.following_count) || 0;

    return res.json({
      success: true,
      user: {
        id: profile.id,
        full_name: profile.full_name || 'Umi User',
        avatar_url: profile.avatar_url,
        bio: profile.bio || '',
        role: profile.role,
        level: profile.level || 1,
        star: profile.star || 0,
        host_type: profile.host_type,
        followers_count: followersCount,
        following_count: followingCount,
        is_following: isFollowing,
        is_mine: currentUserId === targetUserId,
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
      },
    });
  } catch (err) {
    console.error('getUserProfile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user profile.' });
  }
}

/**
 * Follow a User
 * POST /api/mobile/users/:userId/follow
 */
export async function followUser(req, res) {
  try {
    const followerId = req.user?.id;
    const followingId = parseInt(req.params.userId, 10);

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

    // 1. Database-First Write (SSOT)
    await query(
      'INSERT IGNORE INTO user_follows (follower_id, following_id) VALUES (?, ?)',
      [followerId, followingId]
    );

    // 2. Instant Redis Cache Invalidation
    await Promise.all([
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

    return res.json({
      success: true,
      message: 'Successfully followed user.',
      is_following: true,
      followers_count: Number(counts?.target_followers_count) || 0,
      my_following_count: Number(counts?.my_following_count) || 0,
    });
  } catch (err) {
    console.error('followUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to follow user.' });
  }
}

/**
 * Unfollow a User
 * POST /api/mobile/users/:userId/unfollow or DELETE /api/mobile/users/:userId/follow
 */
export async function unfollowUser(req, res) {
  try {
    const followerId = req.user?.id;
    const followingId = parseInt(req.params.userId, 10);

    if (!followerId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!followingId || isNaN(followingId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required.' });
    }

    // 1. Database-First Write (SSOT)
    await query(
      'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    // 2. Instant Redis Cache Invalidation
    await Promise.all([
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

    return res.json({
      success: true,
      message: 'Successfully unfollowed user.',
      is_following: false,
      followers_count: Number(counts?.target_followers_count) || 0,
      my_following_count: Number(counts?.my_following_count) || 0,
    });
  } catch (err) {
    console.error('unfollowUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to unfollow user.' });
  }
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
         WHERE uf.following_id = ? AND u.is_banned = 0
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
         WHERE uf.follower_id = ? AND u.is_banned = 0
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
