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
        message: 'Authentication token not found'
      });
    }
    
    // ตรวจสอบความถูกต้องของ token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        // Token หมดอายุหรือไม่ถูกต้อง - return 401 (Unauthorized)
        console.error('Token verification error:', err.message);
        return res.status(401).json({
          success: false,
          message: 'Token is invalid or expired. Please log in again'
        });
      }
      
      // ดึงข้อมูลผู้ใช้
      try {
        const user = await User.findById(decodedToken.userId);
        
        if (!user) {
          console.error('User not found for userId:', decodedToken.userId);
          return res.status(403).json({
            success: false,
            message: 'User account not found'
          });
        }
        
        // ตรวจสอบว่า user ถูก lock หรือไม่
        if (user.is_locked) {
          return res.status(403).json({
            success: false,
            message: 'Your account has been locked. Please contact the administrator'
          });
        }
        
        // เก็บข้อมูลผู้ใช้ในตัวแปล req เพื่อใช้ในขั้นตอนต่อไป
        req.user = user;
        next();
      } catch (dbError) {
        console.error('Database error in authenticateToken:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Failed to verify user information'
        });
      }
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการตรวจสอบ token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify token'
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
        message: 'Please log in first'
      });
    }
    
    // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }
    
    // ผู้ใช้เป็น admin สามารถดำเนินการต่อได้
    next();
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify permissions'
    });
  }
};

export const authorizeEditorOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied' });
    }
};

// Optional authentication - ไม่ error ถ้าไม่มี token แต่จะ set req.user ถ้ามี
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      // ไม่มี token ก็ให้ผ่านไปได้ (ไม่ error)
      req.user = null;
      return next();
    }
    
    // ถ้ามี token ให้ตรวจสอบ
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        // Token ไม่ถูกต้อง แต่ไม่ error ให้ผ่านไปได้
        req.user = null;
        return next();
      }
      
      // ดึงข้อมูลผู้ใช้
      const user = await User.findById(decodedToken.userId);
      
      if (!user) {
        req.user = null;
        return next();
      }
      
      // เก็บข้อมูลผู้ใช้ในตัวแปล req
      req.user = user;
      next();
    });
  } catch (error) {
    // เกิด error ก็ให้ผ่านไปได้ (ไม่ error)
    req.user = null;
    next();
  }
}; 