# Brainwave - Build and Packaging Guide

This document provides instructions for building and packaging the Brainwave Electron application.

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Platform-specific build tools (see below)

### Platform-Specific Requirements

#### macOS
- Xcode Command Line Tools
- macOS 10.14 or higher for building
- For code signing: Apple Developer account and certificates

#### Windows
- Windows 10 or higher
- Visual Studio Build Tools or Visual Studio Community
- For code signing: Code signing certificate

#### Linux
- Ubuntu 18.04 or higher (or equivalent)
- Build essentials: `sudo apt-get install build-essential`

## Installation

```bash
# Install dependencies
npm install

# Install app dependencies for Electron
npm run postinstall
```

## Development

```bash
# Start development server (web version)
npm run dev

# Start Electron in development mode
npm run electron:dev
```

## Building

### Build TypeScript
```bash
# Compile TypeScript to JavaScript
npm run build

# Clean and rebuild
npm run rebuild
```

### Package for Testing
```bash
# Package without creating installer (for testing)
npm run electron:pack
```

### Build Installers

#### All Platforms (if supported)
```bash
# Build for current platform
npm run electron:build

# Build without publishing
npm run electron:dist
```

#### Platform-Specific Builds
```bash
# Build for macOS
npm run electron:build:mac

# Build for Windows
npm run electron:build:win

# Build for Linux
npm run electron:build:linux
```

## Build Configuration

The build configuration is defined in `package.json` under the `build` section. Key configurations include:

### Application Metadata
- **App ID**: `com.brainwave.realtime-transcription`
- **Product Name**: `Brainwave - 实时语音转录工具`
- **Version**: Automatically read from `package.json`

### Output
- **Directory**: `release/`
- **Artifacts**: Platform-specific installers and packages

### Icons
Icons should be placed in the `build/` directory:
- **macOS**: `icon.icns` (512x512, 256x256, 128x128, 64x64, 32x32, 16x16)
- **Windows**: `icon.ico` (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
- **Linux**: `icon.png` (512x512)

### Platform Targets

#### macOS
- **Format**: DMG installer
- **Architectures**: x64 (Intel), arm64 (Apple Silicon)
- **Minimum Version**: macOS 10.14
- **Features**: Dark mode support, hardened runtime

#### Windows
- **Format**: NSIS installer
- **Architectures**: x64, ia32 (32-bit)
- **Features**: Desktop shortcuts, Start menu integration
- **Installer**: Custom NSIS script with uninstaller

#### Linux
- **Formats**: AppImage, DEB package
- **Architecture**: x64
- **Category**: AudioVideo/Audio/Recorder

## Build Artifacts

After building, you'll find the following in the `release/` directory:

### macOS
- `Brainwave - 实时语音转录工具-1.0.0-mac-x64.dmg`
- `Brainwave - 实时语音转录工具-1.0.0-mac-arm64.dmg`

### Windows
- `Brainwave - 实时语音转录工具-1.0.0-win-x64.exe`
- `Brainwave - 实时语音转录工具-1.0.0-win-ia32.exe`

### Linux
- `Brainwave - 实时语音转录工具-1.0.0-linux-x64.AppImage`
- `brainwave-realtime-transcription_1.0.0_amd64.deb`

## Code Signing

### macOS
1. Obtain Apple Developer certificates
2. Set environment variables:
   ```bash
   export CSC_IDENTITY_AUTO_DISCOVERY=false
   export CSC_IDENTITY="Developer ID Application: Your Name"
   ```
3. Build with signing:
   ```bash
   npm run electron:build:mac
   ```

### Windows
1. Obtain code signing certificate
2. Set environment variables:
   ```bash
   export CSC_LINK="path/to/certificate.p12"
   export CSC_KEY_PASSWORD="certificate_password"
   ```
3. Build with signing:
   ```bash
   npm run electron:build:win
   ```

## Troubleshooting

### Common Issues

#### Build Fails with "Icon not found"
- Ensure icon files are present in the `build/` directory
- Use the provided `icon-template.svg` to generate proper icons

#### Permission Errors on macOS
- Run with proper entitlements: Check `build/entitlements.mac.plist`
- Ensure hardened runtime is properly configured

#### Windows Installer Issues
- Check NSIS script: `build/installer.nsh`
- Verify Windows build tools are installed

#### Linux Build Fails
- Install build essentials: `sudo apt-get install build-essential`
- Check AppImage dependencies

### Debug Mode
```bash
# Enable debug output
DEBUG=electron-builder npm run electron:build
```

### Clean Build
```bash
# Clean all build artifacts
npm run clean

# Rebuild everything
npm run rebuild
```

## Distribution

### Auto-Updates
The application is configured for auto-updates using `electron-updater`. Update server configuration is in the `publish` section of the build config.

### Release Process
1. Update version in `package.json`
2. Build for all platforms
3. Upload artifacts to release server
4. Update release metadata

## Security Considerations

- All builds use hardened runtime (macOS)
- Code signing is recommended for distribution
- Entitlements are configured for necessary permissions
- Network access is limited to required APIs

## Performance Optimization

- Node modules are filtered to exclude unnecessary files
- Compression is set to maximum
- Build dependencies are optimized
- App dependencies are properly installed

For more information, see the [Electron Builder documentation](https://www.electron.build/).