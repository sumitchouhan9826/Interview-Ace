import generateOTP from '../utils/generateOTP.js';
import hashOTP, { compareOTP } from '../utils/hashOTP.js';
import { sendEmail } from './resendService.js';
import { otpTemplate } from '../templates/otpTemplate.js';

/**
 * Generate, store and send OTP
 * @param {Object} user - Mongoose user document
 * @param {string} type - 'verification' or 'reset'
 */
export const sendOTP = async (user, type = 'verification') => {
  const otp = generateOTP();
  const hashedOtp = hashOTP(otp);

  // Set expiry (5 minutes)
  const expiry = new Date(Date.now() + 5 * 60 * 1000);

  // Update user
  user.otpHash = hashedOtp;
  user.otpExpiry = expiry;
  user.otpAttempts = 0;
  user.lastOtpSentAt = new Date();
  
  if (type === 'reset') {
    user.resetPasswordVerified = false;
  }

  await user.save();

  // Send email
  await sendEmail({
    email: user.email,
    subject: type === 'verification' ? 'Verify Your Account - Interview Ace' : 'Reset Your Password - Interview Ace',
    html: otpTemplate(otp, user.name, type),
  });

  return true;
};

/**
 * Verify OTP
 * @param {Object} user - Mongoose user document
 * @param {string} otp - Plain text OTP
 * @param {string} type - 'verification' or 'reset'
 * @returns {boolean} True if valid
 */
export const verifyOTP = async (user, otp, type = 'verification') => {
  // Check if OTP exists
  if (!user.otpHash || !user.otpExpiry) {
    throw new Error('No OTP found');
  }

  // Check expiry
  if (new Date() > user.otpExpiry) {
    throw new Error('OTP has expired');
  }

  // Check attempts
  if (user.otpAttempts >= 5) {
    throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
  }

  // Verify
  const isValid = compareOTP(otp, user.otpHash);

  if (!isValid) {
    user.otpAttempts += 1;
    await user.save();
    throw new Error('Invalid OTP');
  }

  // Success - Clear OTP fields
  user.otpHash = undefined;
  user.otpExpiry = undefined;
  user.otpAttempts = 0;

  if (type === 'verification') {
    user.isVerified = true;
  } else if (type === 'reset') {
    user.resetPasswordVerified = true;
  }

  await user.save();
  return true;
};
