# Workspace AI Agent Rules

# 1. Centralized .env Configuration & Project Portability Policy
- **100% Configurable via `.env`**:
  - ALL system variables (Docker container names, host ports, networks, volumes, MySQL database credentials, Redis settings, JWT secrets & issuer, Socket.IO origins & timeouts, and Frontend URLs) MUST be read dynamically from `.env`.
  - NEVER hardcode project names, ports, secrets, or database credentials anywhere in backend or configuration files. Always supply sensible defaults via `process.env.VARIABLE || default`.
- **Seamless Project Cloning & Isolation (`PROJECT_NAME`)**:
  - The `PROJECT_NAME` variable (default: `umi`) isolates the entire stack:
    - Docker container names: `${PROJECT_NAME}_mysql`, `${PROJECT_NAME}_backend`, `${PROJECT_NAME}_redis`, `${PROJECT_NAME}_admin_panel`
    - Docker volumes: `${PROJECT_NAME}_mysql_data`, `${PROJECT_NAME}_redis_data`
    - Docker network: `${PROJECT_NAME}_network`
    - Redis key prefix: `${PROJECT_NAME}:`
    - JWT issuer: `${PROJECT_NAME}`
  - A developer can clone this repository, change `PROJECT_NAME` and port numbers in `.env`, and launch a completely isolated, collision-free application immediately (`docker compose up -d`).

---

# 2. Production-Grade Zero-Downtime Redis Architecture
- **Fail-Safe Offline Degradation**:
  - Redis MUST NEVER crash or delay the backend.
  - `enableOfflineQueue: false` ensures that if Redis goes down, commands fail fast (<0.1ms) instead of accumulating in RAM and freezing the application.
  - All cache reads and writes MUST be non-blocking. If Redis is disconnected, slow, or times out, the backend MUST automatically and seamlessly execute direct MySQL queries without returning errors to the user.
- **Key Namespacing & Safe Deletions**:
  - All keys MUST use the project prefix (via `formatKey(key)` in `backend/src/config/redis.js`) so multiple projects sharing Redis never overwrite each other's keys.
  - Pattern deletions MUST use non-blocking `scan` with cursor iteration (100 keys per chunk) rather than blocking `KEYS *`.
- **Memory & Persistence Guards**:
  - Redis container MUST run with LRU memory eviction (`--maxmemory-policy allkeys-lru`) and persistence (`--appendonly yes`, `--save 60 1`).

---

# 3. Mandatory Database-First Mutation + Instant Redis Invalidation
- **Database is Single Source of Truth (SSOT)**:
  - For ANY mutation (`POST`, `PUT`, `DELETE`, `PATCH`, coin gifting, wallet recharge, adjustments, merges, CRUD operations), ALWAYS execute and commit changes to the MySQL database FIRST.
  - NEVER update or rely on Redis before the MySQL transaction succeeds. If MySQL fails, Redis must remain untouched.
- **Instant Redis Synchronization on Success**:
  - Immediately following successful MySQL write/commit, invalidate or update the corresponding Redis keys (`cache.del(key)`, `cache.delByPattern(pattern)`, or `cache.set(key, updatedData)`).
  - This guarantees zero stale reads: an immediate subsequent GET request gets the fresh state directly from Redis.
- **All Read (GET) Requests Handled by Redis**:
  - Every `GET` endpoint across all entities (Users, Wallets, Hosts, Agencies, Resellers, Packages, Thumbnails, Banners, Entry Effects, Gifts, Moderators, Settings, etc.) MUST query Redis first using Cache-Aside (`cache.getOrSet(key, ttl, fetchFn)`).
  - Specify appropriate TTLs (e.g. 30s - 300s).

---

# 4. Mandatory Enforcement for All Future Features & Prompts
- Whenever adding ANY new feature, endpoint, or modifying existing features:
  1. Add Redis caching on GET requests using `cache.getOrSet(key, ttl, fn)`.
  2. Add Redis invalidation/update on POST/PUT/DELETE requests after MySQL query completes.
  3. Ensure all environment parameters are read from `.env` and documented in `.env.example`.
  4. Always run `graphify update` after codebase changes.

---

# 5. Mandatory Mobile API Documentation & Interactive API Explorer (Swagger-like) Policy
- **Universal Documentation for Every Endpoint**:
  - Whenever building or updating ANY API endpoint for the mobile app or backend:
    1. Register the endpoint in the Admin Panel's Interactive API Explorer (`ApiDocs.jsx`).
    2. Provide full schema & examples:
       - **Method & Path**: `POST`, `GET`, `PUT`, `PATCH`, `DELETE` with full route (e.g., `/api/auth/register`).
       - **Authentication**: Explicitly state if endpoint is `Public` or requires `Bearer <token>`.
       - **Request Payload / Params**: Detailed JSON schema with type, required/optional indicators, and real copyable example payload.
       - **Response Schema & Status Codes**: 200, 201, 400, 401, 403, 409, 500 with exact response JSON structures.
       - **Code Snippets**: Ready-to-copy cURL and Flutter/Dart `http` snippets for mobile engineers.
    3. Ensure the built-in **Interactive "Try It Out" Tester** allows testing the endpoint live with custom headers, query params, and body directly from the Admin Panel.

---

# 6. Mandatory Mobile API Directory Structure & Isolation Policy
- **Strict Dedicated Directory Architecture**:
  - ALL Mobile App APIs, logic, controllers, and route definitions MUST be isolated in dedicated folders:
    - Controllers: `backend/src/controllers/mobile/` (e.g. `authController.js`, `liveController.js`, `walletController.js`, `giftController.js`, `packageController.js`, etc.)
    - Routes: `backend/src/routes/mobile/` (e.g. `authRoutes.js`, `liveRoutes.js`, `walletRoutes.js`, `giftRoutes.js`, `packageRoutes.js`, etc.)
    - Root Aggregator: `backend/src/routes/mobile/index.js` which exports a single aggregated router mounted at `/api/mobile` (and `/api/v1` for standard mobile client versioning).
- **Prohibition of Direct Mobile Logic in Root Controllers**:
  - NEVER write mobile-specific controller endpoints directly inside `backend/src/controllers/` or routes directly inside `backend/src/routes/`.
  - Root folders remain reserved for Web / Admin Panel / Back-office services. Mobile-specific enhancements, mobile responses, and device-optimized schemas belong exclusively in `backend/src/controllers/mobile/` and `backend/src/routes/mobile/`.

