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


console.log('\n======================================================');
console.log('🚀 Starting Umi Live Monorepo System...');
console.log('======================================================');
if (START_CORE) {
  console.log(`📡 Backend API & Socket: http://localhost:${BACKEND_PORT}`);
  console.log(`💻 Admin Dashboard:      http://localhost:${ADMIN_PORT}`);
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

function cleanup() {
  console.log('\n🛑 Shutting down all Umi Live services...');
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

