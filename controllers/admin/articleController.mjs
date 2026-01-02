import { Article } from '../../models/Article.mjs';
import { Category } from '../../models/Category.mjs';
import { createNotification } from '../notificationController.mjs';
import { query } from '../../utils/db.mjs';
import multer from 'multer';
import { cloudinary } from '../../config/cloudinary.mjs';
import { Readable } from 'stream';

// ตั้งค่า multer สำหรับอัพโหลดไฟล์ (ใช้ memory storage สำหรับ Cloudinary)
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WEBP are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // จำกัดขนาด 5MB
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

// สร้างบทความใหม่
export const createArticle = async (req, res) => {
  try {
    const { title, introduction, content, category_id, status } = req.body;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!title || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Title and category are required'
      });
    }

    // อัพโหลดรูปภาพไปยัง Cloudinary (ถ้ามี)
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
          success: false,
          message: 'Failed to upload image'
        });
      }
    }

    // สร้างข้อมูลบทความ
    const articleData = {
      title,
      content: content || '',
      category_id: parseInt(category_id),
      author_id: req.user.id, // ได้จาก middleware การยืนยันตัวตน
      introduction: introduction || '', // จะถูกบันทึกเป็น excerpt ในตาราง posts
      status: status || 'draft', // จะถูกแปลงเป็น Boolean (published) ในโมเดล
      thumbnail_url: thumbnailUrl
    };

    // บันทึกลงฐานข้อมูล
    const article = await Article.create(articleData);

    // สร้าง notification สำหรับผู้ใช้คนอื่นๆ เมื่อ article ถูก publish
    if (status === 'published') {
      try {
        // ดึงข้อมูลผู้เขียน
        const authorResult = await query(
          'SELECT username, full_name FROM users WHERE id = $1',
          [req.user.id]
        );
        const author = authorResult.rows[0] || {};
        const authorName = author.full_name || author.username || 'Someone';

        // ตรวจสอบ slug ถ้าไม่มีให้ query ใหม่
        let articleSlug = article.slug;
        if (!articleSlug) {
          const slugResult = await query('SELECT slug FROM posts WHERE id = $1', [article.id]);
          articleSlug = slugResult.rows[0]?.slug || article.id;
        }

        // ดึงผู้ใช้ทั้งหมดยกเว้นผู้เขียน
        const usersResult = await query(
          'SELECT id FROM users WHERE id != $1',
          [req.user.id]
        );

        // สร้าง notification ให้กับทุกคน (ยกเว้นผู้เขียน)
        if (usersResult.rows.length > 0) {
          const notificationData = {
            type: 'post',
            message: `${authorName} created a new post: ${title}`,
            link: `/article/${articleSlug}`,
            data: {
              user_id: req.user.id,
              post_id: article.id,
              post_title: title,
              post_slug: articleSlug
            }
          };

          // สร้าง notification ให้ user คนแรก (จะ emit socket event ไปทุกคน)
          await createNotification(
            usersResult.rows[0].id,
            notificationData.type,
            notificationData.message,
            notificationData.link,
            notificationData.data
          );

          // สร้าง notification ให้ user คนอื่นๆ ใน database (ไม่ emit event ซ้ำเพราะ io.emit ส่งไปทุกคนแล้ว)
          if (usersResult.rows.length > 1) {
            for (const user of usersResult.rows.slice(1)) {
              await query(
                `INSERT INTO notifications (user_id, type, message, link, data)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                  user.id,
                  notificationData.type,
                  notificationData.message,
                  notificationData.link,
                  JSON.stringify(notificationData.data)
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
      success: true,
      message: 'Article created successfully',
      data: article
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create article',
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
    console.error('Error fetching articles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles',
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
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles',
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
        message: 'Article not found'
      });
    }

    const { title, introduction, content, category_id, status } = req.body;
    
    // จัดการรูปภาพหากมีการอัปโหลดใหม่
    let thumbnail_url = article.thumbnail_url;
    if (req.file) {
      try {
        console.log('Uploading new image to Cloudinary...');
        const result = await uploadToCloudinary(req.file.buffer);
        thumbnail_url = result.secure_url;
        console.log('Cloudinary upload successful:', thumbnail_url);
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image'
        });
      }
    }

    // ตรวจสอบ status เดิม (Article.findByPk จะแปลง published เป็น status string แล้ว)
    const oldStatus = article.status || (article.published ? 'published' : 'draft');
    const newStatus = status || oldStatus;
    const wasDraft = oldStatus !== 'published';
    const willBePublished = newStatus === 'published';

    // อัปเดตข้อมูล
    const updatedArticle = await Article.update(req.params.id, {
      title: title || article.title,
      introduction: introduction !== undefined ? introduction : article.introduction,
      content: content !== undefined ? content : article.content,
      thumbnail_url,
      category_id: category_id ? parseInt(category_id) : article.category_id,
      status: newStatus
    });

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
          const notificationData = {
            type: 'post',
            message: `${authorName} created a new post: ${articleTitle}`,
            link: `/article/${articleSlug}`,
            data: {
              user_id: req.user.id,
              post_id: updatedArticle.id,
              post_title: articleTitle,
              post_slug: articleSlug
            }
          };

          // สร้าง notification ให้ user คนแรก (จะ emit socket event ไปทุกคน)
          await createNotification(
            usersResult.rows[0].id,
            notificationData.type,
            notificationData.message,
            notificationData.link,
            notificationData.data
          );

          // สร้าง notification ให้ user คนอื่นๆ ใน database (ไม่ emit event ซ้ำเพราะ io.emit ส่งไปทุกคนแล้ว)
          if (usersResult.rows.length > 1) {
            for (const user of usersResult.rows.slice(1)) {
              await query(
                `INSERT INTO notifications (user_id, type, message, link, data)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                  user.id,
                  notificationData.type,
                  notificationData.message,
                  notificationData.link,
                  JSON.stringify(notificationData.data)
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
      success: true,
      message: 'Article updated successfully',
      data: updatedArticle
    });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update article',
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
        message: 'Article not found'
      });
    }

    // ไม่ต้องลบรูปภาพจาก Cloudinary (Cloudinary จัดการเอง)

    // ลบบทความจากฐานข้อมูล
    await Article.destroy(req.params.id);

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete article',
      error: error.message
    });
  }
}; 