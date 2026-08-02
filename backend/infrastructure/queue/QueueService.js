import Job from '../../models/Job.js';
import logger from '../../utils/logger.js';

export class QueueService {
  /**
   * Enqueue a new code generation job.
   */
  static async enqueue(userId, prompt, chatId) {
    try {
      const job = await Job.create({
        owner: userId,
        chat: chatId,
        prompt: prompt,
        status: 'pending',
      });
      logger.info(`Enqueued new job ${job._id} for user ${userId}`);
      return job;
    } catch (error) {
      logger.error(`Failed to enqueue job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Dequeue and atomically lock the next pending/stalled job.
   * Stalled jobs are jobs that are in 'processing' status but have a lockTime older than 10 minutes.
   */
  static async acquireNextJob(workerId) {
    const lockDurationMs = 10 * 60 * 1000; // 10 minutes lock expiry
    const staleThreshold = new Date(Date.now() - lockDurationMs);

    try {
      const job = await Job.findOneAndUpdate(
        {
          $or: [
            { status: 'pending' },
            { status: 'processing', lockTime: { $lt: staleThreshold } },
          ],
          attempts: { $lt: 3 }, // Maximum of 3 attempts
        },
        {
          $set: {
            status: 'processing',
            workerId: workerId,
            lockTime: new Date(),
          },
          $inc: { attempts: 1 },
        },
        {
          new: true,
          sort: { createdAt: 1 }, // FIFO queue processing
        }
      );

      if (job) {
        logger.info(`Worker ${workerId} acquired job ${job._id} (attempt ${job.attempts})`);
      }
      return job;
    } catch (error) {
      logger.error(`Error acquiring next job: ${error.message}`);
      return null;
    }
  }

  /**
   * Update the progress array of a job.
   */
  static async updateProgress(jobId, step) {
    try {
      await Job.updateOne(
        { _id: jobId },
        { 
          $push: { progress: step },
          $set: { lockTime: new Date() } // Heartbeat to prevent lock timeouts
        }
      );
    } catch (error) {
      logger.error(`Failed to update progress for job ${jobId}: ${error.message}`);
    }
  }

  /**
   * Complete the job successfully and link the generated project.
   */
  static async completeJob(jobId, projectId) {
    try {
      await Job.updateOne(
        { _id: jobId },
        {
          $set: {
            status: 'completed',
            project: projectId,
            lockTime: null,
            workerId: null,
          },
        }
      );
      logger.info(`Job ${jobId} marked as completed successfully with project ${projectId}`);
    } catch (error) {
      logger.error(`Failed to complete job ${jobId}: ${error.message}`);
    }
  }

  /**
   * Mark the job as failed and save the error message.
   */
  static async failJob(jobId, errorMessage) {
    try {
      await Job.updateOne(
        { _id: jobId },
        {
          $set: {
            status: 'failed',
            error: errorMessage,
            lockTime: null,
            workerId: null,
          },
        }
      );
      logger.warn(`Job ${jobId} marked as failed: ${errorMessage}`);
    } catch (error) {
      logger.error(`Failed to fail job ${jobId}: ${error.message}`);
    }
  }
}
export default QueueService;
