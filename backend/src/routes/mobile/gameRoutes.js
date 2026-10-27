import express from 'express';
import {
  getGamesList,
  getGameDetails,
  handleGameWebhook,
} from '../../controllers/mobile/gameController.js';

const router = express.Router();

/**
 * @route   GET /api/mobile/games (and /api/games)
 * @desc    Get full catalog of all 7 integrated mini-games with direct Web and Socket endpoints
 * @access  Public
 */
router.get('/', getGamesList);

/**
 * @route   POST /api/mobile/games/webhook (and /api/games/webhook)
 * @desc    Secure webhook for game bet placement and round settlements
 * @access  Public (HMAC Verified)
 */
router.post('/webhook', handleGameWebhook);

/**
 * @route   GET /api/mobile/games/:slug
 * @desc    Get detailed specifications for a specific game
 * @access  Public
 */
router.get('/:slug', getGameDetails);

export default router;
