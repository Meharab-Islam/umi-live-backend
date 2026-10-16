import express from 'express';
import {
  getThumbnailCatalog,
  getMyThumbnails,
  purchaseThumbnail,
  toggleThumbnail,
  getCustomThumbnailUploadConfig,
  uploadCustomThumbnail,
} from '../../controllers/mobile/thumbnailController.js';
import { requireAuth, optionalAuth } from '../../middlewares/authMiddleware.js';
import { optionalRoomMediaUpload } from '../../middleware/upload.js';

const router = express.Router();

// Custom Thumbnail Upload Configuration (admin-configured coin fee & validity days)
router.get('/upload-config', optionalAuth, getCustomThumbnailUploadConfig);

// Authenticated: Custom Thumbnail Upload with Coin Deduction & Auto-Equip into My Thumbnails
router.post('/upload', requireAuth, optionalRoomMediaUpload, uploadCustomThumbnail);
router.post('/custom-upload', requireAuth, optionalRoomMediaUpload, uploadCustomThumbnail);

// Store List / Catalog: View all active available special thumbnails/frames in store (excludes user custom thumbnails)
router.get('/', optionalAuth, getThumbnailCatalog);

// Authenticated: View my owned thumbnails & active status (includes purchased + user-uploaded custom thumbnails)
router.get('/my-thumbnails', requireAuth, getMyThumbnails);

// Authenticated: Purchase thumbnail frame with coins
router.post('/purchase', requireAuth, purchaseThumbnail);
router.post('/:id/purchase', requireAuth, purchaseThumbnail);

// Authenticated: Switch / Toggle active or inactive thumbnail (equip / unequip)
router.post('/:id/toggle', requireAuth, toggleThumbnail);
router.post('/:id/equip', requireAuth, toggleThumbnail);

export default router;
