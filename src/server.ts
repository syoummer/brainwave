import Fastify, { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { config, loadConfig } from './config';
import { WebSocketManager } from './services/websocket-manager';
import { registerTextEnhancementRoutes } from './routes/text-enhancement';
import { logRequest, logError } from './utils/logger';
import { ApiKeys } from './electron/settings-manager';

export async function createServer(apiKeys?: ApiKeys): Promise<FastifyInstance> {
  // Create dynamic configuration with API keys if provided
  let serverConfig = config;
  if (apiKeys) {
    // Temporarily set environment variables for this server instance
    if (apiKeys.openai) {
      process.env.OPENAI_API_KEY = apiKeys.openai;
    }
    if (apiKeys.gemini) {
      process.env.GOOGLE_API_KEY = apiKeys.gemini;
    }
    // Reload configuration with updated environment variables
    serverConfig = loadConfig();
  }

  const server = Fastify({
    logger: {
      level: config.logging.level,
      transport: (process.env.NODE_ENV !== 'production' && !process.versions.electron) ? {
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
  const webSocketManager = new WebSocketManager(serverConfig);
  webSocketManager.registerRoutes(server);

  // Register HTTP API routes
  await registerTextEnhancementRoutes(server);

  // Determine the correct public directory path
  const getPublicPath = () => {
    if (process.versions.electron) {
      // In Electron, resources are in the app.asar or extraResources
      const { app } = require('electron');
      const path = require('path');
      
      if (app.isPackaged) {
        // In packaged app, public files are in extraResources
        return path.join(process.resourcesPath, 'public');
      } else {
        // In development, use the regular public directory
        return path.join(process.cwd(), 'public');
      }
    } else {
      // In web mode, use the regular public directory
      return join(process.cwd(), 'public');
    }
  };

  const publicPath = getPublicPath();

  // Register static file serving
  await server.register(fastifyStatic, {
    root: publicPath,
    prefix: '/static/',
  });

  // Settings route serving settings.html
  server.get('/settings', async (request, reply) => {
    try {
      const htmlPath = join(publicPath, 'settings.html');
      const html = await readFile(htmlPath, 'utf-8');
      reply.type('text/html; charset=utf-8').send(html);
    } catch (error) {
      server.log.error({ 
        error: error instanceof Error ? error.message : String(error),
        htmlPath: join(publicPath, 'settings.html'),
        publicPath
      }, 'Failed to serve settings.html');
      reply.status(500).send({ error: 'Failed to load settings page' });
    }
  });

  // Root route serving realtime.html
  server.get('/', async (request, reply) => {
    try {
      const htmlPath = join(publicPath, 'realtime.html');
      const html = await readFile(htmlPath, 'utf-8');
      reply.type('text/html; charset=utf-8').send(html);
    } catch (error) {
      server.log.error({ 
        error: error instanceof Error ? error.message : String(error),
        htmlPath: join(publicPath, 'realtime.html'),
        publicPath
      }, 'Failed to serve realtime.html');
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
        openaiConfigured: !!serverConfig.openai.apiKey,
        geminiConfigured: !!serverConfig.gemini?.apiKey,
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

  // Note: In Electron environment, graceful shutdown is handled by the main process
  // Don't add process event listeners here to avoid conflicts
  
  return server;
}