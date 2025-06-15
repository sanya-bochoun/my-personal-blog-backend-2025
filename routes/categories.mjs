import express from 'express';
import { pool } from '../config/database.mjs';

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT * FROM categories ORDER BY name ASC';
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router; 