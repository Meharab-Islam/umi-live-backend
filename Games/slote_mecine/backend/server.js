const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root and local .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.GAME_SLOTE_MECINE_PORT || process.env.PORT || '5062', 10);
const BACKEND_URL = process.env.GAME_ADMIN_BASE_URL || process.env.BACKEND_URL || `http://localhost:${process.env.BACKEND_PORT || 5050}`;

// Connect to Main Backend Socket.IO Server
let mainBackendSocket = null;
try {
  const ioClient = require('socket.io-client');
  mainBackendSocket = ioClient(BACKEND_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });
  mainBackendSocket.on('connect', () => {
    console.log(`🔌 [Slot Machine] Connected to Main Backend Socket.IO at ${BACKEND_URL}`);
    mainBackendSocket.emit('game:register', {
      gameId: 'slote_mecine',
      name: 'Fruit Slot Machine',
      port: PORT,
      timestamp: Date.now(),
    });
  });
  mainBackendSocket.on('connect_error', () => {});
} catch (e) {
  console.warn('[Slot Machine] Main backend socket client not loaded:', e.message);
}


// ─── Socket.io Setup ────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 60_000, max: 600 });
app.use('/api/', limiter);

// Serve frontend assets and pages on backend port too
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use(express.static(path.join(__dirname, '../frontend/public')));

app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/admin.html'));
});

// ─── MySQL / Memory Store Fallback ──────────────────────────────────────────
let pool = null;
let useMemoryDb = false;

const memoryStore = {
  players: new Map(),
  rounds: [],
  bets: [],
  jackpot: 0,
  roundNumber: 1,
  webhookUrls: new Set(),
  webhooks: new Map(), // webhookId -> { id, url, secret, events, isActive, successCount, failCount, lastStatus, lastDispatchedAt, lastError }
};

async function initDb() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'umi_user';
  const password = process.env.DB_PASSWORD || 'umi_password';
  const database = process.env.DB_NAME || 'umi_live';


  try {
    const testPool = mysql.createPool({
      host, port, user, password, database,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 3000,
    });
    const conn = await testPool.getConnection();
    conn.release();
    pool = testPool;
    console.log('✅ Connected to MySQL database');
    useMemoryDb = false;

    // Ensure webhooks table exists in database
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS webhooks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          webhook_id VARCHAR(64) NOT NULL UNIQUE,
          url VARCHAR(512) NOT NULL UNIQUE,
          secret VARCHAR(128) DEFAULT NULL,
          events JSON DEFAULT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          success_count INT DEFAULT 0,
          fail_count INT DEFAULT 0,
          last_status INT NULL DEFAULT NULL,
          last_dispatched_at TIMESTAMP NULL DEFAULT NULL,
          last_error TEXT NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);
      await loadWebhooksFromDb();
    } catch (whErr) {
      console.warn('⚠️ Webhooks table init warning:', whErr.message);
    }

    // Sync state with main project database
    try {
      // 1. Load round number from mini_game_rounds
      const [maxRound] = await pool.query(
        "SELECT MAX(round_number) as max_round FROM mini_game_rounds WHERE game_slug = 'slote_mecine'"
      );
      if (maxRound && maxRound[0]?.max_round) {
        gameState.roundNumber = parseInt(maxRound[0].max_round) + 1;
      } else {
        gameState.roundNumber = 1;
      }

      // 2. Load recent round history
      const [rounds] = await pool.query(
        "SELECT * FROM mini_game_rounds WHERE game_slug = 'slote_mecine' ORDER BY id DESC LIMIT 10"
      );
      resultHistory = (rounds || []).map((r) => {
        const fruit = FRUITS.find((f) => f.name.toLowerCase() === r.winner_outcome.toLowerCase()) || FRUITS[0];
        let details = {};
        try { details = typeof r.details === 'string' ? JSON.parse(r.details) : (r.details || {}); } catch(_) {}
        return {
          fruitId: fruit.id,
          fruit,
          multiplier: fruit.multiplier,
          reelMultiplier: details.reelMultiplier || 1,
        };
      });

      // 3. Load jackpot and settings from mini_games
      const [games] = await pool.query(
        "SELECT * FROM mini_games WHERE slug = 'slote_mecine' LIMIT 1"
      );
      if (games && games.length > 0) {
        let set = games[0].settings;
        if (typeof set === 'string') {
          try { set = JSON.parse(set); } catch(_) { set = {}; }
        }
        if (set?.jackpot !== undefined) {
          gameState.jackpot = parseInt(set.jackpot) || 0;
        }
      }
      console.log(`🎰 [Slot Machine] Synced with Main DB: Round #${gameState.roundNumber}, History count: ${resultHistory.length}, Jackpot: ${gameState.jackpot}`);
    } catch (syncErr) {
      console.warn('⚠️ Main DB sync warning:', syncErr.message);
    }
  } catch (err) {
    console.warn(`⚠️ MySQL not reachable (${err.message}). Using in-memory store for game rounds & players.`);
    useMemoryDb = true;

    if (process.env.WEBHOOK_URL) {
      registerWebhook({ url: process.env.WEBHOOK_URL, name: 'ENV Webhook' }).catch(() => {});
    }
  }
}

// ─── Fruit Roulette Game Constants ──────────────────────────────────────────
// 0: Lemon (5x), 1: Raspberry (5x), 2: Kiwi (5x), 3: Plum (5x),
// 4: Strawberry (10x), 5: Banana (10x), 6: Watermelon (20x), 7: Cherry (45x)
const FRUITS = [
  { id: 0, index: 0, name: 'lemon',      displayName: 'Lemon',      emoji: '🍋', multiplier: 5,  color: '#fbbf24', weight: 30, icon: '/images/fruits/lemon.png'      },
  { id: 1, index: 1, name: 'raspberry',  displayName: 'Raspberry',  emoji: '🍇', multiplier: 5,  color: '#f43f5e', weight: 30, icon: '/images/fruits/raspberry.png'  },
  { id: 2, index: 2, name: 'kiwi',       displayName: 'Kiwi',       emoji: '🥝', multiplier: 5,  color: '#84cc16', weight: 30, icon: '/images/fruits/kiwi.png'       },
  { id: 3, index: 3, name: 'plum',       displayName: 'Plum',       emoji: '🫐', multiplier: 5,  color: '#a855f7', weight: 30, icon: '/images/fruits/plum.png'       },
  { id: 4, index: 4, name: 'strawberry', displayName: 'Strawberry', emoji: '🍓', multiplier: 10, color: '#ef4444', weight: 15, icon: '/images/fruits/strawberry.png' },
  { id: 5, index: 5, name: 'banana',     displayName: 'Banana',     emoji: '🍌', multiplier: 10, color: '#eab308', weight: 15, icon: '/images/fruits/banana.png'     },
  { id: 6, index: 6, name: 'watermelon', displayName: 'Watermelon', emoji: '🍉', multiplier: 20, color: '#10b981', weight: 8,  icon: '/images/fruits/watermelon.png' },
  { id: 7, index: 7, name: 'cherry',     displayName: 'Cherry',     emoji: '🍒', multiplier: 45, color: '#dc2626', weight: 3,  icon: '/images/fruits/cherry.png'     },
];

let resultHistory = [];

let gameConfig = {
  chipDenominations: [
    { amount: 100, label: '100' },
    { amount: 500, label: '500' },
    { amount: 1000, label: '1K' },
    { amount: 5000, label: '5K' },
  ],
  commissionPercent: 5,             // Winning commission % for admin (0..50)
  commissionDeductionType: 'gross', // 'gross' (from total win) | 'net_profit' (from profit)
  winRatePercent: 65,               // Player win rate % (0..100)
  algorithmPreset: 'competitive',   // 'competitive' | 'house_margin' | 'target_win_rate' | 'fair_rng' | 'anti_whale'
  minHouseProfitMargin: 15,         // Min house profit margin % (0..100)
};

let adminControls = {
  forcedWinner: null,   // null = random/fair, 0..7 = forced fruit
  forcedReels: null,    // null = random, or [2, 2, 2]
  isPaused: false,
  bettingDuration: 15,
  spinDurationMs: 4200,
};

let gameState = {
  roundNumber: 1,
  jackpot: 0,
  phase: 'betting', // 'betting' | 'spinning' | 'result'
  countdown: 15,
  winningIndex: 0,
  miniReels: [1, 1, 1],
  reelMultiplier: 1,
  spinStartTime: 0,
  spinDurationMs: 4200,
  currentBets: new Map(), // playerId -> { [fruitIndex]: totalBetAmount }
  fruitPoolBets: [0, 0, 0, 0, 0, 0, 0, 0],
  onlinePlayers: 1,
  totalCommissionEarned: 0, // Cumulative admin earnings from player winnings
  lastRoundCommission: 0,   // Commission collected in the last round
};

// ─── Webhook Persistence & Management Helpers ───────────────────────────────
async function loadWebhooksFromDb() {
  if (!pool || useMemoryDb) return;
  try {
    const [rows] = await pool.query('SELECT * FROM webhooks ORDER BY id DESC');
    for (const row of rows) {
      let events = ['*'];
      try { events = typeof row.events === 'string' ? JSON.parse(row.events) : (row.events || ['*']); } catch (_) {}
      const wh = {
        id: row.webhook_id,
        url: row.url,
        secret: row.secret || process.env.WEBHOOK_SECRET || 'live_stream_slot_secret_2024',
        events,
        isActive: !!row.is_active,
        successCount: row.success_count || 0,
        failCount: row.fail_count || 0,
        lastStatus: row.last_status,
        lastDispatchedAt: row.last_dispatched_at,
        lastError: row.last_error,
        createdAt: row.created_at,
      };
      memoryStore.webhooks.set(wh.id, wh);
      memoryStore.webhookUrls.add(wh.url);
    }
    console.log(`📡 Loaded ${rows.length} webhooks from database`);
  } catch (err) {
    console.warn('⚠️ Could not load webhooks from database:', err.message);
  }

  // Also auto-register default env webhook if present
  if (process.env.WEBHOOK_URL) {
    registerWebhook({ url: process.env.WEBHOOK_URL, name: 'ENV Webhook' }).catch(() => {});
  }
}

async function registerWebhook({ url, secret, events, name }) {
  if (!url || !url.startsWith('http')) {
    throw new Error('Valid HTTP/HTTPS url required');
  }

  // Check if URL already registered
  for (const wh of memoryStore.webhooks.values()) {
    if (wh.url === url) {
      if (secret) wh.secret = secret;
      if (events) wh.events = Array.isArray(events) ? events : ['*'];
      wh.isActive = true;
      await saveWebhookToDb(wh);
      return wh;
    }
  }

  const id = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const wh = {
    id,
    name: name || `Webhook ${memoryStore.webhooks.size + 1}`,
    url,
    secret: secret || process.env.WEBHOOK_SECRET || 'live_stream_slot_secret_2024',
    events: Array.isArray(events) && events.length > 0 ? events : ['*'],
    isActive: true,
    successCount: 0,
    failCount: 0,
    lastStatus: null,
    lastDispatchedAt: null,
    lastError: null,
    createdAt: new Date(),
  };

  memoryStore.webhooks.set(id, wh);
  memoryStore.webhookUrls.add(url);
  await saveWebhookToDb(wh);
  console.log(`📡 Registered external webhook [${id}]: ${url}`);
  return wh;
}

async function saveWebhookToDb(wh) {
  if (!pool || useMemoryDb) return;
  try {
    await pool.query(
      `INSERT INTO webhooks (webhook_id, url, secret, events, is_active, success_count, fail_count, last_status, last_dispatched_at, last_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       secret = VALUES(secret),
       events = VALUES(events),
       is_active = VALUES(is_active),
       success_count = VALUES(success_count),
       fail_count = VALUES(fail_count),
       last_status = VALUES(last_status),
       last_dispatched_at = VALUES(last_dispatched_at),
       last_error = VALUES(last_error)`,
      [
        wh.id,
        wh.url,
        wh.secret,
        JSON.stringify(wh.events || ['*']),
        wh.isActive ? 1 : 0,
        wh.successCount || 0,
        wh.failCount || 0,
        wh.lastStatus,
        wh.lastDispatchedAt ? new Date(wh.lastDispatchedAt) : null,
        wh.lastError,
      ]
    );
  } catch (err) {
    console.warn(`⚠️ Failed to save webhook [${wh.id}] to DB:`, err.message);
  }
}

async function unregisterWebhook(idOrUrl) {
  let targetId = null;
  let targetUrl = null;

  if (memoryStore.webhooks.has(idOrUrl)) {
    targetId = idOrUrl;
    targetUrl = memoryStore.webhooks.get(idOrUrl).url;
  } else {
    for (const [id, wh] of memoryStore.webhooks.entries()) {
      if (wh.url === idOrUrl) {
        targetId = id;
        targetUrl = wh.url;
        break;
      }
    }
  }

  if (targetId) {
    memoryStore.webhooks.delete(targetId);
    if (targetUrl) memoryStore.webhookUrls.delete(targetUrl);
    if (pool && !useMemoryDb) {
      try {
        await pool.query('DELETE FROM webhooks WHERE webhook_id = ? OR url = ?', [targetId, targetUrl]);
      } catch (err) {
        console.warn('⚠️ Failed to delete webhook from DB:', err.message);
      }
    }
    console.log(`📡 Unregistered webhook: ${targetUrl || targetId}`);
    return true;
  }
  return false;
}

function getWebhooksList() {
  return Array.from(memoryStore.webhooks.values()).map(wh => ({
    id: wh.id,
    name: wh.name,
    url: wh.url,
    events: wh.events || ['*'],
    isActive: wh.isActive !== false,
    successCount: wh.successCount || 0,
    failCount: wh.failCount || 0,
    lastStatus: wh.lastStatus,
    lastDispatchedAt: wh.lastDispatchedAt,
    lastError: wh.lastError,
    maskedSecret: wh.secret ? `${wh.secret.substring(0, 4)}...${wh.secret.substring(wh.secret.length - 4)}` : '••••••••',
  }));
}

// ─── Webhook Dispatcher with HMAC Signature & Telemetry ─────────────────────
async function dispatchWebhook(eventOrPayload, optionalData) {
  let eventName = 'general';
  let eventData = {};

  if (typeof eventOrPayload === 'string') {
    eventName = eventOrPayload;
    eventData = optionalData || {};
  } else if (eventOrPayload && typeof eventOrPayload === 'object') {
    eventName = eventOrPayload.event || 'general';
    eventData = eventOrPayload;
  }

  const deliveryId = `dlv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = Date.now();

  const payload = {
    event: eventName,
    deliveryId,
    timestamp,
    roundNumber: gameState.roundNumber,
    game: 'fruit_slot_machine',
    data: eventData,
  };

  // 1. Emit to Socket.IO clients and admin room
  io.emit('webhook_event', payload);
  io.to('admin').emit('admin_webhook_stream', {
    event: eventName,
    deliveryId,
    timestamp,
    data: eventData,
  });

  // 2. Dispatch HTTP POST to all registered webhooks
  const activeWebhooks = Array.from(memoryStore.webhooks.values()).filter(w => w.isActive !== false);

  // If there are legacy URLs in webhookUrls not in webhooks map, add them
  for (const url of memoryStore.webhookUrls) {
    if (!activeWebhooks.some(w => w.url === url)) {
      activeWebhooks.push({
        id: `legacy_${url}`,
        url,
        secret: process.env.WEBHOOK_SECRET || 'live_stream_slot_secret_2024',
        events: ['*'],
      });
    }
  }

  if (process.env.WEBHOOK_URL && !activeWebhooks.some(w => w.url === process.env.WEBHOOK_URL)) {
    activeWebhooks.push({
      id: 'env_webhook',
      url: process.env.WEBHOOK_URL,
      secret: process.env.WEBHOOK_SECRET || 'live_stream_slot_secret_2024',
      events: ['*'],
    });
  }

  for (const wh of activeWebhooks) {
    // Event filtering: if wh.events does not include '*' and does not include eventName, skip
    if (wh.events && !wh.events.includes('*') && !wh.events.includes(eventName)) {
      continue;
    }

    const secret = wh.secret || process.env.WEBHOOK_SECRET || 'live_stream_slot_secret_2024';
    const jsonBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(jsonBody).digest('hex');

    fetch(wh.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FruitSlotMachine-Webhook/2.0',
        'X-Webhook-Event': eventName,
        'X-Webhook-Delivery': deliveryId,
        'X-Webhook-Timestamp': timestamp.toString(),
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Slot-Signature': signature,
      },
      body: jsonBody,
      signal: AbortSignal.timeout(4000),
    })
    .then(async (res) => {
      wh.successCount = (wh.successCount || 0) + 1;
      wh.lastStatus = res.status;
      wh.lastDispatchedAt = new Date().toISOString();
      wh.lastError = null;
      if (wh.id && !wh.id.startsWith('legacy_') && !wh.id.startsWith('env_')) {
        saveWebhookToDb(wh);
      }
    })
    .catch((err) => {
      wh.failCount = (wh.failCount || 0) + 1;
      wh.lastStatus = 0;
      wh.lastDispatchedAt = new Date().toISOString();
      wh.lastError = err.message || 'Request Timeout / Network Error';
      if (wh.id && !wh.id.startsWith('legacy_') && !wh.id.startsWith('env_')) {
        saveWebhookToDb(wh);
      }
    });
  }
}

// ─── Real-Time Outcome & Payout Evaluations ─────────────────────────────────
function calculateOutcomeEvaluations() {
  const poolBets = gameState.fruitPoolBets;
  const totalPool = poolBets.reduce((a, b) => a + b, 0);

  return FRUITS.map((fruit, idx) => {
    const betOnFruit = poolBets[idx] || 0;
    const potentialPayout = betOnFruit * fruit.multiplier;
    const rawProfit = totalPool - potentialPayout;
    
    let commission = 0;
    if (potentialPayout > 0) {
      if (gameConfig.commissionDeductionType === 'net_profit') {
        const netProfitWin = Math.max(0, potentialPayout - betOnFruit);
        commission = Math.floor(netProfitWin * ((gameConfig.commissionPercent || 0) / 100));
      } else {
        commission = Math.floor(potentialPayout * ((gameConfig.commissionPercent || 0) / 100));
      }
    }

    const netPayout = potentialPayout - commission;
    const houseProfit = totalPool - netPayout;
    const profitMargin = totalPool > 0 ? ((houseProfit / totalPool) * 100).toFixed(1) : '100.0';

    return {
      index: idx,
      name: fruit.name,
      displayName: fruit.displayName,
      emoji: fruit.emoji,
      multiplier: fruit.multiplier,
      icon: fruit.icon,
      betOnFruit,
      potentialPayout,
      netPayout,
      commission,
      houseProfit,
      profitMargin: parseFloat(profitMargin),
      isProfitable: houseProfit >= 0,
      weight: fruit.weight,
    };
  });
}

function selectWeightedRandomFruit(fruitList = FRUITS) {
  const totalWeight = fruitList.reduce((sum, f) => sum + f.weight, 0);
  let random = Math.random() * totalWeight;
  for (const fruit of fruitList) {
    if (random < fruit.weight) return fruit.index;
    random -= fruit.weight;
  }
  return fruitList[0].index;
}

// 🛡️ Competitive Mode: Picks outcome with lowest total payout (Max House Profit / Anti-Loss)
function selectCompetitiveFruit() {
  const evals = calculateOutcomeEvaluations();
  const poolBets = gameState.fruitPoolBets;
  const totalPool = poolBets.reduce((a, b) => a + b, 0);

  if (totalPool === 0) {
    return selectWeightedRandomFruit();
  }

  // 1. Identify all fruits where house makes a profit (houseProfit >= 0)
  const profitableCandidates = evals.filter(c => c.houseProfit >= 0);

  if (profitableCandidates.length > 0) {
    // Sort primarily by lowest potential payout (maximum profit for house)
    profitableCandidates.sort((a, b) => {
      if (a.potentialPayout !== b.potentialPayout) {
        return a.potentialPayout - b.potentialPayout;
      }
      return b.weight - a.weight;
    });

    // If there are zero-payout fruits (nobody bet on them):
    const zeroPayouts = profitableCandidates.filter(c => c.potentialPayout === 0);
    if (zeroPayouts.length > 0) {
      // Pick randomly weighted among unbet items so the machine does not look rigged with static fruit
      return selectWeightedRandomFruit(zeroPayouts.map(z => FRUITS[z.index]));
    }

    return profitableCandidates[0].index;
  }

  // Fallback: If all options result in a loss (e.g. all fruits heavily bet),
  // pick the one with absolute minimum payout to minimize admin loss!
  evals.sort((a, b) => a.potentialPayout - b.potentialPayout);
  return evals[0].index;
}

// 💰 Guaranteed House Margin: Keeps house profit above minimum configured margin %
function selectHouseMarginFruit() {
  const evals = calculateOutcomeEvaluations();
  const totalPool = gameState.fruitPoolBets.reduce((a, b) => a + b, 0);
  if (totalPool === 0) return selectWeightedRandomFruit();

  const minMargin = gameConfig.minHouseProfitMargin || 15;
  const targetProfit = totalPool * (minMargin / 100);

  const marginCandidates = evals.filter(c => c.houseProfit >= targetProfit);
  if (marginCandidates.length > 0) {
    marginCandidates.sort((a, b) => a.potentialPayout - b.potentialPayout);
    return marginCandidates[0].index;
  }
  return selectCompetitiveFruit();
}

// ⚖️ Target Win Rate: Balances player wins based on target win rate percentage
function selectWinRateFruit() {
  const evals = calculateOutcomeEvaluations();
  const totalPool = gameState.fruitPoolBets.reduce((a, b) => a + b, 0);
  if (totalPool === 0) return selectWeightedRandomFruit();

  const targetWinRate = gameConfig.winRatePercent || 65;
  const shouldPlayerWin = (Math.random() * 100) <= targetWinRate;

  if (shouldPlayerWin) {
    const playerWinCandidates = evals.filter(c => c.betOnFruit > 0 && c.houseProfit >= 0);
    if (playerWinCandidates.length > 0) {
      return selectWeightedRandomFruit(playerWinCandidates.map(c => FRUITS[c.index]));
    }
  }

  return selectCompetitiveFruit();
}

// 🎯 Anti-Whale: Evades the highest bet fruit on the board
function selectAntiWhaleFruit() {
  const evals = calculateOutcomeEvaluations();
  const totalPool = gameState.fruitPoolBets.reduce((a, b) => a + b, 0);
  if (totalPool === 0) return selectWeightedRandomFruit();

  const maxBet = Math.max(...evals.map(c => c.betOnFruit));
  const safeCandidates = evals.filter(c => c.betOnFruit < maxBet && c.houseProfit >= 0);

  if (safeCandidates.length > 0) {
    safeCandidates.sort((a, b) => a.potentialPayout - b.potentialPayout);
    return safeCandidates[0].index;
  }
  return selectCompetitiveFruit();
}

// ─── Fruit Outcome Selection Router ─────────────────────────────────────────
function selectWinningFruit() {
  if (adminControls.forcedWinner !== null && adminControls.forcedWinner >= 0 && adminControls.forcedWinner <= 7) {
    console.log(`🎯 [ADMIN OVERRIDE] Winning Fruit forced to: ${FRUITS[adminControls.forcedWinner].displayName} (${adminControls.forcedWinner})`);
    return adminControls.forcedWinner;
  }

  const preset = gameConfig.algorithmPreset || 'competitive';
  console.log(`🎰 Selecting winner with preset: [${preset.toUpperCase()}]`);

  switch (preset) {
    case 'competitive':
      return selectCompetitiveFruit();
    case 'house_margin':
      return selectHouseMarginFruit();
    case 'target_win_rate':
      return selectWinRateFruit();
    case 'anti_whale':
      return selectAntiWhaleFruit();
    case 'fair_rng':
    default:
      return selectWeightedRandomFruit();
  }
}

function selectMiniReels() {
  if (adminControls.forcedReels && Array.isArray(adminControls.forcedReels)) {
    const r = adminControls.forcedReels;
    const mult = (r[0] === r[1] && r[1] === r[2]) ? r[0] : (r[0] === r[1] ? r[0] : 1);
    console.log(`🎯 [ADMIN OVERRIDE] Mini Reels forced to: [${r.join(',')}] Mult: ${mult}x`);
    return { reels: r, multiplier: Math.max(1, mult) };
  }
  const pick = () => {
    const r = Math.random();
    if (r < 0.60) return 1;
    if (r < 0.90) return 2;
    if (r < 0.98) return 3;
    return 5;
  };
  const r1 = pick();
  const r2 = pick();
  const r3 = pick();
  const reelMultiplier = (r1 === r2 && r2 === r3) ? r1 : (r1 === r2 ? r1 : 1);
  return { reels: [r1, r2, r3], multiplier: Math.max(1, reelMultiplier) };
}

// ─── Continuous Roulette Loop ───────────────────────────────────────────────
let loopTimer = null;

function triggerSpin() {
  if (gameState.phase !== 'betting') return;
  gameState.phase = 'spinning';
  gameState.countdown = 0;
  gameState.spinStartTime = Date.now();
  gameState.spinDurationMs = adminControls.spinDurationMs || 4200;

  const winningIndex = selectWinningFruit();
  const { reels, multiplier } = selectMiniReels();
  gameState.winningIndex = winningIndex;
  gameState.miniReels = reels;
  gameState.reelMultiplier = multiplier;

  console.log(`🎰 Round ${gameState.roundNumber} SPIN -> Winner: ${FRUITS[winningIndex].displayName} (${FRUITS[winningIndex].multiplier}x) MiniReels: [${reels.join(',')}] Mult: ${multiplier}x`);

  io.emit('round_spin', {
    roundNumber: gameState.roundNumber,
    winningIndex,
    winningFruit: FRUITS[winningIndex],
    miniReels: reels,
    reelMultiplier: multiplier,
    spinDurationMs: gameState.spinDurationMs,
    spinStartTime: gameState.spinStartTime,
  });

  dispatchWebhook({
    event: 'spin_start',
    roundNumber: gameState.roundNumber,
    timestamp: Date.now(),
  });

  broadcastAdminUpdate();

  setTimeout(() => handleRoundResult(), gameState.spinDurationMs);
}

function startGameLoop() {
  gameState.countdown = adminControls.bettingDuration || 12;
  gameState.phase = 'betting';
  gameState.spinStartTime = 0;
  dispatchWebhook('round_start', {
    roundNumber: gameState.roundNumber,
    jackpot: gameState.jackpot,
    countdown: gameState.countdown,
    fruitPoolBets: gameState.fruitPoolBets,
    fruits: FRUITS.map(f => ({ id: f.id, name: f.name, displayName: f.displayName, multiplier: f.multiplier })),
  });

  loopTimer = setInterval(async () => {
    if (adminControls.isPaused) {
      io.emit('timer_tick', {
        countdown: gameState.countdown,
        phase: 'paused',
        jackpot: gameState.jackpot,
        roundNumber: gameState.roundNumber,
        isPaused: true,
      });
      broadcastAdminUpdate();
      return;
    }

    if (gameState.phase === 'betting') {
      gameState.countdown--;

      io.emit('timer_tick', {
        countdown: gameState.countdown,
        phase: 'betting',
        jackpot: gameState.jackpot,
        roundNumber: gameState.roundNumber,
      });

      broadcastAdminUpdate();

      if (gameState.countdown <= 0) {
        triggerSpin();
      }
    }
  }, 1000);
}

async function handleRoundResult() {
  gameState.phase = 'result';
  const winningFruit = FRUITS[gameState.winningIndex];
  const fruitMult = winningFruit.multiplier;
  const totalMult = fruitMult * gameState.reelMultiplier;

  resultHistory.unshift({
    fruitId: winningFruit.id,
    fruit: winningFruit,
    multiplier: fruitMult,
    reelMultiplier: gameState.reelMultiplier,
  });
  if (resultHistory.length > 10) resultHistory.pop();

  const playerResults = [];
  let roundCommissionTotal = 0;

  for (const [playerId, bets] of gameState.currentBets.entries()) {
    const betOnWinner = bets[gameState.winningIndex] || 0;
    const totalBetThisRound = Object.values(bets).reduce((a, b) => a + b, 0);
    const rawWinAmount = betOnWinner * totalMult;
    const commissionPercent = gameConfig.commissionPercent || 0;

    let commissionAmount = 0;
    if (rawWinAmount > 0) {
      if (gameConfig.commissionDeductionType === 'net_profit') {
        const netProfitWin = Math.max(0, rawWinAmount - betOnWinner);
        commissionAmount = Math.floor(netProfitWin * (commissionPercent / 100));
      } else {
        commissionAmount = Math.floor(rawWinAmount * (commissionPercent / 100));
      }
    }

    const winAmount = Math.max(0, rawWinAmount - commissionAmount);
    roundCommissionTotal += commissionAmount;

    const player = await getPlayer(playerId);
    if (player) {
      player.balance += winAmount;
      if (winAmount > 0) player.total_won += winAmount;
      await savePlayer(player);

      // Record bet outcomes in main DB (mini_game_bets)
      if (pool && player.userId) {
        try {
          if (betOnWinner > 0) {
            await pool.query(
              `UPDATE mini_game_bets 
               SET status = 'won', win_amount = ? 
               WHERE user_id = ? AND game_slug = 'slote_mecine' AND round_id = ? AND selection = ?`,
              [winAmount, player.userId, String(gameState.roundNumber), winningFruit.name]
            );
          }
          await pool.query(
            `UPDATE mini_game_bets 
             SET status = 'lost', win_amount = 0 
             WHERE user_id = ? AND game_slug = 'slote_mecine' AND round_id = ? AND status = 'pending'`,
            [player.userId, String(gameState.roundNumber)]
          );
        } catch (betDbErr) {
          console.warn('⚠️ Error updating mini_game_bets in main DB:', betDbErr.message);
        }
      }

      playerResults.push({
        playerId,
        betOnWinner,
        totalBet: totalBetThisRound,
        rawWinAmount,
        commissionAmount,
        winAmount,
        isWin: winAmount > 0,
        balance: player.balance,
        todayWin: player.total_won,
      });

      io.to(playerId).emit('round_payout', {
        roundNumber: gameState.roundNumber,
        winningIndex: gameState.winningIndex,
        winningFruit,
        rawWinAmount,
        commissionAmount,
        winAmount,
        isWin: winAmount > 0,
        multiplier: totalMult,
        balance: player.balance,
        todayWin: player.total_won,
      });
    }
  }

  // Accumulate admin commission into house vault
  gameState.totalCommissionEarned = (gameState.totalCommissionEarned || 0) + roundCommissionTotal;
  gameState.lastRoundCommission = roundCommissionTotal;

  // Save completed round history in main DB (mini_game_rounds)
  if (pool) {
    try {
      const totalBetsThisRound = gameState.fruitPoolBets.reduce((a, b) => a + b, 0);
      const totalPayoutThisRound = playerResults.reduce((a, p) => a + (p.winAmount || 0), 0);
      await pool.query(
        `INSERT INTO mini_game_rounds (game_slug, round_number, winner_outcome, total_bets, total_payout, details)
         VALUES ('slote_mecine', ?, ?, ?, ?, ?)`,
        [
          gameState.roundNumber,
          winningFruit.name,
          totalBetsThisRound,
          totalPayoutThisRound,
          JSON.stringify({
            fruitId: winningFruit.id,
            fruitName: winningFruit.displayName,
            multiplier: fruitMult,
            miniReels: gameState.miniReels,
            reelMultiplier: gameState.reelMultiplier,
            totalMultiplier: totalMult,
            roundCommission: roundCommissionTotal,
          }),
        ]
      );

      // Update jackpot in mini_games table in main DB
      await pool.query(
        `UPDATE mini_games SET settings = JSON_SET(COALESCE(settings, '{}'), '$.jackpot', ?) WHERE slug = 'slote_mecine'`,
        [gameState.jackpot]
      );
    } catch (roundDbErr) {
      console.warn('⚠️ Error saving mini_game_rounds to main DB:', roundDbErr.message);
    }
  }

  io.emit('round_result', {
    roundNumber: gameState.roundNumber,
    winningIndex: gameState.winningIndex,
    winningFruit,
    miniReels: gameState.miniReels,
    reelMultiplier: gameState.reelMultiplier,
    totalMultiplier: totalMult,
    history: resultHistory,
    jackpot: gameState.jackpot,
    adminCommission: {
      rate: gameConfig.commissionPercent,
      roundCommission: roundCommissionTotal,
      totalCommissionEarned: gameState.totalCommissionEarned,
    },
  });

  dispatchWebhook({
    event: 'round_complete',
    roundNumber: gameState.roundNumber,
    winningFruit: winningFruit.name,
    multiplier: fruitMult,
    reelMultiplier: gameState.reelMultiplier,
    totalMultiplier: totalMult,
    jackpot: gameState.jackpot,
    playerResults,
    adminCommission: {
      ratePercent: gameConfig.commissionPercent,
      deductionType: gameConfig.commissionDeductionType || 'gross',
      roundCommission: roundCommissionTotal,
      totalCommissionEarned: gameState.totalCommissionEarned,
    },
    timestamp: Date.now(),
  });

  broadcastAdminUpdate();

  gameState.currentBets.clear();
  gameState.fruitPoolBets = [0, 0, 0, 0, 0, 0, 0, 0];

  setTimeout(() => {
    gameState.roundNumber++;
    gameState.countdown = adminControls.bettingDuration || 12;
    gameState.phase = 'betting';
    gameState.spinStartTime = 0;
    io.emit('round_start', {
      roundNumber: gameState.roundNumber,
      jackpot: gameState.jackpot,
      countdown: gameState.countdown,
    });
    dispatchWebhook('round_start', {
      roundNumber: gameState.roundNumber,
      jackpot: gameState.jackpot,
      countdown: gameState.countdown,
      fruitPoolBets: gameState.fruitPoolBets,
      fruits: FRUITS.map(f => ({ id: f.id, name: f.name, displayName: f.displayName, multiplier: f.multiplier })),
    });
    broadcastAdminUpdate();
  }, 4500);
}

// ─── Admin State Helper ─────────────────────────────────────────────────────
function getAdminState() {
  const totalPool = gameState.fruitPoolBets.reduce((a, b) => a + b, 0);
  const evaluations = calculateOutcomeEvaluations();
  return {
    roundNumber: gameState.roundNumber,
    jackpot: gameState.jackpot,
    phase: gameState.phase,
    countdown: gameState.countdown,
    onlinePlayers: gameState.onlinePlayers,
    totalPool,
    totalCommissionEarned: gameState.totalCommissionEarned || 0,
    lastRoundCommission: gameState.lastRoundCommission || 0,
    fruitPoolBets: gameState.fruitPoolBets,
    fruits: FRUITS,
    miniReels: gameState.miniReels,
    reelMultiplier: gameState.reelMultiplier,
    adminControls,
    gameConfig,
    evaluations,
    webhooks: getWebhooksList(),
    history: resultHistory,
    activeBetsCount: gameState.currentBets.size,
    spinStartTime: gameState.spinStartTime,
    spinDurationMs: gameState.spinDurationMs,
    winningIndex: gameState.winningIndex,
  };
}

function broadcastAdminUpdate() {
  io.to('admin').emit('admin_state', getAdminState());
}

// ─── Player Storage Helpers (Integrated with Main Project Database) ───────────
async function getPlayer(playerId) {
  const numericId = parseInt(playerId, 10);

  if (pool) {
    try {
      let user = null;
      if (!isNaN(numericId) && numericId > 0) {
        const [users] = await pool.query(
          'SELECT id, name, username, coins, diamonds, avatar FROM users WHERE id = ?',
          [numericId]
        );
        if (users && users.length > 0) user = users[0];
      }
      if (!user) {
        const [users] = await pool.query(
          'SELECT id, name, username, coins, diamonds, avatar FROM users WHERE username = ? OR id = ?',
          [String(playerId), String(playerId)]
        );
        if (users && users.length > 0) user = users[0];
      }

      if (user) {
        let todayWon = 0;
        try {
          const [wins] = await pool.query(
            `SELECT COALESCE(SUM(win_amount), 0) as total_win 
             FROM mini_game_bets 
             WHERE user_id = ? AND game_slug = 'slote_mecine' AND status = 'won' 
             AND created_at >= CURDATE()`,
            [user.id]
          );
          todayWon = parseInt(wins[0]?.total_win) || 0;
        } catch (_) {}

        return {
          player_id: String(user.id),
          userId: user.id,
          username: user.name || user.username || 'Player',
          balance: parseInt(user.coins) || 0,
          total_won: todayWon,
          total_bet: 0,
          isRealUser: true,
        };
      }
    } catch (err) {
      console.warn('⚠️ Error querying main users table:', err.message);
    }
  }

  // Fallback for guest/demo: Default balance is 0 (No fake millions)
  if (!memoryStore.players.has(playerId)) {
    memoryStore.players.set(playerId, {
      player_id: String(playerId),
      userId: !isNaN(numericId) ? numericId : null,
      username: 'Player',
      balance: 0,
      total_won: 0,
      total_bet: 0,
      isRealUser: false,
    });
  }
  return memoryStore.players.get(playerId);
}

async function savePlayer(player) {
  if (player.isRealUser && pool && player.userId) {
    try {
      await pool.query(
        'UPDATE users SET coins = ? WHERE id = ?',
        [Math.max(0, player.balance), player.userId]
      );
    } catch (e) {
      console.warn('⚠️ Error updating user coins in main DB:', e.message);
    }
  }
  memoryStore.players.set(player.player_id, player);
}

// ─── Socket.IO Handler ──────────────────────────────────────────────────────
io.on('connection', (socket) => {
  gameState.onlinePlayers = Math.max(1, io.engine.clientsCount);
  io.emit('player_count', gameState.onlinePlayers);

  const spinElapsedMs = gameState.spinStartTime > 0 ? (Date.now() - gameState.spinStartTime) : 0;

  socket.emit('game_state', {
    roundNumber: gameState.roundNumber,
    jackpot: gameState.jackpot,
    phase: gameState.phase,
    countdown: gameState.countdown,
    fruits: FRUITS,
    history: resultHistory,
    fruitPoolBets: gameState.fruitPoolBets,
    miniReels: gameState.miniReels,
    reelMultiplier: gameState.reelMultiplier,
    onlinePlayers: gameState.onlinePlayers,
    winningIndex: gameState.winningIndex,
    spinStartTime: gameState.spinStartTime,
    spinDurationMs: gameState.spinDurationMs,
    spinElapsedMs,
    isPaused: adminControls.isPaused,
    gameConfig,
  });

  socket.on('join_game', async (data) => {
    const pid = data?.playerId || socket.id;
    socket.playerId = pid;
    socket.join(pid);

    const player = await getPlayer(pid);
    if (data?.username) player.username = data.username;
    if (data?.externalBalance !== undefined && data.externalBalance !== null) {
      player.balance = parseInt(data.externalBalance);
    }
    await savePlayer(player);

    socket.emit('player_joined', {
      success: true,
      player: {
        playerId: player.player_id || pid,
        username: player.username,
        balance: player.balance,
        todayWin: player.total_won,
      }
    });
  });

  socket.on('place_bet', async (data) => {
    const pid = data?.playerId || socket.playerId || socket.id;
    const fruitIndex = parseInt(data?.fruitIndex);
    const amount = parseInt(data?.amount) || 100;

    if (gameState.phase !== 'betting') {
      socket.emit('bet_error', { message: 'Betting is closed for this round!' });
      return;
    }

    if (isNaN(fruitIndex) || fruitIndex < 0 || fruitIndex > 7) {
      socket.emit('bet_error', { message: 'Invalid fruit selection!' });
      return;
    }

    const player = await getPlayer(pid);
    if (!player || player.balance < amount) {
      socket.emit('bet_error', { message: 'Insufficient coin balance!' });
      return;
    }

    player.balance -= amount;
    player.total_bet = (player.total_bet || 0) + amount;
    await savePlayer(player);

    // Record bet into main DB (mini_game_bets)
    if (pool && player.userId) {
      try {
        await pool.query(
          `INSERT INTO mini_game_bets (user_id, game_slug, round_id, bet_amount, win_amount, selection, multiplier, status)
           VALUES (?, 'slote_mecine', ?, ?, 0, ?, ?, 'pending')`,
          [player.userId, String(gameState.roundNumber), amount, FRUITS[fruitIndex].name, FRUITS[fruitIndex].multiplier]
        );
      } catch (betDbErr) {
        console.warn('⚠️ Error inserting mini_game_bet into main DB:', betDbErr.message);
      }
    }

    if (!gameState.currentBets.has(pid)) {
      gameState.currentBets.set(pid, {});
    }
    const userBets = gameState.currentBets.get(pid);
    userBets[fruitIndex] = (userBets[fruitIndex] || 0) + amount;

    gameState.fruitPoolBets[fruitIndex] += amount;
    gameState.jackpot += Math.floor(amount * 0.01);

    socket.emit('bet_success', {
      fruitIndex,
      amount,
      userFruitTotal: userBets[fruitIndex],
      allUserBets: userBets,
      newBalance: player.balance,
      todayWin: player.total_won,
      jackpot: gameState.jackpot,
    });

    io.emit('room_bet', {
      fruitIndex,
      amount,
      total: gameState.fruitPoolBets[fruitIndex],
      jackpot: gameState.jackpot,
    });

    dispatchWebhook({
      event: 'player_bid',
      playerId: pid,
      username: player.username,
      fruitIndex,
      fruitName: FRUITS[fruitIndex].name,
      amount,
      balance: player.balance,
      roundNumber: gameState.roundNumber,
      timestamp: Date.now(),
    });
  });

  socket.on('recharge_coins', async (data) => {
    const pid = data?.playerId || socket.playerId || socket.id;
    const addCoins = parseInt(data?.amount) || 1000000;
    const player = await getPlayer(pid);
    player.balance += addCoins;
    await savePlayer(player);

    socket.emit('balance_updated', { balance: player.balance, added: addCoins });
  });

  // 👑 Admin Panel Socket Listeners
  socket.on('admin_join', () => {
    socket.join('admin');
    socket.emit('admin_state', getAdminState());
  });

  socket.on('admin_set_forced_winner', (data) => {
    const fruitIndex = data?.fruitIndex !== undefined && data.fruitIndex !== null && data.fruitIndex !== ''
      ? parseInt(data.fruitIndex)
      : null;
    adminControls.forcedWinner = (fruitIndex !== null && !isNaN(fruitIndex) && fruitIndex >= 0 && fruitIndex <= 7) ? fruitIndex : null;
    console.log(`👑 [ADMIN] Set forced winner: ${adminControls.forcedWinner !== null ? FRUITS[adminControls.forcedWinner]?.displayName : 'RANDOM/AUTO'}`);
    broadcastAdminUpdate();
  });

  socket.on('admin_set_forced_reels', (data) => {
    const reels = data?.reels;
    if (Array.isArray(reels) && reels.length === 3) {
      adminControls.forcedReels = reels.map(n => parseInt(n) || 1);
    } else {
      adminControls.forcedReels = null;
    }
    console.log(`👑 [ADMIN] Set forced mini reels:`, adminControls.forcedReels);
    broadcastAdminUpdate();
  });

  socket.on('admin_force_spin', () => {
    console.log(`👑 [ADMIN] Force spin requested`);
    if (gameState.phase === 'betting') {
      triggerSpin();
    }
  });

  socket.on('admin_toggle_pause', (data) => {
    adminControls.isPaused = data?.isPaused !== undefined ? !!data.isPaused : !adminControls.isPaused;
    console.log(`👑 [ADMIN] Game pause state set to: ${adminControls.isPaused}`);
    io.emit('timer_tick', {
      countdown: gameState.countdown,
      phase: adminControls.isPaused ? 'paused' : gameState.phase,
      jackpot: gameState.jackpot,
      roundNumber: gameState.roundNumber,
      isPaused: adminControls.isPaused,
    });
    broadcastAdminUpdate();
  });

  socket.on('admin_set_countdown', (data) => {
    const seconds = parseInt(data?.seconds);
    if (!isNaN(seconds) && seconds >= 3 && seconds <= 60) {
      adminControls.bettingDuration = seconds;
      if (gameState.phase === 'betting') {
        gameState.countdown = seconds;
      }
      console.log(`👑 [ADMIN] Set betting countdown to ${seconds}s`);
      broadcastAdminUpdate();
    }
  });

  socket.on('admin_broadcast_message', (data) => {
    const message = (data?.message || '').trim();
    if (message) {
      console.log(`👑 [ADMIN] Broadcast message: "${message}"`);
      io.emit('admin_announcement', {
        message,
        timestamp: Date.now(),
      });
    }
  });

  socket.on('admin_recharge_player', async (data) => {
    const pid = data?.playerId;
    const amount = parseInt(data?.amount) || 1000000;
    if (!pid) return;
    const player = await getPlayer(pid);
    player.balance += amount;
    await savePlayer(player);
    io.to(pid).emit('balance_updated', { balance: player.balance, added: amount });
    socket.emit('admin_action_success', { action: 'recharge', playerId: pid, newBalance: player.balance });
  });

  // 1. Update Chip Denominations
  socket.on('admin_update_chips', (data) => {
    if (Array.isArray(data?.chips) && data.chips.length === 4) {
      gameConfig.chipDenominations = data.chips.map(c => {
        const amt = Math.max(1, parseInt(c.amount) || 1000);
        let lbl = c.label;
        if (!lbl) {
          if (amt >= 1000000) lbl = `${(amt / 1000000).toFixed(amt % 1000000 === 0 ? 0 : 1)}M`;
          else if (amt >= 1000) lbl = `${(amt / 1000).toFixed(0)}K`;
          else lbl = amt.toString();
        }
        return { amount: amt, label: lbl };
      });
      console.log('👑 [ADMIN] Updated chip denominations:', gameConfig.chipDenominations);
      io.emit('config_update', { gameConfig, fruits: FRUITS });
      broadcastAdminUpdate();
    }
  });

  // 2. Update Fruit Multipliers
  socket.on('admin_update_multipliers', (data) => {
    if (data?.multipliers && typeof data.multipliers === 'object') {
      for (const [idxStr, mult] of Object.entries(data.multipliers)) {
        const idx = parseInt(idxStr);
        const m = parseInt(mult);
        if (!isNaN(idx) && idx >= 0 && idx < FRUITS.length && !isNaN(m) && m > 0) {
          FRUITS[idx].multiplier = m;
        }
      }
      console.log('👑 [ADMIN] Updated fruit multipliers:', FRUITS.map(f => `${f.name}:${f.multiplier}x`).join(', '));
      io.emit('config_update', { gameConfig, fruits: FRUITS });
      broadcastAdminUpdate();
    }
  });

  // 3. Update Winning Commission for Admin
  socket.on('admin_update_commission', (data) => {
    const comm = parseFloat(data?.commission);
    if (!isNaN(comm) && comm >= 0 && comm <= 50) {
      gameConfig.commissionPercent = comm;
      if (data?.deductionType) {
        gameConfig.commissionDeductionType = data.deductionType;
      }
      console.log(`👑 [ADMIN] Updated winning commission for admin: ${comm}% (${gameConfig.commissionDeductionType || 'gross'})`);
      io.emit('config_update', { gameConfig, fruits: FRUITS });
      broadcastAdminUpdate();
    }
  });

  // Reset Commission Vault
  socket.on('admin_reset_commission', () => {
    gameState.totalCommissionEarned = 0;
    gameState.lastRoundCommission = 0;
    console.log('👑 [ADMIN] Commission vault reset to 0');
    broadcastAdminUpdate();
  });

  // 4. Update Win Rate
  socket.on('admin_update_win_rate', (data) => {
    const rate = parseFloat(data?.winRate);
    if (!isNaN(rate) && rate >= 0 && rate <= 100) {
      gameConfig.winRatePercent = rate;
      console.log(`👑 [ADMIN] Updated win rate: ${rate}%`);
      io.emit('config_update', { gameConfig, fruits: FRUITS });
      broadcastAdminUpdate();
    }
  });

  // 5. Update Algorithm Preset
  socket.on('admin_update_algorithm', (data) => {
    const preset = data?.preset;
    const validPresets = ['competitive', 'house_margin', 'target_win_rate', 'fair_rng', 'anti_whale'];
    if (validPresets.includes(preset)) {
      gameConfig.algorithmPreset = preset;
      console.log(`👑 [ADMIN] Updated algorithm preset to: ${preset}`);
      broadcastAdminUpdate();
    }
  });

  // 👑 Admin Webhook Socket Handlers
  socket.on('admin_register_webhook', async (data) => {
    try {
      const wh = await registerWebhook(data);
      socket.emit('admin_action_success', { action: 'register_webhook', webhook: wh });
      broadcastAdminUpdate();
    } catch (err) {
      socket.emit('admin_action_error', { action: 'register_webhook', error: err.message });
    }
  });

  socket.on('admin_unregister_webhook', async (data) => {
    const target = data?.id || data?.url;
    if (target) {
      await unregisterWebhook(target);
      socket.emit('admin_action_success', { action: 'unregister_webhook', target });
      broadcastAdminUpdate();
    }
  });

  socket.on('admin_toggle_webhook', async (data) => {
    const wh = memoryStore.webhooks.get(data?.id);
    if (wh) {
      wh.isActive = data?.isActive !== undefined ? !!data.isActive : !wh.isActive;
      await saveWebhookToDb(wh);
      broadcastAdminUpdate();
    }
  });

  socket.on('admin_test_webhook', async (data) => {
    const target = data?.id || data?.url;
    dispatchWebhook('test_ping', {
      source: 'admin_test',
      message: 'Test ping from Slot Machine Admin Console',
      target,
      timestamp: Date.now(),
    });
    socket.emit('admin_action_success', { action: 'test_webhook', message: 'Test ping dispatched' });
  });

  socket.on('disconnect', () => {
    gameState.onlinePlayers = Math.max(1, io.engine.clientsCount);
    io.emit('player_count', gameState.onlinePlayers);
  });
});

// ─── REST & Webhook APIs ────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    phase: gameState.phase,
    round: gameState.roundNumber,
    jackpot: gameState.jackpot,
    storage: useMemoryDb ? 'in-memory' : 'mysql',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/game/state', (req, res) => {
  res.json({
    roundNumber: gameState.roundNumber,
    jackpot: gameState.jackpot,
    phase: gameState.phase,
    countdown: gameState.countdown,
    fruits: FRUITS,
    history: resultHistory,
    fruitPoolBets: gameState.fruitPoolBets,
    onlinePlayers: gameState.onlinePlayers,
    gameConfig,
  });
});

app.get('/api/game/history', (req, res) => {
  res.json({ success: true, history: resultHistory });
});

app.get('/api/player/:playerId', async (req, res) => {
  const player = await getPlayer(req.params.playerId);
  res.json(player);
});

// ─── External Backend Webhook & Sync APIs ───────────────────────────────────
app.get('/api/webhook/list', (req, res) => {
  res.json({
    success: true,
    total: memoryStore.webhooks.size,
    webhooks: getWebhooksList(),
    defaultSecret: process.env.WEBHOOK_SECRET || 'live_stream_slot_secret_2024',
  });
});

app.post('/api/webhook/register', async (req, res) => {
  try {
    const { url, secret, events, name } = req.body;
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: 'Valid HTTP/HTTPS url required' });
    }
    const wh = await registerWebhook({ url, secret, events, name });
    broadcastAdminUpdate();
    res.json({ success: true, webhook: wh, totalRegistered: memoryStore.webhooks.size });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/webhook/unregister', async (req, res) => {
  const { id, url } = req.body;
  const target = id || url;
  if (!target) return res.status(400).json({ error: 'id or url required' });
  const deleted = await unregisterWebhook(target);
  broadcastAdminUpdate();
  res.json({ success: deleted, target, totalRegistered: memoryStore.webhooks.size });
});

app.post('/api/webhook/toggle', async (req, res) => {
  const { id, isActive } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const wh = memoryStore.webhooks.get(id);
  if (!wh) return res.status(404).json({ error: 'Webhook not found' });
  wh.isActive = isActive !== undefined ? !!isActive : !wh.isActive;
  await saveWebhookToDb(wh);
  broadcastAdminUpdate();
  res.json({ success: true, id, isActive: wh.isActive });
});

app.post('/api/webhook/test', async (req, res) => {
  const { id, url } = req.body;
  let targetUrl = url;
  let secret = process.env.WEBHOOK_SECRET || 'live_stream_slot_secret_2024';

  if (id && memoryStore.webhooks.has(id)) {
    const wh = memoryStore.webhooks.get(id);
    targetUrl = wh.url;
    secret = wh.secret || secret;
  }

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({ error: 'Valid webhook url or id required' });
  }

  const testPayload = {
    event: 'test_ping',
    timestamp: Date.now(),
    deliveryId: `test_${Date.now()}`,
    game: 'fruit_slot_machine',
    data: {
      message: 'Ping from Fruit Slot Machine Webhook Engine',
      currentRound: gameState.roundNumber,
      jackpot: gameState.jackpot,
      phase: gameState.phase,
    },
  };

  const jsonBody = JSON.stringify(testPayload);
  const signature = crypto.createHmac('sha256', secret).update(jsonBody).digest('hex');

  const startMs = Date.now();
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FruitSlotMachine-Webhook/2.0-Test',
        'X-Webhook-Event': 'test_ping',
        'X-Webhook-Delivery': testPayload.deliveryId,
        'X-Webhook-Timestamp': testPayload.timestamp.toString(),
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Slot-Signature': signature,
      },
      body: jsonBody,
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - startMs;
    res.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      latencyMs,
      targetUrl,
      signatureSent: `sha256=${signature}`,
    });
  } catch (err) {
    const latencyMs = Date.now() - startMs;
    res.status(502).json({
      success: false,
      error: err.message,
      latencyMs,
      targetUrl,
    });
  }
});

// ─── External Backend User Balance & Bet Synchronization ────────────────────
app.post('/api/webhook/user/sync-balance', async (req, res) => {
  const { playerId, balance, username, reason } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId required' });
  if (balance === undefined || isNaN(parseInt(balance))) {
    return res.status(400).json({ error: 'valid integer balance required' });
  }

  const player = await getPlayer(playerId);
  const prevBalance = player.balance;
  player.balance = parseInt(balance);
  if (username) player.username = username;
  await savePlayer(player);

  io.to(playerId).emit('balance_updated', { balance: player.balance, delta: player.balance - prevBalance });

  dispatchWebhook('player_balance_updated', {
    playerId,
    username: player.username,
    previousBalance: prevBalance,
    newBalance: player.balance,
    delta: player.balance - prevBalance,
    reason: reason || 'external_sync',
    timestamp: Date.now(),
  });

  res.json({ success: true, playerId, balance: player.balance, previousBalance: prevBalance });
});

app.post('/api/webhook/user/add-coins', async (req, res) => {
  const { playerId, amount, reason } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId required' });
  const addAmt = parseInt(amount);
  if (isNaN(addAmt)) return res.status(400).json({ error: 'valid integer amount required' });

  const player = await getPlayer(playerId);
  player.balance += addAmt;
  await savePlayer(player);

  io.to(playerId).emit('balance_updated', { balance: player.balance, added: addAmt });

  dispatchWebhook('player_balance_updated', {
    playerId,
    username: player.username,
    newBalance: player.balance,
    added: addAmt,
    reason: reason || 'coins_recharge',
    timestamp: Date.now(),
  });

  res.json({ success: true, playerId, balance: player.balance, added: addAmt });
});

app.post('/api/webhook/player/bet', async (req, res) => {
  const { playerId, fruitIndex, amount } = req.body;
  if (!playerId || fruitIndex === undefined || !amount) {
    return res.status(400).json({ error: 'playerId, fruitIndex, and amount required' });
  }

  const fIdx = parseInt(fruitIndex);
  if (isNaN(fIdx) || fIdx < 0 || fIdx > 7) {
    return res.status(400).json({ error: 'fruitIndex must be between 0 and 7' });
  }

  if (gameState.phase !== 'betting') {
    return res.status(400).json({ error: 'Betting is closed for current round' });
  }

  const player = await getPlayer(playerId);
  const betAmt = parseInt(amount);
  if (player.balance < betAmt) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  player.balance -= betAmt;
  player.total_bet = (player.total_bet || 0) + betAmt;
  await savePlayer(player);

  if (!gameState.currentBets.has(playerId)) {
    gameState.currentBets.set(playerId, {});
  }
  const userBets = gameState.currentBets.get(playerId);
  userBets[fIdx] = (userBets[fIdx] || 0) + betAmt;
  gameState.fruitPoolBets[fIdx] += betAmt;
  const totalPool = gameState.fruitPoolBets.reduce((a, b) => a + b, 0);

  io.to(playerId).emit('balance_updated', { balance: player.balance });
  io.emit('room_bet', { fruitIndex: fIdx, amount: betAmt, total: gameState.fruitPoolBets[fIdx] });

  dispatchWebhook('bet_placed', {
    playerId,
    username: player.username,
    fruitIndex: fIdx,
    fruitName: FRUITS[fIdx].name,
    amount: betAmt,
    balance: player.balance,
    totalPool,
    roundNumber: gameState.roundNumber,
    timestamp: Date.now(),
  });

  res.json({
    success: true,
    playerId,
    fruitIndex: fIdx,
    fruitName: FRUITS[fIdx].name,
    betAmount: betAmt,
    balance: player.balance,
    totalPool,
    roundNumber: gameState.roundNumber,
  });
});

app.get('/api/webhook/docs', (req, res) => {
  res.json({
    name: 'Fruit Slot Machine Webhook & External API System',
    version: '2.0.0',
    description: 'Real-time webhook and REST API integration for external mobile apps, Flutter, live streaming platforms, and game backends.',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Event': 'Event name (e.g. round_start, bet_placed, spin_start, round_complete)',
      'X-Webhook-Delivery': 'Unique UUID delivery ID for deduplication',
      'X-Webhook-Timestamp': 'Unix timestamp in milliseconds',
      'X-Webhook-Signature': 'sha256=<HMAC-SHA256 hex digest of raw request body signed with webhook secret>',
      'X-Slot-Signature': 'Raw HMAC-SHA256 hex digest',
    },
    events: [
      {
        event: 'round_start',
        description: 'Dispatched when a new betting countdown begins',
        payloadExample: {
          event: 'round_start',
          roundNumber: 2166,
          jackpot: 1887773133,
          countdown: 12,
          fruitPoolBets: [120000, 200000, 90000, 160000, 280000, 140000, 80000, 40000],
          fruits: FRUITS.map(f => ({ name: f.name, multiplier: f.multiplier })),
          timestamp: Date.now(),
        },
      },
      {
        event: 'bet_placed',
        description: 'Dispatched whenever any player places a bid on a fruit',
        payloadExample: {
          event: 'bet_placed',
          playerId: 'Player1',
          username: 'Player',
          fruitIndex: 7,
          fruitName: 'cherry',
          amount: 100000,
          balance: 3156751,
          totalPool: 1590000,
          roundNumber: 2166,
          timestamp: Date.now(),
        },
      },
      {
        event: 'spin_start',
        description: 'Dispatched when betting locks and the slot machine begins spinning',
        payloadExample: {
          event: 'spin_start',
          roundNumber: 2166,
          winningFruit: { name: 'cherry', multiplier: 45 },
          miniReels: [2, 2, 2],
          reelMultiplier: 2,
          totalMultiplier: 90,
          spinDurationMs: 7500,
          totalPool: 1590000,
          timestamp: Date.now(),
        },
      },
      {
        event: 'round_complete',
        description: 'Dispatched when spin completes and winners & payouts are calculated',
        payloadExample: {
          event: 'round_complete',
          roundNumber: 2166,
          winningFruit: { id: 7, name: 'cherry', multiplier: 45 },
          miniReels: [2, 2, 2],
          reelMultiplier: 2,
          totalMultiplier: 90,
          jackpot: 1887773133,
          totalPool: 1590000,
          totalPayout: 900000,
          commissionDeducted: 45000,
          houseProfit: 690000,
          playerResults: [
            { playerId: 'Player1', username: 'Player', betAmount: 100000, isWinner: true, grossWin: 900000, commission: 45000, netWin: 855000, newBalance: 4011751 }
          ],
          timestamp: Date.now(),
        },
      },
      {
        event: 'player_balance_updated',
        description: 'Dispatched when a player balance is synced, recharged, or updated',
      },
      {
        event: 'config_updated',
        description: 'Dispatched when chips, multipliers, commission, win rate, or algorithm presets change',
      },
    ],
    incomingApis: {
      syncBalance: 'POST /api/webhook/user/sync-balance { playerId, balance, username }',
      addCoins: 'POST /api/webhook/user/add-coins { playerId, amount }',
      placeBet: 'POST /api/webhook/player/bet { playerId, fruitIndex, amount }',
      registerWebhook: 'POST /api/webhook/register { url, secret, events }',
      unregisterWebhook: 'POST /api/webhook/unregister { id | url }',
      listWebhooks: 'GET /api/webhook/list',
      testWebhook: 'POST /api/webhook/test { id | url }',
      gameState: 'GET /api/game/state',
      gameHistory: 'GET /api/game/history',
      playerDetails: 'GET /api/game/player/:id',
    },
  });
});

app.post('/api/player/sync', async (req, res) => {
  const { playerId, balance, username } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId required' });

  const player = await getPlayer(playerId);
  if (username) player.username = username;
  if (balance !== undefined) player.balance = parseInt(balance);
  await savePlayer(player);

  io.to(playerId).emit('balance_updated', { balance: player.balance });
  res.json({ success: true, player });
});

app.post('/api/bet', async (req, res) => {
  const { playerId, fruitIndex, amount } = req.body;
  if (!playerId || fruitIndex === undefined || !amount) {
    return res.status(400).json({ error: 'playerId, fruitIndex, and amount required' });
  }

  if (gameState.phase !== 'betting') {
    return res.status(400).json({ error: 'Betting is closed for current round' });
  }

  const player = await getPlayer(playerId);
  const betAmt = parseInt(amount);
  if (player.balance < betAmt) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  player.balance -= betAmt;
  await savePlayer(player);

  if (!gameState.currentBets.has(playerId)) {
    gameState.currentBets.set(playerId, {});
  }
  const userBets = gameState.currentBets.get(playerId);
  userBets[fruitIndex] = (userBets[fruitIndex] || 0) + betAmt;
  gameState.fruitPoolBets[fruitIndex] += betAmt;

  io.to(playerId).emit('balance_updated', { balance: player.balance });
  io.emit('room_bet', { fruitIndex, amount: betAmt, total: gameState.fruitPoolBets[fruitIndex] });

  dispatchWebhook('bet_placed', {
    playerId,
    username: player.username,
    fruitIndex,
    fruitName: FRUITS[fruitIndex].name,
    amount: betAmt,
    balance: player.balance,
    roundNumber: gameState.roundNumber,
    timestamp: Date.now(),
  });

  res.json({ success: true, balance: player.balance, roundNumber: gameState.roundNumber });
});

// ─── Admin REST APIs ────────────────────────────────────────────────────────
app.get('/api/admin/state', (req, res) => {
  res.json(getAdminState());
});

app.post('/api/admin/force-winner', (req, res) => {
  const { fruitIndex } = req.body;
  const idx = fruitIndex !== undefined && fruitIndex !== null && fruitIndex !== '' ? parseInt(fruitIndex) : null;
  adminControls.forcedWinner = (idx !== null && !isNaN(idx) && idx >= 0 && idx <= 7) ? idx : null;
  console.log(`👑 [ADMIN REST] Forced winner set to: ${adminControls.forcedWinner !== null ? FRUITS[adminControls.forcedWinner]?.displayName : 'RANDOM'}`);
  broadcastAdminUpdate();
  res.json({ success: true, forcedWinner: adminControls.forcedWinner });
});

app.post('/api/admin/force-reels', (req, res) => {
  const { reels } = req.body;
  if (Array.isArray(reels) && reels.length === 3) {
    adminControls.forcedReels = reels.map(n => parseInt(n) || 1);
  } else {
    adminControls.forcedReels = null;
  }
  console.log(`👑 [ADMIN REST] Forced reels set to:`, adminControls.forcedReels);
  broadcastAdminUpdate();
  res.json({ success: true, forcedReels: adminControls.forcedReels });
});

app.post('/api/admin/force-spin', (req, res) => {
  if (gameState.phase === 'betting') {
    triggerSpin();
    return res.json({ success: true, message: 'Spin started' });
  }
  res.status(400).json({ error: 'Cannot spin, round is not in betting phase' });
});

app.post('/api/admin/pause', (req, res) => {
  const { paused } = req.body;
  adminControls.isPaused = paused !== undefined ? !!paused : !adminControls.isPaused;
  io.emit('timer_tick', {
    countdown: gameState.countdown,
    phase: adminControls.isPaused ? 'paused' : gameState.phase,
    jackpot: gameState.jackpot,
    roundNumber: gameState.roundNumber,
    isPaused: adminControls.isPaused,
  });
  broadcastAdminUpdate();
  res.json({ success: true, isPaused: adminControls.isPaused });
});

app.post('/api/admin/countdown', (req, res) => {
  const seconds = parseInt(req.body.seconds);
  if (!isNaN(seconds) && seconds >= 3 && seconds <= 60) {
    adminControls.bettingDuration = seconds;
    if (gameState.phase === 'betting') {
      gameState.countdown = seconds;
    }
    broadcastAdminUpdate();
    return res.json({ success: true, bettingDuration: seconds });
  }
  res.status(400).json({ error: 'Invalid duration (3-60 allowed)' });
});

app.post('/api/admin/broadcast', (req, res) => {
  const message = (req.body.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Message cannot be empty' });
  io.emit('admin_announcement', { message, timestamp: Date.now() });
  res.json({ success: true, broadcasted: message });
});

app.get('/api/game/config', (req, res) => {
  res.json({ gameConfig, fruits: FRUITS });
});

app.post('/api/admin/chips', (req, res) => {
  const { chips } = req.body;
  if (Array.isArray(chips) && chips.length === 4) {
    gameConfig.chipDenominations = chips.map(c => {
      const amt = Math.max(1, parseInt(c.amount) || 1000);
      let lbl = c.label;
      if (!lbl) {
        if (amt >= 1000000) lbl = `${(amt / 1000000).toFixed(amt % 1000000 === 0 ? 0 : 1)}M`;
        else if (amt >= 1000) lbl = `${(amt / 1000).toFixed(0)}K`;
        else lbl = amt.toString();
      }
      return { amount: amt, label: lbl };
    });
    io.emit('config_update', { gameConfig, fruits: FRUITS });
    broadcastAdminUpdate();
    return res.json({ success: true, chipDenominations: gameConfig.chipDenominations });
  }
  res.status(400).json({ error: 'Array of 4 chips required' });
});

app.post('/api/admin/multipliers', (req, res) => {
  const { multipliers } = req.body;
  if (multipliers && typeof multipliers === 'object') {
    for (const [idxStr, mult] of Object.entries(multipliers)) {
      const idx = parseInt(idxStr);
      const m = parseInt(mult);
      if (!isNaN(idx) && idx >= 0 && idx < FRUITS.length && !isNaN(m) && m > 0) {
        FRUITS[idx].multiplier = m;
      }
    }
    io.emit('config_update', { gameConfig, fruits: FRUITS });
    broadcastAdminUpdate();
    return res.json({ success: true, fruits: FRUITS });
  }
  res.status(400).json({ error: 'Multipliers object required' });
});

app.post('/api/admin/commission', (req, res) => {
  const comm = parseFloat(req.body.commission);
  if (!isNaN(comm) && comm >= 0 && comm <= 50) {
    gameConfig.commissionPercent = comm;
    if (req.body.deductionType) {
      gameConfig.commissionDeductionType = req.body.deductionType;
    }
    io.emit('config_update', { gameConfig, fruits: FRUITS });
    broadcastAdminUpdate();
    return res.json({
      success: true,
      commissionPercent: comm,
      deductionType: gameConfig.commissionDeductionType,
      totalCommissionEarned: gameState.totalCommissionEarned || 0,
    });
  }
  res.status(400).json({ error: 'Commission 0-50 required' });
});

app.post('/api/admin/win-rate', (req, res) => {
  const rate = parseFloat(req.body.winRate);
  if (!isNaN(rate) && rate >= 0 && rate <= 100) {
    gameConfig.winRatePercent = rate;
    io.emit('config_update', { gameConfig, fruits: FRUITS });
    broadcastAdminUpdate();
    return res.json({ success: true, winRatePercent: rate });
  }
  res.status(400).json({ error: 'Win rate 0-100 required' });
});

app.post('/api/admin/algorithm', (req, res) => {
  const { preset } = req.body;
  const validPresets = ['competitive', 'house_margin', 'target_win_rate', 'fair_rng', 'anti_whale'];
  if (validPresets.includes(preset)) {
    gameConfig.algorithmPreset = preset;
    broadcastAdminUpdate();
    return res.json({ success: true, algorithmPreset: preset });
  }
  res.status(400).json({ error: 'Invalid preset name' });
});

// ─── Start Server ────────────────────────────────────────────────────────────
async function start() {

  await initDb();
  startGameLoop();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎰 Chinese Fruit Slot Machine Server running on port ${PORT}`);
    console.log(`📡 WebSocket ready on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  });
}

start().catch(err => {
  console.error('Fatal startup error:', err);
});
