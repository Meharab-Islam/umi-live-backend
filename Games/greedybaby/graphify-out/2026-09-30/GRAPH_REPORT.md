# Graph Report - greedybaby  (2026-09-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 772 nodes · 1910 edges · 41 communities (33 shown, 8 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 160 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Te
- 730
- dependencies
- WheelContent.js
- main.05634587.js
- Gr
- n
- i
- H
- forEach
- re
- frontend/package.json
- hs
- I
- cu
- Fo
- el
- backend/index.js
- service.js
- qa
- gn
- .add
- z
- ke
- be
- wi
- nr
- backend/public/manifest.json
- qt
- frontend/public/manifest.json
- u
- updateTime
- ferryroundCounter.model.js
- ferryWheelGameHistory.model.js
- ferryWheelLastHistory.model.js
- gameAdminCoin.model.js
- user.model.js
- wallet.model.js

## God Nodes (most connected - your core abstractions)
1. `730()` - 261 edges
2. `i()` - 57 edges
3. `n()` - 48 edges
4. `el()` - 44 edges
5. `Te` - 43 edges
6. `r()` - 43 edges
7. `No()` - 37 edges
8. `t()` - 34 edges
9. `oe` - 29 edges
10. `o()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `WheelContent()` --calls--> `ToastConent()`  [EXTRACTED]
  frontend/src/Wheel/WheelContent.js → frontend/src/ToastConent.js
- `updateTime()` --calls--> `addGameHistory()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `updateTime()` --calls--> `allUserHistory()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `updateTime()` --calls--> `RandomResult()`  [EXTRACTED]
  backend/index.js → backend/service.js

## Import Cycles
- None detected.

## Communities (41 total, 8 thin omitted)

### Community 0 - "Te"
Cohesion: 0.05
Nodes (4): oe, o(), pull(), Te

### Community 1 - "730"
Cohesion: 0.04
Nodes (37): 730(), ac(), al(), ar(), bl(), bs(), Ca(), cr() (+29 more)

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (46): axios, author, dependencies, express, mongoose, nodemon, socket.io, socket.io-client (+38 more)

### Community 3 - "WheelContent.js"
Cohesion: 0.08
Nodes (26): App(), coinNumbe, queryParams, userId, adminBaseURL, baseURL, key, RecordsDialog() (+18 more)

### Community 4 - "main.05634587.js"
Cohesion: 0.08
Nodes (15): 391(), 43(), 579(), dr(), 853(), 950(), ar(), Br() (+7 more)

### Community 5 - "Gr"
Cohesion: 0.23
Nodes (12): bo(), Ce(), eo(), Gr(), Hn(), Mn(), no(), to() (+4 more)

### Community 6 - "n"
Cohesion: 0.06
Nodes (82): 153(), u(), O(), R(), 234(), A(), k(), L() (+74 more)

### Community 7 - "i"
Cohesion: 0.11
Nodes (32): n(), br(), cs(), dt(), du(), _e(), Eu(), Fi() (+24 more)

### Community 8 - "H"
Cohesion: 0.11
Nodes (13): G(), ie(), J(), ne(), oe(), q(), v(), X() (+5 more)

### Community 9 - "forEach"
Cohesion: 0.14
Nodes (10): N(), es(), li(), cancelEmit(), forEach(), Gt(), rn(), tn (+2 more)

### Community 11 - "frontend/package.json"
Cohesion: 0.08
Nodes (24): browserslist, development, production, devServer, disableHostCheck, historyApiFallback, eslintConfig, extends (+16 more)

### Community 12 - "hs"
Cohesion: 0.24
Nodes (14): Di(), ds(), Ei(), Fs(), gs(), hs(), Mo(), ms() (+6 more)

### Community 13 - "I"
Cohesion: 0.25
Nodes (7): Ho(), nn(), on(), t(), re(), Y(), I

### Community 14 - "cu"
Cohesion: 0.23
Nodes (19): cu(), gu(), is(), Jo(), ju(), lu(), ns(), pt() (+11 more)

### Community 15 - "Fo"
Cohesion: 0.22
Nodes (10): aa(), Ba(), Fa(), Fo(), js(), le(), oa(), ra() (+2 more)

### Community 16 - "el"
Cohesion: 0.26
Nodes (15): ae(), bu(), ci(), cl(), da(), dl(), el(), ia() (+7 more)

### Community 17 - "backend/index.js"
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

### Community 18 - "service.js"
Cohesion: 0.12
Nodes (12): config, createHistoryWinnerNumber(), FerryWheelGameHistory, FerryWheelLastHistory, FerryWheelRoundCounter, GameAdminCoin, helper, historyRecord() (+4 more)

### Community 19 - "qa"
Cohesion: 0.19
Nodes (15): _a(), As(), Ea(), Ha(), ja(), Ka(), La(), Ma() (+7 more)

### Community 21 - ".add"
Cohesion: 0.17
Nodes (9): jr(), Jt(), kl(), Kr(), $r(), u(), Xr(), we (+1 more)

### Community 22 - "z"
Cohesion: 0.06
Nodes (19): 202(), P(), fe(), m(), Te(), B(), createSocket(), D (+11 more)

### Community 23 - "ke"
Cohesion: 0.33
Nodes (4): ge(), he(), ke, me()

### Community 25 - "be"
Cohesion: 0.33
Nodes (5): be, ce(), de(), fe(), pe()

### Community 26 - "wi"
Cohesion: 0.29
Nodes (10): bi(), co(), gi(), ki(), mi(), vi(), vo(), wi() (+2 more)

### Community 27 - "nr"
Cohesion: 0.18
Nodes (10): Kn(), nr(), Pe(), Qr(), rr(), tr(), Wr(), Ne() (+2 more)

### Community 29 - "backend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 30 - "qt"
Cohesion: 0.22
Nodes (13): Ga(), It(), mt(), qt(), t(), $t(), Ut(), Bt() (+5 more)

### Community 33 - "frontend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 35 - "u"
Cohesion: 0.40
Nodes (6): Bt(), zt(), Et(), St(), u(), xt()

### Community 36 - "updateTime"
Cohesion: 0.33
Nodes (6): refreshSettings(), updateTime(), addGameHistory(), allUserHistory(), gameAdminCoinUpdate(), RandomResult()

## Knowledge Gaps
- **97 isolated node(s):** `disableHostCheck`, `historyApiFallback`, `name`, `private`, `build` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `730()` connect `730` to `main.05634587.js`, `Gr`, `n`, `i`, `H`, `forEach`, `re`, `hs`, `I`, `cu`, `Fo`, `el`, `qa`, `.add`, `z`, `ke`, `be`, `wi`, `nr`, `qt`, `u`?**
  _High betweenness centrality (0.315) - this node is a cross-community bridge._
- **Why does `Te` connect `Te` to `H`, `nr`, `main.05634587.js`, `n`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `oe` connect `Te` to `el`, `main.05634587.js`, `z`, `n`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `730()` (e.g. with `Ce()` and `Di()`) actually correct?**
  _`730()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `i()` (e.g. with `ft()` and `gs()`) actually correct?**
  _`i()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `n()` (e.g. with `O()` and `o()`) actually correct?**
  _`n()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `disableHostCheck`, `historyApiFallback`, `name` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._