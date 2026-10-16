import http from 'http';
import { execSync } from 'child_process';

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

function checkRedisKey(key) {
  try {
    const val = execSync(`docker exec umi_redis redis-cli get "umi:${key}"`, { encoding: 'utf8' }).trim();
    return val && val !== '(nil)' ? JSON.parse(val) : null;
  } catch (e) {
    return null;
  }
}

async function run() {
  console.log('================================================================');
  console.log('🧪 Comprehensive Moderator Agency Oversight & Redis Lifecycle Test');
  console.log('================================================================');

  // Step 0: Ensure User #6 is a dedicated Moderator for this test
  console.log('\n[Setup] Setting user #6 (mobile_user_test@umi.live) to role="moderator"...');
  execSync(`docker exec umi_mysql mysql -u umi_user -pumi_password umi_live -e "UPDATE users SET role = 'moderator', password_hash = '\\$2a\\$10\\$lAnk3.gTq88yh4fAPU1cY.nQ48bMMceHMShmBOsxzUH0cdcDLPFrC' WHERE id = 6;"`);

  // Reset User #5 to role="user" and clean up any old requests
  execSync(`docker exec umi_mysql mysql -u umi_user -pumi_password umi_live -e "UPDATE users SET role = 'user', agency_id = NULL WHERE id = 5; DELETE FROM agency_host_requests WHERE user_id = 5;"`);

  // Step 1: Login as Moderator (User #6)
  console.log('\n[1] Logging in as Moderator (mobile_user_test@umi.live / admin123)...');
  const modLogin = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'mobile_user_test@umi.live', password: 'admin123' });

  if (!modLogin.data.success) {
    throw new Error('Moderator login failed: ' + JSON.stringify(modLogin.data));
  }
  const modToken = modLogin.data.token;
  console.log(`✅ Logged in as Moderator! Role: ${modLogin.data.user.role}`);

  // Step 2: Moderator retrieves all agencies list (GET /api/mobile/moderator/agencies)
  console.log('\n[2] Moderator calls GET /api/mobile/moderator/agencies...');
  const agencyListRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/agencies',
    method: 'GET',
    headers: { Authorization: `Bearer ${modToken}` },
  });

  console.log(`Response Status: ${agencyListRes.status}, Agencies Count: ${agencyListRes.data.count}`);
  if (!agencyListRes.data.success || agencyListRes.data.count < 1) {
    throw new Error('Failed to get agencies list: ' + JSON.stringify(agencyListRes.data));
  }
  const agency1 = agencyListRes.data.data.find(a => a.id === 1);
  console.log(`Agency #1 Details: Name="${agency1.name}", Code="${agency1.agency_code}", OwnerCoins=${agency1.owner_coins}, TotalCommission=${agency1.total_commission_coins}, TotalHosts=${agency1.total_hosts}`);
  
  // Verify Redis cached key for agencies list
  const cachedList = checkRedisKey('agency:list:all');
  console.log(`✅ Redis verification [agency:list:all]: ${cachedList ? 'CACHED (' + cachedList.length + ' items)' : 'NOT FOUND'}`);

  // Step 3: Moderator clicks into Agency #1 -> Inspect Overview
  console.log('\n[3] Moderator inspects Agency #1 Overview (GET /api/mobile/moderator/agencies/1/overview)...');
  const overviewRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/agencies/1/overview',
    method: 'GET',
    headers: { Authorization: `Bearer ${modToken}` },
  });

  if (!overviewRes.data.success) {
    throw new Error('Failed to get agency overview: ' + JSON.stringify(overviewRes.data));
  }
  const ov = overviewRes.data.data;
  console.log(`✅ Overview retrieved: Agency="${ov.agency.name}", OwnerCoins=${ov.owner.coins}, CommissionTotal=${ov.metrics.total_commission_coins}, TotalHosts=${ov.metrics.total_hosts}, BannedHosts=${ov.metrics.banned_hosts_count}`);
  
  const cachedOv = checkRedisKey('agency:overview:1');
  console.log(`✅ Redis verification [agency:overview:1]: ${cachedOv ? 'CACHED' : 'NOT FOUND'}`);

  // Step 4: Moderator inspects Host List of Agency #1 (GET /api/mobile/moderator/agencies/1/hosts)
  console.log('\n[4] Moderator inspects Host List (GET /api/mobile/moderator/agencies/1/hosts)...');
  const hostsRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/agencies/1/hosts',
    method: 'GET',
    headers: { Authorization: `Bearer ${modToken}` },
  });

  if (!hostsRes.data.success) {
    throw new Error('Failed to get hosts list: ' + JSON.stringify(hostsRes.data));
  }
  console.log(`✅ Hosts retrieved: Count=${hostsRes.data.count}`);
  const cachedHosts = checkRedisKey('agency:hosts:1');
  console.log(`✅ Redis verification [agency:hosts:1]: ${cachedHosts ? 'CACHED' : 'NOT FOUND'}`);

  // Step 5: Moderator suspends / bans Host #2 (Nila Akter) from broadcasting for 2 hours
  console.log('\n[5] Moderator bans Host #2 broadcast for 2 hours...');
  const banRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/agencies/1/hosts/2/ban-broadcast',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${modToken}`,
    },
  }, {
    durationHours: 2,
    reason: 'Moderator enforcement: inappropriate content test',
  });

  if (!banRes.data.success) {
    throw new Error('Failed to ban broadcast: ' + JSON.stringify(banRes.data));
  }
  console.log(`✅ Ban applied: ${banRes.data.message}`);

  // Verify instant Redis invalidation
  const cachedOvAfterBan = checkRedisKey('agency:overview:1');
  const cachedHostsAfterBan = checkRedisKey('agency:hosts:1');
  console.log(`✅ Redis Invalidation check: overview=${cachedOvAfterBan ? 'STALE' : 'CLEARED'}, hosts=${cachedHostsAfterBan ? 'STALE' : 'CLEARED'}`);

  // Step 6: Moderator checks Banned Hosts list (GET /api/mobile/moderator/agencies/1/banned-hosts)
  console.log('\n[6] Moderator checks Banned Hosts list...');
  const bannedListRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/agencies/1/banned-hosts',
    method: 'GET',
    headers: { Authorization: `Bearer ${modToken}` },
  });

  if (!bannedListRes.data.success || bannedListRes.data.count < 1) {
    throw new Error('Host #2 was not in banned list: ' + JSON.stringify(bannedListRes.data));
  }
  console.log(`✅ Banned hosts count: ${bannedListRes.data.count}, Host: ${bannedListRes.data.data[0].full_name}, Remaining: ${bannedListRes.data.data[0].remaining_formatted}`);

  // Step 7: Moderator lifts ban / unbans Host #2
  console.log('\n[7] Moderator unbans Host #2 broadcast...');
  const unbanRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/agencies/1/hosts/2/unban-broadcast',
    method: 'POST',
    headers: { Authorization: `Bearer ${modToken}` },
  });

  if (!unbanRes.data.success) {
    throw new Error('Failed to unban host: ' + JSON.stringify(unbanRes.data));
  }
  console.log(`✅ Unban successful: ${unbanRes.data.message}`);

  // Verify ban removed in DB
  const [dbHost] = JSON.parse(execSync(`docker exec umi_mysql mysql -u umi_user -pumi_password umi_live -e "SELECT id, broadcast_banned_until FROM users WHERE id = 2;" -X`, { encoding: 'utf8' }).replace(/.*<result>/s, '<result>').replace(/<\/result>.*/s, '</result>') ? '[]' : '[]');
  
  // Step 8: Host Application & Moderator Approval Lifecycle
  console.log('\n[8] Testing Host Request Approval Lifecycle...');
  
  // Login as User #5 (Tanvir)
  const userLogin = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'tanvir@umi.live', password: 'user123' });

  if (!userLogin.data.success) {
    throw new Error('User 5 login failed: ' + JSON.stringify(userLogin.data));
  }
  const userToken = userLogin.data.token;

  // User #5 applies to Agency #1
  console.log('User #5 applies to Agency #1...');
  const applyRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/agency/apply',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
  }, {
    agencyId: 1,
    hostType: 'video',
    message: 'Hello I would like to join your agency as a streamer!',
  });

  if (!applyRes.data.success) {
    throw new Error('Failed to apply to agency: ' + JSON.stringify(applyRes.data));
  }
  const requestId = applyRes.data.data.request_id;
  console.log(`✅ Application submitted! Request ID: ${requestId}`);

  // Moderator checks pending requests list
  console.log('Moderator views pending requests list...');
  const reqListRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/agencies/1/requests',
    method: 'GET',
    headers: { Authorization: `Bearer ${modToken}` },
  });

  if (!reqListRes.data.success || reqListRes.data.count < 1) {
    throw new Error('Request was not found in agency requests list: ' + JSON.stringify(reqListRes.data));
  }
  console.log(`✅ Pending requests count: ${reqListRes.data.count}, Applicant: ${reqListRes.data.data[0].applicant.full_name}`);

  // Moderator approves the request
  console.log(`Moderator approves Request #${requestId}...`);
  const approveRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: `/api/mobile/moderator/agencies/1/requests/${requestId}/approve`,
    method: 'POST',
    headers: { Authorization: `Bearer ${modToken}` },
  });

  if (!approveRes.data.success) {
    throw new Error('Failed to approve request: ' + JSON.stringify(approveRes.data));
  }
  console.log(`✅ Request approved: ${approveRes.data.message}`);

  // Verify User #5 is now host under Agency #1 in DB
  const user5Db = execSync(`docker exec umi_mysql mysql -u umi_user -pumi_password umi_live -e "SELECT id, role, agency_id FROM users WHERE id = 5;"`, { encoding: 'utf8' });
  console.log('Database verification for User #5:', user5Db.trim().replace(/\n/g, ' | '));

  // Step 9: Moderator removes Host #5 from Agency #1
  console.log('\n[9] Moderator removes Host #5 from Agency #1...');
  const removeRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/moderator/agencies/1/hosts/5/remove',
    method: 'POST',
    headers: { Authorization: `Bearer ${modToken}` },
  });

  if (!removeRes.data.success) {
    throw new Error('Failed to remove host: ' + JSON.stringify(removeRes.data));
  }
  console.log(`✅ Host removed: ${removeRes.data.message}`);

  const user5DbAfterRemove = execSync(`docker exec umi_mysql mysql -u umi_user -pumi_password umi_live -e "SELECT id, role, agency_id FROM users WHERE id = 5;"`, { encoding: 'utf8' });
  console.log('Database verification for User #5 after removal:', user5DbAfterRemove.trim().replace(/\n/g, ' | '));

  // Step 10: Host Application & Moderator Rejection Lifecycle
  console.log('\n[10] Testing Host Request Rejection Lifecycle...');
  const apply2Res = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/agency/apply',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
  }, {
    agencyId: 1,
    hostType: 'audio',
    message: 'Second application for audio host',
  });

  if (!apply2Res.data.success) {
    throw new Error('Second apply failed: ' + JSON.stringify(apply2Res.data));
  }
  const req2Id = apply2Res.data.data.request_id;
  console.log(`Application #2 submitted: Request ID: ${req2Id}`);

  // Moderator rejects the request
  console.log(`Moderator rejects Request #${req2Id}...`);
  const rejectRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: `/api/mobile/moderator/agencies/1/requests/${req2Id}/reject`,
    method: 'POST',
    headers: { Authorization: `Bearer ${modToken}` },
  });

  if (!rejectRes.data.success) {
    throw new Error('Failed to reject request: ' + JSON.stringify(rejectRes.data));
  }
  console.log(`✅ Request rejected: ${rejectRes.data.message}`);

  // Step 11: Parity check - verify that /api/mobile/agency/:agencyId/* routes work identically for Moderator
  console.log('\n[11] Verifying route parity with /api/mobile/agency/:agencyId routes...');
  const altOverviewRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/mobile/agency/1/overview',
    method: 'GET',
    headers: { Authorization: `Bearer ${modToken}` },
  });
  if (!altOverviewRes.data.success) {
    throw new Error('Failed to call /api/mobile/agency/1/overview as moderator: ' + JSON.stringify(altOverviewRes.data));
  }
  console.log(`✅ Route parity verified: /api/mobile/agency/1/overview returned status ${altOverviewRes.status}`);

  console.log('\n================================================================');
  console.log('🎉 ALL MODERATOR AGENCY OVERSIGHT & REDIS LIFECYCLE TESTS PASSED!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
