import express from 'express';
import {
  getThumbnailCatalog,
  getMyThumbnails,
  purchaseThumbnail,
  toggleThumbnail,
} from '../../controllers/mobile/thumbnailController.js';
import { requireAuth, optionalAuth } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Store List / Catalog: View all active available special thumbnails/frames in store (with user purchase status if authenticated)
router.get('/', optionalAuth, getThumbnailCatalog);

// Authenticated: View my owned thumbnails & active status
router.get('/my-thumbnails', requireAuth, getMyThumbnails);

// Authenticated: Purchase thumbnail frame with coins
router.post('/purchase', requireAuth, purchaseThumbnail);
router.post('/:id/purchase', requireAuth, purchaseThumbnail);

// Authenticated: Switch / Toggle active or inactive thumbnail (equip / unequip)
router.post('/:id/toggle', requireAuth, toggleThumbnail);
router.post('/:id/equip', requireAuth, toggleThumbnail);

export default router;
