# ════════════════════════════════════════════
#  Big Eater — Dockerfile
#  Multi-stage: builds native better-sqlite3
#  then creates lean production image
# ════════════════════════════════════════════

# ── Stage 1: Builder ──────────────────────
FROM node:22-slim AS builder

# Build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:css
RUN npm prune --omit=dev

# ── Stage 2: Production ───────────────────
FROM node:22-slim AS production

WORKDIR /app

# Copy built node_modules (with compiled native modules)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js    ./server.js
COPY --from=builder /app/db          ./db
COPY --from=builder /app/public      ./public
COPY --from=builder /app/package.json ./package.json

# Data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/game.db

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "server.js"]
