import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken } from '../middleware/auth.mjs';
import { Article } from '../models/Article.mjs';
import { Category } from '../models/Category.mjs';
import { Op } from 'sequelize';
import { cloudinary } from '../config/cloudinary.mjs';
import { Readable } from 'stream';
import { query } from '../utils/db.mjs';
import { createNotification } from '../controllers/notificationController.mjs';

const router = express.Router();

// Set up multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'articles',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

// Get user's articles
router.get('/', authenticateToken, async (req, res) => {
  try {
    let where = {};
    
    // ถ้าไม่ใช่ admin หรือไม่ได้ขอดูทั้งหมด ให้ดูเฉพาะบทความของตัวเอง
    if (req.user.role !== 'admin' || !req.query.viewAll) {
      where.author_id = req.user.id;
    }

    const articles = await Article.findAll({ where });

    res.json({
      status: 'success',
      data: articles
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch articles'
    });
  }
});

// Search user's articles
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    let where = {};

    // ถ้าไม่ใช่ admin หรือไม่ได้ขอดูทั้งหมด ให้ดูเฉพาะบทความของตัวเอง
    if (req.user.role !== 'admin' || !req.query.viewAll) {
      where.author_id = req.user.id;
    }

    // เพิ่มเงื่อนไขการค้นหาชื่อบทความ
    where.title = { like: `%${q}%` };

    const articles = await Article.findAll({ where });

    res.json({
      status: 'success',
      data: articles
    });
  } catch (error) {
    console.error('Error searching articles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search articles'
    });
  }
});

// Get single article
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);

    if (!article || article.author_id !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Article not found'
      });
    }

    res.json({
      status: 'success',
      data: article
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch article'
    });
  }
});

// Create article
router.post('/', authenticateToken, upload.single('thumbnailImage'), async (req, res) => {
  try {
    const { title, content, categoryId, introduction, status } = req.body;
    const authorId = req.user.id;

    console.log('Creating article:', { title, categoryId, status, hasFile: !!req.file });
    console.log('File info:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer?.length
    } : 'No file');

    if (!title || !categoryId) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and category are required'
      });
    }

    let thumbnailUrl = null;
    if (req.file) {
      try {
        console.log('Uploading to Cloudinary...');
        const result = await uploadToCloudinary(req.file.buffer);
        thumbnailUrl = result.secure_url;
        console.log('Cloudinary upload successful:', thumbnailUrl);
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to upload image'
        });
      }
    } else {
      console.log('No file uploaded');
    }

    const articleData = {
      title,
      content: content || '',
      category_id: parseInt(categoryId),
      author_id: authorId,
      introduction: introduction || '',
      status: status || 'draft',
      thumbnail_url: thumbnailUrl
    };

    console.log('Article data to create:', { ...articleData, thumbnail_url: thumbnailUrl });
    const article = await Article.create(articleData);
    console.log('Article created:', { id: article.id, slug: article.slug, thumbnail_url: article.thumbnail_url });

    // สร้าง notification สำหรับผู้ใช้คนอื่นๆ เมื่อ article ถูก publish
    if (status === 'published') {
      try {
        // ดึงข้อมูลผู้เขียน
        const authorResult = await query(
          'SELECT username, full_name FROM users WHERE id = $1',
          [authorId]
        );
        const author = authorResult.rows[0] || {};
        const authorName = author.full_name || author.username || 'Someone';

        // ดึงผู้ใช้ทั้งหมดยกเว้นผู้เขียน
        const usersResult = await query(
          'SELECT id FROM users WHERE id != $1',
          [authorId]
        );

        // สร้าง notification ให้กับทุกคน (ยกเว้นผู้เขียน)
        // สร้าง notification ให้ user คนแรกเพื่อ emit socket event ไปทุกคน
        if (usersResult.rows.length > 0) {
          const firstUser = usersResult.rows[0];
          
          // สร้าง notification ให้ user คนแรก (จะ emit socket event ไปทุกคน)
          // ตรวจสอบ slug ถ้าไม่มีให้ query ใหม่
          let articleSlug = article.slug;
          if (!articleSlug) {
            const slugResult = await query('SELECT slug FROM posts WHERE id = $1', [article.id]);
            articleSlug = slugResult.rows[0]?.slug || article.id;
          }
          
          await createNotification(
            firstUser.id,
            'post',
            `${authorName} created a new post: ${title}`,
            `/article/${articleSlug}`,
            {
              user_id: authorId,
              post_id: article.id,
              post_title: title,
              post_slug: articleSlug
            }
          );

          // สร้าง notification ให้ user คนอื่นๆ ใน database (ไม่ emit event ซ้ำ)
          if (usersResult.rows.length > 1) {
            // ตรวจสอบ slug ถ้ายังไม่มี
            if (!articleSlug) {
              const slugResult = await query('SELECT slug FROM posts WHERE id = $1', [article.id]);
              articleSlug = slugResult.rows[0]?.slug || article.id;
            }
            
            const notificationData = {
              type: 'post',
              message: `${authorName} created a new post: ${title}`,
              link: `/article/${articleSlug}`,
              data: JSON.stringify({
                user_id: authorId,
                post_id: article.id,
                post_title: title,
                post_slug: articleSlug
              })
            };

            for (const user of usersResult.rows.slice(1)) {
              await query(
                `INSERT INTO notifications (user_id, type, message, link, data)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                  user.id,
                  notificationData.type,
                  notificationData.message,
                  notificationData.link,
                  notificationData.data
                ]
              );
            }
          }
        }
      } catch (notificationError) {
        // ไม่ให้ notification error ทำให้การสร้าง article ล้มเหลว
        console.error('Error creating notifications:', notificationError);
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Article created successfully',
      data: article
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create article'
    });
  }
});

// Update article
router.put('/:id', authenticateToken, upload.single('thumbnailImage'), async (req, res) => {
  try {
    console.log('Received update request with body:', req.body);
    const article = await Article.findByPk(req.params.id);

    if (!article || article.author_id !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Article not found'
      });
    }

    const { title, content, categoryId, introduction, status } = req.body;
    
    let thumbnailUrl = article.thumbnail_url;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        thumbnailUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to upload image'
        });
      }
    }

    const oldStatus = article.status || 'draft';
    const newStatus = status || oldStatus;
    const wasDraft = oldStatus !== 'published';
    const willBePublished = newStatus === 'published';

    const updateData = {
      title: title || article.title,
      content: content || article.content,
      category_id: categoryId ? parseInt(categoryId, 10) : article.category_id,
      introduction: introduction || article.introduction,
      status: newStatus,
      thumbnail_url: thumbnailUrl
    };

    console.log('Update data:', updateData);

    // เรียกใช้ update method ที่ถูกต้อง
    const updatedArticle = await Article.update(req.params.id, updateData);

    if (!updatedArticle) {
      return res.status(404).json({
        status: 'error',
        message: 'Failed to update article'
      });
    }

    // สร้าง notification เมื่อเปลี่ยนจาก draft เป็น published
    if (wasDraft && willBePublished) {
      try {
        // ดึงข้อมูลผู้เขียน
        const authorResult = await query(
          'SELECT username, full_name FROM users WHERE id = $1',
          [req.user.id]
        );
        const author = authorResult.rows[0] || {};
        const authorName = author.full_name || author.username || 'Someone';
        const articleTitle = title || article.title;
        
        // ตรวจสอบ slug ถ้าไม่มีให้ query ใหม่
        let articleSlug = updatedArticle.slug;
        if (!articleSlug) {
          const slugResult = await query('SELECT slug FROM posts WHERE id = $1', [updatedArticle.id]);
          articleSlug = slugResult.rows[0]?.slug || updatedArticle.id;
        }

        // ดึงผู้ใช้ทั้งหมดยกเว้นผู้เขียน
        const usersResult = await query(
          'SELECT id FROM users WHERE id != $1',
          [req.user.id]
        );

        // สร้าง notification ให้กับทุกคน (ยกเว้นผู้เขียน)
        if (usersResult.rows.length > 0) {
          const firstUser = usersResult.rows[0];
          
          // สร้าง notification ให้ user คนแรก (จะ emit socket event ไปทุกคน)
          await createNotification(
            firstUser.id,
            'post',
            `${authorName} created a new post: ${articleTitle}`,
            `/article/${articleSlug}`,
            {
              user_id: req.user.id,
              post_id: updatedArticle.id,
              post_title: articleTitle,
              post_slug: articleSlug
            }
          );

          // สร้าง notification ให้ user คนอื่นๆ ใน database (ไม่ emit event ซ้ำ)
          if (usersResult.rows.length > 1) {
            const notificationData = {
              type: 'post',
              message: `${authorName} created a new post: ${articleTitle}`,
              link: `/article/${articleSlug}`,
              data: JSON.stringify({
                user_id: req.user.id,
                post_id: updatedArticle.id,
                post_title: articleTitle,
                post_slug: articleSlug
              })
            };

            for (const user of usersResult.rows.slice(1)) {
              await query(
                `INSERT INTO notifications (user_id, type, message, link, data)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                  user.id,
                  notificationData.type,
                  notificationData.message,
                  notificationData.link,
                  notificationData.data
                ]
              );
            }
          }
        }
      } catch (notificationError) {
        // ไม่ให้ notification error ทำให้การอัปเดต article ล้มเหลว
        console.error('Error creating notifications:', notificationError);
      }
    }

    res.json({
      status: 'success',
      message: 'Article updated successfully',
      data: updatedArticle
    });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update article',
      error: error.message
    });
  }
});

// Delete article
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);

    if (!article || article.author_id !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Article not found'
      });
    }

    const deleted = await Article.destroy(req.params.id);

    if (!deleted) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to delete article'
      });
    }

    res.json({
      status: 'success',
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete article',
      error: error.message
    });
  }
});

// Get article by slug
router.get('/detail/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get article data with like and comment counts
    const result = await query(`
      SELECT 
        p.*,
        c.name as category,
        u.username as "Author.username",
        u.avatar_url as "Author.avatar_url",
        u.bio as "Author.bio",
        COUNT(DISTINCT pl.post_id) as like_count,
        COUNT(DISTINCT cm.id) as comment_count
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN post_likes pl ON p.id = pl.post_id
      LEFT JOIN comments cm ON p.id = cm.post_id
      WHERE p.slug = $1
      GROUP BY p.id, c.name, u.username, u.avatar_url, u.bio
    `, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Article not found'
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error loading article'
    });
  }
});

export default router; 