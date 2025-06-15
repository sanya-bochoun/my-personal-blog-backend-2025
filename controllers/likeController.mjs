import { query } from '../utils/db.mjs';
import { createNotification } from './notificationController.mjs';

// Like a post
export const likePost = async (req, res) => {
  try {
    const { post_id } = req.body;
    const user_id = req.user.id;

    // Check if post exists and get author info
    const postResult = await query(
      'SELECT p.author_id, p.title, u.username FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = $1',
      [post_id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    const post = postResult.rows[0];

    // Check if already liked
    const likeExists = await query(
      'SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [post_id, user_id]
    );

    if (likeExists.rows.length > 0) {
      // Unlike
      await query(
        'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [post_id, user_id]
      );

      return res.json({
        status: 'success',
        message: 'Post unliked successfully'
      });
    }

    // Create like
    await query(
      'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
      [post_id, user_id]
    );

    // Create notification for post author if liker is not the author
    if (post.author_id !== user_id) {
      const userResult = await query(
        'SELECT username FROM users WHERE id = $1',
        [user_id]
      );
      
      const username = userResult.rows[0]?.username || 'Someone';
      
      await createNotification(
        post.author_id,
        'post_like',
        `${username} liked your post: ${post.title}`,
        `/posts/${post_id}`,
        {
          post_id: post_id,
          user_id: user_id
        }
      );
    }

    res.json({
      status: 'success',
      message: 'Post liked successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Like a comment
export const likeComment = async (req, res) => {
  try {
    const { comment_id } = req.body;
    const user_id = req.user.id;

    // Check if comment exists and get author info
    const commentResult = await query(
      `SELECT c.user_id, c.content, c.post_id, u.username 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = $1`,
      [comment_id]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
    }

    const comment = commentResult.rows[0];

    // Check if already liked
    const likeExists = await query(
      'SELECT * FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [comment_id, user_id]
    );

    if (likeExists.rows.length > 0) {
      // Unlike
      await query(
        'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
        [comment_id, user_id]
      );

      return res.json({
        status: 'success',
        message: 'Comment unliked successfully'
      });
    }

    // Create like
    await query(
      'INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)',
      [comment_id, user_id]
    );

    // Create notification for comment author if liker is not the author
    if (comment.user_id !== user_id) {
      const userResult = await query(
        'SELECT username FROM users WHERE id = $1',
        [user_id]
      );
      
      const username = userResult.rows[0]?.username || 'Someone';
      
      await createNotification(
        comment.user_id,
        'comment_like',
        `${username} liked your comment: "${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"`,
        `/posts/${comment.post_id}`,
        {
          comment_id: comment_id,
          post_id: comment.post_id,
          user_id: user_id
        }
      );
    }

    res.json({
      status: 'success',
      message: 'Comment liked successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
}; 