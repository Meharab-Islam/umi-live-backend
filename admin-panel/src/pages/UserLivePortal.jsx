import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Radio,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Users,
  Send,
  Sparkles,
  Crown,
  PhoneCall,
  PhoneIncoming,
  Check,
  X,
  ArrowRight,
  LogOut,
  Plus,
  RefreshCw,
  MessageSquare,
  Shield,
  Sliders,
  Maximize2,
  Minimize2,
  ChevronRight,
  UserCheck,
  UserPlus,
  Flame,
  Heart,
  Smile,
  Gift,
  HelpCircle,
  Copy,
  CheckCheck,
  Key,
  Globe,
  ExternalLink,
  Hand,
  PhoneOff,
  Monitor,
  Info,
  LayoutGrid,
  Pin,
  PinOff,
  MoreVertical,
} from 'lucide-react';
import { request, API_BASE, getCurrentUser } from '../api/client';
import liveApi from '../api/liveApi';
import GoogleMeetLiveStage from '../components/GoogleMeetLiveStage';
import UserLiveAuth from '../components/UserLiveAuth';
import { useLiveKit } from '../hooks/useLiveKit';
import { useBranding } from '../context/BrandingContext';

export default function UserLivePortal({ onToast, onSwitchToAdmin }) {
  const { brandName } = useBranding();
  // Test users with pre-signed JWT tokens
  const [users, setUsers] = useState([]);

  const getInitialUser = () => {
    try {
      const saved = localStorage.getItem('user_portal_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.user && parsed?.token) {
          return {
            ...parsed.user,
            token: parsed.token,
          };
        }
      }
    } catch (e) {}
    return null;
  };

  const [currentUser, setCurrentUser] = useState(getInitialUser);

  // View state: 'rooms_list' | 'live_stage'
  const [activeView, setActiveView] = useState('rooms_list');

  // Rooms list
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [searchRoomQuery, setSearchRoomQuery] = useState('');

  // Create Room Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState(`${brandName} Web Stage 🎉`);
  const [newRoomType, setNewRoomType] = useState('video'); // 'video' | 'audio'
  const [newRoomSeats, setNewRoomSeats] = useState(8);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Active Live Room State
  const [activeRoom, setActiveRoom] = useState(null);
  const [roomSeats, setRoomSeats] = useState([]);
  const [viewerCount, setViewerCount] = useState(1);
  const [roomMessages, setRoomMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Seat Requests (Call Requests)
  const [seatRequests, setSeatRequests] = useState([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [myPendingRequestId, setMyPendingRequestId] = useState(null);
  const [requestingSeat, setRequestingSeat] = useState(false);

  // LiveKit WebRTC Video/Audio Streaming
  const [liveKitData, setLiveKitData] = useState(null);
  const [fetchingLiveKitToken, setFetchingLiveKitToken] = useState(false);
  const [showLiveKitModal, setShowLiveKitModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Web Camera Video Live Preview
  const [localStream, setLocalStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const localVideoRef = useRef(null);
  const mainVideoRef = useRef(null);

  // LiveKit WebRTC Cloud Real-time Connection & Tracks Manager
  const {
    room: lkRoom,
    isConnected: lkConnected,
    remoteStreams,
    connectionError: lkError,
  } = useLiveKit({
    liveKitData,
    localStream,
    cameraActive,
    micActive,
    enabled: activeView === 'live_stage' && Boolean(activeRoom),
  });

  // Google Meet UI States
  const [meetLayout, setMeetLayout] = useState('grid'); // 'grid' | 'spotlight'
  const [activeRightDrawer, setActiveRightDrawer] = useState('chat'); // 'chat' | 'people' | 'info' | null
  const [pinnedUserId, setPinnedUserId] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [meetTime, setMeetTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setMeetTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          setLocalStream(screenStream);
          setIsScreenSharing(true);
          setCameraActive(true);
          if (mainVideoRef.current) mainVideoRef.current.srcObject = screenStream;
          screenStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            stopCamera();
          };
          onToast?.('Screen sharing started! 🖥️', 'success');
        } catch (e) {
          onToast?.('Screen share cancelled or not allowed.', 'info');
        }
      } else {
        onToast?.('Screen sharing requires HTTPS or localhost.', 'info');
      }
    } else {
      stopCamera();
      setIsScreenSharing(false);
    }
  };

  // Socket Connection for Live Room
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const chatEndRef = useRef(null);
  const socketBaseUrl = API_BASE.replace(/\/api\/?$/, '');

  const createVirtualStream = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let timerId = null;

    const draw = () => {
      frame++;
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#312e81');
      grad.addColorStop(1, '#090d16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      // Glowing circle animation
      ctx.strokeStyle = `rgba(124, 58, 237, ${(Math.sin(frame * 0.05) + 1) / 2})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(320, 210, 80 + Math.sin(frame * 0.08) * 15, 0, Math.PI * 2);
      ctx.stroke();

      // Avatar circle
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(320, 210, 60, 0, Math.PI * 2);
      ctx.fill();

      // Broadcaster Icon or Letter
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(currentUser?.full_name?.charAt(0) || '📹', 320, 210);

      // Audio Equalizer simulation
      const barCount = 18;
      const startX = 180;
      for (let i = 0; i < barCount; i++) {
        const height = Math.abs(Math.sin((frame + i * 5) * 0.1)) * 36 + 8;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(startX + i * 16, 330 - height, 10, height);
      }

      // Title & Live Tag
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(24, 24, 76, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('● LIVE', 62, 37);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentUser?.full_name || 'Broadcaster Stream', 320, 380);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '12px monospace';
      ctx.fillText(`LiveKit WebRTC • ${new Date().toLocaleTimeString()}`, 320, 410);
    };

    // Draw first frame immediately so canvas has pixel data
    draw();
    timerId = setInterval(draw, 1000 / 30);

    const stream = canvas.captureStream ? canvas.captureStream(30) : null;
    if (stream) {
      stream.cleanupVirtual = () => {
        if (timerId) clearInterval(timerId);
      };
    }
    return stream;
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      let stream = null;

      // Check if current context is localhost/secure
      const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.isSecureContext === true
      );

      // If on non-localhost HTTP (e.g. 192.168.x.x), browser disables mediaDevices completely
      if (!isLocalhost && (!navigator?.mediaDevices || !navigator?.mediaDevices?.getUserMedia)) {
        const curPort = window.location.port || '3000';
        const warning = `Browsers block physical webcam on plain IP (http://${window.location.host}). To use your PC camera, please open the Admin Panel at: http://localhost:${curPort}`;
        console.warn(warning);
        setCameraError(warning);
        onToast?.(warning, 'error');
        const fallback = createVirtualStream();
        if (fallback) {
          setLocalStream(fallback);
          setCameraActive(true);
        }
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // Attempt 1: Video + Audio
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: micActive,
          });
          onToast?.('PC Hardware Webcam activated! 📹', 'success');
        } catch (firstErr) {
          console.warn('Attempt 1 (video+audio) failed, trying video only:', firstErr);
          try {
            // Attempt 2: Basic Video only (avoids microphone permission / hardware lock issues)
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            onToast?.('PC Hardware Webcam activated (video only)! 📹', 'success');
          } catch (secondErr) {
            console.error('All webcam getUserMedia attempts failed:', secondErr);
            let userMsg = 'Could not access PC camera.';
            if (secondErr.name === 'NotAllowedError' || secondErr.name === 'PermissionDeniedError') {
              userMsg = 'Camera permission blocked! Please click the lock/tune icon in the browser address bar -> Allow Camera. Also check Mac  > System Settings > Privacy & Security > Camera.';
            } else if (secondErr.name === 'NotReadableError' || secondErr.name === 'TrackStartError') {
              userMsg = 'Camera is currently in use by another application (Zoom, FaceTime, Photo Booth, or another browser tab). Please close other apps and try again!';
            } else if (secondErr.name === 'NotFoundError' || secondErr.name === 'DevicesNotFoundError') {
              userMsg = 'No physical webcam detected on this PC. Please connect a camera.';
            } else {
              userMsg = secondErr.message || 'Camera error: ' + secondErr.name;
            }
            setCameraError(userMsg);
            onToast?.(userMsg, 'error');

            // Fallback to virtual broadcaster stream
            const fallback = createVirtualStream();
            if (fallback) {
              setLocalStream(fallback);
              setCameraActive(true);
            }
            return;
          }
        }
      } else {
        const warning = 'navigator.mediaDevices is unavailable in this environment.';
        setCameraError(warning);
        onToast?.(warning, 'error');
        const fallback = createVirtualStream();
        if (fallback) {
          setLocalStream(fallback);
          setCameraActive(true);
        }
        return;
      }

      if (stream) {
        setLocalStream(stream);
        setCameraActive(true);
      }
    } catch (err) {
      console.warn('General camera error:', err);
      const fallback = createVirtualStream();
      if (fallback) {
        setLocalStream(fallback);
        setCameraActive(true);
      }
    }
  };

  const stopCamera = () => {
    if (localStream) {
      if (localStream.cleanupVirtual) {
        localStream.cleanupVirtual();
      }
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setCameraActive(false);
    onToast?.('Camera preview turned off.', 'info');
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = !micActive));
    }
    setMicActive(!micActive);
  };

  useEffect(() => {
    if (localStream) {
      if (mainVideoRef.current) mainVideoRef.current.srcObject = localStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, cameraActive]);

  const fetchLiveKitToken = async (roomId) => {
    if (!roomId || !currentUser?.token) return;
    setFetchingLiveKitToken(true);
    try {
      const res = await liveApi.getLiveKitToken(roomId, currentUser.token);
      if (res.success) {
        setLiveKitData(res);
      }
    } catch (err) {
      console.error('fetchLiveKitToken error:', err);
    } finally {
      setFetchingLiveKitToken(false);
    }
  };

  // Auto-fetch LiveKit token whenever user enters an active live room
  useEffect(() => {
    if (activeRoom?.room_id && currentUser?.token) {
      if (!liveKitData || String(liveKitData.roomId) !== String(activeRoom.room_id)) {
        fetchLiveKitToken(activeRoom.room_id);
      }
    }
  }, [activeRoom?.room_id, currentUser?.token]);

  // 1. Fetch available test users & pre-signed tokens
  const fetchUsers = async () => {
    try {
      const res = await request('/admin/chat-tester/users');
      if (res.success && res.users?.length > 0) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error('fetchUsers error:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. Fetch Active Live Rooms
  const fetchRooms = async () => {
    if (!currentUser?.token) return;
    setLoadingRooms(true);
    try {
      const res = await liveApi.getRooms(currentUser.token);
      if (res.success && res.rooms) {
        setRooms(res.rooms);
      }
    } catch (err) {
      console.error('fetchRooms error:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (currentUser?.token && activeView === 'rooms_list') {
      fetchRooms();
    }
  }, [currentUser?.token, activeView]);

  // 3. Socket.IO Connection for Active Room
  useEffect(() => {
    if (!activeRoom || !currentUser?.token) return;

    const s = io(socketBaseUrl, {
      auth: { token: currentUser.token, userId: currentUser.id },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    s.on('connect', () => {
      setSocketConnected(true);
      // Join Room
      s.emit('join-room', {
        roomId: activeRoom.room_id,
        user: {
          id: currentUser.id,
          full_name: currentUser.full_name,
          avatar_url: currentUser.avatar_url,
          role: currentUser.role,
          level: currentUser.level || 1,
        },
      });
    });

    s.on('disconnect', () => setSocketConnected(false));

    // Viewer Count update
    s.on('viewer-count-update', ({ count }) => {
      setViewerCount(count);
    });

    // User Joined announcement
    s.on('user-joined', ({ user }) => {
      if (user && user.id !== currentUser.id) {
        addSystemMessage(`${user.full_name || 'A user'} joined the live stage 👋`);
      }
    });

    // Real-Time Room Chat message
    s.on('new-chat', (payload) => {
      setRoomMessages((prev) => [...prev, payload]);
    });

    s.on('room_message', (payload) => {
      setRoomMessages((prev) => [...prev, payload]);
    });

    // Real-Time Seat Updates (Take, Leave, Move, Promote)
    s.on('seat_updated', (data) => {
      refreshRoomDetails(activeRoom.room_id);
      if (data.action === 'take') {
        addSystemMessage(`User #${data.userId} took Seat #${data.seatNumber} 🎙️`);
      }
    });

    s.on('seat_media_updated', () => {
      refreshRoomDetails(activeRoom.room_id);
    });

    // Call Request (Seat Request) created
    s.on('seat_request_created', (data) => {
      if (isHostOrAdmin) {
        onToast?.(`New call request from ${data.user?.name || 'User'} 📞`, 'info');
      }
      refreshSeatRequests(activeRoom.room_id);
    });

    // Call Request approved
    s.on('seat_request_approved', (data) => {
      if (data.userId === currentUser.id) {
        onToast?.(`Your call request was accepted! You are on Seat #${data.seatNumber} 🎉`, 'success');
        setMyPendingRequestId(null);
      }
      refreshRoomDetails(activeRoom.room_id);
      refreshSeatRequests(activeRoom.room_id);
    });

    // Call Request rejected
    s.on('seat_request_rejected', (data) => {
      if (data.userId === currentUser.id) {
        onToast?.('Your call request was declined by the host.', 'error');
        setMyPendingRequestId(null);
      }
      refreshSeatRequests(activeRoom.room_id);
    });

    // Room Ended
    s.on('room_ended', () => {
      onToast?.('Live broadcast has ended.', 'info');
      leaveLiveStage();
    });

    setSocket(s);

    return () => {
      s.emit('leave-room', { roomId: activeRoom.room_id });
      s.disconnect();
    };
  }, [activeRoom?.room_id, currentUser?.token, currentUser?.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages]);

  const addSystemMessage = (text) => {
    setRoomMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}-${Math.random()}`,
        isSystem: true,
        message: text,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  // Refresh Room Details & Seats from API
  const refreshRoomDetails = async (roomId) => {
    if (!currentUser?.token) return;
    try {
      const res = await liveApi.getRoomDetails(roomId, currentUser.token);
      if (res.success && res.room) {
        setActiveRoom(res.room);
        setRoomSeats(res.room.seats || []);
        setViewerCount(res.room.viewer_count || 1);
      }
      fetchLiveKitToken(roomId);
    } catch (err) {
      console.error('refreshRoomDetails error:', err);
    }
  };

  // Refresh Seat Requests from API
  const refreshSeatRequests = async (roomId) => {
    if (!currentUser?.token) return;
    try {
      const res = await liveApi.getSeatRequests(roomId, currentUser.token);
      if (res.success && res.waiting_list) {
        setSeatRequests(res.waiting_list);
        const myReq = res.waiting_list.find((r) => r.user_id === currentUser.id);
        setMyPendingRequestId(myReq ? myReq.id : null);
      }
    } catch (err) {
      console.error('refreshSeatRequests error:', err);
    }
  };

  // Join Room handler
  const handleJoinRoom = async (room) => {
    if (!currentUser?.token) return;
    try {
      await liveApi.joinRoom(room.room_id, currentUser.token);
      setActiveRoom(room);
      setRoomSeats(room.seats || []);
      setRoomMessages([
        {
          id: 'welcome',
          isSystem: true,
          message: `Welcome to "${room.title || 'Live Stage'}"! 👋`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setActiveView('live_stage');
      refreshRoomDetails(room.room_id);
      refreshSeatRequests(room.room_id);
      fetchLiveKitToken(room.room_id);
    } catch (err) {
      onToast?.(err.message || 'Failed to join room', 'error');
    }
  };

  // Create & Launch Room
  const handleCreateRoom = async () => {
    if (!newRoomTitle.trim() || !currentUser?.token) return;
    setCreatingRoom(true);
    try {
      const res = await liveApi.createRoom(
        {
          title: newRoomTitle.trim(),
          type: newRoomType,
          max_seats: newRoomSeats,
        },
        currentUser.token
      );
      if (res.success && res.room) {
        onToast?.('Live broadcast created successfully! 🚀', 'success');
        setShowCreateModal(false);
        handleJoinRoom(res.room);
      } else {
        onToast?.(res.message || 'Failed to create room', 'error');
      }
    } catch (err) {
      onToast?.(err.message || 'Error creating room', 'error');
    } finally {
      setCreatingRoom(false);
    }
  };

  // Leave Live Stage
  const leaveLiveStage = async () => {
    stopCamera();
    if (activeRoom && currentUser?.token) {
      try {
        await liveApi.leaveRoom(activeRoom.room_id, currentUser.token);
      } catch (e) {}
    }
    setActiveRoom(null);
    setRoomSeats([]);
    setRoomMessages([]);
    setMyPendingRequestId(null);
    setActiveView('rooms_list');
    fetchRooms();
  };

  // ---------------------------------------------------------------------------
  // SEAT OPERATIONS
  // ---------------------------------------------------------------------------

  // Check if current user is Host or Moderator
  const currentUserId = currentUser?.id != null ? String(currentUser.id) : null;
  const isHost = currentUserId != null && (
    String(activeRoom?.host_id) === currentUserId ||
    String(activeRoom?.user_id) === currentUserId
  );
  const isHostOrAdmin = isHost || ['admin', 'superadmin', 'moderator'].includes(currentUser?.role);

  // Find current user's occupied seat number
  const myOccupiedSeat = roomSeats.find((s) => s.user_id != null && String(s.user_id) === currentUserId);
  const mySeatNumber = myOccupiedSeat?.seat_number || (isHost ? 1 : null);
  const isSeated = !!myOccupiedSeat || isHost;

  // Take or Switch Seat
  const handleTakeSeat = async (seatNumber) => {
    if (!activeRoom || !currentUser?.token) return;
    try {
      if (isSeated) {
        // Switch seat
        const res = await liveApi.switchSeat(activeRoom.room_id, seatNumber, mySeatNumber, currentUser.token);
        if (res.success) {
          onToast?.(`Moved to Seat #${seatNumber} 🎙️`, 'success');
          refreshRoomDetails(activeRoom.room_id);
        } else {
          onToast?.(res.message || 'Failed to switch seat', 'error');
        }
      } else {
        // In Video Live: Direct seating is disallowed. Viewers must submit a request and wait for host acceptance.
        const isVideoLive = (activeRoom.live_type || 'video') === 'video';
        if (isVideoLive) {
          if (myPendingRequestId) {
            onToast?.('You already have a pending call request. Waiting for host approval ⏳', 'info');
          } else {
            handleRequestSeat();
          }
          return;
        }

        // Take seat directly in Audio live
        const res = await liveApi.takeSeat(activeRoom.room_id, seatNumber, currentUser.token);
        if (res.success) {
          onToast?.(`You are now on Seat #${seatNumber} 🎙️`, 'success');
          refreshRoomDetails(activeRoom.room_id);
        } else {
          onToast?.(res.message || 'Failed to take seat', 'error');
        }
      }
    } catch (err) {
      onToast?.(err.message || 'Seat action failed', 'error');
    }
  };

  // Leave Seat
  const handleLeaveSeat = async () => {
    if (!activeRoom || !currentUser?.token) return;
    try {
      const res = await liveApi.leaveSeat(activeRoom.room_id, currentUser.token);
      if (res.success) {
        onToast?.('Left the seat. You are now in the audience.', 'info');
        refreshRoomDetails(activeRoom.room_id);
      }
    } catch (err) {
      onToast?.(err.message || 'Failed to leave seat', 'error');
    }
  };

  // Move / Promote to Main Seat (#1)
  const handlePromoteToMainSeat = async (seatNumber) => {
    if (!activeRoom || !currentUser?.token) return;
    try {
      const res = await liveApi.promoteToMainSeat(activeRoom.room_id, seatNumber, currentUser.token);
      if (res.success) {
        onToast?.(`Seat #${seatNumber} promoted to Main Seat! 👑`, 'success');
        refreshRoomDetails(activeRoom.room_id);
      } else {
        onToast?.(res.message || 'Failed to promote to main seat', 'error');
      }
    } catch (err) {
      onToast?.(err.message || 'Error promoting to main seat', 'error');
    }
  };

  // Toggle Mic / Camera
  const handleToggleMedia = async (seatNumber, isCameraOn, isMuted) => {
    if (!activeRoom || !currentUser?.token) return;
    try {
      await liveApi.toggleSeatMedia(activeRoom.room_id, seatNumber, isCameraOn, isMuted, currentUser.token);
      refreshRoomDetails(activeRoom.room_id);
    } catch (err) {
      onToast?.(err.message || 'Media toggle failed', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // CALL REQUEST (SEAT REQUEST) OPERATIONS
  // ---------------------------------------------------------------------------

  // Request Call / Seat
  const handleRequestSeat = async () => {
    if (!activeRoom || !currentUser?.token) return;
    setRequestingSeat(true);
    try {
      const res = await liveApi.requestSeat(activeRoom.room_id, null, currentUser.token);
      if (res.success) {
        onToast?.('Call request sent! Waiting for host approval 📞', 'success');
        setMyPendingRequestId(res.request_id || 1);
        refreshSeatRequests(activeRoom.room_id);
      } else {
        onToast?.(res.message || 'Failed to request seat', 'error');
      }
    } catch (err) {
      onToast?.(err.message || 'Error requesting seat', 'error');
    } finally {
      setRequestingSeat(false);
    }
  };

  // Cancel Request
  const handleCancelRequest = async () => {
    if (!activeRoom || !currentUser?.token || !myPendingRequestId) return;
    try {
      await liveApi.cancelSeatRequest(activeRoom.room_id, myPendingRequestId, currentUser.token);
      onToast?.('Call request cancelled.', 'info');
      setMyPendingRequestId(null);
      refreshSeatRequests(activeRoom.room_id);
    } catch (err) {
      onToast?.(err.message || 'Failed to cancel request', 'error');
    }
  };

  // Approve Call Request (Host / Admin)
  const handleApproveRequest = async (reqId) => {
    if (!activeRoom || !currentUser?.token) return;
    try {
      const res = await liveApi.approveSeatRequest(activeRoom.room_id, reqId, null, currentUser.token);
      if (res.success) {
        onToast?.(`Call request approved! User seated on #${res.seat_number} ✅`, 'success');
        refreshRoomDetails(activeRoom.room_id);
        refreshSeatRequests(activeRoom.room_id);
      } else {
        onToast?.(res.message || 'Failed to approve request', 'error');
      }
    } catch (err) {
      onToast?.(err.message || 'Error approving request', 'error');
    }
  };

  // Reject Call Request (Host / Admin)
  const handleRejectRequest = async (reqId) => {
    if (!activeRoom || !currentUser?.token) return;
    try {
      await liveApi.rejectSeatRequest(activeRoom.room_id, reqId, currentUser.token);
      onToast?.('Call request rejected.', 'info');
      refreshSeatRequests(activeRoom.room_id);
    } catch (err) {
      onToast?.(err.message || 'Error rejecting request', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // LIVE ROOM CHAT & REACTIONS
  // ---------------------------------------------------------------------------

  const handleSendChat = async (textOverride = null) => {
    const text = (textOverride || chatInput).trim();
    if (!text || !activeRoom) return;
    if (!textOverride) setChatInput('');

    // Emit over socket for instant delivery
    if (socket && socketConnected) {
      socket.emit('send-chat', {
        roomId: activeRoom.room_id,
        message: text,
        user: {
          id: currentUser.id,
          full_name: currentUser.full_name,
          avatar_url: currentUser.avatar_url,
          role: currentUser.role,
          level: currentUser.level || 1,
        },
      });
    }

    // Persist to MySQL SSOT via API
    try {
      await liveApi.sendRoomChatMessage(activeRoom.room_id, text, currentUser.token);
    } catch (e) {}
  };

  // Filtered rooms
  const filteredRooms = rooms.filter(
    (r) =>
      r.title?.toLowerCase().includes(searchRoomQuery.toLowerCase()) ||
      r.host_name?.toLowerCase().includes(searchRoomQuery.toLowerCase()) ||
      r.room_id?.toLowerCase().includes(searchRoomQuery.toLowerCase())
  );

  if (!currentUser) {
    return (
      <UserLiveAuth
        onAuthSuccess={(authData) => {
          setCurrentUser(authData.user);
          setActiveView('rooms_list');
        }}
        onToast={onToast}
        onSwitchToAdmin={onSwitchToAdmin}
      />
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-in-out', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ===================================================================== */}
      {/* TOP USER IDENTITY BAR */}
      {/* ===================================================================== */}
      <div
        className="panel-card"
        style={{
          padding: '1rem 1.5rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(2, 132, 199, 0.08) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed 0%, #0284c7 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
            }}
          >
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              currentUser?.full_name?.charAt(0) || 'U'
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                {currentUser?.full_name || 'Umi User'}
              </span>
              <span className="badge badge-primary" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
                {currentUser?.role || 'user'}
              </span>
              <span className="badge" style={{ fontSize: '0.72rem', background: '#eab30822', color: '#eab308', fontWeight: 800 }}>
                ⭐ Level {currentUser?.level || 1}
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Web User • ID: #{currentUser?.id} • {currentUser?.email || 'Logged In'}
            </div>
          </div>
        </div>

        {/* User Stats & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#eab308',
              fontSize: '0.8rem',
              fontWeight: 800,
            }}
          >
            🪙 {currentUser?.coins || 100} Coins
          </div>

          {activeView === 'rooms_list' && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px', padding: '8px 14px' }}
            >
              <Radio size={15} />
              <span>Start Live Broadcast</span>
            </button>
          )}

          {activeView === 'live_stage' && (
            <button
              type="button"
              onClick={leaveLiveStage}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px', color: '#ef4444' }}
            >
              <LogOut size={15} />
              <span>Leave Stage</span>
            </button>
          )}

          {/* Quick Demo Switcher if available */}
          {users.length > 0 && (
            <select
              className="input-field"
              value={currentUser?.id || ''}
              onChange={(e) => {
                const s = users.find((u) => u.id === Number(e.target.value));
                if (s) {
                  const authObj = {
                    ...s,
                    token: s.token,
                  };
                  setCurrentUser(authObj);
                  localStorage.setItem('user_portal_auth', JSON.stringify({ token: s.token, user: authObj }));
                  onToast?.(`Switched identity to ${s.full_name}`, 'info');
                }
              }}
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem', borderRadius: '8px' }}
              title="Fast Switch Test User"
            >
              <option value="">Switch Demo User...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  #{u.id} {u.full_name} ({u.role})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('user_portal_auth');
              setCurrentUser(null);
              onToast?.('Logged out from User Live Portal.', 'info');
            }}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px' }}
            title="Log out and switch account"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>

          {onSwitchToAdmin && (
            <button
              type="button"
              onClick={onSwitchToAdmin}
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px' }}
              title="Back to Admin Console"
            >
              <Shield size={14} />
              <span>Admin Console</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: ACTIVE LIVE ROOMS BROWSER */}
      {/* ===================================================================== */}
      {activeView === 'rooms_list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            className="panel-card"
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search active live streams by title, host or room ID..."
                value={searchRoomQuery}
                onChange={(e) => setSearchRoomQuery(e.target.value)}
                style={{ borderRadius: '10px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge" style={{ fontSize: '0.78rem' }}>
                {filteredRooms.length} Live Streams
              </span>
              <button type="button" onClick={fetchRooms} className="btn btn-secondary btn-sm" title="Refresh Streams">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {loadingRooms ? (
            <div className="panel-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              Loading active live streams...
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="panel-card" style={{ padding: '3.5rem', textAlign: 'center', borderRadius: '16px' }}>
              <Radio size={48} style={{ margin: '0 auto 1rem', opacity: 0.3, color: '#7c3aed' }} />
              <h3 style={{ margin: 0, fontWeight: 800 }}>No Live Streams Active Right Now</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', margin: '8px 0 1.25rem' }}>
                You can launch your own video/audio live broadcast right from your web browser!
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
                style={{ borderRadius: '10px', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Radio size={16} />
                <span>Launch First Live Broadcast</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {filteredRooms.map((room) => {
                const isHostOfThisRoom = room.host_id === currentUser?.id;
                return (
                  <div
                    key={room.room_id}
                    className="panel-card"
                    style={{
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Header Image / Video Placeholder */}
                    <div
                      style={{
                        height: '140px',
                        background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                        }}
                      >
                        <span className="pulsing-dot" style={{ background: '#fff' }} />
                        <span>LIVE</span>
                      </div>

                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Users size={12} />
                        <span>{room.viewer_count || 1} Viewers</span>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            margin: '0 auto 8px',
                            border: '3px solid #7c3aed',
                            overflow: 'hidden',
                            background: '#7c3aed22',
                            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
                          }}
                        >
                          {room.host_avatar ? (
                            <img src={room.host_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
                              {room.host_name?.charAt(0) || 'H'}
                            </div>
                          )}
                        </div>
                        <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 700 }}>
                          {room.host_name || 'Host'}
                        </span>
                      </div>
                    </div>

                    {/* Room Info Body */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {room.title || 'Live Stream'}
                        </h4>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', display: 'flex', gap: '8px' }}>
                          <span>Type: {room.live_type === 'video' ? '📹 Video Stage' : '🎙️ Audio Live'}</span>
                          <span>•</span>
                          <span>{room.seats?.length || room.total_seats || 8} Multi-Seats</span>
                        </div>
                      </div>

                      {/* Seats Preview */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Seats:</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {(room.seats || []).slice(0, 6).map((seat) => (
                            <div
                              key={seat.seat_number}
                              title={`Seat #${seat.seat_number}: ${seat.user_id ? 'Occupied' : 'Free'}`}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: seat.user_id ? '#7c3aed' : 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.65rem',
                                color: seat.user_id ? '#fff' : 'var(--text-dim)',
                                fontWeight: 700,
                              }}
                            >
                              {seat.seat_number}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Join Action Button */}
                      <button
                        type="button"
                        onClick={() => handleJoinRoom(room)}
                        className="btn btn-primary"
                        style={{
                          marginTop: 'auto',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontWeight: 800,
                        }}
                      >
                        <Video size={16} />
                        <span>{isHostOfThisRoom ? 'Enter My Broadcast Stage' : 'Join Live Room Stage'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: INTERACTIVE MULTI-SEAT VIDEO LIVE STAGE */}
      {/* ===================================================================== */}
      {activeView === 'live_stage' && activeRoom && (
        <GoogleMeetLiveStage
          activeRoom={activeRoom}
          currentUser={currentUser}
          roomSeats={roomSeats}
          viewerCount={viewerCount}
          roomMessages={roomMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          handleSendChat={handleSendChat}
          seatRequests={seatRequests}
          myPendingRequestId={myPendingRequestId}
          handleRequestSeat={handleRequestSeat}
          handleCancelRequest={handleCancelRequest}
          handleApproveRequest={handleApproveRequest}
          handleRejectRequest={handleRejectRequest}
          handleTakeSeat={handleTakeSeat}
          handleLeaveSeat={handleLeaveSeat}
          handleToggleMedia={handleToggleMedia}
          handlePromoteToMainSeat={handlePromoteToMainSeat}
          isHostOrAdmin={isHostOrAdmin}
          isSeated={isSeated}
          mySeatNumber={mySeatNumber}
          leaveLiveStage={leaveLiveStage}
          liveKitData={liveKitData}
          setShowLiveKitModal={setShowLiveKitModal}
          cameraActive={cameraActive}
          micActive={micActive}
          toggleCamera={toggleCamera}
          toggleMic={toggleMic}
          localStream={localStream}
          mainVideoRef={mainVideoRef}
          localVideoRef={localVideoRef}
          cameraError={cameraError}
          setCameraError={setCameraError}
          remoteStreams={remoteStreams}
          liveKitConnected={lkConnected}
          onToast={onToast}
        />
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: CREATE LIVE ROOM */}
      {/* ===================================================================== */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Start Live Broadcast</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Broadcast Title</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Saturday Night Chillout"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Broadcast Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setNewRoomType('video')}
                    className={`btn ${newRoomType === 'video' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Video size={16} />
                    <span>Video Stage</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoomType('audio')}
                    className={`btn ${newRoomType === 'audio' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Mic size={16} />
                    <span>Audio Live</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">Multi-Seat Capacity</label>
                <select
                  className="input-field"
                  value={newRoomSeats}
                  onChange={(e) => setNewRoomSeats(Number(e.target.value))}
                >
                  <option value={8}>8 Seats (Standard Stage)</option>
                  <option value={12}>12 Seats (Large Party)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={creatingRoom}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Radio size={16} />
                  <span>{creatingRoom ? 'Starting...' : 'Go Live Now'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: CALL REQUESTS (SEAT REQUESTS) FOR HOST/ADMIN */}
      {/* ===================================================================== */}
      {showRequestsModal && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PhoneIncoming size={18} color="#7c3aed" />
                <h3 style={{ margin: 0, fontWeight: 800 }}>Incoming Call Requests ({seatRequests.length})</h3>
              </div>
              <button type="button" onClick={() => setShowRequestsModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
              {seatRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.86rem' }}>
                  No pending call requests right now.
                </div>
              ) : (
                seatRequests.map((reqItem) => (
                  <div
                    key={reqItem.id}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: '#7c3aed22',
                          color: '#7c3aed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          overflow: 'hidden',
                        }}
                      >
                        {reqItem.profile || reqItem.avatar_url ? (
                          <img src={reqItem.profile || reqItem.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          reqItem.name?.charAt(0) || 'U'
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                          {reqItem.name || `User #${reqItem.user_id}`}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Coins: {reqItem.coin || 0} • Level {reqItem.level || 1}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(reqItem.id)}
                        className="btn btn-sm"
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700,
                        }}
                      >
                        <Check size={14} />
                        <span>Accept</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(reqItem.id)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          color: '#ef4444',
                          borderRadius: '8px',
                          padding: '6px 10px',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* LiveKit WebRTC Credentials & SDK Explorer Modal */}
      {showLiveKitModal && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={20} color="#7c3aed" />
                <h3 style={{ margin: 0, fontWeight: 800 }}>LiveKit Cloud WebRTC Streaming</h3>
              </div>
              <button type="button" onClick={() => setShowLiveKitModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
              {/* Cloud Server Info */}
              <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>LiveKit Cloud Server URL</span>
                  <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem' }}>● Connected Cloud</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                  {liveKitData?.url || 'wss://snlive-y3r75itj.livekit.cloud'}
                </div>
              </div>

              {/* Status and Permissions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Room & Identity</div>
                  <div style={{ fontWeight: 700, marginTop: '4px' }}>
                    #{liveKitData?.roomId || activeRoom?.room_id} • User #{liveKitData?.identity || currentUser?.id}
                  </div>
                </div>
                <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Publishing Permission</div>
                  <div style={{ fontWeight: 700, marginTop: '4px', color: liveKitData?.canPublish ? '#10b981' : '#94a3b8' }}>
                    {liveKitData?.canPublish ? '✅ Broadcaster (Mic/Cam ON)' : '🎧 Audience (Subscriber Only)'}
                  </div>
                </div>
              </div>

              {/* LiveKit JWT Token */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 600 }}>Room LiveKit Access Token</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (liveKitData?.token) {
                        navigator.clipboard.writeText(liveKitData.token);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                        onToast?.('LiveKit token copied to clipboard! 📋', 'success');
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedToken ? '#10b981' : '#7c3aed',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 700,
                    }}
                  >
                    {copiedToken ? <CheckCheck size={14} /> : <Copy size={14} />}
                    <span>{copiedToken ? 'Copied!' : 'Copy Token'}</span>
                  </button>
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#0d1117',
                    border: '1px solid var(--border-color)',
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    color: '#a5d6ff',
                    wordBreak: 'break-all',
                    maxHeight: '80px',
                    overflowY: 'auto',
                  }}
                >
                  {liveKitData?.token || (fetchingLiveKitToken ? 'Generating token...' : 'No token generated yet.')}
                </div>
              </div>

              {/* Flutter Integration Snippet */}
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>
                  Flutter LiveKit Client Implementation
                </div>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#0d1117',
                    border: '1px solid var(--border-color)',
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    color: '#e6edf3',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    whiteSpace: 'pre',
                  }}
                >
{`// 1. In pubspec.yaml: livekit_client: ^2.2.0
final room = Room();
await room.connect(
  '${liveKitData?.url || 'wss://snlive-y3r75itj.livekit.cloud'}',
  token,
  roomOptions: const RoomOptions(
    adaptiveStream: true,
    dynacast: true,
  ),
);

// 2. If Host or Seated user:
if (canPublish) {
  await room.localParticipant?.setCameraEnabled(true);
  await room.localParticipant?.setMicrophoneEnabled(true);
}`}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowLiveKitModal(false)}
                className="btn btn-primary btn-sm"
                style={{ borderRadius: '8px', padding: '8px 18px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
