import fs from 'fs';

const hostCategory = {
  id: 'host-performance',
  name: '🎤 Host - Agency Membership & Streaming Earnings',
  description: 'Host portal to track current agency affiliation, audio/video host type, daily/monthly streaming duration, coins earned, and agency commission breakdown.',
};

const hostEndpoints = [
  {
    id: 'host-agency-summary',
    category: 'host-performance',
    method: 'GET',
    path: '/api/mobile/host/agency',
    summary: 'Get Host Current Agency & Lifetime Performance',
    description: 'Retrieve the host\'s affiliated agency details, whether they are a video or audio host, and total streaming duration, total coins earned, and total commission given while under this agency. Cached in Redis (\'host:agency_summary:{hostId}\', 60s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Host, Agency Manager, or Admin' },
    ],
    parameters: [
      {
        name: 'hostId',
        type: 'integer',
        in: 'query',
        required: false,
        description: 'Optional Host User ID (allowed for Agency Managers or Admins inspecting a host)',
      },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Host agency details and performance retrieved successfully.',
        example: {
          success: true,
          host: {
            id: 2,
            full_name: 'Nila Akter',
            email: 'nila@umi.live',
            avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            role: 'host',
            host_type: 'video',
            is_video_host: true,
            is_audio_host: false,
            level: 15,
            coins: 5395,
            diamonds: 18500,
          },
          has_agency: true,
          agency: {
            id: 1,
            agency_code: 'STAR-01',
            name: 'Star Media Agency',
            owner_id: 10,
            owner_name: 'Agency Manager',
            commission_rate: 10.0,
            status: 'active',
            contact_phone: '+8801700000000',
            host_joined_at: '2026-10-10T08:00:00.000Z',
          },
          performance_under_agency: {
            agency_joined_at: '2026-10-10T08:00:00.000Z',
            total_duration_seconds: 45200,
            formatted_total_duration: '12h 33m 20s',
            video_duration_seconds: 38000,
            formatted_video_duration: '10h 33m 20s',
            audio_duration_seconds: 7200,
            formatted_audio_duration: '02h 00m 00s',
            total_stream_sessions: 8,
            total_active_days: 3,
            total_coins_earned: 25000,
            total_diamonds_earned: 12500,
            total_agency_commission: 2500,
            host_net_coins: 22500,
            commission_rate_percentage: 10.0,
          },
        },
      },
      {
        status: 403,
        description: 'Forbidden. Host privileges required.',
        example: { success: false, message: 'Forbidden. Host privileges required.' },
      },
    ],
  },
  {
    id: 'host-monthly-breakdown',
    category: 'host-performance',
    method: 'GET',
    path: '/api/mobile/host/performance/monthly',
    summary: 'Monthly Streaming & Daily Earnings Breakdown',
    description: 'Retrieve a complete monthly breakdown showing day-by-day streaming hours (video time vs audio time), daily coins earned from gifts, and daily commission received by the agency. Cached via Redis (\'host:monthly:{hostId}:{month}\', 60s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
    ],
    parameters: [
      {
        name: 'month',
        type: 'string',
        in: 'query',
        required: false,
        description: 'Target month in YYYY-MM format (default: current month e.g. 2026-10)',
      },
      {
        name: 'hostId',
        type: 'integer',
        in: 'query',
        required: false,
        description: 'Optional Host User ID (for Admins or Agency Managers)',
      },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Monthly streaming and earnings breakdown retrieved successfully.',
        example: {
          success: true,
          month: '2026-10',
          host: {
            id: 2,
            full_name: 'Nila Akter',
            host_type: 'video',
            is_video_host: true,
            is_audio_host: false,
          },
          has_agency: true,
          agency: {
            id: 1,
            agency_code: 'STAR-01',
            name: 'Star Media Agency',
            commission_rate: 10.0,
          },
          monthly_summary: {
            month: '2026-10',
            total_duration_seconds: 45200,
            formatted_total_duration: '12h 33m 20s',
            video_duration_seconds: 38000,
            formatted_video_duration: '10h 33m 20s',
            audio_duration_seconds: 7200,
            formatted_audio_duration: '02h 00m 00s',
            total_coins_earned: 25000,
            total_diamonds_earned: 12500,
            total_agency_commission: 2500,
            host_net_coins: 22500,
            active_days_count: 3,
            valid_days_count: 3,
          },
          daily_breakdown: [
            {
              date: '2026-10-12',
              day_name: 'Mon',
              sessions_count: 2,
              total_duration_seconds: 14400,
              formatted_total_duration: '04h 00m 00s',
              video_duration_seconds: 14400,
              formatted_video_duration: '04h 00m 00s',
              audio_duration_seconds: 0,
              formatted_audio_duration: '00h 00m 00s',
              coins_earned: 12000,
              diamonds_earned: 6000,
              agency_commission: 1200,
              host_net_coins: 10800,
              is_valid_day: true,
            },
            {
              date: '2026-10-11',
              day_name: 'Sun',
              sessions_count: 3,
              total_duration_seconds: 18000,
              formatted_total_duration: '05h 00m 00s',
              video_duration_seconds: 14400,
              formatted_video_duration: '04h 00m 00s',
              audio_duration_seconds: 3600,
              formatted_audio_duration: '01h 00m 00s',
              coins_earned: 8000,
              diamonds_earned: 4000,
              agency_commission: 800,
              host_net_coins: 7200,
              is_valid_day: true,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'host-stream-history',
    category: 'host-performance',
    method: 'GET',
    path: '/api/mobile/host/streams',
    summary: 'Get Host Live Stream Session Logs',
    description: 'Retrieve paginated history of past live stream rooms hosted by this user. Includes stream duration, live_type (video vs audio), viewer counts, and diamonds/coins earned. Cached via Redis (60s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
    ],
    parameters: [
      { name: 'page', type: 'integer', in: 'query', required: false, description: 'Page number (default 1)' },
      { name: 'limit', type: 'integer', in: 'query', required: false, description: 'Items per page (default 20)' },
      { name: 'month', type: 'string', in: 'query', required: false, description: 'Filter by month YYYY-MM' },
      { name: 'live_type', type: 'string', in: 'query', required: false, description: 'Filter: "all", "video", or "audio"' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Stream session history retrieved successfully.',
        example: {
          success: true,
          streams: [
            {
              id: 15,
              room_id: 'room_video_001',
              title: 'Acoustic Guitar & Night Chatting 🎸',
              category: 'Music',
              live_type: 'video',
              status: 'ended',
              viewer_count: 85,
              total_diamonds: 6000,
              coins_earned: 12000,
              duration_seconds: 7200,
              formatted_duration: '02h 00m 00s',
              started_at: '2026-10-12T04:00:00.000Z',
              ended_at: '2026-10-12T06:00:00.000Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 8,
            totalPages: 1,
          },
        },
      },
    ],
  },
  {
    id: 'host-dashboard-overview',
    category: 'host-performance',
    method: 'GET',
    path: '/api/mobile/host/overview',
    summary: 'Get Host Today & Monthly Live Overview',
    description: 'Quick dashboard endpoint summarizing today\'s live stream duration (video vs audio), coins earned today, agency commission today, and this month\'s aggregated progress. Cached in Redis (\'host:overview:{hostId}\', 60s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token' },
    ],
    parameters: [
      {
        name: 'hostId',
        type: 'integer',
        in: 'query',
        required: false,
        description: 'Optional Host User ID (for Admins or Agency Managers)',
      },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Host dashboard overview retrieved successfully.',
        example: {
          success: true,
          host: {
            id: 2,
            full_name: 'Nila Akter',
            avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            host_type: 'video',
            is_video_host: true,
            is_audio_host: false,
            level: 15,
            coins: 5395,
            diamonds: 18500,
          },
          has_agency: true,
          agency: {
            id: 1,
            agency_code: 'STAR-01',
            name: 'Star Media Agency',
            commission_rate: 10.0,
          },
          today: {
            total_duration_seconds: 7200,
            formatted_total_duration: '02h 00m 00s',
            video_duration_seconds: 7200,
            formatted_video_duration: '02h 00m 00s',
            audio_duration_seconds: 0,
            formatted_audio_duration: '00h 00m 00s',
            coins_earned: 5000,
            diamonds_earned: 2500,
            agency_commission: 500,
            sessions_count: 1,
          },
          this_month: {
            total_duration_seconds: 45200,
            formatted_total_duration: '12h 33m 20s',
            video_duration_seconds: 38000,
            formatted_video_duration: '10h 33m 20s',
            audio_duration_seconds: 7200,
            formatted_audio_duration: '02h 00m 00s',
            coins_earned: 25000,
            diamonds_earned: 12500,
            agency_commission: 2500,
            active_days: 3,
          },
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
  if (!specJson.categories.some((c) => c.id === hostCategory.id)) {
    specJson.categories.push(hostCategory);
  }

  // Remove any existing host-performance endpoints to prevent duplication
  specJson.endpoints = specJson.endpoints.filter((e) => e.category !== 'host-performance');
  // Add new host-performance endpoints
  specJson.endpoints.push(...hostEndpoints);

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
