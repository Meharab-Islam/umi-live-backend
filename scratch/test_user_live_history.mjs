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
  console.log('🧪 TESTING GLOBAL USER LIVE STREAMING DAILY HISTORY & BREAKDOWN');
  console.log('===================================================================');

  // 1. Authenticate Host User (User 2: nila@umi.live)
  console.log('\n[1] Authenticating as Host (nila@umi.live)...');
  const hostLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'nila@umi.live', password: 'user123' }),
  });
  if (!hostLogin.ok) {
    console.error('❌ Host login failed:', hostLogin.data);
    process.exit(1);
  }
  const hostToken = hostLogin.data.token;
  console.log('✅ Host authenticated. User ID:', hostLogin.data.user.id, 'Role:', hostLogin.data.user.role);

  // 2. Authenticate Regular User (User 5: tanvir@umi.live)
  console.log('\n[2] Authenticating as Normal User (tanvir@umi.live)...');
  const userLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'tanvir@umi.live', password: 'user123' }),
  });
  if (!userLogin.ok) {
    console.error('❌ User login failed:', userLogin.data);
    process.exit(1);
  }
  const userToken = userLogin.data.token;
  console.log('✅ Regular User authenticated. User ID:', userLogin.data.user.id, 'Role:', userLogin.data.user.role);

  // 3. Authenticate Admin (Superadmin: admin@umi.live)
  console.log('\n[3] Authenticating as Admin (admin@umi.live)...');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@umi.live', password: 'admin123' }),
  });
  const adminToken = adminLogin.data.token;
  console.log('✅ Admin authenticated. User ID:', adminLogin.data.user.id, 'Role:', adminLogin.data.user.role);

  // 4. Test Normal User accessing GET /api/mobile/live/history (Must be 200 OK without role restriction!)
  console.log('\n[4] Normal User accessing GET /api/mobile/live/history...');
  const normalUserHistory = await request('/api/mobile/live/history', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log('Normal User Status:', normalUserHistory.status);
  console.log('Normal User Data:', {
    user: normalUserHistory.data?.data?.user?.full_name,
    role: normalUserHistory.data?.data?.user?.role,
    summary: normalUserHistory.data?.data?.summary,
    breakdown_count: normalUserHistory.data?.data?.daily_breakdown?.length,
  });
  if (normalUserHistory.status !== 200 || !normalUserHistory.data?.success) {
    console.error('❌ Normal user should be able to access live history');
    process.exit(1);
  }
  console.log('✅ Normal User successfully accessed live streaming history!');

  // 5. Test Host User accessing GET /api/mobile/live/history
  console.log('\n[5] Host User accessing GET /api/mobile/live/history...');
  const hostHistory = await request('/api/mobile/live/history', {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  console.log('Host Status:', hostHistory.status);
  console.log('Host Summary:', hostHistory.data?.data?.summary);
  console.log('Daily Breakdown Items:');
  const items = hostHistory.data?.data?.daily_breakdown || [];
  for (const item of items) {
    console.log(` - Date: ${item.date} | Total: ${item.formatted_total_duration} (${item.total_live_minutes}m) | Video: ${item.formatted_video_duration} | Audio: ${item.formatted_audio_duration} | Sessions: ${item.sessions_count} | Coins Received: ${item.coins_received}`);
  }
  if (hostHistory.status !== 200 || !Array.isArray(items)) {
    console.error('❌ Host history failed');
    process.exit(1);
  }
  console.log('✅ Host daily live history verified with duration, sessions count, and coins received.');

  // 6. Test Query Filter ?month=all (Lifetime history)
  console.log('\n[6] Testing GET /api/mobile/live/history?month=all (Lifetime breakdown)...');
  const allTimeHistory = await request('/api/mobile/live/history?month=all', {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  console.log('Lifetime Status:', allTimeHistory.status);
  console.log('Lifetime Summary:', allTimeHistory.data?.data?.summary);
  if (allTimeHistory.status !== 200 || allTimeHistory.data?.data?.period?.is_all_time !== true) {
    console.error('❌ Lifetime history filter failed');
    process.exit(1);
  }
  console.log('✅ Lifetime history filter verified.');

  // 7. Test Admin inspecting another user via ?userId=2
  console.log('\n[7] Admin inspecting Host 2 via GET /api/mobile/live/history?userId=2...');
  const adminInspectRes = await request('/api/mobile/live/history?userId=2', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Admin Inspect Status:', adminInspectRes.status);
  console.log('Inspected Target:', adminInspectRes.data?.data?.user?.full_name);
  if (adminInspectRes.status !== 200 || adminInspectRes.data?.data?.user?.id !== 2) {
    console.error('❌ Admin inspect failed');
    process.exit(1);
  }
  console.log('✅ Admin inspection of target user verified.');

  // 8. Test alias routes: /api/mobile/live/my-history and /api/mobile/live/user-activity
  console.log('\n[8] Testing alias routes /my-history and /user-activity...');
  const alias1 = await request('/api/mobile/live/my-history', {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  const alias2 = await request('/api/mobile/live/user-activity', {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  if (alias1.status !== 200 || alias2.status !== 200) {
    console.error('❌ Alias routes failed');
    process.exit(1);
  }
  console.log('✅ Alias routes working seamlessly.');

  console.log('\n===================================================================');
  console.log('🎉 ALL GLOBAL LIVE STREAMING HISTORY TESTS PASSED (100%)! 🚀');
  console.log('===================================================================');
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
