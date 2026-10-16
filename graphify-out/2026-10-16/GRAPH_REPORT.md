# Graph Report - umi_backend  (2026-10-16)

## Corpus Check
- 161 files · ~898,444 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 813 nodes · 2154 edges · 42 communities (27 shown, 15 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 322 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7bf4174a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- resellerController.js
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
- App.jsx
- Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy
- moderatorRoutes.js
- test_moderator_agency_oversight.mjs
- feedController.js
- scripts
- add_host_api_docs.mjs
- mobile/liveController.js
- test_host_api.mjs
- mobile/walletRoutes.js
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
- test_redis_hit_and_freshness.mjs
- ApiDocs.jsx
- redis.js
- dev.js
- test_google_token_flow.mjs
- authMiddleware.js
- add_audio_live_api_docs.mjs

## God Nodes (most connected - your core abstractions)
1. `query()` - 264 edges
2. `react` - 39 edges
3. `getPool()` - 38 edges
4. `request()` - 29 edges
5. `cache` - 29 edges
6. `requireAuth()` - 24 edges
7. `Loader()` - 23 edges
8. `buildRoomResponse()` - 20 edges
9. `adminApi` - 14 edges
10. `userApi` - 13 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `query()`  [EXTRACTED]
  scratch/test_audio_live_seats.mjs → backend/src/config/db.js
- `main()` --calls--> `query()`  [EXTRACTED]
  scratch/test_socket_realtime_emission.mjs → backend/src/config/db.js
- `runTest()` --calls--> `query()`  [EXTRACTED]
  scratch/test_video_live_seat_guard.mjs → backend/src/config/db.js
- `ApiDocs()` --calls--> `getToken()`  [EXTRACTED]
  admin-panel/src/pages/ApiDocs.jsx → admin-panel/src/api/client.js
- `sendGift()` --calls--> `getPool()`  [EXTRACTED]
  backend/src/controllers/giftController.js → backend/src/config/db.js

## Import Cycles
- None detected.

## Communities (42 total, 15 thin omitted)

### Community 0 - "resellerController.js"
Cohesion: 0.49
Nodes (8): clearTransactions(), deleteTransaction(), getResellerBalance(), getResellerTransactions(), getUserDetails(), rechargeUser(), resolveResellerId(), searchUsers()

### Community 1 - "query"
Cohesion: 0.05
Nodes (109): getPool(), query(), executeMerge(), getMergeHistory(), previewMerge(), addModerator(), adjustBalance(), assignReseller() (+101 more)

### Community 2 - "db.js"
Cohesion: 0.05
Nodes (43): dbConfig, __dirname, __filename, testConnection(), getGifts(), sendGift(), getBalances(), getPackages() (+35 more)

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

### Community 11 - "App.jsx"
Cohesion: 0.06
Nodes (81): accountMergeApi, adminApi, agencyApi, authApi, bannerApi, API_BASE, checkHealth(), del() (+73 more)

### Community 12 - "Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy"
Cohesion: 0.29
Nodes (6): 1. Centralized .env Control & Project Portability, 2. Production-Grade Zero-Downtime Redis Architecture, 3. Database-First Mutation + Instant Redis Invalidation, 4. All Read (GET) Requests Handled by Redis, 5. Mandatory Enforcement for All Future Features & Prompts, Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy

### Community 14 - "moderatorRoutes.js"
Cohesion: 0.22
Nodes (22): applyToAgency(), approveHostRequest(), banHostBroadcast(), cancelHostApplication(), formatDuration(), getAgencyHosts(), getAgencyOverview(), getAllAgencies() (+14 more)

### Community 15 - "test_moderator_agency_oversight.mjs"
Cohesion: 0.83
Nodes (3): checkRedisKey(), makeRequest(), run()

### Community 17 - "feedController.js"
Cohesion: 0.09
Nodes (46): candidatePaths, credentialsFilePath, __dirname, __filename, getAllActiveFcmTokens(), getUserFcmTokens(), isFirebaseReady(), sendChatPushNotification() (+38 more)

### Community 18 - "scripts"
Cohesion: 0.15
Nodes (12): description, name, private, scripts, build, dev, dev:admin, dev:all (+4 more)

### Community 20 - "mobile/liveController.js"
Cohesion: 0.10
Nodes (47): __dirname, __filename, generateLiveKitToken(), LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL, approveSeatRequest(), assignRoomAdmin() (+39 more)

### Community 22 - "mobile/walletRoutes.js"
Cohesion: 0.23
Nodes (17): getBalances, getPackages, getRechargeConfig, getTransactions, getWithdrawalConfig, purchaseCoins, requestWithdrawal, cancelWithdrawalRequest() (+9 more)

### Community 35 - "test_redis_hit_and_freshness.mjs"
Cohesion: 0.83
Nodes (3): getRedisRaw(), makeRequest(), run()

### Community 37 - "ApiDocs.jsx"
Cohesion: 0.33
Nodes (5): API_SPEC, SocketDocsView(), ApiDocs(), extractMediaItems(), copyToClipboard()

### Community 38 - "redis.js"
Cohesion: 0.05
Nodes (47): cache, __dirname, __filename, REDIS_COMMAND_TIMEOUT, REDIS_CONNECT_TIMEOUT, REDIS_DB, REDIS_DEFAULT_TTL, REDIS_PORT (+39 more)

### Community 41 - "dev.js"
Cohesion: 0.33
Nodes (3): children, __dirname, __filename

### Community 47 - "authMiddleware.js"
Cohesion: 0.07
Nodes (48): __dirname, __filename, signToken(), verifyToken(), getMe(), login(), register(), createRoom() (+40 more)

## Knowledge Gaps
- **139 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+134 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `resellerController.js`, `db.js`, `redis.js`, `moderatorRoutes.js`, `authMiddleware.js`, `feedController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **Why does `getPool()` connect `query` to `resellerController.js`, `db.js`, `redis.js`, `feedController.js`, `mobile/walletRoutes.js`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `authMiddleware.js` to `resellerController.js`, `query`, `db.js`, `redis.js`, `moderatorRoutes.js`, `feedController.js`, `mobile/liveController.js`, `mobile/walletRoutes.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _139 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.05067466266866567 - nodes in this community are weakly interconnected._
- **Should `db.js` be split into smaller, more focused modules?**
  _Cohesion score 0.052525252525252523 - nodes in this community are weakly interconnected._
- **Should `admin-panel/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._