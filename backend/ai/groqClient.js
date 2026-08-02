import Groq from 'groq-sdk';
import logger from '../utils/logger.js';

let groqInstance = null;
let currentApiKey = null;

/**
 * Centralized Model Router Configuration
 */
export const MODEL_CONFIG = {
  PLANNER: 'llama-3.3-70b-versatile',
  GENERATOR: 'llama-3.3-70b-versatile',
  REVIEWER: 'llama-3.3-70b-versatile',
  FIXER: 'llama-3.3-70b-versatile',
  DEFAULT: 'llama-3.3-70b-versatile'
};

export const getModelForTask = (taskName = 'DEFAULT') => {
  const key = String(taskName).toUpperCase();
  return MODEL_CONFIG[key] || MODEL_CONFIG.DEFAULT;
};

/**
 * Error Categories & Error Classification Engine
 */
export const ERROR_CATEGORIES = {
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  NETWORK: 'NETWORK_ERROR',
  MODEL: 'MODEL_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

export const classifyError = (error) => {
  if (!error) return ERROR_CATEGORIES.UNKNOWN;

  const status = error.status || error.statusCode;
  const msg = String(error.message || '').toLowerCase();

  if (status === 401 || msg.includes('api key') || msg.includes('unauthorized')) {
    return ERROR_CATEGORIES.AUTHENTICATION;
  }
  if (status === 429 || msg.includes('rate_limit') || msg.includes('rate limit')) {
    return ERROR_CATEGORIES.RATE_LIMIT;
  }
  if (msg.includes('timeout') || msg.includes('timed out') || error.code === 'ETIMEDOUT') {
    return ERROR_CATEGORIES.TIMEOUT;
  }
  if (status === 503 || status === 504 || error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
    return ERROR_CATEGORIES.NETWORK;
  }
  if (status === 400 || msg.includes('invalid') || msg.includes('bad request')) {
    return ERROR_CATEGORIES.VALIDATION;
  }

  return ERROR_CATEGORIES.UNKNOWN;
};

/**
 * Real-Time Infrastructure Metrics Tracker
 */
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  retryCount: 0,
  timeoutCount: 0,
  totalLatencyMs: 0
};

export const getGroqMetrics = () => {
  const avgLatency = metrics.successfulRequests > 0
    ? Math.round(metrics.totalLatencyMs / metrics.successfulRequests)
    : 0;

  const successRate = metrics.totalRequests > 0
    ? Number(((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2))
    : 100;

  return {
    totalRequests: metrics.totalRequests,
    successfulRequests: metrics.successfulRequests,
    failedRequests: metrics.failedRequests,
    retryCount: metrics.retryCount,
    timeoutCount: metrics.timeoutCount,
    averageLatencyMs: avgLatency,
    successRatePercent: successRate
  };
};

export const resetGroqMetrics = () => {
  metrics.totalRequests = 0;
  metrics.successfulRequests = 0;
  metrics.failedRequests = 0;
  metrics.retryCount = 0;
  metrics.timeoutCount = 0;
  metrics.totalLatencyMs = 0;
};

/**
 * Request & Response Validation Helpers
 */
export const validateCompletionRequest = (params = {}) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY is missing or unconfigured.');
  }

  if (params.temperature !== undefined && (params.temperature < 0 || params.temperature > 2)) {
    throw new Error('Invalid temperature parameter. Must be between 0.0 and 2.0.');
  }
};

export const validateCompletionResponse = (response) => {
  if (!response) {
    throw new Error('Groq returned empty/null response payload.');
  }
  const content = response.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Groq completion choice content is empty.');
  }
  return content;
};

/**
 * Returns a singleton Groq client instance.
 * Dynamically re-initializes if the GROQ_API_KEY environment variable changes.
 */
export const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  if (!groqInstance || currentApiKey !== apiKey) {
    groqInstance = new Groq({ apiKey });
    currentApiKey = apiKey;
    logger.info('Initialized a new Groq client instance.');
  }

  return groqInstance;
};

// Simple helper to pause execution
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Applies request delay spacing using AI_DELAY from .env (default 800ms).
 */
export const applyRequestDelay = async () => {
  const delay = parseInt(process.env.AI_DELAY || '800', 10);
  if (delay > 0) {
    await sleep(delay);
  }
};

/**
 * Executes a Groq completion with Exponential Backoff Retries, Timeout Guard, and Error Classification.
 * 100% Backward Compatible Function Signature: (apiCallFn, maxRetries = 3, options = {})
 */
export const executeWithRetry = async (apiCallFn, maxRetries = 3, options = {}) => {
  const timeoutMs = options.timeoutMs || parseInt(process.env.AI_TIMEOUT_MS || '45000', 10);
  const startTime = Date.now();
  metrics.totalRequests++;

  let attempt = 0;

  while (true) {
    try {
      // Wrap apiCallFn in a Timeout Promise Guard
      const completionPromise = apiCallFn();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          metrics.timeoutCount++;
          const err = new Error(`Groq API request timed out after ${timeoutMs}ms`);
          err.code = 'ETIMEDOUT';
          reject(err);
        }, timeoutMs);
      });

      const response = await Promise.race([completionPromise, timeoutPromise]);

      // Validate Response
      validateCompletionResponse(response);

      // Track Metrics
      const duration = Date.now() - startTime;
      metrics.successfulRequests++;
      metrics.totalLatencyMs += duration;

      logger.info(`Groq API call succeeded in ${duration}ms (Attempt ${attempt + 1})`);
      return response;

    } catch (error) {
      attempt++;
      const category = classifyError(error);

      logger.warn(`Groq Request Attempt ${attempt} Failed [Category: ${category}]: ${error.message}`);

      // Check if error is retryable
      const isRetryable = category === ERROR_CATEGORIES.RATE_LIMIT ||
                          category === ERROR_CATEGORIES.NETWORK ||
                          category === ERROR_CATEGORIES.TIMEOUT;

      if (isRetryable && attempt <= maxRetries) {
        metrics.retryCount++;

        // Determine backoff delay (respect Retry-After header or msg if present)
        let backoffMs = Math.pow(2, attempt) * 1500; // 3s, 6s, 12s
        if (error.headers && error.headers['retry-after']) {
          const headerVal = parseInt(error.headers['retry-after'], 10);
          if (!isNaN(headerVal) && headerVal > 0) {
            backoffMs = headerVal * 1000;
          }
        } else if (error.message && error.message.includes('try again in')) {
          const match = error.message.match(/try again in ([\d\.]+)s/);
          if (match && match[1]) {
            backoffMs = Math.ceil(parseFloat(match[1]) * 1000) + 500;
          }
        }

        logger.warn(`Groq Retrying in ${backoffMs}ms... (Attempt ${attempt}/${maxRetries})`);
        await sleep(backoffMs);
        continue;
      }

      metrics.failedRequests++;
      logger.error(`Groq Request Failed Permanently [Category: ${category}]: ${error.message}`);
      throw error;
    }
  }
};

export default getGroqClient;
