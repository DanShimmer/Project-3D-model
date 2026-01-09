const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  fullscreen: () => ipcRenderer.send('window-fullscreen'),
  
  // Get window state
  getWindowState: () => ipcRenderer.invoke('get-window-state'),
  
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // Updates
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  
  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Event listeners
  onWindowStateChanged: (callback) => {
    ipcRenderer.on('window-state-changed', (event, state) => callback(state));
    return () => ipcRenderer.removeAllListeners('window-state-changed');
  },
  
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, status) => callback(status));
    return () => ipcRenderer.removeAllListeners('update-status');
  },
  
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action) => callback(action));
    return () => ipcRenderer.removeAllListeners('menu-action');
  },
  
  // Platform detection
  platform: process.platform,
  isElectron: true
});

// Notify renderer that preload is complete
window.addEventListener('DOMContentLoaded', () => {
  console.log('Polyva Desktop App loaded');
});
