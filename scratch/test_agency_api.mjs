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
  console.log('=====================================================');
  console.log('🧪 TESTING AGENCY MOBILE API COLLECTION & REDIS CACHE');
  console.log('=====================================================');

  // 1. Authenticate Admin (Owner of Agency 1)
  console.log('\n[1] Logging in as Admin/Agency Owner (admin@umi.live)...');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@umi.live', password: 'admin123' }),
  });
  if (!adminLogin.ok) {
    console.error('❌ Failed admin login:', adminLogin.data);
    process.exit(1);
  }
  const adminToken = adminLogin.data.token;
  console.log('✅ Admin authenticated. User ID:', adminLogin.data.user.id);

  // Authenticate Host (User 2: nila@umi.live)
  console.log('\n[2] Logging in as Host User (nila@umi.live)...');
  const hostLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'nila@umi.live', password: 'user123' }),
  });
  if (!hostLogin.ok) {
    console.error('❌ Failed host login:', hostLogin.data);
    process.exit(1);
  }
  const hostToken = hostLogin.data.token;
  const hostId = hostLogin.data.user.id;
  console.log('✅ Host authenticated. User ID:', hostId);

  // Authenticate Applicant (User 5: tanvir@umi.live)
  console.log('\n[3] Logging in as Regular User (tanvir@umi.live)...');
  const userLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'tanvir@umi.live', password: 'user123' }),
  });
  if (!userLogin.ok) {
    console.error('❌ Failed regular user login:', userLogin.data);
    process.exit(1);
  }
  const userToken = userLogin.data.token;
  const applicantId = userLogin.data.user.id;
  console.log('✅ Regular User authenticated. User ID:', applicantId);

  // 4. Test GET /api/mobile/agency/overview
  console.log('\n[4] Testing GET /api/mobile/agency/overview...');
  const overviewRes = await request('/api/mobile/agency/overview', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Status:', overviewRes.status);
  console.log('Agency Data:', {
    name: overviewRes.data?.data?.agency?.name,
    agency_code: overviewRes.data?.data?.agency?.agency_code,
    commission_rate: overviewRes.data?.data?.agency?.commission_rate,
    owner_coins: overviewRes.data?.data?.owner?.coins,
    metrics: overviewRes.data?.data?.metrics,
  });
  if (overviewRes.status !== 200 || !overviewRes.data?.data?.agency?.name) {
    console.error('❌ Failed to retrieve agency overview');
    process.exit(1);
  }
  console.log('✅ Agency overview verified successfully.');

  // 5. Test GET /api/mobile/agency/hosts
  console.log('\n[5] Testing GET /api/mobile/agency/hosts...');
  const hostsRes = await request('/api/mobile/agency/hosts', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Status:', hostsRes.status);
  console.log('Host Count:', hostsRes.data?.count);
  console.log('Hosts:', hostsRes.data?.data?.map(h => ({
    id: h.id,
    name: h.full_name,
    role: h.role,
    host_type: h.host_type,
    coins: h.coins,
    is_broadcast_banned: h.is_broadcast_banned,
    total_commission_coins: h.agency_commission_coins,
  })));
  if (hostsRes.status !== 200 || !Array.isArray(hostsRes.data?.data)) {
    console.error('❌ Failed to retrieve agency hosts list');
    process.exit(1);
  }
  console.log('✅ Agency hosts list verified successfully.');

  // 6. Test Timed Broadcast Ban on Host
  console.log(`\n[6] Testing POST /api/mobile/agency/hosts/${hostId}/ban-broadcast (2 Hours suspension)...`);
  const banRes = await request(`/api/mobile/agency/hosts/${hostId}/ban-broadcast`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      durationHours: 2,
      reason: 'Automated test broadcast suspension',
    }),
  });
  console.log('Ban Status:', banRes.status);
  console.log('Ban Response:', banRes.data);
  if (banRes.status !== 200 || !banRes.data?.data?.broadcast_banned_until) {
    console.error('❌ Failed to ban host broadcast');
    process.exit(1);
  }
  console.log('✅ Host broadcast suspended successfully.');

  // 7. Verify Host is in Banned Hosts list
  console.log('\n[7] Testing GET /api/mobile/agency/banned-hosts...');
  const bannedListRes = await request('/api/mobile/agency/banned-hosts', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Banned Hosts Status:', bannedListRes.status);
  console.log('Banned Hosts Count:', bannedListRes.data?.count);
  console.log('Banned Host Item:', bannedListRes.data?.data?.[0]);
  if (bannedListRes.status !== 200 || bannedListRes.data?.count === 0) {
    console.error('❌ Banned hosts list does not contain suspended host');
    process.exit(1);
  }
  console.log('✅ Suspended hosts list contains the banned host with countdown.');

  // 8. Verify Broadcast Enforcement: Suspended Host attempts to create live room
  console.log('\n[8] Testing Live Room creation while broadcast suspended (MUST BE REJECTED 403)...');
  const createRoomRes = await request('/api/mobile/live/rooms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({
      title: 'Should fail due to active suspension',
      category: 'Chatting',
      liveType: 'video',
    }),
  });
  console.log('Live Room Create Status:', createRoomRes.status);
  console.log('Live Room Create Response Message:', createRoomRes.data?.message);
  if (createRoomRes.status !== 403) {
    console.error('❌ Expected 403 Forbidden for suspended host, got:', createRoomRes.status);
    process.exit(1);
  }
  console.log('✅ Broadcast suspension successfully prevented room creation!');

  // 9. Test Unban Broadcast
  console.log(`\n[9] Testing POST /api/mobile/agency/hosts/${hostId}/unban-broadcast...`);
  const unbanRes = await request(`/api/mobile/agency/hosts/${hostId}/unban-broadcast`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Unban Status:', unbanRes.status);
  console.log('Unban Response:', unbanRes.data);
  if (unbanRes.status !== 200) {
    console.error('❌ Failed to unban host broadcast');
    process.exit(1);
  }

  // Verify banned hosts list is now empty
  const bannedCheck = await request('/api/mobile/agency/banned-hosts', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Banned Hosts Count after unban:', bannedCheck.data?.count);
  if (bannedCheck.data?.count !== 0) {
    console.error('❌ Banned hosts list should be empty after unban');
    process.exit(1);
  }
  console.log('✅ Host broadcast unbanned successfully.');

  // 10. Test Host Application to Join Agency
  console.log('\n[10] Testing POST /api/mobile/agency/apply (Applicant User submitting join application)...');
  // First ensure applicant is not in agency
  const applyRes = await request('/api/mobile/agency/apply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      agencyCode: 'AG-101',
      hostType: 'video',
      message: 'Experienced streamer applying to join Starlight Agency!',
    }),
  });
  console.log('Apply Status:', applyRes.status);
  console.log('Apply Response:', applyRes.data);
  if (applyRes.status !== 201 || !applyRes.data?.data?.request_id) {
    console.error('❌ Failed to submit agency application');
    process.exit(1);
  }
  const requestId = applyRes.data.data.request_id;
  console.log('✅ Join application submitted with Request ID:', requestId);

  // 11. Test Agency viewing pending requests
  console.log('\n[11] Testing GET /api/mobile/agency/requests?status=pending...');
  const requestsListRes = await request('/api/mobile/agency/requests?status=pending', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Requests Status:', requestsListRes.status);
  console.log('Requests Count:', requestsListRes.data?.count);
  const foundReq = requestsListRes.data?.data?.find(r => r.id === requestId);
  console.log('Found Request:', {
    id: foundReq?.id,
    applicant: foundReq?.applicant?.full_name,
    host_type: foundReq?.host_type,
    status: foundReq?.status,
  });
  if (!foundReq) {
    console.error('❌ Submitted request not found in pending requests list');
    process.exit(1);
  }
  console.log('✅ Pending requests list correctly includes new application.');

  // 12. Test Approve Join Request
  console.log(`\n[12] Testing POST /api/mobile/agency/requests/${requestId}/approve...`);
  const approveRes = await request(`/api/mobile/agency/requests/${requestId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Approve Status:', approveRes.status);
  console.log('Approve Response:', approveRes.data);
  if (approveRes.status !== 200 || approveRes.data?.data?.status !== 'approved') {
    console.error('❌ Failed to approve host request');
    process.exit(1);
  }
  console.log('✅ Host request approved successfully.');

  // Verify host is now affiliated in GET /api/mobile/agency/hosts
  const hostsAfterApprove = await request('/api/mobile/agency/hosts', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const newHostInList = hostsAfterApprove.data?.data?.find(h => h.id === applicantId);
  console.log('Newly approved host in agency hosts list:', {
    id: newHostInList?.id,
    name: newHostInList?.full_name,
    role: newHostInList?.role,
    host_type: newHostInList?.host_type,
  });
  if (!newHostInList || newHostInList.role !== 'host') {
    console.error('❌ Newly approved applicant is not active as host in agency');
    process.exit(1);
  }
  console.log('✅ Applicant is now fully affiliated with the agency as host.');

  // 13. Test Remove Host from Agency
  console.log(`\n[13] Testing POST /api/mobile/agency/hosts/${applicantId}/remove...`);
  const removeRes = await request(`/api/mobile/agency/hosts/${applicantId}/remove`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Remove Status:', removeRes.status);
  console.log('Remove Response:', removeRes.data);
  if (removeRes.status !== 200) {
    console.error('❌ Failed to remove host from agency');
    process.exit(1);
  }

  // Verify host is no longer in agency hosts list
  const hostsAfterRemove = await request('/api/mobile/agency/hosts', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const removedHostInList = hostsAfterRemove.data?.data?.find(h => h.id === applicantId);
  if (removedHostInList) {
    console.error('❌ Host should not be in agency list after removal');
    process.exit(1);
  }
  console.log('✅ Host removed from agency and returned to standard user role.');

  // 14. Test Reject Join Request flow
  console.log('\n[14] Testing Application Rejection flow...');
  // Applicant applies again
  const applyAgainRes = await request('/api/mobile/agency/apply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      agencyCode: 'AG-101',
      hostType: 'audio',
      message: 'Applying for audio host role',
    }),
  });
  const secondReqId = applyAgainRes.data?.data?.request_id;
  console.log('Second Application Request ID:', secondReqId);

  // Agency rejects application
  const rejectRes = await request(`/api/mobile/agency/requests/${secondReqId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Reject Status:', rejectRes.status);
  console.log('Reject Response:', rejectRes.data);
  if (rejectRes.status !== 200 || rejectRes.data?.data?.status !== 'rejected') {
    console.error('❌ Failed to reject host request');
    process.exit(1);
  }
  console.log('✅ Application rejected successfully.');

  console.log('\n=====================================================');
  console.log('🎉 ALL AGENCY MOBILE API TESTS PASSED SUCCESSFULLY! 🚀');
  console.log('=====================================================');
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
