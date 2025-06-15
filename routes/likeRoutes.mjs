import express from 'express';
import { authenticateToken } from '../middleware/auth.mjs';
import { query } from '../utils/db.mjs';
import { createNotification } from '../controllers/notificationController.mjs';

const router = express.Router();

// Get likes for a post
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await query(
      'SELECT * FROM post_likes WHERE post_id = $1',
      [postId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching likes:', error);
    res.status(500).json({ message: 'Error fetching likes' });
  }
});

// Add like to a post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.user.id;

    // Check if post exists and get author info
    const postResult = await query(
      'SELECT p.author_id, p.title, u.username FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = $1',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const post = postResult.rows[0];

    // Check if like already exists
    const existingLike = await query(
      'SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existingLike.rows.length > 0) {
      return res.status(400).json({ message: 'Already liked this post' });
    }

    // Add new like
    await query(
      'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
      [postId, userId]
    );

    // Create notification for post author if liker is not the author
    if (post.author_id !== userId) {
      const userResult = await query(
        'SELECT username FROM users WHERE id = $1',
        [userId]
      );
      
      const username = userResult.rows[0]?.username || 'Someone';
      
      await createNotification(
        post.author_id,
        'post_like',
        `${username} liked your post: ${post.title}`,
        `/posts/${postId}`,
        {
          post_id: postId,
          user_id: userId
        }
      );
    }

    res.status(201).json({ message: 'Like added successfully' });
  } catch (error) {
    console.error('Error adding like:', error);
    res.status(500).json({ message: 'Error adding like' });
  }
});

// Remove like from a post
router.delete('/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const result = await query(
      'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Like not found' });
    }

    res.json({ message: 'Like removed successfully' });
  } catch (error) {
    console.error('Error removing like:', error);
    res.status(500).json({ message: 'Error removing like' });
  }
});

// Check if user has liked a post
router.get('/check/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const result = await query(
      'SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    res.json({ hasLiked: result.rows.length > 0 });
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).json({ message: 'Error checking like status' });
  }
});

// Add like to a post
router.post('/articles/:articleId/like', authenticateToken, async (req, res) => {
  try {
    const { articleId } = req.params;
    const userId = req.user.id;

    // Check if post exists and get author info
    const postResult = await query(
      'SELECT p.author_id, p.title, u.username FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = $1',
      [articleId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ message: 'บทความไม่พบในระบบ' });
    }

    const post = postResult.rows[0];

    // Check if like already exists
    const existingLike = await query(
      'SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [articleId, userId]
    );

    if (existingLike.rows.length > 0) {
      return res.status(400).json({ message: 'คุณได้กดไลค์บทความนี้ไปแล้ว' });
    }

    // Add new like
    await query(
      'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
      [articleId, userId]
    );

    // Create notification for post author if liker is not the author
    if (post.author_id !== userId) {
      const userResult = await query(
        'SELECT username FROM users WHERE id = $1',
        [userId]
      );
      
      const username = userResult.rows[0]?.username || 'ผู้ใช้งาน';
      
      await createNotification(
        post.author_id,
        'post_like',
        `${username} ได้กดไลค์บทความของคุณ: ${post.title}`,
        `/posts/${articleId}`,
        {
          post_id: articleId,
          user_id: userId
        }
      );
    }

    res.status(201).json({ message: 'กดไลค์บทความเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error adding post like:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการกดไลค์บทความ' });
  }
});

// Remove like from a post
router.delete('/articles/:articleId/like', authenticateToken, async (req, res) => {
  try {
    const { articleId } = req.params;
    const userId = req.user.id;

    const result = await query(
      'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [articleId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบการกดไลค์บทความนี้' });
    }

    res.json({ message: 'ยกเลิกการกดไลค์บทความเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error removing post like:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการยกเลิกการกดไลค์บทความ' });
  }
});

// Check if user has liked a post
router.get('/articles/:articleId/check', authenticateToken, async (req, res) => {
  try {
    const { articleId } = req.params;
    const userId = req.user.id;

    const result = await query(
      'SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [articleId, userId]
    );

    res.json({ hasLiked: result.rows.length > 0 });
  } catch (error) {
    console.error('Error checking post like status:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะการกดไลค์' });
  }
});

export default router; 