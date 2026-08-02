import eventBus from '../events/EventBus.js';
import logger from '../../utils/logger.js';

class JobStreamManager {
  constructor() {
    this.streams = new Map(); // Map<jobId, Set<expressRes>>
    this.heartbeatIntervalMs = 15000; // 15s Heartbeat
    this.startHeartbeatTimer();
  }

  /**
   * Subscribe an SSE client stream to a job's live event stream
   */
  subscribeClient(jobId, res, req) {
    const stringJobId = String(jobId);

    // Set SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx proxy buffering
    res.flushHeaders();

    if (!this.streams.has(stringJobId)) {
      this.streams.set(stringJobId, new Set());
    }
    const clientSet = this.streams.get(stringJobId);
    clientSet.add(res);

    logger.info(`SSE Stream: Client connected to Job ${stringJobId} (Active clients: ${clientSet.size})`);

    // Send initial backlog for instant catch-up upon page refresh or reconnect
    const history = eventBus.getJobHistory(stringJobId);
    for (const evt of history) {
      res.write(`event: ${evt.agent.replace(/\s+/g, '')}Event\ndata: ${JSON.stringify(evt)}\n\n`);
    }

    // Attach listener for real-time push events from EventBus
    const eventHandler = (eventPayload) => {
      if (res.writableEnded) return;
      res.write(`event: ${eventPayload.agent.replace(/\s+/g, '')}Event\ndata: ${JSON.stringify(eventPayload)}\n\n`);
    };

    eventBus.on(`job:${stringJobId}`, eventHandler);

    // Handle client disconnect
    req.on('close', () => {
      eventBus.off(`job:${stringJobId}`, eventHandler);
      clientSet.delete(res);
      if (clientSet.size === 0) {
        this.streams.delete(stringJobId);
      }
      logger.info(`SSE Stream: Client disconnected from Job ${stringJobId}`);
    });
  }

  /**
   * Broadcast heartbeat event across all open client connections
   */
  startHeartbeatTimer() {
    setInterval(() => {
      const heartbeatPayload = JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      });

      for (const [jobId, clientSet] of this.streams.entries()) {
        for (const res of clientSet) {
          if (!res.writableEnded) {
            res.write(`event: heartbeat\ndata: ${heartbeatPayload}\n\n`);
          } else {
            clientSet.delete(res);
          }
        }
        if (clientSet.size === 0) {
          this.streams.delete(jobId);
        }
      }
    }, this.heartbeatIntervalMs);
  }
}

export const jobStreamManager = new JobStreamManager();
export default jobStreamManager;
