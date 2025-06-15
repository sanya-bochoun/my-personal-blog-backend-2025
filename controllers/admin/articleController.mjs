import { Article } from '../../models/Article.mjs';
import { Category } from '../../models/Category.mjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ตั้งค่า multer สำหรับอัพโหลดไฟล์
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/articles';
    // สร้างโฟลเดอร์ถ้ายังไม่มี
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('ประเภทไฟล์ไม่ถูกต้อง อนุญาตเฉพาะ JPEG, PNG, GIF และ WEBP เท่านั้น'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // จำกัดขนาด 5MB
  }
});

// สร้างบทความใหม่
export const createArticle = async (req, res) => {
  try {
    const { title, introduction, content, category_id, status } = req.body;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!title || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'ต้องระบุชื่อบทความและหมวดหมู่'
      });
    }

    // สร้างข้อมูลบทความ
    const articleData = {
      title,
      content: content || '',
      category_id: parseInt(category_id),
      author_id: req.user.id, // ได้จาก middleware การยืนยันตัวตน
      introduction: introduction || '', // จะถูกบันทึกเป็น excerpt ในตาราง posts
      status: status || 'draft', // จะถูกแปลงเป็น Boolean (published) ในโมเดล
      thumbnail_image: req.file ? `/uploads/articles/${req.file.filename}` : null // จะถูกบันทึกเป็น featured_image
    };

    // บันทึกลงฐานข้อมูล
    const article = await Article.create(articleData);

    res.status(201).json({
      success: true,
      message: 'สร้างบทความสำเร็จ',
      data: article
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการสร้างบทความ:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างบทความ',
      error: error.message
    });
  }
};

// ดึงข้อมูลบทความทั้งหมด
export const getAllArticles = async (req, res) => {
  try {
    const articles = await Article.findAll({
      include: [
        { 
          model: Category,
          as: 'category',
          attributes: ['id', 'name'] 
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: articles.length,
      data: articles
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลบทความ:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบทความ',
      error: error.message
    });
  }
};

// ดึงข้อมูลบทความตาม ID
export const getArticleById = async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id, {
      include: [
        { 
          model: Category,
          as: 'category',
          attributes: ['id', 'name'] 
        }
      ]
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบบทความ'
      });
    }

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลบทความ:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบทความ',
      error: error.message
    });
  }
};

// อัปเดตบทความ
export const updateArticle = async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบบทความ'
      });
    }

    const { title, introduction, content, category_id, status } = req.body;
    
    // จัดการรูปภาพหากมีการอัปโหลดใหม่
    let thumbnail_image = article.thumbnail_image;
    if (req.file) {
      // ลบรูปเก่าหากมี
      if (article.thumbnail_image) {
        const oldImagePath = path.join(process.cwd(), article.thumbnail_image.replace('/', ''));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      thumbnail_image = `/uploads/articles/${req.file.filename}`;
    }

    // อัปเดตข้อมูล
    const updatedArticle = await Article.update(req.params.id, {
      title: title || article.title,
      introduction: introduction !== undefined ? introduction : article.introduction,
      content: content !== undefined ? content : article.content,
      thumbnail_image,
      category_id: category_id ? parseInt(category_id) : article.category_id,
      status: status || article.status
    });

    res.json({
      success: true,
      message: 'อัปเดตบทความสำเร็จ',
      data: updatedArticle
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการอัปเดตบทความ:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตบทความ',
      error: error.message
    });
  }
};

// ลบบทความ
export const deleteArticle = async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบบทความ'
      });
    }

    // ลบรูปภาพถ้ามี
    if (article.thumbnail_image) {
      const imagePath = path.join(process.cwd(), article.thumbnail_image.replace('/', ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // ลบบทความจากฐานข้อมูล
    await Article.destroy(req.params.id);

    res.json({
      success: true,
      message: 'ลบบทความสำเร็จ'
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการลบบทความ:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบบทความ',
      error: error.message
    });
  }
}; 