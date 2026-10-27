# Graph Report - big_eater  (2026-10-10)

## Corpus Check
- 7 files · ~33,362 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 198 nodes · 341 edges · 16 communities (15 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- q
- app.js
- server.js
- package.json
- devDependencies
- playNote
- fmt
- getItem
- admin.js
- onFoodTap
- qsa
- filterPlayers
- saveChipAmounts

## God Nodes (most connected - your core abstractions)
1. `q()` - 31 edges
2. `showToast()` - 26 edges
3. `playNote()` - 10 edges
4. `getItem()` - 9 edges
5. `showResultScreen()` - 9 edges
6. `fmt()` - 8 edges
7. `checkScheduledEventsOnTick()` - 8 edges
8. `getAdminState()` - 8 edges
9. `qsa()` - 7 edges
10. `setupTabs()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `revealResult()` --calls--> `processBetsTx`  [EXTRACTED]
  server.js → db/database.js
- `checkScheduledEventsOnTick()` --calls--> `setSetting()`  [EXTRACTED]
  server.js → db/database.js

## Import Cycles
- None detected.

## Communities (16 total, 1 thin omitted)

### Community 0 - "q"
Cohesion: 0.15
Nodes (19): q(), recalcProbabilities(), renderArmedStatus(), renderHeaderStatus(), renderHistoryTable(), renderMatrixTab(), renderOddsTab(), renderRigTab() (+11 more)

### Community 1 - "app.js"
Cohesion: 0.11
Nodes (17): DOM, enableDragToSlide(), finishSplash(), getNormalizedHistory(), initialMeta, openHistoryModal(), renderHistory(), renderHistoryModalContent() (+9 more)

### Community 2 - "server.js"
Cohesion: 0.08
Nodes (37): DATA_DIR, Database, db, fs, getSetting(), path, processBetsTx, setSetting() (+29 more)

### Community 3 - "package.json"
Cohesion: 0.08
Nodes (23): better-sqlite3, cors, express, author, dependencies, better-sqlite3, cors, express (+15 more)

### Community 4 - "devDependencies"
Cohesion: 0.18
Nodes (11): autoprefixer, devDependencies, autoprefixer, postcss, sass, socket.io-client, tailwindcss, tailwindcss (+3 more)

### Community 5 - "playNote"
Cohesion: 0.17
Nodes (12): closeResult(), getAudio(), launchConfetti(), pad4(), playJackpotFanfare(), playLose(), playNote(), playRecharge() (+4 more)

### Community 6 - "fmt"
Cohesion: 0.22
Nodes (10): animateWinAmount(), updateNumber(), fmt(), formatChipBtn(), playChipSelect(), q(), renderBetAmountButtons(), renderRulesOdds() (+2 more)

### Community 8 - "getItem"
Cohesion: 0.32
Nodes (8): clearAllStates(), clearSpinHighlight(), getItem(), getPlayerMeta(), getSession(), markWinner(), runRouletteSpin(), step()

### Community 9 - "admin.js"
Cohesion: 0.11
Nodes (22): adjustBalance(), armScheduleForTest(), armSpecialEvent(), changeTimezone(), clearRig(), copySnippet(), deleteSchedule(), disarmSpecialEvent() (+14 more)

### Community 10 - "onFoodTap"
Cohesion: 0.33
Nodes (6): onFoodTap(), playBet(), renderGrid(), restoreSelectionUI(), showToast(), updateFoodBetBadge()

### Community 13 - "qsa"
Cohesion: 0.40
Nodes (6): editSchedule(), onScheduleTypeChange(), populateFoodOptions(), qs(), qsa(), submitAddSchedule()

### Community 14 - "filterPlayers"
Cohesion: 0.67
Nodes (3): filterPlayers(), renderPlayersTable(), setPlayerFilter()

## Knowledge Gaps
- **53 isolated node(s):** `Database`, `path`, `fs`, `DATA_DIR`, `db` (+48 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `q()` connect `q` to `admin.js`, `qsa`, `filterPlayers`, `saveChipAmounts`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `Database`, `path`, `fs` to the rest of the system?**
  _53 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `q` be split into smaller, more focused modules?**
  _Cohesion score 0.14619883040935672 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10507246376811594 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._