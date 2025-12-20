import Fastify, { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { config } from './config';
import { WebSocketManager } from './services/websocket-manager';
import { registerTextEnhancementRoutes } from './routes/text-enhancement';
import { logRequest, logError } from './utils/logger';

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: config.logging.level,
      transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
  });

  // Register CORS
  await server.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // Add request/response logging middleware
  server.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now();
  });

  server.addHook('onResponse', async (request, reply) => {
    const responseTime = Date.now() - (request.startTime || Date.now());
    logRequest(
      request.method,
      request.url,
      reply.statusCode,
      responseTime,
      {
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      }
    );
  });

  // Register WebSocket support
  await server.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1MB max payload
    },
  });

  // Initialize WebSocket manager and register routes
  const webSocketManager = new WebSocketManager();
  webSocketManager.registerRoutes(server);

  // Register HTTP API routes
  await registerTextEnhancementRoutes(server);

  // Register static file serving
  await server.register(fastifyStatic, {
    root: join(process.cwd(), 'public'),
    prefix: '/static/',
  });

  // Root route serving realtime.html
  server.get('/', async (request, reply) => {
    try {
      const htmlPath = join(process.cwd(), 'public', 'realtime.html');
      const html = await readFile(htmlPath, 'utf-8');
      reply.type('text/html; charset=utf-8').send(html);
    } catch (error) {
      server.log.error({ error }, 'Failed to serve realtime.html');
      reply.status(500).send({ error: 'Failed to load page' });
    }
  });

  // Health check endpoint
  server.get('/health', async (request, reply) => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      config: {
        openaiConfigured: !!config.openai.apiKey,
        geminiConfigured: !!config.gemini?.apiKey,
      },
    };
  });

  // Global error handler
  server.setErrorHandler(async (error, request, reply) => {
    logError(error, {
      method: request.method,
      url: request.url,
      statusCode: error.statusCode || 500,
    });
    
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : error.message;
    
    return reply.status(statusCode).send({
      error: {
        message,
        statusCode,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Graceful shutdown handler
  const gracefulShutdown = async () => {
    server.log.info('Starting graceful shutdown...');
    try {
      await server.close();
      server.log.info('Server closed successfully');
    } catch (error) {
      server.log.error({ error }, 'Error during shutdown');
    }
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return server;
}