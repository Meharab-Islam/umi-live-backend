# Graph Report - umi_backend  (2026-10-14)

## Corpus Check
- 150 files · ~250,296 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 743 nodes · 1940 edges · 47 communities (28 shown, 19 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 299 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- db.js
- query
- server.js
- admin-panel/package.json
- dependencies
- AGENTS.md
- controllers/walletController.js
- 📡 API Endpoints Summary
- .oxlintrc.json
- React + Vite
- vite.config.js
- App.jsx
- Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy
- feedController.js
- mobile/index.js
- test_moderator_agency_oversight.mjs
- routes/liveRoutes.js
- configController.js
- scripts
- add_host_api_docs.mjs
- mobile/liveController.js
- test_host_api.mjs
- mobile/walletRoutes.js
- liveSocket.js
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
- test_live_room_chat.mjs
- test_redis_hit_and_freshness.mjs
- resellerController.js
- test_socket_realtime_emission.mjs
- mobile/packageRoutes.js
- dev.js
- test_google_token_flow.mjs
- redis.js
- add_audio_live_api_docs.mjs

## God Nodes (most connected - your core abstractions)
1. `query()` - 245 edges
2. `getPool()` - 37 edges
3. `react` - 34 edges
4. `cache` - 29 edges
5. `request()` - 24 edges
6. `Loader()` - 23 edges
7. `requireAuth()` - 23 edges
8. `buildRoomResponse()` - 20 edges
9. `adminApi` - 14 edges
10. `userApi` - 13 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `query()`  [EXTRACTED]
  scratch/test_audio_live_seats.mjs → backend/src/config/db.js
- `main()` --calls--> `query()`  [EXTRACTED]
  scratch/test_live_room_chat.mjs → backend/src/config/db.js
- `main()` --calls--> `query()`  [EXTRACTED]
  scratch/test_socket_realtime_emission.mjs → backend/src/config/db.js
- `runTest()` --calls--> `query()`  [EXTRACTED]
  scratch/test_video_live_seat_guard.mjs → backend/src/config/db.js
- `sendGift()` --calls--> `getPool()`  [EXTRACTED]
  backend/src/controllers/giftController.js → backend/src/config/db.js

## Import Cycles
- None detected.

## Communities (47 total, 19 thin omitted)

### Community 0 - "db.js"
Cohesion: 0.22
Nodes (8): dbConfig, __dirname, __filename, testConnection(), makeToken(), runTests(), makeToken(), runTest()

### Community 1 - "query"
Cohesion: 0.05
Nodes (104): getPool(), query(), executeMerge(), getMergeHistory(), previewMerge(), addModerator(), adjustBalance(), assignReseller() (+96 more)

### Community 2 - "server.js"
Cohesion: 0.10
Nodes (21): __dirname, __filename, initializeDatabase(), router, router, API_SPEC, router, router (+13 more)

### Community 3 - "admin-panel/package.json"
Cohesion: 0.07
Nodes (29): dependencies, lucide-react, react, react-dom, socket.io-client, devDependencies, oxlint, @types/react (+21 more)

### Community 4 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, bcryptjs, cors, dotenv, express, ioredis, jsonwebtoken, morgan (+27 more)

### Community 5 - "AGENTS.md"
Cohesion: 0.25
Nodes (7): 1. Centralized .env Configuration & Project Portability Policy, 2. Production-Grade Zero-Downtime Redis Architecture, 3. Mandatory Database-First Mutation + Instant Redis Invalidation, 4. Mandatory Enforcement for All Future Features & Prompts, 5. Mandatory Mobile API Documentation & Interactive API Explorer (Swagger-like) Policy, 6. Mandatory Mobile API Directory Structure & Isolation Policy, Workspace AI Agent Rules

### Community 6 - "controllers/walletController.js"
Cohesion: 0.36
Nodes (8): getBalances(), getPackages(), getRechargeConfig(), getTransactions(), getWithdrawalConfig(), purchaseCoins(), requestWithdrawal(), router

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
Nodes (77): accountMergeApi, adminApi, agencyApi, API_SPEC, authApi, bannerApi, API_BASE, checkHealth() (+69 more)

### Community 12 - "Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy"
Cohesion: 0.29
Nodes (6): 1. Centralized .env Control & Project Portability, 2. Production-Grade Zero-Downtime Redis Architecture, 3. Database-First Mutation + Instant Redis Invalidation, 4. All Read (GET) Requests Handled by Redis, 5. Mandatory Enforcement for All Future Features & Prompts, Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy

### Community 13 - "feedController.js"
Cohesion: 0.11
Nodes (31): deleteConversation(), extractPackageCategory(), getConversations(), getMessages(), getOrCreateConversation(), invalidateChatCache(), markConversationRead(), sendMessage() (+23 more)

### Community 14 - "mobile/index.js"
Cohesion: 0.11
Nodes (35): applyToAgency(), approveHostRequest(), banHostBroadcast(), cancelHostApplication(), formatDuration(), getAgencyHosts(), getAgencyOverview(), getAllAgencies() (+27 more)

### Community 15 - "test_moderator_agency_oversight.mjs"
Cohesion: 0.83
Nodes (3): checkRedisKey(), makeRequest(), run()

### Community 16 - "routes/liveRoutes.js"
Cohesion: 0.48
Nodes (5): createRoom(), endRoom(), getRoomDetails(), getRooms(), router

### Community 18 - "scripts"
Cohesion: 0.15
Nodes (12): description, name, private, scripts, build, dev, dev:admin, dev:all (+4 more)

### Community 20 - "mobile/liveController.js"
Cohesion: 0.13
Nodes (40): approveSeatRequest(), assignRoomAdmin(), buildRoomResponse(), cancelSeatRequest(), createRoom(), decreaseRoomSeats(), deleteRoomChatMessage(), endRoom() (+32 more)

### Community 22 - "mobile/walletRoutes.js"
Cohesion: 0.24
Nodes (15): getBalances, getPackages, getRechargeConfig, getTransactions, getWithdrawalConfig, purchaseCoins, requestWithdrawal, cancelWithdrawalRequest() (+7 more)

### Community 35 - "test_redis_hit_and_freshness.mjs"
Cohesion: 0.83
Nodes (3): getRedisRaw(), makeRequest(), run()

### Community 36 - "resellerController.js"
Cohesion: 0.36
Nodes (10): clearTransactions(), deleteTransaction(), getResellerBalance(), getResellerTransactions(), getUserDetails(), rechargeUser(), resolveResellerId(), searchUsers() (+2 more)

### Community 38 - "mobile/packageRoutes.js"
Cohesion: 0.31
Nodes (9): checkRoomActionPrivilege, getMyPackages, getPackageCategories, getPackages, getPackagesByCategory, getUserPrivileges, purchasePackage, togglePackageActive (+1 more)

### Community 41 - "dev.js"
Cohesion: 0.33
Nodes (3): children, __dirname, __filename

### Community 47 - "redis.js"
Cohesion: 0.05
Nodes (54): __dirname, __filename, signToken(), verifyToken(), cache, __dirname, __filename, REDIS_COMMAND_TIMEOUT (+46 more)

## Knowledge Gaps
- **126 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `db.js`, `test_live_room_chat.mjs`, `resellerController.js`, `test_socket_realtime_emission.mjs`, `controllers/walletController.js`, `feedController.js`, `mobile/index.js`, `redis.js`, `routes/liveRoutes.js`, `configController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`, `liveSocket.js`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Why does `getPool()` connect `query` to `db.js`, `resellerController.js`, `controllers/walletController.js`, `feedController.js`, `mobile/index.js`, `redis.js`, `mobile/walletRoutes.js`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `redis.js` to `query`, `resellerController.js`, `mobile/packageRoutes.js`, `controllers/walletController.js`, `feedController.js`, `mobile/index.js`, `routes/liveRoutes.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.05241605241605242 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09782608695652174 - nodes in this community are weakly interconnected._
- **Should `admin-panel/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._