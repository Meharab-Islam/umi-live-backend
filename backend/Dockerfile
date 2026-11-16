FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ curl

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose backend port
EXPOSE 5050

# Start server
# CLUSTER_MODE=true -> one worker per CPU core via PM2 (needs Redis + SOCKET_REDIS_ADAPTER).
# exec so SIGTERM reaches Node directly and graceful shutdown (drain + close) runs.
CMD ["sh", "-c", "if [ \"$CLUSTER_MODE\" = \"true\" ]; then exec npx pm2-runtime start ecosystem.config.cjs; else exec node src/server.js; fi"]
