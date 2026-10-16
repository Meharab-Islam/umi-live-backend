import fs from 'fs';

function tagEndpoints(filePath, isExportConst) {
  let content = fs.readFileSync(filePath, 'utf8');
  const startIdx = content.indexOf('export const API_SPEC =');
  const endIdx = content.lastIndexOf('};');
  const jsonStr = content.slice(startIdx + 'export const API_SPEC ='.length, endIdx + 1).trim();
  const specJson = JSON.parse(jsonStr);

  const liveCategories = new Set(['live-rooms', 'live-viewers', 'live-seats', 'live-admins']);

  for (const ep of specJson.endpoints) {
    if (!liveCategories.has(ep.category)) continue;

    const path = ep.path.toLowerCase();
    const id = ep.id.toLowerCase();
    const summary = ep.summary || '';
    const cleanSummary = summary.replace(/^\[.*?\]\s*/, '');

    if (path === '/api/mobile/live/rooms/:roomid/seats/take') {
      ep.liveType = 'audio';
      ep.summary = `[🎙️ Audio Live Only] Direct Seat Jump-In (No Request Needed)`;
      ep.description = `**Stream Type**: 🎙️ Audio Live Room exclusive feature.\n\n⚠️ **Strict Video Live Rule**: In Video Live rooms, direct seat taking is strictly prohibited (returns HTTP 403 Forbidden). In Video Live, viewers MUST submit a seat request (\`POST /api/mobile/live/rooms/:roomId/seats/request\`) and wait for the host to accept/approve.`;
    } else if (path.includes('/seats/request')) {
      ep.liveType = 'both';
      ep.summary = `[🎥 Video Live & Audio] Multi-Seat Request System`;
      ep.description = `**Stream Type**: 🎥 Mandatory for Video Live rooms. In Video Live, NO user can auto-take a seat under any circumstances without the host accepting the request. Host must approve via \`POST /api/mobile/live/rooms/:roomId/seats/requests/:requestId/approve\`.`;
    } else if (
      path.includes('/seats/increase') ||
      path.includes('/seats/decrease') ||
      path.includes('/seats/count') ||
      path.includes('/seats/update-count') ||
      path.includes('/seats/lock-all-empty') ||
      path.includes('/seats/empty/lock') ||
      path.includes('/seats/empty/unlock') ||
      path.includes('/seats/kick-all') ||
      path.includes('/seats/clear-all') ||
      path.includes('/seats/eject-all') ||
      path.includes('/seats/mute-all') ||
      path.includes('/seats/unmute-all') ||
      path.includes('/seats/switch') ||
      path.includes('/seats/move')
    ) {
      ep.liveType = 'audio';
      ep.summary = `[🎙️ Audio Live] ${cleanSummary}`;
      ep.description = `**Stream Type**: 🎙️ Audio Live Room exclusive feature.\n\n${ep.description.replace(/^\*\*Stream Type\*\*:[^\n]*\n\n/, '')}`;
    } else {
      ep.liveType = 'both';
      ep.summary = `[🎥🎙️ Video & Audio Live] ${cleanSummary}`;
      ep.description = `**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\n${ep.description.replace(/^\*\*Stream Type\*\*:[^\n]*\n\n/, '')}`;
    }
  }

  let newContent;
  if (isExportConst) {
    newContent = `import express from 'express';\n\nconst router = express.Router();\n\nexport const API_SPEC = ${JSON.stringify(specJson, null, 2)};\n\nrouter.get('/spec', (req, res) => {\n  return res.json(API_SPEC);\n});\n\nexport default router;\n`;
  } else {
    newContent = `export const API_SPEC = ${JSON.stringify(specJson, null, 2)};\n\nexport default API_SPEC;\n`;
  }

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Tagged live types in ${filePath} successfully!`);
}

tagEndpoints('backend/src/routes/docsRoutes.js', true);
tagEndpoints('admin-panel/src/api/apiSpec.js', false);
