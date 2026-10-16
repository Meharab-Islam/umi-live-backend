const BASE_URL = 'http://localhost:5050';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('===================================================================');
  console.log('🧪 TESTING USER-SCOPED DEVICE BAN WORKFLOW (PREVENT SAME-NAME CONFLICT)');
  console.log('===================================================================');

  // 1. Authenticate Admin (Moderator privileges)
  console.log('\n[1] Authenticating as Admin (admin@umi.live)...');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@umi.live', password: 'admin123' }),
  });
  if (!adminLogin.ok) {
    console.error('❌ Admin login failed:', adminLogin.data);
    process.exit(1);
  }
  const adminToken = adminLogin.data.token;
  console.log('✅ Admin authenticated.');

  // 2. Register devices with the exact same name for User 2 (Nila) and User 5 (Tanvir)
  console.log('\n[2] Registering same-named device ("iPhone 13 Pro Max") for User 2 and User 5...');
  const devRegUser2 = await request('/api/mobile/moderator/users/2/devices/register', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      deviceId: 'hw-nila-iphone13-uuid-001',
      deviceModel: 'iPhone 13 Pro Max',
      osType: 'iOS',
      osVersion: '17.2',
    }),
  });
  console.log('User 2 Device Reg Status:', devRegUser2.status, devRegUser2.data?.message);

  const devRegUser5 = await request('/api/mobile/moderator/users/5/devices/register', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      deviceId: 'hw-tanvir-iphone13-uuid-002',
      deviceModel: 'iPhone 13 Pro Max',
      osType: 'iOS',
      osVersion: '17.3',
    }),
  });
  console.log('User 5 Device Reg Status:', devRegUser5.status, devRegUser5.data?.message);

  if (devRegUser2.status !== 200 || devRegUser5.status !== 200) {
    console.error('❌ Failed device registration');
    process.exit(1);
  }
  console.log('✅ Both users have a device named "iPhone 13 Pro Max" registered with distinct hardware UUIDs.');

  // 3. Test attempting to ban device without selecting user ID first
  console.log('\n[3] Testing device ban WITHOUT selecting User ID first (MUST BE REJECTED 400)...');
  const noUserBanRes = await request('/api/mobile/moderator/devices/iPhone 13 Pro Max/ban', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ isBanned: true, reason: 'Testing ambiguity check' }),
  });
  console.log('Status without user ID:', noUserBanRes.status);
  console.log('Response message:', noUserBanRes.data?.message);
  if (noUserBanRes.status !== 400) {
    console.error('❌ Expected 400 Bad Request when userId is missing, got:', noUserBanRes.status);
    process.exit(1);
  }
  console.log('✅ Correctly blocked: User ID must be selected first!');

  // 4. Moderator selects User 2 and bans their "iPhone 13 Pro Max"
  console.log('\n[4] Moderator selects User 2 and bans their "iPhone 13 Pro Max"...');
  const banUser2DevRes = await request('/api/mobile/moderator/users/2/devices/iPhone 13 Pro Max/ban', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      isBanned: true,
      reason: 'Malicious activity detected from this account',
    }),
  });
  console.log('Ban Status:', banUser2DevRes.status);
  console.log('Ban Response:', banUser2DevRes.data);
  if (banUser2DevRes.status !== 200 || banUser2DevRes.data?.device?.is_banned !== true) {
    console.error('❌ Failed to ban device for User 2');
    process.exit(1);
  }
  console.log('✅ User 2 device banned:', banUser2DevRes.data.device.device_id);

  // 5. Verify User 2's device is banned in their profile
  console.log('\n[5] Inspecting User 2 devices...');
  const user2Details = await request('/api/mobile/moderator/users/2', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const u2Dev = user2Details.data?.devices?.find(d => d.device_id === 'hw-nila-iphone13-uuid-001');
  console.log('User 2 device is_banned:', u2Dev?.is_banned);
  if (!u2Dev?.is_banned) {
    console.error('❌ User 2 device should be banned in DB');
    process.exit(1);
  }

  // 6. Verify User 5's same-named device remains UNTOUCHED (NOT BANNED)
  console.log('\n[6] Inspecting User 5 devices (Must remain active / NOT banned)...');
  const user5Details = await request('/api/mobile/moderator/users/5', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const u5Dev = user5Details.data?.devices?.find(d => d.device_id === 'hw-tanvir-iphone13-uuid-002');
  console.log('User 5 device is_banned:', u5Dev?.is_banned);
  if (u5Dev?.is_banned !== false) {
    console.error('❌ User 5 device was mistakenly banned! It should be false.');
    process.exit(1);
  }
  console.log('✅ CONFIRMED: User 5 device remains completely active and unbanned despite having the identical name!');

  // 7. Verify login enforcement on both web and mobile endpoints
  console.log('\n[7] Testing login from User 2 banned device (hw-nila-iphone13-uuid-001)...');
  const user2Login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'nila@umi.live',
      password: 'user123',
      deviceId: 'hw-nila-iphone13-uuid-001',
    }),
  });
  console.log('User 2 Web Login Status:', user2Login.status, user2Login.data?.message);

  const user2MobileLogin = await request('/api/mobile/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'nila@umi.live',
      password: 'user123',
      deviceId: 'hw-nila-iphone13-uuid-001',
    }),
  });
  console.log('User 2 Mobile Login Status:', user2MobileLogin.status, user2MobileLogin.data?.message);

  if (user2Login.status !== 403 || user2MobileLogin.status !== 403) {
    console.error('❌ User 2 login from banned device should be rejected with 403 on both endpoints');
    process.exit(1);
  }
  console.log('✅ User 2 banned device successfully blocked at both web and mobile login.');

  console.log('\n[8] Testing login from User 5 unbanned device (hw-tanvir-iphone13-uuid-002)...');
  const user5Login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'tanvir@umi.live',
      password: 'user123',
      deviceId: 'hw-tanvir-iphone13-uuid-002',
    }),
  });
  console.log('User 5 Login Status:', user5Login.status, 'User:', user5Login.data?.user?.full_name);
  if (user5Login.status !== 200) {
    console.error('❌ User 5 login should succeed with 200 OK');
    process.exit(1);
  }
  console.log('✅ User 5 logged in successfully without any impediment.');

  // 9. Lift ban on User 2's device
  console.log('\n[9] Unbanning User 2 device...');
  const unbanRes = await request('/api/mobile/moderator/users/2/devices/hw-nila-iphone13-uuid-001/ban', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ isBanned: false }),
  });
  console.log('Unban Status:', unbanRes.status, unbanRes.data?.message);
  if (unbanRes.status !== 200 || unbanRes.data?.device?.is_banned !== false) {
    console.error('❌ Failed to unban User 2 device');
    process.exit(1);
  }

  // 10. Verify User 2 can now login again
  const user2Retry = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'nila@umi.live',
      password: 'user123',
      deviceId: 'hw-nila-iphone13-uuid-001',
    }),
  });
  console.log('User 2 Login Status after unban:', user2Retry.status, 'User:', user2Retry.data?.user?.full_name);
  if (user2Retry.status !== 200) {
    console.error('❌ User 2 should be able to login after device unban');
    process.exit(1);
  }
  console.log('✅ User 2 login restored successfully.');

  console.log('\n===================================================================');
  console.log('🎉 ALL USER-SCOPED DEVICE BAN TESTS PASSED WITH 100% SUCCESS! 🚀');
  console.log('===================================================================');
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
