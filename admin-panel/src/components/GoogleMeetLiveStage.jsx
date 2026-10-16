import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  PhoneOff,
  Monitor,
  Info,
  Users,
  MessageSquare,
  LayoutGrid,
  Pin,
  Plus,
  Send,
  Crown,
  X,
  Radio,
  Sparkles,
  Maximize2,
  Minimize2,
  AlertCircle,
} from 'lucide-react';

// Resilient Video Stream Player with dual-binding (callback ref + useEffect)
function VideoStreamPlayer({ stream, isMuted = true, style = {}, className = '', mirrored = true }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    const p = el.play();
    if (p !== undefined) {
      p.catch(() => {});
    }
  }, [stream]);

  const bindVideo = (el) => {
    videoRef.current = el;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      const p = el.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    }
  };

  return (
    <video
      ref={bindVideo}
      autoPlay
      playsInline
      muted={isMuted}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: mirrored ? 'scaleX(-1)' : 'none',
        display: 'block',
        ...style,
      }}
      className={className}
    />
  );
}

export default function GoogleMeetLiveStage({
  activeRoom,
  currentUser,
  roomSeats = [],
  viewerCount = 1,
  roomMessages = [],
  chatInput = '',
  setChatInput,
  handleSendChat,
  seatRequests = [],
  myPendingRequestId = null,
  handleRequestSeat,
  handleCancelRequest,
  handleApproveRequest,
  handleRejectRequest,
  handleTakeSeat,
  handleLeaveSeat,
  handleToggleMedia,
  handlePromoteToMainSeat,
  isHostOrAdmin = false,
  isSeated = false,
  mySeatNumber = null,
  leaveLiveStage,
  liveKitData = null,
  setShowLiveKitModal,
  cameraActive = false,
  micActive = true,
  toggleCamera,
  toggleMic,
  localStream = null,
  mainVideoRef,
  localVideoRef,
  cameraError = null,
  setCameraError,
  remoteStreams = {},
  liveKitConnected = false,
  onToast,
}) {
  const [meetLayout, setMeetLayout] = useState('grid'); // 'grid' | 'spotlight'
  const [activeRightDrawer, setActiveRightDrawer] = useState('chat'); // 'chat' | 'people' | 'info' | null
  const [pinnedUserId, setPinnedUserId] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [selfViewMinimized, setSelfViewMinimized] = useState(false);
  const [meetTime, setMeetTime] = useState('');

  const chatEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages]);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      setMeetTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Screen share handler
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          setIsScreenSharing(true);
          if (mainVideoRef?.current) mainVideoRef.current.srcObject = stream;
          stream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            if (localStream && mainVideoRef?.current) mainVideoRef.current.srcObject = localStream;
          };
          onToast?.('Screen sharing started! 🖥️', 'success');
        } catch (e) {
          onToast?.('Screen share cancelled or not allowed.', 'info');
        }
      } else {
        onToast?.('Screen sharing requires HTTPS or localhost.', 'info');
      }
    } else {
      setIsScreenSharing(false);
      if (localStream && mainVideoRef?.current) mainVideoRef.current.srcObject = localStream;
      onToast?.('Screen sharing stopped.', 'info');
    }
  };

  // Current user & Host identifiers with string-tolerance and nested/flat fallback
  const currentUserId = currentUser?.id != null ? String(currentUser.id) : null;
  const hostId = activeRoom?.host_id ?? activeRoom?.host?.id ?? activeRoom?.user_id ?? null;
  const hostName = activeRoom?.host_name ?? activeRoom?.host?.name ?? 'Host';
  const hostAvatar = activeRoom?.host_avatar ?? activeRoom?.host?.profile ?? activeRoom?.host?.avatar ?? null;

  const isHost = currentUserId != null && hostId != null && String(hostId) === currentUserId;

  const getSeatUserId = (seat) => {
    if (!seat) return null;
    const uid = seat.user_id ?? seat.user?.id;
    if (uid != null) return String(uid);
    if (seat.seat_number === 1 && hostId != null) return String(hostId);
    return null;
  };

  const getSeatUserName = (seat) => {
    if (!seat) return '';
    return seat.user_name ?? seat.user?.name ?? (seat.seat_number === 1 ? hostName : `Seat #${seat.seat_number}`);
  };

  const getSeatUserAvatar = (seat) => {
    if (!seat) return null;
    return seat.user_avatar ?? seat.user?.profile ?? seat.user?.avatar ?? (seat.seat_number === 1 ? hostAvatar : null);
  };

  const isSeatOccupied = (seat) => {
    if (!seat) return false;
    if (seat.is_occupied != null) return Boolean(seat.is_occupied);
    if (getSeatUserId(seat) != null) return true;
    if (seat.seat_number === 1 && hostId != null) return true;
    return false;
  };

  const isSeatOwner = (seat) => {
    if (!seat || currentUserId == null) return false;
    const uid = getSeatUserId(seat);
    if (uid != null && String(uid) === currentUserId) return true;
    if (seat.seat_number === 1 && isHost) return true;
    return false;
  };

  // Resolve active video stream for any seat (local camera stream or remote participant WebRTC stream)
  const getSeatStream = (seat) => {
    if (!seat) return null;
    if (isSeatOwner(seat)) {
      return cameraActive && localStream ? localStream : null;
    }
    const uid = getSeatUserId(seat);
    if (!uid) return null;
    return remoteStreams?.[uid] || remoteStreams?.[Number(uid)] || null;
  };

  // Build seats list
  const rawMainSeat = roomSeats.find((s) => s.seat_number === 1);
  const mainSeat = rawMainSeat ? {
    ...rawMainSeat,
    seat_number: 1,
    user_id: getSeatUserId(rawMainSeat),
    user_name: getSeatUserName(rawMainSeat),
    user_avatar: getSeatUserAvatar(rawMainSeat),
    is_main_seat: 1,
    is_occupied: true,
  } : {
    seat_number: 1,
    user_id: hostId,
    user_name: hostName,
    user_avatar: hostAvatar,
    is_main_seat: 1,
    is_occupied: true,
    is_camera_on: 1,
    is_muted: 0,
  };

  const otherSeats = roomSeats.filter((s) => s.seat_number > 1);
  const allDisplaySeats = [mainSeat, ...otherSeats];

  // Spotlight participant
  const spotlightSeat = pinnedUserId
    ? allDisplaySeats.find((s) => getSeatUserId(s) === String(pinnedUserId)) || mainSeat
    : mainSeat;

  const isMeOnMain = isSeatOwner(mainSeat);
  const isUserSeatedInGrid = allDisplaySeats.some((s) => isSeatOwner(s));

  return (
    <div
      style={{
        background: '#202124',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        minHeight: '680px',
        color: '#e8eaed',
        boxShadow: '0 20px 48px rgba(0,0,0,0.6)',
        border: '1px solid #3c4043',
        position: 'relative',
        fontFamily: "'Google Sans', Roboto, -apple-system, sans-serif",
      }}
    >
      {/* 1. GOOGLE MEET TOP HEADER */}
      <div
        style={{
          height: '56px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#202124',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ea4335',
              color: '#fff',
              padding: '3px 9px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
            }}
          >
            <span className="pulsing-dot" style={{ background: '#fff' }} />
            <span>LIVE</span>
          </div>

          <div>
            <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f1f3f4' }}>
              {activeRoom?.title || 'Live Video Broadcast'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#9aa0a6', marginLeft: '10px' }}>
              umi-meet-{activeRoom?.room_id}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Layout Switcher */}
          <button
            type="button"
            onClick={() => setMeetLayout(meetLayout === 'grid' ? 'spotlight' : 'grid')}
            title={`Switch to ${meetLayout === 'grid' ? 'Spotlight' : 'Grid'} layout`}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#e8eaed',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LayoutGrid size={14} color="#8ab4f8" />
            <span>{meetLayout === 'grid' ? 'Grid View' : 'Spotlight View'}</span>
          </button>

          {/* LiveKit Cloud Badge */}
          <button
            type="button"
            onClick={() => setShowLiveKitModal?.(true)}
            title="LiveKit Cloud WebRTC Status & Token Inspector"
            style={{
              background: liveKitConnected
                ? 'rgba(52, 168, 83, 0.18)'
                : liveKitData?.canPublish
                ? 'rgba(52, 168, 83, 0.12)'
                : 'rgba(138, 180, 248, 0.12)',
              border: `1px solid ${liveKitConnected ? '#34a853' : liveKitData?.canPublish ? '#34a853' : '#8ab4f8'}`,
              borderRadius: '8px',
              padding: '5px 12px',
              color: liveKitConnected ? '#34a853' : liveKitData?.canPublish ? '#34a853' : '#8ab4f8',
              fontSize: '0.74rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Radio size={13} />
            <span>
              LiveKit: {liveKitConnected ? '🟢 Live WebRTC' : (liveKitData ? 'Connecting...' : 'Audience 🎧')}
            </span>
          </button>
        </div>
      </div>

      {/* INCOMING CALL REQUESTS FLOATING NOTIFICATION FOR HOST */}
      {isHost && seatRequests.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(90deg, #1e7e34, #28a745)',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            color: '#fff',
            fontSize: '0.84rem',
            fontWeight: 600,
            zIndex: 30,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Hand size={18} color="#fff" />
            <span>
              <strong>{seatRequests[0].name || `User #${seatRequests[0].user_id}`}</strong> requested to join the Video Stage!
              {seatRequests.length > 1 && ` (+${seatRequests.length - 1} more)`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleApproveRequest?.(seatRequests[0].id)}
              style={{
                background: '#fff',
                color: '#155724',
                border: 'none',
                padding: '4px 14px',
                borderRadius: '6px',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.78rem',
              }}
            >
              Accept ✅
            </button>
            <button
              type="button"
              onClick={() => handleRejectRequest?.(seatRequests[0].id)}
              style={{
                background: 'rgba(0,0,0,0.25)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.4)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.78rem',
              }}
            >
              Decline ✕
            </button>
          </div>
        </div>
      )}

      {/* CAMERA DIAGNOSTICS & HELP BANNER */}
      {cameraError && (
        <div
          style={{
            background: 'rgba(234, 67, 53, 0.15)',
            borderBottom: '1px solid #ea4335',
            padding: '9px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '0.82rem',
            color: '#f28b82',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, color: '#ea4335' }} />
            <span>{cameraError}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
              <a
                href={`http://localhost:${window.location.port || '3000'}`}
                style={{
                  background: '#ea4335',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.74rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Switch to http://localhost:{window.location.port || '3000'}
              </a>
            )}
            <button
              type="button"
              onClick={() => setCameraError && setCameraError(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f28b82',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN MEETING STAGE & SLIDING RIGHT DRAWER */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '12px 16px', gap: '12px', position: 'relative' }}>
        {/* Left Column: Video Arena */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            overflowY: 'auto',
            padding: '6px',
            position: 'relative',
            width: '100%',
          }}
        >
          {/* MODE A: SPOTLIGHT VIEW */}
          {meetLayout === 'spotlight' ? (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: '12px' }}>
              {/* Big Spotlight Hero Tile */}
              <div
                style={{
                  flex: 1,
                  background: '#3c4043',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #8ab4f8',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                {/* Video Element or Avatar */}
                {getSeatStream(spotlightSeat) ? (
                  <VideoStreamPlayer
                    stream={getSeatStream(spotlightSeat)}
                    mirrored={isSeatOwner(spotlightSeat)}
                  />
                ) : getSeatUserAvatar(spotlightSeat) ? (
                  <img
                    src={getSeatUserAvatar(spotlightSeat)}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: '#7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem',
                      fontWeight: 800,
                      color: '#fff',
                      boxShadow: '0 8px 24px rgba(124, 58, 237, 0.4)',
                    }}
                  >
                    {getSeatUserName(spotlightSeat)?.charAt(0) || '👑'}
                  </div>
                )}

                {/* Live WebRTC Indicator Badge */}
                {getSeatStream(spotlightSeat) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(16, 185, 129, 0.9)',
                      backdropFilter: 'blur(4px)',
                      color: '#fff',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      zIndex: 4,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fff' }} />
                    LIVE HD
                  </div>
                )}

                {/* Name Pill Bottom-Left */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(6px)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  <Crown size={14} color="#fbbc04" />
                  <span>{getSeatUserName(spotlightSeat)} {isSeatOwner(spotlightSeat) ? '(You)' : ''}</span>
                </div>

                {/* Top-Right Mic Pill */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(0,0,0,0.65)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: spotlightSeat.is_muted ? '#ea4335' : '#34a853',
                  }}
                >
                  {spotlightSeat.is_muted ? <MicOff size={16} /> : <Mic size={16} />}
                </div>
              </div>

              {/* Horizontal Participant Thumbnails Strip */}
              <div style={{ display: 'flex', gap: '10px', height: '110px', overflowX: 'auto', paddingBottom: '4px' }}>
                {allDisplaySeats.map((seat) => (
                  <div
                    key={seat.seat_number}
                    onClick={() => setPinnedUserId(getSeatUserId(seat))}
                    style={{
                      width: '160px',
                      height: '100%',
                      flexShrink: 0,
                      background: '#3c4043',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: pinnedUserId === getSeatUserId(seat) ? '2px solid #8ab4f8' : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {getSeatStream(seat) ? (
                      <VideoStreamPlayer
                        stream={getSeatStream(seat)}
                        mirrored={isSeatOwner(seat)}
                      />
                    ) : getSeatUserAvatar(seat) ? (
                      <img src={getSeatUserAvatar(seat)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>
                        {getSeatUserName(seat)?.charAt(0) || seat.seat_number}
                      </span>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '6px',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        color: '#fff',
                      }}
                    >
                      {getSeatUserName(seat) || `Seat #${seat.seat_number}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* MODE B: GOOGLE MEET RESPONSIVE AUTO-GRID VIEW */
            <div
              style={{
                display: 'grid',
                gap: '12px',
                width: '100%',
                height: '100%',
                gridTemplateColumns:
                  allDisplaySeats.length <= 1
                    ? '1fr'
                    : allDisplaySeats.length === 2
                    ? 'repeat(2, 1fr)'
                    : allDisplaySeats.length <= 4
                    ? 'repeat(2, 1fr)'
                    : allDisplaySeats.length <= 6
                    ? 'repeat(3, 1fr)'
                    : 'repeat(4, 1fr)',
                gridAutoRows: 'minmax(180px, 1fr)',
                alignContent: 'center',
              }}
            >
              {allDisplaySeats.map((seat) => {
                const isOccupied = isSeatOccupied(seat);
                const isMySeat = isSeatOwner(seat);
                const isMain = seat.seat_number === 1;

                return (
                  <div
                    key={seat.seat_number}
                    style={{
                      background: isOccupied ? '#3c4043' : 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isMySeat && cameraActive
                        ? '2px solid #8ab4f8'
                        : isOccupied
                        ? '1px solid rgba(255, 255, 255, 0.12)'
                        : '2px dashed rgba(255, 255, 255, 0.2)',
                      boxShadow: isMySeat ? '0 0 16px rgba(138, 180, 248, 0.25)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* 1. OCCUPIED SEAT */}
                    {isOccupied ? (
                      <>
                        {/* Video Element if camera or remote WebRTC stream is active on this seat */}
                        {getSeatStream(seat) ? (
                          <VideoStreamPlayer
                            stream={getSeatStream(seat)}
                            mirrored={isSeatOwner(seat)}
                          />
                        ) : getSeatUserAvatar(seat) ? (
                          <img
                            src={getSeatUserAvatar(seat)}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 72,
                              height: 72,
                              borderRadius: '50%',
                              background: isMain ? '#7c3aed' : '#1e293b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.8rem',
                              fontWeight: 800,
                              color: '#fff',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                            }}
                          >
                            {getSeatUserName(seat)?.charAt(0) || (isMain ? '👑' : 'U')}
                          </div>
                        )}

                        {/* Live WebRTC Badge on Grid Tile */}
                        {getSeatStream(seat) && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '8px',
                              left: '8px',
                              background: 'rgba(16, 185, 129, 0.9)',
                              backdropFilter: 'blur(4px)',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              zIndex: 4,
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
                            LIVE HD
                          </div>
                        )}

                        {/* Google Meet Name Pill Bottom-Left */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '8px',
                            background: 'rgba(0,0,0,0.65)',
                            backdropFilter: 'blur(4px)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: '#fff',
                          }}
                        >
                          {isMain && <Crown size={12} color="#fbbc04" />}
                          <span>{getSeatUserName(seat)} {isMySeat ? '(You)' : ''}</span>
                        </div>

                        {/* Top-Right Pin & Mic Status */}
                        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setPinnedUserId(getSeatUserId(seat));
                              setMeetLayout('spotlight');
                            }}
                            title="Pin to spotlight"
                            style={{
                              background: 'rgba(0,0,0,0.6)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '50%',
                              width: '26px',
                              height: '26px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Pin size={12} />
                          </button>
                          <div
                            style={{
                              background: 'rgba(0,0,0,0.6)',
                              borderRadius: '50%',
                              width: '26px',
                              height: '26px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: seat.is_muted ? '#ea4335' : '#34a853',
                            }}
                          >
                            {seat.is_muted ? <MicOff size={13} /> : <Mic size={13} />}
                          </div>
                        </div>

                        {/* Quick occupant actions */}
                        {isMySeat && !isMain && (
                          <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={handleLeaveSeat}
                              className="btn btn-sm"
                              style={{ padding: '2px 6px', fontSize: '0.62rem', background: '#ea4335', color: '#fff', borderRadius: '4px' }}
                              title="Leave Seat"
                            >
                              Exit Seat
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      /* 2. UNOCCUPIED EMPTY SEAT */
                      (() => {
                        const isVideoLive = (activeRoom?.live_type || 'video') === 'video';
                        const isRequested = Boolean(myPendingRequestId);

                        return (
                          <div
                            onClick={() => {
                              if (isSeated) {
                                handleTakeSeat?.(seat.seat_number);
                              } else if (isVideoLive) {
                                if (isRequested) {
                                  handleCancelRequest?.();
                                } else {
                                  handleRequestSeat?.();
                                }
                              } else {
                                handleTakeSeat?.(seat.seat_number);
                              }
                            }}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              padding: '16px',
                              color: '#9aa0a6',
                              textAlign: 'center',
                              userSelect: 'none',
                            }}
                          >
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                background: isRequested ? 'rgba(251, 188, 4, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isRequested ? '#fbbc04' : '#8ab4f8',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              {isRequested ? <Hand size={20} /> : <Plus size={20} />}
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                              Seat #{seat.seat_number} (Free)
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                color: isRequested ? '#fbbc04' : '#8ab4f8',
                                fontWeight: 700,
                              }}
                            >
                              {isSeated
                                ? 'Click to switch seat'
                                : isVideoLive
                                ? isRequested
                                  ? '⏳ Request Pending (Cancel)'
                                  : '🙋 Request Seat (Host Approval)'
                                : 'Click to sit'}
                            </span>
                          </div>
                        );
                      })()
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* GOOGLE MEET SELF-VIEW PREVIEW (PIP) */}
          {cameraActive && localStream && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                width: selfViewMinimized ? '140px' : '220px',
                height: selfViewMinimized ? '85px' : '135px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #8ab4f8',
                background: '#202124',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                zIndex: 40,
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <VideoStreamPlayer stream={localStream} />
                {/* Top Overlay Badges */}
                <div
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    background: 'rgba(0,0,0,0.75)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    color: '#8ab4f8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    pointerEvents: 'none',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34a853', display: 'inline-block' }} />
                  <span>You {isUserSeatedInGrid ? `(Seat #${mySeatNumber || 1})` : '(Preview)'}</span>
                </div>
                <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSelfViewMinimized(!selfViewMinimized)}
                    title={selfViewMinimized ? 'Expand' : 'Minimize'}
                    style={{
                      background: 'rgba(0,0,0,0.75)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '4px',
                      padding: '3px 5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selfViewMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Google Meet Sliding Drawer (Chat / People / Info) */}
        {activeRightDrawer && (
          <div
            style={{
              width: '360px',
              background: '#282a2d',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #3c4043',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              flexShrink: 0,
            }}
          >
            {/* Drawer Header with Tabs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: '#202124',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveRightDrawer('chat')}
                  style={{
                    background: activeRightDrawer === 'chat' ? 'rgba(138, 180, 248, 0.15)' : 'transparent',
                    color: activeRightDrawer === 'chat' ? '#8ab4f8' : '#9aa0a6',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Chat ({roomMessages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRightDrawer('people')}
                  style={{
                    background: activeRightDrawer === 'people' ? 'rgba(138, 180, 248, 0.15)' : 'transparent',
                    color: activeRightDrawer === 'people' ? '#8ab4f8' : '#9aa0a6',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  People ({viewerCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRightDrawer('info')}
                  style={{
                    background: activeRightDrawer === 'info' ? 'rgba(138, 180, 248, 0.15)' : 'transparent',
                    color: activeRightDrawer === 'info' ? '#8ab4f8' : '#9aa0a6',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Info
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveRightDrawer(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9aa0a6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* DRAWER CONTENT */}
            {/* TAB 1: CHAT */}
            {activeRightDrawer === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                {/* Emojis Reaction Bar */}
                <div
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {['❤️', '🔥', '👏', '👑', '🎁', '🎉'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendChat?.(emoji)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Chat Messages List */}
                <div
                  style={{
                    flex: 1,
                    padding: '12px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {roomMessages.map((msg, i) => {
                    if (msg.isSystem) {
                      return (
                        <div
                          key={msg.id || i}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'rgba(138, 180, 248, 0.1)',
                            color: '#8ab4f8',
                            fontSize: '0.72rem',
                            textAlign: 'center',
                            margin: '2px auto',
                          }}
                        >
                          {msg.message}
                        </div>
                      );
                    }

                    const sender = msg.user || {};
                    const isHostSender = sender.id === activeRoom?.host_id;
                    const isMe = sender.id === currentUser?.id;

                    return (
                      <div key={msg.id || i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.76rem', color: isMe ? '#8ab4f8' : isHostSender ? '#fbbc04' : '#e8eaed' }}>
                            {sender.full_name || 'User'}
                          </span>
                          {isHostSender && (
                            <span style={{ fontSize: '0.62rem', background: 'rgba(251, 188, 4, 0.2)', color: '#fbbc04', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>
                              HOST
                            </span>
                          )}
                          <span style={{ fontSize: '0.65rem', color: '#9aa0a6' }}>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div
                          style={{
                            background: isMe ? 'rgba(138, 180, 248, 0.12)' : '#3c4043',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.84rem',
                            color: '#f1f3f4',
                            wordBreak: 'break-word',
                          }}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div
                  style={{
                    padding: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    gap: '8px',
                    background: '#202124',
                  }}
                >
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Send a message to everyone..."
                    value={chatInput}
                    onChange={(e) => setChatInput?.(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat?.();
                      }
                    }}
                    style={{
                      borderRadius: '24px',
                      background: '#3c4043',
                      border: '1px solid transparent',
                      color: '#fff',
                      fontSize: '0.84rem',
                      padding: '8px 16px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSendChat?.()}
                    style={{
                      background: '#8ab4f8',
                      border: 'none',
                      borderRadius: '50%',
                      width: '38px',
                      height: '38px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#202124',
                      cursor: 'pointer',
                    }}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: PEOPLE (Seats & Waiting Call Requests) */}
            {activeRightDrawer === 'people' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '14px', overflowY: 'auto', gap: '14px' }}>
                {/* Incoming Call Requests for Host/Admin */}
                {seatRequests.length > 0 && (
                  <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.3)' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ea4335', marginBottom: '8px' }}>
                      Incoming Call Requests ({seatRequests.length})
                    </div>
                    {seatRequests.map((reqItem) => (
                      <div key={reqItem.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{reqItem.name || `User #${reqItem.user_id}`}</span>
                        {isHostOrAdmin && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleApproveRequest?.(reqItem.id)}
                              style={{ background: '#34a853', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectRequest?.(reqItem.id)}
                              style={{ background: '#ea4335', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Seated Participants */}
                <div>
                  <div style={{ fontSize: '0.76rem', color: '#9aa0a6', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                    In-Call Broadcasters ({allDisplaySeats.filter((s) => s.user_id).length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {allDisplaySeats.filter((s) => s.user_id).map((s) => (
                      <div
                        key={s.seat_number}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: '#3c4043',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                            {s.user_name?.charAt(0) || 'U'}
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                            {s.user_name} {s.user_id === currentUser?.id ? '(You)' : ''} {s.seat_number === 1 ? '👑' : ''}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#9aa0a6' }}>Seat #{s.seat_number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MEETING INFO */}
            {activeRightDrawer === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '16px', gap: '14px', fontSize: '0.84rem' }}>
                <div style={{ fontWeight: 700, color: '#f1f3f4', fontSize: '0.94rem' }}>Joining Info</div>
                <div style={{ color: '#9aa0a6', fontSize: '0.78rem' }}>Room ID</div>
                <div style={{ fontFamily: 'monospace', color: '#8ab4f8', fontWeight: 700 }}>#{activeRoom?.room_id}</div>

                <div style={{ color: '#9aa0a6', fontSize: '0.78rem' }}>LiveKit Cloud Server</div>
                <div style={{ fontFamily: 'monospace', color: '#8ab4f8', fontSize: '0.74rem' }}>wss://snlive-y3r75itj.livekit.cloud</div>

                <button
                  type="button"
                  onClick={() => setShowLiveKitModal?.(true)}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '8px', borderRadius: '8px' }}
                >
                  Inspect WebRTC JWT Token & Credentials
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. GOOGLE MEET ICONIC BOTTOM BAR */}
      <div
        style={{
          height: '76px',
          background: '#202124',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 10,
        }}
      >
        {/* Left Info: Current Time & Meeting Code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e8eaed' }}>{meetTime}</span>
          <span style={{ color: '#5f6368' }}>|</span>
          <span style={{ fontSize: '0.8rem', color: '#9aa0a6' }}>{activeRoom?.room_id}</span>
        </div>

        {/* Center Controls: Round Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleMic}
            title={micActive ? 'Turn off microphone' : 'Turn on microphone'}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: micActive ? '#3c4043' : '#ea4335',
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {micActive ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={toggleCamera}
            title={cameraActive ? 'Turn off camera' : 'Turn on camera'}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: cameraActive ? '#3c4043' : '#ea4335',
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {cameraActive ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Raise Hand / Call Request Button */}
          <button
            type="button"
            onClick={() => {
              if (myPendingRequestId) {
                handleCancelRequest?.();
              } else if (!isSeated) {
                handleRequestSeat?.();
              }
            }}
            title={myPendingRequestId ? 'Lower Hand (Cancel Request)' : 'Raise Hand (Request Call)'}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: myPendingRequestId ? '#fbbc04' : '#3c4043',
              border: 'none',
              color: myPendingRequestId ? '#000' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <Hand size={20} />
          </button>

          {/* Screen Share Button */}
          <button
            type="button"
            onClick={toggleScreenShare}
            title={isScreenSharing ? 'Stop presenting' : 'Present now'}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: isScreenSharing ? '#8ab4f8' : '#3c4043',
              border: 'none',
              color: isScreenSharing ? '#202124' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <Monitor size={20} />
          </button>

          {/* Leave Call (Red Pill Button) */}
          <button
            type="button"
            onClick={leaveLiveStage}
            title="Leave call"
            style={{
              height: '46px',
              padding: '0 20px',
              borderRadius: '24px',
              background: '#ea4335',
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(234, 67, 53, 0.4)',
            }}
          >
            <PhoneOff size={20} />
            <span>Leave</span>
          </button>
        </div>

        {/* Right Drawer Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px', justifyContent: 'flex-end' }}>
          {/* Meeting Info */}
          <button
            type="button"
            onClick={() => setActiveRightDrawer(activeRightDrawer === 'info' ? null : 'info')}
            title="Meeting details"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: activeRightDrawer === 'info' ? '#8ab4f8' : 'transparent',
              border: 'none',
              color: activeRightDrawer === 'info' ? '#202124' : '#e8eaed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Info size={18} />
          </button>

          {/* People Drawer */}
          <button
            type="button"
            onClick={() => setActiveRightDrawer(activeRightDrawer === 'people' ? null : 'people')}
            title="People"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: activeRightDrawer === 'people' ? '#8ab4f8' : 'transparent',
              border: 'none',
              color: activeRightDrawer === 'people' ? '#202124' : '#e8eaed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Users size={18} />
            {seatRequests.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ea4335',
                }}
              />
            )}
          </button>

          {/* Chat Drawer */}
          <button
            type="button"
            onClick={() => setActiveRightDrawer(activeRightDrawer === 'chat' ? null : 'chat')}
            title="Chat with everyone"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: activeRightDrawer === 'chat' ? '#8ab4f8' : 'transparent',
              border: 'none',
              color: activeRightDrawer === 'chat' ? '#202124' : '#e8eaed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <MessageSquare size={18} />
            {roomMessages.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: '#ea4335',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 5px',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                }}
              >
                {roomMessages.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
