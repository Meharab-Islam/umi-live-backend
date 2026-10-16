import jwt from 'jsonwebtoken';
import { query } from './backend/src/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'umi_live_stream_super_secret_jwt_key_2025';
const PORT = process.env.PORT || 5050;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function testLiveTypes() {
  console.log('--- Testing Live Room Creation with live_type (video vs audio) ---');

  // 1. Get a test user
  const users = await query('SELECT id, phone, full_name FROM users LIMIT 1');
  if (users.length === 0) {
    console.error('No user found');
    process.exit(1);
  }
  const testUser = users[0];
  console.log(`Using test user: ID ${testUser.id} (${testUser.full_name})`);

  // Generate valid mobile token
  const token = jwt.sign(
    { id: testUser.id, role: 'user', type: 'user' },
    JWT_SECRET,
    { expiresIn: '1h', issuer: process.env.PROJECT_NAME || 'umi' }
  );

  // 2. Create Video Live
  console.log('\n1. Testing Video Live Room creation...');
  const videoRes = await fetch(`${BASE_URL}/api/mobile/live/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Awesome Video Live 🎥',
      category: 'Chatting',
      live_type: 'video',
      total_seats: 6
    })
  });
  const videoData = await videoRes.json();
  console.log('Video Room Response status:', videoRes.status);
  console.log('live_type:', videoData.room?.live_type);
  console.log('is_video:', videoData.room?.is_video);
  console.log('is_audio:', videoData.room?.is_audio);
  console.log('total_seats:', videoData.room?.total_seats);
  const seat1Video = videoData.room?.seats?.find(s => s.seat_number === 1);
  console.log('Seat 1 camera on (should be true for video):', seat1Video?.is_camera_on);

  if (videoData.room?.live_type !== 'video' || seat1Video?.is_camera_on !== true) {
    console.error('FAILED Video Live test!');
    process.exit(1);
  }

  // 3. Create Audio Live
  console.log('\n2. Testing Audio Live Room creation...');
  const audioRes = await fetch(`${BASE_URL}/api/mobile/live/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Late Night Audio Voice Lounge 🎙️',
      category: 'Music',
      live_type: 'audio',
      total_seats: 8
    })
  });
  const audioData = await audioRes.json();
  console.log('Audio Room Response status:', audioRes.status);
  console.log('live_type:', audioData.room?.live_type);
  console.log('is_video:', audioData.room?.is_video);
  console.log('is_audio:', audioData.room?.is_audio);
  console.log('total_seats:', audioData.room?.total_seats);
  const seat1Audio = audioData.room?.seats?.find(s => s.seat_number === 1);
  console.log('Seat 1 camera on (should be false for audio):', seat1Audio?.is_camera_on);

  if (audioData.room?.live_type !== 'audio' || seat1Audio?.is_camera_on !== false) {
    console.error('FAILED Audio Live test!');
    process.exit(1);
  }

  // 4. Test Filtering by live_type
  console.log('\n3. Testing GET /api/mobile/live/rooms?live_type=audio...');
  const getAudioRes = await fetch(`${BASE_URL}/api/mobile/live/rooms?live_type=audio`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const getAudioData = await getAudioRes.json();
  console.log(`Audio rooms found: ${getAudioData.rooms?.length ?? 0}`);

  console.log('\nAll tests passed successfully! 🚀');
  process.exit(0);
}

testLiveTypes().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
