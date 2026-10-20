import { AccessToken } from 'livekit-server-sdk';
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

export const DEFAULT_LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://snlive-y3r75itj.livekit.cloud';
export const DEFAULT_LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'APInTHjZ4pwntq4';
export const DEFAULT_LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'euPgL1zVA1nD0GeorSxn9amK7PayQg0nnoliE4e9xWlB';

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

  const shouldPublish = Boolean(isHost || canPublish);

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
};
