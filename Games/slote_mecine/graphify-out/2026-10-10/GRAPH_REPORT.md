# Graph Report - slote_mecine  (2026-10-10)

## Corpus Check
- 10 files · ~354,190 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 130 nodes · 184 edges · 13 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- server.js
- dependencies
- frontend/package.json
- backend/package.json
- setupEventListeners
- 🎰 Chinese Live Streaming Fruit Slot Machine (水果老虎机)
- connectSocket
- game.js
- updateUI

## God Nodes (most connected - your core abstractions)
1. `connectSocket()` - 20 edges
2. `setupEventListeners()` - 10 edges
3. `placeBetOnFruit()` - 9 edges
4. `triggerSpin()` - 7 edges
5. `handleRoundResult()` - 6 edges
6. `updateUI()` - 6 edges
7. `showToast()` - 6 edges
8. `🎰 Chinese Live Streaming Fruit Slot Machine (水果老虎机)` - 6 edges
9. `broadcastAdminUpdate()` - 5 edges
10. `initAudio()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `connectSocket()` --calls--> `fmt()`  [EXTRACTED]
  frontend/src/js/game.js → frontend/src/js/game.js  _Bridges community 12 → community 7_
- `setupEventListeners()` --calls--> `fmt()`  [EXTRACTED]
  frontend/src/js/game.js → frontend/src/js/game.js  _Bridges community 12 → community 4_
- `connectSocket()` --calls--> `notifyFlutter()`  [EXTRACTED]
  frontend/src/js/game.js → frontend/src/js/game.js  _Bridges community 4 → community 7_
- `placeBetOnFruit()` --calls--> `updateUserBetBadge()`  [EXTRACTED]
  frontend/src/js/game.js → frontend/src/js/game.js  _Bridges community 4 → community 11_

## Import Cycles
- None detected.

## Communities (13 total, 0 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.10
Nodes (28): adminControls, app, broadcastAdminUpdate(), cors, dispatchWebhook(), express, FRUITS, gameState (+20 more)

### Community 1 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, cors, dotenv, express, express-rate-limit, helmet, mysql2, socket.io (+9 more)

### Community 2 - "frontend/package.json"
Cohesion: 0.12
Nodes (15): dependencies, socket.io-client, description, devDependencies, sass, vite, name, scripts (+7 more)

### Community 3 - "backend/package.json"
Cohesion: 0.18
Nodes (10): description, devDependencies, nodemon, main, name, scripts, dev, start (+2 more)

### Community 4 - "setupEventListeners"
Cohesion: 0.31
Nodes (11): addVisualChipToFruit(), initAudio(), notifyFlutter(), parseUrlParams(), placeBetOnFruit(), pullSlotLever(), selectChip(), setupEventListeners() (+3 more)

### Community 5 - "🎰 Chinese Live Streaming Fruit Slot Machine (水果老虎机)"
Cohesion: 0.15
Nodes (12): 1. Register External Webhook URL:, 1. Start Backend:, 2. Start Frontend:, 2. Webhook Event Payload (Round Result):, 3. Sync User Balance from Live Stream System:, 🎰 Chinese Live Streaming Fruit Slot Machine (水果老虎机), 📸 Design & Architecture Highlights, 🐳 Docker Production Deployment (+4 more)

### Community 7 - "connectSocket"
Cohesion: 0.22
Nodes (13): clearAllFruitChips(), connectSocket(), finalizeWinner(), renderHistory(), resetCenterToClock(), runRouletteWheel(), step(), spawnCoinsShower() (+5 more)

### Community 11 - "game.js"
Cohesion: 0.22
Nodes (8): CHIP_DENOMINATIONS, CLOCKWISE_FRUITS, dom, fmtCompact(), FRUIT_AURA_COLORS, Sound, state, updateUserBetBadge()

### Community 12 - "updateUI"
Cohesion: 0.67
Nodes (3): fmt(), showWinModal(), updateUI()

## Knowledge Gaps
- **54 isolated node(s):** `name`, `version`, `description`, `main`, `start` (+49 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `backend/package.json`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `connectSocket()` connect `connectSocket` to `game.js`, `setupEventListeners`, `updateUI`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `setupEventListeners()` (e.g. with `pullSlotLever()` and `toggleAuto()`) actually correct?**
  _`setupEventListeners()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _54 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10344827586206896 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._