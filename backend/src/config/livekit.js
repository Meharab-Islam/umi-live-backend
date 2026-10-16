import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://snlive-y3r75itj.livekit.cloud';
export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'APInTHjZ4pwntq4';
export const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'euPgL1zVA1nD0GeorSxn9amK7PayQg0nnoliE4e9xWlB';

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

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
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
    url: LIVEKIT_URL,
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
  generateLiveKitToken,
};
