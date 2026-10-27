import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const BACKEND_PORT = process.env.BACKEND_PORT || '5050';
const ADMIN_PORT = process.env.ADMIN_PORT || '3000';

const START_CORE = process.env.START_CORE !== 'false';
const START_GAMES = process.env.START_GAMES !== 'false' || process.argv.includes('--games');

const GAME_PORTS = {
  big_eater: process.env.GAME_BIG_EATER_PORT || '5061',
  slote_mecine: process.env.GAME_SLOTE_MECINE_PORT || '5062',
  ferrywheel: process.env.GAME_FERRYWHEEL_PORT || '5063',
  greedybaby: process.env.GAME_GREEDYBABY_PORT || '5064',
  greedylion: process.env.GAME_GREEDYLION_PORT || '5065',
  roulettecasino: process.env.GAME_ROULETTECASINO_PORT || '5066',
  teenpatti: process.env.GAME_TEENPATTI_PORT || '5067',
};

console.log('\n======================================================');
console.log('🚀 Starting Umi Live Monorepo System...');
console.log('======================================================');
if (START_CORE) {
  console.log(`📡 Backend API & Socket: http://localhost:${BACKEND_PORT}`);
  console.log(`💻 Admin Dashboard:      http://localhost:${ADMIN_PORT}`);
}
if (START_GAMES) {
  console.log(`🍔 Game - Big Eater:     http://localhost:${GAME_PORTS.big_eater} (or http://localhost:${BACKEND_PORT}/games/big_eater)`);
  console.log(`🎰 Game - Slot Machine:  http://localhost:${GAME_PORTS.slote_mecine} (or http://localhost:${BACKEND_PORT}/games/slote_mecine)`);
  console.log(`🎡 Game - Ferry Wheel:   http://localhost:${GAME_PORTS.ferrywheel} (or http://localhost:${BACKEND_PORT}/games/ferrywheel)`);
  console.log(`👶 Game - Greedy Baby:   http://localhost:${GAME_PORTS.greedybaby} (or http://localhost:${BACKEND_PORT}/games/greedybaby)`);
  console.log(`🦁 Game - Greedy Lion:   http://localhost:${GAME_PORTS.greedylion} (or http://localhost:${BACKEND_PORT}/games/greedylion)`);
  console.log(`🎯 Game - Roulette:      http://localhost:${GAME_PORTS.roulettecasino} (or http://localhost:${BACKEND_PORT}/games/roulettecasino)`);
  console.log(`🃏 Game - Teen Patti:    http://localhost:${GAME_PORTS.teenpatti} (or http://localhost:${BACKEND_PORT}/games/teenpatti)`);
}
console.log('======================================================\n');

const children = [];

function runProcess(name, cmd, args, cwd, color, extraEnv = {}) {
  if (!fs.existsSync(cwd)) {
    console.warn(`[Skip] Directory not found for ${name}: ${cwd}`);
    return null;
  }

  const child = spawn(cmd, args, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, ...extraEnv },
  });

  children.push(child);

  const prefix = `${color}[${name}]\x1b[0m `;

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) process.stdout.write(`${prefix}${line}\n`);
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) process.stderr.write(`${prefix}${line}\n`);
    });
  });

  child.on('close', (code) => {
    console.log(`${prefix}Process exited with code ${code}`);
  });

  return child;
}

// 1. Core Services (Backend API & React Vite Admin Panel)
if (START_CORE) {
  runProcess('Backend', 'npm', ['run', 'dev'], path.resolve(__dirname, 'backend'), '\x1b[36m');
  runProcess('Admin', 'npm', ['run', 'dev'], path.resolve(__dirname, 'admin-panel'), '\x1b[35m');
}

// 2. Integrated Mini-Games
if (START_GAMES) {
  // Big Eater
  runProcess(
    'BigEater',
    'node',
    ['server.js'],
    path.resolve(__dirname, 'Games/big_eater'),
    '\x1b[32m',
    { PORT: GAME_PORTS.big_eater }
  );

  // Slot Machine
  runProcess(
    'SlotMachine',
    'node',
    ['backend/server.js'],
    path.resolve(__dirname, 'Games/slote_mecine'),
    '\x1b[33m',
    { PORT: GAME_PORTS.slote_mecine }
  );

  // Ferry Wheel
  runProcess(
    'FerryWheel',
    'node',
    ['backend/index.js'],
    path.resolve(__dirname, 'Games/ferrywheel'),
    '\x1b[34m',
    { PORT: GAME_PORTS.ferrywheel }
  );

  // Greedy Baby
  runProcess(
    'GreedyBaby',
    'node',
    ['backend/index.js'],
    path.resolve(__dirname, 'Games/greedybaby'),
    '\x1b[95m',
    { PORT: GAME_PORTS.greedybaby }
  );

  // Greedy Lion
  runProcess(
    'GreedyLion',
    'node',
    ['backend/index.js'],
    path.resolve(__dirname, 'Games/greedylion'),
    '\x1b[96m',
    { PORT: GAME_PORTS.greedylion }
  );

  // Roulette Casino
  runProcess(
    'Roulette',
    'node',
    ['backend/index.js'],
    path.resolve(__dirname, 'Games/roulettecasino'),
    '\x1b[91m',
    { PORT: GAME_PORTS.roulettecasino }
  );

  // Teen Patti
  runProcess(
    'TeenPatti',
    'node',
    ['backend/index.js'],
    path.resolve(__dirname, 'Games/teenpatti'),
    '\x1b[92m',
    { PORT: GAME_PORTS.teenpatti }
  );
}

function cleanup() {
  console.log('\n🛑 Shutting down all Umi Live services and games...');
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch (e) {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

