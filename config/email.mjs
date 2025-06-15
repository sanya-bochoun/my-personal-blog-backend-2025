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
  const frontendUrl = 'http://localhost:5173'; // กำหนดค่าแบบ hardcode
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
  console.log('Generated reset URL:', resetUrl); // เพิ่ม log
  const html = `
    <h1>รีเซ็ตรหัสผ่าน</h1>
    <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ</p>
    <p>คลิกที่ลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่าน:</p>
    <a href="${resetUrl}" style="
      display: inline-block;
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    ">รีเซ็ตรหัสผ่าน</a>
    <p>ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง</p>
    <p>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาละเลยอีเมลนี้</p>
  `;

  return sendEmail(to, 'รีเซ็ตรหัสผ่าน', html);
};

export default {
  sendEmail,
  sendResetPasswordEmail
}; 