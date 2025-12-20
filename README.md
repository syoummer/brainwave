# Brainwave: Real-Time Speech Recognition and Transcription Tool

🎤 **Desktop App & Web Application** - Transform your voice into text with AI-powered transcription

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Desktop Application](#desktop-application)
4. [Web Application](#web-application)
5. [Development](#development)
6. [Features](#features)
7. [Code Structure & Architecture](#code-structure--architecture)

---

## Introduction

### What is Brainwave?

**Brainwave** is a modern real-time speech recognition and transcription tool that works both as a **desktop application** and **web application**. Built with TypeScript, Node.js, and Electron, it provides seamless audio recording, processing, and transcription using OpenAI's Realtime API.

### 🖥️ **Desktop App Features**
- **Native Desktop Experience** - Windows, macOS, and Linux support
- **Integrated Backend** - No need to run separate server
- **Secure Settings** - API keys stored safely in your system
- **Auto-start** - Everything starts automatically when you open the app

### 🌐 **Web App Features**  
- **Browser-based** - Works on any device with a web browser
- **Mobile Friendly** - Responsive design for phones and tablets
- **Cross-platform** - Access from anywhere

### Goals

- **Real-Time Speech Recognition:** Record and transcribe speech with minimal latency
- **High-Quality Transcription:** Leverage OpenAI's advanced speech recognition models
- **Dual Platform Support:** Native desktop app + web interface
- **Modern User Experience:** Clean, responsive interface with multi-language support
- **Professional Audio Processing:** Optimized audio handling for best recognition quality

### Technical Advantages

1. **Real-Time Processing:**
   - **Low Latency:** Processes audio streams in real-time using WebSocket connections
   - **Continuous Streaming:** Seamless audio streaming and processing without interruption

2. **Modern Architecture:**
   - **TypeScript:** Type-safe development with modern JavaScript features
   - **Electron + Fastify:** Desktop integration with high-performance web framework
   - **Structured Logging:** Professional logging with Pino for monitoring and debugging

3. **Advanced Audio Processing:**
   - **Audio Resampling:** Converts 48kHz audio to 24kHz for optimal OpenAI API compatibility
   - **Buffer Management:** Efficient audio chunking and transmission
   - **Web Audio API:** Native browser audio capture and processing

---

## Getting Started

### 🖥️ **Desktop Application (Recommended)**

The easiest way to use Brainwave is through the desktop application:

1. **Download & Install**
   - Download the latest release for your platform:
     - **Windows**: `.exe` installer
     - **macOS**: `.dmg` installer  
     - **Linux**: `.AppImage` or `.deb` package

2. **First Launch**
   - Open the Brainwave application
   - Go to **Settings** to configure your API keys
   - Enter your OpenAI API key (required)
   - Optionally add Google Gemini API key for enhanced features

3. **Start Using**
   - Click the record button or press **Space** to start recording
   - Speak clearly into your microphone
   - Watch your speech get transcribed in real-time!

### 🌐 **Web Application**

For browser-based usage or mobile devices:

1. **Run the Server**
   ```bash
   git clone https://github.com/syoummer/brainwave.git
   cd brainwave
   npm install
   npm run dev
   ```

2. **Configure API Keys**
   - Set environment variable: `OPENAI_API_KEY=your-key-here`
   - Or create a `.env` file with your API key

3. **Access the App**
   - Open `http://localhost:3005` in your browser
   - Works on desktop and mobile browsers

---

## Desktop Application

### 🚀 **Building from Source**

```bash
# Clone and install dependencies
git clone https://github.com/syoummer/brainwave.git
cd brainwave
npm install

# Development mode
npm run electron:dev

# Build for your platform
npm run electron:build

# Build for specific platforms
npm run electron:build:mac     # macOS
npm run electron:build:win     # Windows
npm run electron:build:linux   # Linux
```

### ⚙️ **Settings Management**

The desktop app provides a secure settings dialog:

- **API Keys**: Stored encrypted in your system's user data directory
- **Persistent**: Settings survive app updates and restarts
- **Secure**: No API keys stored in plain text files

### 📁 **File Locations**

- **Windows**: `%APPDATA%/brainwave-realtime-transcription/`
- **macOS**: `~/Library/Application Support/brainwave-realtime-transcription/`
- **Linux**: `~/.config/brainwave-realtime-transcription/`

---

## Web Application

### Prerequisites

- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
- **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/)

### Local Development

1. **Clone the Repository**

   ```bash
   git clone https://github.com/syoummer/brainwave.git
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

## Development

### 🛠️ **Development Setup**

```bash
# Clone the repository
git clone https://github.com/syoummer/brainwave.git
cd brainwave

# Install dependencies
npm install

# Set up environment (for web development)
echo "OPENAI_API_KEY=your-key-here" > .env

# Start development servers
npm run dev              # Web application
npm run electron:dev     # Desktop application
```

### 📦 **Build Scripts**

```bash
# Web application
npm run build           # Build TypeScript
npm start              # Start production server

# Desktop application  
npm run electron:build  # Build for current platform
npm run electron:pack   # Build without installer

# Code quality
npm run lint           # ESLint
npm run format         # Prettier
npm run clean          # Clean build files
```

### 🧪 **Testing**

```bash
# Run the application in development mode
npm run electron:dev

# Test the web interface
npm run dev
# Then open http://localhost:3005
```

---

## Features

### 🎤 **Core Functionality**

- ✅ **Real-time Audio Recording** - Click button or hold Space bar
- ✅ **Live Transcription** - Powered by OpenAI Realtime API  
- ✅ **Audio Processing** - Automatic 48kHz to 24kHz resampling
- ✅ **WebSocket Streaming** - Low-latency audio transmission
- ✅ **Text Enhancement** - AI-powered text improvement
- ✅ **Q&A Features** - Ask questions about transcribed content

### 🖥️ **Desktop App Features**

- ✅ **Native Experience** - True desktop application feel
- ✅ **System Integration** - Proper window controls and menus
- ✅ **Secure Storage** - Encrypted API key storage
- ✅ **Auto-start Backend** - Integrated server management
- ✅ **Multi-platform** - Windows, macOS, Linux support
- ✅ **Settings Dialog** - Easy configuration management

### 🌐 **Web App Features**

- ✅ **Cross-platform** - Works on any modern browser
- ✅ **Mobile Friendly** - Responsive design for phones/tablets
- ✅ **No Installation** - Access from anywhere
- ✅ **Real-time Updates** - Live transcription display

### 🎨 **User Interface**

- ✅ **Multi-language Support** - Chinese and English interface
- ✅ **Theme Switching** - Light and dark modes
- ✅ **Keyboard Shortcuts** - Space bar for quick recording
- ✅ **Visual Feedback** - Recording timer and status indicators
- ✅ **Auto-copy** - Automatic clipboard copy of results

### 🔧 **Technical Features**

- ✅ **TypeScript** - Type-safe development
- ✅ **Modern Architecture** - Fastify + WebSocket + Electron
- ✅ **Structured Logging** - Professional logging with Pino
- ✅ **Error Handling** - Comprehensive error management
- ✅ **Connection Management** - Automatic reconnection and recovery

---

## Code Structure & Architecture

### 🏗️ **Project Structure**

```
src/
├── electron/           # Desktop application code
│   ├── main.ts        # Electron main process
│   ├── preload.ts     # Secure IPC bridge
│   ├── settings-manager.ts  # Settings storage
│   └── backend-server-manager.ts  # Integrated server
├── config/            # Configuration management
├── services/          # Core business logic
├── routes/            # HTTP API endpoints
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── index.ts           # Web server entry point

public/                # Frontend static assets
├── realtime.html      # Main web interface
├── settings.html      # Desktop settings dialog
├── main.js           # Frontend JavaScript
└── style.css         # Styling

package.json          # Dependencies and build scripts
tsconfig.json         # TypeScript configuration
tsconfig.electron.json # Electron TypeScript config
```

### 🖥️ **Desktop Application Architecture**

#### Electron Components

- **`src/electron/main.ts`**
  - Main Electron process
  - Window management and lifecycle
  - IPC communication setup
  - Backend server integration

- **`src/electron/settings-manager.ts`**
  - Secure API key storage
  - User preferences management
  - Cross-platform settings persistence

- **`src/electron/backend-server-manager.ts`**
  - Integrated Fastify server management
  - Automatic startup and shutdown
  - Port management and error handling

- **`src/electron/preload.ts`**
  - Secure bridge between main and renderer processes
  - Exposes safe APIs to the frontend
  - IPC communication interface

### 🌐 **Backend Services**

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

### 🎨 **Frontend**

#### User Interface

- **`public/realtime.html`**
  - Modern, responsive web interface
  - Multi-language support (Chinese/English)
  - Theme switching (light/dark mode)

- **`public/settings.html`**
  - Desktop application settings dialog
  - Secure API key configuration
  - User preference management

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

### 📡 **API Endpoints**

- `GET /` - Web interface
- `GET /health` - Health check
- `WS /api/v1/ws` - WebSocket for realtime audio
- `POST /api/v1/readability` - Text enhancement
- `POST /api/v1/ask_ai` - AI Q&A
- `POST /api/v1/correctness` - Factual checking

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

**Note**: For the desktop application, API keys are configured through the settings dialog rather than environment variables.

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

## 🚀 **Get Started Today!**

### Desktop Users
Download the latest release and enjoy a native desktop experience with integrated AI transcription.

### Web Users  
Clone the repository and run `npm run dev` to start the web server.

### Developers
Contribute to both the Electron desktop app and web application - all in one codebase!

---

*Transform your voice into text with Brainwave - Available as Desktop App & Web Application!* 🎤✨