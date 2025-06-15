import Article from '../models/Article.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/articles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

export const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Create new article
export const createArticle = async (req, res) => {
  try {
    const { title, introduction, content, categoryId, status } = req.body;
    const thumbnailImage = req.file ? req.file.path : null;

    const article = await Article.create({
      title,
      introduction,
      content,
      thumbnailImage,
      categoryId,
      status,
      authorId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: article
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating article',
      error: error.message
    });
  }
};

// Get all articles
export const getAllArticles = async (req, res) => {
  try {
    const articles = await Article.findAll({
      include: [
        { model: Category, attributes: ['name'] },
        { model: User, attributes: ['username'] }
      ]
    });

    res.json({
      success: true,
      data: articles
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching articles',
      error: error.message
    });
  }
};

// Get article by ID
export const getArticleById = async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id, {
      include: [
        { model: Category, attributes: ['name'] },
        { model: User, attributes: ['username'] }
      ]
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching article',
      error: error.message
    });
  }
};

// Update article
export const updateArticle = async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Check if user is the author
    if (article.authorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this article'
      });
    }

    const { title, introduction, content, categoryId, status } = req.body;
    
    // Handle thumbnail update if new file is uploaded
    let thumbnailImage = article.thumbnailImage;
    if (req.file) {
      // Delete old thumbnail if exists
      if (article.thumbnailImage) {
        fs.unlink(article.thumbnailImage, (err) => {
          if (err) console.error('Error deleting old thumbnail:', err);
        });
      }
      thumbnailImage = req.file.path;
    }

    await article.update({
      title,
      introduction,
      content,
      thumbnailImage,
      categoryId,
      status
    });

    res.json({
      success: true,
      message: 'Article updated successfully',
      data: article
    });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating article',
      error: error.message
    });
  }
};

// Delete article
export const deleteArticle = async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Check if user is the author
    if (article.authorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this article'
      });
    }

    // Delete thumbnail if exists
    if (article.thumbnailImage) {
      fs.unlink(article.thumbnailImage, (err) => {
        if (err) console.error('Error deleting thumbnail:', err);
      });
    }

    await article.destroy();

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting article',
      error: error.message
    });
  }
}; 