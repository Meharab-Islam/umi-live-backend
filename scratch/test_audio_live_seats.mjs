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

async function runTests() {
  console.log('=== AUDIO LIVE MULTI-SEAT ENDPOINTS TEST SUITE ===\n');

  // 1. Fetch test users
  const users = await query('SELECT id, full_name, role FROM users LIMIT 3');
  if (users.length < 3) {
    console.error('Need at least 3 users in DB to run multi-seat test.');
    process.exit(1);
  }

  const hostUser = users[0];
  const user2 = users[1];
  const user3 = users[2];

  const hostToken = makeToken(hostUser);
  const user2Token = makeToken(user2);
  const user3Token = makeToken(user3);

  console.log(`Host: ID ${hostUser.id} (${hostUser.full_name})`);
  console.log(`User 2: ID ${user2.id} (${user2.full_name})`);
  console.log(`User 3: ID ${user3.id} (${user3.full_name})\n`);

  // 2. Create Audio Live Room (default seats should be 7, cannot be less than 7)
  console.log('1. Testing Audio Live Room Creation (default 7 seats)...');
  const createRes = await fetch(`${BASE_URL}/api/mobile/live/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({
      title: 'Late Night Audio Voice Lounge 🎙️',
      category: 'Chatting',
      live_type: 'audio',
      total_seats: 5, // Requesting 5 should be clamped to minimum 7!
    }),
  });
  const createData = await createRes.json();
  if (!createData.success || createData.room.total_seats < 7) {
    console.error('FAILED: Audio room total_seats must be at least 7. Got:', createData.room?.total_seats);
    process.exit(1);
  }
  const roomId = createData.room.room_id;
  console.log(`✓ Audio Room created: ${roomId} with total_seats = ${createData.room.total_seats} (clamped to min 7)`);

  // 3. Late join user checks room details (duration, empty/open seats, seated users, mute status)
  console.log('\n2. Testing Late Join / Viewer Room Details inspection...');
  const detailsRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}`, {
    headers: { Authorization: `Bearer ${user2Token}` },
  });
  const detailsData = await detailsRes.json();
  const r = detailsData.room;
  console.log(`✓ Room Duration: ${r.live_duration?.duration_formatted} (${r.live_duration?.duration_seconds}s)`);
  console.log(`✓ Total Seats: ${r.total_seats}`);
  console.log(`✓ Occupied Seats: ${r.occupied_seats_count}`);
  console.log(`✓ Empty Seats: ${r.empty_seats_count}`);
  console.log(`✓ Open Seats: ${r.open_seats_count}`);
  console.log(`✓ Locked Seats: ${r.locked_seats_count}`);

  if (r.total_seats !== 7 || r.occupied_seats_count !== 1 || r.empty_seats_count !== 6) {
    console.error('FAILED: Initial seat count breakdown mismatch!', r);
    process.exit(1);
  }

  // 4. User 2 takes seat directly without request (auto-picks seat 2)
  console.log('\n3. Testing User 2 taking seat directly without picking seat number...');
  const takeRes1 = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/take`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2Token}` },
    body: JSON.stringify({}),
  });
  const takeData1 = await takeRes1.json();
  console.log('Take seat response message:', takeData1.message);
  const user2Seat = takeData1.room?.seats?.find((s) => s.user?.id === user2.id);
  console.log(`✓ User 2 assigned to seat #${user2Seat?.seat_number}`);
  if (!user2Seat || user2Seat.seat_number !== 2) {
    console.error('FAILED: User 2 was not seated on seat 2!');
    process.exit(1);
  }

  // 5. User 3 takes specific seat #3
  console.log('\n4. Testing User 3 taking seat #3 directly...');
  const takeRes2 = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/take`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user3Token}` },
    body: JSON.stringify({ seat_number: 3 }),
  });
  const takeData2 = await takeRes2.json();
  const user3Seat = takeData2.room?.seats?.find((s) => s.user?.id === user3.id);
  console.log(`✓ User 3 assigned to seat #${user3Seat?.seat_number}`);
  // 4.1 Test User 2 switching from Seat 2 to Seat 5 directly
  console.log('\n4.1 Testing User 2 moving/switching from Seat 2 to Seat 5...');
  const switchRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2Token}` },
    body: JSON.stringify({ seat_number: 5 }),
  });
  const switchData = await switchRes.json();
  console.log(`✓ Switch response: "${switchData.message}", is_switch: ${switchData.is_switch}`);
  const s2After = switchData.room?.seats?.find((s) => s.seat_number === 2);
  const s5After = switchData.room?.seats?.find((s) => s.seat_number === 5);
  console.log(`✓ Seat 2 occupant after switch: ${s2After?.user ? s2After.user.name : 'empty'}`);
  console.log(`✓ Seat 5 occupant after switch: ${s5After?.user ? s5After.user.name : 'empty'}`);
  if (s2After?.user || !s5After?.user || s5After.user.id !== user2.id) {
    console.error('FAILED: User 2 seat switch failed!');
    process.exit(1);
  }

  // Switch back to Seat 2 for remaining tests
  await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2Token}` },
    body: JSON.stringify({ seat_number: 2 }),
  });

  // 6. Increase seats one by one: POST /rooms/:roomId/seats/increase
  console.log('\n5. Testing Seat Increase one-by-one (+1)...');
  const incRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/increase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({}),
  });
  const incData = await incRes.json();
  console.log(`✓ Seat count increased to: ${incData.total_seats}`);
  if (incData.total_seats !== 8) {
    console.error('FAILED: Expected 8 seats after increase.');
    process.exit(1);
  }

  // 7. Decrease seats one by one: POST /rooms/:roomId/seats/decrease
  console.log('\n6. Testing Seat Decrease one-by-one (-1)...');
  const decRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/decrease`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({}),
  });
  const decData = await decRes.json();
  console.log(`✓ Seat count decreased back to: ${decData.total_seats}`);
  if (decData.total_seats !== 7) {
    console.error('FAILED: Expected 7 seats after decrease.');
    process.exit(1);
  }

  // 8. Try decreasing below 7 (Must be prevented!)
  console.log('\n7. Testing prevention of reducing seats below 7...');
  const decFailRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/decrease`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({}),
  });
  const decFailData = await decFailRes.json();
  console.log(`✓ Prevented decrease below 7: status ${decFailRes.status}, message: "${decFailData.message}"`);
  if (decFailRes.status !== 400) {
    console.error('FAILED: Expected 400 when decreasing below 7.');
    process.exit(1);
  }

  // 9. Individual Seat Lock / Unlock
  console.log('\n8. Testing Individual Seat Lock / Unlock...');
  const lock1Res = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/4/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({ is_locked: true }),
  });
  const lock1Data = await lock1Res.json();
  const seat4Locked = lock1Data.room?.seats?.find((s) => s.seat_number === 4);
  console.log(`✓ Seat 4 locked status: ${seat4Locked?.is_locked}`);
  if (!seat4Locked?.is_locked) {
    console.error('FAILED: Seat 4 was not locked.');
    process.exit(1);
  }

  const unlock1Res = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/4/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({}),
  });
  const unlock1Data = await unlock1Res.json();
  const seat4Unlocked = unlock1Data.room?.seats?.find((s) => s.seat_number === 4);
  console.log(`✓ Seat 4 unlocked status: ${seat4Unlocked?.is_locked}`);
  if (seat4Unlocked?.is_locked) {
    console.error('FAILED: Seat 4 was not unlocked.');
    process.exit(1);
  }

  // 10. Lock ALL empty seats at once
  console.log('\n9. Testing Lock ALL Empty Seats at once...');
  const lockEmptyRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/lock-all-empty`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({ is_locked: true }),
  });
  const lockEmptyData = await lockEmptyRes.json();
  console.log(`✓ Locked all empty seats. Open seats count: ${lockEmptyData.room?.open_seats_count}, Locked seats count: ${lockEmptyData.room?.locked_seats_count}`);
  if (lockEmptyData.room?.open_seats_count !== 0) {
    console.error('FAILED: Expected 0 open seats after locking all empty seats.');
    process.exit(1);
  }

  // 11. Unlock ALL empty seats at once
  console.log('\n10. Testing Unlock ALL Empty Seats at once...');
  const unlockEmptyRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/empty/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({}),
  });
  const unlockEmptyData = await unlockEmptyRes.json();
  console.log(`✓ Unlocked all empty seats. Open seats count: ${unlockEmptyData.room?.open_seats_count}, Locked seats count: ${unlockEmptyData.room?.locked_seats_count}`);
  if (unlockEmptyData.room?.locked_seats_count !== 0) {
    console.error('FAILED: Expected 0 locked seats after unlocking all empty seats.');
    process.exit(1);
  }

  // 12. Individual User Mute / Unmute
  console.log('\n11. Testing Individual User Mute / Unmute on Seat 2...');
  const mute1Res = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/2/mute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({ is_muted: true }),
  });
  const mute1Data = await mute1Res.json();
  const s2Muted = mute1Data.room?.seats?.find((s) => s.seat_number === 2);
  console.log(`✓ Seat 2 mute state: ${s2Muted?.is_muted}`);
  if (!s2Muted?.is_muted) {
    console.error('FAILED: Seat 2 was not muted.');
    process.exit(1);
  }

  // 13. Mute ALL seated users at once
  console.log('\n12. Testing Mute ALL Seated Users at once...');
  const muteAllRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/mute-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({ is_muted: true }),
  });
  const muteAllData = await muteAllRes.json();
  console.log(`✓ Muted all seated users. Muted seats count: ${muteAllData.room?.muted_seats_count}`);
  const s3Muted = muteAllData.room?.seats?.find((s) => s.seat_number === 3);
  if (!s3Muted?.is_muted) {
    console.error('FAILED: Seat 3 was not muted by mute-all.');
    process.exit(1);
  }

  // 14. Unmute ALL seated users at once
  console.log('\n13. Testing Unmute ALL Seated Users at once...');
  const unmuteAllRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/unmute-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({}),
  });
  const unmuteAllData = await unmuteAllRes.json();
  console.log(`✓ Unmuted all seated users. Muted seats count: ${unmuteAllData.room?.muted_seats_count}`);
  if (unmuteAllData.room?.muted_seats_count !== 0) {
    console.error('FAILED: Expected 0 muted seated users after unmute-all.');
    process.exit(1);
  }

  // 15. Individual User Kick from Seat
  console.log('\n14. Testing Individual User Kick from Seat #2...');
  const kickUserRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/2/kick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({}),
  });
  const kickUserData = await kickUserRes.json();
  const s2Vacated = kickUserData.room?.seats?.find((s) => s.seat_number === 2);
  console.log(`✓ Seat 2 occupant after individual kick: ${s2Vacated?.user ? s2Vacated.user.name : 'empty'}`);
  if (s2Vacated?.user) {
    console.error('FAILED: Seat 2 was not vacated after kick.');
    process.exit(1);
  }

  // User 2 re-takes seat
  await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/take`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2Token}` },
    body: JSON.stringify({ seat_number: 2 }),
  });

  // 16. Kick ALL seated users at once
  console.log('\n15. Testing Kick ALL Seated Users at once (clean sweep)...');
  const kickAllRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/kick-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({}),
  });
  const kickAllData = await kickAllRes.json();
  console.log(`✓ Kick all response: "${kickAllData.message}", Occupied seats: ${kickAllData.room?.occupied_seats_count}`);
  if (kickAllData.room?.occupied_seats_count !== 1) { // Only host remains on seat 1
    console.error('FAILED: Expected only 1 occupied seat (host) after kick-all.');
    process.exit(1);
  }

  // 17. User 2 takes seat and then leaves seat
  console.log('\n16. Testing User taking seat and leaving seat on their own...');
  await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/take`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2Token}` },
    body: JSON.stringify({ seat_number: 2 }),
  });
  const leaveRes = await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/seats/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2Token}` },
    body: JSON.stringify({}),
  });
  const leaveData = await leaveRes.json();
  console.log(`✓ Leave seat response: "${leaveData.message}", Occupied seats: ${leaveData.room?.occupied_seats_count}`);
  if (leaveData.room?.occupied_seats_count !== 1) {
    console.error('FAILED: Expected occupied_seats_count to be 1 after user left seat.');
    process.exit(1);
  }

  // 18. End room cleanup
  await fetch(`${BASE_URL}/api/mobile/live/rooms/${roomId}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({}),
  });

  console.log('\n🎉 ALL 16 AUDIO LIVE MULTI-SEAT SPEC TESTS PASSED WITH 100% SUCCESS! 🎉');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
