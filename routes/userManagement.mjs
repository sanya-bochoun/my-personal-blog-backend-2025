import express from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/user.mjs';
import { authenticateToken, authorizeAdmin, authorizeEditorOrAdmin } from '../middleware/auth.mjs';
import bcrypt from 'bcrypt';

const router = express.Router();

// Middleware to check authentication
router.use(authenticateToken);

// GET /api/admin/users - Get all users with pagination
router.get('/', authorizeEditorOrAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const users = await User.findAll({ page, limit, search });
    const totalUsers = await User.count({ search });
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalUsers,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users/:id - Get user details
router.get('/:id', authorizeEditorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/status - Update user status (active/locked)
router.put('/:id/status', 
  authorizeEditorOrAdmin,
  body('status').isIn(['active', 'locked']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      
      // ตรวจสอบว่าผู้ใช้ที่จะถูกแก้ไขเป็น admin หรือไม่
      const targetUser = await User.findById(id);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // ถ้าผู้ใช้ปัจจุบันเป็น editor และพยายามแก้ไข admin
      if (req.user.role === 'editor' && targetUser.role === 'admin') {
        return res.status(403).json({ error: 'Editors cannot modify admin accounts' });
      }

      const { status } = req.body;
      const user = await User.updateStatus(id, status);
      res.json(user);
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admin/users/:id/role - Update user role (admin only)
router.put('/:id/role',
  authorizeAdmin,
  body('role').isIn(['user', 'admin', 'editor']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { role } = req.body;

      const user = await User.updateRole(id, role);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/:id', authorizeEditorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // ตรวจสอบว่าผู้ใช้ที่จะถูกลบเป็น admin หรือไม่
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ถ้าผู้ใช้ปัจจุบันเป็น editor และพยายามลบ admin
    if (req.user.role === 'editor' && targetUser.role === 'admin') {
      return res.status(403).json({ error: 'Editors cannot delete admin accounts' });
    }

    const success = await User.delete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/reset-password - Reset user password (admin only)
router.put('/:id/reset-password',
  authorizeEditorOrAdmin,
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      // ตรวจสอบว่าผู้ใช้ที่จะถูกแก้ไขเป็น admin หรือไม่
      const targetUser = await User.findById(id);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // ถ้าผู้ใช้ปัจจุบันเป็น editor และพยายามแก้ไข admin
      if (req.user.role === 'editor' && targetUser.role === 'admin') {
        return res.status(403).json({ error: 'Editors cannot modify admin accounts' });
      }

      // เข้ารหัสรหัสผ่านใหม่
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // อัปเดตรหัสผ่าน
      await User.updatePassword(id, hashedPassword);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

export default router; 