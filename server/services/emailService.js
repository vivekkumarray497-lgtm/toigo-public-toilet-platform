const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
    if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: parseInt(SMTP_PORT, 10) || 587,
            secure: parseInt(SMTP_PORT, 10) === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASSWORD
            }
        });
    }
    return transporter;
}

const inMemoryDispatchedOtp = new Map();

/**
 * Send Email Verification OTP
 */
async function sendVerificationEmail(toEmail, otp, userName = 'Citizen') {
    if (toEmail) {
        inMemoryDispatchedOtp.set(toEmail.trim().toLowerCase(), { otp, sentAt: Date.now() });
    }

    const transport = getTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"TOIGO Sanitation Network" <no-reply@toigo.app>';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; }
            .card { background-color: #1e293b; border-radius: 16px; padding: 32px; max-width: 500px; margin: 0 auto; border: 1px solid #334155; }
            .logo { font-size: 24px; font-weight: 900; color: #10b981; letter-spacing: -0.5px; }
            .otp-box { background: #0f172a; border: 2px dashed #10b981; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 6px; text-align: center; color: #10b981; padding: 16px; margin: 24px 0; }
            .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">TOIGO</div>
            <h2 style="color: #ffffff; margin-top: 12px; font-size: 20px;">Verify Your Email Address</h2>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">Hello ${userName},</p>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">Thank you for registering on TOIGO – Smart Sanitation & Clean Washroom Network. Use the 6-digit verification code below to activate your account:</p>
            
            <div class="otp-box">${otp}</div>
            
            <p style="color: #94a3b8; font-size: 13px;">This code is valid for <strong>10 minutes</strong>. If you did not request this code, please ignore this email.</p>
            
            <div class="footer">
                &copy; ${new Date().getFullYear()} TOIGO Sanitation Network. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;

    if (!transport) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`\n📧 [DEV EMAIL SIMULATOR] To: ${toEmail} | Verification OTP: ${otp} (Valid 10 mins)\n`);
        } else {
            console.warn('⚠️ SMTP credentials not configured in production server/.env');
        }
        return { success: true, simulated: true };
    }

    try {
        const info = await transport.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: `Your TOIGO Verification Code: ${otp}`,
            text: `Hello ${userName},\n\nYour TOIGO email verification code is: ${otp}\nThis code is valid for 10 minutes.\n\nThank you,\nTOIGO Team`,
            html: htmlContent
        });
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Failed to send verification email:', err);
        return { success: false, error: err.message };
    }
}

function getLastDispatchedOtp(email) {
    if (!email) return null;
    const entry = inMemoryDispatchedOtp.get(email.trim().toLowerCase());
    return entry ? entry.otp : null;
}

module.exports = {
    sendVerificationEmail,
    getTransporter,
    getLastDispatchedOtp
};
