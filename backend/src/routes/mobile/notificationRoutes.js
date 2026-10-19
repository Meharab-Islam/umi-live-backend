import express from 'express';
import { requireAuth } from '../../middlewares/authMiddleware.js';
import { updateFcmToken, removeFcmToken } from '../../controllers/mobile/authController.js';

const router = express.Router();

/**
 * Specification and payload definitions for all incoming Firebase Cloud Messaging (FCM) Push Notifications
 * GET /api/mobile/notifications/specs
 */
router.get('/specs', (req, res) => {
  return res.status(200).json({
    success: true,
    title: 'Umi Live Firebase FCM Push Notification & Deep Linking Specification',
    version: '1.0.0',
    description: 'This document defines the real-time push notification payloads dispatched by the backend when actions occur (Direct Messages, Comments, Replies, New Follower Posts, Live Room Starts). Mobile apps (Flutter/Android/iOS) parse the payload data map to navigate directly to the target screen.',
    android_channel: {
      channel_id: 'umi_chat_messages',
      channel_name: 'Umi Live Notifications',
      description: 'High-priority notifications for chat messages, comments, replies, and live streams',
      importance: 'HIGH',
      sound: 'default',
    },
    payload_types: [
      {
        type: 'direct_message',
        category: 'dm',
        description: 'Dispatched when another user sends a 1-on-1 private chat message.',
        target_screen: 'chat_details',
        route: '/chat-details',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sample_notification: {
          title: 'Nila Akter',
          body: 'Hello brother! Are you available for a quick chat?',
        },
        sample_data: {
          notification_category: 'dm',
          type: 'direct_message',
          target_screen: 'chat_details',
          route: '/chat-details',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          conversation_id: '3',
          sender_id: '10',
          sender_name: 'Nila Akter',
          sender_avatar: '/uploads/avatars/nila.jpg',
          message: 'Hello brother! Are you available for a quick chat?',
          chat_type: 'text',
          msg_type: 'text',
          created_at: '2026-10-16T09:00:00.000Z',
        },
        flutter_navigation_example: "Get.toNamed(Routes.CHAT_DETAILS, arguments: {'conversationId': int.parse(data['conversation_id']), 'partnerId': int.parse(data['sender_id']), 'partnerName': data['sender_name']});",
      },
      {
        type: 'post_comment',
        category: 'post',
        description: 'Dispatched to the post author when a user comments on their news feed post.',
        target_screen: 'post_details',
        route: '/post-details',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sample_notification: {
          title: 'Tanvir Ahmed commented on your post 💬',
          body: 'Awesome broadcast today! Keep it up 🔥',
        },
        sample_data: {
          notification_category: 'post',
          type: 'post_comment',
          target_screen: 'post_details',
          route: '/post-details',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          post_id: '2',
          comment_id: '14',
          is_reply: 'false',
          commenter_id: '4',
          commenter_name: 'Tanvir Ahmed',
          commenter_avatar: '/uploads/avatars/tanvir.jpg',
          content: 'Awesome broadcast today! Keep it up 🔥',
          created_at: '2026-10-16T09:10:00.000Z',
        },
        flutter_navigation_example: "Get.toNamed(Routes.POST_DETAILS, arguments: {'postId': int.parse(data['post_id'])});",
      },
      {
        type: 'comment_reply',
        category: 'post',
        description: 'Dispatched to the original comment author when someone replies to their comment.',
        target_screen: 'post_details',
        route: '/post-details',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sample_notification: {
          title: 'নিবিড় replied to your comment 💬',
          body: 'Thanks a lot brother!',
        },
        sample_data: {
          notification_category: 'post',
          type: 'comment_reply',
          target_screen: 'post_details',
          route: '/post-details',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          post_id: '2',
          comment_id: '15',
          parent_id: '4',
          is_reply: 'true',
          replier_id: '7',
          replier_name: 'নিবিড়',
          replier_avatar: '/uploads/avatars/nibir.jpg',
          content: 'Thanks a lot brother!',
          created_at: '2026-10-16T09:15:00.000Z',
        },
        flutter_navigation_example: "Get.toNamed(Routes.POST_DETAILS, arguments: {'postId': int.parse(data['post_id']), 'highlightCommentId': int.parse(data['comment_id'])});",
      },
      {
        type: 'new_post',
        category: 'post',
        description: 'Dispatched to all followers when a followed user creates a new post on the news feed.',
        target_screen: 'post_details',
        route: '/post-details',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sample_notification: {
          title: 'New post from Nila Akter 📰',
          body: 'Sharing our moments from the live contest 📸',
        },
        sample_data: {
          notification_category: 'post',
          type: 'new_post',
          target_screen: 'post_details',
          route: '/post-details',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          post_id: '8',
          author_id: '10',
          author_name: 'Nila Akter',
          author_avatar: '/uploads/avatars/nila.jpg',
          title: 'Sharing our moments from the live contest 📸',
          media_type: 'image',
          created_at: '2026-10-16T09:20:00.000Z',
        },
        flutter_navigation_example: "Get.toNamed(Routes.POST_DETAILS, arguments: {'postId': int.parse(data['post_id'])});",
      },
      {
        type: 'live_room_started',
        category: 'live',
        description: 'Dispatched to followers when a host starts a video or audio live room.',
        target_screen: 'video_live', // or audio_live
        route: '/video-live', // or /audio-live
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sample_notification: {
          title: '🔴 Nila Akter is now LIVE!',
          body: 'Join "Music & Chill 🎤" now and chat live! Live Stream 🎥',
        },
        sample_data: {
          notification_category: 'live',
          type: 'live_room_started',
          target_screen: 'video_live',
          route: '/video-live',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          room_id: 'room_1729065600',
          live_type: 'video',
          is_host: 'false',
          host_id: '10',
          host_name: 'Nila Akter',
          host_avatar: '/uploads/avatars/nila.jpg',
          title: 'Music & Chill 🎤',
          created_at: '2026-10-16T09:25:00.000Z',
        },
        flutter_navigation_example: "final isAudio = data['live_type'] == 'audio'; Get.toNamed(isAudio ? Routes.AUDIO_LIVE : Routes.VIDEO_LIVE, arguments: {'roomId': data['room_id'], 'isHost': false});",
      },
      {
        type: 'new_follower',
        category: 'social',
        description: 'Dispatched in real-time to a user when someone starts following them.',
        target_screen: 'user_profile',
        route: '/user-profile',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sample_notification: {
          title: '👤 New Follower!',
          body: 'Nibir started following you ✨',
        },
        sample_data: {
          notification_category: 'social',
          type: 'new_follower',
          target_screen: 'user_profile',
          route: '/user-profile',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          follower_id: '7',
          follower_name: 'Nibir',
          follower_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=7',
          created_at: '2026-10-17T18:30:00.000Z',
        },
        flutter_navigation_example: "Get.toNamed(Routes.USER_PROFILE, arguments: {'userId': int.parse(data['follower_id'])});"
      },
    ],
  });
});

// Device FCM Registration shortcuts
router.post('/fcm-token', requireAuth, updateFcmToken);
router.delete('/fcm-token', requireAuth, removeFcmToken);

export default router;
