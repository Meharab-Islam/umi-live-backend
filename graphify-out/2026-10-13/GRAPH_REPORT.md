# Graph Report - umi_backend  (2026-10-13)

## Corpus Check
- 142 files · ~222,514 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 711 nodes · 1869 edges · 48 communities (34 shown, 14 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 288 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- feedController.js
- query
- server.js
- admin-panel/package.json
- dependencies
- AGENTS.md
- redis.js
- 📡 API Endpoints Summary
- .oxlintrc.json
- React + Vite
- vite.config.js
- App.jsx
- Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy
- authMiddleware.js
- moderatorRoutes.js
- test_moderator_agency_oversight.mjs
- mobile/giftRoutes.js
- mobile/index.js
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
- entryEffectController.js
- test_redis_hit_and_freshness.mjs
- resellerController.js
- db.js
- hostController.js
- dev.js
- test_google_token_flow.mjs
- thumbnailController.js
- mobile/packageRoutes.js
- cache
- controllers/walletController.js
- controllers/giftController.js

## God Nodes (most connected - your core abstractions)
1. `query()` - 229 edges
2. `getPool()` - 37 edges
3. `react` - 33 edges
4. `cache` - 29 edges
5. `request()` - 24 edges
6. `Loader()` - 23 edges
7. `requireAuth()` - 23 edges
8. `buildRoomResponse()` - 15 edges
9. `adminApi` - 14 edges
10. `userApi` - 13 edges

## Surprising Connections (you probably didn't know these)
- `sendGift()` --calls--> `getPool()`  [EXTRACTED]
  backend/src/controllers/giftController.js → backend/src/config/db.js
- `sendMessage()` --calls--> `getPool()`  [EXTRACTED]
  backend/src/controllers/mobile/chatController.js → backend/src/config/db.js
- `addComment()` --calls--> `getPool()`  [EXTRACTED]
  backend/src/controllers/mobile/feedController.js → backend/src/config/db.js
- `createPost()` --calls--> `getPool()`  [EXTRACTED]
  backend/src/controllers/mobile/feedController.js → backend/src/config/db.js
- `deleteComment()` --calls--> `getPool()`  [EXTRACTED]
  backend/src/controllers/mobile/feedController.js → backend/src/config/db.js

## Import Cycles
- None detected.

## Communities (48 total, 14 thin omitted)

### Community 0 - "feedController.js"
Cohesion: 0.35
Nodes (13): addComment(), createPost(), deleteComment(), deletePost(), extractPackageCategory(), getComments(), getFeed(), getPostDetails() (+5 more)

### Community 1 - "query"
Cohesion: 0.05
Nodes (104): getPool(), query(), executeMerge(), getMergeHistory(), previewMerge(), addModerator(), adjustBalance(), assignReseller() (+96 more)

### Community 2 - "server.js"
Cohesion: 0.11
Nodes (19): __dirname, __filename, initializeDatabase(), router, API_SPEC, router, router, app (+11 more)

### Community 3 - "admin-panel/package.json"
Cohesion: 0.07
Nodes (29): dependencies, lucide-react, react, react-dom, socket.io-client, devDependencies, oxlint, @types/react (+21 more)

### Community 4 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, bcryptjs, cors, dotenv, express, ioredis, jsonwebtoken, morgan (+27 more)

### Community 5 - "AGENTS.md"
Cohesion: 0.25
Nodes (7): 1. Centralized .env Configuration & Project Portability Policy, 2. Production-Grade Zero-Downtime Redis Architecture, 3. Mandatory Database-First Mutation + Instant Redis Invalidation, 4. Mandatory Enforcement for All Future Features & Prompts, 5. Mandatory Mobile API Documentation & Interactive API Explorer (Swagger-like) Policy, 6. Mandatory Mobile API Directory Structure & Isolation Policy, Workspace AI Agent Rules

### Community 6 - "redis.js"
Cohesion: 0.15
Nodes (7): __dirname, __filename, REDIS_COMMAND_TIMEOUT, REDIS_CONNECT_TIMEOUT, REDIS_DB, REDIS_DEFAULT_TTL, REDIS_PORT

### Community 7 - "📡 API Endpoints Summary"
Cohesion: 0.12
Nodes (15): 1. Start MySQL, 2. Start Backend, 3. Start React Admin Panel, Admin Console (`/api/admin`) *(Protected: Requires admin role)*, 📡 API Endpoints Summary, 🏗️ Architecture Overview, Authentication (`/api/auth`), 🔑 Default Admin & Seed Credentials (+7 more)

### Community 8 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 9 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

### Community 11 - "App.jsx"
Cohesion: 0.06
Nodes (76): accountMergeApi, adminApi, agencyApi, API_SPEC, authApi, bannerApi, API_BASE, checkHealth() (+68 more)

### Community 12 - "Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy"
Cohesion: 0.29
Nodes (6): 1. Centralized .env Control & Project Portability, 2. Production-Grade Zero-Downtime Redis Architecture, 3. Database-First Mutation + Instant Redis Invalidation, 4. All Read (GET) Requests Handled by Redis, 5. Mandatory Enforcement for All Future Features & Prompts, Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy

### Community 13 - "authMiddleware.js"
Cohesion: 0.09
Nodes (34): __dirname, __filename, signToken(), verifyToken(), getMe(), login(), register(), createRoom() (+26 more)

### Community 14 - "moderatorRoutes.js"
Cohesion: 0.22
Nodes (22): applyToAgency(), approveHostRequest(), banHostBroadcast(), cancelHostApplication(), formatDuration(), getAgencyHosts(), getAgencyOverview(), getAllAgencies() (+14 more)

### Community 15 - "test_moderator_agency_oversight.mjs"
Cohesion: 0.83
Nodes (3): checkRedisKey(), makeRequest(), run()

### Community 16 - "mobile/giftRoutes.js"
Cohesion: 0.29
Nodes (7): getGifts(), getUserGiftContributions(), sendGift(), getTopAgencies(), getTopGifters(), router, router

### Community 17 - "mobile/index.js"
Cohesion: 0.16
Nodes (11): getMobileBanners(), router, router, router, router, router, router, router (+3 more)

### Community 18 - "scripts"
Cohesion: 0.15
Nodes (12): description, name, private, scripts, build, dev, dev:admin, dev:all (+4 more)

### Community 20 - "mobile/liveController.js"
Cohesion: 0.17
Nodes (29): approveSeatRequest(), assignRoomAdmin(), buildRoomResponse(), cancelSeatRequest(), createRoom(), endRoom(), fetchAndCacheSeatRequests(), formatDuration() (+21 more)

### Community 22 - "mobile/walletRoutes.js"
Cohesion: 0.24
Nodes (15): getBalances, getPackages, getRechargeConfig, getTransactions, getWithdrawalConfig, purchaseCoins, requestWithdrawal, cancelWithdrawalRequest() (+7 more)

### Community 23 - "chatController.js"
Cohesion: 0.17
Nodes (17): deleteConversation(), extractPackageCategory(), getConversations(), getMessages(), getOrCreateConversation(), invalidateChatCache(), markConversationRead(), sendMessage() (+9 more)

### Community 34 - "entryEffectController.js"
Cohesion: 0.53
Nodes (4): getEntryEffectCatalog(), getMyEntryEffects(), toggleEntryEffect(), router

### Community 35 - "test_redis_hit_and_freshness.mjs"
Cohesion: 0.83
Nodes (3): getRedisRaw(), makeRequest(), run()

### Community 36 - "resellerController.js"
Cohesion: 0.49
Nodes (8): clearTransactions(), deleteTransaction(), getResellerBalance(), getResellerTransactions(), getUserDetails(), rechargeUser(), resolveResellerId(), searchUsers()

### Community 37 - "db.js"
Cohesion: 0.25
Nodes (6): dbConfig, __dirname, __filename, testConnection(), getAppConfig(), router

### Community 38 - "hostController.js"
Cohesion: 0.56
Nodes (7): formatDuration(), getHostAgencySummary(), getHostDashboardOverview(), getHostMonthlyBreakdown(), getHostStreamHistory(), resolveHostId(), router

### Community 41 - "dev.js"
Cohesion: 0.33
Nodes (3): children, __dirname, __filename

### Community 43 - "thumbnailController.js"
Cohesion: 0.53
Nodes (4): getMyThumbnails(), getThumbnailCatalog(), toggleThumbnail(), router

### Community 44 - "mobile/packageRoutes.js"
Cohesion: 0.36
Nodes (8): checkRoomActionPrivilege, getMyPackages, getPackageCategories, getPackages, getPackagesByCategory, getUserPrivileges, purchasePackage, togglePackageActive

### Community 45 - "cache"
Cohesion: 0.67
Nodes (3): cache, cleanupUserFromRoom(), setupLiveSocket()

### Community 46 - "controllers/walletController.js"
Cohesion: 0.36
Nodes (8): getBalances(), getPackages(), getRechargeConfig(), getTransactions(), getWithdrawalConfig(), purchaseCoins(), requestWithdrawal(), router

### Community 47 - "controllers/giftController.js"
Cohesion: 0.60
Nodes (3): getGifts(), sendGift(), router

## Knowledge Gaps
- **125 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+120 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `feedController.js`, `entryEffectController.js`, `resellerController.js`, `db.js`, `hostController.js`, `thumbnailController.js`, `authMiddleware.js`, `moderatorRoutes.js`, `controllers/giftController.js`, `mobile/giftRoutes.js`, `mobile/index.js`, `controllers/walletController.js`, `cache`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `chatController.js`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `getPool()` connect `query` to `feedController.js`, `resellerController.js`, `db.js`, `controllers/walletController.js`, `controllers/giftController.js`, `mobile/giftRoutes.js`, `mobile/walletRoutes.js`, `chatController.js`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `authMiddleware.js` to `feedController.js`, `query`, `entryEffectController.js`, `resellerController.js`, `hostController.js`, `thumbnailController.js`, `mobile/packageRoutes.js`, `moderatorRoutes.js`, `controllers/giftController.js`, `mobile/giftRoutes.js`, `controllers/walletController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `chatController.js`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _125 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.05241605241605242 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10822510822510822 - nodes in this community are weakly interconnected._
- **Should `admin-panel/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._