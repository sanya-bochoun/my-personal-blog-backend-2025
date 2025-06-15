import express from 'express';
import { login, checkUserRole } from '../controllers/authController.js';
import { checkRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route สำหรับ login
router.post('/login', login);

// Route สำหรับตรวจสอบ role
router.get('/check-role', checkRole, checkUserRole);

export default router; 