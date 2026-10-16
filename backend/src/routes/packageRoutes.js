import express from 'express';
import {
  getPackageCategories,
  getPackages,
  purchasePackage,
  getUserPrivileges,
  checkRoomActionPrivilege,
  getPackagesByCategory,
} from '../controllers/packageController.js';
import { requireAuth, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public / Mobile app endpoints to view packages (optional auth to identify purchased items)
router.get('/categories', optionalAuth, getPackageCategories);
router.get('/categories/:categoryId', optionalAuth, getPackagesByCategory);
router.get('/categories/:categoryId/packages', optionalAuth, getPackagesByCategory);
router.get('/', optionalAuth, getPackages);
router.get('/check-privilege', checkRoomActionPrivilege);

// Authenticated user endpoints
router.post('/purchase', requireAuth, purchasePackage);
router.get('/my-privileges', requireAuth, getUserPrivileges);
router.get('/user-privileges/:userId', getUserPrivileges);

export default router;
