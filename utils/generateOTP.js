import crypto from 'crypto';

/**
 * Generate a secure 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export default generateOTP;
