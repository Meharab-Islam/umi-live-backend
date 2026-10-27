# Graph Report - ferrywheel  (2026-09-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 658 nodes · 1646 edges · 33 communities (27 shown, 6 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 153 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- o
- Ke
- r
- u
- dependencies
- re
- nl
- WheelContent.js
- main.7ef1777a.js
- frontend/package.json
- zt
- Al
- backend/index.js
- service.js
- Kn
- tl
- i
- .add
- backend/public/manifest.json
- frontend/public/manifest.json
- updateTime
- le
- ferryroundCounter.model.js
- ferryWheelGameHistory.model.js
- ferryWheelLastHistory.model.js
- gameAdminCoin.model.js
- user.model.js
- wallet.model.js
- us
- ks

## God Nodes (most connected - your core abstractions)
1. `i()` - 55 edges
2. `Ke()` - 44 edges
3. `r()` - 43 edges
4. `t()` - 42 edges
5. `n()` - 42 edges
6. `nl()` - 37 edges
7. `o()` - 31 edges
8. `ae()` - 28 edges
9. `fo()` - 27 edges
10. `oa()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `updateTime()` --calls--> `addGameHistory()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `updateTime()` --calls--> `allUserHistory()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `updateTime()` --calls--> `RandomResult()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `WheelContent()` --calls--> `ToastConent()`  [EXTRACTED]
  frontend/src/Wheel/WheelContent.js → frontend/src/ToastConent.js

## Import Cycles
- None detected.

## Communities (33 total, 6 thin omitted)

### Community 0 - "o"
Cohesion: 0.06
Nodes (55): A(), ao(), c(), d(), u(), C(), E(), ee() (+47 more)

### Community 1 - "Ke"
Cohesion: 0.05
Nodes (5): ae(), Je(), Ke(), pull(), o()

### Community 2 - "r"
Cohesion: 0.06
Nodes (62): b(), bi(), bn(), o(), r(), br(), f(), h() (+54 more)

### Community 3 - "u"
Cohesion: 0.16
Nodes (25): bt(), bu(), cs(), cu(), Di(), du(), fu(), gu() (+17 more)

### Community 4 - "dependencies"
Cohesion: 0.04
Nodes (46): axios, author, dependencies, express, mongoose, nodemon, socket.io, socket.io-client (+38 more)

### Community 5 - "re"
Cohesion: 0.09
Nodes (13): addEventListeners(), check(), doClose(), doOpen(), doPoll(), l(), ne(), onData() (+5 more)

### Community 6 - "nl"
Cohesion: 0.20
Nodes (19): ba(), ci(), Cl(), Eu(), fl(), ha(), hl(), Ho() (+11 more)

### Community 7 - "WheelContent.js"
Cohesion: 0.08
Nodes (26): App(), coinNumbe, queryParams, userId, adminBaseURL, baseURL, key, RecordsDialog() (+18 more)

### Community 8 - "main.7ef1777a.js"
Cohesion: 0.06
Nodes (25): as(), D(), ec(), Ga(), Ia(), ir(), is(), ja() (+17 more)

### Community 9 - "frontend/package.json"
Cohesion: 0.08
Nodes (24): browserslist, development, production, devServer, disableHostCheck, historyApiFallback, eslintConfig, extends (+16 more)

### Community 10 - "zt"
Cohesion: 0.10
Nodes (12): bo(), dn(), gt(), He(), Qe(), Ro(), Rt(), ue() (+4 more)

### Community 11 - "Al"
Cohesion: 0.19
Nodes (13): Al(), dl(), el(), ge(), ie(), jl(), ll(), me() (+5 more)

### Community 12 - "backend/index.js"
Cohesion: 0.12
Nodes (16): config, cors, FerryWheelLastHistory, GameAdminCoin, { getDefaultSettings }, http, mongoose, {
  selectFrame,
  RandomResult,
  allUserHistory,
  createHistoryWinnerNumber,
  addBet,
  addUserBits,
  updateUser,
  createAdminCoin,
  historyRecord,
  todayProfit,
  addGameHistory,
} (+8 more)

### Community 13 - "service.js"
Cohesion: 0.12
Nodes (12): config, createHistoryWinnerNumber(), FerryWheelGameHistory, FerryWheelLastHistory, FerryWheelRoundCounter, GameAdminCoin, helper, historyRecord() (+4 more)

### Community 14 - "Kn"
Cohesion: 0.18
Nodes (13): ar(), Ce(), de(), eo(), Gn(), Kn(), nr(), or() (+5 more)

### Community 15 - "tl"
Cohesion: 0.24
Nodes (7): fe(), gl(), ml(), tl(), vl(), we, yl()

### Community 16 - "i"
Cohesion: 0.20
Nodes (17): Au(), dt(), ft(), i(), hu(), ji(), jo(), ku() (+9 more)

### Community 17 - ".add"
Cohesion: 0.19
Nodes (7): be(), Gs(), kl(), Oi(), ve(), xs(), ya()

### Community 18 - "backend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 19 - "frontend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 20 - "updateTime"
Cohesion: 0.33
Nodes (6): refreshSettings(), updateTime(), addGameHistory(), allUserHistory(), gameAdminCoinUpdate(), RandomResult()

### Community 21 - "le"
Cohesion: 0.24
Nodes (10): bs(), da(), ds(), fa(), Ko(), le(), Lo(), pa() (+2 more)

### Community 31 - "us"
Cohesion: 0.36
Nodes (7): Ai(), ea(), i(), Ii(), Mo(), us(), zs()

### Community 32 - "ks"
Cohesion: 0.29
Nodes (8): fs(), Hi(), ki(), ks(), ss(), ts(), ws(), Ys()

## Knowledge Gaps
- **97 isolated node(s):** `config`, `cors`, `FerryWheelLastHistory`, `GameAdminCoin`, `{ getDefaultSettings }` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ke()` connect `Ke` to `o`, `r`, `main.7ef1777a.js`, `zt`, `i`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `ae()` connect `Ke` to `main.7ef1777a.js`, `i`, `r`, `nl`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `i()` connect `i` to `o`, `Ke`, `r`, `u`, `re`, `nl`, `main.7ef1777a.js`, `zt`, `Al`, `tl`, `.add`, `le`, `us`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `i()` (e.g. with `main.7ef1777a.js` and `A()`) actually correct?**
  _`i()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `r()` (e.g. with `b()` and `br()`) actually correct?**
  _`r()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `t()` (e.g. with `br()` and `doOpen()`) actually correct?**
  _`t()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `n()` (e.g. with `A()` and `as()`) actually correct?**
  _`n()` has 24 INFERRED edges - model-reasoned connections that need verification._