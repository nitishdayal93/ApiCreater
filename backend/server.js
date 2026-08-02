import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import fs from 'fs';
import connectDB from './config/db.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/error.js';
import JobWorker from './infrastructure/queue/JobWorker.js';

// Route Imports
import authRoutes from './routes/auth.js';
import generatorRoutes from './routes/generator.js';
import adminRoutes from './routes/admin.js';
import healthRoutes from './routes/health.js';
import jobRoutes from './routes/jobRoutes.js';
import knowledgeRoutes from './routes/knowledgeRoutes.js';

// Force dev server port to 5001 to bypass OS environment blocks
if (process.env.NODE_ENV !== 'production') {
  process.env.PORT = '5001';
}

// Ensure logs directory exists
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Connect Database & Start Background JobWorker
connectDB().then(() => {
  const worker = new JobWorker();
  worker.start();
});

const app = express();

// Security Headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Performance GZIP Compression
app.use(compression());

// Body Parser
app.use(express.json());

// Morgan API Logger mapped to Winston
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: { write: (message) => logger.http(message.trim()) },
  })
);

// Rate Limiting to protect endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_REQUESTS || '1000'),
  message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
});
app.use('/api/', limiter);

// Mount Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/generator', generatorRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', healthRoutes);

// Unused Routes Fallback
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} does not exist.` });
});

// Central Error Handler
app.use(errorHandler);

// Trigger reload to load new Groq API Key env settings
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Trigger nodemon reload 2
