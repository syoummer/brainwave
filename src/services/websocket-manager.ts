import { FastifyInstance, FastifyRequest } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { v4 as uuidv4 } from 'uuid';
import { logger, logWebSocketEvent } from '../utils/logger';
import { 
  ConnectionState, 
  WebSocketStatusMessage, 
  WebSocketTextMessage, 
  WebSocketErrorMessage 
} from '../types';
import { OpenAIRealtimeClient } from './openai-realtime-client';
import { AudioProcessor } from './audio-processor';
import { config } from '../config';
import { PROMPTS } from '../prompts';

export interface WebSocketMessage {
  type: 'start_recording' | 'stop_recording' | 'audio_chunk';
  data?: any;
  timestamp?: number;
}

interface ConnectionAudioState {
  pendingAudioChunks: Buffer[];
  pendingAudioOperations: number;
  allAudioSent: boolean;
  audioSendLock: boolean;
  recordingStopped: boolean;
  openAIReady: boolean;
  responseBuffer: string[];
  markerSeen: boolean;
  deltaCounter: number;
}

export class WebSocketManager {
  private connections: Map<string, ConnectionState> = new Map();
  private audioStates: Map<string, ConnectionAudioState> = new Map();
  private audioProcessor: AudioProcessor;
  
  // Constants from Python version
  private readonly MARKER_PREFIX = "This is the transcription in the original language:\n\n";
  private readonly MAX_PREFIX_DELTAS = 20;

  constructor() {
    this.audioProcessor = new AudioProcessor();
  }

  /**
   * Register WebSocket routes with Fastify
   */
  registerRoutes(server: FastifyInstance): void {
    const self = this;
    server.register(async function (fastify: FastifyInstance) {
      fastify.get('/api/v1/ws', { websocket: true }, self.handleConnection.bind(self));
    });
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(connection: SocketStream, request: FastifyRequest): Promise<void> {
    const connectionId = uuidv4();
    const socket = connection.socket;
    
    logWebSocketEvent('connection_attempt', connectionId);

    // Initialize connection state
    const connectionState: ConnectionState = {
      id: connectionId,
      isRecording: false,
      audioBuffer: [],
    };

    const audioState: ConnectionAudioState = {
      pendingAudioChunks: [],
      pendingAudioOperations: 0,
      allAudioSent: true,
      audioSendLock: false,
      recordingStopped: false,
      openAIReady: false,
      responseBuffer: [],
      markerSeen: false,
      deltaCounter: 0,
    };

    this.connections.set(connectionId, connectionState);
    this.audioStates.set(connectionId, audioState);

    // Send initial status
    await this.sendStatus(socket, 'idle');
    logWebSocketEvent('connection_accepted', connectionId);

    // Handle incoming messages
    socket.on('message', async (data: any) => {
      logger.debug(`Message received for connection ${connectionId}: ${typeof data}`);
      try {
        await this.handleMessage(connectionId, socket, data);
      } catch (error) {
        logger.error({ error, connectionId }, 'Error handling WebSocket message');
        await this.sendError(socket, 'Error processing message');
      }
    });

    // Handle connection close
    socket.on('close', async (code: number, reason: Buffer) => {
      logWebSocketEvent('connection_closed', connectionId, { code, reason: reason.toString() });
      await this.cleanup(connectionId);
    });

    // Handle connection errors
    socket.on('error', async (error: Error) => {
      logWebSocketEvent('connection_error', connectionId, { error: error.message });
      await this.sendError(socket, 'Connection error occurred');
      await this.cleanup(connectionId);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(connectionId: string, socket: any, data: any): Promise<void> {
    logger.debug(`handleMessage called for connection: ${connectionId}, data type: ${typeof data}`);
    
    const connectionState = this.connections.get(connectionId);
    if (!connectionState) {
      logger.error(`Connection state not found for: ${connectionId}`);
      return;
    }

    // Handle Buffer objects (most common case from WebSocket)
    if (Buffer.isBuffer(data)) {
      logger.debug(`Processing Buffer with length: ${data.length}`);
      
      // Try to parse as JSON first (for command messages)
      if (data.length < 1000) { // Small buffers are likely JSON commands
        try {
          const messageText = data.toString('utf8');
          logger.debug(`Buffer contains text: "${messageText}"`);
          
          // Try to parse as JSON
          JSON.parse(messageText);
          logger.debug(`Successfully parsed as JSON, treating as command`);
          await this.handleTextMessage(connectionId, socket, messageText);
          return;
        } catch (jsonError) {
          logger.debug(`Buffer is not valid JSON, treating as audio data`);
          // Not JSON, treat as audio data
          await this.handleAudioData(connectionId, socket, data);
          return;
        }
      } else {
        // Large buffers are audio data
        logger.debug(`Large buffer, treating as audio data`);
        await this.handleAudioData(connectionId, socket, data);
        return;
      }
    }

    // Handle ArrayBuffer, Uint8Array, or other binary data
    if (data && typeof data === 'object' && ('byteLength' in data || 'length' in data)) {
      logger.debug(`Processing object data with length: ${data.length || data.byteLength}`);
      try {
        const buffer = Buffer.from(data);
        logger.info(`Converted to buffer, length: ${buffer.length}`);
        
        // Try JSON parsing for small buffers
        if (buffer.length < 1000) {
          try {
            const messageText = buffer.toString('utf8');
            JSON.parse(messageText);
            logger.debug(`Object data contains valid JSON, treating as command`);
            await this.handleTextMessage(connectionId, socket, messageText);
            return;
          } catch (jsonError) {
            logger.debug(`Object data is not valid JSON, treating as audio data`);
          }
        }
        
        // Treat as audio data
        await this.handleAudioData(connectionId, socket, buffer);
        return;
      } catch (error) {
        logger.error({ error, connectionId }, 'Error processing binary data');
        return;
      }
    }

    // Handle string messages
    if (typeof data === 'string') {
      await this.handleTextMessage(connectionId, socket, data);
      return;
    }

    // Handle other data types
    try {
      const messageText = String(data);
      await this.handleTextMessage(connectionId, socket, messageText);
    } catch (error) {
      logger.error({ error, connectionId }, 'Error processing unknown data type');
    }
  }

  /**
   * Handle text messages (JSON commands)
   */
  private async handleTextMessage(connectionId: string, socket: any, messageText: string): Promise<void> {
    logger.debug(`Processing message: ${messageText}`);
    try {
      const message: WebSocketMessage = JSON.parse(messageText);
      logger.debug(`Parsed message type: ${message.type} for connection: ${connectionId}`);
      
      switch (message.type) {
        case 'start_recording':
          logger.info(`Starting recording for connection: ${connectionId}`);
          await this.handleStartRecording(connectionId, socket);
          break;
        case 'stop_recording':
          logger.info(`Stopping recording for connection: ${connectionId}`);
          await this.handleStopRecording(connectionId, socket);
          break;
        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error({ error, connectionId, messageText }, 'Error parsing WebSocket message');
      await this.sendError(socket, 'Invalid message format');
    }
  }

  /**
   * Handle start recording message
   */
  private async handleStartRecording(connectionId: string, socket: any): Promise<void> {
    const connectionState = this.connections.get(connectionId);
    const audioState = this.audioStates.get(connectionId);
    if (!connectionState || !audioState) return;

    if (connectionState.isRecording) {
      logger.warn(`Connection ${connectionId} is already recording`);
      return;
    }

    logger.debug(`Starting recording for connection: ${connectionId}`);

    try {
      // Update status to connecting while initializing OpenAI
      await this.sendStatus(socket, 'connecting');

      // Initialize OpenAI client
      if (!config.openai.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      logger.info(`Initializing OpenAI client with model: ${config.openai.realtimeModel}`);
      const openAIClient = new OpenAIRealtimeClient(config.openai.apiKey, config.openai.realtimeModel);
      
      // Register OpenAI event handlers
      this.registerOpenAIHandlers(connectionId, socket, openAIClient);
      
      logger.info(`Connecting to OpenAI with modalities: ${config.openai.modalities.join(', ')}`);
      await openAIClient.connect(config.openai.modalities);

      // Update connection state
      connectionState.isRecording = true;
      connectionState.openAIClient = openAIClient;
      connectionState.audioBuffer = [];

      // Reset audio state
      audioState.pendingAudioChunks = [];
      audioState.pendingAudioOperations = 0;
      audioState.allAudioSent = true;
      audioState.recordingStopped = false;
      audioState.openAIReady = true;
      audioState.responseBuffer = [];
      audioState.markerSeen = false;
      audioState.deltaCounter = 0;

      // Send any buffered chunks
      if (audioState.pendingAudioChunks.length > 0) {
        logger.info(`Sending ${audioState.pendingAudioChunks.length} buffered chunks`);
        for (const chunk of audioState.pendingAudioChunks) {
          await this.sendAudioToOpenAI(connectionId, chunk);
        }
        audioState.pendingAudioChunks = [];
      }

      // Update status to connected
      await this.sendStatus(socket, 'connected');
      
      logger.debug(`Recording started successfully for connection: ${connectionId}`);
    } catch (error) {
      logger.error({ error, connectionId }, 'Failed to start recording');
      await this.sendError(socket, 'Failed to initialize recording');
      await this.sendStatus(socket, 'idle');
      
      // Reset states on failure
      audioState.openAIReady = false;
      connectionState.isRecording = false;
    }
  }

  /**
   * Handle stop recording message
   */
  private async handleStopRecording(connectionId: string, socket: any): Promise<void> {
    const connectionState = this.connections.get(connectionId);
    const audioState = this.audioStates.get(connectionId);
    if (!connectionState || !audioState) return;

    if (!connectionState.isRecording) {
      logger.warn(`Connection ${connectionId} is not recording`);
      return;
    }

    logger.debug(`Stopping recording for connection: ${connectionId}`);

    try {
      connectionState.isRecording = false;

      if (connectionState.openAIClient) {
        // CRITICAL: Wait for all pending audio operations to complete before committing
        logger.info("Stop recording received, waiting for all audio to be sent...");
        
        // Wait for any pending audio chunks to be sent (with timeout for safety)
        try {
          await this.waitForAllAudioSent(connectionId, 5000);
          logger.info("All pending audio operations completed");
        } catch (error) {
          logger.warn("Timeout waiting for audio operations to complete, proceeding anyway");
          // Reset the pending counter to prevent deadlock
          audioState.pendingAudioOperations = 0;
          audioState.allAudioSent = true;
        }

        // Add a small buffer to ensure network operations complete
        await new Promise(resolve => setTimeout(resolve, 100));

        logger.info("All audio sent, committing audio buffer...");
        await connectionState.openAIClient.commitAudio();
        
        // Start response with paraphrase prompt
        const paraphrasePrompt = PROMPTS['paraphrase-gpt-realtime-enhanced'];
        if (paraphrasePrompt) {
          await connectionState.openAIClient.startResponse(paraphrasePrompt);
        } else {
          logger.warn("Paraphrase prompt not found, using default");
          await connectionState.openAIClient.startResponse("Please transcribe and paraphrase the audio.");
        }

        // Set recording stopped flag
        audioState.recordingStopped = true;
      }

      // Update status to connected (waiting for response)
      await this.sendStatus(socket, 'connected');
      
      logger.debug(`Recording stopped successfully for connection: ${connectionId}`);
    } catch (error) {
      logger.error({ error, connectionId }, 'Error stopping recording');
      await this.sendError(socket, 'Error stopping recording');
    }
  }

  /**
   * Handle incoming audio data
   */
  private async handleAudioData(connectionId: string, socket: any, audioData: Buffer): Promise<void> {
    const connectionState = this.connections.get(connectionId);
    const audioState = this.audioStates.get(connectionId);
    if (!connectionState || !audioState) return;

    if (!connectionState.isRecording) {
      logger.debug(`Received audio data for non-recording connection: ${connectionId}`);
      return;
    }

    try {
      // Process audio data
      const processedAudio = this.audioProcessor.processAudioChunk(audioData);
      
      // Check if OpenAI is ready
      if (!audioState.openAIReady) {
        logger.debug("OpenAI not ready, buffering audio chunk");
        audioState.pendingAudioChunks.push(processedAudio);
      } else if (connectionState.openAIClient) {
        // Send audio to OpenAI
        await this.sendAudioToOpenAI(connectionId, processedAudio);
        
        // Update status to show we're processing
        await this.sendStatus(socket, 'connected');
      } else {
        logger.warn("Received audio but client is not initialized");
      }

      logger.debug(`Processed audio chunk for connection: ${connectionId}, size: ${processedAudio.length} bytes`);
    } catch (error) {
      logger.error({ error, connectionId }, 'Error processing audio data');
      await this.sendError(socket, 'Error processing audio');
    }
  }

  /**
   * Send status update to client
   */
  private async sendStatus(socket: any, status: 'idle' | 'connecting' | 'connected' | 'processing' | 'error'): Promise<void> {
    try {
      const message: WebSocketStatusMessage = {
        type: 'status',
        status,
      };
      
      if (socket.readyState === 1) { // WebSocket.OPEN
        socket.send(JSON.stringify(message));
      }
    } catch (error) {
      logger.error({ error }, 'Error sending status message');
    }
  }

  /**
   * Send text message to client
   */
  async sendText(socket: any, content: string, isNewResponse: boolean = false): Promise<void> {
    try {
      const message: WebSocketTextMessage = {
        type: 'text',
        content,
        isNewResponse,
      };
      
      if (socket.readyState === 1) { // WebSocket.OPEN
        socket.send(JSON.stringify(message));
      }
    } catch (error) {
      logger.error({ error }, 'Error sending text message');
    }
  }

  /**
   * Send error message to client
   */
  private async sendError(socket: any, content: string): Promise<void> {
    try {
      const message: WebSocketErrorMessage = {
        type: 'error',
        content,
      };
      
      if (socket.readyState === 1) { // WebSocket.OPEN
        socket.send(JSON.stringify(message));
      }
    } catch (error) {
      logger.error({ error }, 'Error sending error message');
    }
  }

  /**
   * Cleanup connection resources
   */
  private async cleanup(connectionId: string): Promise<void> {
    const connectionState = this.connections.get(connectionId);
    const audioState = this.audioStates.get(connectionId);
    if (!connectionState) return;

    try {
      // Close OpenAI client if exists
      if (connectionState.openAIClient) {
        await connectionState.openAIClient.close();
      }

      // Clear audio buffer
      connectionState.audioBuffer = [];

      // Remove connection from maps
      this.connections.delete(connectionId);
      this.audioStates.delete(connectionId);

      logger.info(`Cleaned up connection: ${connectionId}`);
    } catch (error) {
      logger.error({ error, connectionId }, 'Error during connection cleanup');
    }
  }

  /**
   * Register OpenAI event handlers for a connection
   */
  private registerOpenAIHandlers(connectionId: string, socket: any, openAIClient: OpenAIRealtimeClient): void {
    // Register handlers for various OpenAI events
    openAIClient.registerHandler('session.updated', async (data: any) => {
      logger.debug(`Session updated for ${connectionId}`);
    });

    openAIClient.registerHandler('input_audio_buffer.cleared', async (data: any) => {
      logger.debug(`Audio buffer cleared for ${connectionId}`);
    });

    openAIClient.registerHandler('input_audio_buffer.speech_started', async (data: any) => {
      logger.debug(`Speech started for ${connectionId}`);
    });

    openAIClient.registerHandler('input_audio_buffer.speech_stopped', async (data: any) => {
      logger.debug(`Speech stopped for ${connectionId}`);
    });

    openAIClient.registerHandler('input_audio_buffer.committed', async (data: any) => {
      logger.debug(`Audio buffer committed for ${connectionId}`);
    });

    openAIClient.registerHandler('rate_limits.updated', async (data: any) => {
      logger.debug(`Rate limits updated for ${connectionId}`);
    });

    openAIClient.registerHandler('response.output_item.added', async (data: any) => {
      logger.debug(`Output item added for ${connectionId}`);
    });

    openAIClient.registerHandler('conversation.item.created', async (data: any) => {
      logger.debug(`Conversation item created for ${connectionId}`);
    });

    openAIClient.registerHandler('response.content_part.added', async (data: any) => {
      logger.debug(`Content part added for ${connectionId}`);
    });

    openAIClient.registerHandler('response.text.done', async (data: any) => {
      logger.debug(`Text response done for ${connectionId}`);
    });

    openAIClient.registerHandler('response.content_part.done', async (data: any) => {
      logger.debug(`Content part done for ${connectionId}`);
    });

    openAIClient.registerHandler('response.output_item.done', async (data: any) => {
      logger.debug(`Output item done for ${connectionId}`);
    });

    // Critical handlers for text processing
    openAIClient.registerHandler('response.created', async (data: any) => {
      await this.handleResponseCreated(connectionId, socket, data);
    });

    openAIClient.registerHandler('response.text.delta', async (data: any) => {
      logger.debug(`Received response.text.delta for ${connectionId}:`, JSON.stringify(data));
      await this.handleTextDelta(connectionId, socket, data);
    });

    openAIClient.registerHandler('response.done', async (data: any) => {
      await this.handleResponseDone(connectionId, socket, data);
    });

    openAIClient.registerHandler('error', async (data: any) => {
      await this.handleOpenAIError(connectionId, socket, data);
    });

    // Add a catch-all handler to see what other events we might be missing
    openAIClient.registerHandler('default', async (data: any) => {
      const eventType = data.type || 'unknown';
      if (!['session.updated', 'input_audio_buffer.cleared', 'input_audio_buffer.speech_started', 
            'input_audio_buffer.speech_stopped', 'input_audio_buffer.committed', 'rate_limits.updated',
            'response.output_item.added', 'conversation.item.created', 'response.content_part.added',
            'response.text.done', 'response.content_part.done', 'response.output_item.done',
            'response.created', 'response.text.delta', 'response.done', 'error'].includes(eventType)) {
        logger.debug(`Unhandled OpenAI event for ${connectionId}: ${eventType}`, JSON.stringify(data));
      }
    });
  }

  /**
   * Handle response created event
   */
  private async handleResponseCreated(connectionId: string, socket: any, data: any): Promise<void> {
    const audioState = this.audioStates.get(connectionId);
    if (!audioState) return;

    // Reset response state
    audioState.responseBuffer = [];
    audioState.markerSeen = false;
    audioState.deltaCounter = 0;

    // Send new response indicator to client
    await this.sendText(socket, '', true);
    logger.debug(`Response created for ${connectionId}`);
  }

  /**
   * Handle text delta event with marker processing (from Python version)
   */
  private async handleTextDelta(connectionId: string, socket: any, data: any): Promise<void> {
    const audioState = this.audioStates.get(connectionId);
    if (!audioState) return;

    try {
      const delta = data.delta || '';

      if (audioState.markerSeen) {
        // Marker already seen, pass through directly
        await this.sendText(socket, delta, false);
        logger.debug(`Text delta passthrough for ${connectionId}`);
        return;
      }

      if (delta) {
        audioState.responseBuffer.push(delta);
        audioState.deltaCounter++;
      }

      const joined = audioState.responseBuffer.join('');
      const markerIndex = joined.indexOf(this.MARKER_PREFIX);

      if (markerIndex !== -1) {
        // Marker found
        audioState.markerSeen = true;
        const remaining = joined.substring(markerIndex + this.MARKER_PREFIX.length).trim();
        audioState.responseBuffer = [];
        
        // Only emit if there's actual content (not just whitespace)
        if (remaining) {
          await this.sendText(socket, remaining, false);
          logger.debug(`Marker detected, content: ${remaining.length} chars for ${connectionId}`);
        } else {
          logger.debug(`Marker detected but no content after prefix for ${connectionId}`);
        }
        return;
      }

      if (audioState.deltaCounter >= this.MAX_PREFIX_DELTAS) {
        // Max deltas reached, flush buffer
        audioState.markerSeen = true;
        await this.flushBuffer(connectionId, socket, true);
        logger.warn(`Marker prefix not detected after max deltas; emitted buffered text for ${connectionId}`);
      } else {
        logger.debug(`Text delta buffering for ${connectionId}`);
      }
    } catch (error) {
      logger.error({ error, connectionId }, 'Error in handleTextDelta');
    }
  }

  /**
   * Handle response done event
   */
  private async handleResponseDone(connectionId: string, socket: any, data: any): Promise<void> {
    const connectionState = this.connections.get(connectionId);
    const audioState = this.audioStates.get(connectionId);
    if (!connectionState || !audioState) return;

    logger.info(`Response completed for ${connectionId}`);
    audioState.recordingStopped = true;

    if (connectionState.openAIClient) {
      try {
        await connectionState.openAIClient.close();
        connectionState.openAIClient = undefined;
        audioState.openAIReady = false;
        await this.sendStatus(socket, 'idle');
        logger.info(`Connection closed after response completion for ${connectionId}`);
      } catch (error) {
        logger.error({ error, connectionId }, 'Error closing client after response done');
      }
    }
  }

  /**
   * Handle OpenAI error event
   */
  private async handleOpenAIError(connectionId: string, socket: any, data: any): Promise<void> {
    const errorMsg = data.error?.message || 'Unknown error';
    logger.error(`OpenAI error for ${connectionId}: ${errorMsg}`);
  }

  /**
   * Send audio to OpenAI with operation tracking
   */
  private async sendAudioToOpenAI(connectionId: string, audioData: Buffer): Promise<void> {
    const connectionState = this.connections.get(connectionId);
    const audioState = this.audioStates.get(connectionId);
    if (!connectionState || !audioState || !connectionState.openAIClient) return;

    // Track pending audio operations
    await this.acquireAudioSendLock(connectionId);
    audioState.pendingAudioOperations++;
    audioState.allAudioSent = false;
    this.releaseAudioSendLock(connectionId);

    try {
      await connectionState.openAIClient.sendAudio(audioData);
      logger.debug(`Sent audio chunk for ${connectionId}, size: ${audioData.length} bytes`);
    } finally {
      // Mark operation as complete
      await this.acquireAudioSendLock(connectionId);
      audioState.pendingAudioOperations--;
      if (audioState.pendingAudioOperations === 0) {
        audioState.allAudioSent = true;
      }
      this.releaseAudioSendLock(connectionId);
    }
  }

  /**
   * Wait for all audio operations to complete
   */
  private async waitForAllAudioSent(connectionId: string, timeoutMs: number): Promise<void> {
    const audioState = this.audioStates.get(connectionId);
    if (!audioState) return;

    const startTime = Date.now();
    
    while (!audioState.allAudioSent && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    if (!audioState.allAudioSent) {
      throw new Error('Timeout waiting for audio operations to complete');
    }
  }

  /**
   * Acquire audio send lock (simple implementation)
   */
  private async acquireAudioSendLock(connectionId: string): Promise<void> {
    const audioState = this.audioStates.get(connectionId);
    if (!audioState) return;

    while (audioState.audioSendLock) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    audioState.audioSendLock = true;
  }

  /**
   * Release audio send lock
   */
  private releaseAudioSendLock(connectionId: string): void {
    const audioState = this.audioStates.get(connectionId);
    if (audioState) {
      audioState.audioSendLock = false;
    }
  }

  /**
   * Flush response buffer
   */
  private async flushBuffer(connectionId: string, socket: any, withWarning: boolean = false): Promise<void> {
    const audioState = this.audioStates.get(connectionId);
    if (!audioState || audioState.responseBuffer.length === 0) return;

    let bufferedText = audioState.responseBuffer.join('');
    audioState.responseBuffer = [];

    if (bufferedText.startsWith(this.MARKER_PREFIX)) {
      bufferedText = bufferedText.substring(this.MARKER_PREFIX.length);
    }

    if (withWarning && !bufferedText) {
      logger.warn(`Buffered text discarded after removing marker prefix for ${connectionId}`);
    }

    if (bufferedText) {
      await this.sendText(socket, bufferedText, false);
    }
  }

  /**
   * Get connection state for debugging
   */
  getConnectionState(connectionId: string): ConnectionState | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all active connections count
   */
  getActiveConnectionsCount(): number {
    return this.connections.size;
  }
}