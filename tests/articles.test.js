import request from 'supertest';
import app from '../app.mjs';
import { pool } from '../config/database.mjs';

describe('Articles API', () => {
  let testArticleId;
  const testUser = {
    id: 1,
    username: 'testuser'
  };

  beforeAll(async () => {
    // เตรียมข้อมูลทดสอบ
    const categoryResult = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING id',
      ['Test Category']
    );
    const categoryId = categoryResult.rows[0].id;

    // สร้างบทความทดสอบ
    const articleResult = await pool.query(
      `INSERT INTO articles (title, introduction, content, category_id, author_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['Test Article', 'Test Intro', 'Test Content', categoryId, testUser.id]
    );
    testArticleId = articleResult.rows[0].id;
  });

  afterAll(async () => {
    // ลบข้อมูลทดสอบ
    await pool.query('DELETE FROM articles WHERE id = $1', [testArticleId]);
    await pool.query('DELETE FROM categories WHERE name = $1', ['Test Category']);
    await pool.end();
  });

  describe('GET /api/articles', () => {
    it('should return all articles', async () => {
      const res = await request(app)
        .get('/api/articles')
        .expect(200);

      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/articles/:id', () => {
    it('should return a single article', async () => {
      const res = await request(app)
        .get(`/api/articles/${testArticleId}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', testArticleId);
      expect(res.body).toHaveProperty('title', 'Test Article');
    });

    it('should return 404 for non-existent article', async () => {
      await request(app)
        .get('/api/articles/99999')
        .expect(404);
    });
  });

  describe('POST /api/articles', () => {
    it('should create a new article', async () => {
      const newArticle = {
        title: 'New Test Article',
        introduction: 'New Test Intro',
        content: 'New Test Content',
        category_id: 1
      };

      const res = await request(app)
        .post('/api/articles')
        .field('title', newArticle.title)
        .field('introduction', newArticle.introduction)
        .field('content', newArticle.content)
        .field('category_id', newArticle.category_id)
        .expect(201);

      expect(res.body).toHaveProperty('title', newArticle.title);
    });

    it('should handle missing required fields', async () => {
      await request(app)
        .post('/api/articles')
        .send({})
        .expect(400);
    });
  });

  describe('PUT /api/articles/:id', () => {
    it('should update an existing article', async () => {
      const updates = {
        title: 'Updated Title',
        status: 'published'
      };

      const res = await request(app)
        .put(`/api/articles/${testArticleId}`)
        .send(updates)
        .expect(200);

      expect(res.body).toHaveProperty('title', updates.title);
      expect(res.body).toHaveProperty('status', updates.status);
    });
  });

  describe('DELETE /api/articles/:id', () => {
    it('should delete an article', async () => {
      await request(app)
        .delete(`/api/articles/${testArticleId}`)
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/api/articles/${testArticleId}`)
        .expect(404);
    });
  });
}); 