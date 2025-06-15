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
  body('username').trim().isLength({ min: 3 }).withMessage('ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร'),
  body('email').isEmail().withMessage('อีเมลไม่ถูกต้อง'),
  body('password').isLength({ min: 6 }).withMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'),
  body('full_name').optional().trim().notEmpty().withMessage('ชื่อ-นามสกุลไม่สามารถเป็นค่าว่างได้')
];

const loginValidation = [
  body('email', 'อีเมลไม่ถูกต้อง').optional(),
  body('username', 'กรุณากรอกชื่อผู้ใช้').optional(),
  body().custom((value) => {
    if (!value.email && !value.username) {
      throw new Error('กรุณากรอกอีเมลหรือชื่อผู้ใช้');
    }
    return true;
  }),
  body('password', 'กรุณากรอกรหัสผ่าน').notEmpty()
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('อีเมลไม่ถูกต้อง')
];

const resetPasswordValidation = [
  body('password').isLength({ min: 6 }).withMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
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
        message: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว'
      });
    }

    // ส่งกลับข้อมูลว่า token ถูกต้อง
    res.json({
      status: 'success',
      message: 'Token ถูกต้อง'
    });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ token'
    });
  }
});

router.post('/reset-password/:token', resetPasswordValidation, validateRequest, resetPassword);

export default router; 