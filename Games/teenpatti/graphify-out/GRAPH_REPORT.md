# Graph Report - teenpatti  (2026-09-30)

## Corpus Check
- 35 files · ~860,029 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 523 nodes · 1602 edges · 43 communities (30 shown, 13 thin omitted)
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 320 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- bl
- r
- pl
- t
- backend/package.json
- app.js
- main.21695ab2.js
- H
- service.js
- backend/index.js
- dependencies
- gameHistory.controller.js
- a
- nr
- ks
- hr
- development
- gameHistory.route.js
- frontend/package.json
- wo
- wu
- pc
- scripts
- cardSchema.js
- winnerBitSchema.js
- userSchema.js
- wallet.js
- cs
- @mui/icons-material
- @emotion/styled
- @mui/styled-engine
- react-dom
- socket.io-client
- react-toastify
- @testing-library/jest-dom
- @testing-library/user-event
- web-vitals
- frontend/README.md
- README.md

## God Nodes (most connected - your core abstractions)
1. `t()` - 74 edges
2. `a()` - 71 edges
3. `n()` - 69 edges
4. `r()` - 47 edges
5. `o()` - 46 edges
6. `bl()` - 40 edges
7. `wu()` - 31 edges
8. `pl()` - 30 edges
9. `i()` - 30 edges
10. `ps()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `updateTime()` --calls--> `cardUpdateSplice()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `updateTime()` --calls--> `win()`  [EXTRACTED]
  backend/index.js → backend/service.js
- `updateTime()` --calls--> `allUserHistory()`  [EXTRACTED]
  backend/index.js → backend/service.js

## Import Cycles
- None detected.

## Communities (43 total, 13 thin omitted)

### Community 0 - "bl"
Cohesion: 0.12
Nodes (36): Ao(), bl(), bo(), Do(), fe(), fu(), G(), gl() (+28 more)

### Community 1 - "r"
Cohesion: 0.11
Nodes (58): b(), be(), C(), co(), cr(), D(), de(), dr() (+50 more)

### Community 2 - "pl"
Cohesion: 0.19
Nodes (25): a(), Ba(), ca(), da(), ea(), ei(), Fa(), ga() (+17 more)

### Community 3 - "t"
Cohesion: 0.09
Nodes (54): aa(), Ac(), Al(), as(), bi(), Ci(), Cl(), cu() (+46 more)

### Community 4 - "backend/package.json"
Cohesion: 0.07
Nodes (27): author, dependencies, cors, express, http, mongodb, mongoose, nodemon (+19 more)

### Community 5 - "app.js"
Cohesion: 0.11
Nodes (16): Card(), Coin(), convertToShortForm(), CoinBtn(), convertToShortForm(), Frame(), GameBlock(), Profile() (+8 more)

### Community 6 - "main.21695ab2.js"
Cohesion: 0.07
Nodes (18): bc(), Ff(), fs(), ft(), Go(), hc(), Ho(), is() (+10 more)

### Community 7 - "H"
Cohesion: 0.25
Nodes (9): ee(), H(), J(), N(), ne(), oe(), Pe(), y() (+1 more)

### Community 8 - "service.js"
Cohesion: 0.11
Nodes (17): { adminBaseURL }, Card, cardMake(), cardUpdateSplice(), createWinnerBit(), gameAdminCoinUpdate(), GameHistory, { highCoinValue, HighCardCombination, PairCombination, ColorCombination, SequenceCombination, PureCombination, TrioCombinations } (+9 more)

### Community 9 - "backend/index.js"
Cohesion: 0.09
Nodes (20): activeUsers, app, { cardUpdateSplice, win, allUserHistory, gameAdminCoin }, config, cors, currentGame, express, getTop5Users() (+12 more)

### Community 10 - "dependencies"
Cohesion: 0.13
Nodes (15): axios, @emotion/react, dependencies, axios, @emotion/react, @mui/material, react, react-router-dom (+7 more)

### Community 11 - "gameHistory.controller.js"
Cohesion: 0.15
Nodes (8): GameAdminCoinSchema, GameHistorySchema, GameAdminCoin, GameAdminCoinSchema, mongoose, GameHistory, GameHistorySchema, mongoose

### Community 12 - "a"
Cohesion: 0.10
Nodes (37): au(), bu(), dt(), du(), Fl(), gu(), He(), hl() (+29 more)

### Community 13 - "nr"
Cohesion: 0.20
Nodes (11): ar(), Gn(), ir(), ke(), nr(), or(), rr(), Te() (+3 more)

### Community 14 - "ks"
Cohesion: 0.15
Nodes (17): ai(), bs(), cc(), dc(), es(), gs(), Kl(), ks() (+9 more)

### Community 15 - "hr"
Cohesion: 0.24
Nodes (10): en(), Fn(), fr(), gr(), Hn(), hr(), pr(), tn() (+2 more)

### Community 16 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 17 - "gameHistory.route.js"
Cohesion: 0.25
Nodes (6): express, gameHistoryController, router, express, gameHistoryRoute, router

### Community 18 - "frontend/package.json"
Cohesion: 0.25
Nodes (7): eslintConfig, extends, name, private, version, react-app, react-app/jest

### Community 19 - "wo"
Cohesion: 0.25
Nodes (8): ae(), Bt(), Ce(), Kt(), Qt(), vt(), wo(), xo()

### Community 20 - "wu"
Cohesion: 0.25
Nodes (8): Ef(), Kc(), rf(), sf(), Vo(), wu(), Xf(), yf()

### Community 21 - "pc"
Cohesion: 0.83
Nodes (4): gc(), mc(), pc(), wc()

### Community 22 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, eject, start, test

### Community 23 - "cardSchema.js"
Cohesion: 0.50
Nodes (3): Card, CardSchema, mongoose

### Community 24 - "winnerBitSchema.js"
Cohesion: 0.50
Nodes (3): mongoose, WinnerBit, WinnerBitSchema

### Community 27 - "cs"
Cohesion: 0.67
Nodes (3): cs(), Jl(), us()

## Knowledge Gaps
- **97 isolated node(s):** `GameHistorySchema`, `GameAdminCoinSchema`, `path`, `express`, `app` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ka()` connect `r` to `bl`, `t`, `main.21695ab2.js`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `bl`, `r`, `pl`, `main.21695ab2.js`, `H`, `a`, `ks`, `hr`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `react-dom`, `socket.io-client`, `react-toastify`, `@testing-library/jest-dom`, `@testing-library/user-event`, `web-vitals`, `frontend/package.json`, `@mui/icons-material`, `@emotion/styled`, `@mui/styled-engine`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 48 inferred relationships involving `t()` (e.g. with `as()` and `b()`) actually correct?**
  _`t()` has 48 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `a()` (e.g. with `Cl()` and `dt()`) actually correct?**
  _`a()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 51 inferred relationships involving `n()` (e.g. with `as()` and `au()`) actually correct?**
  _`n()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **Are the 29 inferred relationships involving `r()` (e.g. with `b()` and `bl()`) actually correct?**
  _`r()` has 29 INFERRED edges - model-reasoned connections that need verification._