import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment
} from '../controllers/commentController.mjs';

const router = express.Router();

// Validation middleware
const commentValidation = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content cannot be empty')
    .isLength({ min: 2, max: 1000 }).withMessage('Comment must be between 2-1000 characters')
    .matches(/^[ก-๙a-zA-Z0-9\s!@#$%^&*(),.?":{}|<>]+$/).withMessage('Comment contains invalid characters'),
  body('post_id')
    .isInt().withMessage('Invalid post ID')
    .notEmpty().withMessage('Post ID is required')
];

// Routes
router.post('/', authenticateToken, commentValidation, validateRequest, createComment);
router.get('/post/:post_id', getCommentsByPost);
router.put('/:id', authenticateToken, commentValidation, validateRequest, updateComment);
router.delete('/:id', authenticateToken, deleteComment);

export default router; 