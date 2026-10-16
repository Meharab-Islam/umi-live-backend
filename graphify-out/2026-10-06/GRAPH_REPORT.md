# Graph Report - umi_backend  (2026-10-06)

## Corpus Check
- 57 files · ~56,809 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 266 nodes · 609 edges · 10 communities
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- query
- server.js
- admin-panel/package.json
- dependencies
- 📡 API Endpoints Summary
- .oxlintrc.json
- React + Vite
- index.js
- App.jsx

## God Nodes (most connected - your core abstractions)
1. `query()` - 56 edges
2. `react` - 20 edges
3. `getPool()` - 20 edges
4. `Loader()` - 14 edges
5. `request()` - 12 edges
6. `userApi` - 9 edges
7. `App()` - 8 edges
8. `Pagination()` - 8 edges
9. `UserDetailsModal()` - 8 edges
10. `requireAuth()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `getCurrentUser()`  [EXTRACTED]
  admin-panel/src/App.jsx → admin-panel/src/api/client.js
- `App()` --calls--> `getToken()`  [EXTRACTED]
  admin-panel/src/App.jsx → admin-panel/src/api/client.js
- `App()` --calls--> `setCurrentUser()`  [EXTRACTED]
  admin-panel/src/App.jsx → admin-panel/src/api/client.js
- `App()` --calls--> `setToken()`  [EXTRACTED]
  admin-panel/src/App.jsx → admin-panel/src/api/client.js
- `sendGift()` --calls--> `getPool()`  [EXTRACTED]
  backend/src/controllers/giftController.js → backend/src/config/db.js

## Import Cycles
- None detected.

## Communities (10 total, 0 thin omitted)

### Community 1 - "query"
Cohesion: 0.12
Nodes (47): getPool(), query(), addModerator(), adjustBalance(), assignReseller(), assignUserToAgency(), clearResellerSales(), createAgency() (+39 more)

### Community 2 - "server.js"
Cohesion: 0.08
Nodes (33): dbConfig, testConnection(), signToken(), verifyToken(), getMe(), login(), register(), getGifts() (+25 more)

### Community 3 - "admin-panel/package.json"
Cohesion: 0.07
Nodes (29): dependencies, lucide-react, react, react-dom, socket.io-client, devDependencies, oxlint, @types/react (+21 more)

### Community 4 - "dependencies"
Cohesion: 0.06
Nodes (31): dependencies, bcryptjs, cors, dotenv, express, jsonwebtoken, morgan, mysql2 (+23 more)

### Community 7 - "📡 API Endpoints Summary"
Cohesion: 0.12
Nodes (15): 1. Start MySQL, 2. Start Backend, 3. Start React Admin Panel, Admin Console (`/api/admin`) *(Protected: Requires admin role)*, 📡 API Endpoints Summary, 🏗️ Architecture Overview, Authentication (`/api/auth`), 🔑 Default Admin & Seed Credentials (+7 more)

### Community 8 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 9 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

### Community 14 - "index.js"
Cohesion: 0.15
Nodes (18): agencyApi, authApi, API_BASE, getCurrentUser(), getToken(), request(), setCurrentUser(), setToken() (+10 more)

### Community 16 - "App.jsx"
Cohesion: 0.13
Nodes (27): checkHealth(), userApi, App(), getInitialTab(), VALID_TABS, Header(), Loader(), Pagination() (+19 more)

## Knowledge Gaps
- **63 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+58 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `server.js`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `react` connect `App.jsx` to `.oxlintrc.json`, `index.js`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `plugins` connect `.oxlintrc.json` to `App.jsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _63 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `query` be split into smaller, more focused modules?**
  _Cohesion score 0.11819727891156463 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08325624421831637 - nodes in this community are weakly interconnected._
- **Should `admin-panel/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._