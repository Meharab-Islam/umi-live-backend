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

// 1. Agency Overview & Metrics
router.get('/overview', getAgencyOverview);
router.get('/:agencyId', getAgencyOverview);
router.get('/:agencyId/overview', getAgencyOverview);

// 2. Affiliated Hosts Management
router.get('/hosts', getAgencyHosts);
router.get('/:agencyId/hosts', getAgencyHosts);
router.post('/hosts/:hostId/remove', removeHostFromAgency);
router.delete('/hosts/:hostId', removeHostFromAgency);
router.post('/:agencyId/hosts/:hostId/remove', removeHostFromAgency);
router.delete('/:agencyId/hosts/:hostId', removeHostFromAgency);

// 3. Timed Broadcast Ban & Suspension
router.post('/hosts/:hostId/ban-broadcast', banHostBroadcast);
router.post('/:agencyId/hosts/:hostId/ban-broadcast', banHostBroadcast);
router.post('/hosts/:hostId/unban-broadcast', unbanHostBroadcast);
router.post('/:agencyId/hosts/:hostId/unban-broadcast', unbanHostBroadcast);
router.get('/banned-hosts', getBannedHosts);
router.get('/:agencyId/banned-hosts', getBannedHosts);

// 4. Host Recruitment Join Requests
router.get('/requests', getHostRequests);
router.get('/:agencyId/requests', getHostRequests);
router.post('/requests/:requestId/approve', approveHostRequest);
router.post('/:agencyId/requests/:requestId/approve', approveHostRequest);
router.post('/requests/:requestId/reject', rejectHostRequest);
router.post('/:agencyId/requests/:requestId/reject', rejectHostRequest);

export default router;
