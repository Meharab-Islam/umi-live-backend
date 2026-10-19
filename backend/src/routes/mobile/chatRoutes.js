import express from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  uploadChatMediaDirect,
  markConversationRead,
  deleteConversation,
  clearChatMessages,
  updateConversationBackground,
  removeConversationBackground,
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

// 3. Send Message (Supports Text, Images, Videos, Audio & Reply/Quote to message)
router.post('/messages', optionalChatMediaUpload, sendMessage);
router.post('/conversations/:conversationId/messages', optionalChatMediaUpload, sendMessage);

// 4. Direct Device Media Upload
router.post('/upload', optionalChatMediaUpload, uploadChatMediaDirect);

// 5. Read Receipt
router.put('/conversations/:id/read', markConversationRead);

// 6. Chat Background Management (Shared between both conversation participants)
router.put('/conversations/:id/background', optionalChatMediaUpload, updateConversationBackground);
router.post('/conversations/:id/background', optionalChatMediaUpload, updateConversationBackground);
router.delete('/conversations/:id/background', removeConversationBackground);
router.put('/messages/:otherUserId/background', optionalChatMediaUpload, updateConversationBackground);
router.delete('/messages/:otherUserId/background', removeConversationBackground);

// 7. Clear Messages History for Current User (Partner retains full chat history)
router.post('/conversations/:id/clear', clearChatMessages);
router.post('/messages/:otherUserId/clear', clearChatMessages);

// 8. Delete / Remove Conversation for Current User
router.delete('/conversations/:id', deleteConversation);
router.delete('/messages/:otherUserId', deleteConversation);

export default router;
