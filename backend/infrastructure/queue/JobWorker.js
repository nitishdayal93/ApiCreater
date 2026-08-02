import mongoose from 'mongoose';
import crypto from 'crypto';
import QueueService from './QueueService.js';
import { assembleProjectPipeline } from '../../ai/projectAssembler.js';
import Project from '../../models/Project.js';
import Message from '../../models/Message.js';
import realTimeJobManager from '../jobs/RealTimeJobManager.js';
import eventBus from '../events/EventBus.js';
import logger from '../../utils/logger.js';
import { JOB_STAGES } from '../../models/Job.js';
import SelfLearningStore from '../../ai/selfLearningStore.js';

export class JobWorker {
  constructor(pollIntervalMs = 2000) {
    this.workerId = `worker-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
    this.pollIntervalMs = pollIntervalMs;
    this.isRunning = false;
    this.timer = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`Starting Real-Time JobWorker instance: ${this.workerId}`);
    
    // Server Crash Recovery: Restore active/stale jobs on startup
    realTimeJobManager.restoreActiveJobs();

    this.tick();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info(`Stopped JobWorker: ${this.workerId}`);
  }

  async tick() {
    if (!this.isRunning) return;

    if (mongoose.connection.readyState !== 1) {
      if (this.isRunning) {
        this.timer = setTimeout(() => this.tick(), 5000);
      }
      return;
    }

    try {
      const job = await QueueService.acquireNextJob(this.workerId);
      if (job) {
        await this.processJob(job);
      }
    } catch (error) {
      logger.error(`Error in worker poll tick: ${error.message}`);
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => this.tick(), this.pollIntervalMs);
    }
  }

  async processJob(job) {
    const startTime = Date.now();
    logger.info(`Starting execution of real-time job ${job._id} (Prompt: "${job.prompt}")`);

    // Map legacy string steps into real-time granular stage events
    const onProgress = async (stepMessage) => {
      if (realTimeJobManager.isCancelled(job._id)) {
        throw new Error(`JOB_CANCELLED: Job ${job._id} execution aborted by user.`);
      }

      logger.debug(`Job ${job._id} progress: ${stepMessage}`);
      await QueueService.updateProgress(job._id, stepMessage);

      // Determine stage & agent from step string
      let stage = JOB_STAGES.PLANNING;
      let agent = 'Planner Agent';
      let progressPercent = 10;

      if (stepMessage.includes('Prompt Corrector')) {
        stage = JOB_STAGES.PLANNING;
        agent = 'Prompt Corrector Agent';
        progressPercent = 5;
      } else if (stepMessage.includes('Planner Agent') || stepMessage.includes('Architecture Agent')) {
        stage = JOB_STAGES.ARCHITECTURE;
        agent = 'Chief Software Architect';
        progressPercent = 20;
      } else if (stepMessage.includes('Model Generator') || stepMessage.includes('Database')) {
        stage = JOB_STAGES.DATABASE;
        agent = 'Database Architect';
        progressPercent = 35;
      } else if (stepMessage.includes('Service') || stepMessage.includes('Controller') || stepMessage.includes('Route')) {
        stage = JOB_STAGES.BACKEND;
        agent = 'Backend Engineer';
        progressPercent = 50;
      } else if (stepMessage.includes('Frontend') || stepMessage.includes('React') || stepMessage.includes('UI Component')) {
        stage = JOB_STAGES.FRONTEND;
        agent = 'Frontend Engineer';
        progressPercent = 65;
      } else if (stepMessage.includes('Testing')) {
        stage = JOB_STAGES.TESTING;
        agent = 'QA Engineer';
        progressPercent = 75;
      } else if (stepMessage.includes('Security')) {
        stage = JOB_STAGES.SECURITY;
        agent = 'Security Engineer';
        progressPercent = 85;
      } else if (stepMessage.includes('Reviewer')) {
        stage = JOB_STAGES.REVIEW;
        agent = 'Refactoring Engineer';
        progressPercent = 90;
      } else if (stepMessage.includes('Assembler')) {
        stage = JOB_STAGES.PACKAGING;
        agent = 'Release Manager';
        progressPercent = 95;
      }

      await realTimeJobManager.updateJobStage(job._id, stage, agent, progressPercent, stepMessage);
    };

    try {
      await realTimeJobManager.updateJobStage(job._id, JOB_STAGES.PLANNING, 'Planner Agent', 5, 'Planner started');

      const genProject = await assembleProjectPipeline(job.prompt, onProgress);
      const duration = Date.now() - startTime;

      // Emit live FileCreated events for each generated file
      if (Array.isArray(genProject.files)) {
        for (const file of genProject.files) {
          const tier = file.path.startsWith('frontend/') ? 'frontend' : (file.path.startsWith('docs/') ? 'docs' : 'backend');
          const ext = file.path.split('.').pop() || 'js';
          await realTimeJobManager.recordFileCreated(job._id, file.path, file.content ? file.content.length : 0, ext, tier);
        }
      }

      await realTimeJobManager.updateJobStage(job._id, JOB_STAGES.PACKAGING, 'Release Manager', 98, 'Packaging project repository and zip artifact');

      const project = await Project.create({
        owner: job.owner,
        name: genProject.name,
        description: genProject.description,
        framework: genProject.framework,
        database: genProject.database,
        prompt: job.prompt,
        files: genProject.files,
        generationTime: duration,
      });

      logger.info('Project Saved to Database');

      // Post-completion continuous self-learning
      SelfLearningStore.learnFromCompletedProject(project, job.owner).catch(err => {
        logger.warn(`Self-Learning Store notice: ${err.message}`);
      });

      const aiMessageContent = `Here is your complete REST API for "${genProject.name}". It runs on ${genProject.framework} and interfaces with ${genProject.database}. You can inspect and download the repository now.`;

      await Message.create({
        chat: job.chat,
        sender: 'ai',
        content: aiMessageContent,
        project: project._id,
      });

      await QueueService.completeJob(job._id, project._id);

      // Emit ZipReady & JobCompleted Events
      eventBus.publish('ZipReady', job._id, 'Release Manager', JOB_STAGES.PACKAGING, 'Completed', 100, 'Project ZIP package ready for download', { downloadUrl: `/api/generator/download/${project._id}` });
      
      eventBus.publish('JobCompleted', job._id, 'System', JOB_STAGES.COMPLETED, 'Completed', 100, `Successfully completed processing job ${job._id} in ${duration}ms`, { projectId: project._id, generationDurationMs: duration, totalFilesCount: genProject.files ? genProject.files.length : 0 });

      logger.info(`Successfully completed processing job ${job._id} in ${duration}ms`);

    } catch (error) {
      if (error.message && error.message.startsWith('JOB_CANCELLED')) {
        logger.warn(`Job ${job._id} execution halted due to user cancellation.`);
        return;
      }

      logger.error(`Failed to process job ${job._id}: ${error.message}`);

      let displayErrorObj = {
        success: false,
        reason: error.message
      };

      try {
        const parsed = JSON.parse(error.message);
        if (parsed && parsed.reason === 'Groq rate limit exceeded') {
          displayErrorObj = parsed;
        }
      } catch (e) {}

      await QueueService.failJob(job._id, JSON.stringify(displayErrorObj));

      eventBus.publish('JobFailed', job._id, 'System', JOB_STAGES.FAILED, 'Failed', 100, `Job execution failed: ${error.message}`, { error: error.message });
    }
  }
}

export default JobWorker;
