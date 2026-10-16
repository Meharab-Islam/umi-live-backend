import { query } from '../../config/db.js';
import { cache } from '../../config/redis.js';

/**
 * Format raw seconds into human-friendly "00h 00m 00s" format.
 */
function formatDuration(totalSeconds) {
  const sec = Math.max(0, parseInt(totalSeconds || 0, 10));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

/**
 * Resolve target host ID.
 * Hosts operate strictly on their own account.
 * Admins, superadmins, and agency managers can pass ?hostId= to inspect host stats.
 */
function resolveHostId(req) {
  if (req.user) {
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'agency') {
      const specified = req.query.hostId || req.body?.hostId || req.params.hostId;
      return specified ? parseInt(specified, 10) : req.user.id;
    }
    return req.user.id;
  }
  const fallback = req.query.hostId || req.body?.hostId || req.params.hostId;
  return fallback ? parseInt(fallback, 10) : null;
}

/**
 * GET /api/mobile/host/agency
 * GET /api/mobile/host/my-agency
 * Returns the host's current agency affiliation, host_type ('video' | 'audio'),
 * and lifetime streaming duration, total coins earned, and total agency commission while under this agency.
 * Production Redis Cache-Aside: 'host:agency_summary:{hostId}' (TTL 60s).
 */
export async function getHostAgencySummary(req, res) {
  try {
    const hostId = resolveHostId(req);
    if (!hostId || isNaN(hostId)) {
      return res.status(400).json({ success: false, message: 'Host ID could not be identified.' });
    }

    const cacheKey = `host:agency_summary:${hostId}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      // 1. Fetch host profile details
      const [host] = await query(
        `SELECT 
           id, full_name, email, avatar_url, role, host_type, agency_id, agency_joined_at, 
           coins, diamonds, level, is_banned, created_at 
         FROM users 
         WHERE id = ?`,
        [hostId]
      );

      if (!host) {
        return null;
      }

      const hostType = host.host_type || 'video';
      const agencyJoinedAt = host.agency_joined_at || host.created_at;

      // 2. Fetch agency info if host belongs to one
      let agency = null;
      let commissionRate = 10.0;

      if (host.agency_id) {
        const [agencyRow] = await query(
          `SELECT 
             a.id, a.agency_code, a.name, a.owner_id, a.commission_rate, 
             a.status, a.contact_phone, a.notes, a.created_at,
             u.full_name AS owner_name, u.avatar_url AS owner_avatar
           FROM agencies a
           LEFT JOIN users u ON u.id = a.owner_id
           WHERE a.id = ?`,
          [host.agency_id]
        );

        if (agencyRow) {
          agency = {
            id: agencyRow.id,
            agency_code: agencyRow.agency_code,
            name: agencyRow.name,
            owner_id: agencyRow.owner_id,
            owner_name: agencyRow.owner_name || 'Agency Manager',
            owner_avatar: agencyRow.owner_avatar || '',
            commission_rate: parseFloat(agencyRow.commission_rate || 10),
            status: agencyRow.status,
            contact_phone: agencyRow.contact_phone,
            created_at: agencyRow.created_at,
            host_joined_at: agencyJoinedAt,
          };
          commissionRate = agency.commission_rate;
        }
      }

      // 3. Lifetime live stream duration while under this agency
      const [streamStats] = await query(
        `SELECT 
           COUNT(id) AS total_sessions,
           COALESCE(SUM(TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW()))), 0) AS total_duration_seconds,
           COALESCE(SUM(CASE WHEN live_type = 'video' THEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) ELSE 0 END), 0) AS video_duration_seconds,
           COALESCE(SUM(CASE WHEN live_type = 'audio' THEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) ELSE 0 END), 0) AS audio_duration_seconds,
           COUNT(DISTINCT DATE(started_at)) AS total_active_days
         FROM live_rooms
         WHERE host_id = ? AND started_at >= ?`,
        [hostId, agencyJoinedAt]
      );

      const totalSec = parseInt(streamStats?.total_duration_seconds || 0, 10);
      const videoSec = parseInt(streamStats?.video_duration_seconds || 0, 10);
      const audioSec = parseInt(streamStats?.audio_duration_seconds || 0, 10);

      // 4. Lifetime earnings & gifts received while under this agency
      const [earningsStats] = await query(
        `SELECT 
           COALESCE(SUM(coin_amount), 0) AS total_coins_gifted,
           COALESCE(SUM(diamond_amount), 0) AS total_diamonds_earned,
           COUNT(id) AS total_gifts_received
         FROM gift_transactions
         WHERE receiver_id = ? AND created_at >= ?`,
        [hostId, agencyJoinedAt]
      );

      const totalCoinsGifted = parseInt(earningsStats?.total_coins_gifted || 0, 10);
      const totalDiamonds = parseInt(earningsStats?.total_diamonds_earned || 0, 10);
      const totalAgencyCommission = agency ? Math.round(totalCoinsGifted * (commissionRate / 100)) : 0;
      const hostNetCoins = Math.max(0, totalCoinsGifted - totalAgencyCommission);

      return {
        host: {
          id: host.id,
          full_name: host.full_name,
          email: host.email,
          avatar_url: host.avatar_url,
          role: host.role,
          host_type: hostType,
          is_video_host: hostType === 'video',
          is_audio_host: hostType === 'audio',
          level: host.level || 1,
          coins: host.coins,
          diamonds: host.diamonds,
        },
        has_agency: !!agency,
        agency,
        performance_under_agency: {
          agency_joined_at: agencyJoinedAt,
          total_duration_seconds: totalSec,
          formatted_total_duration: formatDuration(totalSec),
          video_duration_seconds: videoSec,
          formatted_video_duration: formatDuration(videoSec),
          audio_duration_seconds: audioSec,
          formatted_audio_duration: formatDuration(audioSec),
          total_stream_sessions: parseInt(streamStats?.total_sessions || 0, 10),
          total_active_days: parseInt(streamStats?.total_active_days || 0, 10),
          total_coins_earned: totalCoinsGifted,
          total_diamonds_earned: totalDiamonds,
          total_agency_commission: totalAgencyCommission,
          host_net_coins: hostNetCoins,
          commission_rate_percentage: commissionRate,
        },
      };
    });

    if (!data) {
      return res.status(404).json({ success: false, message: 'Host account not found.' });
    }

    return res.json({
      success: true,
      host: data.host,
      has_agency: data.has_agency,
      agency: data.agency,
      performance_under_agency: data.performance_under_agency,
    });
  } catch (err) {
    console.error('getHostAgencySummary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch host agency summary.', error: err.message });
  }
}

/**
 * GET /api/mobile/host/performance/monthly
 * Detailed monthly breakdown of streaming duration (video vs audio) and daily coins/commission.
 * Query params: month=YYYY-MM (default current month e.g. '2026-10')
 * Production Redis Cache-Aside: 'host:monthly:{hostId}:{month}' (TTL 60s).
 */
export async function getHostMonthlyBreakdown(req, res) {
  try {
    const hostId = resolveHostId(req);
    if (!hostId || isNaN(hostId)) {
      return res.status(400).json({ success: false, message: 'Host ID could not be identified.' });
    }

    // Default to current month YYYY-MM
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const selectedMonth = (req.query.month || currentMonthStr).trim();

    if (!/^\d{4}-\d{2}$/.test(selectedMonth)) {
      return res.status(400).json({ success: false, message: 'Invalid month format. Please use YYYY-MM (e.g. 2026-10).' });
    }

    const cacheKey = `host:monthly:${hostId}:${selectedMonth}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      // 1. Fetch host profile details
      const [host] = await query(
        `SELECT id, full_name, email, avatar_url, host_type, agency_id, agency_joined_at, created_at 
         FROM users 
         WHERE id = ?`,
        [hostId]
      );

      if (!host) {
        return null;
      }

      const hostType = host.host_type || 'video';
      const agencyJoinedAt = host.agency_joined_at || host.created_at;

      // 2. Fetch agency info & commission rate
      let agency = null;
      let commissionRate = 10.0;

      if (host.agency_id) {
        const [agencyRow] = await query(
          'SELECT id, agency_code, name, commission_rate FROM agencies WHERE id = ?',
          [host.agency_id]
        );
        if (agencyRow) {
          agency = {
            id: agencyRow.id,
            agency_code: agencyRow.agency_code,
            name: agencyRow.name,
            commission_rate: parseFloat(agencyRow.commission_rate || 10),
          };
          commissionRate = agency.commission_rate;
        }
      }

      // 3. Aggregate daily live room streaming sessions for this month
      const streamRows = await query(
        `SELECT 
           DATE(started_at) AS stream_date,
           COUNT(id) AS sessions_count,
           COALESCE(SUM(TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW()))), 0) AS total_seconds,
           COALESCE(SUM(CASE WHEN live_type = 'video' THEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) ELSE 0 END), 0) AS video_seconds,
           COALESCE(SUM(CASE WHEN live_type = 'audio' THEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) ELSE 0 END), 0) AS audio_seconds
         FROM live_rooms
         WHERE host_id = ? 
           AND DATE_FORMAT(started_at, '%Y-%m') = ?
           AND started_at >= ?
         GROUP BY DATE(started_at)
         ORDER BY stream_date DESC`,
        [hostId, selectedMonth, agencyJoinedAt]
      );

      // 4. Aggregate daily gift earnings for this month
      const giftRows = await query(
        `SELECT 
           DATE(created_at) AS gift_date,
           COALESCE(SUM(coin_amount), 0) AS daily_coins,
           COALESCE(SUM(diamond_amount), 0) AS daily_diamonds,
           COUNT(id) AS gifts_count
         FROM gift_transactions
         WHERE receiver_id = ? 
           AND DATE_FORMAT(created_at, '%Y-%m') = ?
           AND created_at >= ?
         GROUP BY DATE(created_at)`,
        [hostId, selectedMonth, agencyJoinedAt]
      );

      const giftMap = {};
      for (const g of giftRows || []) {
        const dateKey = g.gift_date instanceof Date ? g.gift_date.toISOString().slice(0, 10) : String(g.gift_date);
        giftMap[dateKey] = {
          coins: parseInt(g.daily_coins || 0, 10),
          diamonds: parseInt(g.daily_diamonds || 0, 10),
          count: parseInt(g.gifts_count || 0, 10),
        };
      }

      // Collect all distinct active dates for this month
      const datesSet = new Set();
      for (const s of streamRows || []) {
        const dStr = s.stream_date instanceof Date ? s.stream_date.toISOString().slice(0, 10) : String(s.stream_date);
        datesSet.add(dStr);
      }
      for (const dateKey of Object.keys(giftMap)) {
        datesSet.add(dateKey);
      }

      // Build daily breakdown records
      const streamMap = {};
      for (const s of streamRows || []) {
        const dStr = s.stream_date instanceof Date ? s.stream_date.toISOString().slice(0, 10) : String(s.stream_date);
        streamMap[dStr] = s;
      }

      const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a)); // Descending order
      let monthlyTotalSeconds = 0;
      let monthlyVideoSeconds = 0;
      let monthlyAudioSeconds = 0;
      let monthlyCoinsEarned = 0;
      let monthlyDiamondsEarned = 0;
      let monthlyValidDaysCount = 0;

      const dailyBreakdown = sortedDates.map((dateStr) => {
        const s = streamMap[dateStr] || {};
        const g = giftMap[dateStr] || { coins: 0, diamonds: 0, count: 0 };

        const totalSec = parseInt(s.total_seconds || 0, 10);
        const videoSec = parseInt(s.video_seconds || 0, 10);
        const audioSec = parseInt(s.audio_seconds || 0, 10);
        const coinsEarned = g.coins || 0;
        const diamondsEarned = g.diamonds || 0;
        const agencyCommission = agency ? Math.round(coinsEarned * (commissionRate / 100)) : 0;
        const hostNetCoins = Math.max(0, coinsEarned - agencyCommission);
        const isValidDay = totalSec >= 3600; // Standard agency benchmark: 1 hour active

        monthlyTotalSeconds += totalSec;
        monthlyVideoSeconds += videoSec;
        monthlyAudioSeconds += audioSec;
        monthlyCoinsEarned += coinsEarned;
        monthlyDiamondsEarned += diamondsEarned;
        if (isValidDay) monthlyValidDaysCount += 1;

        return {
          date: dateStr,
          day_name: new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
          sessions_count: parseInt(s.sessions_count || 0, 10),
          total_duration_seconds: totalSec,
          formatted_total_duration: formatDuration(totalSec),
          video_duration_seconds: videoSec,
          formatted_video_duration: formatDuration(videoSec),
          audio_duration_seconds: audioSec,
          formatted_audio_duration: formatDuration(audioSec),
          coins_earned: coinsEarned,
          diamonds_earned: diamondsEarned,
          agency_commission: agencyCommission,
          host_net_coins: hostNetCoins,
          is_valid_day: isValidDay,
        };
      });

      const monthlyAgencyCommission = agency ? Math.round(monthlyCoinsEarned * (commissionRate / 100)) : 0;
      const monthlyHostNetCoins = Math.max(0, monthlyCoinsEarned - monthlyAgencyCommission);

      return {
        month: selectedMonth,
        host: {
          id: host.id,
          full_name: host.full_name,
          host_type: hostType,
          is_video_host: hostType === 'video',
          is_audio_host: hostType === 'audio',
        },
        has_agency: !!agency,
        agency,
        monthly_summary: {
          month: selectedMonth,
          total_duration_seconds: monthlyTotalSeconds,
          formatted_total_duration: formatDuration(monthlyTotalSeconds),
          video_duration_seconds: monthlyVideoSeconds,
          formatted_video_duration: formatDuration(monthlyVideoSeconds),
          audio_duration_seconds: monthlyAudioSeconds,
          formatted_audio_duration: formatDuration(monthlyAudioSeconds),
          total_coins_earned: monthlyCoinsEarned,
          total_diamonds_earned: monthlyDiamondsEarned,
          total_agency_commission: monthlyAgencyCommission,
          host_net_coins: monthlyHostNetCoins,
          active_days_count: sortedDates.length,
          valid_days_count: monthlyValidDaysCount,
        },
        daily_breakdown: dailyBreakdown,
      };
    });

    if (!data) {
      return res.status(404).json({ success: false, message: 'Host account not found.' });
    }

    return res.json({
      success: true,
      month: data.month,
      host: data.host,
      has_agency: data.has_agency,
      agency: data.agency,
      monthly_summary: data.monthly_summary,
      daily_breakdown: data.daily_breakdown,
    });
  } catch (err) {
    console.error('getHostMonthlyBreakdown error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch host monthly breakdown.', error: err.message });
  }
}

/**
 * GET /api/mobile/host/streams
 * Paginated history of past live stream sessions for this host.
 * Query params: page=1, limit=20, month=YYYY-MM, live_type=all|video|audio
 * Production Redis Cache-Aside: 'host:streams:{hostId}:{page}:{limit}:{month}:{liveType}' (TTL 60s).
 */
export async function getHostStreamHistory(req, res) {
  try {
    const hostId = resolveHostId(req);
    if (!hostId || isNaN(hostId)) {
      return res.status(400).json({ success: false, message: 'Host ID could not be identified.' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const month = req.query.month || 'all';
    const liveType = req.query.live_type || req.query.type || 'all';

    const cacheKey = `host:streams:${hostId}:${page}:${limit}:${month}:${liveType}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      const whereClauses = ['lr.host_id = ?'];
      const params = [hostId];

      if (month && month !== 'all' && /^\d{4}-\d{2}$/.test(month)) {
        whereClauses.push("DATE_FORMAT(lr.started_at, '%Y-%m') = ?");
        params.push(month);
      }

      if (liveType === 'video' || liveType === 'audio') {
        whereClauses.push('lr.live_type = ?');
        params.push(liveType);
      }

      const whereSql = whereClauses.join(' AND ');

      // Total count
      const [countRow] = await query(`SELECT COUNT(id) AS total FROM live_rooms lr WHERE ${whereSql}`, params);
      const total = countRow?.total || 0;

      // Streams with duration and earned diamonds
      const rows = await query(
        `SELECT 
           lr.id,
           lr.room_id,
           lr.title,
           lr.category,
           lr.live_type,
           lr.status,
           lr.viewer_count,
           lr.total_diamonds,
           lr.started_at,
           lr.ended_at,
           TIMESTAMPDIFF(SECOND, lr.started_at, COALESCE(lr.ended_at, NOW())) AS duration_seconds,
           COALESCE((
             SELECT SUM(coin_amount) 
             FROM gift_transactions 
             WHERE room_id = lr.room_id AND receiver_id = lr.host_id
           ), 0) AS coins_earned
         FROM live_rooms lr
         WHERE ${whereSql}
         ORDER BY lr.started_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const streams = (rows || []).map((r) => {
        const sec = parseInt(r.duration_seconds || 0, 10);
        return {
          id: r.id,
          room_id: r.room_id,
          title: r.title,
          category: r.category,
          live_type: r.live_type,
          status: r.status,
          viewer_count: r.viewer_count,
          total_diamonds: r.total_diamonds,
          coins_earned: parseInt(r.coins_earned || 0, 10),
          duration_seconds: sec,
          formatted_duration: formatDuration(sec),
          started_at: r.started_at,
          ended_at: r.ended_at,
        };
      });

      return {
        streams,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    });

    return res.json({
      success: true,
      streams: data.streams,
      pagination: data.pagination,
    });
  } catch (err) {
    console.error('getHostStreamHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch stream history.', error: err.message });
  }
}

/**
 * GET /api/mobile/host/overview
 * Quick dashboard combining today's metrics, this month's progress, and agency info.
 * Production Redis Cache-Aside: 'host:overview:{hostId}' (TTL 60s).
 */
export async function getHostDashboardOverview(req, res) {
  try {
    const hostId = resolveHostId(req);
    if (!hostId || isNaN(hostId)) {
      return res.status(400).json({ success: false, message: 'Host ID could not be identified.' });
    }

    const cacheKey = `host:overview:${hostId}`;

    const data = await cache.getOrSet(cacheKey, 60, async () => {
      // 1. Fetch host profile
      const [host] = await query(
        `SELECT id, full_name, avatar_url, host_type, agency_id, agency_joined_at, coins, diamonds, level 
         FROM users 
         WHERE id = ?`,
        [hostId]
      );

      if (!host) {
        return null;
      }

      const hostType = host.host_type || 'video';

      // 2. Fetch agency info
      let agency = null;
      let commissionRate = 10.0;

      if (host.agency_id) {
        const [agencyRow] = await query(
          'SELECT id, agency_code, name, commission_rate FROM agencies WHERE id = ?',
          [host.agency_id]
        );
        if (agencyRow) {
          agency = {
            id: agencyRow.id,
            agency_code: agencyRow.agency_code,
            name: agencyRow.name,
            commission_rate: parseFloat(agencyRow.commission_rate || 10),
          };
          commissionRate = agency.commission_rate;
        }
      }

      // 3. Today's streaming duration
      const [todayStream] = await query(
        `SELECT 
           COALESCE(SUM(TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW()))), 0) AS total_seconds,
           COALESCE(SUM(CASE WHEN live_type = 'video' THEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) ELSE 0 END), 0) AS video_seconds,
           COALESCE(SUM(CASE WHEN live_type = 'audio' THEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) ELSE 0 END), 0) AS audio_seconds,
           COUNT(id) AS stream_count
         FROM live_rooms
         WHERE host_id = ? AND DATE(started_at) = CURDATE()`,
        [hostId]
      );

      // 4. Today's coins & gifts
      const [todayGifts] = await query(
        `SELECT 
           COALESCE(SUM(coin_amount), 0) AS coins_earned,
           COALESCE(SUM(diamond_amount), 0) AS diamonds_earned
         FROM gift_transactions
         WHERE receiver_id = ? AND DATE(created_at) = CURDATE()`,
        [hostId]
      );

      const todayTotalSec = parseInt(todayStream?.total_seconds || 0, 10);
      const todayVideoSec = parseInt(todayStream?.video_seconds || 0, 10);
      const todayAudioSec = parseInt(todayStream?.audio_seconds || 0, 10);
      const todayCoins = parseInt(todayGifts?.coins_earned || 0, 10);
      const todayDiamonds = parseInt(todayGifts?.diamonds_earned || 0, 10);
      const todayAgencyCommission = agency ? Math.round(todayCoins * (commissionRate / 100)) : 0;

      // 5. This Month's streaming duration & coins
      const [monthStream] = await query(
        `SELECT 
           COALESCE(SUM(TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW()))), 0) AS total_seconds,
           COALESCE(SUM(CASE WHEN live_type = 'video' THEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) ELSE 0 END), 0) AS video_seconds,
           COALESCE(SUM(CASE WHEN live_type = 'audio' THEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) ELSE 0 END), 0) AS audio_seconds,
           COUNT(DISTINCT DATE(started_at)) AS active_days
         FROM live_rooms
         WHERE host_id = ? AND started_at >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00')`,
        [hostId]
      );

      const [monthGifts] = await query(
        `SELECT 
           COALESCE(SUM(coin_amount), 0) AS coins_earned,
           COALESCE(SUM(diamond_amount), 0) AS diamonds_earned
         FROM gift_transactions
         WHERE receiver_id = ? AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00')`,
        [hostId]
      );

      const monthTotalSec = parseInt(monthStream?.total_seconds || 0, 10);
      const monthVideoSec = parseInt(monthStream?.video_seconds || 0, 10);
      const monthAudioSec = parseInt(monthStream?.audio_seconds || 0, 10);
      const monthCoins = parseInt(monthGifts?.coins_earned || 0, 10);
      const monthDiamonds = parseInt(monthGifts?.diamonds_earned || 0, 10);
      const monthAgencyCommission = agency ? Math.round(monthCoins * (commissionRate / 100)) : 0;

      return {
        host: {
          id: host.id,
          full_name: host.full_name,
          avatar_url: host.avatar_url,
          host_type: hostType,
          is_video_host: hostType === 'video',
          is_audio_host: hostType === 'audio',
          level: host.level || 1,
          coins: host.coins,
          diamonds: host.diamonds,
        },
        has_agency: !!agency,
        agency,
        today: {
          total_duration_seconds: todayTotalSec,
          formatted_total_duration: formatDuration(todayTotalSec),
          video_duration_seconds: todayVideoSec,
          formatted_video_duration: formatDuration(todayVideoSec),
          audio_duration_seconds: todayAudioSec,
          formatted_audio_duration: formatDuration(todayAudioSec),
          coins_earned: todayCoins,
          diamonds_earned: todayDiamonds,
          agency_commission: todayAgencyCommission,
          sessions_count: parseInt(todayStream?.stream_count || 0, 10),
        },
        this_month: {
          total_duration_seconds: monthTotalSec,
          formatted_total_duration: formatDuration(monthTotalSec),
          video_duration_seconds: monthVideoSec,
          formatted_video_duration: formatDuration(monthVideoSec),
          audio_duration_seconds: monthAudioSec,
          formatted_audio_duration: formatDuration(monthAudioSec),
          coins_earned: monthCoins,
          diamonds_earned: monthDiamonds,
          agency_commission: monthAgencyCommission,
          active_days: parseInt(monthStream?.active_days || 0, 10),
        },
      };
    });

    if (!data) {
      return res.status(404).json({ success: false, message: 'Host account not found.' });
    }

    return res.json({
      success: true,
      host: data.host,
      has_agency: data.has_agency,
      agency: data.agency,
      today: data.today,
      this_month: data.this_month,
    });
  } catch (err) {
    console.error('getHostDashboardOverview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch host overview.', error: err.message });
  }
}
