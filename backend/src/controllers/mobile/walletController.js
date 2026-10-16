import { query, getPool } from '../../config/db.js';
import { cache } from '../../config/redis.js';
import * as walletService from '../walletController.js';

export const getBalances = walletService.getBalances;
export const getPackages = walletService.getPackages;
export const purchaseCoins = walletService.purchaseCoins;
export const requestWithdrawal = walletService.requestWithdrawal;
export const getTransactions = walletService.getTransactions;
export const getWithdrawalConfig = walletService.getWithdrawalConfig;
export const getRechargeConfig = walletService.getRechargeConfig;
