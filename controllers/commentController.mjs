import { query } from '../utils/db.mjs';
import { createNotification } from './notificationController.mjs';

export const createComment = async (req, res) => {
  try {
    const { content, post_id } = req.body;
    const user_id = req.user.id;

    // Get post author id
    const postResult = await query(
      'SELECT author_id, title FROM posts WHERE id = $1',
      [post_id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    const post = postResult.rows[0];

    // Create comment
    const result = await query(
      'INSERT INTO comments (content, user_id, post_id) VALUES ($1, $2, $3) RETURNING *',
      [content, user_id, post_id]
    );

    // Create notification for post author if commenter is not the author
    if (post.author_id !== user_id) {
      const userResult = await query(
        'SELECT username FROM users WHERE id = $1',
        [user_id]
      );
      
      const username = userResult.rows[0]?.username || 'Someone';
      
      await createNotification(
        post.author_id,
        'comment',
        `${username} commented on your post: ${post.title}`,
        `/posts/${post_id}`,
        {
          comment_id: result.rows[0].id,
          post_id: post_id,
          comment_content: content
        }
      );
    }

    res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const getCommentsByPost = async (req, res) => {
  try {
    const { post_id } = req.params;
    const result = await query(
      `SELECT c.*, u.username, u.avatar_url 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.post_id = $1 
       ORDER BY c.created_at DESC`,
      [post_id]
    );

    res.json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const user_id = req.user.id;

    const result = await query(
      'UPDATE comments SET content = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [content, id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found or unauthorized'
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const result = await query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found or unauthorized'
      });
    }

    res.json({
      status: 'success',
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
}; 