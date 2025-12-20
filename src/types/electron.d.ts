// Global type declarations for Electron API in renderer process

export interface ApiKeys {
  openai?: string;
  gemini?: string;
}

export interface ServerStatus {
  isRunning: boolean;
  url: string;
}

export interface ElectronAPI {
  // Settings related
  openSettings(): Promise<void>;
  getApiKeys(): Promise<ApiKeys>;
  saveApiKeys(keys: ApiKeys): Promise<void>;
  
  // Application control
  quit(): Promise<void>;
  
  // Server status
  getServerStatus(): Promise<ServerStatus>;
  
  // Window control
  minimizeWindow(): Promise<void>;
  maximizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}