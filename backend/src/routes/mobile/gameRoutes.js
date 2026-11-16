import express from 'express';
import { listGames, launchGame } from '../../controllers/mobile/gameController.js';
import { requireAuth } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Mobile AGX Games API
 * Mounted at: /api/mobile/games and /api/v1/games
 *
 * GET  /            - Enabled games + where to show them (live room / home)
 * POST /launch      - { game_id } -> { launch_url, expires_in } to open in a WebView
 */
router.get('/', requireAuth, listGames);
router.post('/launch', requireAuth, launchGame);

export default router;
