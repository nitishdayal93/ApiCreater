import mongoose from 'mongoose';

const MemoryItemSchema = new mongoose.Schema(
  {
    owner: {
      type: String,
      default: null,
    },
    tier: {
      type: String,
      enum: ['short_term', 'long_term', 'user', 'project', 'workspace', 'org', 'agent', 'global'],
      default: 'long_term',
    },
    category: {
      type: String,
      enum: ['preference', 'architecture', 'template', 'error_solution', 'adr', 'graph_node', 'reasoning'],
      required: true,
    },
    key: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    vectorEmbedding: {
      type: [Number],
      default: [],
    },
    qualityScore: {
      type: Number,
      default: 95,
    },
    usageCount: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

MemoryItemSchema.index({ owner: 1, category: 1 });
MemoryItemSchema.index({ key: 1, tier: 1 });

export default mongoose.model('MemoryItem', MemoryItemSchema);
