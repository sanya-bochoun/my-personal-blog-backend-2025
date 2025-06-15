import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import db from '../utils/db.mjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { sendResetPasswordEmail } from '../config/email.mjs';

dotenv.config();

/**
 * ลงทะเบียนผู้ใช้ใหม่
 */
const register = async (req, res) => {
  try {
    console.log('[REGISTER] Starting registration process');
    const { username, email, password, full_name } = req.body;
    console.log('[REGISTER] Request data received:', { username, email, full_name });

    // ตรวจสอบว่ามีอีเมลนี้ในระบบแล้วหรือไม่
    console.log('[REGISTER] Checking if user exists');
    const userExists = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (userExists.rows.length > 0) {
      console.log('[REGISTER] User already exists');
      return res.status(409).json({
        status: 'error',
        message: 'อีเมลหรือชื่อผู้ใช้นี้มีในระบบแล้ว'
      });
    }

    // เข้ารหัสรหัสผ่าน
    console.log('[REGISTER] Hashing password');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      // เพิ่มผู้ใช้ใหม่
      console.log('[REGISTER] Inserting new user into database');
      const result = await db.query(
        `INSERT INTO users (username, email, password, full_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email, full_name, role, created_at`,
        [username, email, hashedPassword, full_name || null, 'user']
      );

      // สร้าง JWT token
      console.log('[REGISTER] Generating tokens');
      const accessToken = jwt.sign(
        { userId: result.rows[0].id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // สร้าง refresh token
      const refreshToken = jwt.sign(
        { userId: result.rows[0].id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
      );

      // บันทึก refresh token ลงฐานข้อมูล
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 วัน
      
      await db.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [result.rows[0].id, refreshToken, expiresAt]
      );

      console.log('[REGISTER] Registration successful');
      res.status(201).json({
        status: 'success',
        message: 'ลงทะเบียนสำเร็จ',
        data: {
          user: result.rows[0],
          accessToken,
          refreshToken
        }
      });
    } catch (dbError) {
      console.error('[REGISTER] Database error:', dbError);
      // ตรวจสอบ error เฉพาะที่เกี่ยวกับ missing table
      if (dbError.message && dbError.message.includes('relation') && dbError.message.includes('does not exist')) {
        return res.status(500).json({
          status: 'error',
          message: 'ตารางในฐานข้อมูลยังไม่ได้ถูกสร้าง กรุณาทำการ migration ก่อน',
          details: dbError.message
        });
      }
      throw dbError; // โยน error ไปที่ catch ข้างนอก
    }
  } catch (error) {
    console.error('[REGISTER] Error during registration:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการลงทะเบียน',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * เข้าสู่ระบบ
 */
const login = async (req, res) => {
  try {
    console.log('[LOGIN] Request body:', req.body);
    const { email, username, password } = req.body;

    let query, params;
    
    // ตรวจสอบว่าใช้ email หรือ username ในการล็อกอิน
    if (email) {
      console.log('[LOGIN] Using email:', email);
      query = `
        SELECT 
          id, username, email, password, role, full_name, is_locked,
          CASE 
            WHEN is_locked = true THEN 'locked'
            ELSE 'active'
          END as status
        FROM users 
        WHERE email = $1
      `;
      params = [email];
    } else if (username) {
      console.log('[LOGIN] Using username:', username);
      query = `
        SELECT 
          id, username, email, password, role, full_name, is_locked,
          CASE 
            WHEN is_locked = true THEN 'locked'
            ELSE 'active'
          END as status
        FROM users 
        WHERE username = $1
      `;
      params = [username];
    } else {
      console.log('[LOGIN] Missing email/username');
      return res.status(400).json({
        status: 'error',
        message: 'กรุณาระบุอีเมลหรือชื่อผู้ใช้'
      });
    }

    // ค้นหาผู้ใช้
    console.log('[LOGIN] Querying user...');
    const result = await db.query(query, params);
    console.log('[LOGIN] Query result:', result.rows);

    if (result.rows.length === 0) {
      console.log('[LOGIN] User not found');
      return res.status(401).json({
        status: 'error',
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    const user = result.rows[0];
    console.log('[LOGIN] User found:', user);

    // ตรวจสอบว่าบัญชีถูกล็อคหรือไม่
    if (user.is_locked) {
      console.log('[LOGIN] Account is locked');
      return res.status(403).json({
        status: 'error',
        message: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
      });
    }

    // ตรวจสอบรหัสผ่าน
    console.log('[LOGIN] Checking password...');
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('[LOGIN] Password match:', passwordMatch);
    
    if (!passwordMatch) {
      console.log('[LOGIN] Password incorrect');
      return res.status(401).json({
        status: 'error',
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // สร้าง JWT token
    console.log('[LOGIN] Generating access token...');
    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // สร้าง refresh token
    console.log('[LOGIN] Generating refresh token...');
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );

    // บันทึก refresh token ลงฐานข้อมูล
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    console.log('[LOGIN] Saving refresh token to DB...');
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAt]
    );

    // บันทึกข้อมูลการเข้าสู่ระบบ
    console.log('[LOGIN] Logging user session...');
    await db.query(
      `INSERT INTO user_sessions (user_id, ip_address, user_agent)
       VALUES ($1, $2, $3)`,
      [user.id, req.ip, req.headers['user-agent'] || '']
    );

    console.log('[LOGIN] Login successful!');
    res.json({
      status: 'success',
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          status: user.status
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('[LOGIN] Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    });
  }
};

/**
 * ดึงข้อมูลผู้ใช้ปัจจุบัน
 */
const getProfile = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, username, email, full_name, avatar_url, bio, role, created_at
       FROM users
       WHERE id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
    });
  }
};

/**
 * รีเฟรช token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    // ตรวจสอบว่า refresh token มีอยู่ในฐานข้อมูลหรือไม่
    const tokenResult = await db.query(
      `SELECT user_id, expires_at
       FROM refresh_tokens
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ'
      });
    }

    const userId = tokenResult.rows[0].user_id;

    // สร้าง access token ใหม่
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      status: 'success',
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการรีเฟรช token'
    });
  }
};

/**
 * ออกจากระบบ
 */
const logout = async (req, res) => {
  try {
    // ลบ refresh token ออกจากฐานข้อมูล
    // ในกรณีจริงต้องส่ง refreshToken มาจาก client ด้วย
    // แต่ตอนนี้เราจะลบทุก token ของผู้ใช้นี้เพื่อความง่าย
    await db.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [req.userId]
    );

    res.json({
      status: 'success',
      message: 'ออกจากระบบสำเร็จ'
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการออกจากระบบ'
    });
  }
};

/**
 * ส่งอีเมลรีเซ็ตรหัสผ่าน
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists with this email
    const userResult = await db.query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ไม่พบอีเมลนี้ในระบบ'
      });
    }

    // Generate reset password token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // Expires in 1 hour

    // Save token to database
    await db.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
      [resetToken, resetTokenExpiry, email]
    );

    // Send email with reset link
    try {
      await sendResetPasswordEmail(email, resetToken);
      
      res.json({
        status: 'success',
        message: 'ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว'
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      
      // Revert token if email fails
      await db.query(
        'UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE email = $1',
        [email]
      );
      
      throw new Error('ไม่สามารถส่งอีเมลได้');
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการดำเนินการ',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset password with token
 */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Check token and expiry
    const userResult = await db.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Reset password link is invalid or has expired'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and clear token
    await db.query(
      'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL, updated_at = NOW() WHERE reset_password_token = $2',
      [hashedPassword, token]
    );

    res.json({
      status: 'success',
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while resetting your password'
    });
  }
};

export {
  register,
  login,
  getProfile,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword
}; 