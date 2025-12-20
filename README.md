# Brainwave: Real-Time Speech Recognition and Transcription Tool

## Table of Contents

1. [Introduction](#introduction)
2. [Deployment](#deployment)
3. [Code Structure & Architecture](#code-structure--architecture)
4. [Features](#features)

---

## Introduction

### Background

**Brainwave** is a modern real-time speech recognition and transcription tool built with TypeScript and Node.js. It provides seamless audio recording, processing, and transcription using OpenAI's Realtime API, enabling users to effortlessly convert speech to text with high accuracy and low latency.

### Goals

- **Real-Time Speech Recognition:** Enable users to record and transcribe speech in real-time with minimal latency
- **High-Quality Transcription:** Leverage OpenAI's advanced speech recognition models for accurate transcription
- **Modern Web Interface:** Provide a clean, responsive interface with multi-language support (Chinese/English)
- **Professional Audio Processing:** Handle audio resampling and processing for optimal recognition quality

### Technical Advantages

1. **Real-Time Processing:**
   - **Low Latency:** Processes audio streams in real-time using WebSocket connections
   - **Continuous Streaming:** Seamless audio streaming and processing without interruption

2. **Modern Architecture:**
   - **TypeScript:** Type-safe development with modern JavaScript features
   - **Fastify:** High-performance web framework with WebSocket support
   - **Structured Logging:** Professional logging with Pino for monitoring and debugging

3. **Advanced Audio Processing:**
   - **Audio Resampling:** Converts 48kHz audio to 24kHz for optimal OpenAI API compatibility
   - **Buffer Management:** Efficient audio chunking and transmission
   - **Web Audio API:** Native browser audio capture and processing

---

## Deployment

### Prerequisites

- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
- **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/)

### Local Development

1. **Clone the Repository**

   ```bash
   git clone https://github.com/grapeot/brainwave.git
   cd brainwave
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment Variables**

   Create a `.env` file in the root directory:

   ```env
   OPENAI_API_KEY=your-openai-api-key
   PORT=3005
   HOST=0.0.0.0
   LOG_LEVEL=info
   ```

4. **Start Development Server**

   ```bash
   npm run dev
   ```

   The server will be accessible at `http://localhost:3005`.

5. **Build for Production**

   ```bash
   npm run build
   npm start
   ```

### Deploy with Docker

1. **Build the Docker Image**

   ```bash
   docker build -t brainwave .
   ```

2. **Run the Container**

   ```bash
   docker run \
     --env OPENAI_API_KEY="your-openai-api-key" \
     -p 3005:3005 \
     brainwave
   ```

   The application will be available at `http://localhost:3005`.

---

## Code Structure & Architecture

### Backend (TypeScript/Node.js)

#### Core Services

- **`src/services/websocket-manager.ts`**
  - Manages WebSocket connections for real-time audio streaming
  - Handles connection lifecycle and message routing
  - Coordinates between audio processing and OpenAI API

- **`src/services/openai-realtime-client.ts`**
  - WebSocket client for OpenAI Realtime API
  - Manages session creation, audio transmission, and response handling
  - Implements reconnection logic and error handling

- **`src/services/audio-processor.ts`**
  - Audio resampling from 48kHz to 24kHz
  - Buffer management and audio chunk processing
  - Optimized for real-time performance

#### Configuration & Utilities

- **`src/config/config.ts`**
  - Centralized configuration management
  - Environment variable handling
  - Type-safe configuration validation

- **`src/utils/logger.ts`**
  - Structured logging with Pino
  - Different log levels for development and production
  - Request/response logging and error tracking

#### API Routes

- **`src/routes/text-enhancement.ts`**
  - HTTP endpoints for text processing
  - Integration with OpenAI GPT and Google Gemini
  - Streaming response support

### Frontend

#### User Interface

- **`public/realtime.html`**
  - Modern, responsive web interface
  - Multi-language support (Chinese/English)
  - Theme switching (light/dark mode)

- **`public/main.js`**
  - Web Audio API integration for microphone access
  - WebSocket client for real-time communication
  - Audio processing and visualization
  - Keyboard shortcuts (Space bar for recording)

#### Features

- **Real-time Recording:** Click-to-record or hold Space bar
- **Visual Feedback:** Recording timer and connection status
- **Auto-copy:** Automatic clipboard copy on transcription completion
- **Responsive Design:** Works on desktop and mobile devices

### Project Structure

```
src/
├── config/          # Configuration management
├── services/        # Core business logic
├── routes/          # HTTP API endpoints
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── prompts/         # AI prompts and templates
└── index.ts         # Application entry point

public/              # Frontend static assets
├── realtime.html    # Main web interface
├── main.js          # Frontend JavaScript
└── style.css        # Styling
```

---

## Features

### Core Functionality

- ✅ **Real-time Audio Recording** - Click button or hold Space bar
- ✅ **Live Transcription** - Powered by OpenAI Realtime API
- ✅ **Audio Processing** - 48kHz to 24kHz resampling
- ✅ **WebSocket Streaming** - Low-latency audio transmission

### User Interface

- ✅ **Multi-language Support** - Chinese and English interface
- ✅ **Theme Switching** - Light and dark modes
- ✅ **Keyboard Shortcuts** - Space bar for quick recording
- ✅ **Visual Feedback** - Recording timer and status indicators
- ✅ **Auto-copy** - Automatic clipboard copy of results

### Technical Features

- ✅ **TypeScript** - Type-safe development
- ✅ **Modern Architecture** - Fastify + WebSocket
- ✅ **Structured Logging** - Professional logging with Pino
- ✅ **Error Handling** - Comprehensive error management
- ✅ **Connection Management** - Automatic reconnection and recovery

### API Endpoints

- `GET /` - Web interface
- `GET /health` - Health check
- `WS /api/v1/ws` - WebSocket for realtime audio
- `POST /api/v1/readability` - Text enhancement
- `POST /api/v1/ask_ai` - AI Q&A
- `POST /api/v1/correctness` - Factual checking

---

## Scripts

```bash
# Development
npm run dev          # Start development server with hot reload

# Production
npm run build        # Build TypeScript to JavaScript
npm start           # Start production server

# Code Quality
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (required) | - |
| `GOOGLE_API_KEY` | Google Gemini API key (optional) | - |
| `PORT` | Server port | `3005` |
| `HOST` | Server host | `0.0.0.0` |
| `LOG_LEVEL` | Logging level | `info` |
| `OPENAI_REALTIME_MODEL` | OpenAI model | `gpt-realtime` |
| `OPENAI_REALTIME_MODALITIES` | Output modalities | `text` |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run linting: `npm run lint`
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

*Transform your voice into text with Brainwave!*