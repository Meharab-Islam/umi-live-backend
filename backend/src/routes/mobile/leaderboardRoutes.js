import express from 'express';
import { getTopGifters, getTopAgencies } from '../../controllers/mobile/leaderboardController.js';

const router = express.Router();

/**
 * Mobile Leaderboards Endpoints (Public for all global users)
 * GET /api/mobile/leaderboard/gifters
 * GET /api/mobile/leaderboard/top-gifters
 * GET /api/mobile/leaderboard/agencies
 * GET /api/mobile/leaderboard/top-agencies
 */
router.get('/gifters', getTopGifters);
router.get('/top-gifters', getTopGifters);

router.get('/agencies', getTopAgencies);
router.get('/top-agencies', getTopAgencies);

export default router;
