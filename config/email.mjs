import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// สร้าง transporter สำหรับส่งอีเมล
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ฟังก์ชันสำหรับส่งอีเมล
export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html
    });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// ฟังก์ชันสำหรับส่งอีเมลรีเซ็ตรหัสผ่าน
export const sendResetPasswordEmail = async (to, resetToken) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
  console.log('Generated reset URL:', resetUrl);
  const html = `
    <h1>Reset Password</h1>
    <p>You have requested to reset your password for your account.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}" style="
      display: inline-block;
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    ">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you did not request a password reset, please ignore this email.</p>
  `;

  return sendEmail(to, 'Reset Password', html);
};

// ฟังก์ชันสำหรับส่งอีเมลยืนยันอีเมล
export const sendVerificationEmail = async (to, verificationToken) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyUrl = `${frontendUrl}/verify-email/${verificationToken}`;
  console.log('Generated verification URL:', verifyUrl);
  const html = `
    <h1>Verify Your Email</h1>
    <p>Thank you for registering! Please verify your email address to complete your registration.</p>
    <p>Click the link below to verify your email:</p>
    <a href="${verifyUrl}" style="
      display: inline-block;
      padding: 10px 20px;
      background-color: #28a745;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    ">Verify Email</a>
    <p>This link will expire in 24 hours.</p>
    <p>If you did not create an account, please ignore this email.</p>
  `;

  return sendEmail(to, 'Verify Your Email', html);
};

export default {
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail
}; 