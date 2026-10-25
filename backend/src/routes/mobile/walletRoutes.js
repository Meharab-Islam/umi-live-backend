import express from 'express';
import {
  getWithdrawalHistory,
  getPendingWithdrawals,
  deleteWithdrawalRecord,
  clearWithdrawalHistory,
  cancelWithdrawalRequest,
} from '../../controllers/mobile/withdrawalController.js';
import {
  getBalances,
  getPackages,
  purchaseCoins,
  requestWithdrawal,
  getTransactions,
  getWithdrawalConfig,
  getRechargeConfig,
} from '../../controllers/mobile/walletController.js';
import { requireAuth, optionalAuth } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Mobile Wallet & Withdrawal API Routes
 * Mounted at: /api/mobile/wallet and /api/v1/wallet
 */

// Public: View coin recharge packages & presets config
router.get('/packages', getPackages);
router.get('/recharge-config', getRechargeConfig);

// Public / Authenticated: View withdrawal configuration with personalized role rule
router.get('/withdrawal-config', optionalAuth, getWithdrawalConfig);

// Authenticated Mobile Wallet Actions
router.get('/balance', requireAuth, getBalances);
router.post('/purchase', requireAuth, purchaseCoins);
router.get('/transactions', requireAuth, getTransactions);

/**
 * Withdrawal Requests
 * POST /api/mobile/wallet/withdraw         - Submit new withdrawal request
 */
router.post('/withdraw', requireAuth, requestWithdrawal);

/**
 * Withdrawal History (Redis Cache-Aside)
 * GET  /api/mobile/wallet/withdrawals              - Full paginated history (?page=1&limit=20&status=all)
 * GET  /api/mobile/wallet/withdrawal-history       - Alias
 * GET  /api/mobile/wallet/withdrawals/pending      - Only pending requests
 */
router.get('/withdrawals/pending', requireAuth, getPendingWithdrawals);
router.get('/withdrawals', requireAuth, getWithdrawalHistory);
router.get('/withdrawal-history', requireAuth, getWithdrawalHistory);

/**
 * Cancel Pending Withdrawal (Refunds diamonds)
 * POST /api/mobile/wallet/withdrawals/:id/cancel
 */
router.post('/withdrawals/:id/cancel', requireAuth, cancelWithdrawalRequest);

/**
 * Delete Single Withdrawal Record from History
 * DELETE /api/mobile/wallet/withdrawals/:id
 */
router.delete('/withdrawals/:id', requireAuth, deleteWithdrawalRecord);

/**
 * Bulk Clear Withdrawal History
 * DELETE /api/mobile/wallet/withdrawals            - Delete all settled records
 * POST   /api/mobile/wallet/withdrawals/clear      - Same, POST variant (query: ?status=&period=all|today|month)
 */
router.post('/withdrawals/clear', requireAuth, clearWithdrawalHistory);
router.delete('/withdrawals', requireAuth, clearWithdrawalHistory);

export default router;
