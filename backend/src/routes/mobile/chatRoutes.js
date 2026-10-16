import express from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  uploadChatMediaDirect,
  markConversationRead,
  deleteConversation,
  searchUsersForChat,
} from '../../controllers/mobile/chatController.js';
import { requireAuth } from '../../middlewares/authMiddleware.js';
import { optionalChatMediaUpload } from '../../middleware/upload.js';

const router = express.Router();

/**
 * Mobile 1-on-1 Chatting API Routes
 * Mounted at:
 *  - /api/mobile/chat  (and /api/v1/chat)
 */

// All chat operations require user authentication
router.use(requireAuth);

// 0. Search Users for Direct Chat (by User ID or Name)
router.get('/users/search', searchUsersForChat);
router.get('/search-users', searchUsersForChat);

// 1. Conversations / Inbox List
router.get('/conversations', getConversations);

// 2. Fetch Messages
router.get('/conversations/:conversationId/messages', getMessages);
router.get('/messages/:otherUserId', getMessages);

// 3. Send Message (Text & Multiple Images / Video Upload From Device)
router.post('/messages', optionalChatMediaUpload, sendMessage);
router.post('/conversations/:conversationId/messages', optionalChatMediaUpload, sendMessage);

// 4. Direct Device Media Upload
router.post('/upload', optionalChatMediaUpload, uploadChatMediaDirect);

// 5. Read Receipt & Deletion
router.put('/conversations/:id/read', markConversationRead);
router.delete('/conversations/:id', deleteConversation);

export default router;
