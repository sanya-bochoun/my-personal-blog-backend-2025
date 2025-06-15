import pool, { query } from '../utils/db.mjs';

export class Article {
  // ฟังก์ชันสร้าง slug จากชื่อบทความ
  static generateSlug(title) {
    return title
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')        // แทนที่ช่องว่างด้วย -
      .replace(/[^\u0E00-\u0E7Fa-z0-9-]/g, '') // เก็บแค่ตัวอักษรไทย อังกฤษ ตัวเลข และ -
      .replace(/-+/g, '-');        // ป้องกันการมีหลาย - ติดกัน
  }
  
  // ดึงบทความทั้งหมด
  static async findAll({ where = {}, include = [], order = [['created_at', 'DESC']] } = {}) {
    try {
      let queryStr = `
        SELECT 
          a.id, a.title, a.content, a.excerpt as introduction, a.thumbnail_url, 
          a.published as status, a.category_id, a.author_id, a.created_at, a.updated_at, a.slug,
          c.name as category_name,
          u.username as author_name
        FROM posts a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN users u ON a.author_id = u.id
      `;

      // สร้าง WHERE clause
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      // เพิ่มเงื่อนไขจาก where object
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          if (typeof value === 'object' && value !== null) {
            // ถ้าเป็น operator object (เช่น { [Op.like]: '%text%' })
            Object.entries(value).forEach(([op, opValue]) => {
              if (op === 'like') {
                conditions.push(`a.${key} ILIKE $${paramIndex}`);
                values.push(opValue);
                paramIndex++;
              } else {
                conditions.push(`a.${key} = $${paramIndex}`);
                values.push(opValue);
                paramIndex++;
              }
            });
          } else {
            conditions.push(`a.${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
        }
      });

      if (conditions.length > 0) {
        queryStr += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      // จัดเรียงข้อมูล
      const orderField = order[0][0];
      const orderDirection = order[0][1];
      queryStr += ` ORDER BY a.${orderField} ${orderDirection}`;
      
      const result = await query(queryStr, values);
      
      // จัดรูปแบบข้อมูลให้เหมือน sequelize
      return result.rows.map(article => {
        // แปลงค่า published (boolean) เป็น status (string)
        article.status = article.status ? 'published' : 'draft';
        
        return article;
      });
    } catch (error) {
      throw error;
    }
  }
  
  // ดึงบทความตาม ID
  static async findByPk(id, { include = [] } = {}) {
    try {
      let queryStr = `
        SELECT 
          a.id, a.title, a.content, a.excerpt as introduction, a.thumbnail_url, 
          a.published as status, a.category_id, a.author_id, a.created_at, a.updated_at, a.slug,
          c.name as category_name
        FROM posts a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.id = $1
      `;
      
      const result = await query(queryStr, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const article = result.rows[0];
      
      // แปลงค่า published (boolean) เป็น status (string)
      article.status = article.status ? 'published' : 'draft';
      
      return article;
    } catch (error) {
      throw error;
    }
  }
  
  // สร้างบทความใหม่
  static async create(data) {
    try {
      const { 
        title, content, introduction, thumbnail_url, 
        category_id, author_id, status 
      } = data;
      
      // สร้าง slug จากชื่อบทความ
      const slug = this.generateSlug(title);
      
      const result = await query(
        `INSERT INTO posts 
          (title, content, excerpt, thumbnail_url, category_id, author_id, published, slug, created_at, updated_at)
         VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [title, content, introduction, thumbnail_url, category_id, author_id, status === 'published', slug]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // อัพเดทบทความ
  static async update(id, data) {
    try {
      const { 
        title, content, introduction, thumbnail_url, 
        category_id, status 
      } = data;
      
      // สร้าง slug จากชื่อบทความ (หากมีการอัปเดตชื่อ)
      const slug = title ? this.generateSlug(title) : null;
      
      // สร้างคำสั่ง SQL สำหรับอัปเดต 
      let sqlQuery = `UPDATE posts SET `;
      let values = [];
      let updateColumns = [];
      let paramIndex = 1;
      
      if (title) {
        updateColumns.push(`title = $${paramIndex}`);
        values.push(title);
        paramIndex++;
        
        // อัปเดต slug ด้วย เมื่อมีการเปลี่ยนชื่อบทความ
        updateColumns.push(`slug = $${paramIndex}`);
        values.push(slug);
        paramIndex++;
      }
      
      if (content !== undefined) {
        updateColumns.push(`content = $${paramIndex}`);
        values.push(content);
        paramIndex++;
      }
      
      if (introduction !== undefined) {
        updateColumns.push(`excerpt = $${paramIndex}`);
        values.push(introduction);
        paramIndex++;
      }
      
      if (thumbnail_url) {
        updateColumns.push(`thumbnail_url = $${paramIndex}`);
        values.push(thumbnail_url);
        paramIndex++;
      }
      
      if (category_id) {
        updateColumns.push(`category_id = $${paramIndex}`);
        values.push(category_id);
        paramIndex++;
      }
      
      if (status !== undefined) {
        updateColumns.push(`published = $${paramIndex}`);
        values.push(status === 'published');
        paramIndex++;
      }
      
      // เพิ่มเวลาอัปเดต
      updateColumns.push(`updated_at = NOW()`);
      
      // สร้างคำสั่ง SQL สมบูรณ์
      sqlQuery += updateColumns.join(', ');
      sqlQuery += ` WHERE id = $${paramIndex} RETURNING *`;
      values.push(id);
      
      const result = await query(sqlQuery, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // ลบบทความ
  static async destroy(id) {
    try {
      const result = await query(
        'DELETE FROM posts WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      throw error;
    }
  }

  // ค้นหาบทความด้วยเงื่อนไข
  static async findOne({ where = {}, include = [] } = {}) {
    try {
      let queryStr = `
        SELECT 
          a.id, a.title, a.content, a.excerpt as introduction, a.thumbnail_url, 
          a.published as status, a.category_id, a.author_id, a.created_at, a.updated_at, a.slug,
          c.name as "Category.name",
          u.username as "Author.username",
          u.avatar_url as "Author.avatar_url",
          u.bio as "Author.bio"
        FROM posts a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN users u ON a.author_id = u.id
      `;

      // สร้าง WHERE clause
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      // เพิ่มเงื่อนไขจาก where object
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          conditions.push(`a.${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (conditions.length > 0) {
        queryStr += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      const result = await query(queryStr, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const article = result.rows[0];
      
      // แปลงค่า published (boolean) เป็น status (string)
      article.status = article.status ? 'published' : 'draft';
      
      return article;
    } catch (error) {
      throw error;
    }
  }
}