# Graph Report - slote_mecine  (2026-10-11)

## Corpus Check
- 12 files · ~371,526 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 183 nodes · 264 edges · 12 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- server.js
- dependencies
- frontend/package.json
- backend/package.json
- game.js
- run-dev.js
- 2. Supported Outgoing Webhook Events & Payloads
- package.json
- selectCompetitiveFruit

## God Nodes (most connected - your core abstractions)
1. `connectSocket()` - 22 edges
2. `setupEventListeners()` - 10 edges
3. `placeBetOnFruit()` - 9 edges
4. `selectCompetitiveFruit()` - 7 edges
5. `selectWinningFruit()` - 7 edges
6. `triggerSpin()` - 7 edges
7. `calculateOutcomeEvaluations()` - 6 edges
8. `selectWeightedRandomFruit()` - 6 edges
9. `handleRoundResult()` - 6 edges
10. `updateUI()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `getAdminState()` --calls--> `calculateOutcomeEvaluations()`  [EXTRACTED]
  backend/server.js → backend/server.js  _Bridges community 13 → community 0_

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.09
Nodes (33): adminControls, app, broadcastAdminUpdate(), cors, crypto, dispatchWebhook(), express, FRUITS (+25 more)

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
Cohesion: 0.12
Nodes (37): addVisualChipToFruit(), CHIP_DENOMINATIONS, clearAllFruitChips(), CLOCKWISE_FRUITS, connectSocket(), dom, finalizeWinner(), fmt() (+29 more)

### Community 5 - "run-dev.js"
Cohesion: 0.25
Nodes (6): backendDir, backendProcess, frontendDir, frontendProcess, path, { spawn }

### Community 7 - "2. Supported Outgoing Webhook Events & Payloads"
Cohesion: 0.08
Nodes (24): 1. Register External Webhook Endpoints, ① `round_start` (Countdown Begins):, 1. Start Backend:, ② `bet_placed` (Player Bid Placed):, 2. Start Frontend:, 2. Supported Outgoing Webhook Events & Payloads, 3. Incoming REST APIs for Your App & Backend, ③ `spin_start` (Wheel Spinning): (+16 more)

### Community 10 - "package.json"
Cohesion: 0.11
Nodes (17): author, description, keywords, license, name, private, scripts, backend (+9 more)

### Community 13 - "selectCompetitiveFruit"
Cohesion: 0.76
Nodes (7): calculateOutcomeEvaluations(), selectAntiWhaleFruit(), selectCompetitiveFruit(), selectHouseMarginFruit(), selectWeightedRandomFruit(), selectWinningFruit(), selectWinRateFruit()

## Knowledge Gaps
- **84 isolated node(s):** `name`, `version`, `description`, `main`, `start` (+79 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `socket.io` connect `package.json` to `server.js`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `backend/package.json`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `setupEventListeners()` (e.g. with `pullSlotLever()` and `toggleAuto()`) actually correct?**
  _`setupEventListeners()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _84 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0907563025210084 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._