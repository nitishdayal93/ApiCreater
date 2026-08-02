import dns from 'dns';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  // Solve Node.js DNS SRV resolution issue on Windows/some local setups
  try {
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (dnsErr) {
    logger.warn(`Could not set custom DNS servers: ${dnsErr.message}`);
  }

  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/openapi-ai';
  const fallbackUri = 'mongodb://127.0.0.1:27017/openapi-ai';

  try {
    const conn = await mongoose.connect(primaryUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.warn(`Primary Database Connection Failed (${error.message}). Trying local fallback...`);
    if (primaryUri !== fallbackUri) {
      try {
        const fallbackConn = await mongoose.connect(fallbackUri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
        });
        logger.info(`MongoDB Local Fallback Connected: ${fallbackConn.connection.host}`);
        return;
      } catch (fallbackErr) {
        logger.error(`Fallback Database Connection Error: ${fallbackErr.message}`);
      }
    }
    logger.error(`Database Connection Error: ${error.message}`);
  }
};

export default connectDB;
