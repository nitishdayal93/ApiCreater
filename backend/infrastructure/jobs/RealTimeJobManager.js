import Job, { JOB_STAGES } from '../../models/Job.js';
import eventBus from '../events/EventBus.js';
import logger from '../../utils/logger.js';

class RealTimeJobManager {
  constructor() {
    this.cancelledJobs = new Set();
    this.pausedJobs = new Set();
  }

  /**
   * Create a new generation job with stage tracking
   */
  async createJob(ownerId, promptText, chatId) {
    const job = await Job.create({
      owner: ownerId,
      chat: chatId,
      prompt: promptText,
      status: 'pending',
      currentStage: JOB_STAGES.QUEUED,
      progressPercent: 0,
      currentAgent: 'System'
    });

    // Publish initial event
    eventBus.publish(
      'JobCreated',
      job._id,
      'System',
      JOB_STAGES.QUEUED,
      'Pending',
      0,
      `Job enqueued: "${promptText.substring(0, 40)}..."`,
      { prompt: promptText, chatId }
    );

    return job;
  }

  /**
   * Update job stage and publish real-time SSE event
   */
  async updateJobStage(jobId, stage, agentName, progressPercent, message = '', metadata = {}) {
    if (this.cancelledJobs.has(String(jobId))) {
      throw new Error(`JOB_CANCELLED: Job ${jobId} was cancelled by user.`);
    }

    const eventPayload = eventBus.publish(
      `${stage}Event`,
      jobId,
      agentName,
      stage,
      'Running',
      progressPercent,
      message,
      metadata
    );

    // Asynchronously sync to DB to preserve fast real-time loop speed
    Job.findByIdAndUpdate(jobId, {
      status: 'processing',
      currentStage: stage,
      currentAgent: agentName,
      progressPercent,
      $push: {
        progress: `${agentName}: ${message}`,
        events: eventPayload
      }
    }).catch(err => logger.error(`Error updating Job ${jobId} stage in DB: ${err.message}`));

    return eventPayload;
  }

  /**
   * Record a generated file live stream event
   */
  async recordFileCreated(jobId, filePath, sizeBytes = 0, language = 'javascript', tier = 'backend') {
    const fileInfo = { path: filePath, size: sizeBytes, language, tier };

    const eventPayload = eventBus.publish(
      'FileCreated',
      jobId,
      'File Generator',
      'Backend',
      'Running',
      undefined,
      `File created: ${filePath}`,
      fileInfo
    );

    Job.findByIdAndUpdate(jobId, {
      $push: {
        generatedFiles: fileInfo,
        events: eventPayload
      }
    }).catch(err => logger.error(`Error recording FileCreated for Job ${jobId}: ${err.message}`));

    return eventPayload;
  }

  /**
   * Cancel an active job
   */
  async cancelJob(jobId, userId) {
    const job = await Job.findOne({ _id: jobId, owner: userId });
    if (!job) return null;

    this.cancelledJobs.add(String(jobId));

    job.status = 'cancelled';
    job.currentStage = JOB_STAGES.CANCELLED;
    job.isCancelled = true;
    await job.save();

    eventBus.publish(
      'JobCancelled',
      job._id,
      'System',
      JOB_STAGES.CANCELLED,
      'Cancelled',
      job.progressPercent,
      'Job was cancelled by user request.'
    );

    return job;
  }

  /**
   * Pause job execution
   */
  async pauseJob(jobId, userId) {
    const job = await Job.findOne({ _id: jobId, owner: userId });
    if (!job) return null;

    this.pausedJobs.add(String(jobId));

    job.status = 'paused';
    job.isPaused = true;
    await job.save();

    eventBus.publish(
      'JobPaused',
      job._id,
      'System',
      job.currentStage,
      'Paused',
      job.progressPercent,
      'Job execution paused.'
    );

    return job;
  }

  /**
   * Resume paused job
   */
  async resumeJob(jobId, userId) {
    const job = await Job.findOne({ _id: jobId, owner: userId });
    if (!job) return null;

    this.pausedJobs.delete(String(jobId));

    job.status = 'processing';
    job.isPaused = false;
    await job.save();

    eventBus.publish(
      'JobResumed',
      job._id,
      'System',
      job.currentStage,
      'Running',
      job.progressPercent,
      'Job execution resumed.'
    );

    return job;
  }

  /**
   * Check if job has cancellation flag set
   */
  isCancelled(jobId) {
    return this.cancelledJobs.has(String(jobId));
  }

  /**
   * Server Crash Recovery: Restore active or stale locked jobs on server restart
   */
  async restoreActiveJobs() {
    try {
      const staleCutoff = new Date(Date.now() - 10 * 60 * 1000);
      const staleResult = await Job.updateMany(
        { status: 'processing', lockTime: { $lt: staleCutoff } },
        { status: 'pending', lockTime: null, workerId: null }
      );
      if (staleResult.modifiedCount > 0) {
        logger.info(`Restored ${staleResult.modifiedCount} stale stuck processing jobs back to pending state.`);
      }
    } catch (err) {
      logger.error(`Error during server crash recovery scan: ${err.message}`);
    }
  }
}

export const realTimeJobManager = new RealTimeJobManager();
export default realTimeJobManager;
