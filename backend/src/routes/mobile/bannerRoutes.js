import express from 'express';
import { getMobileBanners } from '../../controllers/mobile/bannerController.js';

const router = express.Router();

/**
 * Public Mobile & Client Banners Endpoint
 * GET /api/mobile/banners
 */
router.get('/', getMobileBanners);
router.get('/list', getMobileBanners);

export default router;
