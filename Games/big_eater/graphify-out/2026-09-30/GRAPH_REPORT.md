# Graph Report - big_eater  (2026-09-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 88 nodes · 119 edges · 10 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- server.js
- package.json
- app.js
- dependencies
- database.js
- showResultScreen
- getItem
- playNote
- onFoodTap
- updateFoodBetBadge

## God Nodes (most connected - your core abstractions)
1. `showResultScreen()` - 7 edges
2. `playNote()` - 7 edges
3. `getItem()` - 6 edges
4. `revealResult()` - 5 edges
5. `onFoodTap()` - 5 edges
6. `fmt()` - 4 edges
7. `updateFoodBetBadge()` - 4 edges
8. `scripts` - 4 edges
9. `startGameLoop()` - 3 edges
10. `playLose()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `revealResult()` --calls--> `processBetsTx`  [EXTRACTED]
  server.js → db/database.js

## Import Cycles
- None detected.

## Communities (10 total, 0 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.13
Nodes (18): processBetsTx, app, cors, DEMO_AVATARS, DEMO_NAMES, express, FOODS, game (+10 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (15): author, description, devDependencies, socket.io-client, keywords, license, main, name (+7 more)

### Community 2 - "app.js"
Cohesion: 0.18
Nodes (7): DOM, finishSplash(), rsBackBtn, S, SESSION_ID, socket, updateSplash()

### Community 3 - "dependencies"
Cohesion: 0.22
Nodes (9): better-sqlite3, cors, express, dependencies, better-sqlite3, cors, express, socket.io (+1 more)

### Community 4 - "database.js"
Cohesion: 0.29
Nodes (6): DATA_DIR, Database, db, fs, path, stmts

### Community 5 - "showResultScreen"
Cohesion: 0.33
Nodes (7): closeResult(), fmt(), pad4(), playWin(), renderTopWinnersPodium(), setBalance(), showResultScreen()

### Community 6 - "getItem"
Cohesion: 0.50
Nodes (4): clearAllStates(), getItem(), getSession(), markWinner()

### Community 7 - "playNote"
Cohesion: 0.33
Nodes (6): getAudio(), playLose(), playNote(), playRecharge(), playTick(), updateTimer()

### Community 8 - "onFoodTap"
Cohesion: 0.67
Nodes (3): onFoodTap(), playBet(), showToast()

### Community 9 - "updateFoodBetBadge"
Cohesion: 0.50
Nodes (4): formatChipAmount(), renderGrid(), restoreSelectionUI(), updateFoodBetBadge()

## Knowledge Gaps
- **38 isolated node(s):** `app`, `cors`, `DEMO_AVATARS`, `DEMO_NAMES`, `express` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `app`, `cors`, `DEMO_AVATARS` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12631578947368421 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._