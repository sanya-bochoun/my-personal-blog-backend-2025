import express from 'express';
import pool from '../utils/db.mjs';

const router = express.Router();

// Test endpoint - GET /api/test
router.get('/', async (req, res) => {
  try {
    // ทดสอบการเชื่อมต่อกับฐานข้อมูล
    const client = await pool.connect();
    
    // ทดสอบ query
    const result = await client.query('SELECT NOW() as current_time');
    
    client.release();
    
    res.json({
      status: 'success',
      message: 'API is working!',
      database: {
        connection: 'success',
        currentTime: result.rows[0].current_time
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
      error: error.message
    });
  }
});

// Test endpoint with params - GET /api/test/:id
router.get('/:id', (req, res) => {
  res.json({
    status: 'success',
    message: 'Parameter test successful!',
    params: {
      id: req.params.id
    }
  });
});

// Test POST endpoint - POST /api/test
router.post('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'POST request successful!',
    body: req.body
  });
});

export default router; 