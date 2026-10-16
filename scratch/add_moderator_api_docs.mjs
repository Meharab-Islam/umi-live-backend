import fs from 'fs';

const moderatorCategory = {
  id: 'moderator',
  name: '🛡️ Moderator - User & Device Ban Controls',
  description: 'Moderator tools to search users, inspect all logged-in mobile devices, ban/unban user accounts, and enforce hardware device bans.',
};

const moderatorEndpoints = [
  {
    id: 'moderator-search-users',
    category: 'moderator',
    method: 'GET',
    path: '/api/mobile/moderator/users/search',
    summary: 'Search Users for Moderation',
    description: 'Search for any user by User ID (exact match prioritized), full name, or email. Returns user account profile, current ban status, and total/banned mobile device counts. Cached in Redis (\'moderator:search_users:{term}\', 30s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Moderator or Admin' },
    ],
    parameters: [
      {
        name: 'q',
        type: 'string',
        in: 'query',
        required: true,
        description: 'User ID (e.g. 2 or #2), name keyword, or email',
      },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Matching users for moderation.',
        example: {
          success: true,
          query: '2',
          count: 1,
          users: [
            {
              id: 2,
              full_name: 'Nila Akter',
              email: 'nila@umi.live',
              avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
              role: 'host',
              coins: 5395,
              diamonds: 18500,
              level: 15,
              is_banned: false,
              created_at: '2026-10-10T08:00:00.000Z',
              devices_summary: {
                total: 2,
                banned: 0,
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'moderator-get-user-devices',
    category: 'moderator',
    method: 'GET',
    path: '/api/mobile/moderator/users/{userId}',
    summary: 'Inspect User Profile & Logged-in Mobile Devices List',
    description: 'Retrieve a user\'s complete profile along with the comprehensive list of every mobile hardware device this user has logged in with. Includes device model, OS, IP address, and hardware ban status. Cached via Redis (\'moderator:user_details:{userId}\', 60s TTL).',
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
        description: 'Target User ID',
      },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'User profile and registered mobile devices.',
        example: {
          success: true,
          user: {
            id: 2,
            full_name: 'Nila Akter',
            email: 'nila@umi.live',
            role: 'host',
            coins: 5395,
            diamonds: 18500,
            level: 15,
            is_banned: false,
            created_at: '2026-10-10T08:00:00.000Z',
          },
          deviceSummary: {
            totalDevices: 2,
            bannedDevices: 0,
            activeDevices: 2,
          },
          devices: [
            {
              id: 1,
              device_id: 'iphone-uuid-99a8b7c6',
              device_model: 'iPhone 15 Pro Max',
              os_type: 'iOS',
              os_version: '17.5.1',
              app_version: '1.2.0',
              ip_address: '103.112.54.12',
              user_agent: 'UmiMobile/1.2.0 (iOS; iPhone 15 Pro Max)',
              is_banned: false,
              ban_reason: null,
              last_login_at: '2026-10-12T06:30:00.000Z',
            },
            {
              id: 2,
              device_id: 'android-hwid-55443322',
              device_model: 'Samsung Galaxy S24 Ultra',
              os_type: 'Android',
              os_version: '14.0',
              app_version: '1.2.0',
              ip_address: '103.112.54.18',
              user_agent: 'UmiMobile/1.2.0 (Android; SM-S928B)',
              is_banned: false,
              ban_reason: null,
              last_login_at: '2026-10-11T18:20:00.000Z',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'moderator-ban-user',
    category: 'moderator',
    method: 'POST',
    path: '/api/mobile/moderator/users/{userId}/ban',
    summary: 'Ban or Unban User Account (With Optional Device Ban)',
    description: 'Bans or unbans a user account. If `banAllDevices: true` is passed, automatically bans every mobile hardware device associated with this user. Executes MySQL update (SSOT) and immediately purges all relevant Redis caches.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
      { name: 'Content-Type', type: 'string', required: true, description: 'application/json' },
    ],
    parameters: [
      {
        name: 'userId',
        type: 'integer',
        in: 'path',
        required: true,
        description: 'Target User ID to ban or unban',
      },
    ],
    requestBody: {
      required: true,
      schema: {
        isBanned: { type: 'boolean', required: true, description: 'true to ban, false to lift suspension' },
        reason: { type: 'string', required: false, description: 'Reason for suspension / policy violation' },
        banAllDevices: { type: 'boolean', required: false, description: 'If true, also bans all mobile devices used by this user' },
      },
      example: {
        isBanned: true,
        reason: 'Severe violation of live community guidelines (inappropriate behavior)',
        banAllDevices: true,
      },
    },
    responses: [
      {
        status: 200,
        description: 'User ban state updated successfully.',
        example: {
          success: true,
          message: 'User #2 (Nila Akter) has been suspended. Also banned 2 mobile device(s).',
          userId: 2,
          is_banned: true,
          reason: 'Severe violation of live community guidelines',
          banAllDevices: true,
          devicesUpdatedCount: 2,
        },
      },
    ],
  },
  {
    id: 'moderator-ban-device',
    category: 'moderator',
    method: 'POST',
    path: '/api/mobile/moderator/devices/{deviceId}/ban',
    summary: 'Ban or Unban Hardware Mobile Device',
    description: 'Bans or unbans a specific mobile device (by hardware Device ID or record ID). When banned, any account attempting to log in or use the app from this hardware device is blocked. Instant Redis caching (\'device:banned:{deviceId}\').',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
      { name: 'Content-Type', type: 'string', required: true, description: 'application/json' },
    ],
    parameters: [
      {
        name: 'deviceId',
        type: 'string',
        in: 'path',
        required: true,
        description: 'Hardware Device ID (e.g. iphone-uuid-99a8b7c6) or device record ID',
      },
    ],
    requestBody: {
      required: true,
      schema: {
        isBanned: { type: 'boolean', required: true, description: 'true to ban device, false to unban' },
        reason: { type: 'string', required: false, description: 'Reason for hardware ban' },
      },
      example: {
        isBanned: true,
        reason: 'Spamming and fraudulent bot activity',
      },
    },
    responses: [
      {
        status: 200,
        description: 'Device ban status updated successfully.',
        example: {
          success: true,
          message: 'Device "iphone-uuid-99a8b7c6" (iPhone 15 Pro Max) has been banned from accessing the platform.',
          device_id: 'iphone-uuid-99a8b7c6',
          device_model: 'iPhone 15 Pro Max',
          is_banned: true,
          reason: 'Spamming and fraudulent bot activity',
        },
      },
    ],
  },
  {
    id: 'moderator-list-banned-devices',
    category: 'moderator',
    method: 'GET',
    path: '/api/mobile/moderator/devices',
    summary: 'List All Platform Banned Devices',
    description: 'Retrieve paginated list of all mobile hardware devices currently banned platform-wide. Includes device details, ban timestamp, reason, and last associated user. Cached in Redis (\'moderator:banned_devices:{page}:{limit}:{search}\', 60s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
    ],
    parameters: [
      { name: 'page', type: 'integer', in: 'query', required: false, description: 'Page number (default 1)' },
      { name: 'limit', type: 'integer', in: 'query', required: false, description: 'Items per page (default 20, max 100)' },
      { name: 'search', type: 'string', in: 'query', required: false, description: 'Search by device ID, model, or user name' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Banned devices list retrieved successfully.',
        example: {
          success: true,
          devices: [
            {
              id: 1,
              device_id: 'iphone-uuid-99a8b7c6',
              device_model: 'iPhone 15 Pro Max',
              os_type: 'iOS',
              os_version: '17.5.1',
              is_banned: true,
              ban_reason: 'Spamming and fraudulent bot activity',
              banned_at: '2026-10-12T06:40:00.000Z',
              user: {
                id: 2,
                full_name: 'Nila Akter',
                email: 'nila@umi.live',
                is_banned: true,
              },
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      },
    ],
  },
  {
    id: 'moderator-register-device',
    category: 'moderator',
    method: 'POST',
    path: '/api/mobile/moderator/users/{userId}/devices/register',
    summary: 'Register or Sync User Mobile Device',
    description: 'Manually or programmatically register a device under a user account for testing, auditing, or device binding.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
      { name: 'Content-Type', type: 'string', required: true, description: 'application/json' },
    ],
    parameters: [
      {
        name: 'userId',
        type: 'integer',
        in: 'path',
        required: true,
        description: 'User ID to register the device under',
      },
    ],
    requestBody: {
      required: true,
      schema: {
        deviceId: { type: 'string', required: true, description: 'Unique device hardware ID' },
        deviceModel: { type: 'string', required: false, description: 'Device model name' },
        osType: { type: 'string', required: false, description: 'OS name (iOS or Android)' },
        osVersion: { type: 'string', required: false, description: 'OS Version number' },
        appVersion: { type: 'string', required: false, description: 'App version' },
      },
      example: {
        deviceId: 'pixel-hw-88776655',
        deviceModel: 'Google Pixel 8 Pro',
        osType: 'Android',
        osVersion: '14.0',
        appVersion: '1.2.0',
      },
    },
    responses: [
      {
        status: 200,
        description: 'Device registered successfully.',
        example: {
          success: true,
          message: 'Device "pixel-hw-88776655" successfully registered for User #2.',
          device_id: 'pixel-hw-88776655',
          user_id: 2,
        },
      },
    ],
  },
];

function updateDocsFile(filePath, isExportConst) {
  let content = fs.readFileSync(filePath, 'utf8');
  const startIdx = content.indexOf('export const API_SPEC =');
  const endIdx = content.lastIndexOf('};');
  const jsonStr = content.slice(startIdx + 'export const API_SPEC ='.length, endIdx + 1).trim();
  const specJson = JSON.parse(jsonStr);

  // Add category if not exists
  if (!specJson.categories.some((c) => c.id === moderatorCategory.id)) {
    specJson.categories.push(moderatorCategory);
  }

  // Remove any existing moderator endpoints to prevent duplication
  specJson.endpoints = specJson.endpoints.filter((e) => e.category !== 'moderator');
  // Add new moderator endpoints
  specJson.endpoints.push(...moderatorEndpoints);

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
