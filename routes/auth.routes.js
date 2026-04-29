import express from 'express';
import { signupUser, loginUser, getUserProfile } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);

export default router;
