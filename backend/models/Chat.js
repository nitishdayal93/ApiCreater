import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please add a chat title'],
      trim: true,
      default: 'New Generator Chat',
    },
    pinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

ChatSchema.index({ user: 1, pinned: -1, updatedAt: -1 });

export default mongoose.model('Chat', ChatSchema);
