# Graph Report - umi_backend  (2026-10-23)

## Corpus Check
- 176 files · ~1,074,334 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 946 nodes · 2555 edges · 65 communities (49 shown, 16 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 379 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fa376358`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- controllers/packageController.js
- query
- db.js
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
- chatController.js
- feedController.js
- scripts
- add_host_api_docs.mjs
- mobile/liveController.js
- test_host_api.mjs
- mobile/walletRoutes.js
- mobile/index.js
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
- getPool
- ApiDocs.jsx
- App.jsx
- dev.js
- test_google_token_flow.mjs
- mobile/packageRoutes.js
- authMiddleware.js
- Loader.jsx
- specialItemController.js
- add_audio_live_api_docs.mjs
- mobile/giftController.js
- entryEffectController.js
- resellerController.js
- hostController.js
- themeRoutes.js
- Thumbnails.jsx
- react
- AppThemes.jsx
- EconomyContext.jsx
- liveRewardService.js
- Gifts.jsx
- callController.js
- LiveRewards.jsx

## God Nodes (most connected - your core abstractions)
1. `query()` - 314 edges
2. `getPool()` - 44 edges
3. `react` - 43 edges
4. `request()` - 33 edges
5. `cache` - 33 edges
6. `Loader()` - 26 edges
7. `requireAuth()` - 26 edges
8. `useEconomy()` - 21 edges
9. `buildRoomResponse()` - 21 edges
10. `adminApi` - 14 edges

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

## Communities (65 total, 16 thin omitted)

### Community 0 - "controllers/packageController.js"
Cohesion: 0.14
Nodes (22): checkRoomActionPrivilege(), createPackage(), createPackageCategory(), deletePackage(), deletePackageCategory(), enrichCategoryWithUserSubscription(), enrichPackageWithUserSubscription(), formatCategoryPrivileges() (+14 more)

### Community 1 - "query"
Cohesion: 0.08
Nodes (64): query(), bulkDelete(), bulkDeleteReports(), clearGiftHistoryAdmin(), clearResellerSales(), createCoinPackageAdmin(), createGift(), createHostRequest() (+56 more)

### Community 2 - "db.js"
Cohesion: 0.06
Nodes (39): dbConfig, __dirname, __filename, poolProxy, testConnection(), getBalances(), getPackages(), getRechargeConfig() (+31 more)

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
Nodes (18): API_BASE, del(), get(), getApiBase(), patch(), post(), put(), request() (+10 more)

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

### Community 16 - "chatController.js"
Cohesion: 0.11
Nodes (30): clearChatMessages(), deleteConversation(), extractPackageCategory(), getConversations(), getMessages(), getOrCreateConversation(), invalidateChatCache(), markConversationRead() (+22 more)

### Community 17 - "feedController.js"
Cohesion: 0.15
Nodes (32): candidatePaths, credentialsFilePath, __dirname, __filename, getAllActiveFcmTokens(), getFollowerFcmTokens(), getUserFcmTokens(), isFirebaseReady() (+24 more)

### Community 18 - "scripts"
Cohesion: 0.15
Nodes (12): description, name, private, scripts, build, dev, dev:admin, dev:all (+4 more)

### Community 20 - "mobile/liveController.js"
Cohesion: 0.08
Nodes (60): approveSeatRequest(), assignRoomAdmin(), buildRoomResponse(), cancelSeatRequest(), claimLiveReward(), createRoom(), decreaseRoomSeats(), deleteRoomChatMessage() (+52 more)

### Community 22 - "mobile/walletRoutes.js"
Cohesion: 0.23
Nodes (17): getBalances, getPackages, getRechargeConfig, getTransactions, getWithdrawalConfig, purchaseCoins, requestWithdrawal, cancelWithdrawalRequest() (+9 more)

### Community 23 - "mobile/index.js"
Cohesion: 0.17
Nodes (11): router, router, router, router, router, router, router, router (+3 more)

### Community 34 - "redis.js"
Cohesion: 0.12
Nodes (10): cache, __dirname, __filename, REDIS_COMMAND_TIMEOUT, REDIS_CONNECT_TIMEOUT, REDIS_DB, REDIS_DEFAULT_TTL, REDIS_PORT (+2 more)

### Community 35 - "test_redis_hit_and_freshness.mjs"
Cohesion: 0.83
Nodes (3): getRedisRaw(), makeRequest(), run()

### Community 36 - "getPool"
Cohesion: 0.12
Nodes (16): getPool(), executeMerge(), getMergeHistory(), previewMerge(), addModerator(), adjustBalance(), assignReseller(), assignUserToAgency() (+8 more)

### Community 37 - "ApiDocs.jsx"
Cohesion: 0.18
Nodes (7): API_SPEC, getToken(), SocketDocsView(), ApiDocs(), EndpointErrorBoundary, extractMediaItems(), copyToClipboard()

### Community 38 - "App.jsx"
Cohesion: 0.13
Nodes (24): authApi, checkHealth(), getCurrentUser(), setCurrentUser(), setToken(), dashboardApi, streamApi, App() (+16 more)

### Community 41 - "dev.js"
Cohesion: 0.33
Nodes (3): children, __dirname, __filename

### Community 44 - "mobile/packageRoutes.js"
Cohesion: 0.31
Nodes (9): checkRoomActionPrivilege, getMyPackages, getPackageCategories, getPackages, getPackagesByCategory, getUserPrivileges, purchasePackage, togglePackageActive (+1 more)

### Community 45 - "authMiddleware.js"
Cohesion: 0.08
Nodes (46): __dirname, __filename, signToken(), verifyToken(), getMe(), login(), register(), createRoom() (+38 more)

### Community 47 - "Loader.jsx"
Cohesion: 0.28
Nodes (15): adminApi, agencyApi, userApi, withdrawalApi, BulkActionBar(), Loader(), Pagination(), MODERATOR_POWER_LABELS (+7 more)

### Community 48 - "specialItemController.js"
Cohesion: 0.09
Nodes (20): createThemeItem(), deleteThemeItem(), getAdminThemeItems(), getThemeStats(), setDefaultThemeItem(), updateThemeItem(), createEntryEffect(), createThumbnail() (+12 more)

### Community 51 - "mobile/giftController.js"
Cohesion: 0.25
Nodes (8): getGifts(), getUserGiftContributions(), sendGift(), getTopAgencies(), getTopGifters(), router, router, router

### Community 52 - "entryEffectController.js"
Cohesion: 0.43
Nodes (6): getEntryEffectCatalog(), getMyEntryEffects(), getUserActiveEntryEffectsMap(), purchaseEntryEffect(), toggleEntryEffect(), router

### Community 53 - "resellerController.js"
Cohesion: 0.49
Nodes (8): clearTransactions(), deleteTransaction(), getResellerBalance(), getResellerTransactions(), getUserDetails(), rechargeUser(), resolveResellerId(), searchUsers()

### Community 54 - "hostController.js"
Cohesion: 0.68
Nodes (6): formatDuration(), getHostAgencySummary(), getHostDashboardOverview(), getHostMonthlyBreakdown(), getHostStreamHistory(), resolveHostId()

### Community 55 - "themeRoutes.js"
Cohesion: 0.39
Nodes (7): buyThemeItem(), equipThemeItem(), getActiveTheme(), getDefaultTheme(), getMyThemeItems(), getThemesCatalog(), router

### Community 57 - "Thumbnails.jsx"
Cohesion: 0.23
Nodes (10): bannerApi, resolveAssetUrl(), uploadFile(), specialItemApi, FileUploadInput(), Banners(), EntryEffects(), PackageManagement() (+2 more)

### Community 58 - "react"
Cohesion: 0.19
Nodes (9): liveApi, packageApi, GoogleMeetLiveStage(), Sidebar(), UserLiveAuth(), useLiveKit(), CreateCategory(), UserLivePortal() (+1 more)

### Community 59 - "AppThemes.jsx"
Cohesion: 0.50
Nodes (3): themeApi, AppThemes(), TAB_TYPES

### Community 60 - "EconomyContext.jsx"
Cohesion: 0.23
Nodes (6): accountMergeApi, settingsApi, EconomyContext, EconomyProvider(), AccountMerge(), Settings()

### Community 61 - "liveRewardService.js"
Cohesion: 0.28
Nodes (8): getLiveRewardHistoryAdmin(), getLiveRewardSettingsAdmin(), getLiveRewardStatsAdmin(), updateLiveRewardSettingsAdmin(), getLiveDurationRewardHistory(), getLiveDurationRewardSettings(), getLiveDurationRewardStats(), updateLiveDurationRewardSettings()

### Community 62 - "Gifts.jsx"
Cohesion: 0.39
Nodes (5): giftApi, Gifts(), isMediaUrl(), resolveMediaUrl(), TopContributors()

### Community 64 - "callController.js"
Cohesion: 0.14
Nodes (21): DEFAULT_LIVEKIT_API_KEY, DEFAULT_LIVEKIT_API_SECRET, DEFAULT_LIVEKIT_URL, __dirname, __filename, generateLiveKitToken(), getLiveKitConfig(), LIVEKIT_API_KEY (+13 more)

## Knowledge Gaps
- **166 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+161 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `callController.js`, `controllers/packageController.js`, `db.js`, `redis.js`, `getPool`, `authMiddleware.js`, `moderatorRoutes.js`, `specialItemController.js`, `feedController.js`, `chatController.js`, `mobile/giftController.js`, `entryEffectController.js`, `mobile/liveController.js`, `hostController.js`, `resellerController.js`, `themeRoutes.js`, `mobile/walletRoutes.js`, `liveRewardService.js`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Why does `getPool()` connect `getPool` to `callController.js`, `query`, `db.js`, `authMiddleware.js`, `chatController.js`, `feedController.js`, `mobile/giftController.js`, `resellerController.js`, `mobile/walletRoutes.js`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `LiveRewards.jsx`, `ApiDocs.jsx`, `App.jsx`, `.oxlintrc.json`, `client.js`, `Loader.jsx`, `Thumbnails.jsx`, `AppThemes.jsx`, `EconomyContext.jsx`, `Gifts.jsx`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _166 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `controllers/packageController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.08472344161545214 - nodes in this community are weakly interconnected._
- **Should `db.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05673758865248227 - nodes in this community are weakly interconnected._