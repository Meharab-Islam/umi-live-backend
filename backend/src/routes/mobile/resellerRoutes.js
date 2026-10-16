import express from 'express';
import {
  getResellerBalance,
  searchUsers,
  getUserDetails,
  rechargeUser,
  getResellerTransactions,
  deleteTransaction,
  clearTransactions,
} from '../../controllers/mobile/resellerController.js';
import { requireAuth, requireReseller } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// All reseller routes require authentication and reseller (or admin) privileges
router.use(requireAuth, requireReseller);

/**
 * Reseller Stock & Performance Profile
 * GET /api/mobile/reseller/balance
 * GET /api/mobile/reseller/profile
 */
router.get('/balance', getResellerBalance);
router.get('/profile', getResellerBalance);

/**
 * Customer User Search & Selection
 * GET /api/mobile/reseller/users/search?q={searchTerm}
 * GET /api/mobile/reseller/users/:userId
 */
router.get('/users/search', searchUsers);
router.get('/users/:userId', getUserDetails);

/**
 * Coin Recharge / Transfer to Customer
 * POST /api/mobile/reseller/recharge
 * POST /api/mobile/reseller/transfer
 */
router.post('/recharge', rechargeUser);
router.post('/transfer', rechargeUser);

/**
 * Reseller Transaction History & Audit
 * GET /api/mobile/reseller/transactions?page=1&limit=20&period=all&search=
 * DELETE /api/mobile/reseller/transactions/:id
 * DELETE /api/mobile/reseller/transactions
 * POST /api/mobile/reseller/transactions/clear
 */
router.get('/transactions', getResellerTransactions);
router.delete('/transactions/:id', deleteTransaction);
router.delete('/transactions', clearTransactions);
router.post('/transactions/clear', clearTransactions);

export default router;
