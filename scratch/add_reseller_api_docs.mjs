import fs from 'fs';

const resellerCategory = {
  id: 'reseller',
  name: '🛍️ Reseller Portal & Top-up',
  description: 'Reseller coin stock check, customer user search & selection, coin recharge/transfers to customers, and transaction audit management.',
};

const resellerEndpoints = [
  {
    id: 'reseller-balance',
    category: 'reseller',
    method: 'GET',
    path: '/api/mobile/reseller/balance',
    summary: 'Get Reseller Coin Stock & Performance',
    description: 'Retrieve the authenticated reseller\'s available coin balance, account details, and lifetime/today sales metrics. Cached via Redis Cache-Aside (\'reseller:balance:{resellerId}\', 60s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of logged in reseller' },
    ],
    parameters: [],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Reseller balance and performance retrieved successfully.',
        example: {
          success: true,
          reseller: {
            id: 5,
            full_name: 'Tanvir Ahmed',
            email: 'tanvir@umi.live',
            avatar_url: 'https://example.com/avatar.jpg',
            role: 'reseller',
            coins: 25000,
            level: 10,
            is_banned: false,
            created_at: '2026-10-10T08:00:00.000Z',
          },
          coins: 25000,
          stats: {
            total_coins_sold: 150000,
            total_revenue: 135000,
            total_sales_count: 85,
            today_coins_sold: 5000,
            today_revenue: 4500,
            today_sales_count: 4,
            month_coins_sold: 45000,
            month_revenue: 40500,
            month_sales_count: 28,
          },
        },
      },
      {
        status: 403,
        description: 'Forbidden. Reseller privileges required.',
        example: { success: false, message: 'Forbidden. Reseller privileges required.' },
      },
    ],
  },
  {
    id: 'reseller-search-users',
    category: 'reseller',
    method: 'GET',
    path: '/api/mobile/reseller/users/search',
    summary: 'Search Customers by ID, Name or Email',
    description: 'Search customer accounts to select for coin top-up. Matches numeric User ID (exact match prioritized), full name, or email. Cached in Redis (\'reseller:search_users:{term}\', 30s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
    ],
    parameters: [
      {
        name: 'q',
        type: 'string',
        in: 'query',
        required: true,
        description: 'Customer User ID (e.g. 2 or #2), name keyword, or email',
      },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Matching customer users list.',
        example: {
          success: true,
          query: '2',
          count: 1,
          users: [
            {
              id: 2,
              full_name: 'Nila Akter',
              email: 'nila@umi.live',
              avatar_url: 'https://example.com/avatar2.jpg',
              role: 'user',
              coins: 5095,
              level: 3,
              is_banned: false,
              created_at: '2026-10-10T08:00:00.000Z',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'reseller-get-user',
    category: 'reseller',
    method: 'GET',
    path: '/api/mobile/reseller/users/{userId}',
    summary: 'Select & View Customer Profile Details',
    description: 'Select a customer by User ID to inspect their current coins, account status, and previous top-up history with this reseller before transferring coins. Cached via Redis (\'reseller:user_details:{userId}\', 60s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
    ],
    parameters: [
      {
        name: 'userId',
        type: 'integer',
        in: 'path',
        required: true,
        description: 'Target Customer User ID',
      },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Customer details retrieved successfully.',
        example: {
          success: true,
          user: {
            id: 2,
            full_name: 'Nila Akter',
            email: 'nila@umi.live',
            avatar_url: 'https://example.com/avatar2.jpg',
            role: 'user',
            coins: 5095,
            level: 3,
            is_banned: false,
            created_at: '2026-10-10T08:00:00.000Z',
          },
          pastHistory: {
            total_coins_received: 12000,
            recharge_count: 5,
            last_recharge_at: '2026-10-11T14:22:10.000Z',
          },
        },
      },
      {
        status: 404,
        description: 'Customer not found.',
        example: { success: false, message: 'Customer user #999 not found.' },
      },
    ],
  },
  {
    id: 'reseller-recharge-user',
    category: 'reseller',
    method: 'POST',
    path: '/api/mobile/reseller/recharge',
    summary: 'Recharge / Transfer Coins to Customer',
    description: 'Transfers coins directly from reseller stock to a customer user. Validates balances, executes atomic MySQL transaction (deduct reseller, credit customer, record sale and transaction ledgers), and instantly purges all relevant Redis caches.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
      { name: 'Content-Type', type: 'string', required: true, description: 'application/json' },
    ],
    parameters: [],
    requestBody: {
      required: true,
      schema: {
        buyerId: { type: 'integer', required: true, description: 'Target Customer User ID to receive coins' },
        coinAmount: { type: 'integer', required: true, description: 'Amount of coins to recharge (positive integer)' },
        priceAmount: { type: 'number', required: false, description: 'Fiat price collected from customer (default 0.00)' },
        currency: { type: 'string', required: false, description: 'Currency of payment (default: BDT)' },
        notes: { type: 'string', required: false, description: 'Memo / Note for the transaction' },
      },
      example: {
        buyerId: 2,
        coinAmount: 500,
        priceAmount: 450,
        currency: 'BDT',
        notes: 'Cash payment top-up via mobile app',
      },
    },
    responses: [
      {
        status: 201,
        description: 'Coin recharge completed successfully.',
        example: {
          success: true,
          message: 'Successfully recharged 500 coins to User #2 (Nila Akter)!',
          transaction: {
            id: 28,
            reseller_id: 5,
            buyer_id: 2,
            buyer_name: 'Nila Akter',
            buyer_email: 'nila@umi.live',
            coin_amount: 500,
            price_amount: 450,
            currency: 'BDT',
            notes: 'Cash payment top-up via mobile app',
            created_at: '2026-10-12T06:35:10.000Z',
          },
          resellerRemainingCoins: 24500,
          buyerNewBalance: 5595,
        },
      },
      {
        status: 400,
        description: 'Insufficient coins in reseller stock or invalid inputs.',
        example: {
          success: false,
          message: 'Insufficient coin stock! You currently have 100 coins, but requested 500 coins.',
          availableCoins: 100,
        },
      },
    ],
  },
  {
    id: 'reseller-transactions',
    category: 'reseller',
    method: 'GET',
    path: '/api/mobile/reseller/transactions',
    summary: 'Get Reseller Transaction History',
    description: 'Retrieve paginated history of coin recharges performed by this reseller. Includes summary metrics and filters by period (\'all\', \'today\', \'week\', \'month\') and search keyword. Cached via Redis Cache-Aside (60s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
    ],
    parameters: [
      { name: 'page', type: 'integer', in: 'query', required: false, description: 'Page number (default 1)' },
      { name: 'limit', type: 'integer', in: 'query', required: false, description: 'Items per page (default 20, max 100)' },
      { name: 'period', type: 'string', in: 'query', required: false, description: 'Time filter: "all", "today", "week", or "month"' },
      { name: 'search', type: 'string', in: 'query', required: false, description: 'Search by Customer User ID, name, or memo' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Transactions list retrieved successfully.',
        example: {
          success: true,
          summary: {
            total_coins_sold: 150000,
            total_revenue: 135000,
            total_transactions: 85,
            today_coins_sold: 5000,
            today_revenue: 4500,
          },
          transactions: [
            {
              id: 28,
              reseller_id: 5,
              buyer_id: 2,
              coin_amount: 500,
              price_amount: 450,
              currency: 'BDT',
              notes: 'Cash payment top-up via mobile app',
              created_at: '2026-10-12T06:35:10.000Z',
              buyer_name: 'Nila Akter',
              buyer_email: 'nila@umi.live',
              buyer_avatar: 'https://example.com/avatar2.jpg',
              buyer_role: 'user',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 85,
            totalPages: 5,
          },
        },
      },
    ],
  },
  {
    id: 'reseller-delete-transaction',
    category: 'reseller',
    method: 'DELETE',
    path: '/api/mobile/reseller/transactions/{id}',
    summary: 'Delete Single Transaction from History',
    description: 'Delete an individual transaction record from the reseller\'s history. Verifies transaction ownership, deletes from MySQL (SSOT), and immediately purges Redis caches.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
    ],
    parameters: [
      { name: 'id', type: 'integer', in: 'path', required: true, description: 'Transaction Sale ID to delete' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Transaction record deleted successfully.',
        example: {
          success: true,
          message: 'Transaction #28 deleted successfully from history.',
          deletedId: 28,
        },
      },
      {
        status: 404,
        description: 'Transaction not found.',
        example: { success: false, message: 'Transaction #999 not found.' },
      },
    ],
  },
  {
    id: 'reseller-clear-transactions',
    category: 'reseller',
    method: 'DELETE',
    path: '/api/mobile/reseller/transactions',
    summary: 'Clear All Reseller Transactions',
    description: 'Clears all transaction history (or for a specific time period) for this reseller. Executes MySQL delete and purges Redis cache immediately.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
    ],
    parameters: [
      {
        name: 'period',
        type: 'string',
        in: 'query',
        required: false,
        description: 'Optional filter: "all" (default), "today", or "month"',
      },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Transactions cleared successfully.',
        example: {
          success: true,
          message: 'Successfully cleared 85 transaction records from your reseller history.',
          affectedRows: 85,
          period: 'all',
        },
      },
    ],
  },
];

function updateDocsFile(filePath, isExportConst) {
  let content = fs.readFileSync(filePath, 'utf8');
  let specJson;

  if (isExportConst) {
    const startIdx = content.indexOf('export const API_SPEC =');
    const endIdx = content.lastIndexOf('};');
    const jsonStr = content.slice(startIdx + 'export const API_SPEC ='.length, endIdx + 1).trim();
    specJson = JSON.parse(jsonStr);
  } else {
    // apiSpec.js
    const startIdx = content.indexOf('export const API_SPEC =');
    const endIdx = content.lastIndexOf('};');
    const jsonStr = content.slice(startIdx + 'export const API_SPEC ='.length, endIdx + 1).trim();
    specJson = JSON.parse(jsonStr);
  }

  // Add category if not exists
  if (!specJson.categories.some((c) => c.id === resellerCategory.id)) {
    specJson.categories.push(resellerCategory);
  }

  // Remove any existing reseller endpoints to prevent duplication
  specJson.endpoints = specJson.endpoints.filter((e) => e.category !== 'reseller');
  // Add new reseller endpoints
  specJson.endpoints.push(...resellerEndpoints);

  let newContent;
  if (isExportConst) {
    newContent = `import express from 'express';\n\nconst router = express.Router();\n\nexport const API_SPEC = ${JSON.stringify(specJson, null, 2)};\n\nrouter.get('/spec', (req, res) => {\n  return res.json(API_SPEC);\n});\n\nexport default router;\n`;
  } else {
    newContent = `export const API_SPEC = ${JSON.stringify(specJson, null, 2)};\n\nexport default API_SPEC;\n`;
  }

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Updated ${filePath} successfully!`);
}

updateDocsFile('backend/src/routes/docsRoutes.js', true);
updateDocsFile('admin-panel/src/api/apiSpec.js', false);
