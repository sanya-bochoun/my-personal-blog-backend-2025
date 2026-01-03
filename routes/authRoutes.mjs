import express from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { validateRequest } from '../middleware/validateRequest.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import { 
  register, 
  login, 
  getProfile, 
  refreshToken, 
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail
} from '../controllers/authController.mjs';
import db from '../utils/db.mjs';

const router = express.Router();

// Rate limiters for auth routes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // 5 in production, 20 in development
  message: {
    status: 'error',
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting in development if explicitly disabled
    return process.env.DISABLE_RATE_LIMIT === 'true';
  }
});

// Rate limiter for registration - more lenient in development
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 20, // 3 in production, 20 in development
  message: {
    status: 'error',
    message: 'Too many registration attempts, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development if explicitly disabled
    return process.env.DISABLE_RATE_LIMIT === 'true';
  }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 10, // 3 in production, 10 in development
  message: {
    status: 'error',
    message: 'Too many password reset requests, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development if explicitly disabled
    return process.env.DISABLE_RATE_LIMIT === 'true';
  }
});

// Validation middleware
const registerValidation = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  body('email').isEmail().withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('full_name').optional().trim().notEmpty().withMessage('Full name cannot be empty')
];

const loginValidation = [
  body('email', 'Invalid email format').optional(),
  body('username', 'Please enter username').optional(),
  body().custom((value) => {
    if (!value.email && !value.username) {
      throw new Error('Please provide email or username');
    }
    return true;
  }),
  body('password', 'Please enter password').notEmpty()
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Invalid email format')
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const resendVerificationValidation = [
  body('email').isEmail().withMessage('Invalid email format')
];

// Routes
router.post('/register', registerLimiter, registerValidation, validateRequest, register);
router.post('/login', loginLimiter, loginValidation, validateRequest, login);
router.post('/logout', authenticateToken, logout);
router.post('/refresh-token', refreshToken);
router.get('/profile', authenticateToken, getProfile);

// Email verification
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationValidation, validateRequest, resendVerificationEmail);

// Password reset
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidation, validateRequest, forgotPassword);

// เพิ่ม GET route สำหรับแสดงหน้า reset password
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // ตรวจสอบความถูกต้องของ token
    const userResult = await db.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Reset password link is invalid or expired'
      });
    }

    // ส่งกลับข้อมูลว่า token ถูกต้อง
    res.json({
      status: 'success',
      message: 'Token is valid'
    });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to validate token'
    });
  }
});

router.post('/reset-password/:token', resetPasswordValidation, validateRequest, resetPassword);

export default router; 