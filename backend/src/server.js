import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root and local backend .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import { testConnection } from './config/db.js';
import { initializeDatabase } from './db/init.js';
import { cache, createRedisConnection } from './config/redis.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { limiters } from './services/rateLimiter.js';
import { idempotency } from './middlewares/idempotency.js';
import { metrics, httpMetricsMiddleware } from './services/metrics.js';
import { withStartupLock, NODE_ID } from './services/clusterGuard.js';
import { closePool } from './config/db.js';
import { setupLiveSocket } from './sockets/liveSocket.js';


import authRoutes from './routes/authRoutes.js';
import liveRoutes from './routes/liveRoutes.js';
import giftRoutes from './routes/giftRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import docsRoutes from './routes/docsRoutes.js';
import mobileRoutes from './routes/mobile/index.js';
import configRoutes from './routes/mobile/configRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import { getMaintenanceStatus } from './controllers/mobile/configController.js';
import { getPublicBanners } from './controllers/bannerController.js';
import { sqlInjectionGuard } from './middlewares/securityMiddleware.js';
import { createAgxWebhookHandler } from './controllers/agxWebhookController.js';


const uploadsDir = path.join(__dirname, '../uploads');
const publicDir = path.join(__dirname, '../public');

const app = express();
const server = http.createServer(app);

// Behind nginx / a cloud LB the real client IP is in X-Forwarded-For. Rate limits and logs key on
// req.ip, so Express must be told how many proxy hops to trust (never trust the whole header).
// Examples: TRUST_PROXY=1 (one LB hop) or TRUST_PROXY="loopback, 10.0.0.0/8".
const trustProxyEnv = process.env.TRUST_PROXY;
app.set('trust proxy', trustProxyEnv === undefined || trustProxyEnv === ''
  ? 'loopback, linklocal, uniquelocal'
  : (/^\d+$/.test(trustProxyEnv) ? parseInt(trustProxyEnv, 10) : trustProxyEnv));
app.disable('x-powered-by');

const PORT = parseInt(process.env.PORT || process.env.BACKEND_PORT || '5050', 10);
const CLIENT_URL = process.env.CLIENT_URL || '*';
const PROJECT_NAME = process.env.PROJECT_NAME || 'umi';

// Socket.io configuration completely controllable via .env
const SOCKET_CORS_ORIGIN = process.env.SOCKET_CORS_ORIGIN || CLIENT_URL || '*';
const SOCKET_PING_TIMEOUT = parseInt(process.env.SOCKET_PING_TIMEOUT || '30000', 10);
const SOCKET_PING_INTERVAL = parseInt(process.env.SOCKET_PING_INTERVAL || '25000', 10);
const SOCKET_MAX_BUFFER_SIZE = parseInt(process.env.SOCKET_MAX_BUFFER_SIZE || '10485760', 10);

const io = new Server(server, {
  cors: {
    origin: SOCKET_CORS_ORIGIN === '*' ? '*' : SOCKET_CORS_ORIGIN.split(',').map((s) => s.trim()),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: SOCKET_PING_TIMEOUT,
  pingInterval: SOCKET_PING_INTERVAL,
  maxHttpBufferSize: SOCKET_MAX_BUFFER_SIZE,
});

// ── Horizontal scaling: share rooms/broadcasts between every process & machine via Redis ──
// Required when running more than one process (PM2 cluster / several containers).
// Off by default so a single-process dev setup needs no extra Redis connections.
let adapterPub = null;
let adapterSub = null;
if (String(process.env.SOCKET_REDIS_ADAPTER || 'false').toLowerCase() === 'true') {
  adapterPub = createRedisConnection('socketio-pub');
  adapterSub = adapterPub.duplicate();
  adapterSub.on('error', () => {});
  io.adapter(createAdapter(adapterPub, adapterSub, {
    key: `${PROJECT_NAME}:socket.io`,
    requestsTimeout: parseInt(process.env.SOCKET_ADAPTER_REQUEST_TIMEOUT_MS || '3000', 10),
  }));
  console.log(`🔗 [Socket.IO] Redis adapter enabled (node ${NODE_ID})`);
}

setupLiveSocket(io);

let shuttingDown = false;

// Middlewares
app.use(cors());
app.use(compression({ threshold: 1024 }));
app.use(httpMetricsMiddleware);

// ── AGX games round-settlement webhook (server-to-server). Registered before the rate limiters and the
// JSON parser: the HMAC signature covers the exact raw body, and AGX sends one POST per round. ──
app.post('/api/webhooks/agx', express.raw({ type: '*/*', limit: '2mb' }), createAgxWebhookHandler(io));

// ── Rate limiting (Redis, cluster-wide; fail-open). Cheap checks first, before body parsing. ──
app.use('/api', limiters.globalIp);
app.use('/api', limiters.upload);
app.use(['/api/auth', '/api/mobile/auth', '/api/v1/auth'], limiters.auth);
app.use(['/api/mobile', '/api/v1'], limiters.mobileIdentity);
const MONEY_PATHS = [
  '/api/mobile/gifts', '/api/v1/gifts', '/api/gifts', '/api/mobile/wallet', '/api/v1/wallet', '/api/wallet',
  '/api/mobile/packages', '/api/v1/packages', '/api/mobile/vip', '/api/packages',
  // Only the launch moves money context; the games list is a plain read.
  '/api/mobile/games/launch', '/api/v1/games/launch',
];
app.use(MONEY_PATHS, limiters.money);
app.use(['/api/mobile/live', '/api/v1/live', '/api/live'], limiters.liveAction);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sqlInjectionGuard);
// Safe retries for money-moving POSTs when the client sends `Idempotency-Key` (needs body, so after json parsing).
app.use(MONEY_PATHS, idempotency);
app.use(morgan('dev'));

// Serve uploaded files statically with cross-category fallback
app.use('/uploads/:category/:filename', (req, res, next) => {
  const { category, filename } = req.params;
  const targetFile = path.join(uploadsDir, category, filename);
  if (fs.existsSync(targetFile)) {
    return res.sendFile(targetFile);
  }
  // Fallback to general folder if miscategorized
  const generalFile = path.join(uploadsDir, 'general', filename);
  if (fs.existsSync(generalFile)) {
    return res.sendFile(generalFile);
  }
  // Fallback to themes folder
  const themesFile = path.join(uploadsDir, 'themes', filename);
  if (fs.existsSync(themesFile)) {
    return res.sendFile(themesFile);
  }
  // Fallback to banners folder
  const bannersFile = path.join(uploadsDir, 'banners', filename);
  if (fs.existsSync(bannersFile)) {
    return res.sendFile(bannersFile);
  }
  next();
});

// Optimized aggressive caching options for static assets
const staticAssetOptions = {
  maxAge: '30d',
  immutable: true,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    }
  },
};

app.use('/uploads', express.static(uploadsDir, staticAssetOptions));

// Make io accessible in request context if needed
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Serve public assets (landing page styles, images, scripts)
app.use(express.static(publicDir, staticAssetOptions));

// Public Landing & Compliance Pages (Web Showcase, Privacy Policy, Account Deletion)
const landingRoutes = [
  '/',
  '/privacy',
  '/privacy-policy',
  '/delete-account',
  '/account-deletion',
  '/terms',
  '/terms-of-service',
];

landingRoutes.forEach((route) => {
  app.get(route, (req, res, next) => {
    // If request explicitly asks for JSON only (e.g. backend diagnostic monitor), return JSON
    if (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html')) {
      return res.json({
        status: 'online',
        message: '🚀 Umi Live Backend Server is running smoothly!',
        service: `${PROJECT_NAME}-live-backend`,
        timestamp: new Date().toISOString(),
        health_check: '/api/health',
        endpoints: {
          health: '/api/health',
          public: '/api/public',
          mobile: '/api/mobile',
          packages: '/api/packages',
          auth: '/api/auth',
          docs: '/api/docs',
        },
      });
    }

    const landingFile = path.join(publicDir, 'index.html');
    if (fs.existsSync(landingFile)) {
      return res.sendFile(landingFile);
    }
    next();
  });
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Live Stream Share Landing Route (Web Preview & Deep Link Auto-Redirect)
app.get(['/room', '/room/:roomId'], (req, res) => {
  const roomId = req.params.roomId || req.query.id || req.query.roomId || '';
  const liveType = req.query.type || req.query.liveType || 'video';
  const rawHostName = req.query.hostName || req.query.name || 'Host';
  const hostName = escapeHtml(rawHostName);

  const deepLink = `umilive://room?roomId=${encodeURIComponent(roomId)}&liveType=${encodeURIComponent(liveType)}&hostName=${encodeURIComponent(rawHostName)}`;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${hostName} is Live on Umi Live!</title>
  
  <!-- WhatsApp, Facebook, Telegram Social Media Card Preview -->
  <meta property="og:title" content="🔥 Watch ${hostName}'s Live on Umi Live!" />
  <meta property="og:description" content="Join the live room right now on Umi Live app." />
  <meta property="og:type" content="video.other" />
  <meta name="theme-color" content="#1E88E5" />

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0F172A;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .card {
      background: #1E293B;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 36px 24px;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: #EF4444;
      color: white;
      font-weight: 800;
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 12px;
      margin-bottom: 16px;
      letter-spacing: 1px;
    }
    .btn {
      display: inline-block;
      background: #1E88E5;
      color: white;
      font-weight: 800;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 24px;
      margin-top: 24px;
      font-size: 15px;
      box-shadow: 0 4px 16px rgba(30, 136, 229, 0.45);
      transition: transform 0.15s ease, background 0.15s ease;
    }
    .btn:hover {
      background: #1976D2;
      transform: scale(1.02);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🔴 LIVE NOW</div>
    <h2 style="margin: 0 0 8px 0;">${hostName}'s Room</h2>
    <p style="color: #94A3B8; margin: 0; font-size: 14px;">Connecting to Umi Live App...</p>
    <a href="${deepLink}" class="btn">Open in Umi Live 🚀</a>
  </div>

  <script>
    // Automatically trigger app launch
    window.location.href = "${deepLink}";
  </script>
</body>
</html>`);
});

// Liveness/readiness for load balancers & orchestrators. Readiness fails while draining so no new
// traffic is routed to a process that is shutting down. Redis is deliberately NOT required (fail-open).
let readyCache = { t: 0, ok: false };
app.get(['/api/ready', '/ready'], async (req, res) => {
  if (shuttingDown) return res.status(503).json({ ready: false, reason: 'shutting_down' });
  // Cache the DB probe for 2s so aggressive LB health checks cannot eat pool connections.
  if (Date.now() - readyCache.t > 2000) {
    readyCache = { t: Date.now(), ok: await testConnection().catch(() => false) };
  }
  return res.status(readyCache.ok ? 200 : 503).json({ ready: readyCache.ok, node: NODE_ID });
});

// Prometheus scrape endpoint. Set METRICS_TOKEN to require "Authorization: Bearer <token>";
// without it, only private/loopback peers (the real TCP peer, never X-Forwarded-For) may scrape.
const PRIVATE_PEER = /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|fc|fd)/i;
app.get('/metrics', async (req, res) => {
  const token = process.env.METRICS_TOKEN;
  if (token) {
    if (req.headers.authorization !== `Bearer ${token}`) return res.status(401).end();
  } else if (!PRIVATE_PEER.test(req.socket.remoteAddress || '')) {
    return res.status(403).end();
  }
  res.set('Content-Type', metrics.register.contentType);
  return res.end(await metrics.register.metrics());
});

// Health check endpoint (including DB & Redis live diagnostics)
app.get('/api/health', async (req, res) => {
  const dbOk = await testConnection();
  const redisHealth = await cache.healthCheck();

  res.json({
    status: dbOk ? 'ok' : 'degraded',
    project: PROJECT_NAME,
    service: `${PROJECT_NAME}-live-backend`,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: {
      connected: dbOk,
      type: 'mysql',
    },
    redis: redisHealth,
  });
});

// Global Client & Mobile Configuration Bootstrap Endpoint
app.use('/api/config', configRoutes);

// Mobile Application Dedicated Routes (/api/mobile/* and /api/v1/*)
app.use('/api/mobile', mobileRoutes);
app.use('/api/v1', mobileRoutes);

// Legacy/Common API Routes
app.use('/api/auth', authRoutes);

app.use('/api/live', liveRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/docs', docsRoutes);
app.get('/api/banners', getPublicBanners);
app.get(['/api/maintenance', '/api/v1/maintenance'], getMaintenanceStatus);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Retry database connection until available.
// Schema/seed work runs on ONE process (Redis startup lock); the others wait for it instead of racing.
async function waitForDatabase(retries = 15, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    console.log(`[DB Check] Attempt ${i}/${retries} connecting to MySQL...`);
    const isReady = await withStartupLock('db_init', () => initializeDatabase());
    if (isReady) {
      console.log('✅ [Database Ready] Tables and initial seeds verified.');
      return true;
    }
    console.log(`⏳ Database not ready yet. Retrying in ${delayMs / 1000}s...`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  console.warn('⚠️ Warning: Database connection timed out. Starting server anyway...');
  return false;
}

async function startServer() {
  await waitForDatabase();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🚀 ${PROJECT_NAME.toUpperCase()} LIVE BACKEND RUNNING ON PORT ${PORT}`);
    console.log(`📡 WebSocket Engine ready with Socket.IO`);
    console.log(`🛡️ Admin API: http://localhost:${PORT}/api/admin`);
    console.log(`===============================================`);
    // PM2 `wait_ready`: tell the process manager this worker is accepting connections.
    if (typeof process.send === 'function') process.send('ready');
  });
}

// ── Gauges + graceful shutdown ──────────────────────────────────────────────
const gaugeTimer = setInterval(() => {
  try {
    metrics.socketConnections.set(io.engine?.clientsCount || 0);
    metrics.socketRooms.set(io.of('/').adapter?.rooms?.size || 0);
  } catch (_) { /* ignore */ }
}, 5000);
if (gaugeTimer.unref) gaugeTimer.unref();

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  const drainMs = parseInt(process.env.SHUTDOWN_DRAIN_MS || '5000', 10);
  const forceMs = parseInt(process.env.SHUTDOWN_FORCE_MS || '20000', 10);
  console.log(`🛑 [${signal}] Draining: readiness=503, waiting ${drainMs}ms for the load balancer to stop routing...`);
  const force = setTimeout(() => {
    console.error('⏱️ Graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, forceMs);
  if (force.unref) force.unref();

  await new Promise((r) => setTimeout(r, drainMs));
  try {
    // Tell clients to reconnect (to another process); their backoff + jitter spreads the herd.
    io.emit('server_restarting', { reconnect_in_ms: 1000 + Math.floor(Math.random() * 4000) });
    await new Promise((resolve) => io.close(() => resolve()));
  } catch (_) { /* ignore */ }
  try { server.close(); } catch (_) { /* ignore */ }
  for (const c of [adapterPub, adapterSub]) {
    try { c && c.disconnect(); } catch (_) { /* ignore */ }
  }
  try { await closePool(); } catch (_) { /* ignore */ }
  console.log('✅ Shutdown complete.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// A stray rejected promise must not take a process holding thousands of sockets down.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason instanceof Error ? reason.stack || reason.message : reason);
});

startServer();
