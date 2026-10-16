import express from 'express';
import {
  createPost,
  getFeed,
  getPostDetails,
  updatePost,
  deletePost,
  reactToPost,
  getPostReactions,
  addComment,
  getComments,
  getCommentReplies,
  deleteComment,
  updateComment,
  uploadFeedMediaDirect,
} from '../../controllers/mobile/feedController.js';
import { requireAuth, optionalAuth } from '../../middlewares/authMiddleware.js';
import { optionalFeedMediaUpload } from '../../middleware/upload.js';

const router = express.Router();

/**
 * Mobile News Feed & Posts API Routes
 * Mounted at:
 *  - /api/mobile/feed  (and /api/mobile/posts)
 *  - /api/v1/feed      (and /api/v1/posts)
 */

// 1. Post Creation & Media Upload
router.post('/upload', requireAuth, optionalFeedMediaUpload, uploadFeedMediaDirect);
router.post('/', requireAuth, optionalFeedMediaUpload, createPost);
router.get('/', optionalAuth, getFeed);

// 2. Single Post Details, Update & Delete
router.get('/:id', optionalAuth, getPostDetails);
router.put('/:id', requireAuth, updatePost);
router.patch('/:id', requireAuth, updatePost);
router.delete('/:id', requireAuth, deletePost);

// 3. Reactions & Likes (Toggle / Set & View Reaction List)
router.post('/:id/react', requireAuth, reactToPost);
router.post('/:id/like', requireAuth, reactToPost);
router.get('/:id/reactions', optionalAuth, getPostReactions);
router.get('/:id/likes', optionalAuth, getPostReactions);

// 4. Comments & Replies
router.post('/:id/comments', requireAuth, addComment);
router.get('/:id/comments', optionalAuth, getComments);
router.get('/:id/comments/:commentId/replies', optionalAuth, getCommentReplies);
router.get('/comments/:commentId/replies', optionalAuth, getCommentReplies);

// Update Comment / Reply (by postId + commentId or directly by commentId)
router.put('/:postId/comments/:commentId', requireAuth, updateComment);
router.patch('/:postId/comments/:commentId', requireAuth, updateComment);
router.put('/comments/:commentId', requireAuth, updateComment);
router.patch('/comments/:commentId', requireAuth, updateComment);

// Delete Comment / Reply (by postId + commentId or directly by commentId)
router.delete('/:postId/comments/:commentId', requireAuth, deleteComment);
router.delete('/comments/:commentId', requireAuth, deleteComment);

export default router;
