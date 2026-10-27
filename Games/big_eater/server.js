const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');
const crypto     = require('crypto');
const dotenv     = require('dotenv');

// Load environment variables from root and local .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const { stmts, processBetsTx, getSetting, setSetting } = require('./db/database');
const gameUserBridge = require('../gameUserBridge.js');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = parseInt(process.env.GAME_BIG_EATER_PORT || process.env.PORT || '5061', 10);
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
    console.log(`🔌 [Big Eater] Connected to Main Backend Socket.IO at ${BACKEND_URL}`);
    mainBackendSocket.emit('game:register', {
      gameId: 'big_eater',
      name: 'Big Eater',
      port: PORT,
      timestamp: Date.now(),
    });
  });
  mainBackendSocket.on('connect_error', () => {
    // Graceful silent fallback if main backend is starting up
  });
} catch (e) {
  console.warn('[Big Eater] Main backend socket client not loaded:', e.message);
}

app.use(cors());
app.use(express.json());


// Prevent stale browser cache / service worker issues from other apps on port 3000
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

// ─── Foods Config (Mutable for Admin Config) ──────────────────────────────────
let FOODS = [
  { id: 0, name: 'Sausage',  emoji: '🍖', multiplier: 10, weight: 30 },
  { id: 1, name: 'Chicken',  emoji: '🍗', multiplier: 15, weight: 22 },
  { id: 2, name: 'Shrimp',   emoji: '🦐', multiplier: 25, weight: 14 },
  { id: 3, name: 'Steak',    emoji: '🥩', multiplier: 45, weight:  6 },
  { id: 4, name: 'Tomato',   emoji: '🍅', multiplier:  5, weight: 50 },
  { id: 5, name: 'Radish',   emoji: '🌸', multiplier:  5, weight: 50 },
  { id: 6, name: 'Mushroom', emoji: '🍄', multiplier:  5, weight: 50 },
  { id: 7, name: 'Corn',     emoji: '🌽', multiplier:  5, weight: 50 },
];

let ROUND_DURATION   = 15;  // seconds for betting
let COOLDOWN_DURATION = 8;  // seconds to spin (suspenseful slow rolling) & show result
let CHIP_AMOUNTS      = [500, 5000, 50000, 100000]; // configurable from Admin Panel

// ─── Webhook Engine (Mobile App / External API Integration) ───────────────────
let WEBHOOK_URL    = process.env.GAME_WEBHOOK_URL || process.env.WEBHOOK_URL || `http://localhost:${process.env.BACKEND_PORT || 5050}/api/games/webhook`;
let WEBHOOK_SECRET = process.env.GAME_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || 'umi_game_webhook_secret_key_2026';


// ─── Time Scheduler & Special Events Configuration ──────────────────────────────
let SERVER_TIMEZONE   = process.env.TZ || 'Asia/Dhaka';
let SCHEDULED_EVENTS  = [];
let armedSpecialEvent = null; // Armed for immediate next round (manual trigger or time match)

function getLocalTimeString(tz = SERVER_TIMEZONE) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch (_) {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

function getLocalDateString(tz = SERVER_TIMEZONE) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch (_) {
    return new Date().toISOString().slice(0, 10);
  }
}

function getFullLocalTimeString(tz = SERVER_TIMEZONE) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch (_) {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }
}

function checkScheduledEventsOnTick() {
  const currentTime = getLocalTimeString(SERVER_TIMEZONE);
  const todayStr = getLocalDateString(SERVER_TIMEZONE);

  for (const event of SCHEDULED_EVENTS) {
    if (!event.enabled) continue;
    if (event.time === currentTime && event.lastTriggeredDate !== todayStr) {
      if (!armedSpecialEvent) {
        armedSpecialEvent = {
          id: 'sched_' + event.id + '_' + Date.now(),
          type: event.type,
          name: event.name || (event.type === 'all_vegetables' ? 'All Vegetables Feast' : event.type === 'pizza_fire' ? 'Pizza Fire (Meat & Fish)' : 'Scheduled Drop'),
          targetFoodId: event.targetFoodId !== undefined && event.targetFoodId !== null ? parseInt(event.targetFoodId, 10) : null,
          customFoodIds: Array.isArray(event.customFoodIds) ? event.customFoodIds.map(Number) : [],
          scheduledEventId: event.id,
        };
        event.lastTriggeredDate = todayStr;
        if (!event.repeatDaily) {
          event.enabled = false;
        }
        setSetting('scheduled_events', SCHEDULED_EVENTS);
        console.log(`⏰ [Scheduler] Time reached (${currentTime})! Armed: "${armedSpecialEvent.name}" (${event.type})`);
        io.to('admin').emit('admin:liveState', getAdminState());
        io.to('admin').emit('admin:schedulesList', {
          schedules: SCHEDULED_EVENTS,
          armedEvent: armedSpecialEvent,
          serverTime: getFullLocalTimeString(SERVER_TIMEZONE),
          timezone: SERVER_TIMEZONE,
          serverTimestamp: Date.now(),
        });
        io.emit('round:specialAnnouncement', {
          type: event.type,
          name: armedSpecialEvent.name,
        });
      }
    }
  }
}

function checkScheduledEvents() {
  if (armedSpecialEvent) return armedSpecialEvent;
  checkScheduledEventsOnTick();
  return armedSpecialEvent;
}

// Load persisted settings from database if available
try {
  const savedFoods = getSetting('foods_config', null);
  if (Array.isArray(savedFoods) && savedFoods.length === 8) {
    FOODS = savedFoods;
    console.log('✅ Loaded persisted Food Multipliers & Weights from DB');
  }
  const savedChips = getSetting('chip_amounts', null);
  if (Array.isArray(savedChips) && savedChips.length >= 2) {
    CHIP_AMOUNTS = savedChips;
    console.log('✅ Loaded persisted Chip Amounts from DB');
  }
  const savedTimers = getSetting('timers_config', null);
  if (savedTimers && savedTimers.roundDuration) {
    ROUND_DURATION = savedTimers.roundDuration;
    COOLDOWN_DURATION = savedTimers.cooldownDuration;
    console.log('✅ Loaded persisted Timers from DB');
  }
  const savedWebhook = getSetting('webhook_config', null);
  if (savedWebhook) {
    if (savedWebhook.url !== undefined) WEBHOOK_URL = savedWebhook.url;
    if (savedWebhook.secret !== undefined) WEBHOOK_SECRET = savedWebhook.secret;
    console.log('✅ Loaded persisted Webhook settings from DB');
  }
  const savedTz = getSetting('server_timezone', null);
  if (savedTz) SERVER_TIMEZONE = savedTz;

  const savedSchedules = getSetting('scheduled_events', null);
  if (Array.isArray(savedSchedules)) {
    SCHEDULED_EVENTS = savedSchedules;
    console.log(`✅ Loaded ${SCHEDULED_EVENTS.length} Scheduled Events from DB`);
  }
} catch (err) {
  console.warn('Could not load persisted settings on startup:', err.message);
}

async function sendWebhook(event, data) {
  if (!WEBHOOK_URL) return null;
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BigEater-Signature': signature,
        'X-BigEater-Event': event,
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    console.log(`[Webhook] '${event}' -> ${WEBHOOK_URL} [HTTP ${res.status}]`);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.error(`[Webhook Error] '${event}' -> ${WEBHOOK_URL}: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ─── Admin Controller State ────────────────────────────────────────────────────
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'bigeater888';

const adminControl = {
  mode: 'auto',           // 'auto' | 'manual' | 'house_profit' | 'player_favor'
  forcedWinnerId: null,   // null or 0..7
  isPaused: false,        // pauses round countdown
  autoClearRig: false,    // resets forcedWinnerId to null after 1 round
};

// ─── Game State ────────────────────────────────────────────────────────────────
const maxDbRound = (stmts.getMaxRound && stmts.getMaxRound.get())?.max_round || 0;
const initialRound = maxDbRound > 0 ? (maxDbRound + 1) : 388;

const game = {
  roundNumber: initialRound,
  phase: 'betting',      // 'betting' | 'revealing'
  remaining: ROUND_DURATION,
  winnerId: null,
  bets: {},              // { sessionId: { foodId, amount } }
};

function weightedRandom() {
  const total = FOODS.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FOODS) { r -= f.weight; if (r <= 0) return f.id; }
  return 0;
}

function getBetStats() {
  return FOODS.map(f => {
    let count = 0;
    let totalAmount = 0;
    for (const playerBets of Object.values(game.bets)) {
      if (playerBets && playerBets[f.id]) {
        count++;
        totalAmount += playerBets[f.id];
      }
    }
    return { foodId: f.id, count, totalAmount };
  });
}

function calculateFoodOutcomes() {
  let totalPool = 0;
  const betsOnFood = {};
  const bettorsOnFood = {};
  const bettorDetailsOnFood = {};
  for (let i = 0; i < FOODS.length; i++) {
    betsOnFood[i] = 0;
    bettorsOnFood[i] = 0;
    bettorDetailsOnFood[i] = [];
  }

  for (const [sessionId, playerBets] of Object.entries(game.bets)) {
    if (!playerBets) continue;
    const player = stmts.getPlayer.get(sessionId) || {};
    for (const [fidStr, amt] of Object.entries(playerBets)) {
      const fid = parseInt(fidStr, 10);
      const parsedAmt = amt || 0;
      if (parsedAmt > 0 && fid >= 0 && fid < FOODS.length) {
        totalPool += parsedAmt;
        betsOnFood[fid] = (betsOnFood[fid] || 0) + parsedAmt;
        bettorsOnFood[fid] = (bettorsOnFood[fid] || 0) + 1;
        bettorDetailsOnFood[fid].push({
          sessionId,
          name: player.name || 'Player',
          avatar: player.avatar || '😎',
          amount: parsedAmt,
        });
      }
    }
  }

  return FOODS.map(f => {
    const wageredOnThis = betsOnFood[f.id] || 0;
    const bettorCount = bettorsOnFood[f.id] || 0;
    const potentialPayout = wageredOnThis * f.multiplier;
    const houseProfit = totalPool - potentialPayout;
    const bettors = (bettorDetailsOnFood[f.id] || []).sort((a, b) => b.amount - a.amount);
    return {
      id: f.id,
      name: f.name,
      emoji: f.emoji,
      multiplier: f.multiplier,
      weight: f.weight,
      bettorCount,
      wagered: wageredOnThis,
      potentialPayout,
      houseProfit,
      bettors,
    };
  });
}

function determineWinner() {
  // 1. Manual forced winner
  if (adminControl.mode === 'manual' && adminControl.forcedWinnerId !== null) {
    const chosen = adminControl.forcedWinnerId;
    if (adminControl.autoClearRig) {
      adminControl.forcedWinnerId = null;
      adminControl.mode = 'auto';
    }
    return chosen;
  }

  // 2. House Maximum Profit (Lowest total payout)
  if (adminControl.mode === 'house_profit') {
    const outcomes = calculateFoodOutcomes();
    outcomes.sort((a, b) => b.houseProfit - a.houseProfit);
    return outcomes[0].id;
  }

  // 3. Player Favor Mode (Highest payout / bonanza)
  if (adminControl.mode === 'player_favor') {
    const outcomes = calculateFoodOutcomes();
    outcomes.sort((a, b) => b.potentialPayout - a.potentialPayout);
    return outcomes[0].id;
  }

  // 4. One-time forced winner if set
  if (adminControl.forcedWinnerId !== null) {
    const chosen = adminControl.forcedWinnerId;
    if (adminControl.autoClearRig) {
      adminControl.forcedWinnerId = null;
    }
    return chosen;
  }

  // 5. Default natural probability
  return weightedRandom();
}

function getAdminState() {
  const outcomes = calculateFoodOutcomes();
  const totalVolume = outcomes.reduce((acc, f) => acc + f.wagered, 0);
  const totalPlayersBetting = Object.keys(game.bets).length;

  const participants = Object.entries(game.bets).map(([sessionId, playerBets]) => {
    const p = stmts.getPlayer.get(sessionId) || {};
    let totalBet = 0;
    const items = [];
    for (const [foodIdStr, amt] of Object.entries(playerBets || {})) {
      const fid = parseInt(foodIdStr, 10);
      const amount = parseInt(amt, 10) || 0;
      if (amount > 0 && fid >= 0 && fid < FOODS.length) {
        totalBet += amount;
        const f = FOODS[fid] || { id: fid, name: 'Food ' + fid, emoji: '🍽️', multiplier: 1 };
        items.push({
          foodId: fid,
          foodName: f.name,
          foodEmoji: f.emoji,
          multiplier: f.multiplier,
          amount,
        });
      }
    }
    items.sort((a, b) => b.amount - a.amount);

    return {
      sessionId,
      name: p.name || 'Player',
      avatar: p.avatar || '😎',
      balance: p.balance ?? 0,
      totalBet,
      items,
    };
  }).filter(p => p.totalBet > 0).sort((a, b) => b.totalBet - a.totalBet);

  return {
    roundNumber: game.roundNumber,
    phase: game.phase,
    remaining: game.remaining,
    roundDuration: ROUND_DURATION,
    cooldownDuration: COOLDOWN_DURATION,
    chipAmounts: CHIP_AMOUNTS,
    webhookUrl: WEBHOOK_URL,
    webhookSecret: WEBHOOK_SECRET,
    isPaused: adminControl.isPaused,
    mode: adminControl.mode,
    forcedWinnerId: adminControl.forcedWinnerId,
    autoClearRig: adminControl.autoClearRig,
    armedSpecialEvent,
    serverTime: getFullLocalTimeString(SERVER_TIMEZONE),
    timezone: SERVER_TIMEZONE,
    serverTimestamp: Date.now(),
    scheduledEventsCount: SCHEDULED_EVENTS.filter(e => e.enabled).length,
    schedules: SCHEDULED_EVENTS,
    foods: FOODS,
    outcomes,
    totalVolume,
    totalPlayersBetting,
    participants,
    onlinePlayers: io.engine.clientsCount,
    lastWinnerId: game.winnerId,
  };
}

// ─── Game Loop ─────────────────────────────────────────────────────────────────
let tickInterval = null;

function startRound() {
  game.phase     = 'betting';
  game.remaining = ROUND_DURATION;
  game.winnerId  = null;
  game.bets      = {};

  const history = stmts.getHistory.all(50);
  io.emit('round:start', {
    roundNumber: game.roundNumber,
    remaining: ROUND_DURATION,
    foods: FOODS,
    history,
    chipAmounts: CHIP_AMOUNTS,
  });
  io.emit('history:update', { history });
  io.to('admin').emit('admin:liveState', getAdminState());
  console.log(`🎮 Round ${game.roundNumber} — GO! (Admin Mode: ${adminControl.mode}${adminControl.forcedWinnerId !== null ? ` | Rigged: ${adminControl.forcedWinnerId}` : ''})`);
}

// Determine round outcome considering scheduled events & special drop combos
function determineOutcome() {
  let activeEvent = armedSpecialEvent || checkScheduledEvents();
  if (activeEvent) {
    armedSpecialEvent = null; // consumed for this round
    io.to('admin').emit('admin:liveState', getAdminState());

    if (activeEvent.type === 'all_vegetables') {
      return {
        winnerId: 9, // Salad in Trend/History
        winnerIds: [4, 5, 6, 7], // Tomato, Radish, Mushroom, Corn
        specialEvent: 'all_vegetables',
        eventName: activeEvent.name || 'All Vegetables Feast',
        winnerFood: { id: 9, name: 'All Vegetables (Salad)', emoji: '🥗', multiplier: 'COMBO', isSpecial: 'salad' },
      };
    }
    if (activeEvent.type === 'pizza_fire') {
      return {
        winnerId: 8, // Pizza in Trend/History
        winnerIds: [0, 1, 2, 3], // Sausage, Chicken, Shrimp, Steak
        specialEvent: 'pizza_fire',
        eventName: activeEvent.name || 'Pizza Fire (Meat & Fish)',
        winnerFood: { id: 8, name: 'Pizza Fire (All Meat & Fish)', emoji: '🍕', multiplier: 'COMBO', isSpecial: 'pizza' },
      };
    }
    if (activeEvent.type === 'single_food') {
      const fid = parseInt(activeEvent.targetFoodId, 10) || 0;
      const food = FOODS[fid] || FOODS[0];
      return {
        winnerId: food.id,
        winnerIds: [food.id],
        specialEvent: 'single_food',
        eventName: activeEvent.name || `${food.emoji} ${food.name} Drop`,
        winnerFood: food,
      };
    }
    if (activeEvent.type === 'custom_combo') {
      const customIds = Array.isArray(activeEvent.customFoodIds) && activeEvent.customFoodIds.length > 0
        ? activeEvent.customFoodIds.map(Number)
        : [0];
      return {
        winnerId: customIds[0] ?? 0,
        winnerIds: customIds,
        specialEvent: 'custom_combo',
        eventName: activeEvent.name || 'Custom Combo',
        winnerFood: { id: customIds[0], name: activeEvent.name || 'Custom Combo', emoji: '🎁', multiplier: 'COMBO' },
      };
    }
  }

  // Regular single winner (natural random or admin rig mode)
  const singleWinnerId = determineWinner();
  return {
    winnerId: singleWinnerId,
    winnerIds: [singleWinnerId],
    specialEvent: null,
    eventName: null,
    winnerFood: FOODS[singleWinnerId],
  };
}

function revealResult() {
  const outcome = determineOutcome();
  const winnerId = outcome.winnerId;
  const winnerIds = outcome.winnerIds;
  const specialEvent = outcome.specialEvent;
  const winnerFood = outcome.winnerFood;

  game.winnerId  = winnerId;
  game.phase     = 'revealing';

  // Persist round with special_event and winner_ids
  stmts.insertRound.run(
    game.roundNumber,
    winnerId,
    specialEvent,
    JSON.stringify(winnerIds)
  );

  // Process all bets in one transaction (supports multi-food winning in special events)
  const betResults = processBetsTx(
    game.bets,
    winnerIds,
    game.roundNumber,
    FOODS,
    specialEvent
  );

  // Send real-time Webhook: Round settled with winning food & player win/loss data
  sendWebhook('round:settled', {
    roundNumber: game.roundNumber,
    winnerId,
    winnerIds,
    specialEvent,
    specialTitle: outcome.eventName,
    winnerFood: {
      id: winnerFood.id,
      name: winnerFood.name,
      emoji: winnerFood.emoji,
      multiplier: winnerFood.multiplier,
      isSpecial: winnerFood.isSpecial || null,
    },
    totalBets: Object.values(game.bets).reduce((acc, b) => {
      const sum = Object.values(b).reduce((s, a) => s + a, 0);
      return acc + sum;
    }, 0),
    players: Object.entries(betResults).map(([sessionId, r]) => {
      const p = stmts.getPlayer.get(sessionId);
      return {
        sessionId,
        name: p?.name || 'Player',
        avatar: p?.avatar || '😎',
        won: r.won,
        winAmount: r.winAmount,
        totalBet: r.totalBet,
        netProfit: r.netProfit,
        wonItems: r.wonItems,
        newBalance: r.balance,
        bets: r.playerBets,
      };
    }),
  });

  // Notify each player of their personal result
  for (const [sessionId, result] of Object.entries(betResults)) {
    if (result.won && result.winAmount > 0 && !isNaN(parseInt(sessionId, 10)) && parseInt(sessionId, 10) > 0) {
      gameUserBridge.addCoins(sessionId, result.winAmount, 'big_eater', 'Win on Big Eater');
    }
    io.to(`player:${sessionId}`).emit('player:result', {
      ...result,
      winnerId,
      winnerIds,
      specialEvent,
      specialTitle: outcome.eventName,
      winnerFood,
      roundNumber: game.roundNumber,
    });
  }

  // Broadcast round result to all
  const history = stmts.getHistory.all(50);

  // Build top winners list (only real bettors who actually won)
  const topWinners = Object.entries(betResults)
    .filter(([_, r]) => r.won && r.winAmount > 0)
    .sort((a, b) => b[1].winAmount - a[1].winAmount)
    .slice(0, 3)
    .map(([sessionId, r], i) => {
      const p = stmts.getPlayer.get(sessionId);
      return {
        rank: i + 1,
        displayName: p?.name || 'Player',
        avatar: p?.avatar || '😎',
        winAmount: r.winAmount,
        won: true,
      };
    });

  io.emit('round:result', {
    roundNumber: game.roundNumber,
    winnerId,
    winnerFood,
    winnerIds,
    specialEvent,
    specialTitle: outcome.eventName,
    history,
    topWinners,
  });
  io.emit('history:update', { history });
  io.to('admin').emit('admin:liveState', getAdminState());
  console.log(`🏆 Round ${game.roundNumber} → ${winnerFood.emoji} ${winnerFood.name} ${specialEvent ? `[SPECIAL: ${specialEvent}]` : ''} (${Object.keys(game.bets).length} players bet)`);
}


function startGameLoop() {
  if (tickInterval) clearInterval(tickInterval);
  startRound();

  tickInterval = setInterval(() => {
    // Check scheduled drop events every second (never miss a scheduled minute)
    checkScheduledEventsOnTick();

    if (adminControl.isPaused) {
      io.to('admin').emit('admin:tick', getAdminState());
      return;
    }
    if (game.phase !== 'betting') return;
    game.remaining--;
    io.emit('round:tick', { remaining: game.remaining, roundNumber: game.roundNumber });
    io.to('admin').emit('admin:tick', getAdminState());

    if (game.remaining <= 0) {
      revealResult();
      setTimeout(() => { game.roundNumber++; startRound(); }, COOLDOWN_DURATION * 1000);
    }
  }, 1000);
}

// ─── Socket.io Events ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const playerCount = io.engine.clientsCount;
  io.emit('stats:players', { count: playerCount });

  // ── Join ──
  socket.on('player:join', async ({ sessionId, name, avatar, balance }) => {
    if (!sessionId || typeof sessionId !== 'string') return;
    const cleanName = (name && typeof name === 'string' && name.trim()) ? name.trim().slice(0, 30) : null;
    const cleanAvatar = (avatar && typeof avatar === 'string' && avatar.trim()) ? avatar.trim() : null;

    let realUser = null;
    if (!isNaN(parseInt(sessionId, 10)) && parseInt(sessionId, 10) > 0) {
      try {
        realUser = await gameUserBridge.getUser(sessionId);
      } catch (_) {}
    }

    if (realUser) {
      stmts.upsertPlayer.run({
        sessionId,
        name: realUser.name || cleanName || 'Player',
        avatar: realUser.avatar || cleanAvatar || '😎',
      });
      stmts.syncBalance.run(Math.floor(realUser.balance), sessionId);
    } else {
      stmts.upsertPlayer.run({
        sessionId,
        name: cleanName || 'Player',
        avatar: cleanAvatar || '😎',
      });
      if (typeof balance === 'number' && balance >= 0) {
        stmts.syncBalance.run(Math.floor(balance), sessionId);
      }
    }

    const player = stmts.getPlayer.get(sessionId);
    socket.join(`player:${sessionId}`);
    socket.data.sessionId = sessionId;

    socket.emit('player:state', {
      player,
      game: {
        roundNumber: game.roundNumber,
        phase:       game.phase,
        remaining:   game.remaining,
        winnerId:    game.winnerId,
        betStats:    getBetStats(),
      },
      foods:       FOODS,
      history:     stmts.getHistory.all(50),
      chipAmounts: CHIP_AMOUNTS,
    });
  });

  // ── Place Bet (Allows betting on all 8 food slots) ──
  socket.on('bet:place', ({ foodId, amount }) => {
    const sessionId = socket.data.sessionId;
    if (!sessionId)                       { socket.emit('bet:error', { message: 'Not connected' }); return; }
    if (game.phase !== 'betting')         { socket.emit('bet:error', { message: '⏳ Betting is closed!' }); return; }
    if (game.remaining <= 2)              { socket.emit('bet:error', { message: '⏰ Too late!' }); return; }

    const fid = parseInt(foodId);
    const amt = parseInt(amount);
    if (!CHIP_AMOUNTS.includes(amt)) { socket.emit('bet:error', { message: 'Invalid chip amount' }); return; }
    if (isNaN(fid) || fid < 0 || fid >= FOODS.length) { socket.emit('bet:error', { message: 'Invalid food' }); return; }

    const player = stmts.getPlayer.get(sessionId);
    if (!player || player.balance < amt) { socket.emit('bet:error', { message: '💸 Not enough balance — tap Recharge!' }); return; }

    if (!isNaN(parseInt(sessionId, 10)) && parseInt(sessionId, 10) > 0) {
      gameUserBridge.deductCoins(sessionId, amt, 'big_eater', 'Bet on Big Eater');
    }

    stmts.deductBalance.run(amt, sessionId);
    stmts.insertBet.run(sessionId, game.roundNumber, fid, amt);

    if (!game.bets[sessionId]) game.bets[sessionId] = {};
    game.bets[sessionId][fid] = (game.bets[sessionId][fid] || 0) + amt;

    const updated = stmts.getPlayer.get(sessionId);
    socket.emit('bet:confirmed', {
      foodId: fid,
      amount: amt,
      foodTotal: game.bets[sessionId][fid],
      playerBets: game.bets[sessionId],
      balance: updated.balance,
      roundNumber: game.roundNumber,
    });

    // Send real-time Webhook: Bet placed
    sendWebhook('bet:placed', {
      sessionId,
      name: player.name || 'Player',
      avatar: player.avatar || '😎',
      roundNumber: game.roundNumber,
      foodId: fid,
      foodName: FOODS[fid]?.name,
      amount: amt,
      foodTotal: game.bets[sessionId][fid],
      balanceAfterBet: updated.balance,
    });

    // Broadcast updated bet stats to players and live state to admin
    io.emit('round:betStats', getBetStats());
    io.to('admin').emit('admin:liveState', getAdminState());
  });

  // ── Recharge ──
  socket.on('player:recharge', () => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) return;
    stmts.recharge.run(sessionId);
    const player = stmts.getPlayer.get(sessionId);
    socket.emit('player:update', { balance: player.balance, todayProfit: player.today_profit });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // ── ADMIN PANEL SOCKET CONTROLLER ──
  // ═════════════════════════════════════════════════════════════════════════════

  // Admin Auth (Supports Master Secret Key, fallback key, or SSO Token)
  socket.on('admin:auth', ({ secret, token }) => {
    if (secret === ADMIN_SECRET || secret === 'bigeater888' || Boolean(token)) {
      socket.join('admin');
      socket.data.isAdmin = true;
      socket.emit('admin:authSuccess', { message: 'Admin authenticated successfully' });
      socket.emit('admin:liveState', getAdminState());
      socket.emit('admin:statsSummary', stmts.getOverallStats.get());
    } else {
      socket.emit('admin:authFail', { message: 'Invalid Admin Key' });
    }
  });

  // Set Rigged Winner
  socket.on('admin:setWinner', ({ foodId, autoClear }) => {
    if (!socket.data.isAdmin) return;
    const fid = (foodId === null || foodId === undefined || foodId === -1 || foodId === '') ? null : parseInt(foodId);
    adminControl.forcedWinnerId = fid;
    if (fid !== null) adminControl.mode = 'manual';
    if (typeof autoClear === 'boolean') adminControl.autoClearRig = autoClear;
    io.to('admin').emit('admin:liveState', getAdminState());
    console.log(`[Admin] Forced Winner set to: ${fid !== null ? `${FOODS[fid]?.name} (${fid})` : 'AUTO'}`);
  });

  // Set Control Mode ('auto' | 'manual' | 'house_profit' | 'player_favor')
  socket.on('admin:setMode', ({ mode }) => {
    if (!socket.data.isAdmin) return;
    if (['auto', 'manual', 'house_profit', 'player_favor'].includes(mode)) {
      adminControl.mode = mode;
      if (mode === 'auto') adminControl.forcedWinnerId = null;
      io.to('admin').emit('admin:liveState', getAdminState());
      console.log(`[Admin] Game mode changed to: ${mode}`);
    }
  });

  // Force Spin / Draw Immediately
  socket.on('admin:forceDraw', () => {
    if (!socket.data.isAdmin) return;
    if (game.phase === 'betting') {
      game.remaining = 0;
      revealResult();
      setTimeout(() => { game.roundNumber++; startRound(); }, COOLDOWN_DURATION * 1000);
      io.to('admin').emit('admin:liveState', getAdminState());
      console.log(`[Admin] Force Spin Triggered for Round ${game.roundNumber}`);
    }
  });

  // Pause / Resume Countdown
  socket.on('admin:togglePause', () => {
    if (!socket.data.isAdmin) return;
    adminControl.isPaused = !adminControl.isPaused;
    io.emit('game:pauseState', { isPaused: adminControl.isPaused });
    io.to('admin').emit('admin:liveState', getAdminState());
    console.log(`[Admin] Game paused: ${adminControl.isPaused}`);
  });

  // Player Balance Editor
  socket.on('admin:adjustBalance', ({ sessionId, newBalance, addAmount }) => {
    if (!socket.data.isAdmin || !sessionId) return;
    if (typeof newBalance === 'number') {
      stmts.setPlayerBalance.run(Math.max(0, parseInt(newBalance)), sessionId);
    } else if (typeof addAmount === 'number') {
      stmts.addPlayerBalance.run(parseInt(addAmount), sessionId);
    }
    const updated = stmts.getPlayer.get(sessionId);
    if (updated) {
      io.to(`player:${sessionId}`).emit('player:update', { balance: updated.balance, todayProfit: updated.today_profit });
      socket.emit('admin:playerUpdated', updated);
      socket.emit('admin:playersList', stmts.getAllPlayers.all(50));
    }
  });

  // Update Food Multiplier & Weight Live
  socket.on('admin:updateFood', ({ foodId, multiplier, weight }) => {
    if (!socket.data.isAdmin) return;
    const f = FOODS.find(item => item.id === parseInt(foodId));
    if (f) {
      if (typeof multiplier === 'number' && multiplier > 0) f.multiplier = multiplier;
      if (typeof weight === 'number' && weight > 0) f.weight = weight;
      setSetting('foods_config', FOODS);
      io.emit('game:configUpdate', { foods: FOODS });
      io.to('admin').emit('admin:liveState', getAdminState());
      console.log(`[Admin] Food #${f.id} (${f.name}) updated: ${f.multiplier}X, weight=${f.weight}`);
    }
  });

  // Batch Update All Food Multipliers & Weights Live
  socket.on('admin:updateAllFoods', ({ foods }) => {
    if (!socket.data.isAdmin || !Array.isArray(foods)) return;
    foods.forEach(update => {
      const f = FOODS.find(item => item.id === parseInt(update.id));
      if (f) {
        const m = parseInt(update.multiplier);
        const w = parseInt(update.weight);
        if (!isNaN(m) && m > 0) f.multiplier = m;
        if (!isNaN(w) && w > 0) f.weight = w;
      }
    });
    setSetting('foods_config', FOODS);
    io.emit('game:configUpdate', { foods: FOODS });
    io.to('admin').emit('admin:liveState', getAdminState());
    console.log(`[Admin] All Foods updated live:`, FOODS.map(f => `${f.name}:${f.multiplier}X`).join(', '));
  });

  // Update Timers
  socket.on('admin:updateTimers', ({ roundDuration, cooldownDuration }) => {
    if (!socket.data.isAdmin) return;
    if (typeof roundDuration === 'number' && roundDuration >= 3) ROUND_DURATION = roundDuration;
    if (typeof cooldownDuration === 'number' && cooldownDuration >= 3) COOLDOWN_DURATION = cooldownDuration;
    setSetting('timers_config', { roundDuration: ROUND_DURATION, cooldownDuration: COOLDOWN_DURATION });
    io.to('admin').emit('admin:liveState', getAdminState());
  });

  // Update Chip / Bid Amounts Live from Admin Panel
  socket.on('admin:updateChips', ({ chipAmounts }) => {
    if (!socket.data.isAdmin) return;
    if (Array.isArray(chipAmounts) && chipAmounts.length >= 2) {
      const valid = chipAmounts.map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0);
      if (valid.length >= 2) {
        CHIP_AMOUNTS = valid;
        setSetting('chip_amounts', CHIP_AMOUNTS);
        io.emit('game:chipsUpdate', { chipAmounts: CHIP_AMOUNTS });
        io.to('admin').emit('admin:liveState', getAdminState());
        console.log(`[Admin] Chip / Bid amounts updated live: ${CHIP_AMOUNTS.join(', ')}`);
      }
    }
  });

  // Webhook Settings Update
  socket.on('admin:updateWebhook', ({ webhookUrl, webhookSecret }) => {
    if (!socket.data.isAdmin) return;
    WEBHOOK_URL = (webhookUrl || '').trim();
    if (webhookSecret) WEBHOOK_SECRET = webhookSecret.trim();
    setSetting('webhook_config', { url: WEBHOOK_URL, secret: WEBHOOK_SECRET });
    console.log(`[Admin] Webhook config updated: ${WEBHOOK_URL ? WEBHOOK_URL : '(Disabled)'}`);
    socket.emit('admin:webhookUpdated', { message: 'Webhook settings saved', webhookUrl: WEBHOOK_URL });
    io.to('admin').emit('admin:liveState', getAdminState());
  });

  // Test Webhook Ping
  socket.on('admin:testWebhook', async () => {
    if (!socket.data.isAdmin) return;
    if (!WEBHOOK_URL) {
      socket.emit('admin:testWebhookResult', { success: false, message: 'No Webhook URL configured!' });
      return;
    }
    const res = await sendWebhook('test:ping', {
      message: 'Test ping from Big Eater game server',
      roundNumber: game.roundNumber,
      activePlayers: io.engine.clientsCount,
    });
    if (res && res.ok) {
      socket.emit('admin:testWebhookResult', { success: true, message: 'Ping delivered successfully!', status: res.status });
    } else {
      socket.emit('admin:testWebhookResult', { success: false, message: res?.error || 'Destination returned non-200 status', status: res?.status });
    }
  });

  // Fetch Player List
  socket.on('admin:fetchPlayers', ({ limit = 50 } = {}) => {
    if (!socket.data.isAdmin) return;
    socket.emit('admin:playersList', stmts.getAllPlayers.all(limit));
  });

  // Fetch Detailed Rounds History
  socket.on('admin:fetchRounds', ({ limit = 30 } = {}) => {
    if (!socket.data.isAdmin) return;
    socket.emit('admin:roundsList', stmts.getDetailedRounds.all(limit));
  });

  // Fetch Overview Stats
  socket.on('admin:fetchStats', () => {
    if (!socket.data.isAdmin) return;
    socket.emit('admin:statsSummary', stmts.getOverallStats.get());
  });

  // ── Scheduled Events Management ──
  const broadcastSchedules = () => {
    io.to('admin').emit('admin:schedulesList', {
      schedules: SCHEDULED_EVENTS,
      armedEvent: armedSpecialEvent,
      serverTime: getFullLocalTimeString(SERVER_TIMEZONE),
      timezone: SERVER_TIMEZONE,
      serverTimestamp: Date.now(),
    });
  };

  socket.on('admin:fetchSchedules', () => {
    if (!socket.data.isAdmin) return;
    socket.emit('admin:schedulesList', {
      schedules: SCHEDULED_EVENTS,
      armedEvent: armedSpecialEvent,
      serverTime: getFullLocalTimeString(SERVER_TIMEZONE),
      timezone: SERVER_TIMEZONE,
      serverTimestamp: Date.now(),
    });
  });

  socket.on('admin:saveSchedules', ({ schedules }) => {
    if (!socket.data.isAdmin || !Array.isArray(schedules)) return;
    SCHEDULED_EVENTS = schedules;
    setSetting('scheduled_events', SCHEDULED_EVENTS);
    broadcastSchedules();
    io.to('admin').emit('admin:liveState', getAdminState());
    console.log(`[Admin] Saved ${SCHEDULED_EVENTS.length} scheduled event(s)`);
  });

  socket.on('admin:addSchedule', (scheduleData) => {
    if (!socket.data.isAdmin || !scheduleData) return;
    const rawTime = (scheduleData.time || '11:00').trim();
    let normTime = rawTime;
    const timeParts = rawTime.split(':');
    if (timeParts.length >= 2) {
      normTime = `${String(parseInt(timeParts[0], 10) || 0).padStart(2, '0')}:${String(parseInt(timeParts[1], 10) || 0).padStart(2, '0')}`;
    }
    const newSchedule = {
      id: 'sch_' + Date.now(),
      name: (scheduleData.name || 'Special Drop').trim(),
      time: normTime,
      type: scheduleData.type || 'all_vegetables', // 'all_vegetables' | 'pizza_fire' | 'single_food' | 'custom_combo'
      targetFoodId: scheduleData.targetFoodId !== undefined && scheduleData.targetFoodId !== null ? parseInt(scheduleData.targetFoodId) : null,
      customFoodIds: Array.isArray(scheduleData.customFoodIds) ? scheduleData.customFoodIds.map(Number) : [],
      repeatDaily: scheduleData.repeatDaily !== false,
      enabled: scheduleData.enabled !== false,
      lastTriggeredDate: null,
    };
    SCHEDULED_EVENTS.push(newSchedule);
    setSetting('scheduled_events', SCHEDULED_EVENTS);
    broadcastSchedules();
    io.to('admin').emit('admin:liveState', getAdminState());
    console.log(`[Admin] Added new scheduled event: "${newSchedule.name}" at ${newSchedule.time} (${newSchedule.type})`);
  });

  socket.on('admin:deleteSchedule', ({ id }) => {
    if (!socket.data.isAdmin) return;
    SCHEDULED_EVENTS = SCHEDULED_EVENTS.filter(s => s.id !== id);
    setSetting('scheduled_events', SCHEDULED_EVENTS);
    broadcastSchedules();
    io.to('admin').emit('admin:liveState', getAdminState());
    console.log(`[Admin] Deleted scheduled event id: ${id}`);
  });

  socket.on('admin:toggleSchedule', ({ id, enabled }) => {
    if (!socket.data.isAdmin) return;
    const item = SCHEDULED_EVENTS.find(s => s.id === id);
    if (item) {
      item.enabled = !!enabled;
      setSetting('scheduled_events', SCHEDULED_EVENTS);
      broadcastSchedules();
      io.to('admin').emit('admin:liveState', getAdminState());
      console.log(`[Admin] Toggled scheduled event id: ${id} -> enabled: ${item.enabled}`);
    }
  });

  socket.on('admin:resetScheduleTrigger', ({ id }) => {
    if (!socket.data.isAdmin) return;
    const item = SCHEDULED_EVENTS.find(s => s.id === id);
    if (item) {
      item.lastTriggeredDate = null;
      item.enabled = true;
      setSetting('scheduled_events', SCHEDULED_EVENTS);
      broadcastSchedules();
      io.to('admin').emit('admin:liveState', getAdminState());
      console.log(`[Admin] Reset trigger for scheduled event id: ${id}`);
    }
  });

  socket.on('admin:armSpecialEvent', ({ type, targetFoodId, customFoodIds, name }) => {
    if (!socket.data.isAdmin) return;
    if (!type) {
      armedSpecialEvent = null;
      console.log('[Admin] Disarmed special event');
    } else {
      armedSpecialEvent = {
        id: 'armed_' + Date.now(),
        type, // 'all_vegetables' | 'pizza_fire' | 'single_food' | 'custom_combo'
        name: name || (type === 'all_vegetables' ? 'All Vegetables Feast' : type === 'pizza_fire' ? 'Pizza Fire (Meat & Fish)' : 'Special Event'),
        targetFoodId: targetFoodId !== undefined && targetFoodId !== null ? parseInt(targetFoodId) : null,
        customFoodIds: Array.isArray(customFoodIds) ? customFoodIds.map(Number) : [],
      };
      console.log(`[Admin] Armed special event for NEXT round: "${armedSpecialEvent.name}" (${type})`);
    }
    broadcastSchedules();
    io.to('admin').emit('admin:liveState', getAdminState());
  });

  socket.on('admin:setTimezone', ({ timezone }) => {
    if (!socket.data.isAdmin || !timezone) return;
    SERVER_TIMEZONE = timezone;
    setSetting('server_timezone', timezone);
    broadcastSchedules();
    io.to('admin').emit('admin:liveState', getAdminState());
    console.log(`[Admin] Server timezone set to: ${SERVER_TIMEZONE}`);
  });


  // Reset Bet/Round History
  socket.on('admin:resetHistory', () => {
    if (!socket.data.isAdmin) return;
    stmts.resetRoundsAndBets.run();
    game.roundNumber = 388;
    io.emit('history:update', { history: [] });
    socket.emit('admin:historyResetDone');
    socket.emit('admin:roundsList', stmts.getDetailedRounds.all(30));
    socket.emit('admin:statsSummary', stmts.getOverallStats.get());
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    setTimeout(() => {
      io.emit('stats:players', { count: io.engine.clientsCount });
      io.to('admin').emit('admin:liveState', getAdminState());
    }, 500);
  });
});

// ─── HTTP ─────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, round: game.roundNumber, phase: game.phase, players: io.engine.clientsCount });
});

// Dedicated Admin Panel Route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin REST API for External Automation
app.get('/api/admin/overview', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized: Invalid Admin Key' });
  res.json({
    game: getAdminState(),
    stats: stmts.getOverallStats.get(),
    players: stmts.getAllPlayers.all(20),
    recentRounds: stmts.getDetailedRounds.all(20)
  });
});

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀 Big Eater running → http://localhost:${PORT}`);
  console.log(`🛡️  Admin Panel enabled → http://localhost:${PORT}/admin (Key: ${ADMIN_SECRET})`);
  console.log(`📦 Socket.io + SQLite enabled\n`);
  startGameLoop();
});
