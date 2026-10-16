import { request, API_BASE } from './client';

export const liveApi = {
  // Rooms
  getRooms: (userToken, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/mobile/live/rooms${q ? '?' + q : ''}`, {
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  getRoomDetails: (roomId, userToken) => {
    return request(`/mobile/live/rooms/${roomId}`, {
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  createRoom: (data, userToken) => {
    return request('/mobile/live/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  joinRoom: (roomId, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/join`, {
      method: 'POST',
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  leaveRoom: (roomId, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  endRoom: (roomId, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/end`, {
      method: 'POST',
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  // Seats
  takeSeat: (roomId, seatNumber, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/seats/take`, {
      method: 'POST',
      body: JSON.stringify({ seatNumber }),
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  switchSeat: (roomId, newSeatNumber, currentSeatNumber, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/seats/switch`, {
      method: 'POST',
      body: JSON.stringify({ newSeatNumber, currentSeatNumber }),
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  leaveSeat: (roomId, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/seats/leave`, {
      method: 'POST',
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  promoteToMainSeat: (roomId, seatNumber, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/seats/make-main`, {
      method: 'POST',
      body: JSON.stringify({ seatNumber }),
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  toggleSeatMedia: (roomId, seatNumber, isCameraOn, isMuted, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/seats/media`, {
      method: 'POST',
      body: JSON.stringify({ seatNumber, is_camera_on: isCameraOn, is_muted: isMuted }),
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  // Call / Seat Requests
  requestSeat: (roomId, seatNumber, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/seats/request`, {
      method: 'POST',
      body: JSON.stringify({ requested_seat: seatNumber }),
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  getSeatRequests: (roomId, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/seats/requests`, {
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  approveSeatRequest: (roomId, requestId, seatNumber, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/seats/requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ seatNumber }),
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  rejectSeatRequest: (roomId, requestId, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/seats/requests/${requestId}/reject`, {
      method: 'POST',
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  cancelSeatRequest: (roomId, requestId, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/seats/requests/cancel`, {
      method: 'POST',
      body: JSON.stringify({ requestId }),
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  // Live Room Chat
  sendRoomChatMessage: (roomId, message, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, message_type: 'text' }),
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  getRoomChatMessages: (roomId, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/messages`, {
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },

  // LiveKit WebRTC Video/Audio Streaming Token
  getLiveKitToken: (roomId, userToken) => {
    return request(`/mobile/live/rooms/${roomId}/livekit-token`, {
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
    });
  },
};

export default liveApi;
