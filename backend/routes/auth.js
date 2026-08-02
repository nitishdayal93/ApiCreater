import express from 'express';
import { register, login, getProfile, refreshToken } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/profile', protect, getProfile);
router.get('/me', protect, getProfile);

export default router;
