import express from 'express';
import {
  getDefaultTheme,
  getThemesCatalog,
  getActiveTheme,
  buyThemeItem,
  equipThemeItem,
  getMyThemeItems,
} from '../../controllers/mobile/themeController.js';
import { requireAuth, optionalAuth } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Mobile App Themes Endpoints
 * Base route: /api/mobile/themes
 */

// 1. 100% PUBLIC: System Default Theme for App Startup (ZERO Auth required)
// Call this immediately on Flutter App Launch / Splash Screen before user logs in
router.get('/default', getDefaultTheme);

// 2. PUBLIC / OPTIONAL AUTH: Themes Catalog & Store
router.get('/', optionalAuth, getThemesCatalog);

// 3. PUBLIC / OPTIONAL AUTH: Active Theme (Defaults or User-equipped)
router.get('/active', optionalAuth, getActiveTheme);

// 3. Authenticated: Buy a theme item with coins
router.post('/buy/:id', requireAuth, buyThemeItem);

// 4. Authenticated: Equip an owned or free theme item
router.post('/equip/:id', requireAuth, equipThemeItem);

// 5. Authenticated: View all owned / acquired theme items
router.get('/my', requireAuth, getMyThemeItems);

export default router;
