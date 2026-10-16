import express from 'express';
import configRoutes from './configRoutes.js';
import authRoutes from './authRoutes.js';
import liveRoutes from './liveRoutes.js';
import giftRoutes from './giftRoutes.js';
import walletRoutes from './walletRoutes.js';
import packageRoutes from './packageRoutes.js';
import entryEffectRoutes from './entryEffectRoutes.js';
import thumbnailRoutes from './thumbnailRoutes.js';
import resellerRoutes from './resellerRoutes.js';
import moderatorRoutes from './moderatorRoutes.js';
import hostRoutes from './hostRoutes.js';
import agencyRoutes from './agencyRoutes.js';
import feedRoutes from './feedRoutes.js';
import chatRoutes from './chatRoutes.js';
import userRoutes from './userRoutes.js';
import bannerRoutes from './bannerRoutes.js';
import leaderboardRoutes from './leaderboardRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = express.Router();

/**
 * Aggregated Mobile API Routes
 * Base paths when mounted on /api/mobile:
 * - /api/mobile/config        -> configRoutes (app identity, socket credentials, currency mode, URLs)
 * - /api/mobile/banners       -> bannerRoutes (global active promotional banners)
 * - /api/mobile/leaderboard   -> leaderboardRoutes (top gifters, top agencies)
 * - /api/mobile/auth          -> authRoutes (register, login, me, profile)
 * - /api/mobile/chat          -> chatRoutes (1-on-1 chatting, conversations, media messages, read receipts)
 * - /api/mobile/feed          -> feedRoutes (news feed, posts, reactions, comments, media attachments)
 * - /api/mobile/posts         -> feedRoutes (alias)
 * - /api/mobile/live          -> liveRoutes (rooms, join, leave, end)
 * - /api/mobile/gifts         -> giftRoutes (list, send, top-gifters)
 * - /api/mobile/wallet        -> walletRoutes (balance, packages, purchase, withdraw, transactions)
 * - /api/mobile/packages      -> packageRoutes (categories, list, purchase, privileges, my-packages, toggle)
 * - /api/mobile/entry-effects -> entryEffectRoutes (catalog, my-effects, toggle)
 * - /api/mobile/thumbnails    -> thumbnailRoutes (catalog, my-thumbnails, toggle)
 * - /api/mobile/reseller      -> resellerRoutes (balance, search users, recharge/transfer, transactions)
 * - /api/mobile/moderator     -> moderatorRoutes (search users, user devices, ban user, ban device)
 * - /api/mobile/host          -> hostRoutes (agency summary, monthly breakdown, stream logs, overview)
 * - /api/mobile/agency        -> agencyRoutes (top agencies, overview, hosts, broadcast ban/unban, join requests)
 * - /api/mobile/notifications -> notificationRoutes (FCM specs, token registration, multi-device routing)
 */
router.use('/config', configRoutes);
router.use('/banners', bannerRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/feed', feedRoutes);
router.use('/posts', feedRoutes);
router.use('/live', liveRoutes);
router.use('/gifts', giftRoutes);
router.use('/wallet', walletRoutes);
router.use('/packages', packageRoutes);
router.use('/entry-effects', entryEffectRoutes);
router.use('/thumbnails', thumbnailRoutes);
router.use('/reseller', resellerRoutes);
router.use('/moderator', moderatorRoutes);
router.use('/host', hostRoutes);
router.use('/agency', agencyRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);

export default router;
