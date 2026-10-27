# Graph Report - greedylion  (2026-09-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 777 nodes · 1903 edges · 54 communities (42 shown, 12 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 158 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- oe
- 730
- Te
- WheelContent.js
- wu
- main.c3c26395.js
- Gr
- forEach
- backend/package.json
- i
- o
- D
- H
- service.js
- ns
- el
- 234
- t
- dependencies
- hs
- _o
- n
- 202
- backend/index.js
- sl
- be
- frontend/package.json
- Ta
- Kt
- bootstrap
- J
- z
- development
- backend/public/manifest.json
- I
- we
- frontend/public/manifest.json
- on
- updateTime
- u
- devDependencies
- scripts
- ferryroundCounter.model.js
- ferryWheelGameHistory.model.js
- ferryWheelLastHistory.model.js
- gameAdminCoin.model.js
- user.model.js
- wallet.model.js
- axios
- react-toastify
- @testing-library/react
- @testing-library/user-event

## God Nodes (most connected - your core abstractions)
1. `730()` - 256 edges
2. `i()` - 57 edges
3. `n()` - 49 edges
4. `Te` - 43 edges
5. `el()` - 42 edges
6. `r()` - 42 edges
7. `_o()` - 34 edges
8. `t()` - 33 edges
9. `oe` - 29 edges
10. `o()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `updateTime()` --calls--> `allUserHistory()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `updateTime()` --calls--> `RandomResult()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `WheelContent()` --calls--> `ToastConent()`  [EXTRACTED]
  frontend/src/Wheel/WheelContent.js → frontend/src/ToastConent.js
- `updateTime()` --calls--> `addGameHistory()`  [EXTRACTED]
  backend/index.js → backend/service.js

## Import Cycles
- None detected.

## Communities (54 total, 12 thin omitted)

### Community 0 - "oe"
Cohesion: 0.07
Nodes (7): Ae(), ee(), oe, a(), o(), s(), re

### Community 1 - "730"
Cohesion: 0.06
Nodes (24): 730(), ac(), Ba(), Ca(), _e(), Fa(), gl(), Ha() (+16 more)

### Community 2 - "Te"
Cohesion: 0.08
Nodes (3): ae(), Ne(), Te

### Community 3 - "WheelContent.js"
Cohesion: 0.07
Nodes (21): App(), coinNumbe, queryParams, adminBaseURL, baseURL, key, RecordsDialog(), imageShowData (+13 more)

### Community 4 - "wu"
Cohesion: 0.12
Nodes (30): Au(), br(), cu(), dt(), du(), Fi(), fl(), ft() (+22 more)

### Community 5 - "main.c3c26395.js"
Cohesion: 0.09
Nodes (14): 391(), 43(), 579(), dr(), 853(), 950(), ar(), Br() (+6 more)

### Community 6 - "Gr"
Cohesion: 0.09
Nodes (24): ar(), bo(), Ce(), eo(), ge(), Gr(), Hn(), ir() (+16 more)

### Community 7 - "forEach"
Cohesion: 0.12
Nodes (14): kl(), Kr(), Ss(), cancelEmit(), doWrite(), en(), fo(), forEach() (+6 more)

### Community 8 - "backend/package.json"
Cohesion: 0.08
Nodes (24): author, dependencies, cors, express, http-errors, mongoose, nodemon, socket.io (+16 more)

### Community 9 - "i"
Cohesion: 0.14
Nodes (21): ao(), bi(), co(), Ea(), gi(), He(), Ho(), i() (+13 more)

### Community 10 - "o"
Cohesion: 0.15
Nodes (23): o(), gt(), Ni(), c(), d(), f(), g(), h() (+15 more)

### Community 11 - "D"
Cohesion: 0.15
Nodes (7): fe(), m(), D, doClose(), doOpen(), read(), x()

### Community 12 - "H"
Cohesion: 0.13
Nodes (11): ie(), K(), ne(), oe(), q(), v(), X(), er (+3 more)

### Community 13 - "service.js"
Cohesion: 0.10
Nodes (10): config, FerryWheelGameHistory, FerryWheelLastHistory, FerryWheelRoundCounter, GameAdminCoin, helper, io, mainBackendSocket (+2 more)

### Community 14 - "ns"
Cohesion: 0.17
Nodes (16): Eu(), hu(), is(), Ji(), ju(), lu(), ns(), qi() (+8 more)

### Community 15 - "el"
Cohesion: 0.21
Nodes (20): bu(), ci(), cl(), da(), dl(), Ei(), el(), fu() (+12 more)

### Community 16 - "234"
Cohesion: 0.21
Nodes (15): O(), R(), 234(), E(), j(), k(), L(), n() (+7 more)

### Community 17 - "t"
Cohesion: 0.29
Nodes (8): ja(), n(), Pa(), za(), emit(), g(), ln(), t()

### Community 18 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, jquery, react, react-dom, react-scripts, sass, socket.io, socket.io-client (+9 more)

### Community 19 - "hs"
Cohesion: 0.15
Nodes (23): _a(), As(), cr(), Di(), ds(), Fo(), Fs(), gs() (+15 more)

### Community 20 - "_o"
Cohesion: 0.19
Nodes (18): b(), $r(), Xr(), ao(), gr(), io(), Jr(), _o() (+10 more)

### Community 21 - "n"
Cohesion: 0.14
Nodes (19): 153(), u(), aa(), pr(), Cn(), r(), Cr(), n() (+11 more)

### Community 22 - "202"
Cohesion: 0.14
Nodes (6): 202(), A(), N(), li(), gn(), Pt()

### Community 23 - "backend/index.js"
Cohesion: 0.17
Nodes (10): config, cors, FerryWheelLastHistory, GameAdminCoin, { getDefaultSettings }, http, mongoose, {
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
} (+2 more)

### Community 24 - "sl"
Cohesion: 0.23
Nodes (10): al(), bl(), G(), Nl(), qt(), sl(), wl(), Y() (+2 more)

### Community 25 - "be"
Cohesion: 0.25
Nodes (5): be, ce(), de(), fe(), pe()

### Community 26 - "frontend/package.json"
Cohesion: 0.18
Nodes (10): devServer, disableHostCheck, historyApiFallback, eslintConfig, extends, name, private, version (+2 more)

### Community 27 - "Ta"
Cohesion: 0.22
Nodes (10): bs(), es(), js(), le(), oa(), ra(), se(), Ta() (+2 more)

### Community 28 - "Kt"
Cohesion: 0.22
Nodes (10): Ga(), Kt(), mt(), Ut(), zt(), Bt(), Dt(), Ft() (+2 more)

### Community 30 - "J"
Cohesion: 0.25
Nodes (5): A(), createSocket(), J, K(), request()

### Community 32 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 33 - "backend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 34 - "I"
Cohesion: 0.25
Nodes (7): cs(), J(), nn(), on(), t(), re(), I

### Community 35 - "we"
Cohesion: 0.32
Nodes (3): Se(), we, xe()

### Community 36 - "frontend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 37 - "on"
Cohesion: 0.29
Nodes (5): Te(), _e(), on(), Qn(), Wn()

### Community 38 - "updateTime"
Cohesion: 0.33
Nodes (6): refreshSettings(), updateTime(), addGameHistory(), allUserHistory(), gameAdminCoinUpdate(), RandomResult()

### Community 39 - "u"
Cohesion: 0.40
Nodes (6): Bt(), It(), Et(), St(), u(), xt()

### Community 40 - "devDependencies"
Cohesion: 0.40
Nodes (5): ajv, ajv-keywords, devDependencies, ajv, ajv-keywords

### Community 41 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, eject, start, test

## Knowledge Gaps
- **104 isolated node(s):** `config`, `FerryWheelGameHistory`, `FerryWheelLastHistory`, `FerryWheelRoundCounter`, `GameAdminCoin` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `730()` connect `730` to `oe`, `Te`, `wu`, `main.c3c26395.js`, `Gr`, `forEach`, `i`, `o`, `D`, `H`, `ns`, `el`, `234`, `t`, `hs`, `_o`, `n`, `202`, `sl`, `be`, `Ta`, `Kt`, `J`, `I`, `on`, `u`?**
  _High betweenness centrality (0.303) - this node is a cross-community bridge._
- **Why does `Te` connect `Te` to `oe`, `t`, `main.c3c26395.js`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `oe` connect `oe` to `D`, `main.c3c26395.js`, `el`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `730()` (e.g. with `Ce()` and `Ea()`) actually correct?**
  _`730()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `i()` (e.g. with `ft()` and `gs()`) actually correct?**
  _`i()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `n()` (e.g. with `O()` and `o()`) actually correct?**
  _`n()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `FerryWheelGameHistory`, `FerryWheelLastHistory` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._