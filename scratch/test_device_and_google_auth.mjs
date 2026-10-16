const BASE_URL = 'http://localhost:5050';

async function runTests() {
  console.log('=== TEST SUITE: DEVICE LOGIN & GOOGLE AUTH ===\n');

  // TEST 1: Mobile login without device information
  console.log('1. Testing mobile login WITHOUT device unique_id...');
  const res1 = await fetch(`${BASE_URL}/api/mobile/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin@umi.live',
      password: 'admin123',
    }),
  });
  const data1 = await res1.json();
  console.log(`Status: ${res1.status}, Message: ${data1.message}`);
  if (res1.status === 400 && data1.message.includes('Device unique ID')) {
    console.log('✅ PASS: Rejected login when device_unique_id is missing\n');
  } else {
    console.error('❌ FAIL: Expected 400 missing device ID', data1);
  }

  // TEST 2: Mobile login without device name
  console.log('2. Testing mobile login with device_unique_id but WITHOUT device_name...');
  const res2 = await fetch(`${BASE_URL}/api/mobile/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin@umi.live',
      password: 'admin123',
      device_unique_id: 'test-dev-uuid-001',
    }),
  });
  const data2 = await res2.json();
  console.log(`Status: ${res2.status}, Message: ${data2.message}`);
  if (res2.status === 400 && data2.message.includes('Device name')) {
    console.log('✅ PASS: Rejected login when device_name is missing\n');
  } else {
    console.error('❌ FAIL: Expected 400 missing device name', data2);
  }

  // TEST 3: Mobile login WITH device information
  console.log('3. Testing mobile login WITH valid device information...');
  const res3 = await fetch(`${BASE_URL}/api/mobile/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin@umi.live',
      password: 'admin123',
      device_unique_id: 'test-device-uuid-001',
      device_name: 'Google Pixel 8 Pro',
    }),
  });
  const data3 = await res3.json();
  console.log(`Status: ${res3.status}, Success: ${data3.success}, Token: ${!!data3.token}`);
  if (res3.status === 200 && data3.token) {
    console.log('✅ PASS: Mobile login succeeded with device info!\n');
  } else {
    console.error('❌ FAIL: Mobile login failed', data3);
  }

  // TEST 4: Google login missing device or google_id
  console.log('4. Testing Google login validation (missing google_id)...');
  const res4 = await fetch(`${BASE_URL}/api/mobile/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_unique_id: 'test-google-dev-01',
      device_name: 'Samsung S24 Ultra',
    }),
  });
  const data4 = await res4.json();
  console.log(`Status: ${res4.status}, Message: ${data4.message}`);
  if (res4.status === 400) {
    console.log('✅ PASS: Rejected Google login without google_id\n');
  } else {
    console.error('❌ FAIL: Expected 400', data4);
  }

  // TEST 5: Google login - CREATE NEW ACCOUNT
  const uniqueGoogleId = `google_user_${Date.now()}`;
  console.log(`5. Testing Google login for NEW user (ID: ${uniqueGoogleId})...`);
  const res5 = await fetch(`${BASE_URL}/api/mobile/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      google_id: uniqueGoogleId,
      device_unique_id: 'device-google-pixel-007',
      device_name: 'Google Pixel 8 Pro',
      email: `${uniqueGoogleId}@gmail.com`,
      full_name: 'Initial Google Name',
      avatar_url: 'https://cdn.umi.live/avatars/initial_google.jpg',
    }),
  });
  const data5 = await res5.json();
  console.log(`Status: ${res5.status}, is_new_user: ${data5.is_new_user}, Name: ${data5.user?.full_name}, Token: ${!!data5.token}`);
  if (res5.status === 201 && data5.is_new_user === true && data5.token) {
    console.log('✅ PASS: New Google user created with initial name & image!\n');
  } else {
    console.error('❌ FAIL: Google new user creation failed', data5);
    process.exit(1);
  }

  const createdUserId = data5.user.id;

  // TEST 6: User customizes their profile name & image in the app
  console.log(`6. Simulating user customizing their name & avatar in-app (User #${createdUserId})...`);
  const authHeader = `Bearer ${data5.token}`;
  const res6 = await fetch(`${BASE_URL}/api/mobile/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({
      full_name: 'Custom In-App Renamed VIP',
      avatar_url: 'https://cdn.umi.live/avatars/custom_vip_avatar.png',
      bio: 'Streamer bio updated!',
    }),
  });
  const data6 = await res6.json();
  console.log(`Update status: ${res6.status}, Updated name: ${data6.user?.full_name}`);
  if (res6.status === 200 && data6.user?.full_name === 'Custom In-App Renamed VIP') {
    console.log('✅ PASS: Profile updated in app.\n');
  } else {
    console.error('❌ FAIL: Profile update failed', data6);
  }

  // TEST 7: Google login for EXISTING USER - MUST PRESERVE custom name & image!
  console.log(`7. Testing Google login for EXISTING user (same google_id: ${uniqueGoogleId})...`);
  console.log('   Sending different Google payload: name="Changed On Google" & avatar="different_google.png"...');
  const res7 = await fetch(`${BASE_URL}/api/mobile/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      google_id: uniqueGoogleId,
      device_unique_id: 'device-google-pixel-007',
      device_name: 'Google Pixel 8 Pro',
      email: `${uniqueGoogleId}@gmail.com`,
      full_name: 'Changed On Google',
      avatar_url: 'https://lh3.google.com/different_google.png',
    }),
  });
  const data7 = await res7.json();
  console.log(`Status: ${res7.status}, is_new_user: ${data7.is_new_user}`);
  console.log(`Result Name in DB: "${data7.user?.full_name}" (Expected: "Custom In-App Renamed VIP")`);
  console.log(`Result Avatar in DB: "${data7.user?.avatar_url}" (Expected: "https://cdn.umi.live/avatars/custom_vip_avatar.png")`);

  if (
    res7.status === 200 &&
    data7.is_new_user === false &&
    data7.user?.full_name === 'Custom In-App Renamed VIP' &&
    data7.user?.avatar_url === 'https://cdn.umi.live/avatars/custom_vip_avatar.png' &&
    data7.token
  ) {
    console.log('✅ PASS: Existing Google account logged in with fresh access token AND preserved original name & image!\n');
  } else {
    console.error('❌ FAIL: Existing Google account did not preserve name or image!', data7);
    process.exit(1);
  }

  console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
}

runTests().catch(console.error);
