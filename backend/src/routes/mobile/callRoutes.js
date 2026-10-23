import express from 'express';
import {
  getCallRates,
  initiateCall,
  acceptCall,
  rejectCall,
  heartbeatCall,
  endCall,
  getCallHistory,
} from '../../controllers/mobile/callController.js';
import { requireAuth, optionalAuth } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 1. Get 1-on-1 Call Rates & Caller Availability
router.get('/rates', optionalAuth, getCallRates);

// 2. Initiate Call (Audio or Video)
router.post('/initiate', requireAuth, initiateCall);
router.post('/start', requireAuth, initiateCall);

// 3. Accept Incoming Call
router.post('/accept', requireAuth, acceptCall);
router.post('/answer', requireAuth, acceptCall);

// 4. Reject or Cancel Call
router.post('/reject', requireAuth, rejectCall);
router.post('/cancel', requireAuth, rejectCall);

// 5. Minute-by-Minute Heartbeat Billing
router.post('/heartbeat', requireAuth, heartbeatCall);
router.post('/billing', requireAuth, heartbeatCall);

// 6. End Call (Hang Up)
router.post('/end', requireAuth, endCall);
router.post('/hangup', requireAuth, endCall);

// 7. Call History
router.get('/history', requireAuth, getCallHistory);

export default router;
