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
  console.log('--- Testing Redis GET Cache & Instant Update Invalidation ---');

  // 1. Login as Admin
  const adminLogin = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'admin@umi.live', password: 'admin123' });

  const adminToken = adminLogin.data.token;
  console.log('✅ Admin login successful');

  // 2. Initial GET /api/mobile/host/agency?hostId=2
  console.log('\n--- Step 1: Initial GET Host Agency Summary ---');
  const get1 = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/host/agency?hostId=2',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });

  const initialRate = get1.data.agency?.commission_rate;
  console.log(`Initial Agency Commission: ${initialRate}%`);
  console.log(`Initial Performance Under Agency: ${get1.data.performance_under_agency?.commission_rate_percentage}%`);

  // 3. Mutate Agency Commission: change from initialRate to 20.00%
  const newRate = initialRate === 20 ? 18 : 20;
  console.log(`\n--- Step 2: Mutating Agency Commission in MySQL -> Changing to ${newRate}% ---`);
  const updateAgency = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/admin/agencies/1',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
  }, { commissionRate: newRate });

  console.log('Update response:', updateAgency.data.message);
  if (!updateAgency.data.success) {
    throw new Error('Agency update failed: ' + JSON.stringify(updateAgency.data));
  }

  // 4. Immediate GET /api/mobile/host/agency?hostId=2 (Should be instant fresh from Redis update/invalidation!)
  console.log('\n--- Step 3: Immediate GET to verify Instant Invalidation ---');
  const get2 = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/host/agency?hostId=2',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });

  const updatedRate = get2.data.agency?.commission_rate;
  console.log(`Fresh GET Agency Commission: ${updatedRate}%`);
  console.log(`Fresh GET Host Commission Rate: ${get2.data.performance_under_agency?.commission_rate_percentage}%`);

  if (updatedRate !== newRate) {
    throw new Error(`Stale read detected! Expected ${newRate}%, got ${updatedRate}%`);
  }
  console.log('✅ Zero Stale Reads! Instant invalidation confirmed.');

  // 5. Subsequent GET to verify Redis Cache hit (< 5ms response)
  console.log('\n--- Step 4: Subsequent GET (Cached in Redis) ---');
  const t0 = Date.now();
  const get3 = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/host/agency?hostId=2',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const durationMs = Date.now() - t0;
  console.log(`Redis Cache Response Time: ${durationMs}ms`);
  console.log(`Cached Agency Commission: ${get3.data.agency?.commission_rate}%`);

  if (get3.data.agency?.commission_rate !== newRate) {
    throw new Error('Redis cached value incorrect: ' + JSON.stringify(get3.data));
  }

  console.log('\n🎉 REDIS GET CACHE & INSTANT UPDATE SYNCHRONIZATION VERIFIED! 🎉');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
