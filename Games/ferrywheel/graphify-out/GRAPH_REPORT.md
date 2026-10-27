# Graph Report - ferrywheel  (2026-10-03)

## Corpus Check
- 32 files · ~220,631 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 680 nodes · 1678 edges · 46 communities (33 shown, 13 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 155 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- n
- Ke
- re
- fu
- main.7955cbf4.js
- WheelContent.js
- zt
- fo
- backend/package.json
- service.js
- nl
- xs
- us
- dependencies
- backend/index.js
- Al
- tl
- i
- wi
- development
- backend/public/manifest.json
- frontend/public/manifest.json
- Learn More
- frontend/package.json
- updateTime
- scripts
- extends
- ferryroundCounter.model.js
- ferryWheelGameHistory.model.js
- ferryWheelLastHistory.model.js
- gameAdminCoin.model.js
- user.model.js
- wallet.model.js
- ks
- bootstrap
- Kn
- He
- react
- react-scripts
- react-toastify
- @testing-library/jest-dom
- socket.io-client
- web-vitals

## God Nodes (most connected - your core abstractions)
1. `i()` - 55 edges
2. `n()` - 44 edges
3. `Ke()` - 43 edges
4. `r()` - 42 edges
5. `t()` - 42 edges
6. `nl()` - 37 edges
7. `o()` - 31 edges
8. `ae()` - 28 edges
9. `oa()` - 26 edges
10. `fo()` - 26 edges

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

## Communities (46 total, 13 thin omitted)

### Community 0 - "n"
Cohesion: 0.07
Nodes (67): A(), b(), bn(), o(), r(), br(), c(), d() (+59 more)

### Community 1 - "Ke"
Cohesion: 0.05
Nodes (4): ae(), Ke(), o(), Z()

### Community 2 - "re"
Cohesion: 0.07
Nodes (18): addEventListeners(), check(), doClose(), doOpen(), doPoll(), doWrite(), ee(), l() (+10 more)

### Community 3 - "fu"
Cohesion: 0.18
Nodes (20): bu(), cs(), cu(), Di(), du(), fu(), gu(), Iu() (+12 more)

### Community 4 - "main.7955cbf4.js"
Cohesion: 0.05
Nodes (37): ar(), as(), D(), da(), dt(), ec(), Ga(), Gn() (+29 more)

### Community 5 - "WheelContent.js"
Cohesion: 0.07
Nodes (28): App(), coinNumbe, queryParams, adminBaseURL, baseURL, key, formatDate(), RecordsDialog() (+20 more)

### Community 6 - "zt"
Cohesion: 0.11
Nodes (7): dn(), ht(), Rt(), ue(), ye, Zn(), zt()

### Community 7 - "fo"
Cohesion: 0.07
Nodes (37): ao(), be(), en(), Er(), fo(), io(), j(), Jr() (+29 more)

### Community 8 - "backend/package.json"
Cohesion: 0.08
Nodes (24): author, dependencies, cors, express, http-errors, mongoose, nodemon, socket.io (+16 more)

### Community 9 - "service.js"
Cohesion: 0.12
Nodes (12): config, createHistoryWinnerNumber(), FerryWheelGameHistory, FerryWheelLastHistory, FerryWheelRoundCounter, GameAdminCoin, helper, historyRecord() (+4 more)

### Community 10 - "nl"
Cohesion: 0.18
Nodes (20): ba(), ci(), Cl(), Eu(), fl(), ha(), hl(), Ho() (+12 more)

### Community 11 - "xs"
Cohesion: 0.50
Nodes (4): Gs(), Oi(), xs(), ya()

### Community 12 - "us"
Cohesion: 0.16
Nodes (16): Ai(), bs(), ds(), ea(), fa(), hs(), i(), Ii() (+8 more)

### Community 13 - "dependencies"
Cohesion: 0.13
Nodes (15): axios, dependencies, axios, jquery, react-dom, sass, socket.io, @testing-library/react (+7 more)

### Community 14 - "backend/index.js"
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

### Community 15 - "Al"
Cohesion: 0.21
Nodes (12): Al(), dl(), el(), ge(), ie(), ll(), me(), Sl() (+4 more)

### Community 16 - "tl"
Cohesion: 0.24
Nodes (7): fe(), gl(), ml(), tl(), vl(), we, yl()

### Community 17 - "i"
Cohesion: 0.26
Nodes (16): Au(), ft(), i(), hu(), ju(), ku(), o(), Pi() (+8 more)

### Community 18 - "wi"
Cohesion: 0.33
Nodes (9): bi(), co(), Ei(), gi(), mi(), vi(), vo(), wi() (+1 more)

### Community 19 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 20 - "backend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 21 - "frontend/public/manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 22 - "Learn More"
Cohesion: 0.14
Nodes (13): Advanced Configuration, Analyzing the Bundle Size, Available Scripts, Code Splitting, Deployment, Getting Started with Create React App, Learn More, Making a Progressive Web App (+5 more)

### Community 23 - "frontend/package.json"
Cohesion: 0.29
Nodes (6): devServer, disableHostCheck, historyApiFallback, name, private, version

### Community 24 - "updateTime"
Cohesion: 0.33
Nodes (6): refreshSettings(), updateTime(), addGameHistory(), allUserHistory(), gameAdminCoinUpdate(), RandomResult()

### Community 25 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, eject, start, test

### Community 26 - "extends"
Cohesion: 0.50
Nodes (4): eslintConfig, extends, react-app, react-app/jest

### Community 33 - "ks"
Cohesion: 0.29
Nodes (8): fs(), Hi(), ki(), ks(), ss(), ts(), ws(), Ys()

### Community 36 - "Kn"
Cohesion: 0.24
Nodes (10): Ce(), de(), eo(), je(), Kn(), nr(), rr(), Te() (+2 more)

### Community 37 - "He"
Cohesion: 0.40
Nodes (6): bo(), gt(), He(), Qe(), Ro(), zu()

## Knowledge Gaps
- **115 isolated node(s):** `mongoose`, `FerryWheelLastHistory`, `GameAdminCoin`, `config`, `http` (+110 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ke()` connect `Ke` to `n`, `re`, `main.7955cbf4.js`, `He`, `i`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `ae()` connect `Ke` to `i`, `nl`, `main.7955cbf4.js`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `i()` connect `i` to `n`, `Ke`, `re`, `fu`, `main.7955cbf4.js`, `He`, `fo`, `nl`, `us`, `Al`, `tl`, `wi`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `i()` (e.g. with `main.7955cbf4.js` and `A()`) actually correct?**
  _`i()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 26 inferred relationships involving `n()` (e.g. with `A()` and `as()`) actually correct?**
  _`n()` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 18 inferred relationships involving `r()` (e.g. with `b()` and `br()`) actually correct?**
  _`r()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `t()` (e.g. with `br()` and `doOpen()`) actually correct?**
  _`t()` has 21 INFERRED edges - model-reasoned connections that need verification._