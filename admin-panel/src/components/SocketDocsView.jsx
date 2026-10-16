import React, { useState, useMemo } from 'react';
import {
  Zap,
  Mic,
  Radio,
  Shield,
  Users,
  Copy,
  Check,
  Code2,
  Sparkles,
  Smartphone,
  Terminal,
  Layers,
  Bot,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  MessageSquare,
  Gift,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Play,
  Share2,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Clock,
  Info,
  ArrowRight,
  Send,
  UserX,
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

export default function SocketDocsView({ baseUrl = 'http://localhost:5050', onToast }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copiedKey, setCopiedKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState('seat_take');
  const [subTab, setSubTab] = useState({}); // { [id]: 'api' | 'socket' | 'prompt' }

  const handleCopy = async (text, key) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      if (onToast) onToast('Copied to clipboard!', 'success');
    } else if (onToast) {
      onToast('Failed to copy to clipboard', 'error');
    }
  };

  const getActiveSubTab = (id) => subTab[id] || 'prompt';
  const setActiveSubTab = (id, tab) => setSubTab((prev) => ({ ...prev, [id]: tab }));

  // Dynamic Prompt Generator that embeds:
  // 1. Flutter Socket.IO Installation & Client Setup (pubspec, imports, connection, join-room)
  // 2. API Call Endpoint
  // 3. Incoming Socket JSON Data Format
  // 4. How to Listen & Parse in Dart
  // 5. UI Update Directives
  const getEnrichedPrompt = (item) => {
    const jsonPayloadStr = JSON.stringify(item.socket.payload, null, 2);
    const jsonBodyStr = JSON.stringify(item.api.requestBody, null, 2);

    return `Act as a Senior Flutter & Real-Time Mobile Systems Engineer.
Implement the integration for "${item.title}" in the Umi Live mobile application.

=============================================================================
1. FLUTTER SOCKET.IO INSTALLATION & INITIAL SETUP
=============================================================================
Step 1: Add dependencies to your Flutter project's \`pubspec.yaml\`:
\`\`\`yaml
dependencies:
  flutter:
    sdk: flutter
  socket_io_client: ^3.0.2
  http: ^1.2.0
\`\`\`

Step 2: Import the package in your service/controller:
\`\`\`dart
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'dart:convert';
import 'package:http/http.dart' as http;
\`\`\`

Step 3: Socket Client Initialization & Room Handshake:
\`\`\`dart
// Dynamic Base URL Resolution:
// Android Emulator: 'http://10.0.2.2:5050'
// Real Device (LAN Wi-Fi): 'http://192.168.0.116:5050' (or your machine's LAN IP)
// Production: 'https://api.umilive.com'
final String socketBaseUrl = baseUrl;

final IO.Socket socket = IO.io(
  socketBaseUrl,
  IO.OptionBuilder()
      .setTransports(['websocket'])
      .disableAutoConnect()
      .enableReconnection()
      .setReconnectionAttempts(10)
      .setReconnectionDelay(1000)
      .setAuth({'token': jwtToken})
      .setExtraHeaders({'Authorization': 'Bearer \$jwtToken'})
      .build(),
);

// Connect to WebSocket server
socket.connect();

socket.onConnect((_) {
  debugPrint('🟢 Socket connected successfully: \${socket.id}');
});

// Join the live room channel upon entering screen (initState / onInit):
socket.emit('join-room', {
  'roomId': roomId, // e.g. "room-f8a4bc9b"
  'user': {
    'id': currentUser.id,
    'full_name': currentUser.fullName,
    'avatar_url': currentUser.avatarUrl,
  }
});

// Leave the room channel upon exiting screen (dispose / onClose):
// socket.emit('leave-room', {'roomId': roomId});
\`\`\`

=============================================================================
2. REST API ENDPOINT SPECIFICATION
=============================================================================
To trigger this action, your Flutter app makes this HTTP call:
- Action: ${item.title}
- Method: ${item.api.method}
- URL: "$baseUrl${item.api.path}"
- Headers:
  * "Authorization": "Bearer $token"
  * "Content-Type": "application/json"
- Request Body (JSON):
\`\`\`json
${jsonBodyStr}
\`\`\`

=============================================================================
3. INCOMING REAL-TIME SOCKET EVENT & EXACT DATA FORMAT
=============================================================================
When this API is executed, the backend commits changes to MySQL and broadcasts this Socket.IO event:
- Event Name: "${item.socket.event}"
- Target Channel: "${item.socket.channel}"
- Exact Incoming JSON Data Format Received by Socket Client:
\`\`\`json
${jsonPayloadStr}
\`\`\`

=============================================================================
4. HOW TO LISTEN & PARSE THIS DATA FORMAT IN FLUTTER (DART)
=============================================================================
Add this typed event listener to your LiveRoomController / SocketService:
\`\`\`dart
socket.on('${item.socket.event}', (dynamic rawData) {
  try {
    final Map<String, dynamic> data = Map<String, dynamic>.from(rawData);
    debugPrint('⚡ [SOCKET EVENT RECEIVED] ${item.socket.event}: \$data');

    // Parse the payload fields:
    ${item.socketParsingCode}
  } catch (e, stack) {
    debugPrint('⚠️ Error parsing ${item.socket.event}: \$e\\n\$stack');
  }
});
\`\`\`

=============================================================================
5. UI UPDATE & STATE MANAGEMENT DIRECTIVES
=============================================================================
${item.uiAction}
`;
  };

  const endpointsCatalog = useMemo(() => [
    // ------------------------------------------------------------------------
    // 1. TAKE SEAT
    // ------------------------------------------------------------------------
    {
      id: 'seat_take',
      category: 'seats',
      categoryLabel: '🎙️ Live Seat Controls',
      title: 'Take a Seat (Audio Live Direct Seating)',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/take',
        auth: 'Bearer <JWT_TOKEN> (Required)',
        description: 'Occupies an open seat directly in Audio Live streams without requiring host acceptance.',
        requestBody: {
          seat_number: 2
        },
        response: {
          success: true,
          message: 'You took seat 2 successfully.',
          seat_number: 2,
          room_id: 'room-f8a4bc9b'
        }
      },
      socket: {
        event: 'seat_updated',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId (All participants in room)',
        description: 'Emitted immediately after MySQL update. Notifies all viewers to render the new occupant on the seat slot.',
        payload: {
          roomId: 'room-f8a4bc9b',
          action: 'take',
          seat_index: 2,
          previous_seat_index: null,
          seat: {
            seat_index: 2,
            is_locked: 0,
            is_muted: 0,
            is_video_muted: 1,
            user: {
              id: 105,
              full_name: 'Farhan Ahmed',
              avatar_url: 'http://localhost:5050/uploads/avatars/u105.jpg',
              vip_level: 2
            }
          }
        }
      },
      socketParsingCode: `final action = data['action'] as String; // "take"
    final seatIndex = data['seat_index'] as int; // 2
    final seatMap = Map<String, dynamic>.from(data['seat']);
    final userMap = Map<String, dynamic>.from(seatMap['user']);

    final occupant = LiveUserModel(
      id: userMap['id'] as int,
      fullName: userMap['full_name'] as String,
      avatarUrl: userMap['avatar_url'] as String,
      vipLevel: userMap['vip_level'] as int? ?? 0,
    );

    final seat = LiveSeatModel(
      seatNumber: seatIndex,
      isLocked: seatMap['is_locked'] == 1,
      isMuted: seatMap['is_muted'] == 1,
      isVideoMuted: seatMap['is_video_muted'] == 1,
      user: occupant,
    );

    // Update Riverpod / Bloc State:
    ref.read(liveRoomControllerProvider.notifier).updateSeat(seatIndex, seat);`,
      uiAction: `1. Update the local seat array: state.seats[seat_index] = newSeat.
2. In your GridView.builder, seat slot at index 2 switches from empty '+' button to occupant avatar.
3. If data['seat']['user']['id'] == currentUserId:
   - Switch local mobile role to Speaker mode.
   - Start local WebRTC audio publishing.
   - Show bottom controls: Mute Mic, Leave Seat.
4. Play subtle seat join audio chime.`
    },

    // ------------------------------------------------------------------------
    // 2. SWITCH / MOVE SEAT
    // ------------------------------------------------------------------------
    {
      id: 'seat_switch',
      category: 'seats',
      categoryLabel: '🎙️ Live Seat Controls',
      title: 'Switch / Move to Another Empty Seat',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/switch',
        auth: 'Bearer <JWT_TOKEN> (Required)',
        description: 'Moves an already-seated user from their current seat to another empty seat without leaving the room.',
        requestBody: {
          target_seat_number: 5
        },
        response: {
          success: true,
          message: 'Moved to seat 5 successfully.',
          previous_seat: 2,
          new_seat: 5
        }
      },
      socket: {
        event: 'seat_updated',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Carries both previous_seat_index and target seat_index so all clients can animate the move in one atomic frame.',
        payload: {
          roomId: 'room-f8a4bc9b',
          action: 'switch',
          seat_index: 5,
          previous_seat_index: 2,
          seat: {
            seat_index: 5,
            is_locked: 0,
            is_muted: 0,
            is_video_muted: 1,
            user: {
              id: 105,
              full_name: 'Farhan Ahmed',
              avatar_url: 'http://localhost:5050/uploads/avatars/u105.jpg',
              vip_level: 2
            }
          }
        }
      },
      socketParsingCode: `final action = data['action'] as String; // "switch"
    final newIndex = data['seat_index'] as int; // 5
    final prevIndex = data['previous_seat_index'] as int; // 2
    final seatMap = Map<String, dynamic>.from(data['seat']);
    final userMap = Map<String, dynamic>.from(seatMap['user']);

    final occupant = LiveUserModel.fromJson(userMap);
    final newSeat = LiveSeatModel.fromJson(seatMap);

    // Atomically clear previous slot and set new slot:
    ref.read(liveRoomControllerProvider.notifier).moveSeat(
      fromIndex: prevIndex,
      toIndex: newIndex,
      seat: newSeat,
    );`,
      uiAction: `1. Atomically clear state.seats[previous_seat_index].user = null.
2. Set state.seats[seat_index].user = occupant.
3. Animate the avatar transition smoothly from Seat #2 to Seat #5.
4. Seat #2 reverts back to the empty '+' circle.`
    },

    // ------------------------------------------------------------------------
    // 3. LEAVE SEAT
    // ------------------------------------------------------------------------
    {
      id: 'seat_leave',
      category: 'seats',
      categoryLabel: '🎙️ Live Seat Controls',
      title: 'Leave Seat (Revert to Audience)',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/leave',
        auth: 'Bearer <JWT_TOKEN> (Required)',
        description: 'Seated user voluntarily vacates their seat and reverts back to a passive room viewer.',
        requestBody: {},
        response: {
          success: true,
          message: 'Left seat successfully.'
        }
      },
      socket: {
        event: 'seat_updated',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Informs room that occupant vacated. Carries action: "leave" with null seat payload.',
        payload: {
          roomId: 'room-f8a4bc9b',
          action: 'leave',
          seat_index: 2,
          seat: null
        }
      },
      socketParsingCode: `final action = data['action'] as String; // "leave"
    final seatIndex = data['seat_index'] as int; // 2

    // Clear occupant from seat:
    ref.read(liveRoomControllerProvider.notifier).vacateSeat(seatIndex);`,
      uiAction: `1. Set state.seats[seat_index].user = null.
2. Slot at seat_index reverts to empty '+' button.
3. If vacated seat was occupied by currentUserId:
   - Stop WebRTC audio publishing.
   - Switch bottom controls back to Audience view (show "Take Seat" / "Gift" icons).`
    },

    // ------------------------------------------------------------------------
    // 4. LOCK / UNLOCK SINGLE SEAT
    // ------------------------------------------------------------------------
    {
      id: 'seat_lock',
      category: 'seats',
      categoryLabel: '🎙️ Live Seat Controls',
      title: 'Lock / Unlock Single Seat Slot',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/lock',
        auth: 'Bearer <JWT_TOKEN> (Host / Admin Required)',
        description: 'Toggles the padlock lock on a specific seat slot to prevent direct seating.',
        requestBody: {
          seat_number: 3,
          is_locked: true
        },
        response: {
          success: true,
          message: 'Seat 3 locked successfully.',
          seat_number: 3,
          is_locked: true
        }
      },
      socket: {
        event: 'seat_locked',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Broadcasts lock state change to all participants in real time.',
        payload: {
          roomId: 'room-f8a4bc9b',
          seatNumber: 3,
          seat_index: 3,
          is_locked: 1,
          isLocked: true
        }
      },
      socketParsingCode: `final seatIndex = (data['seat_index'] ?? data['seatNumber']) as int;
    final isLocked = data['is_locked'] == 1 || data['isLocked'] == true;

    // Update lock flag on seat model:
    ref.read(liveRoomControllerProvider.notifier).setSeatLocked(seatIndex, isLocked);`,
      uiAction: `1. Update state.seats[seat_index].isLocked = isLocked.
2. If isLocked == true, display a dark circle with red/amber Padlock icon.
3. For normal viewers: tapping a locked seat shows toast "This seat is locked by Host".
4. For Host/Admin: tapping gives option to "Unlock Seat".`
    },

    // ------------------------------------------------------------------------
    // 5. LOCK ALL EMPTY SEATS
    // ------------------------------------------------------------------------
    {
      id: 'seat_lock_all_empty',
      category: 'seats',
      categoryLabel: '🎙️ Live Seat Controls',
      title: 'Lock / Unlock All Empty Seats at Once',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/lock-all-empty',
        auth: 'Bearer <JWT_TOKEN> (Host / Admin Required)',
        description: 'Batch action to lock or unlock all currently unoccupied seats simultaneously.',
        requestBody: {
          locked: true
        },
        response: {
          success: true,
          message: 'All empty seats locked successfully.',
          locked: true,
          affected_seats: [1, 2, 4, 5]
        }
      },
      socket: {
        event: 'empty_seats_lock_toggled',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Carries boolean locked flag and exact array of affected seat numbers.',
        payload: {
          roomId: 'room-f8a4bc9b',
          locked: true,
          affected_seats: [1, 2, 4, 5]
        }
      },
      socketParsingCode: `final bool locked = data['locked'] == true;
    final List<dynamic> affected = data['affected_seats'] ?? [];
    final seatIndices = affected.cast<int>();

    // Batch update state:
    ref.read(liveRoomControllerProvider.notifier).batchSetSeatsLocked(seatIndices, locked);`,
      uiAction: `1. Iterate over seatIndices and update isLocked = locked for all matching slots.
2. In UI, all empty seats simultaneously toggle to Padlock icons.
3. Show floating toast: "Host has locked all empty seats."`
    },

    // ------------------------------------------------------------------------
    // 6. MUTE / UNMUTE SINGLE SEAT MIC
    // ------------------------------------------------------------------------
    {
      id: 'seat_mute_single',
      category: 'seats',
      categoryLabel: '🎙️ Live Seat Controls',
      title: 'Mute / Unmute Single Seat Microphone',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/mute',
        auth: 'Bearer <JWT_TOKEN> (Required)',
        description: 'Seated user mutes own mic, or Host/Admin remotely mutes the occupant.',
        requestBody: {
          seat_number: 3,
          is_muted: true
        },
        response: {
          success: true,
          message: 'Seat 3 muted successfully.',
          seat_number: 3,
          is_muted: true
        }
      },
      socket: {
        event: 'seat_media_updated',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Carries seat index, is_muted flag, and action_by user ID.',
        payload: {
          roomId: 'room-f8a4bc9b',
          seat_index: 3,
          user_id: 105,
          is_muted: 1,
          is_video_muted: 1,
          action_by: 1
        }
      },
      socketParsingCode: `final seatIndex = data['seat_index'] as int;
    final isMuted = data['is_muted'] == 1;
    final targetUserId = data['user_id'] as int;
    final actionBy = data['action_by'] as int;

    ref.read(liveRoomControllerProvider.notifier).setSeatMuted(seatIndex, isMuted);

    if (targetUserId == currentUserId && actionBy != currentUserId && isMuted) {
      // Remotely muted by Host!
      pauseLocalAudioTrack();
      showCustomSnackbar('The Host has muted your microphone.');
    }`,
      uiAction: `1. Update state.seats[seat_index].isMuted = isMuted.
2. Display a circular red mic-slash badge at the bottom-right of the avatar.
3. If occupant was actively speaking, stop the animated sound ripple ring.`
    },

    // ------------------------------------------------------------------------
    // 7. MUTE ALL SPEAKERS AT ONCE
    // ------------------------------------------------------------------------
    {
      id: 'seat_mute_all',
      category: 'seats',
      categoryLabel: '🎙️ Live Seat Controls',
      title: 'Mute / Unmute All Speakers at Once',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/mute-all',
        auth: 'Bearer <JWT_TOKEN> (Host / Admin Required)',
        description: 'Silences all non-host seated speakers simultaneously with a single button tap.',
        requestBody: {
          is_muted: true
        },
        response: {
          success: true,
          message: 'All speakers muted successfully.',
          is_muted: true,
          affected_seats: [1, 2, 3]
        }
      },
      socket: {
        event: 'all_seats_muted',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Notifies all viewers that every speaker seat has been muted.',
        payload: {
          roomId: 'room-f8a4bc9b',
          is_muted: true,
          affected_seats: [1, 2, 3]
        }
      },
      socketParsingCode: `final isMuted = data['is_muted'] == true;
    final affected = (data['affected_seats'] as List<dynamic>? ?? []).cast<int>();

    ref.read(liveRoomControllerProvider.notifier).batchSetSeatsMuted(affected, isMuted);

    if (isCurrentUserSeated && isMuted) {
      pauseLocalAudioTrack();
      showCustomSnackbar('The Host has muted all speakers.');
    }`,
      uiAction: `1. Loop through affected seat indices and set isMuted = isMuted.
2. All non-host avatar slots simultaneously render red mic-slash badges.
3. All voice wave animations pause.`
    },

    // ------------------------------------------------------------------------
    // 8. REMOVE / KICK USER FROM SEAT
    // ------------------------------------------------------------------------
    {
      id: 'seat_remove_user',
      category: 'seats',
      categoryLabel: '🎙️ Live Seat Controls',
      title: 'Remove / Kick User from Seat',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/remove',
        auth: 'Bearer <JWT_TOKEN> (Host / Admin Required)',
        description: 'Demotes a specific seated user back to the passive audience and frees their seat slot.',
        requestBody: {
          seat_number: 3
        },
        response: {
          success: true,
          message: 'User removed from seat successfully.',
          seat_number: 3
        }
      },
      socket: {
        event: 'seat_user_removed',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Broadcasts seat index and removed user ID.',
        payload: {
          roomId: 'room-f8a4bc9b',
          seatIndex: 3,
          removedUserId: 105
        }
      },
      socketParsingCode: `final seatIndex = data['seatIndex'] as int;
    final removedUserId = data['removedUserId'] as int;

    ref.read(liveRoomControllerProvider.notifier).vacateSeat(seatIndex);

    if (removedUserId == currentUserId) {
      stopPublishingAudio();
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: Text('Seat Removed'),
          content: Text('You were moved back to the audience by the Host.'),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: Text('OK'))],
        ),
      );
    }`,
      uiAction: `1. Set state.seats[seatIndex].user = null.
2. Slot 3 reverts to empty '+' button.
3. If removed user was currentUserId, revert bottom toolbar back to Viewer mode.`
    },

    // ------------------------------------------------------------------------
    // 9. KICK ALL USERS FROM SEATS (Clean Sweep)
    // ------------------------------------------------------------------------
    {
      id: 'seat_kick_all',
      category: 'seats',
      categoryLabel: '🎙️ Live Seat Controls',
      title: 'Kick All Users from Seats (Clean Sweep)',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/kick-all',
        auth: 'Bearer <JWT_TOKEN> (Host Required)',
        description: 'Ejects all non-host speakers at once. Host remains in Seat 0.',
        requestBody: {},
        response: {
          success: true,
          message: 'Successfully removed all users from co-host seats.'
        }
      },
      socket: {
        event: 'all_seats_cleared',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Tells all viewers to clear all seats from index 1 to N.',
        payload: {
          roomId: 'room-f8a4bc9b'
        }
      },
      socketParsingCode: `ref.read(liveRoomControllerProvider.notifier).clearAllGuestSeats();

    if (isCurrentUserSeated && !isHost) {
      stopPublishingAudio();
      showToast('All co-host seats were cleared by the Host.');
    }`,
      uiAction: `1. Loop seats from index 1 to total_seats - 1 and set user = null.
2. Host avatar stays pinned in Seat 0.
3. All demoted users stop audio capture and revert to audience UI.`
    },

    // ------------------------------------------------------------------------
    // 10. DYNAMIC SEAT SCALING (7 to 8, 9, 12)
    // ------------------------------------------------------------------------
    {
      id: 'seat_scale_count',
      category: 'seats',
      categoryLabel: '🎙️ Live Seat Controls',
      title: 'Dynamic Seat Capacity Scaling (Min 7)',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/increase',
        auth: 'Bearer <JWT_TOKEN> (Host Required)',
        description: 'Increases seat count one-by-one (or updates count via PUT /seats/count). Guaranteed minimum 7 seats.',
        requestBody: {},
        response: {
          success: true,
          message: 'Seat count increased successfully.',
          total_seats: 8
        }
      },
      socket: {
        event: 'room_seats_count_updated',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Broadcasts new total seat count to expand the grid.',
        payload: {
          roomId: 'room-f8a4bc9b',
          total_seats: 8
        }
      },
      socketParsingCode: `final newTotalSeats = data['total_seats'] as int; // e.g. 8
    ref.read(liveRoomControllerProvider.notifier).updateTotalSeats(newTotalSeats);`,
      uiAction: `1. Append new empty seat object: LiveSeatModel(seatNumber: 7, user: null).
2. Flutter GridView.builder itemCount becomes 8.
3. Animate the entrance of the new seat slot with a fade/scale animation.`
    },

    // ------------------------------------------------------------------------
    // 11. SUBMIT SEAT REQUEST (Video Live / Audio Waiting List)
    // ------------------------------------------------------------------------
    {
      id: 'seat_request_submit',
      category: 'requests',
      categoryLabel: '🙋 Seat Request Queue',
      title: 'Submit Seat Request (Video Live Guard)',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/request',
        auth: 'Bearer <JWT_TOKEN> (Required)',
        description: 'In Video Live streams, direct seating is blocked. User submits a request to the Host queue.',
        requestBody: {
          seat_number: 2
        },
        response: {
          success: true,
          message: 'Seat request submitted successfully. Waiting for host approval.',
          request_id: 42
        }
      },
      socket: {
        event: 'seat_request_created',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Notifies Host and Admins of the new applicant.',
        payload: {
          roomId: 'room-f8a4bc9b',
          requestId: 42,
          user: {
            id: 105,
            name: 'Farhan Ahmed',
            profile: 'http://localhost:5050/uploads/avatars/u105.jpg',
            coin: 500,
            level: 3
          },
          requested_seat: 2
        }
      },
      socketParsingCode: `final requestId = data['requestId'] as int;
    final userMap = Map<String, dynamic>.from(data['user']);
    final requestedSeat = data['requested_seat'] as int?;

    final request = SeatRequestModel(
      id: requestId,
      userId: userMap['id'] as int,
      userName: userMap['name'] as String,
      userAvatar: userMap['profile'] as String,
      coins: userMap['coin'] as int? ?? 0,
      level: userMap['level'] as int? ?? 1,
      preferredSeat: requestedSeat,
    );

    ref.read(pendingRequestsProvider.notifier).add(request);`,
      uiAction: `1. Viewer side: "Request Seat" button changes to "Request Pending... (Cancel)".
2. Host side:
   - Host controls icon displays a red notification badge (+1).
   - Play a subtle notification ping sound.
   - Add Farhan's card to the Host "Seat Requests" bottom sheet with Accept and Reject buttons.`
    },

    // ------------------------------------------------------------------------
    // 12. APPROVE SEAT REQUEST
    // ------------------------------------------------------------------------
    {
      id: 'seat_request_approve',
      category: 'requests',
      categoryLabel: '🙋 Seat Request Queue',
      title: 'Approve / Accept Seat Request',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/requests/:requestId/approve',
        auth: 'Bearer <JWT_TOKEN> (Host / Admin Required)',
        description: 'Host approves request. Assigns applicant to seat and removes from queue.',
        requestBody: {
          seat_number: 2
        },
        response: {
          success: true,
          message: 'Seat request approved. User assigned to seat #2.'
        }
      },
      socket: {
        event: 'seat_request_approved & seat_updated',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Both events are emitted: seat_request_approved notifies applicant, seat_updated places avatar on grid.',
        payload: {
          roomId: 'room-f8a4bc9b',
          requestId: 42,
          userId: 105,
          seatIndex: 2
        }
      },
      socketParsingCode: `final requestId = data['requestId'] as int;
    final targetUserId = data['userId'] as int;
    final assignedSeatIndex = data['seatIndex'] as int;

    // Remove from pending list:
    ref.read(pendingRequestsProvider.notifier).remove(requestId);

    if (targetUserId == currentUserId) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: Text('Request Accepted! 🎉'),
          content: Text('Host approved your request for Seat #\$assignedSeatIndex.'),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: Text('Join Now'))],
        ),
      );
      startWebRtcPublishing();
    }`,
      uiAction: `1. Host bottom sheet removes Request #42.
2. Badge count decrements -1.
3. Target user sees celebratory approval dialog and local camera/mic starts publishing.
4. All room participants see seat_updated event and render avatar on Seat #2.`
    },

    // ------------------------------------------------------------------------
    // 13. REJECT SEAT REQUEST
    // ------------------------------------------------------------------------
    {
      id: 'seat_request_reject',
      category: 'requests',
      categoryLabel: '🙋 Seat Request Queue',
      title: 'Reject / Decline Seat Request',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/requests/:requestId/reject',
        auth: 'Bearer <JWT_TOKEN> (Host / Admin Required)',
        description: 'Host declines applicant request. Removes item from waiting list.',
        requestBody: {},
        response: {
          success: true,
          message: 'Seat request rejected.'
        }
      },
      socket: {
        event: 'seat_request_rejected',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Broadcasts rejected request ID and user ID.',
        payload: {
          roomId: 'room-f8a4bc9b',
          requestId: 42,
          userId: 105
        }
      },
      socketParsingCode: `final requestId = data['requestId'] as int;
    final targetUserId = data['userId'] as int;

    ref.read(pendingRequestsProvider.notifier).remove(requestId);

    if (targetUserId == currentUserId) {
      showToast('Your seat request was declined by the Host.');
      ref.read(seatRequestStateProvider.notifier).reset();
    }`,
      uiAction: `1. Host removes card from queue.
2. Target user's button reverts from "Request Pending" back to "Apply for Seat".`
    },

    // ------------------------------------------------------------------------
    // 14. CANCEL SEAT REQUEST
    // ------------------------------------------------------------------------
    {
      id: 'seat_request_cancel',
      category: 'requests',
      categoryLabel: '🙋 Seat Request Queue',
      title: 'Cancel Pending Seat Request',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/seats/requests/cancel',
        auth: 'Bearer <JWT_TOKEN> (Required)',
        description: 'Applicant withdraws their pending seat request before host approval.',
        requestBody: {},
        response: {
          success: true,
          message: 'Seat request cancelled.'
        }
      },
      socket: {
        event: 'seat_request_cancelled',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Notifies host to decrement pending badge count.',
        payload: {
          roomId: 'room-f8a4bc9b',
          userId: 105
        }
      },
      socketParsingCode: `final targetUserId = data['userId'] as int;
    ref.read(pendingRequestsProvider.notifier).removeByUserId(targetUserId);`,
      uiAction: `1. Applicant button reverts back to "Apply for Seat".
2. Host badge counter drops -1.`
    },

    // ------------------------------------------------------------------------
    // 15. ASSIGN ROOM ADMIN / MODERATOR
    // ------------------------------------------------------------------------
    {
      id: 'admin_assign',
      category: 'admin',
      categoryLabel: '🛡️ Admin & Moderation',
      title: 'Assign Room Admin / Moderator',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/admins',
        auth: 'Bearer <JWT_TOKEN> (Host Required)',
        description: 'Grants moderation capabilities (mute, lock, kick) to a trusted viewer.',
        requestBody: {
          user_id: 105
        },
        response: {
          success: true,
          message: 'User assigned as room admin successfully.'
        }
      },
      socket: {
        event: 'room_admin_assigned',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Informs room that user now has moderator badge.',
        payload: {
          roomId: 'room-f8a4bc9b',
          userId: 105,
          assignedBy: 1
        }
      },
      socketParsingCode: `final userId = data['userId'] as int;
    ref.read(roomAdminsProvider.notifier).add(userId);

    if (userId == currentUserId) {
      showSnackbar('🌟 You are now a Room Moderator!');
      ref.read(userRoleProvider.notifier).setModerator(true);
    }`,
      uiAction: `1. Display a Shield badge icon next to Farhan's name in live chat and viewer list.
2. If target is current user, reveal the Moderator Action Bar in the UI.`
    },

    // ------------------------------------------------------------------------
    // 16. REMOVE ROOM ADMIN
    // ------------------------------------------------------------------------
    {
      id: 'admin_remove',
      category: 'admin',
      categoryLabel: '🛡️ Admin & Moderation',
      title: 'Remove Room Admin / Moderator',
      api: {
        method: 'DELETE',
        path: '/api/mobile/live/rooms/:roomId/admins/:userId',
        auth: 'Bearer <JWT_TOKEN> (Host Required)',
        description: 'Revokes moderator privileges from a user.',
        requestBody: {},
        response: {
          success: true,
          message: 'User removed from room admins.'
        }
      },
      socket: {
        event: 'room_admin_removed',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Broadcasts removal of moderator status.',
        payload: {
          roomId: 'room-f8a4bc9b',
          userId: 105,
          removedBy: 1
        }
      },
      socketParsingCode: `final userId = data['userId'] as int;
    ref.read(roomAdminsProvider.notifier).remove(userId);

    if (userId == currentUserId) {
      showToast('Your moderator privileges have been revoked.');
      ref.read(userRoleProvider.notifier).setModerator(false);
    }`,
      uiAction: `1. Remove shield badge from user's chat messages.
2. If current user, hide Moderator action bar.`
    },

    // ------------------------------------------------------------------------
    // 17. KICK & BAN USER FROM ROOM
    // ------------------------------------------------------------------------
    {
      id: 'room_kick_user',
      category: 'admin',
      categoryLabel: '🛡️ Admin & Moderation',
      title: 'Kick & Ban Disruptive User from Room',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/kick',
        auth: 'Bearer <JWT_TOKEN> (Host / Admin Required)',
        description: 'Ejects user from room and blocks re-entry for ban duration.',
        requestBody: {
          user_id: 105,
          reason: 'Disruptive behavior',
          ban_minutes: 60
        },
        response: {
          success: true,
          message: 'User kicked and banned from room successfully.'
        }
      },
      socket: {
        event: 'user_kicked & viewer_left',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Target user receives kick command; all other viewers receive viewer_left.',
        payload: {
          roomId: 'room-f8a4bc9b',
          kickedUserId: 105,
          reason: 'Disruptive behavior',
          bannedUntil: '2026-10-14T19:30:00.000Z'
        }
      },
      socketParsingCode: `final kickedUserId = data['kickedUserId'] as int;
    final reason = data['reason'] ?? 'Violation of community guidelines';

    if (kickedUserId == currentUserId) {
      socket.emit('leave-room', {'roomId': roomId});
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => AlertDialog(
          title: Text('Removed from Stream'),
          content: Text('You were kicked by Host/Admin: \$reason'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop(); // dismiss dialog
                Navigator.of(context).pop(); // exit live screen back to Home
              },
              child: Text('OK'),
            ),
          ],
        ),
      );
    } else {
      ref.read(viewerListProvider.notifier).removeUser(kickedUserId);
    }`,
      uiAction: `1. If current user is kicked:
   - Disconnect socket and WebRTC immediately.
   - Show non-dismissible Dialog with ban reason.
   - Pop back to Explore feed upon tapping OK.
2. For all other viewers: Remove kicked user from viewer avatar list.`
    },

    // ------------------------------------------------------------------------
    // 18. END LIVE STREAM
    // ------------------------------------------------------------------------
    {
      id: 'room_end_stream',
      category: 'admin',
      categoryLabel: '🏠 Room Lifecycle',
      title: 'End Live Stream Broadcast',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/end',
        auth: 'Bearer <JWT_TOKEN> (Host Required)',
        description: 'Host terminates the live broadcast and generates performance summary report.',
        requestBody: {},
        response: {
          success: true,
          message: 'Stream ended successfully.',
          duration_seconds: 1840,
          total_viewers: 250,
          coins_earned: 4500
        }
      },
      socket: {
        event: 'room_ended & stream-terminated',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Informs all participants that the broadcast has ended.',
        payload: {
          roomId: 'room-f8a4bc9b',
          message: 'Stream has ended.',
          reason: 'Stream ended by host'
        }
      },
      socketParsingCode: `final reason = data['reason'] ?? data['message'] ?? 'Stream has ended';

    // Disconnect WebRTC and cleanup:
    disconnectWebRtc();

    // Show summary sheet:
    showModalBottomSheet(
      context: context,
      isDismissible: false,
      enableDrag: false,
      builder: (_) => StreamEndedSummarySheet(
        reason: reason,
        onClose: () => Navigator.of(context).popUntil((route) => route.isFirst),
      ),
    );`,
      uiAction: `1. WebRTC streaming and audio channels immediately close.
2. Present full-screen "Stream Ended" Summary Card.
3. "Return to Explore" button pops navigation back to Home screen.`
    },

    // ------------------------------------------------------------------------
    // 18.1 HOST DISCONNECT / PHONE OFF / APP KILL (AUTO STREAM TERMINATION)
    // ------------------------------------------------------------------------
    {
      id: 'room_host_abnormal_disconnect',
      category: 'admin',
      categoryLabel: '🏠 Room Lifecycle',
      title: 'Host Disconnect / Phone Off (Server Automatic Room Termination)',
      api: {
        method: 'SOCKET_DISCONNECT',
        path: 'io.on("disconnect")',
        auth: 'Automatic Server Event',
        description: 'Fired automatically by the Node.js backend when the Host phone powers off, loses network connection, or kills the app. The server terminates the live stream in MySQL SSOT, purges Redis active room caches, and broadcasts `room_ended` and `stream-terminated` to all participants.',
        requestBody: {},
        response: {
          success: true,
          action: 'room_ended_automatically',
          reason: 'host_disconnected'
        }
      },
      socket: {
        event: 'room_ended & stream-terminated',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Notifies all viewers that the host disconnected abnormally and the room is ended.',
        payload: {
          roomId: 'room-f8a4bc9b',
          message: 'Host disconnected (phone turned off or connection lost). Live stream has ended.',
          reason: 'host_disconnected'
        }
      },
      socketParsingCode: `socket.on('room_ended', (data) => {
  final reason = data['reason'] ?? 'host_disconnected';
  final message = data['message'] ?? 'Live stream has ended.';

  // 1. Terminate LiveKit/WebRTC streaming engine
  liveController.disconnectStreaming();

  // 2. Display end notification
  Get.snackbar('Stream Ended', message, snackPosition: SnackPosition.BOTTOM);

  // 3. Return to Explore screen
  Navigator.of(context).popUntil((route) => route.isFirst);
});`,
      uiAction: `1. Terminate local video/audio streams immediately.
2. Show dismissible bottom sheet or snackbar explaining Host disconnected.
3. Automatically return user to Home/Explore tab.`
    },

    // ------------------------------------------------------------------------
    // 18.2 VIEWER / SEATED USER ABNORMAL DISCONNECT (AUTO SEAT VACATE & COUNTER)
    // ------------------------------------------------------------------------
    {
      id: 'room_viewer_abnormal_disconnect',
      category: 'admin',
      categoryLabel: '👥 Participant Lifecycle',
      title: 'Viewer / Participant Disconnect (Auto Seat Vacate & Viewers Decrement)',
      api: {
        method: 'SOCKET_DISCONNECT',
        path: 'io.on("disconnect")',
        auth: 'Automatic Server Event',
        description: 'Fired automatically by the server when a viewer or seated co-host drops connection. Server decrements active viewers, frees their occupied seat in MySQL SSOT and Redis, and broadcasts `viewer_left`, `room:user-left`, and `seat_freed` into the room channel.',
        requestBody: {},
        response: {
          success: true,
          action: 'participant_cleaned_up'
        }
      },
      socket: {
        event: 'room:user-left & seat_freed & viewer_left',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Real-time broadcast when any user leaves or disconnects from the live room.',
        payload: {
          roomId: 'room-f8a4bc9b',
          user_id: 10,
          seat_index: 3,
          current_viewers: 24,
          reason: 'disconnect'
        }
      },
      socketParsingCode: `// 1. Listen for user departure:
socket.on('room:user-left', (data) => {
  final userId = data['user_id'];
  viewersList.removeWhere((v) => v.id == userId);
});

// 2. Listen for seat release if they were a speaker:
socket.on('seat_freed', (data) => {
  final seatIndex = data['seat_index'];
  seats[seatIndex].user = null;
  seats[seatIndex].isOccupied = false;
});`,
      uiAction: `1. Remove user avatar from live viewer bar.
2. If the user was seated, vacate seat UI with empty placeholder icon.
3. Decrement viewer counter badge.`
    },
    // ------------------------------------------------------------------------
    // 19. LIVE ROOM CHAT - SEND & REAL-TIME BROADCAST
    // ------------------------------------------------------------------------
    {
      id: 'room_chat_send',
      category: 'chat',
      categoryLabel: '💬 Live Room Chat',
      title: 'Send Live Room Chat Message (Real-Time Broadcast)',
      api: {
        method: 'POST',
        path: '/api/mobile/live/rooms/:roomId/messages',
        auth: 'Bearer <JWT_TOKEN> (Required)',
        description: 'Sends a real-time chat message into a live video/audio streaming room. Saves to MySQL SSOT first, invalidates Redis caches, and broadcasts Socket.IO event `new-chat` / `room_message` to all participants and viewers in the room channel.',
        requestBody: {
          message: 'Hello everyone in the live room! 👋',
          message_type: 'text'
        },
        response: {
          success: true,
          message: 'Message sent successfully.',
          data: {
            id: 105,
            roomId: 'room-f8a4bc9b',
            message: 'Hello everyone in the live room! 👋',
            message_type: 'text',
            metadata: null,
            timestamp: '2026-10-15T03:35:00.000Z',
            user: {
              id: 4,
              full_name: 'Rahim Khan',
              avatar_url: 'http://192.168.0.116:5050/uploads/avatars/user_4.jpg',
              vip_level: 2,
              level: 5,
              is_host: false,
              is_admin: false,
              is_speaker: true,
              seat_number: 2
            }
          }
        }
      },
      socket: {
        event: 'new-chat & room_message',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId (All viewers and seated participants)',
        description: 'Emitted immediately after message is saved. Broadcasts sender VIP level, host/admin flags, and seat slot.',
        payload: {
          id: 105,
          roomId: 'room-f8a4bc9b',
          message: 'Hello everyone in the live room! 👋',
          message_type: 'text',
          metadata: null,
          timestamp: '2026-10-15T03:35:00.000Z',
          user: {
            id: 4,
            full_name: 'Rahim Khan',
            avatar_url: 'http://192.168.0.116:5050/uploads/avatars/user_4.jpg',
            vip_level: 2,
            level: 5,
            is_host: false,
            is_admin: false,
            is_speaker: true,
            seat_number: 2
          }
        }
      },
      socketParsingCode: `final msgId = data['id'] as int? ?? 0;
    final text = data['message'] as String? ?? '';
    final userMap = Map<String, dynamic>.from(data['user'] ?? {});

    final chatItem = LiveChatMessageModel(
      id: msgId,
      message: text,
      timestamp: DateTime.tryParse(data['timestamp'] ?? '') ?? DateTime.now(),
      senderId: userMap['id'] as int? ?? 0,
      senderName: userMap['full_name'] as String? ?? 'User',
      avatarUrl: userMap['avatar_url'] as String? ?? '',
      vipLevel: userMap['vip_level'] as int? ?? 0,
      isHost: userMap['is_host'] == true,
      isAdmin: userMap['is_admin'] == true,
      isSpeaker: userMap['is_speaker'] == true,
      seatNumber: userMap['seat_number'] as int?,
    );

    // Append to live room chat stream:
    ref.read(liveChatControllerProvider.notifier).addMessage(chatItem);`,
      uiAction: `1. Append new LiveChatMessageModel to local message list.
2. Auto-scroll Chat ListView smoothly to bottom (if user hasn't scrolled up).
3. Render VIP badge, host crown, moderator shield, and colored chat bubble based on sender privileges.`
    },
    // ------------------------------------------------------------------------
    // 20. LIVE ROOM CHAT - DELETE MESSAGE
    // ------------------------------------------------------------------------
    {
      id: 'room_chat_delete',
      category: 'chat',
      categoryLabel: '💬 Live Room Chat',
      title: 'Delete Live Room Chat Message',
      api: {
        method: 'DELETE',
        path: '/api/mobile/live/rooms/:roomId/messages/:messageId',
        auth: 'Bearer <JWT_TOKEN> (Sender, Host or Admin Required)',
        description: 'Deletes a chat message from the live room. Deletes from MySQL SSOT, clears Redis cache, and emits `chat_message_deleted` to the room channel.',
        requestBody: {},
        response: {
          success: true,
          message: 'Message deleted successfully.',
          deleted_id: 105
        }
      },
      socket: {
        event: 'chat_message_deleted',
        direction: 'Server ➔ Room Broadcast',
        channel: 'roomId',
        description: 'Informs room occupants that a chat message was deleted by author or moderator.',
        payload: {
          roomId: 'room-f8a4bc9b',
          messageId: 105,
          deletedBy: 4
        }
      },
      socketParsingCode: `final deletedId = data['messageId'] as int;
    ref.read(liveChatControllerProvider.notifier).removeMessage(deletedId);`,
      uiAction: `1. Remove message with id == messageId from Chat ListView.
2. Trigger subtle fade-out animation.`
    },
    // ------------------------------------------------------------------------
    // 21. WALLET CASHOUT - COIN VS DIAMOND
    // ------------------------------------------------------------------------
    {
      id: 'wallet_cashout_request',
      category: 'wallet',
      categoryLabel: '💰 Cashout & Wallet',
      title: 'Cashout Withdrawal Request (Coin or Diamond Mode)',
      api: {
        method: 'POST',
        path: '/api/mobile/wallet/withdraw',
        auth: 'Bearer <JWT_TOKEN> (Required)',
        description: 'Submits a payout cashout request. Dynamically checks `is_convert_to_diamond` setting: if false, deducts coins; if true, deducts diamonds. Executes atomic MySQL transaction and updates balances.',
        requestBody: {
          amount: 25000,
          paymentMethod: 'bKash',
          accountDetails: '01712345678 (Personal)'
        },
        response: {
          success: true,
          message: 'Withdrawal request submitted for review.',
          mode: 'coin',
          withdrawnAmount: 25000,
          currency: 'coins',
          currencySymbol: '🪙',
          balanceRemaining: 5000,
          usdAmount: '125.00',
          payoutAmount: '1250.00',
          payoutCurrency: 'BDT'
        }
      },
      socket: {
        event: 'wallet_balance_updated',
        direction: 'Server ➔ User Private Channel',
        channel: 'user_{userId}',
        description: 'Real-time balance update notifying mobile client that coins/diamonds were deducted for cashout.',
        payload: {
          userId: 4,
          type: 'cashout_submitted',
          mode: 'coin',
          currency: 'coins',
          currency_symbol: '🪙',
          deductedAmount: 25000,
          coins: 5000,
          diamonds: 1200,
          status: 'pending',
          timestamp: '2026-10-15T03:30:00.000Z'
        }
      },
      socketParsingCode: `final newCoins = data['coins'] as int? ?? 0;
    final newDiamonds = data['diamonds'] as int? ?? 0;
    final currencySymbol = data['currency_symbol'] as String? ?? '🪙';
    final deducted = data['deductedAmount'] as int? ?? 0;

    // Update wallet state:
    ref.read(walletControllerProvider.notifier).updateBalance(
      coins: newCoins,
      diamonds: newDiamonds,
    );

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Cashout request of $currencySymbol $deducted submitted!')),
    );`,
      uiAction: `1. Immediately update header coin/diamond balance counter.
2. In Cashout History screen, insert new row at top showing '🪙 25,000 Coins (Pending)'.`
    },
    // ------------------------------------------------------------------------
    // 22. 1-ON-1 DIRECT MESSAGE - REAL-TIME SEND OVER SOCKET
    // ------------------------------------------------------------------------
    {
      id: 'dm_send_message',
      category: 'dm_chat',
      categoryLabel: '💌 1-on-1 Direct Messages',
      title: 'Send 1-on-1 Direct Message (Real-Time Socket Event)',
      api: {
        method: 'POST',
        path: '/api/mobile/chat/messages',
        auth: 'Bearer <JWT_TOKEN> (Required)',
        description: 'REST API fallback for sending 1-on-1 chat messages. Alternatively and preferably, clients can emit `chat:send_message` directly over the Socket.IO connection for sub-10ms delivery without HTTP round-trip.',
        requestBody: {
          receiver_id: 2,
          message: 'Hello, are you available for a voice call? 📞',
          message_type: 'text',
          conversation_id: 1
        },
        response: {
          success: true,
          message: 'Message sent successfully.',
          data: {
            id: 108,
            conversation_id: 1,
            sender_id: 1,
            receiver_id: 2,
            message_type: 'text',
            message: 'Hello, are you available for a voice call? 📞',
            media_url: null,
            is_read: false,
            created_at: '2026-10-15T07:05:00.000Z',
            sender: {
              id: 1,
              name: 'System Admin',
              profile_picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              role: 'user',
              level: 12,
              star: 3,
              package_category: {
                id: 1,
                name: 'VIP Platinum',
                badge_icon: 'https://api.umilive.com/uploads/badges/vip_platinum.png',
                color_code: '#eab308'
              }
            }
          }
        }
      },
      socket: {
        event: 'chat:send_message (Client) ➔ chat:new_message (Broadcast)',
        direction: 'Client ➔ Server ➔ Recipient Room user_{receiverId}',
        channel: 'user_{receiverId}, user_{senderId}, conversation_{conversationId}',
        description: 'Sends a direct message directly over Socket.IO connection. The backend executes MySQL SSOT insert into `chat_messages`, commits transaction, invalidates Redis caches, immediately acknowledges via callback, and broadcasts `chat:new_message` to the recipient user room.',
        payload: {
          message: {
            id: 108,
            conversation_id: 1,
            sender_id: 1,
            receiver_id: 2,
            message_type: 'text',
            message: 'Hello, are you available for a voice call? 📞',
            media_url: null,
            is_read: false,
            created_at: '2026-10-15T07:05:00.000Z',
            sender: {
              id: 1,
              name: 'System Admin',
              profile_picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              role: 'user',
              level: 12,
              star: 3,
              package_category: {
                id: 1,
                name: 'VIP Platinum',
                badge_icon: 'https://api.umilive.com/uploads/badges/vip_platinum.png',
                color_code: '#eab308'
              }
            }
          },
          conversation_id: 1,
          sender_id: 1,
          receiver_id: 2
        }
      },
      socketParsingCode: `// 1. Send Direct Message over Socket.IO (with Ack confirmation):
    socket.emitWithAck('chat:send_message', {
      'receiverId': recipientUserId,
      'message': messageText,
      'type': 'text', // 'text' | 'image' | 'video' | 'audio'
      'conversationId': conversationId,
    }, ack: (response) {
      if (response != null && response['success'] == true) {
        final sentData = Map<String, dynamic>.from(response['message'] ?? response['data'] ?? {});
        final confirmedMsg = DirectChatMessage.fromJson(sentData);
        ref.read(chatMessagesProvider(conversationId).notifier).confirmMessageSent(confirmedMsg);
      }
    });

    // 2. Listen for Incoming 1-on-1 Messages (both sender & receiver):
    socket.on('chat:new_message', (data) {
      if (data == null) return;
      final payload = Map<String, dynamic>.from(data);
      final msgMap = Map<String, dynamic>.from(payload['message'] ?? {});
      final newMsg = DirectChatMessage.fromJson(msgMap);

      // Append to active chat screen:
      ref.read(chatMessagesProvider(newMsg.conversationId).notifier).addMessage(newMsg);

      // Update Inbox list snippet and unread count:
      ref.read(inboxConversationsProvider.notifier).updateSnippet(
        conversationId: newMsg.conversationId,
        snippet: newMsg.message,
        timestamp: newMsg.createdAt,
        incrementUnread: newMsg.senderId != currentUserId,
      );
    });`,
      uiAction: `1. Immediately render message locally with 'sending' indicator.
2. Upon receiving Socket.IO Ack callback, switch status to 'sent' (single checkmark).
3. Recipient device receives 'chat:new_message', renders in active chat room, or triggers push notification and inbox unread badge increment.`
    },
    // ------------------------------------------------------------------------
    // 23. 1-ON-1 TYPING INDICATOR
    // ------------------------------------------------------------------------
    {
      id: 'dm_typing_indicator',
      category: 'dm_chat',
      categoryLabel: '💌 1-on-1 Direct Messages',
      title: '1-on-1 Real-Time Typing Indicator',
      api: {
        method: 'SOCKET ONLY',
        path: 'socket.emit("chat:typing")',
        auth: 'Bearer <JWT_TOKEN> (Required)',
        description: 'Lightweight real-time event to indicate that the user has started or stopped typing in the private chat box. Directly routed to recipient room with zero database overhead.',
        requestBody: {
          receiverId: 2,
          conversationId: 1,
          isTyping: true
        },
        response: {
          success: true,
          message: 'Typing state emitted.'
        }
      },
      socket: {
        event: 'chat:typing (Client) ➔ chat:user_typing (Recipient Broadcast)',
        direction: 'Client ➔ Server ➔ user_{receiverId}',
        channel: 'user_{receiverId} & conversation_{conversationId}',
        description: 'Broadcasts typing state directly to recipient room. Auto-debounced on client.',
        payload: {
          conversation_id: 1,
          sender_id: 1,
          is_typing: true
        }
      },
      socketParsingCode: `// 1. Emit typing event when TextField changes:
    void onChatTextChanged(String text) {
      final isTyping = text.trim().isNotEmpty;
      socket.emit('chat:typing', {
        'receiverId': targetUserId,
        'conversationId': conversationId,
        'isTyping': isTyping,
      });
    }

    // 2. Listen for incoming typing status from the other user:
    socket.on('chat:user_typing', (data) {
      if (data == null) return;
      final payload = Map<String, dynamic>.from(data);
      if (payload['sender_id'] == targetUserId) {
        final bool isTyping = payload['is_typing'] == true;
        ref.read(typingIndicatorProvider(conversationId).notifier).state = isTyping;
      }
    });`,
      uiAction: `1. When is_typing == true, show animated '...' dots or 'User is typing...' in AppBar subtitle.
2. Auto-hide when is_typing == false or after 4 seconds of inactivity.`
    },
    // ------------------------------------------------------------------------
    // 24. 1-ON-1 MARK AS READ & READ RECEIPTS
    // ------------------------------------------------------------------------
    {
      id: 'dm_mark_read',
      category: 'dm_chat',
      categoryLabel: '💌 1-on-1 Direct Messages',
      title: 'Real-Time Mark as Read & Read Receipts',
      api: {
        method: 'POST',
        path: '/api/mobile/chat/conversations/:conversationId/read',
        auth: 'Bearer <JWT_TOKEN> (Required)',
        description: 'Marks all unread messages in the conversation as read. Supports both REST API and real-time socket event `chat:mark_read`. Executes MySQL SSOT update, invalidates Redis caches, and alerts the sender via `chat:messages_read`.',
        requestBody: {
          conversationId: 1,
          senderId: 1
        },
        response: {
          success: true,
          message: 'Messages marked as read.'
        }
      },
      socket: {
        event: 'chat:mark_read (Client) ➔ chat:messages_read (Sender Broadcast)',
        direction: 'Client ➔ Server ➔ user_{senderId}',
        channel: 'user_{senderId} & conversation_{conversationId}',
        description: 'Emitted when user opens or scrolls through a conversation. Updates messages to `is_read = 1`, clears Redis keys, and notifies the original sender in real-time.',
        payload: {
          conversation_id: 1,
          read_by: 2
        }
      },
      socketParsingCode: `// 1. Emit mark read when opening chat screen:
    socket.emitWithAck('chat:mark_read', {
      'conversationId': conversationId,
      'senderId': otherUserId,
    }, ack: (response) {
      // Clear unread badge in local inbox store:
      ref.read(inboxConversationsProvider.notifier).clearUnread(conversationId);
    });

    // 2. Listen for when other user reads your sent messages:
    socket.on('chat:messages_read', (data) {
      if (data == null) return;
      final payload = Map<String, dynamic>.from(data);
      if (payload['conversation_id'] == conversationId) {
        // Change checkmark to double blue checkmarks (read state):
        ref.read(chatMessagesProvider(conversationId).notifier).markAllMessagesAsRead();
      }
    });`,
      uiAction: `1. Change message status icon from single checkmark (sent) to double checkmark (delivered/read).
2. Clear unread badge on bottom navigation bar / inbox tab.`
    },
    // ------------------------------------------------------------------------
    // 25. 1-ON-1 INBOX REAL-TIME CONVERSATION SYNC
    // ------------------------------------------------------------------------
    {
      id: 'dm_conversation_update',
      category: 'dm_chat',
      categoryLabel: '💌 1-on-1 Direct Messages',
      title: 'Inbox Real-Time Sync (Conversations List)',
      api: {
        method: 'GET',
        path: '/api/mobile/chat/conversations',
        auth: 'Bearer <JWT_TOKEN> (Required)',
        description: 'Fetches paginated user inbox conversations from Redis/MySQL cache-aside. Active sockets additionally receive real-time `chat:conversation_update` pushes to reorder conversations dynamically.',
        requestBody: {},
        response: {
          success: true,
          data: [
            {
              id: 1,
              other_user: {
                id: 2,
                name: 'Karim Ullah',
                avatar_url: 'http://192.168.0.116:5050/uploads/avatars/user_2.jpg'
              },
              last_message: 'Hello, are you available for a voice call? 📞',
              last_message_at: '2026-10-15T07:05:00.000Z',
              unread_count: 1
            }
          ]
        }
      },
      socket: {
        event: 'chat:conversation_update',
        direction: 'Server ➔ user_{userId}',
        channel: 'user_{userId}',
        description: 'Fired automatically whenever a new message is sent. Updates the inbox item with latest message snippet, timestamp, and increments unread count without refetching the full list.',
        payload: {
          conversation_id: 1,
          last_message: 'Hello, are you available for a voice call? 📞',
          last_message_at: '2026-10-15T07:05:00.000Z',
          sender_id: 1,
          unread_increment: true
        }
      },
      socketParsingCode: `// Listen for conversation updates in Inbox Screen:
    socket.on('chat:conversation_update', (data) {
      if (data == null) return;
      final payload = Map<String, dynamic>.from(data);
      
      final int convId = payload['conversation_id'] as int;
      final String snippet = payload['last_message'] as String? ?? '';
      final String timestamp = payload['last_message_at'] as String? ?? '';
      final bool unreadInc = payload['unread_increment'] == true;

      ref.read(inboxConversationsProvider.notifier).applyRealtimeUpdate(
        conversationId: convId,
        snippet: snippet,
        lastMessageAt: DateTime.tryParse(timestamp) ?? DateTime.now(),
        incrementUnread: unreadInc,
      );
    });`,
      uiAction: `1. Move updated conversation item to top of Inbox list with animated list reordering.
2. Update preview snippet and relative timestamp ('Just now').
3. Increment unread message badge count if message was sent by other party.`
    },
  ], []);

  const filteredEndpoints = useMemo(() => {
    return endpointsCatalog.filter((ep) => {
      const matchCat = selectedCategory === 'all' || ep.category === selectedCategory;
      const matchSearch =
        searchQuery === '' ||
        ep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.api.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.socket.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [endpointsCatalog, selectedCategory, searchQuery]);

  return (
    <div className="socket-docs-view" style={{ animation: 'fadeIn 0.25s ease-in-out' }}>
      {/* Top Banner */}
      <div
        className="panel-card"
        style={{
          padding: '1.75rem',
          borderRadius: '18px',
          marginBottom: '1.75rem',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(2, 132, 199, 0.05) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          borderLeft: '6px solid #7c3aed',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #0284c7 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                }}
              >
                <Zap size={24} />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                Live Room & Multi-Seat: 3-Pillar Integration Specs
              </h1>
              <span className="badge badge-primary" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                API ➔ Socket ➔ AI Prompt
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', margin: 0, maxWidth: '880px', lineHeight: 1.6 }}>
              প্রতিটি এন্ডপয়েন্টের জন্য ৩টি সুনির্দিষ্ট সেকশন সাজানো হয়েছে: <strong>(১) REST API Endpoint</strong>, <strong>(২) Real-Time Socket Event & Data Format</strong>, এবং <strong>(৩) Complete Flutter AI Prompt</strong> যার ভেতরে ডাটা ফরম্যাট এবং তা লিসেন ও পার্স করার ডার্ট কোড সরাসরি ইনক্লুডেড আছে।
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Socket Server:</span>
              <code style={{ color: '#7c3aed', fontWeight: 800 }}>{baseUrl.replace('http', 'ws')}</code>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                fontSize: '0.78rem',
              }}
            >
              <Smartphone size={14} color="#0284c7" />
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Client Package:</span>
              <code style={{ color: '#0284c7', fontWeight: 800 }}>socket_io_client: ^3.0.2</code>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="panel-card"
        style={{
          padding: '1.25rem',
          borderRadius: '16px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search by API path, socket event, or action name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ borderRadius: '10px', paddingLeft: '1rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Endpoints' },
            { id: 'dm_chat', label: '💌 1-on-1 Direct Messages' },
            { id: 'chat', label: '💬 Live Room Chat' },
            { id: 'wallet', label: '💰 Cashout & Wallet' },
            { id: 'seats', label: '🎙️ Seat Controls' },
            { id: 'requests', label: '🙋 Seat Requests' },
            { id: 'admin', label: '🛡️ Admin & Moderation' },
          ].map((c) => {
            const isSel = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className="btn btn-sm"
                style={{
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: isSel ? 'var(--primary-color, #7c3aed)' : 'var(--bg-primary)',
                  color: isSel ? '#fff' : 'var(--text-dim)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Endpoints List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredEndpoints.map((item) => {
          const isExpanded = expandedId === item.id;
          const currentSubTab = getActiveSubTab(item.id);
          const enrichedPrompt = getEnrichedPrompt(item);

          return (
            <div
              key={item.id}
              className="panel-card"
              style={{
                borderRadius: '16px',
                border: isExpanded ? '1px solid rgba(124, 58, 237, 0.45)' : '1px solid var(--border-color)',
                boxShadow: isExpanded ? '0 8px 24px rgba(124, 58, 237, 0.09)' : 'var(--shadow-sm)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Header Bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                style={{
                  padding: '1.15rem 1.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isExpanded ? 'rgba(124, 58, 237, 0.03)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: item.api.method === 'POST' ? 'rgba(124, 58, 237, 0.15)' : 'rgba(225, 29, 72, 0.15)',
                      color: item.api.method === 'POST' ? '#7c3aed' : '#e11d48',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                    }}
                  >
                    {item.api.method}
                  </span>

                  <code style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {item.api.path}
                  </code>

                  <ArrowRight size={14} color="var(--text-dim)" />

                  <span
                    style={{
                      background: 'rgba(2, 132, 199, 0.12)',
                      color: '#0284c7',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                    }}
                  >
                    ⚡ {item.socket.event}
                  </span>

                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {item.title}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(enrichedPrompt, `hdr_prompt_${item.id}`);
                    }}
                    className="btn btn-sm"
                    style={{
                      background: 'rgba(5, 150, 105, 0.12)',
                      color: '#059669',
                      border: '1px solid rgba(5, 150, 105, 0.3)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Quick Copy AI Prompt"
                  >
                    {copiedKey === `hdr_prompt_${item.id}` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedKey === `hdr_prompt_${item.id}` ? 'Copied!' : 'Copy Prompt'}</span>
                  </button>

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>
                    {item.categoryLabel}
                  </span>
                  {isExpanded ? <ChevronUp size={18} color="var(--text-dim)" /> : <ChevronDown size={18} color="var(--text-dim)" />}
                </div>
              </div>

              {/* Expanded 3-Pillar Body */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                  {/* Sub-Tab Navigation Bar */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      padding: '0.75rem 1.4rem',
                      background: 'var(--bg-secondary)',
                      borderBottom: '1px solid var(--border-color)',
                      flexWrap: 'wrap',
                    }}
                  >
                    {[
                      { id: 'prompt', label: '3. Full AI Agent Prompt (With Data Format & Listener)', icon: Bot, color: '#059669', badge: 'RECOMMENDED' },
                      { id: 'socket', label: '2. Socket Data Format', icon: Zap, color: '#0284c7' },
                      { id: 'api', label: '1. REST API Endpoint', icon: Terminal, color: '#7c3aed' },
                    ].map((st) => {
                      const isActive = currentSubTab === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setActiveSubTab(item.id, st.id)}
                          className="btn btn-sm"
                          style={{
                            borderRadius: '8px',
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isActive ? st.color : 'transparent',
                            color: isActive ? '#fff' : 'var(--text-dim)',
                            border: isActive ? 'none' : '1px solid var(--border-color)',
                          }}
                        >
                          <st.icon size={14} />
                          <span>{st.label}</span>
                          {st.badge && (
                            <span
                              style={{
                                background: isActive ? 'rgba(255, 255, 255, 0.3)' : 'rgba(5, 150, 105, 0.15)',
                                color: isActive ? '#fff' : '#059669',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.65rem',
                              }}
                            >
                              {st.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* PILLAR 3: FULL ENRICHED AI PROMPT (DEFAULT TAB) */}
                  {currentSubTab === 'prompt' && (
                    <div style={{ padding: '1.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Bot size={16} color="#059669" />
                            <span>100% Self-Contained AI Integration Prompt:</span>
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                            Includes: API Call + Incoming Socket JSON Data Format + Typed Dart Listener + UI Update Rules.
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy(enrichedPrompt, `prompt_${item.id}`)}
                          className="btn btn-sm btn-primary"
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            borderRadius: '10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                            border: 'none',
                          }}
                        >
                          {copiedKey === `prompt_${item.id}` ? <Check size={14} color="#fff" /> : <Copy size={14} />}
                          <span>{copiedKey === `prompt_${item.id}` ? 'Copied Prompt!' : 'Copy Full AI Prompt'}</span>
                        </button>
                      </div>

                      <pre
                        style={{
                          background: '#0f172a',
                          color: '#f8fafc',
                          padding: '1.25rem',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontFamily: 'monospace',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          margin: 0,
                          maxHeight: '420px',
                          overflowY: 'auto',
                        }}
                      >
                        {enrichedPrompt}
                      </pre>
                    </div>
                  )}

                  {/* PILLAR 1: REST API ENDPOINT DETAILS */}
                  {currentSubTab === 'api' && (
                    <div style={{ padding: '1.4rem' }}>
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', marginBottom: '1rem', lineHeight: 1.6 }}>
                        {item.api.description}
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                              Endpoint & Headers:
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleCopy(`${baseUrl}${item.api.path}`, `url_${item.id}`)}
                                className="btn btn-sm btn-secondary"
                                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                              >
                                {copiedKey === `url_${item.id}` ? 'Copied URL' : 'Copy URL'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const curlCmd = `curl -X ${item.api.method} "${baseUrl}${item.api.path}" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json"${item.api.method !== 'GET' && Object.keys(item.api.requestBody || {}).length > 0 ? ` \\\n  -d '${JSON.stringify(item.api.requestBody, null, 2)}'` : ''}`;
                                  handleCopy(curlCmd, `curl_${item.id}`);
                                }}
                                className="btn btn-sm btn-secondary"
                                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                              >
                                {copiedKey === `curl_${item.id}` ? 'Copied cURL' : 'Copy cURL'}
                              </button>
                            </div>
                          </div>
                          <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '10px', color: '#f8fafc', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                            <div style={{ color: '#38bdf8' }}>{item.api.method} {item.api.path}</div>
                            <div style={{ color: '#94a3b8', marginTop: '4px' }}>Authorization: {item.api.auth}</div>
                            <div style={{ color: '#94a3b8' }}>Content-Type: application/json</div>
                          </div>

                          <div style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                                Request Body (JSON):
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(JSON.stringify(item.api.requestBody, null, 2), `body_${item.id}`)}
                                className="btn btn-sm btn-secondary"
                                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                              >
                                {copiedKey === `body_${item.id}` ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <pre style={{ background: '#0f172a', color: '#f8fafc', padding: '1rem', borderRadius: '10px', fontSize: '0.76rem', fontFamily: 'monospace', margin: 0 }}>
                              {JSON.stringify(item.api.requestBody, null, 2)}
                            </pre>
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                              ✅ Expected HTTP 200/201 Response:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(JSON.stringify(item.api.response, null, 2), `res_${item.id}`)}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                            >
                              {copiedKey === `res_${item.id}` ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <pre style={{ background: '#0f172a', color: '#10b981', padding: '1rem', borderRadius: '10px', fontSize: '0.76rem', fontFamily: 'monospace', margin: 0, maxHeight: '250px', overflowY: 'auto' }}>
                            {JSON.stringify(item.api.response, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PILLAR 2: REAL-TIME SOCKET DATA FORMAT */}
                  {currentSubTab === 'socket' && (
                    <div style={{ padding: '1.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          Socket Event Triggered:
                        </span>
                        <code style={{ fontSize: '0.92rem', color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                          {item.socket.event}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.socket.event, `ev_${item.id}`)}
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                        >
                          {copiedKey === `ev_${item.id}` ? 'Copied Event' : 'Copy Event'}
                        </button>
                        <span style={{ fontSize: '0.75rem', color: '#059669', background: 'rgba(5, 150, 105, 0.1)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          {item.socket.direction}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginBottom: '1rem', lineHeight: 1.5 }}>
                        {item.socket.description}
                      </p>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                            📦 Real-Time Event Data Format (JSON Payload):
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(JSON.stringify(item.socket.payload, null, 2), `sock_${item.id}`)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                          >
                            {copiedKey === `sock_${item.id}` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                            <span>{copiedKey === `sock_${item.id}` ? 'Copied!' : 'Copy Socket JSON'}</span>
                          </button>
                        </div>
                        <pre style={{ background: '#0f172a', color: '#38bdf8', padding: '1.25rem', borderRadius: '12px', fontSize: '0.78rem', fontFamily: 'monospace', overflowX: 'auto', margin: 0 }}>
                          {JSON.stringify(item.socket.payload, null, 2)}
                        </pre>
                      </div>

                      {/* Typed Dart Listener Code */}
                      {item.socketParsingCode && (
                        <div style={{ marginTop: '1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                              🎯 Typed Dart Listener & Parsing Code:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.socketParsingCode, `dart_${item.id}`)}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                            >
                              {copiedKey === `dart_${item.id}` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                              <span>{copiedKey === `dart_${item.id}` ? 'Copied!' : 'Copy Dart Code'}</span>
                            </button>
                          </div>
                          <pre style={{ background: '#0f172a', color: '#a5f3fc', padding: '1.25rem', borderRadius: '12px', fontSize: '0.78rem', fontFamily: 'monospace', overflowX: 'auto', margin: 0 }}>
                            {item.socketParsingCode}
                          </pre>
                        </div>
                      )}

                      {/* UI Actions & State Update Rules */}
                      {item.uiAction && (
                        <div style={{ marginTop: '1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase' }}>
                              🎨 UI Actions & State Update Rules:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.uiAction, `ui_${item.id}`)}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                            >
                              {copiedKey === `ui_${item.id}` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                              <span>{copiedKey === `ui_${item.id}` ? 'Copied!' : 'Copy UI Rules'}</span>
                            </button>
                          </div>
                          <pre style={{ background: '#0f172a', color: '#fef08a', padding: '1rem', borderRadius: '12px', fontSize: '0.78rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>
                            {item.uiAction}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
