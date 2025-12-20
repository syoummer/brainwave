import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger, logError } from '../utils/logger';
import { errorHandler } from './error-handler';

export interface ApiKeys {
  openai?: string;
  gemini?: string;
}

export class SettingsManager {
  private settingsPath: string | null = null;
  private backupPath: string | null = null;

  constructor() {
    // Don't initialize paths in constructor to avoid issues in non-Electron environments
  }

  private initializePaths(): void {
    if (this.settingsPath === null) {
      const userDataPath = app.getPath('userData');
      this.settingsPath = path.join(userDataPath, 'settings.json');
      this.backupPath = path.join(userDataPath, 'settings.backup.json');
    }
  }

  async setApiKey(service: 'openai' | 'gemini', key: string): Promise<void> {
    try {
      this.initializePaths();
      const settings = await this.loadSettings();
      settings.apiKeys = settings.apiKeys || {};
      settings.apiKeys[service] = key;
      await this.saveSettings(settings);
      logger.info(`API key updated for service: ${service}`);
    } catch (error) {
      const settingsError = error instanceof Error ? error : new Error(String(error));
      logError(settingsError, { 
        context: 'set_api_key',
        service,
        settingsPath: this.settingsPath
      });
      throw settingsError;
    }
  }

  async getApiKey(service: 'openai' | 'gemini'): Promise<string | null> {
    try {
      this.initializePaths();
      const settings = await this.loadSettings();
      return settings.apiKeys?.[service] || null;
    } catch (error) {
      const settingsError = error instanceof Error ? error : new Error(String(error));
      logError(settingsError, { 
        context: 'get_api_key',
        service,
        settingsPath: this.settingsPath
      });
      return null; // Return null on error to allow app to continue
    }
  }

  async getApiKeys(): Promise<ApiKeys> {
    try {
      this.initializePaths();
      const settings = await this.loadSettings();
      return settings.apiKeys || {};
    } catch (error) {
      const settingsError = error instanceof Error ? error : new Error(String(error));
      logError(settingsError, { 
        context: 'get_api_keys',
        settingsPath: this.settingsPath
      });
      return {}; // Return empty object on error
    }
  }

  async setApiKeys(keys: ApiKeys): Promise<void> {
    try {
      this.initializePaths();
      const settings = await this.loadSettings();
      settings.apiKeys = { ...settings.apiKeys, ...keys };
      await this.saveSettings(settings);
      logger.info('API keys updated successfully');
    } catch (error) {
      const settingsError = error instanceof Error ? error : new Error(String(error));
      logError(settingsError, { 
        context: 'set_api_keys',
        keys: Object.keys(keys),
        settingsPath: this.settingsPath
      });
      throw settingsError;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      this.initializePaths();
      const settings = await this.loadSettings();
      return settings[key] || null;
    } catch (error) {
      const settingsError = error instanceof Error ? error : new Error(String(error));
      logError(settingsError, { 
        context: 'get_setting',
        key,
        settingsPath: this.settingsPath
      });
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      this.initializePaths();
      const settings = await this.loadSettings();
      settings[key] = value;
      await this.saveSettings(settings);
      logger.info(`Setting updated: ${key}`);
    } catch (error) {
      const settingsError = error instanceof Error ? error : new Error(String(error));
      logError(settingsError, { 
        context: 'set_setting',
        key,
        settingsPath: this.settingsPath
      });
      throw settingsError;
    }
  }

  async resetToDefaults(): Promise<void> {
    try {
      this.initializePaths();
      const defaultSettings = {
        apiKeys: {},
        version: '1.0.0',
        resetAt: new Date().toISOString()
      };
      
      await this.saveSettings(defaultSettings);
      logger.info('Settings reset to defaults');
    } catch (error) {
      const resetError = error instanceof Error ? error : new Error(String(error));
      logError(resetError, { 
        context: 'reset_settings',
        settingsPath: this.settingsPath
      });
      throw resetError;
    }
  }

  private async loadSettings(): Promise<any> {
    if (!this.settingsPath) {
      throw new Error('Settings path not initialized');
    }
    
    try {
      const data = await fs.readFile(this.settingsPath, 'utf-8');
      const settings = JSON.parse(data);
      
      // Validate settings structure
      if (typeof settings !== 'object' || settings === null) {
        throw new Error('Invalid settings format');
      }
      
      return settings;
    } catch (error) {
      const loadError = error instanceof Error ? error : new Error(String(error));
      
      // Try to load from backup if main file fails
      if (loadError.message.includes('ENOENT')) {
        logger.info('Settings file not found, creating default settings');
        return this.getDefaultSettings();
      } else if (loadError.message.includes('JSON')) {
        logger.warn('Settings file corrupted, attempting to load backup');
        return await this.loadFromBackup();
      } else {
        logError(loadError, { 
          context: 'load_settings',
          settingsPath: this.settingsPath
        });
        return this.getDefaultSettings();
      }
    }
  }

  private async loadFromBackup(): Promise<any> {
    if (!this.backupPath) {
      return this.getDefaultSettings();
    }
    
    try {
      const data = await fs.readFile(this.backupPath, 'utf-8');
      const settings = JSON.parse(data);
      logger.info('Settings loaded from backup successfully');
      
      // Restore main settings file from backup
      await this.saveSettings(settings);
      return settings;
    } catch (error) {
      logger.warn('Backup settings file also corrupted or missing, using defaults');
      return this.getDefaultSettings();
    }
  }

  private getDefaultSettings(): any {
    return {
      apiKeys: {},
      version: '1.0.0',
      createdAt: new Date().toISOString()
    };
  }

  private async saveSettings(settings: any): Promise<void> {
    if (!this.settingsPath || !this.backupPath) {
      throw new Error('Settings paths not initialized');
    }
    
    try {
      // Ensure the directory exists
      const dir = path.dirname(this.settingsPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Create backup of current settings before saving new ones
      try {
        await fs.copyFile(this.settingsPath, this.backupPath);
      } catch (error) {
        // Ignore backup errors if main file doesn't exist yet
        const backupError = error as NodeJS.ErrnoException;
        if (backupError.code !== 'ENOENT') {
          logger.debug('Failed to create settings backup:', error);
        }
      }
      
      // Save settings with proper formatting
      const settingsJson = JSON.stringify(settings, null, 2);
      await fs.writeFile(this.settingsPath, settingsJson, 'utf-8');
      
      logger.debug('Settings saved successfully');
    } catch (error) {
      const saveError = error instanceof Error ? error : new Error(String(error));
      logError(saveError, { 
        context: 'save_settings',
        settingsPath: this.settingsPath
      });
      throw saveError;
    }
  }
}