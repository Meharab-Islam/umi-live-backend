import express from 'express';
import {
  searchUsersForModeration,
  getUserAndDevices,
  toggleUserBan,
  toggleDeviceBan,
  getBannedDevicesList,
  registerDeviceForUser,
} from '../../controllers/mobile/moderatorController.js';
import {
  getAllAgencies,
  getAgencyOverview,
  getAgencyHosts,
  removeHostFromAgency,
  banHostBroadcast,
  unbanHostBroadcast,
  getBannedHosts,
  getHostRequests,
  approveHostRequest,
  rejectHostRequest,
  updateAgencyCommission,
} from '../../controllers/mobile/agencyController.js';
import { requireAuth, requireModerator, requireAgencyOrModerator } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// All moderator routes require authentication
router.use(requireAuth);

/**
 * User Moderation Search
 * GET /api/mobile/moderator/users/search?q={searchTerm}
 */
router.get('/users/search', requireModerator, searchUsersForModeration);

/**
 * User & Registered Devices Inspection
 * GET /api/mobile/moderator/users/:userId
 * GET /api/mobile/moderator/users/:userId/devices
 */
router.get('/users/:userId', requireModerator, getUserAndDevices);
router.get('/users/:userId/devices', requireModerator, getUserAndDevices);

/**
 * User Ban & Suspension Controls
 * POST /api/mobile/moderator/users/:userId/ban
 * PUT  /api/mobile/moderator/users/:userId/ban
 */
router.post('/users/:userId/ban', requireModerator, toggleUserBan);
router.put('/users/:userId/ban', requireModerator, toggleUserBan);

/**
 * User-Scoped Device Ban Controls (First select User ID, then ban that user's device)
 * POST /api/mobile/moderator/users/:userId/devices/:deviceId/ban
 * PUT  /api/mobile/moderator/users/:userId/devices/:deviceId/ban
 * POST /api/mobile/moderator/devices/:deviceId/ban (with userId in body or query)
 * PUT  /api/mobile/moderator/devices/:deviceId/ban (with userId in body or query)
 */
router.post('/users/:userId/devices/:deviceId/ban', requireModerator, toggleDeviceBan);
router.put('/users/:userId/devices/:deviceId/ban', requireModerator, toggleDeviceBan);
router.post('/devices/:deviceId/ban', requireModerator, toggleDeviceBan);
router.put('/devices/:deviceId/ban', requireModerator, toggleDeviceBan);

/**
 * Platform Banned Devices Listing
 * GET /api/mobile/moderator/devices?page=1&limit=20&search=
 */
router.get('/devices', requireModerator, getBannedDevicesList);

/**
 * Device Registration & Sync
 * POST /api/mobile/moderator/users/:userId/devices/register
 */
router.post('/users/:userId/devices/register', requireModerator, registerDeviceForUser);

/**
 * Agency Moderation & Comprehensive Oversight
 * Moderators can inspect any agency; agency owners can manage their own agency.
 */
router.get('/agencies', requireAgencyOrModerator, getAllAgencies);
router.get('/agencies/:agencyId', requireAgencyOrModerator, getAgencyOverview);
router.get('/agencies/:agencyId/overview', requireAgencyOrModerator, getAgencyOverview);
router.get('/agencies/:agencyId/hosts', requireAgencyOrModerator, getAgencyHosts);
router.post('/agencies/:agencyId/hosts/:hostId/remove', requireAgencyOrModerator, removeHostFromAgency);
router.delete('/agencies/:agencyId/hosts/:hostId', requireAgencyOrModerator, removeHostFromAgency);
router.post('/agencies/:agencyId/hosts/:hostId/ban-broadcast', requireAgencyOrModerator, banHostBroadcast);
router.post('/agencies/:agencyId/hosts/:hostId/unban-broadcast', requireAgencyOrModerator, unbanHostBroadcast);
router.get('/agencies/:agencyId/banned-hosts', requireAgencyOrModerator, getBannedHosts);
router.get('/agencies/:agencyId/requests', requireAgencyOrModerator, getHostRequests);
router.post('/agencies/:agencyId/requests/:requestId/approve', requireAgencyOrModerator, approveHostRequest);
router.post('/agencies/:agencyId/requests/:requestId/reject', requireAgencyOrModerator, rejectHostRequest);
router.put('/agencies/:agencyId/commission', requireAgencyOrModerator, updateAgencyCommission);
router.post('/agencies/:agencyId/commission', requireAgencyOrModerator, updateAgencyCommission);

export default router;
