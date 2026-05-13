import dotenv from 'dotenv';

dotenv.config();

// Lazy-initialized Resend client — only created when actually needed
let resendClient = null;

const getResendClient = async () => {
  if (!resendClient) {
    const { Resend } = await import('resend');
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

/**
 * Send email using Resend API
 * @param {Object} options - Email options (email, subject, html)
 */
export const sendEmail = async (options) => {
  const fromEmail = process.env.EMAIL_FROM || 'Interview Ace <onboarding@resend.dev>';

  // Fallback for development if API key is missing
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key') {
    console.warn('⚠️  RESEND_API_KEY not configured. Skipping real email send.');
    console.warn('📧  Email would have been sent to:', options.email);
    console.warn('📋  Subject:', options.subject);

    // Log OTP if it exists in the HTML for dev testing
    const otpMatch = options.html?.match(/class="otp-code">(\d{6})</);
    if (otpMatch) {
      console.warn('🔑  OTP Code (DEV ONLY):', otpMatch[1]);
    }

    return { id: 'dev-mode-skipped', status: 'skipped' };
  }

  try {
    const resend = await getResendClient();

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: options.email,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw new Error('Email could not be sent via Resend');
    }

    return data;
  } catch (error) {
    console.error('Resend Service Error:', error.message);
    throw new Error('Email service failed');
  }
};
