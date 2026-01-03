import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import db from '../utils/db.mjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { sendResetPasswordEmail, sendVerificationEmail } from '../config/email.mjs';

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
        message: 'Email or username already exists'
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
        `INSERT INTO users (username, email, password, full_name, role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, username, email, full_name, role, is_verified, created_at`,
        [username, email, hashedPassword, full_name || null, 'user', false]
      );

      const newUser = result.rows[0];

      // สร้าง email verification token
      console.log('[REGISTER] Generating verification token');
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      console.log('[REGISTER] Token length:', verificationToken.length);
      console.log('[REGISTER] Token (first 20 chars):', verificationToken.substring(0, 20));
      console.log('[REGISTER] Token expires at:', verificationExpiry);

      // บันทึก verification token ลงฐานข้อมูล
      try {
        const insertResult = await db.query(
          `INSERT INTO verification_tokens (user_id, token, type, expires_at)
           VALUES ($1, $2, $3, $4)
           RETURNING id, token, expires_at`,
          [newUser.id, verificationToken, 'email_verification', verificationExpiry]
        );
        console.log('[REGISTER] Token saved to database:', {
          id: insertResult.rows[0].id,
          tokenLength: insertResult.rows[0].token.length,
          tokenPreview: insertResult.rows[0].token.substring(0, 20) + '...',
          expiresAt: insertResult.rows[0].expires_at
        });
        
        // Verify the saved token matches what we sent
        if (insertResult.rows[0].token !== verificationToken) {
          console.error('[REGISTER] WARNING: Token mismatch! Saved token does not match generated token');
          console.error('[REGISTER] Generated:', verificationToken);
          console.error('[REGISTER] Saved:', insertResult.rows[0].token);
        }
      } catch (dbError) {
        console.error('[REGISTER] Error saving token to database:', dbError);
        console.error('[REGISTER] Token that failed:', verificationToken);
        console.error('[REGISTER] Token length:', verificationToken.length);
        throw dbError;
      }

      // ส่งอีเมลยืนยัน
      try {
        console.log('[REGISTER] Sending verification email');
        await sendVerificationEmail(email, verificationToken);
      } catch (emailError) {
        console.error('[REGISTER] Error sending verification email:', emailError);
        // ไม่ throw error เพราะ user ถูกสร้างแล้ว สามารถ resend ได้ภายหลัง
      }

      // สร้าง JWT token
      console.log('[REGISTER] Generating tokens');
      const accessToken = jwt.sign(
        { userId: newUser.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // สร้าง refresh token
      const refreshToken = jwt.sign(
        { userId: newUser.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
      );

      // บันทึก refresh token ลงฐานข้อมูล
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 วัน
      
      await db.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [newUser.id, refreshToken, expiresAt]
      );

      console.log('[REGISTER] Registration successful');
      res.status(201).json({
        status: 'success',
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: newUser,
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
          message: 'Database tables have not been created. Please run migrations first',
          details: dbError.message
        });
      }
      throw dbError; // โยน error ไปที่ catch ข้างนอก
    }
  } catch (error) {
    console.error('[REGISTER] Error during registration:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
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
           id, username, email, password, role, full_name, is_locked, is_verified,
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
           id, username, email, password, role, full_name, is_locked, is_verified,
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
        message: 'Please provide email or username'
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
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];
    console.log('[LOGIN] User found:', user);

    // ตรวจสอบว่าบัญชีถูกล็อคหรือไม่
    if (user.is_locked) {
      console.log('[LOGIN] Account is locked');
      return res.status(403).json({
        status: 'error',
        message: 'This account has been locked. Please contact the administrator'
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
         message: 'Invalid email or password'
       });
     }

     // ตรวจสอบว่าอีเมลถูก verify แล้วหรือยัง
     if (!user.is_verified) {
       console.log('[LOGIN] Email not verified');
       return res.status(403).json({
         status: 'error',
         message: 'Please verify your email before logging in. Check your email for the verification link.',
         requiresVerification: true
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
      message: 'Login successful',
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
      message: 'Login failed'
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
        message: 'User not found'
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
      message: 'Failed to fetch user profile'
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
        message: 'Refresh token is invalid or expired'
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
      message: 'Failed to refresh token'
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
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Logout failed'
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
        message: 'Email not found'
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
        message: 'Password reset link has been sent to your email'
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      
      // Revert token if email fails
      await db.query(
        'UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE email = $1',
        [email]
      );
      
      // Provide more specific error message
      const errorMessage = emailError.message || 'Failed to send email';
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    const errorMessage = error.message || 'An error occurred';
    res.status(500).json({
      status: 'error',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify email with token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    console.log('[VERIFY_EMAIL] Received token:', token ? `${token.substring(0, 10)}...` : 'missing');
    console.log('[VERIFY_EMAIL] Full token length:', token ? token.length : 0);
    console.log('[VERIFY_EMAIL] Full token:', token);

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification token is required'
      });
    }

    // Check if token exists and is valid
    console.log('[VERIFY_EMAIL] Token length:', token ? token.length : 0);
    console.log('[VERIFY_EMAIL] Querying verification_tokens table...');
    
    // First, check if token exists at all (without expiry check)
    const tokenExistsCheck = await db.query(
      `SELECT vt.token, vt.expires_at, vt.type
       FROM verification_tokens vt
       WHERE vt.token = $1`,
      [token]
    );
    console.log('[VERIFY_EMAIL] Token exists check:', {
      found: tokenExistsCheck.rows.length > 0,
      tokenLength: tokenExistsCheck.rows.length > 0 ? tokenExistsCheck.rows[0].token.length : 0,
      type: tokenExistsCheck.rows.length > 0 ? tokenExistsCheck.rows[0].type : null,
      expiresAt: tokenExistsCheck.rows.length > 0 ? tokenExistsCheck.rows[0].expires_at : null
    });

    const tokenResult = await db.query(
      `SELECT vt.user_id, vt.expires_at, u.email, u.is_verified
       FROM verification_tokens vt
       INNER JOIN users u ON vt.user_id = u.id
       WHERE vt.token = $1 AND vt.type = $2 AND vt.expires_at > NOW()`,
      [token, 'email_verification']
    );

    console.log('[VERIFY_EMAIL] Token query result (with expiry check):', {
      found: tokenResult.rows.length > 0,
      count: tokenResult.rows.length,
      currentTime: new Date().toISOString()
    });

    if (tokenResult.rows.length === 0) {
      // Check if token exists but expired or wrong type
      const expiredTokenResult = await db.query(
        `SELECT vt.expires_at, u.is_verified, vt.type
         FROM verification_tokens vt
         INNER JOIN users u ON vt.user_id = u.id
         WHERE vt.token = $1`,
        [token]
      );

      console.log('[VERIFY_EMAIL] Checking expired/wrong type token:', {
        found: expiredTokenResult.rows.length > 0,
        type: expiredTokenResult.rows.length > 0 ? expiredTokenResult.rows[0].type : null
      });

      if (expiredTokenResult.rows.length > 0) {
        const { expires_at, is_verified, type } = expiredTokenResult.rows[0];
        
        if (type !== 'email_verification') {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid verification link type'
          });
        }
        
        if (is_verified) {
          return res.status(400).json({
            status: 'error',
            message: 'Email has already been verified'
          });
        }
        
        if (new Date(expires_at) < new Date()) {
          return res.status(400).json({
            status: 'error',
            message: 'Verification link has expired. Please request a new verification email.'
          });
        }
      }

      // Token doesn't exist at all
      return res.status(400).json({
        status: 'error',
        message: 'Verification link is invalid or has expired'
      });
    }

    const { user_id, is_verified } = tokenResult.rows[0];

    // Check if already verified
    if (is_verified) {
      // Delete the token since it's already used
      await db.query(
        'DELETE FROM verification_tokens WHERE token = $1',
        [token]
      );
      return res.status(400).json({
        status: 'error',
        message: 'Email has already been verified'
      });
    }

    // Update user to verified
    console.log('[VERIFY_EMAIL] Updating user to verified:', user_id);
    await db.query(
      'UPDATE users SET is_verified = $1, updated_at = NOW() WHERE id = $2',
      [true, user_id]
    );

    // Delete verification token
    await db.query(
      'DELETE FROM verification_tokens WHERE token = $1',
      [token]
    );

    console.log('[VERIFY_EMAIL] Email verified successfully');
    res.json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('[VERIFY_EMAIL] Verify email error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while verifying your email'
    });
  }
};

/**
 * Resend verification email
 */
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    // Check if user exists
    const userResult = await db.query(
      'SELECT id, email, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Email not found'
      });
    }

    const user = userResult.rows[0];

    // Check if already verified
    if (user.is_verified) {
      return res.status(400).json({
        status: 'error',
        message: 'Email has already been verified'
      });
    }

    // Delete old verification tokens
    await db.query(
      'DELETE FROM verification_tokens WHERE user_id = $1 AND type = $2',
      [user.id, 'email_verification']
    );

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save new token
    await db.query(
      `INSERT INTO verification_tokens (user_id, token, type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, verificationToken, 'email_verification', verificationExpiry]
    );

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken);
      res.json({
        status: 'success',
        message: 'Verification email has been sent'
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Delete token if email fails
      await db.query(
        'DELETE FROM verification_tokens WHERE token = $1',
        [verificationToken]
      );
      throw new Error('Failed to send verification email. Please try again later.');
    }
  } catch (error) {
    console.error('Resend verification email error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'An error occurred while sending verification email'
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
  resetPassword,
  verifyEmail,
  resendVerificationEmail
}; 