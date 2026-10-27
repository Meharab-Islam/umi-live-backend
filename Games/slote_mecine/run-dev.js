const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

console.log('🎰 Starting Fruit Slot Machine System (Backend + Frontend)...');
console.log('📁 Backend Dir :', backendDir);
console.log('📁 Frontend Dir:', frontendDir);

// 1. Start Backend Server
const backendProcess = spawn('node', ['server.js'], {
  cwd: backendDir,
  env: { ...process.env, PORT: process.env.PORT || '3001' },
  stdio: 'pipe',
});

backendProcess.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[36m[Backend]\x1b[0m ${data}`);
});

backendProcess.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[Backend Error]\x1b[0m ${data}`);
});

backendProcess.on('exit', (code) => {
  console.log(`\x1b[33m[Backend]\x1b[0m exited with code ${code}`);
});

// 2. Start Frontend Vite Dev Server
const frontendProcess = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'pipe',
});

frontendProcess.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[32m[Frontend]\x1b[0m ${data}`);
});

frontendProcess.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[35m[Frontend Log]\x1b[0m ${data}`);
});

frontendProcess.on('exit', (code) => {
  console.log(`\x1b[33m[Frontend]\x1b[0m exited with code ${code}`);
});

function cleanup() {
  console.log('\n🛑 Stopping Fruit Slot Machine servers...');
  try { backendProcess.kill('SIGTERM'); } catch (_) {}
  try { frontendProcess.kill('SIGTERM'); } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
