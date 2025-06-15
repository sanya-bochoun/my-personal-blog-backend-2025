import express from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { validateRequest } from '../middleware/validateRequest.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  resetPassword
} from '../controllers/userController.mjs';

const router = express.Router();

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('ไฟล์ที่อัพโหลดต้องเป็นรูปภาพเท่านั้น'));
    }
  }
});

// Validation middleware
const profileValidation = [
  body('full_name').trim().isLength({ min: 2 }).withMessage('ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร'),
  body('username').trim().isLength({ min: 3 }).withMessage('ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร ตัวเลข - หรือ _ เท่านั้น'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('bio').optional().trim()
];

const passwordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, profileValidation, validateRequest, updateProfile);
router.post('/avatar', authenticateToken, upload.single('avatar'), uploadAvatar);
router.put('/password', authenticateToken, passwordValidation, validateRequest, changePassword);

// Protected routes (ต้องล็อกอินก่อน)
router.use(authenticateToken);

// เปลี่ยนรหัสผ่าน
router.put('/reset-password', resetPassword);

export default router; 