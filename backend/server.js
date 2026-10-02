import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { PORT, NODE_ENV } from './config/env.js';
import { errorHandler, requestLogger } from './middleware/errorMiddleware.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { swaggerDocument } from './docs/swagger.js';

import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import checkinRoutes from './routes/checkinRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { initializeDatabase } from './config/initDb.js';

const app = express();

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // Allows Swagger UI assets to load without inline script blocks
}));

// Secure CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://goalproof-portal-frontend.onrender.com'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim());
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev/local, configurable via allowedOrigins
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// Global rate limiting for all API routes
app.use('/api', apiLimiter);

// Swagger Documentation UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'GoalProof API Docs'
}));
app.get('/docs', (req, res) => res.redirect('/api/docs'));

// Root / API index endpoints
app.get(['/', '/api'], (req, res) => {
  res.json({
    success: true,
    message: 'GoalProof Performance Management API',
    docs: '/api/docs',
    health: '/api/health',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      goals: '/api/goals',
      manager: '/api/manager',
      checkin: '/api/checkin',
      admin: '/api/admin',
      ai: '/api/ai'
    }
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    message: 'GoalProof API is running',
    environment: NODE_ENV
  });
});

// Fallback for unhandled routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    errorCode: 'ROUTE_NOT_FOUND',
    docs: '/api/docs'
  });
});

// Centralized Error Handling
app.use(errorHandler);

// Listen only when not running inside test runner
if (NODE_ENV !== 'test') {
  initializeDatabase().finally(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API Documentation available at http://localhost:${PORT}/api/docs`);
    });
  });
}

export default app;
