import { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

/**
 * Custom hook to manage LiveKit real-time WebRTC room connection,
 * publishing local video/audio tracks, and auto-subscribing to remote participants.
 */
export function useLiveKit({ liveKitData, localStream, cameraActive, micActive, enabled = true }) {
  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [connectionError, setConnectionError] = useState(null);

  const roomRef = useRef(null);
  const publishedVideoTrackRef = useRef(null);
  const publishedAudioTrackRef = useRef(null);

  // 1. Connect / Disconnect LiveKit Room
  useEffect(() => {
    if (!enabled || !liveKitData?.url || !liveKitData?.token) {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
        setRoom(null);
        setIsConnected(false);
        setRemoteStreams({});
      }
      return;
    }

    let isCancelled = false;
    const lkRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = lkRoom;

    const syncRemoteTracks = () => {
      const newStreams = {};
      lkRoom.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.isSubscribed && pub.track && pub.kind === Track.Kind.Video) {
            const stream = new MediaStream([pub.track.mediaStreamTrack]);
            newStreams[participant.identity] = stream;
            newStreams[String(participant.identity)] = stream;
          }
        });
      });
      if (Object.keys(newStreams).length > 0) {
        setRemoteStreams((prev) => ({ ...prev, ...newStreams }));
      }
    };

    lkRoom.on(RoomEvent.Connected, () => {
      if (isCancelled) return;
      setIsConnected(true);
      setConnectionError(null);
      syncRemoteTracks();
    });

    lkRoom.on(RoomEvent.Disconnected, () => {
      if (isCancelled) return;
      setIsConnected(false);
      setRemoteStreams({});
    });

    lkRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (isCancelled) return;
      if (track.kind === Track.Kind.Video) {
        const stream = new MediaStream([track.mediaStreamTrack]);
        setRemoteStreams((prev) => ({
          ...prev,
          [participant.identity]: stream,
          [String(participant.identity)]: stream,
        }));
      } else if (track.kind === Track.Kind.Audio) {
        // Auto-play remote audio seamlessly
        const audioEl = track.attach();
        audioEl.style.display = 'none';
        audioEl.id = `lk-audio-${participant.identity}`;
        document.body.appendChild(audioEl);
      }
    });

    lkRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      if (isCancelled) return;
      if (track.kind === Track.Kind.Video) {
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[participant.identity];
          delete next[String(participant.identity)];
          return next;
        });
      } else if (track.kind === Track.Kind.Audio) {
        track.detach().forEach((el) => el.remove());
        const el = document.getElementById(`lk-audio-${participant.identity}`);
        if (el) el.remove();
      }
    });

    lkRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (isCancelled) return;
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[participant.identity];
        delete next[String(participant.identity)];
        return next;
      });
      const el = document.getElementById(`lk-audio-${participant.identity}`);
      if (el) el.remove();
    });

    lkRoom
      .connect(liveKitData.url, liveKitData.token)
      .then(() => {
        if (!isCancelled) {
          setRoom(lkRoom);
          setIsConnected(true);
          syncRemoteTracks();
        }
      })
      .catch((err) => {
        console.error('LiveKit connection error:', err);
        if (!isCancelled) {
          setConnectionError(err.message);
          setIsConnected(false);
        }
      });

    return () => {
      isCancelled = true;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      setRoom(null);
      setIsConnected(false);
      setRemoteStreams({});
    };
  }, [liveKitData?.url, liveKitData?.token, enabled]);

  // 2. Publish / Unpublish Local Video Track
  useEffect(() => {
    const lkRoom = roomRef.current;
    if (!lkRoom || !isConnected) return;

    const manageVideoTrack = async () => {
      try {
        const videoTrack = localStream?.getVideoTracks()?.[0];
        if (cameraActive && videoTrack) {
          if (publishedVideoTrackRef.current === videoTrack) {
            return;
          }
          if (publishedVideoTrackRef.current) {
            try {
              await lkRoom.localParticipant.unpublishTrack(publishedVideoTrackRef.current);
            } catch (e) {}
            publishedVideoTrackRef.current = null;
          }
          await lkRoom.localParticipant.publishTrack(videoTrack, {
            name: 'camera',
            source: Track.Source.Camera,
            simulcast: false,
          });
          publishedVideoTrackRef.current = videoTrack;
          console.log('✅ Published local camera track to LiveKit SFU');
        } else {
          if (publishedVideoTrackRef.current) {
            try {
              await lkRoom.localParticipant.unpublishTrack(publishedVideoTrackRef.current);
            } catch (e) {}
            publishedVideoTrackRef.current = null;
            console.log('⏹️ Unpublished local camera track from LiveKit SFU');
          }
        }
      } catch (err) {
        console.warn('LiveKit video publish warning:', err);
      }
    };

    manageVideoTrack();
  }, [cameraActive, localStream, isConnected]);

  // 3. Publish / Unpublish Local Audio Track
  useEffect(() => {
    const lkRoom = roomRef.current;
    if (!lkRoom || !isConnected) return;

    const manageAudioTrack = async () => {
      try {
        const audioTrack = localStream?.getAudioTracks()?.[0];
        if (micActive && audioTrack) {
          if (publishedAudioTrackRef.current === audioTrack) return;
          if (publishedAudioTrackRef.current) {
            try {
              await lkRoom.localParticipant.unpublishTrack(publishedAudioTrackRef.current);
            } catch (e) {}
            publishedAudioTrackRef.current = null;
          }
          await lkRoom.localParticipant.publishTrack(audioTrack, {
            name: 'microphone',
            source: Track.Source.Microphone,
          });
          publishedAudioTrackRef.current = audioTrack;
          console.log('✅ Published local audio track to LiveKit SFU');
        } else {
          if (publishedAudioTrackRef.current) {
            try {
              await lkRoom.localParticipant.unpublishTrack(publishedAudioTrackRef.current);
            } catch (e) {}
            publishedAudioTrackRef.current = null;
            console.log('⏹️ Unpublished local audio track from LiveKit SFU');
          }
        }
      } catch (err) {
        console.warn('LiveKit audio publish warning:', err);
      }
    };

    manageAudioTrack();
  }, [micActive, localStream, isConnected]);

  return {
    room,
    isConnected,
    remoteStreams,
    connectionError,
  };
}
