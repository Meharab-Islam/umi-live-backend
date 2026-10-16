const BASE_URL = 'http://localhost:5050';

function createMockGoogleIdToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'mock_signature_bytes';
  return `${header}.${body}.${signature}`;
}

async function runTest() {
  console.log('=== TEST GOOGLE TOKEN & PROFILE EXTRACTION FLOW ===\n');

  const randomSub = `google_sub_${Date.now()}`;
  const initialGoogleEmail = `user_${Date.now()}@gmail.com`;
  const initialGoogleName = 'Google Extracted Name';
  const initialGoogleAvatar = 'https://lh3.googleusercontent.com/initial_avatar.jpg';

  // 1. Create a simulated Google ID token with sub, email, name, picture
  const idToken = createMockGoogleIdToken({
    sub: randomSub,
    email: initialGoogleEmail,
    name: initialGoogleName,
    picture: initialGoogleAvatar,
    iss: 'https://accounts.google.com',
    aud: 'my-google-client-id.apps.googleusercontent.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  console.log(`1. Sending Google Login with google_token ONLY (no explicit name/avatar in body)...`);
  const res1 = await fetch(`${BASE_URL}/api/mobile/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      google_token: idToken,
      device_unique_id: 'test-google-token-device-01',
      device_name: 'Google Pixel 8 Pro',
    }),
  });

  const data1 = await res1.json();
  console.log(`Status: ${res1.status}, is_new_user: ${data1.is_new_user}`);
  console.log(`Extracted Name: "${data1.user?.full_name}" (Expected: "${initialGoogleName}")`);
  console.log(`Extracted Email: "${data1.user?.email}" (Expected: "${initialGoogleEmail}")`);
  console.log(`Extracted Avatar: "${data1.user?.avatar_url}" (Expected: "${initialGoogleAvatar}")`);

  if (
    res1.status === 201 &&
    data1.is_new_user === true &&
    data1.user?.full_name === initialGoogleName &&
    data1.user?.email === initialGoogleEmail &&
    data1.user?.avatar_url === initialGoogleAvatar
  ) {
    console.log('✅ PASS: Successfully extracted name, email, avatar from Google token and created new user!\n');
  } else {
    console.error('❌ FAIL: Extraction failed', data1);
    process.exit(1);
  }

  const userId = data1.user.id;
  const userToken = data1.token;

  // 2. User customizes their profile in the app
  console.log(`2. User #${userId} updates their name & avatar in the app...`);
  const updateRes = await fetch(`${BASE_URL}/api/mobile/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      full_name: 'My Special In-App Custom Name 🌟',
      avatar_url: 'https://cdn.umi.live/avatars/my_special_avatar.png',
    }),
  });
  const updateData = await updateRes.json();
  console.log(`Updated Name in App: "${updateData.user?.full_name}"\n`);

  // 3. User logs in AGAIN via Google (even if Google token has different name or picture)
  console.log('3. User logs in AGAIN with Google token (simulating different name on Google)...');
  const differentIdToken = createMockGoogleIdToken({
    sub: randomSub,
    email: initialGoogleEmail,
    name: 'Different Name From Google Account',
    picture: 'https://lh3.googleusercontent.com/different_picture.jpg',
  });

  const res2 = await fetch(`${BASE_URL}/api/mobile/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      google_token: differentIdToken,
      device_unique_id: 'test-google-token-device-01',
      device_name: 'Google Pixel 8 Pro',
    }),
  });

  const data2 = await res2.json();
  console.log(`Status: ${res2.status}, is_new_user: ${data2.is_new_user}`);
  console.log(`Result Name in DB: "${data2.user?.full_name}" (Expected: "My Special In-App Custom Name 🌟")`);
  console.log(`Result Avatar in DB: "${data2.user?.avatar_url}" (Expected: "https://cdn.umi.live/avatars/my_special_avatar.png")`);

  if (
    res2.status === 200 &&
    data2.is_new_user === false &&
    data2.user?.full_name === 'My Special In-App Custom Name 🌟' &&
    data2.user?.avatar_url === 'https://cdn.umi.live/avatars/my_special_avatar.png'
  ) {
    console.log('✅ PASS: Existing account login strictly preserved the custom name, email, and avatar!\n');
  } else {
    console.error('❌ FAIL: Existing account profile was incorrectly modified', data2);
    process.exit(1);
  }

  console.log('🎉 ALL GOOGLE TOKEN EXTRACTION & PRESERVATION TESTS PASSED!');
}

runTest().catch(console.error);
