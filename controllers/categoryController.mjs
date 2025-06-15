import { query } from '../utils/db.mjs';

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
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

export const getAllCategories = async (req, res) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY name');
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

export const getCategoryById = async (req, res) => {
  try {
    const result = await query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
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
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await query(
      'UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, req.params.id]
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
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const result = await query('DELETE FROM categories WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }
    res.json({
      status: 'success',
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const getCategoryPosts = async (req, res) => {
  try {
    const result = await query(
      'SELECT p.* FROM posts p JOIN post_categories pc ON p.id = pc.post_id WHERE pc.category_id = $1',
      [req.params.id]
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