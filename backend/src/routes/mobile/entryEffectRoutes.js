import express from 'express';
import {
  getEntryEffectCatalog,
  getMyEntryEffects,
  purchaseEntryEffect,
  toggleEntryEffect,
} from '../../controllers/mobile/entryEffectController.js';
import { requireAuth, optionalAuth } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Store List / Catalog: View all active available entry effects in store (with user purchase status if authenticated)
router.get('/', optionalAuth, getEntryEffectCatalog);

// Authenticated: View my owned entry effects & active status
router.get('/my-effects', requireAuth, getMyEntryEffects);

// Authenticated: Purchase entry effect with coins
router.post('/purchase', requireAuth, purchaseEntryEffect);
router.post('/:id/purchase', requireAuth, purchaseEntryEffect);

// Authenticated: Switch / Toggle active or inactive entry effect (equip / unequip)
router.post('/:id/toggle', requireAuth, toggleEntryEffect);
router.post('/:id/equip', requireAuth, toggleEntryEffect);

export default router;
