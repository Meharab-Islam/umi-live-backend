import express from 'express';
import {
  getDashboardStats,
  getUsers,
  getUserDetails,
  getConversationMessages,
  getAdminChatUsers,
  getAdminConversations,
  getAdminConversationMessages,
  deleteAdminChatMessage,
  deleteAdminConversation,
  getAdminPosts,
  createAdminPost,
  deleteUserPost,
  updateUser,
  adjustBalance,
  rechargeCoins,
  getRechargeHistory,
  deleteUser,
  bulkDelete,
  getStreams,
  terminateStream,
  getGiftsAdmin,
  createGift,
  updateGift,
  deleteGift,
  getTopContributorsAdmin,
  clearGiftHistoryAdmin,
  getWithdrawals,
  processWithdrawal,
  getSettings,
  updateSetting,
  getAdminProfile,
  updateAdminProfile,
  getAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
  getAgencyHosts,
  assignUserToAgency,
  removeUserFromAgency,
  getModerators,
  addModerator,
  updateModerator,
  deleteModerator,
  getHosts,
  updateHostDetails,
  getHostRequests,
  createHostRequest,
  processHostRequest,
  getHostWithdrawalRatios,
  updateHostWithdrawalRatios,
  getWithdrawalConfigAdmin,
  updateWithdrawalConfigAdmin,
  getCoinPackagesAdmin,
  createCoinPackageAdmin,
  updateCoinPackageAdmin,
  deleteCoinPackageAdmin,
  toggleCoinPackageAdmin,
  getRechargePresetsAdmin,
  updateRechargePresetsAdmin,
  getResellers,
  assignReseller,
  deleteReseller,
  getResellerSales,
  recordResellerSale,
  deleteResellerSale,
  clearResellerSales,
  getChatTesterUsers,
  getChatTesterConversation,
  getAdminReports,
  getOffenderReports,
  updateAdminReportStatus,
  takeAdminReportAction,
  deleteAdminReport,
  bulkDeleteReports,
  getLiveRewardSettingsAdmin,
  updateLiveRewardSettingsAdmin,
  getLiveRewardHistoryAdmin,
  getLiveRewardStatsAdmin,
  getAdminCallLogs,
  getLevelConfigs,
  getLevelRewardOptions,
  createLevelConfig,
  updateLevelConfig,
  deleteLevelConfig,
  getLevelRewardHistory,
  seedDefaultLevels,
  resetAllUsersCoins,
  resetAllUsersDiamonds,
  resetAllUsersBalances,
  getStarSettings,
  updateStarSettings,
  recalculateAllUserStars,
  getAdminPrivacyPolicy,
  updateAdminPrivacyPolicy,
  getAdminDeletionRequests,
  approveDeletionRequest,
  rejectDeletionRequest,
  deleteDeletionRequestRecord,
} from '../controllers/adminController.js';
import {
  getAdminGamesList,
  toggleGameStatus,
  updateGameSettings,
} from '../controllers/mobile/gameController.js';

import {
  getPackageCategories,
  createPackageCategory,
  updatePackageCategory,
  deletePackageCategory,
  reorderCategories,
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  getPackageSubscribers,
  grantPackageToUser,
  revokeSubscription,
} from '../controllers/packageController.js';
import {
  getThumbnails,
  createThumbnail,
  updateThumbnail,
  deleteThumbnail,
  getThumbnailSubscribers,
  grantThumbnailToUser,
  revokeThumbnailSubscription,
  getEntryEffects,
  createEntryEffect,
  updateEntryEffect,
  deleteEntryEffect,
  getEntryEffectSubscribers,
  grantEntryEffectToUser,
  revokeEntryEffectSubscription,
} from '../controllers/specialItemController.js';
import {
  getAdminBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners,
} from '../controllers/bannerController.js';
import {
  previewMerge,
  executeMerge,
  getMergeHistory,
} from '../controllers/accountMergeController.js';
import {
  getAdminThemeItems,
  getThemeStats,
  createThemeItem,
  updateThemeItem,
  deleteThemeItem,
  setDefaultThemeItem,
} from '../controllers/adminThemeController.js';
import { upload, optionalFeedMediaUpload } from '../middleware/upload.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All admin routes require valid authentication & admin/superadmin privileges
router.use(requireAuth, requireAdmin);

// File Upload from Computer (Thumbnails, Entry Effects, Packages)
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const safeCategory = req.uploadCategory || (req.query.category || req.body.category || 'general').replace(/[^a-zA-Z0-9_-]/g, '') || 'general';
  const relativeUrl = `/uploads/${safeCategory}/${req.file.filename}`;

  return res.json({
    success: true,
    message: 'File uploaded successfully',
    url: relativeUrl,
    data: {
      url: relativeUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

// Dashboard
router.get('/stats', getDashboardStats);

// Posts Management (Browse, Search, Filter, Create from Device, Delete)
router.get('/posts', getAdminPosts);
router.post('/posts', optionalFeedMediaUpload, createAdminPost);
router.delete('/posts/:postId', deleteUserPost);

// User Management
router.get('/users', getUsers);
router.get('/users/:id/details', getUserDetails);
router.get('/users/:userId/chats/:conversationId/messages', getConversationMessages);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/bulk-delete', bulkDelete);
router.post('/users/:id/balance', adjustBalance);
router.post('/recharge-coin', rechargeCoins);
router.get('/recharge-history', getRechargeHistory);

// Chat Moderation & Message Management
router.get('/chats/users', getAdminChatUsers);
router.get('/chats/conversations', getAdminConversations);
router.get('/chats/conversations/:id/messages', getAdminConversationMessages);
router.delete('/chats/messages/:id', deleteAdminChatMessage);
router.delete('/chats/conversations/:id', deleteAdminConversation);

// Host Management
router.get('/hosts', getHosts);
router.patch('/hosts/:id', updateHostDetails);
router.get('/host-requests', getHostRequests);
router.post('/host-requests', createHostRequest);
router.post('/host-requests/:id/process', processHostRequest);
router.get('/host-ratios', getHostWithdrawalRatios);
router.put('/host-ratios', updateHostWithdrawalRatios);

// Reseller Management
router.get('/resellers', getResellers);
router.post('/resellers', assignReseller);
router.delete('/resellers/:id', deleteReseller);
router.get('/reseller-sales', getResellerSales);
router.post('/reseller-sales', recordResellerSale);
router.delete('/reseller-sales/:id', deleteResellerSale);
router.delete('/reseller-sales', clearResellerSales);

// Agency Management
router.get('/agencies', getAgencies);
router.post('/agencies', createAgency);
router.put('/agencies/:id', updateAgency);
router.delete('/agencies/:id', deleteAgency);
router.get('/agencies/:id/hosts', getAgencyHosts);
router.post('/agencies/:id/hosts', assignUserToAgency);
router.delete('/agencies/:id/hosts/:userId', removeUserFromAgency);

// Stream Moderation
router.get('/streams', getStreams);
router.post('/streams/:roomId/terminate', terminateStream);

// Gift Store Management & Top Contributors
router.get('/gifts/top-contributors', getTopContributorsAdmin);
router.delete('/gifts/history', clearGiftHistoryAdmin);
router.post('/gifts/clear-history', clearGiftHistoryAdmin);
router.get('/gifts', getGiftsAdmin);
router.post('/gifts', createGift);
router.put('/gifts/:id', updateGift);
router.delete('/gifts/:id', deleteGift);

// Cashout / Withdrawals
router.get('/withdrawals', getWithdrawals);
router.post('/withdrawals/:id/process', processWithdrawal);
router.get('/withdrawal-config', getWithdrawalConfigAdmin);
router.put('/withdrawal-config', updateWithdrawalConfigAdmin);

// Coin Recharge Packages & Presets Management
router.get('/coin-packages', getCoinPackagesAdmin);
router.post('/coin-packages', createCoinPackageAdmin);
router.put('/coin-packages/quick-presets', updateRechargePresetsAdmin);
router.get('/coin-packages/quick-presets', getRechargePresetsAdmin);
router.put('/coin-packages/:id', updateCoinPackageAdmin);
router.delete('/coin-packages/:id', deleteCoinPackageAdmin);
router.patch('/coin-packages/:id/toggle', toggleCoinPackageAdmin);

// Moderator Management
router.get('/moderators', getModerators);
router.post('/moderators', addModerator);
router.put('/moderators/:id', updateModerator);
router.delete('/moderators/:id', deleteModerator);

// Super Admin Profile Management
router.get('/profile', getAdminProfile);
router.put('/profile', updateAdminProfile);

// Platform System Settings
router.get('/settings', getSettings);
router.put('/settings/:key', updateSetting);

// VIP & Privilege Packages Management
router.get('/package-categories', getPackageCategories);
router.post('/package-categories', createPackageCategory);
router.put('/package-categories/:id', updatePackageCategory);
router.delete('/package-categories/:id', deletePackageCategory);
router.post('/package-categories/reorder', reorderCategories);

router.get('/packages', getPackages);
router.post('/packages', createPackage);
router.put('/packages/:id', updatePackage);
router.delete('/packages/:id', deletePackage);

router.get('/package-subscribers', getPackageSubscribers);
router.post('/packages/grant', grantPackageToUser);
router.delete('/package-subscribers/:id', revokeSubscription);

// Live Room Thumbnails
router.get('/thumbnails', getThumbnails);
router.post('/thumbnails', createThumbnail);
router.put('/thumbnails/:id', updateThumbnail);
router.delete('/thumbnails/:id', deleteThumbnail);
router.get('/thumbnails/subscribers', getThumbnailSubscribers);
router.post('/thumbnails/grant', grantThumbnailToUser);
router.delete('/thumbnails/subscribers/:id', revokeThumbnailSubscription);

// Entry Effects (SVGA & GIF)
router.get('/entry-effects', getEntryEffects);
router.post('/entry-effects', createEntryEffect);
router.put('/entry-effects/:id', updateEntryEffect);
router.delete('/entry-effects/:id', deleteEntryEffect);
router.get('/entry-effects/subscribers', getEntryEffectSubscribers);
router.post('/entry-effects/grant', grantEntryEffectToUser);
router.delete('/entry-effects/subscribers/:id', revokeEntryEffectSubscription);

// App Promotional & Live Event Banners
router.get('/banners', getAdminBanners);
router.post('/banners', createBanner);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);
router.patch('/banners/:id/toggle', toggleBannerStatus);
router.post('/banners/reorder', reorderBanners);

// App Custom Themes (Page Backgrounds, Bottom Sheet Images, Color Palettes)
const setUploadCategory = (category) => (req, res, next) => {
  req.uploadCategory = category;
  next();
};

router.get('/themes', getAdminThemeItems);
router.get('/themes/stats', getThemeStats);
router.post('/themes', setUploadCategory('themes'), upload.single('file'), createThemeItem);
router.put('/themes/:id', setUploadCategory('themes'), upload.single('file'), updateThemeItem);
router.delete('/themes/:id', deleteThemeItem);
router.patch('/themes/:id/default', setDefaultThemeItem);

// Account Merge & Email Transfer (Lost Email Migration)
router.get('/merge-accounts/preview', previewMerge);
router.post('/merge-accounts/execute', executeMerge);
router.get('/merge-accounts/history', getMergeHistory);

// Real-Time Socket & Message Tester
router.get('/chat-tester/users', getChatTesterUsers);
router.get('/chat-tester/conversation', getChatTesterConversation);

// User Moderation & Reports
router.get('/reports', getAdminReports);
router.get('/reports/offender/:userId', getOffenderReports);
router.put('/reports/:id/status', updateAdminReportStatus);
router.post('/reports/:id/action', takeAdminReportAction);
router.delete('/reports/:id', deleteAdminReport);
router.post('/reports/bulk-delete', bulkDeleteReports);

// Live Streaming Duration & Session Reward Engine
router.get('/live-rewards/settings', getLiveRewardSettingsAdmin);
router.put('/live-rewards/settings', updateLiveRewardSettingsAdmin);
router.get('/live-rewards/history', getLiveRewardHistoryAdmin);
router.get('/live-rewards/stats', getLiveRewardStatsAdmin);

// 1-on-1 P2P Call Logs & History
router.get('/call-logs', getAdminCallLogs);

// User Levels & Progression Rewards
router.get('/levels', getLevelConfigs);
router.get('/levels/reward-options', getLevelRewardOptions);
router.post('/levels', createLevelConfig);
router.put('/levels/:id', updateLevelConfig);
router.delete('/levels/:id', deleteLevelConfig);
router.get('/levels/history', getLevelRewardHistory);
router.post('/levels/seed', seedDefaultLevels);
router.get('/levels/star-settings', getStarSettings);
router.put('/levels/star-settings', updateStarSettings);
router.post('/levels/recalculate-all-stars', recalculateAllUserStars);

// System-Wide Bulk Wallet Reset
router.post('/wallets/reset-all-coins', resetAllUsersCoins);
router.post('/wallets/reset-all-diamonds', resetAllUsersDiamonds);
router.post('/wallets/reset-all-balances', resetAllUsersBalances);

// Legal Policies Management (Privacy Policy & Terms)
router.get('/privacy-policy', getAdminPrivacyPolicy);
router.put('/privacy-policy', updateAdminPrivacyPolicy);

// Account Deletion Compliance & Audit
router.get('/deletion-requests', getAdminDeletionRequests);
router.post('/deletion-requests/:id/approve', approveDeletionRequest);
router.post('/deletion-requests/:id/reject', rejectDeletionRequest);
router.delete('/deletion-requests/:id', deleteDeletionRequestRecord);

// Mini-Games Management & Status Control
router.get('/games', getAdminGamesList);
router.patch('/games/:id/toggle', toggleGameStatus);
router.put('/games/:id', updateGameSettings);

export default router;

