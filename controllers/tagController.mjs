import { query } from '../utils/db.mjs';

export const createTag = async (req, res) => {
  try {
    const { name } = req.body;
    const result = await query(
      'INSERT INTO tags (name) VALUES ($1) RETURNING *',
      [name]
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

export const getAllTags = async (req, res) => {
  try {
    const result = await query('SELECT * FROM tags ORDER BY name');
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

export const getTagById = async (req, res) => {
  try {
    const result = await query('SELECT * FROM tags WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Tag not found'
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

export const updateTag = async (req, res) => {
  try {
    const { name } = req.body;
    const result = await query(
      'UPDATE tags SET name = $1 WHERE id = $2 RETURNING *',
      [name, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Tag not found'
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

export const deleteTag = async (req, res) => {
  try {
    const result = await query('DELETE FROM tags WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Tag not found'
      });
    }
    res.json({
      status: 'success',
      message: 'Tag deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const getTagPosts = async (req, res) => {
  try {
    const result = await query(
      'SELECT p.* FROM posts p JOIN post_tags pt ON p.id = pt.post_id WHERE pt.tag_id = $1',
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