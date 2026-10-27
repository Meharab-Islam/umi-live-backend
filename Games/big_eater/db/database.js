const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_FILE = process.env.DB_PATH || path.join(__dirname, '../data/game.db');
const DATA_DIR = path.dirname(DB_FILE);

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_FILE);

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('cache_size = -8000');

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    session_id   TEXT PRIMARY KEY,
    balance      INTEGER NOT NULL DEFAULT 0,
    today_profit INTEGER NOT NULL DEFAULT 0,
    total_bets   INTEGER NOT NULL DEFAULT 0,
    total_wins   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    round_number INTEGER UNIQUE NOT NULL,
    winner_id    INTEGER NOT NULL,
    started_at   TEXT DEFAULT (datetime('now')),
    ended_at     TEXT
  );

  CREATE TABLE IF NOT EXISTS bets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id   TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    food_id      INTEGER NOT NULL,
    amount       INTEGER NOT NULL,
    won          INTEGER NOT NULL DEFAULT 0,
    win_amount   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES players(session_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_bets_session_round ON bets(session_id, round_number);
  CREATE INDEX IF NOT EXISTS idx_rounds_desc ON rounds(round_number DESC);

  CREATE TABLE IF NOT EXISTS game_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migration: add name and avatar to players
try { db.exec(`ALTER TABLE players ADD COLUMN name TEXT DEFAULT 'Player'`); } catch (_) {}
try { db.exec(`ALTER TABLE players ADD COLUMN avatar TEXT DEFAULT '😎'`); } catch (_) {}
// Migration: add special_event and winner_ids to rounds
try { db.exec(`ALTER TABLE rounds ADD COLUMN special_event TEXT DEFAULT NULL`); } catch (_) {}
try { db.exec(`ALTER TABLE rounds ADD COLUMN winner_ids TEXT DEFAULT NULL`); } catch (_) {}

// ─── Prepared Statements ──────────────────────────────────────────────────────
const stmts = {
  getSetting: db.prepare(`SELECT value FROM game_settings WHERE key = ?`),
  setSetting: db.prepare(`
    INSERT INTO game_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now')
  `),

  upsertPlayer: db.prepare(`
    INSERT INTO players (session_id, name, avatar) VALUES (@sessionId, @name, @avatar)
    ON CONFLICT(session_id) DO UPDATE SET
      name = CASE WHEN @name IS NOT NULL AND @name != '' THEN @name ELSE players.name END,
      avatar = CASE WHEN @avatar IS NOT NULL AND @avatar != '' THEN @avatar ELSE players.avatar END,
      updated_at = datetime('now')
  `),

  syncBalance: db.prepare(`
    UPDATE players SET balance = ?, updated_at = datetime('now')
    WHERE session_id = ?
  `),

  getPlayer: db.prepare(`SELECT * FROM players WHERE session_id = ?`),

  deductBalance: db.prepare(`
    UPDATE players
    SET balance    = balance - ?,
        total_bets = total_bets + 1,
        updated_at = datetime('now')
    WHERE session_id = ?
  `),

  creditWin: db.prepare(`
    UPDATE players
    SET balance      = balance + ?,
        today_profit = today_profit + ?,
        total_wins   = total_wins + 1,
        updated_at   = datetime('now')
    WHERE session_id = ?
  `),

  creditLoss: db.prepare(`
    UPDATE players
    SET today_profit = today_profit - ?,
        updated_at   = datetime('now')
    WHERE session_id = ?
  `),

  insertBet: db.prepare(`
    INSERT INTO bets (session_id, round_number, food_id, amount)
    VALUES (?, ?, ?, ?)
  `),

  updateBetResult: db.prepare(`
    UPDATE bets SET won = ?, win_amount = ?
    WHERE session_id = ? AND round_number = ? AND food_id = ?
  `),

  insertRound: db.prepare(`
    INSERT INTO rounds (round_number, winner_id, special_event, winner_ids, ended_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(round_number) DO UPDATE SET
      winner_id     = excluded.winner_id,
      special_event = excluded.special_event,
      winner_ids    = excluded.winner_ids,
      ended_at      = datetime('now')
  `),

  getMaxRound: db.prepare(`
    SELECT COALESCE(MAX(round_number), 0) AS max_round
    FROM rounds
  `),

  getHistory: db.prepare(`
    SELECT round_number, winner_id, special_event, winner_ids
    FROM rounds
    ORDER BY round_number DESC
    LIMIT ?
  `),

  recharge: db.prepare(`
    UPDATE players SET balance = balance + 5000, updated_at = datetime('now')
    WHERE session_id = ?
  `),

  getLeaderboard: db.prepare(`
    SELECT session_id, balance, total_wins, today_profit
    FROM players
    ORDER BY balance DESC
    LIMIT 10
  `),

  getAllPlayers: db.prepare(`
    SELECT session_id, name, avatar, balance, today_profit, total_bets, total_wins, created_at, updated_at
    FROM players
    ORDER BY updated_at DESC
    LIMIT ?
  `),

  setPlayerBalance: db.prepare(`
    UPDATE players SET balance = ?, updated_at = datetime('now')
    WHERE session_id = ?
  `),

  addPlayerBalance: db.prepare(`
    UPDATE players SET balance = balance + ?, updated_at = datetime('now')
    WHERE session_id = ?
  `),

  getDetailedRounds: db.prepare(`
    SELECT r.round_number, r.winner_id, r.special_event, r.winner_ids, r.started_at, r.ended_at,
           COUNT(b.id) as total_bets,
           COALESCE(SUM(b.amount), 0) as total_volume,
           COALESCE(SUM(b.win_amount), 0) as total_payout
    FROM rounds r
    LEFT JOIN bets b ON b.round_number = r.round_number
    GROUP BY r.round_number
    ORDER BY r.round_number DESC
    LIMIT ?
  `),

  getOverallStats: db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM players) as total_players,
      (SELECT COUNT(*) FROM rounds) as total_rounds,
      (SELECT COALESCE(SUM(amount), 0) FROM bets) as total_volume,
      (SELECT COALESCE(SUM(win_amount), 0) FROM bets) as total_payout
  `),

  resetRoundsAndBets: db.prepare(`
    DELETE FROM bets;
  `),
};

// Transactional bet processing supporting single & multi-food winning outcomes (Special Events: All Veggies, Pizza Fire)
const processBetsTx = db.transaction((bets, winnerIds, roundNumber, foods, specialEvent = null) => {
  const results = {};
  const winningIds = Array.isArray(winnerIds) ? winnerIds.map(Number) : [Number(winnerIds)];

  for (const [sessionId, playerBets] of Object.entries(bets)) {
    if (!playerBets || typeof playerBets !== 'object') continue;
    let totalBet = 0;
    let totalWinAmount = 0;
    let won = false;
    const wonItems = [];

    for (const [foodIdStr, amount] of Object.entries(playerBets)) {
      const foodId = parseInt(foodIdStr);
      const betAmt = parseInt(amount) || 0;
      totalBet += betAmt;
      const isWinner = winningIds.includes(foodId);
      const foodObj = foods.find(f => f.id === foodId);
      const mult = foodObj ? foodObj.multiplier : 1;
      const winForFood = isWinner ? (betAmt * mult) : 0;

      if (isWinner && winForFood > 0) {
        won = true;
        totalWinAmount += winForFood;
        wonItems.push({
          foodId,
          name: foodObj?.name || 'Food',
          emoji: foodObj?.emoji || '🍽️',
          multiplier: mult,
          betAmt,
          winAmount: winForFood,
        });
      }
      stmts.updateBetResult.run(isWinner ? 1 : 0, winForFood, sessionId, roundNumber, foodId);
    }

    const netProfit = totalWinAmount - totalBet;

    if (totalWinAmount > 0) {
      stmts.creditWin.run(totalWinAmount, netProfit, sessionId);
    } else {
      stmts.creditLoss.run(totalBet, sessionId);
    }

    const player = stmts.getPlayer.get(sessionId);
    results[sessionId] = {
      won,
      totalBet,
      winAmount: totalWinAmount,
      netProfit,
      winningFoodBet: winningIds.reduce((acc, wid) => acc + (playerBets[wid] || 0), 0),
      wonItems,
      playerBets,
      balance: player.balance,
      todayProfit: player.today_profit,
    };
  }
  return results;
});

function getSetting(key, fallback = null) {
  try {
    const row = stmts.getSetting.get(key);
    if (!row) return fallback;
    return JSON.parse(row.value);
  } catch (_) {
    return fallback;
  }
}

function setSetting(key, value) {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    stmts.setSetting.run(key, str);
  } catch (err) {
    console.error('Failed to setSetting:', err);
  }
}

module.exports = { db, stmts, processBetsTx, getSetting, setSetting };
