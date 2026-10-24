# Graph Report - umi_backend  (2026-10-24)

## Corpus Check
- 183 files · ~1,088,667 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 988 nodes · 2706 edges · 67 communities (51 shown, 16 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 398 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `369d4cd2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- controllers/packageController.js
- query
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
- mobile/index.js
- test_moderator_agency_oversight.mjs
- getPool
- firebase.js
- scripts
- add_host_api_docs.mjs
- mobile/liveController.js
- test_host_api.mjs
- mobile/walletRoutes.js
- authMiddleware.js
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
- controllers/authController.js
- ApiDocs.jsx
- App.jsx
- dev.js
- test_google_token_flow.mjs
- mobile/authController.js
- securityMiddleware.js
- Loader.jsx
- specialItemController.js
- add_audio_live_api_docs.mjs
- chatController.js
- db.js
- hostController.js
- themeRoutes.js
- Banners.jsx
- react
- entryEffectController.js
- EconomyContext.jsx
- liveRewardService.js
- Gifts.jsx
- adminThemeController.js
- callController.js
- LiveRewards.jsx
- controllers/bannerController.js
- mobile/giftController.js

## God Nodes (most connected - your core abstractions)
1. `query()` - 333 edges
2. `react` - 44 edges
3. `getPool()` - 44 edges
4. `cache` - 37 edges
5. `request()` - 34 edges
6. `Loader()` - 27 edges
7. `requireAuth()` - 27 edges
8. `useEconomy()` - 21 edges
9. `buildRoomResponse()` - 21 edges
10. `optionalAuth()` - 15 edges

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

## Communities (67 total, 16 thin omitted)

### Community 0 - "controllers/packageController.js"
Cohesion: 0.14
Nodes (22): checkRoomActionPrivilege(), createPackage(), createPackageCategory(), deletePackage(), deletePackageCategory(), enrichCategoryWithUserSubscription(), enrichPackageWithUserSubscription(), formatCategoryPrivileges() (+14 more)

### Community 1 - "query"
Cohesion: 0.08
Nodes (67): query(), bulkDelete(), bulkDeleteReports(), clearGiftHistoryAdmin(), clearResellerSales(), createCoinPackageAdmin(), createGift(), createHostRequest() (+59 more)

### Community 2 - "server.js"
Cohesion: 0.08
Nodes (29): getBalances(), getPackages(), getRechargeConfig(), getTransactions(), getWithdrawalConfig(), purchaseCoins(), requestWithdrawal(), __dirname (+21 more)

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
Cohesion: 0.13
Nodes (21): agencyApi, API_BASE, del(), get(), getApiBase(), getCurrentUser(), patch(), post() (+13 more)

### Community 12 - "Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy"
Cohesion: 0.29
Nodes (6): 1. Centralized .env Control & Project Portability, 2. Production-Grade Zero-Downtime Redis Architecture, 3. Database-First Mutation + Instant Redis Invalidation, 4. All Read (GET) Requests Handled by Redis, 5. Mandatory Enforcement for All Future Features & Prompts, Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy

### Community 13 - "🚀 UMI LIVE - VPS Deployment & Operations Master Guide"
Cohesion: 0.08
Nodes (23): 1. 🔄 ভবিষ্যতে কোড আপডেট করার নিয়ম (How to Update Code), 2. ⚙️ `deploy.sh` স্ক্রিপ্ট চালালে কী কী ঘটে (What deploy.sh Does), 3. 🛠️ স্ক্রিপ্টে সমস্যা হলে কী করবেন (Troubleshooting & Fallback), 4. 📋 সম্পূর্ণ ম্যানুয়াল ডেপ্লয়মেন্ট গাইড (Manual Deployment Guide), 5. 💾 ডাটাবেজ ব্যাকআপ ও রিস্টোর (MySQL Backup & Restore), 6. 🧰 প্রয়োজনীয় কমান্ড চিটশিট (Daily Useful Commands), 🚀 UMI LIVE - VPS Deployment & Operations Master Guide, ক. সাধারণ কোড আপডেট (Standard Update - Zero Downtime) (+15 more)

### Community 14 - "mobile/index.js"
Cohesion: 0.08
Nodes (45): applyToAgency(), approveHostRequest(), banHostBroadcast(), cancelHostApplication(), formatDuration(), getAgencyHosts(), getAgencyOverview(), getAllAgencies() (+37 more)

### Community 15 - "test_moderator_agency_oversight.mjs"
Cohesion: 0.83
Nodes (3): checkRedisKey(), makeRequest(), run()

### Community 16 - "getPool"
Cohesion: 0.12
Nodes (16): getPool(), executeMerge(), getMergeHistory(), previewMerge(), addModerator(), adjustBalance(), assignReseller(), assignUserToAgency() (+8 more)

### Community 17 - "firebase.js"
Cohesion: 0.11
Nodes (45): candidatePaths, credentialsFilePath, __dirname, __filename, getAllActiveFcmTokens(), getFollowerFcmTokens(), getUserFcmTokens(), isFirebaseReady() (+37 more)

### Community 18 - "scripts"
Cohesion: 0.15
Nodes (12): description, name, private, scripts, build, dev, dev:admin, dev:all (+4 more)

### Community 20 - "mobile/liveController.js"
Cohesion: 0.08
Nodes (60): approveSeatRequest(), assignRoomAdmin(), buildRoomResponse(), cancelSeatRequest(), claimLiveReward(), createRoom(), decreaseRoomSeats(), deleteRoomChatMessage() (+52 more)

### Community 22 - "mobile/walletRoutes.js"
Cohesion: 0.23
Nodes (17): getBalances, getPackages, getRechargeConfig, getTransactions, getWithdrawalConfig, purchaseCoins, requestWithdrawal, cancelWithdrawalRequest() (+9 more)

### Community 23 - "authMiddleware.js"
Cohesion: 0.16
Nodes (13): createRoom(), endRoom(), getRoomDetails(), getRooms(), getMyLevelRewards(), optionalAuth(), requireAdmin(), requireAgency() (+5 more)

### Community 34 - "redis.js"
Cohesion: 0.14
Nodes (11): cache, __dirname, __filename, formatKey(), REDIS_COMMAND_TIMEOUT, REDIS_CONNECT_TIMEOUT, REDIS_DB, REDIS_DEFAULT_TTL (+3 more)

### Community 35 - "test_redis_hit_and_freshness.mjs"
Cohesion: 0.83
Nodes (3): getRedisRaw(), makeRequest(), run()

### Community 36 - "controllers/authController.js"
Cohesion: 0.26
Nodes (11): __dirname, __filename, signToken(), getMe(), register(), googleLogin(), register(), resolveGoogleProfile() (+3 more)

### Community 37 - "ApiDocs.jsx"
Cohesion: 0.18
Nodes (7): API_SPEC, getToken(), SocketDocsView(), ApiDocs(), EndpointErrorBoundary, extractMediaItems(), copyToClipboard()

### Community 38 - "App.jsx"
Cohesion: 0.12
Nodes (25): accountMergeApi, authApi, checkHealth(), setCurrentUser(), setToken(), dashboardApi, streamApi, App() (+17 more)

### Community 41 - "dev.js"
Cohesion: 0.33
Nodes (3): children, __dirname, __filename

### Community 43 - "mobile/authController.js"
Cohesion: 0.30
Nodes (11): verifyToken(), ensureFcmSchema(), getMe(), memoryOtpStore, removeFcmToken(), sendOtp(), updateFcmToken(), updateProfile() (+3 more)

### Community 45 - "securityMiddleware.js"
Cohesion: 0.21
Nodes (15): login(), login(), checkLoginLockout(), cleanAccountTarget(), COMMON_DICTIONARY_PASSWORDS, containsSqlInjection(), executeDummyTimingCheck(), getClientIp() (+7 more)

### Community 47 - "Loader.jsx"
Cohesion: 0.30
Nodes (14): adminApi, specialItemApi, userApi, BulkActionBar(), Loader(), Pagination(), MODERATOR_POWER_LABELS, UserDetailsModal() (+6 more)

### Community 48 - "specialItemController.js"
Cohesion: 0.13
Nodes (14): createEntryEffect(), createThumbnail(), deleteEntryEffect(), deleteThumbnail(), getEntryEffects(), getEntryEffectSubscribers(), getThumbnails(), getThumbnailSubscribers() (+6 more)

### Community 52 - "chatController.js"
Cohesion: 0.11
Nodes (30): clearChatMessages(), deleteConversation(), extractPackageCategory(), getConversations(), getMessages(), getOrCreateConversation(), invalidateChatCache(), markConversationRead() (+22 more)

### Community 53 - "db.js"
Cohesion: 0.13
Nodes (20): dbConfig, __dirname, __filename, poolProxy, testConnection(), clearTransactions(), deleteTransaction(), getResellerBalance() (+12 more)

### Community 54 - "hostController.js"
Cohesion: 0.56
Nodes (7): formatDuration(), getHostAgencySummary(), getHostDashboardOverview(), getHostMonthlyBreakdown(), getHostStreamHistory(), resolveHostId(), router

### Community 55 - "themeRoutes.js"
Cohesion: 0.39
Nodes (7): buyThemeItem(), equipThemeItem(), getActiveTheme(), getDefaultTheme(), getMyThemeItems(), getThemesCatalog(), router

### Community 57 - "Banners.jsx"
Cohesion: 0.16
Nodes (12): bannerApi, resolveAssetUrl(), uploadFile(), themeApi, FileUploadInput(), AppThemes(), TAB_TYPES, Banners() (+4 more)

### Community 58 - "react"
Cohesion: 0.15
Nodes (11): levelApi, liveApi, packageApi, GoogleMeetLiveStage(), Sidebar(), UserLiveAuth(), useLiveKit(), CreateCategory() (+3 more)

### Community 59 - "entryEffectController.js"
Cohesion: 0.43
Nodes (6): getEntryEffectCatalog(), getMyEntryEffects(), getUserActiveEntryEffectsMap(), purchaseEntryEffect(), toggleEntryEffect(), router

### Community 60 - "EconomyContext.jsx"
Cohesion: 0.36
Nodes (4): settingsApi, EconomyContext, EconomyProvider(), Settings()

### Community 61 - "liveRewardService.js"
Cohesion: 0.28
Nodes (8): getLiveRewardHistoryAdmin(), getLiveRewardSettingsAdmin(), getLiveRewardStatsAdmin(), updateLiveRewardSettingsAdmin(), getLiveDurationRewardHistory(), getLiveDurationRewardSettings(), getLiveDurationRewardStats(), updateLiveDurationRewardSettings()

### Community 62 - "Gifts.jsx"
Cohesion: 0.39
Nodes (5): giftApi, Gifts(), isMediaUrl(), resolveMediaUrl(), TopContributors()

### Community 63 - "adminThemeController.js"
Cohesion: 0.29
Nodes (6): createThemeItem(), deleteThemeItem(), getAdminThemeItems(), getThemeStats(), setDefaultThemeItem(), updateThemeItem()

### Community 64 - "callController.js"
Cohesion: 0.13
Nodes (22): DEFAULT_LIVEKIT_API_KEY, DEFAULT_LIVEKIT_API_SECRET, DEFAULT_LIVEKIT_URL, __dirname, __filename, generateLiveKitToken(), getLiveKitConfig(), LIVEKIT_API_KEY (+14 more)

### Community 66 - "controllers/bannerController.js"
Cohesion: 0.25
Nodes (7): createBanner(), deleteBanner(), getAdminBanners(), getPublicBanners(), reorderBanners(), toggleBannerStatus(), updateBanner()

### Community 70 - "mobile/giftController.js"
Cohesion: 0.38
Nodes (6): getGifts(), getUserGiftContributions(), sendGift(), router, router, recordCoinsSpentAndCheckLevelUp()

## Knowledge Gaps
- **170 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+165 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `controllers/packageController.js`, `server.js`, `mobile/index.js`, `getPool`, `firebase.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `authMiddleware.js`, `redis.js`, `controllers/authController.js`, `mobile/authController.js`, `securityMiddleware.js`, `specialItemController.js`, `chatController.js`, `db.js`, `hostController.js`, `themeRoutes.js`, `entryEffectController.js`, `liveRewardService.js`, `adminThemeController.js`, `callController.js`, `controllers/bannerController.js`, `mobile/giftController.js`?**
  _High betweenness centrality (0.203) - this node is a cross-community bridge._
- **Why does `getPool()` connect `getPool` to `callController.js`, `query`, `server.js`, `mobile/giftController.js`, `mobile/authController.js`, `firebase.js`, `chatController.js`, `db.js`, `mobile/walletRoutes.js`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `mobile/authController.js` to `callController.js`, `query`, `controllers/packageController.js`, `server.js`, `controllers/authController.js`, `mobile/giftController.js`, `mobile/index.js`, `firebase.js`, `chatController.js`, `mobile/liveController.js`, `hostController.js`, `authMiddleware.js`, `db.js`, `themeRoutes.js`, `mobile/walletRoutes.js`, `entryEffectController.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _170 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `controllers/packageController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.08322981366459627 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08021390374331551 - nodes in this community are weakly interconnected._