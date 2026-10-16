import express from 'express';
import { getGifts, sendGift } from '../controllers/giftController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getGifts);
router.post('/send', requireAuth, sendGift);

export default router;
