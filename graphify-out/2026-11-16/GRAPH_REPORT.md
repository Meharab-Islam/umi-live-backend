# Graph Report - umi_backend  (2026-11-16)

## Corpus Check
- 226 files · ~1,205,722 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1372 nodes · 3923 edges · 100 communities (69 shown, 31 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 472 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `19433adb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getPool
- query
- server.js
- admin-panel/package.json
- dependencies
- AGENTS.md
- deploy.sh
- 📡 API Endpoints Summary
- .oxlintrc.json
- React + Vite
- routes/liveRoutes.js
- liveSocket.js
- Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy
- 🚀 UMI LIVE - VPS Deployment & Operations Master Guide
- agencyController.js
- test_moderator_agency_oversight.mjs
- Settings.jsx
- feedController.js
- package.json
- add_host_api_docs.mjs
- mobile/liveController.js
- test_host_api.mjs
- mobile/walletRoutes.js
- specialItemController.js
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
- agxGameService.js
- test_redis_hit_and_freshness.mjs
- deleteMultipleFilesFromStorage
- ApiDocs.jsx
- db.js
- dev.js
- test_google_token_flow.mjs
- redis.js
- restore_all_admin_data.js
- mobile/authController.js
- Loader.jsx
- callController.js
- add_audio_live_api_docs.mjs
- reservedAccountController.js
- roomFanout.js
- socket-load.mjs
- cache
- themeRoutes.js
- publicController.js
- liveScaleGuard.js
- liveRewardService.js
- controllers/bannerController.js
- clusterGuard.js
- mobile/packageRoutes.js
- EndpointErrorBoundary
- rateLimiter.js
- roomLock.js
- resellerController.js
- hostController.js
- entryEffectController.js
- giftQueueService.js
- scripts
- AgxGames.jsx
- adminThemeController.js
- backend/package.json
- optionalAuth
- AccountDeletionRequests.jsx
- devDependencies
- LiveRewards.jsx
- test_video_live_seat_guard.mjs
- compression
- controllers/packageController.js
- react
- cors
- dotenv
- express
- ioredis
- morgan
- pm2
- prom-client
- socket.io
- @socket.io/redis-adapter
- uuid
- mobile/index.js
- chatController.js
- ChatModeration.jsx
- vite.config.js
- client.js
- App.jsx

## God Nodes (most connected - your core abstractions)
1. `query()` - 412 edges
2. `react` - 54 edges
3. `getPool()` - 51 edges
4. `cache` - 48 edges
5. `request()` - 41 edges
6. `Loader()` - 33 edges
7. `requireAuth()` - 31 edges
8. `setupLiveSocket()` - 31 edges
9. `buildRoomResponse()` - 25 edges
10. `useEconomy()` - 23 edges

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

## Communities (100 total, 31 thin omitted)

### Community 0 - "getPool"
Cohesion: 0.11
Nodes (22): getPool(), executeMerge(), getMergeHistory(), previewMerge(), addModerator(), adjustBalance(), assignReseller(), assignUserToAgency() (+14 more)

### Community 1 - "query"
Cohesion: 0.07
Nodes (82): query(), approveDeletionRequest(), bulkDeleteReports(), clearGiftHistoryAdmin(), clearResellerSales(), createCoinPackageAdmin(), createGift(), createHostRequest() (+74 more)

### Community 2 - "server.js"
Cohesion: 0.07
Nodes (29): closePool(), __dirname, __filename, initializeDatabase(), router, router, API_SPEC, router (+21 more)

### Community 3 - "admin-panel/package.json"
Cohesion: 0.06
Nodes (31): dependencies, livekit-client, lucide-react, react, react-dom, socket.io-client, devDependencies, oxlint (+23 more)

### Community 4 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, bcryptjs, firebase-admin, jsonwebtoken, livekit-server-sdk, multer, mysql2, bcryptjs (+5 more)

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

### Community 10 - "routes/liveRoutes.js"
Cohesion: 0.48
Nodes (5): createRoom(), endRoom(), getRoomDetails(), getRooms(), router

### Community 11 - "liveSocket.js"
Cohesion: 0.17
Nodes (23): isUserOnline(), roomHasSockets(), socketPacketLimiter(), clearRoomMusicState(), setRoomMusicState(), cancelSeatGuestDisconnectGraceTimer(), cancelViewerDisconnectCleanup(), cleanupUserFromRoom() (+15 more)

### Community 12 - "Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy"
Cohesion: 0.29
Nodes (6): 1. Centralized .env Control & Project Portability, 2. Production-Grade Zero-Downtime Redis Architecture, 3. Database-First Mutation + Instant Redis Invalidation, 4. All Read (GET) Requests Handled by Redis, 5. Mandatory Enforcement for All Future Features & Prompts, Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy

### Community 13 - "🚀 UMI LIVE - VPS Deployment & Operations Master Guide"
Cohesion: 0.08
Nodes (23): 1. 🔄 ভবিষ্যতে কোড আপডেট করার নিয়ম (How to Update Code), 2. ⚙️ `deploy.sh` স্ক্রিপ্ট চালালে কী কী ঘটে (What deploy.sh Does), 3. 🛠️ স্ক্রিপ্টে সমস্যা হলে কী করবেন (Troubleshooting & Fallback), 4. 📋 সম্পূর্ণ ম্যানুয়াল ডেপ্লয়মেন্ট গাইড (Manual Deployment Guide), 5. 💾 ডাটাবেজ ব্যাকআপ ও রিস্টোর (MySQL Backup & Restore), 6. 🧰 প্রয়োজনীয় কমান্ড চিটশিট (Daily Useful Commands), 🚀 UMI LIVE - VPS Deployment & Operations Master Guide, ক. সাধারণ কোড আপডেট (Standard Update - Zero Downtime) (+15 more)

### Community 14 - "agencyController.js"
Cohesion: 0.15
Nodes (33): applyToAgency(), approveHostRequest(), banHostBroadcast(), cancelHostApplication(), formatDuration(), getAgencyHosts(), getAgencyOverview(), getAllAgencies() (+25 more)

### Community 15 - "test_moderator_agency_oversight.mjs"
Cohesion: 0.83
Nodes (3): checkRedisKey(), makeRequest(), run()

### Community 16 - "Settings.jsx"
Cohesion: 0.25
Nodes (9): resolveAssetUrl(), uploadFile(), themeApi, FileUploadInput(), AppThemes(), TAB_TYPES, Banners(), PackageManagement() (+1 more)

### Community 17 - "feedController.js"
Cohesion: 0.14
Nodes (38): candidatePaths, credentialsFilePath, __dirname, __filename, getAllActiveFcmTokens(), getFollowerFcmTokens(), getUserFcmTokens(), isFirebaseReady() (+30 more)

### Community 18 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, dotenv, ioredis, description, dotenv, ioredis, name, private (+13 more)

### Community 20 - "mobile/liveController.js"
Cohesion: 0.06
Nodes (73): buildPermission(), DEFAULT_LIVEKIT_API_KEY, DEFAULT_LIVEKIT_API_SECRET, DEFAULT_LIVEKIT_URL, __dirname, ENFORCE_PUBLISH_PERMISSION, __filename, getRoomServiceClient() (+65 more)

### Community 22 - "mobile/walletRoutes.js"
Cohesion: 0.13
Nodes (27): getBalances, getPackages, getRechargeConfig, getTransactions, getWithdrawalConfig, purchaseCoins, requestWithdrawal, cancelWithdrawalRequest() (+19 more)

### Community 23 - "specialItemController.js"
Cohesion: 0.13
Nodes (14): createEntryEffect(), createThumbnail(), deleteEntryEffect(), deleteThumbnail(), getEntryEffects(), getEntryEffectSubscribers(), getThumbnails(), getThumbnailSubscribers() (+6 more)

### Community 34 - "agxGameService.js"
Cohesion: 0.11
Nodes (31): getAgxGamesConfig(), getAgxSettlements(), testAgxConnection(), updateAgxGamesConfig(), createAgxWebhookHandler(), launchGame(), listGames(), router (+23 more)

### Community 35 - "test_redis_hit_and_freshness.mjs"
Cohesion: 0.83
Nodes (3): getRedisRaw(), makeRequest(), run()

### Community 36 - "deleteMultipleFilesFromStorage"
Cohesion: 0.20
Nodes (9): bulkDelete(), deleteAdminChatMessage(), deleteAdminConversation(), deleteUserPost(), baseUploadsDir, deleteFileFromStorage(), deleteMultipleFilesFromStorage(), __dirname (+1 more)

### Community 37 - "ApiDocs.jsx"
Cohesion: 0.24
Nodes (7): API_SPEC, reservedAccountsApi, SocketDocsView(), ApiDocs(), extractMediaItems(), ReservedAccounts(), copyToClipboard()

### Community 38 - "db.js"
Cohesion: 0.18
Nodes (10): dbConfig, __dirname, __filename, getReadPool(), poolProxy, queryRead(), readEnabled, testConnection() (+2 more)

### Community 41 - "dev.js"
Cohesion: 0.33
Nodes (3): children, __dirname, __filename

### Community 43 - "redis.js"
Cohesion: 0.12
Nodes (13): CACHE_SECTIONS, calculateJitteredTtl(), createRedisConnection(), __dirname, __filename, inFlightFetches, REDIS_COMMAND_TIMEOUT, REDIS_CONNECT_TIMEOUT (+5 more)

### Community 45 - "mobile/authController.js"
Cohesion: 0.06
Nodes (75): __dirname, __filename, signToken(), getMe(), login(), register(), enforceSingleDeviceSession(), ensureFcmSchema() (+67 more)

### Community 47 - "Loader.jsx"
Cohesion: 0.17
Nodes (27): adminApi, agencyApi, settingsApi, specialItemApi, userApi, AgencyDetailsView(), BulkActionBar(), Loader() (+19 more)

### Community 48 - "callController.js"
Cohesion: 0.38
Nodes (9): generateLiveKitToken(), acceptCall(), endCall(), getActiveCallSettings(), getCallHistory(), getCallRates(), heartbeatCall(), initiateCall() (+1 more)

### Community 51 - "reservedAccountController.js"
Cohesion: 0.31
Nodes (9): addReservedIds(), assignReservedId(), deleteReservedId(), getReservedAccounts(), getReservedStats(), invalidateCaches(), releaseReservedId(), setReservedRange() (+1 more)

### Community 52 - "roomFanout.js"
Cohesion: 0.19
Nodes (15): build(), DEFAULTS(), getLiveFlags(), num(), hooks, takeBudget(), compactComment(), flushFrame() (+7 more)

### Community 53 - "socket-load.mjs"
Cohesion: 0.11
Nodes (16): CHAT_PER_MIN, CHATTERS_EVERY, CLIENTS, __dirname, DURATION, final, ID_BASE, pct() (+8 more)

### Community 54 - "cache"
Cohesion: 0.30
Nodes (9): cache, getGifts(), getGlobalGiftBannerConfigMobile(), getUserGiftContributions(), resolveAbsoluteUrl(), sendGift(), router, recordCoinsSpentAndCheckLevelUp() (+1 more)

### Community 55 - "themeRoutes.js"
Cohesion: 0.39
Nodes (7): buyThemeItem(), equipThemeItem(), getActiveTheme(), getDefaultTheme(), getMyThemeItems(), getThemesCatalog(), router

### Community 57 - "publicController.js"
Cohesion: 0.43
Nodes (6): getAllPublicPolicies(), getPublicBranding(), getPublicPrivacyPolicy(), getPublicTerms(), submitAccountDeletionRequest(), router

### Community 58 - "liveScaleGuard.js"
Cohesion: 0.15
Nodes (17): joinRoom(), leaveRoom(), allowChatMessage(), budgets, DEFAULT_EVENT_LIMIT, emitRoomViewerCount(), EVENT_LIMITS, gc (+9 more)

### Community 59 - "liveRewardService.js"
Cohesion: 0.28
Nodes (8): getLiveRewardHistoryAdmin(), getLiveRewardSettingsAdmin(), getLiveRewardStatsAdmin(), updateLiveRewardSettingsAdmin(), getLiveDurationRewardHistory(), getLiveDurationRewardSettings(), getLiveDurationRewardStats(), updateLiveDurationRewardSettings()

### Community 60 - "controllers/bannerController.js"
Cohesion: 0.14
Nodes (11): createBanner(), deleteBanner(), getAdminBanners(), getPublicBanners(), reorderBanners(), toggleBannerStatus(), updateBanner(), makeToken() (+3 more)

### Community 61 - "clusterGuard.js"
Cohesion: 0.37
Nodes (12): formatKey(), clearHostGrace(), clearOnce(), hasHostGrace(), isLeader(), listHostGraceRooms(), localOnce, markHostGrace() (+4 more)

### Community 62 - "mobile/packageRoutes.js"
Cohesion: 0.26
Nodes (11): checkRoomActionPrivilege, getMyPackages, getPackageCategories, getPackages, getPackagesByCategory, getUserPrivileges, getVipPrivilegesCatalog, MASTER_PRIVILEGES_CATALOG (+3 more)

### Community 64 - "rateLimiter.js"
Cohesion: 0.16
Nodes (16): __dirname, verifyToken(), getRedisClient(), bodyHash(), idempotency(), metrics, register, clientIp() (+8 more)

### Community 65 - "roomLock.js"
Cohesion: 0.19
Nodes (14): NODE_ID, acquire(), acquireLocal(), acquireRedis(), als, holds(), locals, releaseLocal() (+6 more)

### Community 66 - "resellerController.js"
Cohesion: 0.42
Nodes (9): clearTransactions(), deleteTransaction(), getResellerBalance(), getResellerTransactions(), getUserDetails(), rechargeUser(), resolveResellerId(), searchUsers() (+1 more)

### Community 67 - "hostController.js"
Cohesion: 0.51
Nodes (8): formatDuration(), getDefaultAgencyCommission(), getHostAgencySummary(), getHostDashboardOverview(), getHostMonthlyBreakdown(), getHostStreamHistory(), resolveHostId(), router

### Community 69 - "entryEffectController.js"
Cohesion: 0.44
Nodes (7): getEntryEffectCatalog(), getMyEntryEffects(), getUserActiveEntryEffectsMap(), purchaseEntryEffect(), resolveAbsoluteUrl(), toggleEntryEffect(), router

### Community 70 - "giftQueueService.js"
Cohesion: 0.36
Nodes (8): clearRoomGiftQueue(), emitGiftItem(), enqueueRoomGift(), generateDedupKey(), isDuplicate(), processRoomQueue(), recentGiftsMap, roomQueues

### Community 71 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, clean, dev, loadtest:socket, migrate, seed, start, start:cluster

### Community 72 - "AgxGames.jsx"
Cohesion: 0.39
Nodes (5): agxGamesApi, getApiBase(), AgxGames(), fmt(), webhookUrl()

### Community 73 - "adminThemeController.js"
Cohesion: 0.29
Nodes (6): createThemeItem(), deleteThemeItem(), getAdminThemeItems(), getThemeStats(), setDefaultThemeItem(), updateThemeItem()

### Community 74 - "backend/package.json"
Cohesion: 0.33
Nodes (5): description, main, name, type, version

### Community 75 - "optionalAuth"
Cohesion: 0.43
Nodes (5): getLevelsProgression(), getMyLevelRewards(), optionalAuth(), router, getUserLevelProgression()

### Community 77 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, nodemon, socket.io-client, socket.io-client, nodemon

### Community 81 - "controllers/packageController.js"
Cohesion: 0.14
Nodes (24): checkRoomActionPrivilege(), createPackage(), createPackageCategory(), deletePackage(), deletePackageCategory(), enrichCategoryWithUserSubscription(), enrichPackageWithUserSubscription(), formatCategoryPrivileges() (+16 more)

### Community 82 - "react"
Cohesion: 0.10
Nodes (23): API_BASE, dashboardApi, legalApi, liveApi, packageApi, GoogleMeetLiveStage(), MarkdownRenderer(), parseMarkdownToHtml() (+15 more)

### Community 109 - "mobile/index.js"
Cohesion: 0.12
Nodes (19): getLiveKitConfig(), getMobileBanners(), getAppConfig(), getLiveKitConfigEndpoint(), getMaintenanceStatus(), getScreenGuardConfig(), router, router (+11 more)

### Community 129 - "chatController.js"
Cohesion: 0.10
Nodes (32): clearChatMessages(), deleteConversation(), extractPackageCategory(), getConversations(), getMessages(), getOrCreateConversation(), invalidateChatCache(), markConversationRead() (+24 more)

### Community 133 - "ChatModeration.jsx"
Cohesion: 0.48
Nodes (5): chatApi, ChatModeration(), formatFullDate(), formatTimeAgo(), resolveMediaUrl()

### Community 171 - "client.js"
Cohesion: 0.12
Nodes (22): accountMergeApi, bannerApi, del(), get(), getCurrentUser(), patch(), post(), put() (+14 more)

### Community 214 - "App.jsx"
Cohesion: 0.09
Nodes (24): authApi, checkHealth(), getToken(), setCurrentUser(), setToken(), levelApi, streamApi, App() (+16 more)

## Knowledge Gaps
- **245 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+240 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `getPool`, `chatController.js`, `routes/liveRoutes.js`, `liveSocket.js`, `agencyController.js`, `feedController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `specialItemController.js`, `agxGameService.js`, `deleteMultipleFilesFromStorage`, `db.js`, `mobile/authController.js`, `callController.js`, `reservedAccountController.js`, `roomFanout.js`, `cache`, `themeRoutes.js`, `publicController.js`, `liveScaleGuard.js`, `liveRewardService.js`, `controllers/bannerController.js`, `resellerController.js`, `hostController.js`, `entryEffectController.js`, `adminThemeController.js`, `optionalAuth`, `test_video_live_seat_guard.mjs`, `controllers/packageController.js`, `mobile/index.js`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Why does `getPool()` connect `getPool` to `query`, `chatController.js`, `resellerController.js`, `agxGameService.js`, `db.js`, `mobile/authController.js`, `callController.js`, `feedController.js`, `reservedAccountController.js`, `cache`, `mobile/walletRoutes.js`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `cache` connect `cache` to `getPool`, `query`, `chatController.js`, `server.js`, `routes/liveRoutes.js`, `liveSocket.js`, `agencyController.js`, `feedController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `specialItemController.js`, `agxGameService.js`, `db.js`, `redis.js`, `mobile/authController.js`, `callController.js`, `reservedAccountController.js`, `roomFanout.js`, `themeRoutes.js`, `publicController.js`, `liveRewardService.js`, `controllers/bannerController.js`, `resellerController.js`, `hostController.js`, `entryEffectController.js`, `adminThemeController.js`, `optionalAuth`, `controllers/packageController.js`, `mobile/index.js`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _245 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getPool` be split into smaller, more focused modules?**
  _Cohesion score 0.11067193675889328 - nodes in this community are weakly interconnected._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.06890756302521009 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07007575757575757 - nodes in this community are weakly interconnected._