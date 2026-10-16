# Graph Report - umi_backend  (2026-10-11)

## Corpus Check
- 96 files · ~119,420 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 463 nodes · 1192 edges · 21 communities
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 156 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- redis.js
- query
- server.js
- admin-panel/package.json
- dependencies
- AGENTS.md
- mobile/walletController.js
- 📡 API Endpoints Summary
- .oxlintrc.json
- React + Vite
- App.jsx
- Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy
- controllers/walletController.js
- cache
- mobile/authController.js
- db.js
- client.js
- mobile/liveController.js
- authMiddleware.js
- mobile/packageRoutes.js

## God Nodes (most connected - your core abstractions)
1. `query()` - 122 edges
2. `react` - 31 edges
3. `getPool()` - 25 edges
4. `request()` - 22 edges
5. `Loader()` - 21 edges
6. `cache` - 16 edges
7. `requireAuth()` - 14 edges
8. `adminApi` - 13 edges
9. `userApi` - 13 edges
10. `BulkActionBar()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `sendGift()` --calls--> `getPool()`  [EXTRACTED]
  backend/src/controllers/giftController.js → backend/src/config/db.js
- `sendGift()` --calls--> `getPool()`  [EXTRACTED]
  backend/src/controllers/mobile/giftController.js → backend/src/config/db.js
- `purchaseCoins()` --calls--> `getPool()`  [EXTRACTED]
  backend/src/controllers/walletController.js → backend/src/config/db.js
- `requestWithdrawal()` --calls--> `getPool()`  [EXTRACTED]
  backend/src/controllers/walletController.js → backend/src/config/db.js
- `getMe()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/authController.js → backend/src/config/db.js

## Import Cycles
- None detected.

## Communities (21 total, 0 thin omitted)

### Community 0 - "redis.js"
Cohesion: 0.15
Nodes (7): __dirname, __filename, REDIS_COMMAND_TIMEOUT, REDIS_CONNECT_TIMEOUT, REDIS_DB, REDIS_DEFAULT_TTL, REDIS_PORT

### Community 1 - "query"
Cohesion: 0.06
Nodes (87): getPool(), query(), executeMerge(), getMergeHistory(), previewMerge(), addModerator(), adjustBalance(), assignReseller() (+79 more)

### Community 2 - "server.js"
Cohesion: 0.10
Nodes (20): __dirname, __filename, initializeDatabase(), router, API_SPEC, router, router, app (+12 more)

### Community 3 - "admin-panel/package.json"
Cohesion: 0.07
Nodes (29): dependencies, lucide-react, react, react-dom, socket.io-client, devDependencies, oxlint, @types/react (+21 more)

### Community 4 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, bcryptjs, cors, dotenv, express, ioredis, jsonwebtoken, morgan (+27 more)

### Community 5 - "AGENTS.md"
Cohesion: 0.25
Nodes (7): 1. Centralized .env Configuration & Project Portability Policy, 2. Production-Grade Zero-Downtime Redis Architecture, 3. Mandatory Database-First Mutation + Instant Redis Invalidation, 4. Mandatory Enforcement for All Future Features & Prompts, 5. Mandatory Mobile API Documentation & Interactive API Explorer (Swagger-like) Policy, 6. Mandatory Mobile API Directory Structure & Isolation Policy, Workspace AI Agent Rules

### Community 6 - "mobile/walletController.js"
Cohesion: 0.46
Nodes (6): getBalances, getPackages, getTransactions, purchaseCoins, requestWithdrawal, transferCoins()

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
Cohesion: 0.10
Nodes (42): adminApi, agencyApi, resolveAssetUrl(), uploadFile(), packageApi, settingsApi, specialItemApi, streamApi (+34 more)

### Community 12 - "Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy"
Cohesion: 0.29
Nodes (6): 1. Centralized .env Control & Project Portability, 2. Production-Grade Zero-Downtime Redis Architecture, 3. Database-First Mutation + Instant Redis Invalidation, 4. All Read (GET) Requests Handled by Redis, 5. Mandatory Enforcement for All Future Features & Prompts, Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy

### Community 13 - "controllers/walletController.js"
Cohesion: 0.43
Nodes (6): getBalances(), getPackages(), getTransactions(), purchaseCoins(), requestWithdrawal(), router

### Community 15 - "cache"
Cohesion: 0.17
Nodes (11): cache, getAppConfig(), getGifts(), sendGift(), router, router, router, router (+3 more)

### Community 16 - "mobile/authController.js"
Cohesion: 0.13
Nodes (18): __dirname, __filename, signToken(), getMe(), login(), register(), getMe(), login() (+10 more)

### Community 17 - "db.js"
Cohesion: 0.24
Nodes (7): dbConfig, __dirname, __filename, testConnection(), getGifts(), sendGift(), router

### Community 18 - "client.js"
Cohesion: 0.11
Nodes (28): accountMergeApi, API_SPEC, authApi, bannerApi, API_BASE, checkHealth(), del(), get() (+20 more)

### Community 20 - "mobile/liveController.js"
Cohesion: 0.31
Nodes (13): buildRoomResponse(), createRoom(), endRoom(), formatDuration(), getMyActiveRoom(), getRoomDetails(), getRooms(), getRoomUsers() (+5 more)

### Community 21 - "authMiddleware.js"
Cohesion: 0.29
Nodes (9): verifyToken(), createRoom(), endRoom(), getRoomDetails(), getRooms(), optionalAuth(), requireAdmin(), requireAuth() (+1 more)

### Community 23 - "mobile/packageRoutes.js"
Cohesion: 0.48
Nodes (5): checkRoomActionPrivilege, getPackageCategories, getPackages, getUserPrivileges, purchasePackage

## Knowledge Gaps
- **103 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `server.js`, `mobile/walletController.js`, `controllers/walletController.js`, `cache`, `mobile/authController.js`, `db.js`, `mobile/liveController.js`, `authMiddleware.js`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `react` connect `App.jsx` to `.oxlintrc.json`, `client.js`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `authMiddleware.js` to `query`, `mobile/walletController.js`, `controllers/walletController.js`, `cache`, `mobile/authController.js`, `db.js`, `mobile/liveController.js`, `mobile/packageRoutes.js`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.06177076183939602 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10144927536231885 - nodes in this community are weakly interconnected._
- **Should `admin-panel/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._