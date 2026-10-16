const BASE_URL = 'http://localhost:5050';

async function testRegistration() {
  console.log('=== TEST: EMAIL REGISTRATION WITHOUT ROLE OR AVATAR ===\n');

  const randomNum = Date.now();
  const testEmail = `newuser_${randomNum}@umi.live`;

  console.log(`1. Testing registration with only email, password, and full_name: ${testEmail}...`);
  const res1 = await fetch(`${BASE_URL}/api/mobile/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'MyPassword123',
      full_name: 'Shakib Khan',
    }),
  });

  const data1 = await res1.json();
  console.log(`Status: ${res1.status}, Success: ${data1.success}`);
  console.log(`Registered user role: "${data1.user?.role}" (Expected: "user")`);
  console.log(`Registered user avatar: "${data1.user?.avatar_url}" (Expected: dicebear bottts avatar)`);

  if (
    res1.status === 201 &&
    data1.user?.role === 'user' &&
    data1.user?.avatar_url?.includes('dicebear.com') &&
    data1.token
  ) {
    console.log('✅ PASS: Registration succeeded with role="user" and automated default avatar!\n');
  } else {
    console.error('❌ FAIL: Registration failed', data1);
    process.exit(1);
  }

  // 2. Testing that client CANNOT override role or avatar during registration
  const testEmail2 = `hacker_${randomNum}@umi.live`;
  console.log(`2. Testing that sending role="admin" and custom avatar_url is ignored...`);
  const res2 = await fetch(`${BASE_URL}/api/mobile/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail2,
      password: 'MyPassword123',
      full_name: 'Attempted Admin',
      role: 'admin',
      avatar_url: 'https://evil.site/admin.png',
    }),
  });

  const data2 = await res2.json();
  console.log(`Status: ${res2.status}, Registered role: "${data2.user?.role}", avatar: "${data2.user?.avatar_url}"`);
  if (
    res2.status === 201 &&
    data2.user?.role === 'user' &&
    data2.user?.avatar_url?.includes('dicebear.com') &&
    !data2.user?.avatar_url?.includes('evil.site')
  ) {
    console.log('✅ PASS: Client role override and avatar injection successfully blocked!\n');
  } else {
    console.error('❌ FAIL: Role or avatar override was not blocked', data2);
    process.exit(1);
  }

  console.log('🎉 EMAIL REGISTRATION TESTS PASSED PERFECTLY!');
}

testRegistration().catch(console.error);
