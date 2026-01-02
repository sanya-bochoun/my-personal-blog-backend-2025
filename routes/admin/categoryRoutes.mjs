import express from 'express';
import { Category } from '../../models/Category.mjs';
import { authenticateToken, authorizeEditorOrAdmin } from '../../middleware/auth.mjs';
import pool from '../../utils/db.mjs';
import { slugify } from '../../utils/helpers.mjs';

const router = express.Router();

// ตรวจสอบการยืนยันตัวตนและสิทธิ์
router.use(authenticateToken, authorizeEditorOrAdmin);

// Create category
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;

        // Validation
        if (!name) {
            return res.status(400).json({
                status: 'error',
                message: 'Category name is required'
            });
        }

        // Check if category exists
        const categoryExists = await pool.query(
            'SELECT * FROM categories WHERE name = $1',
            [name]
        );

        if (categoryExists.rows.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Category name already exists'
            });
        }

        // Create slug
        const slug = slugify(name);

        // Insert new category
        const newCategory = await pool.query(
            'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING *',
            [name, slug, description]
        );

        res.status(201).json({
            status: 'success',
            data: newCategory.rows[0]
        });

    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create category'
        });
    }
});

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.json({
            status: 'success',
            data: categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Internal server error' 
        });
    }
});

// Search categories
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                status: 'error',
                message: 'Search query is required'
            });
        }

        // แก้ไขการค้นหาให้ค้นหาได้ทั้งจาก name, slug และ description
        const searchQuery = q.toLowerCase().trim();
        const result = await pool.query(
            `SELECT * FROM categories 
             WHERE LOWER(name) LIKE $1 
             OR LOWER(slug) LIKE $1 
             OR LOWER(description) LIKE $1 
             ORDER BY created_at DESC`,
            [`%${searchQuery}%`]
        );

        res.json({
            status: 'success',
            data: result.rows
        });
    } catch (err) {
        console.error('Error searching categories:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to search categories'
        });
    }
});

// Get single category
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM categories WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }

        res.json({
            status: 'success',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error fetching category:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch category'
        });
    }
});

// Update category
router.put('/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        const { id } = req.params;
        
        if (!name) {
            return res.status(400).json({ error: 'Category name is required' });
        }
        
        const category = await Category.update(id, { name, description });
        
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        res.json(category);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete category
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Category.destroy(id);
        
        if (!success) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        if (error.message === 'Cannot delete category that has articles') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router; 