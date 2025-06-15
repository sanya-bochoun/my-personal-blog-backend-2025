import express from 'express';
import { 
  createArticle, 
  getAllArticles, 
  getArticleById, 
  updateArticle, 
  deleteArticle,
  upload
} from '../../controllers/admin/articleController.mjs';
import { authenticateToken, authorizeAdmin, authorizeEditorOrAdmin } from '../../middleware/auth.mjs';

const router = express.Router();

// กำหนดให้ทุก routes ต้องผ่านการตรวจสอบ token และต้องเป็น admin หรือ editor
router.use(authenticateToken, authorizeEditorOrAdmin);

/**
 * @route   POST /api/admin/articles
 * @desc    สร้างบทความใหม่
 * @access  Private (Admin and Editor)
 */
router.post('/', upload.single('thumbnail_image'), createArticle);

/**
 * @route   GET /api/admin/articles
 * @desc    ดึงข้อมูลบทความทั้งหมด
 * @access  Private (Admin and Editor)
 */
router.get('/', getAllArticles);

/**
 * @route   GET /api/admin/articles/:id
 * @desc    ดึงข้อมูลบทความตาม ID
 * @access  Private (Admin and Editor)
 */
router.get('/:id', getArticleById);

/**
 * @route   PUT /api/admin/articles/:id
 * @desc    อัปเดตข้อมูลบทความ
 * @access  Private (Admin and Editor)
 */
router.put('/:id', upload.single('thumbnail_image'), updateArticle);

/**
 * @route   DELETE /api/admin/articles/:id
 * @desc    ลบบทความ
 * @access  Private (Admin and Editor)
 */
router.delete('/:id', deleteArticle);

export default router; 