import express from 'express';
import { authenticateToken } from '../middleware/auth.mjs';
import { likePost, unlikePost, getPostLikes } from '../controllers/postController.mjs';

const router = express.Router();

// Like a post
router.post('/:post_id/like', authenticateToken, async (req, res) => {
  try {
    const result = await likePost(req.params.post_id, req.user.id);
    res.json({
      status: 'success',
      message: 'กดไลค์สำเร็จ',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Unlike a post
router.delete('/:post_id/like', authenticateToken, async (req, res) => {
  try {
    const result = await unlikePost(req.params.post_id, req.user.id);
    res.json({
      status: 'success',
      message: 'ยกเลิกการกดไลค์สำเร็จ',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get post likes count
router.get('/:post_id/likes', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const result = await getPostLikes(req.params.post_id, userId);
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router; 