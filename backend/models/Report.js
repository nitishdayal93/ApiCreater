import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    category: {
      type: String,
      enum: ['Broken Generation', 'Incorrect API', 'Bug', 'Abuse', 'Other'],
      required: [true, 'Please add report category'],
    },
    description: {
      type: String,
      required: [true, 'Please add report details'],
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Report', ReportSchema);
