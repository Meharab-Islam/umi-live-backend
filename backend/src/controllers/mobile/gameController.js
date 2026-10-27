import crypto from 'crypto';
import { getPool, query } from '../../config/db.js';
import { cache } from '../../config/redis.js';
import { publishAdminEvent, publishGameEvent } from '../../services/pubSubService.js';

// Fallback metadata for all 7 integrated games if DB is not yet populated
export const INTEGRATED_GAMES = [
  {
    id: 1,
    slug: 'big_eater',
    name: 'Big Eater',
    description: 'Fast-paced multiplayer food betting game with suspenseful spins, multipliers, and scheduled feast events.',
    category: 'wheel',
    icon_url: '/games/big_eater/images/icon.png',
    web_url: '/games/big_eater',
    admin_url: '/games/big_eater/admin.html',
    port: 5061,
    is_active: 1,
    min_bet: 500,
    max_bet: 100000,
    chips: [500, 5000, 50000, 100000],
    settings: { rtp: 95, roundDuration: 15, cooldownDuration: 8 },
  },
  {
    id: 2,
    slug: 'slote_mecine',
    name: 'Fruit Slot Machine',
    description: 'Authentic 24-lamp Chinese Fruit Slot with classic Bar, 77, Bell, and Fruit odds and progressive Jackpot.',
    category: 'slots',
    icon_url: '/games/slote_mecine/icon.png',
    web_url: '/games/slote_mecine',
    admin_url: '/games/slote_mecine/admin.html',
    port: 5062,
    is_active: 1,
    min_bet: 100,
    max_bet: 50000,
    chips: [100, 500, 1000, 5000],
    settings: { jackpot: 1887773133, preset: 'competitive' },
  },
  {
    id: 3,
    slug: 'ferrywheel',
    name: 'Ferry Wheel',
    description: 'High-stakes spinning lucky wheel with 8 prize sectors, customizable odds, and live countdowns.',
    category: 'wheel',
    icon_url: '/games/ferrywheel/logo192.png',
    web_url: '/games/ferrywheel',
    admin_url: '/games/ferrywheel',
    port: 5063,
    is_active: 1,
    min_bet: 100,
    max_bet: 100000,
    chips: [100, 200, 300, 400, 500],
    settings: { minWinPercent: 25, maxWinPercent: 100 },
  },
  {
    id: 4,
    slug: 'greedybaby',
    name: 'Greedy Baby',
    description: 'Vibrant animal and baby lucky prize wheel with real-time multiplayer rounds and instant payouts.',
    category: 'wheel',
    icon_url: '/games/greedybaby/logo192.png',
    web_url: '/games/greedybaby',
    admin_url: '/games/greedybaby',
    port: 5064,
    is_active: 1,
    min_bet: 100,
    max_bet: 100000,
    chips: [100, 200, 300, 400, 500],
    settings: { minWinPercent: 25, maxWinPercent: 100 },
  },
  {
    id: 5,
    slug: 'greedylion',
    name: 'Greedy Lion',
    description: 'African safari themed fortune wheel with roar multipliers and competitive leaderboards.',
    category: 'wheel',
    icon_url: '/games/greedylion/logo192.png',
    web_url: '/games/greedylion',
    admin_url: '/games/greedylion',
    port: 5065,
    is_active: 1,
    min_bet: 100,
    max_bet: 100000,
    chips: [100, 200, 300, 400, 500],
    settings: { minWinPercent: 25, maxWinPercent: 100 },
  },
  {
    id: 6,
    slug: 'roulettecasino',
    name: 'Roulette Casino',
    description: 'Classic European casino roulette wheel with inside and outside number betting and live statistics.',
    category: 'casino',
    icon_url: '/games/roulettecasino/logo192.png',
    web_url: '/games/roulettecasino',
    admin_url: '/games/roulettecasino',
    port: 5066,
    is_active: 1,
    min_bet: 50,
    max_bet: 100000,
    chips: [50, 100, 500, 1000, 5000],
    settings: { minWinPercent: 25, maxWinPercent: 100 },
  },
  {
    id: 7,
    slug: 'teenpatti',
    name: 'Teen Patti Live',
    description: 'Popular South Asian 3-card poker game with live tables, side bets, and real-time multiplayer play.',
    category: 'cards',
    icon_url: '/games/teenpatti/logo192.png',
    web_url: '/games/teenpatti',
    admin_url: '/games/teenpatti',
    port: 5067,
    is_active: 1,
    min_bet: 100,
    max_bet: 100000,
    chips: [100, 500, 1000, 5000, 10000],
    settings: { minWinPercent: 25, maxWinPercent: 100 },
  },
];

/**
 * Format game row with absolute URLs and parsed JSON
 */
function formatGameRow(game, baseUrl, protocol, host) {
  let chips = game.chips;
  let settings = game.settings;

  if (typeof chips === 'string') {
    try { chips = JSON.parse(chips); } catch (e) { chips = [100, 500, 1000, 5000]; }
  }
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
  }

  const dedicatedHost = host.includes(':') ? host.split(':')[0] : host;
  const dedicatedUrl = `${protocol}://${dedicatedHost}:${game.port || 5060}`;

  return {
    id: game.id,
    slug: game.slug,
    name: game.name,
    description: game.description,
    category: game.category,
    icon_url: game.icon_url?.startsWith('http') ? game.icon_url : `${baseUrl}${game.icon_url}`,
    web_url: game.web_url?.startsWith('http') ? game.web_url : `${baseUrl}${game.web_url}`,
    admin_url: game.admin_url?.startsWith('http') ? game.admin_url : `${baseUrl}${game.admin_url}`,
    dedicated_url: dedicatedUrl,
    socket_url: baseUrl,
    dedicated_socket_url: dedicatedUrl,
    is_active: Boolean(game.is_active),
    min_bet: game.min_bet || 100,
    max_bet: game.max_bet || 100000,
    chips: chips || [100, 500, 1000, 5000],
    settings: settings || {},
    supports_socket: true,
    is_multiplayer: true,
  };
}

/**
 * GET /api/mobile/games (or /api/games)
 * Retrieve active games catalog for mobile clients (Cache-Aside with Redis)
 */
export async function getGamesList(req, res) {
  try {
    const host = req.get('host') || `localhost:${process.env.BACKEND_PORT || 5050}`;
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const games = await cache.getOrSet('games:active', 60, async () => {
      let rows = [];
      try {
        rows = await query('SELECT * FROM mini_games WHERE is_active = TRUE ORDER BY id ASC');
      } catch (e) {
        rows = [];
      }

      if (!rows || rows.length === 0) {
        rows = INTEGRATED_GAMES.filter((g) => g.is_active);
      }

      return rows.map((g) => formatGameRow(g, baseUrl, protocol, host));
    });

    return res.json({
      success: true,
      message: 'Active games retrieved successfully',
      count: games.length,
      games,
    });
  } catch (err) {
    console.error('[Game Controller] getGamesList error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve games catalog' });
  }
}

/**
 * GET /api/mobile/games/:slug
 * Retrieve specific game metadata and status
 */
export async function getGameDetails(req, res) {
  try {
    const { slug } = req.params;
    const host = req.get('host') || `localhost:${process.env.BACKEND_PORT || 5050}`;
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    let game = null;
    try {
      const rows = await query('SELECT * FROM mini_games WHERE slug = ? LIMIT 1', [slug]);
      if (rows && rows.length > 0) {
        game = rows[0];
      }
    } catch (e) {}

    if (!game) {
      game = INTEGRATED_GAMES.find((g) => g.slug === slug || String(g.id) === slug);
    }

    if (!game) {
      return res.status(404).json({ success: false, message: `Game '${slug}' not found` });
    }

    return res.json({
      success: true,
      game: formatGameRow(game, baseUrl, protocol, host),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/admin/games
 * Retrieve ALL games (both active and disabled) for Admin Panel Management
 */
export async function getAdminGamesList(req, res) {
  try {
    const host = req.get('host') || `localhost:${process.env.BACKEND_PORT || 5050}`;
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const games = await cache.getOrSet('games:admin_all', 30, async () => {
      let rows = [];
      try {
        rows = await query('SELECT * FROM mini_games ORDER BY id ASC');
      } catch (e) {}

      if (!rows || rows.length === 0) {
        rows = INTEGRATED_GAMES;
      }

      return rows.map((g) => formatGameRow(g, baseUrl, protocol, host));
    });

    return res.json({
      success: true,
      count: games.length,
      games,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PATCH /api/admin/games/:id/toggle
 * Toggle game enable / disable state in MySQL and broadcast via Redis Pub/Sub
 */
export async function toggleGameStatus(req, res) {
  const { id } = req.params;
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute('SELECT id, slug, name, is_active FROM mini_games WHERE id = ? OR slug = ?', [id, id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    const game = rows[0];
    const newStatus = !game.is_active;

    await connection.execute('UPDATE mini_games SET is_active = ? WHERE id = ?', [newStatus, game.id]);
    await connection.commit();

    // Invalidate Redis caches immediately
    await cache.del('games:active');
    await cache.del('games:admin_all');
    await cache.del('games:catalog');

    // Broadcast status change via Redis Pub/Sub to all instances
    await publishAdminEvent('game:status_toggle', {
      gameId: game.id,
      slug: game.slug,
      name: game.name,
      isActive: Boolean(newStatus),
      timestamp: Date.now(),
    });

    return res.json({
      success: true,
      message: `${game.name} is now ${newStatus ? 'ENABLED (Active)' : 'DISABLED (Under Maintenance)'}`,
      gameId: game.id,
      slug: game.slug,
      isActive: Boolean(newStatus),
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
}

/**
 * PUT /api/admin/games/:id
 * Update game configurations (min_bet, max_bet, chips, settings)
 */
export async function updateGameSettings(req, res) {
  const { id } = req.params;
  const { min_bet, max_bet, chips, settings, name, description } = req.body;
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute('SELECT id, slug, name FROM mini_games WHERE id = ? OR slug = ?', [id, id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    const game = rows[0];

    await connection.execute(
      `UPDATE mini_games SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        min_bet = COALESCE(?, min_bet),
        max_bet = COALESCE(?, max_bet),
        chips = COALESCE(?, chips),
        settings = COALESCE(?, settings)
       WHERE id = ?`,
      [
        name || null,
        description || null,
        min_bet !== undefined ? parseInt(min_bet, 10) : null,
        max_bet !== undefined ? parseInt(max_bet, 10) : null,
        chips ? JSON.stringify(chips) : null,
        settings ? JSON.stringify(settings) : null,
        game.id,
      ]
    );

    await connection.commit();

    await cache.del('games:active');
    await cache.del('games:admin_all');
    await cache.del('games:catalog');

    await publishAdminEvent('game:settings_updated', {
      gameId: game.id,
      slug: game.slug,
      min_bet,
      max_bet,
      chips,
      settings,
    });

    return res.json({
      success: true,
      message: `Updated settings for ${game.name} successfully`,
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
}

/**
 * POST /api/games/webhook (or /api/mobile/games/webhook)
 * Secure Webhook endpoint to sync game round settlements and wallet bets/wins
 */
export async function handleGameWebhook(req, res) {
  const secret = process.env.GAME_WEBHOOK_SECRET || 'umi_game_webhook_secret_key_2026';
  const signature = req.headers['x-game-signature'] || req.headers['x-webhook-signature'];

  if (signature) {
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
    if (signature !== expected) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }
  }

  const { event, gameId, data } = req.body || {};

  try {
    if (event === 'test:ping') {
      return res.json({ success: true, message: 'Pong! Webhook is operational.' });
    }

    if (event === 'bet:placed' && data?.userId && data?.amount) {
      await publishGameEvent('game:user:bet', {
        userId: data.userId,
        amount: data.amount,
        gameId: gameId || 'mini_game',
      });
    }

    if (event === 'round:settled' && Array.isArray(data?.winners)) {
      for (const winner of data.winners) {
        if (winner.userId && winner.winAmount > 0) {
          await publishGameEvent('game:user:win', {
            userId: winner.userId,
            amount: winner.winAmount,
            gameId: gameId || 'mini_game',
          });
        }
      }
    }

    return res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (err) {
    console.error('[Game Webhook Error]:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export default {
  INTEGRATED_GAMES,
  getGamesList,
  getGameDetails,
  getAdminGamesList,
  toggleGameStatus,
  updateGameSettings,
  handleGameWebhook,
};
