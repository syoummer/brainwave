import { AppConfig } from '../types';
import { logger } from '../utils/logger';

// Configuration constants for OpenAI realtime API
export const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
export const OPENAI_REALTIME_MODALITIES = (process.env.OPENAI_REALTIME_MODALITIES || 'text').split(',');
export const OPENAI_REALTIME_SESSION_TTL_SEC = parseInt(process.env.OPENAI_REALTIME_SESSION_TTL_SEC || '60', 10);

export function loadConfig(): AppConfig {
  const config: AppConfig = {
    server: {
      port: parseInt(process.env.PORT || '3005', 10),
      host: process.env.HOST || '0.0.0.0',
      staticPath: process.env.STATIC_PATH || '../app/static',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      realtimeModel: OPENAI_REALTIME_MODEL,
      modalities: OPENAI_REALTIME_MODALITIES,
      sessionTtlSec: OPENAI_REALTIME_SESSION_TTL_SEC,
    },
    gemini: process.env.GOOGLE_API_KEY ? {
      apiKey: process.env.GOOGLE_API_KEY,
      defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-pro',
    } : undefined,
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.LOG_FORMAT || 'pretty',
    },
  };

  return config;
}

export function validateConfig(config: AppConfig): void {
  const errors: string[] = [];

  // Validate server configuration
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('Server port must be between 1 and 65535');
  }

  if (!config.server.host) {
    errors.push('Server host is required');
  }

  // Validate OpenAI configuration
  if (!config.openai.apiKey) {
    logger.warn('OPENAI_API_KEY is not set; realtime features requiring OpenAI will be disabled until configured.');
  }

  if (!config.openai.realtimeModel) {
    errors.push('OpenAI realtime model is required');
  }

  if (!Array.isArray(config.openai.modalities) || config.openai.modalities.length === 0) {
    errors.push('OpenAI modalities must be a non-empty array');
  }

  // Validate Gemini configuration (optional)
  if (config.gemini && !config.gemini.apiKey) {
    logger.warn('GOOGLE_API_KEY is set but empty; Gemini features will be disabled');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

export const config = loadConfig();