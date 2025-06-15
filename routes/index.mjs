import express from 'express';
import authRoutes from './authRoutes.mjs';
import userRoutes from './userRoutes.mjs';
import postRoutes from './postRoutes.mjs';
import categoryRoutes from './categoryRoutes.mjs';
import commentRoutes from './commentRoutes.mjs';
import tagRoutes from './tagRoutes.mjs';
import adminCategoryRoutes from './admin/categoryRoutes.mjs';
import userManagementRoutes from './userManagement.mjs';
import likeRoutes from './likeRoutes.mjs';

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/categories', categoryRoutes);
router.use('/comments', commentRoutes);
router.use('/tags', tagRoutes);

// Admin routes
router.use('/admin/categories', adminCategoryRoutes);
router.use('/admin/users', userManagementRoutes);
router.use('/likes', likeRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

export default router; 