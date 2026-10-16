import fs from 'fs';

const endpointsToAdd = [
  {
    id: 'moderator-agency-list',
    category: 'moderator',
    method: 'GET',
    path: '/api/mobile/moderator/agencies',
    summary: 'List All Agencies (Moderator Oversight)',
    description: 'Retrieve complete listing of all registered agencies with performance metrics (host counts, live streamers, owner coins, total commission coins, pending requests). Cached in Redis (\'agency:list:all\', 30s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Moderator or Admin' },
    ],
    parameters: [
      { name: 'search', type: 'string', in: 'query', required: false, description: 'Filter agencies by name, code, or owner name' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Complete list of agencies with oversight metrics.',
        example: {
          success: true,
          message: 'Agencies list retrieved successfully.',
          count: 1,
          data: [
            {
              id: 1,
              agency_code: 'AG-101',
              name: 'Starlight Talent Agency',
              owner_id: 1,
              owner_name: 'System Admin',
              owner_coins: 100000,
              commission_rate: 15.0,
              status: 'active',
              total_hosts: 3,
              active_streaming_hosts: 1,
              pending_requests_count: 0,
              total_commission_coins: 1250,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'moderator-agency-overview',
    category: 'moderator',
    method: 'GET',
    path: '/api/mobile/moderator/agencies/{agencyId}/overview',
    summary: 'Get Agency Full Overview (Moderator)',
    description: 'Inspect an agency\'s profile, owner balance, host counts, broadcast-banned host count, total commissions earned, and pending recruitment requests. Cached in Redis (\'agency:overview:{agencyId}\', 60s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Moderator or Admin' },
    ],
    parameters: [
      { name: 'agencyId', type: 'integer', in: 'path', required: true, description: 'Agency ID to inspect' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Detailed agency metrics and overview.',
        example: {
          success: true,
          message: 'Agency overview retrieved successfully.',
          data: {
            agency: {
              id: 1,
              agency_code: 'AG-101',
              name: 'Starlight Talent Agency',
              commission_rate: 15.0,
              status: 'active',
            },
            owner: {
              id: 1,
              full_name: 'System Admin',
              coins: 100000,
              diamonds: 50000,
            },
            metrics: {
              total_hosts: 3,
              active_streaming_hosts: 1,
              banned_hosts_count: 0,
              total_commission_coins: 1250,
              total_coins_gifted_to_hosts: 8333,
              pending_requests_count: 1,
            },
          },
        },
      },
    ],
  },
  {
    id: 'moderator-agency-hosts',
    category: 'moderator',
    method: 'GET',
    path: '/api/mobile/moderator/agencies/{agencyId}/hosts',
    summary: 'Get Agency Hosts List (Moderator)',
    description: 'Retrieve list of all affiliated hosts under the specified agency with live status, streaming duration, coins earned, and broadcast ban status. Cached in Redis (\'agency:hosts:{agencyId}\', 60s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Moderator or Admin' },
    ],
    parameters: [
      { name: 'agencyId', type: 'integer', in: 'path', required: true, description: 'Agency ID' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'List of hosts under this agency.',
        example: {
          success: true,
          message: 'Agency hosts retrieved successfully.',
          count: 1,
          data: [
            {
              id: 2,
              full_name: 'Nila Akter',
              email: 'nila@umi.live',
              host_type: 'video',
              coins: 5395,
              is_currently_live: false,
              is_broadcast_banned: false,
              ban_remaining_seconds: 0,
              performance: {
                total_streaming_seconds: 3600,
                total_coins_earned: 5000,
                agency_commission_coins: 750,
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'moderator-agency-remove-host',
    category: 'moderator',
    method: 'POST',
    path: '/api/mobile/moderator/agencies/{agencyId}/hosts/{hostId}/remove',
    summary: 'Remove Host from Agency (Moderator)',
    description: 'Moderator forces the release/removal of a host from an agency. Resets agency affiliation to null, role to \'user\', terminates ongoing live stream if active, and invalidates Redis cache instantly.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Moderator or Admin' },
    ],
    parameters: [
      { name: 'agencyId', type: 'integer', in: 'path', required: true, description: 'Agency ID' },
      { name: 'hostId', type: 'integer', in: 'path', required: true, description: 'Host User ID to remove' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Host successfully released from agency.',
        example: {
          success: true,
          message: 'Host "Nila Akter" has been removed from agency "Starlight Talent Agency".',
          data: { host_id: 2, host_name: 'Nila Akter', agency_id: 1 },
        },
      },
    ],
  },
  {
    id: 'moderator-agency-ban-broadcast',
    category: 'moderator',
    method: 'POST',
    path: '/api/mobile/moderator/agencies/{agencyId}/hosts/{hostId}/ban-broadcast',
    summary: 'Ban Host Broadcast (Moderator)',
    description: 'Suspend a host under this agency from starting audio/video live broadcasts for a designated duration (minutes, hours, days, or ISO timestamp). Terminates ongoing stream if active, and invalidates Redis cache instantly.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Moderator or Admin' },
      { name: 'Content-Type', type: 'string', required: true, description: 'application/json' },
    ],
    parameters: [
      { name: 'agencyId', type: 'integer', in: 'path', required: true, description: 'Agency ID' },
      { name: 'hostId', type: 'integer', in: 'path', required: true, description: 'Host User ID to suspend' },
    ],
    requestBody: {
      required: false,
      schema: {
        durationHours: { type: 'integer', required: false, description: 'Duration in hours (e.g. 1, 24, 72)' },
        durationMinutes: { type: 'integer', required: false, description: 'Duration in minutes' },
        durationDays: { type: 'integer', required: false, description: 'Duration in days' },
        bannedUntil: { type: 'string', required: false, description: 'Explicit future ISO timestamp' },
        reason: { type: 'string', required: false, description: 'Reason for suspension' },
      },
      example: {
        durationHours: 2,
        reason: 'Violation of broadcasting standards (moderator enforced)',
      },
    },
    responses: [
      {
        status: 200,
        description: 'Host broadcast permissions suspended.',
        example: {
          success: true,
          message: 'Host "Nila Akter" has been broadcast suspended until 2026-10-12 15:30:00.',
          data: {
            host_id: 2,
            host_name: 'Nila Akter',
            broadcast_banned_until: '2026-10-12T15:30:00.000Z',
            duration_seconds: 7200,
            duration_formatted: '2 hours',
            reason: 'Violation of broadcasting standards (moderator enforced)',
            stream_terminated: false,
          },
        },
      },
    ],
  },
  {
    id: 'moderator-agency-unban-broadcast',
    category: 'moderator',
    method: 'POST',
    path: '/api/mobile/moderator/agencies/{agencyId}/hosts/{hostId}/unban-broadcast',
    summary: 'Unban Host Broadcast (Moderator)',
    description: 'Lift broadcast suspension from a host immediately, allowing them to resume live streaming. Updates database and invalidates Redis cache instantly.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Moderator or Admin' },
    ],
    parameters: [
      { name: 'agencyId', type: 'integer', in: 'path', required: true, description: 'Agency ID' },
      { name: 'hostId', type: 'integer', in: 'path', required: true, description: 'Host User ID' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Broadcast ban lifted successfully.',
        example: {
          success: true,
          message: 'Broadcast ban for host "Nila Akter" has been successfully lifted.',
          data: { host_id: 2, host_name: 'Nila Akter', agency_id: 1, is_broadcast_banned: false },
        },
      },
    ],
  },
  {
    id: 'moderator-agency-banned-hosts',
    category: 'moderator',
    method: 'GET',
    path: '/api/mobile/moderator/agencies/{agencyId}/banned-hosts',
    summary: 'Get Agency Banned Hosts (Moderator)',
    description: 'Retrieve currently broadcast-suspended hosts for the specified agency with remaining time and ban reason. Cached in Redis (\'agency:banned_hosts:{agencyId}\', 60s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Moderator or Admin' },
    ],
    parameters: [
      { name: 'agencyId', type: 'integer', in: 'path', required: true, description: 'Agency ID' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Currently broadcast-banned hosts.',
        example: {
          success: true,
          message: 'Banned hosts retrieved successfully.',
          count: 1,
          data: [
            {
              id: 2,
              full_name: 'Nila Akter',
              broadcast_banned_until: '2026-10-12T15:30:00.000Z',
              broadcast_ban_reason: 'Violation of broadcasting standards',
              remaining_seconds: 7120,
              remaining_formatted: '1 hour 58 minutes',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'moderator-agency-requests',
    category: 'moderator',
    method: 'GET',
    path: '/api/mobile/moderator/agencies/{agencyId}/requests',
    summary: 'Get Agency Host Recruitment Requests (Moderator)',
    description: 'Retrieve pending/approved/rejected host join applications for the agency. Cached in Redis (\'agency:requests:{agencyId}:{status}\', 60s TTL).',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Moderator or Admin' },
    ],
    parameters: [
      { name: 'agencyId', type: 'integer', in: 'path', required: true, description: 'Agency ID' },
      { name: 'status', type: 'string', in: 'query', required: false, description: 'Filter: pending (default), approved, rejected, or all' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'List of host recruitment join requests.',
        example: {
          success: true,
          message: 'Agency host requests (pending) retrieved successfully.',
          count: 1,
          data: [
            {
              id: 1,
              agency_id: 1,
              user_id: 5,
              host_type: 'video',
              message: 'Looking to join as top streamer',
              status: 'pending',
              created_at: '2026-10-12T10:00:00.000Z',
              applicant: {
                id: 5,
                full_name: 'Tanvir Ahmed',
                email: 'tanvir@umi.live',
                level: 3,
                already_in_agency: false,
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'moderator-agency-approve-request',
    category: 'moderator',
    method: 'POST',
    path: '/api/mobile/moderator/agencies/{agencyId}/requests/{requestId}/approve',
    summary: 'Approve Host Join Request (Moderator)',
    description: 'Moderator approves a user\'s join application on behalf of the agency. Assigns user to agency as host and invalidates Redis cache instantly.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Moderator or Admin' },
    ],
    parameters: [
      { name: 'agencyId', type: 'integer', in: 'path', required: true, description: 'Agency ID' },
      { name: 'requestId', type: 'integer', in: 'path', required: true, description: 'Request ID to approve' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Applicant approved and affiliated as agency host.',
        example: {
          success: true,
          message: 'Applicant "Tanvir Ahmed" is now approved as a video host under "Starlight Talent Agency".',
          data: {
            request_id: 1,
            user_id: 5,
            agency_id: 1,
            status: 'approved',
            host_type: 'video',
          },
        },
      },
    ],
  },
  {
    id: 'moderator-agency-reject-request',
    category: 'moderator',
    method: 'POST',
    path: '/api/mobile/moderator/agencies/{agencyId}/requests/{requestId}/reject',
    summary: 'Reject Host Join Request (Moderator)',
    description: 'Moderator rejects a user\'s join application on behalf of the agency. Updates request status and invalidates Redis cache instantly.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Moderator or Admin' },
    ],
    parameters: [
      { name: 'agencyId', type: 'integer', in: 'path', required: true, description: 'Agency ID' },
      { name: 'requestId', type: 'integer', in: 'path', required: true, description: 'Request ID to reject' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Host request rejected.',
        example: {
          success: true,
          message: 'Request #1 from applicant "Tanvir Ahmed" has been rejected.',
          data: { request_id: 1, user_id: 5, agency_id: 1, status: 'rejected' },
        },
      },
    ],
  },
];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Check which endpoints are not yet in file
  const missing = endpointsToAdd.filter(e => !content.includes(`"id": "${e.id}"`));
  if (missing.length === 0) {
    console.log(`All endpoints already present in ${filePath}`);
    return;
  }

  console.log(`Adding ${missing.length} endpoints to ${filePath}...`);

  // Find insertion point - after moderator-register-device endpoint or before host-agency-summary
  const targetStr = '"id": "host-agency-summary"';
  const targetIdx = content.indexOf(targetStr);
  if (targetIdx === -1) {
    console.error(`Could not find anchor in ${filePath}`);
    return;
  }

  // Find the object start `{` before "id": "host-agency-summary"
  const openBraceIdx = content.lastIndexOf('{', targetIdx);
  if (openBraceIdx === -1) {
    console.error(`Could not find open brace in ${filePath}`);
    return;
  }

  const jsonSnippet = missing.map(e => JSON.stringify(e, null, 6).trim()).join(',\n    ') + ',\n    ';
  const newContent = content.slice(0, openBraceIdx) + jsonSnippet + content.slice(openBraceIdx);

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Successfully updated ${filePath}`);
}

updateFile('admin-panel/src/api/apiSpec.js');
updateFile('backend/src/routes/docsRoutes.js');
