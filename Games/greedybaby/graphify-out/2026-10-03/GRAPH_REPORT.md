# Graph Report - greedybaby  (2026-10-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 774 nodes · 1899 edges · 60 communities (43 shown, 17 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 160 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- 730
- z
- WheelContent.js
- i
- Te
- Gr
- backend/package.json
- H
- forEach
- service.js
- re
- main.05634587.js
- r
- hs
- cu
- oe
- Fo
- No
- o
- ._probe
- dependencies
- el
- .add
- t
- wu
- backend/index.js
- n
- zu
- p
- ee
- vn
- development
- backend/public/manifest.json
- I
- qt
- frontend/public/manifest.json
- u
- dr
- frontend/package.json
- updateTime
- Dt
- be
- scripts
- extends
- ferryroundCounter.model.js
- ferryWheelGameHistory.model.js
- ferryWheelLastHistory.model.js
- gameAdminCoin.model.js
- user.model.js
- wallet.model.js
- ie
- bootstrap
- jquery
- react-dom
- react-toastify
- @testing-library/jest-dom
- @testing-library/user-event

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

## Communities (60 total, 17 thin omitted)

### Community 0 - "730"
Cohesion: 0.04
Nodes (33): 730(), ac(), al(), bl(), bs(), Ca(), cr(), ee() (+25 more)

### Community 1 - "z"
Cohesion: 0.07
Nodes (14): fe(), Ho(), m(), createSocket(), D, doClose(), doOpen(), on() (+6 more)

### Community 2 - "WheelContent.js"
Cohesion: 0.08
Nodes (25): App(), coinNumbe, queryParams, adminBaseURL, baseURL, key, RecordsDialog(), RulesDialog() (+17 more)

### Community 3 - "i"
Cohesion: 0.13
Nodes (29): n(), ao(), br(), du(), _e(), Eu(), Fi(), fl() (+21 more)

### Community 5 - "Gr"
Cohesion: 0.08
Nodes (28): ar(), bo(), Ce(), eo(), Gr(), Hn(), ir(), Kn() (+20 more)

### Community 6 - "backend/package.json"
Cohesion: 0.08
Nodes (24): author, dependencies, cors, express, http-errors, mongoose, nodemon, socket.io (+16 more)

### Community 7 - "H"
Cohesion: 0.13
Nodes (11): ie(), J(), ne(), oe(), q(), v(), er, H (+3 more)

### Community 8 - "forEach"
Cohesion: 0.16
Nodes (12): es(), kl(), cancelEmit(), en(), forEach(), Gt(), kr(), rn() (+4 more)

### Community 9 - "service.js"
Cohesion: 0.10
Nodes (10): config, FerryWheelGameHistory, FerryWheelLastHistory, FerryWheelRoundCounter, GameAdminCoin, helper, io, mainBackendSocket (+2 more)

### Community 11 - "main.05634587.js"
Cohesion: 0.11
Nodes (5): ge(), ar(), he(), me(), Nn()

### Community 12 - "r"
Cohesion: 0.24
Nodes (18): O(), R(), 234(), k(), L(), o(), S(), w() (+10 more)

### Community 13 - "hs"
Cohesion: 0.18
Nodes (20): _a(), As(), Di(), ds(), Fs(), gs(), hs(), li() (+12 more)

### Community 14 - "cu"
Cohesion: 0.22
Nodes (20): cu(), gu(), hu(), is(), Jo(), ju(), lu(), ns() (+12 more)

### Community 16 - "Fo"
Cohesion: 0.13
Nodes (19): aa(), Ba(), Ea(), Fa(), Fo(), Ha(), ja(), js() (+11 more)

### Community 17 - "No"
Cohesion: 0.21
Nodes (14): N(), h(), p(), B(), F(), fo(), gr(), io() (+6 more)

### Community 18 - "o"
Cohesion: 0.19
Nodes (11): gt(), Ni(), c(), d(), f(), l(), u(), qu() (+3 more)

### Community 19 - "._probe"
Cohesion: 0.18
Nodes (8): Te(), _e(), a(), l(), o(), s(), off(), pull()

### Community 20 - "dependencies"
Cohesion: 0.13
Nodes (15): axios, dependencies, axios, react, react-scripts, sass, socket.io, socket.io-client (+7 more)

### Community 21 - "el"
Cohesion: 0.26
Nodes (15): ae(), bu(), ci(), cl(), da(), dl(), el(), ia() (+7 more)

### Community 22 - ".add"
Cohesion: 0.19
Nodes (8): jr(), Jt(), Kr(), $r(), u(), Xr(), we, yr()

### Community 23 - "t"
Cohesion: 0.18
Nodes (7): 202(), P(), n(), emit(), g(), ln(), t()

### Community 24 - "wu"
Cohesion: 0.27
Nodes (13): A(), pr(), Ss(), wu(), Cr(), s(), xr(), b() (+5 more)

### Community 25 - "backend/index.js"
Cohesion: 0.18
Nodes (9): config, cors, FerryWheelLastHistory, GameAdminCoin, http, mongoose, {
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
}, { Server } (+1 more)

### Community 26 - "n"
Cohesion: 0.18
Nodes (11): 153(), u(), 391(), 43(), 579(), 853(), 950(), ao() (+3 more)

### Community 27 - "zu"
Cohesion: 0.27
Nodes (11): bi(), co(), gi(), ki(), mi(), vi(), vo(), wi() (+3 more)

### Community 28 - "p"
Cohesion: 0.33
Nodes (6): b(), g(), m(), si(), doWrite(), p()

### Community 29 - "ee"
Cohesion: 0.22
Nodes (7): G(), X(), ce(), de(), ee(), fe(), pe()

### Community 30 - "vn"
Cohesion: 0.28
Nodes (5): gn(), jt(), T(), vn(), o()

### Community 31 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 32 - "backend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 33 - "I"
Cohesion: 0.25
Nodes (7): cs(), nn(), on(), t(), re(), Y(), I

### Community 34 - "qt"
Cohesion: 0.36
Nodes (8): qt(), t(), $t(), Ut(), Bt(), Ft(), it(), Nt()

### Community 35 - "frontend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 36 - "u"
Cohesion: 0.33
Nodes (7): Bt(), It(), zt(), Et(), St(), u(), xt()

### Community 37 - "dr"
Cohesion: 0.33
Nodes (7): dr(), Br(), Dr(), Fr(), Ir(), Mr(), zr()

### Community 39 - "frontend/package.json"
Cohesion: 0.29
Nodes (6): devServer, disableHostCheck, historyApiFallback, name, private, version

### Community 40 - "updateTime"
Cohesion: 0.33
Nodes (6): refreshSettings(), updateTime(), addGameHistory(), allUserHistory(), gameAdminCoinUpdate(), RandomResult()

### Community 41 - "Dt"
Cohesion: 0.50
Nodes (5): dt(), Ga(), mt(), Dt(), zt()

### Community 43 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, eject, start, test

### Community 44 - "extends"
Cohesion: 0.50
Nodes (4): eslintConfig, extends, react-app, react-app/jest

## Knowledge Gaps
- **102 isolated node(s):** `coinNumbe`, `queryParams`, `root`, `currentGame`, `handClasses` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `730()` connect `730` to `z`, `i`, `Gr`, `H`, `forEach`, `re`, `main.05634587.js`, `r`, `hs`, `cu`, `Fo`, `No`, `o`, `._probe`, `el`, `.add`, `t`, `wu`, `n`, `zu`, `p`, `ee`, `I`, `qt`, `u`, `dr`, `Dt`, `ie`?**
  _High betweenness centrality (0.313) - this node is a cross-community bridge._
- **Why does `Te` connect `Te` to `Gr`, `.onclose`, `H`, `main.05634587.js`, `oe`, `._probe`, `t`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `oe` connect `oe` to `._probe`, `main.05634587.js`, `el`, `.onclose`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `730()` (e.g. with `Ce()` and `Di()`) actually correct?**
  _`730()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `i()` (e.g. with `ft()` and `gs()`) actually correct?**
  _`i()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `n()` (e.g. with `O()` and `o()`) actually correct?**
  _`n()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `coinNumbe`, `queryParams`, `root` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._