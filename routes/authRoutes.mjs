import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import { 
  register, 
  login, 
  getProfile, 
  refreshToken, 
  logout,
  forgotPassword,
  resetPassword 
} from '../controllers/authController.mjs';
import db from '../utils/db.mjs';

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
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
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

// Routes
router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.post('/logout', authenticateToken, logout);
router.post('/refresh-token', refreshToken);
router.get('/profile', authenticateToken, getProfile);

// Email verification
router.post('/verify-email/:token', (req, res) => {
  // TODO: Implement email verification logic
});

// Password reset
router.post('/forgot-password', forgotPasswordValidation, validateRequest, forgotPassword);

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