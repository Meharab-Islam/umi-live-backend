import express from 'express';
import {
  getDashboardStats,
  getUsers,
  getUserDetails,
  getConversationMessages,
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
} from '../controllers/adminController.js';
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

// Account Merge & Email Transfer (Lost Email Migration)
router.get('/merge-accounts/preview', previewMerge);
router.post('/merge-accounts/execute', executeMerge);
router.get('/merge-accounts/history', getMergeHistory);

// Real-Time Socket & Message Tester
router.get('/chat-tester/users', getChatTesterUsers);
router.get('/chat-tester/conversation', getChatTesterConversation);

export default router;
