import express from 'express';
import { getLevelsProgression, getMyLevelRewards } from '../../controllers/mobile/levelController.js';
import { requireAuth, optionalAuth } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Public & Authenticated: Level Progression Roadmap & User Progress
 * GET /api/mobile/levels
 */
router.get('/', optionalAuth, getLevelsProgression);

/**
 * Authenticated: User Claimed Level Rewards
 * GET /api/mobile/levels/my-rewards
 */
router.get('/my-rewards', requireAuth, getMyLevelRewards);

export default router;
