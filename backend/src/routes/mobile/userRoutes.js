import express from 'express';
import { requireAuth, optionalAuth } from '../../middlewares/authMiddleware.js';
import {
  getUserProfile,
  getUserPosts,
  toggleFollowUser,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
  searchUsers,
} from '../../controllers/mobile/userController.js';
import {
  updateFcmToken,
  removeFcmToken,
} from '../../controllers/mobile/authController.js';

const router = express.Router();

/**
 * Mobile User & Social Graph Routes
 * Base mount: /api/mobile/users
 */

// Device FCM Push Notification Token
router.post('/fcm-token', requireAuth, updateFcmToken);
router.delete('/fcm-token', requireAuth, removeFcmToken);

// General User Search (for post tagging, mentions, search) - must be before /:userId
router.get('/search', optionalAuth, searchUsers);

// Blocked Users list (Must be declared before parameterized /:userId routes)
router.get('/blocked', requireAuth, getBlockedUsers);

// Public / Authenticated Profile query with follower & following counts, received/gifted coins, posts count, package image
router.get('/:userId/profile', optionalAuth, getUserProfile);
router.get('/profile/:userId', optionalAuth, getUserProfile);

// User Posts stream (Paginated)
router.get('/:userId/posts', optionalAuth, getUserPosts);

// Follow / Unfollow actions (Single Unified Toggle + Dedicated aliases)
router.post('/:userId/toggle-follow', requireAuth, toggleFollowUser);
router.post('/:userId/follow', requireAuth, toggleFollowUser);
router.post('/:userId/unfollow', requireAuth, unfollowUser);
router.delete('/:userId/follow', requireAuth, unfollowUser);

// Follower & Following lists
router.get('/:userId/followers', optionalAuth, getFollowers);
router.get('/:userId/following', optionalAuth, getFollowing);

// User Moderation: Block / Unblock actions
router.post('/:userId/block', requireAuth, blockUser);
router.delete('/:userId/block', requireAuth, unblockUser);
router.post('/:userId/unblock', requireAuth, unblockUser);

// User Moderation: Report User action
router.post('/:userId/report', requireAuth, reportUser);

export default router;
