# Graph Report - umi_backend  (2026-11-16)

## Corpus Check
- 209 files · ~1,190,133 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1207 nodes · 3507 edges · 72 communities (54 shown, 18 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 459 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `323afc52`
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
- adminThemeController.js
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
- db.js
- test_redis_hit_and_freshness.mjs
- deleteMultipleFilesFromStorage
- ApiDocs.jsx
- firebase.js
- dev.js
- test_google_token_flow.mjs
- redis.js
- restore_all_admin_data.js
- mobile/authController.js
- react
- callController.js
- add_audio_live_api_docs.mjs
- reservedAccountController.js
- livekit.js
- resellerController.js
- controllers/walletController.js
- configController.js
- publicController.js
- giftQueueService.js
- getLiveDurationRewardSettings
- AccountDeletionRequests.jsx
- Levels.jsx
- controllers/packageController.js
- Settings.jsx
- LegalPolicies.jsx
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
9. `useEconomy()` - 23 edges
10. `setupLiveSocket()` - 21 edges

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

## Communities (72 total, 18 thin omitted)

### Community 0 - "getPool"
Cohesion: 0.11
Nodes (22): getPool(), executeMerge(), getMergeHistory(), previewMerge(), addModerator(), adjustBalance(), assignReseller(), assignUserToAgency() (+14 more)

### Community 1 - "query"
Cohesion: 0.06
Nodes (87): query(), approveDeletionRequest(), bulkDeleteReports(), clearGiftHistoryAdmin(), clearResellerSales(), createCoinPackageAdmin(), createGift(), createHostRequest() (+79 more)

### Community 2 - "server.js"
Cohesion: 0.09
Nodes (23): __dirname, __filename, initializeDatabase(), router, router, API_SPEC, router, router (+15 more)

### Community 3 - "admin-panel/package.json"
Cohesion: 0.06
Nodes (31): dependencies, livekit-client, lucide-react, react, react-dom, socket.io-client, devDependencies, oxlint (+23 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (43): dependencies, bcryptjs, compression, cors, dotenv, express, firebase-admin, ioredis (+35 more)

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
Cohesion: 0.10
Nodes (38): endRoom(), joinRoom(), leaveRoom(), clearRoomGiftQueue(), allowChatMessage(), budgets, emitRoomViewerCount(), gc (+30 more)

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

### Community 16 - "adminThemeController.js"
Cohesion: 0.29
Nodes (6): createThemeItem(), deleteThemeItem(), getAdminThemeItems(), getThemeStats(), setDefaultThemeItem(), updateThemeItem()

### Community 17 - "feedController.js"
Cohesion: 0.11
Nodes (37): addComment(), createPost(), deleteComment(), deletePost(), ensureFeedSchema(), extractPackageCategory(), getCommentReplies(), getComments() (+29 more)

### Community 18 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, dotenv, ioredis, description, dotenv, ioredis, name, private (+13 more)

### Community 20 - "mobile/liveController.js"
Cohesion: 0.10
Nodes (48): approveSeatRequest(), assignRoomAdmin(), buildRoomResponse(), cancelSeatRequest(), claimLiveReward(), compactRoomGuestSeats(), decreaseRoomSeats(), deleteRoomChatMessage() (+40 more)

### Community 22 - "mobile/walletRoutes.js"
Cohesion: 0.23
Nodes (17): getBalances, getPackages, getRechargeConfig, getTransactions, getWithdrawalConfig, purchaseCoins, requestWithdrawal, cancelWithdrawalRequest() (+9 more)

### Community 23 - "specialItemController.js"
Cohesion: 0.08
Nodes (21): createBanner(), deleteBanner(), getAdminBanners(), getPublicBanners(), reorderBanners(), toggleBannerStatus(), updateBanner(), createEntryEffect() (+13 more)

### Community 34 - "db.js"
Cohesion: 0.11
Nodes (22): dbConfig, __dirname, __filename, poolProxy, testConnection(), formatDuration(), getDefaultAgencyCommission(), getHostAgencySummary() (+14 more)

### Community 35 - "test_redis_hit_and_freshness.mjs"
Cohesion: 0.83
Nodes (3): getRedisRaw(), makeRequest(), run()

### Community 36 - "deleteMultipleFilesFromStorage"
Cohesion: 0.33
Nodes (5): bulkDelete(), deleteAdminChatMessage(), deleteAdminConversation(), deleteUserPost(), deleteMultipleFilesFromStorage()

### Community 37 - "ApiDocs.jsx"
Cohesion: 0.15
Nodes (9): API_SPEC, getToken(), reservedAccountsApi, SocketDocsView(), ApiDocs(), EndpointErrorBoundary, extractMediaItems(), ReservedAccounts() (+1 more)

### Community 38 - "firebase.js"
Cohesion: 0.20
Nodes (21): candidatePaths, credentialsFilePath, __dirname, __filename, getAllActiveFcmTokens(), getFollowerFcmTokens(), getUserFcmTokens(), isFirebaseReady() (+13 more)

### Community 41 - "dev.js"
Cohesion: 0.33
Nodes (3): children, __dirname, __filename

### Community 43 - "redis.js"
Cohesion: 0.13
Nodes (13): CACHE_SECTIONS, calculateJitteredTtl(), __dirname, __filename, formatKey(), inFlightFetches, REDIS_COMMAND_TIMEOUT, REDIS_CONNECT_TIMEOUT (+5 more)

### Community 45 - "mobile/authController.js"
Cohesion: 0.07
Nodes (67): __dirname, __filename, signToken(), verifyToken(), cache, getMe(), login(), register() (+59 more)

### Community 47 - "react"
Cohesion: 0.19
Nodes (25): adminApi, agencyApi, specialItemApi, userApi, AgencyDetailsView(), BulkActionBar(), Loader(), Pagination() (+17 more)

### Community 48 - "callController.js"
Cohesion: 0.38
Nodes (9): generateLiveKitToken(), acceptCall(), endCall(), getActiveCallSettings(), getCallHistory(), getCallRates(), heartbeatCall(), initiateCall() (+1 more)

### Community 51 - "reservedAccountController.js"
Cohesion: 0.31
Nodes (9): addReservedIds(), assignReservedId(), deleteReservedId(), getReservedAccounts(), getReservedStats(), invalidateCaches(), releaseReservedId(), setReservedRange() (+1 more)

### Community 52 - "livekit.js"
Cohesion: 0.19
Nodes (14): buildPermission(), DEFAULT_LIVEKIT_API_KEY, DEFAULT_LIVEKIT_API_SECRET, DEFAULT_LIVEKIT_URL, __dirname, ENFORCE_PUBLISH_PERMISSION, __filename, getRoomServiceClient() (+6 more)

### Community 53 - "resellerController.js"
Cohesion: 0.36
Nodes (10): clearTransactions(), deleteTransaction(), getResellerBalance(), getResellerTransactions(), getUserDetails(), rechargeUser(), resolveResellerId(), searchUsers() (+2 more)

### Community 54 - "controllers/walletController.js"
Cohesion: 0.30
Nodes (10): fetchFreshWithdrawalConfig(), getBalances(), getPackages(), getRechargeConfig(), getTransactions(), getWithdrawalConfig(), parseRoleRate(), purchaseCoins() (+2 more)

### Community 55 - "configController.js"
Cohesion: 0.46
Nodes (6): getLiveKitConfig(), getAppConfig(), getLiveKitConfigEndpoint(), getMaintenanceStatus(), getScreenGuardConfig(), router

### Community 57 - "publicController.js"
Cohesion: 0.43
Nodes (6): getAllPublicPolicies(), getPublicBranding(), getPublicPrivacyPolicy(), getPublicTerms(), submitAccountDeletionRequest(), router

### Community 58 - "giftQueueService.js"
Cohesion: 0.43
Nodes (7): emitGiftItem(), enqueueRoomGift(), generateDedupKey(), isDuplicate(), processRoomQueue(), recentGiftsMap, roomQueues

### Community 59 - "getLiveDurationRewardSettings"
Cohesion: 0.33
Nodes (6): getLiveRewardSettingsAdmin(), getLiveRewardStatsAdmin(), updateLiveRewardSettingsAdmin(), getLiveDurationRewardSettings(), getLiveDurationRewardStats(), updateLiveDurationRewardSettings()

### Community 81 - "controllers/packageController.js"
Cohesion: 0.13
Nodes (25): checkRoomActionPrivilege(), createPackage(), createPackageCategory(), deletePackage(), deletePackageCategory(), enrichCategoryWithUserSubscription(), enrichPackageWithUserSubscription(), formatCategoryPrivileges() (+17 more)

### Community 82 - "Settings.jsx"
Cohesion: 0.11
Nodes (23): authApi, API_BASE, getApiBase(), getCurrentUser(), setCurrentUser(), setToken(), uploadFile(), liveApi (+15 more)

### Community 99 - "LegalPolicies.jsx"
Cohesion: 0.33
Nodes (5): legalApi, MarkdownRenderer(), parseMarkdownToHtml(), LandingPage(), LegalPolicies()

### Community 109 - "mobile/index.js"
Cohesion: 0.05
Nodes (50): getMobileBanners(), getEntryEffectCatalog(), getMyEntryEffects(), getUserActiveEntryEffectsMap(), purchaseEntryEffect(), resolveAbsoluteUrl(), toggleEntryEffect(), getLevelsProgression() (+42 more)

### Community 129 - "chatController.js"
Cohesion: 0.13
Nodes (24): clearChatMessages(), deleteConversation(), extractPackageCategory(), getConversations(), getMessages(), getOrCreateConversation(), invalidateChatCache(), markConversationRead() (+16 more)

### Community 133 - "ChatModeration.jsx"
Cohesion: 0.70
Nodes (4): ChatModeration(), formatFullDate(), formatTimeAgo(), resolveMediaUrl()

### Community 171 - "client.js"
Cohesion: 0.11
Nodes (24): accountMergeApi, bannerApi, chatApi, del(), get(), patch(), post(), put() (+16 more)

### Community 214 - "App.jsx"
Cohesion: 0.07
Nodes (29): checkHealth(), resolveAssetUrl(), themeApi, App(), checkIsAdminPath(), getInitialTab(), isTabValid(), normalizeTab() (+21 more)

## Knowledge Gaps
- **205 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+200 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `getPool`, `chatController.js`, `routes/liveRoutes.js`, `liveSocket.js`, `agencyController.js`, `adminThemeController.js`, `feedController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `specialItemController.js`, `db.js`, `deleteMultipleFilesFromStorage`, `firebase.js`, `mobile/authController.js`, `callController.js`, `reservedAccountController.js`, `livekit.js`, `resellerController.js`, `controllers/walletController.js`, `configController.js`, `publicController.js`, `getLiveDurationRewardSettings`, `controllers/packageController.js`, `mobile/index.js`?**
  _High betweenness centrality (0.206) - this node is a cross-community bridge._
- **Why does `getPool()` connect `getPool` to `query`, `db.js`, `chatController.js`, `mobile/authController.js`, `callController.js`, `feedController.js`, `reservedAccountController.js`, `resellerController.js`, `mobile/walletRoutes.js`, `controllers/walletController.js`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `cache` connect `mobile/authController.js` to `getPool`, `query`, `chatController.js`, `server.js`, `routes/liveRoutes.js`, `liveSocket.js`, `agencyController.js`, `adminThemeController.js`, `feedController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `specialItemController.js`, `db.js`, `firebase.js`, `redis.js`, `callController.js`, `reservedAccountController.js`, `livekit.js`, `resellerController.js`, `controllers/walletController.js`, `configController.js`, `publicController.js`, `controllers/packageController.js`, `mobile/index.js`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _205 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getPool` be split into smaller, more focused modules?**
  _Cohesion score 0.11067193675889328 - nodes in this community are weakly interconnected._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.06441947565543071 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08547008547008547 - nodes in this community are weakly interconnected._