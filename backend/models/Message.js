import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    sender: {
      type: String,
      enum: ['user', 'ai'],
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Please add message content'],
    },
    // Optional reference to a generated project if this message generated one
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
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

MessageSchema.index({ chat: 1, createdAt: 1 });

export default mongoose.model('Message', MessageSchema);
