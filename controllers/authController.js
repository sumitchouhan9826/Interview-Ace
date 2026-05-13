import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.js';
import generateToken from '../utils/tokenUtils.js';
import { sendOTP, verifyOTP } from '../services/otpService.js';

/**
 * @desc    Register user & send OTP
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({
      success: false,
      message: 'User already exists',
    });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password, // will be hashed by pre-save hook
  });

  if (user) {
    // Send OTP — user from create() has all fields available
    try {
      await sendOTP(user, 'verification');
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError.message);
      // Still return success — user was created, they can resend OTP
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for the OTP.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid user data',
    });
  }
});

/**
 * @desc    Verify OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp, type } = req.body;

  const user = await User.findOne({ email }).select(
    '+otpHash +otpExpiry +otpAttempts +resetPasswordVerified'
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  try {
    await verifyOTP(user, otp, type || 'verification');
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // If it was a password reset verification, don't log them in yet
  if (type === 'reset') {
    return res.status(200).json({
      success: true,
      message: 'OTP verified. You can now reset your password.',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Account verified successfully',
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isVerified: true,
      token: generateToken(user._id),
    },
  });
});

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
export const resendOtp = asyncHandler(async (req, res) => {
  const { email, type } = req.body;

  // Select OTP fields so sendOTP can write to them
  const user = await User.findOne({ email }).select(
    '+otpHash +otpExpiry +otpAttempts +lastOtpSentAt'
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Check if user is already verified (only for registration type)
  if (type === 'verification' && user.isVerified) {
    return res.status(400).json({
      success: false,
      message: 'User is already verified',
    });
  }

  try {
    await sendOTP(user, type || 'verification');
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
    });
  }

  res.status(200).json({
    success: true,
    message: 'New OTP sent to your email',
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user email
  const user = await User.findOne({ email }).select('+password');

  if (user && (await user.matchPassword(password))) {
    // Check if verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email to login',
        unverified: true,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        token: generateToken(user._id),
      },
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }
});

/**
 * @desc    Forgot Password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Select OTP fields so sendOTP can write to them
  const user = await User.findOne({ email }).select(
    '+otpHash +otpExpiry +otpAttempts +lastOtpSentAt +resetPasswordVerified'
  );

  if (!user) {
    // Generic response to prevent user enumeration
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive an OTP.',
    });
  }

  try {
    await sendOTP(user, 'reset');
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Password reset OTP sent to your email',
  });
});

/**
 * @desc    Reset Password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  const user = await User.findOne({ email }).select('+resetPasswordVerified');

  if (!user || !user.resetPasswordVerified) {
    return res.status(400).json({
      success: false,
      message: 'Password reset session expired or invalid. Please verify OTP again.',
    });
  }

  // Set new password
  user.password = newPassword;
  user.resetPasswordVerified = false; // Reset the flag
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful. You can now login with your new password.',
  });
});

/**
 * @desc    Get user profile (kept for backward compatibility)
 * @route   GET /api/auth/profile
 * @access  Private
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      isVerified: user.isVerified,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});
