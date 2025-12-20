export interface AppConfig {
  server: {
    port: number;
    host: string;
    staticPath: string;
  };
  openai: {
    apiKey?: string;
    realtimeModel: string;
    modalities: string[];
    sessionTtlSec: number;
  };
  gemini?: {
    apiKey?: string;
    defaultModel: string;
  };
  logging: {
    level: string;
    format: string;
  };
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  modalities: string[];
}

export interface SessionConfig {
  input_audio_format: 'pcm16';
  input_audio_transcription: null;
  turn_detection: null;
  modalities: string[];
}

export interface LLMRequest {
  text: string;
  prompt: string;
  model?: string;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

// Request/Response Models for API endpoints
export interface ReadabilityRequest {
  text: string;
}

export interface ReadabilityResponse {
  enhanced_text: string;
}

export interface AskAIRequest {
  text: string;
}

export interface AskAIResponse {
  answer: string;
}

export interface CorrectnessRequest {
  text: string;
}

export interface CorrectnessResponse {
  analysis: string;
}

// WebSocket Message Models
export interface WebSocketMessage {
  type: 'start_recording' | 'stop_recording' | 'audio_chunk';
  data?: any;
  timestamp: number;
}

export interface WebSocketStatusMessage {
  type: 'status';
  status: 'idle' | 'connecting' | 'connected' | 'processing' | 'error';
}

export interface WebSocketTextMessage {
  type: 'text';
  content: string;
  isNewResponse: boolean;
}

export interface WebSocketErrorMessage {
  type: 'error';
  content: string;
}

export interface ConnectionState {
  id: string;
  isRecording: boolean;
  openAIClient?: any; // Will be typed properly when implementing OpenAI client
  audioBuffer: Buffer[];
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  sampleRate: number;
}

export interface ProcessedAudio {
  data: Buffer;
  originalSize: number;
  processedSize: number;
}