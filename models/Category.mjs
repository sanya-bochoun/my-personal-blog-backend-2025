import pool, { query } from '../utils/db.mjs';

export class Category {
  // ดึงหมวดหมู่ทั้งหมด
  static async findAll() {
    try {
      const result = await query(
        'SELECT id, name, description, created_at, updated_at FROM categories ORDER BY name ASC'
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
  
  // ดึงหมวดหมู่ตาม ID
  static async findByPk(id) {
    try {
      const result = await query(
        'SELECT id, name, description, created_at, updated_at FROM categories WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // สร้างหมวดหมู่ใหม่
  static async create(data) {
    try {
      const { name, description } = data;
      
      const result = await query(
        `INSERT INTO categories (name, description, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING *`,
        [name, description]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // อัพเดทหมวดหมู่
  static async update(id, data) {
    try {
      const { name, description } = data;
      
      const result = await query(
        `UPDATE categories 
         SET name = $1, description = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [name, description, id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // ลบหมวดหมู่
  static async destroy(id) {
    try {
      // ตรวจสอบว่ามีบทความในหมวดหมู่นี้หรือไม่
      const checkArticles = await query(
        'SELECT COUNT(*) FROM posts WHERE category_id = $1',
        [id]
      );
      
      if (parseInt(checkArticles.rows[0].count) > 0) {
        throw new Error('ไม่สามารถลบหมวดหมู่ที่มีบทความอยู่ได้');
      }
      
      const result = await query(
        'DELETE FROM categories WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      throw error;
    }
  }
} 