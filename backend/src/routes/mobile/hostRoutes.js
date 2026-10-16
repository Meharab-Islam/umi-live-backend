import express from 'express';
import {
  getHostAgencySummary,
  getHostMonthlyBreakdown,
  getHostStreamHistory,
  getHostDashboardOverview,
} from '../../controllers/mobile/hostController.js';
import { requireAuth, requireHost } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// All host routes require authentication and host (or agency/admin) privileges
router.use(requireAuth, requireHost);

/**
 * Host Agency Membership & Lifetime Performance
 * GET /api/mobile/host/agency
 * GET /api/mobile/host/my-agency
 */
router.get('/agency', getHostAgencySummary);
router.get('/my-agency', getHostAgencySummary);

/**
 * Host Monthly Streaming & Earnings Daily Breakdown
 * GET /api/mobile/host/performance/monthly?month=YYYY-MM
 * GET /api/mobile/host/monthly?month=YYYY-MM
 */
router.get('/performance/monthly', getHostMonthlyBreakdown);
router.get('/monthly', getHostMonthlyBreakdown);

/**
 * Host Live Stream Sessions History
 * GET /api/mobile/host/streams?page=1&limit=20&month=YYYY-MM&live_type=all
 */
router.get('/streams', getHostStreamHistory);

/**
 * Host Real-Time Dashboard Overview (Today + Month + Agency)
 * GET /api/mobile/host/overview
 */
router.get('/overview', getHostDashboardOverview);

export default router;
