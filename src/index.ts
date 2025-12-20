import { config } from 'dotenv';
import { createServer } from './server';
import { logger, logError } from './utils/logger';
import { validateConfig, config as appConfig } from './config';

// Load environment variables
config();

/**
 * Validate startup requirements
 */
function validateStartupRequirements(): void {
  const errors: string[] = [];
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    errors.push(`Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
  }
  
  // Check required environment variables
  if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
    errors.push('At least one API key (OPENAI_API_KEY or GOOGLE_API_KEY) must be configured');
  }
  
  // Check port availability (basic check)
  const port = appConfig.server.port;
  if (port < 1024 || port > 65535) {
    errors.push(`Invalid port number: ${port}. Must be between 1024 and 65535.`);
  }
  
  if (errors.length > 0) {
    logger.error('Startup validation failed:');
    errors.forEach(error => logger.error(`  - ${error}`));
    throw new Error('Startup validation failed');
  }
}

async function bootstrap() {
  try {
    // Validate startup requirements
    validateStartupRequirements();
    logger.info('Startup requirements validated successfully');
    
    // Validate configuration on startup
    validateConfig(appConfig);
    logger.info('Configuration validated successfully');
    
    const server = await createServer();
    
    await server.listen({ 
      port: appConfig.server.port, 
      host: appConfig.server.host 
    });
    
    logger.info(`🚀 Server running on http://${appConfig.server.host}:${appConfig.server.port}`);
    
    // Log configuration status
    if (appConfig.openai.apiKey) {
      logger.info('✅ OpenAI API key configured - realtime features enabled');
    } else {
      logger.warn('⚠️  OpenAI API key not configured - realtime features disabled');
    }
    
    if (appConfig.gemini?.apiKey) {
      logger.info('✅ Gemini API key configured - Gemini features enabled');
    } else {
      logger.info('ℹ️  Gemini API key not configured - Gemini features disabled');
    }
    
    // Log available endpoints
    logger.info('Available endpoints:');
    logger.info('  - GET  / (Web interface)');
    logger.info('  - GET  /health (Health check)');
    logger.info('  - WS   /api/v1/ws (WebSocket for realtime audio)');
    logger.info('  - POST /api/v1/readability (Text enhancement)');
    logger.info('  - POST /api/v1/ask_ai (AI Q&A)');
    logger.info('  - POST /api/v1/correctness (Factual checking)');
    
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      phase: 'startup',
      config: {
        port: appConfig.server.port,
        host: appConfig.server.host,
      }
    });
    process.exit(1);
  }
}

// Handle graceful shutdown (only in standalone mode, not in Electron)
if (!process.versions.electron) {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });

  // Only bootstrap in standalone mode
  bootstrap();
}