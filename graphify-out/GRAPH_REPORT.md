# Graph Report - umi_backend  (2026-10-25)

## Corpus Check
- 187 files · ~1,101,317 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1025 nodes · 2856 edges · 72 communities (55 shown, 17 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 407 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ba3dea75`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- controllers/packageController.js
- adminRoutes.js
- server.js
- admin-panel/package.json
- dependencies
- AGENTS.md
- deploy.sh
- 📡 API Endpoints Summary
- .oxlintrc.json
- React + Vite
- vite.config.js
- client.js
- Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy
- 🚀 UMI LIVE - VPS Deployment & Operations Master Guide
- moderatorRoutes.js
- test_moderator_agency_oversight.mjs
- controllers/bannerController.js
- feedController.js
- scripts
- add_host_api_docs.mjs
- mobile/liveController.js
- test_host_api.mjs
- mobile/walletRoutes.js
- chatController.js
- add_reseller_api_docs.mjs
- test_reseller_api.mjs
- add_moderator_api_docs.mjs
- test_moderator_api.mjs
- test_agency_api.mjs
- test_user_scoped_device_ban.mjs
- test_redis_instant_sync.mjs
- test_agency_applicant_flow.mjs
- test_user_live_history.mjs
- add_moderator_agency_docs.mjs
- redis.js
- test_redis_hit_and_freshness.mjs
- mobile/packageRoutes.js
- ApiDocs.jsx
- App.jsx
- dev.js
- test_google_token_flow.mjs
- controllers/walletController.js
- resellerController.js
- mobile/authController.js
- react
- query
- add_audio_live_api_docs.mjs
- thumbnailRoutes.js
- notificationRoutes.js
- entryEffectController.js
- mobile/index.js
- CreateCategory.jsx
- PackageManagement.jsx
- UserLivePortal.jsx
- ErrorBoundary
- hostController.js
- liveRewardService.js
- routes/liveRoutes.js
- Moderators.jsx
- callController.js
- db.js
- authMiddleware.js
- Posts.jsx
- AppThemes.jsx
- cache
- test_video_live_seat_guard.mjs

## God Nodes (most connected - your core abstractions)
1. `query()` - 352 edges
2. `react` - 46 edges
3. `getPool()` - 44 edges
4. `cache` - 39 edges
5. `request()` - 34 edges
6. `Loader()` - 27 edges
7. `requireAuth()` - 27 edges
8. `useEconomy()` - 21 edges
9. `buildRoomResponse()` - 21 edges
10. `resolveAssetUrl()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `query()`  [EXTRACTED]
  scratch/test_audio_live_seats.mjs → backend/src/config/db.js
- `main()` --calls--> `query()`  [EXTRACTED]
  scratch/test_socket_realtime_emission.mjs → backend/src/config/db.js
- `runTest()` --calls--> `query()`  [EXTRACTED]
  scratch/test_video_live_seat_guard.mjs → backend/src/config/db.js
- `getAllActiveFcmTokens()` --calls--> `query()`  [EXTRACTED]
  backend/src/config/firebase.js → backend/src/config/db.js
- `getMyPackages()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/packageController.js → backend/src/config/db.js

## Import Cycles
- None detected.

## Communities (72 total, 17 thin omitted)

### Community 0 - "controllers/packageController.js"
Cohesion: 0.14
Nodes (22): checkRoomActionPrivilege(), createPackage(), createPackageCategory(), deletePackage(), deletePackageCategory(), enrichCategoryWithUserSubscription(), enrichPackageWithUserSubscription(), formatCategoryPrivileges() (+14 more)

### Community 1 - "adminRoutes.js"
Cohesion: 0.07
Nodes (61): getPool(), addModerator(), adjustBalance(), assignReseller(), assignUserToAgency(), bulkDeleteReports(), clearGiftHistoryAdmin(), createAdminPost() (+53 more)

### Community 2 - "server.js"
Cohesion: 0.09
Nodes (22): __dirname, __filename, initializeDatabase(), router, router, API_SPEC, router, router (+14 more)

### Community 3 - "admin-panel/package.json"
Cohesion: 0.06
Nodes (31): dependencies, livekit-client, lucide-react, react, react-dom, socket.io-client, devDependencies, oxlint (+23 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (39): dependencies, bcryptjs, cors, dotenv, express, firebase-admin, ioredis, jsonwebtoken (+31 more)

### Community 5 - "AGENTS.md"
Cohesion: 0.25
Nodes (7): 1. Centralized .env Configuration & Project Portability Policy, 2. Production-Grade Zero-Downtime Redis Architecture, 3. Mandatory Database-First Mutation + Instant Redis Invalidation, 4. Mandatory Enforcement for All Future Features & Prompts, 5. Mandatory Mobile API Documentation & Interactive API Explorer (Swagger-like) Policy, 6. Mandatory Mobile API Directory Structure & Isolation Policy, Workspace AI Agent Rules

### Community 6 - "deploy.sh"
Cohesion: 0.67
Nodes (3): DEBIAN_FRONTEND, generate_secret(), deploy.sh script

### Community 7 - "📡 API Endpoints Summary"
Cohesion: 0.12
Nodes (15): 1. Start MySQL, 2. Start Backend, 3. Start React Admin Panel, Admin Console (`/api/admin`) *(Protected: Requires admin role)*, 📡 API Endpoints Summary, 🏗️ Architecture Overview, Authentication (`/api/auth`), 🔑 Default Admin & Seed Credentials (+7 more)

### Community 8 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 9 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

### Community 11 - "client.js"
Cohesion: 0.15
Nodes (21): accountMergeApi, authApi, bannerApi, API_BASE, del(), get(), getCurrentUser(), patch() (+13 more)

### Community 12 - "Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy"
Cohesion: 0.29
Nodes (6): 1. Centralized .env Control & Project Portability, 2. Production-Grade Zero-Downtime Redis Architecture, 3. Database-First Mutation + Instant Redis Invalidation, 4. All Read (GET) Requests Handled by Redis, 5. Mandatory Enforcement for All Future Features & Prompts, Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy

### Community 13 - "🚀 UMI LIVE - VPS Deployment & Operations Master Guide"
Cohesion: 0.08
Nodes (23): 1. 🔄 ভবিষ্যতে কোড আপডেট করার নিয়ম (How to Update Code), 2. ⚙️ `deploy.sh` স্ক্রিপ্ট চালালে কী কী ঘটে (What deploy.sh Does), 3. 🛠️ স্ক্রিপ্টে সমস্যা হলে কী করবেন (Troubleshooting & Fallback), 4. 📋 সম্পূর্ণ ম্যানুয়াল ডেপ্লয়মেন্ট গাইড (Manual Deployment Guide), 5. 💾 ডাটাবেজ ব্যাকআপ ও রিস্টোর (MySQL Backup & Restore), 6. 🧰 প্রয়োজনীয় কমান্ড চিটশিট (Daily Useful Commands), 🚀 UMI LIVE - VPS Deployment & Operations Master Guide, ক. সাধারণ কোড আপডেট (Standard Update - Zero Downtime) (+15 more)

### Community 14 - "moderatorRoutes.js"
Cohesion: 0.22
Nodes (22): applyToAgency(), approveHostRequest(), banHostBroadcast(), cancelHostApplication(), formatDuration(), getAgencyHosts(), getAgencyOverview(), getAllAgencies() (+14 more)

### Community 15 - "test_moderator_agency_oversight.mjs"
Cohesion: 0.83
Nodes (3): checkRedisKey(), makeRequest(), run()

### Community 16 - "controllers/bannerController.js"
Cohesion: 0.15
Nodes (10): executeMerge(), getMergeHistory(), previewMerge(), createBanner(), deleteBanner(), getAdminBanners(), getPublicBanners(), reorderBanners() (+2 more)

### Community 17 - "feedController.js"
Cohesion: 0.10
Nodes (50): candidatePaths, credentialsFilePath, __dirname, __filename, getAllActiveFcmTokens(), getFollowerFcmTokens(), getUserFcmTokens(), isFirebaseReady() (+42 more)

### Community 18 - "scripts"
Cohesion: 0.15
Nodes (12): description, name, private, scripts, build, dev, dev:admin, dev:all (+4 more)

### Community 20 - "mobile/liveController.js"
Cohesion: 0.08
Nodes (64): approveSeatRequest(), assignRoomAdmin(), buildRoomResponse(), cancelSeatRequest(), claimLiveReward(), createRoom(), decreaseRoomSeats(), deleteRoomChatMessage() (+56 more)

### Community 22 - "mobile/walletRoutes.js"
Cohesion: 0.23
Nodes (17): getBalances, getPackages, getRechargeConfig, getTransactions, getWithdrawalConfig, purchaseCoins, requestWithdrawal, cancelWithdrawalRequest() (+9 more)

### Community 23 - "chatController.js"
Cohesion: 0.14
Nodes (23): clearChatMessages(), deleteConversation(), extractPackageCategory(), getConversations(), getMessages(), getOrCreateConversation(), invalidateChatCache(), markConversationRead() (+15 more)

### Community 34 - "redis.js"
Cohesion: 0.15
Nodes (8): __dirname, __filename, formatKey(), REDIS_COMMAND_TIMEOUT, REDIS_CONNECT_TIMEOUT, REDIS_DB, REDIS_DEFAULT_TTL, REDIS_PORT

### Community 35 - "test_redis_hit_and_freshness.mjs"
Cohesion: 0.83
Nodes (3): getRedisRaw(), makeRequest(), run()

### Community 36 - "mobile/packageRoutes.js"
Cohesion: 0.36
Nodes (8): checkRoomActionPrivilege, getMyPackages, getPackageCategories, getPackages, getPackagesByCategory, getUserPrivileges, purchasePackage, togglePackageActive

### Community 37 - "ApiDocs.jsx"
Cohesion: 0.18
Nodes (7): API_SPEC, getToken(), SocketDocsView(), ApiDocs(), EndpointErrorBoundary, extractMediaItems(), copyToClipboard()

### Community 38 - "App.jsx"
Cohesion: 0.10
Nodes (26): checkHealth(), giftApi, levelApi, streamApi, App(), getInitialTab(), isTabValid(), normalizeTab() (+18 more)

### Community 41 - "dev.js"
Cohesion: 0.33
Nodes (3): children, __dirname, __filename

### Community 43 - "controllers/walletController.js"
Cohesion: 0.36
Nodes (8): getBalances(), getPackages(), getRechargeConfig(), getTransactions(), getWithdrawalConfig(), purchaseCoins(), requestWithdrawal(), router

### Community 44 - "resellerController.js"
Cohesion: 0.42
Nodes (9): clearTransactions(), deleteTransaction(), getResellerBalance(), getResellerTransactions(), getUserDetails(), rechargeUser(), resolveResellerId(), searchUsers() (+1 more)

### Community 45 - "mobile/authController.js"
Cohesion: 0.12
Nodes (36): __dirname, __filename, signToken(), verifyToken(), getMe(), login(), register(), ensureFcmSchema() (+28 more)

### Community 47 - "react"
Cohesion: 0.27
Nodes (11): agencyApi, liveRewardApi, userApi, withdrawalApi, Loader(), Pagination(), MODERATOR_POWER_LABELS, UserDetailsModal() (+3 more)

### Community 48 - "query"
Cohesion: 0.07
Nodes (43): query(), bulkDelete(), clearResellerSales(), deleteReseller(), getAgencies(), getAgencyHosts(), getChatTesterConversation(), getChatTesterUsers() (+35 more)

### Community 51 - "thumbnailRoutes.js"
Cohesion: 0.36
Nodes (8): getCustomThumbnailUploadConfig(), getMyThumbnails(), getThumbnailCatalog(), getUserActiveThumbnailsMap(), purchaseThumbnail(), toggleThumbnail(), uploadCustomThumbnail(), router

### Community 52 - "notificationRoutes.js"
Cohesion: 0.42
Nodes (7): clearAllNotifications(), deleteNotification(), getNotifications(), getUnreadCount(), markAllAsRead(), markAsRead(), resolveAssetUrl()

### Community 53 - "entryEffectController.js"
Cohesion: 0.43
Nodes (6): getEntryEffectCatalog(), getMyEntryEffects(), getUserActiveEntryEffectsMap(), purchaseEntryEffect(), toggleEntryEffect(), router

### Community 54 - "mobile/index.js"
Cohesion: 0.12
Nodes (18): getMobileBanners(), buyThemeItem(), equipThemeItem(), getActiveTheme(), getDefaultTheme(), getMyThemeItems(), getThemesCatalog(), router (+10 more)

### Community 55 - "CreateCategory.jsx"
Cohesion: 0.38
Nodes (4): packageApi, Sidebar(), CreateCategory(), PACKAGE_COLOR_PRESETS

### Community 57 - "PackageManagement.jsx"
Cohesion: 0.21
Nodes (13): adminApi, resolveAssetUrl(), uploadFile(), settingsApi, specialItemApi, BulkActionBar(), FileUploadInput(), Banners() (+5 more)

### Community 58 - "UserLivePortal.jsx"
Cohesion: 0.15
Nodes (13): getApiBase(), dashboardApi, liveApi, GoogleMeetLiveStage(), StatCard(), UserLiveAuth(), BrandingContext, BrandingProvider() (+5 more)

### Community 60 - "hostController.js"
Cohesion: 0.56
Nodes (7): formatDuration(), getHostAgencySummary(), getHostDashboardOverview(), getHostMonthlyBreakdown(), getHostStreamHistory(), resolveHostId(), router

### Community 61 - "liveRewardService.js"
Cohesion: 0.28
Nodes (8): getLiveRewardHistoryAdmin(), getLiveRewardSettingsAdmin(), getLiveRewardStatsAdmin(), updateLiveRewardSettingsAdmin(), getLiveDurationRewardHistory(), getLiveDurationRewardSettings(), getLiveDurationRewardStats(), updateLiveDurationRewardSettings()

### Community 62 - "routes/liveRoutes.js"
Cohesion: 0.48
Nodes (5): createRoom(), endRoom(), getRoomDetails(), getRooms(), router

### Community 63 - "Moderators.jsx"
Cohesion: 0.47
Nodes (4): moderatorApi, getDefaultPermissions(), MODERATOR_PERMISSIONS, Moderators()

### Community 64 - "callController.js"
Cohesion: 0.12
Nodes (23): DEFAULT_LIVEKIT_API_KEY, DEFAULT_LIVEKIT_API_SECRET, DEFAULT_LIVEKIT_URL, __dirname, __filename, generateLiveKitToken(), getLiveKitConfig(), LIVEKIT_API_KEY (+15 more)

### Community 65 - "db.js"
Cohesion: 0.20
Nodes (9): dbConfig, __dirname, __filename, poolProxy, testConnection(), makeToken(), runTests(), main() (+1 more)

### Community 66 - "authMiddleware.js"
Cohesion: 0.21
Nodes (10): getLevelsProgression(), getMyLevelRewards(), optionalAuth(), requireAdmin(), requireAgency(), requireHost(), requireModerator(), requireReseller() (+2 more)

### Community 67 - "Posts.jsx"
Cohesion: 0.60
Nodes (3): postApi, Posts(), resolveMediaUrl()

### Community 69 - "AppThemes.jsx"
Cohesion: 0.50
Nodes (3): themeApi, AppThemes(), TAB_TYPES

### Community 70 - "cache"
Cohesion: 0.21
Nodes (11): cache, getGifts(), getUserGiftContributions(), sendGift(), getTopAgencies(), getTopGifters(), requireAuth(), router (+3 more)

## Knowledge Gaps
- **173 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+168 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `controllers/packageController.js`, `adminRoutes.js`, `moderatorRoutes.js`, `controllers/bannerController.js`, `feedController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `chatController.js`, `controllers/walletController.js`, `resellerController.js`, `mobile/authController.js`, `thumbnailRoutes.js`, `notificationRoutes.js`, `entryEffectController.js`, `mobile/index.js`, `hostController.js`, `liveRewardService.js`, `routes/liveRoutes.js`, `callController.js`, `db.js`, `authMiddleware.js`, `cache`, `test_video_live_seat_guard.mjs`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Why does `getPool()` connect `adminRoutes.js` to `callController.js`, `db.js`, `cache`, `controllers/walletController.js`, `resellerController.js`, `mobile/authController.js`, `query`, `controllers/bannerController.js`, `feedController.js`, `mobile/walletRoutes.js`, `chatController.js`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `Posts.jsx`, `ApiDocs.jsx`, `App.jsx`, `AppThemes.jsx`, `.oxlintrc.json`, `client.js`, `CreateCategory.jsx`, `PackageManagement.jsx`, `UserLivePortal.jsx`, `Moderators.jsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _173 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `controllers/packageController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._
- **Should `adminRoutes.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06696428571428571 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08923076923076922 - nodes in this community are weakly interconnected._