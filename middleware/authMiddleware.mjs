import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../utils/db.mjs';

dotenv.config();

/**
 * Middleware สำหรับตรวจสอบ JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // รูปแบบ: Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ 
      status: 'error',
      message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' 
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 'error',
        message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(403).json({ 
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง' 
    });
  }
};

/**
 * Middleware สำหรับตรวจสอบบทบาทของผู้ใช้
 * @param {string[]} roles - บทบาทที่อนุญาตให้เข้าถึง
 */
const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      // ตรวจสอบว่ามี userId จาก authenticateToken middleware
      if (!req.userId) {
        return res.status(401).json({ 
          status: 'error',
          message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' 
        });
      }
      
      // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
      const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          status: 'error',
          message: 'ไม่พบข้อมูลผู้ใช้' 
        });
      }
      
      const userRole = result.rows[0].role;
      
      // ตรวจสอบว่าผู้ใช้มีบทบาทที่อนุญาตหรือไม่
      if (!roles.includes(userRole)) {
        return res.status(403).json({ 
          status: 'error',
          message: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้' 
        });
      }
      
      // เก็บบทบาทของผู้ใช้ในตัวแปร req เพื่อใช้ในขั้นตอนต่อไป
      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Role checking error:', error.message);
      return res.status(500).json({ 
        status: 'error',
        message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' 
      });
    }
  };
};

/**
 * Middleware สำหรับตรวจสอบว่าผู้ใช้เป็นเจ้าของข้อมูลหรือไม่
 * ใช้สำหรับการอัปเดตหรือลบข้อมูลที่ต้องการให้แก้ไขได้เฉพาะเจ้าของ
 * @param {string} paramName - ชื่อพารามิเตอร์ที่เก็บ ID ของข้อมูล (เช่น 'id', 'userId')
 * @param {string} tableName - ชื่อตารางในฐานข้อมูล (เช่น 'posts', 'comments')
 * @param {string} ownerField - ชื่อฟิลด์ที่เก็บ ID ของเจ้าของข้อมูล (เช่น 'user_id', 'author_id')
 */
const checkOwnership = (paramName, tableName, ownerField) => {
  return async (req, res, next) => {
    try {
      // ตรวจสอบว่ามี userId จาก authenticateToken middleware
      if (!req.userId) {
        return res.status(401).json({ 
          status: 'error',
          message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' 
        });
      }
      
      const itemId = req.params[paramName];
      
      if (!itemId) {
        return res.status(400).json({ 
          status: 'error',
          message: 'ID ไม่ถูกต้อง' 
        });
      }
      
      // ตรวจสอบจากฐานข้อมูล
      const query = `SELECT ${ownerField} FROM ${tableName} WHERE id = $1`;
      const result = await pool.query(query, [itemId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          status: 'error',
          message: 'ไม่พบข้อมูล' 
        });
      }
      
      const ownerId = result.rows[0][ownerField];
      
      // ถ้าผู้ใช้ไม่ใช่เจ้าของและไม่ใช่ admin
      if (ownerId !== req.userId && req.userRole !== 'admin') {
        return res.status(403).json({ 
          status: 'error',
          message: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Ownership checking error:', error.message);
      return res.status(500).json({ 
        status: 'error',
        message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' 
      });
    }
  };
};

export const protect = async (req, res, next) => {
  try {
    let token;

    // ตรวจสอบว่ามี token ใน header หรือไม่
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'กรุณาเข้าสู่ระบบก่อน'
      });
    }

    // ตรวจสอบความถูกต้องของ token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
    const result = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'ไม่พบผู้ใช้งานนี้ในระบบ'
      });
    }

    // เพิ่มข้อมูลผู้ใช้ไว้ใน request object
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      status: 'error',
      message: 'ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่'
    });
  }
};

export {
  authenticateToken,
  checkRole,
  checkOwnership
}; 