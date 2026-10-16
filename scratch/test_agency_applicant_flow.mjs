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
  console.log('🧪 TESTING AGENCY HOST APPLICATION LIFECYCLE & STRICT CONSTRAINTS');
  console.log('===================================================================');

  // 1. Authenticate Admin (Owner of Agency 1: AG-101)
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
  console.log('✅ Admin authenticated. User ID:', adminLogin.data.user.id);

  // Authenticate Normal User (User 5: tanvir@umi.live)
  console.log('\n[2] Authenticating as Regular User (tanvir@umi.live)...');
  const userLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'tanvir@umi.live', password: 'user123' }),
  });
  if (!userLogin.ok) {
    console.error('❌ User login failed:', userLogin.data);
    process.exit(1);
  }
  const userToken = userLogin.data.token;
  const userId = userLogin.data.user.id;
  console.log('✅ User authenticated. User ID:', userId);

  // Ensure User 5 has clean slate (no agency affiliation)
  await request(`/api/mobile/agency/hosts/${userId}/remove`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // 3. User checks initial application status
  console.log('\n[3] Testing GET /api/mobile/agency/my-application (Initial State)...');
  const initialStatus = await request('/api/mobile/agency/my-application', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log('Initial Status:', initialStatus.status);
  console.log('Initial Application Info:', {
    is_affiliated: initialStatus.data?.data?.affiliation?.is_affiliated,
    has_pending_application: initialStatus.data?.data?.has_pending_application,
  });
  if (initialStatus.status !== 200 || initialStatus.data?.data?.has_pending_application !== false) {
    // If there was an old pending request, cancel it
    await request('/api/mobile/agency/my-application/cancel', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    });
  }

  // 4. User applies to Agency 1
  console.log('\n[4] User submitting host request to Starlight Agency (AG-101)...');
  const applyRes = await request('/api/mobile/agency/apply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      agencyCode: 'AG-101',
      hostType: 'video',
      message: 'Hello, passionate music streamer ready to join!',
    }),
  });
  console.log('Apply Status:', applyRes.status);
  console.log('Apply Response:', applyRes.data);
  if (applyRes.status !== 201 || !applyRes.data?.data?.request_id) {
    console.error('❌ Failed to submit application');
    process.exit(1);
  }
  const requestId = applyRes.data.data.request_id;
  console.log('✅ Application submitted successfully. Request ID:', requestId);

  // 5. User checks application status after applying
  console.log('\n[5] User checking GET /api/mobile/agency/my-application after submitting...');
  const statusAfterApply = await request('/api/mobile/agency/my-application', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log('Application Status:', statusAfterApply.data?.data?.pending_application);
  if (!statusAfterApply.data?.data?.has_pending_application || statusAfterApply.data?.data?.pending_application?.status !== 'pending') {
    console.error('❌ User should have pending application');
    process.exit(1);
  }
  console.log('✅ Pending application confirmed in my-application endpoint.');

  // 6. User attempts to submit a SECOND application while first is still pending (MUST FAIL 400)
  console.log('\n[6] User attempting to send a concurrent application while one is already pending (MUST FAIL 400)...');
  const duplicateApplyRes = await request('/api/mobile/agency/apply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      agencyCode: 'AG-101',
      hostType: 'audio',
      message: 'Trying to submit another request',
    }),
  });
  console.log('Duplicate Apply Status:', duplicateApplyRes.status);
  console.log('Duplicate Apply Message:', duplicateApplyRes.data?.message);
  if (duplicateApplyRes.status !== 400) {
    console.error('❌ Expected 400 Bad Request for concurrent application, got:', duplicateApplyRes.status);
    process.exit(1);
  }
  console.log('✅ Strictly enforced: Only ONE pending application allowed across all agencies at a time!');

  // 7. User cancels their pending application
  console.log('\n[7] User cancelling their pending application via POST /api/mobile/agency/my-application/cancel...');
  const cancelRes = await request('/api/mobile/agency/my-application/cancel', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log('Cancel Status:', cancelRes.status);
  console.log('Cancel Response:', cancelRes.data);
  if (cancelRes.status !== 200 || cancelRes.data?.data?.status !== 'cancelled') {
    console.error('❌ Failed to cancel application');
    process.exit(1);
  }
  console.log('✅ Application cancelled successfully.');

  // 8. User checks application status after cancellation
  console.log('\n[8] User checking GET /api/mobile/agency/my-application after cancellation...');
  const statusAfterCancel = await request('/api/mobile/agency/my-application', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log('Has pending after cancel:', statusAfterCancel.data?.data?.has_pending_application);
  console.log('Latest application status:', statusAfterCancel.data?.data?.latest_application?.status);
  if (statusAfterCancel.data?.data?.has_pending_application !== false) {
    console.error('❌ User should NOT have pending application after cancellation');
    process.exit(1);
  }
  console.log('✅ Verified: No active pending application.');

  // 9. Now that previous application was cancelled, User is free to submit a new application
  console.log('\n[9] User submitting a fresh application after cancellation...');
  const freshApplyRes = await request('/api/mobile/agency/apply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      agencyCode: 'AG-101',
      hostType: 'video',
      message: 'Re-applying with updated host profile details!',
    }),
  });
  console.log('Fresh Apply Status:', freshApplyRes.status);
  console.log('Fresh Apply Request ID:', freshApplyRes.data?.data?.request_id);
  if (freshApplyRes.status !== 201) {
    console.error('❌ Fresh application should succeed after cancellation');
    process.exit(1);
  }
  const freshRequestId = freshApplyRes.data.data.request_id;
  console.log('✅ Fresh application successfully submitted.');

  // 10. Agency approves the application
  console.log(`\n[10] Agency approving host application #${freshRequestId}...`);
  const approveRes = await request(`/api/mobile/agency/requests/${freshRequestId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Approve Status:', approveRes.status, approveRes.data?.message);
  if (approveRes.status !== 200) {
    console.error('❌ Agency failed to approve application');
    process.exit(1);
  }
  console.log('✅ Application approved.');

  // 11. User checks my-application after approval (Now active host of Agency 1)
  console.log('\n[11] User checking GET /api/mobile/agency/my-application as affiliated host...');
  const statusAfterApproval = await request('/api/mobile/agency/my-application', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log('Affiliated Agency:', statusAfterApproval.data?.data?.affiliation);
  console.log('User Role:', statusAfterApproval.data?.data?.user);
  if (!statusAfterApproval.data?.data?.affiliation?.is_affiliated || statusAfterApproval.data?.data?.user?.role !== 'host') {
    console.error('❌ User should be marked as affiliated host');
    process.exit(1);
  }
  console.log('✅ User is now an active host of Starlight Talent Agency.');

  // 12. While an active host of Agency 1, User tries to apply to an agency (MUST FAIL 400)
  console.log('\n[12] Active host attempting to apply to an agency (MUST FAIL 400 - Single Agency Limit)...');
  const hostApplyRes = await request('/api/mobile/agency/apply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      agencyCode: 'AG-101',
      hostType: 'audio',
      message: 'Trying to apply while already affiliated',
    }),
  });
  console.log('Host Apply Status:', hostApplyRes.status);
  console.log('Host Apply Message:', hostApplyRes.data?.message);
  if (hostApplyRes.status !== 400) {
    console.error('❌ Expected 400 Bad Request when user already has an agency, got:', hostApplyRes.status);
    process.exit(1);
  }
  console.log('✅ Strictly enforced: Host can only belong to ONE agency at a time!');

  // 13. Agency releases/removes host
  console.log(`\n[13] Agency releasing host #${userId}...`);
  const removeRes = await request(`/api/mobile/agency/hosts/${userId}/remove`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Remove Status:', removeRes.status, removeRes.data?.message);
  if (removeRes.status !== 200) {
    console.error('❌ Failed to remove host');
    process.exit(1);
  }
  console.log('✅ Host released and reverted to standard user role.');

  console.log('\n===================================================================');
  console.log('🎉 ALL APPLICATION LIFECYCLE & CONSTRAINTS TESTS PASSED (100%)! 🚀');
  console.log('===================================================================');
}

runTests().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
