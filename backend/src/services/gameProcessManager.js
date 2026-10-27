import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic candidate paths for Games directory
function resolveGamesRoot() {
  const candidates = [
    path.resolve(__dirname, '../../../Games'),
    path.resolve(__dirname, '../../Games'),
    path.resolve(process.cwd(), 'Games'),
    path.resolve(process.cwd(), '../Games'),
    '/app/Games',
    '/Games',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const GAME_DEFINITIONS = [
  {
    name: 'Big Eater',
    slug: 'big_eater',
    dir: 'big_eater',
    script: 'server.js',
    port: process.env.GAME_BIG_EATER_PORT || 5061,
    color: '\x1b[32m',
  },
  {
    name: 'Slot Machine',
    slug: 'slote_mecine',
    dir: 'slote_mecine',
    script: 'backend/server.js',
    port: process.env.GAME_SLOTE_MECINE_PORT || 5062,
    color: '\x1b[33m',
  },
  {
    name: 'Ferry Wheel',
    slug: 'ferrywheel',
    dir: 'ferrywheel',
    script: 'backend/index.js',
    port: process.env.GAME_FERRYWHEEL_PORT || 5063,
    color: '\x1b[34m',
  },
  {
    name: 'Greedy Baby',
    slug: 'greedybaby',
    dir: 'greedybaby',
    script: 'backend/index.js',
    port: process.env.GAME_GREEDYBABY_PORT || 5064,
    color: '\x1b[95m',
  },
  {
    name: 'Greedy Lion',
    slug: 'greedylion',
    dir: 'greedylion',
    script: 'backend/index.js',
    port: process.env.GAME_GREEDYLION_PORT || 5065,
    color: '\x1b[96m',
  },
  {
    name: 'Roulette Casino',
    slug: 'roulettecasino',
    dir: 'roulettecasino',
    script: 'backend/index.js',
    port: process.env.GAME_ROULETTECASINO_PORT || 5066,
    color: '\x1b[91m',
  },
  {
    name: 'Teen Patti',
    slug: 'teenpatti',
    dir: 'teenpatti',
    script: 'backend/index.js',
    port: process.env.GAME_TEENPATTI_PORT || 5067,
    color: '\x1b[92m',
  },
];

const runningProcesses = new Map();
let isShuttingDown = false;

/**
 * Spawns an individual game process with automatic crash recovery
 */
function spawnGame(def, gamesRoot) {
  if (isShuttingDown) return;

  const gameCwd = path.join(gamesRoot, def.dir);
  const scriptPath = path.join(gameCwd, def.script);

  if (!fs.existsSync(scriptPath)) {
    console.warn(`[GameManager] Warning: Entry point not found for ${def.name}: ${scriptPath}`);
    return;
  }

  const prefix = `${def.color}[Game: ${def.name}]\x1b[0m `;
  console.log(`${prefix}Starting server on port ${def.port}...`);

  const env = {
    ...process.env,
    PORT: String(def.port),
    NODE_ENV: process.env.NODE_ENV || 'production',
    MONGO_URI: process.env.MONGO_URI || 'mongodb://mongodb:27017/umi_games',
    GAME_ADMIN_BASE_URL: process.env.GAME_ADMIN_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5050}`,
    GAME_WEBHOOK_URL: process.env.GAME_WEBHOOK_URL || `http://127.0.0.1:${process.env.PORT || 5050}/api/games/webhook`,
    GAME_WEBHOOK_SECRET: process.env.GAME_WEBHOOK_SECRET || 'umi_game_webhook_secret_key_2026',
    PROJECT_NAME: process.env.PROJECT_NAME || 'umi',
  };

  const child = spawn('node', [def.script], {
    cwd: gameCwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  const procInfo = {
    def,
    child,
    pid: child.pid,
    startedAt: new Date(),
    restartCount: (runningProcesses.get(def.slug)?.restartCount || 0) + 1,
  };

  runningProcesses.set(def.slug, procInfo);

  child.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${prefix}${line}`);
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${prefix}\x1b[31m${line}\x1b[0m`);
      }
    }
  });

  child.on('error', (err) => {
    console.error(`${prefix}Execution error:`, err.message);
  });

  child.on('close', (code, signal) => {
    console.warn(`${prefix}Exited with code ${code} (signal: ${signal || 'none'})`);
    runningProcesses.delete(def.slug);

    if (!isShuttingDown) {
      // Auto-heal / restart after 3 seconds if not deliberately shut down
      console.log(`${prefix}Auto-restarting in 3 seconds...`);
      setTimeout(() => {
        spawnGame(def, gamesRoot);
      }, 3000);
    }
  });
}

/**
 * Initializes and starts all 7 games
 */
export function startGameProcesses() {
  if (process.env.START_GAMES === 'false') {
    console.log('[GameManager] START_GAMES=false detected. Skipping game process startup.');
    return;
  }

  const gamesRoot = resolveGamesRoot();
  if (!gamesRoot) {
    console.warn('[GameManager] Games directory not found. Please ensure Games/ exists in the project root.');
    return;
  }

  console.log(`\n======================================================`);
  console.log(`🎮 [GameManager] Launching all 7 Mini-Game Servers from:`);
  console.log(`   ${gamesRoot}`);
  console.log(`======================================================`);

  for (const def of GAME_DEFINITIONS) {
    spawnGame(def, gamesRoot);
  }

  // Graceful shutdown handlers
  const cleanup = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\n🛑 [GameManager] Stopping all mini-game child processes...');
    for (const [slug, proc] of runningProcesses.entries()) {
      try {
        if (proc.child && !proc.child.killed) {
          proc.child.kill('SIGTERM');
        }
      } catch (e) {
        // ignore
      }
    }
    runningProcesses.clear();
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('exit', cleanup);
}

/**
 * Returns current status of all game processes for monitoring / healthchecks
 */
export function getGameProcessesStatus() {
  return GAME_DEFINITIONS.map((def) => {
    const running = runningProcesses.get(def.slug);
    return {
      name: def.name,
      slug: def.slug,
      port: Number(def.port),
      isRunning: Boolean(running && running.child && !running.child.killed),
      pid: running?.pid || null,
      startedAt: running?.startedAt || null,
      uptimeSeconds: running?.startedAt ? Math.floor((Date.now() - running.startedAt.getTime()) / 1000) : 0,
      restartCount: running?.restartCount || 0,
    };
  });
}
