import express from 'express';
import {
  getPackageCategories,
  getPackages,
  purchasePackage,
  getUserPrivileges,
  getMyPackages,
  togglePackageActive,
  getPackagesByCategory,
} from '../../controllers/mobile/packageController.js';
import { requireAuth, optionalAuth } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// VIP Packages & Categories (Supports optional user auth to identify purchased packages)
router.get('/categories', optionalAuth, getPackageCategories);
router.get('/categories/:categoryId', optionalAuth, getPackagesByCategory);
router.get('/categories/:categoryId/packages', optionalAuth, getPackagesByCategory); // packages under a specific category
router.get('/', optionalAuth, getPackages);
router.post('/purchase', requireAuth, purchasePackage);
router.get('/my-privileges', requireAuth, getUserPrivileges);
router.get('/my-packages', requireAuth, getMyPackages);
router.post('/:id/toggle', requireAuth, togglePackageActive);

export default router;
