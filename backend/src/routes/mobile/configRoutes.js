import express from 'express';
import { getAppConfig, getLiveKitConfigEndpoint } from '../../controllers/mobile/configController.js';

const router = express.Router();

/**
 * Public Mobile & Client Configuration Endpoints
 * GET /api/mobile/config
 * GET /api/mobile/config/livekit
 */
router.get('/', getAppConfig);
router.get('/livekit', getLiveKitConfigEndpoint);

export default router;
