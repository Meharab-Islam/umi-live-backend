import crypto from 'crypto';
import { query, getPool } from '../../config/db.js';
import { cache } from '../../config/redis.js';
import { generateLiveKitToken, getLiveKitConfig } from '../../config/livekit.js';
import { sendChatPushNotification } from '../../config/firebase.js';

/**
 * Fetch dynamic call settings from Database/Redis
 */
export async function getActiveCallSettings() {
  const cacheKey = 'config:call_rates';
  return await cache.getOrSet(cacheKey, 60, async () => {
    const rows = await query(
      "SELECT key_name, key_value FROM system_settings WHERE key_name IN ('call_audio_rate_per_minute', 'call_video_rate_per_minute', 'call_video_live_rate_per_minute', 'call_min_balance_to_start', 'call_receiver_earnings_percent', 'call_is_enabled')"
    );
    const map = {};
    if (Array.isArray(rows)) {
      for (const r of rows) {
        map[r.key_name] = r.key_value;
      }
    }
    return {
      audio_rate: Math.max(1, parseInt(map.call_audio_rate_per_minute || '20', 10)),
      video_rate: Math.max(1, parseInt(map.call_video_rate_per_minute || '50', 10)),
      video_live_rate: Math.max(1, parseInt(map.call_video_live_rate_per_minute || '30', 10)),
      min_balance: Math.max(1, parseInt(map.call_min_balance_to_start || '20', 10)),
      receiver_share_percent: Math.min(100, Math.max(0, parseInt(map.call_receiver_earnings_percent || '70', 10))),
      is_enabled: map.call_is_enabled !== 'false',
    };
  });
}

/**
 * 1. Get Call Rates & Availability
 * GET /api/mobile/call/rates
 */
export async function getCallRates(req, res) {
  try {
    const settings = await getActiveCallSettings();
    const callerId = req.user?.id;
    let userCoins = 0;
    if (callerId) {
      const userRows = await query('SELECT coins FROM users WHERE id = ? LIMIT 1', [callerId]);
      if (userRows.length > 0) userCoins = userRows[0].coins || 0;
    }

    return res.json({
      success: true,
      rates: {
        audio_rate_per_minute: settings.audio_rate,
        video_rate_per_minute: settings.video_rate,
        video_live_rate_per_minute: settings.video_live_rate,
        min_balance_required: settings.min_balance,
        receiver_share_percent: settings.receiver_share_percent,
        is_enabled: settings.is_enabled,
      },
      user_coins: userCoins,
      can_make_audio_call: settings.is_enabled && userCoins >= settings.audio_rate,
      can_make_video_call: settings.is_enabled && userCoins >= settings.video_rate,
    });
  } catch (err) {
    console.error('getCallRates error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch call rates.' });
  }
}

/**
 * 2. Initiate a 1-to-1 Audio or Video Call
 * POST /api/mobile/call/initiate
 */
export async function initiateCall(req, res) {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const callerId = req.user.id;
    const { receiver_id, receiverId, call_type, callType = 'audio' } = req.body;
    const targetReceiverId = Number(receiver_id || receiverId);
    const finalCallType = (call_type || callType).toLowerCase() === 'video' ? 'video' : 'audio';

    if (!targetReceiverId || isNaN(targetReceiverId)) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Valid receiver ID is required.' });
    }

    if (callerId === targetReceiverId) {
      conn.release();
      return res.status(400).json({ success: false, message: 'You cannot initiate a call with yourself.' });
    }

    const settings = await getActiveCallSettings();
    if (!settings.is_enabled) {
      conn.release();
      return res.status(403).json({ success: false, message: '1-to-1 calling is currently disabled by administrator.' });
    }

    const ratePerMinute = finalCallType === 'video' ? settings.video_rate : settings.audio_rate;

    // Check caller balance
    const [callerRows] = await conn.execute(
      'SELECT id, full_name, avatar_url, coins, is_banned FROM users WHERE id = ? LIMIT 1',
      [callerId]
    );

    if (callerRows.length === 0 || callerRows[0].is_banned) {
      conn.release();
      return res.status(403).json({ success: false, message: 'Your account is suspended or not found.' });
    }

    const caller = callerRows[0];
    if ((caller.coins || 0) < ratePerMinute) {
      conn.release();
      return res.status(402).json({
        success: false,
        insufficient_balance: true,
        message: `Insufficient coins. You need at least ${ratePerMinute} coins for a 1-minute ${finalCallType} call.`,
        required_coins: ratePerMinute,
        current_coins: caller.coins || 0,
      });
    }

    // Check receiver status
    const [receiverRows] = await conn.execute(
      'SELECT id, full_name, avatar_url, is_banned FROM users WHERE id = ? LIMIT 1',
      [targetReceiverId]
    );

    if (receiverRows.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: 'Receiver user not found.' });
    }

    const receiver = receiverRows[0];
    if (receiver.is_banned) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Cannot call this user at this moment.' });
    }

    // Check if receiver is busy in an active/ringing call
    const [busyCheck] = await conn.execute(
      `SELECT id, call_id FROM p2p_calls 
       WHERE (caller_id = ? OR receiver_id = ?) 
         AND status IN ('initiating', 'ringing', 'accepted')
         AND created_at >= NOW() - INTERVAL 90 SECOND
       LIMIT 1`,
      [targetReceiverId, targetReceiverId]
    );

    if (busyCheck.length > 0) {
      conn.release();
      return res.status(409).json({
        success: false,
        is_busy: true,
        message: `${receiver.full_name || 'User'} is currently busy on another call.`,
      });
    }

    // Auto-expire any previous dangling calls initiated by this caller
    await conn.execute(
      "UPDATE p2p_calls SET status = 'failed', end_reason = 'superseded' WHERE caller_id = ? AND status IN ('initiating', 'ringing')",
      [callerId]
    );

    const callId = `call_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const livekitRoomId = `p2p_${callId}`;

    // Insert call session into DB
    await conn.execute(
      `INSERT INTO p2p_calls (call_id, caller_id, receiver_id, call_type, status, rate_per_minute, receiver_share_percent, created_at)
       VALUES (?, ?, ?, ?, 'ringing', ?, ?, NOW())`,
      [callId, callerId, targetReceiverId, finalCallType, ratePerMinute, settings.receiver_share_percent]
    );

    conn.release();

    // Generate LiveKit token for caller
    const livekitTokenData = await generateLiveKitToken({
      roomId: livekitRoomId,
      userId: callerId,
      userName: caller.full_name || `User_${callerId}`,
      canPublish: true,
      metadata: { callId, role: 'caller', callType: finalCallType },
    });

    const callPayload = {
      callId,
      call_id: callId,
      livekitRoomId,
      callType: finalCallType,
      call_type: finalCallType,
      ratePerMinute,
      rate_per_minute: ratePerMinute,
      caller: {
        id: caller.id,
        name: caller.full_name || 'Caller',
        avatar: caller.avatar_url || '',
      },
      receiver: {
        id: receiver.id,
        name: receiver.full_name || 'Receiver',
        avatar: receiver.avatar_url || '',
      },
      timestamp: new Date().toISOString(),
    };

    // Emit real-time socket event to receiver
    const io = req.io || req.app.get('io');
    if (io) {
      io.to(`user_${targetReceiverId}`).emit('call:incoming', callPayload);
      io.to(`user_${targetReceiverId}`).emit('call_incoming', callPayload);
    }

    // Send push notification if receiver is in background
    sendChatPushNotification({
      receiverId: targetReceiverId,
      senderName: caller.full_name || 'Umi Live User',
      message: `Incoming ${finalCallType} call...`,
      conversationId: null,
      customData: {
        type: 'incoming_call',
        call_id: callId,
        call_type: finalCallType,
        caller_id: String(callerId),
      },
    }).catch((err) => console.warn('[Call Push] Warning:', err.message));

    return res.status(201).json({
      success: true,
      message: 'Call initiated successfully. Ringing receiver...',
      callId,
      call_id: callId,
      callType: finalCallType,
      call_type: finalCallType,
      ratePerMinute,
      token: livekitTokenData.token,
      livekitUrl: livekitTokenData.url,
      livekitRoomId,
      caller: {
        id: caller.id,
        name: caller.full_name,
        avatar: caller.avatar_url,
      },
      receiver: {
        id: receiver.id,
        name: receiver.full_name,
        avatar: receiver.avatar_url,
      },
    });
  } catch (err) {
    conn.release();
    console.error('initiateCall error:', err);
    return res.status(500).json({ success: false, message: 'Failed to initiate call.', error: err.message });
  }
}

/**
 * 3. Accept Incoming Call
 * POST /api/mobile/call/accept
 */
export async function acceptCall(req, res) {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const receiverId = req.user.id;
    const { call_id, callId } = req.body;
    const targetCallId = call_id || callId;

    if (!targetCallId) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Call ID is required.' });
    }

    await conn.beginTransaction();

    const [callRows] = await conn.execute(
      'SELECT * FROM p2p_calls WHERE call_id = ? FOR UPDATE',
      [targetCallId]
    );

    if (callRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'Call not found.' });
    }

    const call = callRows[0];
    if (call.receiver_id !== receiverId) {
      await conn.rollback();
      conn.release();
      return res.status(403).json({ success: false, message: 'You are not the designated recipient of this call.' });
    }

    if (call.status === 'accepted') {
      await conn.rollback();
      conn.release();
      // Already accepted, re-generate token
      const livekitTokenData = await generateLiveKitToken({
        roomId: `p2p_${call.call_id}`,
        userId: receiverId,
        userName: req.user.full_name || `User_${receiverId}`,
        canPublish: true,
      });
      return res.json({
        success: true,
        message: 'Call already active.',
        callId: call.call_id,
        token: livekitTokenData.token,
        livekitUrl: livekitTokenData.url,
      });
    }

    if (call.status !== 'ringing' && call.status !== 'initiating') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: `Call is no longer available (Status: ${call.status}).` });
    }

    const rate = call.rate_per_minute;
    const sharePercent = call.receiver_share_percent;
    const earnedDiamonds = Math.floor((rate * sharePercent) / 100);

    // 1. Deduct first minute coins from caller
    const [deductRes] = await conn.execute(
      'UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?',
      [rate, call.caller_id, rate]
    );

    if (deductRes.affectedRows === 0) {
      // Caller has insufficient coins now
      await conn.execute(
        "UPDATE p2p_calls SET status = 'failed', end_reason = 'insufficient_balance' WHERE id = ?",
        [call.id]
      );
      await conn.commit();
      conn.release();

      const io = req.io || req.app.get('io');
      if (io) {
        io.to(`user_${call.caller_id}`).emit('call:ended', { callId: call.call_id, reason: 'insufficient_balance' });
        io.to(`user_${receiverId}`).emit('call:ended', { callId: call.call_id, reason: 'insufficient_balance' });
      }

      return res.status(402).json({
        success: false,
        message: 'Caller has insufficient coins to proceed with the call.',
      });
    }

    // 2. Credit receiver diamonds
    if (earnedDiamonds > 0) {
      await conn.execute(
        'UPDATE users SET diamonds = diamonds + ? WHERE id = ?',
        [earnedDiamonds, receiverId]
      );
    }

    // 3. Record wallet transactions
    await conn.execute(
      `INSERT INTO transactions (user_id, type, amount, description, created_at)
       VALUES (?, 'coin_spent', ?, ?, NOW())`,
      [call.caller_id, rate, `1-on-1 ${call.call_type} call with User #${receiverId} (1st min)`]
    );

    if (earnedDiamonds > 0) {
      await conn.execute(
        `INSERT INTO transactions (user_id, type, amount, description, created_at)
         VALUES (?, 'diamond_earned', ?, ?, NOW())`,
        [receiverId, earnedDiamonds, `Earnings from 1-on-1 ${call.call_type} call from User #${call.caller_id} (1st min)`]
      );
    }

    // 4. Update call record
    await conn.execute(
      `UPDATE p2p_calls 
       SET status = 'accepted', started_at = NOW(), billed_minutes = 1, total_coins_spent = ?, receiver_earned_diamonds = ?
       WHERE id = ?`,
      [rate, earnedDiamonds, call.id]
    );

    await conn.commit();
    conn.release();

    // Invalidate Redis caches
    await Promise.allSettled([
      cache.del(`user:${call.caller_id}`),
      cache.del(`user:${receiverId}`),
      cache.del(`wallet:balance:${call.caller_id}`),
      cache.del(`wallet:balance:${receiverId}`),
    ]);

    // Generate LiveKit token for receiver
    const livekitRoomId = `p2p_${call.call_id}`;
    const livekitTokenData = await generateLiveKitToken({
      roomId: livekitRoomId,
      userId: receiverId,
      userName: req.user.full_name || `User_${receiverId}`,
      canPublish: true,
      metadata: { callId: call.call_id, role: 'receiver', callType: call.call_type },
    });

    // Notify caller that call was accepted
    const io = req.io || req.app.get('io');
    if (io) {
      const acceptedPayload = {
        callId: call.call_id,
        call_id: call.call_id,
        status: 'accepted',
        started_at: new Date().toISOString(),
        livekitRoomId,
      };
      io.to(`user_${call.caller_id}`).emit('call:accepted', acceptedPayload);
      io.to(`user_${call.caller_id}`).emit('call_accepted', acceptedPayload);
    }

    return res.json({
      success: true,
      message: 'Call accepted successfully.',
      callId: call.call_id,
      call_id: call.call_id,
      callType: call.call_type,
      token: livekitTokenData.token,
      livekitUrl: livekitTokenData.url,
      livekitRoomId,
      startedAt: new Date().toISOString(),
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('acceptCall error:', err);
    return res.status(500).json({ success: false, message: 'Failed to accept call.', error: err.message });
  }
}

/**
 * 4. Reject / Cancel Incoming or Ringing Call
 * POST /api/mobile/call/reject
 */
export async function rejectCall(req, res) {
  try {
    const userId = req.user.id;
    const { call_id, callId, reason } = req.body;
    const targetCallId = call_id || callId;

    if (!targetCallId) {
      return res.status(400).json({ success: false, message: 'Call ID is required.' });
    }

    const callRows = await query('SELECT * FROM p2p_calls WHERE call_id = ? LIMIT 1', [targetCallId]);
    if (callRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Call not found.' });
    }

    const call = callRows[0];
    if (call.caller_id !== userId && call.receiver_id !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to reject this call.' });
    }

    const isCaller = call.caller_id === userId;
    const newStatus = isCaller ? 'missed' : 'rejected';
    const endReason = reason || (isCaller ? 'cancelled_by_caller' : 'rejected_by_receiver');

    await query(
      'UPDATE p2p_calls SET status = ?, ended_at = NOW(), end_reason = ? WHERE id = ?',
      [newStatus, endReason, call.id]
    );

    const io = req.io || req.app.get('io');
    if (io) {
      const rejectPayload = {
        callId: call.call_id,
        call_id: call.call_id,
        status: newStatus,
        reason: endReason,
        rejectedBy: userId,
      };
      io.to(`user_${call.caller_id}`).emit('call:rejected', rejectPayload);
      io.to(`user_${call.receiver_id}`).emit('call:rejected', rejectPayload);
      io.to(`user_${call.caller_id}`).emit('call_rejected', rejectPayload);
      io.to(`user_${call.receiver_id}`).emit('call_rejected', rejectPayload);
    }

    return res.json({
      success: true,
      message: isCaller ? 'Call cancelled.' : 'Call rejected.',
      callId: call.call_id,
      status: newStatus,
    });
  } catch (err) {
    console.error('rejectCall error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject call.', error: err.message });
  }
}

/**
 * 5. Call Heartbeat & Per-Minute Coin Billing
 * POST /api/mobile/call/heartbeat
 * (Invoked every 60 seconds while in an active call)
 */
export async function heartbeatCall(req, res) {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const userId = req.user.id;
    const { call_id, callId } = req.body;
    const targetCallId = call_id || callId;

    if (!targetCallId) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Call ID is required.' });
    }

    await conn.beginTransaction();

    const [callRows] = await conn.execute(
      'SELECT * FROM p2p_calls WHERE call_id = ? FOR UPDATE',
      [targetCallId]
    );

    if (callRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'Call not found.' });
    }

    const call = callRows[0];
    if (call.status !== 'accepted') {
      await conn.rollback();
      conn.release();
      return res.json({
        success: false,
        is_ended: true,
        status: call.status,
        message: `Call is no longer active (Status: ${call.status}).`,
      });
    }

    const rate = call.rate_per_minute;
    const earnedDiamonds = Math.floor((rate * call.receiver_share_percent) / 100);

    // Attempt to deduct next minute's coins from caller
    const [deductRes] = await conn.execute(
      'UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?',
      [rate, call.caller_id, rate]
    );

    if (deductRes.affectedRows === 0) {
      // Caller has run out of coins! Terminate call now
      const [durRows] = await conn.execute(
        'SELECT TIMESTAMPDIFF(SECOND, started_at, NOW()) as dur FROM p2p_calls WHERE id = ?',
        [call.id]
      );
      const finalDur = durRows[0]?.dur || (call.billed_minutes * 60);

      await conn.execute(
        `UPDATE p2p_calls 
         SET status = 'ended', ended_at = NOW(), end_reason = 'insufficient_balance', duration_seconds = ?
         WHERE id = ?`,
        [finalDur, call.id]
      );

      await conn.commit();
      conn.release();

      const io = req.io || req.app.get('io');
      if (io) {
        const endPayload = {
          callId: call.call_id,
          reason: 'insufficient_balance',
          duration_seconds: finalDur,
          total_coins_spent: call.total_coins_spent,
        };
        io.to(`user_${call.caller_id}`).emit('call:ended', endPayload);
        io.to(`user_${call.receiver_id}`).emit('call:ended', endPayload);
      }

      return res.json({
        success: false,
        insufficient_balance: true,
        is_ended: true,
        message: 'Caller has insufficient coins. Call terminated.',
      });
    }

    // Credit receiver diamonds
    if (earnedDiamonds > 0) {
      await conn.execute(
        'UPDATE users SET diamonds = diamonds + ? WHERE id = ?',
        [earnedDiamonds, call.receiver_id]
      );
    }

    const nextBilledMinutes = call.billed_minutes + 1;
    const nextTotalCoins = call.total_coins_spent + rate;
    const nextTotalDiamonds = call.receiver_earned_diamonds + earnedDiamonds;

    await conn.execute(
      `UPDATE p2p_calls 
       SET billed_minutes = ?, total_coins_spent = ?, receiver_earned_diamonds = ?
       WHERE id = ?`,
      [nextBilledMinutes, nextTotalCoins, nextTotalDiamonds, call.id]
    );

    // Fetch caller remaining coins
    const [callerAfter] = await conn.execute('SELECT coins FROM users WHERE id = ?', [call.caller_id]);
    const remainingCoins = callerAfter[0]?.coins || 0;

    await conn.commit();
    conn.release();

    // Invalidate Redis caches
    await Promise.allSettled([
      cache.del(`user:${call.caller_id}`),
      cache.del(`user:${call.receiver_id}`),
      cache.del(`wallet:balance:${call.caller_id}`),
      cache.del(`wallet:balance:${call.receiver_id}`),
    ]);

    const io = req.io || req.app.get('io');
    if (io) {
      const billedPayload = {
        callId: call.call_id,
        billed_minutes: nextBilledMinutes,
        total_coins_spent: nextTotalCoins,
        caller_remaining_coins: remainingCoins,
      };
      io.to(`user_${call.caller_id}`).emit('call:minute_billed', billedPayload);
      io.to(`user_${call.receiver_id}`).emit('call:minute_billed', billedPayload);
    }

    return res.json({
      success: true,
      message: 'Minute billed successfully.',
      callId: call.call_id,
      billed_minutes: nextBilledMinutes,
      total_coins_spent: nextTotalCoins,
      caller_remaining_coins: remainingCoins,
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('heartbeatCall error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process call heartbeat.', error: err.message });
  }
}

/**
 * 6. End Call (Hang Up)
 * POST /api/mobile/call/end
 */
export async function endCall(req, res) {
  try {
    const userId = req.user.id;
    const { call_id, callId, reason } = req.body;
    const targetCallId = call_id || callId;

    if (!targetCallId) {
      return res.status(400).json({ success: false, message: 'Call ID is required.' });
    }

    const callRows = await query('SELECT * FROM p2p_calls WHERE call_id = ? LIMIT 1', [targetCallId]);
    if (callRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Call not found.' });
    }

    const call = callRows[0];
    if (call.caller_id !== userId && call.receiver_id !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to end this call.' });
    }

    let durationSeconds = 0;
    if (call.started_at) {
      const durRows = await query(
        'SELECT TIMESTAMPDIFF(SECOND, started_at, NOW()) as dur FROM p2p_calls WHERE id = ?',
        [call.id]
      );
      durationSeconds = Math.max(0, durRows[0]?.dur || 0);
    }

    const finalStatus = call.status === 'accepted' ? 'ended' : (call.caller_id === userId ? 'missed' : 'rejected');
    const finalReason = reason || (call.status === 'accepted' ? 'user_hung_up' : 'call_cancelled');

    await query(
      `UPDATE p2p_calls 
       SET status = ?, ended_at = NOW(), duration_seconds = ?, end_reason = ? 
       WHERE id = ?`,
      [finalStatus, durationSeconds, finalReason, call.id]
    );

    const io = req.io || req.app.get('io');
    if (io) {
      const endPayload = {
        callId: call.call_id,
        call_id: call.call_id,
        status: finalStatus,
        reason: finalReason,
        duration_seconds: durationSeconds,
        total_coins_spent: call.total_coins_spent,
        ended_by: userId,
      };
      io.to(`user_${call.caller_id}`).emit('call:ended', endPayload);
      io.to(`user_${call.receiver_id}`).emit('call:ended', endPayload);
      io.to(`user_${call.caller_id}`).emit('call_ended', endPayload);
      io.to(`user_${call.receiver_id}`).emit('call_ended', endPayload);
    }

    return res.json({
      success: true,
      message: 'Call ended successfully.',
      callId: call.call_id,
      duration_seconds: durationSeconds,
      total_coins_spent: call.total_coins_spent,
      receiver_earned_diamonds: call.receiver_earned_diamonds,
    });
  } catch (err) {
    console.error('endCall error:', err);
    return res.status(500).json({ success: false, message: 'Failed to end call.', error: err.message });
  }
}

/**
 * 7. Get User Call History
 * GET /api/mobile/call/history
 */
export async function getCallHistory(req, res) {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const rows = await query(
      `SELECT c.id, c.call_id, c.caller_id, c.receiver_id, c.call_type, c.status,
              c.rate_per_minute, c.duration_seconds, c.billed_minutes, c.total_coins_spent,
              c.receiver_earned_diamonds, c.end_reason, c.started_at, c.ended_at, c.created_at,
              u1.full_name as caller_name, u1.avatar_url as caller_avatar,
              u2.full_name as receiver_name, u2.avatar_url as receiver_avatar
       FROM p2p_calls c
       LEFT JOIN users u1 ON c.caller_id = u1.id
       LEFT JOIN users u2 ON c.receiver_id = u2.id
       WHERE c.caller_id = ? OR c.receiver_id = ?
       ORDER BY c.id DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, limit, offset]
    );

    const formatted = rows.map((r) => ({
      id: r.id,
      call_id: r.call_id,
      is_incoming: r.receiver_id === userId,
      call_type: r.call_type,
      status: r.status,
      duration_seconds: r.duration_seconds,
      duration_formatted: `${Math.floor(r.duration_seconds / 60).toString().padStart(2, '0')}:${(r.duration_seconds % 60).toString().padStart(2, '0')}`,
      total_coins_spent: r.caller_id === userId ? r.total_coins_spent : 0,
      diamonds_earned: r.receiver_id === userId ? r.receiver_earned_diamonds : 0,
      peer: r.caller_id === userId ? {
        id: r.receiver_id,
        name: r.receiver_name || 'User',
        avatar: r.receiver_avatar || '',
      } : {
        id: r.caller_id,
        name: r.caller_name || 'User',
        avatar: r.caller_avatar || '',
      },
      created_at: r.created_at,
    }));

    return res.json({
      success: true,
      page,
      limit,
      calls: formatted,
    });
  } catch (err) {
    console.error('getCallHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch call history.', error: err.message });
  }
}
