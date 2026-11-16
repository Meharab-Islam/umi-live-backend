#!/usr/bin/env node
/**
 * Socket.IO live-room load test.
 *
 *   node loadtest/socket-load.mjs --url http://127.0.0.1:5050 --clients 2000 --ramp 200 \
 *        --duration 60 --room loadtest_room --chat-per-min 6
 *
 * What it does
 *   - signs JWTs for synthetic users (uses JWT_SECRET/JWT_ISSUER from .env, same as the server)
 *   - connects --clients websocket clients at --ramp connections/second
 *   - every client joins --room, then 1 in --chatters sends a comment every 60/--chat-per-min seconds
 *   - measures: connect time, join->first-sync time, comment fan-out latency, events/sec received,
 *     disconnects, connect errors, rate-limit drops
 *
 * Synthetic users do not need to exist in MySQL. Point it at a STAGING backend, never production.
 * Run from several machines for >20k clients (one Node process ~ 10-20k idle sockets / ulimit -n).
 */
import { io } from 'socket.io-client';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { signToken } = await import('../src/config/jwt.js');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}

const URL_ = String(arg('url', 'http://127.0.0.1:5050'));
const CLIENTS = parseInt(arg('clients', 200), 10);
const RAMP = parseInt(arg('ramp', 100), 10);
const DURATION = parseInt(arg('duration', 30), 10);
const ROOM = String(arg('room', 'loadtest_room'));
const CHATTERS_EVERY = parseInt(arg('chatters', 20), 10); // 1 in N clients chats
const CHAT_PER_MIN = parseFloat(arg('chat-per-min', 6));
const ID_BASE = parseInt(arg('id-base', 8000000), 10);

const stats = {
  connected: 0,
  connectErrors: 0,
  disconnects: 0,
  joined: 0,
  sent: 0,
  received: { comment: 0, viewerCount: 0, userJoined: 0, other: 0 },
  rateLimited: 0,
  connectMs: [],
  joinMs: [],
  commentLatencyMs: [],
};

const pct = (arr, p) => {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sockets = [];
const startedAt = Date.now();

function spawn(i) {
  const userId = ID_BASE + i;
  const token = signToken({ id: userId, role: 'user' });
  const t0 = Date.now();
  const s = io(URL_, {
    transports: ['websocket'],
    auth: { token },
    reconnection: false,
    forceNew: true,
  });
  sockets.push(s);

  s.on('connect', () => {
    stats.connected += 1;
    stats.connectMs.push(Date.now() - t0);
    const j0 = Date.now();
    s.once('room-settings-sync', () => {
      stats.joined += 1;
      stats.joinMs.push(Date.now() - j0);
    });
    s.emit('join-room', { roomId: ROOM, user: { id: userId } });

    if (i % CHATTERS_EVERY === 0 && CHAT_PER_MIN > 0) {
      const every = Math.max(250, Math.floor(60000 / CHAT_PER_MIN));
      const timer = setInterval(() => {
        if (!s.connected) return clearInterval(timer);
        stats.sent += 1;
        s.emit('comment', { roomId: ROOM, message: `lt:${Date.now()}:${userId}` });
      }, every + Math.floor(Math.random() * every));
      s.once('disconnect', () => clearInterval(timer));
    }
  });

  s.on('connect_error', () => { stats.connectErrors += 1; });
  s.on('disconnect', () => { stats.disconnects += 1; });
  s.on('room_chat_rate_limited', () => { stats.rateLimited += 1; });
  s.on('comment', (c) => {
    stats.received.comment += 1;
    const m = /^lt:(\d+):/.exec(c?.message || '');
    if (m) stats.commentLatencyMs.push(Date.now() - Number(m[1]));
  });
  s.on('viewer-count-update', () => { stats.received.viewerCount += 1; });
  s.on('user-joined', () => { stats.received.userJoined += 1; });
}

function report(final = false) {
  const secs = Math.max(1, (Date.now() - startedAt) / 1000);
  const rx = stats.received.comment + stats.received.viewerCount + stats.received.userJoined;
  const line = {
    t: `${secs.toFixed(0)}s`,
    connected: stats.connected - stats.disconnects,
    connectErrors: stats.connectErrors,
    joined: stats.joined,
    sent: stats.sent,
    rx_per_sec: Math.round(rx / secs),
    connect_ms_p95: pct(stats.connectMs, 95),
    join_ms_p95: pct(stats.joinMs, 95),
    comment_latency_ms_p50: pct(stats.commentLatencyMs, 50),
    comment_latency_ms_p95: pct(stats.commentLatencyMs, 95),
    rate_limited: stats.rateLimited,
    heap_mb: Math.round(process.memoryUsage().heapUsed / 1048576),
  };
  console.log(final ? '\nFINAL ' : '', JSON.stringify(line));
  return line;
}

console.log(`Load test -> ${URL_}  clients=${CLIENTS} ramp=${RAMP}/s duration=${DURATION}s room=${ROOM}`);
const progress = setInterval(() => report(false), 5000);

for (let i = 0; i < CLIENTS; i++) {
  spawn(i);
  if ((i + 1) % RAMP === 0) await sleep(1000);
}
console.log(`All ${CLIENTS} clients launched, holding for ${DURATION}s...`);
await sleep(DURATION * 1000);

clearInterval(progress);
const final = report(true);
console.log(`
 PASS criteria (suggested): connectErrors < 0.5% of clients, connect_ms_p95 < 2000,
 join_ms_p95 < 1500, comment_latency_ms_p95 < 1500, disconnects ~ 0 during the hold.`);
sockets.forEach((s) => s.close());
const bad = final.connectErrors > CLIENTS * 0.005;
process.exit(bad ? 1 : 0);
