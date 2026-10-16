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

async function runTest() {
  console.log('=== TEST: VIDEO LIVE AUTO-SEATING RESTRICTION GUARD ===\n');

  const users = await query('SELECT id, full_name, role FROM users LIMIT 2');
  const hostUser = users[0];
  const viewerUser = users[1];

  const hostToken = makeToken(hostUser);
  const viewerToken = makeToken(viewerUser);

  // 1. Create a Video Live Room
  console.log('1. Creating Video Live Room...');
  const createRes = await fetch(`${BASE_URL}/api/mobile/live/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({
      title: 'Studio Video Broadcast 🎥',
      category: 'Chatting',
      live_type: 'video',
      total_seats: 4,
    }),
  });
  const createData = await createRes.json();
  const roomId = createData.room.room_id;
  console.log(`✓ Video Room created: ${roomId} (live_type: ${createData.room.live_type})`);

  // 2. Viewer attempts to take seat directly without request -> MUST BE BLOCKED (403)
  console.log('\n2. Viewer attempts direct seat take in Video Live (should return 403)...');
  const takeDirectRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/take`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
    body: JSON.stringify({ seat_number: 2 }),
  });
  const takeDirectData = await takeDirectRes.json();
  console.log(`✓ Response status: ${takeDirectRes.status}, message: "${takeDirectData.message}"`);
  if (takeDirectRes.status !== 403) {
    console.error('FAILED: Direct seating was not blocked in Video Live!');
    process.exit(1);
  }

  // 3. Viewer submits a seat request
  console.log('\n3. Viewer submits seat request in Video Live...');
  const reqRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
    body: JSON.stringify({ seat_number: 2 }),
  });
  const reqData = await reqRes.json();
  console.log(`✓ Request response: auto_accepted = ${reqData.auto_accepted}, requestId = ${reqData.request_id || reqData.requestId}`);
  if (reqData.auto_accepted === true) {
    console.error('FAILED: In Video Live, user must NOT be auto-accepted!');
    process.exit(1);
  }

  // Verify viewer is NOT yet seated
  const detailsRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  const detailsData = await detailsRes.json();
  const seat2Before = detailsData.room?.seats?.find((s) => s.seat_number === 2);
  console.log(`✓ Seat 2 occupant before host approval: ${seat2Before?.user ? seat2Before.user.name : 'empty'}`);
  if (seat2Before?.user) {
    console.error('FAILED: Viewer occupied seat before host approval!');
    process.exit(1);
  }

  // 4. Host fetches pending requests
  console.log('\n4. Host fetches pending seat requests...');
  const listReqRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/requests`, {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  const listReqData = await listReqRes.json();
  const pendingReq = listReqData.requests?.[0];
  console.log(`✓ Found pending request ID: ${pendingReq?.id} from user: ${pendingReq?.user?.name}`);

  // 5. Host approves the seat request
  console.log('\n5. Host accepts/approves the seat request...');
  const approveRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/requests/${pendingReq.id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({ seat_number: 2 }),
  });
  const approveData = await approveRes.json();
  console.log(`✓ Approve response: "${approveData.message}"`);
  if (!approveData.success) {
    console.error('FAILED: Host could not approve seat request!');
    process.exit(1);
  }

  // 6. Verify viewer is now seated on seat 2
  const detailsAfterRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  const detailsAfterData = await detailsAfterRes.json();
  const seat2After = detailsAfterData.room?.seats?.find((s) => s.seat_number === 2);
  console.log(`✓ Seat 2 occupant AFTER host approval: ${seat2After?.user?.name} (ID: ${seat2After?.user?.id})`);
  if (!seat2After?.user || seat2After.user.id !== viewerUser.id) {
    console.error('FAILED: Viewer is not seated after approval!');
    process.exit(1);
  }

  // 7. Cleanup
  await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({}),
  });

  console.log('\n🎉 VIDEO LIVE AUTO-SEATING RESTRICTION TEST PASSED WITH 100% SUCCESS! 🎉');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
