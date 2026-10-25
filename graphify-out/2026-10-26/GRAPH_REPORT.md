# Graph Report - umi_backend  (2026-10-26)

## Corpus Check
- 189 files · ~1,115,574 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1046 nodes · 2916 edges · 73 communities (52 shown, 21 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 416 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d83fe49e`
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
- livekit.js
- restore_all_admin_data.js
- mobile/authController.js
- Loader.jsx
- adminRoutes.js
- add_audio_live_api_docs.mjs
- authMiddleware.js
- entryEffectController.js
- mobile/index.js
- getPool
- Settings.jsx
- react
- themeRoutes.js
- hostController.js
- liveRewardService.js
- Gifts.jsx
- resellerController.js
- callController.js
- EndpointErrorBoundary
- db.js
- invalidateWalletWithdrawalCache
- requireAuth
- ErrorBoundary
- test_socket_realtime_emission.mjs
- test_video_live_seat_guard.mjs
- test_audio_live_seats.mjs

## God Nodes (most connected - your core abstractions)
1. `query()` - 355 edges
2. `react` - 46 edges
3. `getPool()` - 44 edges
4. `cache` - 41 edges
5. `request()` - 36 edges
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

## Communities (73 total, 21 thin omitted)

### Community 0 - "controllers/packageController.js"
Cohesion: 0.14
Nodes (23): checkRoomActionPrivilege(), createPackage(), createPackageCategory(), deletePackage(), deletePackageCategory(), enrichCategoryWithUserSubscription(), enrichPackageWithUserSubscription(), formatCategoryPrivileges() (+15 more)

### Community 1 - "query"
Cohesion: 0.06
Nodes (64): query(), bulkDelete(), bulkDeleteReports(), clearGiftHistoryAdmin(), clearResellerSales(), createCoinPackageAdmin(), createGift(), createHostRequest() (+56 more)

### Community 2 - "server.js"
Cohesion: 0.08
Nodes (31): fetchFreshWithdrawalConfig(), getBalances(), getPackages(), getRechargeConfig(), getTransactions(), getWithdrawalConfig(), parseRoleRate(), purchaseCoins() (+23 more)

### Community 3 - "admin-panel/package.json"
Cohesion: 0.06
Nodes (31): dependencies, livekit-client, lucide-react, react, react-dom, socket.io-client, devDependencies, oxlint (+23 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, bcryptjs, cors, dotenv, express, firebase-admin, ioredis, jsonwebtoken (+33 more)

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
Cohesion: 0.12
Nodes (24): accountMergeApi, authApi, del(), get(), getCurrentUser(), patch(), post(), put() (+16 more)

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
Cohesion: 0.25
Nodes (7): createBanner(), deleteBanner(), getAdminBanners(), getPublicBanners(), reorderBanners(), toggleBannerStatus(), updateBanner()

### Community 17 - "feedController.js"
Cohesion: 0.10
Nodes (51): candidatePaths, credentialsFilePath, __dirname, __filename, getAllActiveFcmTokens(), getFollowerFcmTokens(), getUserFcmTokens(), isFirebaseReady() (+43 more)

### Community 18 - "scripts"
Cohesion: 0.15
Nodes (12): description, name, private, scripts, build, dev, dev:admin, dev:all (+4 more)

### Community 20 - "mobile/liveController.js"
Cohesion: 0.08
Nodes (63): approveSeatRequest(), assignRoomAdmin(), buildRoomResponse(), cancelSeatRequest(), claimLiveReward(), createRoom(), decreaseRoomSeats(), deleteRoomChatMessage() (+55 more)

### Community 22 - "mobile/walletRoutes.js"
Cohesion: 0.23
Nodes (17): getBalances, getPackages, getRechargeConfig, getTransactions, getWithdrawalConfig, purchaseCoins, requestWithdrawal, cancelWithdrawalRequest() (+9 more)

### Community 23 - "chatController.js"
Cohesion: 0.10
Nodes (31): clearChatMessages(), deleteConversation(), extractPackageCategory(), getConversations(), getMessages(), getOrCreateConversation(), invalidateChatCache(), markConversationRead() (+23 more)

### Community 34 - "redis.js"
Cohesion: 0.13
Nodes (13): CACHE_SECTIONS, calculateJitteredTtl(), __dirname, __filename, formatKey(), inFlightFetches, REDIS_COMMAND_TIMEOUT, REDIS_CONNECT_TIMEOUT (+5 more)

### Community 35 - "test_redis_hit_and_freshness.mjs"
Cohesion: 0.83
Nodes (3): getRedisRaw(), makeRequest(), run()

### Community 36 - "mobile/packageRoutes.js"
Cohesion: 0.31
Nodes (9): checkRoomActionPrivilege, getMyPackages, getPackageCategories, getPackages, getPackagesByCategory, getUserPrivileges, purchasePackage, togglePackageActive (+1 more)

### Community 37 - "ApiDocs.jsx"
Cohesion: 0.30
Nodes (6): API_SPEC, getToken(), SocketDocsView(), ApiDocs(), extractMediaItems(), copyToClipboard()

### Community 38 - "App.jsx"
Cohesion: 0.12
Nodes (19): checkHealth(), levelApi, liveRewardApi, streamApi, App(), getInitialTab(), isTabValid(), normalizeTab() (+11 more)

### Community 41 - "dev.js"
Cohesion: 0.33
Nodes (3): children, __dirname, __filename

### Community 43 - "livekit.js"
Cohesion: 0.22
Nodes (8): DEFAULT_LIVEKIT_API_KEY, DEFAULT_LIVEKIT_API_SECRET, DEFAULT_LIVEKIT_URL, __dirname, __filename, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL

### Community 45 - "mobile/authController.js"
Cohesion: 0.09
Nodes (44): __dirname, __filename, signToken(), verifyToken(), getMe(), login(), register(), ensureFcmSchema() (+36 more)

### Community 47 - "Loader.jsx"
Cohesion: 0.21
Nodes (21): adminApi, agencyApi, specialItemApi, userApi, BulkActionBar(), Loader(), Pagination(), MODERATOR_POWER_LABELS (+13 more)

### Community 48 - "adminRoutes.js"
Cohesion: 0.12
Nodes (25): deleteCoinPackageAdmin(), getAdminProfile(), getLevelRewardOptions(), updateAdminProfile(), updateLevelConfig(), createThemeItem(), deleteThemeItem(), getAdminThemeItems() (+17 more)

### Community 51 - "authMiddleware.js"
Cohesion: 0.20
Nodes (11): createRoom(), endRoom(), getRoomDetails(), getRooms(), optionalAuth(), requireAdmin(), requireAgency(), requireHost() (+3 more)

### Community 53 - "entryEffectController.js"
Cohesion: 0.43
Nodes (6): getEntryEffectCatalog(), getMyEntryEffects(), getUserActiveEntryEffectsMap(), purchaseEntryEffect(), toggleEntryEffect(), router

### Community 54 - "mobile/index.js"
Cohesion: 0.13
Nodes (18): getLiveKitConfig(), getMobileBanners(), getAppConfig(), getLiveKitConfigEndpoint(), getMaintenanceStatus(), getScreenGuardConfig(), router, router (+10 more)

### Community 55 - "getPool"
Cohesion: 0.12
Nodes (16): getPool(), executeMerge(), getMergeHistory(), previewMerge(), addModerator(), adjustBalance(), assignReseller(), assignUserToAgency() (+8 more)

### Community 57 - "Settings.jsx"
Cohesion: 0.21
Nodes (10): bannerApi, resolveAssetUrl(), uploadFile(), themeApi, FileUploadInput(), AppThemes(), TAB_TYPES, Banners() (+2 more)

### Community 58 - "react"
Cohesion: 0.11
Nodes (20): API_BASE, getApiBase(), dashboardApi, liveApi, packageApi, GoogleMeetLiveStage(), Sidebar(), StatCard() (+12 more)

### Community 59 - "themeRoutes.js"
Cohesion: 0.39
Nodes (7): buyThemeItem(), equipThemeItem(), getActiveTheme(), getDefaultTheme(), getMyThemeItems(), getThemesCatalog(), router

### Community 60 - "hostController.js"
Cohesion: 0.68
Nodes (6): formatDuration(), getHostAgencySummary(), getHostDashboardOverview(), getHostMonthlyBreakdown(), getHostStreamHistory(), resolveHostId()

### Community 61 - "liveRewardService.js"
Cohesion: 0.28
Nodes (8): getLiveRewardHistoryAdmin(), getLiveRewardSettingsAdmin(), getLiveRewardStatsAdmin(), updateLiveRewardSettingsAdmin(), getLiveDurationRewardHistory(), getLiveDurationRewardSettings(), getLiveDurationRewardStats(), updateLiveDurationRewardSettings()

### Community 62 - "Gifts.jsx"
Cohesion: 0.39
Nodes (5): giftApi, Gifts(), isMediaUrl(), resolveMediaUrl(), TopContributors()

### Community 63 - "resellerController.js"
Cohesion: 0.49
Nodes (8): clearTransactions(), deleteTransaction(), getResellerBalance(), getResellerTransactions(), getUserDetails(), rechargeUser(), resolveResellerId(), searchUsers()

### Community 64 - "callController.js"
Cohesion: 0.38
Nodes (9): generateLiveKitToken(), acceptCall(), endCall(), getActiveCallSettings(), getCallHistory(), getCallRates(), heartbeatCall(), initiateCall() (+1 more)

### Community 67 - "db.js"
Cohesion: 0.15
Nodes (15): dbConfig, __dirname, __filename, poolProxy, testConnection(), cache, getLevelsProgression(), getMyLevelRewards() (+7 more)

### Community 69 - "invalidateWalletWithdrawalCache"
Cohesion: 0.50
Nodes (4): updateHostWithdrawalRatios(), updateSetting(), updateWithdrawalConfigAdmin(), invalidateWalletWithdrawalCache()

### Community 70 - "requireAuth"
Cohesion: 0.26
Nodes (8): getGifts(), getUserGiftContributions(), sendGift(), getTopAgencies(), getTopGifters(), requireAuth(), router, router

## Knowledge Gaps
- **181 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+176 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `controllers/packageController.js`, `server.js`, `moderatorRoutes.js`, `controllers/bannerController.js`, `feedController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `chatController.js`, `livekit.js`, `mobile/authController.js`, `adminRoutes.js`, `authMiddleware.js`, `entryEffectController.js`, `mobile/index.js`, `getPool`, `themeRoutes.js`, `hostController.js`, `liveRewardService.js`, `resellerController.js`, `callController.js`, `db.js`, `invalidateWalletWithdrawalCache`, `requireAuth`, `test_socket_realtime_emission.mjs`, `test_video_live_seat_guard.mjs`, `test_audio_live_seats.mjs`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **Why does `getPool()` connect `getPool` to `callController.js`, `query`, `server.js`, `db.js`, `requireAuth`, `mobile/authController.js`, `feedController.js`, `mobile/walletRoutes.js`, `chatController.js`, `resellerController.js`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `cache` connect `db.js` to `controllers/packageController.js`, `query`, `server.js`, `moderatorRoutes.js`, `controllers/bannerController.js`, `feedController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `chatController.js`, `redis.js`, `livekit.js`, `mobile/authController.js`, `adminRoutes.js`, `authMiddleware.js`, `entryEffectController.js`, `mobile/index.js`, `getPool`, `themeRoutes.js`, `hostController.js`, `liveRewardService.js`, `resellerController.js`, `callController.js`, `requireAuth`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _181 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `controllers/packageController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13666666666666666 - nodes in this community are weakly interconnected._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.061057692307692306 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07507507507507508 - nodes in this community are weakly interconnected._