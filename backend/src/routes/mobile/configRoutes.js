import express from 'express';
import { getAppConfig, getLiveKitConfigEndpoint, getScreenGuardConfig, getMaintenanceStatus } from '../../controllers/mobile/configController.js';

const router = express.Router();

/**
 * Public Mobile & Client Configuration Endpoints
 * GET /api/mobile/config
 * GET /api/mobile/config/maintenance
 * GET /api/mobile/config/livekit
 * GET /api/mobile/config/screen-guard
 */
router.get('/', getAppConfig);
router.get('/maintenance', getMaintenanceStatus);
router.get('/livekit', getLiveKitConfigEndpoint);
router.get('/screen-guard', getScreenGuardConfig);

export default router;
