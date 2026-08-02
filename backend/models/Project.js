import mongoose from 'mongoose';

const ProjectFileSchema = new mongoose.Schema({
  path: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
});

const ProjectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please add project name'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    framework: {
      type: String,
      default: 'Node.js + Express',
    },
    database: {
      type: String,
      default: 'MongoDB',
    },
    prompt: {
      type: String,
      required: true,
    },
    files: [ProjectFileSchema],
    downloads: {
      type: Number,
      default: 0,
    },
    generationTime: {
      type: Number, // In milliseconds
      default: 0,
    },
    tokens: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model('Project', ProjectSchema);
