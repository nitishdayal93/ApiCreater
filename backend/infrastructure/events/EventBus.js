import { EventEmitter } from 'events';
import logger from '../../utils/logger.js';

/**
 * CENTRAL ENTERPRISE EVENT BUS
 * High-performance singleton Event Bus for real-time AI platform event streaming.
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(500); // Support high concurrent client SSE listeners
    this.eventHistory = new Map(); // In-memory buffer per jobId for client reconnect recovery
    this.historyLimit = 200;
  }

  /**
   * Publish a real-time event across the platform
   */
  publish(eventType, jobId, agent = 'System', stage = 'Queued', status = 'Running', progress = 0, message = '', metadata = {}) {
    const eventPayload = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      jobId: String(jobId),
      agent,
      stage,
      status,
      progress: Math.min(100, Math.max(0, progress)),
      timestamp: new Date().toISOString(),
      message,
      metadata
    };

    // Buffer in event history for stream reconnection catch-up
    if (!this.eventHistory.has(String(jobId))) {
      this.eventHistory.set(String(jobId), []);
    }
    const history = this.eventHistory.get(String(jobId));
    history.push(eventPayload);
    if (history.length > this.historyLimit) {
      history.shift();
    }

    logger.debug(`[EventBus] Published "${eventType}" for Job ${jobId} (${progress}% - ${stage})`);

    // Emit global and job-specific event streams
    this.emit('event', eventPayload);
    this.emit(`job:${jobId}`, eventPayload);
    this.emit(eventType, eventPayload);

    return eventPayload;
  }

  /**
   * Retrieve buffered event history for a job
   */
  getJobHistory(jobId) {
    return this.eventHistory.get(String(jobId)) || [];
  }

  /**
   * Clear event history when job completes or is deleted
   */
  clearJobHistory(jobId) {
    this.eventHistory.delete(String(jobId));
  }
}

// Export singleton instance
export const eventBus = new EventBus();
export default eventBus;
