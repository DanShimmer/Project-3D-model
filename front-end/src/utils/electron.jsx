import React, { createContext, useContext } from 'react';

// ========== Electron Detection ==========
export const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI?.isElectron === true;
};

// ========== Context for Electron State ==========
const ElectronContext = createContext(null);

export const useElectron = () => {
  const context = useContext(ElectronContext);
  return context || {
    isElectronApp: false,
    windowState: 'normal',
    appInfo: null,
    updateStatus: null
  };
};

// ========== Electron Provider (Web stub) ==========
export function ElectronProvider({ children }) {
  // For web, just pass through children without any electron functionality
  const value = {
    isElectronApp: false,
    windowState: 'normal',
    appInfo: null,
    updateStatus: null,
    minimize: () => {},
    maximize: () => {},
    close: () => {},
    fullscreen: () => {},
    checkForUpdates: () => {},
    showSaveDialog: () => null,
    showOpenDialog: () => null
  };

  return (
    <ElectronContext.Provider value={value}>
      {children}
    </ElectronContext.Provider>
  );
}

export default {
  isElectron,
  ElectronProvider,
  useElectron
};
