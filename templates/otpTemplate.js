/**
 * OTP Email Template
 * @param {string} otp - The OTP code
 * @param {string} name - User's name
 * @param {string} type - 'verification' or 'reset'
 * @returns {string} HTML content
 */
export const otpTemplate = (otp, name, type = 'verification') => {
  const title = type === 'verification' ? 'Verify Your Account' : 'Reset Your Password';
  const actionText = type === 'verification' ? 'verify your account' : 'reset your password';

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7f6; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 30px; text-align: center; color: #ffffff; }
            .content { padding: 40px; text-align: center; }
            .otp-container { background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0; display: inline-block; }
            .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; margin: 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .warning { color: #ef4444; font-size: 13px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin:0;">Interview Ace</h1>
            </div>
            <div class="content">
                <h2>Hi ${name},</h2>
                <p>Use the code below to ${actionText}. This code is valid for <strong>5 minutes</strong>.</p>
                <div class="otp-container">
                    <p class="otp-code">${otp}</p>
                </div>
                <p>If you didn't request this, please ignore this email.</p>
                <div class="warning">
                    <p>For security, never share this code with anyone.</p>
                </div>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Interview Ace. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};
