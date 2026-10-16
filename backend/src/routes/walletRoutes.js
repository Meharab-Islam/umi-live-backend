import express from 'express';
import {
  getBalances,
  getPackages,
  purchaseCoins,
  requestWithdrawal,
  getTransactions,
  getWithdrawalConfig,
  getRechargeConfig,
} from '../controllers/walletController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/packages', getPackages);
router.get('/recharge-config', getRechargeConfig);
router.get('/withdrawal-config', getWithdrawalConfig);

router.use(requireAuth);

router.get('/balance', getBalances);
router.post('/purchase', purchaseCoins);
router.post('/withdraw', requestWithdrawal);
router.get('/transactions', getTransactions);

export default router;
