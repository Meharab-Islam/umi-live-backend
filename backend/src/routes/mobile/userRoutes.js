import express from 'express';
import { requireAuth, optionalAuth } from '../../middlewares/authMiddleware.js';
import {
  getUserProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from '../../controllers/mobile/userController.js';
import {
  updateFcmToken,
  removeFcmToken,
} from '../../controllers/mobile/authController.js';

const router = express.Router();

/**
 * Mobile User & Follow Routes
 * Base mount: /api/mobile/users
 */

// Device FCM Push Notification Token
router.post('/fcm-token', requireAuth, updateFcmToken);
router.delete('/fcm-token', requireAuth, removeFcmToken);

// Public / Authenticated Profile query with follower & following counts
router.get('/:userId/profile', optionalAuth, getUserProfile);
router.get('/profile/:userId', optionalAuth, getUserProfile);

// Follow / Unfollow actions
router.post('/:userId/follow', requireAuth, followUser);
router.post('/:userId/unfollow', requireAuth, unfollowUser);
router.delete('/:userId/follow', requireAuth, unfollowUser);

// Follower & Following lists
router.get('/:userId/followers', optionalAuth, getFollowers);
router.get('/:userId/following', optionalAuth, getFollowing);

export default router;
