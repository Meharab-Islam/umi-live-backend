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
  console.log('--- Starting Reseller Mobile API Test ---');

  // 1. Login as Admin to get token and promote user #5 (Tanvir) to role 'reseller'
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

  // Assign user #5 as reseller with 10,000 coins
  const assignReseller = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/admin/resellers/assign',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
  }, { userId: 5, initialCoins: 10000 });

  console.log('✅ Reseller assignment/coins update:', assignReseller.data.message || assignReseller.data);

  // Login as user #5 (Tanvir) - default password in seeds
  // Or generate a token directly for user #5:
  // Let's test login with Tanvir:
  let resellerToken;
  const tanvirLogin = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'tanvir@umi.live', password: 'password123' });

  if (tanvirLogin.data.success) {
    resellerToken = tanvirLogin.data.token;
    console.log('✅ Reseller user #5 login successful with password');
  } else {
    // Alternatively test with admin token acting as reseller
    console.log('⚠️ Using admin token acting on behalf of reseller #5');
    resellerToken = adminToken;
  }

  // 2. Test GET /api/mobile/reseller/balance
  console.log('\n--- Test 1: GET /api/mobile/reseller/balance ---');
  const balanceRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: `/api/mobile/reseller/balance?resellerId=5`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${resellerToken}` },
  });
  console.log(`Balance status: ${balanceRes.status}`);
  console.log(`Reseller coins: ${balanceRes.data.coins}`);
  console.log(`Reseller name: ${balanceRes.data.reseller?.full_name}`);
  if (!balanceRes.data.success || balanceRes.data.coins === undefined) {
    throw new Error('Failed to get reseller balance: ' + JSON.stringify(balanceRes.data));
  }

  // 3. Test GET /api/mobile/reseller/users/search?q=2
  console.log('\n--- Test 2: GET /api/mobile/reseller/users/search ---');
  const searchRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: `/api/mobile/reseller/users/search?q=2`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${resellerToken}` },
  });
  console.log(`Search status: ${searchRes.status}, Found users: ${searchRes.data.users?.length}`);
  console.log(`Found:`, searchRes.data.users?.[0]?.full_name);
  if (!searchRes.data.success || searchRes.data.users?.length === 0) {
    throw new Error('User search returned no results: ' + JSON.stringify(searchRes.data));
  }

  // 4. Test GET /api/mobile/reseller/users/2
  console.log('\n--- Test 3: GET /api/mobile/reseller/users/2 ---');
  const userDetailsRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: `/api/mobile/reseller/users/2`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${resellerToken}` },
  });
  console.log(`User details status: ${userDetailsRes.status}`);
  console.log(`Target customer coins before recharge: ${userDetailsRes.data.user?.coins}`);
  const customerOldCoins = userDetailsRes.data.user?.coins || 0;

  // 5. Test POST /api/mobile/reseller/recharge
  console.log('\n--- Test 4: POST /api/mobile/reseller/recharge (Transfer 300 coins) ---');
  const rechargeRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: `/api/mobile/reseller/recharge`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resellerToken}`,
    },
  }, {
    resellerId: 5,
    buyerId: 2,
    coinAmount: 300,
    priceAmount: 270,
    currency: 'BDT',
    notes: 'Mobile test top-up',
  });
  console.log(`Recharge status: ${rechargeRes.status}`);
  console.log(`Message: ${rechargeRes.data.message}`);
  console.log(`New Reseller Balance: ${rechargeRes.data.resellerRemainingCoins}`);
  console.log(`New Buyer Balance: ${rechargeRes.data.buyerNewBalance}`);
  if (!rechargeRes.data.success || rechargeRes.data.buyerNewBalance !== customerOldCoins + 300) {
    throw new Error('Recharge balance mismatch: ' + JSON.stringify(rechargeRes.data));
  }

  const createdSaleId = rechargeRes.data.transaction?.id;

  // 6. Test GET /api/mobile/reseller/transactions
  console.log('\n--- Test 5: GET /api/mobile/reseller/transactions ---');
  const txRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: `/api/mobile/reseller/transactions?resellerId=5`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${resellerToken}` },
  });
  console.log(`Transactions status: ${txRes.status}`);
  console.log(`Total transactions: ${txRes.data.pagination?.total}`);
  console.log(`Latest tx ID: ${txRes.data.transactions?.[0]?.id}`);
  console.log(`Coins sold in latest: ${txRes.data.transactions?.[0]?.coin_amount}`);
  if (!txRes.data.success || txRes.data.transactions?.length === 0) {
    throw new Error('Transaction history empty: ' + JSON.stringify(txRes.data));
  }

  // 7. Test DELETE /api/mobile/reseller/transactions/:id
  console.log(`\n--- Test 6: DELETE /api/mobile/reseller/transactions/${createdSaleId} ---`);
  const delSingleRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: `/api/mobile/reseller/transactions/${createdSaleId}?resellerId=5`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${resellerToken}` },
  });
  console.log(`Delete single status: ${delSingleRes.status}`);
  console.log(`Message: ${delSingleRes.data.message}`);
  if (!delSingleRes.data.success) {
    throw new Error('Failed to delete single transaction: ' + JSON.stringify(delSingleRes.data));
  }

  // 8. Recharge again and test Clear All Transactions
  console.log('\n--- Test 7: Recharge second time then clear all ---');
  await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: `/api/mobile/reseller/recharge`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resellerToken}`,
    },
  }, {
    resellerId: 5,
    buyerId: 2,
    coinAmount: 100,
    priceAmount: 90,
    currency: 'BDT',
    notes: 'Another test top-up',
  });

  const clearAllRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: `/api/mobile/reseller/transactions?resellerId=5`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${resellerToken}` },
  });
  console.log(`Clear all status: ${clearAllRes.status}`);
  console.log(`Message: ${clearAllRes.data.message}`);
  console.log(`Affected rows: ${clearAllRes.data.affectedRows}`);
  if (!clearAllRes.data.success) {
    throw new Error('Failed to clear all transactions: ' + JSON.stringify(clearAllRes.data));
  }

  // Verify list is now 0
  const afterClearTx = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: `/api/mobile/reseller/transactions?resellerId=5`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${resellerToken}` },
  });
  console.log(`Total transactions after clear: ${afterClearTx.data.pagination?.total}`);
  if (afterClearTx.data.pagination?.total !== 0) {
    throw new Error('Transactions not empty after clear: ' + JSON.stringify(afterClearTx.data));
  }

  // 9. Test Insufficient Stock Error
  console.log('\n--- Test 8: Insufficient balance validation ---');
  const overdrawRes = await makeRequest({
    hostname: 'localhost',
    port: 5050,
    path: `/api/mobile/reseller/recharge`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resellerToken}`,
    },
  }, {
    resellerId: 5,
    buyerId: 2,
    coinAmount: 99999999, // Way more than available
  });
  console.log(`Overdraw status: ${overdrawRes.status} (Expected 400)`);
  console.log(`Message: ${overdrawRes.data.message}`);
  if (overdrawRes.status !== 400 || overdrawRes.data.success !== false) {
    throw new Error('Failed to reject overdraw transaction: ' + JSON.stringify(overdrawRes.data));
  }

  console.log('\n🎉 ALL RESELLER MOBILE API TESTS PASSED SUCCESSFULLY! 🎉');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
