import { query } from '../config/db.js';
import { cache } from '../config/redis.js';

/**
 * Service to resolve special runtime user privileges:
 * 1. accept_my_own_video_live_seat_request:
 *    - true if user has an active VIP package whose category has self_seat_accept == 1
 *    - allows user to self-accept their own waiting seat in video/audio live without host approval.
 * 2. invisible_room_enter:
 *    - true if user is an active moderator whose permissions contain silent_room_entry == true
 *      (or invisible_room_enter / ghost_mode), or if role is admin/superadmin.
 *    - allows moderator to join live rooms invisibly (ghost mode) without incrementing viewer count,
 *      without appearing in viewers list, and without emitting join notices or chat announcements.
 */

export async function checkUserSelfSeatAcceptPrivilege(userId) {
  if (!userId) return false;

  return await cache.getOrSet(`user:privilege:self_seat:${userId}`, 60, async () => {
    const rows = await query(
      `SELECT pc.self_seat_accept 
       FROM user_package_subscriptions ups
       JOIN package_categories pc ON pc.id = ups.category_id
       WHERE ups.user_id = ? AND ups.status = 'active' AND ups.expires_at > NOW() AND pc.self_seat_accept = 1
       LIMIT 1`,
      [userId]
    );
    return rows.length > 0;
  });
}

export async function checkUserInvisibleRoomEnterPrivilege(userId, role) {
  if (!userId) return false;

  // Admins & superadmins inherently possess invisible room entry capabilities
  if (role === 'admin' || role === 'superadmin') return true;

  return await cache.getOrSet(`user:privilege:invisible_enter:${userId}`, 60, async () => {
    // Check if user is a moderator with silent_room_entry or invisible_room_enter permission
    const rows = await query(
      `SELECT permissions, status 
       FROM moderators 
       WHERE user_id = ? AND status = 'active' 
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) return false;

    let perms = rows[0].permissions;
    if (typeof perms === 'string') {
      try {
        perms = JSON.parse(perms);
      } catch {
        perms = {};
      }
    }

    if (!perms || typeof perms !== 'object') return false;

    return Boolean(
      perms.silent_room_entry === true ||
      perms.invisible_room_enter === true ||
      perms.invigible_room_enter === true ||
      perms.ghost_mode === true ||
      perms.stealth_mode === true ||
      perms.all === true
    );
  });
}

export async function getUserSpecialPrivileges(userId, role) {
  if (!userId) {
    return {
      accept_my_own_video_live_seat_request: false,
      acceppt_my_own_video_live_seat_requst: false,
      invisible_room_enter: false,
      invigible_room_enter: false,
    };
  }

  const [hasSelfSeatAccept, hasInvisibleRoomEnter] = await Promise.all([
    checkUserSelfSeatAcceptPrivilege(userId),
    checkUserInvisibleRoomEnterPrivilege(userId, role),
  ]);

  return {
    accept_my_own_video_live_seat_request: Boolean(hasSelfSeatAccept),
    acceppt_my_own_video_live_seat_requst: Boolean(hasSelfSeatAccept), // exact spelling alias requested
    invisible_room_enter: Boolean(hasInvisibleRoomEnter),
    invigible_room_enter: Boolean(hasInvisibleRoomEnter), // exact spelling alias requested
  };
}

export async function invalidateUserSpecialPrivileges(userId) {
  if (!userId) return;
  await Promise.allSettled([
    cache.del(`user:privilege:self_seat:${userId}`),
    cache.del(`user:privilege:invisible_enter:${userId}`),
    cache.del(`mobile:user:profile:${userId}`),
    cache.del(`user:${userId}`),
  ]);
}
