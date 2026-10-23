import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
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
import { cache } from './config/redis.js';
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
import { getPublicBanners } from './controllers/bannerController.js';

const uploadsDir = path.join(__dirname, '../uploads');

const app = express();
const server = http.createServer(app);

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

setupLiveSocket(io);

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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

app.use('/uploads', express.static(uploadsDir));

// Make io accessible in request context if needed
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Root server landing endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: '🚀 Umi Live Backend Server is running smoothly!',
    service: `${PROJECT_NAME}-live-backend`,
    timestamp: new Date().toISOString(),
    health_check: '/api/health',
    endpoints: {
      health: '/api/health',
      config: '/api/config',
      mobile: '/api/mobile',
      packages: '/api/packages',
      auth: '/api/auth',
      docs: '/api/docs',
    },
  });
});

// Live Stream Share Landing Route (Web Preview & Deep Link Auto-Redirect)
app.get(['/room', '/room/:roomId'], (req, res) => {
  const roomId = req.params.roomId || req.query.id || req.query.roomId || '';
  const liveType = req.query.type || req.query.liveType || 'video';
  const hostName = req.query.hostName || req.query.name || 'Host';

  const deepLink = `umilive://room?roomId=${encodeURIComponent(roomId)}&liveType=${encodeURIComponent(liveType)}&hostName=${encodeURIComponent(hostName)}`;

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
app.use('/api/docs', docsRoutes);
app.get('/api/banners', getPublicBanners);

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

// Retry database connection until available
async function waitForDatabase(retries = 15, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    console.log(`[DB Check] Attempt ${i}/${retries} connecting to MySQL...`);
    const isReady = await initializeDatabase();
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
  });
}

startServer();
