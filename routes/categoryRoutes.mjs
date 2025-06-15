import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.mjs';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.mjs';
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryPosts
} from '../controllers/categoryController.mjs';

const router = express.Router();

// Validation middleware
const categoryValidation = [
  body('name').trim().notEmpty().withMessage('ชื่อหมวดหมู่ไม่สามารถเป็นค่าว่างได้'),
  body('description').optional().trim()
];

// Routes
router.post('/', authenticateToken, categoryValidation, createCategory);
router.get('/', getAllCategories);
router.get('/:id/posts', getCategoryPosts);
router.put('/:id', authenticateToken, categoryValidation, updateCategory);
router.delete('/:id', authenticateToken, deleteCategory);

export default router; 