import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.js';

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // ค้นหาผู้ใช้จากอีเมล
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
        }

        // ตรวจสอบรหัสผ่าน
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        }

        // สร้าง token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // ส่งข้อมูลกลับไป
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    }
};

export const checkUserRole = async (req, res) => {
    try {
        const user = req.user;
        res.json({
            role: user.role,
            redirectUrl: user.role === 'admin' ? '/admin' : '/'
        });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' });
    }
}; 