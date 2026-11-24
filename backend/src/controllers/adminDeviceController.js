import { query } from '../config/db.js';
import { setDeviceBanState, normalizeDeviceId } from '../services/deviceService.js';

/**
 * GET /api/admin/devices/banned?page=1&limit=20&search=
 * Banned hardware devices. A device is listed once even when several accounts used it.
 */
export async function getBannedDevices(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || req.query.q || '').trim();

    const where = ['ud.is_banned = 1'];
    const params = [];
    if (search) {
      where.push(
        '(ud.device_id LIKE ? OR ud.device_model LIKE ? OR ud.ban_reason LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR CAST(u.id AS CHAR) = ?)'
      );
      const like = `%${search}%`;
      params.push(like, like, like, like, like, search.replace(/^#/, ''));
    }
    const whereSql = where.join(' AND ');

    const [countRow] = await query(
      `SELECT COUNT(DISTINCT ud.device_id) AS total
       FROM user_devices ud LEFT JOIN users u ON u.id = ud.user_id
       WHERE ${whereSql}`,
      params
    );

    const rows = await query(
      `SELECT ud.device_id,
              MAX(ud.device_model) AS device_model,
              MAX(ud.os_type) AS os_type,
              MAX(ud.os_version) AS os_version,
              MAX(ud.ban_reason) AS ban_reason,
              MAX(ud.banned_at) AS banned_at,
              MAX(ud.last_login_at) AS last_login_at,
              MAX(ud.ip_address) AS ip_address,
              COUNT(DISTINCT ud.user_id) AS accounts_count,
              GROUP_CONCAT(DISTINCT CONCAT(u.id, '::', COALESCE(u.full_name, '')) SEPARATOR '||') AS accounts
       FROM user_devices ud LEFT JOIN users u ON u.id = ud.user_id
       WHERE ${whereSql}
       GROUP BY ud.device_id
       ORDER BY MAX(ud.banned_at) DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const devices = (rows || []).map((r) => ({
      device_id: r.device_id,
      device_model: r.device_model || 'Unknown Device',
      os_type: r.os_type || '',
      os_version: r.os_version || '',
      ban_reason: r.ban_reason || '',
      banned_at: r.banned_at,
      last_login_at: r.last_login_at,
      ip_address: r.ip_address || '',
      accounts_count: Number(r.accounts_count) || 0,
      accounts: String(r.accounts || '')
        .split('||')
        .filter(Boolean)
        .map((a) => {
          const [id, ...name] = a.split('::');
          return { id: Number(id) || null, full_name: name.join('::') };
        }),
    }));

    const total = Number(countRow?.total) || 0;
    return res.json({
      success: true,
      devices,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    console.error('getBannedDevices error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load banned devices.', error: err.message });
  }
}

/**
 * POST /api/admin/devices/unban
 * Body: { device_id } or { device_ids: [] }
 * Lifts the ban on the hardware device(s), for every account that used them.
 */
export async function unbanDevices(req, res) {
  try {
    const raw = req.body?.device_ids ?? req.body?.device_id ?? req.body?.deviceId;
    const ids = (Array.isArray(raw) ? raw : [raw]).map(normalizeDeviceId).filter(Boolean);
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'device_id (or device_ids) is required.' });
    }

    const affected = await setDeviceBanState(ids, false);
    return res.json({
      success: true,
      message: `${ids.length === 1 ? 'Device' : `${ids.length} devices`} unbanned successfully.`,
      devices_unbanned: ids.length,
      rows_affected: affected,
    });
  } catch (err) {
    console.error('unbanDevices error:', err);
    return res.status(500).json({ success: false, message: 'Failed to unban device.', error: err.message });
  }
}
