import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} from '../controllers/notificationController.mjs';
import { protect } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// ต้องผ่านการ authenticate ก่อนเข้าถึง routes เหล่านี้
router.use(protect);

// ดึงรายการแจ้งเตือนทั้งหมด
router.get('/', getNotifications);

// ทำเครื่องหมายว่าอ่านแล้ว
router.put('/:id/read', markAsRead);

// ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว
router.put('/read-all', markAllAsRead);

// ลบการแจ้งเตือน
router.delete('/:id', deleteNotification);

export default router; 