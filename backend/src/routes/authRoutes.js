import express from 'express';
import { register, login, googleLogin, getMe } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', requireAuth, getMe);

export default router;
