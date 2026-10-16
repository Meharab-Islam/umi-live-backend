import express from 'express';
import { getAppConfig } from '../../controllers/mobile/configController.js';

const router = express.Router();

/**
 * Public Mobile & Client Configuration Endpoint
 * GET /api/mobile/config
 */
router.get('/', getAppConfig);

export default router;
