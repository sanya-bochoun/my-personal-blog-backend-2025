import express from 'express';
import multer from 'multer';
import { pool } from '../config/database.mjs';
import { uploadToCloudinary } from '../config/cloudinary.mjs';
import slugify from 'slugify';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create article
router.post('/', upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, introduction, content, category_id } = req.body;
    const author_id = req.user.id; // จาก middleware authentication
    const slug = slugify(title, { lower: true, strict: true });

    let thumbnail_url = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file);
      thumbnail_url = result.secure_url;
    }

    const query = `
      INSERT INTO articles (title, introduction, content, category_id, author_id, thumbnail_url, slug)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [title, introduction, content, category_id, author_id, thumbnail_url, slug];
    const { rows } = await pool.query(query, values);

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// Get all articles
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT a.*, c.name as category_name, u.username as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.created_at DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Get single article
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT a.*, c.name as category_name, u.username as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// Update article
router.put('/:id', upload.single('thumbnail'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, introduction, content, category_id, status } = req.body;
    
    let thumbnail_url = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file);
      thumbnail_url = result.secure_url;
    }

    const updateFields = [];
    const values = [];
    let valueCount = 1;

    if (title) {
      updateFields.push(`title = $${valueCount}`);
      values.push(title);
      valueCount++;
    }
    if (introduction) {
      updateFields.push(`introduction = $${valueCount}`);
      values.push(introduction);
      valueCount++;
    }
    if (content) {
      updateFields.push(`content = $${valueCount}`);
      values.push(content);
      valueCount++;
    }
    if (category_id) {
      updateFields.push(`category_id = $${valueCount}`);
      values.push(category_id);
      valueCount++;
    }
    if (thumbnail_url) {
      updateFields.push(`thumbnail_url = $${valueCount}`);
      values.push(thumbnail_url);
      valueCount++;
    }
    if (status) {
      updateFields.push(`status = $${valueCount}`);
      values.push(status);
      valueCount++;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE articles
      SET ${updateFields.join(', ')}
      WHERE id = $${valueCount}
      RETURNING *
    `;
    
    values.push(id);
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// Delete article
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'DELETE FROM articles WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// Get article by slug
router.get('/detail/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const query = `
      SELECT 
        a.*,
        c.name as "Category.name",
        u.username as "Author.username",
        u.avatar_url as "Author.avatar_url",
        u.bio as "Author.bio"
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.slug = $1
    `;
    const { rows } = await pool.query(query, [slug]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        status: 'error',
        message: 'ไม่พบบทความที่ต้องการ' 
      });
    }
    
    res.json({ 
      status: 'success',
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบทความ'
    });
  }
});

export default router; 