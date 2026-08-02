import Job from '../models/Job.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import QueueService from '../infrastructure/queue/QueueService.js';
import realTimeJobManager from '../infrastructure/jobs/RealTimeJobManager.js';
import jobStreamManager from '../infrastructure/streaming/JobStreamManager.js';
import eventBus from '../infrastructure/events/EventBus.js';

/**
 * 1. Create a new real-time generation job
 * @route POST /api/jobs
 */
export const createRealTimeJob = async (req, res, next) => {
  try {
    const { prompt, chatId } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required.' });
    }

    let chat;
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, user: req.user.id });
    }

    if (!chat) {
      chat = await Chat.create({
        user: req.user.id,
        title: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '')
      });
    }

    await Message.create({
      chat: chat._id,
      sender: 'user',
      content: prompt
    });

    const job = await QueueService.enqueue(req.user.id, prompt, chat._id);

    res.status(201).json({
      success: true,
      message: 'Job enqueued successfully',
      data: {
        jobId: job._id,
        chatId: chat._id,
        status: job.status,
        currentStage: job.currentStage || 'Queued',
        streamUrl: `/api/jobs/${job._id}/stream`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Stream real-time events via Server-Sent Events (SSE)
 * @route GET /api/jobs/:id/stream
 */
export const streamJobEvents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await Job.findOne({ _id: id, owner: req.user.id });
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    jobStreamManager.subscribeClient(id, res, req);
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get detailed job status
 * @route GET /api/jobs/:id
 */
export const getJobStatusDetails = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, owner: req.user.id }).populate('project', 'name framework database');
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get event history log for a job
 * @route GET /api/jobs/:id/events
 */
export const getJobEventHistory = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, owner: req.user.id });
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const inMemoryHistory = eventBus.getJobHistory(req.params.id);
    const combinedEvents = inMemoryHistory.length > 0 ? inMemoryHistory : job.events || [];

    res.status(200).json({
      success: true,
      data: combinedEvents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get structured execution logs for a job
 * @route GET /api/jobs/:id/logs
 */
export const getJobLogs = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, owner: req.user.id });
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        logs: job.progress || [],
        eventsCount: job.events ? job.events.length : 0,
        filesGeneratedCount: job.generatedFiles ? job.generatedFiles.length : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Cancel an active job
 * @route POST /api/jobs/:id/cancel
 */
export const cancelJob = async (req, res, next) => {
  try {
    const job = await realTimeJobManager.cancelJob(req.params.id, req.user.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found or unauthorized' });
    }

    res.status(200).json({
      success: true,
      message: 'Job cancelled successfully',
      data: job
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Pause a job
 * @route POST /api/jobs/:id/pause
 */
export const pauseJob = async (req, res, next) => {
  try {
    const job = await realTimeJobManager.pauseJob(req.params.id, req.user.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Job paused successfully',
      data: job
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Resume a paused job
 * @route POST /api/jobs/:id/resume
 */
export const resumeJob = async (req, res, next) => {
  try {
    const job = await realTimeJobManager.resumeJob(req.params.id, req.user.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Job resumed successfully',
      data: job
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Retry a failed or cancelled job
 * @route POST /api/jobs/:id/retry
 */
export const retryJob = async (req, res, next) => {
  try {
    const oldJob = await Job.findOne({ _id: req.params.id, owner: req.user.id });
    if (!oldJob) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const newJob = await QueueService.enqueue(req.user.id, oldJob.prompt, oldJob.chat);

    res.status(200).json({
      success: true,
      message: 'Job re-enqueued for retry',
      data: newJob
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. List user jobs
 * @route GET /api/jobs
 */
export const listUserJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ owner: req.user.id })
      .select('-events -generatedFiles')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. Delete job
 * @route DELETE /api/jobs/:id
 */
export const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    eventBus.clearJobHistory(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
