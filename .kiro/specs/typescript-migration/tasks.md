# Implementation Plan: TypeScript Migration

## Overview

This implementation plan converts the Python Brainwave backend to TypeScript while maintaining all core functionality. Based on analysis of the current Python codebase, this plan focuses on migrating the existing FastAPI/WebSocket implementation to a Fastify/TypeScript equivalent.

## Tasks

- [x] 1. Set up TypeScript project structure and dependencies
  - Initialize Node.js project with package.json and TypeScript configuration
  - Install core dependencies: Fastify, @fastify/websocket, @fastify/static, axios, dotenv, pino
  - Install TypeScript dependencies: typescript, tsx, @types/node, @types/ws
  - Set up build scripts and development environment with tsx for hot reloading
  - Create src/ directory structure matching Python app structure
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 2. Implement core configuration and environment management
  - [x] 2.1 Create configuration types and interfaces
    - Port app/config.py constants to TypeScript interfaces
    - Define AppConfig interface with OpenAI realtime model settings
    - Create environment variable loading with validation for OPENAI_API_KEY, GOOGLE_API_KEY
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 2.2 Implement default configuration values
    - Port OPENAI_REALTIME_MODEL, OPENAI_REALTIME_MODALITIES defaults
    - Provide sensible defaults for server port (3005), host, static path
    - Handle missing environment variables gracefully with warnings
    - _Requirements: 5.3, 5.5_

- [x] 3. Create Fastify server foundation
  - [x] 3.1 Set up main server with Fastify
    - Initialize Fastify instance with TypeScript support and logging
    - Configure CORS for frontend integration
    - Implement graceful shutdown handling
    - Add WebSocket plugin registration
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Add static file serving
    - Mount static file serving for app/static directory (HTML, CSS, JS)
    - Implement proper MIME type handling for .html, .css, .js files
    - Add root route serving realtime.html (matching Python version)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4. Checkpoint - Basic server functionality
  - Ensure server starts on port 3005 and serves static files, ask the user if questions arise.

- [x] 5. Implement audio processing service
  - [x] 5.1 Create AudioProcessor class
    - Port Python AudioProcessor logic for PCM16 audio processing
    - Implement audio chunk processing and validation using Node.js Buffer
    - Add resampling functionality from 48kHz to 24kHz (equivalent to scipy.signal.resample_poly)
    - Handle audio buffering and data integrity matching Python implementation
    - _Requirements: 2.2, 2.5_

- [x] 6. Build OpenAI realtime client
  - [x] 6.1 Create OpenAI WebSocket client
    - Port app/services/openai_realtime_client.py to TypeScript
    - Implement connection management to wss://api.openai.com/v1/realtime
    - Handle session creation, configuration, and message routing
    - Add event handlers for all message types (session.updated, response.text.delta, etc.)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 6.2 Add error handling and reconnection logic
    - Implement connection error recovery and cleanup
    - Handle WebSocket connection lifecycle properly
    - Add proper error propagation to WebSocket clients
    - _Requirements: 3.5_

- [x] 7. Implement WebSocket server for client connections
  - [x] 7.1 Create WebSocket connection manager
    - Implement /api/v1/ws endpoint matching Python version
    - Handle client WebSocket connections with proper state management
    - Add connection lifecycle management (accept, close, error handling)
    - Implement status updates (idle, connecting, connected, processing)
    - _Requirements: 2.1, 2.4_

  - [x] 7.2 Integrate audio processing with WebSocket flow
    - Connect audio processing to OpenAI client in real-time
    - Implement recording start/stop message handling
    - Handle audio chunk buffering and forwarding to OpenAI
    - Implement transcription streaming back to client with proper text delta handling
    - Port complex audio synchronization logic from Python version
    - _Requirements: 2.3, 2.4_

- [x] 8. Create LLM processing service
  - [x] 8.1 Implement LLM processor with multiple model support
    - Port app/services/llm_processor.py abstract interface to TypeScript
    - Implement OpenAI GPT processor with async/sync methods
    - Add support for different models (gpt-4o, o1-mini) matching Python version
    - Handle streaming and non-streaming responses
    - _Requirements: 4.4, 4.5_

  - [x] 8.2 Add Gemini processor support
    - Port GeminiProcessor from Python to TypeScript
    - Implement Google Generative AI integration
    - Add model selection logic and factory function
    - _Requirements: 4.4_

- [x] 9. Implement HTTP API endpoints
  - [x] 9.1 Create text enhancement endpoints
    - Implement POST /api/v1/readability endpoint with streaming response
    - Add POST /api/v1/ask_ai endpoint with synchronous response
    - Create POST /api/v1/correctness endpoint with streaming response
    - Use exact same request/response schemas as Python version
    - _Requirements: 4.1, 4.2, 4.3, 7.1_

  - [x] 9.2 Add request validation and error handling
    - Implement TypeScript interface validation for request bodies
    - Add proper HTTP status codes and error responses (500, 422, etc.)
    - Support streaming responses using Fastify streaming
    - Handle LLM processor initialization errors gracefully
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 10. Add prompts and text processing logic
  - [x] 10.1 Port prompts from Python version
    - Create prompts configuration object from app/prompts/prompts.py
    - Implement all existing prompt templates (paraphrase-gpt-realtime-enhanced, readability-enhance, ask-ai, correctness-check)
    - Preserve exact prompt text and multilingual support
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 10.2 Integrate prompts with LLM processors
    - Connect prompts to text processing endpoints
    - Handle prompt selection based on request type
    - Ensure model selection matches Python version (gpt-4o for readability/correctness, o1-mini for ask_ai)
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 11. Implement logging and monitoring
  - [x] 11.1 Set up structured logging with Pino
    - Configure log levels matching Python logging setup
    - Add request/response logging middleware
    - Implement error logging with context and stack traces
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 11.2 Add WebSocket and audio processing logging
    - Log connection events and audio processing metrics
    - Track OpenAI API interactions and errors
    - Monitor WebSocket connection lifecycle events
    - _Requirements: 8.2_

- [x] 12. Integration and final wiring
  - [x] 12.1 Connect all components together
    - Wire WebSocket server to audio processing pipeline
    - Connect HTTP endpoints to LLM processors with proper error handling
    - Integrate all components with shared configuration and logging
    - Ensure proper cleanup and resource management
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4_

  - [x] 12.2 Add startup validation and health checks
    - Validate all required configuration on startup (API keys, etc.)
    - Add graceful shutdown handling for WebSocket connections
    - Implement proper error handling for missing dependencies
    - _Requirements: 5.4_

- [x] 13. Final checkpoint and manual testing
  - Test complete workflow: WebSocket connection, audio recording, transcription, text enhancement
  - Verify API compatibility with existing frontend (app/static/main.js)
  - Ensure all functionality matches Python version behavior
  - Ask the user if questions arise.

## Notes

- This migration preserves the exact API interface and behavior of the Python version
- Each task references specific requirements for traceability
- Focus on functional equivalence rather than architectural changes
- The existing frontend (HTML/CSS/JS) will work without modification
- Checkpoints ensure incremental validation through manual testing