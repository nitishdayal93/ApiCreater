import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema(
  {
    appName: {
      type: String,
      default: 'OpenAPI AI',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    disableRegistration: {
      type: Boolean,
      default: false,
    },
    aiModel: {
      type: String,
      default: 'gemini-2.5-flash',
    },
    rateLimitRequests: {
      type: Number,
      default: 100, // requests per 15 minutes per IP
    },
    maxFileUploadSize: {
      type: Number,
      default: 5 * 1024 * 1024, // 5MB in bytes
    },
  },
  {
    timestamps: true,
  }
);

// We only ever want one configuration settings document.
SettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model('Settings', SettingsSchema);
