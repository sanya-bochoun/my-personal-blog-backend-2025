import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

import { testConnection } from './utils/db.mjs';
import routes from './routes/index.mjs';
import { errorHandler } from './middleware/errorHandler.mjs';
import { notFoundHandler } from './middleware/notFoundHandler.mjs';
import notificationRoutes from './routes/notificationRoutes.mjs';
import adminArticleRoutes from './routes/admin/articleRoutes.mjs';
import articleRoutes from './routes/articleRoutes.mjs';
import likeRoutes from './routes/likeRoutes.mjs';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();

// Test database connection
testConnection();

// Security Middleware
// 1. Helmet - Set HTTP headers for security
app.use(helmet());

// 2. Rate Limiting - Prevent brute force and DOS attacks
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit 100 requests per IP in 15 minutes
  message: 'Too many requests from this IP, please try again later.'
}));

// 3. Data Sanitization - Prevent XSS attacks
app.use(xss());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://my-personal-blog-2025-airo.vercel.app',
        'https://your-frontend.netlify.app' // จะอัปเดตหลัง deploy Netlify
      ]
    : ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Body Parser Middleware
app.use(express.json({ limit: '10kb' })); // จำกัดขนาด request body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Serving static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ลงทะเบียน API routes
app.use('/api', routes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/articles', adminArticleRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/likes', likeRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({
    message: 'API is running...',
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

// API Health Check
app.get('/api/health', async (req, res) => {
  try {
    // ทดสอบการเชื่อมต่อกับฐานข้อมูล
    const dbConnected = await testConnection();

    res.json({
      status: 'ok',
      timestamp: new Date(),
      dbConnection: dbConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Global Error Handler
app.use(errorHandler);
app.use(notFoundHandler);

// Export app for Vercel
export default app; 