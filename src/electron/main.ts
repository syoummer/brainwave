import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { BackendServerManager } from './backend-server-manager';
import { SettingsManager, ApiKeys } from './settings-manager';
import { errorHandler } from './error-handler';
import { logger, logError } from '../utils/logger';

export class ElectronApp {
  private mainWindow: BrowserWindow | null = null;
  private backendServerManager: BackendServerManager;
  private settingsManager: SettingsManager;

  constructor() {
    this.settingsManager = new SettingsManager();
    this.backendServerManager = new BackendServerManager(this.settingsManager);
  }

  async initialize(): Promise<void> {
    // Set up global error handlers
    this.setupGlobalErrorHandlers();

    // Handle app ready event
    app.whenReady().then(async () => {
      try {
        await this.startBackendServerWithRetry();
        this.createMainWindow();
        this.setupIpcHandlers();
        
        // Set main window for error handler
        errorHandler.setMainWindow(this.mainWindow);
      } catch (error) {
        const initError = error instanceof Error ? error : new Error(String(error));
        logError(initError, { context: 'app_initialization' });
        
        // Show error dialog and handle user choice
        const action = await errorHandler.handleServerStartupError(initError);
        
        if (action === 'retry') {
          // Retry initialization
          await this.initialize();
        } else if (action === 'quit') {
          app.quit();
        } else {
          // Continue without backend server (limited functionality)
          logger.warn('Continuing without backend server - limited functionality');
          this.createMainWindow();
          this.setupIpcHandlers();
          errorHandler.setMainWindow(this.mainWindow);
        }
      }
    });

    // Handle window closed events
    app.on('window-all-closed', async () => {
      try {
        await this.stopBackendServer();
      } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { 
          context: 'window_all_closed_shutdown' 
        });
      }
      
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    // Handle app before quit event for graceful shutdown
    app.on('before-quit', async (event) => {
      if (this.backendServerManager.isRunning()) {
        event.preventDefault();
        try {
          await this.stopBackendServer();
          app.quit();
        } catch (error) {
          logError(error instanceof Error ? error : new Error(String(error)), { 
            context: 'before_quit_shutdown' 
          });
          // Force quit even if shutdown fails
          app.quit();
        }
      }
    });
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      errorHandler.handleUncaughtException(error);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      errorHandler.handleUnhandledRejection(reason, promise);
    });
  }

  createMainWindow(): BrowserWindow {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false
      },
      // icon: path.join(__dirname, '../../public/icon.png'), // Will add icon later
      title: 'Brainwave - 实时语音转录工具',
      show: false, // Don't show until ready
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      backgroundColor: '#1a1a1a', // Dark background to match theme
      vibrancy: process.platform === 'darwin' ? 'under-window' : undefined
    });

    // Handle media access permissions - more comprehensive approach
    this.mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
      logger.info(`Permission request: ${permission}`, { details });
      
      const allowedPermissions = [
        'media', 
        'microphone', 
        'audioCapture',
        'camera',
        'geolocation',
        'notifications'
      ];
      
      if (allowedPermissions.includes(permission)) {
        logger.info(`Granting permission: ${permission}`);
        callback(true);
      } else {
        logger.warn(`Denying permission: ${permission}`);
        callback(false);
      }
    });

    // Handle permission check requests
    this.mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
      logger.info(`Permission check: ${permission} from ${requestingOrigin}`, { details });
      
      const allowedPermissions = [
        'media', 
        'microphone', 
        'audioCapture',
        'camera'
      ];
      
      return allowedPermissions.includes(permission);
    });

    // Wait for the backend server to be ready before loading the interface
    this.loadInterface();

    // Show window when ready to prevent flash
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      // Focus the window
      if (process.platform === 'darwin') {
        this.mainWindow?.focus();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  private async loadInterface(): Promise<void> {
    if (!this.mainWindow) return;

    try {
      // Wait a bit for the backend server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Load the interface through the backend server to ensure static resources work
      const serverUrl = this.backendServerManager.getServerUrl();
      await this.mainWindow.loadURL(serverUrl);

      // Open DevTools in development
      if (process.env.NODE_ENV === 'development') {
        this.mainWindow.webContents.openDevTools();
      }

      logger.info('Main window interface loaded successfully');
    } catch (error) {
      const loadError = error instanceof Error ? error : new Error(String(error));
      logError(loadError, { context: 'interface_loading' });
      
      errorHandler.showSimpleError('界面加载失败', `无法加载应用程序界面: ${loadError.message}`);
    }
  }

  private async startBackendServerWithRetry(): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        await this.backendServerManager.start();
        logger.info('Backend server started successfully');
        return;
      } catch (error) {
        attempt++;
        const serverError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt >= maxRetries) {
          throw serverError;
        }
        
        logger.warn(`Backend server start attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Progressive delay
      }
    }
  }

  async startBackendServer(): Promise<void> {
    try {
      await this.startBackendServerWithRetry();
    } catch (error) {
      const serverError = error instanceof Error ? error : new Error(String(error));
      logError(serverError, { context: 'backend_server_startup' });
      throw serverError;
    }
  }

  async stopBackendServer(): Promise<void> {
    try {
      await this.backendServerManager.stop();
      logger.info('Backend server stopped successfully');
    } catch (error) {
      const stopError = error instanceof Error ? error : new Error(String(error));
      logError(stopError, { context: 'backend_server_shutdown' });
      // Don't throw error during shutdown to avoid blocking app exit
    }
  }

  private showErrorDialog(title: string, content: string): void {
    errorHandler.showSimpleError(title, content);
  }

  private setupIpcHandlers(): void {
    // Settings management
    ipcMain.handle('settings:get-api-keys', async () => {
      return await this.settingsManager.getApiKeys();
    });

    ipcMain.handle('settings:set-api-keys', async (_, keys) => {
      await this.settingsManager.setApiKeys(keys);
      // Reload API keys in the backend server
      if (this.backendServerManager.isRunning()) {
        await this.backendServerManager.reloadApiKeys();
      }
      return true;
    });

    ipcMain.handle('settings:open-dialog', async () => {
      this.openSettingsDialog();
    });

    // Application control
    ipcMain.handle('app:quit', async () => {
      app.quit();
    });

    // Server status (useful for frontend to know if backend is ready)
    ipcMain.handle('server:get-status', async () => {
      return {
        isRunning: this.backendServerManager.isRunning(),
        url: this.backendServerManager.getServerUrl()
      };
    });

    // Window control
    ipcMain.handle('window:minimize', async () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle('window:maximize', async () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    ipcMain.handle('window:close', async () => {
      this.mainWindow?.close();
    });
  }

  openSettingsDialog(): void {
    // Create settings window
    const settingsWindow = new BrowserWindow({
      width: 600,
      height: 500,
      minWidth: 500,
      minHeight: 400,
      resizable: true,
      modal: true,
      parent: this.mainWindow || undefined,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false
      },
      title: 'Settings - Brainwave',
      show: false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      backgroundColor: '#1a1a1a'
    });

    // Load settings page through the backend server to ensure static resources work
    const serverUrl = this.backendServerManager.getServerUrl();
    const settingsUrl = `${serverUrl}/settings`;
    settingsWindow.loadURL(settingsUrl);

    // Show when ready
    settingsWindow.once('ready-to-show', () => {
      settingsWindow.show();
      settingsWindow.focus();
    });

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      settingsWindow.webContents.openDevTools();
    }
  }

  async saveApiKeys(keys: ApiKeys): Promise<void> {
    await this.settingsManager.setApiKeys(keys);
    // Reload API keys in the backend server
    if (this.backendServerManager.isRunning()) {
      await this.backendServerManager.reloadApiKeys();
    }
  }

  async loadApiKeys(): Promise<ApiKeys> {
    return await this.settingsManager.getApiKeys();
  }
}

// Initialize the Electron app
const electronApp = new ElectronApp();
electronApp.initialize();