import WebSocket from 'ws';
import { OpenAIConfig, SessionConfig } from '../types';
import { logger } from '../utils/logger';
import { OPENAI_REALTIME_MODEL, OPENAI_REALTIME_MODALITIES } from '../config';

export type MessageHandler = (data: any) => Promise<void>;

export interface ReconnectionOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class OpenAIRealtimeClient {
  private apiKey: string;
  private model: string;
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private baseUrl: string = 'wss://api.openai.com/v1/realtime';
  private handlers: Map<string, MessageHandler> = new Map();
  private receiveTask: Promise<void> | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;
  private reconnectionOptions: ReconnectionOptions;
  private retryCount: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(apiKey: string, model?: string, reconnectionOptions?: Partial<ReconnectionOptions>) {
    this.apiKey = apiKey;
    this.model = model || OPENAI_REALTIME_MODEL;
    this.reconnectionOptions = {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      ...reconnectionOptions,
    };
    
    // Register default handler
    this.registerHandler('default', this.defaultHandler.bind(this));
  }

  /**
   * Connect to OpenAI's realtime API and configure the session
   */
  async connect(modalities?: string[]): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      logger.warn('Already connecting or connected to OpenAI');
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;
    
    try {
      await this.attemptConnection(modalities);
      this.retryCount = 0; // Reset retry count on successful connection
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Attempt to establish connection with error handling
   */
  private async attemptConnection(modalities?: string[]): Promise<void> {
    const modalitiesArray = modalities || OPENAI_REALTIME_MODALITIES;
    
    try {
      logger.info(`Connecting to OpenAI realtime API with model: ${this.model} (attempt ${this.retryCount + 1})`);
      
      this.ws = new WebSocket(`${this.baseUrl}?model=${this.model}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      // Set up WebSocket event handlers
      this.ws.on('open', () => {
        logger.info('WebSocket connection to OpenAI established');
        this.isConnected = true;
        this.isConnecting = false;
      });

      this.ws.on('close', (code, reason) => {
        logger.info(`OpenAI WebSocket connection closed: ${code} ${reason.toString()}`);
        this.handleDisconnection();
      });

      this.ws.on('error', (error) => {
        logger.error({ error }, 'OpenAI WebSocket error');
        this.handleConnectionError(error);
      });

      // Wait for connection to open with timeout
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          if (!this.ws) {
            reject(new Error('WebSocket not initialized'));
            return;
          }

          this.ws.once('open', resolve);
          this.ws.once('error', reject);
        }),
        new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 10000);
        }),
      ]);

      // Start receiving messages
      this.receiveTask = this.receiveMessages();

      // Wait for session creation
      const sessionCreated = await this.waitForSessionCreation();
      if (!sessionCreated) {
        throw new Error('Failed to create session');
      }

      // Configure session
      await this.configureSession(modalitiesArray);
      
      logger.info(`OpenAI realtime client connected with session ID: ${this.sessionId}`);
    } catch (error) {
      logger.error({ error }, 'Failed to connect to OpenAI realtime API');
      this.handleConnectionError(error);
      throw error;
    }
  }

  /**
   * Handle connection errors and attempt reconnection
   */
  private handleConnectionError(error: any): void {
    this.isConnected = false;
    this.isConnecting = false;
    
    if (this.shouldReconnect && this.retryCount < this.reconnectionOptions.maxRetries) {
      this.scheduleReconnection();
    } else {
      logger.error('Max reconnection attempts reached or reconnection disabled');
      this.cleanup();
    }
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  private handleDisconnection(): void {
    this.isConnected = false;
    this.sessionId = null;
    
    if (this.shouldReconnect && this.retryCount < this.reconnectionOptions.maxRetries) {
      this.scheduleReconnection();
    } else {
      logger.info('Not attempting reconnection');
      this.cleanup();
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnection(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(
      this.reconnectionOptions.initialDelay * Math.pow(this.reconnectionOptions.backoffFactor, this.retryCount),
      this.reconnectionOptions.maxDelay
    );

    logger.info(`Scheduling reconnection in ${delay}ms (attempt ${this.retryCount + 1}/${this.reconnectionOptions.maxRetries})`);

    this.reconnectTimeout = setTimeout(async () => {
      this.retryCount++;
      try {
        await this.attemptConnection();
        this.retryCount = 0; // Reset on successful connection
      } catch (error) {
        logger.error({ error }, 'Reconnection attempt failed');
      }
    }, delay);
  }

  /**
   * Wait for session creation message
   */
  private async waitForSessionCreation(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const handler = async (data: any) => {
        if (data.type === 'session.created') {
          this.sessionId = data.session.id;
          logger.info(`Session created with ID: ${this.sessionId}`);
          this.handlers.delete('session.created');
          resolve(true);
        }
      };
      
      this.registerHandler('session.created', handler);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        this.handlers.delete('session.created');
        resolve(false);
      }, 10000);
    });
  }

  /**
   * Configure the session with modalities and audio format
   */
  private async configureSession(modalities: string[]): Promise<void> {
    await this.sendMessage({
      type: 'session.update',
      session: {
        modalities,
        input_audio_format: 'pcm16',
        input_audio_transcription: null,
        turn_detection: null,
      },
    });

    logger.info('Session configured successfully with modalities:', modalities);
  }

  /**
   * Receive and handle messages from OpenAI
   */
  private async receiveMessages(): Promise<void> {
    if (!this.ws) {
      throw new Error('WebSocket not initialized');
    }

    this.ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        const messageType = message.type || 'default';
        
        const handler = this.handlers.get(messageType) || this.handlers.get('default');
        if (handler) {
          await handler(message);
        } else {
          logger.warn(`No handler for message type: ${messageType}`);
        }
      } catch (error) {
        logger.error({ error }, 'Error processing message from OpenAI');
      }
    });
  }

  /**
   * Register a message handler
   */
  registerHandler(messageType: string, handler: MessageHandler): void {
    this.handlers.set(messageType, handler);
  }

  /**
   * Default message handler
   */
  private async defaultHandler(data: any): Promise<void> {
    const messageType = data.type || 'unknown';
    logger.debug(`Unhandled message type received from OpenAI: ${messageType}`);
  }

  /**
   * Send audio data to OpenAI with error handling
   */
  async sendAudio(audioData: Buffer): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    try {
      const message = {
        type: 'input_audio_buffer.append',
        audio: audioData.toString('base64'),
      };

      await this.sendMessage(message);
      logger.debug('Sent input_audio_buffer.append message to OpenAI');
    } catch (error) {
      logger.error({ error }, 'Failed to send audio data');
      throw error;
    }
  }

  /**
   * Commit the audio buffer with error handling
   */
  async commitAudio(): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    try {
      await this.sendMessage({
        type: 'input_audio_buffer.commit',
      });

      logger.info('Sent input_audio_buffer.commit message to OpenAI');
    } catch (error) {
      logger.error({ error }, 'Failed to commit audio buffer');
      throw error;
    }
  }

  /**
   * Clear the audio buffer with error handling
   */
  async clearAudioBuffer(): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    try {
      await this.sendMessage({
        type: 'input_audio_buffer.clear',
      });

      logger.info('Sent input_audio_buffer.clear message to OpenAI');
    } catch (error) {
      logger.error({ error }, 'Failed to clear audio buffer');
      throw error;
    }
  }

  /**
   * Start a response with given instructions and error handling
   */
  async startResponse(instructions: string, modalities?: string[]): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    try {
      const responseModalities = modalities || OPENAI_REALTIME_MODALITIES;

      await this.sendMessage({
        type: 'response.create',
        response: {
          modalities: responseModalities,
          instructions,
        },
      });

      logger.info(`Started response with instructions: ${instructions}`);
    } catch (error) {
      logger.error({ error }, 'Failed to start response');
      throw error;
    }
  }

  /**
   * Send a message to OpenAI with error handling
   */
  private async sendMessage(message: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not ready');
    }

    try {
      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
    } catch (error) {
      logger.error({ error, message }, 'Failed to send message to OpenAI');
      throw error;
    }
  }

  /**
   * Disable reconnection and close the connection
   */
  async close(): Promise<void> {
    logger.info('Closing OpenAI realtime client connection');
    
    this.shouldReconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    await this.cleanup();
    logger.info('OpenAI realtime client connection closed');
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    this.isConnected = false;
    this.isConnecting = false;
    
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }

    if (this.receiveTask) {
      try {
        await this.receiveTask;
      } catch (error) {
        logger.debug('Receive task ended with error (expected on close)');
      }
      this.receiveTask = null;
    }

    this.sessionId = null;
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get connecting(): boolean {
    return this.isConnecting;
  }

  get session(): string | null {
    return this.sessionId;
  }

  get retries(): number {
    return this.retryCount;
  }
}