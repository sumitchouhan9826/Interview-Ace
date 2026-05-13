import crypto from 'crypto';

/**
 * Hash OTP using SHA256
 * @param {string} otp - Plain text OTP
 * @returns {string} Hashed OTP
 */
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Compare plain OTP with hashed OTP using timing-safe comparison
 * @param {string} plainOTP - Plain text OTP
 * @param {string} hashedOTP - Hashed OTP from DB
 * @returns {boolean} True if match
 */
export const compareOTP = (plainOTP, hashedOTP) => {
  const currentHash = hashOTP(plainOTP);
  return crypto.timingSafeEqual(Buffer.from(currentHash), Buffer.from(hashedOTP));
};

export default hashOTP;
