import express from 'express';
import {
  createRoom,
  getRooms,
  getMyActiveRoom,
  joinRoom,
  leaveRoom,
  endRoom,
  getRoomDetails,
  getRoomUsers,
  takeSeat,
  switchSeat,
  leaveSeat,
  toggleSeatMedia,
  requestSeat,
  getSeatRequests,
  approveSeatRequest,
  rejectSeatRequest,
  cancelSeatRequest,
  getRoomAdmins,
  assignRoomAdmin,
  removeRoomAdmin,
  updateRoomSeatsCount,
  increaseRoomSeats,
  decreaseRoomSeats,
  lockAllEmptySeats,
  kickAllSeatUsers,
  muteAllSeats,
  removeSeatUser,
  kickUserFromRoom,
  promoteToMainSeat,
  getUserLiveHistory,
  lockSeat,
  muteSeat,
  sendRoomChatMessage,
  getRoomChatMessages,
  deleteRoomChatMessage,
  getLiveKitToken,
  updateRoomBackground,
  updateRoomSettings,
  toggleRoomLock,
  getLiveRewardStatus,
  claimLiveReward,
} from '../../controllers/mobile/liveController.js';
import { getLiveKitConfigEndpoint } from '../../controllers/mobile/configController.js';
import { requireAuth, optionalAuth } from '../../middlewares/authMiddleware.js';
import { optionalRoomMediaUpload } from '../../middleware/upload.js';
import { query } from '../../config/db.js';

const router = express.Router();

// Universal Room Identifier Resolver: Automatically maps numeric id (e.g. 30) or string room_id (e.g. room-3d1c07b0)
router.param('roomId', async (req, res, next, rawId) => {
  try {
    if (!rawId) return next();
    const isNum = /^\d+$/.test(String(rawId).trim());
    const rooms = await query(
      'SELECT id, room_id, host_id, status FROM live_rooms WHERE room_id = ? OR id = ? LIMIT 1',
      [String(rawId), isNum ? Number(rawId) : -1]
    );

    if (rooms && rooms.length > 0) {
      const room = rooms[0];
      req.params.roomId = room.room_id;
      req.canonicalRoomId = room.room_id;
      req.liveRoom = room;
    }
    next();
  } catch (err) {
    console.error('router.param roomId error:', err);
    next();
  }
});

// Global User Live Streaming Daily Breakdown & Earnings History (All authenticated users: normal, host, agency, moderator, reseller)
router.get('/history', requireAuth, getUserLiveHistory);
router.get('/my-history', requireAuth, getUserLiveHistory);
router.get('/user-activity', requireAuth, getUserLiveHistory);

// Public / Authenticated Live Rooms Feed (Excludes currently logged-in user's own broadcast if logged in)
router.get('/rooms', optionalAuth, getRooms);

// Authenticated: Get currently active room hosted by the logged-in user
router.get('/rooms/my-active', requireAuth, getMyActiveRoom);

// Public / Authenticated Room Details (with background image, live duration & seat states)
router.get('/rooms/:roomId', optionalAuth, getRoomDetails);

// Live Room Audience / Active Users in Room (Name, ID, VIP Package, Coin, Diamond, Avatar, Seats)
router.get('/rooms/:roomId/users', getRoomUsers);
router.get('/rooms/:roomId/viewers', getRoomUsers);

// Room Admins / Moderators List & Management
router.get('/rooms/:roomId/admins', getRoomAdmins);
router.post('/rooms/:roomId/admins', requireAuth, assignRoomAdmin);
router.delete('/rooms/:roomId/admins/:userId', requireAuth, removeRoomAdmin);

// Kick User from Room (Eject completely from live stream)
router.post('/rooms/:roomId/kick', requireAuth, kickUserFromRoom);
router.post('/rooms/:roomId/kick/:userId', requireAuth, kickUserFromRoom);

// Seat Requests in Video/Audio Live (Request, View Pending, Approve, Reject, Cancel)
router.post('/rooms/:roomId/seats/request', requireAuth, requestSeat);
router.get('/rooms/:roomId/seats/requests', requireAuth, getSeatRequests);
router.post('/rooms/:roomId/seats/requests/:requestId/approve', requireAuth, approveSeatRequest);
router.post('/rooms/:roomId/seats/requests/:requestId/accept', requireAuth, approveSeatRequest);
router.post('/rooms/:roomId/seats/requests/:requestId/reject', requireAuth, rejectSeatRequest);
router.post('/rooms/:roomId/seats/requests/:requestId/cancel', requireAuth, cancelSeatRequest);
router.post('/rooms/:roomId/seats/requests/cancel', requireAuth, cancelSeatRequest);
router.delete('/rooms/:roomId/seats/requests/:requestId', requireAuth, cancelSeatRequest);
router.delete('/rooms/:roomId/seats/request', requireAuth, cancelSeatRequest);

// Dynamic Seat Scaling for Audio Live (Increase / Decrease seats, min 7)
router.patch('/rooms/:roomId/seats/count', requireAuth, updateRoomSeatsCount);
router.post('/rooms/:roomId/seats/update-count', requireAuth, updateRoomSeatsCount);
router.post('/rooms/:roomId/seats/increase', requireAuth, increaseRoomSeats);
router.post('/rooms/:roomId/seats/decrease', requireAuth, decreaseRoomSeats);

// Batch Audio Live Seat Controls (Lock all empty, Kick all seated, Mute all seated)
router.post('/rooms/:roomId/seats/lock-all-empty', requireAuth, lockAllEmptySeats);
router.post('/rooms/:roomId/seats/empty/lock', requireAuth, lockAllEmptySeats);
router.post('/rooms/:roomId/seats/empty/unlock', requireAuth, lockAllEmptySeats);

router.post('/rooms/:roomId/seats/kick-all', requireAuth, kickAllSeatUsers);
router.post('/rooms/:roomId/seats/clear-all', requireAuth, kickAllSeatUsers);
router.post('/rooms/:roomId/seats/eject-all', requireAuth, kickAllSeatUsers);

router.post('/rooms/:roomId/seats/mute-all', requireAuth, muteAllSeats);
router.post('/rooms/:roomId/seats/unmute-all', requireAuth, muteAllSeats);
router.post('/rooms/:roomId/seats/all/mute', requireAuth, muteAllSeats);
router.post('/rooms/:roomId/seats/all/unmute', requireAuth, muteAllSeats);

// Host / Streamer actions (require authentication)
router.post('/rooms', requireAuth, createRoom);
router.post('/rooms/:roomId/join', requireAuth, joinRoom);
router.post('/rooms/:roomId/leave', requireAuth, leaveRoom);
router.post('/rooms/:roomId/end', requireAuth, endRoom);
router.post('/rooms/:roomId/close', requireAuth, endRoom);

// Room Background / Thumbnail Customization (File upload, special_thumbnail ID, or direct URL)
router.put('/rooms/:roomId/background', requireAuth, optionalRoomMediaUpload, updateRoomBackground);
router.post('/rooms/:roomId/background', requireAuth, optionalRoomMediaUpload, updateRoomBackground);
router.patch('/rooms/:roomId/background', requireAuth, optionalRoomMediaUpload, updateRoomBackground);
router.put('/rooms/:roomId/thumbnail', requireAuth, optionalRoomMediaUpload, updateRoomBackground);
router.post('/rooms/:roomId/thumbnail', requireAuth, optionalRoomMediaUpload, updateRoomBackground);
router.patch('/rooms/:roomId/thumbnail', requireAuth, optionalRoomMediaUpload, updateRoomBackground);

// Interactive Multi-Seat Actions (Take, Switch/Move, Leave, Media, Remove/Kick from seat, Promote to Main Seat, Lock/Unlock, Mute)
router.post('/rooms/:roomId/seats/take', requireAuth, takeSeat);
router.post('/rooms/:roomId/seats/switch', requireAuth, switchSeat);
router.post('/rooms/:roomId/seats/move', requireAuth, switchSeat);
router.post('/rooms/:roomId/seats/:seatNumber/switch', requireAuth, switchSeat);
router.post('/rooms/:roomId/seats/:seatNumber/move', requireAuth, switchSeat);
router.post('/rooms/:roomId/seats/leave', requireAuth, leaveSeat);
router.post('/rooms/:roomId/seats/exit', requireAuth, leaveSeat);
router.post('/rooms/:roomId/seats/media', requireAuth, toggleSeatMedia);
router.post('/rooms/:roomId/seats/lock', requireAuth, lockSeat);
router.post('/rooms/:roomId/seats/:seatNumber/lock', requireAuth, lockSeat);
router.post('/rooms/:roomId/seats/:seatNumber/unlock', requireAuth, lockSeat);
router.post('/rooms/:roomId/seats/mute', requireAuth, muteSeat);
router.post('/rooms/:roomId/seats/:seatNumber/mute', requireAuth, muteSeat);
router.post('/rooms/:roomId/seats/:seatNumber/unmute', requireAuth, muteSeat);
router.post('/rooms/:roomId/seats/remove', requireAuth, removeSeatUser);
router.post('/rooms/:roomId/seats/kick', requireAuth, removeSeatUser);
router.post('/rooms/:roomId/seats/:seatNumber/remove', requireAuth, removeSeatUser);
router.post('/rooms/:roomId/seats/:seatNumber/kick', requireAuth, removeSeatUser);
router.post('/rooms/:roomId/seats/user/:userId/kick', requireAuth, removeSeatUser);
router.post('/rooms/:roomId/seats/make-main', requireAuth, promoteToMainSeat);

// Real-Time Live Room Chat Messages (Send, History, Delete)
router.post('/rooms/:roomId/messages', requireAuth, sendRoomChatMessage);
router.post('/rooms/:roomId/chat', requireAuth, sendRoomChatMessage);
router.get('/rooms/:roomId/messages', getRoomChatMessages);
router.get('/rooms/:roomId/chat', getRoomChatMessages);
router.delete('/rooms/:roomId/messages/:messageId', requireAuth, deleteRoomChatMessage);

// LiveKit WebRTC Video & Audio Token Generation
router.get('/livekit-config', getLiveKitConfigEndpoint);
router.get('/rooms/:roomId/livekit-token', requireAuth, getLiveKitToken);
router.post('/rooms/:roomId/livekit-token', requireAuth, getLiveKitToken);
router.get('/rooms/:roomId/token', requireAuth, getLiveKitToken);

// Host Room Settings (Disable/Enable comments & reactions)
router.patch('/rooms/:roomId/settings', requireAuth, updateRoomSettings);
router.put('/rooms/:roomId/settings', requireAuth, updateRoomSettings);

// Host / Admin Room Lock & Password Controls (Lock with password, Unlock)
router.post('/rooms/:roomId/lock', requireAuth, toggleRoomLock);
router.patch('/rooms/:roomId/lock', requireAuth, toggleRoomLock);
router.post('/rooms/:roomId/unlock', requireAuth, toggleRoomLock);
router.patch('/rooms/:roomId/unlock', requireAuth, toggleRoomLock);

// Live Streaming Milestone Duration & Session Reward
router.get('/rooms/:roomId/reward-status', requireAuth, getLiveRewardStatus);
router.post('/rooms/:roomId/claim-reward', requireAuth, claimLiveReward);

export default router;
