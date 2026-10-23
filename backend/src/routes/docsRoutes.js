import express from 'express';

const router = express.Router();

export const API_SPEC = {
  "title": "Umi Live Mobile REST API Explorer",
  "version": "1.0.0",
  "description": "Official REST API Documentation & Interactive Explorer for Umi Live Mobile App (Flutter / Android / iOS).",
  "baseUrls": [
    {
      "name": "Local Development",
      "url": "http://localhost:5050"
    },
    {
      "name": "Docker Network",
      "url": "http://umi_backend:5050"
    },
    {
      "name": "Current Origin",
      "url": "http://localhost:5050"
    }
  ],
  "categories": [
    {
      "id": "themes",
      "name": "🎨 App Themes & Styling",
      "description": "Customizable mobile app visual themes: full-screen page background wallpapers, modal bottom sheet images, and vibrant accent color palettes with coin store purchases, auto-equip, and system defaults."
    },
    {
      "id": "leaderboard",
      "name": "🏆 Leaderboard & Top Rankings",
      "description": "Global mobile rankings for top virtual gifters (daily, weekly, monthly, all-time) and top agencies sorted by coin revenue and host count."
    },
    {
      "id": "banners",
      "name": "🖼️ Promotional & Home Banners",
      "description": "Public carousel banners for mobile explore and home feeds, active date ranges, and deep-link click actions."
    },
    {
      "id": "chat",
      "name": "💬 Direct Messaging & Chat",
      "description": "1-on-1 private direct messaging system: conversation inbox list, reply/quote to specific messages (reply_to_id), send text and multiple device media files (images/videos/audios), shared custom chat backgrounds (set/remove for both users), clear chat history for caller only, delete/hide conversations, real-time Socket.IO events, and Redis caching."
    },
    {
      "id": "feed",
      "name": "📰 News Feed & Community Posts",
      "description": "Community social news feed: create posts with multiple images, videos, audio clips, Redis cached feed with is_mine flag, reactions with VIP badges, and nested comments/replies."
    },
    {
      "id": "config",
      "name": "🔧 Bootstrap & Configuration",
      "description": "Application initialization, real-time socket credentials, active currency mode, and media CDN URLs."
    },
    {
      "id": "auth",
      "name": "🔐 Authentication & Account",
      "description": "User registration, login, JWT token issuance, profile synchronization, and avatar upload."
    },
    {
      "id": "live-rooms",
      "name": "🎥 Live - Room Management",
      "description": "Browse live streams, create rooms (video/audio), join as viewer, leave, and end stream. Full room lifecycle."
    },
    {
      "id": "live-viewers",
      "name": "👥 Live - Viewers & Participants",
      "description": "Get the live list of viewers currently inside a room with their profile, VIP badge, coins, and package info."
    },
    {
      "id": "live-seats",
      "name": "🪑 Live - Seat Management",
      "description": "Video/Audio live seat request system: request a seat, host approve/reject, applicant cancel, dynamic audio seat count scaling."
    },
    {
      "id": "live-admins",
      "name": "🛡️ Live - Room Admins & Moderators",
      "description": "List room admins/host, assign moderators, and remove admin privileges inside a live room."
    },
    {
      "id": "gifts",
      "name": "🎁 Virtual Gifts & Animations",
      "description": "Virtual gifts catalog, real-time gifting to any user, and animations."
    },
    {
      "id": "wallet",
      "name": "💰 Wallet, Coins & Cashout",
      "description": "User coin balance, recharge packages, coin purchases, diamond cashout withdrawal, and transaction history."
    },
    {
      "id": "vip",
      "name": "👑 VIP Store & Privileges",
      "description": "VIP tiers, subscription packages, active privilege query, and special entrance effects."
    },
    {
      "id": "reseller",
      "name": "🛍️ Reseller Portal & Top-up",
      "description": "Reseller coin stock check, customer user search & selection, coin recharge/transfers to customers, and transaction audit management."
    },
    {
      "id": "moderator",
      "name": "🛡️ Moderator - User & Device Ban Controls",
      "description": "Moderator tools to search users, inspect all logged-in mobile devices, ban/unban user accounts, and enforce hardware device bans."
    },
    {
      "id": "host-performance",
      "name": "🎤 Host - Agency Membership & Streaming Earnings",
      "description": "Host portal to track current agency affiliation, audio/video host type, daily/monthly streaming duration, coins earned, and agency commission breakdown."
    },
    {
      "id": "agency-management",
      "name": "🏢 Agency - Management & Host Moderation",
      "description": "Mobile agency management portal: agency metrics & commissions, host roster, timed live broadcast suspension/ban, ban duration tracking & unban, and incoming recruitment application approvals."
    },
    {
      "id": "entry-effects",
      "name": "✨ Entry Effects Store & Animations",
      "description": "Store catalog of interactive entrance effects (SVGA, GIF, sound), coin purchase, user owned inventory, and live room entrance animation switch/toggle."
    },
    {
      "id": "thumbnails",
      "name": "🖼️ Special Avatar Thumbnails & Frames",
      "description": "Store catalog of special avatar frames, coin purchase, user owned inventory, and profile/live seat avatar frame switch/toggle."
    },
    {
      "id": "notifications",
      "name": "🔔 Firebase FCM Push Notifications & Deep Linking",
      "description": "Unified mobile push notification system: device FCM token registration & multi-device synchronization, and automated payload schemas for Direct Messages, Post Comments, Comment Replies, Follower New Posts, Live Stream Alerts, and Flutter deep-linking click actions."
    },
    {
      "id": "user-profile",
      "name": "👤 User Profile, Social Graph & Moderation",
      "description": "Public profile inspection of any user (country, role, level, VIP package category & image, bio, mutual follow state, followers/following/posts counts, coin balance, received & gifted coins, share link), user posts stream, follow/unfollow, block/unblock, and user safety reporting."
    }
  ],
  "endpoints": [
    {
      "id": "notifications-specs",
      "category": "notifications",
      "method": "GET",
      "path": "/api/mobile/notifications/specs",
      "summary": "FCM Push Notification Payload Schemas & Flutter Deep Linking Guide",
      "description": "Comprehensive specification of all 5 incoming Firebase Cloud Messaging (FCM) push notification payload schemas. Mobile clients (Flutter/Android/iOS) listen to FirebaseMessaging.onMessage and FirebaseMessaging.onMessageOpenedApp, extract the 'data' map, read 'route' or 'target_screen', and navigate seamlessly to the appropriate page (/chat-details, /post-details, /video-live, /audio-live).",
      "requiresAuth": false,
      "requestHeaders": [],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Full specifications of all 5 push notification payloads with deep-linking guidance.",
          "example": {
            "success": true,
            "title": "Umi Live Firebase FCM Push Notification & Deep Linking Specification",
            "android_channel": {
              "channel_id": "umi_chat_messages",
              "channel_name": "Umi Live Notifications",
              "importance": "HIGH",
              "sound": "default"
            },
            "payload_types": [
              {
                "type": "direct_message",
                "category": "dm",
                "target_screen": "chat_details",
                "route": "/chat-details",
                "click_action": "FLUTTER_NOTIFICATION_CLICK",
                "sample_data": {
                  "notification_category": "dm",
                  "type": "direct_message",
                  "target_screen": "chat_details",
                  "route": "/chat-details",
                  "conversation_id": "3",
                  "sender_id": "10",
                  "sender_name": "Nila Akter",
                  "sender_avatar": "/uploads/avatars/nila.jpg",
                  "message": "Hello brother! How are you doing today?",
                  "chat_type": "text"
                },
                "flutter_navigation_example": "Get.toNamed('/chat-details', arguments: {'conversationId': int.parse(data['conversation_id']), 'partnerId': int.parse(data['sender_id']), 'partnerName': data['sender_name']});"
              },
              {
                "type": "post_comment",
                "category": "post",
                "target_screen": "post_details",
                "route": "/post-details",
                "click_action": "FLUTTER_NOTIFICATION_CLICK",
                "sample_data": {
                  "notification_category": "post",
                  "type": "post_comment",
                  "target_screen": "post_details",
                  "route": "/post-details",
                  "post_id": "2",
                  "comment_id": "14",
                  "is_reply": "false",
                  "commenter_id": "4",
                  "commenter_name": "Tanvir Ahmed",
                  "content": "Awesome broadcast today! Keep it up 🔥"
                },
                "flutter_navigation_example": "Get.toNamed('/post-details', arguments: {'postId': int.parse(data['post_id'])});"
              },
              {
                "type": "comment_reply",
                "category": "post",
                "target_screen": "post_details",
                "route": "/post-details",
                "click_action": "FLUTTER_NOTIFICATION_CLICK",
                "sample_data": {
                  "notification_category": "post",
                  "type": "comment_reply",
                  "target_screen": "post_details",
                  "route": "/post-details",
                  "post_id": "2",
                  "comment_id": "15",
                  "parent_id": "4",
                  "is_reply": "true",
                  "replier_id": "7",
                  "replier_name": "নিবিড়",
                  "content": "Thanks a lot brother!"
                },
                "flutter_navigation_example": "Get.toNamed('/post-details', arguments: {'postId': int.parse(data['post_id']), 'highlightCommentId': int.parse(data['comment_id'])});"
              },
              {
                "type": "new_post",
                "category": "post",
                "target_screen": "post_details",
                "route": "/post-details",
                "click_action": "FLUTTER_NOTIFICATION_CLICK",
                "sample_data": {
                  "notification_category": "post",
                  "type": "new_post",
                  "target_screen": "post_details",
                  "route": "/post-details",
                  "post_id": "8",
                  "author_id": "10",
                  "author_name": "Nila Akter",
                  "title": "Sharing our moments from the live contest 📸",
                  "media_type": "image"
                },
                "flutter_navigation_example": "Get.toNamed('/post-details', arguments: {'postId': int.parse(data['post_id'])});"
              },
              {
                "type": "live_room_started",
                "category": "live",
                "target_screen": "video_live",
                "route": "/video-live",
                "click_action": "FLUTTER_NOTIFICATION_CLICK",
                "sample_data": {
                  "notification_category": "live",
                  "type": "live_room_started",
                  "target_screen": "video_live",
                  "route": "/video-live",
                  "room_id": "room_1729065600",
                  "live_type": "video",
                  "is_host": "false",
                  "host_id": "10",
                  "host_name": "Nila Akter",
                  "title": "Music & Chill 🎤"
                },
                "flutter_navigation_example": "final isAudio = data['live_type'] == 'audio'; Get.toNamed(isAudio ? '/audio-live' : '/video-live', arguments: {'roomId': data['room_id'], 'isHost': false});"
              },
              {
                "type": "new_follower",
                "category": "social",
                "target_screen": "user_profile",
                "route": "/user-profile",
                "click_action": "FLUTTER_NOTIFICATION_CLICK",
                "sample_data": {
                  "notification_category": "social",
                  "type": "new_follower",
                  "target_screen": "user_profile",
                  "route": "/user-profile",
                  "follower_id": "7",
                  "follower_name": "Nibir",
                  "follower_avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=7"
                },
                "flutter_navigation_example": "Get.toNamed('/user-profile', arguments: {'userId': int.parse(data['follower_id'])});"
              }
            ]
          }
        }
      ]
    },
    {
      "id": "notifications-fcm-register",
      "category": "notifications",
      "method": "POST",
      "path": "/api/mobile/notifications/fcm-token",
      "summary": "Register or Update Firebase FCM Device Push Token",
      "description": "Registers device Firebase Cloud Messaging (FCM) push token in database for real-time chat, post reactions, comments, replies, and live stream push notifications. Synchronizes multi-device user_fcm_tokens and users table. Route aliases: POST /api/mobile/notifications/fcm-token and POST /api/mobile/auth/fcm-token.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        },
        {
          "name": "Content-Type",
          "type": "string",
          "required": true,
          "example": "application/json"
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "object",
        "required": true,
        "properties": {
          "fcm_token": {
            "type": "string",
            "description": "Device FCM registration token string generated by FirebaseMessaging.instance.getToken()"
          },
          "device_type": {
            "type": "string",
            "description": "Device platform: 'android', 'ios', or 'web' (default: 'android')"
          },
          "device_name": {
            "type": "string",
            "description": "Optional device hardware model name (e.g., 'Samsung S24 Ultra', 'iPhone 15 Pro')"
          }
        },
        "example": {
          "fcm_token": "fXyZ_eX4mPL3-t0k3n_...",
          "device_type": "android",
          "device_name": "Samsung Galaxy S24 Ultra"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "FCM push token registered successfully.",
          "example": {
            "success": true,
            "message": "FCM device token saved successfully for push notifications.",
            "fcm_token": "fXyZ_eX4mPL3-t0k3n_...",
            "device_type": "android"
          }
        },
        {
          "status": 400,
          "description": "Missing fcm_token in request body.",
          "example": {
            "success": false,
            "message": "FCM device token is required."
          }
        }
      ]
    },
    {
      "id": "notifications-fcm-delete",
      "category": "notifications",
      "method": "DELETE",
      "path": "/api/mobile/notifications/fcm-token",
      "summary": "Remove Device FCM Token on Logout",
      "description": "Deactivates or deletes the device FCM push token when user logs out to avoid receiving background push alerts after logout. Route aliases: DELETE /api/mobile/notifications/fcm-token and DELETE /api/mobile/auth/fcm-token.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "object",
        "required": false,
        "properties": {
          "fcm_token": {
            "type": "string",
            "description": "Optional specific device FCM token to unregister. If omitted, deactivates all active tokens for the user."
          }
        },
        "example": {
          "fcm_token": "fXyZ_eX4mPL3-t0k3n_..."
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "FCM token removed successfully.",
          "example": {
            "success": true,
            "message": "FCM device token unregistered successfully."
          }
        }
      ]
    },
    {
      "id": "agency-top-shortcut",
      "category": "agency-management",
      "method": "GET",
      "path": "/api/mobile/agency/top",
      "summary": "Top Agencies Shortcut",
      "description": "Direct alias for /api/mobile/leaderboard/agencies to inspect ranked agencies by coins and hosts.",
      "requiresAuth": false,
      "requestHeaders": [],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Top agencies list retrieved successfully.",
          "example": {
            "success": true,
            "total_agencies": 4,
            "agencies": []
          }
        }
      ]
    },
    {
      "id": "leaderboard-top-agencies",
      "category": "leaderboard",
      "method": "GET",
      "path": "/api/mobile/leaderboard/agencies",
      "summary": "Get Top Agencies Leaderboard",
      "description": "Returns global ranking of talent agencies sorted primarily by total coins gifted to affiliated hosts, then by total host count. Accessible publicly for all global users.",
      "requiresAuth": false,
      "requestHeaders": [],
      "parameters": [
        {
          "name": "search",
          "in": "query",
          "type": "string",
          "required": false,
          "description": "Search by agency name or code"
        },
        {
          "name": "page",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Page number (default 1)"
        },
        {
          "name": "limit",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Page size limit (default 20, max 100)"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Top agencies list retrieved successfully.",
          "example": {
            "success": true,
            "message": "Top agencies list retrieved successfully.",
            "page": 1,
            "limit": 20,
            "total_agencies": 4,
            "total_pages": 1,
            "agencies": [
              {
                "rank": 1,
                "id": 1,
                "agency_code": "AGY-1",
                "name": "Dhaka Royals Talent Agency",
                "commission_rate": 15,
                "status": "active",
                "total_coins": 48500,
                "total_commission_coins": 7275,
                "total_hosts": 2,
                "active_streaming_hosts": 2,
                "owner": {
                  "id": 1,
                  "full_name": "System Admin",
                  "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                  "coins": 100000
                }
              }
            ]
          }
        }
      ]
    },
    {
      "id": "leaderboard-top-gifters",
      "category": "leaderboard",
      "method": "GET",
      "path": "/api/mobile/leaderboard/gifters",
      "summary": "Get Top Gifters Leaderboard",
      "description": "Returns global ranking of top users who sent virtual gifts. Filterable by timeframe (all, today/daily, week/weekly, month/monthly). Shows user rank, coins gifted, VIP badge, and avatar.",
      "requiresAuth": false,
      "requestHeaders": [],
      "parameters": [
        {
          "name": "timeframe",
          "in": "query",
          "type": "string",
          "required": false,
          "description": "Ranking timeframe: all (default), today/daily, week/weekly, month/monthly"
        },
        {
          "name": "page",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Page number (default 1)"
        },
        {
          "name": "limit",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Page size limit (default 20, max 100)"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Top gifters retrieved successfully.",
          "example": {
            "success": true,
            "message": "Top gifters retrieved successfully.",
            "timeframe": "all",
            "page": 1,
            "limit": 20,
            "total_gifters": 3,
            "total_coins_spent": 52700,
            "total_transactions": 8,
            "total_pages": 1,
            "gifters": [
              {
                "rank": 1,
                "user_id": 1,
                "full_name": "System Admin",
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "level": 99,
                "role": "superadmin",
                "vip_category": "Royal Crown VIP",
                "vip_badge": "👑",
                "vip_color": "#f59e0b",
                "total_coins_gifted": 20000,
                "total_gifts_sent": 1,
                "total_recipients": 1
              }
            ]
          }
        }
      ]
    },
    {
      "id": "banners-list",
      "category": "banners",
      "method": "GET",
      "path": "/api/mobile/banners",
      "summary": "Get Active Promotional Banners",
      "description": "Retrieves list of active event and promotional banners for the mobile home carousel. Sorted by display_order. Redis cached for 300s.",
      "requiresAuth": false,
      "requestHeaders": [],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Active banners retrieved successfully.",
          "example": {
            "success": true,
            "message": "Active banners retrieved successfully.",
            "count": 4,
            "banners": [
              {
                "id": 1,
                "image_url": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1000",
                "link_url": "",
                "display_order": 1,
                "is_active": true
              }
            ]
          }
        }
      ]
    },
    {
        "id": "chat-set-background",
        "category": "chat",
        "method": "PUT",
        "path": "/api/mobile/chat/conversations/:id/background",
        "summary": "Set / Change Shared Chat Background (Image / Color)",
        "description": "Sets or updates the conversation background image or color. The background is shared between both participants in the direct chat so both users see the same custom background in their chat screen. Supports multipart file upload (image file from device camera/gallery) or JSON payload with background_image URL and background_color HEX/gradient. Also accessible via /api/mobile/chat/messages/:otherUserId/background. Broadcasts real-time chat:background_updated Socket.IO event to both participants.",
        "requiresAuth": true,
        "requestHeaders": [
            {
                "name": "Authorization",
                "type": "string",
                "required": true,
                "example": "Bearer eyJhbGciOiJIUzI1Ni..."
            },
            {
                "name": "Content-Type",
                "type": "string",
                "required": false,
                "example": "application/json (or multipart/form-data for file uploads)"
            }
        ],
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "type": "integer",
                "required": true,
                "description": "Conversation ID (or target other user ID)"
            }
        ],
        "requestBody": {
            "type": "object",
            "properties": {
                "background_image": {
                    "type": "string",
                    "description": "Image URL or multipart uploaded image file"
                },
                "background_color": {
                    "type": "string",
                    "description": "Hex color code or CSS gradient (e.g. #1e293b, linear-gradient(135deg, #0f172a, #1e1b4b))"
                }
            },
            "example": {
                "background_image": "https://images.unsplash.com/photo-1579546929518-9e396f3cc809",
                "background_color": "#1e293b"
            }
        },
        "responses": [
            {
                "status": 200,
                "description": "Chat background updated successfully.",
                "example": {
                    "success": true,
                    "message": "Chat background updated successfully for this conversation.",
                    "background": {
                        "conversation_id": 1,
                        "background_image": "https://images.unsplash.com/photo-1579546929518-9e396f3cc809",
                        "background_color": "#1e293b",
                        "updated_by": 1,
                        "updated_at": "2026-10-18T09:30:00.000Z"
                    }
                }
            },
            {
                "status": 400,
                "description": "Missing background image or color.",
                "example": {
                    "success": false,
                    "message": "Please provide either background_image or background_color."
                }
            },
            {
                "status": 404,
                "description": "Conversation or target user not found.",
                "example": {
                    "success": false,
                    "message": "Conversation not found."
                }
            }
        ],
        "codeSnippets": {
            "curl": "curl -X PUT \"https://yourdomain.com/api/mobile/chat/conversations/1/background\" \\\n  -H \"Authorization: Bearer <TOKEN>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"background_image\": \"https://images.unsplash.com/photo-1579546929518-9e396f3cc809\",\n    \"background_color\": \"#1e293b\"\n  }'",
            "flutter": "import 'dart:convert';\nimport 'package:http/http.dart' as http;\n\n/// Set or change conversation background (shared for both participants)\nFuture<Map<String, dynamic>?> setChatBackground({\n  required String token,\n  required int conversationId,\n  String? backgroundImage,\n  String? backgroundColor,\n}) async {\n  final url = Uri.parse('$BASE_URL/api/mobile/chat/conversations/$conversationId/background');\n  \n  final res = await http.put(\n    url,\n    headers: {\n      'Content-Type': 'application/json',\n      'Authorization': 'Bearer $token',\n    },\n    body: jsonEncode({\n      if (backgroundImage != null) 'background_image': backgroundImage,\n      if (backgroundColor != null) 'background_color': backgroundColor,\n    }),\n  );\n\n  if (res.statusCode == 200) {\n    final data = jsonDecode(res.body);\n    print('Background updated: ${data[\"background\"]}');\n    return data['background'];\n  } else {\n    print('Error setting background: ${res.statusCode} ${res.body}');\n    return null;\n  }\n}"
        }
    },
    {
        "id": "chat-remove-background",
        "category": "chat",
        "method": "DELETE",
        "path": "/api/mobile/chat/conversations/:id/background",
        "summary": "Remove / Reset Shared Chat Background",
        "description": "Removes any custom background image or color from the conversation, resetting both participants to default theme. Also accessible via /api/mobile/chat/messages/:otherUserId/background. Broadcasts real-time chat:background_updated Socket.IO event.",
        "requiresAuth": true,
        "requestHeaders": [
            {
                "name": "Authorization",
                "type": "string",
                "required": true,
                "example": "Bearer eyJhbGciOiJIUzI1Ni..."
            }
        ],
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "type": "integer",
                "required": true,
                "description": "Conversation ID (or target other user ID)"
            }
        ],
        "requestBody": null,
        "responses": [
            {
                "status": 200,
                "description": "Chat background removed successfully.",
                "example": {
                    "success": true,
                    "message": "Chat background removed successfully.",
                    "background": {
                        "conversation_id": 1,
                        "background_image": null,
                        "background_color": null,
                        "updated_by": 1,
                        "updated_at": "2026-10-18T09:30:00.000Z"
                    }
                }
            },
            {
                "status": 404,
                "description": "Conversation not found.",
                "example": {
                    "success": false,
                    "message": "Conversation not found."
                }
            }
        ],
        "codeSnippets": {
            "curl": "curl -X DELETE \"https://yourdomain.com/api/mobile/chat/conversations/1/background\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
            "flutter": "import 'dart:convert';\nimport 'package:http/http.dart' as http;\n\n/// Remove/Reset chat background for conversation\nFuture<bool> removeChatBackground({\n  required String token,\n  required int conversationId,\n}) async {\n  final url = Uri.parse('$BASE_URL/api/mobile/chat/conversations/$conversationId/background');\n  \n  final res = await http.delete(\n    url,\n    headers: {\n      'Authorization': 'Bearer $token',\n    },\n  );\n\n  if (res.statusCode == 200) {\n    print('Background removed successfully');\n    return true;\n  }\n  return false;\n}"
        }
    },
    {
        "id": "chat-clear-messages",
        "category": "chat",
        "method": "POST",
        "path": "/api/mobile/chat/conversations/:id/clear",
        "summary": "Clear All Chat Messages (For Caller's Account Only)",
        "description": "Clears all message history with the target user for the calling user's account only (sets caller's user_cleared_at timestamp). The other participant still retains their complete chat history without any loss. Caller will see an empty chat history up to this timestamp. Any subsequent messages will be visible to both. Also accessible via /api/mobile/chat/messages/:otherUserId/clear. Broadcasts chat:chat_cleared via Socket.IO to the caller.",
        "requiresAuth": true,
        "requestHeaders": [
            {
                "name": "Authorization",
                "type": "string",
                "required": true,
                "example": "Bearer eyJhbGciOiJIUzI1Ni..."
            }
        ],
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "type": "integer",
                "required": true,
                "description": "Conversation ID (or target other user ID)"
            }
        ],
        "requestBody": null,
        "responses": [
            {
                "status": 200,
                "description": "Messages cleared for caller.",
                "example": {
                    "success": true,
                    "message": "All messages cleared for your account. The other user will still see their chat history.",
                    "conversation_id": 1,
                    "cleared_at": "2026-10-18T09:30:00.000Z"
                }
            },
            {
                "status": 404,
                "description": "Conversation not found.",
                "example": {
                    "success": false,
                    "message": "Conversation not found."
                }
            }
        ],
        "codeSnippets": {
            "curl": "curl -X POST \"https://yourdomain.com/api/mobile/chat/conversations/1/clear\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
            "flutter": "import 'dart:convert';\nimport 'package:http/http.dart' as http;\n\n/// Clear chat history for caller only (partner keeps full history)\nFuture<bool> clearChatMessages({\n  required String token,\n  required int conversationId,\n}) async {\n  final url = Uri.parse('$BASE_URL/api/mobile/chat/conversations/$conversationId/clear');\n  \n  final res = await http.post(\n    url,\n    headers: {\n      'Authorization': 'Bearer $token',\n    },\n  );\n\n  if (res.statusCode == 200) {\n    final data = jsonDecode(res.body);\n    print('Messages cleared for caller at: ${data[\"cleared_at\"]}');\n    return true;\n  }\n  return false;\n}"
        }
    },
    {
        "id": "chat-delete-conversation",
        "category": "chat",
        "method": "DELETE",
        "path": "/api/mobile/chat/conversations/:id",
        "summary": "Delete / Remove Conversation from Inbox",
        "description": "Soft-deletes and hides the conversation from the calling user's inbox list and clears their message history. The partner's inbox and messages remain completely untouched unless they also delete it or hard=true query param is passed. If both participants have hidden/deleted the conversation or hard=true is specified, all records are permanently purged from MySQL. Invalidates Redis caches and emits chat:conversation_deleted Socket.IO event.",
        "requiresAuth": true,
        "requestHeaders": [
            {
                "name": "Authorization",
                "type": "string",
                "required": true,
                "example": "Bearer eyJhbGciOiJIUzI1Ni..."
            }
        ],
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "type": "integer",
                "required": true,
                "description": "Conversation ID (or target other user ID)"
            },
            {
                "name": "hard",
                "in": "query",
                "type": "boolean",
                "required": false,
                "description": "Optional: hard=true to permanently purge conversation and messages for both users"
            }
        ],
        "requestBody": null,
        "responses": [
            {
                "status": 200,
                "description": "Conversation deleted successfully.",
                "example": {
                    "success": true,
                    "message": "Conversation removed from your inbox."
                }
            },
            {
                "status": 404,
                "description": "Conversation not found.",
                "example": {
                    "success": false,
                    "message": "Conversation not found."
                }
            }
        ],
        "codeSnippets": {
            "curl": "curl -X DELETE \"https://yourdomain.com/api/mobile/chat/conversations/1\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
            "flutter": "import 'package:http/http.dart' as http;\n\n/// Delete or remove conversation from caller's inbox\nFuture<bool> deleteConversation({\n  required String token,\n  required int conversationId,\n  bool hardDelete = false,\n}) async {\n  final url = Uri.parse('$BASE_URL/api/mobile/chat/conversations/$conversationId${hardDelete ? \"?hard=true\" : \"\"}');\n  \n  final res = await http.delete(\n    url,\n    headers: {\n      'Authorization': 'Bearer $token',\n    },\n  );\n\n  return res.statusCode == 200;\n}"
        }
    },
    {
        "id": "chat-mark-read",
        "category": "chat",
        "method": "PUT",
        "path": "/api/mobile/chat/conversations/:id/read",
        "summary": "Mark Conversation as Read",
        "description": "Marks all unread messages received in this conversation as read. Updates MySQL first, invalidates Redis caches, and broadcasts chat:messages_read Socket.IO event to sender.",
        "requiresAuth": true,
        "requestHeaders": [
            {
                "name": "Authorization",
                "type": "string",
                "required": true,
                "example": "Bearer eyJhbGciOiJIUzI1Ni..."
            }
        ],
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "type": "integer",
                "required": true,
                "description": "Conversation ID (or target other user ID)"
            }
        ],
        "requestBody": null,
        "responses": [
            {
                "status": 200,
                "description": "Messages marked as read.",
                "example": {
                    "success": true,
                    "message": "Messages marked as read.",
                    "conversation_id": 1,
                    "affected_rows": 3
                }
            }
        ],
        "codeSnippets": {
            "curl": "curl -X PUT \"https://yourdomain.com/api/mobile/chat/conversations/1/read\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
            "flutter": "import 'package:http/http.dart' as http;\n\n/// Mark conversation as read\nFuture<bool> markConversationAsRead({\n  required String token,\n  required int conversationId,\n}) async {\n  final url = Uri.parse('$BASE_URL/api/mobile/chat/conversations/$conversationId/read');\n  \n  final res = await http.put(\n    url,\n    headers: {\n      'Authorization': 'Bearer $token',\n    },\n  );\n\n  return res.statusCode == 200;\n}"
        }
    },
    {
        "id": "chat-upload-media",
        "category": "chat",
        "method": "POST",
        "path": "/api/mobile/chat/upload",
        "summary": "Upload Device Images / Videos for Chat",
        "description": "Uploads one or more media files (images, videos, audio notes) from the mobile device via multipart/form-data. Returns hosted URLs and metadata ready to be sent in chat messages.",
        "requiresAuth": true,
        "requestHeaders": [
            {
                "name": "Authorization",
                "type": "string",
                "required": true,
                "example": "Bearer eyJhbGciOiJIUzI1Ni..."
            },
            {
                "name": "Content-Type",
                "type": "string",
                "required": true,
                "example": "multipart/form-data"
            }
        ],
        "parameters": [],
        "requestBody": {
            "type": "multipart/form-data",
            "fields": [
                {
                    "name": "media",
                    "type": "file[]",
                    "required": true,
                    "description": "One or more image/video files from mobile device"
                }
            ],
            "example": {
                "media": "[Binary File Attached]"
            }
        },
        "responses": [
            {
                "status": 200,
                "description": "Media files uploaded successfully.",
                "example": {
                    "success": true,
                    "message": "Media uploaded successfully.",
                    "media": [
                        {
                            "media_type": "image",
                            "media_url": "/uploads/chat/chat_media_1711200000.jpg"
                        }
                    ]
                }
            }
        ],
        "codeSnippets": {
            "curl": "curl -X POST \"https://yourdomain.com/api/mobile/chat/upload\" \\\n  -H \"Authorization: Bearer <TOKEN>\" \\\n  -F \"media=@/path/to/device/photo.jpg\"",
            "flutter": "import 'dart:io';\nimport 'dart:convert';\nimport 'package:http/http.dart' as http;\n\n/// Direct device media upload for chat\nFuture<List<Map<String, dynamic>>> uploadChatMedia({\n  required String token,\n  required List<File> files,\n}) async {\n  final url = Uri.parse('$BASE_URL/api/mobile/chat/upload');\n  final request = http.MultipartRequest('POST', url);\n  request.headers['Authorization'] = 'Bearer $token';\n\n  for (final file in files) {\n    request.files.add(await http.MultipartFile.fromPath('media', file.path));\n  }\n\n  final streamed = await request.send();\n  final res = await http.Response.fromStream(streamed);\n  \n  if (res.statusCode == 200) {\n    final data = jsonDecode(res.body);\n    return List<Map<String, dynamic>>.from(data['media']);\n  }\n  return [];\n}"
        }
    },
    {
        "id": "chat-send-message",
        "category": "chat",
        "method": "POST",
        "path": "/api/mobile/chat/messages",
        "summary": "Send Message (Text, Reply / Quote, Images & Videos)",
        "description": "Sends a direct message to a user or conversation. Supports replying to / quoting an earlier message via reply_to_id. Supports sending text and multiple image/video files selected directly from the user device. Automatically unhides the conversation in both users' inboxes if previously hidden. Updates MySQL SSOT first, invalidates Redis caches, and broadcasts real-time chat:new_message (with full reply_to details) and chat:conversation_update via Socket.IO.",
        "requiresAuth": true,
        "requestHeaders": [
            {
                "name": "Authorization",
                "type": "string",
                "required": true,
                "example": "Bearer eyJhbGciOiJIUzI1Ni..."
            },
            {
                "name": "Content-Type",
                "type": "string",
                "required": false,
                "example": "application/json (or multipart/form-data for direct file attachments)"
            }
        ],
        "parameters": [],
        "requestBody": {
            "type": "object",
            "properties": {
                "receiver_id": {
                    "type": "integer",
                    "description": "Recipient User ID (required if conversation_id not specified)"
                },
                "conversation_id": {
                    "type": "integer",
                    "description": "Conversation ID (alternative to receiver_id)"
                },
                "message": {
                    "type": "string",
                    "description": "Text message content or media caption"
                },
                "reply_to_id": {
                    "type": "integer",
                    "description": "ID of the specific message being replied to / quoted (optional)"
                },
                "media": {
                    "type": "array",
                    "description": "Array of pre-uploaded media items",
                    "items": {
                        "type": "object",
                        "properties": {
                            "media_type": {
                                "type": "string",
                                "enum": [
                                    "image",
                                    "video",
                                    "audio"
                                ]
                            },
                            "media_url": {
                                "type": "string"
                            }
                        }
                    }
                }
            },
            "example": {
                "receiver_id": 2,
                "message": "Yes! I saw your video, here is my response.",
                "reply_to_id": 101,
                "media": []
            }
        },
        "responses": [
            {
                "status": 201,
                "description": "Message sent and broadcasted successfully.",
                "example": {
                    "success": true,
                    "message": "Message sent successfully.",
                    "data": {
                        "id": 102,
                        "conversation_id": 1,
                        "sender_id": 5,
                        "receiver_id": 2,
                        "message_type": "text",
                        "message": "Yes! I saw your video, here is my response.",
                        "reply_to_id": 101,
                        "reply_to": {
                            "id": 101,
                            "sender_id": 2,
                            "message": "Check out this rehearsal snippet!",
                            "message_type": "video",
                            "media_url": "/uploads/chat/rehearsal_clip.mp4",
                            "sender_name": "Nila Akter"
                        },
                        "media_url": null,
                        "media": [],
                        "is_read": false,
                        "is_mine": true,
                        "created_at": "2026-10-18T09:35:00.000Z"
                    }
                }
            },
            {
                "status": 400,
                "description": "Validation error (missing receiver or message content).",
                "example": {
                    "success": false,
                    "message": "Receiver ID or Conversation ID is required."
                }
            }
        ],
        "codeSnippets": {
            "curl": "curl -X POST \"https://yourdomain.com/api/mobile/chat/messages\" \\\n  -H \"Authorization: Bearer <TOKEN>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"receiver_id\": 2,\n    \"message\": \"Yes! I saw your video, here is my response.\",\n    \"reply_to_id\": 101\n  }'",
            "flutter": "import 'dart:convert';\nimport 'package:http/http.dart' as http;\n\n/// Send direct message with text, optional reply_to_id, or media\nFuture<Map<String, dynamic>?> sendChatMessage({\n  required String token,\n  int? receiverId,\n  int? conversationId,\n  required String message,\n  int? replyToId,\n  List<Map<String, String>>? media,\n}) async {\n  final url = Uri.parse('$BASE_URL/api/mobile/chat/messages');\n  \n  final res = await http.post(\n    url,\n    headers: {\n      'Content-Type': 'application/json',\n      'Authorization': 'Bearer $token',\n    },\n    body: jsonEncode({\n      if (receiverId != null) 'receiver_id': receiverId,\n      if (conversationId != null) 'conversation_id': conversationId,\n      'message': message,\n      if (replyToId != null) 'reply_to_id': replyToId,\n      if (media != null && media.isNotEmpty) 'media': media,\n    }),\n  );\n\n  if (res.statusCode == 201) {\n    final data = jsonDecode(res.body);\n    return data['data'];\n  }\n  return null;\n}"
        }
    },
    {
        "id": "chat-get-messages",
        "category": "chat",
        "method": "GET",
        "path": "/api/mobile/chat/conversations/:conversationId/messages",
        "summary": "Get Messages in Conversation (with Reply Quotes & Shared Background)",
        "description": "Retrieves chronological chat message history for a conversation. Automatically filters out messages sent prior to the calling user's user_cleared_at timestamp if they previously cleared chat history. Returns the active shared background (image & color) and message reply_to quote objects. Automatically marks unread incoming messages as read and broadcasts real-time chat:messages_read Socket.IO event.",
        "requiresAuth": true,
        "requestHeaders": [
            {
                "name": "Authorization",
                "type": "string",
                "required": true,
                "example": "Bearer eyJhbGciOiJIUzI1Ni..."
            }
        ],
        "parameters": [
            {
                "name": "conversationId",
                "in": "path",
                "type": "integer",
                "required": true,
                "description": "Conversation ID (or partner user ID via /api/mobile/chat/messages/:otherUserId)"
            },
            {
                "name": "page",
                "in": "query",
                "type": "integer",
                "required": false,
                "default": 1
            },
            {
                "name": "limit",
                "in": "query",
                "type": "integer",
                "required": false,
                "default": 30
            }
        ],
        "requestBody": null,
        "responses": [
            {
                "status": 200,
                "description": "Messages retrieved successfully.",
                "example": {
                    "success": true,
                    "conversation_id": 1,
                    "background": {
                        "background_image": "https://images.unsplash.com/photo-1579546929518-9e396f3cc809",
                        "background_color": "#1e293b",
                        "updated_by": 1,
                        "updated_at": "2026-10-18T09:30:00.000Z"
                    },
                    "total": 12,
                    "page": 1,
                    "limit": 30,
                    "total_pages": 1,
                    "messages": [
                        {
                            "id": 102,
                            "conversation_id": 1,
                            "sender_id": 5,
                            "receiver_id": 2,
                            "message_type": "text",
                            "message": "Yes! I saw your video, here is my response.",
                            "reply_to_id": 101,
                            "reply_to": {
                                "id": 101,
                                "sender_id": 2,
                                "message": "Check out this rehearsal snippet!",
                                "message_type": "video",
                                "media_url": "/uploads/chat/rehearsal_clip.mp4",
                                "sender_name": "Nila Akter"
                            },
                            "media_url": null,
                            "media": [],
                            "is_read": true,
                            "is_mine": true,
                            "created_at": "2026-10-18T09:35:00.000Z",
                            "sender": {
                                "id": 5,
                                "name": "Alex Vance",
                                "profile_picture": "/uploads/avatars/alex.jpg",
                                "role": "user",
                                "level": 3,
                                "star": 1,
                                "package_category": {
                                    "id": 1,
                                    "name": "Royal VIP",
                                    "badge_icon": "/uploads/vip/royal.png",
                                    "color_code": "#f59e0b"
                                }
                            }
                        }
                    ]
                }
            }
        ],
        "codeSnippets": {
            "curl": "curl -X GET \"https://yourdomain.com/api/mobile/chat/conversations/1/messages?page=1&limit=30\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
            "flutter": "import 'dart:convert';\nimport 'package:http/http.dart' as http;\n\n/// Get messages and active background styling\nFuture<Map<String, dynamic>?> getChatMessages({\n  required String token,\n  required int conversationId,\n  int page = 1,\n  int limit = 30,\n}) async {\n  final url = Uri.parse('$BASE_URL/api/mobile/chat/conversations/$conversationId/messages?page=$page&limit=$limit');\n  \n  final res = await http.get(\n    url,\n    headers: {\n      'Authorization': 'Bearer $token',\n    },\n  );\n\n  if (res.statusCode == 200) {\n    return jsonDecode(res.body);\n  }\n  return null;\n}"
        }
    },
    {
        "id": "chat-conversations-list",
        "category": "chat",
        "method": "GET",
        "path": "/api/mobile/chat/conversations",
        "summary": "Get Conversations Inbox List",
        "description": "Retrieves active direct message conversations for the authenticated user, ordered by latest message. Excludes conversations hidden by the caller. Includes unread message counter, other user's VIP package badge, online status, last message preview, and active shared background styling.",
        "requiresAuth": true,
        "requestHeaders": [
            {
                "name": "Authorization",
                "type": "string",
                "required": true,
                "example": "Bearer eyJhbGciOiJIUzI1Ni..."
            }
        ],
        "parameters": [
            {
                "name": "page",
                "in": "query",
                "type": "integer",
                "required": false,
                "default": 1
            },
            {
                "name": "limit",
                "in": "query",
                "type": "integer",
                "required": false,
                "default": 20
            }
        ],
        "requestBody": null,
        "responses": [
            {
                "status": 200,
                "description": "Conversations retrieved successfully.",
                "example": {
                    "success": true,
                    "page": 1,
                    "limit": 20,
                    "total": 1,
                    "conversations": [
                        {
                            "id": 1,
                            "partner_id": 2,
                            "partner_name": "Nila Akter",
                            "partner_avatar": "/uploads/avatars/nila_pic.jpg",
                            "partner_role": "host",
                            "partner_level": 5,
                            "partner_star": 2,
                            "partner_package": {
                                "id": 1,
                                "name": "Royal VIP",
                                "badge_icon": "/uploads/vip/royal.png",
                                "color_code": "#f59e0b"
                            },
                            "background": {
                                "background_image": "https://images.unsplash.com/photo-1579546929518-9e396f3cc809",
                                "background_color": "#1e293b"
                            },
                            "last_message": "Yes! I saw your video, here is my response.",
                            "last_message_at": "2026-10-18T09:35:00.000Z",
                            "unread_count": 0,
                            "is_online": true
                        }
                    ]
                }
            }
        ],
        "codeSnippets": {
            "curl": "curl -X GET \"https://yourdomain.com/api/mobile/chat/conversations?page=1&limit=20\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
            "flutter": "import 'dart:convert';\nimport 'package:http/http.dart' as http;\n\n/// Fetch user's direct chat inbox list\nFuture<List<Map<String, dynamic>>> getConversationsList({\n  required String token,\n  int page = 1,\n  int limit = 20,\n}) async {\n  final url = Uri.parse('$BASE_URL/api/mobile/chat/conversations?page=$page&limit=$limit');\n  \n  final res = await http.get(\n    url,\n    headers: {\n      'Authorization': 'Bearer $token',\n    },\n  );\n\n  if (res.statusCode == 200) {\n    final data = jsonDecode(res.body);\n    return List<Map<String, dynamic>>.from(data['conversations'] ?? []);\n  }\n  return [];\n}"
        }
    },
    {
        "id": "chat-search-users",
        "category": "chat",
        "method": "GET",
        "path": "/api/mobile/chat/users/search",
        "summary": "Search Users for Chat (by ID or Name)",
        "description": "Searches for registered active users by numeric ID (exact match) or by name/text (partial match) to start or open a 1-on-1 direct message conversation. Automatically returns has_existing_chat and conversation_id if a conversation already exists. Excludes the current user and banned accounts. Cached via Redis Cache-Aside.",
        "requiresAuth": true,
        "requestHeaders": [
            {
                "name": "Authorization",
                "type": "string",
                "required": true,
                "example": "Bearer eyJhbGciOiJIUzI1Ni..."
            }
        ],
        "parameters": [
            {
                "name": "q",
                "in": "query",
                "type": "string",
                "required": false,
                "description": "Search keyword - User ID (e.g. '2') or Name (e.g. 'nila')"
            },
            {
                "name": "page",
                "in": "query",
                "type": "integer",
                "required": false,
                "default": 1,
                "description": "Page number"
            },
            {
                "name": "limit",
                "in": "query",
                "type": "integer",
                "required": false,
                "default": 20,
                "description": "Items per page (max 50)"
            }
        ],
        "requestBody": null,
        "responses": [
            {
                "status": 200,
                "description": "Matching users retrieved successfully.",
                "example": {
                    "success": true,
                    "query": "2",
                    "users": [
                        {
                            "id": 2,
                            "full_name": "Nila Akter",
                            "name": "Nila Akter",
                            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                            "profile": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                            "bio": "Singer & Lifestyle Streamer \ud83c\udfa4",
                            "role": "host",
                            "level": 15,
                            "vip_package": "Standard",
                            "package_category": {
                                "id": null,
                                "name": "Standard",
                                "badge_icon": null,
                                "color_code": "#9ca3af"
                            },
                            "conversation_id": 1,
                            "has_existing_chat": true,
                            "last_message": "Hello! How are you? \ud83d\udc4b",
                            "last_message_at": "2026-10-15T07:21:58.000Z"
                        }
                    ],
                    "pagination": {
                        "total": 1,
                        "page": 1,
                        "limit": 20,
                        "total_pages": 1,
                        "has_more": false
                    }
                }
            }
        ],
        "codeSnippets": {
            "curl": "curl -X GET \"https://yourdomain.com/api/mobile/chat/users/search?q=nila\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
            "flutter": "import 'dart:convert';\nimport 'package:http/http.dart' as http;\n\n/// Search users by numeric ID or name\nFuture<List<Map<String, dynamic>>> searchUsersForChat({\n  required String token,\n  required String query,\n  int page = 1,\n  int limit = 20,\n}) async {\n  final url = Uri.parse('$BASE_URL/api/mobile/chat/users/search?q=${Uri.encodeComponent(query)}&page=$page&limit=$limit');\n  \n  final res = await http.get(\n    url,\n    headers: {\n      'Authorization': 'Bearer $token',\n    },\n  );\n\n  if (res.statusCode == 200) {\n    final data = jsonDecode(res.body);\n    return List<Map<String, dynamic>>.from(data['users'] ?? []);\n  }\n  return [];\n}"
        }
    },
        {
      "id": "feed-delete-comment",
      "category": "feed",
      "method": "DELETE",
      "path": "/api/mobile/feed/:postId/comments/:commentId",
      "summary": "Delete Comment",
      "description": "Deletes a comment or reply. Allowed for comment author, post owner, or administrators. Updates MySQL first, decrements comments_count, and invalidates Redis cache.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        }
      ],
      "parameters": [
        {
          "name": "postId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Post ID"
        },
        {
          "name": "commentId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Comment ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Comment deleted successfully.",
          "example": {
            "success": true,
            "message": "Comment deleted successfully."
          }
        }
      ]
    },
    {
      "id": "feed-update-comment",
      "category": "feed",
      "method": "PUT",
      "path": "/api/mobile/feed/:postId/comments/:commentId",
      "summary": "Update Comment or Reply",
      "description": "Edits the content or media of an existing comment or reply. Only the comment author or an administrator can update. Updates MySQL SSOT first, invalidates Redis feed caches, and returns the updated comment with author profile, VIP badges, and replies count. Route aliases: PUT/PATCH /api/mobile/feed/:postId/comments/:commentId and PUT/PATCH /api/mobile/feed/comments/:commentId.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        },
        {
          "name": "Content-Type",
          "type": "string",
          "required": false,
          "example": "application/json"
        }
      ],
      "parameters": [
        {
          "name": "postId",
          "in": "path",
          "type": "integer",
          "required": false,
          "description": "Post ID (Optional, resolved automatically if omitted)"
        },
        {
          "name": "commentId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Comment ID"
        }
      ],
      "requestBody": {
        "type": "object",
        "required": true,
        "properties": {
          "content": {
            "type": "string",
            "description": "Updated comment content"
          },
          "media_url": {
            "type": "string",
            "description": "Optional updated media attachment URL"
          }
        },
        "example": {
          "content": "Updated my opinion about this performance! Amazing 🔥",
          "media_url": null
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Comment updated successfully.",
          "example": {
            "success": true,
            "message": "Comment updated successfully.",
            "comment": {
              "id": 10,
              "post_id": 1,
              "parent_id": null,
              "content": "Updated my opinion about this performance! Amazing 🔥",
              "media_url": null,
              "likes_count": 2,
              "replies_count": 1,
              "has_replies": true,
              "has_reply": true,
              "is_mine": true,
              "created_at": "2026-10-12T08:10:00.000Z",
              "updated_at": "2026-10-16T09:30:00.000Z",
              "user": {
                "user_id": 4,
                "name": "Tanvir Ahmed",
                "profile_picture": "/uploads/avatars/tanvir.jpg",
                "role": "user",
                "level": 2,
                "star": 0,
                "package_category": {
                  "id": null,
                  "name": "Standard",
                  "badge_icon": null,
                  "color_code": "#9ca3af"
                }
              }
            }
          }
        },
        {
          "status": 403,
          "description": "Unauthorized to edit this comment.",
          "example": {
            "success": false,
            "message": "Unauthorized to edit this comment."
          }
        },
        {
          "status": 404,
          "description": "Comment not found.",
          "example": {
            "success": false,
            "message": "Comment not found."
          }
        }
      ]
    },
    {
      "id": "feed-comments-list",
      "category": "feed",
      "method": "GET",
      "path": "/api/mobile/feed/:id/comments",
      "summary": "Get Comments / Replies List (Nested Replies Array)",
      "description": "Retrieves comments for a post. If parent_id is omitted, returns top-level comments with their nested replies array pre-populated (with author avatars, levels, VIP badges, and is_mine flag). If parent_id is provided, returns only direct replies for that specific comment. Cached in Redis (TTL 30s).",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": false,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Post ID"
        },
        {
          "name": "page",
          "in": "query",
          "type": "integer",
          "required": false,
          "default": 1
        },
        {
          "name": "limit",
          "in": "query",
          "type": "integer",
          "required": false,
          "default": 20
        },
        {
          "name": "parent_id",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Pass comment ID to fetch only its replies"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Comments retrieved successfully with nested replies.",
          "example": {
            "success": true,
            "page": 1,
            "limit": 20,
            "total": 5,
            "total_pages": 1,
            "data": [
              {
                "id": 10,
                "post_id": 1,
                "parent_id": null,
                "content": "Amazing performance! Keep it up 🔥",
                "media_url": null,
                "likes_count": 2,
                "replies_count": 1,
                "has_replies": true,
                "has_reply": true,
                "is_mine": false,
                "created_at": "2026-10-12T08:10:00.000Z",
                "user": {
                  "user_id": 4,
                  "name": "Tanvir Ahmed",
                  "profile_picture": "/uploads/avatars/tanvir.jpg",
                  "role": "user",
                  "level": 2,
                  "star": 0,
                  "package_category": {
                    "id": null,
                    "name": "Standard",
                    "badge_icon": null,
                    "color_code": "#9ca3af"
                  }
                },
                "replies": [
                  {
                    "id": 11,
                    "post_id": 1,
                    "parent_id": 10,
                    "content": "Thank you so much brother! ❤️",
                    "media_url": null,
                    "likes_count": 1,
                    "replies_count": 0,
                    "has_replies": false,
                    "has_reply": false,
                    "is_mine": true,
                    "created_at": "2026-10-12T08:15:00.000Z",
                    "user": {
                      "user_id": 2,
                      "name": "Nila Akter",
                      "profile_picture": "/uploads/avatars/nila_pic.jpg",
                      "role": "host",
                      "level": 5,
                      "star": 2,
                      "package_category": {
                        "id": 1,
                        "name": "Royal VIP",
                        "badge_icon": "/uploads/vip/royal.png",
                        "color_code": "#f59e0b"
                      }
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    },
    {
      "id": "feed-comment-replies",
      "category": "feed",
      "method": "GET",
      "path": "/api/mobile/feed/:id/comments/:commentId/replies",
      "summary": "Get Dedicated Comment Replies List",
      "description": "Retrieves direct replies for a specific parent comment by commentId. Cached in Redis (TTL 30s). Returns commenter profile, levels, VIP package badge, and is_mine flag. Mobile route aliases: /api/mobile/feed/:id/comments/:commentId/replies and /api/mobile/comments/:commentId/replies.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": false,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Post ID"
        },
        {
          "name": "commentId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Parent Comment ID"
        },
        {
          "name": "page",
          "in": "query",
          "type": "integer",
          "required": false,
          "default": 1
        },
        {
          "name": "limit",
          "in": "query",
          "type": "integer",
          "required": false,
          "default": 20
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Comment replies retrieved successfully.",
          "example": {
            "success": true,
            "page": 1,
            "limit": 20,
            "total": 1,
            "total_pages": 1,
            "data": [
              {
                "id": 11,
                "post_id": 1,
                "parent_id": 10,
                "content": "Thank you so much brother! ❤️",
                "media_url": null,
                "likes_count": 1,
                "replies_count": 0,
                "has_replies": false,
                "has_reply": false,
                "is_mine": true,
                "created_at": "2026-10-12T08:15:00.000Z",
                "user": {
                  "user_id": 2,
                  "name": "Nila Akter",
                  "profile_picture": "/uploads/avatars/nila_pic.jpg",
                  "role": "host",
                  "level": 5,
                  "star": 2,
                  "package_category": {
                    "id": 1,
                    "name": "Royal VIP",
                    "badge_icon": "/uploads/vip/royal.png",
                    "color_code": "#f59e0b"
                  }
                }
              }
            ]
          }
        },
        {
          "status": 404,
          "description": "Parent comment or post not found.",
          "example": {
            "success": false,
            "message": "Parent comment not found."
          }
        }
      ]
    },
    {
      "id": "feed-add-comment",
      "category": "feed",
      "method": "POST",
      "path": "/api/mobile/feed/:id/comments",
      "summary": "Add Comment or Reply (Auto FCM Push Notification)",
      "description": "Posts a new comment on a post, or replies to an existing comment when parent_id is specified. Updates MySQL first, increments comments_count / replies_count, invalidates Redis cache, and automatically triggers Firebase FCM push notifications (notifies post author when a comment is posted, or notifies parent comment author when a reply is posted).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Post ID"
        }
      ],
      "requestBody": {
        "type": "object",
        "required": true,
        "properties": {
          "content": {
            "type": "string",
            "description": "Comment text content"
          },
          "parent_id": {
            "type": "integer",
            "description": "Optional ID of the comment to reply to"
          },
          "media_url": {
            "type": "string",
            "description": "Optional media attachment URL"
          }
        },
        "example": {
          "content": "Amazing performance! Keep it up 🔥",
          "parent_id": null
        }
      },
      "responses": [
        {
          "status": 201,
          "description": "Comment created successfully.",
          "example": {
            "success": true,
            "message": "Comment posted successfully.",
            "comment": {
              "id": 10,
              "post_id": 1,
              "parent_id": null,
              "content": "Amazing performance! Keep it up 🔥",
              "media_url": null,
              "likes_count": 0,
              "replies_count": 0,
              "has_replies": false,
              "has_reply": false,
              "replies": [],
              "is_mine": true,
              "created_at": "2026-10-12T08:10:00.000Z",
              "updated_at": "2026-10-12T08:10:00.000Z",
              "user": {
                "user_id": 2,
                "name": "Nila Akter",
                "profile_picture": "/uploads/avatars/nila_pic.jpg",
                "role": "host",
                "level": 5,
                "star": 2,
                "package_category": {
                  "id": 1,
                  "name": "Royal VIP",
                  "badge_icon": "/uploads/vip/royal.png",
                  "color_code": "#f59e0b"
                }
              }
            }
          }
        }
      ]
    },
    {
      "id": "feed-reactions-list",
      "category": "feed",
      "method": "GET",
      "path": "/api/mobile/feed/:id/reactions",
      "summary": "Get List of Users Who Reacted",
      "description": "Returns the paginated list of all users who reacted to a post. For each user, provides user_id, name, profile_picture, reaction_type, and active VIP package category details (id, name, badge_icon, color_code). Cached in Redis (TTL 30s).",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": false,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Post ID"
        },
        {
          "name": "page",
          "in": "query",
          "type": "integer",
          "required": false,
          "default": 1
        },
        {
          "name": "limit",
          "in": "query",
          "type": "integer",
          "required": false,
          "default": 20
        },
        {
          "name": "type",
          "in": "query",
          "type": "string",
          "required": false,
          "enum": [
            "like",
            "love",
            "haha",
            "wow",
            "sad",
            "angry"
          ]
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Reactions list retrieved successfully.",
          "example": {
            "success": true,
            "page": 1,
            "limit": 20,
            "total": 15,
            "total_pages": 1,
            "data": [
              {
                "reaction_id": 1,
                "reaction_type": "love",
                "created_at": "2026-10-12T08:05:00.000Z",
                "is_mine": false,
                "user": {
                  "user_id": 3,
                  "name": "Karim Hassan",
                  "profile_picture": "/uploads/avatars/karim.jpg",
                  "role": "user",
                  "level": 3,
                  "star": 1,
                  "package_category": {
                    "id": 2,
                    "name": "Diamond VIP",
                    "badge_icon": "/uploads/vip/diamond.png",
                    "color_code": "#3b82f6"
                  }
                }
              }
            ]
          }
        }
      ]
    },
    {
      "id": "feed-react-post",
      "category": "feed",
      "method": "POST",
      "path": "/api/mobile/feed/:id/react",
      "summary": "React / Like a Post (Toggle or Switch)",
      "description": "Adds, switches, or removes a reaction on a post. Supported reactions: like, love, haha, wow, sad, angry. Clicking the same reaction again removes it (toggle off). Updates MySQL transaction first, adjusts likes_count, and invalidates Redis cache.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Post ID"
        }
      ],
      "requestBody": {
        "type": "object",
        "properties": {
          "reaction_type": {
            "type": "string",
            "enum": [
              "like",
              "love",
              "haha",
              "wow",
              "sad",
              "angry"
            ],
            "default": "like"
          }
        },
        "example": {
          "reaction_type": "love"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Reaction updated successfully.",
          "example": {
            "success": true,
            "message": "Post reacted with love.",
            "action": "added",
            "has_reacted": true,
            "my_reaction": "love",
            "likes_count": 15
          }
        }
      ]
    },
    {
      "id": "feed-delete-post",
      "category": "feed",
      "method": "DELETE",
      "path": "/api/mobile/feed/:id",
      "summary": "Delete Post",
      "description": "Deletes a post, its media attachments, reactions, and comments. Only the post author or an administrator can delete. Deletes from MySQL SSOT first and purges all Redis feed caches.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Post ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Post deleted successfully.",
          "example": {
            "success": true,
            "message": "Post deleted successfully."
          }
        }
      ]
    },
    {
      "id": "feed-update-post",
      "category": "feed",
      "method": "PUT",
      "path": "/api/mobile/feed/:id",
      "summary": "Update Post",
      "description": "Updates a post title or content. Only the author or an administrator can update. Updates MySQL first and immediately invalidates all associated Redis cache keys.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Post ID"
        }
      ],
      "requestBody": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "description": "Updated post title"
          },
          "content": {
            "type": "string",
            "description": "Updated post content"
          }
        },
        "example": {
          "title": "Updated title 🎵",
          "content": "Updated caption content..."
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Post updated successfully.",
          "example": {
            "success": true,
            "message": "Post updated successfully."
          }
        }
      ]
    },
    {
      "id": "feed-get-post",
      "category": "feed",
      "method": "GET",
      "path": "/api/mobile/feed/:id",
      "summary": "Get Single Post Details",
      "description": "Retrieves full details of a specific news feed post by ID. Cached in Redis (TTL 60s) with real-time is_mine and current user reaction decoration.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": false,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Post ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Post details retrieved successfully.",
          "example": {
            "success": true,
            "post": {
              "id": 1,
              "user_id": 2,
              "title": "Enjoying the music festival 🎵",
              "content": "Check out the opening show!",
              "media_type": "video",
              "media_url": "/uploads/posts/festival_stage_video.mp4",
              "media": [],
              "likes_count": 14,
              "comments_count": 5,
              "is_mine": true,
              "has_reacted": true,
              "my_reaction": "love",
              "author": {
                "id": 2,
                "name": "Nila Akter",
                "profile_picture": "/uploads/avatars/nila_pic.jpg",
                "role": "host",
                "level": 5,
                "star": 2,
                "package_category": {
                  "id": 1,
                  "name": "Royal VIP",
                  "badge_icon": "/uploads/vip/royal.png",
                  "color_code": "#f59e0b"
                }
              },
              "created_at": "2026-10-12T08:00:00.000Z",
              "updated_at": "2026-10-12T08:00:00.000Z"
            }
          }
        }
      ]
    },
    {
      "id": "feed-list",
      "category": "feed",
      "method": "GET",
      "path": "/api/mobile/feed",
      "summary": "Get News Feed Posts (Redis Cached & is_mine Flag)",
      "description": "Retrieves paginated news feed posts ordered by creation date descending. Served through Redis cache-aside (TTL 60s). Dynamically computes is_mine: true for any post authored by the currently authenticated user, along with has_reacted and my_reaction status. Includes author profiles with VIP package category badges.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": false,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        }
      ],
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "type": "integer",
          "required": false,
          "default": 1,
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "type": "integer",
          "required": false,
          "default": 10,
          "description": "Items per page (max 50)"
        },
        {
          "name": "filter",
          "in": "query",
          "type": "string",
          "required": false,
          "default": "all",
          "enum": [
            "all",
            "video",
            "audio",
            "image"
          ],
          "description": "Filter posts by media type"
        },
        {
          "name": "user_id",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "View specific user profile posts only"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Feed retrieved successfully.",
          "example": {
            "success": true,
            "page": 1,
            "limit": 10,
            "total": 25,
            "total_pages": 3,
            "data": [
              {
                "id": 1,
                "user_id": 2,
                "title": "Enjoying the music festival 🎵",
                "content": "Check out the opening show!",
                "media_type": "multiple",
                "media_url": "/uploads/posts/festival_stage_video.mp4",
                "media": [
                  {
                    "id": 1,
                    "media_type": "video",
                    "media_url": "/uploads/posts/festival_stage_video.mp4",
                    "thumbnail_url": "/uploads/posts/festival_stage_thumb.jpg",
                    "duration": 45
                  }
                ],
                "likes_count": 14,
                "comments_count": 5,
                "is_mine": true,
                "has_reacted": true,
                "my_reaction": "love",
                "author": {
                  "id": 2,
                  "name": "Nila Akter",
                  "profile_picture": "/uploads/avatars/nila_pic.jpg",
                  "role": "host",
                  "level": 5,
                  "star": 2,
                  "package_category": {
                    "id": 1,
                    "name": "Royal VIP",
                    "badge_icon": "/uploads/vip/royal.png",
                    "color_code": "#f59e0b"
                  }
                },
                "created_at": "2026-10-12T08:00:00.000Z",
                "updated_at": "2026-10-12T08:00:00.000Z"
              }
            ]
          }
        }
      ]
    },
    {
      "id": "feed-create-post",
      "category": "feed",
      "method": "POST",
      "path": "/api/mobile/feed",
      "summary": "Create News Feed Post (Multi-Image, Video, Audio & FCM Push to Followers)",
      "description": "Creates a new post on the news feed. Supports multiple media attachments (images, video, audio) via either multipart/form-data upload or JSON payload. Media types supported: image, video, audio. Employs MySQL SSOT writes first followed by immediate Redis feed invalidation and automated Firebase FCM push notifications to all followers.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        },
        {
          "name": "Content-Type",
          "type": "string",
          "required": false,
          "example": "application/json"
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "object",
        "required": false,
        "properties": {
          "title": {
            "type": "string",
            "description": "Optional post title/headline"
          },
          "content": {
            "type": "string",
            "description": "Post text / caption"
          },
          "media": {
            "type": "array",
            "description": "Array of media attachments",
            "items": {
              "type": "object",
              "properties": {
                "media_type": {
                  "type": "string",
                  "enum": [
                    "image",
                    "video",
                    "audio"
                  ]
                },
                "media_url": {
                  "type": "string"
                },
                "thumbnail_url": {
                  "type": "string"
                },
                "duration": {
                  "type": "integer",
                  "description": "Duration in seconds for video or audio"
                }
              }
            }
          }
        },
        "example": {
          "title": "Enjoying the music festival 🎵",
          "content": "Check out the opening show and audio snippet from yesterday!",
          "media": [
            {
              "media_type": "video",
              "media_url": "/uploads/posts/festival_stage_video.mp4",
              "thumbnail_url": "/uploads/posts/festival_stage_thumb.jpg",
              "duration": 45
            },
            {
              "media_type": "audio",
              "media_url": "/uploads/posts/live_track_audio.mp3",
              "duration": 120
            },
            {
              "media_type": "image",
              "media_url": "/uploads/posts/crowd_photo.jpg"
            }
          ]
        }
      },
      "responses": [
        {
          "status": 201,
          "description": "Post created successfully.",
          "example": {
            "success": true,
            "message": "Post created successfully.",
            "post": {
              "id": 1,
              "user_id": 2,
              "title": "Enjoying the music festival 🎵",
              "content": "Check out the opening show and audio snippet from yesterday!",
              "media_type": "multiple",
              "media_url": "/uploads/posts/festival_stage_video.mp4",
              "media": [
                {
                  "media_type": "video",
                  "media_url": "/uploads/posts/festival_stage_video.mp4",
                  "thumbnail_url": "/uploads/posts/festival_stage_thumb.jpg",
                  "duration": 45
                },
                {
                  "media_type": "audio",
                  "media_url": "/uploads/posts/live_track_audio.mp3",
                  "duration": 120
                }
              ],
              "likes_count": 0,
              "comments_count": 0,
              "is_mine": true,
              "has_reacted": false,
              "my_reaction": null,
              "author": {
                "id": 2,
                "name": "Nila Akter",
                "profile_picture": "/uploads/avatars/nila_pic.jpg",
                "role": "host",
                "level": 5,
                "star": 2,
                "package_category": {
                  "id": 1,
                  "name": "Royal VIP",
                  "badge_icon": "/uploads/vip/royal.png",
                  "color_code": "#f59e0b"
                }
              },
              "created_at": "2026-10-12T08:00:00.000Z",
              "updated_at": "2026-10-12T08:00:00.000Z"
            }
          }
        }
      ]
    },
    {
      "id": "app-config",
      "category": "config",
      "method": "GET",
      "path": "/api/mobile/config",
      "summary": "Get App Bootstrap Configuration",
      "description": "Single public endpoint returning all global metadata required by the mobile app during startup: Socket.IO credentials, WebRTC provider, active currency & economy mode (diamond vs direct coins), commission percentages, upload CDN URLs, and feature flags. Cached with Redis Cache-Aside with instant admin invalidation.",
      "requiresAuth": false,
      "requestHeaders": [],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Global configuration retrieved successfully.",
          "example": {
            "success": true,
            "project_name": "umi",
            "server_time": "2026-10-11T16:58:20.029Z",
            "urls": {
              "base_url": "http://localhost:5050",
              "api_base_url": "http://localhost:5050/api",
              "uploads_base_url": "http://localhost:5050/uploads",
              "avatar_upload_endpoint": "http://localhost:5050/api/mobile/auth/avatar"
            },
            "socket": {
              "url": "http://localhost:5050",
              "path": "/socket.io",
              "transports": [
                "websocket",
                "polling"
              ],
              "ping_interval_ms": 25000,
              "ping_timeout_ms": 30000,
              "reconnection_attempts": 10,
              "reconnection_delay_ms": 1000,
              "auth_required": false
            },
            "app_name": "UMI LIVE",
            "app_version": "1.0.0",
            "min_supported_version": "1.0.0",
            "maintenance_mode": false,
            "maintenance_message": "Platform is under scheduled maintenance. Please check back shortly.",
            "economy": {
              "is_convert_to_diamond": true,
              "currency_mode": "diamond_conversion",
              "coin_to_diamond_ratio": 1,
              "admin_gift_commission_percent": 15,
              "agency_gift_commission_percent": 10,
              "host_coin_share_percent": 75,
              "user_transfer_commission_percent": 5,
              "diamond_to_usd_rate": 0.005,
              "min_withdrawal_diamonds": 1000,
              "primary_currency": "coin",
              "secondary_currency": "diamond",
              "currency_symbols": {
                "coin": "🪙",
                "diamond": "💎",
                "fiat": "৳",
                "fiat_code": "BDT"
              }
            },
            "streaming": {
              "provider": "livekit",
              "livekit_url": "wss://livekit.umi.live",
              "agora_app_id": null
            },
            "features": {
              "enable_guest_login": true,
              "enable_coin_transfer": false,
              "enable_p2p_transfer": false,
              "enable_agency_recruitment": true,
              "enable_vip_store": true,
              "enable_diamond_cashout": true
            }
          }
        }
      ]
    },
    {
      "id": "auth-register",
      "category": "auth",
      "method": "POST",
      "path": "/api/mobile/auth/register",
      "summary": "Register New Mobile User",
      "description": "Creates a new user account with default starting coins (100 coins), supports direct mobile image/photo file upload for avatar (multipart/form-data), and returns an authentication JWT token.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Content-Type",
          "value": "multipart/form-data (or application/json)",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "multipart/form-data",
        "fields": [
          {
            "name": "avatar",
            "type": "file (binary)",
            "required": false,
            "description": "Direct mobile photo / avatar image upload from device gallery or camera."
          },
          {
            "name": "email",
            "type": "string",
            "required": true,
            "description": "Unique valid email address of the user."
          },
          {
            "name": "password",
            "type": "string",
            "required": true,
            "description": "Plaintext password (minimum 6 characters)."
          },
          {
            "name": "full_name",
            "type": "string",
            "required": false,
            "description": "Display name / nickname of the user."
          },
          {
            "name": "bio",
            "type": "string",
            "required": false,
            "description": "Short user bio / profile tagline."
          },
          {
            "name": "avatar_url",
            "type": "string",
            "required": false,
            "description": "Optional fallback URL if not uploading a direct file."
          },
          {
            "name": "role",
            "type": "string",
            "required": false,
            "description": "Account role (default: \"user\", or \"host\")."
          }
        ],
        "example": {
          "email": "alex.mobile@example.com",
          "password": "SecretPassword123",
          "full_name": "Alex Rivera",
          "bio": "Music lover and streamer from Dhaka 🎸",
          "avatar": "[Mobile Photo / File]"
        }
      },
      "responses": [
        {
          "status": 201,
          "description": "Account successfully registered and JWT token issued.",
          "example": {
            "success": true,
            "message": "Account registered successfully.",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "Bearer",
            "user": {
              "id": 15,
              "email": "alex.mobile@example.com",
              "full_name": "Alex Rivera",
              "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
              "bio": "Music lover and streamer from Dhaka 🎸",
              "role": "user",
              "coins": 100,
              "diamonds": 0,
              "level": 1,
              "vip_package": "Standard",
              "is_banned": false,
              "created_at": "2026-10-11T21:40:00.000Z"
            }
          }
        },
        {
          "status": 400,
          "description": "Validation failure: missing fields, invalid email format, or password too short.",
          "example": {
            "success": false,
            "message": "Please provide a valid email address."
          }
        },
        {
          "status": 409,
          "description": "Conflict: email already registered in the system.",
          "example": {
            "success": false,
            "message": "An account with this email already exists."
          }
        }
      ]
    },
    {
      "id": "auth-upload-avatar",
      "category": "auth",
      "method": "POST",
      "path": "/api/mobile/auth/upload-avatar",
      "summary": "Upload Mobile Avatar Image File",
      "description": "Uploads an avatar photo directly from mobile storage/camera. Saves to server storage and returns public /uploads/avatars/... path.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Content-Type",
          "value": "multipart/form-data",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "multipart/form-data",
        "fields": [
          {
            "name": "avatar",
            "type": "file (binary)",
            "required": true,
            "description": "Image file (PNG, JPG, JPEG, WEBP, GIF, SVG up to 35MB)."
          }
        ],
        "example": {
          "avatar": "[Binary Image File from Device]"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Avatar uploaded successfully.",
          "example": {
            "success": true,
            "message": "Avatar uploaded successfully.",
            "avatar_url": "/uploads/avatars/user_pic_1791734439900-763113407.jpg",
            "filename": "user_pic_1791734439900-763113407.jpg",
            "size": 142080,
            "mimetype": "image/jpeg"
          }
        },
        {
          "status": 400,
          "description": "No file provided or unsupported file format.",
          "example": {
            "success": false,
            "message": "No image file uploaded. Send multipart/form-data with field name \"avatar\", \"file\", or \"image\"."
          }
        }
      ]
    },
    {
      "id": "auth-login",
      "category": "auth",
      "method": "POST",
      "path": "/api/mobile/auth/login",
      "summary": "Mobile User Login",
      "description": "Authenticates a user using email or numeric User ID and password. Returns JWT token and complete user profile.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "application/json",
        "fields": [
          {
            "name": "identifier",
            "type": "string",
            "required": true,
            "description": "Email address OR numeric User ID (e.g. \"alex@example.com\" or \"15\" or \"#15\")."
          },
          {
            "name": "password",
            "type": "string",
            "required": true,
            "description": "User password."
          }
        ],
        "example": {
          "identifier": "alex.mobile@example.com",
          "password": "SecretPassword123"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Authentication successful. Returns JWT token and fresh user profile.",
          "example": {
            "success": true,
            "message": "Login successful.",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "Bearer",
            "user": {
              "id": 15,
              "email": "alex.mobile@example.com",
              "full_name": "Alex Rivera",
              "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
              "bio": "Music lover and streamer from Dhaka 🎸",
              "role": "user",
              "coins": 100,
              "diamonds": 0,
              "level": 1,
              "vip_package": "Standard",
              "is_banned": false,
              "created_at": "2026-10-11T21:40:00.000Z"
            }
          }
        },
        {
          "status": 401,
          "description": "Invalid credentials: user not found or password incorrect.",
          "example": {
            "success": false,
            "message": "Invalid credentials. Please check your email/ID and password."
          }
        },
        {
          "status": 403,
          "description": "Account banned or suspended by admin.",
          "example": {
            "success": false,
            "message": "Your account is suspended. Please contact support."
          }
        }
      ]
    },
    {
      "id": "auth-send-otp",
      "category": "auth",
      "method": "POST",
      "path": "/api/mobile/auth/send-otp",
      "summary": "Send One-Time Password (OTP)",
      "description": "Generates a 6-digit OTP code sent to user email or phone with 5-minute validity. Used for quick passwordless login and instant live stream account registration.",
      "requiresAuth": false,
      "requestBody": {
        "type": "application/json",
        "schema": {
          "identifier": "string (email or mobile number, required)",
          "email": "string (optional alias)",
          "phone": "string (optional alias)"
        },
        "example": {
          "identifier": "user@umi.live"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "OTP generated and dispatched successfully",
          "example": {
            "success": true,
            "message": "OTP sent successfully to user@umi.live.",
            "otp": "596964",
            "expiresIn": 300
          }
        },
        {
          "status": 400,
          "description": "Missing identifier",
          "example": {
            "success": false,
            "message": "Email or phone number is required."
          }
        }
      ]
    },
    {
      "id": "auth-verify-otp",
      "category": "auth",
      "method": "POST",
      "path": "/api/mobile/auth/verify-otp",
      "summary": "Verify OTP & Login / Auto-Register",
      "description": "Verifies the 6-digit OTP code. If the user already exists, logs them in; if not, automatically registers a new account and returns JWT token and full profile.",
      "requiresAuth": false,
      "requestBody": {
        "type": "application/json",
        "schema": {
          "identifier": "string (email or phone, required)",
          "otp": "string (6 digits, required)",
          "full_name": "string (optional display name for new users)"
        },
        "example": {
          "identifier": "user@umi.live",
          "otp": "596964",
          "full_name": "Live Star"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "OTP verified successfully with JWT session",
          "example": {
            "success": true,
            "message": "Login successful!",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "Bearer",
            "user": {
              "id": 8,
              "email": "user@umi.live",
              "full_name": "Live Star",
              "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=8",
              "role": "user",
              "coins": 100,
              "diamonds": 0,
              "level": 1
            },
            "isNewUser": false
          }
        },
        {
          "status": 400,
          "description": "Invalid or expired OTP code",
          "example": {
            "success": false,
            "message": "Invalid or expired OTP code. Please request a new one."
          }
        }
      ]
    },
    {
      "id": "auth-verify-token",
      "category": "auth",
      "method": "GET",
      "path": "/api/mobile/auth/verify-token",
      "summary": "Verify Token / Check Session",
      "description": "Checks whether a JWT token is valid, expired, or invalid without requiring a full authenticated session. Use this on app launch to decide whether to show login screen or proceed. Always returns HTTP 200 — check the `valid` field in the response body.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "The JWT token to validate"
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Token is valid and user is active.",
          "example": {
            "valid": true,
            "expired": false,
            "banned": false,
            "user_id": 42,
            "email": "user@example.com",
            "full_name": "John Doe",
            "avatar_url": "/uploads/avatars/john.jpg",
            "issued_at": "2026-10-01T08:00:00.000Z",
            "expires_at": "2026-10-08T08:00:00.000Z"
          }
        },
        {
          "status": 200,
          "description": "Token is expired.",
          "example": {
            "valid": false,
            "expired": true,
            "message": "Token has expired. Please login again.",
            "expired_at": "2026-10-08T08:00:00.000Z",
            "user_id": 42
          }
        },
        {
          "status": 200,
          "description": "No token provided.",
          "example": {
            "valid": false,
            "expired": false,
            "message": "No token provided."
          }
        },
        {
          "status": 200,
          "description": "Token is invalid (bad signature or malformed).",
          "example": {
            "valid": false,
            "expired": false,
            "message": "Invalid token."
          }
        },
        {
          "status": 200,
          "description": "Account is banned.",
          "example": {
            "valid": false,
            "expired": false,
            "banned": true,
            "message": "Account has been suspended.",
            "user_id": 42
          }
        }
      ]
    },
    {
      "id": "auth-me",
      "category": "auth",
      "method": "GET",
      "path": "/api/mobile/auth/me",
      "summary": "Get Current Authenticated User Profile (Rich Profile)",
      "description": "Fetches current authenticated user profile, level, followers/following count, active package & category details (including purchased package image URL and category name), equipped entry effects, equipped special thumbnail, star count, coin balance, and conditional diamond balance based on platform economy mode (Cache-Aside with DB fallback).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "Valid JWT token"
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Rich profile details retrieved successfully with purchased package and category image.",
          "example": {
            "success": true,
            "user": {
              "id": 7,
              "full_name": "Nibir Chowdhury",
              "email": "nibir@example.com",
              "mobile_number": "+8801712345678",
              "country": "Bangladesh",
              "bio": "Live streamer & VIP user 🌟",
              "avatar_url": "/uploads/avatars/user_7.jpg",
              "role": "user",
              "level": 5,
              "followers_count": 240,
              "following_count": 85,
              "package_category_name": "Royal",
              "category_id": 1,
              "category_name": "Royal",
              "category_badge_icon": "👑",
              "package_id": 1,
              "package_name": "Royal 30-Day Pass",
              "package_image": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
              "package_image_url": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
              "package_color": "#f59e0b",
              "package_expires_at": "2026-11-14T04:37:25.000Z",
              "package_days_remaining": 30,
              "package_is_equipped": true,
              "active_package": {
                "package_id": 1,
                "package_name": "Royal 30-Day Pass",
                "package_image": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
                "package_image_url": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
                "category_id": 1,
                "category_name": "Royal",
                "category_badge_icon": "👑",
                "category_color": "#f59e0b",
                "subscription_id": 1,
                "is_equipped": true,
                "expires_at": "2026-11-14T04:37:25.000Z",
                "days_remaining": 30
              },
              "active_entry_effect": {
                "id": 2,
                "name": "Dragon Descent",
                "effect_type": "svga",
                "preview_image_url": "/uploads/effects/dragon_thumb.png",
                "svga_url": "/uploads/effects/dragon.svga",
                "gif_url": null,
                "sound_url": "/uploads/effects/dragon_roar.mp3"
              },
              "active_thumbnail": {
                "id": 1,
                "name": "Golden Glow Live Border",
                "image_url": "/uploads/thumbnails/golden_border.png"
              },
              "star": 120,
              "coin": 50000,
              "diamonds": 350,
              "is_diamond_mode": true,
              "coin_to_diamond_ratio": 1,
              "created_at": "2026-10-11T21:40:00.000Z"
            }
          }
        },
        {
          "status": 401,
          "description": "Missing or expired Bearer token.",
          "example": {
            "success": false,
            "message": "Authentication required. No token provided."
          }
        }
      ]
    },
    {
      "id": "live-rooms",
      "category": "live-rooms",
      "method": "GET",
      "path": "/api/mobile/live/rooms",
      "summary": "[🎥🎙️ Video & Audio Live] Get Active Broadcast Rooms (Explore Feed)",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nReturns list of live streaming rooms prioritized by VIP rank and viewers. Authenticated endpoint that automatically excludes the logged-in user's own broadcast room from the list.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "JWT Authentication token"
        }
      ],
      "parameters": [
        {
          "name": "category",
          "type": "string",
          "required": false,
          "description": "Filter by stream category (e.g. \"Chatting\", \"Music\", \"Gaming\")."
        },
        {
          "name": "search",
          "type": "string",
          "required": false,
          "description": "Search keyword for room title or host name."
        },
        {
          "name": "page",
          "type": "integer",
          "required": false,
          "description": "Page number for pagination (default: 1)."
        },
        {
          "name": "limit",
          "type": "integer",
          "required": false,
          "description": "Number of rooms per page (default: 20)."
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "List of active live streams (excluding current user's room).",
          "example": {
            "success": true,
            "rooms": [
              {
                "id": 1,
                "room_id": "live_room_9281",
                "host_id": 8,
                "host_name": "Sara Khan",
                "host_avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
                "title": "Late Night Acoustic Session 🎵",
                "category": "Music",
                "background_image_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200",
                "status": "live",
                "viewer_count": 142,
                "total_diamonds": 3450,
                "started_at": "2026-10-11T20:15:00.000Z"
              }
            ],
            "total": 1,
            "page": 1,
            "limit": 20
          }
        },
        {
          "status": 401,
          "description": "Unauthorized: Missing or invalid Bearer token.",
          "example": {
            "success": false,
            "message": "Authentication required. No token provided."
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-my-active-room",
      "category": "live-rooms",
      "method": "GET",
      "path": "/api/mobile/live/rooms/my-active",
      "summary": "[🎥🎙️ Video & Audio Live] Get My Active Broadcast Room",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nChecks if the authenticated host currently has an ongoing active live stream.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "JWT Authentication token"
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Host active room status retrieved.",
          "example": {
            "success": true,
            "has_active_room": true,
            "room": {
              "id": 2,
              "room_id": "room-rohan-202",
              "host_id": 3,
              "title": "Mythical Glory Solo Rank Push! MLBB 🚀",
              "category": "Gaming",
              "background_image_url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200",
              "status": "live",
              "viewer_count": 894,
              "total_diamonds": 9150
            }
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-user-history",
      "category": "live-rooms",
      "method": "GET",
      "path": "/api/mobile/live/history",
      "summary": "[🎥🎙️ Video & Audio Live] Get Daily Live Streaming & Earnings History (All Users)",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nComprehensive daily breakdown of live streaming activity and gift coins received, globally accessible to ALL users (normal users, hosts, agencies, moderators, resellers). Includes per-day total live minutes, audio minutes, video minutes, sessions count, and coins/diamonds received, along with period totals. Cached in Redis ('user:live_activity:{userId}:{month}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "JWT Authentication token"
        }
      ],
      "parameters": [
        {
          "name": "month",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Filter by month in YYYY-MM format (e.g. 2026-10) or 'all' for lifetime history (default: current month)"
        },
        {
          "name": "userId",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Optional User ID (inspect another user's activity; allowed for Admin, Moderator, Agency)"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Daily live history retrieved successfully.",
          "example": {
            "success": true,
            "message": "Daily live streaming and earnings history retrieved successfully.",
            "data": {
              "user": {
                "id": 2,
                "full_name": "Nila Akter",
                "role": "host",
                "host_type": "video",
                "coins": 5495,
                "diamonds": 18500
              },
              "period": {
                "month": "2026-10",
                "is_all_time": false
              },
              "summary": {
                "total_active_days": 1,
                "total_live_minutes": 120,
                "total_live_seconds": 7200,
                "formatted_total_duration": "02h 00m 00s",
                "video_live_minutes": 120,
                "video_live_seconds": 7200,
                "formatted_video_duration": "02h 00m 00s",
                "audio_live_minutes": 0,
                "audio_live_seconds": 0,
                "formatted_audio_duration": "00m 00s",
                "total_sessions_count": 1,
                "total_coins_received": 5000,
                "total_diamonds_received": 2500,
                "total_gifts_received": 10
              },
              "daily_breakdown": [
                {
                  "date": "2026-10-12",
                  "total_live_minutes": 120,
                  "total_live_seconds": 7200,
                  "formatted_total_duration": "02h 00m 00s",
                  "video_live_minutes": 120,
                  "video_live_seconds": 7200,
                  "formatted_video_duration": "02h 00m 00s",
                  "audio_live_minutes": 0,
                  "audio_live_seconds": 0,
                  "formatted_audio_duration": "00m 00s",
                  "sessions_count": 1,
                  "coins_received": 5000,
                  "diamonds_received": 2500,
                  "gifts_count": 10
                }
              ]
            }
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "gifts-list",
      "category": "gifts",
      "method": "GET",
      "path": "/api/mobile/gifts",
      "summary": "List Available Virtual Gifts",
      "description": "Fetches all active virtual gifts that viewers can purchase and send to live hosts.",
      "requiresAuth": false,
      "requestHeaders": [],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "List of active gifts.",
          "example": {
            "success": true,
            "gifts": [
              {
                "id": 1,
                "name": "Red Rose",
                "icon_url": "🌹",
                "animation_type": "simple",
                "coin_cost": 10,
                "diamond_reward": 5,
                "category": "Romantic"
              },
              {
                "id": 5,
                "name": "Super Sports Car",
                "icon_url": "/uploads/gifts/car_preview.png",
                "animation_type": "svga",
                "animation_url": "/uploads/gifts/car_animation.svga",
                "sound_url": null,
                "coin_cost": 5000,
                "diamond_reward": 2500,
                "category": "Luxury"
              },
              {
                "id": 8,
                "name": "Fire Dragon Roar",
                "icon_url": "/uploads/gifts/dragon.gif",
                "animation_type": "gif",
                "animation_url": "/uploads/gifts/dragon.gif",
                "sound_url": "/uploads/gifts/dragon_roar.mp3",
                "coin_cost": 1200,
                "diamond_reward": 600,
                "category": "Legendary"
              }
            ]
          }
        }
      ]
    },
    {
      "id": "gifts-send",
      "category": "gifts",
      "method": "POST",
      "path": "/api/mobile/gifts/send",
      "summary": "Send Virtual Gift to Any User or Host",
      "description": "Sends gifts to any user by receiverId, or to a live room broadcaster by roomId. Supports dual economy (diamonds vs direct coin commission split) and broadcasts Socket.IO animation event.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        },
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "application/json",
        "fields": [
          {
            "name": "giftId",
            "type": "integer",
            "required": true,
            "description": "ID of the virtual gift to send."
          },
          {
            "name": "receiverId",
            "type": "integer",
            "required": false,
            "description": "Target recipient user ID (can be ANY user, host, or viewer). Either receiverId or roomId is required."
          },
          {
            "name": "roomId",
            "type": "string",
            "required": false,
            "description": "Optional active live room ID if sending within a stream."
          },
          {
            "name": "count",
            "type": "integer",
            "required": false,
            "description": "Number of gifts to send (default: 1)."
          }
        ],
        "example": {
          "giftId": 1,
          "receiverId": 2,
          "count": 5
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Gift sent successfully and balances synchronized.",
          "example": {
            "success": true,
            "message": "Successfully sent Red Rose x5 to Nila Akter!",
            "newBalance": 24750,
            "gift": {
              "id": 1,
              "name": "Red Rose",
              "icon": "🌹",
              "animation": "simple",
              "count": 5,
              "total_coins": 50,
              "recipient": {
                "id": 2,
                "full_name": "Nila Akter",
                "role": "host"
              }
            }
          }
        },
        {
          "status": 400,
          "description": "Insufficient balance or invalid recipient.",
          "example": {
            "success": false,
            "message": "Insufficient coins balance. You need 50 coins."
          }
        }
      ]
    },
    {
      "id": "wallet-balance",
      "category": "wallet",
      "method": "GET",
      "path": "/api/mobile/wallet/balance",
      "summary": "Get Wallet Balance",
      "description": "Retrieves current coin balance and diamond earnings for authenticated user.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Current balances returned.",
          "example": {
            "success": true,
            "coins": 4900,
            "diamonds": 3500
          }
        }
      ]
    },
    {
      "id": "auth-update-profile",
      "category": "auth",
      "method": "PUT",
      "path": "/api/mobile/auth/profile",
      "summary": "Update User Profile",
      "description": "Updates full name, bio, mobile number, country, and optionally uploads a new avatar image. Immediately invalidates Redis user profile cache.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        },
        {
          "name": "Content-Type",
          "value": "multipart/form-data (or application/json)",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "multipart/form-data",
        "fields": [
          {
            "name": "full_name",
            "type": "string",
            "required": false,
            "description": "Updated display name"
          },
          {
            "name": "bio",
            "type": "string",
            "required": false,
            "description": "Updated bio description"
          },
          {
            "name": "mobile_number",
            "type": "string",
            "required": false,
            "description": "Updated mobile phone number"
          },
          {
            "name": "country",
            "type": "string",
            "required": false,
            "description": "Country of residence"
          },
          {
            "name": "avatar",
            "type": "file (binary)",
            "required": false,
            "description": "New avatar image file"
          }
        ],
        "example": {
          "full_name": "Alex Rivera",
          "bio": "Music producer & live streamer 🎵",
          "mobile_number": "+8801700112233",
          "country": "Bangladesh"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Profile updated successfully.",
          "example": {
            "success": true,
            "message": "Profile updated successfully.",
            "user": {
              "id": 15,
              "full_name": "Alex Rivera",
              "email": "alex.mobile@example.com",
              "mobile_number": "+8801700112233",
              "country": "Bangladesh",
              "bio": "Music producer & live streamer 🎵",
              "avatar_url": "/uploads/avatars/alex_profile.jpg"
            }
          }
        }
      ]
    },
    {
      "id": "auth-update-fcm-token",
      "category": "auth",
      "method": "POST",
      "path": "/api/mobile/auth/fcm-token",
      "summary": "Register or Update Firebase FCM Push Token",
      "description": "Registers device Firebase Cloud Messaging (FCM) registration token in database for real-time chat push notifications. Automatically synchronizes with users table and user_fcm_tokens multi-device table.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        },
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "application/json",
        "fields": [
          {
            "name": "fcm_token",
            "type": "string",
            "required": true,
            "description": "Unique device Firebase FCM token string"
          },
          {
            "name": "device_type",
            "type": "string",
            "required": false,
            "description": "Device platform: android, ios, or web (default: android)"
          },
          {
            "name": "device_name",
            "type": "string",
            "required": false,
            "description": "Device model name (e.g. Samsung S24, iPhone 15 Pro)"
          }
        ],
        "example": {
          "fcm_token": "fXyZ_eX4mPL3-t0k3n_...",
          "device_type": "android",
          "device_name": "Samsung Galaxy S24 Ultra"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "FCM token saved successfully",
          "example": {
            "success": true,
            "message": "FCM push token registered successfully.",
            "data": {
              "fcm_token": "fXyZ_eX4mPL3-t0k3n_...",
              "device_type": "android",
              "device_name": "Samsung Galaxy S24 Ultra"
            }
          }
        },
        {
          "status": 400,
          "description": "Missing fcm_token in request body",
          "example": {
            "success": false,
            "message": "fcm_token is required."
          }
        }
      ]
    },
    {
      "id": "auth-delete-fcm-token",
      "category": "auth",
      "method": "DELETE",
      "path": "/api/mobile/auth/fcm-token",
      "summary": "Remove Device FCM Token on Logout",
      "description": "Deletes or deactivates the device FCM push token when user logs out to prevent receiving background notifications after logout.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        },
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": false
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "application/json",
        "fields": [
          {
            "name": "fcm_token",
            "type": "string",
            "required": false,
            "description": "Optional specific token to delete. If omitted, clears all active device tokens for the user."
          }
        ],
        "example": {
          "fcm_token": "fXyZ_eX4mPL3-t0k3n_..."
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "FCM token removed successfully",
          "example": {
            "success": true,
            "message": "FCM token removed successfully."
          }
        }
      ]
    },
    {
      "id": "auth-blocked-users",
      "category": "auth",
      "method": "GET",
      "path": "/api/mobile/auth/blocked-users",
      "summary": "Get My Blocked Users List (Account Privacy & Settings)",
      "description": "Retrieves the full list of users blocked by the authenticated user with detailed profiles (id, full_name, avatar_url, bio, level, role, country, reason, blocked_at timestamp). Employs Redis Cache-Aside for ultra-low latency. Route alias: GET /api/mobile/users/blocked.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <TOKEN>",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Blocked users list retrieved successfully.",
          "example": {
            "success": true,
            "count": 2,
            "blocked_users": [
              {
                "id": 18,
                "full_name": "Tariq Hasan",
                "avatar_url": "https://res.cloudinary.com/example/image/upload/v1/avatars/user18.jpg",
                "bio": "Streaming enthusiast 🎮",
                "level": 12,
                "role": "user",
                "country": "Bangladesh",
                "reason": "Harassment in chat",
                "blocked_at": "2026-10-17T18:20:00.000Z"
              },
              {
                "id": 24,
                "full_name": "Sabbir Ahmed",
                "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=24",
                "bio": "Music lover 🎵",
                "level": 5,
                "role": "user",
                "country": "Bangladesh",
                "reason": null,
                "blocked_at": "2026-10-16T12:05:00.000Z"
              }
            ]
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X GET https://yourdomain.com/api/mobile/auth/blocked-users \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\n// 📋 Fetch Blocked Users List\nFuture<List<dynamic>> fetchBlockedUsers(String token) async {\n  final res = await http.get(\n    Uri.parse('https://yourdomain.com/api/mobile/auth/blocked-users'),\n    headers: {'Authorization': 'Bearer $token'},\n  );\n  final data = jsonDecode(res.body);\n  return data['blocked_users'] ?? [];\n}"
      }
    },
    {
      "id": "live-create-room",
      "category": "live-rooms",
      "method": "POST",
      "path": "/api/mobile/live/rooms",
      "summary": "[🎥🎙️ Video & Audio Live] Start Live Broadcast Room (FCM Push to Followers)",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nCreates and starts a new live broadcasting room. Automatically assigns room_id, stream_key, and sets status to \"live\". Dispatches automated Firebase FCM push notifications to all followers and active users informing them that the host is now live.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        },
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "application/json",
        "fields": [
          {
            "name": "title",
            "type": "string",
            "required": true,
            "description": "Live broadcast title"
          },
          {
            "name": "category",
            "type": "string",
            "required": false,
            "description": "Broadcast category (e.g. \"Chatting\", \"Music\", \"Gaming\")"
          },
          {
            "name": "live_type",
            "type": "string",
            "required": false,
            "description": "Broadcast type: \"video\" (default, camera on, max 9 seats) or \"audio\" (voice room, camera off, min 7 seats)"
          },
          {
            "name": "total_seats",
            "type": "number",
            "required": false,
            "description": "Total stage seat count (Video: 2-9, default 6; Audio: min 7, default 8)"
          },
          {
            "name": "background_image",
            "type": "string",
            "required": false,
            "description": "Optional room wallpaper / background image URL"
          }
        ],
        "example": {
          "title": "Late Night Voice Hangout 🎙️",
          "category": "Chatting",
          "live_type": "audio",
          "total_seats": 8
        }
      },
      "responses": [
        {
          "status": 201,
          "description": "Live broadcast created successfully.",
          "example": {
            "success": true,
            "message": "Live stream started successfully.",
            "room": {
              "id": 12,
              "room_id": "room-a1b2c3d4",
              "host_id": 15,
              "title": "Late Night Voice Hangout 🎙️",
              "category": "Chatting",
              "live_type": "audio",
              "is_audio": true,
              "is_video": false,
              "total_seats": 8,
              "status": "live",
              "stream_key": "sk_umi_1a2b3c4d5e",
              "viewer_count": 0
            }
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-join-room",
      "category": "live-rooms",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/join",
      "summary": "[🎥🎙️ Video & Audio Live] Join Live Room (Full Background, Duration & Multi-Seat State)",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nIncrements viewer count, invalidates cache, and returns complete room state including room ID, background image URL, video live total seats, current live duration (seconds & timer format), and detailed occupancy for all seats (name, profile, coin, diamond, camera on/off, mute/unmute, main seat indicator).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier (e.g. room-nila-101)"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Successfully joined room with comprehensive room metadata and seats.",
          "example": {
            "success": true,
            "message": "Joined live room successfully.",
            "room": {
              "id": 1,
              "room_id": "room-nila-101",
              "title": "Friday Night Acoustic Live Session 🎸",
              "category": "Music",
              "live_type": "video",
              "background_image_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200",
              "room_background_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200",
              "status": "live",
              "viewer_count": 431,
              "total_diamonds": 5450,
              "started_at": "2026-10-11T15:07:38.000Z",
              "live_duration": {
                "started_at": "2026-10-11T15:07:38.000Z",
                "duration_seconds": 8920,
                "duration_formatted": "02:28:40"
              },
              "total_seats": 8,
              "occupied_seats_count": 2,
              "host": {
                "id": 2,
                "name": "Nila Akter",
                "profile": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                "level": 15,
                "coin": 5095,
                "diamond": 18605
              },
              "seats": [
                {
                  "seat_number": 1,
                  "is_main_seat": true,
                  "is_occupied": true,
                  "is_camera_on": true,
                  "is_muted": false,
                  "is_locked": false,
                  "user": {
                    "id": 2,
                    "name": "Nila Akter",
                    "profile": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                    "coin": 5095,
                    "diamond": 18605,
                    "role": "host",
                    "level": 15,
                    "is_camera_on": true,
                    "is_muted": false,
                    "is_main_seat": true
                  }
                },
                {
                  "seat_number": 2,
                  "is_main_seat": false,
                  "is_occupied": true,
                  "is_camera_on": false,
                  "is_muted": true,
                  "is_locked": false,
                  "user": {
                    "id": 5,
                    "name": "Tanvir Ahmed",
                    "profile": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
                    "coin": 24800,
                    "diamond": 465,
                    "role": "user",
                    "level": 6,
                    "is_camera_on": false,
                    "is_muted": true,
                    "is_main_seat": false
                  }
                },
                {
                  "seat_number": 3,
                  "is_main_seat": false,
                  "is_occupied": false,
                  "is_camera_on": false,
                  "is_muted": false,
                  "is_locked": false,
                  "user": null
                }
              ]
            }
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-update-room-background",
      "category": "live-rooms",
      "method": "PUT",
      "path": "/api/mobile/live/rooms/:roomId/background",
      "summary": "[🎥🎙️ Video & Audio Live] Update Room Background Thumbnail (Image Upload, Preset ID, or URL)",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nUpdates the room's live background thumbnail image. Can be invoked by the Room Host, Admin, or Room Moderator.\n\n**Late Joining & State Sync**:\n- Instantly commits the new background image to the MySQL database.\n- Flushes Redis caches (`live:room:{roomId}`, `live:room:details:{roomId}`, `live:active_rooms*`).\n- Any late-joining user calling `POST /api/mobile/live/rooms/:roomId/join` or `GET /api/mobile/live/rooms/:roomId` immediately receives this updated thumbnail in `room.background_image_url`, `room.thumbnail_url`, and `room.background_thumbnail` along with their LiveKit token.\n- Emits real-time Socket.IO events `room_background_updated` and `room_thumbnail_updated` to all active participants currently inside the room.\n\n**Input Flexibility**:\n1. Direct file upload via `multipart/form-data` with field name `image` or `thumbnail`.\n2. JSON body with `thumbnail_id` referencing an active `special_thumbnails` item.\n3. JSON body with direct `thumbnail_url` or `background_image`.\n4. Clear background to null by passing `\"\"`, `\"null\"`, or `null`.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "JWT Bearer token of Host, Admin, or Moderator"
        },
        {
          "name": "Content-Type",
          "value": "multipart/form-data or application/json",
          "required": false
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Room ID (e.g. 'room-nila-101' or numeric ID '30')"
        }
      ],
      "requestBody": {
        "type": "object",
        "description": "Upload a background file, specify an equipped thumbnail ID, or provide a custom image URL",
        "properties": {
          "image": {
            "type": "file",
            "description": "Binary image file upload (PNG, JPG, WEBP, GIF, max 10MB)"
          },
          "thumbnail_id": {
            "type": "integer",
            "example": 3,
            "description": "Special thumbnail ID from user's active/equipped inventory"
          },
          "thumbnail_url": {
            "type": "string",
            "example": "https://res.cloudinary.com/example/image/upload/v1/rooms/bg_cyberpunk.jpg",
            "description": "Direct image URL for room background"
          },
          "background_image": {
            "type": "string",
            "example": "https://res.cloudinary.com/example/image/upload/v1/rooms/bg_cyberpunk.jpg",
            "description": "Direct image URL (alias for thumbnail_url)"
          }
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Room background thumbnail updated successfully.",
          "example": {
            "success": true,
            "message": "Room background thumbnail updated successfully.",
            "data": {
              "room_id": "room-nila-101",
              "background_image_url": "https://res.cloudinary.com/example/image/upload/v1/rooms/bg_cyberpunk.jpg",
              "thumbnail_url": "https://res.cloudinary.com/example/image/upload/v1/rooms/bg_cyberpunk.jpg",
              "room": {
                "id": 1,
                "room_id": "room-nila-101",
                "title": "Friday Night Acoustic Live Session 🎸",
                "background_image_url": "https://res.cloudinary.com/example/image/upload/v1/rooms/bg_cyberpunk.jpg",
                "thumbnail_url": "https://res.cloudinary.com/example/image/upload/v1/rooms/bg_cyberpunk.jpg",
                "status": "live",
                "viewer_count": 432
              }
            }
          }
        },
        {
          "status": 403,
          "description": "Forbidden: Only the room host, moderator, or admin can change the room background.",
          "example": {
            "success": false,
            "message": "Only the host, assigned room moderators, or administrators can update the room background."
          }
        },
        {
          "status": 404,
          "description": "Live room not found or has ended.",
          "example": {
            "success": false,
            "message": "Live room not found or is no longer active."
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X PUT https://yourdomain.com/api/mobile/live/rooms/room-nila-101/background \\\n  -H \"Authorization: Bearer <TOKEN>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"thumbnail_url\": \"https://res.cloudinary.com/example/image/upload/v1/rooms/bg_cyberpunk.jpg\"}'",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<void> updateRoomBackground(String roomId, String token, {String? thumbnailUrl, int? thumbnailId}) async {\n  final res = await http.put(\n    Uri.parse('https://yourdomain.com/api/mobile/live/rooms/$roomId/background'),\n    headers: {\n      'Authorization': 'Bearer $token',\n      'Content-Type': 'application/json',\n    },\n    body: jsonEncode({\n      if (thumbnailUrl != null) 'thumbnail_url': thumbnailUrl,\n      if (thumbnailId != null) 'thumbnail_id': thumbnailId,\n    }),\n  );\n  final data = jsonDecode(res.body);\n  print(data);\n}"
      },
      "liveType": "both"
    },
    {
      "id": "live-room-users",
      "category": "live-viewers",
      "method": "GET",
      "path": "/api/mobile/live/rooms/:roomId/users",
      "summary": "[🎥🎙️ Video & Audio Live] Get Active Users & Viewers in Room",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nReturns all users currently inside the live broadcast room including total user count, name, profile image, VIP package category name, package image, coin balance, diamond balance (if diamond economy is active), and seat occupancy.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": false
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier (e.g. room-nila-101)"
        },
        {
          "name": "page",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Pagination page number (default: 1)"
        },
        {
          "name": "limit",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Pagination items limit (default: 50)"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Successfully retrieved room users list.",
          "example": {
            "success": true,
            "room_id": "room-nila-101",
            "total_users": 2,
            "users": [
              {
                "id": 2,
                "name": "Nila Akter",
                "image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                "package_category_name": null,
                "package_image": null,
                "package_color": null,
                "coin": 5095,
                "diamond": 18605,
                "role": "host",
                "level": 15,
                "is_host": true,
                "is_seated": true,
                "seat_number": 1,
                "is_main_seat": true,
                "is_camera_on": true,
                "is_muted": false
              },
              {
                "id": 5,
                "name": "Tanvir Ahmed",
                "image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
                "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
                "package_category_name": "Royal Crown VIP",
                "package_image": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=100",
                "package_color": "#ffd700",
                "coin": 24800,
                "diamond": 490,
                "role": "user",
                "level": 8,
                "is_host": false,
                "is_seated": false,
                "seat_number": null,
                "is_main_seat": false,
                "is_camera_on": false,
                "is_muted": false
              }
            ],
            "pagination": {
              "total": 2,
              "page": 1,
              "limit": 50
            }
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-leave-room",
      "category": "live-rooms",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/leave",
      "summary": "[🎥🎙️ Video & Audio Live] Leave Live Room",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nDecrements viewer count in database safely and invalidates cache.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Successfully left room.",
          "example": {
            "success": true,
            "message": "Left live room successfully."
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-end-room",
      "category": "live-rooms",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/end",
      "summary": "[🎥🎙️ Video & Audio Live] End Live Broadcast",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nEnds an active stream. Can only be performed by the broadcast host or an administrator.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Live broadcast ended successfully.",
          "example": {
            "success": true,
            "message": "Live stream ended successfully."
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-room-send-chat",
      "category": "live-rooms",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/messages",
      "summary": "[🎥🎙️ Video & Audio Live] Send Live Room Chat Message (Real-Time)",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nSends a real-time chat message in the live room. Commits to MySQL SSOT first, invalidates Redis caches, and broadcasts Socket.IO event `new-chat` / `room_message` to all participants and viewers in the room channel.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        },
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        }
      ],
      "requestBody": {
        "type": "application/json",
        "fields": [
          {
            "name": "message",
            "type": "string",
            "required": true,
            "description": "Text message content (max 300 characters)"
          },
          {
            "name": "message_type",
            "type": "string",
            "required": false,
            "description": "Optional message type (default: 'text')"
          }
        ],
        "example": {
          "message": "Hello everyone in the live room! 👋",
          "message_type": "text"
        }
      },
      "responses": [
        {
          "status": 201,
          "description": "Message sent and broadcasted over Socket.IO.",
          "example": {
            "success": true,
            "message": "Message sent successfully.",
            "data": {
              "id": 105,
              "roomId": "room-f8a4bc9b",
              "message": "Hello everyone in the live room! 👋",
              "message_type": "text",
              "metadata": null,
              "timestamp": "2026-10-15T03:35:00.000Z",
              "user": {
                "id": 4,
                "full_name": "Rahim Khan",
                "avatar_url": "/uploads/avatars/user_4.jpg",
                "vip_level": 2,
                "level": 5,
                "is_host": false,
                "is_admin": false,
                "is_speaker": true,
                "seat_number": 2
              }
            }
          }
        },
        {
          "status": 403,
          "description": "User is restricted/kicked from chatting in this room.",
          "example": {
            "success": false,
            "message": "You have been restricted from chatting in this room."
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-room-get-chats",
      "category": "live-rooms",
      "method": "GET",
      "path": "/api/mobile/live/rooms/:roomId/messages",
      "summary": "[🎥🎙️ Video & Audio Live] Get Live Room Chat Message History",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nRetrieves chronological chat message history for the live room. Cached in Redis ('mobile:room:messages:{roomId}:*', TTL 15s) with Cache-Aside MySQL fallback.",
      "requiresAuth": false,
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        },
        {
          "name": "limit",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Max messages to retrieve (default: 50, max: 100)"
        },
        {
          "name": "before_id",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Cursor for pagination (retrieve messages with ID < before_id)"
        }
      ],
      "responses": [
        {
          "status": 200,
          "description": "Room chat history retrieved successfully.",
          "example": {
            "success": true,
            "count": 1,
            "messages": [
              {
                "id": 105,
                "roomId": "room-f8a4bc9b",
                "message": "Hello everyone in the live room! 👋",
                "message_type": "text",
                "metadata": null,
                "timestamp": "2026-10-15T03:35:00.000Z",
                "user": {
                  "id": 4,
                  "full_name": "Rahim Khan",
                  "avatar_url": "/uploads/avatars/user_4.jpg",
                  "vip_level": 2,
                  "level": 5
                }
              }
            ]
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-room-delete-chat",
      "category": "live-rooms",
      "method": "DELETE",
      "path": "/api/mobile/live/rooms/:roomId/messages/:messageId",
      "summary": "[🎥🎙️ Video & Audio Live] Delete Live Room Chat Message",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nDeletes a specific chat message from the live room. Permitted for the message sender, room host, or room admin. Deletes from MySQL SSOT, invalidates Redis cache, and emits Socket.IO event `chat_message_deleted` to the room channel.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        },
        {
          "name": "messageId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "ID of the chat message to delete"
        }
      ],
      "responses": [
        {
          "status": 200,
          "description": "Message deleted and broadcasted.",
          "example": {
            "success": true,
            "message": "Message deleted successfully.",
            "deleted_id": 105
          }
        },
        {
          "status": 403,
          "description": "Permission denied (not author or room admin).",
          "example": {
            "success": false,
            "message": "You do not have permission to delete this message."
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-room-admins",
      "category": "live-admins",
      "method": "GET",
      "path": "/api/mobile/live/rooms/:roomId/admins",
      "summary": "[🎥🎙️ Video & Audio Live] Get Live Room Admins & Host",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nReturns the host and all designated room moderators/admins with user profile, role, VIP tier package, coin balance, and diamond balance.",
      "requiresAuth": false,
      "requestHeaders": [],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "List of room admins and host details.",
          "example": {
            "success": true,
            "room_id": "room-6a774ebc",
            "host": {
              "id": 1,
              "name": "System Admin",
              "image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
              "role": "host"
            },
            "total_admins": 2,
            "admins": [
              {
                "id": 1,
                "name": "System Admin",
                "image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "coin": 99910,
                "diamond": 50000,
                "role": "host",
                "is_owner": true,
                "level": 99,
                "package_category_name": null,
                "package_image": null,
                "package_color": null,
                "permissions": [
                  "all"
                ],
                "assigned_at": "2026-10-11T17:53:24.000Z"
              },
              {
                "id": 5,
                "name": "Tanvir Ahmed",
                "image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
                "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
                "coin": 24800,
                "diamond": 490,
                "role": "room_admin",
                "is_owner": false,
                "level": 8,
                "package_category_name": "Royal Crown VIP",
                "package_image": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=100",
                "package_color": "#ffd700",
                "permissions": [
                  "manage_seats",
                  "mute_users",
                  "kick_users"
                ],
                "assigned_at": "2026-10-11T17:55:52.000Z"
              }
            ]
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-assign-room-admin",
      "category": "live-admins",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/admins",
      "summary": "[🎥🎙️ Video & Audio Live] Assign Room Admin / Moderator",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nHost assigns a viewer or co-host as a room administrator with permissions.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "example": {
          "user_id": 5,
          "permissions": [
            "manage_seats",
            "mute_users",
            "kick_users"
          ]
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Room admin assigned successfully.",
          "example": {
            "success": true,
            "message": "Room admin assigned successfully."
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-remove-room-admin",
      "category": "live-admins",
      "method": "DELETE",
      "path": "/api/mobile/live/rooms/:roomId/admins/:userId",
      "summary": "[🎥🎙️ Video & Audio Live] Remove Room Admin / Moderator",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nHost revokes admin permissions from a room moderator.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        },
        {
          "name": "userId",
          "type": "number",
          "in": "path",
          "required": true,
          "description": "Target user ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Room admin removed successfully.",
          "example": {
            "success": true,
            "message": "Room admin removed successfully."
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-request-seat",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/request",
      "summary": "[🎥 Video Live & Audio] Multi-Seat Request System",
      "description": "**Stream Type**: 🎥 Mandatory for Video Live rooms. In Video Live, NO user can auto-take a seat under any circumstances without the host accepting the request. Host must approve via `POST /api/mobile/live/rooms/:roomId/seats/requests/:requestId/approve`.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "example": {
          "seat_number": 3
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Seat request submitted or VIP auto-accepted.",
          "example": {
            "success": true,
            "auto_accepted": false,
            "message": "Seat request submitted successfully. Waiting for host approval.",
            "request_id": 1
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-get-seat-requests",
      "category": "live-seats",
      "method": "GET",
      "path": "/api/mobile/live/rooms/:roomId/seats/requests",
      "summary": "[🎥 Video Live & Audio] Multi-Seat Request System",
      "description": "**Stream Type**: 🎥 Mandatory for Video Live rooms. In Video Live, NO user can auto-take a seat under any circumstances without the host accepting the request. Host must approve via `POST /api/mobile/live/rooms/:roomId/seats/requests/:requestId/approve`.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "List of pending seat requests.",
          "example": {
            "success": true,
            "room_id": "room-6a774ebc",
            "total_requests": 1,
            "requests": [
              {
                "id": 1,
                "seat_number": 3,
                "created_at": "2026-10-11T17:56:22.000Z",
                "user": {
                  "id": 6,
                  "name": "Mobile Tester",
                  "image": "https://api.dicebear.com/7.x/bottts/svg?seed=6",
                  "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=6",
                  "coin": 100,
                  "diamond": 0,
                  "package_category_name": null,
                  "package_image": null,
                  "package_color": null,
                  "level": 1,
                  "role": "user"
                }
              }
            ]
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-approve-seat-request",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/requests/:requestId/approve",
      "summary": "[🎥 Video Live & Audio] Multi-Seat Request System",
      "description": "**Stream Type**: 🎥 Mandatory for Video Live rooms. In Video Live, NO user can auto-take a seat under any circumstances without the host accepting the request. Host must approve via `POST /api/mobile/live/rooms/:roomId/seats/requests/:requestId/approve`.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        },
        {
          "name": "requestId",
          "type": "number",
          "in": "path",
          "required": true,
          "description": "Seat request ID"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "example": {
          "seat_number": 3
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Seat request approved.",
          "example": {
            "success": true,
            "message": "Seat request approved. User assigned to seat #3.",
            "seat_number": 3
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-reject-seat-request",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/requests/:requestId/reject",
      "summary": "[🎥 Video Live & Audio] Multi-Seat Request System",
      "description": "**Stream Type**: 🎥 Mandatory for Video Live rooms. In Video Live, NO user can auto-take a seat under any circumstances without the host accepting the request. Host must approve via `POST /api/mobile/live/rooms/:roomId/seats/requests/:requestId/approve`.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        },
        {
          "name": "requestId",
          "type": "number",
          "in": "path",
          "required": true,
          "description": "Seat request ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Seat request rejected.",
          "example": {
            "success": true,
            "message": "Seat request rejected successfully."
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-cancel-seat-request",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/requests/cancel",
      "summary": "[🎥 Video Live & Audio] Multi-Seat Request System",
      "description": "**Stream Type**: 🎥 Mandatory for Video Live rooms. In Video Live, NO user can auto-take a seat under any circumstances without the host accepting the request. Host must approve via `POST /api/mobile/live/rooms/:roomId/seats/requests/:requestId/approve`.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Seat request cancelled successfully.",
          "example": {
            "success": true,
            "message": "Seat request cancelled successfully. Removed from waiting list."
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-update-seat-count",
      "category": "live-seats",
      "method": "PATCH",
      "path": "/api/mobile/live/rooms/:roomId/seats/count",
      "summary": "[🎙️ Audio Live] Update Audio Live Seat Count (Dynamic Scaling)",
      "description": "**Stream Type**: 🎙️ Audio Live Room exclusive feature.\n\nHost or room admin dynamically scales seat count in an Audio Live room. Minimum 7 seats; no upper limit. (Video live has fixed max 9 seats).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "example": {
          "total_seats": 10
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Seat count updated successfully.",
          "example": {
            "success": true,
            "message": "Audio live seat count updated to 10 seats successfully.",
            "total_seats": 10
          }
        }
      ],
      "liveType": "audio"
    },
    {
      "id": "live-take-seat-direct",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/take",
      "summary": "[🎙️ Audio Live Only] Direct Seat Jump-In (No Request Needed)",
      "description": "**Stream Type**: 🎙️ Audio Live Room exclusive feature.\n\n⚠️ **Strict Video Live Rule**: In Video Live rooms, direct seat taking is strictly prohibited (returns HTTP 403 Forbidden). In Video Live, viewers MUST submit a seat request (`POST /api/mobile/live/rooms/:roomId/seats/request`) and wait for the host to accept/approve.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of viewer"
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique live room identifier"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "example": {
          "seat_number": 2
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Successfully seated on co-host seat.",
          "example": {
            "success": true,
            "message": "You took seat 2 successfully.",
            "room": {
              "room_id": "room-5deedf0e",
              "total_seats": 7,
              "occupied_seats_count": 2,
              "empty_seats_count": 5,
              "open_seats_count": 5,
              "locked_seats_count": 0,
              "live_duration": {
                "duration_seconds": 120,
                "duration_formatted": "02:00"
              }
            }
          }
        },
        {
          "status": 400,
          "description": "Target seat occupied, locked, or invalid seat number.",
          "example": {
            "success": false,
            "message": "Seat 2 is already occupied."
          }
        }
      ],
      "liveType": "audio"
    },
    {
      "id": "live-switch-seat",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/switch",
      "summary": "[🎙️ Audio Live] Switch / Move from Current Seat to Another Empty Seat",
      "description": "**Stream Type**: 🎙️ Audio Live Room exclusive feature.\n\nA seated co-host moves directly from their current seat to another unoccupied and unlocked seat. The previous seat is automatically freed, media state is preserved, and the user occupies the new seat without losing co-host participation.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of seated co-host"
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique live room identifier"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "example": {
          "seat_number": 5
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Successfully moved to target seat.",
          "example": {
            "success": true,
            "message": "Moved to seat 5 successfully.",
            "is_switch": true,
            "from_seat_number": 2,
            "to_seat_number": 5,
            "seat_number": 5
          }
        },
        {
          "status": 400,
          "description": "Target seat is occupied or locked.",
          "example": {
            "success": false,
            "message": "Seat 5 is already occupied."
          }
        }
      ],
      "liveType": "audio"
    },
    {
      "id": "live-leave-seat",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/leave",
      "summary": "[🎥🎙️ Video & Audio Live] Leave Co-Host Seat",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nCo-host voluntarily vacates their seat and returns to regular room viewer audience.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of seated user"
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique live room identifier"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Left seat successfully.",
          "example": {
            "success": true,
            "message": "Left seat successfully."
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-increase-seats",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/increase",
      "summary": "[🎙️ Audio Live] Increase Audio Live Seat Count (+1)",
      "description": "**Stream Type**: 🎙️ Audio Live Room exclusive feature.\n\nHost or room admin steps up Audio Live room seats by 1 (or by optional step in request body). Seeds empty seats dynamically.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Host or Admin"
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique live room identifier"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "example": {
          "step": 1
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Seat count increased successfully.",
          "example": {
            "success": true,
            "message": "Audio live seat count updated to 8 seats successfully.",
            "total_seats": 8,
            "previous_seats": 7
          }
        }
      ],
      "liveType": "audio"
    },
    {
      "id": "live-decrease-seats",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/decrease",
      "summary": "[🎙️ Audio Live] Decrease Audio Live Seat Count (-1, Min 7)",
      "description": "**Stream Type**: 🎙️ Audio Live Room exclusive feature.\n\nHost or room admin steps down Audio Live room seats by 1 (or by optional step). Cannot decrease below minimum 7 seats. Fails if seats to be removed are currently occupied.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Host or Admin"
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique live room identifier"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "example": {
          "step": 1
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Seat count decreased successfully.",
          "example": {
            "success": true,
            "message": "Audio live seat count updated to 7 seats successfully.",
            "total_seats": 7,
            "previous_seats": 8
          }
        },
        {
          "status": 400,
          "description": "Cannot decrease below minimum 7 seats or seat is occupied.",
          "example": {
            "success": false,
            "message": "Audio Live rooms must have at least 7 seats (minimum seat count is 7). Cannot decrease below 7."
          }
        }
      ],
      "liveType": "audio"
    },
    {
      "id": "live-lock-individual-seat",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/:seatNumber/lock",
      "summary": "[🎥🎙️ Video & Audio Live] Lock / Unlock Individual Seat",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nHost or moderator locks or unlocks a specific seat by number. If locked while occupied, the occupant is safely ejected back to audience.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Host or Moderator"
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique live room identifier"
        },
        {
          "name": "seatNumber",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Seat number (2 to total_seats)"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "example": {
          "is_locked": true
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Seat lock status updated successfully.",
          "example": {
            "success": true,
            "message": "Seat 4 locked successfully.",
            "isLocked": true,
            "seatNumber": 4
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-lock-all-empty-seats",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/lock-all-empty",
      "summary": "[🎙️ Audio Live] Lock / Unlock All Empty Seats at Once",
      "description": "**Stream Type**: 🎙️ Audio Live Room exclusive feature.\n\nHost or moderator locks or unlocks all empty guest seats in a single atomic database operation. Synchronizes Redis and emits socket broadcast.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Host or Moderator"
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique live room identifier"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "example": {
          "is_locked": true
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "All empty seats locked/unlocked successfully.",
          "example": {
            "success": true,
            "message": "All empty seats locked successfully (5 seats).",
            "is_locked": true,
            "affected_seats": 5
          }
        }
      ],
      "liveType": "audio"
    },
    {
      "id": "live-mute-individual-seat",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/:seatNumber/mute",
      "summary": "[🎥🎙️ Video & Audio Live] Mute / Unmute Individual Seat or User",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nHost or moderator mutes or unmutes a specific co-host by seat number or userId.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Host or Moderator"
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique live room identifier"
        },
        {
          "name": "seatNumber",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Seat number (1 to total_seats)"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "example": {
          "is_muted": true
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Seat mute state updated successfully.",
          "example": {
            "success": true,
            "message": "Seat 2 muted successfully.",
            "isMuted": true,
            "seatNumber": 2
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-mute-all-seats",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/mute-all",
      "summary": "[🎙️ Audio Live] Mute / Unmute All Seated Users at Once",
      "description": "**Stream Type**: 🎙️ Audio Live Room exclusive feature.\n\nHost or room moderator mutes or unmutes all seated guest users simultaneously. Emits socket broadcast and synchronizes Redis.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Host or Moderator"
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique live room identifier"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "example": {
          "is_muted": true,
          "include_host": false
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "All seated users muted/unmuted successfully.",
          "example": {
            "success": true,
            "message": "All seated users muted successfully (2 user(s)).",
            "is_muted": true,
            "affected_count": 2
          }
        }
      ],
      "liveType": "audio"
    },
    {
      "id": "live-kick-individual-seat",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/:seatNumber/kick",
      "summary": "[🎥🎙️ Video & Audio Live] Kick User from Specific Seat",
      "description": "**Stream Type**: 🎥🎙️ Applicable to both Video Live & Audio Live rooms.\n\nHost or moderator removes an occupant from their seat back to audience by seat number or userId.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Host or Moderator"
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique live room identifier"
        },
        {
          "name": "seatNumber",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Seat number to clear"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "User removed from seat successfully.",
          "example": {
            "success": true,
            "message": "User removed from seat successfully."
          }
        }
      ],
      "liveType": "both"
    },
    {
      "id": "live-kick-all-seats",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/kick-all",
      "summary": "[🎙️ Audio Live] Kick All Seated Users at Once (Clean Sweep)",
      "description": "**Stream Type**: 🎙️ Audio Live Room exclusive feature.\n\nHost or platform admin clears all guest seats simultaneously back to room audience in a single database operation. Emits socket notifications.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Room Host or Admin"
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique live room identifier"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "All co-host users removed from seats.",
          "example": {
            "success": true,
            "message": "Successfully removed 2 user(s) from co-host seats.",
            "removed_count": 2,
            "removed_users": [
              {
                "seat_number": 2,
                "user_id": 2
              },
              {
                "seat_number": 3,
                "user_id": 3
              }
            ]
          }
        }
      ],
      "liveType": "audio"
    },
    {
      "id": "live-promote-to-main-seat",
      "category": "live-seats",
      "method": "POST",
      "path": "/api/mobile/live/rooms/:roomId/seats/make-main",
      "summary": "[🎥 Video Live Exclusive] Promote / Swap Co-host Seat to Main Seat",
      "description": "**Stream Type**: 🎥 Video Live exclusive feature. (In Audio Live rooms, this is not applicable—users directly use Switch Seat: POST /api/mobile/live/rooms/:roomId/seats/switch).\n\nPromotes a co-host or guest from their current seat (e.g., Seat 2, Seat 3...) to the Main Seat (Seat 1 / Main Stage). Performs an atomic database swap: the selected user moves to Seat 1 (is_main_seat = 1), and the previous occupant of Seat 1 is moved into the guest's seat. Invalidates Redis room caches, and broadcasts real-time Socket.IO events main_seat_swapped and seat_updated with action swap_main to all room participants.\n\n**Route Aliases**:\n- POST /api/mobile/live/rooms/:roomId/seats/make-main\n- POST /api/mobile/live/rooms/:roomId/seats/swap-main\n- POST /api/mobile/live/rooms/:roomId/seats/promote-main\n- POST /api/mobile/live/rooms/:roomId/seats/:seatNumber/promote",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "example": "Bearer eyJhbGciOiJIUzI1Ni..."
        },
        {
          "name": "Content-Type",
          "type": "string",
          "required": true,
          "example": "application/json"
        }
      ],
      "parameters": [
        {
          "name": "roomId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Unique room identifier"
        }
      ],
      "requestBody": {
        "type": "object",
        "required": true,
        "properties": {
          "seat_number": {
            "type": "integer",
            "description": "Guest seat number to promote to main seat (e.g. 2, 3...)"
          },
          "user_id": {
            "type": "integer",
            "description": "Optional user ID occupying the seat"
          }
        },
        "example": {
          "seat_number": 2
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Seat successfully promoted and swapped with Main Seat.",
          "example": {
            "success": true,
            "message": "Seat 2 promoted to main seat successfully.",
            "new_main_user_id": 10,
            "previous_main_user_id": 7,
            "swapped_seat_number": 2,
            "room": {
              "id": "room_1729065600",
              "seats": [
                {
                  "seat_number": 1,
                  "is_main_seat": 1,
                  "user_id": 10,
                  "name": "Nila Akter"
                },
                {
                  "seat_number": 2,
                  "is_main_seat": 0,
                  "user_id": 7,
                  "name": "Host Nibir"
                }
              ]
            }
          }
        },
        {
          "status": 400,
          "description": "Invalid seat, empty seat, or room is audio live.",
          "example": {
            "success": false,
            "message": "Promote to main seat is only available for Video Live rooms. In Audio Live, please use Switch Seat."
          }
        },
        {
          "status": 403,
          "description": "Unauthorized to promote seats.",
          "example": {
            "success": false,
            "message": "Only the room host or moderators can promote a seat to the main seat."
          }
        }
      ],
      "liveType": "video"
    },
    {
      "id": "wallet-packages",
      "category": "wallet",
      "method": "GET",
      "path": "/api/mobile/wallet/packages",
      "summary": "Get Coin Recharge Packages",
      "description": "Returns available coin top-up packages with bonuses and USD prices.",
      "requiresAuth": false,
      "requestHeaders": [],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Coin packages retrieved.",
          "example": {
            "success": true,
            "packages": [
              {
                "id": 1,
                "name": "Starter Pack",
                "coins": 1000,
                "bonus_coins": 100,
                "price_usd": "0.99",
                "badge": "Popular"
              },
              {
                "id": 2,
                "name": "Pro Streamer Pack",
                "coins": 5500,
                "bonus_coins": 600,
                "price_usd": "4.99",
                "badge": "Best Value"
              }
            ]
          }
        }
      ]
    },
    {
      "id": "wallet-purchase",
      "category": "wallet",
      "method": "POST",
      "path": "/api/mobile/wallet/purchase",
      "summary": "Purchase Coin Package (Top-up)",
      "description": "Purchases a coin recharge package. Credits coins and bonuses to the user wallet in an atomic transaction.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        },
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "application/json",
        "fields": [
          {
            "name": "packageId",
            "type": "integer",
            "required": true,
            "description": "Coin package ID"
          }
        ],
        "example": {
          "packageId": 1
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Coins successfully topped up.",
          "example": {
            "success": true,
            "message": "Successfully topped up 1100 coins!",
            "coins": 6500
          }
        }
      ]
    },
    {
      "id": "wallet-recharge-config",
      "category": "wallet",
      "method": "GET",
      "path": "/api/mobile/wallet/recharge-config",
      "summary": "Get Recharge Configuration & Presets",
      "description": "Returns active coin packages and quick recharge preset amounts configured by admin. Cached in Redis ('wallet:recharge:config', TTL 120s).",
      "requiresAuth": false,
      "parameters": [],
      "responses": [
        {
          "status": 200,
          "description": "Recharge configuration retrieved successfully.",
          "example": {
            "success": true,
            "packages": [
              {
                "id": 1,
                "name": "Starter Pack",
                "coins": 100,
                "price_usd": "0.99",
                "bonus_coins": 10,
                "badge": "Starter",
                "is_active": 1
              },
              {
                "id": 2,
                "name": "Value Bundle",
                "coins": 500,
                "price_usd": "4.99",
                "bonus_coins": 80,
                "badge": "Popular",
                "is_active": 1
              }
            ],
            "quick_presets": [
              500,
              1000,
              2500,
              5000,
              10000,
              50000,
              100000
            ]
          }
        }
      ]
    },
    {
      "id": "wallet-withdrawal-config",
      "category": "wallet",
      "method": "GET",
      "path": "/api/mobile/wallet/withdrawal-config",
      "summary": "Get Withdrawal Rules, Presets & Economy Mode (Coin vs Diamond)",
      "description": "Returns current withdrawal configuration including active currency mode (`is_convert_to_diamond`: false for Direct Coin Cashout, true for Diamond Conversion Mode), minimum withdrawal thresholds for coins and diamonds, preset cashout buttons, manual input allowance flag, and real-time host payout exchange rates for Video and Audio live hosts. Cached in Redis ('wallet:withdrawal:config', TTL 60s).",
      "requiresAuth": false,
      "parameters": [],
      "responses": [
        {
          "status": 200,
          "description": "Withdrawal configuration retrieved successfully.",
          "example": {
            "success": true,
            "config": {
              "is_convert_to_diamond": false,
              "withdrawal_currency": "coins",
              "min_withdrawal_amount": 1000,
              "min_withdrawal_diamonds": 1000,
              "min_withdrawal_coins": 1000,
              "withdrawal_presets": [
                1000,
                2000,
                5000,
                10000,
                25000,
                50000
              ],
              "allow_manual_withdrawal_input": true,
              "diamond_to_usd_rate": 0.005,
              "coin_to_usd_rate": 0.005,
              "rates": {
                "video": {
                  "diamond_base": 100000,
                  "coin_base": 100000,
                  "taka_amount": 5000,
                  "rate_per_diamond": 0.05,
                  "rate_per_coin": 0.05,
                  "currency": "BDT"
                },
                "audio": {
                  "diamond_base": 100000,
                  "coin_base": 100000,
                  "taka_amount": 3500,
                  "rate_per_diamond": 0.035,
                  "rate_per_coin": 0.035,
                  "currency": "BDT"
                }
              }
            }
          }
        }
      ]
    },
    {
      "id": "wallet-withdraw",
      "category": "wallet",
      "method": "POST",
      "path": "/api/mobile/wallet/withdraw",
      "summary": "Request Cashout Withdrawal (Coins or Diamonds)",
      "description": "Submits a payout cashout request. The backend dynamically determines the cashout currency using the admin setting `is_convert_to_diamond`:\n- **Coin Mode (`is_convert_to_diamond: false`)**: Cashout is deducted directly from user's `coins` balance.\n- **Diamond Mode (`is_convert_to_diamond: true`)**: Cashout is deducted from user's `diamonds` balance.\n\nAccepts `amount`, `coinAmount`, or `diamondAmount`. Validates against admin minimum limit and presets (when manual input is disabled). Executes in an atomic MySQL transaction (SSOT) before instant Redis invalidation.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        },
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "application/json",
        "fields": [
          {
            "name": "amount",
            "type": "integer",
            "required": true,
            "description": "Amount to cash out (coins when is_convert_to_diamond is false, diamonds when true). Also accepts 'coinAmount' or 'diamondAmount'."
          },
          {
            "name": "paymentMethod",
            "type": "string",
            "required": true,
            "description": "Payout channel: \"bKash\", \"Nagad\", \"Bank Transfer\", \"PayPal\""
          },
          {
            "name": "accountDetails",
            "type": "string",
            "required": true,
            "description": "Recipient account number and note (e.g., '01712345678 (Personal)')"
          }
        ],
        "example": {
          "amount": 5000,
          "paymentMethod": "bKash",
          "accountDetails": "01712345678 (Personal)"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Withdrawal request submitted successfully.",
          "example": {
            "success": true,
            "message": "Withdrawal request submitted for review.",
            "mode": "coin",
            "withdrawnAmount": 5000,
            "currency": "coins",
            "currencySymbol": "🪙",
            "balanceRemaining": 15000,
            "usdAmount": "25.00",
            "payoutAmount": "250.00",
            "payoutCurrency": "BDT"
          }
        },
        {
          "status": 400,
          "description": "Validation error (Insufficient balance, below minimum, or manual input disallowed).",
          "example": {
            "success": false,
            "message": "Minimum withdrawal is 1,000 coins.",
            "minWithdrawal": 1000,
            "mode": "coin"
          }
        }
      ]
    },
    {
      "id": "wallet-transactions",
      "category": "wallet",
      "method": "GET",
      "path": "/api/mobile/wallet/transactions",
      "summary": "Get Wallet Transaction History",
      "description": "Returns ledger history of coin purchases, gifts sent/received, transfers, and cashout requests.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "page",
          "type": "integer",
          "required": false,
          "description": "Page number (default: 1)"
        },
        {
          "name": "limit",
          "type": "integer",
          "required": false,
          "description": "Items per page (default: 20)"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Transaction history retrieved.",
          "example": {
            "success": true,
            "transactions": [
              {
                "id": 42,
                "type": "coin_transfer_out",
                "amount": 100,
                "description": "Transferred 100 coins to Nila Akter",
                "status": "completed",
                "created_at": "2026-10-11T22:50:00.000Z"
              }
            ],
            "total": 1
          }
        }
      ]
    },
    {
      "id": "wallet-withdrawal-history",
      "category": "wallet",
      "method": "GET",
      "path": "/api/mobile/wallet/withdrawals",
      "summary": "Get Withdrawal History (Coins & Diamonds with Rich Metadata)",
      "description": "Returns paginated cashout withdrawal history for the authenticated user. Exposes explicit `coin_amount`, `diamond_amount`, resolved UI `amount`, `currency` ('coins' | 'diamonds'), `currency_symbol` ('🪙' | '💎'), `currency_label`, `display_text`, `record_mode`, and current system conversion state (`is_convert_to_diamond`). Filter by status (pending/approved/rejected/all) and paginate. Cached in Redis ('withdrawal:list:{userId}:{page}:{limit}:{status}:{mode}', TTL 60s).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "page",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Page number (default: 1)"
        },
        {
          "name": "limit",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Items per page (default: 20, max: 50)"
        },
        {
          "name": "status",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Filter: pending | approved | rejected | all (default: all)"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Paginated withdrawal history with coin and diamond metadata.",
          "example": {
            "success": true,
            "message": "Withdrawal history retrieved successfully.",
            "withdrawals": [
              {
                "id": 15,
                "user_id": 4,
                "coin_amount": 25000,
                "diamond_amount": 0,
                "amount": 25000,
                "currency": "coins",
                "currency_symbol": "🪙",
                "currency_label": "Coin",
                "display_text": "25,000 Coins",
                "record_mode": "coin",
                "is_diamond_record": false,
                "is_coin_record": true,
                "is_convert_to_diamond": false,
                "conversion_mode": "coin",
                "usd_amount": 125,
                "payout_amount": 1250,
                "payout_currency": "BDT",
                "host_type": "audio",
                "payment_method": "bKash",
                "account_details": "01712345678 (Personal)",
                "status": "pending",
                "admin_notes": null,
                "created_at": "2026-10-15T03:30:00.000Z",
                "updated_at": "2026-10-15T03:30:00.000Z"
              },
              {
                "id": 14,
                "user_id": 4,
                "coin_amount": 0,
                "diamond_amount": 5000,
                "amount": 5000,
                "currency": "diamonds",
                "currency_symbol": "💎",
                "currency_label": "Diamond",
                "display_text": "5,000 Diamonds",
                "record_mode": "diamond",
                "is_diamond_record": true,
                "is_coin_record": false,
                "is_convert_to_diamond": false,
                "conversion_mode": "coin",
                "usd_amount": 25,
                "payout_amount": 250,
                "payout_currency": "BDT",
                "host_type": "video",
                "payment_method": "Nagad",
                "account_details": "01812345678 (Personal)",
                "status": "approved",
                "admin_notes": "Paid via Nagad TrxID: TX88921",
                "created_at": "2026-10-14T18:20:00.000Z",
                "updated_at": "2026-10-14T19:00:00.000Z"
              }
            ],
            "pagination": {
              "page": 1,
              "limit": 20,
              "total": 2,
              "totalPages": 1,
              "hasNext": false,
              "hasPrev": false
            }
          }
        }
      ]
    },
    {
      "id": "wallet-withdrawal-pending",
      "category": "wallet",
      "method": "GET",
      "path": "/api/mobile/wallet/withdrawals/pending",
      "summary": "Get Pending Withdrawal Requests",
      "description": "Returns all currently pending cashout requests for the authenticated user, formatted with coin and diamond amounts and currency symbols. Cached in Redis ('withdrawal:pending:{userId}', TTL 30s).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "List of pending withdrawal requests.",
          "example": {
            "success": true,
            "message": "Pending withdrawal requests retrieved successfully.",
            "pendingCount": 1,
            "withdrawals": [
              {
                "id": 15,
                "user_id": 4,
                "coin_amount": 25000,
                "diamond_amount": 0,
                "amount": 25000,
                "currency": "coins",
                "currency_symbol": "🪙",
                "display_text": "25,000 Coins",
                "record_mode": "coin",
                "payout_amount": 1250,
                "payout_currency": "BDT",
                "payment_method": "bKash",
                "account_details": "01712345678 (Personal)",
                "status": "pending",
                "created_at": "2026-10-15T03:30:00.000Z"
              }
            ]
          }
        }
      ]
    },
    {
      "id": "wallet-withdrawal-cancel",
      "category": "wallet",
      "method": "POST",
      "path": "/api/mobile/wallet/withdrawals/{id}/cancel",
      "summary": "Cancel Pending Withdrawal Request",
      "description": "Cancel a PENDING withdrawal request. Automatically refunds the deducted coins or diamonds back to the user's balance based on the original withdrawal type. MySQL transaction commits first, then Redis cache is invalidated instantly.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "id",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Withdrawal request ID to cancel"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Withdrawal cancelled and currency refunded.",
          "example": {
            "success": true,
            "message": "Withdrawal request #15 has been cancelled. 25,000 coins have been refunded to your account.",
            "data": {
              "withdrawal_id": 15,
              "currency_refunded": "coins",
              "amount_refunded": 25000,
              "status": "rejected"
            }
          }
        },
        {
          "status": 400,
          "description": "Withdrawal is not in pending state.",
          "example": {
            "success": false,
            "message": "Withdrawal #15 is already \"approved\" and cannot be cancelled."
          }
        }
      ]
    },
    {
      "id": "wallet-withdrawal-delete-one",
      "category": "wallet",
      "method": "DELETE",
      "path": "/api/mobile/wallet/withdrawals/{id}",
      "summary": "Delete Single Withdrawal Record",
      "description": "Permanently delete a single withdrawal history record. Only settled (approved or rejected) records can be deleted by the owner. Admins can delete any record including pending. MySQL SSOT write first, then instant Redis cache invalidation.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "id",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Withdrawal record ID to delete"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Withdrawal record deleted.",
          "example": {
            "success": true,
            "message": "Withdrawal record #1 (5000 diamonds via bKash) has been deleted.",
            "deletedId": 1
          }
        },
        {
          "status": 400,
          "description": "Cannot delete pending withdrawal.",
          "example": {
            "success": false,
            "message": "Pending withdrawal requests cannot be deleted. Wait for admin review or contact support."
          }
        }
      ]
    },
    {
      "id": "wallet-withdrawal-clear-all",
      "category": "wallet",
      "method": "DELETE",
      "path": "/api/mobile/wallet/withdrawals",
      "summary": "Bulk Clear Withdrawal History",
      "description": "Delete all (or filtered) withdrawal records from history. By default excludes pending records (use ?force=true or filter by status). Filter by ?period=today|month|all and ?status=approved|rejected|pending. MySQL SSOT write first, then instant Redis cache invalidation.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "period",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Time filter: today | month | all (default: all)"
        },
        {
          "name": "status",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Status filter: approved | rejected | pending | all (default: settled only)"
        },
        {
          "name": "force",
          "type": "boolean",
          "in": "query",
          "required": false,
          "description": "Set true to include pending records in deletion (dangerous!)"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Withdrawal history cleared.",
          "example": {
            "success": true,
            "message": "Successfully deleted 3 withdrawal record(s) from your history.",
            "affectedRows": 3,
            "period": "all",
            "status": "all"
          }
        }
      ]
    },
    {
      "id": "wallet-withdrawal-clear-post",
      "category": "wallet",
      "method": "POST",
      "path": "/api/mobile/wallet/withdrawals/clear",
      "summary": "Bulk Clear Withdrawal History (POST variant)",
      "description": "POST variant of the bulk clear endpoint. Send filters in request body. Useful for platforms that do not support DELETE with body. Same behavior as DELETE /withdrawals.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        },
        {
          "name": "Content-Type",
          "type": "string",
          "required": true,
          "description": "application/json"
        }
      ],
      "parameters": [],
      "requestBody": {
        "required": false,
        "schema": {
          "period": {
            "type": "string",
            "required": false,
            "description": "Time filter: today | month | all"
          },
          "status": {
            "type": "string",
            "required": false,
            "description": "Status filter: approved | rejected | all"
          },
          "force": {
            "type": "boolean",
            "required": false,
            "description": "Include pending records if true"
          }
        },
        "example": {
          "period": "month",
          "status": "approved"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Withdrawal history cleared.",
          "example": {
            "success": true,
            "message": "Successfully deleted 2 withdrawal record(s) from your history.",
            "affectedRows": 2,
            "period": "month",
            "status": "approved"
          }
        }
      ]
    },
    {
      "id": "vip-categories",
      "category": "vip",
      "method": "GET",
      "path": "/api/mobile/packages/categories",
      "summary": "Get VIP Privilege Categories",
      "description": "Returns VIP badge categories (e.g. Royal Crown, King, Knight) with feature privileges, chat badges, and boost rankings. Supports include_packages=true to embed all tier packages with image thumbnails and user purchase status (is_purchased, days_remaining, my_subscription).",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": false,
          "description": "Optional Bearer JWT token. When provided, automatically marks which packages the authenticated user has purchased."
        }
      ],
      "parameters": [
        {
          "name": "include_packages",
          "in": "query",
          "type": "boolean",
          "required": false,
          "description": "true → Embeds the full packages array (with image_url, validity_days, price, is_purchased) inside each category; false (default) → categories only"
        },
        {
          "name": "active_only",
          "in": "query",
          "type": "boolean",
          "required": false,
          "description": "true (default) → only active categories; false → include inactive"
        },
        {
          "name": "user_id",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Optional User ID to identify purchased subscriptions when token header is omitted"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "VIP categories retrieved successfully with optional embedded packages and purchase state.",
          "example": {
            "success": true,
            "expires_at": "2026-11-14T04:37:25.000Z",
            "days_remaining": 30,
            "active_subscription": {
              "subscription_id": 1,
              "package_id": 1,
              "package_name": "Royal 30-Day Pass",
              "package_image": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
              "category_id": 1,
              "category_name": "Royal",
              "expires_at": "2026-11-14T04:37:25.000Z",
              "days_remaining": 30,
              "is_equipped": true
            },
            "categories": [
              {
                "id": 1,
                "name": "Royal Crown VIP",
                "badge_icon": "👑",
                "color_code": "#f59e0b",
                "display_order": 1,
                "is_active": true,
                "package_count": 3,
                "active_subscribers_count": 1,
                "is_subscribed": true,
                "active_package_id": 1,
                "expires_at": "2026-11-14T04:37:25.000Z",
                "days_remaining": 30,
                "my_subscription": {
                  "subscription_id": 1,
                  "package_id": 1,
                  "category_id": 1,
                  "start_date": "2026-10-15T04:37:25.000Z",
                  "expires_at": "2026-11-14T04:37:25.000Z",
                  "days_remaining": 30,
                  "seconds_remaining": 2591519,
                  "status": "active",
                  "is_active": true,
                  "is_equipped": false
                },
                "privileges": {
                  "cant_be_removed": true,
                  "cant_be_banned": true,
                  "self_seat_accept": true,
                  "top_live_list": true,
                  "anti_mute": true,
                  "special_entry": false
                },
                "privilege_list": [
                  {
                    "key": "cant_be_removed",
                    "name": "Anti-Kick",
                    "icon": "🛡️",
                    "description": "Cannot be kicked or removed from live room by hosts or moderators",
                    "enabled": true
                  },
                  {
                    "key": "cant_be_banned",
                    "name": "Anti-Ban",
                    "icon": "🚫",
                    "description": "Immune to room bans and blacklists",
                    "enabled": true
                  },
                  {
                    "key": "self_seat_accept",
                    "name": "Auto-Seat Approval",
                    "icon": "🎙️",
                    "description": "Instantly occupy mic seat without waiting for host approval",
                    "enabled": true
                  },
                  {
                    "key": "top_live_list",
                    "name": "Top Live Ranking",
                    "icon": "🚀",
                    "description": "Pinned at top of audience and host exploration rankings",
                    "enabled": true
                  },
                  {
                    "key": "anti_mute",
                    "name": "Anti-Mute",
                    "icon": "🔇",
                    "description": "Immune to microphone muting by room hosts",
                    "enabled": true
                  }
                ],
                "custom_privileges": [],
                "packages": [
                  {
                    "id": 1,
                    "category_id": 1,
                    "name": "Royal 30-Day Pass",
                    "image_url": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
                    "validity_days": 30,
                    "price": 50000,
                    "currency": "coins",
                    "description": "30 days of supreme Royal VIP status and privileges.",
                    "is_active": 1,
                    "active_users_count": 1,
                    "is_purchased": true,
                    "is_active_subscription": true,
                    "subscription_id": 1,
                    "expires_at": "2026-11-14T04:37:25.000Z",
                    "days_remaining": 30,
                    "is_equipped": false,
                    "my_subscription": {
                      "subscription_id": 1,
                      "package_id": 1,
                      "category_id": 1,
                      "start_date": "2026-10-15T04:37:25.000Z",
                      "expires_at": "2026-11-14T04:37:25.000Z",
                      "days_remaining": 30,
                      "status": "active",
                      "is_active": true,
                      "is_equipped": false
                    },
                    "category_subscribed": true,
                    "category_active_package_id": 1
                  },
                  {
                    "id": 2,
                    "category_id": 1,
                    "name": "Royal Quarter Pass (90 Days)",
                    "image_url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300",
                    "validity_days": 90,
                    "price": 135000,
                    "currency": "coins",
                    "description": "90 days of Royal Crown VIP privilege benefits with 10% discount.",
                    "is_active": 1,
                    "active_users_count": 0,
                    "is_purchased": false,
                    "is_active_subscription": false,
                    "subscription_id": null,
                    "expires_at": null,
                    "days_remaining": null,
                    "is_equipped": false,
                    "my_subscription": null,
                    "category_subscribed": true,
                    "category_active_package_id": 1
                  },
                  {
                    "id": 3,
                    "category_id": 1,
                    "name": "Royal Annual Majesty (365 Days)",
                    "image_url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300",
                    "validity_days": 365,
                    "price": 480000,
                    "currency": "coins",
                    "description": "Full year of ultimate Royal privileges and top tier status.",
                    "is_active": 1,
                    "active_users_count": 0,
                    "is_purchased": false,
                    "is_active_subscription": false,
                    "subscription_id": null,
                    "expires_at": null,
                    "days_remaining": null,
                    "is_equipped": false,
                    "my_subscription": null,
                    "category_subscribed": true,
                    "category_active_package_id": 1
                  }
                ]
              }
            ]
          }
        }
      ]
    },
    {
      "id": "vip-category-packages",
      "category": "vip",
      "method": "GET",
      "path": "/api/mobile/packages/categories/:categoryId/packages",
      "summary": "Get Packages by Category",
      "description": "Returns all VIP packages for a category with images, privileges, and purchased indicators (is_purchased, days_remaining, my_subscription) if the user is authenticated.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": false,
          "description": "Optional Bearer JWT token. Identifies if the caller has active subscriptions for these packages."
        }
      ],
      "parameters": [
        {
          "name": "categoryId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "ID of the package category (e.g. 1 for Royal Crown)"
        },
        {
          "name": "activeOnly",
          "in": "query",
          "type": "boolean",
          "required": false,
          "description": "true (default) → only active packages; false → include inactive"
        },
        {
          "name": "user_id",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Optional User ID to identify purchased subscriptions without token"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Category and its packages retrieved successfully with image URLs and purchase status.",
          "example": {
            "success": true,
            "category": {
              "id": 1,
              "name": "Royal Crown VIP",
              "badge_icon": "👑",
              "color_code": "#f59e0b",
              "display_order": 1,
              "is_active": true,
              "is_subscribed": true,
              "active_package_id": 1,
              "expires_at": "2026-11-14T04:37:25.000Z",
              "days_remaining": 30,
              "my_subscription": {
                "subscription_id": 1,
                "package_id": 1,
                "category_id": 1,
                "start_date": "2026-10-15T04:37:25.000Z",
                "expires_at": "2026-11-14T04:37:25.000Z",
                "days_remaining": 30,
                "status": "active",
                "is_active": true,
                "is_equipped": false
              },
              "privileges": {
                "cant_be_removed": true,
                "cant_be_banned": true,
                "self_seat_accept": true,
                "top_live_list": true,
                "anti_mute": true,
                "special_entry": false
              },
              "privilege_list": [
                {
                  "key": "cant_be_removed",
                  "name": "Anti-Kick",
                  "icon": "🛡️",
                  "description": "Cannot be kicked or removed from live room by hosts or moderators",
                  "enabled": true
                },
                {
                  "key": "cant_be_banned",
                  "name": "Anti-Ban",
                  "icon": "🚫",
                  "description": "Immune to room bans and blacklists",
                  "enabled": true
                },
                {
                  "key": "self_seat_accept",
                  "name": "Auto-Seat Approval",
                  "icon": "🎙️",
                  "description": "Instantly occupy mic seat without waiting for host approval",
                  "enabled": true
                },
                {
                  "key": "top_live_list",
                  "name": "Top Live Ranking",
                  "icon": "🚀",
                  "description": "Pinned at top of audience and host exploration rankings",
                  "enabled": true
                },
                {
                  "key": "anti_mute",
                  "name": "Anti-Mute",
                  "icon": "🔇",
                  "description": "Immune to microphone muting by room hosts",
                  "enabled": true
                }
              ],
              "custom_privileges": []
            },
            "packages": [
              {
                "id": 1,
                "category_id": 1,
                "name": "Royal 30-Day Pass",
                "image_url": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
                "validity_days": 30,
                "price": 50000,
                "currency": "coins",
                "description": "30 days of supreme Royal VIP status and privileges.",
                "color": "#8b5cf6",
                "is_active": 1,
                "active_users_count": 1,
                "is_purchased": true,
                "is_active_subscription": true,
                "subscription_id": 1,
                "expires_at": "2026-11-14T04:37:25.000Z",
                "days_remaining": 30,
                "is_equipped": false,
                "my_subscription": {
                  "subscription_id": 1,
                  "package_id": 1,
                  "category_id": 1,
                  "start_date": "2026-10-15T04:37:25.000Z",
                  "expires_at": "2026-11-14T04:37:25.000Z",
                  "days_remaining": 30,
                  "status": "active",
                  "is_active": true,
                  "is_equipped": false
                },
                "category_subscribed": true,
                "category_active_package_id": 1
              },
              {
                "id": 2,
                "category_id": 1,
                "name": "Royal Quarter Pass (90 Days)",
                "image_url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300",
                "validity_days": 90,
                "price": 135000,
                "currency": "coins",
                "description": "90 days of Royal Crown VIP privilege benefits with 10% discount.",
                "is_active": 1,
                "active_users_count": 0,
                "is_purchased": false,
                "is_active_subscription": false,
                "subscription_id": null,
                "expires_at": null,
                "days_remaining": null,
                "is_equipped": false,
                "my_subscription": null,
                "category_subscribed": true,
                "category_active_package_id": 1
              },
              {
                "id": 3,
                "category_id": 1,
                "name": "Royal Annual Majesty (365 Days)",
                "image_url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300",
                "validity_days": 365,
                "price": 480000,
                "currency": "coins",
                "description": "Full year of ultimate Royal privileges, supreme entrance animations, and top tier status.",
                "is_active": 1,
                "active_users_count": 0,
                "is_purchased": false,
                "is_active_subscription": false,
                "subscription_id": null,
                "expires_at": null,
                "days_remaining": null,
                "is_equipped": false,
                "my_subscription": null,
                "category_subscribed": true,
                "category_active_package_id": 1
              }
            ],
            "total_packages": 3,
            "user_subscription": {
              "subscription_id": 1,
              "package_id": 1,
              "category_id": 1,
              "start_date": "2026-10-15T04:37:25.000Z",
              "expires_at": "2026-11-14T04:37:25.000Z",
              "days_remaining": 30,
              "status": "active",
              "is_active": true,
              "is_equipped": false
            }
          }
        },
        {
          "status": 400,
          "description": "Invalid category ID.",
          "example": {
            "success": false,
            "message": "Valid category ID is required."
          }
        },
        {
          "status": 404,
          "description": "Category not found.",
          "example": {
            "success": false,
            "message": "Package category not found."
          }
        }
      ]
    },
    {
      "category": "vip",
      "method": "GET",
      "path": "/api/mobile/packages",
      "summary": "Get Available VIP Subscription Packages",
      "description": "Returns active subscription packages across all tiers with duration, coin prices, category info, image thumbnails, and user purchase status (is_purchased, days_remaining, my_subscription).",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": false,
          "description": "Optional Bearer JWT token to identify user purchased packages."
        }
      ],
      "parameters": [
        {
          "name": "category_id",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Filter by VIP category ID"
        },
        {
          "name": "user_id",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Optional User ID to identify user purchases if Authorization header is omitted"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "VIP packages retrieved successfully with image URLs and purchase status.",
          "example": {
            "success": true,
            "packages": [
              {
                "id": 1,
                "category_id": 1,
                "name": "Royal 30-Day Pass",
                "image_url": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
                "validity_days": 30,
                "price": 50000,
                "currency": "coins",
                "description": "30 days of supreme Royal VIP status and privileges.",
                "color": "#8b5cf6",
                "is_active": 1,
                "category_name": "Royal Crown VIP",
                "category_icon": "👑",
                "category_color": "#f59e0b",
                "category_order": 1,
                "cant_be_removed": 1,
                "cant_be_banned": 1,
                "self_seat_accept": 1,
                "top_live_list": 1,
                "anti_mute": 1,
                "special_entry": 0,
                "active_users_count": 1,
                "is_purchased": true,
                "is_active_subscription": true,
                "subscription_id": 1,
                "expires_at": "2026-11-14T04:37:25.000Z",
                "days_remaining": 30,
                "is_equipped": false,
                "my_subscription": {
                  "subscription_id": 1,
                  "package_id": 1,
                  "category_id": 1,
                  "start_date": "2026-10-15T04:37:25.000Z",
                  "expires_at": "2026-11-14T04:37:25.000Z",
                  "days_remaining": 30,
                  "status": "active",
                  "is_active": true,
                  "is_equipped": false
                }
              },
              {
                "id": 2,
                "category_id": 1,
                "name": "Royal Quarter Pass (90 Days)",
                "image_url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300",
                "validity_days": 90,
                "price": 135000,
                "currency": "coins",
                "description": "90 days of Royal Crown VIP privilege benefits with 10% discount.",
                "is_active": 1,
                "category_name": "Royal Crown VIP",
                "category_icon": "👑",
                "category_color": "#f59e0b",
                "category_order": 1,
                "cant_be_removed": 1,
                "cant_be_banned": 1,
                "self_seat_accept": 1,
                "top_live_list": 1,
                "anti_mute": 1,
                "special_entry": 0,
                "active_users_count": 0,
                "is_purchased": false,
                "is_active_subscription": false,
                "subscription_id": null,
                "expires_at": null,
                "days_remaining": null,
                "is_equipped": false,
                "my_subscription": null
              }
            ]
          }
        }
      ]
    },
    {
      "id": "vip-purchase",
      "category": "vip",
      "method": "POST",
      "path": "/api/mobile/packages/purchase",
      "summary": "Subscribe to VIP Package",
      "description": "Deducts coins from user balance and activates VIP privileges (badge, top live rank, entrance animation).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        },
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "application/json",
        "fields": [
          {
            "name": "packageId",
            "type": "integer",
            "required": true,
            "description": "VIP package ID"
          },
          {
            "name": "durationMonths",
            "type": "integer",
            "required": false,
            "description": "Subscription duration in months (default: package duration)"
          }
        ],
        "example": {
          "packageId": 1,
          "durationMonths": 1
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "VIP subscription activated.",
          "example": {
            "success": true,
            "message": "Subscribed to Royal Crown VIP successfully for 1 month(s)!",
            "subscription": {
              "category_name": "Royal Crown VIP",
              "expires_at": "2026-11-11T23:00:00.000Z"
            }
          }
        }
      ]
    },
    {
      "id": "vip-privileges",
      "category": "vip",
      "method": "GET",
      "path": "/api/mobile/packages/my-privileges",
      "summary": "Get My Active VIP Privileges",
      "description": "Returns current authenticated user active VIP subscription status, expiration, and enabled features.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "User privileges retrieved.",
          "example": {
            "success": true,
            "has_active_vip": true,
            "privileges": {
              "category_name": "Royal Crown VIP",
              "color_code": "#ffd700",
              "badge_icon": "/uploads/vip/royal.png",
              "top_live_list": true,
              "special_effects": true,
              "expires_at": "2026-11-11T23:00:00.000Z"
            }
          }
        }
      ]
    },
    {
      "id": "reseller-balance",
      "category": "reseller",
      "method": "GET",
      "path": "/api/mobile/reseller/balance",
      "summary": "Get Reseller Coin Stock & Performance",
      "description": "Retrieve the authenticated reseller's available coin balance, account details, and lifetime/today sales metrics. Cached via Redis Cache-Aside ('reseller:balance:{resellerId}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of logged in reseller"
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Reseller balance and performance retrieved successfully.",
          "example": {
            "success": true,
            "reseller": {
              "id": 5,
              "full_name": "Tanvir Ahmed",
              "email": "tanvir@umi.live",
              "avatar_url": "https://example.com/avatar.jpg",
              "role": "reseller",
              "coins": 25000,
              "level": 10,
              "is_banned": false,
              "created_at": "2026-10-10T08:00:00.000Z"
            },
            "coins": 25000,
            "stats": {
              "total_coins_sold": 150000,
              "total_revenue": 135000,
              "total_sales_count": 85,
              "today_coins_sold": 5000,
              "today_revenue": 4500,
              "today_sales_count": 4,
              "month_coins_sold": 45000,
              "month_revenue": 40500,
              "month_sales_count": 28
            }
          }
        },
        {
          "status": 403,
          "description": "Forbidden. Reseller privileges required.",
          "example": {
            "success": false,
            "message": "Forbidden. Reseller privileges required."
          }
        }
      ]
    },
    {
      "id": "reseller-search-users",
      "category": "reseller",
      "method": "GET",
      "path": "/api/mobile/reseller/users/search",
      "summary": "Search Customers by ID, Name or Email",
      "description": "Search customer accounts to select for coin top-up. Matches numeric User ID (exact match prioritized), full name, or email. Cached in Redis ('reseller:search_users:{term}', 30s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "q",
          "type": "string",
          "in": "query",
          "required": true,
          "description": "Customer User ID (e.g. 2 or #2), name keyword, or email"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Matching customer users list.",
          "example": {
            "success": true,
            "query": "2",
            "count": 1,
            "users": [
              {
                "id": 2,
                "full_name": "Nila Akter",
                "email": "nila@umi.live",
                "avatar_url": "https://example.com/avatar2.jpg",
                "role": "user",
                "coins": 5095,
                "level": 3,
                "is_banned": false,
                "created_at": "2026-10-10T08:00:00.000Z"
              }
            ]
          }
        }
      ]
    },
    {
      "id": "reseller-get-user",
      "category": "reseller",
      "method": "GET",
      "path": "/api/mobile/reseller/users/{userId}",
      "summary": "Select & View Customer Profile Details",
      "description": "Select a customer by User ID to inspect their current coins, account status, and previous top-up history with this reseller before transferring coins. Cached via Redis ('reseller:user_details:{userId}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Target Customer User ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Customer details retrieved successfully.",
          "example": {
            "success": true,
            "user": {
              "id": 2,
              "full_name": "Nila Akter",
              "email": "nila@umi.live",
              "avatar_url": "https://example.com/avatar2.jpg",
              "role": "user",
              "coins": 5095,
              "level": 3,
              "is_banned": false,
              "created_at": "2026-10-10T08:00:00.000Z"
            },
            "pastHistory": {
              "total_coins_received": 12000,
              "recharge_count": 5,
              "last_recharge_at": "2026-10-11T14:22:10.000Z"
            }
          }
        },
        {
          "status": 404,
          "description": "Customer not found.",
          "example": {
            "success": false,
            "message": "Customer user #999 not found."
          }
        }
      ]
    },
    {
      "id": "reseller-recharge-user",
      "category": "reseller",
      "method": "POST",
      "path": "/api/mobile/reseller/recharge",
      "summary": "Recharge / Transfer Coins to Customer",
      "description": "Transfers coins directly from reseller stock to a customer user. Validates balances, executes atomic MySQL transaction (deduct reseller, credit customer, record sale and transaction ledgers), and instantly purges all relevant Redis caches.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        },
        {
          "name": "Content-Type",
          "type": "string",
          "required": true,
          "description": "application/json"
        }
      ],
      "parameters": [],
      "requestBody": {
        "required": true,
        "schema": {
          "buyerId": {
            "type": "integer",
            "required": true,
            "description": "Target Customer User ID to receive coins"
          },
          "coinAmount": {
            "type": "integer",
            "required": true,
            "description": "Amount of coins to recharge (positive integer)"
          },
          "priceAmount": {
            "type": "number",
            "required": false,
            "description": "Fiat price collected from customer (default 0.00)"
          },
          "currency": {
            "type": "string",
            "required": false,
            "description": "Currency of payment (default: BDT)"
          },
          "notes": {
            "type": "string",
            "required": false,
            "description": "Memo / Note for the transaction"
          }
        },
        "example": {
          "buyerId": 2,
          "coinAmount": 500,
          "priceAmount": 450,
          "currency": "BDT",
          "notes": "Cash payment top-up via mobile app"
        }
      },
      "responses": [
        {
          "status": 201,
          "description": "Coin recharge completed successfully.",
          "example": {
            "success": true,
            "message": "Successfully recharged 500 coins to User #2 (Nila Akter)!",
            "transaction": {
              "id": 28,
              "reseller_id": 5,
              "buyer_id": 2,
              "buyer_name": "Nila Akter",
              "buyer_email": "nila@umi.live",
              "coin_amount": 500,
              "price_amount": 450,
              "currency": "BDT",
              "notes": "Cash payment top-up via mobile app",
              "created_at": "2026-10-12T06:35:10.000Z"
            },
            "resellerRemainingCoins": 24500,
            "buyerNewBalance": 5595
          }
        },
        {
          "status": 400,
          "description": "Insufficient coins in reseller stock or invalid inputs.",
          "example": {
            "success": false,
            "message": "Insufficient coin stock! You currently have 100 coins, but requested 500 coins.",
            "availableCoins": 100
          }
        }
      ]
    },
    {
      "id": "reseller-transactions",
      "category": "reseller",
      "method": "GET",
      "path": "/api/mobile/reseller/transactions",
      "summary": "Get Reseller Transaction History",
      "description": "Retrieve paginated history of coin recharges performed by this reseller. Includes summary metrics and filters by period ('all', 'today', 'week', 'month') and search keyword. Cached via Redis Cache-Aside (60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "page",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Page number (default 1)"
        },
        {
          "name": "limit",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Items per page (default 20, max 100)"
        },
        {
          "name": "period",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Time filter: \"all\", \"today\", \"week\", or \"month\""
        },
        {
          "name": "search",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Search by Customer User ID, name, or memo"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Transactions list retrieved successfully.",
          "example": {
            "success": true,
            "summary": {
              "total_coins_sold": 150000,
              "total_revenue": 135000,
              "total_transactions": 85,
              "today_coins_sold": 5000,
              "today_revenue": 4500
            },
            "transactions": [
              {
                "id": 28,
                "reseller_id": 5,
                "buyer_id": 2,
                "coin_amount": 500,
                "price_amount": 450,
                "currency": "BDT",
                "notes": "Cash payment top-up via mobile app",
                "created_at": "2026-10-12T06:35:10.000Z",
                "buyer_name": "Nila Akter",
                "buyer_email": "nila@umi.live",
                "buyer_avatar": "https://example.com/avatar2.jpg",
                "buyer_role": "user"
              }
            ],
            "pagination": {
              "page": 1,
              "limit": 20,
              "total": 85,
              "totalPages": 5
            }
          }
        }
      ]
    },
    {
      "id": "reseller-delete-transaction",
      "category": "reseller",
      "method": "DELETE",
      "path": "/api/mobile/reseller/transactions/{id}",
      "summary": "Delete Single Transaction from History",
      "description": "Delete an individual transaction record from the reseller's history. Verifies transaction ownership, deletes from MySQL (SSOT), and immediately purges Redis caches.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "id",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Transaction Sale ID to delete"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Transaction record deleted successfully.",
          "example": {
            "success": true,
            "message": "Transaction #28 deleted successfully from history.",
            "deletedId": 28
          }
        },
        {
          "status": 404,
          "description": "Transaction not found.",
          "example": {
            "success": false,
            "message": "Transaction #999 not found."
          }
        }
      ]
    },
    {
      "id": "reseller-clear-transactions",
      "category": "reseller",
      "method": "DELETE",
      "path": "/api/mobile/reseller/transactions",
      "summary": "Clear All Reseller Transactions",
      "description": "Clears all transaction history (or for a specific time period) for this reseller. Executes MySQL delete and purges Redis cache immediately.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "period",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Optional filter: \"all\" (default), \"today\", or \"month\""
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Transactions cleared successfully.",
          "example": {
            "success": true,
            "message": "Successfully cleared 85 transaction records from your reseller history.",
            "affectedRows": 85,
            "period": "all"
          }
        }
      ]
    },
    {
      "id": "moderator-search-users",
      "category": "moderator",
      "method": "GET",
      "path": "/api/mobile/moderator/users/search",
      "summary": "Search Users for Moderation",
      "description": "Search for any user by User ID (exact match prioritized), full name, or email. Returns user account profile, current ban status, and total/banned mobile device counts. Cached in Redis ('moderator:search_users:{term}', 30s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Moderator or Admin"
        }
      ],
      "parameters": [
        {
          "name": "q",
          "type": "string",
          "in": "query",
          "required": true,
          "description": "User ID (e.g. 2 or #2), name keyword, or email"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Matching users for moderation.",
          "example": {
            "success": true,
            "query": "2",
            "count": 1,
            "users": [
              {
                "id": 2,
                "full_name": "Nila Akter",
                "email": "nila@umi.live",
                "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                "role": "host",
                "coins": 5395,
                "diamonds": 18500,
                "level": 15,
                "is_banned": false,
                "created_at": "2026-10-10T08:00:00.000Z",
                "devices_summary": {
                  "total": 2,
                  "banned": 0
                }
              }
            ]
          }
        }
      ]
    },
    {
      "id": "moderator-get-user-devices",
      "category": "moderator",
      "method": "GET",
      "path": "/api/mobile/moderator/users/{userId}",
      "summary": "Inspect User Profile & Logged-in Mobile Devices List",
      "description": "Retrieve a user's complete profile along with the comprehensive list of every mobile hardware device this user has logged in with. Includes device model, OS, IP address, and hardware ban status. Cached via Redis ('moderator:user_details:{userId}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Target User ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "User profile and registered mobile devices.",
          "example": {
            "success": true,
            "user": {
              "id": 2,
              "full_name": "Nila Akter",
              "email": "nila@umi.live",
              "role": "host",
              "coins": 5395,
              "diamonds": 18500,
              "level": 15,
              "is_banned": false,
              "created_at": "2026-10-10T08:00:00.000Z"
            },
            "deviceSummary": {
              "totalDevices": 2,
              "bannedDevices": 0,
              "activeDevices": 2
            },
            "devices": [
              {
                "id": 1,
                "device_id": "iphone-uuid-99a8b7c6",
                "device_model": "iPhone 15 Pro Max",
                "os_type": "iOS",
                "os_version": "17.5.1",
                "app_version": "1.2.0",
                "ip_address": "103.112.54.12",
                "user_agent": "UmiMobile/1.2.0 (iOS; iPhone 15 Pro Max)",
                "is_banned": false,
                "ban_reason": null,
                "last_login_at": "2026-10-12T06:30:00.000Z"
              },
              {
                "id": 2,
                "device_id": "android-hwid-55443322",
                "device_model": "Samsung Galaxy S24 Ultra",
                "os_type": "Android",
                "os_version": "14.0",
                "app_version": "1.2.0",
                "ip_address": "103.112.54.18",
                "user_agent": "UmiMobile/1.2.0 (Android; SM-S928B)",
                "is_banned": false,
                "ban_reason": null,
                "last_login_at": "2026-10-11T18:20:00.000Z"
              }
            ]
          }
        }
      ]
    },
    {
      "id": "moderator-ban-user",
      "category": "moderator",
      "method": "POST",
      "path": "/api/mobile/moderator/users/{userId}/ban",
      "summary": "Ban or Unban User Account (With Optional Device Ban)",
      "description": "Bans or unbans a user account. If `banAllDevices: true` is passed, automatically bans every mobile hardware device associated with this user. Executes MySQL update (SSOT) and immediately purges all relevant Redis caches.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        },
        {
          "name": "Content-Type",
          "type": "string",
          "required": true,
          "description": "application/json"
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Target User ID to ban or unban"
        }
      ],
      "requestBody": {
        "required": true,
        "schema": {
          "isBanned": {
            "type": "boolean",
            "required": true,
            "description": "true to ban, false to lift suspension"
          },
          "reason": {
            "type": "string",
            "required": false,
            "description": "Reason for suspension / policy violation"
          },
          "banAllDevices": {
            "type": "boolean",
            "required": false,
            "description": "If true, also bans all mobile devices used by this user"
          }
        },
        "example": {
          "isBanned": true,
          "reason": "Severe violation of live community guidelines (inappropriate behavior)",
          "banAllDevices": true
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "User ban state updated successfully.",
          "example": {
            "success": true,
            "message": "User #2 (Nila Akter) has been suspended. Also banned 2 mobile device(s).",
            "userId": 2,
            "is_banned": true,
            "reason": "Severe violation of live community guidelines",
            "banAllDevices": true,
            "devicesUpdatedCount": 2
          }
        }
      ]
    },
    {
      "id": "moderator-ban-device",
      "category": "moderator",
      "method": "POST",
      "path": "/api/mobile/moderator/users/{userId}/devices/{deviceId}/ban",
      "summary": "Ban or Unban User Specific Mobile Device",
      "description": "Bans or unbans a mobile device belonging to a specific selected User ID (by Record ID, hardware Device ID, or Device Model). Requiring User ID first ensures devices with the same model name (e.g. iPhone 13) across other users are never mistakenly banned. Instant Redis synchronization ('device:banned:{deviceId}').",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token (Moderator or Admin)"
        },
        {
          "name": "Content-Type",
          "type": "string",
          "required": true,
          "description": "application/json"
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Target User ID (selected first from user search/profile)"
        },
        {
          "name": "deviceId",
          "type": "string",
          "in": "path",
          "required": true,
          "description": "Device Record ID, Hardware UUID, or Device Model registered under this user"
        }
      ],
      "requestBody": {
        "required": true,
        "schema": {
          "isBanned": {
            "type": "boolean",
            "required": true,
            "description": "true to ban device, false to unban"
          },
          "reason": {
            "type": "string",
            "required": false,
            "description": "Reason for hardware ban"
          }
        },
        "example": {
          "isBanned": true,
          "reason": "Spamming and fraudulent bot activity"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Device ban status updated successfully.",
          "example": {
            "success": true,
            "message": "Device \"iPhone 15 Pro Max\" (iphone-uuid-99a8b7c6) for User #5 (Tanvir Ahmed) has been banned.",
            "user": {
              "id": 5,
              "full_name": "Tanvir Ahmed",
              "email": "tanvir@umi.live"
            },
            "device": {
              "id": 1,
              "device_id": "iphone-uuid-99a8b7c6",
              "device_model": "iPhone 15 Pro Max",
              "is_banned": true,
              "ban_reason": "Spamming and fraudulent bot activity",
              "banned_at": "2026-10-12T07:15:00.000Z"
            }
          }
        }
      ]
    },
    {
      "id": "moderator-list-banned-devices",
      "category": "moderator",
      "method": "GET",
      "path": "/api/mobile/moderator/devices",
      "summary": "List All Platform Banned Devices",
      "description": "Retrieve paginated list of all mobile hardware devices currently banned platform-wide. Includes device details, ban timestamp, reason, and last associated user. Cached in Redis ('moderator:banned_devices:{page}:{limit}:{search}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "page",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Page number (default 1)"
        },
        {
          "name": "limit",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Items per page (default 20, max 100)"
        },
        {
          "name": "search",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Search by device ID, model, or user name"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Banned devices list retrieved successfully.",
          "example": {
            "success": true,
            "devices": [
              {
                "id": 1,
                "device_id": "iphone-uuid-99a8b7c6",
                "device_model": "iPhone 15 Pro Max",
                "os_type": "iOS",
                "os_version": "17.5.1",
                "is_banned": true,
                "ban_reason": "Spamming and fraudulent bot activity",
                "banned_at": "2026-10-12T06:40:00.000Z",
                "user": {
                  "id": 2,
                  "full_name": "Nila Akter",
                  "email": "nila@umi.live",
                  "is_banned": true
                }
              }
            ],
            "pagination": {
              "page": 1,
              "limit": 20,
              "total": 1,
              "totalPages": 1
            }
          }
        }
      ]
    },
    {
      "id": "moderator-register-device",
      "category": "moderator",
      "method": "POST",
      "path": "/api/mobile/moderator/users/{userId}/devices/register",
      "summary": "Register or Sync User Mobile Device",
      "description": "Manually or programmatically register a device under a user account for testing, auditing, or device binding.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        },
        {
          "name": "Content-Type",
          "type": "string",
          "required": true,
          "description": "application/json"
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "User ID to register the device under"
        }
      ],
      "requestBody": {
        "required": true,
        "schema": {
          "deviceId": {
            "type": "string",
            "required": true,
            "description": "Unique device hardware ID"
          },
          "deviceModel": {
            "type": "string",
            "required": false,
            "description": "Device model name"
          },
          "osType": {
            "type": "string",
            "required": false,
            "description": "OS name (iOS or Android)"
          },
          "osVersion": {
            "type": "string",
            "required": false,
            "description": "OS Version number"
          },
          "appVersion": {
            "type": "string",
            "required": false,
            "description": "App version"
          }
        },
        "example": {
          "deviceId": "pixel-hw-88776655",
          "deviceModel": "Google Pixel 8 Pro",
          "osType": "Android",
          "osVersion": "14.0",
          "appVersion": "1.2.0"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Device registered successfully.",
          "example": {
            "success": true,
            "message": "Device \"pixel-hw-88776655\" successfully registered for User #2.",
            "device_id": "pixel-hw-88776655",
            "user_id": 2
          }
        }
      ]
    },
    {
      "id": "moderator-agency-list",
      "category": "moderator",
      "method": "GET",
      "path": "/api/mobile/moderator/agencies",
      "summary": "List All Agencies (Moderator Oversight)",
      "description": "Retrieve complete listing of all registered agencies with performance metrics (host counts, live streamers, owner coins, total commission coins, pending requests). Cached in Redis ('agency:list:all', 30s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Moderator or Admin"
        }
      ],
      "parameters": [
        {
          "name": "search",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Filter agencies by name, code, or owner name"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Complete list of agencies with oversight metrics.",
          "example": {
            "success": true,
            "message": "Agencies list retrieved successfully.",
            "count": 1,
            "data": [
              {
                "id": 1,
                "agency_code": "AG-101",
                "name": "Starlight Talent Agency",
                "owner_id": 1,
                "owner_name": "System Admin",
                "owner_coins": 100000,
                "commission_rate": 15,
                "status": "active",
                "total_hosts": 3,
                "active_streaming_hosts": 1,
                "pending_requests_count": 0,
                "total_commission_coins": 1250
              }
            ]
          }
        }
      ]
    },
    {
      "id": "moderator-agency-overview",
      "category": "moderator",
      "method": "GET",
      "path": "/api/mobile/moderator/agencies/{agencyId}/overview",
      "summary": "Get Agency Full Overview (Moderator)",
      "description": "Inspect an agency's profile, owner balance, host counts, broadcast-banned host count, total commissions earned, and pending recruitment requests. Cached in Redis ('agency:overview:{agencyId}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Moderator or Admin"
        }
      ],
      "parameters": [
        {
          "name": "agencyId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Agency ID to inspect"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Detailed agency metrics and overview.",
          "example": {
            "success": true,
            "message": "Agency overview retrieved successfully.",
            "data": {
              "agency": {
                "id": 1,
                "agency_code": "AG-101",
                "name": "Starlight Talent Agency",
                "commission_rate": 15,
                "status": "active"
              },
              "owner": {
                "id": 1,
                "full_name": "System Admin",
                "coins": 100000,
                "diamonds": 50000
              },
              "metrics": {
                "total_hosts": 3,
                "active_streaming_hosts": 1,
                "banned_hosts_count": 0,
                "total_commission_coins": 1250,
                "total_coins_gifted_to_hosts": 8333,
                "pending_requests_count": 1
              }
            }
          }
        }
      ]
    },
    {
      "id": "moderator-agency-hosts",
      "category": "moderator",
      "method": "GET",
      "path": "/api/mobile/moderator/agencies/{agencyId}/hosts",
      "summary": "Get Agency Hosts List (Moderator)",
      "description": "Retrieve list of all affiliated hosts under the specified agency with live status, streaming duration, coins earned, and broadcast ban status. Cached in Redis ('agency:hosts:{agencyId}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Moderator or Admin"
        }
      ],
      "parameters": [
        {
          "name": "agencyId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Agency ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "List of hosts under this agency.",
          "example": {
            "success": true,
            "message": "Agency hosts retrieved successfully.",
            "count": 1,
            "data": [
              {
                "id": 2,
                "full_name": "Nila Akter",
                "email": "nila@umi.live",
                "host_type": "video",
                "coins": 5395,
                "is_currently_live": false,
                "is_broadcast_banned": false,
                "ban_remaining_seconds": 0,
                "performance": {
                  "total_streaming_seconds": 3600,
                  "total_coins_earned": 5000,
                  "agency_commission_coins": 750
                }
              }
            ]
          }
        }
      ]
    },
    {
      "id": "moderator-agency-remove-host",
      "category": "moderator",
      "method": "POST",
      "path": "/api/mobile/moderator/agencies/{agencyId}/hosts/{hostId}/remove",
      "summary": "Remove Host from Agency (Moderator)",
      "description": "Moderator forces the release/removal of a host from an agency. Resets agency affiliation to null, role to 'user', terminates ongoing live stream if active, and invalidates Redis cache instantly.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Moderator or Admin"
        }
      ],
      "parameters": [
        {
          "name": "agencyId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Agency ID"
        },
        {
          "name": "hostId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Host User ID to remove"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Host successfully released from agency.",
          "example": {
            "success": true,
            "message": "Host \"Nila Akter\" has been removed from agency \"Starlight Talent Agency\".",
            "data": {
              "host_id": 2,
              "host_name": "Nila Akter",
              "agency_id": 1
            }
          }
        }
      ]
    },
    {
      "id": "moderator-agency-ban-broadcast",
      "category": "moderator",
      "method": "POST",
      "path": "/api/mobile/moderator/agencies/{agencyId}/hosts/{hostId}/ban-broadcast",
      "summary": "Ban Host Broadcast (Moderator)",
      "description": "Suspend a host under this agency from starting audio/video live broadcasts for a designated duration (minutes, hours, days, or ISO timestamp). Terminates ongoing stream if active, and invalidates Redis cache instantly.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Moderator or Admin"
        },
        {
          "name": "Content-Type",
          "type": "string",
          "required": true,
          "description": "application/json"
        }
      ],
      "parameters": [
        {
          "name": "agencyId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Agency ID"
        },
        {
          "name": "hostId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Host User ID to suspend"
        }
      ],
      "requestBody": {
        "required": false,
        "schema": {
          "durationHours": {
            "type": "integer",
            "required": false,
            "description": "Duration in hours (e.g. 1, 24, 72)"
          },
          "durationMinutes": {
            "type": "integer",
            "required": false,
            "description": "Duration in minutes"
          },
          "durationDays": {
            "type": "integer",
            "required": false,
            "description": "Duration in days"
          },
          "bannedUntil": {
            "type": "string",
            "required": false,
            "description": "Explicit future ISO timestamp"
          },
          "reason": {
            "type": "string",
            "required": false,
            "description": "Reason for suspension"
          }
        },
        "example": {
          "durationHours": 2,
          "reason": "Violation of broadcasting standards (moderator enforced)"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Host broadcast permissions suspended.",
          "example": {
            "success": true,
            "message": "Host \"Nila Akter\" has been broadcast suspended until 2026-10-12 15:30:00.",
            "data": {
              "host_id": 2,
              "host_name": "Nila Akter",
              "broadcast_banned_until": "2026-10-12T15:30:00.000Z",
              "duration_seconds": 7200,
              "duration_formatted": "2 hours",
              "reason": "Violation of broadcasting standards (moderator enforced)",
              "stream_terminated": false
            }
          }
        }
      ]
    },
    {
      "id": "moderator-agency-unban-broadcast",
      "category": "moderator",
      "method": "POST",
      "path": "/api/mobile/moderator/agencies/{agencyId}/hosts/{hostId}/unban-broadcast",
      "summary": "Unban Host Broadcast (Moderator)",
      "description": "Lift broadcast suspension from a host immediately, allowing them to resume live streaming. Updates database and invalidates Redis cache instantly.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Moderator or Admin"
        }
      ],
      "parameters": [
        {
          "name": "agencyId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Agency ID"
        },
        {
          "name": "hostId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Host User ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Broadcast ban lifted successfully.",
          "example": {
            "success": true,
            "message": "Broadcast ban for host \"Nila Akter\" has been successfully lifted.",
            "data": {
              "host_id": 2,
              "host_name": "Nila Akter",
              "agency_id": 1,
              "is_broadcast_banned": false
            }
          }
        }
      ]
    },
    {
      "id": "moderator-agency-banned-hosts",
      "category": "moderator",
      "method": "GET",
      "path": "/api/mobile/moderator/agencies/{agencyId}/banned-hosts",
      "summary": "Get Agency Banned Hosts (Moderator)",
      "description": "Retrieve currently broadcast-suspended hosts for the specified agency with remaining time and ban reason. Cached in Redis ('agency:banned_hosts:{agencyId}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Moderator or Admin"
        }
      ],
      "parameters": [
        {
          "name": "agencyId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Agency ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Currently broadcast-banned hosts.",
          "example": {
            "success": true,
            "message": "Banned hosts retrieved successfully.",
            "count": 1,
            "data": [
              {
                "id": 2,
                "full_name": "Nila Akter",
                "broadcast_banned_until": "2026-10-12T15:30:00.000Z",
                "broadcast_ban_reason": "Violation of broadcasting standards",
                "remaining_seconds": 7120,
                "remaining_formatted": "1 hour 58 minutes"
              }
            ]
          }
        }
      ]
    },
    {
      "id": "moderator-agency-requests",
      "category": "moderator",
      "method": "GET",
      "path": "/api/mobile/moderator/agencies/{agencyId}/requests",
      "summary": "Get Agency Host Recruitment Requests (Moderator)",
      "description": "Retrieve pending/approved/rejected host join applications for the agency. Cached in Redis ('agency:requests:{agencyId}:{status}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Moderator or Admin"
        }
      ],
      "parameters": [
        {
          "name": "agencyId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Agency ID"
        },
        {
          "name": "status",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Filter: pending (default), approved, rejected, or all"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "List of host recruitment join requests.",
          "example": {
            "success": true,
            "message": "Agency host requests (pending) retrieved successfully.",
            "count": 1,
            "data": [
              {
                "id": 1,
                "agency_id": 1,
                "user_id": 5,
                "host_type": "video",
                "message": "Looking to join as top streamer",
                "status": "pending",
                "created_at": "2026-10-12T10:00:00.000Z",
                "applicant": {
                  "id": 5,
                  "full_name": "Tanvir Ahmed",
                  "email": "tanvir@umi.live",
                  "level": 3,
                  "already_in_agency": false
                }
              }
            ]
          }
        }
      ]
    },
    {
      "id": "moderator-agency-approve-request",
      "category": "moderator",
      "method": "POST",
      "path": "/api/mobile/moderator/agencies/{agencyId}/requests/{requestId}/approve",
      "summary": "Approve Host Join Request (Moderator)",
      "description": "Moderator approves a user's join application on behalf of the agency. Assigns user to agency as host and invalidates Redis cache instantly.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Moderator or Admin"
        }
      ],
      "parameters": [
        {
          "name": "agencyId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Agency ID"
        },
        {
          "name": "requestId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Request ID to approve"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Applicant approved and affiliated as agency host.",
          "example": {
            "success": true,
            "message": "Applicant \"Tanvir Ahmed\" is now approved as a video host under \"Starlight Talent Agency\".",
            "data": {
              "request_id": 1,
              "user_id": 5,
              "agency_id": 1,
              "status": "approved",
              "host_type": "video"
            }
          }
        }
      ]
    },
    {
      "id": "moderator-agency-reject-request",
      "category": "moderator",
      "method": "POST",
      "path": "/api/mobile/moderator/agencies/{agencyId}/requests/{requestId}/reject",
      "summary": "Reject Host Join Request (Moderator)",
      "description": "Moderator rejects a user's join application on behalf of the agency. Updates request status and invalidates Redis cache instantly.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Moderator or Admin"
        }
      ],
      "parameters": [
        {
          "name": "agencyId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Agency ID"
        },
        {
          "name": "requestId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Request ID to reject"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Host request rejected.",
          "example": {
            "success": true,
            "message": "Request #1 from applicant \"Tanvir Ahmed\" has been rejected.",
            "data": {
              "request_id": 1,
              "user_id": 5,
              "agency_id": 1,
              "status": "rejected"
            }
          }
        }
      ]
    },
    {
      "id": "host-agency-summary",
      "category": "host-performance",
      "method": "GET",
      "path": "/api/mobile/host/agency",
      "summary": "Get Host Current Agency & Lifetime Performance",
      "description": "Retrieve the host's affiliated agency details, whether they are a video or audio host, and total streaming duration, total coins earned, and total commission given while under this agency. Cached in Redis ('host:agency_summary:{hostId}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token of Host, Agency Manager, or Admin"
        }
      ],
      "parameters": [
        {
          "name": "hostId",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Optional Host User ID (allowed for Agency Managers or Admins inspecting a host)"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Host agency details and performance retrieved successfully.",
          "example": {
            "success": true,
            "host": {
              "id": 2,
              "full_name": "Nila Akter",
              "email": "nila@umi.live",
              "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
              "role": "host",
              "host_type": "video",
              "is_video_host": true,
              "is_audio_host": false,
              "level": 15,
              "coins": 5395,
              "diamonds": 18500
            },
            "has_agency": true,
            "agency": {
              "id": 1,
              "agency_code": "STAR-01",
              "name": "Star Media Agency",
              "owner_id": 10,
              "owner_name": "Agency Manager",
              "commission_rate": 10,
              "status": "active",
              "contact_phone": "+8801700000000",
              "host_joined_at": "2026-10-10T08:00:00.000Z"
            },
            "performance_under_agency": {
              "agency_joined_at": "2026-10-10T08:00:00.000Z",
              "total_duration_seconds": 45200,
              "formatted_total_duration": "12h 33m 20s",
              "video_duration_seconds": 38000,
              "formatted_video_duration": "10h 33m 20s",
              "audio_duration_seconds": 7200,
              "formatted_audio_duration": "02h 00m 00s",
              "total_stream_sessions": 8,
              "total_active_days": 3,
              "total_coins_earned": 25000,
              "total_diamonds_earned": 12500,
              "total_agency_commission": 2500,
              "host_net_coins": 22500,
              "commission_rate_percentage": 10
            }
          }
        },
        {
          "status": 403,
          "description": "Forbidden. Host privileges required.",
          "example": {
            "success": false,
            "message": "Forbidden. Host privileges required."
          }
        }
      ]
    },
    {
      "id": "host-monthly-breakdown",
      "category": "host-performance",
      "method": "GET",
      "path": "/api/mobile/host/performance/monthly",
      "summary": "Monthly Streaming & Daily Earnings Breakdown",
      "description": "Retrieve a complete monthly breakdown showing day-by-day streaming hours (video time vs audio time), daily coins earned from gifts, and daily commission received by the agency. Cached via Redis ('host:monthly:{hostId}:{month}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "month",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Target month in YYYY-MM format (default: current month e.g. 2026-10)"
        },
        {
          "name": "hostId",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Optional Host User ID (for Admins or Agency Managers)"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Monthly streaming and earnings breakdown retrieved successfully.",
          "example": {
            "success": true,
            "month": "2026-10",
            "host": {
              "id": 2,
              "full_name": "Nila Akter",
              "host_type": "video",
              "is_video_host": true,
              "is_audio_host": false
            },
            "has_agency": true,
            "agency": {
              "id": 1,
              "agency_code": "STAR-01",
              "name": "Star Media Agency",
              "commission_rate": 10
            },
            "monthly_summary": {
              "month": "2026-10",
              "total_duration_seconds": 45200,
              "formatted_total_duration": "12h 33m 20s",
              "video_duration_seconds": 38000,
              "formatted_video_duration": "10h 33m 20s",
              "audio_duration_seconds": 7200,
              "formatted_audio_duration": "02h 00m 00s",
              "total_coins_earned": 25000,
              "total_diamonds_earned": 12500,
              "total_agency_commission": 2500,
              "host_net_coins": 22500,
              "active_days_count": 3,
              "valid_days_count": 3
            },
            "daily_breakdown": [
              {
                "date": "2026-10-12",
                "day_name": "Mon",
                "sessions_count": 2,
                "total_duration_seconds": 14400,
                "formatted_total_duration": "04h 00m 00s",
                "video_duration_seconds": 14400,
                "formatted_video_duration": "04h 00m 00s",
                "audio_duration_seconds": 0,
                "formatted_audio_duration": "00h 00m 00s",
                "coins_earned": 12000,
                "diamonds_earned": 6000,
                "agency_commission": 1200,
                "host_net_coins": 10800,
                "is_valid_day": true
              },
              {
                "date": "2026-10-11",
                "day_name": "Sun",
                "sessions_count": 3,
                "total_duration_seconds": 18000,
                "formatted_total_duration": "05h 00m 00s",
                "video_duration_seconds": 14400,
                "formatted_video_duration": "04h 00m 00s",
                "audio_duration_seconds": 3600,
                "formatted_audio_duration": "01h 00m 00s",
                "coins_earned": 8000,
                "diamonds_earned": 4000,
                "agency_commission": 800,
                "host_net_coins": 7200,
                "is_valid_day": true
              }
            ]
          }
        }
      ]
    },
    {
      "id": "host-stream-history",
      "category": "host-performance",
      "method": "GET",
      "path": "/api/mobile/host/streams",
      "summary": "Get Host Live Stream Session Logs",
      "description": "Retrieve paginated history of past live stream rooms hosted by this user. Includes stream duration, live_type (video vs audio), viewer counts, and diamonds/coins earned. Cached via Redis (60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "page",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Page number (default 1)"
        },
        {
          "name": "limit",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Items per page (default 20)"
        },
        {
          "name": "month",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Filter by month YYYY-MM"
        },
        {
          "name": "live_type",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Filter: \"all\", \"video\", or \"audio\""
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Stream session history retrieved successfully.",
          "example": {
            "success": true,
            "streams": [
              {
                "id": 15,
                "room_id": "room_video_001",
                "title": "Acoustic Guitar & Night Chatting 🎸",
                "category": "Music",
                "live_type": "video",
                "status": "ended",
                "viewer_count": 85,
                "total_diamonds": 6000,
                "coins_earned": 12000,
                "duration_seconds": 7200,
                "formatted_duration": "02h 00m 00s",
                "started_at": "2026-10-12T04:00:00.000Z",
                "ended_at": "2026-10-12T06:00:00.000Z"
              }
            ],
            "pagination": {
              "page": 1,
              "limit": 20,
              "total": 8,
              "totalPages": 1
            }
          }
        }
      ]
    },
    {
      "id": "host-dashboard-overview",
      "category": "host-performance",
      "method": "GET",
      "path": "/api/mobile/host/overview",
      "summary": "Get Host Today & Monthly Live Overview",
      "description": "Quick dashboard endpoint summarizing today's live stream duration (video vs audio), coins earned today, agency commission today, and this month's aggregated progress. Cached in Redis ('host:overview:{hostId}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "hostId",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Optional Host User ID (for Admins or Agency Managers)"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Host dashboard overview retrieved successfully.",
          "example": {
            "success": true,
            "host": {
              "id": 2,
              "full_name": "Nila Akter",
              "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
              "host_type": "video",
              "is_video_host": true,
              "is_audio_host": false,
              "level": 15,
              "coins": 5395,
              "diamonds": 18500
            },
            "has_agency": true,
            "agency": {
              "id": 1,
              "agency_code": "STAR-01",
              "name": "Star Media Agency",
              "commission_rate": 10
            },
            "today": {
              "total_duration_seconds": 7200,
              "formatted_total_duration": "02h 00m 00s",
              "video_duration_seconds": 7200,
              "formatted_video_duration": "02h 00m 00s",
              "audio_duration_seconds": 0,
              "formatted_audio_duration": "00h 00m 00s",
              "coins_earned": 5000,
              "diamonds_earned": 2500,
              "agency_commission": 500,
              "sessions_count": 1
            },
            "this_month": {
              "total_duration_seconds": 45200,
              "formatted_total_duration": "12h 33m 20s",
              "video_duration_seconds": 38000,
              "formatted_video_duration": "10h 33m 20s",
              "audio_duration_seconds": 7200,
              "formatted_audio_duration": "02h 00m 00s",
              "coins_earned": 25000,
              "diamonds_earned": 12500,
              "agency_commission": 2500,
              "active_days": 3
            }
          }
        }
      ]
    },
    {
      "id": "agency-list-all",
      "category": "agency-management",
      "method": "GET",
      "path": "/api/mobile/agency/list",
      "summary": "List All Agencies Directory",
      "description": "Lists all registered agencies with detailed performance summaries: total hosts count, active live streaming hosts, broadcast-banned host count, pending recruitment requests, owner coins, and total commission generated. Accessible to normal users wishing to apply to join as host, affiliated hosts, agency owners, and administrators. Cached in Redis ('agency:list:all', 30s TTL).",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": false,
          "description": "Optional Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "search",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Search agencies by name, agency code, or owner name"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Agencies list retrieved successfully.",
          "example": {
            "success": true,
            "message": "Agencies list retrieved successfully.",
            "count": 1,
            "data": [
              {
                "id": 1,
                "agency_code": "AG-101",
                "name": "Starlight Talent Agency",
                "commission_rate": 20,
                "status": "active",
                "owner": {
                  "id": 1,
                  "full_name": "System Admin",
                  "email": "admin@umi.live",
                  "coins": 99790
                },
                "metrics": {
                  "total_hosts": 1,
                  "active_streaming_hosts": 0,
                  "banned_hosts_count": 0,
                  "pending_requests_count": 0,
                  "total_coins_gifted_to_hosts": 15000,
                  "total_commission_coins": 3000
                }
              }
            ]
          }
        }
      ]
    },
    {
      "id": "agency-overview",
      "category": "agency-management",
      "method": "GET",
      "path": "/api/mobile/agency/overview",
      "summary": "Get Agency Overview & Commission Metrics",
      "description": "Returns agency profile, owner coin balance, total host count, active streaming hosts, broadcast-banned host count, and total commission coins earned across all hosts. Cached in Redis ('agency:overview:{agencyId}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token (Agency Manager or Admin)"
        }
      ],
      "parameters": [
        {
          "name": "agencyId",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Optional Agency ID for Admin inspection"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Agency overview retrieved successfully.",
          "example": {
            "success": true,
            "message": "Agency overview retrieved successfully.",
            "data": {
              "agency": {
                "id": 1,
                "agency_code": "AG-101",
                "name": "Starlight Talent Agency",
                "commission_rate": 20,
                "status": "active",
                "contact_phone": "+8801700112233"
              },
              "owner": {
                "id": 1,
                "full_name": "Agency Director",
                "email": "agency@umi.live",
                "coins": 99790,
                "diamonds": 0
              },
              "metrics": {
                "total_hosts": 5,
                "active_streaming_hosts": 1,
                "banned_hosts_count": 0,
                "total_commission_coins": 15400,
                "total_coins_gifted_to_hosts": 77000,
                "pending_requests_count": 2
              }
            }
          }
        }
      ]
    },
    {
      "id": "agency-hosts-list",
      "category": "agency-management",
      "method": "GET",
      "path": "/api/mobile/agency/hosts",
      "summary": "Get Affiliated Hosts List with Performance",
      "description": "Returns all hosts under this agency with live streaming status, video/audio host type, broadcast ban status & remaining time, total stream duration, and commission generated. Cached in Redis ('agency:hosts:{agencyId}', 60s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token (Agency Manager or Admin)"
        }
      ],
      "parameters": [
        {
          "name": "agencyId",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Optional Agency ID for Admin inspection"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Agency hosts list retrieved successfully.",
          "example": {
            "success": true,
            "message": "Agency hosts list retrieved successfully.",
            "count": 1,
            "data": [
              {
                "id": 2,
                "full_name": "Nila Akter",
                "email": "nila@umi.live",
                "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                "role": "host",
                "host_type": "video",
                "coins": 5495,
                "diamonds": 18500,
                "level": 15,
                "agency_joined_at": "2026-10-12 06:55:56",
                "is_currently_live": false,
                "active_room_id": null,
                "is_broadcast_banned": false,
                "broadcast_ban": null,
                "total_stream_seconds": 7200,
                "total_stream_formatted": "02h 00m 00s",
                "total_coins_earned": 5000,
                "agency_commission_coins": 1000,
                "host_net_coins": 4000
              }
            ]
          }
        }
      ]
    },
    {
      "id": "agency-host-remove",
      "category": "agency-management",
      "method": "POST",
      "path": "/api/mobile/agency/hosts/{hostId}/remove",
      "summary": "Remove Host from Agency",
      "description": "Releases an affiliated host from the agency. Automatically ends any ongoing live stream, resets host affiliation in MySQL, and invalidates Redis caches immediately.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token (Agency Manager or Admin)"
        }
      ],
      "parameters": [
        {
          "name": "hostId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Host User ID to remove from agency"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Host removed successfully.",
          "example": {
            "success": true,
            "message": "Host 'Nila Akter' has been removed from agency 'Starlight Talent Agency'.",
            "data": {
              "host_id": 2,
              "host_name": "Nila Akter",
              "agency_id": 1
            }
          }
        }
      ]
    },
    {
      "id": "agency-host-ban-broadcast",
      "category": "agency-management",
      "method": "POST",
      "path": "/api/mobile/agency/hosts/{hostId}/ban-broadcast",
      "summary": "Temporarily Suspend Host Broadcast Permissions",
      "description": "Suspends a host from opening live rooms for a designated duration (durationHours, durationMinutes, durationDays, or bannedUntil ISO datetime). If host is currently live, immediately terminates the room.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token (Agency Manager or Admin)"
        }
      ],
      "parameters": [
        {
          "name": "hostId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Host User ID to suspend"
        }
      ],
      "requestBody": {
        "type": "application/json",
        "required": true,
        "schema": {
          "durationHours": {
            "type": "integer",
            "required": false,
            "description": "Ban duration in hours (e.g. 24)"
          },
          "durationMinutes": {
            "type": "integer",
            "required": false,
            "description": "Ban duration in minutes (e.g. 60)"
          },
          "durationDays": {
            "type": "integer",
            "required": false,
            "description": "Ban duration in days (e.g. 7)"
          },
          "bannedUntil": {
            "type": "string",
            "required": false,
            "description": "Explicit ISO 8601 future expiration datetime"
          },
          "reason": {
            "type": "string",
            "required": false,
            "description": "Reason for suspension (default: Agency broadcast policy violation)"
          }
        },
        "example": {
          "durationHours": 24,
          "reason": "Broadcast policy violation: inappropriate behavior during stream"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "Host broadcast suspended successfully.",
          "example": {
            "success": true,
            "message": "Host 'Nila Akter' has been broadcast suspended until 2026-10-13 13:00:00.",
            "data": {
              "host_id": 2,
              "host_name": "Nila Akter",
              "broadcast_banned_at": "2026-10-12T13:00:00.000Z",
              "broadcast_banned_until": "2026-10-13T13:00:00.000Z",
              "duration_seconds": 86400,
              "duration_formatted": "24h 00m 00s",
              "reason": "Broadcast policy violation: inappropriate behavior during stream",
              "stream_terminated": false
            }
          }
        }
      ]
    },
    {
      "id": "agency-host-unban-broadcast",
      "category": "agency-management",
      "method": "POST",
      "path": "/api/mobile/agency/hosts/{hostId}/unban-broadcast",
      "summary": "Lift Host Broadcast Suspension",
      "description": "Prematurely lifts the broadcast ban for a host under the agency, re-enabling them to host live streams immediately.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token (Agency Manager or Admin)"
        }
      ],
      "parameters": [
        {
          "name": "hostId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Host User ID to unban"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Broadcast suspension lifted successfully.",
          "example": {
            "success": true,
            "message": "Broadcast ban for host 'Nila Akter' has been successfully lifted.",
            "data": {
              "host_id": 2,
              "host_name": "Nila Akter",
              "broadcast_banned_until": null
            }
          }
        }
      ]
    },
    {
      "id": "agency-banned-hosts-list",
      "category": "agency-management",
      "method": "GET",
      "path": "/api/mobile/agency/banned-hosts",
      "summary": "Get Suspended Hosts List with Ban Timestamps & Expiry",
      "description": "Lists all currently broadcast-suspended hosts under this agency with ban timestamp, expiration timestamp, reason, and remaining duration countdown. Cached in Redis ('agency:banned_hosts:{agencyId}', 30s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token (Agency Manager or Admin)"
        }
      ],
      "parameters": [
        {
          "name": "agencyId",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Optional Agency ID for Admin inspection"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Suspended hosts list retrieved successfully.",
          "example": {
            "success": true,
            "message": "Suspended hosts list retrieved successfully.",
            "count": 1,
            "data": [
              {
                "id": 2,
                "full_name": "Nila Akter",
                "email": "nila@umi.live",
                "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                "host_type": "video",
                "level": 15,
                "broadcast_banned_at": "2026-10-12 13:00:00",
                "broadcast_banned_until": "2026-10-13 13:00:00",
                "broadcast_ban_reason": "Broadcast policy violation: inappropriate behavior during stream",
                "remaining_seconds": 86400,
                "remaining_formatted": "24h 00m 00s"
              }
            ]
          }
        }
      ]
    },
    {
      "id": "agency-host-requests-list",
      "category": "agency-management",
      "method": "GET",
      "path": "/api/mobile/agency/requests",
      "summary": "Get Host Recruitment Applications",
      "description": "Lists incoming host recruitment/join applications. Supports ?status=pending|approved|rejected|all (default: pending). Cached in Redis ('agency:requests:{agencyId}:{status}', 30s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token (Agency Manager or Admin)"
        }
      ],
      "parameters": [
        {
          "name": "status",
          "type": "string",
          "in": "query",
          "required": false,
          "description": "Filter by status: pending, approved, rejected, or all (default: pending)"
        },
        {
          "name": "agencyId",
          "type": "integer",
          "in": "query",
          "required": false,
          "description": "Optional Agency ID for Admin inspection"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Host recruitment requests retrieved successfully.",
          "example": {
            "success": true,
            "message": "Agency host requests (pending) retrieved successfully.",
            "count": 1,
            "data": [
              {
                "id": 1,
                "agency_id": 1,
                "user_id": 5,
                "host_type": "video",
                "message": "Experienced gaming streamer looking to join Starlight Agency!",
                "status": "pending",
                "created_at": "2026-10-12 12:30:00",
                "applicant": {
                  "id": 5,
                  "full_name": "Sakib Hossain",
                  "email": "sakib@umi.live",
                  "coins": 100,
                  "diamonds": 0,
                  "level": 3,
                  "already_in_agency": false
                }
              }
            ]
          }
        }
      ]
    },
    {
      "id": "agency-request-approve",
      "category": "agency-management",
      "method": "POST",
      "path": "/api/mobile/agency/requests/{requestId}/approve",
      "summary": "Approve Host Recruitment Application",
      "description": "Approves a pending recruitment request, assigning the applicant to the agency with role 'host'. Updates MySQL and instantly invalidates agency caches.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token (Agency Manager or Admin)"
        }
      ],
      "parameters": [
        {
          "name": "requestId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Application Request ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Application approved successfully.",
          "example": {
            "success": true,
            "message": "Applicant 'Sakib Hossain' is now approved as a video host under 'Starlight Talent Agency'.",
            "data": {
              "request_id": 1,
              "user_id": 5,
              "agency_id": 1,
              "status": "approved",
              "host_type": "video"
            }
          }
        }
      ]
    },
    {
      "id": "agency-request-reject",
      "category": "agency-management",
      "method": "POST",
      "path": "/api/mobile/agency/requests/{requestId}/reject",
      "summary": "Reject Host Recruitment Application",
      "description": "Rejects a pending recruitment request. Updates status to rejected and invalidates agency request cache.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token (Agency Manager or Admin)"
        }
      ],
      "parameters": [
        {
          "name": "requestId",
          "type": "integer",
          "in": "path",
          "required": true,
          "description": "Application Request ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Application rejected successfully.",
          "example": {
            "success": true,
            "message": "Host request #1 for 'Sakib Hossain' has been rejected.",
            "data": {
              "request_id": 1,
              "user_id": 5,
              "agency_id": 1,
              "status": "rejected"
            }
          }
        }
      ]
    },
    {
      "id": "agency-apply",
      "category": "agency-management",
      "method": "POST",
      "path": "/api/mobile/agency/apply",
      "summary": "Apply to Join an Agency (Host / User)",
      "description": "Allows any authenticated user or independent host to submit a recruitment application to an agency using agencyId or agencyCode.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token (User or Independent Host)"
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "application/json",
        "required": true,
        "schema": {
          "agencyId": {
            "type": "integer",
            "required": false,
            "description": "Target Agency ID (or use agencyCode)"
          },
          "agencyCode": {
            "type": "string",
            "required": false,
            "description": "Target Agency Code (e.g. AG-101)"
          },
          "hostType": {
            "type": "string",
            "required": false,
            "description": "Desired host role: 'video' or 'audio' (default: video)"
          },
          "message": {
            "type": "string",
            "required": false,
            "description": "Introductory message to the agency manager"
          }
        },
        "example": {
          "agencyCode": "AG-101",
          "hostType": "video",
          "message": "Hello! I am an active streamer looking to join Starlight Agency."
        }
      },
      "responses": [
        {
          "status": 201,
          "description": "Application submitted successfully.",
          "example": {
            "success": true,
            "message": "Your host join application has been submitted to 'Starlight Talent Agency'.",
            "data": {
              "request_id": 2,
              "agency_id": 1,
              "agency_name": "Starlight Talent Agency",
              "host_type": "video",
              "status": "pending"
            }
          }
        }
      ]
    },
    {
      "id": "agency-my-application",
      "category": "agency-management",
      "method": "GET",
      "path": "/api/mobile/agency/my-application",
      "summary": "Get My Agency Affiliation & Application Status",
      "description": "Returns the authenticated user's current agency membership and the status of any active or latest join application. Cached in Redis ('user:agency_application:{userId}', 30s TTL).",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Application status retrieved successfully.",
          "example": {
            "success": true,
            "data": {
              "user": {
                "id": 5,
                "full_name": "Tanvir Ahmed",
                "role": "user",
                "is_host": false
              },
              "affiliation": {
                "is_affiliated": false,
                "agency": null
              },
              "has_pending_application": true,
              "pending_application": {
                "request_id": 3,
                "agency_id": 1,
                "agency_name": "Starlight Talent Agency",
                "agency_code": "AG-101",
                "host_type": "video",
                "message": "Hello, applying for host",
                "status": "pending",
                "applied_at": "2026-10-12 13:20:00"
              }
            }
          }
        }
      ]
    },
    {
      "id": "agency-cancel-application",
      "category": "agency-management",
      "method": "POST",
      "path": "/api/mobile/agency/my-application/cancel",
      "summary": "Cancel Pending Agency Join Application",
      "description": "Allows an applicant user to cancel their pending host application. Releases them to apply to another agency. Updates MySQL SSOT and invalidates Redis caches.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "type": "string",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Application cancelled successfully.",
          "example": {
            "success": true,
            "message": "Your host join application to 'Starlight Talent Agency' has been cancelled successfully. You are now free to submit a new application.",
            "data": {
              "request_id": 3,
              "agency_id": 1,
              "agency_name": "Starlight Talent Agency",
              "status": "cancelled"
            }
          }
        }
      ]
    },
    {
      "id": "entry-effects-catalog",
      "category": "entry-effects",
      "method": "GET",
      "path": "/api/mobile/entry-effects",
      "summary": "Entry Effects Store Catalog",
      "description": "Returns interactive store catalog of all active entry effects (SVGA, GIF, sound) with coin price and validity duration. When authenticated with Bearer JWT (or query param ?user_id=), automatically enriches each effect with ownership status (is_purchased, is_equipped, expires_at, days_remaining, seconds_remaining) and returns the equipped_effect.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": false,
          "description": "Optional Bearer JWT token. When provided, marks which effects the user has purchased and equipped."
        }
      ],
      "parameters": [
        {
          "name": "user_id",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Optional User ID to identify purchased entry effects when Authorization header is omitted."
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Store entry effects catalog retrieved successfully with user purchase status.",
          "example": {
            "success": true,
            "total_count": 3,
            "equipped_effect": {
              "id": 1,
              "name": "Golden Dragon Arrival",
              "effect_type": "svga",
              "preview_image_url": "/uploads/gifts/sports_car_thumb_1791794086432-13704975.png",
              "svga_url": "/uploads/gifts/sports_car_anim_1791794086435-998043722.svga",
              "gif_url": "/uploads/gifts/fire_dragon_anim_1791794086443-492844523.gif",
              "sound_url": "/uploads/gifts/dragon_roar_1791794086446-125382975.mp3",
              "price": 1000,
              "validity_days": 30,
              "is_active": true,
              "is_purchased": true,
              "is_equipped": true,
              "subscription_id": 1,
              "expires_at": "2026-11-14T06:08:18.000Z",
              "days_remaining": 30,
              "seconds_remaining": 2592000
            },
            "active_effect": {
              "id": 1,
              "name": "Golden Dragon Arrival",
              "effect_type": "svga",
              "preview_image_url": "/uploads/gifts/sports_car_thumb_1791794086432-13704975.png",
              "svga_url": "/uploads/gifts/sports_car_anim_1791794086435-998043722.svga",
              "gif_url": "/uploads/gifts/fire_dragon_anim_1791794086443-492844523.gif",
              "sound_url": "/uploads/gifts/dragon_roar_1791794086446-125382975.mp3",
              "price": 1000,
              "validity_days": 30,
              "is_active": true,
              "is_purchased": true,
              "is_equipped": true,
              "subscription_id": 1,
              "expires_at": "2026-11-14T06:08:18.000Z",
              "days_remaining": 30,
              "seconds_remaining": 2592000
            },
            "effects": [
              {
                "id": 1,
                "name": "Golden Dragon Arrival",
                "effect_type": "svga",
                "preview_image_url": "/uploads/gifts/sports_car_thumb_1791794086432-13704975.png",
                "svga_url": "/uploads/gifts/sports_car_anim_1791794086435-998043722.svga",
                "gif_url": "/uploads/gifts/fire_dragon_anim_1791794086443-492844523.gif",
                "sound_url": "/uploads/gifts/dragon_roar_1791794086446-125382975.mp3",
                "price": 1000,
                "validity_days": 30,
                "is_active": true,
                "is_purchased": true,
                "is_equipped": true,
                "subscription_id": 1,
                "expires_at": "2026-11-14T06:08:18.000Z",
                "days_remaining": 30,
                "seconds_remaining": 2592000
              },
              {
                "id": 2,
                "name": "Cyber Supercar Entrance",
                "effect_type": "svga",
                "preview_image_url": "/uploads/gifts/sports_car_thumb_1791794056867-245337673.png",
                "svga_url": "/uploads/gifts/sports_car_anim_1791794056871-502798849.svga",
                "gif_url": "/uploads/gifts/fire_dragon_anim_1791794086443-492844523.gif",
                "sound_url": null,
                "price": 2500,
                "validity_days": 30,
                "is_active": true,
                "is_purchased": false,
                "is_equipped": false,
                "subscription_id": null,
                "expires_at": null,
                "days_remaining": null,
                "seconds_remaining": null
              },
              {
                "id": 3,
                "name": "Pegasus Wings Glory",
                "effect_type": "gif",
                "preview_image_url": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
                "svga_url": null,
                "gif_url": "/uploads/gifts/fire_dragon_anim_1791794086443-492844523.gif",
                "sound_url": null,
                "price": 5000,
                "validity_days": 60,
                "is_active": true,
                "is_purchased": false,
                "is_equipped": false,
                "subscription_id": null,
                "expires_at": null,
                "days_remaining": null,
                "seconds_remaining": null
              }
            ]
          }
        }
      ]
    },
    {
      "id": "entry-effects-my-effects",
      "category": "entry-effects",
      "method": "GET",
      "path": "/api/mobile/entry-effects/my-effects",
      "summary": "My Owned Entry Effects Inventory",
      "description": "Returns all entry effects owned by the requesting user, showing active status (is_active / is_equipped), start date, exact expiration timestamp, days remaining, and SVGA / GIF assets.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "User owned entry effects retrieved successfully.",
          "example": {
            "success": true,
            "effects": [
              {
                "subscription_id": 1,
                "effect_id": 1,
                "name": "Golden Dragon Arrival",
                "effect_type": "svga",
                "preview_image_url": "/uploads/gifts/sports_car_thumb_1791794086432-13704975.png",
                "svga_url": "/uploads/gifts/sports_car_anim_1791794086435-998043722.svga",
                "gif_url": "/uploads/gifts/fire_dragon_anim_1791794086443-492844523.gif",
                "sound_url": "/uploads/gifts/dragon_roar_1791794086446-125382975.mp3",
                "validity_days": 30,
                "start_date": "2026-10-15T06:08:18.000Z",
                "expires_at": "2026-11-14T06:08:18.000Z",
                "days_remaining": 30,
                "seconds_remaining": 2592000,
                "is_expired": false,
                "is_active": true,
                "is_equipped": true
              }
            ]
          }
        },
        {
          "status": 401,
          "description": "Unauthorized. Bearer token missing or invalid.",
          "example": {
            "success": false,
            "message": "Authentication required. No token provided."
          }
        }
      ]
    },
    {
      "id": "entry-effects-purchase",
      "category": "entry-effects",
      "method": "POST",
      "path": "/api/mobile/entry-effects/:id/purchase",
      "summary": "Purchase Entry Effect with Coins",
      "description": "Deducts coins from user balance and activates / extends an entry effect subscription. If already owned, extends expiry duration. Sets is_equipped = 1 and invalidates Redis cache.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "Bearer JWT token"
        },
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Entry effect ID to purchase"
        }
      ],
      "requestBody": {
        "type": "application/json",
        "fields": [
          {
            "name": "effectId",
            "type": "integer",
            "required": false,
            "description": "Optional effect ID if not provided in URL path"
          }
        ],
        "example": {}
      },
      "responses": [
        {
          "status": 200,
          "description": "Entry effect purchased successfully.",
          "example": {
            "success": true,
            "message": "Congratulations! You unlocked the \"Golden Dragon Arrival\" entry effect!",
            "effect_id": 1,
            "effect_name": "Golden Dragon Arrival",
            "subscription_id": 1,
            "expires_at": "2026-11-14T06:08:18.000Z",
            "is_equipped": true,
            "price_paid": 1000,
            "remaining_coins": 22100
          }
        },
        {
          "status": 400,
          "description": "Insufficient coin balance.",
          "example": {
            "success": false,
            "message": "Insufficient coin balance. You need 1000 coins, but only have 450 coins.",
            "required_coins": 1000,
            "current_coins": 450
          }
        }
      ]
    },
    {
      "id": "entry-effects-toggle",
      "category": "entry-effects",
      "method": "POST",
      "path": "/api/mobile/entry-effects/:id/toggle",
      "summary": "Switch / Equip Active Entry Effect",
      "description": "Equips or unequips an owned entry effect. When equipping, deactivates other entry effects and sets this one as active. Also accessible via /api/mobile/entry-effects/:id/equip.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Entry effect ID or Subscription ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Entry effect equipped / switched successfully.",
          "example": {
            "success": true,
            "message": "Entry effect \"Golden Dragon Arrival\" activated successfully! It will now play when you enter live rooms.",
            "is_active": true,
            "is_equipped": true,
            "subscription_id": 1,
            "effect_id": 1,
            "name": "Golden Dragon Arrival",
            "effect_type": "svga",
            "preview_image_url": "/uploads/gifts/sports_car_thumb_1791794086432-13704975.png"
          }
        },
        {
          "status": 404,
          "description": "Effect not owned by user.",
          "example": {
            "success": false,
            "message": "You do not own this entry effect. Please purchase or unlock it first."
          }
        }
      ]
    },
    {
      "id": "thumbnails-catalog",
      "category": "thumbnails",
      "method": "GET",
      "path": "/api/mobile/thumbnails",
      "summary": "Special Avatar Frames Store Catalog",
      "description": "Returns interactive store catalog of all active avatar thumbnail frames with coin price and validity duration. When authenticated with Bearer JWT (or query param ?user_id=), automatically enriches each frame with ownership status (is_purchased, is_equipped, expires_at, days_remaining, seconds_remaining) and returns the equipped_thumbnail.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": false,
          "description": "Optional Bearer JWT token to identify user purchased frames."
        }
      ],
      "parameters": [
        {
          "name": "user_id",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Optional User ID to identify purchased thumbnail frames when Authorization header is omitted."
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Store thumbnail frames catalog retrieved successfully with user purchase status.",
          "example": {
            "success": true,
            "total_count": 3,
            "equipped_thumbnail": {
              "id": 1,
              "name": "Kawaii Princess Avatar Frame",
              "image_url": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
              "price": 500,
              "validity_days": 30,
              "is_active": true,
              "is_purchased": true,
              "is_equipped": true,
              "subscription_id": 1,
              "expires_at": "2026-11-14T06:08:18.000Z",
              "days_remaining": 30,
              "seconds_remaining": 2592000
            },
            "active_thumbnail": {
              "id": 1,
              "name": "Kawaii Princess Avatar Frame",
              "image_url": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
              "price": 500,
              "validity_days": 30,
              "is_active": true,
              "is_purchased": true,
              "is_equipped": true,
              "subscription_id": 1,
              "expires_at": "2026-11-14T06:08:18.000Z",
              "days_remaining": 30,
              "seconds_remaining": 2592000
            },
            "thumbnails": [
              {
                "id": 1,
                "name": "Kawaii Princess Avatar Frame",
                "image_url": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
                "price": 500,
                "validity_days": 30,
                "is_active": true,
                "is_purchased": true,
                "is_equipped": true,
                "subscription_id": 1,
                "expires_at": "2026-11-14T06:08:18.000Z",
                "days_remaining": 30,
                "seconds_remaining": 2592000
              },
              {
                "id": 2,
                "name": "Golden Dragon Avatar Frame",
                "image_url": "/uploads/gifts/sports_car_thumb_1791794086432-13704975.png",
                "price": 1500,
                "validity_days": 30,
                "is_active": true,
                "is_purchased": false,
                "is_equipped": false,
                "subscription_id": null,
                "expires_at": null,
                "days_remaining": null,
                "seconds_remaining": null
              },
              {
                "id": 3,
                "name": "Cyber Neon Glow Frame",
                "image_url": "/uploads/thumbnails/test_thumb_1791720885105-621496700.png",
                "price": 3000,
                "validity_days": 60,
                "is_active": true,
                "is_purchased": false,
                "is_equipped": false,
                "subscription_id": null,
                "expires_at": null,
                "days_remaining": null,
                "seconds_remaining": null
              }
            ]
          }
        }
      ]
    },
    {
      "id": "thumbnails-my-thumbnails",
      "category": "thumbnails",
      "method": "GET",
      "path": "/api/mobile/thumbnails/my-thumbnails",
      "summary": "My Owned Avatar Frames Inventory",
      "description": "Returns all special avatar frame thumbnails owned by the requesting user, showing active status (is_active / is_equipped), start date, exact expiration timestamp, days remaining, and frame image asset URL.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "User owned avatar frames retrieved successfully.",
          "example": {
            "success": true,
            "thumbnails": [
              {
                "subscription_id": 1,
                "thumbnail_id": 1,
                "name": "Kawaii Princess Avatar Frame",
                "image_url": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
                "validity_days": 30,
                "start_date": "2026-10-15T06:08:18.000Z",
                "expires_at": "2026-11-14T06:08:18.000Z",
                "days_remaining": 30,
                "seconds_remaining": 2592000,
                "is_expired": false,
                "is_active": true,
                "is_equipped": true
              }
            ]
          }
        },
        {
          "status": 401,
          "description": "Unauthorized. Bearer token missing or invalid.",
          "example": {
            "success": false,
            "message": "Authentication required. No token provided."
          }
        }
      ]
    },
    {
      "id": "thumbnails-purchase",
      "category": "thumbnails",
      "method": "POST",
      "path": "/api/mobile/thumbnails/:id/purchase",
      "summary": "Purchase Avatar Frame with Coins",
      "description": "Deducts coins from user balance and activates / extends an avatar thumbnail frame subscription. If already owned, extends expiry duration. Sets is_equipped = 1 and invalidates Redis cache.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "Bearer JWT token"
        },
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Thumbnail ID to purchase"
        }
      ],
      "requestBody": {
        "type": "application/json",
        "fields": [
          {
            "name": "thumbnailId",
            "type": "integer",
            "required": false,
            "description": "Optional thumbnail ID if not provided in URL path"
          }
        ],
        "example": {}
      },
      "responses": [
        {
          "status": 200,
          "description": "Thumbnail frame purchased successfully.",
          "example": {
            "success": true,
            "message": "Congratulations! You unlocked the \"Kawaii Princess Avatar Frame\" thumbnail frame!",
            "thumbnail_id": 1,
            "thumbnail_name": "Kawaii Princess Avatar Frame",
            "image_url": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png",
            "subscription_id": 1,
            "expires_at": "2026-11-14T06:08:18.000Z",
            "is_equipped": true,
            "price_paid": 500,
            "remaining_coins": 21600
          }
        },
        {
          "status": 400,
          "description": "Insufficient coin balance.",
          "example": {
            "success": false,
            "message": "Insufficient coin balance. You need 500 coins, but only have 120 coins.",
            "required_coins": 500,
            "current_coins": 120
          }
        }
      ]
    },
    {
      "id": "thumbnails-toggle",
      "category": "thumbnails",
      "method": "POST",
      "path": "/api/mobile/thumbnails/:id/toggle",
      "summary": "Switch / Equip Active Avatar Frame",
      "description": "Equips or unequips an owned avatar thumbnail frame. When equipping, deactivates other frames and sets this one as active across profile and live room seats. Also accessible via /api/mobile/thumbnails/:id/equip.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "Bearer JWT token"
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Thumbnail ID or Subscription ID"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Thumbnail frame equipped / switched successfully.",
          "example": {
            "success": true,
            "message": "Thumbnail \"Kawaii Princess Avatar Frame\" activated successfully!",
            "is_active": true,
            "is_equipped": true,
            "subscription_id": 1,
            "thumbnail_id": 1,
            "name": "Kawaii Princess Avatar Frame",
            "image_url": "/uploads/packages/Kawaii_Weekly_Sign-In_Princess_Frame_1792037801034-450048310.png"
          }
        },
        {
          "status": 404,
          "description": "Thumbnail not owned by user.",
          "example": {
            "success": false,
            "message": "You do not own this thumbnail. Please purchase or unlock it first."
          }
        }
      ]
    },
    {
      "id": "thumbnails-upload-config",
      "category": "thumbnails",
      "method": "GET",
      "path": "/api/mobile/thumbnails/upload-config",
      "summary": "Custom Thumbnail Upload Plans & Configuration",
      "description": "Returns admin-configured dynamic duration pricing tiers (`custom_thumbnail_pricing_tiers`) showing how many days cost how many coins (e.g. 7 days = 200 coins, 15 days = 350 coins, 30 days = 500 coins, 90 days = 1200 coins). When authenticated, includes user's current coin balance and `can_afford` status.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": false,
          "description": "Optional Bearer JWT token to check user's coin balance"
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Upload configuration and duration plans retrieved successfully.",
          "example": {
            "success": true,
            "pricing_tiers": [
              { "days": 7, "coins": 200 },
              { "days": 15, "coins": 350 },
              { "days": 30, "coins": 500 },
              { "days": 90, "coins": 1200 }
            ],
            "default_tier": { "days": 30, "coins": 500 },
            "upload_coin_cost": 500,
            "validity_days": 30,
            "user_coins": 25000,
            "can_afford": true
          }
        }
      ]
    },
    {
      "id": "thumbnails-custom-upload",
      "category": "thumbnails",
      "method": "POST",
      "path": "/api/mobile/thumbnails/upload",
      "summary": "Upload Custom Room Thumbnail with Selected Duration Plan",
      "description": "Allows a user to upload a custom room background thumbnail image with automatic coin deduction based on their selected duration plan (`days: 7`, `15`, `30`, `90`, etc.). When uploaded, this thumbnail is:\n1. Dedicated exclusively to the user (marked with `is_custom = 1`) and added directly to the user's **Purchased / Owned Thumbnails** (`user_thumbnails`).\n2. Equipped as active (`is_equipped = 1`) so that live rooms created by this user automatically use it as default background.\n3. If the user currently hosts an active live room, that live room's background is updated immediately and real-time Socket.IO events are emitted.\n4. **Private Store Isolation**: Filtered out completely from the public store catalog so no other user can see or purchase it.\n\n**Route Aliases**:\n- `POST /api/mobile/thumbnails/upload`\n- `POST /api/mobile/thumbnails/custom-upload`",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "Bearer JWT token"
        },
        {
          "name": "Content-Type",
          "value": "multipart/form-data or application/json",
          "required": false
        }
      ],
      "parameters": [],
      "requestBody": {
        "type": "object",
        "description": "Upload an image file or provide a direct image_url along with selected duration days",
        "properties": {
          "image": {
            "type": "file",
            "description": "Binary image file (multipart/form-data with field 'image' or 'thumbnail')"
          },
          "image_url": {
            "type": "string",
            "example": "https://res.cloudinary.com/example/image/upload/v1/my_custom_thumb.jpg",
            "description": "Direct image URL (if not uploading binary file)"
          },
          "days": {
            "type": "integer",
            "example": 30,
            "description": "Selected duration plan in days (e.g. 7, 15, 30, 90). If omitted, defaults to 30 days plan."
          },
          "name": {
            "type": "string",
            "example": "My Cyberpunk Neon Room",
            "description": "Custom display name for the thumbnail"
          }
        }
      },
      "responses": [
        {
          "status": 201,
          "description": "Custom thumbnail uploaded, fee deducted, and frame activated successfully.",
          "example": {
            "success": true,
            "message": "Custom thumbnail \"My Cyberpunk Neon Room\" uploaded and activated successfully!",
            "thumbnail": {
              "subscription_id": 15,
              "thumbnail_id": 42,
              "id": 42,
              "name": "My Cyberpunk Neon Room",
              "image_url": "/uploads/rooms/thumb_1729124019_custom.jpg",
              "price": 500,
              "validity_days": 30,
              "is_equipped": true,
              "is_active": true,
              "is_custom": true,
              "uploader_id": 2,
              "expires_at": "2026-11-16T03:50:00.000Z"
            },
            "coin_cost": 500,
            "remaining_coins": 24500,
            "active_room_updated": "room-nila-101"
          }
        },
        {
          "status": 400,
          "description": "Insufficient coin balance or missing image.",
          "example": {
            "success": false,
            "message": "Insufficient coin balance. Custom thumbnail upload requires 500 coins, but you currently have 200 coins.",
            "required_coins": 500,
            "current_coins": 200
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X POST https://yourdomain.com/api/mobile/thumbnails/upload \\\n  -H \"Authorization: Bearer <TOKEN>\" \\\n  -F \"image=@/path/to/my_room_thumbnail.jpg\" \\\n  -F \"name=My Custom Live Room\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<void> uploadCustomThumbnail(String token, String filePath, String name) async {\n  var request = http.MultipartRequest('POST', Uri.parse('https://yourdomain.com/api/mobile/thumbnails/upload'));\n  request.headers['Authorization'] = 'Bearer $token';\n  request.fields['name'] = name;\n  request.files.add(await http.MultipartFile.fromPath('image', filePath));\n  var res = await request.send();\n  var responseData = await res.stream.bytesToString();\n  print(jsonDecode(responseData));\n}"
      }
    },
    {
      "id": "user-get-profile",
      "category": "user-profile",
      "method": "GET",
      "path": "/api/mobile/users/:userId/profile",
      "summary": "Get Other User Profile Details (Full Social, Coins & Package Info)",
      "description": "Inspects full profile data of any user. Returns identity, full name, avatar profile image, country, role, level, VIP package category name & badge image, bio, mutual follow indicators (is_following & is_followed_by), followers count, following count, total posts count, current coin balance, total received gift coins, total gifted coins, block status, and shareable deep-link URL.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <TOKEN> (Optional - enables is_following, is_followed_by, is_blocked checks)",
          "required": false
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Target User ID to inspect"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "User profile retrieved successfully.",
          "example": {
            "success": true,
            "user": {
              "id": 12,
              "name": "Nila Akter",
              "full_name": "Nila Akter",
              "profile_image": "https://res.cloudinary.com/example/image/upload/v1/avatars/user12.jpg",
              "avatar_url": "https://res.cloudinary.com/example/image/upload/v1/avatars/user12.jpg",
              "country": "Bangladesh",
              "role": "host",
              "level": 14,
              "star": 3,
              "bio": "Live daily from 8 PM! Welcome to my profile ✨",
              "is_following": true,
              "is_followed_by": false,
              "is_follower": false,
              "followers_count": 1420,
              "following_count": 85,
              "posts_count": 34,
              "current_balance": 1250,
              "coins": 1250,
              "diamonds": 4500,
              "total_received_coins": 85000,
              "total_gifted_coins": 12000,
              "total_sent_coins": 12000,
              "is_blocked": false,
              "is_blocking_me": false,
              "is_mine": false,
              "share_link": "https://umilive.app/user/12",
              "profile_url": "https://umilive.app/user/12",
              "package_category_name": "VIP Diamond",
              "package_image": "https://res.cloudinary.com/example/image/upload/v1/badges/diamond.png",
              "package_image_url": "https://res.cloudinary.com/example/image/upload/v1/badges/diamond.png",
              "package_color": "#06b6d4",
              "created_at": "2026-01-15T10:00:00.000Z"
            }
          }
        },
        {
          "status": 404,
          "description": "User not found or suspended.",
          "example": {
            "success": false,
            "message": "User not found or account is deactivated."
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X GET https://yourdomain.com/api/mobile/users/12/profile \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<Map<String, dynamic>?> fetchUserProfile(int userId, String? token) async {\n  final res = await http.get(\n    Uri.parse('https://yourdomain.com/api/mobile/users/$userId/profile'),\n    headers: token != null ? {'Authorization': 'Bearer $token'} : {},\n  );\n  if (res.statusCode == 200) {\n    final data = jsonDecode(res.body);\n    return data['user'];\n  }\n  return null;\n}"
      }
    },
    {
      "id": "user-get-posts",
      "category": "user-profile",
      "method": "GET",
      "path": "/api/mobile/users/:userId/posts",
      "summary": "Get User Posts (Paginated Stream with Media & Reactions)",
      "description": "Retrieves paginated timeline posts created by this user. Returns post ID, text content, media attachments (images, video, audio), likes count, comments count, and viewer's real-time reaction state (is_liked, is_mine).",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <TOKEN> (Optional - indicates whether viewer liked the post)",
          "required": false
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Target User ID"
        },
        {
          "name": "page",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Page number (default: 1)"
        },
        {
          "name": "limit",
          "in": "query",
          "type": "integer",
          "required": false,
          "description": "Items per page (default: 10, max: 50)"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "User posts retrieved successfully.",
          "example": {
            "success": true,
            "total": 34,
            "page": 1,
            "limit": 10,
            "total_pages": 4,
            "posts": [
              {
                "id": 101,
                "user_id": 12,
                "title": "Welcome to my weekend live stream!",
                "content": "Excited to meet you all tonight at 8 PM. Join and win surprise gifts!",
                "media_type": "image",
                "media_url": "https://res.cloudinary.com/example/image/upload/v1/posts/p1.jpg",
                "media": [
                  {
                    "media_type": "image",
                    "media_url": "https://res.cloudinary.com/example/image/upload/v1/posts/p1.jpg"
                  }
                ],
                "likes_count": 254,
                "comments_count": 42,
                "is_liked": true,
                "is_mine": false,
                "created_at": "2026-10-16T14:30:00.000Z"
              }
            ]
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X GET \"https://yourdomain.com/api/mobile/users/12/posts?page=1&limit=10\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<List<dynamic>> fetchUserPosts(int userId, {int page = 1, String? token}) async {\n  final res = await http.get(\n    Uri.parse('https://yourdomain.com/api/mobile/users/$userId/posts?page=$page&limit=10'),\n    headers: token != null ? {'Authorization': 'Bearer $token'} : {},\n  );\n  final data = jsonDecode(res.body);\n  return data['posts'] ?? [];\n}"
      }
    },
    {
      "id": "user-toggle-follow",
      "category": "user-profile",
      "method": "POST",
      "path": "/api/mobile/users/:userId/toggle-follow",
      "summary": "Toggle Follow / Unfollow User (Single Unified Endpoint)",
      "description": "Unified 1-click toggle endpoint for mobile apps (Aliases: POST /api/mobile/users/:userId/follow, POST /api/mobile/users/:userId/unfollow). If you do not follow the target user, it follows them (is_following: true). If you already follow them, it unfollows them (is_following: false). Employs MySQL SSOT writes first followed by immediate Redis invalidation.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <TOKEN>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Target User ID to toggle follow/unfollow"
        }
      ],
      "requestBody": {
        "action": "toggle (optional, default: 'toggle' | 'follow' | 'unfollow')"
      },
      "responses": [
        {
          "status": 200,
          "description": "Follow status toggled successfully.",
          "example": {
            "success": true,
            "message": "Successfully followed user.",
            "action": "followed",
            "is_following": true,
            "followers_count": 1421,
            "my_following_count": 86
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X POST https://yourdomain.com/api/mobile/users/12/toggle-follow \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\n// 🎯 Single Unified Toggle Follow / Unfollow Function\nFuture<Map<String, dynamic>> toggleFollowUser(int userId, String token) async {\n  final res = await http.post(\n    Uri.parse('https://yourdomain.com/api/mobile/users/$userId/toggle-follow'),\n    headers: {\n      'Authorization': 'Bearer $token',\n      'Content-Type': 'application/json',\n    },\n  );\n  final data = jsonDecode(res.body);\n  return {\n    'success': data['success'] == true,\n    'is_following': data['is_following'] ?? false,\n    'action': data['action'], // 'followed' or 'unfollowed'\n    'followers_count': data['followers_count'] ?? 0,\n  };\n}"
      }
    },
    {
      "id": "user-unfollow",
      "category": "user-profile",
      "method": "POST",
      "path": "/api/mobile/users/:userId/unfollow",
      "summary": "Unfollow User (Route alias: DELETE /api/mobile/users/:userId/follow)",
      "description": "Explicit unfollow route. Decrements followers count and flushes Redis caches.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <TOKEN>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "User ID to unfollow"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Successfully unfollowed user.",
          "example": {
            "success": true,
            "message": "Successfully unfollowed user.",
            "action": "unfollowed",
            "is_following": false,
            "followers_count": 1420,
            "my_following_count": 85
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X POST https://yourdomain.com/api/mobile/users/12/unfollow \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<bool> unfollowUser(int userId, String token) async {\n  final res = await http.post(\n    Uri.parse('https://yourdomain.com/api/mobile/users/$userId/unfollow'),\n    headers: {'Authorization': 'Bearer $token'},\n  );\n  final data = jsonDecode(res.body);\n  return data['success'] == true;\n}"
      }
    },
    {
      "id": "user-block",
      "category": "user-profile",
      "method": "POST",
      "path": "/api/mobile/users/:userId/block",
      "summary": "Block User (Mutual Unfollow & Privacy Guard)",
      "description": "Blocks a target user. Automatically deletes mutual follow relationships, hides direct chats, prevents notifications, and blocks profile interactions.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <TOKEN>",
          "required": true
        },
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": false
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "User ID to block"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "description": "Optional reason for blocking",
        "example": {
          "reason": "Harassment or inappropriate behavior"
        }
      },
      "responses": [
        {
          "status": 200,
          "description": "User blocked successfully.",
          "example": {
            "success": true,
            "message": "User blocked successfully.",
            "is_blocked": true
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X POST https://yourdomain.com/api/mobile/users/12/block \\\n  -H \"Authorization: Bearer <TOKEN>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"reason\": \"Harassment\"}'",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<bool> blockUser(int userId, String token, {String? reason}) async {\n  final res = await http.post(\n    Uri.parse('https://yourdomain.com/api/mobile/users/$userId/block'),\n    headers: {\n      'Authorization': 'Bearer $token',\n      'Content-Type': 'application/json',\n    },\n    body: jsonEncode({'reason': reason ?? 'Blocked by user'}),\n  );\n  final data = jsonDecode(res.body);\n  return data['is_blocked'] == true;\n}"
      }
    },
    {
      "id": "user-unblock",
      "category": "user-profile",
      "method": "DELETE",
      "path": "/api/mobile/users/:userId/block",
      "summary": "Unblock User (Route alias: POST /api/mobile/users/:userId/unblock)",
      "description": "Unblocks a previously blocked user and restores interaction capabilities.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <TOKEN>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "User ID to unblock"
        }
      ],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "User unblocked successfully.",
          "example": {
            "success": true,
            "message": "User unblocked successfully.",
            "is_blocked": false
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X DELETE https://yourdomain.com/api/mobile/users/12/block \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<bool> unblockUser(int userId, String token) async {\n  final res = await http.delete(\n    Uri.parse('https://yourdomain.com/api/mobile/users/$userId/block'),\n    headers: {'Authorization': 'Bearer $token'},\n  );\n  final data = jsonDecode(res.body);\n  return data['success'] == true;\n}"
      }
    },
    {
      "id": "user-get-blocked",
      "category": "user-profile",
      "method": "GET",
      "path": "/api/mobile/users/blocked",
      "summary": "Get My Blocked Users List",
      "description": "Returns list of all users currently blocked by the authenticated user with block date and reason.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <TOKEN>",
          "required": true
        }
      ],
      "parameters": [],
      "requestBody": null,
      "responses": [
        {
          "status": 200,
          "description": "Blocked users list retrieved successfully.",
          "example": {
            "success": true,
            "count": 1,
            "blocked_users": [
              {
                "id": 45,
                "full_name": "Spammer User",
                "avatar_url": "https://res.cloudinary.com/example/image/upload/v1/avatars/user45.jpg",
                "bio": "Spam account",
                "level": 1,
                "role": "user",
                "reason": "Harassment",
                "blocked_at": "2026-10-15T18:20:00.000Z"
              }
            ]
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X GET https://yourdomain.com/api/mobile/users/blocked \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<List<dynamic>> fetchBlockedUsers(String token) async {\n  final res = await http.get(\n    Uri.parse('https://yourdomain.com/api/mobile/users/blocked'),\n    headers: {'Authorization': 'Bearer $token'},\n  );\n  final data = jsonDecode(res.body);\n  return data['blocked_users'] ?? [];\n}"
      }
    },
    {
      "id": "user-report",
      "category": "user-profile",
      "method": "POST",
      "path": "/api/mobile/users/:userId/report",
      "summary": "Report User (Safety & Moderation Ticket)",
      "description": "Submits a moderation report against a user for inappropriate behavior, harassment, spam, fake profile, or room violations. Saved directly to moderation_reports for admin/moderator investigation.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <TOKEN>",
          "required": true
        },
        {
          "name": "Content-Type",
          "value": "application/json",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "User ID being reported"
        }
      ],
      "requestBody": {
        "contentType": "application/json",
        "description": "Report reason and detailed incident description",
        "example": {
          "reason": "Inappropriate Content",
          "description": "The user posted offensive comments in live stream chat.",
          "room_id": "room-238880d1"
        }
      },
      "responses": [
        {
          "status": 201,
          "description": "Report submitted successfully.",
          "example": {
            "success": true,
            "message": "User report submitted successfully. Our safety & moderation team will investigate this account.",
            "report_id": 8
          }
        },
        {
          "status": 400,
          "description": "Missing report reason or reporting oneself.",
          "example": {
            "success": false,
            "message": "Report reason is required (e.g. Harassment, Spam, Inappropriate Content, Impersonation)."
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X POST https://yourdomain.com/api/mobile/users/12/report \\\n  -H \"Authorization: Bearer <TOKEN>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"reason\": \"Inappropriate Content\", \"description\": \"Offensive chat messages\", \"room_id\": \"room-238880d1\"}'",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<int?> reportUser(int userId, String token, {required String reason, String? description, String? roomId}) async {\n  final res = await http.post(\n    Uri.parse('https://yourdomain.com/api/mobile/users/$userId/report'),\n    headers: {\n      'Authorization': 'Bearer $token',\n      'Content-Type': 'application/json',\n    },\n    body: jsonEncode({\n      'reason': reason,\n      if (description != null) 'description': description,\n      if (roomId != null) 'room_id': roomId,\n    }),\n  );\n  final data = jsonDecode(res.body);\n  return data['report_id'];\n}"
      }
    },
    {
      "id": "admin-get-reports",
      "category": "user-profile",
      "method": "GET",
      "path": "/api/admin/reports",
      "summary": "[Admin/Moderator] Get Moderation & Abuse Reports",
      "description": "Fetches paginated user violation reports with counts breakdown (total, pending, investigating, resolved, dismissed). Supports status filtering and keyword search.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <TOKEN>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "status",
          "in": "query",
          "type": "string",
          "required": false,
          "description": "Filter by status: all, pending, investigating, resolved, dismissed"
        },
        {
          "name": "search",
          "in": "query",
          "type": "string",
          "required": false,
          "description": "Keyword search across users, reasons, and rooms"
        }
      ],
      "responses": [
        {
          "status": 200,
          "description": "Reports list retrieved successfully.",
          "example": {
            "success": true,
            "counts": {
              "total": 12,
              "pending": 4,
              "investigating": 2,
              "resolved": 5,
              "dismissed": 1
            },
            "reports": [
              {
                "id": 8,
                "reporter_id": 4,
                "reporter_name": "Tanvir Ahmed",
                "reported_id": 12,
                "reported_name": "Sabbir Hossain",
                "reported_is_banned": 0,
                "reason": "Harassment",
                "description": "Disruptive and abusive comments in live stream.",
                "status": "pending",
                "admin_notes": null
              }
            ]
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X GET \"https://yourdomain.com/api/admin/reports?status=pending\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<Map<String, dynamic>> fetchAdminReports(String token, {String status = 'all'}) async {\n  final res = await http.get(\n    Uri.parse('https://yourdomain.com/api/admin/reports?status=$status'),\n    headers: {'Authorization': 'Bearer $token'},\n  );\n  return jsonDecode(res.body);\n}"
      }
    },
    {
      "id": "admin-report-action",
      "category": "user-profile",
      "method": "POST",
      "path": "/api/admin/reports/:id/action",
      "summary": "[Admin/Moderator] Execute Moderation Action (Ban, Unban, Resolve, Dismiss)",
      "description": "Applies swift enforcement on reported user. Supports actions: 'ban' (bans offender and marks report resolved), 'unban', 'resolve', 'dismiss', and 'investigate'.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <TOKEN>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "Report ID"
        }
      ],
      "requestBody": {
        "action": "ban | unban | resolve | dismiss | investigate",
        "admin_notes": "Banned by administrator for severe harassment."
      },
      "responses": [
        {
          "status": 200,
          "description": "Action executed successfully.",
          "example": {
            "success": true,
            "message": "User has been banned and report marked as resolved.",
            "report_id": 8,
            "status": "resolved"
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X POST https://yourdomain.com/api/admin/reports/8/action \\\n  -H \"Authorization: Bearer <TOKEN>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"action\": \"ban\", \"admin_notes\": \"Severe violations\"}'",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<bool> takeReportAction(int reportId, String action, String token) async {\n  final res = await http.post(\n    Uri.parse('https://yourdomain.com/api/admin/reports/$reportId/action'),\n    headers: {\n      'Authorization': 'Bearer $token',\n      'Content-Type': 'application/json',\n    },\n    body: jsonEncode({'action': action}),\n  );\n  final data = jsonDecode(res.body);\n  return data['success'] == true;\n}"
      }
    },
    {
      "id": "admin-offender-reports",
      "category": "user-profile",
      "method": "GET",
      "path": "/api/admin/reports/offender/:userId",
      "summary": "[Admin/Moderator] Get Offender Profile & All Linked Complaints History",
      "description": "Fetches a reported offender's full profile, banned status, registered mobile devices count, complaints breakdown, and the complete list of all users who submitted reports against them with full reporter profiles and complaint details.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <TOKEN>",
          "required": true
        }
      ],
      "parameters": [
        {
          "name": "userId",
          "in": "path",
          "type": "integer",
          "required": true,
          "description": "User ID of the reported offender"
        }
      ],
      "responses": [
        {
          "status": 200,
          "description": "Offender details and all complaints retrieved.",
          "example": {
            "success": true,
            "offender": {
              "reported_id": 2,
              "reported_name": "Nila Akter",
              "reported_email": "nila@umi.live",
              "reported_avatar": "https://example.com/avatar.jpg",
              "reported_role": "host",
              "reported_level": 15,
              "reported_is_banned": 0,
              "reported_devices_count": 2,
              "reported_banned_devices_count": 0
            },
            "total_reports": 3,
            "reasons_breakdown": {
              "Inappropriate Content": 2,
              "Spam / Scam": 1
            },
            "reports": [
              {
                "id": 1,
                "reporter_id": 1,
                "reporter_name": "System Admin",
                "reporter_avatar": "https://example.com/admin.jpg",
                "room_id": "room-demo123",
                "reason": "Inappropriate Content",
                "description": "Abusive behavior in live room",
                "status": "pending",
                "created_at": "2026-10-17T17:53:16.000Z"
              }
            ]
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X GET \"https://yourdomain.com/api/admin/reports/offender/2\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<Map<String, dynamic>> fetchOffenderReports(int userId, String token) async {\n  final res = await http.get(\n    Uri.parse('https://yourdomain.com/api/admin/reports/offender/$userId'),\n    headers: {'Authorization': 'Bearer $token'},\n  );\n  return jsonDecode(res.body);\n}"
      }
    },
    {
      "id": "themes-default",
      "category": "themes",
      "method": "GET",
      "path": "/api/mobile/themes/default",
      "summary": "100% Public Default Theme (App Launch / Splash Screen)",
      "description": "Completely public, zero-auth endpoint. Returns the system default page background wallpaper, bottom sheet image, and primary accent color palette. Call this immediately on Flutter app startup or Splash Screen before the user logs in.",
      "requiresAuth": false,
      "requestHeaders": [],
      "parameters": [],
      "responses": [
        {
          "status": 200,
          "description": "Default theme fetched successfully.",
          "example": {
            "success": true,
            "message": "System default theme loaded successfully.",
            "theme": {
              "page_image": {
                "id": 1,
                "type": "page_image",
                "name": "Cyber Neon Glow",
                "value": "/uploads/themes/cyber_neon.jpg",
                "price": 0
              },
              "bottom_sheet_image": {
                "id": 3,
                "type": "bottom_sheet_image",
                "name": "Dark Velvet Glass",
                "value": "/uploads/themes/dark_velvet.png",
                "price": 0
              },
              "color": {
                "id": 5,
                "type": "color",
                "name": "Electric Violet",
                "value": "#7C3AED",
                "secondary_value": "#A78BFA",
                "price": 0
              }
            }
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X GET \"https://yourdomain.com/api/mobile/themes/default\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\n// Call on app startup / SplashScreen\nFuture<Map<String, dynamic>> fetchDefaultTheme() async {\n  final res = await http.get(\n    Uri.parse('https://yourdomain.com/api/mobile/themes/default'),\n  );\n  if (res.statusCode == 200) {\n    final data = jsonDecode(res.body);\n    return data['theme'];\n  }\n  return {};\n}"
      }
    },
    {
      "id": "themes-catalog",
      "category": "themes",
      "method": "GET",
      "path": "/api/mobile/themes",
      "summary": "Themes & Customization Catalog",
      "description": "Returns the complete themes catalog grouped into page_images (wallpapers), bottom_sheet_images (drawer/modal backgrounds), and colors (accent palettes), together with the active system defaults. When authenticated, automatically enriches each item with user purchase status (`is_purchased`) and active equipped status (`is_equipped`).",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": false,
          "description": "Optional Bearer JWT to check user's purchased & equipped themes."
        }
      ],
      "parameters": [],
      "responses": [
        {
          "status": 200,
          "description": "Catalog fetched successfully.",
          "example": {
            "success": true,
            "catalog": {
              "page_images": [
                {
                  "id": 1,
                  "type": "page_image",
                  "name": "Cyber Neon Glow",
                  "value": "/uploads/themes/cyber_neon.jpg",
                  "price": 0,
                  "validity_days": 0,
                  "is_default": 1,
                  "is_free": true,
                  "is_purchased": true,
                  "is_equipped": true
                }
              ],
              "bottom_sheet_images": [
                {
                  "id": 3,
                  "type": "bottom_sheet_image",
                  "name": "Dark Velvet Glass",
                  "value": "/uploads/themes/dark_velvet.png",
                  "price": 0,
                  "validity_days": 0,
                  "is_default": 1,
                  "is_free": true,
                  "is_purchased": true,
                  "is_equipped": true
                }
              ],
              "colors": [
                {
                  "id": 5,
                  "type": "color",
                  "name": "Electric Violet",
                  "value": "#7C3AED",
                  "secondary_value": "#A78BFA",
                  "price": 0,
                  "validity_days": 0,
                  "is_default": 1,
                  "is_free": true,
                  "is_purchased": true,
                  "is_equipped": true
                }
              ],
              "active_defaults": {
                "page_image": { "id": 1, "name": "Cyber Neon Glow", "value": "/uploads/themes/cyber_neon.jpg" },
                "bottom_sheet_image": { "id": 3, "name": "Dark Velvet Glass", "value": "/uploads/themes/dark_velvet.png" },
                "color": { "id": 5, "name": "Electric Violet", "value": "#7C3AED", "secondary_value": "#A78BFA" }
              }
            }
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X GET \"https://yourdomain.com/api/mobile/themes\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<Map<String, dynamic>> fetchThemesCatalog([String? token]) async {\n  final res = await http.get(\n    Uri.parse('https://yourdomain.com/api/mobile/themes'),\n    headers: token != null ? {'Authorization': 'Bearer $token'} : {},\n  );\n  return jsonDecode(res.body);\n}"
      }
    },
    {
      "id": "themes-active",
      "category": "themes",
      "method": "GET",
      "path": "/api/mobile/themes/active",
      "summary": "Active Theme Configuration",
      "description": "Returns the active theme for the app: if the user is authenticated and has equipped custom theme items, returns the user's equipped items; otherwise returns system default settings.",
      "requiresAuth": false,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": false,
          "description": "Optional Bearer JWT token."
        }
      ],
      "parameters": [],
      "responses": [
        {
          "status": 200,
          "description": "Active theme fetched successfully.",
          "example": {
            "success": true,
            "theme": {
              "page_image": { "id": 1, "type": "page_image", "name": "Cyber Neon Glow", "value": "/uploads/themes/cyber_neon.jpg" },
              "bottom_sheet_image": { "id": 3, "type": "bottom_sheet_image", "name": "Dark Velvet Glass", "value": "/uploads/themes/dark_velvet.png" },
              "color": { "id": 5, "type": "color", "name": "Electric Violet", "value": "#7C3AED", "secondary_value": "#A78BFA" }
            }
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X GET \"https://yourdomain.com/api/mobile/themes/active\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<Map<String, dynamic>> fetchActiveTheme([String? token]) async {\n  final res = await http.get(\n    Uri.parse('https://yourdomain.com/api/mobile/themes/active'),\n    headers: token != null ? {'Authorization': 'Bearer $token'} : {},\n  );\n  return jsonDecode(res.body);\n}"
      }
    },
    {
      "id": "themes-buy",
      "category": "themes",
      "method": "POST",
      "path": "/api/mobile/themes/buy/:id",
      "summary": "Buy Theme Item with Coins",
      "description": "Purchases a theme item (page background wallpaper, bottom sheet image, or color scheme) using user's wallet coins. Deducts coins, records an audit transaction, grants ownership to user, and automatically equips the item.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "Bearer JWT token of logged-in user."
        }
      ],
      "parameters": [
        {
          "name": "id",
          "type": "integer",
          "required": true,
          "in": "path",
          "description": "ID of the theme item to buy."
        }
      ],
      "responses": [
        {
          "status": 200,
          "description": "Item purchased and equipped successfully.",
          "example": {
            "success": true,
            "message": "🎉 Successfully purchased and equipped \"Royal Purple Glow\"!",
            "remaining_coins": 2500
          }
        },
        {
          "status": 400,
          "description": "Insufficient coins or already owned.",
          "example": {
            "success": false,
            "message": "Insufficient coins. This theme item costs 500 coins, but your balance is 120 coins."
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X POST \"https://yourdomain.com/api/mobile/themes/buy/2\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<Map<String, dynamic>> buyThemeItem(int itemId, String token) async {\n  final res = await http.post(\n    Uri.parse('https://yourdomain.com/api/mobile/themes/buy/$itemId'),\n    headers: {'Authorization': 'Bearer $token'},\n  );\n  return jsonDecode(res.body);\n}"
      }
    },
    {
      "id": "themes-equip",
      "category": "themes",
      "method": "POST",
      "path": "/api/mobile/themes/equip/:id",
      "summary": "Equip Theme Item",
      "description": "Equips an owned (or free) theme item as the user's active wallpaper, bottom sheet, or accent color. Deactivates other items of the same type for this user.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "Bearer JWT token."
        }
      ],
      "parameters": [
        {
          "name": "id",
          "type": "integer",
          "required": true,
          "in": "path",
          "description": "ID of the theme item to equip."
        }
      ],
      "responses": [
        {
          "status": 200,
          "description": "Item equipped successfully.",
          "example": {
            "success": true,
            "message": "\"Cyber Neon Glow\" has been equipped as your active page image."
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X POST \"https://yourdomain.com/api/mobile/themes/equip/1\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<Map<String, dynamic>> equipThemeItem(int itemId, String token) async {\n  final res = await http.post(\n    Uri.parse('https://yourdomain.com/api/mobile/themes/equip/$itemId'),\n    headers: {'Authorization': 'Bearer $token'},\n  );\n  return jsonDecode(res.body);\n}"
      }
    },
    {
      "id": "themes-my",
      "category": "themes",
      "method": "GET",
      "path": "/api/mobile/themes/my",
      "summary": "My Acquired Theme Items",
      "description": "Returns all theme items (wallpapers, bottom sheets, colors) owned or purchased by the authenticated user, along with expiration and equipped state.",
      "requiresAuth": true,
      "requestHeaders": [
        {
          "name": "Authorization",
          "value": "Bearer <token>",
          "required": true,
          "description": "Bearer JWT token."
        }
      ],
      "parameters": [],
      "responses": [
        {
          "status": 200,
          "description": "User theme items fetched.",
          "example": {
            "success": true,
            "items": [
              {
                "id": 1,
                "type": "page_image",
                "name": "Cyber Neon Glow",
                "value": "/uploads/themes/cyber_neon.jpg",
                "is_equipped": 1,
                "expires_at": null,
                "acquired_at": "2026-10-23T08:00:00.000Z"
              }
            ]
          }
        }
      ],
      "codeSnippets": {
        "curl": "curl -X GET \"https://yourdomain.com/api/mobile/themes/my\" \\\n  -H \"Authorization: Bearer <TOKEN>\"",
        "flutter": "import 'package:http/http.dart' as http;\nimport 'dart:convert';\n\nFuture<Map<String, dynamic>> fetchMyThemes(String token) async {\n  final res = await http.get(\n    Uri.parse('https://yourdomain.com/api/mobile/themes/my'),\n    headers: {'Authorization': 'Bearer $token'},\n  );\n  return jsonDecode(res.body);\n}"
      }
    }
  ]
};

router.get('/spec', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.json(API_SPEC);
});

export default router;
