# Graph Report - umi_backend  (2026-10-27)

## Corpus Check
- 387 files · ~6,925,668 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5097 nodes · 13122 edges · 234 communities (167 shown, 67 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 1599 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `58824a98`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- 730
- query
- src/server.js
- admin-panel/package.json
- dependencies
- AGENTS.md
- deploy.sh
- 📡 API Endpoints Summary
- .oxlintrc.json
- React + Vite
- i
- Settings.jsx
- Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy
- 🚀 UMI LIVE - VPS Deployment & Operations Master Guide
- moderatorRoutes.js
- test_moderator_agency_oversight.mjs
- db.js
- getPool
- workspaces
- add_host_api_docs.mjs
- mobile/liveController.js
- test_host_api.mjs
- mobile/walletRoutes.js
- hu
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
- 730
- ApiDocs.jsx
- ChatModeration.jsx
- dev.js
- test_google_token_flow.mjs
- main.5751c868.js
- restore_all_admin_data.js
- mobile/authController.js
- Loader
- n
- add_audio_live_api_docs.mjs
- react
- main.7955cbf4.js
- t
- No
- main.21695ab2.js
- client.js
- n
- qt
- liveSocket.js
- main.05634587.js
- pubSubService.js
- main.c3c26395.js
- Te
- Te
- Ke
- public/app.js
- ks
- mobile/index.js
- $t
- admin.js
- re
- r
- Yn
- hu
- backend/server.js
- re
- D
- ferrywheel/frontend/src/Wheel/WheelContent.js
- z
- greedylion/frontend/src/Wheel/WheelContent.js
- greedybaby/frontend/src/Wheel/WheelContent.js
- Hn
- game.js
- forEach
- dependencies
- big_eater/package.json
- t
- bl
- i
- zi
- r
- fo
- src/app.js
- dependencies
- teenpatti/backend/package.json
- a
- pl
- ferrywheel/backend/package.json
- zt
- greedybaby/backend/package.json
- greedylion/backend/package.json
- 2. Supported Outgoing Webhook Events & Payloads
- oe
- ps
- oe
- H
- .concat
- TableContent.js
- .add
- el
- teenpatti/backend/service.js
- gameUserBridge.js
- big_eater/server.js
- roulettecasino/frontend/src/App.js
- Observable.js
- GameTable.js
- App
- ferrywheel/backend/service.js
- greedylion/backend/service.js
- dependencies
- sl
- greedybaby/backend/service.js
- nl
- roulettecasino/backend/service.js
- slote_mecine/frontend/package.json
- dependencies
- chatController.js
- dependencies
- ErrorBoundary
- dependencies
- gameProcessManager.js
- Rt
- qe
- dependencies
- Games/package.json
- Learn More
- axios
- Learn More
- ln
- roulettecasino/frontend/src/index.js
- socket.io
- gameHistory.controller.js
- bootstrap
- ferrywheel/frontend/package.json
- greedybaby/frontend/package.json
- greedylion/frontend/package.json
- wu
- development
- development
- Gifts.jsx
- development
- development
- axios
- development
- jquery
- ferrywheel/backend/public/manifest.json
- ferrywheel/frontend/public/manifest.json
- greedybaby/backend/public/manifest.json
- greedybaby/frontend/public/manifest.json
- greedylion/backend/public/manifest.json
- greedylion/frontend/public/manifest.json
- roulettecasino/backend/public/manifest.json
- nn
- roulettecasino/frontend/package.json
- roulettecasino/frontend/public/manifest.json
- run-dev.js
- teenpatti/frontend/package.json
- useBranding
- @testing-library/jest-dom
- react
- devDependencies
- react-scripts
- scripts
- Frame.js
- scripts
- react
- react-scripts
- extends
- extends
- extends
- ramda
- axios
- bootstrap
- bootstrap
- Cn
- sass
- socket.io
- react
- react-toastify
- sass
- socket.io
- socket.io-client
- react-toastify
- sass
- socket.io
- socket.io-client
- @mui/material
- @testing-library/user-event
- react-toastify
- @testing-library/jest-dom
- @testing-library/user-event
- web-vitals
- react-dom
- @mui/icons-material
- socket.io-client
- @testing-library/jest-dom
- web-vitals
- roulettecasino/README.md
- @mui/styled-engine
- react-scripts
- react-toastify
- socket.io-client
- @testing-library/user-event
- web-vitals
- frontend/README.md
- teenpatti/README.md

## God Nodes (most connected - your core abstractions)
1. `query()` - 378 edges
2. `730()` - 263 edges
3. `730()` - 260 edges
4. `react` - 94 edges
5. `t()` - 74 edges
6. `a()` - 71 edges
7. `n()` - 69 edges
8. `i()` - 60 edges
9. `i()` - 57 edges
10. `i()` - 57 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `query()`  [EXTRACTED]
  scratch/test_audio_live_seats.mjs → backend/src/config/db.js
- `main()` --calls--> `query()`  [EXTRACTED]
  scratch/test_socket_realtime_emission.mjs → backend/src/config/db.js
- `runTest()` --calls--> `query()`  [EXTRACTED]
  scratch/test_video_live_seat_guard.mjs → backend/src/config/db.js
- `J()` --indirect_call--> `Q()`  [INFERRED]
  Games/teenpatti/backend/public/static/js/main.21695ab2.js → Games/ferrywheel/backend/public/static/js/main.7955cbf4.js
- `jo()` --indirect_call--> `Ko()`  [INFERRED]
  Games/teenpatti/backend/public/static/js/main.21695ab2.js → Games/ferrywheel/backend/public/static/js/main.7955cbf4.js

## Import Cycles
- 3-file cycle: `Games/roulettecasino/frontend/src/App.js -> Games/roulettecasino/frontend/src/GameMain/GameTable.js -> Games/roulettecasino/frontend/src/GameMain/TableContent.js -> Games/roulettecasino/frontend/src/App.js`

## Communities (234 total, 67 thin omitted)

### Community 0 - "730"
Cohesion: 0.03
Nodes (117): 730(), _a(), aa(), ac(), ar(), As(), Ba(), bi() (+109 more)

### Community 1 - "query"
Cohesion: 0.03
Nodes (157): query(), executeMerge(), getMergeHistory(), previewMerge(), addModerator(), adjustBalance(), approveDeletionRequest(), assignReseller() (+149 more)

### Community 2 - "src/server.js"
Cohesion: 0.05
Nodes (44): createRoom(), endRoom(), getRoomDetails(), getRooms(), getAllPublicPolicies(), getPublicBranding(), getPublicPrivacyPolicy(), getPublicTerms() (+36 more)

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

### Community 10 - "i"
Cohesion: 0.09
Nodes (61): bs(), bu(), ci(), cl(), cs(), cu(), da(), dl() (+53 more)

### Community 11 - "Settings.jsx"
Cohesion: 0.20
Nodes (12): getApiBase(), resolveAssetUrl(), uploadFile(), settingsApi, FileUploadInput(), BrandingContext, BrandingProvider(), EconomyContext (+4 more)

### Community 12 - "Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy"
Cohesion: 0.29
Nodes (6): 1. Centralized .env Control & Project Portability, 2. Production-Grade Zero-Downtime Redis Architecture, 3. Database-First Mutation + Instant Redis Invalidation, 4. All Read (GET) Requests Handled by Redis, 5. Mandatory Enforcement for All Future Features & Prompts, Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy

### Community 13 - "🚀 UMI LIVE - VPS Deployment & Operations Master Guide"
Cohesion: 0.08
Nodes (23): 1. 🔄 ভবিষ্যতে কোড আপডেট করার নিয়ম (How to Update Code), 2. ⚙️ `deploy.sh` স্ক্রিপ্ট চালালে কী কী ঘটে (What deploy.sh Does), 3. 🛠️ স্ক্রিপ্টে সমস্যা হলে কী করবেন (Troubleshooting & Fallback), 4. 📋 সম্পূর্ণ ম্যানুয়াল ডেপ্লয়মেন্ট গাইড (Manual Deployment Guide), 5. 💾 ডাটাবেজ ব্যাকআপ ও রিস্টোর (MySQL Backup & Restore), 6. 🧰 প্রয়োজনীয় কমান্ড চিটশিট (Daily Useful Commands), 🚀 UMI LIVE - VPS Deployment & Operations Master Guide, ক. সাধারণ কোড আপডেট (Standard Update - Zero Downtime) (+15 more)

### Community 14 - "moderatorRoutes.js"
Cohesion: 0.17
Nodes (25): applyToAgency(), approveHostRequest(), banHostBroadcast(), cancelHostApplication(), formatDuration(), getAgencyHosts(), getAgencyOverview(), getAllAgencies() (+17 more)

### Community 15 - "test_moderator_agency_oversight.mjs"
Cohesion: 0.83
Nodes (3): checkRedisKey(), makeRequest(), run()

### Community 16 - "db.js"
Cohesion: 0.06
Nodes (42): dbConfig, __dirname, __filename, poolProxy, testConnection(), DEFAULT_LIVEKIT_API_KEY, DEFAULT_LIVEKIT_API_SECRET, DEFAULT_LIVEKIT_URL (+34 more)

### Community 17 - "getPool"
Cohesion: 0.08
Nodes (56): getPool(), candidatePaths, credentialsFilePath, __dirname, __filename, getAllActiveFcmTokens(), getFollowerFcmTokens(), getUserFcmTokens() (+48 more)

### Community 18 - "workspaces"
Cohesion: 0.05
Nodes (43): dependencies, dotenv, ioredis, description, dotenv, ioredis, name, private (+35 more)

### Community 20 - "mobile/liveController.js"
Cohesion: 0.10
Nodes (51): approveSeatRequest(), assignRoomAdmin(), buildRoomResponse(), cancelSeatRequest(), claimLiveReward(), createRoom(), decreaseRoomSeats(), deleteRoomChatMessage() (+43 more)

### Community 22 - "mobile/walletRoutes.js"
Cohesion: 0.23
Nodes (17): getBalances, getPackages, getRechargeConfig, getTransactions, getWithdrawalConfig, purchaseCoins, requestWithdrawal, cancelWithdrawalRequest() (+9 more)

### Community 23 - "hu"
Cohesion: 0.12
Nodes (36): Ai(), al(), au(), Bi(), cs(), cu(), du(), Eu() (+28 more)

### Community 34 - "redis.js"
Cohesion: 0.10
Nodes (20): CACHE_SECTIONS, calculateJitteredTtl(), __dirname, __filename, formatKey(), inFlightFetches, REDIS_COMMAND_TIMEOUT, REDIS_CONNECT_TIMEOUT (+12 more)

### Community 35 - "test_redis_hit_and_freshness.mjs"
Cohesion: 0.83
Nodes (3): getRedisRaw(), makeRequest(), run()

### Community 36 - "730"
Cohesion: 0.03
Nodes (124): 730(), aa(), ac(), ar(), Ba(), bi(), bo(), bs() (+116 more)

### Community 37 - "ApiDocs.jsx"
Cohesion: 0.18
Nodes (7): API_SPEC, getToken(), SocketDocsView(), ApiDocs(), EndpointErrorBoundary, extractMediaItems(), copyToClipboard()

### Community 38 - "ChatModeration.jsx"
Cohesion: 0.48
Nodes (5): chatApi, ChatModeration(), formatFullDate(), formatTimeAgo(), resolveMediaUrl()

### Community 41 - "dev.js"
Cohesion: 0.29
Nodes (4): children, __dirname, __filename, GAME_PORTS

### Community 43 - "main.5751c868.js"
Cohesion: 0.04
Nodes (94): aa(), An(), Ba(), i(), bl(), bo(), bu(), Ca() (+86 more)

### Community 45 - "mobile/authController.js"
Cohesion: 0.12
Nodes (36): __dirname, __filename, signToken(), verifyToken(), getMe(), login(), register(), ensureFcmSchema() (+28 more)

### Community 47 - "Loader"
Cohesion: 0.20
Nodes (22): adminApi, agencyApi, specialItemApi, userApi, BulkActionBar(), Loader(), Pagination(), MODERATOR_POWER_LABELS (+14 more)

### Community 48 - "n"
Cohesion: 0.05
Nodes (77): 153(), u(), 202(), A(), O(), R(), 234(), E() (+69 more)

### Community 51 - "react"
Cohesion: 0.08
Nodes (28): dashboardApi, legalApi, liveRewardApi, streamApi, VALID_TABS, Header(), MarkdownRenderer(), parseMarkdownToHtml() (+20 more)

### Community 52 - "main.7955cbf4.js"
Cohesion: 0.04
Nodes (67): Al(), ar(), bi(), co(), D(), dl(), dt(), ec() (+59 more)

### Community 53 - "t"
Cohesion: 0.06
Nodes (80): _a(), b(), c(), cancelEmit(), co(), c(), d(), f() (+72 more)

### Community 54 - "No"
Cohesion: 0.05
Nodes (72): 202(), O(), P(), R(), 234(), A(), k(), L() (+64 more)

### Community 55 - "main.21695ab2.js"
Cohesion: 0.04
Nodes (64): Ac(), ae(), ar(), Bt(), cc(), Ce(), cs(), dc() (+56 more)

### Community 57 - "client.js"
Cohesion: 0.10
Nodes (27): accountMergeApi, authApi, bannerApi, del(), get(), getCurrentUser(), patch(), post() (+19 more)

### Community 58 - "n"
Cohesion: 0.10
Nodes (43): as(), b(), bn(), o(), r(), br(), c(), f() (+35 more)

### Community 59 - "qt"
Cohesion: 0.11
Nodes (23): al(), bl(), dt(), Ga(), He(), It(), mt(), qt() (+15 more)

### Community 60 - "liveSocket.js"
Cohesion: 0.16
Nodes (21): clearRoomGiftQueue(), emitGiftItem(), enqueueRoomGift(), generateDedupKey(), isDuplicate(), processRoomQueue(), recentGiftsMap, roomQueues (+13 more)

### Community 61 - "main.05634587.js"
Cohesion: 0.04
Nodes (45): 153(), u(), N(), 391(), 43(), 579(), Bt(), es() (+37 more)

### Community 62 - "pubSubService.js"
Cohesion: 0.13
Nodes (21): formatGameRow(), getAdminGamesList(), getGameDetails(), getGamesList(), handleGameWebhook(), INTEGRATED_GAMES, toggleGameStatus(), updateGameSettings() (+13 more)

### Community 63 - "main.c3c26395.js"
Cohesion: 0.05
Nodes (48): ae(), br(), Bt(), cr(), dr(), It(), Kt(), Nu() (+40 more)

### Community 67 - "public/app.js"
Cohesion: 0.06
Nodes (55): animateWinAmount(), updateNumber(), clearAllStates(), clearSpinHighlight(), closeResult(), DOM, enableDragToSlide(), finishSplash() (+47 more)

### Community 69 - "ks"
Cohesion: 0.25
Nodes (16): ae(), Ao(), da(), fu(), ge(), hi(), i(), ia() (+8 more)

### Community 70 - "mobile/index.js"
Cohesion: 0.05
Nodes (61): getMobileBanners(), getEntryEffectCatalog(), getMyEntryEffects(), getUserActiveEntryEffectsMap(), purchaseEntryEffect(), toggleEntryEffect(), getGifts(), getUserGiftContributions() (+53 more)

### Community 71 - "$t"
Cohesion: 0.06
Nodes (27): jr(), addEventListeners(), Bt(), check(), doClose(), doOpen(), doPoll(), doWrite() (+19 more)

### Community 72 - "admin.js"
Cohesion: 0.07
Nodes (54): adjustBalance(), applyChipPreset(), armScheduleForTest(), armSpecialEvent(), changeTimezone(), clearRig(), copySnippet(), deleteSchedule() (+46 more)

### Community 73 - "re"
Cohesion: 0.07
Nodes (20): addEventListeners(), check(), doClose(), doOpen(), doPoll(), ee(), H(), l() (+12 more)

### Community 74 - "r"
Cohesion: 0.12
Nodes (49): b(), C(), Cl(), co(), cr(), D(), dr(), ds() (+41 more)

### Community 75 - "Yn"
Cohesion: 0.07
Nodes (13): fn(), gn(), ir(), It(), ke(), Kn(), ko(), p() (+5 more)

### Community 76 - "hu"
Cohesion: 0.10
Nodes (45): Au(), bt(), bu(), cs(), cu(), Di(), du(), fs() (+37 more)

### Community 77 - "backend/server.js"
Cohesion: 0.09
Nodes (42): adminControls, app, broadcastAdminUpdate(), calculateOutcomeEvaluations(), cors, crypto, dispatchWebhook(), dotenv (+34 more)

### Community 78 - "re"
Cohesion: 0.15
Nodes (4): a(), l(), s(), re

### Community 79 - "D"
Cohesion: 0.08
Nodes (13): fe(), m(), B(), createSocket(), D, doClose(), doOpen(), J (+5 more)

### Community 80 - "ferrywheel/frontend/src/Wheel/WheelContent.js"
Cohesion: 0.07
Nodes (29): App(), coinNumbe, queryParams, adminBaseURL, baseURL, key, socketPath, formatDate() (+21 more)

### Community 81 - "z"
Cohesion: 0.12
Nodes (7): m(), D, doClose(), doOpen(), read(), x(), z

### Community 82 - "greedylion/frontend/src/Wheel/WheelContent.js"
Cohesion: 0.08
Nodes (25): App(), coinNumbe, queryParams, adminBaseURL, baseURL, key, socketPath, RecordsDialog() (+17 more)

### Community 83 - "greedybaby/frontend/src/Wheel/WheelContent.js"
Cohesion: 0.08
Nodes (26): App(), coinNumbe, queryParams, adminBaseURL, baseURL, key, socketPath, RecordsDialog() (+18 more)

### Community 85 - "game.js"
Cohesion: 0.12
Nodes (37): addVisualChipToFruit(), CHIP_DENOMINATIONS, clearAllFruitChips(), CLOCKWISE_FRUITS, connectSocket(), dom, finalizeWinner(), fmt() (+29 more)

### Community 86 - "forEach"
Cohesion: 0.08
Nodes (22): N(), kl(), Kr(), li(), $r(), Ss(), Xr(), ao() (+14 more)

### Community 87 - "dependencies"
Cohesion: 0.06
Nodes (35): cookie-parser, debug, dependencies, cookie-parser, cors, debug, express, http (+27 more)

### Community 88 - "big_eater/package.json"
Cohesion: 0.05
Nodes (36): autoprefixer, better-sqlite3, author, dependencies, better-sqlite3, cors, dotenv, express (+28 more)

### Community 89 - "t"
Cohesion: 0.12
Nodes (39): aa(), bc(), cu(), n(), dl(), eu(), Fl(), gt() (+31 more)

### Community 90 - "bl"
Cohesion: 0.15
Nodes (30): Ao(), bl(), bo(), Do(), fu(), G(), gl(), k() (+22 more)

### Community 91 - "i"
Cohesion: 0.08
Nodes (37): A(), d(), u(), C(), da(), E(), ft(), hn() (+29 more)

### Community 92 - "zi"
Cohesion: 0.13
Nodes (24): bi(), Ci(), Di(), el(), Gi(), _i(), Ii(), ji() (+16 more)

### Community 93 - "r"
Cohesion: 0.14
Nodes (28): ar(), be(), a(), o(), r(), s(), cr(), dr() (+20 more)

### Community 94 - "fo"
Cohesion: 0.10
Nodes (32): ao(), en(), Er(), fo(), io(), j(), Jr(), K() (+24 more)

### Community 95 - "src/app.js"
Cohesion: 0.11
Nodes (17): Card(), Coin(), convertToShortForm(), CoinBtn(), convertToShortForm(), Frame(), GameBlock(), Profile() (+9 more)

### Community 96 - "dependencies"
Cohesion: 0.07
Nodes (27): express-rate-limit, dependencies, cors, dotenv, express, express-rate-limit, helmet, mysql2 (+19 more)

### Community 97 - "teenpatti/backend/package.json"
Cohesion: 0.07
Nodes (27): author, dependencies, cors, express, http, mongodb, mongoose, nodemon (+19 more)

### Community 98 - "a"
Cohesion: 0.11
Nodes (34): Al(), au(), bu(), dt(), du(), Ef(), gu(), hl() (+26 more)

### Community 99 - "pl"
Cohesion: 0.18
Nodes (26): a(), Ba(), ca(), da(), ea(), ei(), Fa(), ga() (+18 more)

### Community 100 - "ferrywheel/backend/package.json"
Cohesion: 0.08
Nodes (24): author, dependencies, cors, express, http-errors, mongoose, nodemon, socket.io (+16 more)

### Community 101 - "zt"
Cohesion: 0.12
Nodes (10): bo(), gt(), He(), ht(), Qe(), Ro(), ue(), ye (+2 more)

### Community 102 - "greedybaby/backend/package.json"
Cohesion: 0.08
Nodes (24): author, dependencies, cors, express, http-errors, mongoose, nodemon, socket.io (+16 more)

### Community 103 - "greedylion/backend/package.json"
Cohesion: 0.08
Nodes (24): author, dependencies, cors, express, http-errors, mongoose, nodemon, socket.io (+16 more)

### Community 104 - "2. Supported Outgoing Webhook Events & Payloads"
Cohesion: 0.08
Nodes (24): 1. Register External Webhook Endpoints, ① `round_start` (Countdown Begins):, 1. Start Backend:, ② `bet_placed` (Player Bid Placed):, 2. Start Frontend:, 2. Supported Outgoing Webhook Events & Payloads, 3. Incoming REST APIs for Your App & Backend, ③ `spin_start` (Wheel Spinning): (+16 more)

### Community 105 - "oe"
Cohesion: 0.13
Nodes (3): oe, o(), pull()

### Community 106 - "ps"
Cohesion: 0.13
Nodes (26): ai(), as(), be(), bs(), de(), es(), fe(), fs() (+18 more)

### Community 107 - "oe"
Cohesion: 0.06
Nodes (10): Te(), _e(), oe, a(), o(), s(), off(), pull() (+2 more)

### Community 108 - "H"
Cohesion: 0.12
Nodes (12): ie(), K(), ne(), oe(), q(), v(), X(), A() (+4 more)

### Community 109 - ".concat"
Cohesion: 0.16
Nodes (14): At(), ci(), di(), Do(), fi(), li(), Mo(), pi() (+6 more)

### Community 110 - "TableContent.js"
Cohesion: 0.12
Nodes (20): BetHistoryModel(), CoinBtn(), convertToShortForm(), arrCoins, currentGame, framesTotalCoins, framesTotalMine, generateRandomBit() (+12 more)

### Community 111 - ".add"
Cohesion: 0.14
Nodes (7): u(), be, ce(), de(), fe(), pe(), we

### Community 112 - "el"
Cohesion: 0.07
Nodes (23): ae(), el(), G(), ge(), ie(), J(), ne(), Nl() (+15 more)

### Community 113 - "teenpatti/backend/service.js"
Cohesion: 0.04
Nodes (49): dotenv, path, activeUsers, app, { cardUpdateSplice, win, allUserHistory, gameAdminCoin }, config, cors, currentGame (+41 more)

### Community 114 - "gameUserBridge.js"
Cohesion: 0.21
Nodes (11): addCoins(), candidatePaths, deductCoins(), dotenvPaths, getUser(), invalidateUserCache(), path, allUserHistory() (+3 more)

### Community 115 - "big_eater/server.js"
Cohesion: 0.08
Nodes (40): DATA_DIR, Database, db, fs, getSetting(), path, processBetsTx, setSetting() (+32 more)

### Community 116 - "roulettecasino/frontend/src/App.js"
Cohesion: 0.17
Nodes (11): gameNumber, historyRecord, queryParams, rouletteWheelNumbers, soundGet, adminBaseURL, baseURL, key (+3 more)

### Community 117 - "Observable.js"
Cohesion: 0.24
Nodes (11): filter(), map(), Observable, SafeObserver, scan(), startWith(), take(), takeUntil() (+3 more)

### Community 118 - "GameTable.js"
Cohesion: 0.28
Nodes (5): GameTable(), fromEvent(), pipe(), WheeSpin(), WinnerModel()

### Community 119 - "App"
Cohesion: 0.53
Nodes (6): checkHealth(), App(), checkIsAdminPath(), getInitialTab(), isTabValid(), normalizeTab()

### Community 120 - "ferrywheel/backend/service.js"
Cohesion: 0.04
Nodes (50): dotenv, path, config, cors, FerryWheelLastHistory, GameAdminCoin, gameUserBridge, { getDefaultSettings } (+42 more)

### Community 121 - "greedylion/backend/service.js"
Cohesion: 0.04
Nodes (50): dotenv, path, config, cors, FerryWheelLastHistory, GameAdminCoin, gameUserBridge, { getDefaultSettings } (+42 more)

### Community 122 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, axios, bootstrap, react, react-dom, sass, socket.io, socket.io-client (+9 more)

### Community 123 - "sl"
Cohesion: 0.12
Nodes (14): al(), bl(), G(), ge(), Nl(), sl(), wl(), Y() (+6 more)

### Community 124 - "greedybaby/backend/service.js"
Cohesion: 0.04
Nodes (48): dotenv, path, config, cors, FerryWheelLastHistory, GameAdminCoin, gameUserBridge, http (+40 more)

### Community 125 - "nl"
Cohesion: 0.08
Nodes (39): Ai(), ba(), be(), bs(), ci(), Cl(), de(), ds() (+31 more)

### Community 126 - "roulettecasino/backend/service.js"
Cohesion: 0.05
Nodes (44): dotenv, path, config, cors, GameAdminCoin, gameUserBridge, http, io (+36 more)

### Community 127 - "slote_mecine/frontend/package.json"
Cohesion: 0.12
Nodes (15): dependencies, socket.io-client, description, devDependencies, sass, vite, sass, socket.io-client (+7 more)

### Community 128 - "dependencies"
Cohesion: 0.13
Nodes (15): animejs, bootstrap-icons, dependencies, animejs, bootstrap-icons, react-lazy-load-image-component, react-toastify, rxjs (+7 more)

### Community 129 - "chatController.js"
Cohesion: 0.10
Nodes (31): clearChatMessages(), deleteConversation(), extractPackageCategory(), getConversations(), getMessages(), getOrCreateConversation(), invalidateChatCache(), markConversationRead() (+23 more)

### Community 130 - "dependencies"
Cohesion: 0.13
Nodes (15): @emotion/react, @emotion/styled, dependencies, @emotion/react, @emotion/styled, react, react-dom, react-router-dom (+7 more)

### Community 132 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, axios, jquery, react-dom, react-scripts, @testing-library/react, @testing-library/user-event, web-vitals (+7 more)

### Community 133 - "gameProcessManager.js"
Cohesion: 0.15
Nodes (12): __dirname, __filename, initializeDatabase(), startServer(), waitForDatabase(), __dirname, __filename, GAME_DEFINITIONS (+4 more)

### Community 134 - "Rt"
Cohesion: 0.25
Nodes (7): dn(), Ot(), Rt(), Zn(), Ut(), ft(), It()

### Community 136 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, jquery, react-dom, react-scripts, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, web-vitals (+7 more)

### Community 137 - "Games/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 138 - "Learn More"
Cohesion: 0.14
Nodes (13): Advanced Configuration, Analyzing the Bundle Size, Available Scripts, Code Splitting, Deployment, Getting Started with Create React App, Learn More, Making a Progressive Web App (+5 more)

### Community 140 - "Learn More"
Cohesion: 0.14
Nodes (13): Advanced Configuration, Analyzing the Bundle Size, Available Scripts, Code Splitting, Deployment, Getting Started with Create React App, Learn More, Making a Progressive Web App (+5 more)

### Community 142 - "roulettecasino/frontend/src/index.js"
Cohesion: 0.50
Nodes (3): App(), root, reportWebVitals()

### Community 143 - "socket.io"
Cohesion: 0.09
Nodes (19): __dirname, __filename, author, description, keywords, license, name, private (+11 more)

### Community 144 - "gameHistory.controller.js"
Cohesion: 0.10
Nodes (14): GameAdminCoinSchema, GameHistorySchema, GameAdminCoin, GameAdminCoinSchema, mongoose, GameHistory, GameHistorySchema, mongoose (+6 more)

### Community 146 - "ferrywheel/frontend/package.json"
Cohesion: 0.17
Nodes (11): devServer, disableHostCheck, historyApiFallback, name, private, scripts, build, eject (+3 more)

### Community 147 - "greedybaby/frontend/package.json"
Cohesion: 0.17
Nodes (11): devServer, disableHostCheck, historyApiFallback, name, private, scripts, build, eject (+3 more)

### Community 148 - "greedylion/frontend/package.json"
Cohesion: 0.17
Nodes (11): devServer, disableHostCheck, historyApiFallback, name, private, scripts, build, eject (+3 more)

### Community 149 - "wu"
Cohesion: 0.08
Nodes (46): _a(), As(), Au(), cu(), Di(), dt(), du(), Eu() (+38 more)

### Community 150 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 151 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 152 - "Gifts.jsx"
Cohesion: 0.53
Nodes (4): giftApi, Gifts(), isMediaUrl(), resolveMediaUrl()

### Community 153 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 154 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 156 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 158 - "ferrywheel/backend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 159 - "ferrywheel/frontend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 160 - "greedybaby/backend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 161 - "greedybaby/frontend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 162 - "greedylion/backend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 163 - "greedylion/frontend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 164 - "roulettecasino/backend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 165 - "nn"
Cohesion: 0.29
Nodes (4): Bn(), dn, nn(), rn()

### Community 166 - "roulettecasino/frontend/package.json"
Cohesion: 0.25
Nodes (7): eslintConfig, extends, react-app, react-app/jest, name, private, version

### Community 167 - "roulettecasino/frontend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 168 - "run-dev.js"
Cohesion: 0.25
Nodes (6): backendDir, backendProcess, frontendDir, frontendProcess, path, { spawn }

### Community 170 - "teenpatti/frontend/package.json"
Cohesion: 0.25
Nodes (7): eslintConfig, extends, react-app, react-app/jest, name, private, version

### Community 171 - "useBranding"
Cohesion: 0.19
Nodes (10): API_BASE, liveApi, packageApi, GoogleMeetLiveStage(), Sidebar(), UserLiveAuth(), useBranding(), useLiveKit() (+2 more)

### Community 177 - "devDependencies"
Cohesion: 0.40
Nodes (5): ajv, ajv-keywords, devDependencies, ajv, ajv-keywords

### Community 180 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, eject, start, test

### Community 181 - "Frame.js"
Cohesion: 0.60
Nodes (3): CoinButtonShow(), convertToShortForm(), Frame()

### Community 182 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, eject, start, test

### Community 186 - "extends"
Cohesion: 0.50
Nodes (4): eslintConfig, extends, react-app, react-app/jest

### Community 187 - "extends"
Cohesion: 0.50
Nodes (4): eslintConfig, extends, react-app, react-app/jest

### Community 188 - "extends"
Cohesion: 0.50
Nodes (4): eslintConfig, extends, react-app, react-app/jest

## Knowledge Gaps
- **945 isolated node(s):** `Database`, `path`, `fs`, `DATA_DIR`, `db` (+940 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **67 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `730()` connect `730` to `Rt`, `oe`, `H`, `D`, `n`, `main.7955cbf4.js`, `wu`, `No`, `forEach`, `n`, `sl`, `main.c3c26395.js`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `No()` connect `No` to `730`, `730`, `ks`, `main.5751c868.js`, `.concat`, `.add`, `el`, `z`, `t`, `main.21695ab2.js`, `bl`, `qt`, `main.05634587.js`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `730()` connect `730` to `$t`, `i`, `re`, `.add`, `el`, `z`, `main.7955cbf4.js`, `No`, `n`, `qt`, `main.05634587.js`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 21 inferred relationships involving `730()` (e.g. with `Qa()` and `Xa()`) actually correct?**
  _`730()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `730()` (e.g. with `Qa()` and `Ua()`) actually correct?**
  _`730()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 48 inferred relationships involving `t()` (e.g. with `as()` and `b()`) actually correct?**
  _`t()` has 48 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Database`, `path`, `fs` to the rest of the system?**
  _945 weakly-connected nodes found - possible documentation gaps or missing edges._