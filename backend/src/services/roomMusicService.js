import { cache } from '../config/redis.js';

/**
 * YouTube Music & Stream BGM Room State Synchronization Service
 * Provides centralized, real-time playback state caching via Redis.
 * Supports real-time time-offset calculation for late-joining users.
 */

/**
 * Retrieve current active music playback state for a live room.
 * Computes exact real-time playback position in seconds based on elapsed time.
 * @param {string|number} roomId 
 * @returns {Promise<Object|null>}
 */
export async function getRoomMusicState(roomId) {
  if (!roomId) return null;
  try {
    const key = `live:room:music:${roomId}`;
    const raw = await cache.get(key);
    if (!raw) return null;

    const state = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!state || !state.videoId) return null;

    // Calculate real-time elapsed playback position for active playing state
    let positionSeconds = Number(state.positionSeconds || 0);
    if (state.isPlaying && state.startedAt) {
      const elapsed = (Date.now() - Number(state.startedAt)) / 1000;
      if (elapsed > 0) {
        positionSeconds = Math.max(0, positionSeconds + elapsed);
      }
    }

    const currentPos = parseFloat(positionSeconds.toFixed(1));

    return {
      roomId: String(state.roomId || roomId),
      videoId: state.videoId,
      title: state.title || '',
      thumbnailUrl: state.thumbnailUrl || '',
      isPlaying: Boolean(state.isPlaying),
      positionSeconds: currentPos,
      position_seconds: currentPos,
      startedAt: state.startedAt || Date.now(),
      updatedAt: state.updatedAt || Date.now(),
      action: state.action || (state.isPlaying ? 'play' : 'pause'),
    };
  } catch (err) {
    console.error(`getRoomMusicState error for room ${roomId}:`, err.message);
    return null;
  }
}

/**
 * Store or update active music playback state for a live room in Redis.
 * @param {string|number} roomId 
 * @param {Object} musicData 
 * @returns {Promise<Object|null>}
 */
export async function setRoomMusicState(roomId, musicData = {}) {
  if (!roomId) return null;
  try {
    const key = `live:room:music:${roomId}`;

    // If stopping or clearing music
    if (!musicData || musicData.action === 'stop' || !musicData.videoId) {
      await cache.del(key);
      return null;
    }

    const isPlaying = musicData.action === 'pause'
      ? false
      : Boolean(musicData.isPlaying !== false && musicData.action !== 'stop');

    const state = {
      roomId: String(roomId),
      videoId: String(musicData.videoId || musicData.video_id || '').trim(),
      title: String(musicData.title || '').trim(),
      thumbnailUrl: String(musicData.thumbnailUrl || musicData.thumbnail_url || '').trim(),
      isPlaying,
      positionSeconds: Number(musicData.positionSeconds || musicData.position_seconds || 0),
      startedAt: Date.now(),
      updatedAt: Date.now(),
      action: musicData.action || (isPlaying ? 'play' : 'pause'),
    };

    // Store in Redis with 24-hour expiration (also cleaned on room end)
    await cache.set(key, state, 86400);

    return {
      ...state,
      position_seconds: state.positionSeconds,
    };
  } catch (err) {
    console.error(`setRoomMusicState error for room ${roomId}:`, err.message);
    return null;
  }
}

/**
 * Remove music playback state for a room when ended or stopped.
 * @param {string|number} roomId 
 */
export async function clearRoomMusicState(roomId) {
  if (!roomId) return;
  try {
    await cache.del(`live:room:music:${roomId}`);
  } catch (err) {
    console.error(`clearRoomMusicState error for room ${roomId}:`, err.message);
  }
}
