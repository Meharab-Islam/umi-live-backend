# Graph Report - roulettecasino  (2026-09-30)

## Corpus Check
- 111 files · ~258,570 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 724 nodes · 1925 edges · 52 communities (35 shown, 17 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 201 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Compiled Web Assets 0
- Compiled Web Assets 1
- Backend Server & Socket.IO
- Compiled Web Assets 3
- Backend Dependencies & Configuration
- Compiled Web Assets 5
- Game Table & Betting UI
- Frontend State & Event Stream
- Frontend State & Event Stream
- Compiled Web Assets 9
- Compiled Web Assets 10
- Compiled Web Assets 11
- Compiled Web Assets 12
- Compiled Web Assets 13
- Compiled Web Assets 14
- Compiled Web Assets 15
- Frontend Dependencies & Scripts
- Compiled Web Assets 17
- Compiled Web Assets 18
- Compiled Web Assets 19
- Compiled Web Assets 20
- Frontend Dependencies & Scripts
- Compiled Web Assets 22
- Compiled Web Assets 23
- Compiled Web Assets 24
- Compiled Web Assets 25
- Compiled Web Assets 26
- Frontend Dependencies & Scripts
- Component Module 28
- Compiled Web Assets 29
- Frontend Dependencies & Scripts
- Game Table & Betting UI
- Compiled Web Assets 33
- Compiled Web Assets 34
- Component Module 35
- Frontend Dependencies & Scripts
- Frontend Dependencies & Scripts
- Frontend Dependencies & Scripts
- Frontend Dependencies & Scripts
- Frontend Dependencies & Scripts
- Frontend Dependencies & Scripts
- Frontend Dependencies & Scripts
- Frontend Dependencies & Scripts
- Frontend Dependencies & Scripts
- Frontend Dependencies & Scripts
- Frontend Dependencies & Scripts
- Frontend Dependencies & Scripts

## God Nodes (most connected - your core abstractions)
1. `i()` - 60 edges
2. `t()` - 54 edges
3. `Hn()` - 47 edges
4. `n()` - 47 edges
5. `r()` - 45 edges
6. `ks()` - 38 edges
7. `o()` - 35 edges
8. `Yn()` - 34 edges
9. `hr()` - 30 edges
10. `Ri()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `updateTime()` --calls--> `addGameHistory()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `updateTime()` --calls--> `allUserHistory()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `updateTime()` --calls--> `RandomResult()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `updateTime()` --calls--> `selectFrame()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `TableContent()` --calls--> `convertToShortForm()`  [EXTRACTED]
  frontend/src/GameMain/TableContent.js → frontend/src/GameMain/CoinButton.js

## Import Cycles
- 3-file cycle: `frontend/src/App.js -> frontend/src/GameMain/GameTable.js -> frontend/src/GameMain/TableContent.js -> frontend/src/App.js`

## Communities (52 total, 17 thin omitted)

### Community 0 - "Compiled Web Assets 0"
Cohesion: 0.06
Nodes (100): _a(), b(), be(), a(), o(), r(), s(), c() (+92 more)

### Community 1 - "Compiled Web Assets 1"
Cohesion: 0.07
Nodes (23): addEventListeners(), Bt(), check(), doClose(), doOpen(), doPoll(), doWrite(), jt() (+15 more)

### Community 2 - "Backend Server & Socket.IO"
Cohesion: 0.05
Nodes (39): config, GameAdminCoin, http, io, mongoose, RouletteLastHistory, { selectFrame, RandomResult, addGameHistory, allUserHistory, createrouletteLastHistory, addBet, updateUser, coin, historyRecord }, { Server } (+31 more)

### Community 3 - "Compiled Web Assets 3"
Cohesion: 0.07
Nodes (28): An(), At(), bo(), Ce(), es(), Gr(), je(), jn() (+20 more)

### Community 4 - "Backend Dependencies & Configuration"
Cohesion: 0.06
Nodes (34): dependencies, cookie-parser, cors, debug, express, http, http-errors, jade (+26 more)

### Community 6 - "Game Table & Betting UI"
Cohesion: 0.11
Nodes (22): BetHistoryModel(), CoinBtn(), convertToShortForm(), arrCoins, currentGame, framesTotalCoins, framesTotalMine, generateRandomBit() (+14 more)

### Community 7 - "Frontend State & Event Stream"
Cohesion: 0.21
Nodes (13): filter(), fromEvent(), map(), Observable, pipe(), SafeObserver, scan(), startWith() (+5 more)

### Community 8 - "Frontend State & Event Stream"
Cohesion: 0.12
Nodes (14): App(), gameNumber, historyRecord, queryParams, rouletteWheelNumbers, soundGet, userId, adminBaseURL (+6 more)

### Community 9 - "Compiled Web Assets 9"
Cohesion: 0.21
Nodes (20): Ai(), Bi(), cs(), cu(), Eu(), fs(), gs(), hs() (+12 more)

### Community 10 - "Compiled Web Assets 10"
Cohesion: 0.14
Nodes (19): Ca(), Ea(), ei(), Ga(), gt(), is(), mi(), mt() (+11 more)

### Community 11 - "Compiled Web Assets 11"
Cohesion: 0.15
Nodes (19): aa(), Ba(), Fa(), Ha(), In(), ja(), Ka(), La() (+11 more)

### Community 12 - "Compiled Web Assets 12"
Cohesion: 0.16
Nodes (18): ci(), di(), Do(), ds(), fi(), li(), lu(), Mo() (+10 more)

### Community 13 - "Compiled Web Assets 13"
Cohesion: 0.17
Nodes (4): ir(), p(), or(), Yn()

### Community 14 - "Compiled Web Assets 14"
Cohesion: 0.22
Nodes (16): au(), i(), bu(), gu(), He(), ht(), iu(), ko() (+8 more)

### Community 15 - "Compiled Web Assets 15"
Cohesion: 0.17
Nodes (3): It(), qe(), re()

### Community 16 - "Frontend Dependencies & Scripts"
Cohesion: 0.13
Nodes (15): animejs, axios, dependencies, animejs, axios, react, react-scripts, rxjs (+7 more)

### Community 17 - "Compiled Web Assets 17"
Cohesion: 0.17
Nodes (15): cl(), el(), fe(), gl(), hl(), ie(), ll(), ne() (+7 more)

### Community 18 - "Compiled Web Assets 18"
Cohesion: 0.23
Nodes (13): al(), bl(), du(), ec(), il(), kl(), ol(), qo() (+5 more)

### Community 19 - "Compiled Web Assets 19"
Cohesion: 0.42
Nodes (12): ae(), Ao(), da(), fu(), hi(), ia(), ks(), ni() (+4 more)

### Community 20 - "Compiled Web Assets 20"
Cohesion: 0.24
Nodes (4): ge(), me(), ye(), zt()

### Community 21 - "Frontend Dependencies & Scripts"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 22 - "Compiled Web Assets 22"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 23 - "Compiled Web Assets 23"
Cohesion: 0.29
Nodes (4): Bn(), dn, nn(), rn()

### Community 26 - "Compiled Web Assets 26"
Cohesion: 0.29
Nodes (5): gn(), Kn(), nr(), rr(), tr()

### Community 27 - "Frontend Dependencies & Scripts"
Cohesion: 0.25
Nodes (7): eslintConfig, extends, name, private, version, react-app, react-app/jest

### Community 28 - "Component Module 28"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 29 - "Compiled Web Assets 29"
Cohesion: 0.43
Nodes (3): en(), ln, tn()

### Community 31 - "Frontend Dependencies & Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, eject, start, test

### Community 32 - "Game Table & Betting UI"
Cohesion: 0.60
Nodes (3): CoinButtonShow(), convertToShortForm(), Frame()

### Community 33 - "Compiled Web Assets 33"
Cohesion: 0.50
Nodes (3): ar(), er(), qn()

## Knowledge Gaps
- **113 isolated node(s):** `mongoose`, `config`, `http`, `{ Server }`, `User` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Hn()` connect `Compiled Web Assets 5` to `Compiled Web Assets 0`, `Compiled Web Assets 33`, `Compiled Web Assets 1`, `Compiled Web Assets 3`, `Compiled Web Assets 15`, `Compiled Web Assets 25`, `Compiled Web Assets 26`, `Compiled Web Assets 30`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `Yn()` connect `Compiled Web Assets 13` to `Compiled Web Assets 0`, `Compiled Web Assets 33`, `Compiled Web Assets 3`, `Compiled Web Assets 14`, `Compiled Web Assets 15`, `Compiled Web Assets 25`, `Compiled Web Assets 26`, `Compiled Web Assets 30`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `$t()` connect `Compiled Web Assets 1` to `Compiled Web Assets 0`, `Compiled Web Assets 3`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `i()` (e.g. with `be()` and `c()`) actually correct?**
  _`i()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 29 inferred relationships involving `t()` (e.g. with `Ao()` and `cr()`) actually correct?**
  _`t()` has 29 INFERRED edges - model-reasoned connections that need verification._
- **Are the 30 inferred relationships involving `n()` (e.g. with `_a()` and `c()`) actually correct?**
  _`n()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 26 inferred relationships involving `r()` (e.g. with `ar()` and `b()`) actually correct?**
  _`r()` has 26 INFERRED edges - model-reasoned connections that need verification._