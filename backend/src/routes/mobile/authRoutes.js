import express from 'express';
import {
  register,
  login,
  googleLogin,
  getMe,
  updateProfile,
  uploadAvatar,
  verifySession,
  sendOtp,
  verifyOtp,
  updateFcmToken,
  removeFcmToken,
} from '../../controllers/mobile/authController.js';
import { requireAuth } from '../../middlewares/authMiddleware.js';
import { optionalAvatarUpload } from '../../middleware/upload.js';

const router = express.Router();

// Public Mobile Auth Endpoints
router.post('/register', optionalAvatarUpload, register);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/google', googleLogin);
router.post('/upload-avatar', optionalAvatarUpload, uploadAvatar);
router.get('/verify-token', verifySession); // Token validity check — no auth middleware

// Authenticated Mobile Auth Endpoints
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, optionalAvatarUpload, updateProfile);

// FCM Device Token Registration for Push Notifications
router.post('/fcm-token', requireAuth, updateFcmToken);
router.delete('/fcm-token', requireAuth, removeFcmToken);

export default router;
