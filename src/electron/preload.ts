import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface
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

export interface ApiKeys {
  openai?: string;
  gemini?: string;
}

export interface ServerStatus {
  isRunning: boolean;
  url: string;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  openSettings: () => ipcRenderer.invoke('settings:open-dialog'),
  getApiKeys: () => ipcRenderer.invoke('settings:get-api-keys'),
  saveApiKeys: (keys: ApiKeys) => ipcRenderer.invoke('settings:set-api-keys', keys),
  quit: () => ipcRenderer.invoke('app:quit'),
  getServerStatus: () => ipcRenderer.invoke('server:get-status'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close')
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);