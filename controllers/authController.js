import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.js';

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // ค้นหาผู้ใช้จากอีเมล
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // ตรวจสอบรหัสผ่าน
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid password.' });
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
        res.status(500).json({ message: 'Error logging in.' });
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
        res.status(500).json({ message: 'Error checking user role.' });
    }
}; 