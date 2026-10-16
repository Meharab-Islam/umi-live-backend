import http from 'http';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('--- Starting Moderator & Device Ban API Test ---');

  // 1. Login as Admin
  const adminLogin = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'admin@umi.live', password: 'admin123' });

  if (!adminLogin.data.success) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  }

  const moderatorToken = adminLogin.data.token;
  console.log('✅ Logged in as Admin/Moderator');

  // 2. Register devices for User #2 (Nila Akter)
  console.log('\n--- Step 1: Register mobile devices for User #2 ---');
  const regDev1 = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/users/2/devices/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${moderatorToken}`,
    },
  }, {
    deviceId: 'iphone-pro-hw-001',
    deviceModel: 'iPhone 15 Pro Max',
    osType: 'iOS',
    osVersion: '17.5.1',
    appVersion: '1.2.0',
  });
  console.log('Device 1 Registration:', regDev1.data.message);

  const regDev2 = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/users/2/devices/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${moderatorToken}`,
    },
  }, {
    deviceId: 'samsung-hw-002',
    deviceModel: 'Samsung Galaxy S24 Ultra',
    osType: 'Android',
    osVersion: '14.0',
    appVersion: '1.2.0',
  });
  console.log('Device 2 Registration:', regDev2.data.message);

  // 3. Search users for moderation
  console.log('\n--- Step 2: GET /api/mobile/moderator/users/search?q=2 ---');
  const searchRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/users/search?q=2',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${moderatorToken}` },
  });
  console.log(`Search status: ${searchRes.status}, Found: ${searchRes.data.users?.length}`);
  const targetUser = searchRes.data.users?.[0];
  console.log(`User: ${targetUser?.full_name}, Total devices: ${targetUser?.devices_summary?.total}`);
  if (!searchRes.data.success || !targetUser) {
    throw new Error('Search failed: ' + JSON.stringify(searchRes.data));
  }

  // 4. Get User Details & Devices list
  console.log('\n--- Step 3: GET /api/mobile/moderator/users/2 ---');
  const userDevicesRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/users/2',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${moderatorToken}` },
  });
  console.log(`Status: ${userDevicesRes.status}`);
  console.log(`User: ${userDevicesRes.data.user?.full_name}, is_banned: ${userDevicesRes.data.user?.is_banned}`);
  console.log(`Device count: ${userDevicesRes.data.devices?.length}`);
  console.log('Devices:', userDevicesRes.data.devices?.map((d) => `${d.device_model} (${d.device_id}) - Banned: ${d.is_banned}`).join(', '));
  if (userDevicesRes.data.devices?.length < 2) {
    throw new Error('Expected at least 2 devices, got: ' + userDevicesRes.data.devices?.length);
  }

  // 5. Ban a specific device: 'samsung-hw-002'
  console.log('\n--- Step 4: POST /api/mobile/moderator/devices/samsung-hw-002/ban (Ban single device) ---');
  const banDevRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/devices/samsung-hw-002/ban',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${moderatorToken}`,
    },
  }, {
    isBanned: true,
    reason: 'Suspicious bot farming activity',
  });
  console.log(`Status: ${banDevRes.status}`);
  console.log(`Message: ${banDevRes.data.message}`);
  if (!banDevRes.data.success || !banDevRes.data.is_banned) {
    throw new Error('Failed to ban device: ' + JSON.stringify(banDevRes.data));
  }

  // 6. Test that mobile login with banned device is rejected with 403
  console.log('\n--- Step 5: Test login rejection on banned device ---');
  const bannedLoginAttempt = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': 'samsung-hw-002',
    },
  }, {
    email: 'nila@umi.live',
    password: 'user123',
    deviceId: 'samsung-hw-002',
  });
  console.log(`Banned device login status: ${bannedLoginAttempt.status} (Expected 403)`);
  console.log(`Message: ${bannedLoginAttempt.data.message}`);
  if (bannedLoginAttempt.status !== 403) {
    throw new Error('Banned device was not blocked: ' + JSON.stringify(bannedLoginAttempt.data));
  }

  // 7. Unban the device
  console.log('\n--- Step 6: Unban device samsung-hw-002 ---');
  const unbanDevRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/devices/samsung-hw-002/ban',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${moderatorToken}`,
    },
  }, {
    isBanned: false,
  });
  console.log(`Status: ${unbanDevRes.status}`);
  console.log(`Message: ${unbanDevRes.data.message}`);
  if (!unbanDevRes.data.success || unbanDevRes.data.is_banned !== false) {
    throw new Error('Failed to unban device: ' + JSON.stringify(unbanDevRes.data));
  }

  // 8. Ban the user account and banAllDevices
  console.log('\n--- Step 7: POST /api/mobile/moderator/users/2/ban (Ban user + all devices) ---');
  const banUserRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/users/2/ban',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${moderatorToken}`,
    },
  }, {
    isBanned: true,
    reason: 'Violating livestream rules',
    banAllDevices: true,
  });
  console.log(`Status: ${banUserRes.status}`);
  console.log(`Message: ${banUserRes.data.message}`);
  console.log(`User is_banned: ${banUserRes.data.is_banned}, Devices banned: ${banUserRes.data.devicesUpdatedCount}`);
  if (!banUserRes.data.success || !banUserRes.data.is_banned) {
    throw new Error('Failed to ban user: ' + JSON.stringify(banUserRes.data));
  }

  // 9. Test that user login is blocked
  console.log('\n--- Step 8: Verify user account login blocked ---');
  const bannedUserLogin = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    email: 'nila@umi.live',
    password: 'user123',
  });
  console.log(`Banned user login status: ${bannedUserLogin.status} (Expected 403)`);
  console.log(`Message: ${bannedUserLogin.data.message}`);
  if (bannedUserLogin.status !== 403) {
    throw new Error('Banned user was not blocked: ' + JSON.stringify(bannedUserLogin.data));
  }

  // 10. Unban user account
  console.log('\n--- Step 9: Restore user account ---');
  const unbanUserRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/users/2/ban',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${moderatorToken}`,
    },
  }, {
    isBanned: false,
    banAllDevices: true,
  });
  console.log(`Status: ${unbanUserRes.status}`);
  console.log(`Message: ${unbanUserRes.data.message}`);
  if (!unbanUserRes.data.success || unbanUserRes.data.is_banned !== false) {
    throw new Error('Failed to unban user: ' + JSON.stringify(unbanUserRes.data));
  }

  // 11. View platform banned devices list
  console.log('\n--- Step 10: GET /api/mobile/moderator/devices ---');
  const listBannedRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/devices',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${moderatorToken}` },
  });
  console.log(`Status: ${listBannedRes.status}`);
  console.log(`Total currently banned devices: ${listBannedRes.data.pagination?.total}`);

  console.log('\n🎉 ALL MODERATOR & DEVICE BAN API TESTS PASSED! 🎉');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
