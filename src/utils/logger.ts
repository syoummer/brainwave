import pino from 'pino';

// Create logger with environment-based configuration (avoid circular dependency)
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: (process.env.NODE_ENV !== 'production' && !process.versions.electron) ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Helper functions for structured logging
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error({
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...context,
  }, 'Error occurred');
};

export const logRequest = (method: string, url: string, statusCode: number, responseTime: number, context?: Record<string, any>) => {
  logger.info({
    request: {
      method,
      url,
      statusCode,
      responseTime,
    },
    ...context,
  }, 'HTTP Request');
};

export const logWebSocketEvent = (event: string, connectionId: string, context?: Record<string, any>) => {
  logger.info({
    websocket: {
      event,
      connectionId,
    },
    ...context,
  }, 'WebSocket Event');
};

export const logAudioProcessing = (event: string, metrics?: Record<string, any>) => {
  logger.info({
    audio: {
      event,
      ...metrics,
    },
  }, 'Audio Processing');
};

export const logOpenAIInteraction = (event: string, context?: Record<string, any>) => {
  logger.info({
    openai: {
      event,
    },
    ...context,
  }, 'OpenAI Interaction');
};