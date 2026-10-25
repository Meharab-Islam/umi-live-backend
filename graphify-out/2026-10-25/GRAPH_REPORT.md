# Graph Report - umi_backend  (2026-10-25)

## Corpus Check
- 187 files · ~1,100,518 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1024 nodes · 2855 edges · 71 communities (51 shown, 20 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 407 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3a296873`
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
- getPool
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
- callController.js
- resellerController.js
- mobile/authController.js
- react
- adminRoutes.js
- add_audio_live_api_docs.mjs
- thumbnailRoutes.js
- themeRoutes.js
- entryEffectController.js
- mobile/index.js
- useEconomy
- resolveAssetUrl
- UserLivePortal.jsx
- ErrorBoundary
- hostController.js
- liveRewardService.js
- Levels.jsx
- LiveRewards.jsx
- livekit.js
- db.js
- cache
- authMiddleware.js
- test_audio_live_seats.mjs
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
- `runTest()` --calls--> `query()`  [EXTRACTED]
  scratch/test_video_live_seat_guard.mjs → backend/src/config/db.js
- `getAllActiveFcmTokens()` --calls--> `query()`  [EXTRACTED]
  backend/src/config/firebase.js → backend/src/config/db.js
- `getMyPackages()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/packageController.js → backend/src/config/db.js
- `togglePackageActive()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/packageController.js → backend/src/config/db.js

## Import Cycles
- None detected.

## Communities (71 total, 20 thin omitted)

### Community 0 - "controllers/packageController.js"
Cohesion: 0.14
Nodes (22): checkRoomActionPrivilege(), createPackage(), createPackageCategory(), deletePackage(), deletePackageCategory(), enrichCategoryWithUserSubscription(), enrichPackageWithUserSubscription(), formatCategoryPrivileges() (+14 more)

### Community 1 - "query"
Cohesion: 0.06
Nodes (67): query(), bulkDelete(), bulkDeleteReports(), clearGiftHistoryAdmin(), clearResellerSales(), createCoinPackageAdmin(), createGift(), createHostRequest() (+59 more)

### Community 2 - "server.js"
Cohesion: 0.07
Nodes (34): createRoom(), endRoom(), getRoomDetails(), getRooms(), getBalances(), getPackages(), getRechargeConfig(), getTransactions() (+26 more)

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
Cohesion: 0.14
Nodes (20): agencyApi, del(), get(), getCurrentUser(), patch(), post(), put(), request() (+12 more)

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

### Community 16 - "getPool"
Cohesion: 0.12
Nodes (16): getPool(), executeMerge(), getMergeHistory(), previewMerge(), addModerator(), adjustBalance(), assignReseller(), assignUserToAgency() (+8 more)

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
Cohesion: 0.31
Nodes (9): checkRoomActionPrivilege, getMyPackages, getPackageCategories, getPackages, getPackagesByCategory, getUserPrivileges, purchasePackage, togglePackageActive (+1 more)

### Community 37 - "ApiDocs.jsx"
Cohesion: 0.19
Nodes (6): API_SPEC, SocketDocsView(), ApiDocs(), EndpointErrorBoundary, extractMediaItems(), copyToClipboard()

### Community 38 - "App.jsx"
Cohesion: 0.17
Nodes (18): authApi, checkHealth(), getToken(), setCurrentUser(), setToken(), streamApi, App(), getInitialTab() (+10 more)

### Community 41 - "dev.js"
Cohesion: 0.33
Nodes (3): children, __dirname, __filename

### Community 43 - "callController.js"
Cohesion: 0.38
Nodes (9): generateLiveKitToken(), acceptCall(), endCall(), getActiveCallSettings(), getCallHistory(), getCallRates(), heartbeatCall(), initiateCall() (+1 more)

### Community 44 - "resellerController.js"
Cohesion: 0.49
Nodes (8): clearTransactions(), deleteTransaction(), getResellerBalance(), getResellerTransactions(), getUserDetails(), rechargeUser(), resolveResellerId(), searchUsers()

### Community 45 - "mobile/authController.js"
Cohesion: 0.09
Nodes (44): __dirname, __filename, signToken(), verifyToken(), getMe(), login(), register(), ensureFcmSchema() (+36 more)

### Community 47 - "react"
Cohesion: 0.30
Nodes (15): adminApi, specialItemApi, userApi, BulkActionBar(), Loader(), Pagination(), MODERATOR_POWER_LABELS, UserDetailsModal() (+7 more)

### Community 48 - "adminRoutes.js"
Cohesion: 0.09
Nodes (32): getAdminReports(), getRechargeHistory(), getResellerSales(), removeUserFromAgency(), updateModerator(), createThemeItem(), deleteThemeItem(), getAdminThemeItems() (+24 more)

### Community 51 - "thumbnailRoutes.js"
Cohesion: 0.36
Nodes (8): getCustomThumbnailUploadConfig(), getMyThumbnails(), getThumbnailCatalog(), getUserActiveThumbnailsMap(), purchaseThumbnail(), toggleThumbnail(), uploadCustomThumbnail(), router

### Community 52 - "themeRoutes.js"
Cohesion: 0.39
Nodes (7): buyThemeItem(), equipThemeItem(), getActiveTheme(), getDefaultTheme(), getMyThemeItems(), getThemesCatalog(), router

### Community 53 - "entryEffectController.js"
Cohesion: 0.43
Nodes (6): getEntryEffectCatalog(), getMyEntryEffects(), getUserActiveEntryEffectsMap(), purchaseEntryEffect(), toggleEntryEffect(), router

### Community 54 - "mobile/index.js"
Cohesion: 0.12
Nodes (16): getMobileBanners(), getTopAgencies(), getTopGifters(), router, router, router, router, router (+8 more)

### Community 55 - "useEconomy"
Cohesion: 0.16
Nodes (13): accountMergeApi, giftApi, useEconomy(), AccountMerge(), Agencies(), CoinRecharge(), Gifts(), isMediaUrl() (+5 more)

### Community 57 - "resolveAssetUrl"
Cohesion: 0.13
Nodes (16): bannerApi, getApiBase(), resolveAssetUrl(), uploadFile(), settingsApi, themeApi, FileUploadInput(), BrandingContext (+8 more)

### Community 58 - "UserLivePortal.jsx"
Cohesion: 0.15
Nodes (12): API_BASE, liveApi, packageApi, GoogleMeetLiveStage(), Sidebar(), StatCard(), UserLiveAuth(), useBranding() (+4 more)

### Community 60 - "hostController.js"
Cohesion: 0.56
Nodes (7): formatDuration(), getHostAgencySummary(), getHostDashboardOverview(), getHostMonthlyBreakdown(), getHostStreamHistory(), resolveHostId(), router

### Community 61 - "liveRewardService.js"
Cohesion: 0.28
Nodes (8): getLiveRewardHistoryAdmin(), getLiveRewardSettingsAdmin(), getLiveRewardStatsAdmin(), updateLiveRewardSettingsAdmin(), getLiveDurationRewardHistory(), getLiveDurationRewardSettings(), getLiveDurationRewardStats(), updateLiveDurationRewardSettings()

### Community 64 - "livekit.js"
Cohesion: 0.17
Nodes (13): DEFAULT_LIVEKIT_API_KEY, DEFAULT_LIVEKIT_API_SECRET, DEFAULT_LIVEKIT_URL, __dirname, __filename, getLiveKitConfig(), LIVEKIT_API_KEY, LIVEKIT_API_SECRET (+5 more)

### Community 65 - "db.js"
Cohesion: 0.33
Nodes (5): dbConfig, __dirname, __filename, poolProxy, testConnection()

### Community 66 - "cache"
Cohesion: 0.28
Nodes (9): cache, getLevelsProgression(), getMyLevelRewards(), optionalAuth(), router, getUserLevelProgression(), recordCoinsSpentAndCheckLevelUp(), calculateUserStars() (+1 more)

### Community 70 - "authMiddleware.js"
Cohesion: 0.25
Nodes (9): getGifts(), getUserGiftContributions(), sendGift(), requireAdmin(), requireAgency(), requireAuth(), requireHost(), requireModerator() (+1 more)

## Knowledge Gaps
- **172 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+167 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `controllers/packageController.js`, `server.js`, `moderatorRoutes.js`, `getPool`, `feedController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `chatController.js`, `callController.js`, `resellerController.js`, `mobile/authController.js`, `adminRoutes.js`, `thumbnailRoutes.js`, `themeRoutes.js`, `entryEffectController.js`, `mobile/index.js`, `hostController.js`, `liveRewardService.js`, `livekit.js`, `db.js`, `cache`, `authMiddleware.js`, `test_audio_live_seats.mjs`, `test_video_live_seat_guard.mjs`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **Why does `getPool()` connect `getPool` to `db.js`, `query`, `server.js`, `authMiddleware.js`, `callController.js`, `resellerController.js`, `mobile/authController.js`, `feedController.js`, `mobile/walletRoutes.js`, `chatController.js`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `ApiDocs.jsx`, `App.jsx`, `.oxlintrc.json`, `client.js`, `useEconomy`, `resolveAssetUrl`, `UserLivePortal.jsx`, `ErrorBoundary`, `Levels.jsx`, `LiveRewards.jsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _172 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `controllers/packageController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.05711849957374254 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06736353077816493 - nodes in this community are weakly interconnected._