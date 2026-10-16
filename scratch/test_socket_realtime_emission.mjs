import io from '../admin-panel/node_modules/socket.io-client/build/esm/index.js';
import jwt from '../backend/node_modules/jsonwebtoken/index.js';
import { query } from '../backend/src/config/db.js';
import dotenv from '../backend/node_modules/dotenv/lib/main.js';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'umi_live_stream_super_secret_jwt_key_2025';
const PORT = process.env.PORT || 5050;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function makeToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role || 'user', type: 'user' },
    JWT_SECRET,
    { expiresIn: '1h', issuer: process.env.PROJECT_NAME || 'umi' }
  );
}

async function main() {
  console.log('=== REAL-TIME SOCKET.IO EMISSION INTEGRITY TEST ===\n');

  // 1. Get host user
  const users = await query('SELECT id, full_name, role FROM users LIMIT 1');
  const hostUser = users[0];
  const token = makeToken(hostUser);
  console.log(`✓ Host Authenticated: ID ${hostUser.id} (${hostUser.full_name})`);

  // 2. Create an audio room
  const createRes = await fetch(`${BASE_URL}/api/mobile/live/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Socket Emission Proof Test Room',
      category: 'Chatting',
      live_type: 'audio',
      total_seats: 7,
    }),
  });
  const roomData = await createRes.json();
  const roomId = roomData.room?.room_id;
  console.log(`✓ Audio Room Created: ${roomId}`);

  // 3. Connect real Socket.IO client
  const socket = io(BASE_URL, {
    transports: ['websocket'],
    auth: { token },
  });

  await new Promise((resolve) => {
    socket.on('connect', () => {
      console.log(`✓ Socket.IO Client Connected with socketId: ${socket.id}`);
      resolve();
    });
  });

  // 4. Join room channel
  socket.emit('join-room', {
    roomId,
    user: { id: hostUser.id, full_name: hostUser.full_name },
  });

  // Wait 150ms for server room join registration
  await new Promise((r) => setTimeout(r, 150));

  // 5. Test Event Listener for seat_locked event
  const eventPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for seat_locked event')), 5000);
    socket.on('seat_locked', (payload) => {
      clearTimeout(timeout);
      console.log('✓ [REALTIME EVENT RECEIVED] Socket caught "seat_locked" event:', payload);
      resolve(payload);
    });
  });

  // 6. Hit REST API: Host locks Seat #3
  console.log(`\n--> Hitting REST API: POST /api/mobile/live/rooms/${roomId}/seats/lock (Lock Seat #3)...`);
  const lockRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/lock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      seat_number: 3,
      is_locked: true,
    }),
  });
  const lockData = await lockRes.json();
  console.log(`✓ REST API Response: status ${lockRes.status}, message: "${lockData.message}"`);

  // Await the real-time socket event!
  const receivedEvent = await eventPromise;

  if (receivedEvent && (receivedEvent.seat_index === 3 || receivedEvent.seatNumber === 3)) {
    console.log('\n🎉 PROOF VERIFIED 100%: When REST API was hit, backend immediately emitted the real-time event to the room channel!');
  } else {
    throw new Error('Event payload mismatch');
  }

  socket.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
