import express from 'express';
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  getUserProfile,
} from '../controllers/authController.js';
import {
  registerValidation,
  loginValidation,
  otpValidation,
  resetPasswordValidation,
} from '../middleware/validateMiddleware.js';
import { authLimiter, otpResendLimiter } from '../middleware/rateLimiter.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', authLimiter, registerValidation, register);
router.post('/signup', authLimiter, registerValidation, register); // backward compat alias
router.post('/login', authLimiter, loginValidation, login);
router.post('/verify-otp', otpValidation, verifyOtp);
router.post('/resend-otp', otpResendLimiter, resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// Protected routes
router.get('/profile', protect, getUserProfile);

export default router;
