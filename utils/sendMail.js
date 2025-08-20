const nodemailer = require("nodemailer");

/**
 * Send OTP email for password change
 * @param {string} to - Recipient email address
 * @param {string} otp - One-time password
 * @returns {Promise}
 */
async function sendOtpEmail(to, otp) {
  try {
    const transporter = nodemailer.createTransport({
     service: "Gmail",// true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: `"Your App" <${process.env.SMTP_USER}>`,
      to,
      subject: "Your OTP for Password Change",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #333;">Password Change Verification</h2>
          <p>Use the OTP below to verify your password change request:</p>
          <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          <p>This OTP will expire in 5 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("OTP Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
}

module.exports = sendOtpEmail;
