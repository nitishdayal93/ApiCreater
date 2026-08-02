import mongoose from 'mongoose';

export const JOB_STAGES = {
  QUEUED: 'Queued',
  PLANNING: 'Planning',
  ARCHITECTURE: 'Architecture',
  DATABASE: 'Database',
  BACKEND: 'Backend',
  FRONTEND: 'Frontend',
  TESTING: 'Testing',
  SECURITY: 'Security',
  REVIEW: 'Review',
  PACKAGING: 'Packaging',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed'
};

const JobSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'paused'],
      default: 'pending',
    },
    currentStage: {
      type: String,
      default: JOB_STAGES.QUEUED,
    },
    progressPercent: {
      type: Number,
      default: 0,
    },
    currentAgent: {
      type: String,
      default: 'System',
    },
    progress: {
      type: [String],
      default: [],
    },
    events: [
      {
        eventId: String,
        agent: String,
        stage: String,
        status: String,
        progress: Number,
        timestamp: String,
        message: String,
        metadata: mongoose.Schema.Types.Mixed
      }
    ],
    generatedFiles: [
      {
        path: String,
        size: Number,
        language: String,
        tier: String,
        createdAt: { type: Date, default: Date.now }
      }
    ],
    error: {
      type: String,
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    lockTime: {
      type: Date,
      default: null,
    },
    workerId: {
      type: String,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
    metrics: {
      generationDurationMs: { type: Number, default: 0 },
      filesGeneratedCount: { type: Number, default: 0 },
      agentsUtilizedCount: { type: Number, default: 0 },
      qualityScore: { type: Number, default: 100 }
    },
    completedAt: {
      type: Date,
      default: null,
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for fast polling, user queries, and lock querying
JobSchema.index({ status: 1, lockTime: 1 });
JobSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model('Job', JobSchema);
