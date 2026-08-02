import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// @desc    Get system health status
// @route   GET /api/health
// @access  Public
router.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({
    status: 'ok',
    database: dbStatus,
    server: 'running',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

export default router;
