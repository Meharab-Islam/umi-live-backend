import express from 'express';
import {
  getPublicPrivacyPolicy,
  getPublicTerms,
  getPublicBranding,
  submitAccountDeletionRequest,
} from '../controllers/publicController.js';

const router = express.Router();

/**
 * Public Web & Compliance Routes
 * Mounted at: /api/public
 */

router.get('/privacy-policy', getPublicPrivacyPolicy);
router.get('/terms', getPublicTerms);
router.get('/branding', getPublicBranding);
router.post('/account-deletion-request', submitAccountDeletionRequest);

export default router;
