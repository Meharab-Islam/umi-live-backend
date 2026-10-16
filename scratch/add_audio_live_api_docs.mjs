import fs from 'fs';

const audioSeatEndpoints = [
  {
    id: 'live-take-seat-direct',
    category: 'live-seats',
    method: 'POST',
    path: '/api/mobile/live/rooms/:roomId/seats/take',
    summary: 'Take Seat Directly (No Request Needed)',
    description: 'Viewer immediately takes an open seat in an Audio/Video live room without needing host approval. If seat_number is omitted, automatically finds and occupies the lowest available open unlocked seat.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of viewer' },
    ],
    parameters: [
      { name: 'roomId', type: 'string', in: 'path', required: true, description: 'Unique live room identifier' },
    ],
    requestBody: {
      contentType: 'application/json',
      example: {
        seat_number: 2,
      },
    },
    responses: [
      {
        status: 200,
        description: 'Successfully seated on co-host seat.',
        example: {
          success: true,
          message: 'You took seat 2 successfully.',
          room: {
            room_id: 'room-5deedf0e',
            total_seats: 7,
            occupied_seats_count: 2,
            empty_seats_count: 5,
            open_seats_count: 5,
            locked_seats_count: 0,
            live_duration: {
              duration_seconds: 120,
              duration_formatted: '02:00',
            },
          },
        },
      },
      {
        status: 400,
        description: 'Target seat occupied, locked, or invalid seat number.',
        example: {
          success: false,
          message: 'Seat 2 is already occupied.',
        },
      },
    ],
  },
  {
    id: 'live-switch-seat',
    category: 'live-seats',
    method: 'POST',
    path: '/api/mobile/live/rooms/:roomId/seats/switch',
    summary: 'Switch / Move from Current Seat to Another Empty Seat',
    description: 'A seated co-host moves directly from their current seat to another unoccupied and unlocked seat. The previous seat is automatically freed, media state is preserved, and the user occupies the new seat without losing co-host participation.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of seated co-host' },
    ],
    parameters: [
      { name: 'roomId', type: 'string', in: 'path', required: true, description: 'Unique live room identifier' },
    ],
    requestBody: {
      contentType: 'application/json',
      example: {
        seat_number: 5,
      },
    },
    responses: [
      {
        status: 200,
        description: 'Successfully moved to target seat.',
        example: {
          success: true,
          message: 'Moved to seat 5 successfully.',
          is_switch: true,
          from_seat_number: 2,
          to_seat_number: 5,
          seat_number: 5,
        },
      },
      {
        status: 400,
        description: 'Target seat is occupied or locked.',
        example: {
          success: false,
          message: 'Seat 5 is already occupied.',
        },
      },
    ],
  },
  {
    id: 'live-leave-seat',
    category: 'live-seats',
    method: 'POST',
    path: '/api/mobile/live/rooms/:roomId/seats/leave',
    summary: 'Leave Co-Host Seat',
    description: 'Co-host voluntarily vacates their seat and returns to regular room viewer audience.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of seated user' },
    ],
    parameters: [
      { name: 'roomId', type: 'string', in: 'path', required: true, description: 'Unique live room identifier' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'Left seat successfully.',
        example: {
          success: true,
          message: 'Left seat successfully.',
        },
      },
    ],
  },
  {
    id: 'live-increase-seats',
    category: 'live-seats',
    method: 'POST',
    path: '/api/mobile/live/rooms/:roomId/seats/increase',
    summary: 'Increase Audio Live Seat Count (+1)',
    description: 'Host or room admin steps up Audio Live room seats by 1 (or by optional step in request body). Seeds empty seats dynamically.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Host or Admin' },
    ],
    parameters: [
      { name: 'roomId', type: 'string', in: 'path', required: true, description: 'Unique live room identifier' },
    ],
    requestBody: {
      contentType: 'application/json',
      example: {
        step: 1,
      },
    },
    responses: [
      {
        status: 200,
        description: 'Seat count increased successfully.',
        example: {
          success: true,
          message: 'Audio live seat count updated to 8 seats successfully.',
          total_seats: 8,
          previous_seats: 7,
        },
      },
    ],
  },
  {
    id: 'live-decrease-seats',
    category: 'live-seats',
    method: 'POST',
    path: '/api/mobile/live/rooms/:roomId/seats/decrease',
    summary: 'Decrease Audio Live Seat Count (-1, Min 7)',
    description: 'Host or room admin steps down Audio Live room seats by 1 (or by optional step). Cannot decrease below minimum 7 seats. Fails if seats to be removed are currently occupied.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Host or Admin' },
    ],
    parameters: [
      { name: 'roomId', type: 'string', in: 'path', required: true, description: 'Unique live room identifier' },
    ],
    requestBody: {
      contentType: 'application/json',
      example: {
        step: 1,
      },
    },
    responses: [
      {
        status: 200,
        description: 'Seat count decreased successfully.',
        example: {
          success: true,
          message: 'Audio live seat count updated to 7 seats successfully.',
          total_seats: 7,
          previous_seats: 8,
        },
      },
      {
        status: 400,
        description: 'Cannot decrease below minimum 7 seats or seat is occupied.',
        example: {
          success: false,
          message: 'Audio Live rooms must have at least 7 seats (minimum seat count is 7). Cannot decrease below 7.',
        },
      },
    ],
  },
  {
    id: 'live-lock-individual-seat',
    category: 'live-seats',
    method: 'POST',
    path: '/api/mobile/live/rooms/:roomId/seats/:seatNumber/lock',
    summary: 'Lock / Unlock Individual Seat',
    description: 'Host or moderator locks or unlocks a specific seat by number. If locked while occupied, the occupant is safely ejected back to audience.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Host or Moderator' },
    ],
    parameters: [
      { name: 'roomId', type: 'string', in: 'path', required: true, description: 'Unique live room identifier' },
      { name: 'seatNumber', type: 'integer', in: 'path', required: true, description: 'Seat number (2 to total_seats)' },
    ],
    requestBody: {
      contentType: 'application/json',
      example: {
        is_locked: true,
      },
    },
    responses: [
      {
        status: 200,
        description: 'Seat lock status updated successfully.',
        example: {
          success: true,
          message: 'Seat 4 locked successfully.',
          isLocked: true,
          seatNumber: 4,
        },
      },
    ],
  },
  {
    id: 'live-lock-all-empty-seats',
    category: 'live-seats',
    method: 'POST',
    path: '/api/mobile/live/rooms/:roomId/seats/lock-all-empty',
    summary: 'Lock / Unlock All Empty Seats at Once',
    description: 'Host or moderator locks or unlocks all empty guest seats in a single atomic database operation. Synchronizes Redis and emits socket broadcast.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Host or Moderator' },
    ],
    parameters: [
      { name: 'roomId', type: 'string', in: 'path', required: true, description: 'Unique live room identifier' },
    ],
    requestBody: {
      contentType: 'application/json',
      example: {
        is_locked: true,
      },
    },
    responses: [
      {
        status: 200,
        description: 'All empty seats locked/unlocked successfully.',
        example: {
          success: true,
          message: 'All empty seats locked successfully (5 seats).',
          is_locked: true,
          affected_seats: 5,
        },
      },
    ],
  },
  {
    id: 'live-mute-individual-seat',
    category: 'live-seats',
    method: 'POST',
    path: '/api/mobile/live/rooms/:roomId/seats/:seatNumber/mute',
    summary: 'Mute / Unmute Individual Seat or User',
    description: 'Host or moderator mutes or unmutes a specific co-host by seat number or userId.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Host or Moderator' },
    ],
    parameters: [
      { name: 'roomId', type: 'string', in: 'path', required: true, description: 'Unique live room identifier' },
      { name: 'seatNumber', type: 'integer', in: 'path', required: true, description: 'Seat number (1 to total_seats)' },
    ],
    requestBody: {
      contentType: 'application/json',
      example: {
        is_muted: true,
      },
    },
    responses: [
      {
        status: 200,
        description: 'Seat mute state updated successfully.',
        example: {
          success: true,
          message: 'Seat 2 muted successfully.',
          isMuted: true,
          seatNumber: 2,
        },
      },
    ],
  },
  {
    id: 'live-mute-all-seats',
    category: 'live-seats',
    method: 'POST',
    path: '/api/mobile/live/rooms/:roomId/seats/mute-all',
    summary: 'Mute / Unmute All Seated Users at Once',
    description: 'Host or room moderator mutes or unmutes all seated guest users simultaneously. Emits socket broadcast and synchronizes Redis.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Host or Moderator' },
    ],
    parameters: [
      { name: 'roomId', type: 'string', in: 'path', required: true, description: 'Unique live room identifier' },
    ],
    requestBody: {
      contentType: 'application/json',
      example: {
        is_muted: true,
        include_host: false,
      },
    },
    responses: [
      {
        status: 200,
        description: 'All seated users muted/unmuted successfully.',
        example: {
          success: true,
          message: 'All seated users muted successfully (2 user(s)).',
          is_muted: true,
          affected_count: 2,
        },
      },
    ],
  },
  {
    id: 'live-kick-individual-seat',
    category: 'live-seats',
    method: 'POST',
    path: '/api/mobile/live/rooms/:roomId/seats/:seatNumber/kick',
    summary: 'Kick User from Specific Seat',
    description: 'Host or moderator removes an occupant from their seat back to audience by seat number or userId.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Host or Moderator' },
    ],
    parameters: [
      { name: 'roomId', type: 'string', in: 'path', required: true, description: 'Unique live room identifier' },
      { name: 'seatNumber', type: 'integer', in: 'path', required: true, description: 'Seat number to clear' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'User removed from seat successfully.',
        example: {
          success: true,
          message: 'User removed from seat successfully.',
        },
      },
    ],
  },
  {
    id: 'live-kick-all-seats',
    category: 'live-seats',
    method: 'POST',
    path: '/api/mobile/live/rooms/:roomId/seats/kick-all',
    summary: 'Kick All Seated Users at Once (Clean Sweep)',
    description: 'Host or platform admin clears all guest seats simultaneously back to room audience in a single database operation. Emits socket notifications.',
    requiresAuth: true,
    requestHeaders: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer JWT token of Room Host or Admin' },
    ],
    parameters: [
      { name: 'roomId', type: 'string', in: 'path', required: true, description: 'Unique live room identifier' },
    ],
    requestBody: null,
    responses: [
      {
        status: 200,
        description: 'All co-host users removed from seats.',
        example: {
          success: true,
          message: 'Successfully removed 2 user(s) from co-host seats.',
          removed_count: 2,
          removed_users: [
            { seat_number: 2, user_id: 2 },
            { seat_number: 3, user_id: 3 },
          ],
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

  const existingIds = new Set(audioSeatEndpoints.map((e) => e.id));
  specJson.endpoints = specJson.endpoints.filter((e) => !existingIds.has(e.id));

  // Find index of live-update-seat-count or append
  const idx = specJson.endpoints.findIndex((e) => e.id === 'live-update-seat-count');
  if (idx !== -1) {
    specJson.endpoints.splice(idx + 1, 0, ...audioSeatEndpoints);
  } else {
    specJson.endpoints.push(...audioSeatEndpoints);
  }

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
