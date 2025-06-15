import request from 'supertest';
import app from '../app.mjs';
import { pool } from '../config/database.mjs';
import jwt from 'jsonwebtoken';

describe('User Management API', () => {
  let adminToken;
  let testUserId;

  beforeAll(async () => {
    // Create admin user and generate token
    const adminUser = {
      id: '12345',
      username: 'admin',
      role: 'admin'
    };
    adminToken = jwt.sign(adminUser, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Create test user
    const result = await pool.query(
      'INSERT INTO users (username, email, status) VALUES ($1, $2, $3) RETURNING id',
      ['testuser', 'test@example.com', 'active']
    );
    testUserId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  describe('GET /api/admin/users', () => {
    it('should return list of users with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should filter users by search term', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users.length).toBeGreaterThan(0);
      expect(response.body.users[0].username).toContain('test');
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should return user details', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testUserId);
      expect(response.body).toHaveProperty('username', 'testuser');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/admin/users/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/admin/users/:id/status', () => {
    it('should update user status', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'locked' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'locked');
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete user', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User deleted successfully');
    });

    it('should return 404 for already deleted user', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
}); 