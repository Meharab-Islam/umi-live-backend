# Graph Report - greedylion  (2026-09-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 775 nodes · 1918 edges · 37 communities (31 shown, 6 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 158 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Te
- 730
- dependencies
- D
- main.c3c26395.js
- WheelContent.js
- wu
- t
- Gr
- frontend/package.json
- sl
- _o
- re
- o
- r
- hs
- el
- f
- forEach
- backend/index.js
- service.js
- i
- ns
- backend/public/manifest.json
- Ta
- .add
- frontend/public/manifest.json
- updateTime
- ferryroundCounter.model.js
- ferryWheelGameHistory.model.js
- ferryWheelLastHistory.model.js
- gameAdminCoin.model.js
- user.model.js
- wallet.model.js

## God Nodes (most connected - your core abstractions)
1. `730()` - 256 edges
2. `i()` - 57 edges
3. `n()` - 49 edges
4. `Te` - 43 edges
5. `r()` - 42 edges
6. `el()` - 42 edges
7. `_o()` - 34 edges
8. `t()` - 33 edges
9. `oe` - 29 edges
10. `o()` - 29 edges

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

## Communities (37 total, 6 thin omitted)

### Community 0 - "Te"
Cohesion: 0.05
Nodes (5): ae(), Ne(), oe, o(), Te

### Community 1 - "730"
Cohesion: 0.06
Nodes (20): 730(), ac(), ar(), Ca(), _e(), ic(), ir(), Jn() (+12 more)

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (46): axios, author, dependencies, express, mongoose, nodemon, socket.io, socket.io-client (+38 more)

### Community 3 - "D"
Cohesion: 0.05
Nodes (23): 202(), A(), N(), fe(), Ho(), m(), Te(), u() (+15 more)

### Community 4 - "main.c3c26395.js"
Cohesion: 0.07
Nodes (27): 153(), u(), 391(), 43(), 579(), Xr(), 853(), 950() (+19 more)

### Community 5 - "WheelContent.js"
Cohesion: 0.08
Nodes (26): App(), coinNumbe, queryParams, userId, adminBaseURL, baseURL, key, RecordsDialog() (+18 more)

### Community 6 - "wu"
Cohesion: 0.11
Nodes (34): al(), Au(), bl(), br(), cl(), cu(), dl(), du() (+26 more)

### Community 7 - "t"
Cohesion: 0.08
Nodes (24): Ba(), Fa(), ie(), ja(), K(), Ka(), La(), Na() (+16 more)

### Community 8 - "Gr"
Cohesion: 0.06
Nodes (35): bo(), Bt(), Ce(), dt(), eo(), Gr(), He(), Hn() (+27 more)

### Community 9 - "frontend/package.json"
Cohesion: 0.07
Nodes (29): ajv, ajv-keywords, browserslist, development, production, devDependencies, ajv, ajv-keywords (+21 more)

### Community 10 - "sl"
Cohesion: 0.12
Nodes (19): G(), ge(), gl(), hl(), ml(), ne(), Nl(), pl() (+11 more)

### Community 11 - "_o"
Cohesion: 0.19
Nodes (24): R(), 234(), E(), j(), k(), L(), o(), w() (+16 more)

### Community 12 - "re"
Cohesion: 0.13
Nodes (5): ee(), a(), s(), off(), re

### Community 13 - "o"
Cohesion: 0.18
Nodes (11): gt(), Ni(), c(), d(), f(), l(), u(), qu() (+3 more)

### Community 14 - "r"
Cohesion: 0.13
Nodes (21): O(), pr(), ps(), ur(), C(), Cr(), gn(), Pt() (+13 more)

### Community 15 - "hs"
Cohesion: 0.20
Nodes (18): _a(), Di(), ds(), Fs(), gs(), hs(), li(), Ls() (+10 more)

### Community 16 - "el"
Cohesion: 0.19
Nodes (23): aa(), bu(), ci(), da(), Ei(), el(), Fo(), fu() (+15 more)

### Community 17 - "f"
Cohesion: 0.19
Nodes (14): b(), cr(), dr(), g(), m(), si(), zt(), ar() (+6 more)

### Community 18 - "forEach"
Cohesion: 0.15
Nodes (12): kl(), Ss(), cancelEmit(), en(), forEach(), Gt(), kr(), rn() (+4 more)

### Community 19 - "backend/index.js"
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

### Community 20 - "service.js"
Cohesion: 0.12
Nodes (12): config, createHistoryWinnerNumber(), FerryWheelGameHistory, FerryWheelLastHistory, FerryWheelRoundCounter, GameAdminCoin, helper, historyRecord() (+4 more)

### Community 21 - "i"
Cohesion: 0.14
Nodes (19): n(), ao(), bi(), co(), cs(), Ea(), gi(), i() (+11 more)

### Community 22 - "ns"
Cohesion: 0.19
Nodes (15): As(), Ga(), is(), Ji(), ju(), lu(), mt(), ns() (+7 more)

### Community 23 - "backend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 24 - "Ta"
Cohesion: 0.20
Nodes (11): bs(), es(), Ha(), Ii(), js(), ks(), qa(), Ta() (+3 more)

### Community 25 - ".add"
Cohesion: 0.21
Nodes (6): Kr(), $r(), Jr(), Se(), we, xe()

### Community 26 - "frontend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 28 - "updateTime"
Cohesion: 0.33
Nodes (6): refreshSettings(), updateTime(), addGameHistory(), allUserHistory(), gameAdminCoinUpdate(), RandomResult()

## Knowledge Gaps
- **99 isolated node(s):** `config`, `cors`, `FerryWheelLastHistory`, `GameAdminCoin`, `{ getDefaultSettings }` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `730()` connect `730` to `Te`, `D`, `main.c3c26395.js`, `wu`, `t`, `Gr`, `sl`, `_o`, `re`, `o`, `r`, `hs`, `el`, `f`, `forEach`, `i`, `ns`, `Ta`, `.add`?**
  _High betweenness centrality (0.304) - this node is a cross-community bridge._
- **Why does `Te` connect `Te` to `Gr`, `main.c3c26395.js`, `re`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `oe` connect `Te` to `D`, `main.c3c26395.js`, `Gr`, `re`, `el`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `730()` (e.g. with `Ce()` and `Ea()`) actually correct?**
  _`730()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `i()` (e.g. with `ft()` and `gs()`) actually correct?**
  _`i()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `n()` (e.g. with `O()` and `o()`) actually correct?**
  _`n()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `r()` (e.g. with `bu()` and `cu()`) actually correct?**
  _`r()` has 14 INFERRED edges - model-reasoned connections that need verification._