import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const BACKEND_PORT = process.env.BACKEND_PORT || '5050';
const ADMIN_PORT = process.env.ADMIN_PORT || '3000';

console.log('\n🚀 Starting Umi Live Services...');
console.log(`📡 Backend API:      http://localhost:${BACKEND_PORT}`);
console.log(`💻 Admin Dashboard:  http://localhost:${ADMIN_PORT}\n`);

const children = [];

function runProcess(name, cmd, args, cwd, color) {
  const child = spawn(cmd, args, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env },
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

// Cyan for Backend, Magenta for Admin Panel
runProcess('Backend', 'npm', ['run', 'dev'], path.resolve(__dirname, 'backend'), '\x1b[36m');
runProcess('Admin', 'npm', ['run', 'dev'], path.resolve(__dirname, 'admin-panel'), '\x1b[35m');

function cleanup() {
  console.log('\n🛑 Shutting down Umi Live services...');
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
