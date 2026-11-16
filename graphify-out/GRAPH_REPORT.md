# Graph Report - umi_backend  (2026-11-16)

## Corpus Check
- 215 files · ~1,194,218 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1278 nodes · 3648 edges · 100 communities (69 shown, 31 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 462 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ce078d28`
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
- Gifts.jsx
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
- livekit.js
- socket-load.mjs
- controllers/walletController.js
- configController.js
- publicController.js
- liveScaleGuard.js
- liveRewardService.js
- AccountDeletionRequests.jsx
- ErrorBoundary
- endRoom
- EndpointErrorBoundary
- rateLimiter.js
- mobile/packageRoutes.js
- hostController.js
- thumbnailRoutes.js
- entryEffectController.js
- themeRoutes.js
- scripts
- CreateCategory.jsx
- optionalAuth
- backend/package.json
- setParticipantPublishPermission
- init.js
- devDependencies
- setDeviceBanState
- Levels.jsx
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
1. `query()` - 404 edges
2. `react` - 53 edges
3. `getPool()` - 48 edges
4. `cache` - 46 edges
5. `request()` - 40 edges
6. `Loader()` - 32 edges
7. `requireAuth()` - 30 edges
8. `buildRoomResponse()` - 25 edges
9. `setupLiveSocket()` - 25 edges
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
Cohesion: 0.06
Nodes (87): query(), approveDeletionRequest(), bulkDeleteReports(), clearGiftHistoryAdmin(), clearResellerSales(), createCoinPackageAdmin(), createGift(), createHostRequest() (+79 more)

### Community 2 - "server.js"
Cohesion: 0.08
Nodes (23): closePool(), router, router, API_SPEC, router, router, app, __dirname (+15 more)

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
Cohesion: 0.14
Nodes (33): formatKey(), getRedisClient(), clearHostGrace(), clearOnce(), hasHostGrace(), isLeader(), isUserOnline(), localOnce (+25 more)

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
Cohesion: 0.21
Nodes (10): bannerApi, resolveAssetUrl(), uploadFile(), themeApi, FileUploadInput(), AppThemes(), TAB_TYPES, Banners() (+2 more)

### Community 17 - "feedController.js"
Cohesion: 0.10
Nodes (51): candidatePaths, credentialsFilePath, __dirname, __filename, getAllActiveFcmTokens(), getFollowerFcmTokens(), getUserFcmTokens(), isFirebaseReady() (+43 more)

### Community 18 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, dotenv, ioredis, description, dotenv, ioredis, name, private (+13 more)

### Community 20 - "mobile/liveController.js"
Cohesion: 0.10
Nodes (47): approveSeatRequest(), assignRoomAdmin(), buildRoomResponse(), cancelSeatRequest(), claimLiveReward(), compactRoomGuestSeats(), createRoom(), decreaseRoomSeats() (+39 more)

### Community 22 - "mobile/walletRoutes.js"
Cohesion: 0.23
Nodes (17): getBalances, getPackages, getRechargeConfig, getTransactions, getWithdrawalConfig, purchaseCoins, requestWithdrawal, cancelWithdrawalRequest() (+9 more)

### Community 23 - "specialItemController.js"
Cohesion: 0.09
Nodes (20): createThemeItem(), deleteThemeItem(), getAdminThemeItems(), getThemeStats(), setDefaultThemeItem(), updateThemeItem(), createEntryEffect(), createThumbnail() (+12 more)

### Community 34 - "Gifts.jsx"
Cohesion: 0.39
Nodes (5): giftApi, Gifts(), isMediaUrl(), resolveMediaUrl(), TopContributors()

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
Cohesion: 0.10
Nodes (23): dbConfig, __dirname, __filename, poolProxy, testConnection(), clearTransactions(), deleteTransaction(), getResellerBalance() (+15 more)

### Community 41 - "dev.js"
Cohesion: 0.33
Nodes (3): children, __dirname, __filename

### Community 43 - "redis.js"
Cohesion: 0.12
Nodes (13): CACHE_SECTIONS, calculateJitteredTtl(), createRedisConnection(), __dirname, __filename, inFlightFetches, REDIS_COMMAND_TIMEOUT, REDIS_CONNECT_TIMEOUT (+5 more)

### Community 45 - "mobile/authController.js"
Cohesion: 0.06
Nodes (75): __dirname, __filename, signToken(), verifyToken(), cache, getMe(), login(), register() (+67 more)

### Community 47 - "Loader.jsx"
Cohesion: 0.20
Nodes (24): adminApi, agencyApi, specialItemApi, userApi, withdrawalApi, AgencyDetailsView(), BulkActionBar(), Loader() (+16 more)

### Community 48 - "callController.js"
Cohesion: 0.38
Nodes (9): generateLiveKitToken(), acceptCall(), endCall(), getActiveCallSettings(), getCallHistory(), getCallRates(), heartbeatCall(), initiateCall() (+1 more)

### Community 51 - "reservedAccountController.js"
Cohesion: 0.31
Nodes (9): addReservedIds(), assignReservedId(), deleteReservedId(), getReservedAccounts(), getReservedStats(), invalidateCaches(), releaseReservedId(), setReservedRange() (+1 more)

### Community 52 - "livekit.js"
Cohesion: 0.20
Nodes (9): DEFAULT_LIVEKIT_API_KEY, DEFAULT_LIVEKIT_API_SECRET, DEFAULT_LIVEKIT_URL, __dirname, ENFORCE_PUBLISH_PERMISSION, __filename, LIVEKIT_API_KEY, LIVEKIT_API_SECRET (+1 more)

### Community 53 - "socket-load.mjs"
Cohesion: 0.11
Nodes (16): CHAT_PER_MIN, CHATTERS_EVERY, CLIENTS, __dirname, DURATION, final, ID_BASE, pct() (+8 more)

### Community 54 - "controllers/walletController.js"
Cohesion: 0.30
Nodes (10): fetchFreshWithdrawalConfig(), getBalances(), getPackages(), getRechargeConfig(), getTransactions(), getWithdrawalConfig(), parseRoleRate(), purchaseCoins() (+2 more)

### Community 55 - "configController.js"
Cohesion: 0.46
Nodes (6): getLiveKitConfig(), getAppConfig(), getLiveKitConfigEndpoint(), getMaintenanceStatus(), getScreenGuardConfig(), router

### Community 57 - "publicController.js"
Cohesion: 0.43
Nodes (6): getAllPublicPolicies(), getPublicBranding(), getPublicPrivacyPolicy(), getPublicTerms(), submitAccountDeletionRequest(), router

### Community 58 - "liveScaleGuard.js"
Cohesion: 0.17
Nodes (18): joinRoom(), leaveRoom(), budgets, DEFAULT_EVENT_LIMIT, emitRoomViewerCount(), EVENT_LIMITS, gc, isBigRoom() (+10 more)

### Community 59 - "liveRewardService.js"
Cohesion: 0.28
Nodes (8): getLiveRewardHistoryAdmin(), getLiveRewardSettingsAdmin(), getLiveRewardStatsAdmin(), updateLiveRewardSettingsAdmin(), getLiveDurationRewardHistory(), getLiveDurationRewardSettings(), getLiveDurationRewardStats(), updateLiveDurationRewardSettings()

### Community 62 - "endRoom"
Cohesion: 0.32
Nodes (7): endRoom(), updateRoomMusic(), checkStreamRewardStatus(), claimAndAwardLiveReward(), clearRoomMusicState(), getRoomMusicState(), setRoomMusicState()

### Community 64 - "rateLimiter.js"
Cohesion: 0.17
Nodes (12): __dirname, httpMetricsMiddleware(), metrics, register, clientIp(), consume(), identityKey(), limiters (+4 more)

### Community 65 - "mobile/packageRoutes.js"
Cohesion: 0.29
Nodes (10): checkRoomActionPrivilege, getMyPackages, getPackageCategories, getPackages, getPackagesByCategory, getUserPrivileges, getVipPrivilegesCatalog, MASTER_PRIVILEGES_CATALOG (+2 more)

### Community 66 - "hostController.js"
Cohesion: 0.44
Nodes (9): formatDuration(), getDefaultAgencyCommission(), getHostAgencySummary(), getHostDashboardOverview(), getHostMonthlyBreakdown(), getHostStreamHistory(), resolveHostId(), requireHost() (+1 more)

### Community 67 - "thumbnailRoutes.js"
Cohesion: 0.36
Nodes (8): getCustomThumbnailUploadConfig(), getMyThumbnails(), getThumbnailCatalog(), getUserActiveThumbnailsMap(), purchaseThumbnail(), toggleThumbnail(), uploadCustomThumbnail(), router

### Community 69 - "entryEffectController.js"
Cohesion: 0.44
Nodes (7): getEntryEffectCatalog(), getMyEntryEffects(), getUserActiveEntryEffectsMap(), purchaseEntryEffect(), resolveAbsoluteUrl(), toggleEntryEffect(), router

### Community 70 - "themeRoutes.js"
Cohesion: 0.39
Nodes (7): buyThemeItem(), equipThemeItem(), getActiveTheme(), getDefaultTheme(), getMyThemeItems(), getThemesCatalog(), router

### Community 71 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, clean, dev, loadtest:socket, migrate, seed, start, start:cluster

### Community 72 - "CreateCategory.jsx"
Cohesion: 0.38
Nodes (4): packageApi, Sidebar(), CreateCategory(), PACKAGE_COLOR_PRESETS

### Community 73 - "optionalAuth"
Cohesion: 0.43
Nodes (5): getLevelsProgression(), getMyLevelRewards(), optionalAuth(), router, getUserLevelProgression()

### Community 74 - "backend/package.json"
Cohesion: 0.33
Nodes (5): description, main, name, type, version

### Community 75 - "setParticipantPublishPermission"
Cohesion: 0.47
Nodes (6): buildPermission(), getRoomServiceClient(), setParticipantPublishPermission(), syncRoomPublishPermissions(), withTimeout(), kickAllSeatUsers()

### Community 76 - "init.js"
Cohesion: 0.33
Nodes (5): __dirname, __filename, initializeDatabase(), startServer(), waitForDatabase()

### Community 77 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, nodemon, socket.io-client, socket.io-client, nodemon

### Community 78 - "setDeviceBanState"
Cohesion: 0.50
Nodes (5): takeAdminReportAction(), toggleDeviceBan(), toggleUserBan(), getUserDeviceIds(), setDeviceBanState()

### Community 81 - "controllers/packageController.js"
Cohesion: 0.14
Nodes (24): checkRoomActionPrivilege(), createPackage(), createPackageCategory(), deletePackage(), deletePackageCategory(), enrichCategoryWithUserSubscription(), enrichPackageWithUserSubscription(), formatCategoryPrivileges() (+16 more)

### Community 82 - "react"
Cohesion: 0.10
Nodes (22): accountMergeApi, API_BASE, getApiBase(), legalApi, liveApi, GoogleMeetLiveStage(), MarkdownRenderer(), parseMarkdownToHtml() (+14 more)

### Community 109 - "mobile/index.js"
Cohesion: 0.14
Nodes (13): getMobileBanners(), router, router, router, router, router, router, router (+5 more)

### Community 129 - "chatController.js"
Cohesion: 0.13
Nodes (24): clearChatMessages(), deleteConversation(), extractPackageCategory(), getConversations(), getMessages(), getOrCreateConversation(), invalidateChatCache(), markConversationRead() (+16 more)

### Community 133 - "ChatModeration.jsx"
Cohesion: 0.48
Nodes (5): chatApi, ChatModeration(), formatFullDate(), formatTimeAgo(), resolveMediaUrl()

### Community 171 - "client.js"
Cohesion: 0.14
Nodes (19): del(), get(), getCurrentUser(), patch(), post(), put(), request(), wrapResponse() (+11 more)

### Community 214 - "App.jsx"
Cohesion: 0.14
Nodes (21): authApi, checkHealth(), getToken(), setCurrentUser(), setToken(), liveRewardApi, streamApi, App() (+13 more)

## Knowledge Gaps
- **232 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+227 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `getPool`, `chatController.js`, `routes/liveRoutes.js`, `liveSocket.js`, `agencyController.js`, `feedController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `specialItemController.js`, `deleteMultipleFilesFromStorage`, `db.js`, `mobile/authController.js`, `callController.js`, `reservedAccountController.js`, `livekit.js`, `controllers/walletController.js`, `configController.js`, `publicController.js`, `liveScaleGuard.js`, `liveRewardService.js`, `endRoom`, `hostController.js`, `thumbnailRoutes.js`, `entryEffectController.js`, `themeRoutes.js`, `optionalAuth`, `setParticipantPublishPermission`, `setDeviceBanState`, `controllers/packageController.js`, `mobile/index.js`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **Why does `getPool()` connect `getPool` to `query`, `chatController.js`, `db.js`, `mobile/authController.js`, `callController.js`, `feedController.js`, `reservedAccountController.js`, `mobile/walletRoutes.js`, `controllers/walletController.js`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `mobile/authController.js` to `query`, `chatController.js`, `hostController.js`, `mobile/packageRoutes.js`, `entryEffectController.js`, `db.js`, `themeRoutes.js`, `thumbnailRoutes.js`, `optionalAuth`, `routes/liveRoutes.js`, `agencyController.js`, `callController.js`, `feedController.js`, `controllers/packageController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `controllers/walletController.js`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _232 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getPool` be split into smaller, more focused modules?**
  _Cohesion score 0.11067193675889328 - nodes in this community are weakly interconnected._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.06373626373626373 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08307692307692308 - nodes in this community are weakly interconnected._