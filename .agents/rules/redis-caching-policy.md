# Mandatory Production-Grade Redis Caching, Invalidation & .env Architecture Policy

## 1. Centralized .env Control & Project Portability
- ALL configuration (Docker container names, ports, MySQL credentials, Redis params, JWT tokens, Socket.IO settings) MUST be controlled via `.env`.
- `PROJECT_NAME` dynamically namespaces Docker containers (`${PROJECT_NAME}_backend`), networks, volumes, Redis keys (`${PROJECT_NAME}:`), and JWT issuers. Cloned copies of this project can run simultaneously with zero collisions by simply changing `PROJECT_NAME` and host port numbers in `.env`.

## 2. Production-Grade Zero-Downtime Redis Architecture
- **Fail-Safe Offline Degradation**: Redis MUST NEVER crash or delay the backend. With `enableOfflineQueue: false` and command timeout wrappers, any Redis blip immediately falls back to direct MySQL queries with 0 latency or memory leaks.
- **Key Namespacing**: All Redis keys use `formatKey(key)` with `${PROJECT_NAME}:` prefix.
- **Non-blocking Operations**: Pattern deletions use cursor-based `scan` (100 items per batch) to avoid blocking the single-threaded Redis event loop.
- **Memory & Persistence Guards**: Redis runs with `allkeys-lru` eviction and AOF/RDB persistence to prevent out-of-memory crashes.

## 3. Database-First Mutation + Instant Redis Invalidation
- **Database is Single Source of Truth (SSOT)**:
  - For ANY mutation (`POST`, `PUT`, `DELETE`, `PATCH`, coin gifting, wallet recharge, adjustments, merges, CRUD operations), ALWAYS execute and commit changes to the MySQL database FIRST.
  - NEVER update or rely on Redis before MySQL transaction succeeds. If MySQL fails, Redis must remain untouched.
- **Instant Redis Synchronization on Success**:
  - Immediately following successful MySQL write/commit, invalidate or update the corresponding Redis keys (`cache.del(key)`, `cache.delByPattern(pattern)`, or `cache.set(key, updatedData)`).
  - This guarantees zero stale reads: an immediate subsequent GET request gets the fresh state directly from Redis.

## 4. All Read (GET) Requests Handled by Redis
- Every `GET` endpoint across all entities (Users, Wallets, Hosts, Agencies, Resellers, Packages, Thumbnails, Banners, Entry Effects, Gifts, Moderators, Settings, etc.) MUST query Redis first using Cache-Aside:
  - **Hit**: Return cached data from RAM memory (0-1ms response, 0 DB queries).
  - **Miss**: Query MySQL database, populate Redis cache with TTL, and return.
- Always specify a reasonable TTL (e.g. 30s - 300s) for cache keys.

## 5. Mandatory Enforcement for All Future Features & Prompts
- Whenever adding ANY new feature, endpoint, or modifying existing features:
  1. Add Redis caching on GET requests using `cache.getOrSet(key, ttl, fn)` from `backend/src/config/redis.js`.
  2. Add Redis invalidation/update on POST/PUT/DELETE requests after MySQL query completes.
  3. Ensure all configs are read from `.env` with fallback defaults.
  4. Run `graphify update` after finishing modifications.
