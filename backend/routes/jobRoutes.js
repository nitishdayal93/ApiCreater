import express from 'express';
import {
  createRealTimeJob,
  streamJobEvents,
  getJobStatusDetails,
  getJobEventHistory,
  getJobLogs,
  cancelJob,
  pauseJob,
  resumeJob,
  retryJob,
  listUserJobs,
  deleteJob
} from '../controllers/jobController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(protect, createRealTimeJob)
  .get(protect, listUserJobs);

router.get('/:id/stream', protect, streamJobEvents);
router.get('/:id/events', protect, getJobEventHistory);
router.get('/:id/logs', protect, getJobLogs);
router.post('/:id/cancel', protect, cancelJob);
router.post('/:id/pause', protect, pauseJob);
router.post('/:id/resume', protect, resumeJob);
router.post('/:id/retry', protect, retryJob);

router.route('/:id')
  .get(protect, getJobStatusDetails)
  .delete(protect, deleteJob);

export default router;
