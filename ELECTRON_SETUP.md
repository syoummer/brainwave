# Electron Setup

This document describes the Electron project structure and setup for the Brainwave desktop application.

## Project Structure

```
src/electron/
├── main.ts                    # Main Electron process entry point
├── preload.ts                 # Preload script for secure IPC communication
├── backend-server-manager.ts  # Manages the Fastify backend server
├── settings-manager.ts        # Handles application settings and API keys
└── index.ts                   # Module exports
```

## Development Scripts

- `npm run electron:dev` - Build and run Electron app in development mode
- `npm run electron:pack` - Build and package the app (without installer)
- `npm run electron:build` - Build and create distributable packages

## Key Features Implemented

1. **Electron App Structure**: Main process with proper lifecycle management
2. **Backend Server Integration**: Automatic startup/shutdown of the Fastify server
3. **Secure IPC Communication**: Context isolation with preload script
4. **Settings Management**: Secure storage of API keys and user preferences
5. **TypeScript Configuration**: Proper compilation setup for Electron

## Next Steps

The basic Electron project structure is now set up. The next tasks will involve:
1. Implementing the main process core functionality
2. Setting up IPC communication channels
3. Creating the settings management interface
4. Testing the integration with the existing backend server

## Dependencies Added

- `electron` - The Electron framework
- `electron-builder` - For packaging and distribution
- `@types/electron` - TypeScript definitions for Electron