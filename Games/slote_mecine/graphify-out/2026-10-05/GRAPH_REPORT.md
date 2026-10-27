# Graph Report - slote_mecine  (2026-10-05)

## Corpus Check
- 10 files · ~202,553 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 122 nodes · 164 edges · 11 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- server.js
- dependencies
- frontend/package.json
- backend/package.json
- game.js
- 🎰 Chinese Live Streaming Fruit Slot Machine (水果老虎机)
- runRouletteWheel

## God Nodes (most connected - your core abstractions)
1. `connectSocket()` - 16 edges
2. `setupEventListeners()` - 10 edges
3. `placeBetOnFruit()` - 9 edges
4. `startGameLoop()` - 6 edges
5. `updateUI()` - 6 edges
6. `showToast()` - 6 edges
7. `🎰 Chinese Live Streaming Fruit Slot Machine (水果老虎机)` - 6 edges
8. `handleRoundResult()` - 5 edges
9. `initAudio()` - 5 edges
10. `fmt()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `connectSocket()` --calls--> `runRouletteWheel()`  [EXTRACTED]
  frontend/src/js/game.js → frontend/src/js/game.js  _Bridges community 4 → community 7_

## Import Cycles
- None detected.

## Communities (11 total, 0 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.12
Nodes (23): app, cors, dispatchWebhook(), express, FRUITS, gameState, getPlayer(), handleRoundResult() (+15 more)

### Community 1 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, cors, dotenv, express, express-rate-limit, helmet, mysql2, socket.io (+9 more)

### Community 2 - "frontend/package.json"
Cohesion: 0.12
Nodes (15): dependencies, socket.io-client, description, devDependencies, sass, vite, name, scripts (+7 more)

### Community 3 - "backend/package.json"
Cohesion: 0.18
Nodes (10): description, devDependencies, nodemon, main, name, scripts, dev, start (+2 more)

### Community 4 - "game.js"
Cohesion: 0.16
Nodes (28): addVisualChipToFruit(), CHIP_DENOMINATIONS, clearAllFruitChips(), CLOCKWISE_FRUITS, connectSocket(), dom, fmt(), fmtCompact() (+20 more)

### Community 5 - "🎰 Chinese Live Streaming Fruit Slot Machine (水果老虎机)"
Cohesion: 0.15
Nodes (12): 1. Register External Webhook URL:, 1. Start Backend:, 2. Start Frontend:, 2. Webhook Event Payload (Round Result):, 3. Sync User Balance from Live Stream System:, 🎰 Chinese Live Streaming Fruit Slot Machine (水果老虎机), 📸 Design & Architecture Highlights, 🐳 Docker Production Deployment (+4 more)

### Community 7 - "runRouletteWheel"
Cohesion: 0.50
Nodes (4): finalizeWinner(), runRouletteWheel(), step(), updateNeonRunnerPosition()

## Knowledge Gaps
- **51 isolated node(s):** `name`, `version`, `description`, `main`, `start` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `backend/package.json`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `setupEventListeners()` (e.g. with `pullSlotLever()` and `toggleAuto()`) actually correct?**
  _`setupEventListeners()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11594202898550725 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._