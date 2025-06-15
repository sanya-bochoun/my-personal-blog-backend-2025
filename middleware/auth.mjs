import jwt from 'jsonwebtoken';
import { User } from '../models/user.mjs';

// ตรวจสอบ token
export const authenticateToken = async (req, res, next) => {
  try {
    // รับ token จาก header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ Authentication token'
      });
    }
    
    // ตรวจสอบความถูกต้องของ token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Token ไม่ถูกต้องหรือหมดอายุ'
        });
      }
      
      // ดึงข้อมูลผู้ใช้
      const user = await User.findById(decodedToken.userId);
      
      if (!user) {
        return res.status(403).json({
          success: false,
          message: 'ไม่พบบัญชีผู้ใช้'
        });
      }
      
      // เก็บข้อมูลผู้ใช้ในตัวแปล req เพื่อใช้ในขั้นตอนต่อไป
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการตรวจสอบ token:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ token'
    });
  }
};

// ตรวจสอบสิทธิ์ admin
export const authorizeAdmin = (req, res, next) => {
  try {
    // ตรวจสอบว่ามีข้อมูลผู้ใช้หรือไม่ (ต้องผ่าน authenticateToken ก่อน)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'โปรดเข้าสู่ระบบก่อน'
      });
    }
    
    // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์ในการเข้าถึงส่วนนี้'
      });
    }
    
    // ผู้ใช้เป็น admin สามารถดำเนินการต่อได้
    next();
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
    });
  }
};

export const authorizeEditorOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) {
        next();
    } else {
        res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }
}; 