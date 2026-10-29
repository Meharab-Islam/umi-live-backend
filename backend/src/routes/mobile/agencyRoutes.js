import express from 'express';
import { requireAuth, requireAgency, optionalAuth } from '../../middlewares/authMiddleware.js';
import {
  getAgencyOverview,
  getAgencyHosts,
  removeHostFromAgency,
  banHostBroadcast,
  unbanHostBroadcast,
  getBannedHosts,
  getHostRequests,
  approveHostRequest,
  rejectHostRequest,
  applyToAgency,
  getMyAgencyApplication,
  cancelHostApplication,
  getAllAgencies,
  updateAgencyCommission,
} from '../../controllers/mobile/agencyController.js';
import { getTopAgencies } from '../../controllers/mobile/leaderboardController.js';

const router = express.Router();

/**
 * Mobile Agency Management API Routes
 * Mounted at: /api/mobile/agency and /api/v1/agency
 */

// Public / Global User Leaderboard Endpoint: Top agencies sorted by coins & hosts
router.get('/top', getTopAgencies);
router.get('/top-agencies', getTopAgencies);

// Host / User Application to Join an Agency (requires user authentication)
router.get('/my-application', requireAuth, getMyAgencyApplication);
router.post('/apply', requireAuth, applyToAgency);
router.post('/my-application/cancel', requireAuth, cancelHostApplication);
router.delete('/my-application', requireAuth, cancelHostApplication);
router.post('/requests/:requestId/cancel', requireAuth, cancelHostApplication);

// All Agencies Directory (accessible to normal users wishing to apply as host, agencies, and moderators)
router.get('/list', optionalAuth, getAllAgencies);
router.get('/all', optionalAuth, getAllAgencies);

// Agency Management Routes (requires agency, moderator, admin, or superadmin privileges)
router.use(requireAuth, requireAgency);

// Commission update routes
router.put('/commission', updateAgencyCommission);
router.post('/commission', updateAgencyCommission);
router.patch('/commission', updateAgencyCommission);

// 1. Static Routes (MUST be registered before parameterized /:agencyId routes to avoid path collision)
router.get('/overview', getAgencyOverview);
router.get('/hosts', getAgencyHosts);
router.get('/banned-hosts', getBannedHosts);
router.get('/requests', getHostRequests);
router.post('/requests/:requestId/approve', approveHostRequest);
router.post('/requests/:requestId/reject', rejectHostRequest);
router.post('/hosts/:hostId/remove', removeHostFromAgency);
router.delete('/hosts/:hostId', removeHostFromAgency);
router.post('/hosts/:hostId/ban-broadcast', banHostBroadcast);
router.post('/hosts/:hostId/unban-broadcast', unbanHostBroadcast);

// 2. Parameterized Routes with numeric agencyId (for Elevated Roles / Moderators / Specific Agency)
router.put('/:agencyId(\\d+)/commission', updateAgencyCommission);
router.post('/:agencyId(\\d+)/commission', updateAgencyCommission);
router.get('/:agencyId(\\d+)/overview', getAgencyOverview);
router.get('/:agencyId(\\d+)/hosts', getAgencyHosts);
router.get('/:agencyId(\\d+)/banned-hosts', getBannedHosts);
router.get('/:agencyId(\\d+)/requests', getHostRequests);
router.post('/:agencyId(\\d+)/requests/:requestId/approve', approveHostRequest);
router.post('/:agencyId(\\d+)/requests/:requestId/reject', rejectHostRequest);
router.post('/:agencyId(\\d+)/hosts/:hostId/remove', removeHostFromAgency);
router.delete('/:agencyId(\\d+)/hosts/:hostId', removeHostFromAgency);
router.post('/:agencyId(\\d+)/hosts/:hostId/ban-broadcast', banHostBroadcast);
router.post('/:agencyId(\\d+)/hosts/:hostId/unban-broadcast', unbanHostBroadcast);
router.get('/:agencyId(\\d+)', getAgencyOverview);

export default router;
