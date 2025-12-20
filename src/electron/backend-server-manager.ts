import { FastifyInstance } from 'fastify';
import { createServer } from '../server';
import { logger, logError } from '../utils/logger';
import { config } from '../config';
import { errorHandler } from './error-handler';
import { SettingsManager, ApiKeys } from './settings-manager';

export class BackendServerManager {
  private server: FastifyInstance | null = null;
  private port: number = config.server.port || 3005;
  private isServerRunning: boolean = false;
  private readonly maxRetries: number = 5;
  private readonly alternativePorts: number[] = [3005, 3006, 3007, 3008, 3009, 3010];
  private readonly startupTimeoutMs: number = 10000; // 10 seconds timeout
  private settingsManager: SettingsManager;

  constructor(settingsManager?: SettingsManager) {
    this.settingsManager = settingsManager || new SettingsManager();
  }

  async start(port?: number): Promise<void> {
    if (this.isServerRunning) {
      logger.info('Backend server is already running');
      return;
    }

    try {
      await this.startWithRetry(port);
    } catch (error) {
      const serverError = error instanceof Error ? error : new Error(String(error));
      logError(serverError, { 
        context: 'backend_server_startup',
        port: port || this.port,
        alternativePorts: this.alternativePorts
      });
      throw serverError;
    }
  }

  private async startWithRetry(port?: number): Promise<void> {
    this.port = port || this.port;
    
    logger.info(`Starting backend server on port ${this.port}...`);
    
    try {
      // Load API keys from settings and get updated config
      const apiKeys = await this.settingsManager.getApiKeys();
      
      // Create the Fastify server with dynamic configuration
      this.server = await createServer(apiKeys);
      
      // Start the server with timeout
      await Promise.race([
        this.server.listen({ 
          port: this.port, 
          host: '127.0.0.1' 
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Server startup timeout')), this.startupTimeoutMs)
        )
      ]);
      
      this.isServerRunning = true;
      logger.info(`✅ Backend server started successfully on http://127.0.0.1:${this.port}`);
    } catch (error) {
      logger.error('Failed to start backend server:', error);
      
      // Try alternative ports if the default port is occupied
      if (this.isPortConflictError(error)) {
        await this.tryAlternativePorts();
      } else {
        throw new Error(`Backend server startup failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async startServerDirectly(port: number): Promise<void> {
    logger.info(`Starting backend server on port ${port}...`);
    
    // Load API keys from settings and get updated config
    const apiKeys = await this.settingsManager.getApiKeys();
    
    // Create the Fastify server with dynamic configuration
    this.server = await createServer(apiKeys);
    
    // Start the server with timeout
    await Promise.race([
      this.server.listen({ 
        port: port, 
        host: '127.0.0.1' 
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Server startup timeout')), this.startupTimeoutMs)
      )
    ]);
    
    this.port = port;
    this.isServerRunning = true;
    logger.info(`✅ Backend server started successfully on http://127.0.0.1:${port}`);
  }

  async stop(): Promise<void> {
    if (!this.server || !this.isServerRunning) {
      logger.info('Backend server is not running, nothing to stop');
      return;
    }

    try {
      logger.info('Stopping backend server...');
      await this.server.close();
      this.server = null;
      this.isServerRunning = false;
      logger.info('✅ Backend server stopped successfully');
    } catch (error) {
      const stopError = error instanceof Error ? error : new Error(String(error));
      logError(stopError, { 
        context: 'backend_server_shutdown',
        port: this.port
      });
      
      // Force cleanup even if graceful shutdown fails
      this.server = null;
      this.isServerRunning = false;
      throw new Error(`Backend server shutdown failed: ${stopError.message}`);
    }
  }

  isRunning(): boolean {
    return this.isServerRunning && this.server !== null;
  }

  getServerUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  getPort(): number {
    return this.port;
  }

  async reloadApiKeys(): Promise<void> {
    try {
      // For now, we need to restart the server to reload API keys
      // In the future, we could implement hot reloading
      logger.info('API keys updated - server restart required for changes to take effect');
    } catch (error) {
      logger.error('Failed to reload API keys:', error);
      throw error;
    }
  }

  private isPortConflictError(error: any): boolean {
    return error instanceof Error && 
           (error.message.includes('EADDRINUSE') || 
            error.message.includes('address already in use'));
  }

  private async tryAlternativePorts(): Promise<void> {
    let lastError: Error | null = null;
    
    logger.warn(`Port ${this.port} is occupied, trying alternative ports...`);
    
    for (const port of this.alternativePorts) {
      try {
        logger.info(`Trying alternative port ${port}...`);
        
        // Reset server state before retry
        if (this.server) {
          try {
            await this.server.close();
          } catch (e) {
            // Ignore errors during cleanup
            logger.debug('Ignoring cleanup error during port retry:', e);
          }
          this.server = null;
        }
        this.isServerRunning = false;
        
        // Try to start on alternative port
        await this.startServerDirectly(port);
        logger.info(`✅ Successfully started on alternative port ${port}`);
        return; // Success!
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.debug(`Port ${port} is also occupied, trying next...`);
        continue;
      }
    }
    
    const errorMessage = `Unable to find an available port for the backend server. Tried ports: ${this.port}, ${this.alternativePorts.join(', ')}. Last error: ${lastError?.message}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
}