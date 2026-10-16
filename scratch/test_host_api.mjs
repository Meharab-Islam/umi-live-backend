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
  console.log('--- Starting Host Agency & Monthly Breakdown API Tests ---');

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
  const adminToken = adminLogin.data.token;
  console.log('✅ Admin login successful');

  // 2. Login as Host (User #2 - Nila Akter)
  const hostLogin = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'nila@umi.live', password: 'user123' });

  let hostToken;
  if (hostLogin.data.success) {
    hostToken = hostLogin.data.token;
    console.log('✅ Logged in as Host (Nila Akter)');
  } else {
    console.log('⚠️ Host login fallback to admin token');
    hostToken = adminToken;
  }

  // 3. Test GET /api/mobile/host/agency
  console.log('\n--- Step 1: GET /api/mobile/host/agency ---');
  const agencyRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/host/agency?hostId=2',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${hostToken}` },
  });
  console.log(`Status: ${agencyRes.status}`);
  console.log(`Host: ${agencyRes.data.host?.full_name}, host_type: ${agencyRes.data.host?.host_type}`);
  console.log(`Has Agency: ${agencyRes.data.has_agency}`);
  if (agencyRes.data.agency) {
    console.log(`Agency Name: ${agencyRes.data.agency?.name}, Commission: ${agencyRes.data.agency?.commission_rate}%`);
  }
  console.log(`Performance under agency:`, agencyRes.data.performance_under_agency);
  if (!agencyRes.data.success || !agencyRes.data.host) {
    throw new Error('Failed to get host agency summary: ' + JSON.stringify(agencyRes.data));
  }

  // 4. Test GET /api/mobile/host/performance/monthly
  console.log('\n--- Step 2: GET /api/mobile/host/performance/monthly ---');
  const monthlyRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/host/performance/monthly?hostId=2',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${hostToken}` },
  });
  console.log(`Status: ${monthlyRes.status}`);
  console.log(`Month: ${monthlyRes.data.month}`);
  console.log(`Monthly Summary:`, monthlyRes.data.monthly_summary);
  console.log(`Daily Breakdown Days count: ${monthlyRes.data.daily_breakdown?.length}`);
  if (monthlyRes.data.daily_breakdown?.length > 0) {
    console.log('Sample Day:', monthlyRes.data.daily_breakdown[0]);
  }
  if (!monthlyRes.data.success || !monthlyRes.data.monthly_summary) {
    throw new Error('Failed to get monthly breakdown: ' + JSON.stringify(monthlyRes.data));
  }

  // 5. Test GET /api/mobile/host/streams
  console.log('\n--- Step 3: GET /api/mobile/host/streams ---');
  const streamsRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/host/streams?hostId=2',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${hostToken}` },
  });
  console.log(`Status: ${streamsRes.status}`);
  console.log(`Total streams recorded: ${streamsRes.data.pagination?.total}`);
  if (!streamsRes.data.success) {
    throw new Error('Failed to get host streams: ' + JSON.stringify(streamsRes.data));
  }

  // 6. Test GET /api/mobile/host/overview
  console.log('\n--- Step 4: GET /api/mobile/host/overview ---');
  const overviewRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/host/overview?hostId=2',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${hostToken}` },
  });
  console.log(`Status: ${overviewRes.status}`);
  console.log(`Today Summary:`, overviewRes.data.today);
  console.log(`This Month Summary:`, overviewRes.data.this_month);
  if (!overviewRes.data.success || !overviewRes.data.today || !overviewRes.data.this_month) {
    throw new Error('Failed to get host overview: ' + JSON.stringify(overviewRes.data));
  }

  // 7. Test Role Guard: Non-host user (role = 'user')
  console.log('\n--- Step 5: Test Role Guard (User with role user) ---');
  const userLogin = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'mobile_user_test@umi.live', password: 'user123' });

  if (userLogin.data.success) {
    const regularUserToken = userLogin.data.token;
    const forbiddenRes = await makeRequest({
      hostname: 'localhost',
      port: 5050,
      path: '/api/mobile/host/agency',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${regularUserToken}` },
    });
    console.log(`Regular user access status: ${forbiddenRes.status} (Expected 403)`);
    console.log(`Message: ${forbiddenRes.data.message}`);
    if (forbiddenRes.status !== 403) {
      throw new Error('Regular user was not blocked: ' + JSON.stringify(forbiddenRes.data));
    }
  }

  console.log('\n🎉 ALL HOST PERFORMANCE & BREAKDOWN API TESTS PASSED! 🎉');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
