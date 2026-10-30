import express from 'express';
import { getGifts, sendGift, getUserGiftContributions, getGlobalGiftBannerConfigMobile } from '../../controllers/mobile/giftController.js';
import { getTopGifters } from '../../controllers/mobile/leaderboardController.js';
import { requireAuth } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Public: Get all active virtual gifts
router.get('/', getGifts);

// Public: Get global gift announcement banner configuration
router.get('/global-banner-config', getGlobalGiftBannerConfigMobile);

// Public: Get global top gifters leaderboard
router.get('/top-gifters', getTopGifters);
router.get('/leaderboard', getTopGifters);

// Authenticated: Send gift to streamer/host
router.post('/send', requireAuth, sendGift);

// Authenticated: Get user gift contributions breakdown by recipient
router.get('/user/:userId/contributions', requireAuth, getUserGiftContributions);
router.get('/contributions/:userId', requireAuth, getUserGiftContributions);

export default router;
