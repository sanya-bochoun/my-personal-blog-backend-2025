import express from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import * as postController from '../controllers/postController.mjs';

const router = express.Router();

// Validation rules
const postValidation = [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('category_id').isInt().withMessage('Category ID must be an integer'),
  body('excerpt').optional().trim(),
  body('featured_image').optional().isURL().withMessage('Featured image must be a valid URL'),
  body('published').optional().isBoolean().withMessage('Published must be a boolean'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('status').optional().isIn(['draft', 'published']).withMessage('Status must be either "draft" or "published"')
];

// Get all posts with filters
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isInt().withMessage('Category must be an integer'),
  query('author').optional().isInt().withMessage('Author must be an integer'),
  query('tag').optional().isInt().withMessage('Tag must be an integer'),
  query('search').optional().trim(),
  validateRequest
], async (req, res) => {
  try {
    const result = await postController.getPosts(req.query);
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
});

// Create new post
router.post('/', authenticateToken, postValidation, validateRequest, async (req, res) => {
  try {
    const post = await postController.createPost({
      ...req.body,
      author_id: req.user.id
    });

    res.status(201).json({
      status: 'success',
      message: 'Post created successfully',
      data: { post }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create post',
      error: error.message
    });
  }
});

// Get post by slug
router.get('/:slug', async (req, res) => {
  try {
    const post = await postController.getPostBySlug(req.params.slug);
    
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    res.json({
      status: 'success',
      data: { post }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch post',
      error: error.message
    });
  }
});

// Update post
router.put('/:id', authenticateToken, postValidation, validateRequest, async (req, res) => {
  try {
    const post = await postController.updatePost(
      req.params.id,
      req.body,
      req.user.id
    );

    res.json({
      status: 'success',
      message: 'Post updated successfully',
      data: { post }
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        status: 'error',
        message: error.message
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update post',
      error: error.message
    });
  }
});

// Delete post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await postController.deletePost(req.params.id, req.user.id);

    res.json({
      status: 'success',
      message: 'Post deleted successfully'
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        status: 'error',
        message: error.message
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete post',
      error: error.message
    });
  }
});

// Toggle post publish status
router.patch('/:id/publish', authenticateToken, async (req, res) => {
  try {
    const post = await postController.togglePublishStatus(req.params.id, req.user.id);

    res.json({
      status: 'success',
      message: 'Post publish status updated successfully',
      data: { post }
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        status: 'error',
        message: error.message
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update post publish status',
      error: error.message
    });
  }
});

// Additional routes
router.get('/search', async (req, res) => {
  try {
    const result = await postController.searchPosts(req.query.search);
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to search posts',
      error: error.message
    });
  }
});

router.get('/category/:categoryId', async (req, res) => {
  try {
    const result = await postController.getPostsByCategory(req.params.categoryId);
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch posts by category',
      error: error.message
    });
  }
});

router.get('/tag/:tagId', async (req, res) => {
  try {
    const result = await postController.getPostsByTag(req.params.tagId);
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch posts by tag',
      error: error.message
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const post = await postController.getPostById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }

    res.json({
      status: 'success',
      data: { post }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch post',
      error: error.message
    });
  }
});

router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const post = await postController.likePost(req.params.id, req.user.id);

    res.json({
      status: 'success',
      message: 'Post liked successfully',
      data: { post }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to like post',
      error: error.message
    });
  }
});

router.delete('/:id/like', authenticateToken, async (req, res) => {
  try {
    await postController.unlikePost(req.params.id, req.user.id);

    res.json({
      status: 'success',
      message: 'Post unliked successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to unlike post',
      error: error.message
    });
  }
});

export default router; 