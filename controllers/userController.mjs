import bcrypt from 'bcrypt';
import db from '../utils/db.mjs';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { cloudinary } from '../config/cloudinary.mjs';
import { Readable } from 'stream';

/**
 * อัปเดตโปรไฟล์ผู้ใช้
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, username, bio, avatar_url } = req.body;

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const userCheck = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // ตรวจสอบว่า username ซ้ำหรือไม่ (ถ้ามีการเปลี่ยน)
    if (username && username !== userCheck.rows[0].username) {
      const usernameCheck = await db.query('SELECT * FROM users WHERE username = $1 AND id != $2', [username, userId]);
      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น'
        });
      }
    }

    // อัปเดตข้อมูลผู้ใช้
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updateFields.push(`full_name = $${paramIndex}`);
      updateValues.push(full_name);
      paramIndex++;
    }

    if (username !== undefined) {
      updateFields.push(`username = $${paramIndex}`);
      updateValues.push(username);
      paramIndex++;
    }

    if (bio !== undefined) {
      updateFields.push(`bio = $${paramIndex}`);
      updateValues.push(bio);
      paramIndex++;
    }

    if (avatar_url !== undefined) {
      updateFields.push(`avatar_url = $${paramIndex}`);
      updateValues.push(avatar_url);
      paramIndex++;
    }

    // ถ้าไม่มีข้อมูลที่ต้องการอัปเดต
    if (updateFields.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'ไม่มีข้อมูลที่ต้องการอัปเดต'
      });
    }

    // อัปเดตเวลาแก้ไข
    updateFields.push(`updated_at = $${paramIndex}`);
    updateValues.push(new Date());
    paramIndex++;

    // เพิ่ม ID ของผู้ใช้ในพารามิเตอร์
    updateValues.push(userId);

    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, email, full_name, bio, avatar_url, role, created_at, updated_at
    `;

    const result = await db.query(updateQuery, updateValues);
    const updatedUser = result.rows[0];

    res.json({
      status: 'success',
      message: 'อัปเดตโปรไฟล์สำเร็จ',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * แปลง Buffer เป็น Stream
 */
const bufferToStream = (buffer) => {
  const readable = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    },
  });
  return readable;
};

/**
 * อัปโหลดรูปภาพโปรไฟล์
 */
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // ตรวจสอบว่ามีไฟล์อัปโหลดหรือไม่
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'ไม่พบไฟล์รูปภาพ'
      });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const userCheck = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // อัปโหลดไฟล์ไปยัง Cloudinary
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'avatars',
        public_id: `user_${userId}_${Date.now()}`,
        transformation: [
          { width: 500, height: 500, crop: 'fill' },
          { quality: 'auto' }
        ]
      },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({
            status: 'error',
            message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ'
          });
        }

        try {
          // อัปเดตข้อมูลผู้ใช้ในฐานข้อมูล
          const updateResult = await db.query(
            `UPDATE users 
             SET avatar_url = $1, updated_at = NOW() 
             WHERE id = $2 
             RETURNING id, username, email, full_name, bio, avatar_url, role, created_at, updated_at`,
            [result.secure_url, userId]
          );

          const updatedUser = updateResult.rows[0];

          res.json({
            status: 'success',
            message: 'อัปโหลดรูปภาพโปรไฟล์สำเร็จ',
            data: {
              user: updatedUser
            }
          });
        } catch (dbError) {
          console.error('Database update error:', dbError);
          res.status(500).json({
            status: 'error',
            message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้'
          });
        }
      }
    );

    // ส่งไฟล์ไปยัง Cloudinary
    bufferToStream(req.file.buffer).pipe(stream);

  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพโปรไฟล์',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * เปลี่ยนรหัสผ่าน
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่และดึงรหัสผ่านปัจจุบัน
    const userResult = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    const user = userResult.rows[0];

    // ตรวจสอบรหัสผ่านปัจจุบัน
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
      });
    }

    // เข้ารหัสรหัสผ่านใหม่
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // อัปเดตรหัสผ่านในฐานข้อมูล
    await db.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({
      status: 'success',
      message: 'เปลี่ยนรหัสผ่านสำเร็จ'
    });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * ดึงข้อมูลโปรไฟล์
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      'SELECT id, username, email, full_name, bio, avatar_url, role, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    const user = result.rows[0];

    res.json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * เปลี่ยนรหัสผ่านผู้ใช้
 */
export const resetPassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // ตรวจสอบว่ามีข้อมูลครบถ้วน
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // ตรวจสอบว่ารหัสผ่านใหม่และยืนยันรหัสผ่านตรงกัน
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน'
      });
    }

    // ตรวจสอบความยาวรหัสผ่านใหม่
    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
      });
    }

    // ดึงข้อมูลผู้ใช้
    const userResult = await db.query('SELECT password FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // ตรวจสอบรหัสผ่านปัจจุบัน
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      userResult.rows[0].password
    );

    if (!isValidPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
      });
    }

    // เข้ารหัสรหัสผ่านใหม่
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // อัพเดทรหัสผ่าน
    await db.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({
      status: 'success',
      message: 'เปลี่ยนรหัสผ่านสำเร็จ'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
    });
  }
};

export {
  updateProfile,
  uploadAvatar,
  changePassword
}; 