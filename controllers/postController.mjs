import { query } from '../utils/db.mjs';
import slugify from 'slugify';

// Get all posts with filters
export const getPosts = async ({ page = 1, limit = 10, category, author, tag, search, published }) => {
  try {
    let queryText = `
      SELECT 
        p.*,
        u.username as author_name,
        u.avatar_url as author_avatar,
        c.name as category_name,
        COUNT(*) OVER() as total_count
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const values = [];
    let valueIndex = 1;

    if (category) {
      queryText += ` AND p.category_id = $${valueIndex}`;
      values.push(category);
      valueIndex++;
    }

    if (author) {
      queryText += ` AND p.author_id = $${valueIndex}`;
      values.push(author);
      valueIndex++;
    }

    if (published !== undefined) {
      queryText += ` AND p.published = $${valueIndex}`;
      values.push(published);
      valueIndex++;
    } else {
      queryText += ` AND p.published = true`;
    }

    if (search) {
      queryText += ` AND (p.title ILIKE $${valueIndex})`;
      values.push(`%${search}%`);
      valueIndex++;
    }

    if (tag) {
      queryText += `
        AND EXISTS (
          SELECT 1 FROM post_tags pt
          WHERE pt.post_id = p.id AND pt.tag_id = $${valueIndex}
        )
      `;
      values.push(tag);
      valueIndex++;
    }

    // Add pagination
    queryText += ` ORDER BY p.created_at DESC LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
    values.push(limit, (page - 1) * limit);

    const result = await query(queryText, values);
    const total = result.rows[0]?.total_count || 0;

    return {
      posts: result.rows.map(post => ({
        ...post,
        total_count: undefined
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        total_pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to fetch posts: ${error.message}`);
  }
};

// Create new post
export const createPost = async ({ title, content, author_id, category_id, excerpt, featured_image, published = false, tags = [] }) => {
  try {
    // Generate slug from title
    const slug = slugify(title, { lower: true, strict: true });
    
    // Start transaction
    await query('BEGIN');

    // Insert post
    const postResult = await query(
      `INSERT INTO posts (title, slug, content, author_id, category_id, excerpt, featured_image, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, slug, content, author_id, category_id, excerpt, featured_image, published]
    );

    const post = postResult.rows[0];

    // Insert tags if any
    if (tags.length > 0) {
      const tagValues = tags.map((_, index) => `($1, $${index + 2})`).join(',');
      await query(
        `INSERT INTO post_tags (post_id, tag_id) VALUES ${tagValues}`,
        [post.id, ...tags]
      );
    }

    // Commit transaction
    await query('COMMIT');

    return post;
  } catch (error) {
    // Rollback in case of error
    await query('ROLLBACK');
    throw new Error(`Failed to create post: ${error.message}`);
  }
};

// Get post by slug
export const getPostBySlug = async (slug) => {
  try {
    const result = await query(
      `SELECT 
        p.*,
        u.username as author_name,
        u.avatar_url as author_avatar,
        c.name as category_name,
        ARRAY_AGG(t.name) as tags
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.slug = $1
      GROUP BY p.id, u.username, u.avatar_url, c.name`,
      [slug]
    );

    return result.rows[0] || null;
  } catch (error) {
    throw new Error(`Failed to fetch post: ${error.message}`);
  }
};

// Update post
export const updatePost = async (id, updates, userId) => {
  try {
    // Check if user is author or admin
    const postCheck = await query(
      'SELECT author_id FROM posts WHERE id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      throw new Error('Post not found');
    }

    const post = postCheck.rows[0];
    if (post.author_id !== userId) {
      const userCheck = await query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );
      
      if (userCheck.rows[0]?.role !== 'admin') {
        throw new Error('Unauthorized to update this post');
      }
    }

    // Generate new slug if title is updated
    if (updates.title) {
      updates.slug = slugify(updates.title, { lower: true, strict: true });
    }

    // Update post
    const updateFields = Object.keys(updates)
      .filter(key => key !== 'tags')
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const updateValues = Object.values(updates).filter(value => !Array.isArray(value));

    const result = await query(
      `UPDATE posts SET ${updateFields} WHERE id = $1 RETURNING *`,
      [id, ...updateValues]
    );

    // Update tags if provided
    if (updates.tags) {
      await query('DELETE FROM post_tags WHERE post_id = $1', [id]);
      
      if (updates.tags.length > 0) {
        const tagValues = updates.tags.map((_, index) => `($1, $${index + 2})`).join(',');
        await query(
          `INSERT INTO post_tags (post_id, tag_id) VALUES ${tagValues}`,
          [id, ...updates.tags]
        );
      }
    }

    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to update post: ${error.message}`);
  }
};

// Delete post
export const deletePost = async (id, userId) => {
  try {
    // Check if user is author or admin
    const postCheck = await query(
      'SELECT author_id FROM posts WHERE id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      throw new Error('Post not found');
    }

    const post = postCheck.rows[0];
    if (post.author_id !== userId) {
      const userCheck = await query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );
      
      if (userCheck.rows[0]?.role !== 'admin') {
        throw new Error('Unauthorized to delete this post');
      }
    }

    // Delete post (this will cascade delete related records)
    await query('DELETE FROM posts WHERE id = $1', [id]);

    return true;
  } catch (error) {
    throw new Error(`Failed to delete post: ${error.message}`);
  }
};

// Toggle post publish status
export const togglePublishStatus = async (id, userId) => {
  try {
    // Check if user is author or admin
    const postCheck = await query(
      'SELECT author_id, published FROM posts WHERE id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      throw new Error('Post not found');
    }

    const post = postCheck.rows[0];
    if (post.author_id !== userId) {
      const userCheck = await query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );
      
      if (userCheck.rows[0]?.role !== 'admin') {
        throw new Error('Unauthorized to update this post');
      }
    }

    const result = await query(
      'UPDATE posts SET published = NOT published WHERE id = $1 RETURNING *',
      [id]
    );

    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to toggle post status: ${error.message}`);
  }
};

// Like a post
export const likePost = async (postId, userId) => {
  try {
    // Check if post exists
    const post = await query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (post.rows.length === 0) {
      throw new Error('ไม่พบบทความที่ต้องการ');
    }

    // Check if already liked
    const existingLike = await query(
      'SELECT * FROM post_like WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existingLike.rows.length > 0) {
      throw new Error('คุณได้กดไลค์บทความนี้ไปแล้ว');
    }

    // Add like
    await query(
      'INSERT INTO post_like (post_id, user_id) VALUES ($1, $2)',
      [postId, userId]
    );

    // Get total likes count
    const likesCount = await query(
      'SELECT COUNT(*) as count FROM post_like WHERE post_id = $1',
      [postId]
    );

    return {
      likes_count: parseInt(likesCount.rows[0].count)
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Unlike a post
export const unlikePost = async (postId, userId) => {
  try {
    // Check if post exists
    const post = await query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (post.rows.length === 0) {
      throw new Error('ไม่พบบทความที่ต้องการ');
    }

    // Check if like exists
    const existingLike = await query(
      'SELECT * FROM post_like WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existingLike.rows.length === 0) {
      throw new Error('คุณยังไม่ได้กดไลค์บทความนี้');
    }

    // Remove like
    await query(
      'DELETE FROM post_like WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    // Get total likes count
    const likesCount = await query(
      'SELECT COUNT(*) as count FROM post_like WHERE post_id = $1',
      [postId]
    );

    return {
      likes_count: parseInt(likesCount.rows[0].count)
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get post likes count
export const getPostLikes = async (postId, userId = null) => {
  try {
    // Check if post exists first
    const post = await query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (post.rows.length === 0) {
      throw new Error('ไม่พบบทความที่ต้องการ');
    }

    const likesCount = await query(
      'SELECT COUNT(*) as count FROM post_like WHERE post_id = $1',
      [postId]
    );

    let hasLiked = false;
    if (userId) {
      const userLike = await query(
        'SELECT * FROM post_like WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      hasLiked = userLike.rows.length > 0;
    }

    return {
      likes_count: parseInt(likesCount.rows[0].count),
      has_liked: hasLiked
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

export default {
  getPosts,
  createPost,
  getPostBySlug,
  updatePost,
  deletePost,
  togglePublishStatus,
  likePost,
  unlikePost,
  getPostLikes
}; 