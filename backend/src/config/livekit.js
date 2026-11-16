import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';
import { cache } from './redis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const DEFAULT_LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://bmprolivekit.lolipoplive.top';
// Credentials are NEVER hardcoded (AGENTS.md rule 1). Set LIVEKIT_API_KEY / LIVEKIT_API_SECRET in .env
// (or via system_settings in the admin panel).
export const DEFAULT_LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
export const DEFAULT_LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';
if (!DEFAULT_LIVEKIT_API_KEY || !DEFAULT_LIVEKIT_API_SECRET) {
  console.warn('⚠️ [LiveKit] LIVEKIT_API_KEY / LIVEKIT_API_SECRET are not set in the environment; relying on system_settings.');
}

export const LIVEKIT_URL = DEFAULT_LIVEKIT_URL;
export const LIVEKIT_API_KEY = DEFAULT_LIVEKIT_API_KEY;
export const LIVEKIT_API_SECRET = DEFAULT_LIVEKIT_API_SECRET;

/**
 * Fetch dynamic LiveKit credentials from Database SSOT (with Redis Cache-Aside & .env fallback)
 */
export async function getLiveKitConfig() {
  const cacheKey = 'config:livekit';
  const TTL = 120; // 2 minutes

  return await cache.getOrSet(cacheKey, TTL, async () => {
    try {
      const rows = await query(
        "SELECT key_name, key_value FROM system_settings WHERE key_name IN ('livekit_url', 'livekit_host', 'livekit_api_key', 'livekit_api_secret', 'live_stream_provider')"
      );
      const map = {};
      for (const r of rows || []) {
        map[r.key_name] = r.key_value;
      }

      const isValid = (v) => v && typeof v === 'string' && v.trim() !== '' && v.trim() !== 'undefined' && v.trim() !== 'null';

      const url = isValid(map['livekit_url'] || map['livekit_host'])
        ? (map['livekit_url'] || map['livekit_host']).trim()
        : (process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST || DEFAULT_LIVEKIT_URL).trim();

      const apiKey = isValid(map['livekit_api_key'])
        ? map['livekit_api_key'].trim()
        : (process.env.LIVEKIT_API_KEY || DEFAULT_LIVEKIT_API_KEY).trim();

      const apiSecret = isValid(map['livekit_api_secret'])
        ? map['livekit_api_secret'].trim()
        : (process.env.LIVEKIT_API_SECRET || DEFAULT_LIVEKIT_API_SECRET).trim();

      const provider = isValid(map['live_stream_provider'])
        ? map['live_stream_provider'].trim()
        : 'livekit';

      return {
        url,
        apiKey,
        apiSecret,
        provider,
      };
    } catch (err) {
      console.warn('[LiveKit Config] Error querying DB, falling back to env:', err.message);
      return {
        url: DEFAULT_LIVEKIT_URL,
        apiKey: DEFAULT_LIVEKIT_API_KEY,
        apiSecret: DEFAULT_LIVEKIT_API_SECRET,
        provider: 'livekit',
      };
    }
  });
}


/**
 * When true (default) audience members get subscribe-only LiveKit tokens and
 * publish permission follows seat ownership. Set
 * LIVEKIT_ENFORCE_PUBLISH_PERMISSION=false to restore the old "everyone may
 * publish" behaviour (instant rollback, no redeploy of the app needed).
 */
export const ENFORCE_PUBLISH_PERMISSION =
  String(process.env.LIVEKIT_ENFORCE_PUBLISH_PERMISSION ?? 'true').toLowerCase() !== 'false';

const LIVEKIT_ADMIN_TIMEOUT_MS = 3000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`LiveKit admin call timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function getRoomServiceClient() {
  const { url, apiKey, apiSecret } = await getLiveKitConfig();
  const httpUrl = String(url).replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

function buildPermission(canPublish) {
  // updateParticipant REPLACES the whole permission object, so every flag
  // must be sent explicitly (unset booleans default to false).
  return {
    canSubscribe: true,
    canPublish: Boolean(canPublish),
    canPublishData: true,
  };
}

/**
 * Grant / revoke publish permission for a user already connected to the
 * LiveKit room. Best effort: never throws. If the user is not connected yet
 * (or LiveKit is unreachable) the next token they fetch already carries the
 * right permission because getLiveKitToken checks the seat table.
 */
export async function setParticipantPublishPermission(roomId, userId, canPublish) {
  if (!ENFORCE_PUBLISH_PERMISSION || !roomId || !userId) return false;
  try {
    const client = await getRoomServiceClient();
    await withTimeout(
      client.updateParticipant(String(roomId), String(userId), undefined, buildPermission(canPublish)),
      LIVEKIT_ADMIN_TIMEOUT_MS
    );
    return true;
  } catch (err) {
    // Participant not in the LiveKit room yet is expected and harmless.
    console.warn(`[LiveKit] setParticipantPublishPermission(${roomId}, ${userId}, ${canPublish}) failed: ${err.message}`);
    return false;
  }
}

/**
 * Reconcile publish permission of every connected participant with the seat
 * table (host + seated users may publish, everyone else is audience).
 */
export async function syncRoomPublishPermissions(roomId, { hostId = null, seatedUserIds = [] } = {}) {
  if (!ENFORCE_PUBLISH_PERMISSION || !roomId) return;
  try {
    const client = await getRoomServiceClient();
    const participants = await withTimeout(client.listParticipants(String(roomId)), LIVEKIT_ADMIN_TIMEOUT_MS);
    const allowed = new Set(seatedUserIds.map(String));
    if (hostId) allowed.add(String(hostId));
    await Promise.allSettled(
      participants.map((p) => {
        const shouldPublish = allowed.has(String(p.identity));
        const currentlyCan = Boolean(p.permission?.canPublish);
        if (shouldPublish === currentlyCan) return null;
        return withTimeout(
          client.updateParticipant(String(roomId), p.identity, undefined, buildPermission(shouldPublish)),
          LIVEKIT_ADMIN_TIMEOUT_MS
        );
      })
    );
  } catch (err) {
    console.warn(`[LiveKit] syncRoomPublishPermissions(${roomId}) failed: ${err.message}`);
  }
}

/**
 * Generate a LiveKit AccessToken for WebRTC Audio/Video Streaming
 * @param {Object} options
 * @param {string} options.roomId - The live room ID
 * @param {number|string} options.userId - Unique user identity
 * @param {string} options.userName - Display name
 * @param {boolean} options.isHost - Is user the host of the room
 * @param {boolean} options.canPublish - Can publish audio/video (host or seated participant)
 * @param {Object} options.metadata - Optional metadata (avatar, role, vip level)
 */
export async function generateLiveKitToken({
  roomId,
  userId,
  userName,
  isHost = false,
  canPublish = false,
  metadata = null,
}) {
  if (!roomId || !userId) {
    throw new Error('roomId and userId are required to generate LiveKit token.');
  }

  const { url, apiKey, apiSecret } = await getLiveKitConfig();

  const at = new AccessToken(apiKey, apiSecret, {
    identity: String(userId),
    name: userName || `User_${userId}`,
    ttl: '6h',
    metadata: metadata ? JSON.stringify(metadata) : undefined,
  });

  // Only the host and seated participants may publish. Audience tokens are
  // subscribe-only; publish permission is granted / revoked at runtime via
  // setParticipantPublishPermission() when a seat is taken or vacated.
  const shouldPublish = ENFORCE_PUBLISH_PERMISSION
    ? Boolean(isHost || canPublish)
    : true;

  at.addGrant({
    roomJoin: true,
    room: String(roomId),
    canPublish: shouldPublish,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return {
    token,
    url,
    server_url: url,
    roomId: String(roomId),
    identity: String(userId),
    name: userName,
    canPublish: shouldPublish,
  };
}

export default {
  LIVEKIT_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  getLiveKitConfig,
  generateLiveKitToken,
  setParticipantPublishPermission,
  syncRoomPublishPermissions,
  ENFORCE_PUBLISH_PERMISSION,
};
