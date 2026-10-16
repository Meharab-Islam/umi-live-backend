import express from 'express';
import { createRoom, getRooms, getRoomDetails, endRoom } from '../controllers/liveController.js';
import { requireAuth, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getRooms);
router.get('/:roomId', optionalAuth, getRoomDetails);
router.post('/start', requireAuth, createRoom);
router.post('/:roomId/end', requireAuth, endRoom);

export default router;
